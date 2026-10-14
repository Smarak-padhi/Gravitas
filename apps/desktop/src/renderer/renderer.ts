/**
 * GRAVITAS D1 — Command Center Renderer Controller
 *
 * Runs inside sandboxed Chromium renderer with zero Node privileges.
 * Receives read-only projections from window.gravitasDesktop bridge.
 * Dispatches only typed, allowlisted operator intents.
 *
 * Invariants enforced:
 * - RENDERER != CANONICAL_STATE_AUTHORITY
 * - UI != CANONICAL_STATE
 * - UNTRUSTED CONTENT IS RENDERED AS DATA (NO RAW HTML INJECTION)
 * - PROMPT INJECTIONS HAVE ZERO AUTHORITY
 * - APPROVAL DOES NOT AUTO-MERGE / AUTO-DEPLOY
 */

import type {
  GravitasDesktopBridge,
  KernelLifecycleStatus,
  OverviewProjection,
  WorkHierarchyProjection,
  ExecutionProjection,
  VerificationProjection,
  ApprovalQueueProjection,
  SystemProjection,
  ApprovalQueueItem,
  RecordHumanDecisionIntent,
  DoctorReport,
  IdeaRecord,
  KnowledgeCollection,
  StudySubjectSummary,
  SubjectWorkspaceProjection,
  SubjectSectionEntryRecord,
} from '../types.js'
import type { PhoneSyncPlatform, PersonaArchetype } from '@gravitas/core'
import { initWorldView } from './world/worldView.js'
import type { WorldViewController } from './world/worldView.js'
import type { WorldDataSource } from './world/worldModel.js'

let activeDialogTriggerButton: HTMLElement | null = null
let currentDialogItem: { targetId: string; revision: number; outcome: string } | null = null
let worldView: WorldViewController | null = null

// ─── Notes & Knowledge Hub Master-Detail Controller ──────────────────────────

export interface NoteEditorState {
  id?: string
  title: string
  content: string
  collection: KnowledgeCollection
  subject: string
  topic: string
  tags: string
}

let activeNoteId: string | null = null
let isNewNotePending = false
let isNoteDirtyState = false
let originalNoteSnapshot: NoteEditorState | null = null
let loadedNotesCache: IdeaRecord[] = []
let activeFilterCollection = 'ALL'
let activeSearchQuery = ''
let currentMarkdownViewMode: 'WRITE' | 'PREVIEW' | 'SPLIT' = 'WRITE'
let currentActiveSurfaceId = 'surface-workspace'

export function isNotesDirty(): boolean {
  return isNoteDirtyState
}

export function checkNotesUnsavedGuard(): boolean {
  if (!isNoteDirtyState) return true
  const proceed = confirm('You have unsaved changes in this note. Discard changes and leave?')
  if (proceed) {
    isNoteDirtyState = false
    return true
  }
  return false
}

export function revertNoteEdits(): void {
  if (originalNoteSnapshot) {
    populateEditorFields(originalNoteSnapshot)
    setNotesDirty(false)
  } else {
    clearEditorFields()
    setNotesDirty(false)
    showNotesEmptyState(true)
  }
}

export function setNotesDirty(dirty: boolean): void {
  isNoteDirtyState = dirty
  const indicator = document.getElementById('notes-dirty-indicator')
  const cancelBtn = document.getElementById('notes-btn-cancel')
  const saveBtn = document.getElementById('notes-btn-save')

  if (indicator) {
    if (dirty) {
      indicator.className = 'notes-dirty-indicator dirty'
      indicator.textContent = isNewNotePending ? '● New (Unsaved)' : '● Unsaved changes'
    } else {
      indicator.className = 'notes-dirty-indicator clean'
      indicator.textContent = '✓ Saved'
    }
  }

  if (cancelBtn) {
    cancelBtn.style.display = dirty ? 'inline-flex' : 'none'
  }

  if (saveBtn) {
    saveBtn.classList.toggle('btn-primary-action', dirty)
  }
}

export function showNotesEmptyState(empty: boolean): void {
  const emptyEl = document.getElementById('notes-empty-state')
  const editorEl = document.getElementById('notes-editor-wrapper')
  if (emptyEl) emptyEl.style.display = empty ? 'flex' : 'none'
  if (editorEl) editorEl.style.display = empty ? 'none' : 'flex'
}

export function populateEditorFields(state: NoteEditorState): void {
  const titleInput = document.getElementById('notes-input-title') as HTMLInputElement | null
  const contentInput = document.getElementById('notes-textarea-content') as HTMLTextAreaElement | null
  const collectionSelect = document.getElementById('notes-select-collection') as HTMLSelectElement | null
  const subjectInput = document.getElementById('notes-input-subject') as HTMLInputElement | null
  const topicInput = document.getElementById('notes-input-topic') as HTMLInputElement | null
  const tagsInput = document.getElementById('notes-input-tags') as HTMLInputElement | null

  if (titleInput) titleInput.value = state.title
  if (contentInput) contentInput.value = state.content
  if (collectionSelect) collectionSelect.value = state.collection
  if (subjectInput) subjectInput.value = state.subject
  if (topicInput) topicInput.value = state.topic
  if (tagsInput) tagsInput.value = state.tags

  updateWordAndCharCounts()
  updateMarkdownPreview()
}

export function clearEditorFields(): void {
  populateEditorFields({
    title: '',
    content: '',
    collection: 'IDEA',
    subject: '',
    topic: '',
    tags: '',
  })
}

export function updateWordAndCharCounts(): void {
  const contentInput = document.getElementById('notes-textarea-content') as HTMLTextAreaElement | null
  const text = contentInput?.value || ''
  const words = text.trim() ? text.trim().split(/\s+/).length : 0
  const chars = text.length

  const wordsEl = document.getElementById('notes-stat-words')
  const charsEl = document.getElementById('notes-stat-chars')
  if (wordsEl) wordsEl.textContent = `${words} ${words === 1 ? 'word' : 'words'}`
  if (charsEl) charsEl.textContent = `${chars} ${chars === 1 ? 'character' : 'characters'}`
}

export function renderMarkdownSafe(markdownText: string): string {
  if (!markdownText || !markdownText.trim()) {
    return '<p style="color: var(--text-tertiary); font-style: italic;">No Markdown content. Start typing on the left or switch to Write mode.</p>'
  }

  const escapeHtml = (str: string): string => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  const lines = markdownText.split(/\r?\n/)
  const htmlParts: string[] = []
  let inCodeBlock = false
  let codeBlockContent: string[] = []
  let inUl = false
  let inOl = false
  let inBlockquote = false
  let blockquoteContent: string[] = []

  const closeList = () => {
    if (inUl) { htmlParts.push('</ul>'); inUl = false }
    if (inOl) { htmlParts.push('</ol>'); inOl = false }
  }

  const closeBlockquote = () => {
    if (inBlockquote) {
      htmlParts.push(`<blockquote>${blockquoteContent.join('<br>')}</blockquote>`)
      inBlockquote = false
      blockquoteContent = []
    }
  }

  const formatInline = (text: string): string => {
    let s = escapeHtml(text)
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>')
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    s = s.replace(/__([^_]+)__/g, '<strong>$1</strong>')
    s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>')
    s = s.replace(/_([^_]+)_/g, '<em>$1</em>')
    s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>')
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, href) => {
      const cleanHref = href.startsWith('http://') || href.startsWith('https://') || href.startsWith('#')
        ? href
        : '#'
      return `<a href="${cleanHref}" target="_blank" rel="noopener noreferrer" style="color: var(--accent-blue); text-decoration: underline;">${label}</a>`
    })
    return s
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    const trimmed = line.trim()

    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        htmlParts.push(`<pre><code>${codeBlockContent.join('\n')}</code></pre>`)
        inCodeBlock = false
        codeBlockContent = []
      } else {
        closeList()
        closeBlockquote()
        inCodeBlock = true
      }
      continue
    }

    if (inCodeBlock) {
      codeBlockContent.push(escapeHtml(line))
      continue
    }

    if (/^(\*{3,}|-{3,}|_{3,})$/.test(trimmed)) {
      closeList()
      closeBlockquote()
      htmlParts.push('<hr>')
      continue
    }

    if (line.startsWith('>')) {
      closeList()
      inBlockquote = true
      blockquoteContent.push(formatInline(line.replace(/^>\s?/, '')))
      continue
    } else {
      closeBlockquote()
    }

    const h1Match = line.match(/^#\s+(.+)$/)
    if (h1Match) {
      closeList()
      htmlParts.push(`<h1>${formatInline(h1Match[1]!)}</h1>`)
      continue
    }
    const h2Match = line.match(/^##\s+(.+)$/)
    if (h2Match) {
      closeList()
      htmlParts.push(`<h2>${formatInline(h2Match[1]!)}</h2>`)
      continue
    }
    const h3Match = line.match(/^###\s+(.+)$/)
    if (h3Match) {
      closeList()
      htmlParts.push(`<h3>${formatInline(h3Match[1]!)}</h3>`)
      continue
    }
    const h4Match = line.match(/^####\s+(.+)$/)
    if (h4Match) {
      closeList()
      htmlParts.push(`<h4>${formatInline(h4Match[1]!)}</h4>`)
      continue
    }

    const checkMatch = line.match(/^[-*]\s+\[([ xX])\]\s+(.+)$/)
    if (checkMatch) {
      if (inOl) { htmlParts.push('</ol>'); inOl = false }
      if (!inUl) { htmlParts.push('<ul style="list-style: none; padding-left: 0;">'); inUl = true }
      const checked = checkMatch[1]!.toLowerCase() === 'x'
      const checkIcon = checked
        ? '<span style="color: var(--accent-sage); margin-right: 6px; font-weight: bold;">[✓]</span>'
        : '<span style="color: var(--text-tertiary); margin-right: 6px;">[ ]</span>'
      htmlParts.push(`<li style="${checked ? 'text-decoration: line-through; color: var(--text-tertiary);' : ''}">${checkIcon}${formatInline(checkMatch[2]!)}</li>`)
      continue
    }

    const ulMatch = line.match(/^[-*]\s+(.+)$/)
    if (ulMatch) {
      if (inOl) { htmlParts.push('</ol>'); inOl = false }
      if (!inUl) { htmlParts.push('<ul>'); inUl = true }
      htmlParts.push(`<li>${formatInline(ulMatch[1]!)}</li>`)
      continue
    }

    const olMatch = line.match(/^(\d+)\.\s+(.+)$/)
    if (olMatch) {
      if (inUl) { htmlParts.push('</ul>'); inUl = false }
      if (!inOl) { htmlParts.push('<ol>'); inOl = true }
      htmlParts.push(`<li>${formatInline(olMatch[2]!)}</li>`)
      continue
    }

    if (!trimmed) {
      closeList()
      closeBlockquote()
      continue
    }

    closeList()
    htmlParts.push(`<p>${formatInline(line)}</p>`)
  }

  closeList()
  closeBlockquote()
  if (inCodeBlock) {
    htmlParts.push(`<pre><code>${codeBlockContent.join('\n')}</code></pre>`)
  }

  return htmlParts.join('\n')
}

export function updateMarkdownPreview(): void {
  const contentInput = document.getElementById('notes-textarea-content') as HTMLTextAreaElement | null
  const previewEl = document.getElementById('notes-markdown-preview')
  if (previewEl && contentInput) {
    previewEl.innerHTML = renderMarkdownSafe(contentInput.value)
  }
}

export function setMarkdownViewMode(mode: 'WRITE' | 'PREVIEW' | 'SPLIT'): void {
  currentMarkdownViewMode = mode
  const writeBtn = document.getElementById('notes-tab-write')
  const previewBtn = document.getElementById('notes-tab-preview')
  const splitBtn = document.getElementById('notes-tab-split')
  const textarea = document.getElementById('notes-textarea-content') as HTMLTextAreaElement | null
  const preview = document.getElementById('notes-markdown-preview') as HTMLElement | null

  writeBtn?.classList.toggle('active', mode === 'WRITE')
  previewBtn?.classList.toggle('active', mode === 'PREVIEW')
  splitBtn?.classList.toggle('active', mode === 'SPLIT')

  if (mode === 'WRITE') {
    if (textarea) {
      textarea.style.display = 'block'
      textarea.style.width = '100%'
      textarea.style.flex = '1 1 100%'
      textarea.style.minWidth = '0'
      textarea.style.borderRight = 'none'
    }
    if (preview) preview.style.display = 'none'
  } else if (mode === 'PREVIEW') {
    if (textarea) textarea.style.display = 'none'
    if (preview) {
      preview.style.display = 'block'
      preview.style.width = '100%'
      preview.style.flex = '1 1 100%'
      preview.style.minWidth = '0'
      updateMarkdownPreview()
    }
  } else if (mode === 'SPLIT') {
    if (textarea && preview) {
      textarea.style.display = 'block'
      textarea.style.width = '50%'
      textarea.style.flex = '1 1 50%'
      textarea.style.minWidth = '0'
      textarea.style.borderRight = '1px solid var(--border)'
      preview.style.display = 'block'
      preview.style.width = '50%'
      preview.style.flex = '1 1 50%'
      preview.style.minWidth = '0'
      updateMarkdownPreview()
    }
  }
}

export async function openNoteInEditor(bridge: GravitasDesktopBridge, noteId: string): Promise<void> {
  if (isNoteDirtyState && activeNoteId !== noteId) {
    if (!checkNotesUnsavedGuard()) {
      return
    }
  }

  const note = await bridge.getIdea?.(noteId)
  if (!note) {
    announce(`Note ${noteId} not found`)
    return
  }

  activeNoteId = note.id
  isNewNotePending = false

  const state: NoteEditorState = {
    id: note.id,
    title: note.title,
    content: note.originalText || '',
    collection: note.collection,
    subject: note.subject || '',
    topic: note.topic || '',
    tags: (note.tags || []).join(', '),
  }
  originalNoteSnapshot = { ...state }

  populateEditorFields(state)
  setNotesDirty(false)
  showNotesEmptyState(false)

  document.querySelectorAll('.note-card-item').forEach((el) => {
    el.classList.toggle('selected', el.getAttribute('data-note-id') === note.id)
  })

  const updatedEl = document.getElementById('notes-stat-updated')
  if (updatedEl) {
    const dObj = new Date(note.updatedAt)
    updatedEl.textContent = `Saved ${dObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }

  updateWordAndCharCounts()
  updateMarkdownPreview()
}

export function startNewNote(
  defaultCollection: KnowledgeCollection = 'IDEA',
  defaultSubject?: string,
  initialContent?: string
): void {
  if (isNoteDirtyState) {
    if (!checkNotesUnsavedGuard()) return
  }

  activeNoteId = null
  isNewNotePending = true

  const defaultTitle = initialContent ? (initialContent.slice(0, 32).trim() || 'Untitled Note') : 'Untitled Note'

  const state: NoteEditorState = {
    title: defaultTitle,
    content: initialContent || '',
    collection: defaultCollection,
    subject: defaultSubject || '',
    topic: '',
    tags: '',
  }
  originalNoteSnapshot = null

  populateEditorFields(state)
  setNotesDirty(true)
  showNotesEmptyState(false)

  document.querySelectorAll('.note-card-item').forEach((el) => el.classList.remove('selected'))

  const titleInput = document.getElementById('notes-input-title') as HTMLInputElement | null
  titleInput?.focus()
  titleInput?.select()

  updateWordAndCharCounts()
  updateMarkdownPreview()
}

export async function saveCurrentNote(bridge: GravitasDesktopBridge): Promise<boolean> {
  const titleInput = document.getElementById('notes-input-title') as HTMLInputElement | null
  const contentInput = document.getElementById('notes-textarea-content') as HTMLTextAreaElement | null
  const collectionSelect = document.getElementById('notes-select-collection') as HTMLSelectElement | null
  const subjectInput = document.getElementById('notes-input-subject') as HTMLInputElement | null
  const topicInput = document.getElementById('notes-input-topic') as HTMLInputElement | null
  const tagsInput = document.getElementById('notes-input-tags') as HTMLInputElement | null
  const bannerEl = document.getElementById('notes-feedback-banner')

  const title = (titleInput?.value || '').trim() || 'Untitled Note'
  const originalText = contentInput?.value || ''
  const collection = (collectionSelect?.value || 'IDEA') as KnowledgeCollection
  const subject = (subjectInput?.value || '').trim() || undefined
  const topic = (topicInput?.value || '').trim() || undefined
  const rawTags = (tagsInput?.value || '')
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)

  try {
    let saved: IdeaRecord
    if (isNewNotePending || !activeNoteId) {
      if (!bridge.saveIdea) throw new Error('bridge.saveIdea unavailable')
      saved = await bridge.saveIdea({
        title,
        originalText,
        collection,
        subject,
        topic,
        tags: rawTags,
      })
      activeNoteId = saved.id
      isNewNotePending = false
    } else {
      if (!bridge.updateIdea) throw new Error('bridge.updateIdea unavailable')
      saved = await bridge.updateIdea({
        id: activeNoteId,
        title,
        originalText,
        collection,
        subject,
        topic,
        tags: rawTags,
      })
    }

    originalNoteSnapshot = {
      id: saved.id,
      title: saved.title,
      content: saved.originalText,
      collection: saved.collection,
      subject: saved.subject || '',
      topic: saved.topic || '',
      tags: (saved.tags || []).join(', '),
    }

    setNotesDirty(false)
    if (bannerEl) {
      bannerEl.textContent = '✓ Saved to SQLite database'
      bannerEl.style.color = 'var(--badge-ready)'
      setTimeout(() => {
        if (bannerEl && bannerEl.textContent?.includes('Saved')) bannerEl.textContent = ''
      }, 3000)
    }

    const updatedEl = document.getElementById('notes-stat-updated')
    if (updatedEl) {
      updatedEl.textContent = 'Saved just now'
    }

    announce(`Note "${saved.title}" saved successfully`)
    await loadAndRenderNotesList(bridge, saved.id)
    await refreshWorkspace(bridge)
    return true
  } catch (err) {
    const msg = (err as Error).message
    setNotesDirty(true)
    const dirtyIndicator = document.getElementById('notes-dirty-indicator')
    if (dirtyIndicator) {
      dirtyIndicator.textContent = '● Save failed'
      dirtyIndicator.className = 'notes-dirty-indicator dirty'
    }
    if (bannerEl) {
      bannerEl.textContent = `Save error: ${msg}`
      bannerEl.style.color = 'var(--badge-offline)'
    }
    announce(`Failed to save note: ${msg}`)
    return false
  }
}

export async function deleteCurrentNote(bridge: GravitasDesktopBridge): Promise<void> {
  if (!activeNoteId) return
  const title = (document.getElementById('notes-input-title') as HTMLInputElement | null)?.value || 'this note'
  const confirmed = confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)
  if (!confirmed) return

  try {
    if (bridge.deleteIdea) {
      await bridge.deleteIdea(activeNoteId, true)
    }
    activeNoteId = null
    isNewNotePending = false
    isNoteDirtyState = false
    originalNoteSnapshot = null
    showNotesEmptyState(true)
    await loadAndRenderNotesList(bridge)
    await refreshWorkspace(bridge)
    announce(`Note "${title}" deleted`)
  } catch (err) {
    alert(`Failed to delete note: ${(err as Error).message}`)
  }
}

export async function handleImportMarkdown(bridge: GravitasDesktopBridge): Promise<void> {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.md,.markdown,.txt'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return
    const text = await file.text()
    if (!text.trim()) {
      alert('Selected file is empty.')
      return
    }
    try {
      if (bridge.importKnowledgeMarkdown) {
        const imported = await bridge.importKnowledgeMarkdown(text)
        await loadAndRenderNotesList(bridge, imported.id)
        await openNoteInEditor(bridge, imported.id)
        announce(`Imported "${imported.title}" successfully`)
      }
    } catch (err) {
      alert(`Import failed: ${(err as Error).message}`)
    }
  }
  input.click()
}

export async function handleExportMarkdown(bridge: GravitasDesktopBridge): Promise<void> {
  try {
    if (bridge.exportKnowledgeMarkdown) {
      const res = await bridge.exportKnowledgeMarkdown()
      announce(`Exported ${res.exportedCount} notes to ${res.exportDirectory}`)
      alert(`Exported ${res.exportedCount} notes to Markdown folder:\n${res.exportDirectory}`)
    }
  } catch (err) {
    alert(`Export failed: ${(err as Error).message}`)
  }
}

export async function loadAndRenderNotesList(bridge: GravitasDesktopBridge, selectId?: string): Promise<void> {
  const listEl = document.getElementById('notes-master-list')
  const countEl = document.getElementById('notes-master-count')
  if (!listEl) return

  try {
    const allItems = (await bridge.listIdeas?.()) || []
    loadedNotesCache = [...allItems]

    const filter = activeFilterCollection
    let filtered = allItems
    if (filter !== 'ALL') {
      filtered = filtered.filter((i) => i.collection === filter)
    }

    const q = activeSearchQuery.toLowerCase().trim()
    if (q) {
      filtered = filtered.filter((i) => {
        const text = [i.title, i.originalText, i.subject, i.topic, ...(i.tags || [])].join(' ').toLowerCase()
        return text.includes(q)
      })
    }

    if (countEl) {
      countEl.textContent = `${filtered.length} ${filtered.length === 1 ? 'note' : 'notes'}`
    }

    listEl.innerHTML = ''
    if (filtered.length === 0) {
      listEl.innerHTML = '<div class="empty-state-editorial" style="margin: 12px 6px;">No notes found matching your filter or search.</div>'
      return
    }

    for (const note of filtered) {
      const card = document.createElement('div')
      card.className = `note-card-item ${activeNoteId === note.id ? 'selected' : ''}`
      card.setAttribute('data-note-id', note.id)

      const header = document.createElement('div')
      header.className = 'note-card-header'

      const title = document.createElement('div')
      title.className = 'note-card-title'
      title.textContent = note.title

      const time = document.createElement('div')
      time.className = 'note-card-time'
      const dObj = new Date(note.updatedAt)
      time.textContent = dObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

      header.appendChild(title)
      header.appendChild(time)
      card.appendChild(header)

      const snippet = document.createElement('div')
      snippet.className = 'note-card-snippet'
      snippet.textContent = note.originalText || note.summary || 'No text preview.'
      card.appendChild(snippet)

      const meta = document.createElement('div')
      meta.className = 'note-card-meta'

      const collBadge = document.createElement('span')
      collBadge.className = 'note-collection-badge'
      collBadge.textContent = note.collection.replace('_', ' ')
      meta.appendChild(collBadge)

      if (note.subject) {
        const subjBadge = document.createElement('span')
        subjBadge.className = 'note-subject-badge'
        subjBadge.textContent = note.subject
        meta.appendChild(subjBadge)
      }

      if (note.tags && note.tags.length > 0) {
        for (const tg of note.tags.slice(0, 2)) {
          const tBadge = document.createElement('span')
          tBadge.className = 'task-tag'
          tBadge.textContent = tg
          meta.appendChild(tBadge)
        }
      }

      card.appendChild(meta)

      card.addEventListener('click', () => {
        void openNoteInEditor(bridge, note.id)
      })

      listEl.appendChild(card)
    }

    if (selectId) {
      void openNoteInEditor(bridge, selectId)
    } else if (activeNoteId && filtered.some((n) => n.id === activeNoteId)) {
      document.querySelector(`[data-note-id="${activeNoteId}"]`)?.classList.add('selected')
    }
  } catch (err) {
    listEl.innerHTML = `<div class="empty-state-editorial">Failed to load notes: ${(err as Error).message}</div>`
  }
}

export function setupNotesHubListeners(bridge: GravitasDesktopBridge): void {
  const searchInput = document.getElementById('notes-search-input') as HTMLInputElement | null
  searchInput?.addEventListener('input', () => {
    activeSearchQuery = searchInput.value
    void loadAndRenderNotesList(bridge)
  })

  document.querySelectorAll<HTMLButtonElement>('.notes-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.notes-chip').forEach((c) => c.classList.remove('active'))
      chip.classList.add('active')
      activeFilterCollection = chip.getAttribute('data-filter') || 'ALL'
      void loadAndRenderNotesList(bridge)
    })
  })

  document.getElementById('notes-btn-create')?.addEventListener('click', () => {
    startNewNote()
  })
  document.getElementById('notes-empty-create-btn')?.addEventListener('click', () => {
    startNewNote()
  })

  document.getElementById('notes-btn-save')?.addEventListener('click', () => {
    void saveCurrentNote(bridge)
  })

  document.getElementById('notes-btn-cancel')?.addEventListener('click', () => {
    revertNoteEdits()
  })

  document.getElementById('notes-btn-delete')?.addEventListener('click', () => {
    void deleteCurrentNote(bridge)
  })

  document.getElementById('notes-btn-import')?.addEventListener('click', () => {
    void handleImportMarkdown(bridge)
  })
  document.getElementById('notes-btn-export')?.addEventListener('click', () => {
    void handleExportMarkdown(bridge)
  })

  document.getElementById('notes-tab-write')?.addEventListener('click', () => setMarkdownViewMode('WRITE'))
  document.getElementById('notes-tab-preview')?.addEventListener('click', () => setMarkdownViewMode('PREVIEW'))
  document.getElementById('notes-tab-split')?.addEventListener('click', () => setMarkdownViewMode('SPLIT'))

  const trackDirty = () => {
    setNotesDirty(true)
    updateWordAndCharCounts()
    if (currentMarkdownViewMode !== 'WRITE') {
      updateMarkdownPreview()
    }
  }

  const titleInput = document.getElementById('notes-input-title')
  const contentInput = document.getElementById('notes-textarea-content')
  const collectionSelect = document.getElementById('notes-select-collection')
  const subjectInput = document.getElementById('notes-input-subject')
  const topicInput = document.getElementById('notes-input-topic')
  const tagsInput = document.getElementById('notes-input-tags')

  titleInput?.addEventListener('input', trackDirty)
  contentInput?.addEventListener('input', trackDirty)
  collectionSelect?.addEventListener('change', trackDirty)
  subjectInput?.addEventListener('input', trackDirty)
  topicInput?.addEventListener('input', trackDirty)
  tagsInput?.addEventListener('input', trackDirty)

  const handleKeydown = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      void saveCurrentNote(bridge)
    }
  }
  titleInput?.addEventListener('keydown', handleKeydown)
  contentInput?.addEventListener('keydown', handleKeydown)
}

/** Select a surface (tab + panel). Pure navigation with unsaved changes guard. */
export function activateSurface(surfaceId: string, skipGuard = false): boolean {
  if (surfaceId === 'surface-devtools') {
    surfaceId = 'surface-overview'
  }

  if (!skipGuard && currentActiveSurfaceId === 'surface-notes' && surfaceId !== 'surface-notes') {
    if (!checkNotesUnsavedGuard()) {
      return false
    }
  }

  currentActiveSurfaceId = surfaceId

  if (surfaceId === 'surface-subjects') {
    const overviewEl = document.getElementById('subjects-overview-view')
    const detailEl = document.getElementById('subject-detail-view')
    if (!detailEl || detailEl.style.display === 'none') {
      if (overviewEl) overviewEl.style.display = 'block'
      if (detailEl) detailEl.style.display = 'none'
    }
  }

  const isDevSurface = [
    'surface-overview',
    'surface-work',
    'surface-execution',
    'surface-verification',
    'surface-approvals',
    'surface-system',
  ].includes(surfaceId)

  const devSubnav = document.getElementById('devtools-subnav')
  if (devSubnav) {
    devSubnav.style.display = isDevSurface ? 'flex' : 'none'
  }

  document.querySelectorAll<HTMLButtonElement>('.nav-btn').forEach((t) => {
    const sId = t.getAttribute('data-surface')
    const on = isDevSurface ? sId === 'surface-devtools' : sId === surfaceId
    t.classList.toggle('active', on)
    t.setAttribute('aria-selected', on ? 'true' : 'false')
  })

  if (isDevSurface) {
    document.querySelectorAll<HTMLButtonElement>('.subnav-btn').forEach((st) => {
      const sId = st.getAttribute('data-surface')
      st.classList.toggle('active', sId === surfaceId)
    })
  }

  document.querySelectorAll<HTMLElement>('.surface').forEach((s) => s.classList.toggle('active', s.id === surfaceId))
  document.getElementById('btn-view-world')?.setAttribute('aria-pressed', 'false')
  document.getElementById('btn-view-command')?.setAttribute('aria-pressed', 'true')
  return true
}

export function announce(text: string): void {
  const el = document.getElementById('status-announcer')
  if (el) el.textContent = text
}

export function escapeSafeText(text: string): string {
  if (!text) return ''
  return text
}

export async function refreshOverview(bridge: GravitasDesktopBridge): Promise<void> {
  try {
    const ov = await bridge.getOverview()
    const mSessions = document.getElementById('metric-sessions')
    const mRuns = document.getElementById('metric-runs')
    const mTasks = document.getElementById('metric-tasks')
    const mApprovals = document.getElementById('metric-approvals')
    const mFailed = document.getElementById('metric-failed')
    const mRevision = document.getElementById('metric-revision')
    const badgeCount = document.getElementById('approvals-badge-count')

    if (mSessions) mSessions.textContent = String(ov.activeWorkSessionsCount)
    if (mRuns) mRuns.textContent = String(ov.activeRunsCount)
    if (mTasks) mTasks.textContent = String(ov.activeTasksCount)
    if (mApprovals) mApprovals.textContent = String(ov.waitingApprovalCount)
    if (mFailed) mFailed.textContent = String(ov.failedOrRecoveryCount)
    if (mRevision) mRevision.textContent = String(ov.canonicalRevision)
    if (badgeCount) badgeCount.textContent = String(ov.waitingApprovalCount)

    const list = document.getElementById('overview-activity-list')
    if (list) {
      list.innerHTML = ''
      if (ov.recentActivitySummary.length === 0) {
        const li = document.createElement('li')
        li.className = 'timeline-item'
        li.textContent = 'No recent activity.'
        list.appendChild(li)
      } else {
        for (const item of ov.recentActivitySummary) {
          const li = document.createElement('li')
          li.className = 'timeline-item'
          li.textContent = item
          list.appendChild(li)
        }
      }
    }
  } catch (err) {
    announce(`Failed to refresh overview: ${(err as Error).message}`)
  }
}

export async function refreshWorkHierarchy(bridge: GravitasDesktopBridge): Promise<void> {
  try {
    const hier = await bridge.getWorkHierarchy()
    const container = document.getElementById('work-hierarchy-tree')
    if (!container) return

    container.innerHTML = ''
    if (hier.sessions.length === 0) {
      container.textContent = 'No active WorkSessions in canonical kernel.'
      return
    }

    for (const session of hier.sessions) {
      const sessEl = document.createElement('div')
      sessEl.style.marginBottom = '16px'

      const sessHeader = document.createElement('div')
      sessHeader.style.fontWeight = '600'
      sessHeader.style.fontSize = '14px'
      sessHeader.textContent = `WorkSession [${session.id}] (State: ${session.state}, Rev: ${session.revision})`
      sessEl.appendChild(sessHeader)

      for (const run of session.runs) {
        const runEl = document.createElement('div')
        runEl.style.marginLeft = '16px'
        runEl.style.marginTop = '8px'
        runEl.style.fontSize = '13px'
        runEl.textContent = `└─ Run [${run.id}] Goal: ${run.goal} (State: ${run.state})`

        for (const task of run.tasks) {
          const taskEl = document.createElement('div')
          taskEl.style.marginLeft = '24px'
          taskEl.style.marginTop = '4px'
          taskEl.style.fontSize = '12px'

          const btn = document.createElement('button')
          btn.className = 'btn btn-secondary'
          btn.style.padding = '2px 8px'
          btn.style.marginRight = '8px'
          btn.textContent = 'Inspect'
          btn.addEventListener('click', async () => {
            await inspectTask(bridge, task.id)
          })

          const textSpan = document.createElement('span')
          textSpan.textContent = `├─ Task [${task.id}] "${task.title}" (Role: ${task.assignedRoleId}, State: ${task.state})`

          taskEl.appendChild(btn)
          taskEl.appendChild(textSpan)
          runEl.appendChild(taskEl)
        }
        sessEl.appendChild(runEl)
      }
      container.appendChild(sessEl)
    }
  } catch (err) {
    announce(`Failed to refresh work hierarchy: ${(err as Error).message}`)
  }
}

export async function inspectTask(bridge: GravitasDesktopBridge, taskId: string): Promise<void> {
  const detail = await bridge.getTaskDetail(taskId)
  const panel = document.getElementById('task-detail-panel')
  if (!panel || !detail) return

  panel.style.display = 'block'
  const titleEl = document.getElementById('task-detail-title')
  const chainEl = document.getElementById('task-causal-chain')
  const outEl = document.getElementById('task-worker-output')

  if (titleEl) titleEl.textContent = `${detail.task.title} [${detail.task.id}]`
  if (chainEl) {
    chainEl.textContent = `Session: ${detail.causalChain.workSessionId} ➔ Run: ${detail.causalChain.runId} ➔ Task: ${detail.causalChain.taskId}`
  }
  if (outEl) {
    // Untrusted data rendered strictly as textContent
    outEl.textContent = detail.workerResult?.outputText ?? 'No worker output available.'
  }
}

export async function refreshExecution(bridge: GravitasDesktopBridge): Promise<void> {
  try {
    const ex = await bridge.getExecution()
    const tbody = document.getElementById('execution-table-body')
    if (!tbody) return

    tbody.innerHTML = ''
    if (ex.executions.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8">No active executions.</td></tr>'
      return
    }

    for (const item of ex.executions) {
      const tr = document.createElement('tr')

      const tdId = document.createElement('td')
      tdId.textContent = item.executionId
      tr.appendChild(tdId)

      const tdRole = document.createElement('td')
      tdRole.textContent = item.roleId
      tr.appendChild(tdRole)

      const tdExec = document.createElement('td')
      tdExec.textContent = item.executorId
      tr.appendChild(tdExec)

      const tdHarness = document.createElement('td')
      tdHarness.textContent = `${item.harnessId} (${item.readinessStatus})`
      tr.appendChild(tdHarness)

      const tdModel = document.createElement('td')
      tdModel.textContent = `${item.model} / ${item.provider}`
      tr.appendChild(tdModel)

      const tdCost = document.createElement('td')
      tdCost.textContent = item.costEligibility
      tr.appendChild(tdCost)

      const tdStatus = document.createElement('td')
      tdStatus.textContent = item.status
      tr.appendChild(tdStatus)

      const tdAction = document.createElement('td')
      const btn = document.createElement('button')
      btn.className = 'btn btn-secondary'
      btn.textContent = 'View Output'
      btn.addEventListener('click', () => {
        alert(`Bounded Output:\n\n${item.boundedOutput}`)
      })
      tdAction.appendChild(btn)
      tr.appendChild(tdAction)

      tbody.appendChild(tr)
    }
  } catch (err) {
    announce(`Failed to refresh execution projection: ${(err as Error).message}`)
  }
}

export async function refreshVerification(bridge: GravitasDesktopBridge): Promise<void> {
  try {
    const verif = await bridge.getVerification()
    const container = document.getElementById('verification-content')
    if (!container) return

    if (!verif) {
      container.textContent = 'No verification report currently available in canonical state.'
      return
    }

    container.innerHTML = ''

    const pPlan = document.createElement('div')
    pPlan.style.marginBottom = '12px'
    pPlan.textContent = `Verification Plan ID: ${verif.planId} (Task: ${verif.taskId}, Verdict: ${verif.verdict}, Revision: ${verif.revision})`
    container.appendChild(pPlan)

    const pIndep = document.createElement('div')
    pIndep.style.marginBottom = '12px'
    pIndep.textContent = `Independence Classification: ${verif.independenceClass} | Trust Status: ${verif.trustStatus}`
    container.appendChild(pIndep)

    const pDigest = document.createElement('div')
    pDigest.style.marginBottom = '12px'
    pDigest.style.fontSize = '12px'
    pDigest.style.color = '#94a3b8'
    pDigest.textContent = `Digest: ${verif.manifestCoreDigest.digestHex} (${verif.manifestCoreDigest.semantics}) [NOTE: Digest is change-detection metadata, NOT a digital signature]`
    container.appendChild(pDigest)

    const critHeader = document.createElement('div')
    critHeader.style.fontWeight = '600'
    critHeader.style.marginTop = '12px'
    critHeader.textContent = 'Criteria:'
    container.appendChild(critHeader)

    const critList = document.createElement('ul')
    for (const c of verif.criteria) {
      const li = document.createElement('li')
      li.textContent = `${c.criterionId} (rev ${c.revision}): ${c.label} [${c.kind}]`
      critList.appendChild(li)
    }
    container.appendChild(critList)

    const findHeader = document.createElement('div')
    findHeader.style.fontWeight = '600'
    findHeader.style.marginTop = '12px'
    findHeader.textContent = 'Findings:'
    container.appendChild(findHeader)

    const findList = document.createElement('ul')
    for (const f of verif.findingsSummary) {
      const li = document.createElement('li')
      li.textContent = f
      findList.appendChild(li)
    }
    container.appendChild(findList)
  } catch (err) {
    announce(`Failed to refresh verification: ${(err as Error).message}`)
  }
}

export async function refreshApprovalQueue(bridge: GravitasDesktopBridge): Promise<void> {
  try {
    const queue = await bridge.getApprovalQueue()
    const container = document.getElementById('approval-queue-container')
    const badgeCount = document.getElementById('approvals-badge-count')
    if (badgeCount) badgeCount.textContent = String(queue.totalPending)
    if (!container) return

    container.innerHTML = ''
    if (queue.items.length === 0) {
      container.textContent = 'No pending human approval gates.'
      return
    }

    for (const item of queue.items) {
      const card = document.createElement('div')
      card.className = 'card'

      const title = document.createElement('h3')
      title.className = 'card-title'
      title.textContent = `[${item.itemType}] Target: ${item.targetId} (Rev: ${item.currentRevision})`
      card.appendChild(title)

      const f1 = document.createElement('div')
      f1.className = 'dialog-field'
      f1.textContent = `Technical Outcome: ${item.technicalOutcome} (Verdict: ${item.reportVerdict ?? 'N/A'})`
      card.appendChild(f1)

      const f2 = document.createElement('div')
      f2.className = 'dialog-field'
      f2.textContent = `Requested Action: ${item.requestedAction}`
      card.appendChild(f2)

      const f3 = document.createElement('div')
      f3.className = 'dialog-field'
      f3.style.color = '#f59e0b'
      f3.textContent = `Consequences: ${item.consequences}`
      card.appendChild(f3)

      const fStatus = document.createElement('div')
      fStatus.className = 'dialog-field'
      fStatus.style.fontWeight = '600'
      fStatus.textContent = `Current Status: ${item.status}`
      card.appendChild(fStatus)

      if (item.status === 'WAITING_APPROVAL') {
        const btn = document.createElement('button')
        btn.className = 'btn'
        btn.textContent = 'Review & Decide'
        btn.setAttribute('data-queue-target-id', item.targetId)
        btn.addEventListener('click', () => {
          openApprovalDialog(btn, item)
        })
        card.appendChild(btn)
      }

      container.appendChild(card)
    }
  } catch (err) {
    announce(`Failed to refresh approval queue: ${(err as Error).message}`)
  }
}

export function openApprovalDialog(triggerBtn: HTMLElement, item: ApprovalQueueItem): void {
  activeDialogTriggerButton = triggerBtn
  currentDialogItem = {
    targetId: item.targetId,
    revision: item.currentRevision,
    outcome: item.technicalOutcome,
  }

  const dialog = document.getElementById('approval-dialog') as HTMLDialogElement | null
  if (!dialog) return

  const targetEl = document.getElementById('dialog-target-id')
  const revEl = document.getElementById('dialog-revision')
  const outcomeEl = document.getElementById('dialog-outcome')

  if (targetEl) targetEl.textContent = item.targetId
  if (revEl) revEl.textContent = String(item.currentRevision)
  if (outcomeEl) outcomeEl.textContent = item.technicalOutcome

  dialog.showModal()
  const opInput = document.getElementById('dialog-operator-id')
  opInput?.focus()
}

export function closeApprovalDialog(): void {
  const dialog = document.getElementById('approval-dialog') as HTMLDialogElement | null
  if (dialog?.open) {
    dialog.close()
  }
  if (activeDialogTriggerButton) {
    activeDialogTriggerButton.focus()
    activeDialogTriggerButton = null
  }
  currentDialogItem = null
}

export async function submitDecision(
  bridge: GravitasDesktopBridge,
  decision: 'APPROVED' | 'REJECTED'
): Promise<void> {
  if (!currentDialogItem) return

  const opInput = document.getElementById('dialog-operator-id') as HTMLInputElement | null
  const ratInput = document.getElementById('dialog-rationale') as HTMLInputElement | null

  const operatorId = opInput?.value.trim() || 'operator-human-01'
  const rationale = ratInput?.value.trim() || `Decision ${decision} recorded via Command Center`

  const intent: RecordHumanDecisionIntent = {
    intentType: 'RECORD_HUMAN_DECISION',
    actor: { kind: 'HUMAN_OPERATOR', operatorId },
    targetId: currentDialogItem.targetId,
    decision,
    rationale,
    expectedRevision: currentDialogItem.revision,
    correlationId: `intent_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
  }

  try {
    const res = await bridge.submitIntent(intent)
    if (res.success) {
      announce(`Decision recorded: ${res.safeMessage}`)
      alert(`Success: ${res.safeMessage}`)
    } else {
      announce(`Intent rejected: ${res.safeMessage}`)
      alert(`Decision Rejected: ${res.safeMessage}`)
    }
  } catch (err) {
    announce(`Error submitting intent: ${(err as Error).message}`)
    alert(`Error: ${(err as Error).message}`)
  } finally {
    closeApprovalDialog()
    await refreshAll(bridge)
  }
}

export async function refreshSystem(bridge: GravitasDesktopBridge): Promise<void> {
  try {
    const sys = await bridge.getSystem()
    const container = document.getElementById('system-diagnostics-container')
    if (!container) return

    container.innerHTML = ''

    const table = document.createElement('table')
    const rows: [string, string][] = [
      ['Supervisor Status', sys.supervisorStatus],
      ['Kernel Status', sys.kernelStatus],
      ['Main PID / Kernel PID', `${sys.mainPid} / ${sys.kernelPid}`],
      ['Protocol Version', sys.protocolVersion],
      ['Node Version', sys.nodeVersion],
      ['Electron Version', sys.electronVersion],
      ['Sanitized DataRoot', sys.dataRootSanitized],
      ['Active Harnesses', String(sys.activeHarnessCount)],
      ['Cost Policy Tier', sys.costPolicySummary.defaultTier],
      ['Paid Fallback Permitted', String(sys.costPolicySummary.paidFallbackPermitted)],
      ['Autonomous Payment Authority', String(sys.costPolicySummary.autonomousPaymentAuthority)],
    ]

    if (sys.modelIntelligenceSummary) {
      rows.push(
        ['Model Provider (NVIDIA NIM)', sys.modelIntelligenceSummary.providerStatus],
        ['Qualified Models ($0 Free)', String(sys.modelIntelligenceSummary.qualifiedModelsCount)],
        ['Default Candidate Model', sys.modelIntelligenceSummary.defaultModel],
        ['Model Spend Policy', `$${sys.modelIntelligenceSummary.outOfPocketUsd} (Paid Fallback: DISABLED)`]
      )
    }

    for (const [k, v] of rows) {
      const tr = document.createElement('tr')
      const th = document.createElement('th')
      th.textContent = k
      const td = document.createElement('td')
      td.textContent = v
      tr.appendChild(th)
      tr.appendChild(td)
      table.appendChild(tr)
    }

    container.appendChild(table)
  } catch (err) {
    announce(`Failed to refresh system diagnostics: ${(err as Error).message}`)
  }
}

export function isSemesterCourse(codeOrSubject?: string): boolean {
  if (!codeOrSubject) return false
  const trimmed = codeOrSubject.trim()
  return /^[A-Z]{2,4}\s*\d{3,4}/i.test(trimmed)
}

export function renderSubjectsOverview(bridge: GravitasDesktopBridge, subjects: readonly StudySubjectSummary[]): void {
  const semesterGrid = document.getElementById('subjects-semester-grid')
  const genericGrid = document.getElementById('subjects-generic-grid')
  const legacyFullList = document.getElementById('subjects-full-list')
  const searchInput = document.getElementById('subjects-search-input') as HTMLInputElement | null
  const refreshBtn = document.getElementById('subjects-btn-refresh')

  if (refreshBtn && !refreshBtn.dataset.wired) {
    refreshBtn.dataset.wired = 'true'
    refreshBtn.onclick = () => {
      void refreshWorkspace(bridge)
    }
  }

  if (!semesterGrid || !genericGrid) return

  const filterQuery = (searchInput?.value || '').trim().toLowerCase()

  const matchesFilter = (s: StudySubjectSummary) => {
    if (!filterQuery) return true
    const code = (s.code || s.subject || '').toLowerCase()
    const name = (s.name || '').toLowerCase()
    const topics = (s.topics || []).join(' ').toLowerCase()
    return code.includes(filterQuery) || name.includes(filterQuery) || topics.includes(filterQuery)
  }

  const filtered = subjects.filter(matchesFilter)
  const semesterList = filtered.filter((s) => isSemesterCourse(s.code || s.subject))
  const genericList = filtered.filter((s) => !isSemesterCourse(s.code || s.subject))

  const createSubjectCard = (s: StudySubjectSummary): HTMLElement => {
    const card = document.createElement('div')
    card.className = 'subject-card clickable'
    card.setAttribute('role', 'button')
    card.setAttribute('tabindex', '0')
    card.title = `Open workspace for ${s.name || s.subject}`

    const cardHeader = document.createElement('div')
    cardHeader.className = 'subject-card-header'

    const codeBadge = document.createElement('span')
    codeBadge.className = 'subject-card-code'
    codeBadge.textContent = s.code || s.subject

    const creditsBadge = document.createElement('span')
    creditsBadge.className = 'subject-card-credits'
    creditsBadge.textContent = `${s.credits ?? 4} Credits`

    cardHeader.appendChild(codeBadge)
    cardHeader.appendChild(creditsBadge)
    card.appendChild(cardHeader)

    const title = document.createElement('h3')
    title.className = 'subject-card-title'
    title.textContent = s.name || s.subject
    card.appendChild(title)

    // Stats: Real activity presentation, no repetitive zero-count badges!
    const stats = document.createElement('div')
    stats.className = 'subject-card-stats'

    const notes = s.noteCount || 0
    const asgns = s.assignmentCount || 0
    const tasks = s.taskCount || 0
    const totalActivity = notes + asgns + tasks

    if (totalActivity === 0) {
      const cleanPill = document.createElement('span')
      cleanPill.className = 'subject-stat-pill subtle'
      cleanPill.textContent = 'Curriculum ready · No active items'
      stats.appendChild(cleanPill)
    } else {
      if (notes > 0) {
        const p = document.createElement('span')
        p.className = 'subject-stat-pill active'
        p.innerHTML = `<strong>${notes}</strong> ${notes === 1 ? 'note' : 'notes'}`
        stats.appendChild(p)
      }
      if (asgns > 0) {
        const p = document.createElement('span')
        p.className = 'subject-stat-pill active'
        p.innerHTML = `<strong>${asgns}</strong> ${asgns === 1 ? 'assignment' : 'assignments'}`
        stats.appendChild(p)
      }
      if (tasks > 0) {
        const p = document.createElement('span')
        p.className = 'subject-stat-pill active'
        p.innerHTML = `<strong>${tasks}</strong> ${tasks === 1 ? 'revision' : 'revisions'}`
        stats.appendChild(p)
      }
    }
    card.appendChild(stats)

    const actionBtn = document.createElement('button')
    actionBtn.className = 'subject-card-action-btn'
    actionBtn.textContent = 'Open Workspace →'
    card.appendChild(actionBtn)

    const handleOpen = () => {
      void openSubjectDetailView(bridge, s.code || s.subject)
    }

    card.addEventListener('click', handleOpen)
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handleOpen()
      }
    })

    return card
  }

  semesterGrid.innerHTML = ''
  if (semesterList.length === 0) {
    semesterGrid.innerHTML = `<div class="empty-state-editorial" style="grid-column: 1 / -1;">${filterQuery ? 'No matching semester courses.' : 'No semester courses enrolled.'}</div>`
  } else {
    for (const s of semesterList) {
      semesterGrid.appendChild(createSubjectCard(s))
    }
  }

  genericGrid.innerHTML = ''
  if (genericList.length === 0) {
    genericGrid.innerHTML = `<div class="empty-state-editorial" style="grid-column: 1 / -1;">${filterQuery ? 'No matching foundational disciplines.' : 'No foundational disciplines enrolled.'}</div>`
  } else {
    for (const s of genericList) {
      genericGrid.appendChild(createSubjectCard(s))
    }
  }

  if (legacyFullList) {
    legacyFullList.innerHTML = ''
    for (const s of subjects) {
      legacyFullList.appendChild(createSubjectCard(s))
    }
  }

  if (searchInput && !searchInput.dataset.wired) {
    searchInput.dataset.wired = 'true'
    searchInput.addEventListener('input', () => {
      renderSubjectsOverview(bridge, subjects)
    })
  }
}

export async function openSubjectDetailView(bridge: GravitasDesktopBridge, subjectCode: string): Promise<void> {
  activateSurface('surface-subjects')
  const overviewEl = document.getElementById('subjects-overview-view')
  const detailEl = document.getElementById('subject-detail-view')
  if (overviewEl) overviewEl.style.display = 'none'
  if (detailEl) detailEl.style.display = 'block'

  window.scrollTo({ top: 0, behavior: 'smooth' })

  const codeEl = document.getElementById('subject-detail-code')
  const titleEl = document.getElementById('subject-detail-title')
  const creditsEl = document.getElementById('subject-detail-credits')
  const descEl = document.getElementById('subject-detail-desc')
  const contentEl = document.getElementById('subject-detail-panel-content')

  if (codeEl) codeEl.textContent = subjectCode
  if (titleEl) titleEl.textContent = 'Loading subject...'
  if (contentEl) contentEl.innerHTML = '<div class="empty-state-editorial">Loading subject workspace projection...</div>'

  try {
    let workspaceProjection: SubjectWorkspaceProjection | undefined
    if (bridge.executeStudyGuardianOperation) {
      const res = await bridge.executeStudyGuardianOperation({
        action: 'GET_SUBJECT_WORKSPACE',
        subjectCodeOrQuery: subjectCode,
      })
      workspaceProjection = res.subjectWorkspace
    }

    if (!workspaceProjection) {
      if (contentEl) contentEl.innerHTML = `<div class="empty-state-editorial">Could not load workspace for ${subjectCode}.</div>`
      return
    }

    const { subject, notes, assignments, answers, resources, revisionTasks, knowledgeHubItems } = workspaceProjection

    if (codeEl) codeEl.textContent = subject.code
    if (titleEl) titleEl.textContent = subject.name || subject.code
    if (creditsEl) creditsEl.textContent = `${subject.credits} Credits`
    if (descEl) descEl.textContent = subject.notes || `Curriculum workspace for ${subject.name || subject.code}.`

    const allNotes = [
      ...notes.map((n) => ({
        id: n.entryId,
        title: n.title,
        content: n.generatedOrEditedContent || n.originalContent,
        updatedAt: n.updatedAt,
        type: 'ENTRY',
      })),
      ...(knowledgeHubItems || [])
        .filter((k) => k.collection !== 'PLAN_TASK')
        .map((k) => ({
          id: k.id,
          title: k.title,
          content: k.originalText || k.summary || '',
          updatedAt: k.updatedAt,
          type: 'HUB',
        })),
    ]

    const allTasks = [
      ...revisionTasks.map((t) => ({
        id: t.entryId,
        title: t.title,
        completed: false,
        type: 'ENTRY',
      })),
      ...(knowledgeHubItems || [])
        .filter((k) => k.collection === 'PLAN_TASK')
        .map((k) => ({
          id: k.id,
          title: k.title,
          completed: Boolean(k.completed),
          type: 'HUB',
        })),
    ]

    const notesCount = allNotes.length
    const asgnCount = assignments.length
    const ansCount = answers.length
    const resCount = resources.length
    const tasksCount = allTasks.length

    const setElText = (id: string, text: string) => {
      const el = document.getElementById(id)
      if (el) el.textContent = text
    }

    setElText('subject-tab-notes-count', String(notesCount))
    setElText('subject-tab-assignments-count', String(asgnCount))
    setElText('subject-tab-answers-count', String(ansCount))
    setElText('subject-tab-resources-count', String(resCount))
    setElText('subject-tab-tasks-count', String(tasksCount))

    const statsBar = document.getElementById('subject-detail-stats-bar')
    if (statsBar) {
      statsBar.innerHTML = ''
      const addStatPill = (label: string, count: number) => {
        const pill = document.createElement('span')
        pill.className = `subject-stat-pill ${count > 0 ? 'active' : 'subtle'}`
        pill.innerHTML = `<strong>${count}</strong> ${label}`
        statsBar.appendChild(pill)
      }
      addStatPill('notes', notesCount)
      addStatPill('assignments', asgnCount)
      addStatPill('answers', ansCount)
      addStatPill('resources', resCount)
      addStatPill('revisions', tasksCount)
    }

    let activeTab: 'NOTES' | 'ASSIGNMENTS' | 'ANSWERS' | 'RESOURCES' | 'REVISION_TASKS' = 'NOTES'

    const renderActiveTab = () => {
      if (!contentEl) return
      contentEl.innerHTML = ''

      document.querySelectorAll('.subject-nav-tab').forEach((b) => {
        const tab = b.getAttribute('data-subject-tab')
        if (tab === activeTab) {
          b.classList.add('active')
          b.setAttribute('aria-selected', 'true')
        } else {
          b.classList.remove('active')
          b.setAttribute('aria-selected', 'false')
        }
      })

      if (activeTab === 'NOTES') {
        if (allNotes.length === 0) {
          contentEl.innerHTML = `
            <div class="empty-state-editorial">
              No notes for ${subject.code} yet.
              <div style="margin-top: 10px;">
                <button id="subject-tab-empty-note-btn" class="btn btn-secondary">+ Create Note for this Subject</button>
              </div>
            </div>
          `
          contentEl.querySelector('#subject-tab-empty-note-btn')?.addEventListener('click', () => {
            activateSurface('surface-notes')
            startNewNote()
            const subjInput = document.getElementById('notes-input-subject') as HTMLInputElement | null
            if (subjInput) {
              subjInput.value = subject.code
              subjInput.dispatchEvent(new Event('input'))
            }
          })
          return
        }

        for (const n of allNotes) {
          const card = document.createElement('div')
          card.className = 'subject-entry-card'
          if (n.type === 'HUB') {
            card.style.cursor = 'pointer'
            card.title = 'Click to open in Knowledge Hub'
            card.addEventListener('click', () => {
              activateSurface('surface-notes')
              void openNoteInEditor(bridge, n.id)
            })
          }

          const hRow = document.createElement('div')
          hRow.className = 'subject-entry-header'
          const hTitle = document.createElement('h4')
          hTitle.className = 'subject-entry-title'
          hTitle.textContent = n.title
          const hDate = document.createElement('span')
          hDate.className = 'subject-entry-meta'
          hDate.textContent = n.type === 'HUB' ? 'Knowledge Hub Note' : 'Subject Entry'

          hRow.appendChild(hTitle)
          hRow.appendChild(hDate)
          card.appendChild(hRow)

          if (n.content) {
            const body = document.createElement('div')
            body.className = 'subject-entry-content'
            body.textContent = n.content.slice(0, 300) + (n.content.length > 300 ? '...' : '')
            card.appendChild(body)
          }

          contentEl.appendChild(card)
        }
      } else if (activeTab === 'ASSIGNMENTS') {
        if (assignments.length === 0) {
          contentEl.innerHTML = `<div class="empty-state-editorial">No active assignments for ${subject.code}. Ingest assignments via Phone Inbox or create one.</div>`
          return
        }
        for (const a of assignments) {
          const card = document.createElement('div')
          card.className = 'subject-entry-card'
          const hRow = document.createElement('div')
          hRow.className = 'subject-entry-header'
          const hTitle = document.createElement('h4')
          hTitle.className = 'subject-entry-title'
          hTitle.textContent = a.title
          hRow.appendChild(hTitle)
          card.appendChild(hRow)

          const body = document.createElement('div')
          body.className = 'subject-entry-content'
          body.textContent = a.generatedOrEditedContent || a.originalContent
          card.appendChild(body)
          contentEl.appendChild(card)
        }
      } else if (activeTab === 'ANSWERS') {
        if (answers.length === 0) {
          contentEl.innerHTML = `<div class="empty-state-editorial">No answers or homework solutions generated for ${subject.code} yet.</div>`
          return
        }
        for (const ans of answers) {
          const card = document.createElement('div')
          card.className = 'subject-entry-card'
          const hRow = document.createElement('div')
          hRow.className = 'subject-entry-header'
          const hTitle = document.createElement('h4')
          hTitle.className = 'subject-entry-title'
          hTitle.textContent = ans.title
          hRow.appendChild(hTitle)
          card.appendChild(hRow)

          const body = document.createElement('div')
          body.className = 'subject-entry-content'
          body.textContent = ans.generatedOrEditedContent || ans.originalContent
          card.appendChild(body)
          contentEl.appendChild(card)
        }
      } else if (activeTab === 'RESOURCES') {
        if (resources.length === 0) {
          contentEl.innerHTML = `<div class="empty-state-editorial">No learning resources or syllabus attachments for ${subject.code} yet.</div>`
          return
        }
        for (const r of resources) {
          const card = document.createElement('div')
          card.className = 'subject-entry-card'
          const hRow = document.createElement('div')
          hRow.className = 'subject-entry-header'
          const hTitle = document.createElement('h4')
          hTitle.className = 'subject-entry-title'
          hTitle.textContent = r.title
          hRow.appendChild(hTitle)
          card.appendChild(hRow)

          const body = document.createElement('div')
          body.className = 'subject-entry-content'
          body.textContent = r.generatedOrEditedContent || r.originalContent
          card.appendChild(body)
          contentEl.appendChild(card)
        }
      } else if (activeTab === 'REVISION_TASKS') {
        if (allTasks.length === 0) {
          contentEl.innerHTML = `
            <div class="empty-state-editorial">
              No pending revision tasks for ${subject.code}.
              <div style="margin-top: 10px;">
                <button id="subject-tab-empty-task-btn" class="btn btn-secondary">+ Add Revision Task</button>
              </div>
            </div>
          `
          contentEl.querySelector('#subject-tab-empty-task-btn')?.addEventListener('click', async () => {
            const taskTitle = prompt(`Add revision task for ${subject.code}:`)
            if (taskTitle && bridge.saveIdea) {
              await bridge.saveIdea({
                title: taskTitle,
                originalText: taskTitle,
                collection: 'PLAN_TASK',
                subject: subject.code,
              })
              await openSubjectDetailView(bridge, subject.code)
            }
          })
          return
        }

        for (const t of allTasks) {
          const item = document.createElement('div')
          item.className = `task-item ${t.completed ? 'completed' : ''}`

          const chk = document.createElement('input')
          chk.type = 'checkbox'
          chk.className = 'tactile-checkbox task-checkbox'
          chk.checked = t.completed
          chk.setAttribute('aria-label', `Mark "${t.title}" ${t.completed ? 'incomplete' : 'complete'}`)
          chk.addEventListener('change', async () => {
            if (chk.checked) {
              item.classList.add('completed')
            } else {
              item.classList.remove('completed')
            }
            if (t.type === 'HUB' && bridge.completeTask) {
              await bridge.completeTask(t.id, chk.checked)
            }
          })

          const cont = document.createElement('div')
          cont.className = 'task-content'
          const txt = document.createElement('span')
          txt.className = 'task-text'
          txt.textContent = t.title
          cont.appendChild(txt)

          item.appendChild(chk)
          item.appendChild(cont)
          contentEl.appendChild(item)
        }
      }
    }

    document.querySelectorAll<HTMLButtonElement>('.subject-nav-tab').forEach((btn) => {
      btn.onclick = () => {
        const tab = btn.getAttribute('data-subject-tab') as typeof activeTab
        if (tab) {
          activeTab = tab
          renderActiveTab()
        }
      }
    })

    renderActiveTab()

    const backBtn = document.getElementById('subject-detail-back-btn')
    if (backBtn) {
      backBtn.onclick = () => {
        if (detailEl) detailEl.style.display = 'none'
        if (overviewEl) overviewEl.style.display = 'block'
      }
    }

    const newNoteBtn = document.getElementById('subject-detail-btn-new-note')
    if (newNoteBtn) {
      newNoteBtn.onclick = () => {
        activateSurface('surface-notes')
        startNewNote()
        const subjInput = document.getElementById('notes-input-subject') as HTMLInputElement | null
        if (subjInput) {
          subjInput.value = subject.code
          subjInput.dispatchEvent(new Event('input'))
        }
      }
    }

    const newTaskBtn = document.getElementById('subject-detail-btn-new-task')
    if (newTaskBtn) {
      newTaskBtn.onclick = async () => {
        const taskTitle = prompt(`Enter revision task title for ${subject.code}:`)
        if (taskTitle && bridge.saveIdea) {
          await bridge.saveIdea({
            title: taskTitle,
            originalText: taskTitle,
            collection: 'PLAN_TASK',
            subject: subject.code,
          })
          await openSubjectDetailView(bridge, subject.code)
        }
      }
    }

  } catch (err) {
    if (contentEl) contentEl.innerHTML = `<div class="empty-state-editorial">Failed to load subject workspace: ${String(err)}</div>`
  }
}

export async function refreshWorkspace(bridge: GravitasDesktopBridge): Promise<void> {
  // 1. Dynamic Greeting
  const greetingEl = document.getElementById('workspace-greeting')
  if (greetingEl) {
    const hour = new Date().getHours()
    if (hour < 12) greetingEl.textContent = 'Good morning'
    else if (hour < 17) greetingEl.textContent = 'Good afternoon'
    else greetingEl.textContent = 'Good evening'
  }

  // 1b. Engine Status Pill
  try {
    const health = await bridge.getHealth()
    const statusDot = document.getElementById('workspace-status-dot')
    const statusText = document.getElementById('workspace-status-text')
    if (statusText) {
      if (health.status === 'READY') {
        statusText.textContent = 'Local Engine Ready'
        if (statusDot) statusDot.style.background = 'var(--badge-ready)'
      } else if (health.status === 'OFFLINE') {
        statusText.textContent = 'Local Engine Offline'
        if (statusDot) statusDot.style.background = 'var(--badge-offline)'
      } else {
        statusText.textContent = `Local Engine ${health.status}`
        if (statusDot) statusDot.style.background = 'var(--badge-waiting)'
      }
    }
  } catch {}

  let totalSubjectCount = 0
  let pendingTaskCount = 0

  // 2. Load Tasks with Priority Grouping (Overdue, Due Today, Upcoming, Completed)
  try {
    const tasks = (await bridge.listIdeas?.({ collection: 'PLAN_TASK' })) || []
    pendingTaskCount = tasks.filter((t) => !t.completed).length
    const countEl = document.getElementById('workspace-tasks-count')
    if (countEl) countEl.textContent = String(tasks.length)

    const listEl = document.getElementById('workspace-tasks-list')
    const fullTasksEl = document.getElementById('tasks-full-list')

    const now = new Date()
    const todayStr = now.toISOString().slice(0, 10)

    const isOverdue = (t: IdeaRecord) => !t.completed && Boolean(t.dueDate) && t.dueDate!.slice(0, 10) < todayStr
    const isDueToday = (t: IdeaRecord) => !t.completed && Boolean(t.dueDate) && t.dueDate!.slice(0, 10) === todayStr
    const isUpcoming = (t: IdeaRecord) => !t.completed && (!t.dueDate || t.dueDate.slice(0, 10) > todayStr)
    const isDone = (t: IdeaRecord) => Boolean(t.completed)

    const renderTaskItem = (t: IdeaRecord): HTMLElement => {
      const item = document.createElement('div')
      item.className = `task-item ${t.completed ? 'completed' : ''}`

      const chk = document.createElement('input')
      chk.type = 'checkbox'
      chk.className = 'tactile-checkbox task-checkbox'
      chk.checked = Boolean(t.completed)
      chk.setAttribute('aria-label', `Mark "${t.title}" ${t.completed ? 'incomplete' : 'complete'}`)
      chk.title = t.completed ? 'Mark task incomplete' : 'Mark task complete'
      chk.addEventListener('change', async () => {
        if (chk.checked) {
          item.classList.add('completed')
        } else {
          item.classList.remove('completed')
        }
        if (bridge.completeTask) {
          await bridge.completeTask(t.id, chk.checked)
          await refreshWorkspace(bridge)
        }
      })

      const content = document.createElement('div')
      content.className = 'task-content'

      const text = document.createElement('span')
      text.className = 'task-text'
      text.textContent = t.title

      content.appendChild(text)

      const metaRow = document.createElement('div')
      metaRow.style.display = 'flex'
      metaRow.style.alignItems = 'center'
      metaRow.style.gap = '6px'

      if (t.subject) {
        const subjTag = document.createElement('span')
        subjTag.className = 'task-tag'
        subjTag.style.background = 'var(--accent-sage-subtle)'
        subjTag.style.color = 'var(--accent-sage)'
        subjTag.textContent = t.subject
        metaRow.appendChild(subjTag)
      }

      if (t.dueDate) {
        const dueTag = document.createElement('span')
        dueTag.className = 'task-tag'
        const dStr = t.dueDate.slice(0, 10)
        if (dStr < todayStr && !t.completed) {
          dueTag.style.background = 'rgba(201, 107, 97, 0.15)'
          dueTag.style.color = 'var(--badge-offline)'
          dueTag.textContent = `Overdue · ${dStr}`
        } else if (dStr === todayStr && !t.completed) {
          dueTag.style.background = 'rgba(199, 157, 94, 0.15)'
          dueTag.style.color = 'var(--badge-waiting)'
          dueTag.textContent = 'Due Today'
        } else {
          dueTag.textContent = `Due ${dStr}`
        }
        metaRow.appendChild(dueTag)
      } else if (t.tags && t.tags.length > 0) {
        const tag = document.createElement('span')
        tag.className = 'task-tag'
        tag.textContent = t.tags[0]!
        metaRow.appendChild(tag)
      }

      content.appendChild(metaRow)
      item.appendChild(chk)
      item.appendChild(content)
      return item
    }

    const renderTaskNodes = (target: HTMLElement, isCompact = false) => {
      if (tasks.length === 0) {
        target.innerHTML = `
          <div class="empty-state-editorial">
            <div style="font-weight: 550; color: var(--text-primary); margin-bottom: 4px;">All clear — no pending study tasks</div>
            <p style="margin: 0 0 12px 0; color: var(--text-secondary); font-size: 13px;">Add an assignment deadline, revision milestone, or import study notes from your phone.</p>
            <div style="display: flex; gap: 8px; justify-content: center;">
              <button id="workspace-empty-btn-task" class="btn btn-secondary" style="font-size: 12px; padding: 5px 12px;">+ Add Task</button>
            </div>
          </div>
        `
        target.querySelector('#workspace-empty-btn-task')?.addEventListener('click', () => {
          document.getElementById('workspace-btn-add-task-modal')?.click()
        })
        return
      }

      target.innerHTML = ''

      if (isCompact) {
        // Workspace Home Stream: prioritized slice (Overdue -> Due Today -> Upcoming -> Undated -> Completed)
        const getPriorityWeight = (t: IdeaRecord): number => {
          if (t.completed) return 100
          if (isOverdue(t)) return 1
          if (isDueToday(t)) return 2
          if (t.dueDate) return 3
          return 4
        }
        const sorted = [...tasks].sort((a, b) => {
          const wA = getPriorityWeight(a)
          const wB = getPriorityWeight(b)
          if (wA !== wB) return wA - wB
          const dueA = a.dueDate ? a.dueDate.slice(0, 10) : '9999-99-99'
          const dueB = b.dueDate ? b.dueDate.slice(0, 10) : '9999-99-99'
          if (dueA !== dueB) return dueA.localeCompare(dueB)
          return (b.updatedAt || '').localeCompare(a.updatedAt || '')
        })
        const slice = sorted.slice(0, 6)
        for (const t of slice) {
          target.appendChild(renderTaskItem(t))
        }
      } else {
        // Full Tasks Page: Grouped by Overdue, Due Today, Upcoming, Completed
        const groups = [
          { title: 'Overdue', items: tasks.filter(isOverdue), color: 'var(--badge-offline)' },
          { title: 'Due Today', items: tasks.filter(isDueToday), color: 'var(--badge-waiting)' },
          { title: 'Upcoming & Open', items: tasks.filter(isUpcoming), color: 'var(--text-primary)' },
          { title: 'Completed', items: tasks.filter(isDone), color: 'var(--text-tertiary)' },
        ]

        for (const g of groups) {
          if (g.items.length === 0 && g.title !== 'Upcoming & Open') continue
          const groupSec = document.createElement('div')
          groupSec.style.marginBottom = '20px'

          const header = document.createElement('div')
          header.style.display = 'flex'
          header.style.justifyContent = 'space-between'
          header.style.alignItems = 'center'
          header.style.marginBottom = '8px'
          header.style.borderBottom = '1px solid var(--border-subtle)'
          header.style.paddingBottom = '4px'

          const hTitle = document.createElement('span')
          hTitle.style.fontSize = '13.5px'
          hTitle.style.fontWeight = '600'
          hTitle.style.color = g.color
          hTitle.textContent = `${g.title} (${g.items.length})`

          header.appendChild(hTitle)
          groupSec.appendChild(header)

          if (g.items.length === 0) {
            const empty = document.createElement('div')
            empty.className = 'empty-state-editorial'
            empty.style.padding = '12px'
            empty.textContent = 'None'
            groupSec.appendChild(empty)
          } else {
            for (const t of g.items) {
              groupSec.appendChild(renderTaskItem(t))
            }
          }
          target.appendChild(groupSec)
        }
      }
    }

    if (listEl) renderTaskNodes(listEl, true)
    if (fullTasksEl) renderTaskNodes(fullTasksEl, false)
  } catch {
    // Graceful fallback
  }

  // 3. Load Recent Notes & Ideas with Timestamp & Subject Badging
  try {
    const allIdeas = (await bridge.listIdeas?.()) || []
    const notesOnly = allIdeas.filter((i) => i.collection !== 'PLAN_TASK')
    const countEl = document.getElementById('workspace-notes-count')
    if (countEl) countEl.textContent = String(notesOnly.length)

    const listEl = document.getElementById('workspace-notes-list')
    const fullNotesEl = document.getElementById('notes-full-list')

    const renderNoteNodes = (target: HTMLElement, maxItems?: number) => {
      if (notesOnly.length === 0) {
        target.innerHTML = '<div class="empty-state-editorial">No recent notes. Use the quick capture bar above to write one.</div>'
        return
      }
      target.innerHTML = ''
      const slice = maxItems ? notesOnly.slice(0, maxItems) : notesOnly
      for (const n of slice) {
        const item = document.createElement('div')
        item.className = 'note-item'
        item.style.cursor = 'pointer'
        item.title = 'Click to open and edit note'
        item.addEventListener('click', () => {
          activateSurface('surface-notes')
          void openNoteInEditor(bridge, n.id)
        })

        const header = document.createElement('div')
        header.className = 'note-header'

        const title = document.createElement('div')
        title.className = 'note-title'
        title.textContent = n.title

        const date = document.createElement('div')
        date.className = 'note-date'
        const dObj = new Date(n.updatedAt)
        date.textContent = dObj.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })

        header.appendChild(title)
        header.appendChild(date)
        item.appendChild(header)

        const preview = document.createElement('div')
        preview.className = 'note-preview'
        preview.textContent = n.originalText || n.summary || 'No text preview.'
        item.appendChild(preview)

        if (n.subject || (n.tags && n.tags.length > 0)) {
          const footer = document.createElement('div')
          footer.style.display = 'flex'
          footer.style.gap = '6px'
          footer.style.marginTop = '6px'

          if (n.subject) {
            const subjTag = document.createElement('span')
            subjTag.className = 'task-tag'
            subjTag.style.background = 'var(--accent-sage-subtle)'
            subjTag.style.color = 'var(--accent-sage)'
            subjTag.textContent = n.subject
            footer.appendChild(subjTag)
          }
          if (n.tags) {
            for (const tg of n.tags.slice(0, 2)) {
              const tEl = document.createElement('span')
              tEl.className = 'task-tag'
              tEl.textContent = tg
              footer.appendChild(tEl)
            }
          }
          item.appendChild(footer)
        }

        target.appendChild(item)
      }
    }

    if (listEl) renderNoteNodes(listEl, 4)
    if (document.getElementById('notes-master-list')) {
      void loadAndRenderNotesList(bridge)
    }
  } catch {
    // Graceful fallback
  }

  // 4. Load Subjects & Collections
  try {
    const subjects = (await bridge.listStudySubjects?.()) || []
    totalSubjectCount = subjects.length
    const countEl = document.getElementById('workspace-subjects-count')
    if (countEl) countEl.textContent = String(subjects.length)

    const datalist = document.getElementById('notes-subject-datalist')
    if (datalist && subjects.length > 0) {
      datalist.innerHTML = ''
      for (const s of subjects) {
        const opt = document.createElement('option')
        opt.value = s.code || s.subject
        datalist.appendChild(opt)
      }
    }

    const quickSubjectSelect = document.getElementById('workspace-quick-subject') as HTMLSelectElement | null
    if (quickSubjectSelect) {
      const prevVal = quickSubjectSelect.value
      quickSubjectSelect.innerHTML = '<option value="">No subject</option>'
      for (const s of subjects) {
        const opt = document.createElement('option')
        opt.value = s.code || s.subject
        opt.textContent = s.name && s.name !== s.code ? `${s.code || s.subject} (${s.name})` : (s.code || s.subject)
        quickSubjectSelect.appendChild(opt)
      }
      quickSubjectSelect.value = prevVal
    }

    // Compact Sidebar Subjects List
    const compactListEl = document.getElementById('workspace-subjects-compact-list')
    if (compactListEl) {
      if (subjects.length === 0) {
        compactListEl.innerHTML = '<div class="empty-state-editorial" style="padding: 6px; font-size: 12px;">No subjects enrolled.</div>'
      } else {
        compactListEl.innerHTML = ''
        for (const s of subjects) {
          const chip = document.createElement('button')
          chip.className = 'rail-compact-chip'
          const totalActivity = (s.noteCount || 0) + (s.taskCount || 0) + (s.assignmentCount || 0)
          if (totalActivity > 0) {
            chip.classList.add('has-activity')
          }
          const labelCode = s.code || s.subject
          chip.textContent = totalActivity > 0 ? `${labelCode} (${totalActivity})` : labelCode
          chip.title = `${s.name || s.subject} — ${totalActivity > 0 ? `${totalActivity} active items` : 'Curriculum ready'}`
          chip.addEventListener('click', () => {
            void openSubjectDetailView(bridge, s.code || s.subject)
          })
          compactListEl.appendChild(chip)
        }
      }
    }

    const viewAllBtn = document.getElementById('workspace-btn-view-all-subjects')
    if (viewAllBtn) {
      viewAllBtn.textContent = `View All Subjects (${subjects.length}) →`
      viewAllBtn.onclick = () => {
        activateSurface('surface-subjects')
        const overviewEl = document.getElementById('subjects-overview-view')
        const detailEl = document.getElementById('subject-detail-view')
        if (overviewEl) overviewEl.style.display = 'block'
        if (detailEl) detailEl.style.display = 'none'
      }
    }

    // Render Full Subjects Overview View
    renderSubjectsOverview(bridge, subjects)
  } catch {
    // Graceful fallback
  }

  // 4b. Update Greeting Subtitle dynamically
  const subtitleEl = document.getElementById('workspace-greeting-subtitle')
  if (subtitleEl) {
    const subjWord = totalSubjectCount === 1 ? 'subject' : 'subjects'
    const taskWord = pendingTaskCount === 1 ? 'task' : 'tasks'
    if (pendingTaskCount > 0) {
      subtitleEl.textContent = `Here is your daily overview — ${totalSubjectCount} semester ${subjWord} active, ${pendingTaskCount} pending ${taskWord}.`
    } else {
      subtitleEl.textContent = `Here is your daily overview — ${totalSubjectCount} semester ${subjWord} active, all tasks caught up.`
    }
  }

  // 5. Load Phone Inbox Configuration with Verified Truthfulness
  try {
    if (bridge.executeStudyGuardianOperation) {
      const res = await bridge.executeStudyGuardianOperation({ action: 'GET_INBOX_CONFIG' })
      const pathEl = document.getElementById('workspace-inbox-path')
      const pillEl = document.getElementById('workspace-inbox-status-pill')
      const descEl = document.getElementById('workspace-inbox-desc')
      const btnEl = document.getElementById('workspace-btn-check-inbox')

      const folderPath = res.inboxConfig?.inboxFolderPath
      if (folderPath) {
        if (pathEl) pathEl.textContent = folderPath
        if (pillEl) {
          pillEl.textContent = res.inboxConfig.watcherActive ? 'Watching' : 'Configured'
          pillEl.className = 'badge ' + (res.inboxConfig.watcherActive ? 'badge-ready' : 'badge-waiting')
        }
        if (descEl) {
          descEl.textContent = 'Watching folder for assignment PDFs and notes from your phone.'
        }
        if (btnEl) btnEl.textContent = 'Check for incoming files'
      } else {
        if (pathEl) pathEl.textContent = 'No folder selected'
        if (pillEl) {
          pillEl.textContent = 'Not Configured'
          pillEl.className = 'badge badge-waiting'
        }
        if (descEl) {
          descEl.textContent = 'Select an iCloud Drive or local folder to automatically ingest homework assignments and notes from your phone.'
        }
        if (btnEl) btnEl.textContent = 'Configure Inbox Folder'
      }
    }
  } catch {
    // Graceful fallback
  }
}

export async function refreshAll(bridge: GravitasDesktopBridge): Promise<void> {
  const health = await bridge.getHealth()
  const badge = document.getElementById('kernel-status-badge')
  const pids = document.getElementById('pids-text')
  const proto = document.getElementById('protocol-version-text')

  if (badge) {
    badge.textContent = health.status
    badge.className =
      'badge ' +
      (health.status === 'READY'
        ? 'badge-ready'
        : health.status === 'OFFLINE'
        ? 'badge-offline'
        : 'badge-starting')
  }
  if (pids) pids.textContent = `Main: ${health.mainPid} / Kernel: ${health.kernelPid}`
  if (proto) proto.textContent = `Protocol: ${health.protocolVersion}`

  await Promise.all([
    refreshWorkspace(bridge),
    refreshOverview(bridge),
    refreshWorkHierarchy(bridge),
    refreshExecution(bridge),
    refreshVerification(bridge),
    refreshApprovalQueue(bridge),
    refreshSystem(bridge),
  ])
}

export function renderDoctorReport(container: HTMLElement, report: DoctorReport): void {
  container.innerHTML = ''

  const summary = document.createElement('div')
  summary.style.marginBottom = '12px'
  summary.style.display = 'flex'
  summary.style.justifyContent = 'space-between'
  summary.style.alignItems = 'center'
  summary.style.padding = '8px 12px'
  summary.style.borderRadius = '4px'
  summary.style.background = '#0b0f19'
  summary.style.border = '1px solid var(--border)'

  const statusColor =
    report.overallStatus === 'PASS'
      ? 'var(--badge-ready)'
      : report.overallStatus === 'WARN'
      ? 'var(--badge-waiting)'
      : 'var(--badge-offline)'

  summary.innerHTML = `
    <span><strong>Overall Status:</strong> <span style="color: ${statusColor}; font-family: monospace;">${report.overallStatus}</span> (Exit Code: ${report.exitCode})</span>
    <span style="font-size: 11px; color: var(--text-muted); font-family: monospace;">${report.timestamp}</span>
  `
  container.appendChild(summary)

  const table = document.createElement('table')
  const thead = document.createElement('thead')
  thead.innerHTML = '<tr><th>Code</th><th>Name</th><th>Severity</th><th>Status</th><th>Message</th><th>Remediation</th></tr>'
  table.appendChild(thead)

  const tbody = document.createElement('tbody')
  for (const c of report.checks) {
    const tr = document.createElement('tr')
    const color =
      c.status === 'OK'
        ? 'var(--badge-ready)'
        : c.status === 'WARNING'
        ? 'var(--badge-waiting)'
        : 'var(--badge-offline)'

    tr.innerHTML = `
      <td style="font-family: monospace; font-size: 11px;">${c.code}</td>
      <td style="font-weight: 600;">${c.name}</td>
      <td style="font-size: 11px; color: var(--text-muted);">${c.severity}</td>
      <td style="color: ${color}; font-weight: 600;">${c.status}</td>
      <td style="font-family: sans-serif; font-size: 12px;">${c.message}</td>
      <td style="font-size: 11px; color: var(--text-muted);">${c.remediation ?? '—'}</td>
    `
    tbody.appendChild(tr)
  }
  table.appendChild(tbody)
  container.appendChild(table)
}

interface ShaderController {
  start: () => void
  stop: () => void
  resize: () => void
}

export function initWelcomeArtShader(): ShaderController | null {
  const canvas = document.getElementById('welcome-art-canvas') as HTMLCanvasElement | null
  if (!canvas) return null

  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  let prefersReducedMotion = mediaQuery.matches

  const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null
  if (!gl) {
    const ctx = canvas.getContext('2d')
    if (ctx) {
      const img = new Image()
      img.src = 'assets/signature-blue-bg.png'
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      }
    }
    return null
  }

  const vsSource = `
    attribute vec2 a_position;
    varying vec2 v_uv;
    void main() {
      v_uv = (a_position + 1.0) * 0.5;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `

  const fsSource = `
    precision mediump float;
    uniform sampler2D u_image;
    uniform float u_time;
    uniform vec2 u_resolution;
    varying vec2 v_uv;

    void main() {
      vec2 uv = vec2(v_uv.x, 1.0 - v_uv.y);

      // Organic undulation with calm silk motion: period ~ 14 seconds
      float t = u_time * 0.45;

      // Multi-frequency sinusoidal displacement simulating billowing silk / satin
      float waveX = sin(uv.y * 3.4 + t) * 0.042 + cos(uv.x * 2.4 - t * 0.8) * 0.026;
      float waveY = cos(uv.x * 3.0 + t * 0.9) * 0.038 + sin(uv.y * 2.6 - t * 0.6) * 0.022;

      vec2 distortedUV = uv + vec2(waveX, waveY);
      distortedUV = clamp(distortedUV, vec2(0.005), vec2(0.995));

      vec4 texColor = texture2D(u_image, distortedUV);

      // Subtle lighting undulation along the crests of the waves
      float lightWave = sin((distortedUV.x * 2.6 + distortedUV.y * 1.8) - t * 0.75) * 0.065;
      texColor.rgb += vec3(lightWave * 0.22, lightWave * 0.52, lightWave * 0.95);

      // Soft vignette inside the frame
      vec2 d = v_uv - vec2(0.5);
      float vignette = clamp(1.0 - dot(d, d) * 0.45, 0.0, 1.0);
      texColor.rgb *= vignette;

      gl_FragColor = texColor;
    }
  `

  function createShader(glCtx: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
    const s = glCtx.createShader(type)
    if (!s) return null
    glCtx.shaderSource(s, source)
    glCtx.compileShader(s)
    if (!glCtx.getShaderParameter(s, glCtx.COMPILE_STATUS)) {
      glCtx.deleteShader(s)
      return null
    }
    return s
  }

  const vs = createShader(gl, gl.VERTEX_SHADER, vsSource)
  const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource)
  if (!vs || !fs) return null

  const program = gl.createProgram()
  if (!program) return null
  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    return null
  }

  const posBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer)
  const vertices = new Float32Array([
    -1, -1,
     1, -1,
    -1,  1,
    -1,  1,
     1, -1,
     1,  1,
  ])
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)

  const aPosLoc = gl.getAttribLocation(program, 'a_position')
  const uTimeLoc = gl.getUniformLocation(program, 'u_time')
  const uResLoc = gl.getUniformLocation(program, 'u_resolution')
  const uImageLoc = gl.getUniformLocation(program, 'u_image')

  const texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([10, 15, 25, 255]))
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

  let isRunning = false
  let animFrameId = 0
  let startTime = 0

  const img = new Image()
  img.src = 'assets/signature-blue-bg.png'
  img.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
    renderFrame(0)
  }

  function resize(): void {
    const rect = canvas.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = Math.round((rect.width || 480) * dpr)
    const h = Math.round((rect.height || 380) * dpr)
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
      gl.viewport(0, 0, w, h)
    }
  }

  function renderFrame(timeSec: number): void {
    if (!gl || !program) return
    gl.useProgram(program)

    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer)
    gl.enableVertexAttribArray(aPosLoc)
    gl.vertexAttribPointer(aPosLoc, 2, gl.FLOAT, false, 0, 0)

    gl.uniform1f(uTimeLoc, timeSec)
    gl.uniform2f(uResLoc, canvas.width, canvas.height)

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.uniform1i(uImageLoc, 0)

    gl.drawArrays(gl.TRIANGLES, 0, 6)
  }

  function loop(now: number): void {
    if (!isRunning) return
    if (startTime === 0) startTime = now
    const elapsed = (now - startTime) / 1000

    renderFrame(elapsed)

    if (!prefersReducedMotion) {
      animFrameId = requestAnimationFrame(loop)
    }
  }

  function start(): void {
    if (isRunning) return
    isRunning = true
    resize()
    if (prefersReducedMotion) {
      renderFrame(0)
    } else {
      startTime = performance.now()
      animFrameId = requestAnimationFrame(loop)
    }
  }

  function stop(): void {
    isRunning = false
    if (animFrameId) {
      cancelAnimationFrame(animFrameId)
      animFrameId = 0
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stop()
    } else {
      const d = document.getElementById('onboarding-dialog') as HTMLDialogElement | null
      if (d?.open && d.classList.contains('is-welcome')) {
        start()
      }
    }
  })

  mediaQuery.addEventListener('change', (e) => {
    prefersReducedMotion = e.matches
    if (prefersReducedMotion) {
      stop()
      renderFrame(0)
    } else {
      start()
    }
  })

  return { start, stop, resize }
}

export function applyTheme(theme: 'light' | 'dark'): void {
  const isLight = theme === 'light'
  document.body.classList.toggle('light-theme', isLight)
  try {
    localStorage.setItem('gravitas_theme', theme)
  } catch {
    // Ignore in test/restricted environments
  }
  const headerBtn = document.getElementById('btn-header-theme')
  if (headerBtn) {
    headerBtn.textContent = isLight ? 'Theme: Light' : 'Theme: Dark'
    headerBtn.setAttribute('aria-label', `Toggle Theme (current: ${theme})`)
  }
  const obBtn = document.getElementById('ob-btn-theme-toggle')
  if (obBtn) {
    obBtn.textContent = isLight ? 'Theme: Light' : 'Theme: Dark'
  }
}

export function toggleTheme(): void {
  const isLight = document.body.classList.contains('light-theme')
  applyTheme(isLight ? 'dark' : 'light')
}

export function initTheme(): void {
  try {
    const saved = localStorage.getItem('gravitas_theme')
    if (saved === 'light') {
      applyTheme('light')
    } else {
      applyTheme('dark')
    }
  } catch {
    applyTheme('dark')
  }

  window.addEventListener('storage', (e) => {
    if (e.key === 'gravitas_theme' && (e.newValue === 'light' || e.newValue === 'dark')) {
      applyTheme(e.newValue)
    }
  })
}

export function setupOnboardingController(bridge: GravitasDesktopBridge): void {
  const dialog = document.getElementById('onboarding-dialog') as HTMLDialogElement | null
  if (!dialog) return

  let currentScreen = 1
  const TOTAL_SCREENS = 5
  let selectedPlatform: PhoneSyncPlatform = 'IPHONE'
  let selectedAction: 'SAVE_IDEA' | 'CREATE_TASK' | 'IMPORT_ASSIGNMENT' | 'EXPLORE_SAMPLE' = 'SAVE_IDEA'

  const shaderCtrl = initWelcomeArtShader()

  dialog.classList.toggle('is-welcome', currentScreen === 1)
  dialog.addEventListener('close', () => {
    shaderCtrl?.stop()
  })

  const PHONE_INSTRUCTIONS: Record<string, string> = {
    IPHONE: `
      <strong>iPhone iCloud Drive Setup:</strong><br>
      1. On your iPhone, open Files, Safari, or your course app.<br>
      2. Tap <strong>Share ➔ Save to Files</strong>, and choose <code>iCloud Drive/GRAVITAS/Inbox</code>.<br>
      3. Select your local Windows iCloud Drive folder below.<br>
      4. GRAVITAS watches the folder and imports assignments and notes into your subjects automatically.
    `,
    ANDROID: `
      <strong>Android Folder Sync Setup:</strong><br>
      1. Install <strong>Syncthing</strong>, <strong>LocalSend</strong>, or use USB sync on Android.<br>
      2. Pair a mobile folder to a local folder on this Windows machine.<br>
      3. Choose that synchronized Windows folder below.<br>
      <em style="color: var(--text-muted);">Note: Uses standard local folder synchronization. No proprietary Android app required or claimed.</em>
    `,
    BOTH: `
      <strong>Dual Device Setup (iPhone & Android):</strong><br>
      Point the Windows Inbox to a central folder synchronized with iCloud Drive and your Android sync client.
    `,
    NONE: `
      <strong>Local-Only Mode:</strong><br>
      No phone synchronization configured. Notes, assignments, and tasks will be captured directly via Windows desktop companion or file drag-and-drop.
    `,
  }

  function updateDots(screen: number): void {
    const dots = document.querySelectorAll('.ob-dot')
    dots.forEach((d) => {
      const step = Number((d as HTMLElement).dataset.step || '1')
      if (step === screen) {
        ;(d as HTMLElement).style.background = 'var(--accent-sage)'
      } else if (step < screen) {
        ;(d as HTMLElement).style.background = 'var(--accent-sage-subtle)'
        ;(d as HTMLElement).style.borderColor = 'var(--accent-sage)'
      } else {
        ;(d as HTMLElement).style.background = 'var(--border)'
      }
    })
  }

  function setScreen(screen: number): void {
    if (screen < 1 || screen > TOTAL_SCREENS) return
    currentScreen = screen

    const isWelcome = currentScreen === 1
    if (dialog) {
      dialog.classList.toggle('is-welcome', isWelcome)
    }

    const obHeader = document.querySelector('.ob-header') as HTMLElement | null
    const obProgressBar = document.querySelector('.ob-progress-bar') as HTMLElement | null
    const obFooter = document.querySelector('.ob-actions-footer') as HTMLElement | null

    if (obHeader) obHeader.style.display = isWelcome ? 'none' : 'flex'
    if (obProgressBar) obProgressBar.style.display = isWelcome ? 'none' : 'flex'
    if (obFooter) obFooter.style.display = isWelcome ? 'none' : 'flex'

    if (isWelcome) {
      shaderCtrl?.start()
    } else {
      shaderCtrl?.stop()
    }

    for (let i = 1; i <= TOTAL_SCREENS; i++) {
      const el = document.getElementById(`onboarding-screen-${i}`)
      if (el) {
        el.style.display = i === currentScreen ? (i === 1 ? 'grid' : 'block') : 'none'
      }
    }

    const indicator = document.getElementById('onboarding-step-indicator')
    if (indicator) indicator.textContent = `${currentScreen} of ${TOTAL_SCREENS}`

    updateDots(currentScreen)

    const btnPrev = document.getElementById('onboarding-btn-prev')
    const btnNext = document.getElementById('onboarding-btn-next')
    const btnFinish = document.getElementById('onboarding-btn-finish')

    if (btnPrev) btnPrev.style.display = currentScreen > 1 ? 'inline-block' : 'none'
    if (btnNext) btnNext.style.display = (currentScreen > 1 && currentScreen < TOTAL_SCREENS) ? 'inline-block' : 'none'
    if (btnFinish) btnFinish.style.display = currentScreen === TOTAL_SCREENS ? 'inline-block' : 'none'

    if (currentScreen === 3) {
      updatePhoneInstructions(selectedPlatform)
      if (bridge.executeStudyGuardianOperation) {
        void bridge.executeStudyGuardianOperation({ action: 'GET_INBOX_CONFIG' }).then((res) => {
          const input = document.getElementById('ob-inbox-folder-input') as HTMLInputElement | null
          if (input && res.inboxConfig?.inboxFolderPath) {
            input.value = res.inboxConfig.inboxFolderPath
          }
        })
      }
    }
  }

  function updatePhoneInstructions(platform: string): void {
    const container = document.getElementById('ob-phone-instructions')
    if (container) {
      container.innerHTML = PHONE_INSTRUCTIONS[platform] || PHONE_INSTRUCTIONS['IPHONE']!
    }
  }

  // Theme Toggle
  const themeToggle = document.getElementById('ob-btn-theme-toggle')
  themeToggle?.addEventListener('click', () => {
    toggleTheme()
  })

  // Screen 1: Welcome buttons
  document.getElementById('ob-btn-get-started')?.addEventListener('click', () => {
    setScreen(2)
  })

  document.getElementById('ob-btn-explore-demo')?.addEventListener('click', async () => {
    if (bridge.executeStudyGuardianOperation) {
      await bridge.executeStudyGuardianOperation({
        action: 'APPLY_PERSONA_SETUP',
        persona: 'EVERYTHING',
      })
      await bridge.executeStudyGuardianOperation({
        action: 'EXECUTE_FIRST_SUCCESS',
        successAction: 'EXPLORE_SAMPLE',
      })
    }
    setScreen(5)
    const card = document.getElementById('ob-persistence-card')
    const detail = document.getElementById('ob-persistence-detail')
    if (card && detail) {
      card.style.display = 'block'
      card.style.background = 'var(--bg-surface-subtle)'
      card.style.border = '1px solid var(--accent-sage)'
      const pill = document.getElementById('ob-persistence-type-pill')
      if (pill) pill.textContent = 'Workspace Sample'
      detail.textContent = 'Sample workspace collections have been seeded with projects, notes, and tasks.'
    }
  })

  // Screen 2: Persona Selection Cards
  const personaCards = document.querySelectorAll('.ob-persona-card')
  personaCards.forEach((card) => {
    card.addEventListener('click', () => {
      personaCards.forEach((c) => c.classList.remove('selected'))
      card.classList.add('selected')
      const radio = card.querySelector('input[type="radio"]') as HTMLInputElement | null
      if (radio) radio.checked = true

      const studentDetails = document.getElementById('ob-student-details')
      if (studentDetails) {
        studentDetails.style.display = radio?.value === 'STUDENT' ? 'block' : 'none'
      }
    })
  })

  // Screen 3: Phone Platform Tabs
  const phoneTabs = document.querySelectorAll('.ob-phone-tab')
  phoneTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      phoneTabs.forEach((t) => t.classList.remove('active'))
      tab.classList.add('active')
      selectedPlatform = ((tab as HTMLElement).dataset.platform as PhoneSyncPlatform) || 'IPHONE'
      updatePhoneInstructions(selectedPlatform)
    })
  })

  // Screen 3: Browse Folder
  document.getElementById('ob-btn-browse-inbox')?.addEventListener('click', async () => {
    if (bridge.selectInboxFolder) {
      const res = await bridge.selectInboxFolder()
      if (res.selected && res.folderPath) {
        const input = document.getElementById('ob-inbox-folder-input') as HTMLInputElement | null
        if (input) input.value = res.folderPath
      }
    }
  })

  // Screen 3: Test Inbox Connection
  document.getElementById('ob-btn-test-inbox')?.addEventListener('click', async () => {
    const input = document.getElementById('ob-inbox-folder-input') as HTMLInputElement | null
    const folder = input?.value.trim() || undefined
    const badge = document.getElementById('ob-inbox-status-badge')
    const messageEl = document.getElementById('ob-inbox-test-message')

    if (badge) {
      badge.style.display = 'inline-block'
      badge.className = 'badge badge-waiting'
      badge.textContent = 'Testing...'
    }
    if (messageEl) messageEl.textContent = 'Verifying inbox accessibility and sync status...'

    try {
      if (bridge.executeStudyGuardianOperation) {
        const res = await bridge.executeStudyGuardianOperation({
          action: 'TEST_INBOX_SETUP',
          folderPath: folder,
          checkType: 'full_scan',
        })

        const v = res.inboxVerificationResult
        if (badge && v) {
          if (v.state === 'CROSS_DEVICE_SYNC_VERIFIED' || v.state === 'LOCAL_IMPORT_VERIFIED' || v.state === 'FOLDER_ACCESSIBLE') {
            badge.className = 'badge badge-ready'
            badge.textContent = 'Connected'
          } else if (v.state === 'AWAITING_FIRST_FILE') {
            badge.className = 'badge badge-waiting'
            badge.textContent = 'Waiting for files'
          } else {
            badge.className = 'badge badge-offline'
            badge.textContent = 'Not configured'
          }
        }
        if (messageEl && v) {
          messageEl.textContent = v.message
        }
      }
    } catch (err) {
      if (badge) {
        badge.className = 'badge badge-offline'
        badge.textContent = 'Error'
      }
      if (messageEl) messageEl.textContent = `Verification error: ${(err as Error).message}`
    }
  })

  // Screen 5: Action Tabs
  const actionTabs = document.querySelectorAll('.ob-first-action-tab')
  actionTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      actionTabs.forEach((t) => t.classList.remove('active'))
      tab.classList.add('active')
      selectedAction = ((tab as HTMLElement).dataset.action as any) || 'SAVE_IDEA'

      const extraRow = document.getElementById('ob-input-row-extra')
      const titleInput = document.getElementById('ob-action-title') as HTMLInputElement | null
      const textInput = document.getElementById('ob-action-text') as HTMLInputElement | null

      if (extraRow) {
        extraRow.style.display = selectedAction === 'CREATE_TASK' ? 'block' : 'none'
      }

      if (selectedAction === 'SAVE_IDEA') {
        if (titleInput) titleInput.value = 'My first idea in GRAVITAS'
        if (textInput) textInput.value = 'Quick thought captured into Knowledge Hub.'
      } else if (selectedAction === 'CREATE_TASK') {
        if (titleInput) titleInput.value = 'Complete Chapter 2 revision problem set'
        if (textInput) textInput.value = 'Focus on asymptotic recurrence trees.'
      } else if (selectedAction === 'IMPORT_ASSIGNMENT') {
        if (titleInput) titleInput.value = 'Assignment 1 Solution Draft'
        if (textInput) textInput.value = 'Solve algorithmic problems and review with assistant.'
      } else if (selectedAction === 'EXPLORE_SAMPLE') {
        if (titleInput) titleInput.value = 'Explore sample workspace'
        if (textInput) textInput.value = 'Review seeded projects, notes, and tasks.'
      }
    })
  })

  // Screen 5: Execute Action
  document.getElementById('ob-btn-do-action')?.addEventListener('click', async () => {
    const titleInput = document.getElementById('ob-action-title') as HTMLInputElement | null
    const textInput = document.getElementById('ob-action-text') as HTMLInputElement | null
    const extraInput = document.getElementById('ob-action-extra') as HTMLInputElement | null

    const title = titleInput?.value.trim() || undefined
    const text = textInput?.value.trim() || undefined
    const dueDate = extraInput?.value || undefined

    const card = document.getElementById('ob-persistence-card')
    const detail = document.getElementById('ob-persistence-detail')

    try {
      if (bridge.executeStudyGuardianOperation) {
        const res = await bridge.executeStudyGuardianOperation({
          action: 'EXECUTE_FIRST_SUCCESS',
          successAction: selectedAction,
          title,
          text,
          dueDate,
        })

        if (res.firstSuccessResult && card && detail) {
          card.style.display = 'block'
          card.style.background = 'var(--bg-surface-subtle)'
          card.style.border = '1px solid var(--accent-sage)'
          const pill = document.getElementById('ob-persistence-type-pill')
          if (pill) pill.textContent = res.firstSuccessResult.collection || 'Item'
          detail.textContent = `"${res.firstSuccessResult.itemTitle}" has been saved to your local Knowledge Hub.`
          announce(`Action complete: ${res.firstSuccessResult.message}`)
        }
      }
    } catch (err) {
      if (card && detail) {
        card.style.display = 'block'
        card.style.background = 'var(--bg-surface-subtle)'
        card.style.border = '1px solid var(--danger)'
        detail.textContent = `Action failed: ${(err as Error).message}`
      }
    }
  })

  // Stepper Back/Next Navigation
  document.getElementById('onboarding-btn-prev')?.addEventListener('click', () => {
    setScreen(currentScreen - 1)
  })

  document.getElementById('onboarding-btn-next')?.addEventListener('click', async () => {
    // If moving from Screen 2, apply persona setup
    if (currentScreen === 2) {
      const selectedPersonaEl = document.querySelector('input[name="ob-persona"]:checked') as HTMLInputElement | null
      const persona = (selectedPersonaEl?.value as PersonaArchetype) || 'STUDENT'
      const customSubjInput = (document.getElementById('ob-custom-subjects-input') as HTMLInputElement | null)?.value || ''
      const customSubjects = customSubjInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      const useSevenSubjectTemplate = (document.getElementById('ob-use-7-subject-template') as HTMLInputElement | null)?.checked

      const statusEl = document.getElementById('ob-persona-status')
      if (statusEl) statusEl.textContent = 'Applying workspace setup...'

      try {
        if (bridge.executeStudyGuardianOperation) {
          const res = await bridge.executeStudyGuardianOperation({
            action: 'APPLY_PERSONA_SETUP',
            persona,
            customSubjects: customSubjects.length > 0 ? customSubjects : undefined,
            useSevenSubjectTemplate,
          })
          if (statusEl && res.personaSetupResult) {
            statusEl.textContent = res.personaSetupResult.message
          }
        }
      } catch (err) {
        if (statusEl) statusEl.textContent = `Setup error: ${(err as Error).message}`
      }
    }

    // If moving from Screen 4, save assistant preferences
    if (currentScreen === 4) {
      const shortcut = (document.getElementById('ob-shortcut-input') as HTMLInputElement | null)?.value || 'Alt+Space'
      const freq = Number((document.getElementById('ob-reminder-frequency-select') as HTMLSelectElement | null)?.value || '60')
      const qStart = (document.getElementById('ob-quiet-start') as HTMLInputElement | null)?.value || '22:00'
      const qEnd = (document.getElementById('ob-quiet-end') as HTMLInputElement | null)?.value || '08:00'
      const notifs = (document.getElementById('ob-notifications-enabled') as HTMLInputElement | null)?.checked ?? true
      const startWin = (document.getElementById('ob-start-with-windows') as HTMLInputElement | null)?.checked ?? false

      await bridge.saveOnboarding({
        completed: false,
        step: 'FIRST_SUCCESS',
        preferences: {
          companionShortcut: shortcut,
          assistantShortcut: shortcut,
          reminderFrequencyMinutes: freq,
          reminderIntervalMinutes: freq,
          quietHoursStart: qStart,
          quietHoursEnd: qEnd,
          notificationsEnabled: notifs,
          startWithWindows: startWin,
          phonePlatform: selectedPlatform,
          defaultDenyCloudEgress: true,
        },
      })
    }

    setScreen(currentScreen + 1)
  })

  document.getElementById('onboarding-btn-close')?.addEventListener('click', () => {
    dialog.close()
  })

  // Finish Setup Button (Screen 5)
  document.getElementById('onboarding-btn-finish')?.addEventListener('click', async () => {
    try {
      await bridge.saveOnboarding({
        completed: true,
        step: 'COMPLETED',
      })
      announce('Setup complete! Welcome to GRAVITAS.')
      dialog.close()
      await refreshAll(bridge)
    } catch (err) {
      alert(`Failed to complete onboarding: ${(err as Error).message}`)
    }
  })

  // Header & System Surface "Run setup again" Buttons
  document.getElementById('btn-header-onboarding')?.addEventListener('click', () => {
    setScreen(1)
    dialog.showModal()
  })

  document.getElementById('btn-run-setup-wizard')?.addEventListener('click', async () => {
    if (bridge.executeStudyGuardianOperation) {
      await bridge.executeStudyGuardianOperation({ action: 'RESET_ONBOARDING' })
    }
    setScreen(1)
    dialog.showModal()
  })

  document.getElementById('btn-run-doctor')?.addEventListener('click', async () => {
    const card = document.getElementById('card-doctor-results')
    const container = document.getElementById('doctor-results-container')
    if (card) card.style.display = 'block'
    if (container) container.textContent = 'Running Gravitas Doctor diagnostics...'
    try {
      const rep = await bridge.runDoctor()
      if (container) renderDoctorReport(container, rep)
      announce(`Doctor report complete: ${rep.overallStatus}`)
    } catch (err) {
      if (container) container.textContent = `Doctor execution failed: ${(err as Error).message}`
    }
  })

  // Auto-prompt on initial launch if not completed
  void bridge.getOnboarding().then((ob) => {
    if (!ob.completed && !ob.isTest) {
      let startStep = 1
      if (ob.step === 'PERSONALIZE') startStep = 2
      else if (ob.step === 'PHONE_SETUP') startStep = 3
      else if (ob.step === 'ASSISTANT_PREFS') startStep = 4
      else if (ob.step === 'FIRST_SUCCESS') startStep = 5

      setScreen(startStep)
      dialog.showModal()
    }
  })
}

export function initModelDispatch(bridge: GravitasDesktopBridge): void {
  const btn = document.getElementById('btn-dispatch-model')
  const selectModel = document.getElementById('select-dispatch-model') as HTMLSelectElement | null
  const inputPrompt = document.getElementById('input-dispatch-prompt') as HTMLInputElement | null
  const statusIndicator = document.getElementById('dispatch-status-indicator')
  const resultContainer = document.getElementById('dispatch-result-container')
  const resultMeta = document.getElementById('dispatch-result-meta')
  const resultOutput = document.getElementById('dispatch-result-output')

  if (!btn) return

  btn.addEventListener('click', async () => {
    const requestedModelId = selectModel?.value || 'meta/llama-3.1-8b-instruct'
    const prompt = inputPrompt?.value.trim() || 'Explain cryptographic signatures vs hashes.'

    if (statusIndicator) {
      statusIndicator.textContent = 'Dispatching via KernelHost...'
      statusIndicator.style.color = '#38bdf8'
    }
    btn.setAttribute('disabled', 'true')

    try {
      const result = await bridge.dispatchModel({
        modelId: requestedModelId,
        prompt,
      })

      if (result.success) {
        if (statusIndicator) {
          statusIndicator.textContent = `Succeeded (${result.provider}) — Task ${result.taskId}`
          statusIndicator.style.color = 'var(--badge-ready)'
        }
        if (resultMeta) {
          resultMeta.textContent = `Model: ${result.actualModel} | Tokens: ${result.tokenUsage?.totalTokens ?? 0} | Execution ID: ${result.executionId} | Task: ${result.taskId}`
        }
        if (resultOutput) {
          resultOutput.textContent = result.outputContent || ''
        }
        if (resultContainer) {
          resultContainer.style.display = 'block'
        }
        announce(`Model dispatch succeeded for task ${result.taskId}`)
      } else {
        const errCat = result.errorTaxonomy || 'UNKNOWN'
        const errMsg = result.errorMessage || 'Unknown error'
        if (statusIndicator) {
          statusIndicator.textContent = `Failed [${errCat}]: ${errMsg}`
          statusIndicator.style.color = 'var(--badge-offline)'
        }
        if (resultMeta) {
          resultMeta.textContent = `Model: ${result.actualModel || requestedModelId} | Error Taxonomy: ${errCat}`
        }
        if (resultOutput) {
          resultOutput.textContent = errMsg
        }
        if (resultContainer) {
          resultContainer.style.display = 'block'
        }
        announce(`Model dispatch failed: ${errMsg}`)
      }
    } catch (err) {
      const msg = (err as Error).message
      if (statusIndicator) {
        statusIndicator.textContent = `IPC Error: ${msg}`
        statusIndicator.style.color = 'var(--badge-offline)'
      }
      if (resultMeta) {
        resultMeta.textContent = `Error: IPC failure`
      }
      if (resultOutput) {
        resultOutput.textContent = msg
      }
      if (resultContainer) {
        resultContainer.style.display = 'block'
      }
      announce(`Model dispatch error: ${msg}`)
    } finally {
      btn.removeAttribute('disabled')
      await refreshAll(bridge)
    }
  })
}

export async function navigateToTarget(
  bridge: GravitasDesktopBridge,
  target: { surface: string; targetId?: string }
): Promise<void> {
  if (target.surface === 'surface-notes') {
    activateSurface('surface-notes')
    if (target.targetId) {
      await openNoteInEditor(bridge, target.targetId)
    }
  } else if (target.surface === 'surface-subjects') {
    activateSurface('surface-subjects')
    if (target.targetId) {
      await openSubjectDetailView(bridge, target.targetId)
    }
  } else if (target.surface === 'surface-settings') {
    activateSurface('surface-settings')
  } else if (target.surface) {
    activateSurface(target.surface)
  }
}

export function setupSettingsController(bridge: GravitasDesktopBridge): void {
  const shortcutInput = document.getElementById('settings-shortcut-input') as HTMLInputElement | null
  const companionAlwaysOnTop = document.getElementById('settings-companion-always-on-top') as HTMLInputElement | null
  const companionCompactMode = document.getElementById('settings-companion-compact-mode') as HTMLInputElement | null
  const quietStart = document.getElementById('settings-quiet-start') as HTMLInputElement | null
  const quietEnd = document.getElementById('settings-quiet-end') as HTMLInputElement | null
  const reminderInterval = document.getElementById('settings-reminder-interval') as HTMLSelectElement | null
  const notifsEnabled = document.getElementById('settings-notifications-enabled') as HTMLInputElement | null
  const startWithWindows = document.getElementById('settings-start-with-windows') as HTMLInputElement | null
  const minimizeToTray = document.getElementById('settings-minimize-to-tray') as HTMLInputElement | null
  const themeSelect = document.getElementById('settings-theme-select') as HTMLSelectElement | null
  const modelSelect = document.getElementById('settings-model-router-select') as HTMLSelectElement | null
  const denyCloudEgress = document.getElementById('settings-deny-cloud-egress') as HTMLInputElement | null
  const inboxFolderInput = document.getElementById('settings-inbox-folder') as HTMLInputElement | null
  const inboxStatusPill = document.getElementById('settings-inbox-status-pill')
  const inboxMsg = document.getElementById('settings-inbox-message')
  const saveBtn = document.getElementById('settings-btn-save')
  const saveFeedback = document.getElementById('settings-save-feedback')
  const pickInboxBtn = document.getElementById('settings-btn-pick-inbox')
  const testInboxBtn = document.getElementById('settings-btn-test-inbox')
  const reopenObBtn = document.getElementById('settings-btn-reopen-onboarding')

  const loadSettings = async () => {
    try {
      const savedTheme = localStorage.getItem('gravitas_theme') || 'dark'
      if (themeSelect) themeSelect.value = savedTheme

      let settingsJson: any = {}
      try {
        const raw = localStorage.getItem('gravitas_settings')
        if (raw) settingsJson = JSON.parse(raw)
      } catch {}

      if (companionAlwaysOnTop && settingsJson.alwaysOnTop !== undefined) {
        companionAlwaysOnTop.checked = Boolean(settingsJson.alwaysOnTop)
      }
      if (companionCompactMode && settingsJson.compactMode !== undefined) {
        companionCompactMode.checked = Boolean(settingsJson.compactMode)
      }
      if (minimizeToTray && settingsJson.minimizeToTray !== undefined) {
        minimizeToTray.checked = Boolean(settingsJson.minimizeToTray)
      }
      if (modelSelect && settingsJson.modelTier) {
        modelSelect.value = settingsJson.modelTier
      }

      if (bridge.getOnboarding) {
        const ob = await bridge.getOnboarding()
        if (ob.preferences) {
          const p = ob.preferences
          if (shortcutInput && p.companionShortcut) shortcutInput.value = p.companionShortcut
          if (quietStart && p.quietHoursStart) quietStart.value = p.quietHoursStart
          if (quietEnd && p.quietHoursEnd) quietEnd.value = p.quietHoursEnd
          if (reminderInterval && p.reminderFrequencyMinutes) {
            reminderInterval.value = String(p.reminderFrequencyMinutes)
          }
          if (notifsEnabled && p.notificationsEnabled !== undefined) {
            notifsEnabled.checked = Boolean(p.notificationsEnabled)
          }
          if (startWithWindows && p.startWithWindows !== undefined) {
            startWithWindows.checked = Boolean(p.startWithWindows)
          }
          if (denyCloudEgress && p.defaultDenyCloudEgress !== undefined) {
            denyCloudEgress.checked = Boolean(p.defaultDenyCloudEgress)
          }
        }
      }

      if (bridge.executeStudyGuardianOperation) {
        const res = await bridge.executeStudyGuardianOperation({ action: 'GET_INBOX_CONFIG' })
        const path = res.inboxConfig?.inboxFolderPath
        if (inboxFolderInput && path) inboxFolderInput.value = path
        if (inboxStatusPill) {
          if (path) {
            inboxStatusPill.textContent = res.inboxConfig.watcherActive ? 'Watching' : 'Configured'
            inboxStatusPill.className = 'badge ' + (res.inboxConfig.watcherActive ? 'badge-ready' : 'badge-waiting')
          } else {
            inboxStatusPill.textContent = 'Not Configured'
            inboxStatusPill.className = 'badge badge-waiting'
          }
        }
      }
    } catch {
      // Graceful fallback
    }
  }

  void loadSettings()

  const saveSettings = async () => {
    try {
      const themeVal = themeSelect?.value as 'light' | 'dark'
      if (themeVal) {
        applyTheme(themeVal)
      }

      const settingsObj = {
        alwaysOnTop: companionAlwaysOnTop?.checked ?? true,
        compactMode: companionCompactMode?.checked ?? true,
        minimizeToTray: minimizeToTray?.checked ?? true,
        modelTier: modelSelect?.value || 'meta/llama-3.1-8b-instruct',
        theme: themeVal || 'dark',
      }
      localStorage.setItem('gravitas_settings', JSON.stringify(settingsObj))

      if (bridge.saveOnboarding) {
        await bridge.saveOnboarding({
          completed: true,
          step: 'COMPLETED',
          preferences: {
            companionShortcut: shortcutInput?.value || 'Alt+Space',
            assistantShortcut: shortcutInput?.value || 'Alt+Space',
            reminderFrequencyMinutes: Number(reminderInterval?.value || '180'),
            reminderIntervalMinutes: Number(reminderInterval?.value || '180'),
            quietHoursStart: quietStart?.value || '22:00',
            quietHoursEnd: quietEnd?.value || '07:00',
            notificationsEnabled: notifsEnabled?.checked ?? true,
            startWithWindows: startWithWindows?.checked ?? false,
            defaultDenyCloudEgress: denyCloudEgress?.checked ?? true,
          },
        })
      }

      if (saveFeedback) {
        saveFeedback.style.display = 'inline'
        saveFeedback.style.color = 'var(--success)'
        saveFeedback.textContent = '✓ Settings saved'
        setTimeout(() => {
          if (saveFeedback) saveFeedback.style.display = 'none'
        }, 3000)
      }
      announce('Settings saved successfully.')
    } catch (err) {
      if (saveFeedback) {
        saveFeedback.style.display = 'inline'
        saveFeedback.style.color = 'var(--danger)'
        saveFeedback.textContent = `Save failed: ${(err as Error).message}`
      }
    }
  }

  saveBtn?.addEventListener('click', () => {
    void saveSettings()
  })

  pickInboxBtn?.addEventListener('click', async () => {
    if (!bridge.selectInboxFolder || !bridge.executeStudyGuardianOperation) return
    const pick = await bridge.selectInboxFolder()
    if (pick.selected && pick.folderPath) {
      if (inboxFolderInput) inboxFolderInput.value = pick.folderPath
      const res = await bridge.executeStudyGuardianOperation({
        action: 'SET_INBOX_FOLDER',
        folderPath: pick.folderPath,
      })
      if (inboxStatusPill) {
        inboxStatusPill.textContent = 'Configured'
        inboxStatusPill.className = 'badge badge-ready'
      }
      if (inboxMsg) {
        inboxMsg.textContent = res.errorMessage ?? `Watching folder: ${pick.folderPath}`
      }
      announce(`Configured inbox folder: ${pick.folderPath}`)
    }
  })

  testInboxBtn?.addEventListener('click', async () => {
    if (!bridge.executeStudyGuardianOperation) return
    try {
      if (inboxMsg) inboxMsg.textContent = 'Testing connection and scanning folder...'
      const res = await bridge.executeStudyGuardianOperation({ action: 'TEST_INBOX_SETUP' })
      if (inboxMsg) {
        inboxMsg.textContent = res.inboxVerificationResult?.message || 'Inbox test complete.'
      }
      if (inboxStatusPill) {
        const ok = res.inboxVerificationResult?.isAccessible
        inboxStatusPill.textContent = ok ? 'Verified' : 'Error'
        inboxStatusPill.className = 'badge ' + (ok ? 'badge-ready' : 'badge-offline')
      }
      announce(res.inboxVerificationResult?.message || 'Inbox test complete.')
    } catch (err) {
      if (inboxMsg) inboxMsg.textContent = `Test failed: ${(err as Error).message}`
    }
  })

  reopenObBtn?.addEventListener('click', () => {
    const dialog = document.getElementById('onboarding-dialog') as HTMLDialogElement | null
    dialog?.showModal()
  })

  themeSelect?.addEventListener('change', () => {
    if (themeSelect.value === 'light' || themeSelect.value === 'dark') {
      applyTheme(themeSelect.value)
    }
  })
}

// ─── Initialization ──────────────────────────────────────────────────────────

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const bridge = window.gravitasDesktop
    if (!bridge) {
      announce('Desktop bridge unavailable')
      return
    }

    // Initialize onboarding & doctor controller
    setupOnboardingController(bridge)

    // Initialize model selection & router dispatch
    initModelDispatch(bridge)

    // Initialize dedicated settings controller
    setupSettingsController(bridge)

    // Tab navigation logic
    const tabs = document.querySelectorAll<HTMLButtonElement>('.nav-btn')
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const surfaceId = tab.getAttribute('data-surface')
        if (surfaceId) activateSurface(surfaceId)
      })
    })

    // D3 Living HQ: receives a RUNTIME-narrowed read-only D1 subset (no submitIntent/lifecycle methods exist on it).
    const worldSource: WorldDataSource = {
      getHealth: () => bridge.getHealth(),
      getOverview: () => bridge.getOverview(),
      getWorkHierarchy: () => bridge.getWorkHierarchy(),
      getApprovalQueue: () => bridge.getApprovalQueue(),
      getExecution: () => bridge.getExecution(),
      getSystem: () => bridge.getSystem(),
      getVerification: (planId?: string) => bridge.getVerification(planId),
      getTaskDetail: (taskId: string) => bridge.getTaskDetail(taskId),
    }
    worldView = initWorldView(
      worldSource,
      {
        showCommandCenter: () => {
          const activeNav = document.querySelector<HTMLButtonElement>('.nav-btn.active')
          const target = activeNav?.getAttribute('data-surface') || 'surface-overview'
          activateSurface(target)
        },
        openTaskInCommandCenter: (taskId) => {
          worldView?.hide()
          activateSurface('surface-work')
          void refreshWorkHierarchy(bridge).then(() => inspectTask(bridge, taskId))
        },
        openApprovalUi: (targetId) => {
          worldView?.hide()
          activateSurface('surface-approvals')
          void refreshApprovalQueue(bridge).then(() => {
            const btn = document.querySelector<HTMLElement>(`button[data-queue-target-id="${CSS.escape(targetId)}"]`)
            btn?.focus()
          })
        },
      },
      { probe: typeof location !== 'undefined' && location.search.includes('d3probe=1') }
    )

    // Workspace prompt bar interactions
    const quickInput = document.getElementById('workspace-quick-input') as HTMLInputElement | null
    const quickSubject = document.getElementById('workspace-quick-subject') as HTMLSelectElement | null
    const captureFeedback = document.getElementById('workspace-capture-feedback')

    const showCaptureFeedback = (msg: string) => {
      if (captureFeedback) {
        captureFeedback.textContent = msg
        captureFeedback.style.display = 'block'
        setTimeout(() => {
          if (captureFeedback) captureFeedback.style.display = 'none'
        }, 3000)
      }
    }

    const handleCreateItem = async (type: 'IDEA' | 'TASK') => {
      let val = quickInput?.value.trim()
      if (!val) return

      let linkedSubject = quickSubject?.value || undefined

      // Parse subject hashtag if included in text e.g. "Review lecture #CSE 2195" or "#Mathematics Linear algebra"
      const hashtagMatch = val.match(/#([A-Za-z0-9\s]+)$/) || val.match(/#([A-Za-z0-9_-]+)/)
      if (hashtagMatch && hashtagMatch[1]) {
        const potentialSubj = hashtagMatch[1].trim()
        val = val.replace(hashtagMatch[0], '').trim()
        if (!linkedSubject) {
          linkedSubject = potentialSubj
        }
      }

      if (type === 'TASK') {
        val = val.replace(/^(todo:|task:|\[\s*\])\s*/i, '').trim()
      }

      if (!val) return

      if (bridge.saveIdea) {
        const collection: KnowledgeCollection =
          type === 'TASK' ? 'PLAN_TASK' : linkedSubject ? 'STUDY_NOTE' : 'IDEA'
        await bridge.saveIdea({
          title: val,
          originalText: val,
          collection,
          subject: linkedSubject,
        })
        if (quickInput) quickInput.value = ''
        if (quickSubject) quickSubject.value = ''
        await refreshWorkspace(bridge)
        const typeLabel = type === 'TASK' ? 'Task' : 'Note'
        const feedbackMsg = linkedSubject
          ? `✓ Created ${typeLabel.toLowerCase()} linked to ${linkedSubject}`
          : `✓ Saved ${typeLabel.toLowerCase()}`
        showCaptureFeedback(feedbackMsg)
        announce(feedbackMsg)
      }
    }

    document.getElementById('workspace-btn-quick-note')?.addEventListener('click', () => {
      void handleCreateItem('IDEA')
    })
    document.getElementById('workspace-btn-quick-task')?.addEventListener('click', () => {
      void handleCreateItem('TASK')
    })
    quickInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = quickInput.value.trim().toLowerCase()
        const isTask = val.startsWith('todo:') || val.startsWith('task:') || val.startsWith('[]')
        void handleCreateItem(isTask ? 'TASK' : 'IDEA')
      }
    })

    // Global keyboard shortcut: pressing '/' or Ctrl+K when not in an input focuses quick capture
    window.addEventListener('keydown', (e) => {
      const activeEl = document.activeElement
      const isInput =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          (activeEl as HTMLElement).isContentEditable)
      if (!isInput) {
        if (e.key === '/' || (e.ctrlKey && e.key.toLowerCase() === 'k')) {
          e.preventDefault()
          quickInput?.focus()
        }
      }
    })

    document.getElementById('workspace-btn-add-task-modal')?.addEventListener('click', async () => {
      const title = prompt('Enter study task or assignment title:')
      if (title && bridge.saveIdea) {
        await bridge.saveIdea({ title, originalText: title, collection: 'PLAN_TASK' })
        await refreshWorkspace(bridge)
      }
    })
    document.getElementById('workspace-btn-add-note-modal')?.addEventListener('click', () => {
      activateSurface('surface-notes')
      startNewNote()
    })

    document.getElementById('workspace-btn-companion')?.addEventListener('click', () => {
      void bridge.toggleCompanionWindow?.()
    })
    document.getElementById('workspace-btn-summon-assistant')?.addEventListener('click', () => {
      void bridge.toggleCompanionWindow?.()
    })
    document.getElementById('workspace-btn-check-inbox')?.addEventListener('click', async () => {
      if (bridge.executeStudyGuardianOperation) {
        const config = await bridge.executeStudyGuardianOperation({ action: 'GET_INBOX_CONFIG' })
        if (!config.inboxConfig?.inboxFolderPath && bridge.selectInboxFolder) {
          const pick = await bridge.selectInboxFolder()
          if (pick.selected && pick.folderPath) {
            await bridge.executeStudyGuardianOperation({
              action: 'SET_INBOX_FOLDER',
              folderPath: pick.folderPath,
            })
            await refreshWorkspace(bridge)
            announce(`Configured inbox folder: ${pick.folderPath}`)
            return
          }
        }
        const res = await bridge.executeStudyGuardianOperation({ action: 'TEST_INBOX_SETUP' })
        announce(res.inboxVerificationResult?.message || 'Inbox scan complete')
        await refreshWorkspace(bridge)
      }
    })

    initTheme()

    document.getElementById('btn-header-theme')?.addEventListener('click', () => {
      toggleTheme()
    })

    // Subnav buttons in devtools
    document.querySelectorAll<HTMLButtonElement>('.subnav-btn').forEach((st) => {
      st.addEventListener('click', () => {
        const surfaceId = st.getAttribute('data-surface')
        if (surfaceId) activateSurface(surfaceId)
      })
    })

    // Notes Hub Master-Detail Workspace Setup
    setupNotesHubListeners(bridge)
    void loadAndRenderNotesList(bridge)

    // Unsaved changes beforeunload prevention
    window.addEventListener('beforeunload', (e) => {
      if (isNotesDirty()) {
        e.preventDefault()
        e.returnValue = ''
      }
    })
    document.getElementById('tasks-btn-create')?.addEventListener('click', async () => {
      const title = prompt('Enter task title:')
      if (title && bridge.saveIdea) {
        await bridge.saveIdea({ title, originalText: title, collection: 'PLAN_TASK' })
        await refreshWorkspace(bridge)
      }
    })
    document.getElementById('subjects-btn-refresh')?.addEventListener('click', () => {
      void refreshWorkspace(bridge)
    })

    // Refresh all button
    document.getElementById('btn-refresh-all')?.addEventListener('click', () => {
      refreshAll(bridge)
    })

    // Toggle Floating Companion button
    document.getElementById('btn-toggle-companion')?.addEventListener('click', () => {
      void bridge.toggleCompanionWindow?.()
    })

    // Dialog buttons
    document.getElementById('dialog-btn-cancel')?.addEventListener('click', () => {
      closeApprovalDialog()
    })
    document.getElementById('dialog-btn-approve')?.addEventListener('click', () => {
      submitDecision(bridge, 'APPROVED')
    })
    document.getElementById('dialog-btn-reject')?.addEventListener('click', () => {
      submitDecision(bridge, 'REJECTED')
    })

    // Subscription to kernel status & events
    bridge.onKernelStatus((status: KernelLifecycleStatus) => {
      const badge = document.getElementById('kernel-status-badge')
      if (badge) {
        badge.textContent = status
        badge.className =
          'badge ' +
          (status === 'READY'
            ? 'badge-ready'
            : status === 'OFFLINE'
            ? 'badge-offline'
            : 'badge-starting')
      }
      announce(`Kernel status transitioned to ${status}`)
      if (worldView?.isVisible()) void worldView.refresh()
    })

    bridge.onProjectionUpdate((projectionType: string) => {
      announce(`Projection update received: ${projectionType}`)
      refreshAll(bridge)
      if (worldView?.isVisible()) void worldView.refresh()
    })

    // Navigation target listener from Companion or IPC
    bridge.onNavigateTarget?.((target) => {
      void navigateToTarget(bridge, target)
    })

    window.addEventListener('storage', (e) => {
      if (e.key === 'gravitas_pending_navigate' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue)
          localStorage.removeItem('gravitas_pending_navigate')
          void navigateToTarget(bridge, parsed)
        } catch {}
      }
    })

    // Initial load: start on workspace surface or pending navigation target
    let hasPendingNav = false
    try {
      const pendingNav = localStorage.getItem('gravitas_pending_navigate')
      if (pendingNav) {
        localStorage.removeItem('gravitas_pending_navigate')
        const parsed = JSON.parse(pendingNav)
        hasPendingNav = true
        void navigateToTarget(bridge, parsed)
      }
    } catch {}

    if (!hasPendingNav) {
      activateSurface('surface-workspace')
    }
    refreshAll(bridge)
  })
}
