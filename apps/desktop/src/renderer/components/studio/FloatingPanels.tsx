import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Send,
  Mic,
  BookOpen,
  CheckCircle,
  Clock,
  Disc3,
  Layers,
  Save,
  Volume2,
  ExternalLink,
  Sliders,
  Sparkles,
  Minus,
  Eye,
  Edit3,
  Columns,
  AlertTriangle,
  RotateCcw,
  Terminal,
  Palette,
  Compass,
  Trash2,
  Square,
  Flame,
  Info,
  Download,
  Upload,
  Plus,
  FolderGit2,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react'
import { marked } from 'marked'
import katex from 'katex'
import { ThreeOfficeViewport } from '../ThreeOfficeViewport.js'
import type { MascotId } from './MascotFamily.js'
import { SPECIALIST_CONFIGS, QuickPromptItem } from './SpecialistEngine.js'
import {
  StudyFlashcard,
  DEFAULT_FLASHCARDS,
  DEFAULT_ENGINEERING_PROJECTS,
  EngineeringProject,
  exportToObsidianMarkdown,
  parseObsidianMarkdown,
} from './KnowledgeHubEngine.js'

export type ActivePanel =
  | 'NONE'
  | 'GRAV_CONVERSATION'
  | 'ADA_NOTES'
  | 'CIPHER_TASKS'
  | 'MUSIC_CORNER'
  | 'OFFICE_3D'

export interface ChatMessage {
  id: string
  agentId?: MascotId
  sender: 'user' | 'assistant'
  text: string
  timestamp: string
  actionReceipt?: { title: string; details: string; status?: 'success' | 'info' | 'warning' } | undefined
}

export interface StudyNoteItem {
  id: string
  title: string
  subject: string
  content: string
}

export const DEFAULT_STUDY_NOTES: StudyNoteItem[] = [
  {
    id: 'note_algorithms_core',
    title: 'Algorithms: Master Theorem & Complexity Analysis',
    subject: 'Algorithms',
    content: `# Divide and Conquer Recurrences

## Master Theorem Form
For recurrence relations of the form:
$$T(n) = aT(n/b) + f(n)$$
where $a \\ge 1, b > 1$:

1. **Case 1**: If $f(n) = O(n^{\\log_b a - \\epsilon})$ for some $\\epsilon > 0$, then:
   $$T(n) = \\Theta(n^{\\log_b a})$$
2. **Case 2**: If $f(n) = \\Theta(n^{\\log_b a} \\log^k n)$ where $k \\ge 0$, then:
   $$T(n) = \\Theta(n^{\\log_b a} \\log^{k+1} n)$$
3. **Case 3**: If $f(n) = \\Omega(n^{\\log_b a + \\epsilon})$ and regularity holds $a f(n/b) \\le c f(n)$, then:
   $$T(n) = \\Theta(f(n))$$

### Graph Traversal & Shortest Path Bounds
- **Dijkstra with Min-Heap**: $\\mathcal{O}((V + E) \\log V)$
- **Bellman-Ford**: $\\mathcal{O}(V \\cdot E)$
- **Floyd-Warshall**: $\\mathcal{O}(V^3)$
`,
  },
  {
    id: 'note_os_virtual_memory',
    title: 'Operating Systems: Virtual Memory & Page Replacement',
    subject: 'Operating Systems',
    content: `# Virtual Memory Architecture

## Address Translation
Given a virtual address with page size $P = 2^p$:
- **Virtual Page Number (VPN)**: $\\text{VPN} = \\lfloor \\text{VA} / P \\rfloor$
- **Page Offset**: $\\text{Offset} = \\text{VA} \\pmod P$

### Page Replacement Algorithms
1. **Optimal (MIN)**: Replace the page that will not be used for the longest period. (Theoretical upper bound).
2. **LRU (Least Recently Used)**: Replace page with oldest access timestamp.
3. **Clock Algorithm (Second Chance)**: Approximate LRU using a single reference bit per page frame.
`,
  },
  {
    id: 'note_databases_wal',
    title: 'Database Systems: B+ Trees & WAL Logging',
    subject: 'Databases',
    content: `# Database Storage & Concurrency

## Write-Ahead Logging (WAL) Protocol
1. Any modification to a database page must be recorded in the WAL on non-volatile storage **before** the dirty page is written to disk.
2. A transaction is committed only when its commit record is flushed to the WAL.

### B+ Tree Search Complexity
For a tree of order $M$ containing $N$ keys:
$$\\text{Height} \\le \\lceil \\log_{\\lceil M/2 \\rceil} ((N+1)/2) \\rceil$$
Search cost is bounded by $\\mathcal{O}(\\log_M N)$ disk page reads.
`,
  },
]

/**
 * Gate B3: Markdown renderer with KaTeX mathematical expression support
 */
export function renderMarkdownWithMath(markdownText: string): string {
  if (!markdownText) return ''
  const mathPlaceholders: { token: string; html: string }[] = []
  let tokenCounter = 0

  // 1. Display math blocks: $$ ... $$
  let processed = markdownText.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) => {
    const token = `KATEXBLOCK${tokenCounter++}TOKEN`
    try {
      const html = katex.renderToString(tex.trim(), { displayMode: true, throwOnError: false })
      mathPlaceholders.push({
        token,
        html: `<div class="katex-display-math" style="margin: 14px 0; overflow-x: auto; text-align: center; padding: 6px 0;">${html}</div>`,
      })
    } catch {
      mathPlaceholders.push({ token, html: `<code>$$${tex}$$</code>` })
    }
    return token
  })

  // 2. Inline math expressions: $ ... $
  processed = processed.replace(/(^|[^\\])\$([^\$\n]+?)\$/g, (_, prefix, tex) => {
    const token = `KATEXINLINE${tokenCounter++}TOKEN`
    try {
      const html = katex.renderToString(tex.trim(), { displayMode: false, throwOnError: false })
      mathPlaceholders.push({
        token,
        html: `<span class="katex-inline-math" style="padding: 0 2px;">${html}</span>`,
      })
    } catch {
      mathPlaceholders.push({ token, html: `<code>$${tex}$</code>` })
    }
    return `${prefix}${token}`
  })

  // 3. Parse Markdown using marked
  let html = ''
  try {
    html = marked.parse(processed, { async: false, breaks: true }) as string
  } catch {
    html = processed
  }

  // 4. Restore math placeholders
  for (const { token, html: mathHtml } of mathPlaceholders) {
    html = html.replace(token, mathHtml)
  }

  return html
}

export interface FloatingPanelsProps {
  activePanel: ActivePanel
  minimizedPanel?: ActivePanel | null
  activeSpecialist?: MascotId
  onSelectSpecialist?: (id: MascotId) => void
  messages: readonly ChatMessage[]
  dueTasks: readonly any[]
  dueAssignments: readonly any[]
  activeNote: { id?: string; title: string; content: string; subject: string } | null
  isListening: boolean
  isExecuting: boolean
  isReducedMotion: boolean
  onClose: () => void
  onMinimize?: () => void
  onRestore?: (panel: ActivePanel) => void
  onSendMessage: (text: string) => void
  onVoiceToggle: () => void
  onSaveNote: (note: { id?: string; title: string; content: string; subject: string }) => Promise<void>
  onTaskCompleted: (taskId: string, completed: boolean) => Promise<void>
  onOpenExternal: (url: string) => Promise<void>
  onOpenAdaNotes?: () => void
  onOpenCipherTasks?: () => void
  onClearHistory?: (agentId: MascotId) => void
  focusTimer?: { active: boolean; remainingSeconds: number; durationMinutes: number } | null
  onStopFocusTimer?: () => void
  projects?: readonly EngineeringProject[]
  onAddTask?: (title: string, subject?: string) => Promise<void>
  onReviewFlashcard?: (cardId: string, rating: 'again' | 'good' | 'easy') => void
  onExportMarkdown?: (note: StudyNoteItem) => void
  onImportMarkdown?: (imported: { title: string; subject: string; content: string }) => void
}

export const FloatingPanels: React.FC<FloatingPanelsProps> = ({
  activePanel,
  minimizedPanel,
  activeSpecialist = 'grav',
  onSelectSpecialist,
  messages,
  dueTasks,
  dueAssignments,
  activeNote,
  isListening,
  isExecuting,
  isReducedMotion,
  onClose,
  onMinimize,
  onRestore,
  onSendMessage,
  onVoiceToggle,
  onSaveNote,
  onTaskCompleted,
  onOpenExternal,
  onOpenAdaNotes,
  onOpenCipherTasks,
  onClearHistory,
  focusTimer,
  onStopFocusTimer,
  projects = DEFAULT_ENGINEERING_PROJECTS,
  onAddTask,
  onReviewFlashcard,
  onExportMarkdown,
  onImportMarkdown,
}) => {
  // Grav Chat State
  const [inputText, setInputText] = useState('')
  const [showFullTranscript, setShowFullTranscript] = useState(false)

  // Ada Notes State
  const [notesList, setNotesList] = useState<StudyNoteItem[]>(DEFAULT_STUDY_NOTES)
  const [selectedNoteId, setSelectedNoteId] = useState<string>(activeNote?.id || DEFAULT_STUDY_NOTES[0].id)
  const [noteTitle, setNoteTitle] = useState(activeNote?.title || DEFAULT_STUDY_NOTES[0].title)
  const [noteSubject, setNoteSubject] = useState(activeNote?.subject || DEFAULT_STUDY_NOTES[0].subject)
  const [noteContent, setNoteContent] = useState(activeNote?.content || DEFAULT_STUDY_NOTES[0].content)
  const [cleanContent, setCleanContent] = useState(activeNote?.content || DEFAULT_STUDY_NOTES[0].content)
  const [cleanTitle, setCleanTitle] = useState(activeNote?.title || DEFAULT_STUDY_NOTES[0].title)
  const [noteViewMode, setNoteViewMode] = useState<'edit' | 'preview' | 'split' | 'flashcards'>('edit')
  const [noteSavedFeedback, setNoteSavedFeedback] = useState(false)
  const [exportFeedback, setExportFeedback] = useState<string | null>(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importInputText, setImportInputText] = useState('')

  // Active Recall Flashcards State (Phase 05)
  const [activeDeckSubject, setActiveDeckSubject] = useState<string>('Algorithms')
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [showCardSolution, setShowCardSolution] = useState(false)
  const [activeRecallInput, setActiveRecallInput] = useState('')
  const [reviewCountToday, setReviewCountToday] = useState(0)
  const [newLinkedTaskInput, setNewLinkedTaskInput] = useState('')

  // Cipher Tasks & Projects State (Phase 05)
  const [cipherActiveTab, setCipherActiveTab] = useState<'tasks' | 'projects'>('tasks')
  const [newTaskInput, setNewTaskInput] = useState('')

  // Unsaved Changes Protection Guard (Gate B2 / B3)
  const [showUnsavedGuard, setShowUnsavedGuard] = useState(false)
  const [pendingGuardAction, setPendingGuardAction] = useState<(() => void) | null>(null)

  // Music State
  const [musicPlaying, setMusicPlaying] = useState(true)

  // Track dirty state
  const isDirty = noteContent !== cleanContent || noteTitle !== cleanTitle

  // Synchronize with external activeNote updates
  useEffect(() => {
    if (activeNote) {
      setNoteTitle(activeNote.title)
      setNoteSubject(activeNote.subject)
      setNoteContent(activeNote.content)
      setCleanContent(activeNote.content)
      setCleanTitle(activeNote.title)
      if (activeNote.id) setSelectedNoteId(activeNote.id)
    }
  }, [activeNote])

  // Guarded Close handler
  const handleRequestClose = () => {
    if (activePanel === 'ADA_NOTES' && isDirty) {
      setPendingGuardAction(() => onClose)
      setShowUnsavedGuard(true)
    } else {
      onClose()
    }
  }

  // Guarded Minimize handler
  const handleRequestMinimize = () => {
    if (onMinimize) {
      if (activePanel === 'ADA_NOTES' && isDirty) {
        setPendingGuardAction(() => onMinimize)
        setShowUnsavedGuard(true)
      } else {
        onMinimize()
      }
    } else {
      handleRequestClose()
    }
  }

  // Guarded Note Switch handler
  const handleSelectNote = (noteId: string) => {
    if (noteId === selectedNoteId) return

    const target = notesList.find((n) => n.id === noteId)
    if (!target) return

    const switchNote = () => {
      setSelectedNoteId(target.id)
      setNoteTitle(target.title)
      setNoteSubject(target.subject)
      setNoteContent(target.content)
      setCleanContent(target.content)
      setCleanTitle(target.title)
    }

    if (isDirty) {
      setPendingGuardAction(() => switchNote)
      setShowUnsavedGuard(true)
    } else {
      switchNote()
    }
  }

  const handleSend = () => {
    if (!inputText.trim() || isExecuting) return
    onSendMessage(inputText.trim())
    setInputText('')
  }

  const handleSaveCurrentNote = async () => {
    const updated = {
      id: selectedNoteId,
      title: noteTitle,
      subject: noteSubject,
      content: noteContent,
    }
    await onSaveNote(updated)
    setCleanContent(noteContent)
    setCleanTitle(noteTitle)
    setNotesList((prev) => prev.map((n) => (n.id === selectedNoteId ? updated : n)))
    setNoteSavedFeedback(true)
    setTimeout(() => setNoteSavedFeedback(false), 2500)
  }

  const handleConfirmSaveAndProceed = async () => {
    await handleSaveCurrentNote()
    setShowUnsavedGuard(false)
    if (pendingGuardAction) pendingGuardAction()
    setPendingGuardAction(null)
  }

  const handleConfirmDiscardAndProceed = () => {
    setNoteContent(cleanContent)
    setNoteTitle(cleanTitle)
    setShowUnsavedGuard(false)
    if (pendingGuardAction) pendingGuardAction()
    setPendingGuardAction(null)
  }

  if (activePanel === 'NONE') {
    // Show restored pill if minimized
    if (minimizedPanel && onRestore) {
      return (
        <div
          style={{
            position: 'fixed',
            bottom: '88px',
            right: '24px',
            zIndex: 40,
            pointerEvents: 'auto',
          }}
        >
          <button
            onClick={() => onRestore(minimizedPanel)}
            style={{
              background: 'rgba(24, 28, 33, 0.95)',
              border: '1px solid #4A89C8',
              borderRadius: '20px',
              padding: '8px 16px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#EDEAE3',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5), 0 0 12px rgba(74, 137, 200, 0.2)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <Layers size={14} color="#4A89C8" />
            <span>Restore {minimizedPanel.replace('_', ' ')}</span>
          </button>
        </div>
      )
    }
    return null
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        paddingBottom: '80px', // Gate B2: Maintain safe margin so no controls hide behind bottom dock
      }}
    >
      {/* ── 1. ON-DEMAND MULTI-AGENT SPECIALIST CONVERSATION SURFACE (PHASE 04) ── */}
      {activePanel === 'GRAV_CONVERSATION' && (() => {
        const currentSpecialist = SPECIALIST_CONFIGS[activeSpecialist || 'grav'] || SPECIALIST_CONFIGS.grav
        const accentColor = currentSpecialist.accentColor
        const tetherPosition =
          activeSpecialist === 'ada'
            ? '20%'
            : activeSpecialist === 'pixel'
            ? '32%'
            : activeSpecialist === 'cipher'
            ? '80%'
            : activeSpecialist === 'scout'
            ? '68%'
            : '50%'

        const formatTimer = (seconds: number) => {
          const m = Math.floor(seconds / 60)
          const s = seconds % 60
          return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
        }

        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 15 }}
            transition={{ type: 'spring', damping: 24, stiffness: 320 }}
            style={{
              position: 'relative',
              width: '600px',
              maxWidth: '94vw',
              height: '560px',
              background: 'rgba(20, 23, 27, 0.98)',
              border: `1px solid ${accentColor}55`,
              borderRadius: '16px',
              boxShadow: `0 24px 60px rgba(0, 0, 0, 0.75), 0 0 24px ${accentColor}22`,
              backdropFilter: 'blur(16px)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              pointerEvents: 'auto',
            }}
          >
            {/* Panel Top Header */}
            <div
              style={{
                padding: '12px 18px',
                borderBottom: '1px solid #282F37',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(24, 28, 33, 0.92)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '9px',
                    height: '9px',
                    borderRadius: '50%',
                    background: accentColor,
                    boxShadow: `0 0 8px ${accentColor}`,
                  }}
                />
                <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#EDEAE3' }}>
                  Conversation with {currentSpecialist.name}
                </span>
                <span
                  style={{
                    fontSize: '10.5px',
                    padding: '2px 7px',
                    borderRadius: '6px',
                    background: currentSpecialist.badgeBg,
                    color: accentColor,
                    fontWeight: 600,
                  }}
                >
                  {currentSpecialist.role}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Active Focus Sprint Pill */}
                {focusTimer?.active && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '2px 8px',
                      background: 'rgba(244, 162, 97, 0.15)',
                      border: '1px solid rgba(244, 162, 97, 0.4)',
                      borderRadius: '10px',
                      fontSize: '11px',
                      color: '#F4A261',
                      fontWeight: 600,
                    }}
                  >
                    <Flame size={12} color="#F4A261" />
                    <span>Focus: {formatTimer(focusTimer.remainingSeconds)}</span>
                    {onStopFocusTimer && (
                      <button
                        onClick={onStopFocusTimer}
                        title="Cancel focus timer"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#E76F51',
                          cursor: 'pointer',
                          padding: '0 2px',
                          display: 'flex',
                        }}
                      >
                        <Square size={10} fill="#E76F51" />
                      </button>
                    )}
                  </div>
                )}

                {/* Clear History Button */}
                {onClearHistory && (
                  <button
                    onClick={() => onClearHistory(activeSpecialist || 'grav')}
                    title={`Clear conversation history with ${currentSpecialist.name}`}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#7E858D',
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}

                <button
                  onClick={handleRequestMinimize}
                  title="Minimize panel"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#8E949B',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Minus size={15} />
                </button>
                <button
                  onClick={handleRequestClose}
                  title="Close panel (Esc)"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#8E949B',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Specialist Switcher Tab Bar (Phase 04) */}
            <div
              style={{
                display: 'flex',
                gap: '4px',
                padding: '6px 12px',
                background: 'rgba(16, 19, 23, 0.95)',
                borderBottom: '1px solid #23282F',
              }}
            >
              {(['grav', 'ada', 'pixel', 'cipher', 'scout'] as MascotId[]).map((mId) => {
                const cfg = SPECIALIST_CONFIGS[mId]
                const isActive = (activeSpecialist || 'grav') === mId
                return (
                  <button
                    key={mId}
                    onClick={() => onSelectSpecialist?.(mId)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '5px 6px',
                      borderRadius: '8px',
                      background: isActive ? `${cfg.accentColor}22` : 'transparent',
                      border: `1px solid ${isActive ? cfg.accentColor : 'transparent'}`,
                      color: isActive ? '#EDEAE3' : '#8E949B',
                      fontSize: '11.5px',
                      fontWeight: isActive ? 600 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        background: cfg.accentColor,
                        boxShadow: isActive ? `0 0 6px ${cfg.accentColor}` : 'none',
                      }}
                    />
                    <span>{cfg.name}</span>
                  </button>
                )
              })}
            </div>

            {/* Conversation Stream with KaTeX Math Rendering */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              {messages.length === 0 ? (
                <div
                  style={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#7E858D',
                    fontSize: '12.5px',
                    textAlign: 'center',
                    padding: '0 24px',
                  }}
                >
                  <Sparkles size={24} color={accentColor} style={{ marginBottom: '8px', opacity: 0.8 }} />
                  <span style={{ fontWeight: 600, color: '#EDEAE3', marginBottom: '4px' }}>
                    {currentSpecialist.name} • {currentSpecialist.role}
                  </span>
                  <span style={{ color: '#9FA4A8', maxWidth: '420px', lineHeight: 1.5 }}>
                    {currentSpecialist.welcomeMessage}
                  </span>
                </div>
              ) : (
                (showFullTranscript ? messages : messages.slice(-5)).map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '88%',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        fontSize: '13px',
                        lineHeight: 1.55,
                        background: msg.sender === 'user' ? '#262D35' : '#171B20',
                        color: msg.sender === 'user' ? '#EDEAE3' : '#D6D4CE',
                        border: `1px solid ${msg.sender === 'user' ? '#3B4450' : `${accentColor}33`}`,
                        wordBreak: 'break-word',
                        overflowWrap: 'break-word',
                      }}
                    >
                      {msg.sender === 'assistant' ? (
                        <div
                          className="specialist-message-content"
                          style={{ overflowX: 'auto' }}
                          dangerouslySetInnerHTML={{
                            __html: renderMarkdownWithMath(msg.text),
                          }}
                        />
                      ) : (
                        msg.text
                      )}

                      {/* Action Receipt Card */}
                      {msg.actionReceipt && (
                        <div
                          style={{
                            marginTop: '8px',
                            padding: '6px 10px',
                            background: '#101316',
                            border: '1px solid #252B32',
                            borderRadius: '6px',
                            fontSize: '11.5px',
                          }}
                        >
                          <div
                            style={{
                              color:
                                msg.actionReceipt.status === 'warning'
                                  ? '#F4A261'
                                  : msg.actionReceipt.status === 'info'
                                  ? '#4A89C8'
                                  : '#81B29A',
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                            }}
                          >
                            {msg.actionReceipt.status === 'warning' ? (
                              <AlertTriangle size={12} />
                            ) : msg.actionReceipt.status === 'info' ? (
                              <Info size={12} />
                            ) : (
                              <CheckCircle size={12} />
                            )}
                            {msg.actionReceipt.title}
                          </div>
                          <div style={{ color: '#8E949B', marginTop: '2px', fontSize: '11px' }}>
                            {msg.actionReceipt.details}
                          </div>
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: '10px', color: '#686E74', marginTop: '2px', padding: '0 4px' }}>
                      {msg.timestamp}
                    </span>
                  </div>
                ))
              )}

              {/* Cross-Surface Shortcut Banners */}
              {activeSpecialist === 'ada' && onOpenAdaNotes && (
                <div style={{ textAlign: 'center', marginTop: '6px' }}>
                  <button
                    onClick={onOpenAdaNotes}
                    style={{
                      background: 'rgba(129, 178, 154, 0.12)',
                      border: '1px solid rgba(129, 178, 154, 0.35)',
                      borderRadius: '8px',
                      padding: '4px 12px',
                      color: '#81B29A',
                      fontSize: '11.5px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <BookOpen size={12} />
                    <span>Open Ada's Knowledge Hub Notes & Math Editor</span>
                  </button>
                </div>
              )}

              {activeSpecialist === 'cipher' && onOpenCipherTasks && (
                <div style={{ textAlign: 'center', marginTop: '6px' }}>
                  <button
                    onClick={onOpenCipherTasks}
                    style={{
                      background: 'rgba(74, 137, 200, 0.12)',
                      border: '1px solid rgba(74, 137, 200, 0.35)',
                      borderRadius: '8px',
                      padding: '4px 12px',
                      color: '#4A89C8',
                      fontSize: '11.5px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Terminal size={12} />
                    <span>Open Cipher's Tasks & Database Agenda</span>
                  </button>
                </div>
              )}

              {/* Transcript expand toggle */}
              {messages.length > 5 && (
                <div style={{ textAlign: 'center', margin: '4px 0' }}>
                  <button
                    onClick={() => setShowFullTranscript((prev) => !prev)}
                    style={{
                      background: 'transparent',
                      border: '1px solid #2B333D',
                      borderRadius: '12px',
                      padding: '3px 10px',
                      fontSize: '11px',
                      color: '#9FA4A8',
                      cursor: 'pointer',
                    }}
                  >
                    {showFullTranscript ? 'Show Recent Context' : `View Full Transcript (${messages.length} messages)`}
                  </button>
                </div>
              )}
            </div>

            {/* Quick Action Suggestion Chips (Phase 04) */}
            <div
              style={{
                display: 'flex',
                gap: '6px',
                overflowX: 'auto',
                padding: '7px 14px',
                background: 'rgba(18, 22, 27, 0.95)',
                borderTop: '1px solid #23282F',
              }}
            >
              {currentSpecialist.quickPrompts.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    onSendMessage(chip.prompt)
                  }}
                  style={{
                    padding: '3px 10px',
                    borderRadius: '12px',
                    background: '#15191F',
                    border: `1px solid ${accentColor}44`,
                    color: '#EDEAE3',
                    fontSize: '11px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = accentColor
                    e.currentTarget.style.background = `${accentColor}1A`
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = `${accentColor}44`
                    e.currentTarget.style.background = '#15191F'
                  }}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Compact Composer Input Bar */}
            <div
              style={{
                padding: '12px 14px',
                borderTop: '1px solid #282F37',
                background: 'rgba(20, 24, 29, 0.95)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <button
                onClick={onVoiceToggle}
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '8px',
                  background: isListening ? '#E76F51' : '#23282F',
                  border: `1px solid ${isListening ? '#E76F51' : '#343B45'}`,
                  color: isListening ? '#FFF' : '#9DA3A8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
                title={isListening ? 'Stop Push-To-Talk' : 'Hold or click to speak (Offline STT)'}
              >
                <Mic size={15} />
              </button>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={currentSpecialist.placeholder}
                style={{
                  flex: 1,
                  background: '#13161A',
                  border: '1px solid #2B333D',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: '#EDEAE3',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />

              <button
                onClick={handleSend}
                disabled={!inputText.trim() || isExecuting}
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '8px',
                  background: accentColor,
                  border: 'none',
                  color: '#101214',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: inputText.trim() && !isExecuting ? 'pointer' : 'not-allowed',
                  opacity: inputText.trim() && !isExecuting ? 1 : 0.4,
                  fontWeight: 600,
                }}
              >
                <Send size={15} />
              </button>
            </div>

            {/* Contextual downward tether anchor pointing toward active specialist's desk */}
            <div
              style={{
                position: 'absolute',
                bottom: '-8px',
                left: tetherPosition,
                transform: 'translateX(-50%)',
                width: 0,
                height: 0,
                borderLeft: '8px solid transparent',
                borderRight: '8px solid transparent',
                borderTop: `8px solid ${accentColor}88`,
                transition: 'left 0.25s ease',
              }}
            />
          </motion.div>
        )
      })()}

      {/* ── 2. ADA KNOWLEDGE HUB & UPGRADED STUDY NOTES PANEL (GATE B3) ── */}
      {activePanel === 'ADA_NOTES' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ type: 'spring', damping: 24, stiffness: 320 }}
          style={{
            position: 'relative',
            width: noteViewMode === 'split' ? '960px' : '820px',
            minWidth: '640px',
            maxWidth: '96vw',
            height: '600px',
            background: 'rgba(20, 25, 23, 0.98)',
            border: '1px solid #2D3A32',
            borderRadius: '16px',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.7), 0 0 24px rgba(129, 178, 154, 0.16)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            pointerEvents: 'auto',
            transition: 'width 0.2s ease',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '10px 16px',
              borderBottom: '1px solid #243028',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(22, 29, 25, 0.92)',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              <BookOpen size={16} color="#81B29A" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#EDEAE3', whiteSpace: 'nowrap', flexShrink: 0 }}>
                Ada's Knowledge Hub
              </span>

              {/* Note Selector Dropdown */}
              <select
                value={selectedNoteId}
                onChange={(e) => handleSelectNote(e.target.value)}
                style={{
                  background: '#151D18',
                  border: '1px solid #2B3830',
                  borderRadius: '6px',
                  color: '#EDEAE3',
                  fontSize: '11px',
                  padding: '3px 6px',
                  outline: 'none',
                  cursor: 'pointer',
                  maxWidth: '140px',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  flexShrink: 1,
                }}
              >
                {notesList.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.subject}: {n.title.slice(0, 24)}...
                  </option>
                ))}
              </select>

              {/* Dirty-State Indicator (Gate B3) */}
              {isDirty ? (
                <span
                  style={{
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: '6px',
                    background: 'rgba(244, 162, 97, 0.15)',
                    border: '1px solid rgba(244, 162, 97, 0.4)',
                    color: '#F4A261',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  ● Unsaved
                </span>
              ) : (
                <span
                  style={{
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: '6px',
                    background: 'rgba(129, 178, 154, 0.15)',
                    border: '1px solid rgba(129, 178, 154, 0.4)',
                    color: '#81B29A',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  ✓ Saved
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              {/* Mode Toggle: Edit | Preview | Split | Flashcards */}
              <div
                style={{
                  display: 'flex',
                  background: '#151D18',
                  border: '1px solid #28342C',
                  borderRadius: '6px',
                  padding: '2px',
                  gap: '2px',
                  flexShrink: 0,
                }}
              >
                <button
                  onClick={() => setNoteViewMode('edit')}
                  title="Editor Only"
                  style={{
                    background: noteViewMode === 'edit' ? '#27342C' : 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '3px 7px',
                    fontSize: '10.5px',
                    color: noteViewMode === 'edit' ? '#EDEAE3' : '#8E949B',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Edit3 size={11} />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => setNoteViewMode('preview')}
                  title="Markdown & KaTeX Math Preview"
                  style={{
                    background: noteViewMode === 'preview' ? '#27342C' : 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '3px 7px',
                    fontSize: '10.5px',
                    color: noteViewMode === 'preview' ? '#EDEAE3' : '#8E949B',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Eye size={11} />
                  <span>Preview</span>
                </button>
                <button
                  onClick={() => setNoteViewMode('split')}
                  title="Side-by-Side Split View"
                  style={{
                    background: noteViewMode === 'split' ? '#27342C' : 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '3px 7px',
                    fontSize: '10.5px',
                    color: noteViewMode === 'split' ? '#EDEAE3' : '#8E949B',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Columns size={11} />
                  <span>Split</span>
                </button>
                <button
                  onClick={() => {
                    setShowCardSolution(false)
                    setActiveRecallInput('')
                    setNoteViewMode('flashcards')
                  }}
                  title="Active Recall & Spaced Repetition Decks"
                  style={{
                    background: noteViewMode === 'flashcards' ? '#27342C' : 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '3px 7px',
                    fontSize: '10.5px',
                    color: noteViewMode === 'flashcards' ? '#EDEAE3' : '#8E949B',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Sparkles size={11} color={noteViewMode === 'flashcards' ? '#81B29A' : '#8E949B'} />
                  <span>Flashcards</span>
                </button>
              </div>

              {/* Obsidian Export & Import Action Buttons */}
              <button
                onClick={() => {
                  const currentNote = notesList.find((n) => n.id === selectedNoteId) || {
                    id: selectedNoteId,
                    title: noteTitle,
                    subject: noteSubject,
                    content: noteContent,
                  }
                  const linkedTasks = dueTasks
                    .filter((t) => !t.subject || t.subject.toLowerCase() === noteSubject.toLowerCase())
                    .map((t) => t.title)
                  const obsidianMd = exportToObsidianMarkdown(currentNote, linkedTasks)
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(obsidianMd)
                  }
                  if (onExportMarkdown) {
                    onExportMarkdown(currentNote)
                  }
                  setExportFeedback('Exported! 📋')
                  setTimeout(() => setExportFeedback(null), 2500)
                }}
                title="Export note to Obsidian Markdown with YAML frontmatter & WikiLinks"
                style={{
                  background: '#151D18',
                  border: '1px solid #2B3830',
                  borderRadius: '6px',
                  padding: '4px 7px',
                  fontSize: '10.5px',
                  color: '#81B29A',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  flexShrink: 0,
                }}
              >
                <Download size={11} />
                <span>{exportFeedback || 'Obsidian'}</span>
              </button>

              <button
                onClick={() => setShowImportModal(true)}
                title="Import Markdown note with YAML frontmatter"
                style={{
                  background: '#151D18',
                  border: '1px solid #2B3830',
                  borderRadius: '6px',
                  padding: '4px 7px',
                  fontSize: '10.5px',
                  color: '#EDEAE3',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  flexShrink: 0,
                }}
              >
                <Upload size={11} />
                <span>Import</span>
              </button>

              {/* Save Button */}
              <button
                onClick={handleSaveCurrentNote}
                style={{
                  background: isDirty ? '#81B29A' : '#233028',
                  border: '1px solid #81B29A',
                  borderRadius: '6px',
                  padding: '4px 9px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: isDirty ? '#101713' : '#81B29A',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                }}
              >
                <Save size={12} />
                <span>{noteSavedFeedback ? 'Saved ✓' : 'Save'}</span>
              </button>

              <button
                onClick={handleRequestMinimize}
                title="Minimize panel"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#8E949B',
                  cursor: 'pointer',
                  padding: '4px',
                  flexShrink: 0,
                }}
              >
                <Minus size={15} />
              </button>
              <button
                onClick={handleRequestClose}
                title="Close panel (Esc)"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#8E949B',
                  cursor: 'pointer',
                  padding: '4px',
                  flexShrink: 0,
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Note Metadata Bar */}
          <div
            style={{
              padding: '8px 20px',
              background: 'rgba(18, 24, 20, 0.8)',
              borderBottom: '1px solid #222C25',
              display: 'flex',
              gap: '12px',
            }}
          >
            <input
              type="text"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="Note title..."
              style={{
                flex: 2,
                background: '#141A16',
                border: '1px solid #2B372F',
                borderRadius: '6px',
                padding: '5px 10px',
                color: '#EDEAE3',
                fontSize: '12.5px',
                fontWeight: 600,
                outline: 'none',
              }}
            />
            <input
              type="text"
              value={noteSubject}
              onChange={(e) => setNoteSubject(e.target.value)}
              placeholder="Subject..."
              style={{
                flex: 1,
                background: '#141A16',
                border: '1px solid #2B372F',
                borderRadius: '6px',
                padding: '5px 10px',
                color: '#81B29A',
                fontSize: '12px',
                outline: 'none',
              }}
            />
          </div>

          {/* Body Content: Edit, Preview, or Split */}
          {/* Body Content: Flashcards Deck OR Edit/Preview/Split Editor */}
          {noteViewMode === 'flashcards' ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                padding: '16px 20px',
                overflowY: 'auto',
                gap: '12px',
              }}
            >
              {(() => {
                const availableDecks = Object.keys(DEFAULT_FLASHCARDS)
                const currentDeck = DEFAULT_FLASHCARDS[activeDeckSubject] || DEFAULT_FLASHCARDS.Algorithms
                const cardIndex = currentCardIndex % currentDeck.length
                const currentCard = currentDeck[cardIndex]

                return (
                  <>
                    {/* Deck Selector & Progress Header */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: '#151D18',
                        padding: '8px 14px',
                        borderRadius: '8px',
                        border: '1px solid #243027',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: '#9FA4A8' }}>Deck:</span>
                        <select
                          value={activeDeckSubject}
                          onChange={(e) => {
                            setActiveDeckSubject(e.target.value)
                            setCurrentCardIndex(0)
                            setShowCardSolution(false)
                          }}
                          style={{
                            background: '#1D2721',
                            border: '1px solid #2E3E34',
                            borderRadius: '6px',
                            color: '#EDEAE3',
                            fontSize: '12px',
                            fontWeight: 600,
                            padding: '3px 8px',
                            outline: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          {availableDecks.map((s) => (
                            <option key={s} value={s}>
                              {s} ({DEFAULT_FLASHCARDS[s]?.length || 0} cards)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '11px', color: '#81B29A', fontWeight: 600 }}>
                          Reviewed Today: {reviewCountToday}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <button
                            onClick={() => {
                              setShowCardSolution(false)
                              setActiveRecallInput('')
                              setCurrentCardIndex((prev) => (prev > 0 ? prev - 1 : currentDeck.length - 1))
                            }}
                            style={{
                              background: '#1D2721',
                              border: '1px solid #2E3E34',
                              borderRadius: '4px',
                              padding: '3px 6px',
                              color: '#EDEAE3',
                              fontSize: '11px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <ChevronLeft size={13} />
                          </button>
                          <span style={{ fontSize: '11.5px', color: '#EDEAE3', minWidth: '60px', textAlign: 'center' }}>
                            {cardIndex + 1} / {currentDeck.length}
                          </span>
                          <button
                            onClick={() => {
                              setShowCardSolution(false)
                              setActiveRecallInput('')
                              setCurrentCardIndex((prev) => (prev + 1) % currentDeck.length)
                            }}
                            style={{
                              background: '#1D2721',
                              border: '1px solid #2E3E34',
                              borderRadius: '4px',
                              padding: '3px 6px',
                              color: '#EDEAE3',
                              fontSize: '11px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <ChevronRight size={13} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Flashcard Presentation Surface */}
                    {currentCard && (
                      <div
                        style={{
                          flex: 1,
                          background: '#131815',
                          border: '1px solid #28372D',
                          borderRadius: '12px',
                          padding: '20px 24px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                        }}
                      >
                        <div>
                          {/* Card Meta Badges */}
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: '14px',
                            }}
                          >
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  color: '#81B29A',
                                  background: 'rgba(129, 178, 154, 0.12)',
                                  border: '1px solid rgba(129, 178, 154, 0.3)',
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                }}
                              >
                                {currentCard.topic}
                              </span>
                              <span style={{ fontSize: '11px', color: '#687A70' }}>
                                SRS Interval: {currentCard.intervalDays}d • Ease: {currentCard.easeFactor}
                              </span>
                            </div>
                            <span style={{ fontSize: '11px', color: '#73857B' }}>
                              Card #{currentCard.id}
                            </span>
                          </div>

                          {/* Question (KaTeX Math Rendered) */}
                          <div style={{ fontSize: '14.5px', fontWeight: 600, color: '#EDEAE3', lineHeight: 1.5, marginBottom: '16px' }}>
                            <div
                              dangerouslySetInnerHTML={{
                                __html: renderMarkdownWithMath(currentCard.question),
                              }}
                            />
                          </div>
                        </div>

                        {/* Solution Area or Reveal Button */}
                        <div>
                          {!showCardSolution ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              <div>
                                <label style={{ fontSize: '11px', color: '#81B29A', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                                  Active Recall Scratchpad (attempt derivation before revealing):
                                </label>
                                <textarea
                                  value={activeRecallInput}
                                  onChange={(e) => setActiveRecallInput(e.target.value)}
                                  placeholder="Type your derivation, formula, or key points from memory..."
                                  rows={3}
                                  style={{
                                    width: '100%',
                                    background: '#151D18',
                                    border: '1px solid #2B3830',
                                    borderRadius: '6px',
                                    padding: '8px 10px',
                                    color: '#EDEAE3',
                                    fontSize: '12px',
                                    fontFamily: 'monospace',
                                    resize: 'vertical',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                  }}
                                />
                              </div>
                              <div style={{ textAlign: 'center', padding: '4px 0' }}>
                                <button
                                  onClick={() => setShowCardSolution(true)}
                                  style={{
                                    background: 'rgba(129, 178, 154, 0.15)',
                                    border: '1px solid #81B29A',
                                    borderRadius: '8px',
                                    padding: '8px 20px',
                                    fontSize: '12.5px',
                                    fontWeight: 600,
                                    color: '#81B29A',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    transition: 'all 0.15s ease',
                                  }}
                                >
                                  <Eye size={14} />
                                  <span>Reveal Solution & Active-Recall Formula</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div
                              style={{
                                background: '#18211C',
                                border: '1px solid #2C3C32',
                                borderRadius: '8px',
                                padding: '14px 18px',
                                marginTop: '8px',
                              }}
                            >
                              {activeRecallInput.trim() && (
                                <div style={{ marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px dashed #2C3C32' }}>
                                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#F2CC8F', marginBottom: '4px' }}>
                                    Your Recall Attempt:
                                  </div>
                                  <div style={{ fontSize: '12px', color: '#D8D4CF', fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>
                                    {activeRecallInput}
                                  </div>
                                </div>
                              )}
                              <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#81B29A', marginBottom: '8px' }}>
                                Verified Solution & Derivation:
                              </div>
                              <div
                                style={{ fontSize: '13px', color: '#EDEAE3', lineHeight: 1.6 }}
                                dangerouslySetInnerHTML={{
                                  __html: renderMarkdownWithMath(currentCard.solution),
                                }}
                              />

                              {/* SM-2 Recall Rating Buttons */}
                              <div
                                style={{
                                  marginTop: '14px',
                                  paddingTop: '10px',
                                  borderTop: '1px solid #243027',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                }}
                              >
                                <span style={{ fontSize: '11px', color: '#8E949B' }}>
                                  Rate your recall confidence:
                                </span>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button
                                    onClick={() => {
                                      onReviewFlashcard?.(currentCard.id, 'again')
                                      setReviewCountToday((c) => c + 1)
                                      setShowCardSolution(false)
                                      setActiveRecallInput('')
                                      setCurrentCardIndex((prev) => (prev + 1) % currentDeck.length)
                                    }}
                                    style={{
                                      background: 'rgba(231, 111, 81, 0.15)',
                                      border: '1px solid #E76F51',
                                      borderRadius: '6px',
                                      padding: '5px 12px',
                                      fontSize: '11.5px',
                                      fontWeight: 600,
                                      color: '#E76F51',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Again (&lt;1d)
                                  </button>
                                  <button
                                    onClick={() => {
                                      onReviewFlashcard?.(currentCard.id, 'good')
                                      setReviewCountToday((c) => c + 1)
                                      setShowCardSolution(false)
                                      setActiveRecallInput('')
                                      setCurrentCardIndex((prev) => (prev + 1) % currentDeck.length)
                                    }}
                                    style={{
                                      background: 'rgba(74, 137, 200, 0.15)',
                                      border: '1px solid #4A89C8',
                                      borderRadius: '6px',
                                      padding: '5px 12px',
                                      fontSize: '11.5px',
                                      fontWeight: 600,
                                      color: '#4A89C8',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Good (3d)
                                  </button>
                                  <button
                                    onClick={() => {
                                      onReviewFlashcard?.(currentCard.id, 'easy')
                                      setReviewCountToday((c) => c + 1)
                                      setShowCardSolution(false)
                                      setActiveRecallInput('')
                                      setCurrentCardIndex((prev) => (prev + 1) % currentDeck.length)
                                    }}
                                    style={{
                                      background: 'rgba(129, 178, 154, 0.15)',
                                      border: '1px solid #81B29A',
                                      borderRadius: '6px',
                                      padding: '5px 12px',
                                      fontSize: '11.5px',
                                      fontWeight: 600,
                                      color: '#81B29A',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Easy (7d)
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          ) : (
            <>
              {/* Editor & Preview Panes */}
              <div style={{ flex: 1, display: 'flex', overflow: 'hidden', padding: '12px 20px 6px 20px' }}>
                {/* Editor Pane */}
                {(noteViewMode === 'edit' || noteViewMode === 'split') && (
                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      marginRight: noteViewMode === 'split' ? '12px' : 0,
                    }}
                  >
                    <textarea
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      style={{
                        flex: 1,
                        width: '100%',
                        background: '#121714',
                        border: '1px solid #243027',
                        borderRadius: '8px',
                        padding: '14px',
                        color: '#EDEAE3',
                        fontSize: '12.5px',
                        fontFamily: 'Geist Mono, Cascadia Code, monospace',
                        lineHeight: 1.6,
                        resize: 'none',
                        outline: 'none',
                      }}
                    />
                  </div>
                )}

                {/* Preview Pane with KaTeX Math Rendering (Gate B3) */}
                {(noteViewMode === 'preview' || noteViewMode === 'split') && (
                  <div
                    style={{
                      flex: 1,
                      background: '#131815',
                      border: '1px solid #243027',
                      borderRadius: '8px',
                      padding: '16px 20px',
                      overflowY: 'auto',
                      color: '#EDEAE3',
                      fontSize: '13px',
                      lineHeight: 1.6,
                    }}
                    dangerouslySetInnerHTML={{
                      __html: renderMarkdownWithMath(noteContent),
                    }}
                  />
                )}
              </div>

              {/* Linked Coursework Tasks Section (Phase 05) */}
              <div
                style={{
                  padding: '8px 20px',
                  background: 'rgba(16, 21, 18, 0.85)',
                  borderTop: '1px solid #222C25',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '130px' }}>
                  <CheckCircle size={13} color="#81B29A" />
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#EDEAE3' }}>
                    Linked Tasks ({dueTasks.filter((t) => !t.subject || t.subject.toLowerCase() === noteSubject.toLowerCase()).length}):
                  </span>
                </div>

                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    overflowX: 'auto',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {dueTasks
                    .filter((t) => !t.subject || t.subject.toLowerCase() === noteSubject.toLowerCase())
                    .slice(0, 3)
                    .map((t) => (
                      <span
                        key={t.id}
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: '#19221C',
                          border: '1px solid #2C3C30',
                          color: '#EDEAE3',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={t.completed}
                          onChange={(e) => onTaskCompleted(t.id, e.target.checked)}
                          style={{ cursor: 'pointer', accentColor: '#81B29A' }}
                        />
                        <span style={{ textDecoration: t.completed ? 'line-through' : 'none' }}>
                          {t.title}
                        </span>
                      </span>
                    ))}
                </div>

                {/* Inline task adder */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={newLinkedTaskInput}
                    onChange={(e) => setNewLinkedTaskInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newLinkedTaskInput.trim()) {
                        onAddTask?.(newLinkedTaskInput.trim(), noteSubject)
                        setNewLinkedTaskInput('')
                      }
                    }}
                    placeholder={`+ Practice task for ${noteSubject}...`}
                    style={{
                      background: '#121714',
                      border: '1px solid #243027',
                      borderRadius: '5px',
                      padding: '4px 8px',
                      fontSize: '11px',
                      color: '#EDEAE3',
                      outline: 'none',
                      width: '180px',
                    }}
                  />
                  <button
                    onClick={() => {
                      if (newLinkedTaskInput.trim()) {
                        onAddTask?.(newLinkedTaskInput.trim(), noteSubject)
                        setNewLinkedTaskInput('')
                      }
                    }}
                    disabled={!newLinkedTaskInput.trim()}
                    style={{
                      background: '#81B29A',
                      border: 'none',
                      borderRadius: '5px',
                      padding: '4px 8px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#101713',
                      cursor: newLinkedTaskInput.trim() ? 'pointer' : 'not-allowed',
                      opacity: newLinkedTaskInput.trim() ? 1 : 0.5,
                    }}
                  >
                    Add
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Footer Status */}
          <div
            style={{
              padding: '8px 20px',
              borderTop: '1px solid #222C25',
              fontSize: '11px',
              color: '#73857B',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>Markdown & KaTeX LaTeX enabled ($...$ inline, $$...$$ block). Persists to SQLite WAL.</span>
            <span>Subject: {noteSubject}</span>
          </div>

          {/* Unsaved Changes Confirmation Modal Guard (Gate B2 / B3) */}
          {showUnsavedGuard && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(10, 14, 12, 0.85)',
                backdropFilter: 'blur(6px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 60,
              }}
            >
              <div
                style={{
                  width: '380px',
                  background: '#1A211D',
                  border: '1px solid #37473D',
                  borderRadius: '12px',
                  padding: '20px',
                  boxShadow: '0 16px 40px rgba(0, 0, 0, 0.6)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#F4A261' }}>
                  <AlertTriangle size={18} />
                  <span style={{ fontWeight: 600, fontSize: '14px', color: '#EDEAE3' }}>
                    Unsaved Note Changes
                  </span>
                </div>
                <div style={{ fontSize: '12.5px', color: '#9DA3A8', lineHeight: 1.5 }}>
                  You have unsaved edits in <strong>"{noteTitle}"</strong>. Would you like to save them to local SQLite before leaving?
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                  <button
                    onClick={() => {
                      setShowUnsavedGuard(false)
                      setPendingGuardAction(null)
                    }}
                    style={{
                      background: 'transparent',
                      border: '1px solid #343E38',
                      borderRadius: '6px',
                      padding: '5px 10px',
                      color: '#9DA3A8',
                      fontSize: '11.5px',
                      cursor: 'pointer',
                    }}
                  >
                    Keep Editing
                  </button>
                  <button
                    onClick={handleConfirmDiscardAndProceed}
                    style={{
                      background: 'transparent',
                      border: '1px solid #C96B61',
                      borderRadius: '6px',
                      padding: '5px 10px',
                      color: '#E76F51',
                      fontSize: '11.5px',
                      cursor: 'pointer',
                    }}
                  >
                    Discard
                  </button>
                  <button
                    onClick={handleConfirmSaveAndProceed}
                    style={{
                      background: '#81B29A',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '5px 12px',
                      color: '#101713',
                      fontWeight: 600,
                      fontSize: '11.5px',
                      cursor: 'pointer',
                    }}
                  >
                    Save & Proceed
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Obsidian Markdown Import Modal (Phase 05) */}
          {showImportModal && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(10, 14, 12, 0.88)',
                backdropFilter: 'blur(6px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 70,
              }}
            >
              <div
                style={{
                  width: '520px',
                  maxWidth: '92%',
                  background: '#17201B',
                  border: '1px solid #2F4034',
                  borderRadius: '12px',
                  padding: '20px',
                  boxShadow: '0 16px 40px rgba(0, 0, 0, 0.7)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#81B29A' }}>
                    <Upload size={16} />
                    <span style={{ fontWeight: 600, fontSize: '13.5px', color: '#EDEAE3' }}>
                      Import Obsidian Markdown
                    </span>
                  </div>
                  <button
                    onClick={() => setShowImportModal(false)}
                    style={{ background: 'transparent', border: 'none', color: '#8E949B', cursor: 'pointer' }}
                  >
                    <X size={15} />
                  </button>
                </div>

                <div style={{ fontSize: '11.5px', color: '#9FA4A8', lineHeight: 1.4 }}>
                  Paste Markdown containing optional YAML frontmatter (<code>title: "..."</code>, <code>subject: "..."</code>) and <code>[[WikiLinks]]</code>.
                </div>

                <textarea
                  value={importInputText}
                  onChange={(e) => setImportInputText(e.target.value)}
                  placeholder={`---\ntitle: "Distributed Consensus Protocols"\nsubject: "Distributed Systems"\ntags:\n  - study\n---\n# Paxos & Raft Summary\n\nNotes on leader election...`}
                  style={{
                    width: '100%',
                    height: '180px',
                    background: '#111713',
                    border: '1px solid #233027',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    color: '#EDEAE3',
                    fontSize: '11.5px',
                    fontFamily: 'monospace',
                    resize: 'none',
                    outline: 'none',
                  }}
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                  <button
                    onClick={() => setShowImportModal(false)}
                    style={{
                      background: 'transparent',
                      border: '1px solid #2E3E34',
                      borderRadius: '6px',
                      padding: '5px 12px',
                      color: '#9FA4A8',
                      fontSize: '11.5px',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (!importInputText.trim()) return
                      const parsed = parseObsidianMarkdown(importInputText)
                      const newId = `note_import_${Date.now()}`
                      const importedNote: StudyNoteItem = {
                        id: newId,
                        title: parsed.title,
                        subject: parsed.subject,
                        content: parsed.content,
                      }
                      setNotesList((prev) => [importedNote, ...prev])
                      setSelectedNoteId(importedNote.id)
                      setNoteTitle(importedNote.title)
                      setNoteSubject(importedNote.subject)
                      setNoteContent(importedNote.content)
                      setCleanTitle(importedNote.title)
                      setCleanContent(importedNote.content)
                      await onSaveNote(importedNote)
                      if (onImportMarkdown) {
                        onImportMarkdown(importedNote)
                      }
                      setShowImportModal(false)
                      setImportInputText('')
                      setNoteSavedFeedback(true)
                      setTimeout(() => setNoteSavedFeedback(false), 2500)
                    }}
                    disabled={!importInputText.trim()}
                    style={{
                      background: '#81B29A',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '5px 14px',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      color: '#101713',
                      cursor: importInputText.trim() ? 'pointer' : 'not-allowed',
                      opacity: importInputText.trim() ? 1 : 0.5,
                    }}
                  >
                    Import & Save to SQLite
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ── 3. CIPHER TASKS & SYSTEMS AGENDA PANEL (GATE B4) ── */}
      {activePanel === 'CIPHER_TASKS' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ type: 'spring', damping: 24, stiffness: 320 }}
          style={{
            width: '620px',
            maxWidth: '92vw',
            height: '520px',
            background: 'rgba(18, 22, 28, 0.98)',
            border: '1px solid #2A3644',
            borderRadius: '16px',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.7), 0 0 24px rgba(74, 137, 200, 0.16)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            pointerEvents: 'auto',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid #222C38',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(20, 26, 33, 0.92)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} color="#4A89C8" />
              {/* Tab Switcher: Daily Tasks vs Engineering Projects */}
              <div
                style={{
                  display: 'flex',
                  background: '#141A22',
                  border: '1px solid #242E3B',
                  borderRadius: '6px',
                  padding: '2px',
                  gap: '2px',
                }}
              >
                <button
                  onClick={() => setCipherActiveTab('tasks')}
                  style={{
                    background: cipherActiveTab === 'tasks' ? '#212B38' : 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '3px 8px',
                    fontSize: '11px',
                    color: cipherActiveTab === 'tasks' ? '#EDEAE3' : '#8E949B',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontWeight: cipherActiveTab === 'tasks' ? 600 : 400,
                  }}
                >
                  <CheckCircle size={11} color={cipherActiveTab === 'tasks' ? '#4A89C8' : '#8E949B'} />
                  <span>Tasks & Coursework ({dueTasks.length + dueAssignments.length})</span>
                </button>
                <button
                  onClick={() => setCipherActiveTab('projects')}
                  style={{
                    background: cipherActiveTab === 'projects' ? '#212B38' : 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '3px 8px',
                    fontSize: '11px',
                    color: cipherActiveTab === 'projects' ? '#EDEAE3' : '#8E949B',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontWeight: cipherActiveTab === 'projects' ? 600 : 400,
                  }}
                >
                  <FolderGit2 size={11} color={cipherActiveTab === 'projects' ? '#4A89C8' : '#8E949B'} />
                  <span>Engineering Projects ({projects.length})</span>
                </button>
              </div>

              <span
                style={{
                  fontSize: '10px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: '#1A232F',
                  color: '#4A89C8',
                  fontWeight: 600,
                }}
              >
                SQLite WAL
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                onClick={handleRequestMinimize}
                title="Minimize panel"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#8E949B',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <Minus size={15} />
              </button>
              <button
                onClick={handleRequestClose}
                title="Close panel (Esc)"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#8E949B',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Quick Task Input Bar (When in Tasks Tab) */}
          {cipherActiveTab === 'tasks' && (
            <div
              style={{
                padding: '9px 16px',
                background: '#141A22',
                borderBottom: '1px solid #222C38',
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
              }}
            >
              <input
                type="text"
                value={newTaskInput}
                onChange={(e) => setNewTaskInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTaskInput.trim()) {
                    onAddTask?.(newTaskInput.trim())
                    setNewTaskInput('')
                  }
                }}
                placeholder="+ Add new task or milestone to SQLite WAL..."
                style={{
                  flex: 1,
                  background: '#10141A',
                  border: '1px solid #263342',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  color: '#EDEAE3',
                  fontSize: '12px',
                  outline: 'none',
                }}
              />
              <button
                onClick={() => {
                  if (newTaskInput.trim()) {
                    onAddTask?.(newTaskInput.trim())
                    setNewTaskInput('')
                  }
                }}
                disabled={!newTaskInput.trim()}
                style={{
                  background: '#4A89C8',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 14px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  color: '#10141A',
                  cursor: newTaskInput.trim() ? 'pointer' : 'not-allowed',
                  opacity: newTaskInput.trim() ? 1 : 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Plus size={13} />
                <span>Add</span>
              </button>
            </div>
          )}

          {/* Content Pane: Tasks List OR Engineering Projects */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            {cipherActiveTab === 'tasks' ? (
              dueTasks.length === 0 && dueAssignments.length === 0 ? (
                <div
                  style={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#7B8490',
                    fontSize: '13px',
                  }}
                >
                  <CheckCircle size={32} color="#81B29A" style={{ marginBottom: '10px' }} />
                  <span style={{ fontWeight: 600, color: '#EDEAE3' }}>Zero overdue items</span>
                  <span style={{ fontSize: '12px', marginTop: '4px' }}>Your daily schedule is clean.</span>
                </div>
              ) : (
                <>
                  {dueTasks.map((t) => (
                    <div
                      key={t.id}
                      style={{
                        background: '#14181F',
                        border: '1px solid #242E3B',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                          type="checkbox"
                          checked={t.completed}
                          onChange={(e) => onTaskCompleted(t.id, e.target.checked)}
                          style={{ cursor: 'pointer', accentColor: '#4A89C8' }}
                        />
                        <div>
                          <div
                            style={{
                              fontSize: '13px',
                              color: t.completed ? '#75808C' : '#EDEAE3',
                              textDecoration: t.completed ? 'line-through' : 'none',
                            }}
                          >
                            {t.title}
                          </div>
                          {t.subject && (
                            <div style={{ fontSize: '11px', color: '#4A89C8', marginTop: '2px' }}>
                              {t.subject}
                            </div>
                          )}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: '10.5px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: '#1F2732',
                          color: '#9AA6B4',
                        }}
                      >
                        Task
                      </span>
                    </div>
                  ))}

                  {dueAssignments.map((a) => (
                    <div
                      key={a.id}
                      style={{
                        background: '#14181F',
                        border: '1px solid #242E3B',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Clock size={14} color="#F4A261" />
                        <div>
                          <div style={{ fontSize: '13px', color: '#EDEAE3' }}>{a.title}</div>
                          <div style={{ fontSize: '11px', color: '#81B29A', marginTop: '2px' }}>
                            {a.subjectCode} • Due {a.dueDate?.slice(0, 10)}
                          </div>
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: '10.5px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: '#2B231D',
                          color: '#F4A261',
                        }}
                      >
                        Coursework
                      </span>
                    </div>
                  ))}
                </>
              )
            ) : (
              /* Engineering Projects List */
              projects.map((proj) => {
                const statusColor =
                  proj.status === 'DONE'
                    ? '#81B29A'
                    : proj.status === 'IN_PROGRESS'
                    ? '#4A89C8'
                    : '#F4A261'

                return (
                  <div
                    key={proj.id}
                    style={{
                      background: '#141922',
                      border: '1px solid #232E3C',
                      borderRadius: '10px',
                      padding: '14px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      boxShadow: '0 4px 14px rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#EDEAE3' }}>
                          {proj.name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#8E98A5', marginTop: '3px', lineHeight: 1.4 }}>
                          {proj.description}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          background: `${statusColor}18`,
                          border: `1px solid ${statusColor}44`,
                          color: statusColor,
                        }}
                      >
                        {proj.status.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '11px',
                          color: '#7E8B9B',
                          marginBottom: '4px',
                        }}
                      >
                        <span>Sprint Velocity & Milestones</span>
                        <span style={{ fontWeight: 600, color: statusColor }}>{proj.progressPercent}%</span>
                      </div>
                      <div
                        style={{
                          width: '100%',
                          height: '6px',
                          background: '#1D2531',
                          borderRadius: '3px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${proj.progressPercent}%`,
                            height: '100%',
                            background: statusColor,
                            borderRadius: '3px',
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                    </div>

                    {/* Tech Stack Chips & Linked Note Action */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: '2px',
                      }}
                    >
                      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                        {proj.techStack.map((tech) => (
                          <span
                            key={tech}
                            style={{
                              fontSize: '10.5px',
                              padding: '2px 7px',
                              borderRadius: '4px',
                              background: '#19202B',
                              border: '1px solid #253140',
                              color: '#9EABB8',
                            }}
                          >
                            {tech}
                          </span>
                        ))}
                      </div>

                      {proj.linkedNoteId && onOpenAdaNotes && (
                        <button
                          onClick={() => onOpenAdaNotes()}
                          style={{
                            background: 'transparent',
                            border: '1px solid rgba(129, 178, 154, 0.4)',
                            borderRadius: '6px',
                            padding: '3px 8px',
                            fontSize: '11px',
                            color: '#81B29A',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                          title="Jump to associated technical notes in Ada's Knowledge Hub"
                        >
                          <BookOpen size={11} />
                          <span>Study Note ↗</span>
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </motion.div>
      )}

      {/* ── 4. CHILL CORNER / MUSIC CONCEPT PLAYER (GATE B5) ── */}
      {activePanel === 'MUSIC_CORNER' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ type: 'spring', damping: 24, stiffness: 320 }}
          style={{
            width: '420px',
            maxWidth: '90vw',
            background: 'rgba(22, 25, 29, 0.98)',
            border: '1px solid #373E47',
            borderRadius: '16px',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.7), 0 0 20px rgba(217, 119, 54, 0.2)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            pointerEvents: 'auto',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid #282E36',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Disc3 size={16} color="#D97736" />
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#EDEAE3' }}>
                Chill Lounge & Focus Audio
              </span>
              <span
                style={{
                  fontSize: '9px',
                  padding: '2px 5px',
                  borderRadius: '4px',
                  background: '#2D2319',
                  color: '#F4A261',
                  fontWeight: 600,
                }}
              >
                PROTOTYPE CONCEPT
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                onClick={handleRequestMinimize}
                title="Minimize panel"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#8E949B',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <Minus size={15} />
              </button>
              <button
                onClick={handleRequestClose}
                title="Close panel (Esc)"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#8E949B',
                  cursor: 'pointer',
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Vinyl Visualizer Card */}
          <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <motion.div
              animate={isReducedMotion || !musicPlaying ? {} : { rotate: 360 }}
              transition={{ repeat: Infinity, duration: 6, ease: 'linear' }}
              style={{
                width: '110px',
                height: '110px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, #252A30 0%, #101214 70%)',
                border: '3px solid #2F3741',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              <Disc3 size={90} color="#D97736" style={{ opacity: 0.85 }} />
              <div
                style={{
                  position: 'absolute',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: '#F4A261',
                  border: '2px solid #101214',
                }}
              />
            </motion.div>

            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#EDEAE3' }}>
                Engineering Focus Session #4
              </div>
              <div style={{ fontSize: '12px', color: '#8E949B', marginTop: '3px' }}>
                Ambient Lo-Fi Beats • 64 BPM
              </div>
            </div>

            {/* Clearly labeled concept banner */}
            <div
              style={{
                marginTop: '16px',
                padding: '8px 12px',
                borderRadius: '8px',
                background: '#191D22',
                border: '1px solid #29313A',
                fontSize: '11px',
                color: '#9DA3A8',
                lineHeight: 1.45,
                textAlign: 'center',
              }}
            >
              Non-functional visual concept for Spotify/Media integration. Real Spotify API authorization and playback hooks are scheduled for Phase 07.
            </div>

            {/* Quick External Actions */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px', width: '100%' }}>
              <button
                onClick={() => onOpenExternal('https://open.spotify.com')}
                style={{
                  flex: 1,
                  background: '#1DB954',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                }}
              >
                <ExternalLink size={13} />
                <span>Open Spotify App</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── 5. THREE.JS LIVING 3D OFFICE VIEWPORT (GATE B0 TRUTHFUL PROTOTYPE) ── */}
      {activePanel === 'OFFICE_3D' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ type: 'spring', damping: 24, stiffness: 320 }}
          style={{
            width: '840px',
            maxWidth: '94vw',
            height: '620px',
            background: 'rgba(16, 18, 20, 0.98)',
            border: '1px solid #323A44',
            borderRadius: '16px',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.75), 0 0 24px rgba(244, 162, 97, 0.2)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            pointerEvents: 'auto',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid #242A31',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(20, 24, 28, 0.92)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={16} color="#F4A261" />
              <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#EDEAE3' }}>
                Three.js Studio Prototype (Single Desk & Droid)
              </span>
              <span
                style={{
                  fontSize: '10px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: '#2B231A',
                  color: '#F4A261',
                  fontWeight: 600,
                }}
              >
                PROTOTYPE VIEWPORT
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                onClick={handleRequestMinimize}
                title="Minimize panel"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#8E949B',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <Minus size={15} />
              </button>
              <button
                onClick={handleRequestClose}
                title="Close panel (Esc)"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#8E949B',
                  cursor: 'pointer',
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* 3D Canvas Container */}
          <div style={{ flex: 1, position: 'relative', background: '#0D0F11', overflow: 'hidden' }}>
            <ThreeOfficeViewport isReducedMotion={isReducedMotion} />
            <div
              style={{
                position: 'absolute',
                bottom: '12px',
                left: '12px',
                right: '12px',
                padding: '8px 14px',
                borderRadius: '8px',
                background: 'rgba(16, 18, 20, 0.9)',
                border: '1px solid #2A3038',
                fontSize: '11px',
                color: '#9FA4A8',
                pointerEvents: 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>Three.js WebGL prototype. Disposed on unmount. Existing multi-room diorama preserved in <code>apps/web/src/hq3d/</code> for Phase 08.</span>
              <span style={{ color: '#F4A261' }}>Zero GPU draw when closed</span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
