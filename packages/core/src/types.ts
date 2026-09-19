/**
 * Domain types and contracts for @gravitas/core.
 * Plain immutable data definitions — no hidden classes or runtime prototypes.
 */

/**
 * Task states in Gravitas.
 *
 * PLANNED          - Task declared in DAG; dependencies not yet evaluated.
 * BLOCKED          - Dependencies are not yet satisfied.
 * READY            - All dependencies are satisfied; task is eligible for dispatch.
 * RUNNING          - Agent harness is actively executing.
 * VERIFYING        - Agent execution finished; independent verifier is inspecting evidence.
 * WAITING_APPROVAL - Independent verification succeeded, but explicit human approval is required.
 * APPROVED         - Human has explicitly reviewed and accepted the task. (Terminal)
 * SUCCEEDED        - Task completed and independently verified without requiring human approval. (Terminal)
 * FAILED           - Unrecoverable error in execution, verification rejection, or human rejection. (Terminal)
 * CANCELLED        - Task was aborted by user or cancelled due to upstream dependency failure. (Terminal)
 */
export type TaskState =
  | 'PLANNED'
  | 'BLOCKED'
  | 'READY'
  | 'RUNNING'
  | 'VERIFYING'
  | 'WAITING_APPROVAL'
  | 'APPROVED'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED'

/**
 * Standard agent roles.
 * Canonical roles support type safety with an open string escape hatch.
 */
export type AgentRole =
  | 'RESEARCHER'
  | 'PLANNER'
  | 'IMPLEMENTER'
  | 'VERIFIER'
  | 'TESTER'
  | 'CRITIC'
  | (string & {})

/**
 * Acceptance criterion specifying a testable standard for a task or contract.
 */
export interface AcceptanceCriterion {
  readonly id: string
  readonly description: string
  readonly verificationMethod?:
    | 'AUTOMATED_TEST'
    | 'INSPECTION'
    | 'GIT_DIFF'
    | 'HUMAN_REVIEW'
    | (string & {})
    | undefined
}

/**
 * Evidence required before a task or contract can be verified.
 */
export interface EvidenceRequirement {
  readonly id: string
  readonly type:
    | 'GIT_DIFF'
    | 'TEST_REPORT'
    | 'COMMAND_LOG'
    | 'SCREENSHOT'
    | 'BROWSER_TRACE'
    | (string & {})
  readonly description: string
  readonly mandatory: boolean
}

/**
 * Dependency declaration between tasks.
 */
export interface TaskDependency {
  readonly taskId: string
  /**
   * The upstream states that satisfy this dependency.
   * Defaults to ['SUCCEEDED', 'APPROVED'] if omitted or undefined.
   */
  readonly acceptableStates?: readonly TaskState[] | undefined
}

/**
 * Core Task domain model.
 */
export interface Task {
  readonly id: string
  readonly runId: string
  readonly title: string
  readonly objective: string
  readonly state: TaskState
  readonly dependencies: readonly TaskDependency[]
  readonly acceptanceCriteria: readonly AcceptanceCriterion[]
  readonly role?: AgentRole | undefined
  /**
   * If true, successful verification leads to WAITING_APPROVAL.
   * If false (default), successful verification leads directly to SUCCEEDED.
   */
  readonly requiresApproval?: boolean | undefined
  readonly createdAt: string
  readonly updatedAt: string
}

/**
 * Run status across the entire orchestrator session.
 */
export type RunStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'WAITING_APPROVAL'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'

/**
 * Run represents an entire goal execution lifecycle.
 */
export interface Run {
  readonly id: string
  readonly goal: string
  readonly status: RunStatus
  readonly contractId: string
  readonly taskIds: readonly string[]
  readonly createdAt: string
  readonly updatedAt: string
}

/**
 * Execution Contract — the verified specification compiled from a goal.
 */
export interface ExecutionContract {
  readonly version: string
  readonly goal: string
  readonly repository: string
  readonly baseBranch: string
  readonly constraints: readonly string[]
  readonly acceptanceCriteria: readonly AcceptanceCriterion[]
  readonly requiredEvidence: readonly EvidenceRequirement[]
}

/**
 * Event types genuinely emitted by the domain core.
 */
export type GravitasEventType =
  | 'RUN_CREATED'
  | 'TASK_CREATED'
  | 'TASK_STATE_CHANGED'
  | 'EXECUTION_CONTRACT_CREATED'
  | 'RUN_STATE_CHANGED'
  | 'WORKER_STARTED'
  | 'WORKER_FINISHED'
  | 'VERIFICATION_STARTED'
  | 'VERIFICATION_FINISHED'
  | 'EVIDENCE_CREATED'
  | 'APPROVAL_REQUIRED'
  | 'TASK_APPROVED'
  | 'TASK_REJECTED'
  | 'RUN_COMPLETED'
  | 'RUN_FAILED'

/**
 * Standard Gravitas Event envelope.
 */
export interface GravitasEvent {
  readonly eventId: string
  readonly runId: string
  readonly taskId?: string | undefined
  readonly type: GravitasEventType
  readonly timestamp: string
  readonly payload: Readonly<Record<string, unknown>>
}
