/**
 * Gravitas WorkSession Kernel
 *
 * The canonical local-first control plane for WorkSessions, Runs, Tasks,
 * durable jobs, and ordered audit events.
 *
 * Invariants enforced:
 * - ROLE != EXECUTOR != HARNESS != MODEL != PROVIDER != GATEWAY != PROCESS
 * - WORKSESSION IDENTITY != PROCESS IDENTITY
 * - WORKSESSION STATE != UI STATE
 * - DURABLE EVENT != LOG MESSAGE
 * - COMMAND ACCEPTED != COMMAND COMPLETED
 * - COMMAND RETRY != DUPLICATE MUTATION
 * - PROCESS RESTART != WORKSESSION RESET
 * - CRASH RECOVERY != SUCCESS
 * - STATE TRANSITION != ARBITRARY FIELD UPDATE
 * - ONE CANONICAL OWNER PER MUTABLE DOMAIN
 * - ONE CANONICAL KERNEL PER DATA ROOT
 * - SQLITE TRANSACTION != CROSS_RESOURCE TRANSACTION
 * - IDEMPOTENCY KEY != AUTHORIZATION
 * - TIMESTAMP != EVENT ORDER
 */

import * as crypto from 'node:crypto'
import * as path from 'node:path'
import {
  CommandConflictError,
  KernelNotReadyError,
  KernelShuttingDownError,
  RevisionConflictError,
  ValidationFailedError,
  WorkSessionNotFoundError,
} from './domain/errors.js'
import type {
  WorkSession,
  WorkSessionRun,
  WorkSessionState,
  WorkSessionTask,
} from './domain/worksession.js'
import { assertValidWorkSessionTransition } from './domain/fsm.js'
import type { DurableEvent } from './domain/events.js'
import type {
  ClaimJobLeasePayload,
  CommandReceipt,
  CommandResult,
  CreateDurableJobPayload,
  CreateRunPayload,
  CreateTaskPayload,
  CreateWorkSessionPayload,
  KernelCommand,
  TransitionTaskPayload,
  TransitionWorkSessionPayload,
} from './domain/commands.js'
import type { DurableJob } from './domain/jobs.js'
import { DataRootLock } from './persistence/dataRootLock.js'
import {
  SqliteWriter,
  type SQLiteContentionPolicy,
  type SQLiteDurabilityPolicy,
  type DurableModelObservationStore,
} from './persistence/sqliteWriter.js'
import { StartupReconciler, type ReconciliationReport } from './reconciliation/startupReconciler.js'

export type KernelLifecycleState = 'STOPPED' | 'STARTING' | 'READY' | 'SHUTTING_DOWN'

export interface KernelOptions {
  readonly dataRoot: string
  readonly databaseName?: string | undefined
  readonly kernelId?: string | undefined
  readonly instanceId?: string | undefined
  readonly contentionPolicy?: SQLiteContentionPolicy | undefined
  readonly durabilityPolicy?: SQLiteDurabilityPolicy | undefined
  readonly busyTimeoutMs?: number | undefined // Non-normative initial default
  readonly synchronous?: 'NORMAL' | 'FULL' | undefined // Non-normative initial default
}

export interface WorkSessionSnapshot {
  readonly workSession: WorkSession
  readonly runs: readonly WorkSessionRun[]
  readonly tasks: readonly WorkSessionTask[]
  readonly activeJobs: readonly DurableJob[]
  readonly currentRevision: number
  readonly lastEventSequence: number
  readonly recoveryStatus: 'HEALTHY' | 'RECOVERY_REQUIRED'
}

export type EventSubscriptionListener = (event: DurableEvent) => void

export class WorkSessionKernel {
  private lifecycleState: KernelLifecycleState = 'STOPPED'
  private readonly dataRoot: string
  private readonly lock: DataRootLock
  private writer: SqliteWriter | null = null
  private reconciler: StartupReconciler | null = null
  private lastReconciliationReport: ReconciliationReport | null = null
  private readonly options: KernelOptions
  private readonly subscribers = new Set<EventSubscriptionListener>()

  public constructor(options: KernelOptions) {
    this.options = options
    this.dataRoot = path.resolve(options.dataRoot)
    this.lock = new DataRootLock(this.dataRoot, {
      kernelId: options.kernelId,
      instanceId: options.instanceId,
    })
  }

  public getLifecycleState(): KernelLifecycleState {
    return this.lifecycleState
  }

  public getDataRoot(): string {
    return this.dataRoot
  }

  public getKernelId(): string {
    return this.lock.getKernelId()
  }

  public getInstanceId(): string {
    return this.lock.getInstanceId()
  }

  public getLastReconciliationReport(): ReconciliationReport | null {
    return this.lastReconciliationReport
  }

  // --- Lifecycle Operations ---

  public async start(): Promise<void> {
    if (this.lifecycleState === 'READY') {
      return
    }
    if (this.lifecycleState === 'STARTING' || this.lifecycleState === 'SHUTTING_DOWN') {
      throw new Error(`Cannot start Kernel while in '${this.lifecycleState}' state.`)
    }

    this.lifecycleState = 'STARTING'
    try {
      // 1. Enforce single-writer lock
      this.lock.acquire()

      // 2. Open SQLite and initialize schema
      const dbFileName = this.options.databaseName || 'gravitas_kernel.db'
      const dbPath = path.join(this.dataRoot, dbFileName)
      this.writer = new SqliteWriter({
        databasePath: dbPath,
        contentionPolicy: this.options.contentionPolicy,
        durabilityPolicy: this.options.durabilityPolicy,
        busyTimeoutMs: this.options.busyTimeoutMs,
        synchronous: this.options.synchronous,
      })

      // 3. Run startup reconciliation
      this.reconciler = new StartupReconciler(this.writer)
      this.lastReconciliationReport = this.reconciler.reconcile()

      this.lifecycleState = 'READY'
    } catch (err) {
      this.lifecycleState = 'STOPPED'
      this.lock.release()
      if (this.writer) {
        try {
          this.writer.close()
        } catch {
          // Ignore close error on abort
        }
        this.writer = null
      }
      throw err
    }
  }

  public async shutdown(): Promise<void> {
    if (this.lifecycleState === 'STOPPED') {
      return
    }

    this.lifecycleState = 'SHUTTING_DOWN'
    try {
      if (this.writer) {
        this.writer.close()
        this.writer = null
      }
      this.lock.release()
    } finally {
      this.lifecycleState = 'STOPPED'
      this.subscribers.clear()
    }
  }

  // --- Command Execution & Idempotency Boundary ---

  public async execute<TResult = unknown>(command: KernelCommand): Promise<CommandResult<TResult>> {
    this.assertReady()
    const writer = this.getWriter()

    if (!command.commandId || typeof command.commandId !== 'string') {
      throw new ValidationFailedError('commandId', 'commandId must be a non-empty string.')
    }

    const effectiveType = (command.commandType || command.type || '').toUpperCase()
    const targetAggregateId =
      command.targetAggregateId ||
      command.workSessionId ||
      (command.payload && typeof command.payload === 'object' && ('id' in command.payload || 'workSessionId' in command.payload || 'taskId' in command.payload || 'jobId' in command.payload)
        ? String((command.payload as any).id ?? (command.payload as any).workSessionId ?? (command.payload as any).taskId ?? (command.payload as any).jobId)
        : '')

    // 1. Calculate deterministic semantic fingerprint covering commandType, targets, revisions, and payload
    const semanticEnvelope = {
      commandType: effectiveType,
      targetAggregateId,
      workSessionId: command.workSessionId ?? null,
      expectedRevision: command.expectedRevision ?? null,
      payload: canonicalizeJson(command.payload ?? null),
    }

    const requestHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(semanticEnvelope))
      .digest('hex')

    // 2. Check for existing command receipt (idempotency)
    const existingReceipt = writer.getCommandReceipt(command.commandId)
    if (existingReceipt) {
      if (existingReceipt.requestHash === requestHash) {
        // Safe duplicate re-delivery: return previous committed result
        const parsedResult = JSON.parse(existingReceipt.resultJson) as TResult
        return {
          commandId: command.commandId,
          status: 'ALREADY_COMMITTED',
          success: true,
          aggregateRevision: existingReceipt.expectedRevision ?? 0,
          currentRevision: existingReceipt.expectedRevision ?? 0,
          result: parsedResult,
        }
      }
      // Reused commandId with conflicting payload or semantic target/type: fail closed!
      throw new CommandConflictError(
        command.commandId,
        `CommandId already used with different semantic definition (previous hash: ${existingReceipt.requestHash.slice(0, 8)}..., current hash: ${requestHash.slice(0, 8)}...). Duplicate command mutation rejected.`
      )
    }

    // 3. Execute mutation inside an isolated atomic SQLite transaction
    const eventsToEmit: DurableEvent[] = []
    const commandResult = writer.transaction(() => {
      let resultData: unknown
      let revision = 1
      let targetAggregateId = command.targetAggregateId ?? command.workSessionId ?? 'system'

      switch (effectiveType) {
        case 'CREATE_WORKSESSION':
        case 'CREATE_WORK_SESSION': {
          const payload = command.payload as CreateWorkSessionPayload
          const session = this.handleCreateWorkSession(payload, command, eventsToEmit)
          resultData = { session }
          revision = session.revision
          targetAggregateId = session.id
          break
        }

        case 'TRANSITION_WORKSESSION':
        case 'TRANSITION_WORK_SESSION': {
          const payload = command.payload as TransitionWorkSessionPayload
          const session = this.handleTransitionWorkSession(payload, command, eventsToEmit)
          resultData = { session }
          revision = session.revision
          targetAggregateId = session.id
          break
        }

        case 'CREATE_RUN': {
          const payload = command.payload as CreateRunPayload
          const run = this.handleCreateRun(payload, command, eventsToEmit)
          resultData = { run }
          targetAggregateId = run.id
          break
        }

        case 'CREATE_TASK': {
          const payload = command.payload as CreateTaskPayload
          const task = this.handleCreateTask(payload, command, eventsToEmit)
          resultData = { task }
          targetAggregateId = task.id
          break
        }

        case 'TRANSITION_TASK': {
          const payload = command.payload as TransitionTaskPayload
          const task = this.handleTransitionTask(payload, command, eventsToEmit)
          resultData = { task }
          targetAggregateId = task.id
          break
        }

        case 'CREATE_DURABLE_JOB': {
          const payload = command.payload as CreateDurableJobPayload
          const job = this.handleCreateDurableJob(payload, command, eventsToEmit)
          resultData = { job }
          targetAggregateId = job.id
          break
        }

        case 'CLAIM_JOB_LEASE': {
          const payload = command.payload as ClaimJobLeasePayload
          const job = this.handleClaimJobLease(payload, command, eventsToEmit)
          resultData = { job }
          targetAggregateId = job.id
          break
        }

        default:
          throw new Error(`Unknown commandType '${effectiveType}'`)
      }

      // Record command receipt atomically inside transaction
      const receipt: CommandReceipt = {
        commandId: command.commandId,
        commandType: effectiveType,
        targetAggregateId,
        expectedRevision: revision,
        requestHash,
        status: 'COMMITTED',
        resultJson: JSON.stringify(resultData),
        createdAt: new Date().toISOString(),
      }
      writer.insertCommandReceipt(receipt)

      return {
        commandId: command.commandId,
        status: 'COMMITTED' as const,
        success: true,
        aggregateRevision: revision,
        currentRevision: revision,
        result: resultData as TResult,
      }
    })

    // 4. Notify live subscribers outside transaction
    for (const evt of eventsToEmit) {
      this.dispatchLiveEvent(evt)
    }

    return commandResult
  }

  // --- Command Handlers (Internal) ---

  private handleCreateWorkSession(
    payload: CreateWorkSessionPayload,
    command: KernelCommand,
    eventsToEmit: DurableEvent[]
  ): WorkSession {
    const rawPayload = ((payload || {}) as unknown) as Record<string, unknown>
    const title = String(rawPayload['title'] || '')
    const objective = String(rawPayload['objective'] || rawPayload['goal'] || 'Default WorkSession Goal')
    const repositoryRoot = String(rawPayload['repositoryRoot'] || rawPayload['workspacePath'] || '.')
    const baseBranch = String(rawPayload['baseBranch'] || rawPayload['baseRef'] || 'main')

    if (!title) {
      throw new ValidationFailedError('title', 'WorkSession title must be a non-empty string.')
    }

    const wsId = command.workSessionId || (rawPayload['id'] as string) || (rawPayload['workSessionId'] as string)
    if (command.workSessionId === '') {
      throw new ValidationFailedError('workSessionId', 'workSessionId must not be empty.')
    }

    const now = new Date().toISOString()
    const id = wsId ?? `ws_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    const session: WorkSession = {
      id,
      title,
      objective,
      goal: objective,
      repositoryRoot,
      baseBranch,
      state: 'CREATED',
      revision: 1,
      createdAt: now,
      updatedAt: now,
      metadata: payload.metadata,
    }

    const writer = this.getWriter()
    writer.insertWorkSession(session)

    const event = writer.appendDurableEvent({
      aggregateType: 'WORKSESSION',
      aggregateId: session.id,
      eventType: 'WORKSESSION_CREATED',
      aggregateRevision: session.revision,
      occurredAt: now,
      commandId: command.commandId,
      payload: {
        id: session.id,
        title: session.title,
        objective: session.objective,
        repositoryRoot: session.repositoryRoot,
        baseBranch: session.baseBranch,
      },
    })
    eventsToEmit.push(event)

    return session
  }

  private handleTransitionWorkSession(
    payload: TransitionWorkSessionPayload,
    command: KernelCommand,
    eventsToEmit: DurableEvent[]
  ): WorkSession {
    const rawPayload = (payload || {}) as Record<string, unknown>
    const workSessionId = command.workSessionId || (rawPayload['workSessionId'] as string)
    const targetState = (rawPayload['targetState'] || rawPayload['toState']) as WorkSessionState
    const reason = (rawPayload['reason'] as string) || undefined

    const writer = this.getWriter()
    const session = writer.getWorkSession(workSessionId)
    if (!session) {
      throw new WorkSessionNotFoundError(workSessionId)
    }

    // Optimistic concurrency check
    if (command.expectedRevision != null && command.expectedRevision !== session.revision) {
      throw new RevisionConflictError(session.id, command.expectedRevision, session.revision)
    }

    // FSM rule validation
    assertValidWorkSessionTransition(session.id, session.state, targetState, reason)

    const now = new Date().toISOString()
    const newRevision = session.revision + 1
    const terminalReason = ['COMPLETED', 'FAILED', 'CANCELLED'].includes(targetState)
      ? reason ?? `Transitioned to ${targetState}`
      : undefined

    writer.updateWorkSessionState(
      session.id,
      targetState,
      newRevision,
      now,
      terminalReason,
      session.recoveryMetadata ? { ...session.recoveryMetadata } : undefined
    )

    const updatedSession: WorkSession = {
      ...session,
      state: targetState,
      revision: newRevision,
      updatedAt: now,
      terminalReason,
    }

    const event = writer.appendDurableEvent({
      aggregateType: 'WORKSESSION',
      aggregateId: session.id,
      eventType: 'WORKSESSION_STATE_CHANGED',
      aggregateRevision: newRevision,
      occurredAt: now,
      commandId: command.commandId,
      payload: {
        fromState: session.state,
        toState: targetState,
        reason,
      },
    })
    eventsToEmit.push(event)

    return updatedSession
  }

  private handleCreateRun(
    payload: CreateRunPayload,
    command: KernelCommand,
    eventsToEmit: DurableEvent[]
  ): WorkSessionRun {
    const rawPayload = (payload || {}) as Record<string, unknown>
    const workSessionId = command.workSessionId || (rawPayload['workSessionId'] as string)
    const goal = String(rawPayload['goal'] || 'Execute run')

    const writer = this.getWriter()
    const session = writer.getWorkSession(workSessionId)
    if (!session) {
      throw new WorkSessionNotFoundError(workSessionId)
    }

    const now = new Date().toISOString()
    const id = (rawPayload['runId'] as string) || (rawPayload['id'] as string) || `run_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    const run: WorkSessionRun = {
      id,
      workSessionId,
      goal,
      status: 'PENDING',
      createdAt: now,
      updatedAt: now,
    }

    writer.insertRun(run)

    const newSessionRevision = session.revision + 1
    writer.updateWorkSessionState(
      session.id,
      session.state,
      newSessionRevision,
      now,
      session.terminalReason,
      session.recoveryMetadata ? { ...session.recoveryMetadata } : undefined
    )

    const event = writer.appendDurableEvent({
      aggregateType: 'RUN',
      aggregateId: run.id,
      eventType: 'RUN_CREATED',
      aggregateRevision: 1,
      occurredAt: now,
      commandId: command.commandId,
      payload: { runId: run.id, workSessionId: run.workSessionId, goal: run.goal },
    })
    eventsToEmit.push(event)

    return run
  }

  private handleCreateTask(
    payload: CreateTaskPayload,
    command: KernelCommand,
    eventsToEmit: DurableEvent[]
  ): WorkSessionTask {
    const rawPayload = ((payload || {}) as unknown) as Record<string, unknown>
    const workSessionId = command.workSessionId || (rawPayload['workSessionId'] as string)
    const runId = String(rawPayload['runId'] || '')
    const title = String(rawPayload['title'] || '')
    const assignedRoleId = String(rawPayload['assignedRoleId'] || 'role:engineering:backend-engineer')
    const requiresApproval = Boolean(rawPayload['requiresApproval'])

    const writer = this.getWriter()
    const session = writer.getWorkSession(workSessionId)
    if (!session) {
      throw new WorkSessionNotFoundError(workSessionId)
    }

    const now = new Date().toISOString()
    const id = (rawPayload['taskId'] as string) || (rawPayload['id'] as string) || `task_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    const task: WorkSessionTask = {
      id,
      runId,
      workSessionId,
      title,
      state: 'PENDING',
      assignedRoleId,
      requiresApproval,
      createdAt: now,
      updatedAt: now,
    }

    writer.insertTask(task)

    const newSessionRevision = session.revision + 1
    writer.updateWorkSessionState(
      session.id,
      session.state,
      newSessionRevision,
      now,
      session.terminalReason,
      session.recoveryMetadata ? { ...session.recoveryMetadata } : undefined
    )

    const event = writer.appendDurableEvent({
      aggregateType: 'TASK',
      aggregateId: task.id,
      eventType: 'TASK_CREATED',
      aggregateRevision: 1,
      occurredAt: now,
      commandId: command.commandId,
      payload: { taskId: task.id, runId: task.runId, workSessionId: task.workSessionId, title: task.title },
    })
    eventsToEmit.push(event)

    return task
  }

  private handleTransitionTask(
    payload: TransitionTaskPayload,
    command: KernelCommand,
    eventsToEmit: DurableEvent[]
  ): WorkSessionTask {
    const rawPayload = ((payload || {}) as unknown) as Record<string, unknown>
    const taskId = String(rawPayload['taskId'] || '')
    const targetState = (rawPayload['targetState'] || rawPayload['toState']) as WorkSessionTask['state']
    const reason = (rawPayload['reason'] as string) || undefined

    const writer = this.getWriter()
    const task = writer.getTask(taskId)
    if (!task) {
      throw new Error(`Task '${taskId}' not found.`)
    }

    const now = new Date().toISOString()
    writer.updateTaskState(task.id, targetState, now)

    const updatedTask: WorkSessionTask = {
      ...task,
      state: targetState,
      updatedAt: now,
    }

    const event = writer.appendDurableEvent({
      aggregateType: 'TASK',
      aggregateId: task.id,
      eventType: 'TASK_STATE_CHANGED',
      aggregateRevision: 1,
      occurredAt: now,
      commandId: command.commandId,
      payload: { fromState: task.state, toState: targetState, reason },
    })
    eventsToEmit.push(event)

    return updatedTask
  }

  private handleCreateDurableJob(
    payload: CreateDurableJobPayload,
    command: KernelCommand,
    eventsToEmit: DurableEvent[]
  ): DurableJob {
    const rawPayload = ((payload || {}) as unknown) as Record<string, unknown>
    const writer = this.getWriter()

    const wsId = (rawPayload['workSessionId'] as string) || command.workSessionId || undefined
    if (wsId) {
      const session = writer.getWorkSession(wsId)
      if (!session) {
        throw new WorkSessionNotFoundError(wsId)
      }
    }

    const now = new Date().toISOString()
    const id = (rawPayload['jobId'] as string) || (rawPayload['id'] as string) || `job_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    const jobType = String(rawPayload['jobType'] || rawPayload['jobKind'] || 'DEFAULT_JOB')
    const job: DurableJob = {
      id,
      jobType,
      ...(wsId !== undefined ? { workSessionId: wsId } : {}),
      state: 'PENDING',
      payload: (rawPayload['payload'] as Record<string, unknown>) ?? {},
      createdAt: now,
      updatedAt: now,
    }

    writer.insertDurableJob(job)

    const event = writer.appendDurableEvent({
      aggregateType: 'JOB',
      aggregateId: job.id,
      eventType: 'JOB_CREATED',
      aggregateRevision: 1,
      occurredAt: now,
      commandId: command.commandId,
      payload: { jobId: job.id, jobType: job.jobType, workSessionId: job.workSessionId },
    })
    eventsToEmit.push(event)

    return job
  }

  private handleClaimJobLease(
    payload: ClaimJobLeasePayload,
    command: KernelCommand,
    eventsToEmit: DurableEvent[]
  ): DurableJob {
    const rawPayload = ((payload || {}) as unknown) as Record<string, unknown>
    const jobId = String(rawPayload['jobId'] || '')
    const leaseOwner = String(rawPayload['leaseOwner'] || rawPayload['leasedBy'] || 'default-worker')

    const writer = this.getWriter()
    const job = writer.getDurableJob(jobId)
    if (!job) {
      throw new Error(`Job '${jobId}' not found.`)
    }

    const now = new Date()
    const nowIso = now.toISOString()

    // Can only claim if PENDING or lease is expired
    if (job.state === 'LEASED' && job.leaseExpiresAt) {
      const expiresAt = new Date(job.leaseExpiresAt)
      if (expiresAt > now) {
        throw new Error(`Job '${job.id}' is currently leased by '${job.leaseOwner}' until ${job.leaseExpiresAt}.`)
      }
    }

    let leaseExpiresAt: string
    if (rawPayload['leaseExpiresAt']) {
      leaseExpiresAt = String(rawPayload['leaseExpiresAt'])
    } else {
      const duration = Number(rawPayload['leaseDurationMs'] || 60000)
      leaseExpiresAt = new Date(now.getTime() + duration).toISOString()
    }

    writer.updateJobLease(job.id, 'LEASED', leaseOwner, nowIso, leaseExpiresAt, nowIso)

    const updatedJob: DurableJob = {
      ...job,
      state: 'LEASED',
      leaseOwner,
      leasedAt: nowIso,
      leaseExpiresAt,
      updatedAt: nowIso,
    }

    const event = writer.appendDurableEvent({
      aggregateType: 'JOB',
      aggregateId: job.id,
      eventType: 'JOB_LEASED',
      aggregateRevision: 1,
      occurredAt: nowIso,
      commandId: command.commandId,
      payload: { jobId: job.id, leaseOwner, leaseExpiresAt },
    })
    eventsToEmit.push(event)

    return updatedJob
  }

  // --- Snapshot & Query Boundary ---

  public getWorkSession(id: string): WorkSession | undefined {
    this.assertReady()
    return this.getWriter().getWorkSession(id)
  }

  public listWorkSessions(): readonly WorkSession[] {
    this.assertReady()
    return this.getWriter().listWorkSessions()
  }

  public getWorkSessionSnapshot(workSessionId: string): WorkSessionSnapshot {
    this.assertReady()
    const writer = this.getWriter()
    const session = writer.getWorkSession(workSessionId)
    if (!session) {
      throw new WorkSessionNotFoundError(workSessionId)
    }

    const runs = writer.listRunsForSession(workSessionId)
    const tasks = writer.listTasksForSession(workSessionId)
    const activeJobs = writer.listJobsForSession(workSessionId)
    const lastEventSequence = writer.getLatestEventSequence()

    return {
      workSession: session,
      runs,
      tasks,
      activeJobs,
      currentRevision: session.revision,
      lastEventSequence,
      recoveryStatus: session.state === 'RECOVERY_REQUIRED' ? 'RECOVERY_REQUIRED' : 'HEALTHY',
    }
  }

  // --- Event Queries & Decoupled Subscriptions ---

  public getEventsForSession(workSessionId: string): readonly DurableEvent[] {
    this.assertReady()
    const stmt = this.getWriter().getRawDb().prepare(`
      SELECT * FROM durable_events
      WHERE aggregate_id = ?
         OR json_extract(payload_json, '$.workSessionId') = ?
         OR json_extract(payload_json, '$.id') = ?
      ORDER BY sequence_id ASC;
    `)
    const rows = stmt.all(workSessionId, workSessionId, workSessionId) as Record<string, unknown>[]
    return rows.map((r) => {
      const seq = Number(r['sequence_id'])
      return {
        sequenceId: seq,
        sequenceNumber: seq,
        eventId: String(r['event_id']),
        aggregateType: r['aggregate_type'] as any,
        aggregateId: String(r['aggregate_id']),
        eventType: String(r['event_type']),
        aggregateRevision: Number(r['aggregate_revision']),
        occurredAt: String(r['occurred_at']),
        commandId: r['command_id'] ? String(r['command_id']) : undefined,
        correlationId: r['correlation_id'] ? String(r['correlation_id']) : undefined,
        causationId: r['causation_id'] ? String(r['causation_id']) : undefined,
        payload: JSON.parse(String(r['payload_json'] || '{}')),
      }
    })
  }

  public getDurableJobsByState(state: string): readonly DurableJob[] {
    this.assertReady()
    return this.getWriter().listJobsByState(state)
  }

  public getAllWorkSessions(): readonly WorkSession[] {
    return this.listWorkSessions()
  }

  public async executeCommand<TResult = unknown>(command: KernelCommand): Promise<CommandResult<TResult>> {
    return this.execute<TResult>(command)
  }

  public getEventsSince(lastSequenceId: number, limit = 500): readonly DurableEvent[] {
    this.assertReady()
    return this.getWriter().listEventsSince(lastSequenceId, limit)
  }

  public getEventsForAggregate(aggregateType: string, aggregateId: string): readonly DurableEvent[] {
    this.assertReady()
    return this.getWriter().listEventsForAggregate(aggregateType, aggregateId)
  }

  public subscribe(listener: EventSubscriptionListener): () => void {
    this.subscribers.add(listener)
    return () => {
      this.subscribers.delete(listener)
    }
  }

  private dispatchLiveEvent(event: DurableEvent): void {
    for (const sub of this.subscribers) {
      try {
        sub(event)
      } catch {
        // Live event subscriber error must never break kernel state or transaction!
      }
    }
  }

  private assertReady(): void {
    if (this.lifecycleState !== 'READY') {
      if (this.lifecycleState === 'SHUTTING_DOWN') {
        throw new KernelShuttingDownError()
      }
      throw new KernelNotReadyError(this.lifecycleState)
    }
  }

  /**
   * Narrow persistence port exposing only K5 receipts and model observations.
   * Keeps raw SQLite database operations encapsulated within the kernel.
   */
  public getModelObservationStore(): DurableModelObservationStore {
    if (this.lifecycleState !== 'READY' || !this.writer) {
      throw new KernelNotReadyError(this.lifecycleState)
    }
    return this.writer
  }

  private getWriter(): SqliteWriter {
    if (!this.writer) {
      throw new KernelNotReadyError(this.lifecycleState)
    }
    return this.writer
  }
}

/**
 * Deterministically sorts object keys deeply to guarantee canonical JSON serialization
 * regardless of property insertion order.
 */
export function canonicalizeJson(value: unknown): unknown {
  if (value === null || typeof value !== 'object') {
    return value
  }
  if (Array.isArray(value)) {
    return value.map(canonicalizeJson)
  }
  const obj = value as Record<string, unknown>
  const sortedKeys = Object.keys(obj).sort()
  const result: Record<string, unknown> = {}
  for (const key of sortedKeys) {
    result[key] = canonicalizeJson(obj[key])
  }
  return result
}
