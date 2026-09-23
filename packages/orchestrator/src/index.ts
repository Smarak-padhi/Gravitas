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

// Personal OS Background Job & Notification Kernel (Wave 12I)
export {
  type JobStore,
  type JobFilter,
  type NotificationFilter,
  type ClaimOccurrenceParams,
  type ClaimOccurrenceResult,
} from './jobs/jobStore.js'

export {
  SqliteJobStore,
  CURRENT_SCHEMA_VERSION,
} from './jobs/sqliteJobStore.js'

export {
  calculateNextRunAt,
  validateTrigger,
  isValidTimezone,
  isValidCron,
  parseCronExpression,
  MIN_INTERVAL_SECONDS,
} from './jobs/scheduleCalculator.js'

export {
  ActionExecutor,
  type ActionExecutorOptions,
  type ActionResult,
} from './jobs/actionExecutor.js'

export {
  JobRunner,
  type JobRunnerOptions,
} from './jobs/jobRunner.js'

export {
  NotificationBus,
  type PublishNotificationParams,
  DEDUPE_WINDOW_MS,
} from './jobs/notificationBus.js'

export {
  JobScheduler,
  type JobSchedulerOptions,
} from './jobs/jobScheduler.js'
