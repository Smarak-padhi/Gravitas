/**
 * Authoritative Living HQ State Derivation
 * Maps Gravitas engine state (Run, Tasks, Harness, Verifier, Operator)
 * deterministically to spatial HQ floors, coworker poses, and work packet custody.
 * Strictly pure; zero synthetic timers; 100% deterministic.
 */

import type { Run, Task, TaskState } from '../../api/types.js'
import {
  COWORKER_IDENTITIES,
  resolveCoworkerIdentity,
  type CoworkerIdentity,
} from './characters/coworkerIdentities.js'
import type { CanonicalPose } from './characters/CoworkerAvatar.js'
import type { WorkPacketData } from './artifacts/WorkPacket.js'

export interface CoworkerStationState {
  readonly identity: CoworkerIdentity
  readonly pose: CanonicalPose
  readonly activeTaskId?: string | undefined
  readonly activeTaskTitle?: string | undefined
  readonly activeTaskObjective?: string | undefined
  readonly failureReason?: string | undefined
  readonly isWorking: boolean
  readonly isNeedsOperator: boolean
}

export interface LivingHqState {
  readonly activeFloor: 1 | 2 | 3 | 4
  readonly transitStatusText: string
  readonly primaryCoworker: CoworkerStationState
  readonly concurrentCoworkers: readonly CoworkerStationState[]
  readonly astraCoworker: CoworkerStationState
  readonly verifierCoworker: CoworkerStationState
  readonly browserQaCoworker: CoworkerStationState
  readonly activeWorkPacket: WorkPacketData | null
  readonly standbyTasks: readonly Task[]
  readonly waitingApprovalTask: Task | null
  readonly failedTask: Task | null
  readonly isScaleMode: boolean
  readonly densityLevel: 'SINGLE' | 'EXPANDED' | 'HIGH' | 'MASSIVE'
}

export interface DeriveLivingHqInput {
  readonly run: Run | null
  readonly tasks: readonly Task[]
  readonly activeTask: Task | null
  readonly harness: {
    readonly id: string
    readonly status: string
    readonly message?: string | undefined
  }
}

/**
 * Maps TaskState to canonical Coworker Avatar Pose.
 */
export function mapTaskStateToAvatarPose(state: TaskState): CanonicalPose {
  switch (state) {
    case 'READY':
      return 'READING'
    case 'RUNNING':
      return 'WORKING'
    case 'VERIFYING':
      return 'WORKING'
    case 'WAITING_APPROVAL':
      return 'NEEDS_OPERATOR'
    case 'APPROVED':
    case 'SUCCEEDED':
      return 'DONE'
    case 'FAILED':
      return 'FAILED'
    case 'BLOCKED':
      return 'BLOCKED'
    case 'PLANNED':
    default:
      return 'IDLE'
  }
}

/**
 * Derives the complete Living HQ state deterministically from engine data.
 */
export function deriveLivingHqState(input: DeriveLivingHqInput): LivingHqState {
  const { run: _run, tasks, activeTask, harness } = input

  // Determine active task or fallback to first relevant task
  const waitingApprovalTask = tasks.find((t) => t.state === 'WAITING_APPROVAL') ?? null
  const verifyingTask = tasks.find((t) => t.state === 'VERIFYING') ?? null
  const runningTask = tasks.find((t) => t.state === 'RUNNING') ?? null
  const failedTask = tasks.find((t) => t.state === 'FAILED') ?? null

  const validActiveTask = activeTask && tasks.some((t) => t.id === activeTask.id)
    ? (tasks.find((t) => t.id === activeTask.id) ?? activeTask)
    : null

  const focalTask =
    waitingApprovalTask ??
    verifyingTask ??
    runningTask ??
    failedTask ??
    validActiveTask ??
    tasks[0] ??
    null

  // Density assessment
  const totalTasks = tasks.length
  let densityLevel: 'SINGLE' | 'EXPANDED' | 'HIGH' | 'MASSIVE' = 'SINGLE'
  if (totalTasks >= 25) {
    densityLevel = 'MASSIVE'
  } else if (totalTasks >= 12) {
    densityLevel = 'HIGH'
  } else if (totalTasks >= 4) {
    densityLevel = 'EXPANDED'
  }

  const isScaleMode = totalTasks > 6

  // Determine Active Floor according to authoritative engine state:
  // - WAITING_APPROVAL -> Mezzanine (4)
  // - VERIFYING -> Floor 3 (Lab)
  // - RUNNING / READY -> Floor 1 (Engineering Core)
  // - Default -> Floor 1
  let activeFloor: 1 | 2 | 3 | 4 = 1
  let transitStatusText = 'Elevator at Floor 1 · Engineering Standby'

  if (waitingApprovalTask) {
    activeFloor = 4
    transitStatusText = `Packet [${waitingApprovalTask.id}] at Mezzanine · Operator Seal Required`
  } else if (verifyingTask) {
    activeFloor = 3
    transitStatusText = `Packet [${verifyingTask.id}] at Floor 3 · Verification Cleanroom`
  } else if (focalTask?.state === 'FAILED') {
    activeFloor = 3
    transitStatusText = `Packet [${focalTask.id}] at Floor 3 · Rejection Inspected`
  } else if (focalTask?.state === 'RUNNING') {
    activeFloor = 1
    transitStatusText = `Packet [${focalTask.id}] at Floor 1 · Implementation in Progress`
  } else if (focalTask?.state === 'SUCCEEDED' || focalTask?.state === 'APPROVED') {
    activeFloor = 3
    transitStatusText = `Packet [${focalTask.id}] Archived in Floor 3 Evidence Vault`
  }

  // 1. Primary Worker (Codex / Claude / FCC / Harness)
  const primaryIdentity = resolveCoworkerIdentity(harness.id, 'Primary Autonomous Worker')
  const primaryTask = runningTask ?? verifyingTask ?? waitingApprovalTask ?? activeTask
  const primaryPose: CanonicalPose = primaryTask
    ? mapTaskStateToAvatarPose(primaryTask.state)
    : harness.status !== 'AVAILABLE'
      ? 'BLOCKED'
      : 'IDLE'

  const primaryCoworker: CoworkerStationState = {
    identity: primaryIdentity,
    pose: primaryPose,
    activeTaskId: primaryTask?.id,
    activeTaskTitle: primaryTask?.title,
    activeTaskObjective: primaryTask?.objective,
    failureReason: primaryTask?.failureReason,
    isWorking: primaryPose === 'WORKING',
    isNeedsOperator: primaryPose === 'NEEDS_OPERATOR',
  }

  // 2. Concurrent Worker Stations (if multiple tasks exist)
  const executingTasks = tasks.filter(
    (t) => t.state === 'RUNNING' || t.state === 'VERIFYING' || t.state === 'WAITING_APPROVAL'
  )

  let concurrentCoworkers: CoworkerStationState[] = []
  if (executingTasks.length > 1) {
    concurrentCoworkers = executingTasks.slice(1).map((task, idx) => {
      const slotNum = idx + 2
      const slotId = `worker-slot-${slotNum}`
      const identity = resolveCoworkerIdentity(slotId, `Concurrent Worker (Slot ${slotNum})`)
      const pose = mapTaskStateToAvatarPose(task.state)
      return {
        identity,
        pose,
        activeTaskId: task.id,
        activeTaskTitle: task.title,
        activeTaskObjective: task.objective,
        failureReason: task.failureReason,
        isWorking: pose === 'WORKING',
        isNeedsOperator: pose === 'NEEDS_OPERATOR',
      }
    })
  }

  // 3. Astra (Design Authority on Floor 2)
  const astraCoworker: CoworkerStationState = {
    identity: COWORKER_IDENTITIES['astra']!,
    pose: 'IDLE',
    isWorking: false,
    isNeedsOperator: false,
  }

  // 4. Verifier (Floor 3 Verification Lab)
  let verifierPose: CanonicalPose = 'IDLE'
  if (verifyingTask) {
    verifierPose = 'WORKING'
  } else if (waitingApprovalTask || focalTask?.state === 'APPROVED' || focalTask?.state === 'SUCCEEDED') {
    verifierPose = 'DONE'
  } else if (focalTask?.state === 'FAILED') {
    verifierPose = 'FAILED'
  }

  const verifierCoworker: CoworkerStationState = {
    identity: COWORKER_IDENTITIES['verifier']!,
    pose: verifierPose,
    activeTaskId: verifyingTask?.id ?? waitingApprovalTask?.id ?? focalTask?.id,
    activeTaskTitle: verifyingTask?.title ?? waitingApprovalTask?.title ?? focalTask?.title,
    isWorking: verifierPose === 'WORKING',
    isNeedsOperator: false,
  }

  // 5. Browser QA (Floor 3)
  let browserQaPose: CanonicalPose = 'IDLE'
  let browserQaFailureReason: string | undefined = undefined

  const browserFailedTask = tasks.find(
    (t) =>
      t.state === 'FAILED' &&
      (Boolean(t.browserQa) ||
        t.failureReason?.toLowerCase().includes('browser') ||
        t.failureReason?.toLowerCase().includes('qa') ||
        t.failureReason?.toLowerCase().includes('assertion') ||
        t.failureReason?.toLowerCase().includes('selector'))
  )

  if (verifyingTask && Boolean(verifyingTask.browserQa)) {
    browserQaPose = 'WORKING'
  } else if (browserFailedTask) {
    browserQaPose = 'FAILED'
    browserQaFailureReason = browserFailedTask.failureReason
  } else if (waitingApprovalTask || focalTask?.state === 'APPROVED' || focalTask?.state === 'SUCCEEDED') {
    browserQaPose = 'DONE'
  } else if (verifyingTask) {
    browserQaPose = 'WORKING'
  } else if (focalTask?.state === 'FAILED') {
    const isBrowserFailure = Boolean(
      focalTask.failureReason?.toLowerCase().includes('browser') ||
      focalTask.failureReason?.toLowerCase().includes('qa') ||
      focalTask.failureReason?.toLowerCase().includes('assertion') ||
      focalTask.failureReason?.toLowerCase().includes('selector')
    )
    if (isBrowserFailure) {
      browserQaPose = 'FAILED'
      browserQaFailureReason = focalTask.failureReason
    } else {
      browserQaPose = 'IDLE'
    }
  }

  const browserQaCoworker: CoworkerStationState = {
    identity: COWORKER_IDENTITIES['browser-qa']!,
    pose: browserQaPose,
    activeTaskId: verifyingTask?.id ?? waitingApprovalTask?.id ?? focalTask?.id,
    activeTaskTitle: verifyingTask?.title ?? waitingApprovalTask?.title ?? focalTask?.title,
    failureReason: browserQaFailureReason,
    isWorking: browserQaPose === 'WORKING',
    isNeedsOperator: false,
  }

  // Standby Tasks (tasks not currently executing)
  const activeIds = new Set([
    primaryCoworker.activeTaskId,
    ...concurrentCoworkers.map((c) => c.activeTaskId),
  ].filter(Boolean) as string[])

  const standbyTasks = tasks.filter((t) => !activeIds.has(t.id))

  // Work Packet Construction
  let activeWorkPacket: WorkPacketData | null = null
  if (focalTask) {
    const isWaiting = focalTask.state === 'WAITING_APPROVAL'
    const isSucc = focalTask.state === 'SUCCEEDED' || focalTask.state === 'APPROVED'
    const isFail = focalTask.state === 'FAILED'
    const isVerif = focalTask.state === 'VERIFYING'

    activeWorkPacket = {
      taskId: focalTask.id,
      taskTitle: focalTask.title,
      workerId: harness.id || 'claude-code',
      workerName: primaryIdentity.name,
      branchName: `task/${focalTask.id}`,
      promptHash: (focalTask as unknown as { promptHash?: string }).promptHash,
      verificationPassed: isWaiting || isSucc,
      scopeCompliant: !isFail,
      diffBytes: isWaiting || isSucc ? 48 : undefined,
      operatorApproved: isSucc,
      operatorReviewer: isSucc ? 'System Operator' : undefined,
      stage: isSucc
        ? 'SEALED'
        : isWaiting
          ? 'WAITING_APPROVAL'
          : isFail
            ? 'FAILED'
            : isVerif
              ? 'VERIFYING'
              : 'CLAIM',
      failureReason: focalTask.failureReason,
    }
  }

  return {
    activeFloor,
    transitStatusText,
    primaryCoworker,
    concurrentCoworkers,
    astraCoworker,
    verifierCoworker,
    browserQaCoworker,
    activeWorkPacket,
    standbyTasks,
    waitingApprovalTask,
    failedTask,
    isScaleMode,
    densityLevel,
  }
}
