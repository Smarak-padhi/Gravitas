/**
 * Gravitas WorkSession Kernel — Structured Error Model
 *
 * Implements typed domain errors without leaking raw SQLite internals.
 */

export class KernelError extends Error {
  public readonly code: string
  public readonly details?: unknown

  public constructor(code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'KernelError'
    this.code = code
    this.details = details
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class WorkSessionNotFoundError extends KernelError {
  public constructor(workSessionId: string) {
    super('WORKSESSION_NOT_FOUND', `WorkSession '${workSessionId}' not found.`, { workSessionId })
    this.name = 'WorkSessionNotFoundError'
  }
}

export class InvalidWorkSessionTransitionError extends KernelError {
  public constructor(workSessionId: string, fromState: string, toState: string, reason?: string) {
    super(
      'INVALID_WORKSESSION_TRANSITION',
      `Illegal transition for WorkSession '${workSessionId}': cannot move from '${fromState}' to '${toState}'.${reason ? ` Reason: ${reason}` : ''}`,
      { workSessionId, fromState, toState, reason }
    )
    this.name = 'InvalidWorkSessionTransitionError'
  }
}

export class RevisionConflictError extends KernelError {
  public constructor(workSessionId: string, expectedRevision: number, actualRevision: number) {
    super(
      'REVISION_CONFLICT',
      `Optimistic concurrency violation on WorkSession '${workSessionId}': expected revision ${expectedRevision}, but current revision is ${actualRevision}.`,
      { workSessionId, expectedRevision, actualRevision }
    )
    this.name = 'RevisionConflictError'
  }
}

export class CommandConflictError extends KernelError {
  public constructor(commandId: string, reason: string) {
    super(
      'COMMAND_CONFLICT',
      `Command conflict on commandId '${commandId}': ${reason}`,
      { commandId, reason }
    )
    this.name = 'CommandConflictError'
  }
}

export class DataRootLockedError extends KernelError {
  public constructor(dataRoot: string, ownerPid?: number, ownerKernelId?: string, customMessage?: string) {
    super(
      'DATA_ROOT_LOCKED',
      customMessage ??
        `Data root '${dataRoot}' is already locked by another Kernel instance (PID: ${ownerPid ?? 'unknown'}, KernelId: ${ownerKernelId ?? 'unknown'}). Single canonical writer invariant enforced.`,
      { dataRoot, ownerPid, ownerKernelId, customMessage }
    )
    this.name = 'DataRootLockedError'
  }
}

export class SchemaVersionUnsupportedError extends KernelError {
  public constructor(databasePath: string, foundVersion: number, supportedVersion: number) {
    super(
      'SCHEMA_VERSION_UNSUPPORTED',
      `Database at '${databasePath}' has schema version ${foundVersion}, but this Kernel only supports up to version ${supportedVersion}. Newer schema cannot be safely operated.`,
      { databasePath, foundVersion, supportedVersion }
    )
    this.name = 'SchemaVersionUnsupportedError'
  }
}

export class DatabaseCorruptionError extends KernelError {
  public constructor(databasePath: string, integrityError: string) {
    super(
      'DATABASE_CORRUPTION',
      `Database at '${databasePath}' failed integrity check: ${integrityError}. Refusing to proceed with corrupted state.`,
      { databasePath, integrityError }
    )
    this.name = 'DatabaseCorruptionError'
  }
}

export class KernelNotReadyError extends KernelError {
  public constructor(currentState: string) {
    super(
      'KERNEL_NOT_READY',
      `Kernel is not in READY state (current state: '${currentState}'). Cannot accept commands.`,
      { currentState }
    )
    this.name = 'KernelNotReadyError'
  }
}

export class KernelShuttingDownError extends KernelError {
  public constructor() {
    super('KERNEL_SHUTTING_DOWN', 'Kernel is currently shutting down. Rejecting new mutation commands.')
    this.name = 'KernelShuttingDownError'
  }
}

export class ValidationFailedError extends KernelError {
  public constructor(field: string, reason: string) {
    super('VALIDATION_FAILED', `Validation failed for '${field}': ${reason}`, { field, reason })
    this.name = 'ValidationFailedError'
  }
}
