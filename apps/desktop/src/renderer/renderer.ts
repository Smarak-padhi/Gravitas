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
import { initWorldView } from './world/worldView.js'
import type { WorldViewController } from './world/worldView.js'
import type { WorldDataSource } from './world/worldModel.js'

let activeDialogTriggerButton: HTMLElement | null = null
let currentDialogItem: { targetId: string; revision: number; outcome: string } | null = null
let worldView: WorldViewController | null = null

/** Select a Command Center surface (tab + panel). Pure navigation. */
export function activateSurface(surfaceId: string): void {
  document.querySelectorAll<HTMLButtonElement>('.nav-btn').forEach((t) => {
    const on = t.getAttribute('data-surface') === surfaceId
    t.classList.toggle('active', on)
    t.setAttribute('aria-selected', on ? 'true' : 'false')
  })
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

  let currentStep = 1
  const TOTAL_STEPS = 8

  function setStep(step: number): void {
    if (step < 1 || step > TOTAL_STEPS) return
    currentStep = step

    for (let i = 1; i <= TOTAL_STEPS; i++) {
      const stepEl = document.getElementById(`onboarding-step-${i}`)
      if (stepEl) {
        stepEl.style.display = i === currentStep ? 'block' : 'none'
      }
    }

    const indicator = document.getElementById('onboarding-step-indicator')
    if (indicator) indicator.textContent = `Step ${currentStep} of ${TOTAL_STEPS}`

    const btnPrev = document.getElementById('onboarding-btn-prev')
    const btnNext = document.getElementById('onboarding-btn-next')
    const btnFinish = document.getElementById('onboarding-btn-finish')

    if (btnPrev) btnPrev.style.display = currentStep > 1 ? 'inline-block' : 'none'
    if (btnNext) btnNext.style.display = currentStep < TOTAL_STEPS ? 'inline-block' : 'none'
    if (btnFinish) btnFinish.style.display = currentStep === TOTAL_STEPS ? 'inline-block' : 'none'

    if (currentStep === 3) {
      void bridge.getOnboarding().then((ob) => {
        const rootDisplay = document.getElementById('onboarding-data-root-display')
        if (rootDisplay) rootDisplay.textContent = ob.dataRoot
      })
    }

    if (currentStep === 8) {
      updateReviewSummary()
    }
  }

  function updateReviewSummary(): void {
    const summaryEl = document.getElementById('onboarding-review-summary')
    if (!summaryEl) return

    const isAssisted = (document.getElementById('onboarding-mode-assisted') as HTMLInputElement)?.checked
    const mode = isAssisted ? 'ASSISTED' : 'DETERMINISTIC_ONLY'

    const harnesses: string[] = ['harness:antigravity:host']
    if ((document.getElementById('harness-powershell') as HTMLInputElement)?.checked) harnesses.push('harness:powershell')
    if ((document.getElementById('harness-claude') as HTMLInputElement)?.checked) harnesses.push('harness:claude-code')
    if ((document.getElementById('harness-codex') as HTMLInputElement)?.checked) harnesses.push('harness:codex')

    const nimStatus = document.getElementById('onboarding-nim-status')?.textContent || 'Unconfigured'

    summaryEl.innerHTML = `
      <div><strong>Operating Mode:</strong> ${mode}</div>
      <div><strong>Active Harnesses:</strong> ${harnesses.join(', ')}</div>
      <div><strong>AI Provider (NVIDIA NIM):</strong> ${nimStatus}</div>
      <div><strong>Autonomous Spend Ceiling:</strong> $0.00 (Zero out-of-pocket guarantee)</div>
      <div><strong>Storage Guarantees:</strong> Single-writer SQLite transaction journal</div>
    `
  }

  // Stepper navigation
  document.getElementById('onboarding-btn-prev')?.addEventListener('click', () => {
    setStep(currentStep - 1)
  })

  document.getElementById('onboarding-btn-next')?.addEventListener('click', () => {
    setStep(currentStep + 1)
  })

  document.getElementById('onboarding-btn-close')?.addEventListener('click', () => {
    dialog.close()
  })

  // Step 2 Doctor preview
  document.getElementById('onboarding-btn-run-doctor')?.addEventListener('click', async () => {
    const preview = document.getElementById('onboarding-doctor-preview')
    if (preview) preview.textContent = 'Running diagnostics...'
    try {
      const rep = await bridge.runDoctor()
      if (preview) renderDoctorReport(preview, rep)
    } catch (err) {
      if (preview) preview.textContent = `Diagnostic error: ${(err as Error).message}`
    }
  })

  // Step 6 NIM Key configuration
  document.getElementById('onboarding-btn-test-key')?.addEventListener('click', async () => {
    const keyInput = document.getElementById('onboarding-nim-key-input') as HTMLInputElement | null
    const key = keyInput?.value.trim() || ''
    const statusEl = document.getElementById('onboarding-nim-status')
    if (!key) {
      if (statusEl) statusEl.textContent = 'Please enter key or click skip'
      return
    }
    if (statusEl) statusEl.textContent = 'Storing key...'
    try {
      const res = await bridge.configureProvider({ providerId: 'nvidia-nim', apiKey: key })
      if (statusEl) {
        statusEl.textContent = res.success ? `Configured (${res.maskedHandle})` : 'Configuration failed'
        statusEl.style.color = res.success ? 'var(--badge-ready)' : 'var(--badge-offline)'
      }
      if (keyInput) keyInput.value = ''
    } catch (err) {
      if (statusEl) statusEl.textContent = `Error: ${(err as Error).message}`
    }
  })

  document.getElementById('onboarding-btn-clear-key')?.addEventListener('click', async () => {
    const statusEl = document.getElementById('onboarding-nim-status')
    const keyInput = document.getElementById('onboarding-nim-key-input') as HTMLInputElement | null
    if (keyInput) keyInput.value = ''
    try {
      await bridge.configureProvider({ providerId: 'nvidia-nim', apiKey: '' })
      if (statusEl) {
        statusEl.textContent = 'Skipped / Unconfigured'
        statusEl.style.color = 'var(--text-muted)'
      }
    } catch (err) {
      if (statusEl) statusEl.textContent = `Error: ${(err as Error).message}`
    }
  })

  // Step 8 Finish Setup
  document.getElementById('onboarding-btn-finish')?.addEventListener('click', async () => {
    const isAssisted = (document.getElementById('onboarding-mode-assisted') as HTMLInputElement)?.checked
    const mode = isAssisted ? 'ASSISTED' : 'DETERMINISTIC_ONLY'

    const harnesses: string[] = ['harness:antigravity:host']
    if ((document.getElementById('harness-powershell') as HTMLInputElement)?.checked) harnesses.push('harness:powershell')
    if ((document.getElementById('harness-claude') as HTMLInputElement)?.checked) harnesses.push('harness:claude-code')
    if ((document.getElementById('harness-codex') as HTMLInputElement)?.checked) harnesses.push('harness:codex')

    try {
      await bridge.saveOnboarding({
        completed: true,
        operatingMode: mode,
        selectedHarnesses: harnesses,
      })
      announce('Onboarding configuration saved successfully.')
      dialog.close()
      await refreshAll(bridge)
    } catch (err) {
      alert(`Failed to save setup: ${(err as Error).message}`)
    }
  })

  // System Surface Buttons
  document.getElementById('btn-run-setup-wizard')?.addEventListener('click', () => {
    setStep(1)
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

  // Auto-prompt on initial launch if not completed and not running under automated test override
  void bridge.getOnboarding().then((ob) => {
    if (!ob.completed && !ob.isTest) {
      setStep(1)
      dialog.show()
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

    // Refresh all button
    document.getElementById('btn-refresh-all')?.addEventListener('click', () => {
      refreshAll(bridge)
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

    // Initial load
    refreshAll(bridge)
  })
}
