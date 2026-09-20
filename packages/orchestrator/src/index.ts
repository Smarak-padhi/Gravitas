/**
 * @gravitas/orchestrator — Public Export Boundary
 *
 * Bounded concurrency DAG orchestrator, worktree composition, and result materialization.
 */

// Types
export type {
  TaskPlanDefinition,
  RunPlan,
  OrchestratorResult,
  SchedulerTelemetry,
} from './types.js'

// Errors
export {
  PlanValidationError,
  CompositionConflictError,
  OrchestratorExecutionError,
} from './errors.js'

// Plan and DAG validation
export {
  validateRunPlan,
  extractDependencyIds,
} from './validator.js'

// Worktree composition and commit materialization
export {
  materializeVerifiedResult,
  composeTaskWorktree,
  type MaterializeResultOptions,
  type ComposeTaskWorktreeOptions,
} from './composition.js'

// Bounded Concurrency Scheduler
export {
  BoundedScheduler,
  type BoundedSchedulerOptions,
} from './scheduler.js'
