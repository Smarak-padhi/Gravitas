/**
 * Deterministic Office State Derivation
 * Maps authoritative Gravitas engine state to Living Office worker presentations.
 * Strictly pure; zero side-effects; 100% deterministic.
 */

import type { Run, Task, TaskState } from '../../api/types.js'

export type WorkerVisualState =
  | 'IDLE'
  | 'ASSIGNED'
  | 'READING'
  | 'THINKING'
  | 'WORKING'
  | 'VERIFYING'
  | 'BLOCKED'
  | 'WAITING_FOR_DEPENDENCY'
  | 'NEEDS_YOU'
  | 'DONE'
  | 'FAILED'

export type AttentionLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface WorkerPresentation {
  readonly id: string
  readonly displayName: string
  readonly role: string
  readonly capabilities: readonly string[]
  readonly state: WorkerVisualState
  readonly currentTaskId?: string | undefined
  readonly currentTaskTitle?: string | undefined
  readonly currentTaskObjective?: string | undefined
  readonly attentionLevel: AttentionLevel
  readonly accentColor: string
  readonly failureReason?: string | undefined
}

export interface DeriveOfficeStateInput {
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
 * Maps task state to worker visual state for the primary execution worker.
 */
export function mapTaskStateToWorkerState(state: TaskState): WorkerVisualState {
  switch (state) {
    case 'READY':
      return 'ASSIGNED'
    case 'RUNNING':
      return 'WORKING'
    case 'VERIFYING':
      return 'WORKING' // Verifier is actively verifying; primary worker standby
    case 'WAITING_APPROVAL':
      return 'NEEDS_YOU'
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
 * Maps task state to attention level.
 */
export function mapTaskStateToAttentionLevel(state: TaskState): AttentionLevel {
  switch (state) {
    case 'WAITING_APPROVAL':
      return 'HIGH'
    case 'FAILED':
      return 'CRITICAL'
    case 'BLOCKED':
      return 'MEDIUM'
    case 'RUNNING':
    case 'VERIFYING':
      return 'LOW'
    default:
      return 'NONE'
  }
}

/**
 * Derives the complete office station roster deterministically from engine state.
 */
export function deriveOfficeState(input: DeriveOfficeStateInput): readonly WorkerPresentation[] {
  const { run: _run, activeTask, harness } = input

  // 1. Primary AI Worker (e.g. Free Claude Code / Codex / Configured Harness)
  const isHarnessAvailable = harness.status === 'AVAILABLE'
  const primaryWorkerState: WorkerVisualState = activeTask
    ? mapTaskStateToWorkerState(activeTask.state)
    : 'IDLE'

  const primaryAttention: AttentionLevel = activeTask
    ? mapTaskStateToAttentionLevel(activeTask.state)
    : !isHarnessAvailable
      ? 'MEDIUM'
      : 'NONE'

  const primaryWorker: WorkerPresentation = {
    id: harness.id || 'free-claude-code',
    displayName: harness.id === 'fake-deterministic-worker' ? 'Deterministic Worker' : 'Claude Code (FCC)',
    role: 'Primary Autonomous Worker',
    capabilities: ['Full-stack Implementation', 'File Editing', 'Shell Verification', 'Git Commits'],
    state: primaryWorkerState,
    currentTaskId: activeTask?.id,
    currentTaskTitle: activeTask?.title,
    currentTaskObjective: activeTask?.objective,
    attentionLevel: primaryAttention,
    accentColor: '#38bdf8',
    failureReason: activeTask?.failureReason ?? (activeTask?.state === 'FAILED' ? 'Execution or Verification failed' : undefined),
  }

  // Multi-Task Concurrent Orchestration Support:
  // If multiple tasks are actively executing (RUNNING, VERIFYING, or WAITING_APPROVAL),
  // derive dedicated concurrent worker stations for each active task slot.
  const executingTasks = input.tasks.filter(
    (t) => t.state === 'RUNNING' || t.state === 'VERIFYING' || t.state === 'WAITING_APPROVAL'
  )

  let workerStations: WorkerPresentation[] = [primaryWorker]

  if (executingTasks.length > 1) {
    const executingIds = new Set(executingTasks.map((t) => t.id))
    const standbyTasks = input.tasks.filter((t) => !executingIds.has(t.id))

    const activeSlots = executingTasks.map((task, idx) => {
      const slotNum = idx + 1
      const visualState = mapTaskStateToWorkerState(task.state)
      const attention = mapTaskStateToAttentionLevel(task.state)
      return {
        id: `worker-slot-${slotNum}`,
        displayName: `Worker ${slotNum} (${task.id})`,
        role: task.role ? `${task.role} (Slot ${slotNum})` : `Concurrent Worker (Slot ${slotNum})`,
        capabilities: ['Task Worktree Mutation', 'Deterministic Implementation', 'Evidence Generation'],
        state: visualState,
        currentTaskId: task.id,
        currentTaskTitle: task.title,
        currentTaskObjective: task.objective,
        attentionLevel: attention,
        accentColor: idx % 2 === 0 ? '#38bdf8' : '#60a5fa',
        failureReason: task.failureReason ?? (task.state === 'FAILED' ? 'Task execution failed' : undefined),
      }
    })

    const standbyStations = standbyTasks.map((task) => {
      const visualState = mapTaskStateToWorkerState(task.state)
      const attention = mapTaskStateToAttentionLevel(task.state)
      return {
        id: `worker-${task.id}`,
        displayName: `Worker (${task.id})`,
        role: task.role ?? 'Standby Worker',
        capabilities: ['Task Worktree Mutation', 'Deterministic Implementation', 'Evidence Generation'],
        state: visualState,
        currentTaskId: task.id,
        currentTaskTitle: task.title,
        currentTaskObjective: task.objective,
        attentionLevel: attention,
        accentColor: '#94a3b8',
        failureReason: task.failureReason ?? (task.state === 'FAILED' ? 'Task execution failed' : undefined),
      }
    })

    workerStations = [...activeSlots, ...standbyStations]
  } else if (input.tasks.length > 1) {
    const otherTasks = input.tasks.filter((t) => t.id !== activeTask?.id)
    const standbyStations = otherTasks.map((task) => {
      const visualState = mapTaskStateToWorkerState(task.state)
      const attention = mapTaskStateToAttentionLevel(task.state)
      return {
        id: `worker-${task.id}`,
        displayName: `Worker (${task.id})`,
        role: task.role ?? 'Standby Worker',
        capabilities: ['Task Worktree Mutation', 'Deterministic Implementation', 'Evidence Generation'],
        state: visualState,
        currentTaskId: task.id,
        currentTaskTitle: task.title,
        currentTaskObjective: task.objective,
        attentionLevel: attention,
        accentColor: '#94a3b8',
        failureReason: task.failureReason ?? (task.state === 'FAILED' ? 'Task execution failed' : undefined),
      }
    })
    workerStations = [primaryWorker, ...standbyStations]
  }

  // 2. Independent Verifier Station
  let verifierState: WorkerVisualState = 'IDLE'
  let verifierAttention: AttentionLevel = 'NONE'
  const verifyingTask = input.tasks.find((t) => t.state === 'VERIFYING') ?? activeTask

  if (verifyingTask) {
    if (verifyingTask.state === 'VERIFYING') {
      verifierState = 'VERIFYING'
      verifierAttention = 'LOW'
    } else if (
      verifyingTask.state === 'WAITING_APPROVAL' ||
      verifyingTask.state === 'APPROVED' ||
      verifyingTask.state === 'SUCCEEDED'
    ) {
      verifierState = 'DONE'
      verifierAttention = 'NONE'
    } else if (verifyingTask.state === 'FAILED') {
      verifierState = 'FAILED'
      verifierAttention = 'CRITICAL'
    }
  }

  const verifierStation: WorkerPresentation = {
    id: 'gate-verifier',
    displayName: 'Independent Verifier',
    role: 'Deterministic Verification & Evidence Gate',
    capabilities: ['Clean Worktree Inspection', 'Shell-Free Command Execution', 'Mutation Scope Enforcement', 'Diff Hashing'],
    state: verifierState,
    currentTaskId: verifyingTask?.id,
    currentTaskTitle: verifyingTask ? `Verifying: ${verifyingTask.title}` : undefined,
    attentionLevel: verifierAttention,
    accentColor: '#10b981',
  }

  // 3. Astra (Design & Experience Authority)
  const astraStation: WorkerPresentation = {
    id: 'worker-astra',
    displayName: 'Astra',
    role: 'Design System & Interaction Collaborator',
    capabilities: ['UX Architecture', 'Motion Design', 'Component Review', 'Design Contracts'],
    state: 'IDLE',
    attentionLevel: 'NONE',
    accentColor: '#a855f7',
  }

  return [...workerStations, verifierStation, astraStation]
}
