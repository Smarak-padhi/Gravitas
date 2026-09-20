/**
 * Golden Loop Orchestration Application Service for @gravitas/server.
 *
 * Coordinates execution contracts, isolated worktree allocation, worker harnesses,
 * independent verification, evidence collection, and FSM approval transitions.
 *
 * Core Invariant:
 * AN AGENT CLAIM IS NEVER PROOF OF COMPLETION.
 *
 * Zero AI requests during normal tests: Supports full dependency injection
 * of deterministic harnesses and verification plans.
 */

import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  GRAVITAS_VERSION,
  ContractValidationError,
  createApprovalRequiredEvent,
  createEvidenceCreatedEvent,
  createExecutionContract,
  createExecutionContractCreatedEvent,
  createRunCompletedEvent,
  createRunCreatedEvent,
  createRunFailedEvent,
  createRunStateChangedEvent,
  createTaskApprovedEvent,
  createTaskCreatedEvent,
  createTaskRejectedEvent,
  createTaskStateChangedEvent,
  createWorkerFinishedEvent,
  createWorkerStartedEvent,
  createVerificationFinishedEvent,
  createVerificationStartedEvent,
  generateEventId,
  transitionTask,
  type AgentCapability,
  type BrowserQaResult,
  type ExecutionContract,
  type GravitasEvent,
  type Run,
  type Task,
} from '@gravitas/core'
import { CANONICAL_CAPABILITIES, type AgentDescriptor } from '@gravitas/agents'
import {
  compilePrompt,
  type ManagedCompiledPrompt,
  type ProjectPromptContext,
  type PromptPreviewRequest,
  type PromptPreviewResponse,
  type TaskPromptResponse,
} from '@gravitas/prompts'
import { allocateWorktree, removeWorktree } from '@gravitas/git'
import {
  captureWorktreeMutation,
  takeWorktreeSnapshot,
  type AgentHarness,
} from '@gravitas/harnesses'
import {
  applyVerificationOutcome,
  executeVerification,
  writeEvidenceBundle,
  type EvidenceManifest,
  type VerificationPlan,
} from '@gravitas/verifier'
import {
  BoundedScheduler,
  PlanValidationError,
  extractDependencyIds,
  validateRunPlan,
  type RunPlan,
  type TaskPlanDefinition,
} from '@gravitas/orchestrator'
import {
  InvalidRequestError,
  NotFoundError,
  RunAlreadyExecutingError,
  TaskStateConflictError,
} from './errors.js'
import type { EventHub } from './events.js'
import type { InMemoryRegistry } from './registry.js'
import type {
  ApproveTaskInput,
  CreateRunInput,
  CreateRunResponse,
  ExecuteRunOptions,
  RejectTaskInput,
  RunDetailResponse,
  StateSummaryResponse,
  TaskDetailResponse,
  TaskEvidenceDiffResponse,
  TaskEvidenceRef,
  TaskEvidenceResponse,
} from './types.js'

export interface RunServiceOptions {
  readonly registry: InMemoryRegistry
  readonly eventHub: EventHub
  readonly harness: AgentHarness
  readonly runtimeRoot?: string | undefined
  readonly defaultRepository?: string | undefined
  readonly defaultVerificationPlan?: VerificationPlan | undefined
}

export class RunService {
  private readonly registry: InMemoryRegistry
  private readonly eventHub: EventHub
  private readonly harness: AgentHarness
  private readonly runtimeRoot: string
  private readonly defaultRepository?: string | undefined
  private readonly defaultVerificationPlan?: VerificationPlan | undefined
  private cachedHarnessAvailability?: { status: string; message?: string | undefined; timestamp: number } | undefined
  private readonly activeSchedulers = new Map<string, BoundedScheduler>()
  private readonly runPlans = new Map<string, RunPlan>()

  public constructor(options: RunServiceOptions) {
    this.registry = options.registry
    this.eventHub = options.eventHub
    this.harness = options.harness
    this.runtimeRoot = options.runtimeRoot ?? join(tmpdir(), 'gravitas-runtime')
    this.defaultRepository = options.defaultRepository
    this.defaultVerificationPlan = options.defaultVerificationPlan
  }

  /**
   * Creates a new run and associated task/contract.
   */
  public async createRun(input: CreateRunInput): Promise<CreateRunResponse> {
    if (!input || typeof input.goal !== 'string' || input.goal.trim() === '') {
      throw new InvalidRequestError('INVALID_INPUT', "The 'goal' property must be a non-empty string.")
    }

    const repository = input.repository ?? this.defaultRepository
    if (!repository) {
      throw new InvalidRequestError('MISSING_REPOSITORY', 'A target repository must be specified or configured.')
    }

    const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const defaultTaskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

    const acceptanceCriteria = input.acceptanceCriteria !== undefined
      ? input.acceptanceCriteria.map((ac, idx) => ({
          id: ac.id?.trim() || `ac_${idx + 1}`,
          description: ac.description,
          ...(ac.verificationMethod ? { verificationMethod: ac.verificationMethod } : {}),
        }))
      : [
          {
            id: 'ac_default',
            description: `Deliver goal: ${input.goal.trim()}`,
            verificationMethod: 'AUTOMATED_TEST',
          },
        ]

    const requiredEvidence = input.requiredEvidence !== undefined
      ? input.requiredEvidence.map((ev, idx) => ({
          id: ev.id?.trim() || `ev_${idx + 1}`,
          type: ev.type,
          description: ev.description,
          mandatory: Boolean(ev.mandatory),
        }))
      : [
          {
            id: 'ev_git_diff',
            type: 'GIT_DIFF',
            description: 'Non-empty valid git diff in scope',
            mandatory: true,
          },
        ]

    // Create execution contract using @gravitas/core validation
    let contract: ExecutionContract
    try {
      contract = createExecutionContract({
        goal: input.goal.trim(),
        repository,
        baseBranch: input.baseBranch ?? 'HEAD',
        constraints: input.constraints ?? [],
        acceptanceCriteria,
        requiredEvidence,
      })
    } catch (err) {
      if (err instanceof ContractValidationError) {
        throw new InvalidRequestError('INVALID_CONTRACT', err.message)
      }
      throw err
    }

    const contractId = `contract_${runId}`
    this.registry.addContract(contractId, contract)

    // Build or extract RunPlan
    let plan: RunPlan
    if (input.plan) {
      plan = {
        ...input.plan,
        runId,
        repository,
        baseBranch: input.baseBranch ?? 'HEAD',
        defaultVerificationPlan: input.verificationPlan ?? this.defaultVerificationPlan,
      }
    } else if (input.tasks && input.tasks.length > 0) {
      plan = {
        runId,
        goal: input.goal.trim(),
        repository,
        baseBranch: input.baseBranch ?? 'HEAD',
        constraints: input.constraints ?? [],
        maxConcurrency: input.maxConcurrency ?? 2,
        tasks: input.tasks,
        projectContext: input.projectContext,
        defaultVerificationPlan: input.verificationPlan ?? this.defaultVerificationPlan,
      }
    } else {
      plan = {
        runId,
        goal: input.goal.trim(),
        repository,
        baseBranch: input.baseBranch ?? 'HEAD',
        constraints: input.constraints ?? [],
        maxConcurrency: 1,
        tasks: [
          {
            id: defaultTaskId,
            title: `Execute: ${input.goal.slice(0, 60)}`,
            objective: input.goal,
            dependencies: [],
            acceptanceCriteria: contract.acceptanceCriteria,
            requiresApproval: input.requiresApproval ?? true,
          },
        ],
        projectContext: input.projectContext,
        defaultVerificationPlan: input.verificationPlan ?? this.defaultVerificationPlan,
      }
    }

    try {
      validateRunPlan(plan)
    } catch (err) {
      if (err instanceof PlanValidationError) {
        throw new InvalidRequestError('INVALID_PLAN', err.message)
      }
      throw err
    }

    this.runPlans.set(runId, plan)

    const now = new Date().toISOString()
    const createdTasks: Task[] = []

    for (const taskDef of plan.tasks) {
      const depIds = extractDependencyIds(taskDef)
      const dependencies = depIds.map((d) => ({ taskId: d }))

      const task: Task = {
        id: taskDef.id,
        runId,
        title: taskDef.title,
        objective: taskDef.objective,
        state: depIds.length === 0 ? 'READY' : 'BLOCKED',
        dependencies,
        acceptanceCriteria: taskDef.acceptanceCriteria ?? contract.acceptanceCriteria,
        requiresApproval: taskDef.requiresApproval ?? input.requiresApproval ?? true,
        ...(taskDef.role ? { role: taskDef.role } : {}),
        ...(taskDef.browserQa ? { browserQa: taskDef.browserQa } : {}),
        ...(taskDef.requiredCapabilities ? { requiredCapabilities: taskDef.requiredCapabilities } : {}),
        createdAt: now,
        updatedAt: now,
      }
      this.registry.addTask(task)
      createdTasks.push(task)
    }

    const run: Run = {
      id: runId,
      goal: input.goal,
      status: 'PENDING',
      contractId,
      taskIds: createdTasks.map((t) => t.id),
      createdAt: now,
      updatedAt: now,
    }
    this.registry.addRun(run)

    if (input.verificationPlan) {
      this.registry.setVerificationPlan(runId, input.verificationPlan)
    }

    if (input.projectContext) {
      this.registry.setProjectContext(runId, input.projectContext)
    }

    // Publish creation events through EventHub
    this.eventHub.publish(createRunCreatedEvent(run))
    this.eventHub.publish(createExecutionContractCreatedEvent(runId, contract))
    for (const t of createdTasks) {
      this.eventHub.publish(createTaskCreatedEvent(t))
    }

    return {
      runId,
      contractId,
      tasks: createdTasks,
      run,
    }
  }

  /**
   * Executes the Golden Loop for a run's tasks using the BoundedScheduler.
   */
  public async executeRun(runId: string, options?: ExecuteRunOptions | undefined): Promise<Task> {
    const run = this.registry.getRun(runId)
    if (!run) {
      throw new NotFoundError('Run', runId)
    }

    if (this.activeSchedulers.has(runId) || run.status === 'RUNNING') {
      throw new RunAlreadyExecutingError(runId)
    }

    const tasks = this.registry.listTasksForRun(runId)
    if (tasks.length === 0) {
      throw new InvalidRequestError('NO_TASKS', `Run '${runId}' has no tasks to execute.`)
    }

    const anyReady = tasks.some((t) => t.state === 'READY')
    if (!anyReady) {
      const activeTask = tasks.find((t) => t.state === 'WAITING_APPROVAL' || t.state === 'RUNNING')
      if (activeTask) {
        return activeTask
      }
      throw new TaskStateConflictError(`Run '${runId}' has no tasks eligible for execution (none in READY state).`)
    }

    const contract = this.registry.getContract(run.contractId)
    const repository = contract?.repository ?? this.defaultRepository
    if (!repository) {
      throw new InvalidRequestError('MISSING_REPOSITORY', 'No repository path found for run execution.')
    }

    const runtimeRoot = options?.runtimeRoot ?? this.runtimeRoot
    const baseBranch = contract?.baseBranch ?? 'HEAD'

    // Retrieve or construct RunPlan
    let plan = this.runPlans.get(runId)
    if (!plan) {
      plan = {
        runId,
        goal: run.goal,
        repository,
        baseBranch,
        constraints: contract?.constraints ?? [],
        tasks: tasks.map((t) => ({
          id: t.id,
          title: t.title,
          objective: t.objective,
          dependencies: t.dependencies.map((d) => d.taskId),
          acceptanceCriteria: t.acceptanceCriteria,
          requiresApproval: t.requiresApproval ?? true,
          role: t.role,
          browserQa: t.browserQa,
          requiredCapabilities: t.requiredCapabilities,
        })),
        projectContext: this.registry.getProjectContext(runId),
        defaultVerificationPlan: this.registry.getVerificationPlan(runId) ?? this.defaultVerificationPlan,
      }
    }

    // Transition run to RUNNING
    const prevRunStatus = run.status
    this.registry.updateRun({ ...run, status: 'RUNNING', updatedAt: new Date().toISOString() })
    this.eventHub.publish(createRunStateChangedEvent(run.id, prevRunStatus, 'RUNNING'))

    const scheduler = new BoundedScheduler({
      runId,
      plan,
      repositoryRoot: repository,
      baseBranch,
      runtimeRoot,
      harness: this.harness,
      defaultVerificationPlan: this.registry.getVerificationPlan(runId) ?? this.defaultVerificationPlan,
      autoPauseOnWaitingApproval: true,
      onEvent: (event) => {
        this.eventHub.publish(event)
      },
      onTaskUpdated: (updatedTask) => {
        this.registry.updateTask(updatedTask)
      },
      onMutation: (taskId, mutation) => {
        this.registry.setMutation(taskId, mutation)
      },
      onVerification: (taskId, verification) => {
        this.registry.setVerification(taskId, verification)
      },
      onEvidence: (taskId, evidenceRef) => {
        this.registry.setEvidenceRef(taskId, evidenceRef)
      },
      onCompiledPrompt: (taskId, compiledPrompt) => {
        this.registry.setCompiledPrompt(taskId, compiledPrompt)
      },
      onBrowserQa: (taskId, qaResult) => {
        this.registry.setBrowserQaResult(taskId, qaResult)
      },
      agentRegistry: this.registry.getAgentRegistry(),
    })

    this.activeSchedulers.set(runId, scheduler)

    try {
      const result = await scheduler.execute()

      // Update run status based on execution outcome
      const updatedRunStatus = result.status
      const currentRun = this.registry.getRun(runId) ?? run
      this.registry.updateRun({
        ...currentRun,
        status: updatedRunStatus,
        updatedAt: new Date().toISOString(),
      })

      if (updatedRunStatus !== 'RUNNING') {
        this.eventHub.publish(createRunStateChangedEvent(runId, 'RUNNING', updatedRunStatus))
      }

      if (updatedRunStatus === 'COMPLETED') {
        this.eventHub.publish(createRunCompletedEvent(runId))
        this.activeSchedulers.delete(runId)
      } else if (updatedRunStatus === 'FAILED') {
        this.eventHub.publish(createRunFailedEvent(runId))
        this.activeSchedulers.delete(runId)
      }

      const activeOrFirstTask =
        result.tasks.find((t) => t.state === 'WAITING_APPROVAL' || t.state === 'RUNNING') ??
        result.tasks[0]!
      return activeOrFirstTask
    } catch (err) {
      this.activeSchedulers.delete(runId)
      throw err
    }
  }

  /**
   * Approves a task in WAITING_APPROVAL state.
   */
  public async approveTask(runId: string, taskId: string, input?: ApproveTaskInput | undefined): Promise<Task> {
    const run = this.registry.getRun(runId)
    if (!run) {
      throw new NotFoundError('Run', runId)
    }

    let task = this.registry.getTask(taskId)
    if (!task || task.runId !== runId) {
      throw new NotFoundError('Task', taskId)
    }

    if (task.state !== 'WAITING_APPROVAL') {
      throw new TaskStateConflictError(
        `Task '${taskId}' is in '${task.state}' state, not 'WAITING_APPROVAL'. Only WAITING_APPROVAL tasks can be approved.`
      )
    }

    const scheduler = this.activeSchedulers.get(runId)
    if (scheduler) {
      task = await scheduler.approveTask(taskId, input?.reviewer)
      this.registry.updateTask(task)

      // Evaluate overall run status
      const allTasks = this.registry.listTasksForRun(runId)
      const allTerminal = allTasks.every((t) =>
        ['COMPLETED', 'APPROVED', 'FAILED', 'CANCELLED'].includes(t.state)
      )

      if (allTerminal) {
        const hasFailed = allTasks.some((t) => t.state === 'FAILED')
        const hasCancelled = allTasks.some((t) => t.state === 'CANCELLED')
        const finalRunStatus = hasFailed ? 'FAILED' : (hasCancelled ? 'CANCELLED' : 'COMPLETED')
        const currentRun = this.registry.getRun(runId) ?? run
        this.registry.updateRun({ ...currentRun, status: finalRunStatus, updatedAt: new Date().toISOString() })
        this.eventHub.publish(createRunStateChangedEvent(runId, currentRun.status, finalRunStatus))
        if (finalRunStatus === 'COMPLETED') {
          this.eventHub.publish(createRunCompletedEvent(runId))
        } else if (finalRunStatus === 'FAILED') {
          this.eventHub.publish(createRunFailedEvent(runId))
        }
        this.activeSchedulers.delete(runId)
      } else {
        const anyWaiting = allTasks.some((t) => t.state === 'WAITING_APPROVAL')
        const anyRunning = allTasks.some((t) => t.state === 'RUNNING' || t.state === 'VERIFYING')
        const newRunStatus = anyWaiting ? 'WAITING_APPROVAL' : (anyRunning ? 'RUNNING' : 'RUNNING')
        const currentRun = this.registry.getRun(runId) ?? run
        if (currentRun.status !== newRunStatus) {
          this.registry.updateRun({ ...currentRun, status: newRunStatus, updatedAt: new Date().toISOString() })
          this.eventHub.publish(createRunStateChangedEvent(runId, currentRun.status, newRunStatus))
        }
      }
      return task
    }

    // Fallback if no scheduler registered (direct approval)
    const transitionResult = transitionTask(task, 'APPROVED')
    task = transitionResult.task
    this.registry.updateTask(task)

    this.eventHub.publish(
      createTaskStateChangedEvent({
        runId,
        taskId,
        fromState: 'WAITING_APPROVAL',
        toState: 'APPROVED',
      })
    )
    this.eventHub.publish(
      createTaskApprovedEvent(runId, taskId, {
        reviewer: input?.reviewer ?? 'local_operator',
      })
    )

    const prevRunStatus = run.status
    const updatedRun: Run = {
      ...run,
      status: 'COMPLETED',
      updatedAt: new Date().toISOString(),
    }
    this.registry.updateRun(updatedRun)
    this.eventHub.publish(createRunStateChangedEvent(runId, prevRunStatus, 'COMPLETED'))
    this.eventHub.publish(createRunCompletedEvent(runId))

    return task
  }

  /**
   * Rejects a task in WAITING_APPROVAL state.
   */
  public async rejectTask(runId: string, taskId: string, input?: RejectTaskInput | undefined): Promise<Task> {
    const run = this.registry.getRun(runId)
    if (!run) {
      throw new NotFoundError('Run', runId)
    }

    let task = this.registry.getTask(taskId)
    if (!task || task.runId !== runId) {
      throw new NotFoundError('Task', taskId)
    }

    if (task.state !== 'WAITING_APPROVAL') {
      throw new TaskStateConflictError(
        `Task '${taskId}' is in '${task.state}' state, not 'WAITING_APPROVAL'. Only WAITING_APPROVAL tasks can be rejected.`
      )
    }

    const scheduler = this.activeSchedulers.get(runId)
    if (scheduler) {
      task = await scheduler.rejectTask(taskId, input?.reason)
      this.registry.updateTask(task)

      const currentRun = this.registry.getRun(runId) ?? run
      this.registry.updateRun({ ...currentRun, status: 'FAILED', updatedAt: new Date().toISOString() })
      this.eventHub.publish(createRunStateChangedEvent(runId, currentRun.status, 'FAILED'))
      this.eventHub.publish(createRunFailedEvent(runId, { reason: input?.reason }))
      this.activeSchedulers.delete(runId)
      return task
    }

    // Fallback if no scheduler registered
    const transitionResult = transitionTask(task, 'FAILED', { reason: input?.reason })
    task = transitionResult.task
    this.registry.updateTask(task)

    this.eventHub.publish(
      createTaskStateChangedEvent({
        runId,
        taskId,
        fromState: 'WAITING_APPROVAL',
        toState: 'FAILED',
        reason: input?.reason,
      })
    )
    this.eventHub.publish(createTaskRejectedEvent(runId, taskId, input?.reason))

    const prevRunStatus = run.status
    const updatedRun: Run = {
      ...run,
      status: 'FAILED',
      updatedAt: new Date().toISOString(),
    }
    this.registry.updateRun(updatedRun)
    this.eventHub.publish(createRunStateChangedEvent(runId, prevRunStatus, 'FAILED'))
    this.eventHub.publish(createRunFailedEvent(runId, { reason: input?.reason }))

    return task
  }

  /**
   * Retrieves full details for a run.
   */
  public getRun(runId: string): RunDetailResponse {
    const run = this.registry.getRun(runId)
    if (!run) {
      throw new NotFoundError('Run', runId)
    }

    const contract = this.registry.getContract(run.contractId)
    if (!contract) {
      throw new NotFoundError('ExecutionContract', run.contractId)
    }

    const tasks = this.registry.listTasksForRun(runId)
    const recentEvents = this.registry.getEventsForRun(runId)

    return {
      run,
      contract,
      tasks,
      recentEvents,
    }
  }

  /**
   * Lists all known runs.
   */
  public listRuns(): readonly Run[] {
    return this.registry.listRuns()
  }

  /**
   * Retrieves task details.
   */
  public getTask(runId: string, taskId: string): TaskDetailResponse {
    const run = this.registry.getRun(runId)
    if (!run) {
      throw new NotFoundError('Run', runId)
    }

    const task = this.registry.getTask(taskId)
    if (!task || task.runId !== runId) {
      throw new NotFoundError('Task', taskId)
    }

    const mutation = this.registry.getMutation(taskId)
    const verification = this.registry.getVerification(taskId)
    const evidenceRef = this.registry.getEvidenceRef(taskId)
    const browserQa = this.registry.getBrowserQaResult(taskId)

    return {
      task,
      mutationSummary: mutation
        ? {
            allowedChanges: mutation.allowedChanges,
            unexpectedChanges: mutation.unexpectedChanges,
            headMutated: mutation.headMutated,
            isScopeCompliant: mutation.unexpectedChanges.length === 0 && !mutation.headMutated,
          }
        : undefined,
      verificationSummary: verification
        ? {
            status: verification.status,
            totalCommands: verification.commands.length,
            passedCommands: verification.commands.filter((c) => c.exitCode === 0).length,
            failedCommands: verification.commands.filter((c) => c.exitCode !== 0).length,
          }
        : undefined,
      browserQa,
      evidenceAvailable: evidenceRef !== undefined,
    }
  }

  /**
   * Retrieves sanitized evidence manifest and artifact index for a task.
   * Path traversal safe: Lookups are strictly keyed by registry reference.
   */
  public async getEvidence(runId: string, taskId: string): Promise<TaskEvidenceResponse> {
    const run = this.registry.getRun(runId)
    if (!run) {
      throw new NotFoundError('Run', runId)
    }

    const task = this.registry.getTask(taskId)
    if (!task || task.runId !== runId) {
      throw new NotFoundError('Task', taskId)
    }

    const evidenceRef = this.registry.getEvidenceRef(taskId)
    if (!evidenceRef) {
      throw new NotFoundError('Evidence', taskId)
    }

    const manifestRaw = await readFile(evidenceRef.manifestPath, 'utf8')
    const manifest = JSON.parse(manifestRaw) as EvidenceManifest

    return {
      runId,
      taskId,
      manifest,
      artifactFiles: evidenceRef.artifactFiles,
    }
  }

  /**
   * Retrieves the raw unified git diff patch for a task's evidence.
   * Traversal safe: uses the internal evidenceRef to locate diff.patch.
   */
  public async getEvidenceDiff(runId: string, taskId: string): Promise<TaskEvidenceDiffResponse> {
    const run = this.registry.getRun(runId)
    if (!run) {
      throw new NotFoundError('Run', runId)
    }

    const task = this.registry.getTask(taskId)
    if (!task || task.runId !== runId) {
      throw new NotFoundError('Task', taskId)
    }

    const evidenceRef = this.registry.getEvidenceRef(taskId)
    if (!evidenceRef) {
      throw new NotFoundError('Evidence', taskId)
    }

    const diffPath = join(evidenceRef.evidenceDir, 'diff.patch')
    try {
      const diff = await readFile(diffPath, 'utf8')
      // Cap at 1MB to prevent memory exhaustion
      const cappedDiff = diff.length > 1024 * 1024 ? diff.slice(0, 1024 * 1024) + '\n\n[Diff truncated at 1MB]' : diff
      return {
        runId,
        taskId,
        diff: cappedDiff,
      }
    } catch {
      return {
        runId,
        taskId,
        diff: '',
      }
    }
  }

  /**
   * Returns a state summary suitable for client bootstrapping.
   * Truthfully queries configured harness availability (cached for 5 seconds).
   */
  public async getStateSummary(): Promise<StateSummaryResponse> {
    const runs = this.registry.listRuns()
    const tasks: Task[] = []
    for (const run of runs) {
      tasks.push(...this.registry.listTasksForRun(run.id))
    }

    const now = Date.now()
    let harnessStatus = 'UNKNOWN'
    let harnessMessage: string | undefined

    if (this.cachedHarnessAvailability && now - this.cachedHarnessAvailability.timestamp < 5000) {
      harnessStatus = this.cachedHarnessAvailability.status
      harnessMessage = this.cachedHarnessAvailability.message
    } else {
      try {
        const avail = await this.harness.availability()
        harnessStatus = avail.status
        harnessMessage = avail.message
        this.cachedHarnessAvailability = { status: avail.status, message: avail.message, timestamp: now }
      } catch (err) {
        harnessStatus = 'UNAVAILABLE'
        harnessMessage = err instanceof Error ? err.message : 'Availability check failed'
        this.cachedHarnessAvailability = { status: 'UNAVAILABLE', message: harnessMessage, timestamp: now }
      }
    }

    return {
      service: 'gravitas',
      version: GRAVITAS_VERSION,
      runs,
      tasks,
      harness: {
        id: this.harness.id,
        status: harnessStatus,
        ...(harnessMessage ? { message: harnessMessage } : {}),
      },
    }
  }

  /**
   * Compiles a prompt preview without executing a worker.
   *
   * If runId+taskId are provided: uses the authoritative stored contract.
   * RUNTIME_CONTEXT is omitted unless runtimeContextOverride is provided (no worktree exists yet).
   * Does NOT invoke the harness.
   */
  public previewPrompt(req: PromptPreviewRequest): PromptPreviewResponse {
    let contract: ExecutionContract | undefined
    let task: Task | undefined
    let storedProjectContext: ProjectPromptContext | undefined

    if (req.runId && req.taskId) {
      const run = this.registry.getRun(req.runId)
      if (!run) {
        throw new NotFoundError('Run', req.runId)
      }
      contract = this.registry.getContract(run.contractId)
      if (!contract) {
        throw new NotFoundError('ExecutionContract', run.contractId)
      }
      task = this.registry.getTask(req.taskId)
      if (!task || task.runId !== req.runId) {
        throw new NotFoundError('Task', req.taskId)
      }
      storedProjectContext = this.registry.getProjectContext(req.runId)
    } else {
      throw new InvalidRequestError(
        'INVALID_PREVIEW_REQUEST',
        'POST /api/v1/prompts/preview requires runId and taskId (referencing an existing run/task).'
      )
    }

    // Merge project contexts: inline request overrides stored run context
    const effectiveProjectContext = req.projectContext ?? storedProjectContext

    // Runtime context only if explicitly provided (no worktree allocated for preview)
    const runtimeContext = req.runtimeContextOverride
      ? {
          runId: req.runId ?? '',
          taskId: req.taskId ?? '',
          worktreePath: req.runtimeContextOverride.worktreePath ?? '(not yet allocated)',
          taskBranch: req.runtimeContextOverride.taskBranch ?? '(not yet allocated)',
          baseSha: req.runtimeContextOverride.baseSha ?? '(unknown)',
          allowedPaths: req.runtimeContextOverride.allowedPaths ?? contract?.constraints ?? [],
          harnessId: req.runtimeContextOverride.harnessId ?? this.harness.id,
          compiledAt: req.runtimeContextOverride.compiledAt ?? new Date().toISOString(),
        }
      : undefined

    const compiled = compilePrompt({
      projectContext: effectiveProjectContext,
      contract,
      task,
      role: req.role,
      runtimeContext,
    })

    return {
      compiledPrompt: compiled.text,
      byteLength: compiled.byteLength,
      sha256: compiled.sha256,
      compilerVersion: compiled.compilerVersion,
      globalPolicyVersion: compiled.globalPolicyVersion,
      roleTemplateVersion: compiled.roleTemplateVersion,
      roleUsed: compiled.roleUsed,
      compiledAt: compiled.compiledAt,
      runtimeContextIncluded: compiled.includedLayers.includes('RUNTIME_CONTEXT'),
      layers: compiled.layerMetadata.map((meta) => ({
        name: meta.name,
        included: meta.included,
        source: meta.source,
        byteLength: meta.byteLength,
        // Reconstruct per-layer text from the full compiled text for preview.
        // Safe: compiled text contains only managed policy + explicit user input, no secrets.
        text: meta.included ? `[included — ${meta.byteLength} bytes]` : '[not included]',
      })),
    }
  }

  /**
   * Retrieves the compiled prompt metadata for a task.
   * Returns a 404-equivalent response if no prompt has been compiled yet.
   */
  public getTaskPrompt(runId: string, taskId: string): TaskPromptResponse {
    const run = this.registry.getRun(runId)
    if (!run) {
      throw new NotFoundError('Run', runId)
    }

    const task = this.registry.getTask(taskId)
    if (!task || task.runId !== runId) {
      throw new NotFoundError('Task', taskId)
    }

    const compiledPrompt = this.registry.getCompiledPrompt(taskId)

    if (!compiledPrompt) {
      return { runId, taskId, compiled: false }
    }

    return {
      runId,
      taskId,
      compiled: true,
      prompt: {
        sha256: compiledPrompt.sha256,
        byteLength: compiledPrompt.byteLength,
        compilerVersion: compiledPrompt.compilerVersion,
        globalPolicyVersion: compiledPrompt.globalPolicyVersion,
        roleTemplateVersion: compiledPrompt.roleTemplateVersion,
        roleUsed: compiledPrompt.roleUsed,
        compiledAt: compiledPrompt.compiledAt,
        includedLayers: compiledPrompt.includedLayers,
        layerMetadata: compiledPrompt.layerMetadata,
        text: compiledPrompt.text,
      },
    }
  }

  /**
   * Retrieves Browser QA verification results for a task.
   */
  public getBrowserQa(runId: string, taskId: string): BrowserQaResult | undefined {
    const run = this.registry.getRun(runId)
    if (!run) {
      throw new NotFoundError('Run', runId)
    }

    const task = this.registry.getTask(taskId)
    if (!task || task.runId !== runId) {
      throw new NotFoundError('Task', taskId)
    }

    return this.registry.getBrowserQaResult(taskId)
  }

  /**
   * Lists all agents registered in the Capability Registry V0.
   */
  public listAgents(): readonly AgentDescriptor[] {
    return this.registry.getAgentRegistry().list()
  }

  /**
   * Lists canonical capability vocabulary.
   */
  public listCapabilities(): readonly AgentCapability[] {
    return CANONICAL_CAPABILITIES
  }
}
