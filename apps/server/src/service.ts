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
  type ExecutionContract,
  type GravitasEvent,
  type Run,
  type Task,
} from '@gravitas/core'
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
  InvalidRequestError,
  NotFoundError,
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
    const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

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

    const now = new Date().toISOString()

    const task: Task = {
      id: taskId,
      runId,
      title: `Execute: ${input.goal.slice(0, 60)}`,
      objective: input.goal,
      state: 'READY',
      dependencies: [],
      acceptanceCriteria: contract.acceptanceCriteria,
      requiresApproval: input.requiresApproval ?? true,
      createdAt: now,
      updatedAt: now,
    }
    this.registry.addTask(task)

    const run: Run = {
      id: runId,
      goal: input.goal,
      status: 'PENDING',
      contractId,
      taskIds: [taskId],
      createdAt: now,
      updatedAt: now,
    }
    this.registry.addRun(run)

    if (input.verificationPlan) {
      this.registry.setVerificationPlan(runId, input.verificationPlan)
    }

    // Publish creation events through EventHub
    this.eventHub.publish(createRunCreatedEvent(run))
    this.eventHub.publish(createExecutionContractCreatedEvent(runId, contract))
    this.eventHub.publish(createTaskCreatedEvent(task))

    return {
      runId,
      contractId,
      tasks: [task],
      run,
    }
  }

  /**
   * Executes the Golden Loop for a given run's single task.
   */
  public async executeRun(runId: string, options?: ExecuteRunOptions | undefined): Promise<Task> {
    const run = this.registry.getRun(runId)
    if (!run) {
      throw new NotFoundError('Run', runId)
    }

    const tasks = this.registry.listTasksForRun(runId)
    const task = tasks[0]
    if (!task) {
      throw new InvalidRequestError('NO_TASKS', `Run '${runId}' has no tasks to execute.`)
    }

    if (task.state !== 'READY') {
      throw new TaskStateConflictError(`Task '${task.id}' is in '${task.state}' state, expected 'READY'.`)
    }

    let currentTask: Task = task

    const contract = this.registry.getContract(run.contractId)
    const repository = contract?.repository ?? this.defaultRepository
    if (!repository) {
      throw new InvalidRequestError('MISSING_REPOSITORY', 'No repository path found for run execution.')
    }

    const runtimeRoot = options?.runtimeRoot ?? this.runtimeRoot
    const baseBranch = contract?.baseBranch ?? 'HEAD'

    // Transition run to RUNNING
    const prevRunStatus = run.status
    this.registry.updateRun({ ...run, status: 'RUNNING', updatedAt: new Date().toISOString() })
    this.eventHub.publish(createRunStateChangedEvent(run.id, prevRunStatus, 'RUNNING'))

    // 1. Allocate isolated task worktree
    const worktreeAlloc = await allocateWorktree({
      repository,
      runId: run.id,
      taskId: currentTask.id,
      baseRef: baseBranch,
      runtimeRoot,
    })

    let cleanupWorktree = true

    try {
      // 2. Take pre-execution snapshot
      const beforeSnapshot = await takeWorktreeSnapshot(worktreeAlloc.worktreePath)

      // 3. Task transitions READY -> RUNNING
      const prevTaskState = currentTask.state
      currentTask = { ...currentTask, state: 'RUNNING', updatedAt: new Date().toISOString() }
      this.registry.updateTask(currentTask)
      this.eventHub.publish(
        createTaskStateChangedEvent({
          runId: run.id,
          taskId: currentTask.id,
          fromState: prevTaskState,
          toState: 'RUNNING',
        })
      )
      this.eventHub.publish(createWorkerStartedEvent(run.id, currentTask.id, { harnessId: this.harness.id }))

      // 4. Invoke Worker Harness
      const promptText = currentTask.objective
      const executionResult = await this.harness.execute({
        executionId: generateEventId('exec'),
        runId: run.id,
        taskId: currentTask.id,
        worktreePath: worktreeAlloc.worktreePath,
        compiledPrompt: promptText,
        permissions: { allowFileEdits: true },
        timeoutMs: options?.timeoutMs ?? 60000,
      })

      this.eventHub.publish(
        createWorkerFinishedEvent(run.id, currentTask.id, {
          exitCode: executionResult.exitCode,
          terminationReason: executionResult.terminationReason,
          durationMs: executionResult.durationMs,
        })
      )

      // 5. Capture Worktree Mutation
      const allowedPaths = contract?.constraints ?? []
      const mutation = await captureWorktreeMutation(
        worktreeAlloc.worktreePath,
        beforeSnapshot,
        allowedPaths
      )
      this.registry.setMutation(currentTask.id, mutation)

      // 6. Transition Task RUNNING -> VERIFYING
      currentTask = { ...currentTask, state: 'VERIFYING', updatedAt: new Date().toISOString() }
      this.registry.updateTask(currentTask)
      this.eventHub.publish(
        createTaskStateChangedEvent({
          runId: run.id,
          taskId: currentTask.id,
          fromState: 'RUNNING',
          toState: 'VERIFYING',
        })
      )
      this.eventHub.publish(createVerificationStartedEvent(run.id, currentTask.id))

      // 7. Execute Independent Verifier
      const plan =
        this.registry.getVerificationPlan(run.id) ??
        this.defaultVerificationPlan ?? {
          id: 'plan_default',
          commands: [
            {
              id: 'cmd_default_check',
              executable: process.execPath,
              args: ['-e', 'process.exit(0)'],
              mandatory: true,
            },
          ],
        }

      const verification = await executeVerification({
        worktreePath: worktreeAlloc.worktreePath,
        plan,
      })
      this.registry.setVerification(currentTask.id, verification)

      const passedCommands = verification.commands.filter((c) => c.exitCode === 0).length
      const failedCommands = verification.commands.filter((c) => c.exitCode !== 0).length

      this.eventHub.publish(
        createVerificationFinishedEvent(run.id, currentTask.id, {
          status: verification.status,
          totalCommands: verification.commands.length,
          passedCommands,
          failedCommands,
        })
      )

      // 8. Apply Verification Outcome
      const outcome = applyVerificationOutcome({
        task: currentTask,
        mutation,
        verification,
      })
      currentTask = outcome.task
      this.registry.updateTask(currentTask)

      // 9. Write Evidence Bundle
      const promptHash = createHash('sha256').update(promptText).digest('hex')
      const bundleResult = await writeEvidenceBundle({
        runtimeRoot,
        runId: run.id,
        taskId: currentTask.id,
        goal: run.goal,
        repositoryPath: repository,
        baseBranch,
        baseSha: worktreeAlloc.baseSha,
        taskBranch: worktreeAlloc.branch,
        worktreePath: worktreeAlloc.worktreePath,
        worker: {
          harnessId: this.harness.id,
          executionId: executionResult.executionId,
          exitCode: executionResult.exitCode,
          terminationReason: executionResult.terminationReason,
          durationMs: executionResult.durationMs,
          promptSha256: promptHash,
          rawResult: executionResult,
        },
        mutation,
        verification,
        finalTaskState: currentTask.state,
      })

      const evidenceRef: TaskEvidenceRef = {
        runId: run.id,
        taskId: currentTask.id,
        evidenceDir: bundleResult.bundleDir,
        manifestPath: join(bundleResult.bundleDir, 'evidence-manifest.json'),
        artifactFiles: Object.keys(bundleResult.artifactPaths),
        createdAt: new Date().toISOString(),
      }
      this.registry.setEvidenceRef(currentTask.id, evidenceRef)
      this.eventHub.publish(
        createEvidenceCreatedEvent(run.id, currentTask.id, {
          bundleDir: bundleResult.bundleDir,
          manifestSha256: bundleResult.manifestSha256,
        })
      )

      // 10. Emit State Change & Trigger Events
      this.eventHub.publish(outcome.event)

      if (currentTask.state === 'WAITING_APPROVAL') {
        this.eventHub.publish(createApprovalRequiredEvent(run.id, currentTask.id))
        this.registry.updateRun({ ...run, status: 'WAITING_APPROVAL', updatedAt: new Date().toISOString() })
        this.eventHub.publish(createRunStateChangedEvent(run.id, 'RUNNING', 'WAITING_APPROVAL'))
      } else if (currentTask.state === 'SUCCEEDED') {
        this.registry.updateRun({ ...run, status: 'COMPLETED', updatedAt: new Date().toISOString() })
        this.eventHub.publish(createRunStateChangedEvent(run.id, 'RUNNING', 'COMPLETED'))
        this.eventHub.publish(createRunCompletedEvent(run.id))
      } else if (currentTask.state === 'FAILED') {
        this.registry.updateRun({ ...run, status: 'FAILED', updatedAt: new Date().toISOString() })
        this.eventHub.publish(createRunStateChangedEvent(run.id, 'RUNNING', 'FAILED'))
        this.eventHub.publish(createRunFailedEvent(run.id, { reason: verification.failureReason }))
      }

      return currentTask
    } catch (err) {
      cleanupWorktree = false
      throw err
    } finally {
      if (cleanupWorktree) {
        try {
          await removeWorktree(worktreeAlloc.worktreePath)
        } catch {
          // Best effort cleanup — uncommitted changes or failure preserved
        }
      }
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
}
