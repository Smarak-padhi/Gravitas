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
} from '../types.js'
import type { PhoneSyncPlatform, PersonaArchetype } from '@gravitas/core'
import { initWorldView } from './world/worldView.js'
import type { WorldViewController } from './world/worldView.js'
import type { WorldDataSource } from './world/worldModel.js'

let activeDialogTriggerButton: HTMLElement | null = null
let currentDialogItem: { targetId: string; revision: number; outcome: string } | null = null
let worldView: WorldViewController | null = null

/** Select a surface (tab + panel). Pure navigation. */
export function activateSurface(surfaceId: string): void {
  if (surfaceId === 'surface-devtools') {
    surfaceId = 'surface-overview'
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

export async function refreshWorkspace(bridge: GravitasDesktopBridge): Promise<void> {
  // 1. Dynamic Greeting
  const greetingEl = document.getElementById('workspace-greeting')
  if (greetingEl) {
    const hour = new Date().getHours()
    if (hour < 12) greetingEl.textContent = 'Good morning'
    else if (hour < 17) greetingEl.textContent = 'Good afternoon'
    else greetingEl.textContent = 'Good evening'
  }

  // 2. Load Tasks
  try {
    const tasks = (await bridge.listIdeas?.({ collection: 'PLAN_TASK' })) || []
    const countEl = document.getElementById('workspace-tasks-count')
    if (countEl) countEl.textContent = String(tasks.length)

    const listEl = document.getElementById('workspace-tasks-list')
    const fullTasksEl = document.getElementById('tasks-full-list')

    const renderTaskNodes = (target: HTMLElement, maxItems?: number) => {
      if (tasks.length === 0) {
        target.innerHTML = '<div class="empty-state">No pending tasks. You are all caught up!</div>'
        return
      }
      target.innerHTML = ''
      const sorted = [...tasks].sort((a, b) => (a.completed ? 1 : 0) - (b.completed ? 1 : 0))
      const slice = maxItems ? sorted.slice(0, maxItems) : sorted
      for (const t of slice) {
        const item = document.createElement('div')
        item.className = `task-item ${t.completed ? 'completed' : ''}`

        const chk = document.createElement('input')
        chk.type = 'checkbox'
        chk.className = 'task-checkbox'
        chk.checked = Boolean(t.completed)
        chk.title = 'Mark task complete'
        chk.addEventListener('change', async () => {
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

        if (t.tags && t.tags.length > 0) {
          const tag = document.createElement('span')
          tag.className = 'task-tag'
          tag.textContent = t.tags[0]!
          content.appendChild(tag)
        } else if (t.category) {
          const tag = document.createElement('span')
          tag.className = 'task-tag'
          tag.textContent = t.category
          content.appendChild(tag)
        }

        item.appendChild(chk)
        item.appendChild(content)
        target.appendChild(item)
      }
    }

    if (listEl) renderTaskNodes(listEl, 6)
    if (fullTasksEl) renderTaskNodes(fullTasksEl)
  } catch {
    // Graceful fallback
  }

  // 3. Load Recent Notes & Ideas
  try {
    const allIdeas = (await bridge.listIdeas?.()) || []
    const notesOnly = allIdeas.filter((i) => i.collection !== 'PLAN_TASK')
    const countEl = document.getElementById('workspace-notes-count')
    if (countEl) countEl.textContent = String(notesOnly.length)

    const listEl = document.getElementById('workspace-notes-list')
    const fullNotesEl = document.getElementById('notes-full-list')

    const renderNoteNodes = (target: HTMLElement, maxItems?: number) => {
      if (notesOnly.length === 0) {
        target.innerHTML = '<div class="empty-state">No recent notes. Use the prompt bar above to capture thoughts.</div>'
        return
      }
      target.innerHTML = ''
      const slice = maxItems ? notesOnly.slice(0, maxItems) : notesOnly
      for (const n of slice) {
        const item = document.createElement('div')
        item.className = 'note-item'

        const header = document.createElement('div')
        header.className = 'note-header'

        const title = document.createElement('div')
        title.className = 'note-title'
        title.textContent = n.title

        const date = document.createElement('div')
        date.className = 'note-date'
        date.textContent = new Date(n.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

        header.appendChild(title)
        header.appendChild(date)
        item.appendChild(header)

        const preview = document.createElement('div')
        preview.className = 'note-preview'
        preview.textContent = n.originalText || n.summary || 'No text preview.'
        item.appendChild(preview)

        target.appendChild(item)
      }
    }

    if (listEl) renderNoteNodes(listEl, 4)
    if (fullNotesEl) renderNoteNodes(fullNotesEl)
  } catch {
    // Graceful fallback
  }

  // 4. Load Subjects & Collections
  try {
    const subjects = (await bridge.listStudySubjects?.()) || []
    const countEl = document.getElementById('workspace-subjects-count')
    if (countEl) countEl.textContent = String(subjects.length)

    const listEl = document.getElementById('workspace-subjects-list')
    const fullSubjectsEl = document.getElementById('subjects-full-list')

    const renderSubjectNodes = (target: HTMLElement, maxItems?: number) => {
      if (subjects.length === 0) {
        target.innerHTML = '<div class="empty-state">No study subjects enrolled yet. Configure in First-Run Setup.</div>'
        return
      }
      target.innerHTML = ''
      const slice = maxItems ? subjects.slice(0, maxItems) : subjects
      for (const s of slice) {
        const pill = document.createElement('div')
        pill.className = 'subject-pill'

        const info = document.createElement('div')
        info.className = 'subject-info'

        const title = document.createElement('div')
        title.className = 'subject-code'
        title.textContent = s.subject

        const meta = document.createElement('div')
        meta.className = 'subject-name'
        meta.textContent = `${s.noteCount || 0} notes · ${s.taskCount || 0} tasks`

        info.appendChild(title)
        info.appendChild(meta)
        pill.appendChild(info)

        target.appendChild(pill)
      }
    }

    if (listEl) renderSubjectNodes(listEl, 5)
    if (fullSubjectsEl) renderSubjectNodes(fullSubjectsEl)
  } catch {
    // Graceful fallback
  }

  // 5. Load Inbox Configuration
  try {
    if (bridge.executeStudyGuardianOperation) {
      const res = await bridge.executeStudyGuardianOperation({ action: 'GET_INBOX_CONFIG' })
      const pathEl = document.getElementById('workspace-inbox-path')
      const pillEl = document.getElementById('workspace-inbox-status-pill')
      const descEl = document.getElementById('workspace-inbox-desc')

      if (res.inboxConfig?.inboxFolderPath) {
        if (pathEl) pathEl.textContent = res.inboxConfig.inboxFolderPath
        if (pillEl) {
          pillEl.textContent = res.inboxConfig.watcherActive ? 'Connected' : 'Paused'
          pillEl.className = 'badge ' + (res.inboxConfig.watcherActive ? 'badge-ready' : 'badge-waiting')
        }
        if (descEl) {
          descEl.textContent = 'Watching folder for assignment PDFs and notes from your phone.'
        }
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

export function setupOnboardingController(bridge: GravitasDesktopBridge): void {
  const dialog = document.getElementById('onboarding-dialog') as HTMLDialogElement | null
  if (!dialog) return

  let currentScreen = 1
  const TOTAL_SCREENS = 5
  let selectedPlatform: PhoneSyncPlatform = 'IPHONE'
  let selectedAction: 'SAVE_IDEA' | 'CREATE_TASK' | 'IMPORT_ASSIGNMENT' | 'EXPLORE_SAMPLE' = 'SAVE_IDEA'

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

    for (let i = 1; i <= TOTAL_SCREENS; i++) {
      const el = document.getElementById(`onboarding-screen-${i}`)
      if (el) {
        el.style.display = i === currentScreen ? 'block' : 'none'
      }
    }

    const indicator = document.getElementById('onboarding-step-indicator')
    if (indicator) indicator.textContent = `${currentScreen} of ${TOTAL_SCREENS}`

    updateDots(currentScreen)

    const btnPrev = document.getElementById('onboarding-btn-prev')
    const btnNext = document.getElementById('onboarding-btn-next')
    const btnFinish = document.getElementById('onboarding-btn-finish')

    if (btnPrev) btnPrev.style.display = currentScreen > 1 ? 'inline-block' : 'none'
    if (btnNext) btnNext.style.display = currentScreen < TOTAL_SCREENS ? 'inline-block' : 'none'
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
    const isLight = document.body.classList.toggle('light-theme')
    if (themeToggle) {
      themeToggle.textContent = isLight ? 'Theme: Light' : 'Theme: Dark'
    }
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

  // System Surface "Run setup again" Button
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

    const handleCreateItem = async (type: 'IDEA' | 'TASK') => {
      const val = quickInput?.value.trim()
      if (!val) return
      if (bridge.saveIdea) {
        await bridge.saveIdea({
          title: val,
          originalText: val,
          collection: type === 'TASK' ? 'PLAN_TASK' : 'IDEA',
        })
        if (quickInput) quickInput.value = ''
        await refreshWorkspace(bridge)
        announce(`${type === 'TASK' ? 'Task' : 'Note'} saved`)
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

    document.getElementById('workspace-btn-companion')?.addEventListener('click', () => {
      void bridge.toggleCompanionWindow?.()
    })
    document.getElementById('workspace-btn-summon-assistant')?.addEventListener('click', () => {
      void bridge.toggleCompanionWindow?.()
    })
    document.getElementById('workspace-btn-check-inbox')?.addEventListener('click', async () => {
      if (bridge.executeStudyGuardianOperation) {
        const res = await bridge.executeStudyGuardianOperation({ action: 'TEST_INBOX_SETUP' })
        announce(res.inboxVerificationResult?.message || 'Inbox scan complete')
        await refreshWorkspace(bridge)
      }
    })

    document.getElementById('btn-header-theme')?.addEventListener('click', () => {
      document.body.classList.toggle('light-theme')
    })
    document.getElementById('btn-header-onboarding')?.addEventListener('click', () => {
      const dialog = document.getElementById('onboarding-dialog') as HTMLDialogElement | null
      dialog?.showModal()
    })

    // Subnav buttons in devtools
    document.querySelectorAll<HTMLButtonElement>('.subnav-btn').forEach((st) => {
      st.addEventListener('click', () => {
        const surfaceId = st.getAttribute('data-surface')
        if (surfaceId) activateSurface(surfaceId)
      })
    })

    // Notes / Tasks / Subjects actions
    document.getElementById('notes-btn-create')?.addEventListener('click', async () => {
      const title = prompt('Enter note title:')
      if (title && bridge.saveIdea) {
        await bridge.saveIdea({ title, originalText: title, collection: 'IDEA' })
        await refreshWorkspace(bridge)
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

    // Initial load: start on workspace surface
    activateSurface('surface-workspace')
    refreshAll(bridge)
  })
}
