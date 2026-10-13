/**
 * GRAVITAS V1-F-01 — Floating Desktop Companion Renderer Controller
 *
 * Runs inside sandboxed Chromium renderer with zero Node privileges.
 * Communicates exclusively through allowlisted window.gravitasDesktop bridge.
 */

import type {
  GravitasDesktopBridge,
  CompanionVisualState,
  IdeaRecord,
  AssistantCapabilityRecord,
  ImprovementProposal,
  VoiceSttStatusProjection,
} from '../types.js'

let currentState: CompanionVisualState = 'IDLE'
let activeCommandId: string | null = null
let activePttSessionId: string | null = null
let cachedIdeas: readonly IdeaRecord[] = []

export function setCompanionVisualState(state: CompanionVisualState, statusMessage?: string): void {
  currentState = state
  const badge = document.getElementById('companion-state-badge')
  if (badge) {
    badge.className = `state-badge state-${state}`
    badge.textContent = state
  }
  const pttBanner = document.getElementById('companion-ptt-banner')
  if (pttBanner) {
    pttBanner.classList.toggle('active', state === 'LISTENING')
  }
  const pttBtn = document.getElementById('companion-ptt-btn')
  if (pttBtn) {
    pttBtn.textContent = state === 'LISTENING' ? 'Stop PTT' : 'Mic PTT'
  }
  if (statusMessage !== undefined) {
    const statusBox = document.getElementById('companion-status-box')
    if (statusBox) {
      statusBox.textContent = statusMessage
    }
  }
}

export function getCompanionVisualState(): CompanionVisualState {
  return currentState
}

export function renderIdeasList(ideas: readonly IdeaRecord[], bridge?: GravitasDesktopBridge): void {
  cachedIdeas = ideas
  const countBadge = document.getElementById('vault-count-badge')
  if (countBadge) {
    countBadge.textContent = String(ideas.length)
  }

  const container = document.getElementById('vault-ideas-list')
  if (!container) return
  container.innerHTML = ''

  if (ideas.length === 0) {
    const empty = document.createElement('div')
    empty.style.color = '#9ca3af'
    empty.style.fontSize = '12px'
    empty.textContent = 'No ideas found in Local Ideas Vault.'
    container.appendChild(empty)
    return
  }

  for (const idea of ideas) {
    const card = document.createElement('div')
    card.className = 'idea-card'
    card.setAttribute('data-idea-id', idea.id)

    const header = document.createElement('div')
    header.className = 'idea-card-header'

    const titleEl = document.createElement('h3')
    titleEl.className = 'idea-title'
    titleEl.textContent = idea.title

    const actionsWrap = document.createElement('div')
    actionsWrap.style.display = 'flex'
    actionsWrap.style.gap = '4px'

    const openBtn = document.createElement('button')
    openBtn.className = 'btn btn-sm'
    openBtn.textContent = 'Open / Edit'
    openBtn.addEventListener('click', () => {
      openIdeaDetailPanel(idea, false)
    })

    const delBtn = document.createElement('button')
    delBtn.className = 'btn btn-danger btn-sm'
    delBtn.textContent = 'Delete'
    delBtn.addEventListener('click', () => {
      openIdeaDetailPanel(idea, true)
    })

    actionsWrap.appendChild(openBtn)
    actionsWrap.appendChild(delBtn)
    header.appendChild(titleEl)
    header.appendChild(actionsWrap)
    card.appendChild(header)

    const origEl = document.createElement('div')
    origEl.className = 'idea-original'
    origEl.setAttribute('data-idea-original', idea.id)
    origEl.textContent = idea.originalText
    card.appendChild(origEl)

    if (idea.summary) {
      const sumEl = document.createElement('div')
      sumEl.className = 'idea-summary'
      sumEl.textContent = idea.summary
      card.appendChild(sumEl)
    }

    const meta = document.createElement('div')
    meta.className = 'idea-meta'

    const tagsWrap = document.createElement('div')
    const catPill = document.createElement('span')
    catPill.className = 'tag-pill'
    catPill.textContent = idea.category
    tagsWrap.appendChild(catPill)

    for (const tag of idea.tags) {
      const pill = document.createElement('span')
      pill.className = 'tag-pill'
      pill.textContent = `#${tag}`
      tagsWrap.appendChild(pill)
    }

    const statusSpan = document.createElement('span')
    statusSpan.textContent = `${idea.persistenceStatus} · ${new Date(idea.updatedAt).toLocaleTimeString()}`

    meta.appendChild(tagsWrap)
    meta.appendChild(statusSpan)
    card.appendChild(meta)

    container.appendChild(card)
  }

  void bridge
}

export function openIdeaDetailPanel(idea: IdeaRecord, showDeleteConfirmation = false): void {
  const panel = document.getElementById('idea-detail-panel')
  const idInput = document.getElementById('detail-idea-id') as HTMLInputElement | null
  const origEl = document.getElementById('detail-original-text')
  const titleInput = document.getElementById('detail-title-input') as HTMLInputElement | null
  const summaryInput = document.getElementById('detail-summary-input') as HTMLTextAreaElement | null
  const catInput = document.getElementById('detail-category-input') as HTMLInputElement | null
  const tagsInput = document.getElementById('detail-tags-input') as HTMLInputElement | null
  const confirmBar = document.getElementById('detail-delete-confirm-bar')

  if (idInput) idInput.value = idea.id
  if (origEl) origEl.textContent = idea.originalText
  if (titleInput) titleInput.value = idea.title
  if (summaryInput) summaryInput.value = idea.summary ?? ''
  if (catInput) catInput.value = idea.category
  if (tagsInput) tagsInput.value = idea.tags.join(', ')
  if (confirmBar) confirmBar.classList.toggle('active', showDeleteConfirmation)
  if (panel) panel.classList.add('active')
}

export function closeIdeaDetailPanel(): void {
  const panel = document.getElementById('idea-detail-panel')
  const confirmBar = document.getElementById('detail-delete-confirm-bar')
  if (confirmBar) confirmBar.classList.remove('active')
  if (panel) panel.classList.remove('active')
}

export function renderCapabilitiesAndStt(
  stt: VoiceSttStatusProjection | null,
  capabilities: readonly AssistantCapabilityRecord[],
  proposals: readonly ImprovementProposal[]
): void {
  const sttSummary = document.getElementById('stt-status-summary')
  if (sttSummary && stt) {
    sttSummary.textContent = `[${stt.sttStatus}] Engine: ${stt.engineName} | Cloud Audio Egress: NONE | ${stt.setupMessage}`
  }

  const capList = document.getElementById('capabilities-list')
  if (capList) {
    capList.innerHTML = ''
    for (const cap of capabilities) {
      const card = document.createElement('div')
      card.className = 'idea-card'

      const title = document.createElement('div')
      title.className = 'idea-title'
      title.textContent = `${cap.capabilityName} (${cap.capabilityId})`
      card.appendChild(title)

      const actions = document.createElement('div')
      actions.className = 'idea-summary'
      actions.textContent = `Actions: ${cap.supportedActions.join(', ')}`
      card.appendChild(actions)

      const perms = document.createElement('div')
      perms.className = 'idea-summary'
      perms.textContent = `Permissions: ${cap.requiredPermissions.join(', ')} | Failed Attempts: ${cap.failedAttempts}`
      card.appendChild(perms)

      capList.appendChild(card)
    }
  }

  const propList = document.getElementById('proposals-list')
  if (propList) {
    propList.innerHTML = ''
    if (proposals.length === 0) {
      const empty = document.createElement('div')
      empty.style.color = '#9ca3af'
      empty.style.fontSize = '11px'
      empty.textContent = 'No failed-task improvement proposals recorded yet.'
      propList.appendChild(empty)
    } else {
      for (const prop of proposals) {
        const card = document.createElement('div')
        card.className = 'idea-card'

        const title = document.createElement('div')
        title.className = 'idea-title'
        title.textContent = `[${prop.status}] ${prop.capabilityId}`
        card.appendChild(title)

        const reason = document.createElement('div')
        reason.className = 'idea-summary'
        reason.textContent = `Trigger: "${prop.triggerCommand}" — ${prop.failureReason}`
        card.appendChild(reason)

        const suggestion = document.createElement('div')
        suggestion.className = 'idea-summary'
        suggestion.style.color = '#fde68a'
        suggestion.textContent = `Proposal: ${prop.suggestedImprovement} (Auto-applied: false, Source modified: false)`
        card.appendChild(suggestion)

        propList.appendChild(card)
      }
    }
  }
}

export async function refreshVault(bridge: GravitasDesktopBridge): Promise<void> {
  if (!bridge.listIdeas) return
  const ideas = await bridge.listIdeas()
  renderIdeasList(ideas, bridge)
}

export async function refreshCapabilitiesView(bridge: GravitasDesktopBridge): Promise<void> {
  const stt = bridge.getVoiceSttStatus ? await bridge.getVoiceSttStatus() : null
  const capRes = bridge.getAssistantCapabilities
    ? await bridge.getAssistantCapabilities()
    : { capabilities: [], proposals: [] }
  renderCapabilitiesAndStt(stt, capRes.capabilities, capRes.proposals)
}

export async function runCompanionCommand(bridge: GravitasDesktopBridge, rawInput: string): Promise<void> {
  const trimmed = rawInput.trim()
  if (!trimmed) {
    setCompanionVisualState('ERROR', 'Please enter a command first.')
    return
  }
  if (!bridge.executeAssistantCommand) {
    setCompanionVisualState('ERROR', 'Assistant command bridge unavailable.')
    return
  }

  const cmdId = `cmd_ui_${Date.now()}`
  activeCommandId = cmdId
  setCompanionVisualState('PROCESSING', `Processing: "${trimmed}"...`)

  try {
    const res = await bridge.executeAssistantCommand({
      commandId: cmdId,
      input: trimmed,
    })

    if (activeCommandId !== cmdId && currentState === 'CANCELLED') {
      return
    }
    activeCommandId = null

    if (res.status === 'CANCELLED') {
      setCompanionVisualState('CANCELLED', res.message)
      return
    }

    if (res.status === 'CONFIRMATION_REQUIRED' && res.pendingDeleteIdea) {
      setCompanionVisualState('IDLE', res.message)
      openIdeaDetailPanel(res.pendingDeleteIdea, true)
      return
    }

    if (res.status === 'ERROR') {
      setCompanionVisualState('ERROR', res.message)
      await refreshCapabilitiesView(bridge)
      return
    }

    setCompanionVisualState('SUCCESS', res.message)
    if (res.ideas) {
      renderIdeasList(res.ideas, bridge)
    } else {
      await refreshVault(bridge)
    }
  } catch (err) {
    activeCommandId = null
    setCompanionVisualState('ERROR', `Command failed: ${(err as Error).message}`)
  }
}

export async function stopActiveAction(bridge: GravitasDesktopBridge): Promise<void> {
  const targetCmdId = activeCommandId ?? undefined
  activeCommandId = null

  if (activePttSessionId && bridge.cancelPushToTalk) {
    activePttSessionId = null
    await bridge.cancelPushToTalk()
  }

  if (bridge.cancelAssistantCommand) {
    const res = await bridge.cancelAssistantCommand(targetCmdId)
    setCompanionVisualState('CANCELLED', res.message)
  } else {
    setCompanionVisualState('CANCELLED', 'Stopped active action. Safe terminal state (CANCELLED) reached.')
  }
}

export async function togglePushToTalk(bridge: GravitasDesktopBridge): Promise<void> {
  if (!bridge.startPushToTalk || !bridge.stopPushToTalk) {
    setCompanionVisualState('ERROR', 'Push-to-Talk bridge unavailable.')
    return
  }

  if (currentState !== 'LISTENING' || !activePttSessionId) {
    const startRes = await bridge.startPushToTalk(true)
    activePttSessionId = startRes.pttSessionId
    setCompanionVisualState('LISTENING', startRes.visibleIndicatorText)
    return
  }

  const sessionId = activePttSessionId
  activePttSessionId = null
  setCompanionVisualState('PROCESSING', 'Transcribing Push-to-Talk audio offline...')

  const stopRes = await bridge.stopPushToTalk(sessionId)
  if (stopRes.transcribed && stopRes.transcript) {
    const inputEl = document.getElementById('companion-command-input') as HTMLInputElement | null
    if (inputEl) {
      inputEl.value = stopRes.transcript
    }
    await runCompanionCommand(bridge, stopRes.transcript)
  } else {
    setCompanionVisualState('IDLE', stopRes.setupMessage)
  }
}

export function initCompanionRenderer(bridge?: GravitasDesktopBridge): void {
  const b = bridge ?? window.gravitasDesktop
  if (!b) return

  const cmdInput = document.getElementById('companion-command-input') as HTMLInputElement | null
  const sendBtn = document.getElementById('companion-send-btn')
  const pttBtn = document.getElementById('companion-ptt-btn')
  const stopBtn = document.getElementById('companion-stop-btn')
  const closeBtn = document.getElementById('companion-close-btn')

  sendBtn?.addEventListener('click', () => {
    if (cmdInput) {
      void runCompanionCommand(b, cmdInput.value)
    }
  })

  cmdInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      void runCompanionCommand(b, cmdInput.value)
    }
  })

  pttBtn?.addEventListener('click', () => {
    void togglePushToTalk(b)
  })

  stopBtn?.addEventListener('click', () => {
    void stopActiveAction(b)
  })

  closeBtn?.addEventListener('click', () => {
    void b.hideCompanionWindow?.()
  })

  // Quick chips
  document.querySelectorAll<HTMLButtonElement>('[data-quick-cmd]').forEach((chip) => {
    chip.addEventListener('click', () => {
      const cmd = chip.getAttribute('data-quick-cmd') || ''
      if (cmdInput) cmdInput.value = cmd
      void runCompanionCommand(b, cmd)
    })
  })

  // Tabs
  document.querySelectorAll<HTMLButtonElement>('.tab-btn').forEach((tabBtn) => {
    tabBtn.addEventListener('click', () => {
      const targetId = tabBtn.getAttribute('data-tab')
      document.querySelectorAll('.tab-btn').forEach((btn) => btn.classList.toggle('active', btn === tabBtn))
      document.querySelectorAll('.tab-panel').forEach((p) => p.classList.toggle('active', p.id === targetId))
      if (targetId === 'panel-capabilities') {
        void refreshCapabilitiesView(b)
      }
    })
  })

  // Vault Search
  const searchInput = document.getElementById('vault-search-input') as HTMLInputElement | null
  const searchBtn = document.getElementById('vault-search-btn')
  const resetBtn = document.getElementById('vault-reset-btn')

  const executeVaultSearch = async () => {
    const q = searchInput?.value.trim() ?? ''
    if (!q) {
      await refreshVault(b)
      setCompanionVisualState('IDLE', 'Showing all saved ideas.')
      return
    }
    if (b.searchIdeas) {
      const results = await b.searchIdeas(q)
      renderIdeasList(results, b)
      setCompanionVisualState(
        'SUCCESS',
        results.length > 0
          ? `Found ${results.length} idea(s) matching "${q}": "${results[0]!.originalText}"`
          : `No saved ideas matched "${q}".`
      )
    }
  }

  searchBtn?.addEventListener('click', () => {
    void executeVaultSearch()
  })

  searchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      void executeVaultSearch()
    }
  })

  resetBtn?.addEventListener('click', () => {
    if (searchInput) searchInput.value = ''
    void refreshVault(b)
    setCompanionVisualState('IDLE', 'Showing all saved ideas.')
  })

  // Idea Detail Edit / Confirm Delete
  document.getElementById('detail-close-btn')?.addEventListener('click', () => {
    closeIdeaDetailPanel()
  })

  document.getElementById('detail-save-btn')?.addEventListener('click', async () => {
    const id = (document.getElementById('detail-idea-id') as HTMLInputElement | null)?.value
    const title = (document.getElementById('detail-title-input') as HTMLInputElement | null)?.value
    const summary = (document.getElementById('detail-summary-input') as HTMLTextAreaElement | null)?.value
    const category = (document.getElementById('detail-category-input') as HTMLInputElement | null)?.value
    const tagsRaw = (document.getElementById('detail-tags-input') as HTMLInputElement | null)?.value ?? ''

    if (!id || !b.updateIdea) return
    const tags = tagsRaw
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    try {
      const updated = await b.updateIdea({
        id,
        title,
        summary,
        category,
        tags,
      })
      openIdeaDetailPanel(updated, false)
      await refreshVault(b)
      setCompanionVisualState('SUCCESS', `Updated idea "${updated.title}" (original wording preserved).`)
    } catch (err) {
      setCompanionVisualState('ERROR', `Update failed: ${(err as Error).message}`)
    }
  })

  document.getElementById('detail-delete-request-btn')?.addEventListener('click', () => {
    document.getElementById('detail-delete-confirm-bar')?.classList.add('active')
  })

  document.getElementById('detail-delete-cancel-btn')?.addEventListener('click', () => {
    document.getElementById('detail-delete-confirm-bar')?.classList.remove('active')
  })

  document.getElementById('detail-delete-confirm-btn')?.addEventListener('click', async () => {
    const id = (document.getElementById('detail-idea-id') as HTMLInputElement | null)?.value
    if (!id || !b.deleteIdea) return
    try {
      const res = await b.deleteIdea(id, true)
      closeIdeaDetailPanel()
      await refreshVault(b)
      setCompanionVisualState('SUCCESS', res.message)
    } catch (err) {
      setCompanionVisualState('ERROR', `Delete failed: ${(err as Error).message}`)
    }
  })

  b.onProjectionUpdate((projectionType) => {
    if (projectionType === 'IDEAS_VAULT' || projectionType === 'OVERVIEW') {
      void refreshVault(b)
    }
  })

  void refreshVault(b)
  void refreshCapabilitiesView(b)
  void cachedIdeas
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initCompanionRenderer())
  } else {
    initCompanionRenderer()
  }
}
