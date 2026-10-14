/**
 * GRAVITAS V1-F-01 / V1-F-02 — Floating Desktop Companion & Local Knowledge Hub Renderer Controller
 *
 * Runs inside sandboxed Chromium renderer with zero Node privileges.
 * Communicates exclusively through allowlisted window.gravitasDesktop bridge.
 */

import type {
  GravitasDesktopBridge,
  CompanionVisualState,
  IdeaRecord,
  KnowledgeCollection,
  KnowledgeFilterInput,
  AssistantCapabilityRecord,
  ImprovementProposal,
  VoiceSttStatusProjection,
  SemesterSubjectRecord,
  AssignmentDraftRecord,
  StudyAssignmentRecord,
} from '../types.js'

let currentState: CompanionVisualState = 'IDLE'
let activeCommandId: string | null = null
let activePttSessionId: string | null = null
let cachedIdeas: readonly IdeaRecord[] = []
let activeCollectionFilter: string = 'ALL'
let activeSubjectFilter: string | null = null
let pendingNotepadCommandText: string | null = null
let cachedSemesterSubjects: readonly SemesterSubjectRecord[] = []
let cachedDrafts: readonly AssignmentDraftRecord[] = []
let cachedStudyAssignments: readonly StudyAssignmentRecord[] = []
let activeGuardianFilter: 'ALL' | 'UNFINISHED' | 'DUE_WEEK' = 'ALL'

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

function formatCollectionLabel(col?: KnowledgeCollection): string {
  switch (col) {
    case 'STUDY_NOTE':
      return 'STUDY NOTE'
    case 'PROJECT':
      return 'PROJECT'
    case 'PLAN_TASK':
      return 'TASK'
    case 'IDEA':
    default:
      return 'IDEA'
  }
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
    empty.textContent = 'No items found in Local Knowledge Hub.'
    container.appendChild(empty)
    return
  }

  for (const idea of ideas) {
    const card = document.createElement('div')
    card.className = 'idea-card'
    card.setAttribute('data-idea-id', idea.id)
    card.setAttribute('data-collection', idea.collection || 'IDEA')

    const header = document.createElement('div')
    header.className = 'idea-card-header'

    const titleWrap = document.createElement('div')
    titleWrap.style.display = 'flex'
    titleWrap.style.alignItems = 'center'
    titleWrap.style.gap = '6px'
    titleWrap.style.flexWrap = 'wrap'

    if (idea.collection === 'PLAN_TASK') {
      const cb = document.createElement('input')
      cb.type = 'checkbox'
      cb.checked = Boolean(idea.completed)
      cb.setAttribute('data-task-toggle', idea.id)
      cb.title = 'Toggle task completion'
      cb.addEventListener('change', async () => {
        if (bridge?.completeTask) {
          const updated = await bridge.completeTask(idea.id, cb.checked)
          setCompanionVisualState(
            'SUCCESS',
            updated.completed
              ? `Completed task "${updated.title}".`
              : `Reopened task "${updated.title}".`
          )
          await refreshVault(bridge)
        }
      })
      titleWrap.appendChild(cb)
    }

    const colBadge = document.createElement('span')
    const colKey = idea.collection || 'IDEA'
    colBadge.className = `collection-badge col-${colKey}`
    colBadge.textContent = formatCollectionLabel(colKey)
    titleWrap.appendChild(colBadge)

    const titleEl = document.createElement('h3')
    titleEl.className = 'idea-title'
    if (idea.completed) {
      titleEl.style.textDecoration = 'line-through'
      titleEl.style.color = '#9ca3af'
    }
    titleEl.textContent = idea.title
    titleWrap.appendChild(titleEl)

    const actionsWrap = document.createElement('div')
    actionsWrap.style.display = 'flex'
    actionsWrap.style.gap = '4px'

    const viewWsBtn = document.createElement('button')
    viewWsBtn.className = 'btn btn-sm'
    viewWsBtn.textContent = 'View in Workspace ↗'
    viewWsBtn.title = 'Open note in Main Workspace'
    viewWsBtn.setAttribute('data-view-workspace-btn', idea.id)
    viewWsBtn.addEventListener('click', async () => {
      try {
        localStorage.setItem('gravitas_pending_navigate', JSON.stringify({ surface: 'surface-notes', targetId: idea.id }))
      } catch {}
      await bridge?.showMainWindow?.({ surface: 'surface-notes', targetId: idea.id })
    })

    const openBtn = document.createElement('button')
    openBtn.className = 'btn btn-sm'
    openBtn.textContent = 'Open / Edit'
    openBtn.addEventListener('click', () => {
      openIdeaDetailPanel(idea, false, bridge)
    })

    const delBtn = document.createElement('button')
    delBtn.className = 'btn btn-danger btn-sm'
    delBtn.textContent = 'Delete'
    delBtn.addEventListener('click', () => {
      openIdeaDetailPanel(idea, true, bridge)
    })

    actionsWrap.appendChild(viewWsBtn)
    actionsWrap.appendChild(openBtn)
    actionsWrap.appendChild(delBtn)
    header.appendChild(titleWrap)
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

    if (idea.subject) {
      const subjPill = document.createElement('span')
      subjPill.className = 'subject-pill'
      subjPill.textContent = idea.topic ? `${idea.subject}: ${idea.topic}` : idea.subject
      tagsWrap.appendChild(subjPill)
    }

    if (idea.dueDate) {
      const duePill = document.createElement('span')
      duePill.className = 'due-pill'
      duePill.textContent = `Due: ${idea.dueDate}`
      tagsWrap.appendChild(duePill)
    }

    if (idea.linkedItemIds && idea.linkedItemIds.length > 0) {
      const linkPill = document.createElement('span')
      linkPill.className = 'link-pill'
      linkPill.textContent = `${idea.linkedItemIds.length} link(s)`
      tagsWrap.appendChild(linkPill)
    }

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
}

export function openIdeaDetailPanel(
  idea: IdeaRecord,
  showDeleteConfirmation = false,
  bridge?: GravitasDesktopBridge
): void {
  const panel = document.getElementById('idea-detail-panel')
  const idInput = document.getElementById('detail-idea-id') as HTMLInputElement | null
  const origEl = document.getElementById('detail-original-text')
  const titleInput = document.getElementById('detail-title-input') as HTMLInputElement | null
  const colSelect = document.getElementById('detail-collection-select') as HTMLSelectElement | null
  const summaryInput = document.getElementById('detail-summary-input') as HTMLTextAreaElement | null
  const subjectInput = document.getElementById('detail-subject-input') as HTMLInputElement | null
  const topicInput = document.getElementById('detail-topic-input') as HTMLInputElement | null
  const dueInput = document.getElementById('detail-duedate-input') as HTMLInputElement | null
  const completedCb = document.getElementById('detail-completed-checkbox') as HTMLInputElement | null
  const catInput = document.getElementById('detail-category-input') as HTMLInputElement | null
  const tagsInput = document.getElementById('detail-tags-input') as HTMLInputElement | null
  const confirmBar = document.getElementById('detail-delete-confirm-bar')

  if (idInput) idInput.value = idea.id
  if (origEl) origEl.textContent = idea.originalText
  if (titleInput) titleInput.value = idea.title
  if (colSelect) colSelect.value = idea.collection || 'IDEA'
  if (summaryInput) summaryInput.value = idea.summary ?? ''
  if (subjectInput) subjectInput.value = idea.subject ?? ''
  if (topicInput) topicInput.value = idea.topic ?? ''
  if (dueInput) dueInput.value = idea.dueDate ?? ''
  if (completedCb) completedCb.checked = Boolean(idea.completed)
  if (catInput) catInput.value = idea.category
  if (tagsInput) tagsInput.value = idea.tags.join(', ')
  if (confirmBar) confirmBar.classList.toggle('active', showDeleteConfirmation)

  renderDetailLinksSection(idea, bridge)
  if (panel) panel.classList.add('active')
}

function renderDetailLinksSection(idea: IdeaRecord, bridge?: GravitasDesktopBridge): void {
  const targetSelect = document.getElementById('detail-link-target-select') as HTMLSelectElement | null
  const linkedList = document.getElementById('detail-linked-items-list')
  if (targetSelect) {
    targetSelect.innerHTML = ''
    const placeholder = document.createElement('option')
    placeholder.value = ''
    placeholder.textContent = '-- Select item to link --'
    targetSelect.appendChild(placeholder)

    for (const candidate of cachedIdeas) {
      if (candidate.id === idea.id) continue
      if (idea.linkedItemIds?.includes(candidate.id)) continue
      const opt = document.createElement('option')
      opt.value = candidate.id
      opt.textContent = `[${formatCollectionLabel(candidate.collection)}] ${candidate.title}`
      targetSelect.appendChild(opt)
    }
  }

  if (linkedList) {
    linkedList.innerHTML = ''
    const linkedIds = idea.linkedItemIds ?? []
    if (linkedIds.length === 0) {
      const none = document.createElement('span')
      none.style.fontSize = '10px'
      none.style.color = '#9ca3af'
      none.textContent = 'No linked items yet.'
      linkedList.appendChild(none)
      return
    }
    for (const linkedId of linkedIds) {
      const linkedRecord = cachedIdeas.find((it) => it.id === linkedId)
      const pill = document.createElement('span')
      pill.className = 'link-pill'
      pill.style.display = 'inline-flex'
      pill.style.alignItems = 'center'
      pill.style.gap = '4px'
      pill.textContent = linkedRecord ? linkedRecord.title : linkedId

      if (bridge?.unlinkKnowledgeItems) {
        const unlinkBtn = document.createElement('button')
        unlinkBtn.type = 'button'
        unlinkBtn.style.background = 'transparent'
        unlinkBtn.style.border = 'none'
        unlinkBtn.style.color = '#fca5a5'
        unlinkBtn.style.cursor = 'pointer'
        unlinkBtn.style.fontSize = '10px'
        unlinkBtn.style.padding = '0 2px'
        unlinkBtn.textContent = '×'
        unlinkBtn.title = 'Unlink item'
        unlinkBtn.addEventListener('click', async () => {
          await bridge.unlinkKnowledgeItems!(idea.id, linkedId)
          await refreshVault(bridge)
          const refreshed = cachedIdeas.find((it) => it.id === idea.id)
          if (refreshed) {
            openIdeaDetailPanel(refreshed, false, bridge)
          }
        })
        pill.appendChild(unlinkBtn)
      }
      linkedList.appendChild(pill)
    }
  }
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

export async function refreshSubjectsBar(bridge: GravitasDesktopBridge): Promise<void> {
  const bar = document.getElementById('knowledge-subjects-bar')
  const select = document.getElementById('companion-subject-select') as HTMLSelectElement | null
  if (!bridge.listStudySubjects) return
  const subjects = await bridge.listStudySubjects()

  if (select) {
    select.innerHTML = `<option value="">All Subjects (${subjects.length})</option>`
    for (const s of subjects) {
      const opt = document.createElement('option')
      opt.value = s.subject
      const totalCount = s.noteCount + s.taskCount
      opt.textContent = `${s.subject} (${totalCount})`
      if (s.subject === activeSubjectFilter) {
        opt.selected = true
      }
      select.appendChild(opt)
    }
    if (!select.dataset.listenerAttached) {
      select.dataset.listenerAttached = 'true'
      select.addEventListener('change', () => {
        activeSubjectFilter = select.value || null
        void refreshVault(bridge)
      })
    }
  }

  if (bar) {
    bar.innerHTML = ''
    if (subjects.length > 0) {
      for (const s of subjects) {
        const subj = s.subject
        const chip = document.createElement('button')
        chip.className = `chip${activeSubjectFilter === subj ? ' active' : ''}`
        chip.textContent = `Subject: ${subj} (${s.noteCount + s.taskCount})`
        chip.addEventListener('click', () => {
          activeSubjectFilter = activeSubjectFilter === subj ? null : subj
          if (select) select.value = activeSubjectFilter || ''
          void refreshVault(bridge)
        })
        bar.appendChild(chip)
      }
    }
  }
}

export async function refreshVault(bridge: GravitasDesktopBridge, customFilter?: KnowledgeFilterInput): Promise<void> {
  if (!bridge.listIdeas) return

  let filter: KnowledgeFilterInput | undefined = customFilter
  if (!filter) {
    if (activeCollectionFilter === 'UNFINISHED_TASKS') {
      filter = { collection: 'PLAN_TASK', unfinishedTasksOnly: true }
    } else if (activeCollectionFilter !== 'ALL') {
      filter = { collection: activeCollectionFilter as KnowledgeCollection }
    }
    if (activeSubjectFilter) {
      filter = { ...(filter ?? {}), subject: activeSubjectFilter }
    }
  }

  const ideas = filter ? await bridge.listIdeas(filter) : await bridge.listIdeas()
  renderIdeasList(ideas, bridge)
  await refreshSubjectsBar(bridge)
}

export async function refreshCapabilitiesView(bridge: GravitasDesktopBridge): Promise<void> {
  const stt = bridge.getVoiceSttStatus ? await bridge.getVoiceSttStatus() : null
  const capRes = bridge.getAssistantCapabilities
    ? await bridge.getAssistantCapabilities()
    : { capabilities: [], proposals: [] }
  renderCapabilitiesAndStt(stt, capRes.capabilities, capRes.proposals)
}

export function openConfirmDraftPanel(
  draft: AssignmentDraftRecord,
  subjects: readonly SemesterSubjectRecord[]
): void {
  const panel = document.getElementById('confirm-draft-panel')
  const idInput = document.getElementById('confirm-draft-id') as HTMLInputElement | null
  const titleInput = document.getElementById('confirm-title-input') as HTMLInputElement | null
  const subjectSelect = document.getElementById('confirm-subject-select') as HTMLSelectElement | null
  const dueInput = document.getElementById('confirm-duedate-input') as HTMLInputElement | null
  const instrArea = document.getElementById('confirm-instructions-textarea') as HTMLTextAreaElement | null

  if (idInput) idInput.value = draft.draftId
  if (titleInput) titleInput.value = draft.title
  if (dueInput) dueInput.value = draft.extractedDueDate ?? ''
  if (instrArea) instrArea.value = draft.teacherInstructions

  if (subjectSelect) {
    subjectSelect.innerHTML = ''
    for (const s of subjects) {
      const opt = document.createElement('option')
      opt.value = s.code
      opt.textContent = `${s.code} — ${s.name} (${s.credits} cr)`
      if (draft.suggestedSubjectCode === s.code) {
        opt.selected = true
      }
      subjectSelect.appendChild(opt)
    }
  }
  panel?.classList.add('active')
}

export async function openStudyAnswerPanel(
  assignment: StudyAssignmentRecord,
  bridge: GravitasDesktopBridge
): Promise<void> {
  const panel = document.getElementById('study-answer-panel')
  const idInput = document.getElementById('study-answer-assignment-id') as HTMLInputElement | null
  const teacherEl = document.getElementById('answer-teacher-verbatim')
  const promptArea = document.getElementById('answer-external-prompt-textarea') as HTMLTextAreaElement | null
  const pasteArea = document.getElementById('answer-paste-textarea') as HTMLTextAreaElement | null
  const answersList = document.getElementById('study-answers-list')

  if (idInput) idInput.value = assignment.assignmentId
  if (teacherEl) teacherEl.textContent = assignment.teacherInstructions
  if (promptArea) {
    promptArea.value = `Subject: ${assignment.subjectCode}\nAssignment: ${assignment.title}\nTeacher Instructions:\n${assignment.teacherInstructions}`
  }
  if (pasteArea) pasteArea.value = ''

  if (answersList && bridge.executeStudyGuardianOperation) {
    const res = await bridge.executeStudyGuardianOperation({
      action: 'LIST_STUDY_ANSWERS',
      assignmentId: assignment.assignmentId,
    })
    answersList.innerHTML = ''
    const answers = res.studyAnswers ?? []
    if (answers.length > 0) {
      for (const ans of answers) {
        const card = document.createElement('div')
        card.className = 'idea-card'
        card.setAttribute('data-answer-id', ans.answerId)
        card.innerHTML = `<div class="idea-title">[${ans.provenance}] ${ans.subjectCode} Answer Draft</div>`
        const body = document.createElement('div')
        body.className = 'idea-summary'
        body.style.whiteSpace = 'pre-wrap'
        body.textContent = ans.answerDraftText
        card.appendChild(body)
        answersList.appendChild(card)
      }
    }
  }
  panel?.classList.add('active')
}

export async function refreshStudyGuardianView(bridge: GravitasDesktopBridge): Promise<void> {
  if (!bridge.executeStudyGuardianOperation) return

  const assignmentsOp =
    activeGuardianFilter === 'DUE_WEEK'
      ? bridge.executeStudyGuardianOperation({ action: 'LIST_DUE_THIS_WEEK' })
      : bridge.executeStudyGuardianOperation({
          action: 'LIST_ASSIGNMENTS',
          unfinishedOnly: activeGuardianFilter === 'UNFINISHED',
        })

  const [subjectsRes, inboxCfgRes, inboxImportsRes, draftsRes, assignmentsRes, briefingRes] =
    await Promise.all([
      bridge.executeStudyGuardianOperation({ action: 'LIST_SEMESTER_SUBJECTS' }),
      bridge.executeStudyGuardianOperation({ action: 'GET_INBOX_CONFIG' }),
      bridge.executeStudyGuardianOperation({ action: 'LIST_INBOX_IMPORTS' }),
      bridge.executeStudyGuardianOperation({ action: 'LIST_ASSIGNMENT_DRAFTS' }),
      assignmentsOp,
      bridge.executeStudyGuardianOperation({ action: 'GET_SESSION_BRIEFING' }),
    ])

  cachedSemesterSubjects = subjectsRes.semesterSubjects ?? []
  cachedDrafts = (draftsRes.assignmentDrafts ?? []).filter((d) => !d.promotedAssignmentId)
  cachedStudyAssignments = assignmentsRes.assignments ?? []

  const guardianBadge = document.getElementById('guardian-count-badge')
  if (guardianBadge) {
    const unfinishedCount = cachedStudyAssignments.filter((a) => a.status !== 'COMPLETED').length
    guardianBadge.textContent = String(unfinishedCount + cachedDrafts.length)
  }

  const briefingText = document.getElementById('study-guardian-briefing-text')
  if (briefingText && briefingRes.sessionBriefing) {
    briefingText.textContent = briefingRes.sessionBriefing.summaryMessage
  }

  const folderInput = document.getElementById('inbox-folder-input') as HTMLInputElement | null
  const folderStatus = document.getElementById('inbox-folder-status')
  if (inboxCfgRes.inboxConfig) {
    if (folderInput && !folderInput.value) {
      folderInput.value = inboxCfgRes.inboxConfig.inboxFolderPath ?? ''
    }
    if (folderStatus) {
      folderStatus.textContent = inboxCfgRes.inboxConfig.inboxFolderPath
        ? `Watching: ${inboxCfgRes.inboxConfig.inboxFolderPath} (Watcher active: ${inboxCfgRes.inboxConfig.watcherActive}) · Imported items: ${(inboxImportsRes.inboxImports ?? []).length}`
        : 'No iCloud Inbox folder configured yet.'
    }
  }

  const draftsCount = document.getElementById('inbox-drafts-count')
  if (draftsCount) draftsCount.textContent = String(cachedDrafts.length)

  const draftsContainer = document.getElementById('inbox-drafts-list')
  if (draftsContainer) {
    draftsContainer.innerHTML = ''
    if (cachedDrafts.length === 0) {
      const empty = document.createElement('div')
      empty.style.fontSize = '11px'
      empty.style.color = '#9ca3af'
      empty.textContent = 'No unconfirmed inbox assignment drafts.'
      draftsContainer.appendChild(empty)
    } else {
      for (const draft of cachedDrafts) {
        const card = document.createElement('div')
        card.className = 'idea-card'
        card.setAttribute('data-draft-id', draft.draftId)

        const header = document.createElement('div')
        header.className = 'idea-card-header'
        const title = document.createElement('div')
        title.className = 'idea-title'
        title.textContent = `${draft.title} [${draft.extractionStatus}]`
        const reviewBtn = document.createElement('button')
        reviewBtn.className = 'btn btn-primary btn-sm'
        reviewBtn.textContent = 'Review & Confirm'
        reviewBtn.setAttribute('data-confirm-draft-btn', draft.draftId)
        reviewBtn.addEventListener('click', () => {
          openConfirmDraftPanel(draft, cachedSemesterSubjects)
        })
        header.appendChild(title)
        header.appendChild(reviewBtn)
        card.appendChild(header)

        const meta = document.createElement('div')
        meta.className = 'idea-summary'
        meta.textContent = `Detected Subject: ${draft.suggestedSubjectCode ?? 'Ambiguous'} (${draft.subjectConfidence}) · Explicit Due: ${draft.extractedDueDate ?? 'None'} · Relative: ${draft.relativeDeadlineExpression ?? 'None'}`
        card.appendChild(meta)
        draftsContainer.appendChild(card)
      }
    }
  }

  const assignmentsContainer = document.getElementById('study-assignments-list')
  if (assignmentsContainer) {
    assignmentsContainer.innerHTML = ''
    if (cachedStudyAssignments.length === 0) {
      const empty = document.createElement('div')
      empty.style.fontSize = '11px'
      empty.style.color = '#9ca3af'
      empty.textContent = 'No Study Guardian assignments match the current filter.'
      assignmentsContainer.appendChild(empty)
    } else {
      for (const asgn of cachedStudyAssignments) {
        const card = document.createElement('div')
        card.className = 'idea-card'
        card.setAttribute('data-assignment-id', asgn.assignmentId)

        const header = document.createElement('div')
        header.className = 'idea-card-header'
        const title = document.createElement('div')
        title.className = 'idea-title'
        title.textContent = `[${asgn.subjectCode}] ${asgn.title} — ${asgn.status} (${asgn.progressPercent}%)`

        const btnWrap = document.createElement('div')
        btnWrap.style.display = 'flex'
        btnWrap.style.gap = '4px'

        const viewSubjBtn = document.createElement('button')
        viewSubjBtn.className = 'btn btn-sm'
        viewSubjBtn.textContent = 'View in Subject ↗'
        viewSubjBtn.title = 'Open subject detail in Main Workspace'
        viewSubjBtn.setAttribute('data-view-subject-btn', asgn.subjectCode)
        viewSubjBtn.addEventListener('click', async () => {
          try {
            localStorage.setItem('gravitas_pending_navigate', JSON.stringify({ surface: 'surface-subjects', targetId: asgn.subjectCode }))
          } catch {}
          await bridge.showMainWindow?.({ surface: 'surface-subjects', targetId: asgn.subjectCode })
        })
        btnWrap.appendChild(viewSubjBtn)

        const answerBtn = document.createElement('button')
        answerBtn.className = 'btn btn-sm'
        answerBtn.textContent = 'Study Answers'
        answerBtn.setAttribute('data-open-answers-btn', asgn.assignmentId)
        answerBtn.addEventListener('click', () => {
          void openStudyAnswerPanel(asgn, bridge)
        })
        btnWrap.appendChild(answerBtn)

        if (asgn.status !== 'COMPLETED') {
          const doneBtn = document.createElement('button')
          doneBtn.className = 'btn btn-primary btn-sm'
          doneBtn.textContent = 'Complete'
          doneBtn.setAttribute('data-complete-assignment-btn', asgn.assignmentId)
          doneBtn.addEventListener('click', async () => {
            await bridge.executeStudyGuardianOperation!({
              action: 'COMPLETE_ASSIGNMENT',
              assignmentId: asgn.assignmentId,
            })
            await refreshStudyGuardianView(bridge)
            await refreshVault(bridge)
            setCompanionVisualState(
              'SUCCESS',
              `Completed assignment "${asgn.title}" (${asgn.subjectCode}). Reminders stopped.`
            )
          })
          btnWrap.appendChild(doneBtn)
        }

        header.appendChild(title)
        header.appendChild(btnWrap)
        card.appendChild(header)

        const details = document.createElement('div')
        details.className = 'idea-summary'
        details.textContent = `Due: ${asgn.dueDate || 'Unset'} · Reminders: ${asgn.paused ? 'Paused' : `Every ${asgn.reminderIntervalMinutes}m`}`
        card.appendChild(details)
        assignmentsContainer.appendChild(card)
      }
    }
  }

  const subjectsContainer = document.getElementById('semester-subjects-list')
  if (subjectsContainer) {
    subjectsContainer.innerHTML = ''
    for (const s of cachedSemesterSubjects) {
      const card = document.createElement('div')
      card.className = 'idea-card'
      card.setAttribute('data-subject-code', s.code)
      const title = document.createElement('div')
      title.className = 'idea-title'
      title.textContent = `${s.code} — ${s.name} (${s.credits} credits)`
      const counts = document.createElement('div')
      counts.className = 'idea-summary'
      counts.textContent = `Keywords: ${s.keywords.slice(0, 5).join(', ')} · Notes: ${s.notes || 'Ready'}`
      card.appendChild(title)
      card.appendChild(counts)
      subjectsContainer.appendChild(card)
    }
  }
}

export async function runCompanionCommand(
  bridge: GravitasDesktopBridge,
  rawInput: string,
  options?: { notepadSaveApproved?: boolean; targetAssignmentId?: string }
): Promise<void> {
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
      saveApproved: options?.notepadSaveApproved,
      targetAssignmentId: options?.targetAssignmentId,
    })

    if (activeCommandId !== cmdId && currentState === 'CANCELLED') {
      return
    }
    activeCommandId = null

    if (res.status === 'CANCELLED') {
      setCompanionVisualState('CANCELLED', res.message)
      return
    }

    if (res.status === 'CLARIFICATION_REQUIRED' && res.clarificationCandidates) {
      setCompanionVisualState('IDLE', res.message)
      const clarBar = document.getElementById('assignment-clarification-bar')
      const clarText = document.getElementById('assignment-clarification-text')
      const clarOpts = document.getElementById('assignment-clarification-options')
      if (clarText) clarText.textContent = res.message
      if (clarOpts) {
        clarOpts.innerHTML = ''
        for (const cand of res.clarificationCandidates) {
          const btn = document.createElement('button')
          btn.className = 'btn btn-primary btn-sm'
          btn.setAttribute('data-clarify-assignment-id', cand.assignmentId)
          btn.textContent = `${cand.subjectCode}: ${cand.title}`
          btn.addEventListener('click', () => {
            clarBar?.classList.remove('active')
            void runCompanionCommand(bridge, trimmed, {
              targetAssignmentId: cand.assignmentId,
            })
          })
          clarOpts.appendChild(btn)
        }
      }
      clarBar?.classList.add('active')
      return
    }

    if (res.status === 'CONFIRMATION_REQUIRED' && res.pendingDeleteIdea) {
      setCompanionVisualState('IDLE', res.message)
      openIdeaDetailPanel(res.pendingDeleteIdea, true, bridge)
      return
    }

    if (
      res.status === 'CONFIRMATION_REQUIRED' &&
      (res.notepadAutomation?.status === 'CONFIRMATION_REQUIRED' || res.pendingApprovalCommand)
    ) {
      pendingNotepadCommandText = res.pendingApprovalCommand ?? trimmed
      setCompanionVisualState('IDLE', res.message)
      const approvalBar = document.getElementById('notepad-approval-bar')
      const approvalText = document.getElementById('notepad-approval-text')
      if (approvalText) {
        approvalText.textContent = res.message
      }
      approvalBar?.classList.add('active')
      return
    }

    if (res.status === 'ERROR') {
      setCompanionVisualState('ERROR', res.message)
      await refreshCapabilitiesView(bridge)
      return
    }

    setCompanionVisualState('SUCCESS', res.message)
    if (res.assignments || res.updatedAssignment) {
      await refreshStudyGuardianView(bridge)
    }
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
  pendingNotepadCommandText = null
  document.getElementById('notepad-approval-bar')?.classList.remove('active')
  document.getElementById('assignment-clarification-bar')?.classList.remove('active')

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

export function applyCompanionTheme(theme: 'light' | 'dark'): void {
  const isLight = theme === 'light'
  document.body.classList.toggle('light-theme', isLight)
  try {
    localStorage.setItem('gravitas_theme', theme)
  } catch {
    // Ignore in tests
  }
  const themeBtn = document.getElementById('companion-theme-btn')
  if (themeBtn) {
    themeBtn.textContent = isLight ? 'Light' : 'Dark'
    themeBtn.title = `Toggle Theme (current: ${theme})`
  }
}

export function toggleCompanionTheme(): void {
  const isLight = document.body.classList.contains('light-theme')
  applyCompanionTheme(isLight ? 'dark' : 'light')
}

export function initCompanionTheme(): void {
  try {
    const saved = localStorage.getItem('gravitas_theme')
    if (saved === 'light') {
      applyCompanionTheme('light')
    } else {
      applyCompanionTheme('dark')
    }
  } catch {
    applyCompanionTheme('dark')
  }

  document.getElementById('companion-theme-btn')?.addEventListener('click', () => {
    toggleCompanionTheme()
  })

  window.addEventListener('storage', (e) => {
    if (e.key === 'gravitas_theme' && (e.newValue === 'light' || e.newValue === 'dark')) {
      applyCompanionTheme(e.newValue)
    }
  })
}

export function initCompanionRenderer(bridge?: GravitasDesktopBridge): void {
  initCompanionTheme()
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

  // Notepad approval bar buttons
  document.getElementById('notepad-approval-confirm-btn')?.addEventListener('click', () => {
    const cmdToApprove = pendingNotepadCommandText
    pendingNotepadCommandText = null
    document.getElementById('notepad-approval-bar')?.classList.remove('active')
    if (cmdToApprove) {
      void runCompanionCommand(b, cmdToApprove, { notepadSaveApproved: true })
    }
  })

  document.getElementById('notepad-approval-cancel-btn')?.addEventListener('click', () => {
    pendingNotepadCommandText = null
    document.getElementById('notepad-approval-bar')?.classList.remove('active')
    setCompanionVisualState('CANCELLED', 'Cancelled Notepad file save.')
  })

  // Quick chips
  document.querySelectorAll<HTMLButtonElement>('[data-quick-cmd]').forEach((chip) => {
    chip.addEventListener('click', () => {
      const cmd = chip.getAttribute('data-quick-cmd') || ''
      if (cmdInput) cmdInput.value = cmd
      void runCompanionCommand(b, cmd)
    })
  })

  // Collection filter pills
  document.querySelectorAll<HTMLButtonElement>('[data-collection-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeCollectionFilter = btn.getAttribute('data-collection-filter') || 'ALL'
      document.querySelectorAll('[data-collection-filter]').forEach((el) =>
        el.classList.toggle('active', el === btn)
      )
      void refreshVault(b)
    })
  })

  // Markdown Export & Import
  document.getElementById('knowledge-export-md-btn')?.addEventListener('click', async () => {
    if (!b.exportKnowledgeMarkdown) return
    try {
      const res = await b.exportKnowledgeMarkdown()
      setCompanionVisualState(
        'SUCCESS',
        `Exported ${res.exportedCount} item(s) to Markdown at ${res.exportDirectory}.`
      )
    } catch (err) {
      setCompanionVisualState('ERROR', `Markdown export failed: ${(err as Error).message}`)
    }
  })

  document.getElementById('knowledge-import-md-toggle-btn')?.addEventListener('click', () => {
    document.getElementById('knowledge-import-md-panel')?.classList.toggle('active')
  })

  document.getElementById('knowledge-import-md-close-btn')?.addEventListener('click', () => {
    document.getElementById('knowledge-import-md-panel')?.classList.remove('active')
  })

  document.getElementById('knowledge-import-md-submit-btn')?.addEventListener('click', async () => {
    const textarea = document.getElementById('knowledge-import-md-textarea') as HTMLTextAreaElement | null
    const rawMd = textarea?.value.trim() ?? ''
    if (!rawMd || !b.importKnowledgeMarkdown) return
    try {
      const imported = await b.importKnowledgeMarkdown(rawMd)
      if (textarea) textarea.value = ''
      document.getElementById('knowledge-import-md-panel')?.classList.remove('active')
      await refreshVault(b)
      setCompanionVisualState('SUCCESS', `Imported "${imported.title}" (${imported.collection}) from Markdown.`)
    } catch (err) {
      setCompanionVisualState('ERROR', `Markdown import failed: ${(err as Error).message}`)
    }
  })

  // Tabs
  document.querySelectorAll<HTMLButtonElement>('.tab-btn').forEach((tabBtn) => {
    tabBtn.addEventListener('click', () => {
      const targetId = tabBtn.getAttribute('data-tab')
      document.querySelectorAll('.tab-btn').forEach((btn) => btn.classList.toggle('active', btn === tabBtn))
      document.querySelectorAll('.tab-panel').forEach((p) => p.classList.toggle('active', p.id === targetId))
      if (targetId === 'panel-capabilities') {
        void refreshCapabilitiesView(b)
      } else if (targetId === 'panel-study-guardian') {
        void refreshStudyGuardianView(b)
      }
    })
  })

  // V1-G-01 Study Guardian & iCloud Drive Inbox controls
  document.getElementById('inbox-pick-folder-btn')?.addEventListener('click', async () => {
    if (!b.selectInboxFolder || !b.executeStudyGuardianOperation) return
    const pickRes = await b.selectInboxFolder()
    if (!pickRes.selected || !pickRes.folderPath) return
    const folderInput = document.getElementById('inbox-folder-input') as HTMLInputElement | null
    if (folderInput) folderInput.value = pickRes.folderPath
    const res = await b.executeStudyGuardianOperation({
      action: 'SET_INBOX_FOLDER',
      folderPath: pickRes.folderPath,
    })
    await refreshStudyGuardianView(b)
    setCompanionVisualState(
      res.success ? 'SUCCESS' : 'ERROR',
      res.errorMessage ?? `Configured iCloud Inbox folder: ${pickRes.folderPath}`
    )
  })

  document.getElementById('inbox-set-folder-btn')?.addEventListener('click', async () => {
    const folderInput = document.getElementById('inbox-folder-input') as HTMLInputElement | null
    const pathVal = folderInput?.value.trim() ?? ''
    if (!pathVal || !b.executeStudyGuardianOperation) return
    try {
      const res = await b.executeStudyGuardianOperation({
        action: 'SET_INBOX_FOLDER',
        folderPath: pathVal,
      })
      await refreshStudyGuardianView(b)
      setCompanionVisualState(
        res.success ? 'SUCCESS' : 'ERROR',
        res.errorMessage ?? `Configured iCloud Inbox folder: ${pathVal}`
      )
    } catch (err) {
      setCompanionVisualState('ERROR', `Inbox folder setup failed: ${(err as Error).message}`)
    }
  })

  document.getElementById('inbox-import-now-btn')?.addEventListener('click', async () => {
    if (!b.executeStudyGuardianOperation) return
    try {
      const res = await b.executeStudyGuardianOperation({ action: 'SCAN_INBOX' })
      await refreshStudyGuardianView(b)
      const count = res.inboxScan?.createdDrafts.length ?? 0
      setCompanionVisualState(
        res.success ? 'SUCCESS' : 'ERROR',
        res.errorMessage ?? `Scanned iCloud Inbox (${count} new assignment draft(s)).`
      )
    } catch (err) {
      setCompanionVisualState('ERROR', `Inbox import failed: ${(err as Error).message}`)
    }
  })

  document.getElementById('confirm-draft-close-btn')?.addEventListener('click', () => {
    document.getElementById('confirm-draft-panel')?.classList.remove('active')
  })

  document.getElementById('confirm-assignment-submit-btn')?.addEventListener('click', async () => {
    if (!b.executeStudyGuardianOperation) return
    const draftId = (document.getElementById('confirm-draft-id') as HTMLInputElement | null)?.value
    const title = (document.getElementById('confirm-title-input') as HTMLInputElement | null)?.value
    const subjectCode = (document.getElementById('confirm-subject-select') as HTMLSelectElement | null)?.value
    const dueDate = (document.getElementById('confirm-duedate-input') as HTMLInputElement | null)?.value
    const instructions = (document.getElementById('confirm-instructions-textarea') as HTMLTextAreaElement | null)?.value
    const intervalRaw = (document.getElementById('confirm-interval-input') as HTMLInputElement | null)?.value
    const quietStart = (document.getElementById('confirm-quiet-start-input') as HTMLInputElement | null)?.value
    const quietEnd = (document.getElementById('confirm-quiet-end-input') as HTMLInputElement | null)?.value

    if (!draftId || !subjectCode || !dueDate?.trim()) {
      setCompanionVisualState('ERROR', 'Please confirm both Semester Subject and Due Date (YYYY-MM-DD).')
      return
    }
    try {
      const res = await b.executeStudyGuardianOperation({
        action: 'CONFIRM_ASSIGNMENT',
        draftId,
        title: title ? title.trim() : undefined,
        confirmedSubjectCode: subjectCode,
        confirmedDueDate: dueDate.trim(),
        teacherInstructions: instructions,
        reminderIntervalMinutes: intervalRaw ? Number(intervalRaw) : 180,
        quietHoursStart: quietStart ? quietStart.trim() : '22:00',
        quietHoursEnd: quietEnd ? quietEnd.trim() : '07:00',
      })
      document.getElementById('confirm-draft-panel')?.classList.remove('active')
      await refreshStudyGuardianView(b)
      await refreshVault(b)
      setCompanionVisualState(
        res.success ? 'SUCCESS' : 'ERROR',
        res.errorMessage ?? `Confirmed assignment "${res.assignment?.title ?? title}" under ${subjectCode}.`
      )
    } catch (err) {
      setCompanionVisualState('ERROR', `Confirm draft failed: ${(err as Error).message}`)
    }
  })

  document.getElementById('study-answer-close-btn')?.addEventListener('click', () => {
    document.getElementById('study-answer-panel')?.classList.remove('active')
  })

  document.getElementById('answer-prepare-btn')?.addEventListener('click', async () => {
    const assignmentId = (document.getElementById('study-answer-assignment-id') as HTMLInputElement | null)?.value
    if (!assignmentId || !b.executeStudyGuardianOperation) return
    const res = await b.executeStudyGuardianOperation({
      action: 'PREPARE_ANSWER_DRAFT',
      assignmentId,
    })
    const promptArea = document.getElementById('answer-external-prompt-textarea') as HTMLTextAreaElement | null
    if (promptArea && res.answerDraftResult?.copyForExternalAiPrompt) {
      promptArea.value = res.answerDraftResult.copyForExternalAiPrompt
    }
    const asgn = cachedStudyAssignments.find((a) => a.assignmentId === assignmentId)
    if (asgn) {
      await openStudyAnswerPanel(asgn, b)
    }
    await refreshStudyGuardianView(b)
    await refreshVault(b)
    setCompanionVisualState('SUCCESS', res.answerDraftResult?.message ?? 'Prepared study answer draft.')
  })

  document.getElementById('answer-copy-prompt-btn')?.addEventListener('click', async () => {
    const assignmentId = (document.getElementById('study-answer-assignment-id') as HTMLInputElement | null)?.value
    if (!assignmentId || !b.executeStudyGuardianOperation) return
    const res = await b.executeStudyGuardianOperation({
      action: 'PREPARE_ANSWER_DRAFT',
      assignmentId,
    })
    const promptArea = document.getElementById('answer-external-prompt-textarea') as HTMLTextAreaElement | null
    if (promptArea && res.answerDraftResult?.copyForExternalAiPrompt) {
      promptArea.value = res.answerDraftResult.copyForExternalAiPrompt
    }
    setCompanionVisualState('SUCCESS', 'Prepared prompt for ChatGPT/Claude. Paste your answer below when ready.')
  })

  document.getElementById('answer-save-btn')?.addEventListener('click', async () => {
    const assignmentId = (document.getElementById('study-answer-assignment-id') as HTMLInputElement | null)?.value
    const pasteArea = document.getElementById('answer-paste-textarea') as HTMLTextAreaElement | null
    const text = pasteArea?.value.trim() ?? ''
    if (!assignmentId || !text || !b.executeStudyGuardianOperation) return
    const res = await b.executeStudyGuardianOperation({
      action: 'SAVE_STUDY_ANSWER',
      assignmentId,
      answerDraftText: text,
    })
    const asgn = cachedStudyAssignments.find((a) => a.assignmentId === assignmentId)
    if (asgn) {
      await openStudyAnswerPanel(asgn, b)
    }
    await refreshStudyGuardianView(b)
    await refreshVault(b)
    setCompanionVisualState(
      res.success ? 'SUCCESS' : 'ERROR',
      res.errorMessage ?? `Saved study answer under ${res.studyAnswer?.subjectCode ?? 'subject'} (assignment status unchanged).`
    )
  })

  document.getElementById('guardian-eval-reminders-btn')?.addEventListener('click', async () => {
    if (!b.executeStudyGuardianOperation) return
    const res = await b.executeStudyGuardianOperation({ action: 'EVALUATE_REMINDERS' })
    await refreshStudyGuardianView(b)
    const count = res.reminderEvaluation?.triggeredReminders.length ?? 0
    setCompanionVisualState('SUCCESS', `Evaluated Study Guardian reminders (${count} triggered).`)
  })

  document.querySelectorAll<HTMLButtonElement>('[data-guardian-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const f = (btn.getAttribute('data-guardian-filter') || 'ALL') as 'ALL' | 'UNFINISHED' | 'DUE_WEEK'
      activeGuardianFilter = f
      document.querySelectorAll('[data-guardian-filter]').forEach((el) =>
        el.classList.toggle('active', el === btn)
      )
      void refreshStudyGuardianView(b)
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
      setCompanionVisualState('IDLE', 'Showing all saved items.')
      return
    }
    if (b.searchIdeas) {
      const results = await b.searchIdeas(q)
      renderIdeasList(results, b)
      setCompanionVisualState(
        'SUCCESS',
        results.length > 0
          ? `Found ${results.length} item(s) matching "${q}": "${results[0]!.originalText}"`
          : `No saved items matched "${q}".`
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
    activeCollectionFilter = 'ALL'
    activeSubjectFilter = null
    const subjSel = document.getElementById('companion-subject-select') as HTMLSelectElement | null
    if (subjSel) subjSel.value = ''
    document.querySelectorAll('[data-collection-filter]').forEach((el) =>
      el.classList.toggle('active', el.getAttribute('data-collection-filter') === 'ALL')
    )
    void refreshVault(b)
    setCompanionVisualState('IDLE', 'Showing all saved items.')
  })

  // Idea Detail Edit / Link / Confirm Delete
  document.getElementById('detail-close-btn')?.addEventListener('click', () => {
    closeIdeaDetailPanel()
  })

  document.getElementById('detail-link-add-btn')?.addEventListener('click', async () => {
    const id = (document.getElementById('detail-idea-id') as HTMLInputElement | null)?.value
    const targetId = (document.getElementById('detail-link-target-select') as HTMLSelectElement | null)?.value
    if (!id || !targetId || !b.linkKnowledgeItems) return
    try {
      await b.linkKnowledgeItems(id, targetId)
      await refreshVault(b)
      const refreshed = cachedIdeas.find((it) => it.id === id)
      if (refreshed) {
        openIdeaDetailPanel(refreshed, false, b)
      }
      setCompanionVisualState('SUCCESS', 'Linked knowledge items.')
    } catch (err) {
      setCompanionVisualState('ERROR', `Link failed: ${(err as Error).message}`)
    }
  })

  document.getElementById('detail-save-btn')?.addEventListener('click', async () => {
    const id = (document.getElementById('detail-idea-id') as HTMLInputElement | null)?.value
    const title = (document.getElementById('detail-title-input') as HTMLInputElement | null)?.value
    const collection = (document.getElementById('detail-collection-select') as HTMLSelectElement | null)
      ?.value as KnowledgeCollection | undefined
    const summary = (document.getElementById('detail-summary-input') as HTMLTextAreaElement | null)?.value
    const subject = (document.getElementById('detail-subject-input') as HTMLInputElement | null)?.value
    const topic = (document.getElementById('detail-topic-input') as HTMLInputElement | null)?.value
    const dueDate = (document.getElementById('detail-duedate-input') as HTMLInputElement | null)?.value
    const completed = (document.getElementById('detail-completed-checkbox') as HTMLInputElement | null)?.checked
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
        collection,
        summary,
        subject: subject ? subject.trim() : null,
        topic: topic ? topic.trim() : null,
        dueDate: dueDate ? dueDate.trim() : null,
        completed,
        category,
        tags,
      })
      openIdeaDetailPanel(updated, false, b)
      await refreshVault(b)
      setCompanionVisualState('SUCCESS', `Updated "${updated.title}" (original wording preserved).`)
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
    if (projectionType === 'STUDY_GUARDIAN_SESSION_ACTIVE' || projectionType === 'OVERVIEW') {
      void refreshStudyGuardianView(b)
    }
  })

  void refreshVault(b)
  void refreshStudyGuardianView(b)
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
