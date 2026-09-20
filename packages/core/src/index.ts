/**
 * @gravitas/core — Public Export Boundary
 *
 * Domain contracts, FSM, dependency evaluation, execution contracts,
 * prompt composition boundary, and event models.
 */

// Package version
export const GRAVITAS_VERSION = '0.0.1' as const

// Domain errors
export {
  InvalidStateTransitionError,
  ContractValidationError,
  DependencyEvaluationError,
} from './errors.js'

// Domain types
export type {
  TaskState,
  AgentRole,
  AcceptanceCriterion,
  EvidenceRequirement,
  TaskDependency,
  Task,
  RunStatus,
  Run,
  ExecutionContract,
  GravitasEventType,
  GravitasEvent,
} from './types.js'

// Task FSM
export {
  TERMINAL_STATES,
  SUCCESSFUL_TERMINAL_STATES,
  FAILED_TERMINAL_STATES,
  ALLOWED_TRANSITIONS,
  canTransition,
  isTerminalState,
  isSuccessfulState,
  isFailedState,
  transitionTask,
  type TransitionOptions,
  type TransitionTaskOptions,
  type TaskTransitionResult,
} from './fsm.js'

// Dependency evaluation
export {
  DEFAULT_SATISFYING_STATES,
  isDependencySatisfied,
  isDependencyBroken,
  evaluateTaskReadiness,
  resolveInitialTaskState,
  computeTopologicalRanks,
  type TaskWithDependencies,
  type TaskReadinessStatus,
  type TaskReadinessEvaluation,
} from './dependencies.js'

// Execution Contract
export {
  createExecutionContract,
  validateExecutionContract,
  type ExecutionContractInput,
  type ContractValidationResult,
} from './contract.js'

// Prompt composition
export {
  CANONICAL_PROMPT_LAYER_ORDER,
  composePrompt,
  type PromptLayerName,
  type PromptLayersInput,
  type CompiledPrompt,
} from './prompt.js'

// Event model
export {
  generateEventId,
  createGravitasEvent,
  createRunCreatedEvent,
  createTaskCreatedEvent,
  createTaskStateChangedEvent,
  createExecutionContractCreatedEvent,
  createRunStateChangedEvent,
  createWorkerStartedEvent,
  createWorkerFinishedEvent,
  createVerificationStartedEvent,
  createVerificationFinishedEvent,
  createEvidenceCreatedEvent,
  createApprovalRequiredEvent,
  createTaskApprovedEvent,
  createTaskRejectedEvent,
  createRunCompletedEvent,
  createRunFailedEvent,
  createRunPlanCreatedEvent,
  createTaskReadyEvent,
  createTaskScheduledEvent,
  createTaskResultMaterializedEvent,
  createTaskCompositionConflictEvent,
  InMemoryEventCollector,
} from './events.js'

// Notification boundary
export {
  deriveNotificationFromEvent,
  type NotificationSeverity,
  type GravitasNotification,
  type NotificationAdapter,
} from './notifications.js'
