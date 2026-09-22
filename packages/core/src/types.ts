import type { RoleAssignment, TaskRoleRequirement } from './roles.js'
import type { TaskHandoff, TaskArtifactRef } from './handoff.js'

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
 * Domain of an agent capability.
 */
export type CapabilityDomain = 'filesystem' | 'git' | 'verifier' | 'browser' | (string & {})

/**
 * Declared capability of an agent or requirement of a task.
 */
export interface AgentCapability {
  readonly id: string
  readonly domain: CapabilityDomain
  readonly description: string
}

/**
 * Browser QA action types supported in deterministic browser verification.
 */
export type BrowserQaActionType =
  | 'navigate'
  | 'click'
  | 'fill'
  | 'assertVisible'
  | 'assertText'
  | 'screenshot'

export interface BrowserQaActionNavigate {
  readonly type: 'navigate'
  readonly url: string
}

export interface BrowserQaActionClick {
  readonly type: 'click'
  readonly selector: string
  readonly timeoutMs?: number | undefined
}

export interface BrowserQaActionFill {
  readonly type: 'fill'
  readonly selector: string
  readonly value: string
  readonly timeoutMs?: number | undefined
}

export interface BrowserQaActionAssertVisible {
  readonly type: 'assertVisible'
  readonly selector: string
  readonly timeoutMs?: number | undefined
}

export interface BrowserQaActionAssertText {
  readonly type: 'assertText'
  readonly selector: string
  readonly expected: string
  readonly exact?: boolean | undefined
  readonly timeoutMs?: number | undefined
}

export interface BrowserQaActionScreenshot {
  readonly type: 'screenshot'
  readonly name: string
}

export type BrowserQaAction =
  | BrowserQaActionNavigate
  | BrowserQaActionClick
  | BrowserQaActionFill
  | BrowserQaActionAssertVisible
  | BrowserQaActionAssertText
  | BrowserQaActionScreenshot

export interface BrowserQaContract {
  readonly id: string
  readonly description?: string | undefined
  readonly baseUrl?: string | undefined
  readonly actions: readonly BrowserQaAction[]
  readonly allowedOrigins?: readonly string[] | undefined
  readonly maxDurationMs?: number | undefined
}

export interface BrowserQaObservation {
  readonly consoleErrors: readonly string[]
  readonly pageErrors: readonly string[]
  readonly failedRequests: readonly {
    readonly url: string
    readonly status: number
    readonly statusText: string
  }[]
}

export interface BrowserQaStepResult {
  readonly stepIndex: number
  readonly action: BrowserQaAction
  readonly status: 'PASSED' | 'FAILED'
  readonly durationMs: number
  readonly error?: string | undefined
}

export interface BrowserQaResult {
  readonly taskId: string
  readonly contractId: string
  readonly status: 'PASSED' | 'FAILED'
  readonly durationMs: number
  readonly steps: readonly BrowserQaStepResult[]
  readonly observations: BrowserQaObservation
  readonly screenshots: readonly {
    readonly name: string
    readonly path: string
    readonly base64?: string | undefined
  }[]
  readonly error?: string | undefined
  readonly timestamp: string
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
  readonly roleRequirement?: TaskRoleRequirement | undefined
  readonly roleAssignment?: RoleAssignment | undefined
  readonly handoffs?: readonly TaskHandoff[] | undefined
  readonly artifacts?: readonly TaskArtifactRef[] | undefined
  /**
   * If true, successful verification leads to WAITING_APPROVAL.
   * If false (default), successful verification leads directly to SUCCEEDED.
   */
  readonly requiresApproval?: boolean | undefined
  readonly requiredCapabilities?: readonly string[] | undefined
  readonly browserQa?: BrowserQaContract | undefined
  readonly createdAt: string
  readonly updatedAt: string
  readonly failureReason?: string | undefined
  readonly statusMessage?: string | undefined
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
  | 'RUN_PLAN_CREATED'
  | 'TASK_READY'
  | 'TASK_SCHEDULED'
  | 'TASK_RESULT_MATERIALIZED'
  | 'TASK_COMPOSITION_CONFLICT'
  | 'BROWSER_QA_STARTED'
  | 'BROWSER_QA_COMPLETED'
  | 'BROWSER_QA_FAILED'
  | 'ROUTE_SELECTED'
  | 'GATEWAY_ROUTE_STARTED'
  | 'GATEWAY_ROUTE_COMPLETED'
  | 'GATEWAY_ROUTE_FAILED'
  | 'PROVIDER_FALLBACK_OCCURRED'
  | 'TRANSPORT_FALLBACK_OCCURRED'

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
