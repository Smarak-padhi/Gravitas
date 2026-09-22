/**
 * Bounded Concurrency Dependency DAG Scheduler for @gravitas/orchestrator.
 *
 * Invariants:
 * 1. Bounded concurrency: at most `maxConcurrency` tasks actively executing.
 * 2. Event-driven: zero busy-polling loops. Coordinates via async wakeup signals.
 * 3. Worktree isolation: each task gets an isolated worktree composed from upstream parent commits.
 * 4. Human approval gate: WAITING_APPROVAL tasks do NOT unblock dependencies until approved.
 * 5. Deterministic failure propagation: upstream failure cancels downstream tasks (DEPENDENCY_FAILED).
 * 6. Verified result commits: engine creates commits upon verification / approval.
 */

import { join } from 'node:path'
import {
  applyVerificationOutcome,
  executeVerification,
  writeEvidenceBundle,
  type VerificationPlan,
} from '@gravitas/verifier'
import {
  captureWorktreeMutation,
  takeWorktreeSnapshot,
  type AgentHarness,
  type MutationCapture,
} from '@gravitas/harnesses'
import {
  compilePrompt,
  type ManagedCompiledPrompt,
} from '@gravitas/prompts'
import {
  createApprovalRequiredEvent,
  createEvidenceCreatedEvent,
  createRunPlanCreatedEvent,
  createTaskApprovedEvent,
  createTaskCompositionConflictEvent,
  createTaskCreatedEvent,
  createTaskReadyEvent,
  createTaskRejectedEvent,
  createTaskResultMaterializedEvent,
  createTaskScheduledEvent,
  createTaskStateChangedEvent,
  createWorkerFinishedEvent,
  createWorkerStartedEvent,
  createVerificationFinishedEvent,
  createVerificationStartedEvent,
  createBrowserQaStartedEvent,
  createBrowserQaCompletedEvent,
  createBrowserQaFailedEvent,
  createRouteSelectedEvent,
  createGatewayRouteStartedEvent,
  createGatewayRouteCompletedEvent,
  createGatewayRouteFailedEvent,
  createTransportFallbackOccurredEvent,
  createArtifactRef,
  createTaskHandoff,
  validateArtifactCustody,
  evaluateTaskReadiness,
  generateEventId,
  isTerminalState,
  transitionTask,
  type AgentRoleId,
  type BrowserQaResult,
  type ExecutionContract,
  type GravitasEvent,
  type IndependentReviewResult,
  type IntegrationPreparationResult,
  type RoleAssignment,
  type RunStatus,
  type Task,
  type TaskArtifactRef,
  type TaskDependency,
  type TaskHandoff,
  type TaskRoleRequirement,
  type TaskState,
} from '@gravitas/core'
import { executeGit, removeWorktree, type WorktreeAllocation } from '@gravitas/git'
import { executeBrowserQa } from '@gravitas/browser-qa'
import type { AgentRegistry } from '@gravitas/agents'
import {
  InferenceRouter,
  type GatewayRegistry,
  type ResolvedInferenceRoute,
} from '@gravitas/gateways'
import { composeTaskWorktree, materializeVerifiedResult } from './composition.js'
import { CompositionConflictError, OrchestratorExecutionError } from './errors.js'
import type { OrchestratorResult, RunPlan, SchedulerTelemetry, TaskPlanDefinition } from './types.js'
import { extractDependencyIds, validateRunPlan } from './validator.js'

export interface BoundedSchedulerOptions {
  readonly runId: string
  readonly plan: RunPlan
  readonly repositoryRoot: string
  readonly baseBranch: string
  readonly runtimeRoot: string
  readonly harness: AgentHarness
  readonly defaultVerificationPlan?: VerificationPlan | undefined
  readonly onEvent: (event: GravitasEvent) => void
  readonly onTaskUpdated?: ((task: Task) => void) | undefined
  readonly onMutation?: ((taskId: string, mutation: MutationCapture) => void) | undefined
  readonly onVerification?: ((taskId: string, verification: any) => void) | undefined
  readonly onEvidence?: ((taskId: string, evidenceRef: any) => void) | undefined
  readonly onCompiledPrompt?: ((taskId: string, prompt: ManagedCompiledPrompt) => void) | undefined
  readonly onBrowserQa?: ((taskId: string, qaResult: BrowserQaResult) => void) | undefined
  readonly onRouteResolved?: ((taskId: string, route: ResolvedInferenceRoute) => void) | undefined
  readonly onHandoffUpdated?: ((handoff: TaskHandoff) => void) | undefined
  readonly onArtifactCreated?: ((artifact: TaskArtifactRef) => void) | undefined
  readonly agentRegistry?: AgentRegistry | undefined
  readonly gatewayRegistry?: GatewayRegistry | undefined
  readonly router?: InferenceRouter | undefined
  readonly autoPauseOnWaitingApproval?: boolean | undefined
}

export class BoundedScheduler {
  public readonly runId: string
  public readonly plan: RunPlan
  public readonly maxConcurrency: number

  private readonly autoPauseOnWaitingApproval: boolean

  private readonly repositoryRoot: string
  private readonly baseBranch: string
  private readonly runtimeRoot: string
  private readonly harness: AgentHarness
  private readonly defaultVerificationPlan?: VerificationPlan | undefined
  private readonly onEvent: (event: GravitasEvent) => void
  private readonly onTaskUpdated?: ((task: Task) => void) | undefined
  private readonly onMutation?: ((taskId: string, mutation: MutationCapture) => void) | undefined
  private readonly onVerification?: ((taskId: string, verification: any) => void) | undefined
  private readonly onEvidence?: ((taskId: string, evidenceRef: any) => void) | undefined
  private readonly onCompiledPrompt?: ((taskId: string, prompt: ManagedCompiledPrompt) => void) | undefined
  private readonly onBrowserQa?: ((taskId: string, qaResult: BrowserQaResult) => void) | undefined
  private readonly onRouteResolved?: ((taskId: string, route: ResolvedInferenceRoute) => void) | undefined
  private readonly agentRegistry?: AgentRegistry | undefined
  private readonly gatewayRegistry?: GatewayRegistry | undefined
  private readonly router?: InferenceRouter | undefined
  private readonly onHandoffUpdated?: ((handoff: TaskHandoff) => void) | undefined
  private readonly onArtifactCreated?: ((artifact: TaskArtifactRef) => void) | undefined

  private readonly tasks = new Map<string, Task>()
  private readonly taskDefinitions = new Map<string, TaskPlanDefinition>()
  private readonly handoffs = new Map<string, TaskHandoff>()
  private readonly artifacts = new Map<string, TaskArtifactRef>()
  private readonly reviewResults = new Map<string, IndependentReviewResult>()
  private readonly integrationResults = new Map<string, IntegrationPreparationResult>()

  private readonly readyQueue: string[] = []
  private readonly activeTasks = new Map<string, Promise<void>>()
  private readonly activeAllocations = new Map<string, WorktreeAllocation>()
  private readonly materializedCommits = new Map<string, string>() // taskId -> commitSha
  private readonly waitingApprovalTasks = new Set<string>()
  private readonly failedTasks = new Set<string>()
  private readonly cancelledTasks = new Set<string>()
  private readonly succeededTasks = new Set<string>()
  private readonly approvedTasks = new Set<string>()

  private isRunning = false
  private isExecutionComplete = false
  private wakeUpResolvers: Array<() => void> = []

  public constructor(options: BoundedSchedulerOptions) {
    validateRunPlan(options.plan)

    this.runId = options.runId
    this.plan = options.plan
    this.maxConcurrency = options.plan.maxConcurrency ?? 2
    this.repositoryRoot = options.repositoryRoot
    this.baseBranch = options.baseBranch
    this.runtimeRoot = options.runtimeRoot
    this.harness = options.harness
    this.defaultVerificationPlan = options.defaultVerificationPlan
    this.onEvent = options.onEvent
    this.onTaskUpdated = options.onTaskUpdated
    this.onMutation = options.onMutation
    this.onVerification = options.onVerification
    this.onEvidence = options.onEvidence
    this.onCompiledPrompt = options.onCompiledPrompt
    this.onBrowserQa = options.onBrowserQa
    this.onRouteResolved = options.onRouteResolved
    this.onHandoffUpdated = options.onHandoffUpdated
    this.onArtifactCreated = options.onArtifactCreated
    this.agentRegistry = options.agentRegistry
    this.gatewayRegistry = options.gatewayRegistry
    this.router =
      options.router ??
      (options.gatewayRegistry
        ? new InferenceRouter({ registry: options.gatewayRegistry })
        : undefined)
    this.autoPauseOnWaitingApproval = options.autoPauseOnWaitingApproval ?? false

    this.initializeTasks()
  }

  /**
   * Initializes Task domain models and determines initial READY vs BLOCKED states.
   */
  private initializeTasks(): void {
    const now = new Date().toISOString()

    for (const taskDef of this.plan.tasks) {
      this.taskDefinitions.set(taskDef.id, taskDef)

      const depIds = extractDependencyIds(taskDef)
      const dependencies: TaskDependency[] = depIds.map((depId) => ({ taskId: depId }))

      const roleId = taskDef.roleId ?? (taskDef.role as AgentRoleId | undefined)
      const roleRequirement: TaskRoleRequirement | undefined =
        taskDef.roleRequirement ?? (roleId ? { requiredRoleId: roleId, reason: 'Declared in plan' } : undefined)
      const roleAssignment: RoleAssignment | undefined = roleId
        ? {
            taskId: taskDef.id,
            roleId,
            assignedAt: now,
            source: 'PLAN',
          }
        : undefined

      const task: Task = {
        id: taskDef.id,
        runId: this.runId,
        title: taskDef.title,
        objective: taskDef.objective,
        state: 'PLANNED',
        dependencies,
        acceptanceCriteria: taskDef.acceptanceCriteria ?? [],
        requiresApproval: taskDef.requiresApproval ?? true,
        ...(taskDef.role ? { role: taskDef.role } : {}),
        ...(roleRequirement ? { roleRequirement } : {}),
        ...(roleAssignment ? { roleAssignment } : {}),
        ...(taskDef.requiredCapabilities ? { requiredCapabilities: taskDef.requiredCapabilities } : {}),
        ...(taskDef.browserQa ? { browserQa: taskDef.browserQa } : {}),
        createdAt: now,
        updatedAt: now,
      }
      this.tasks.set(task.id, task)
    }

    // Build canonical TaskHandoff records
    for (const taskDef of this.plan.tasks) {
      const targetTaskId = taskDef.id
      const targetRole = taskDef.roleId ?? (taskDef.role as AgentRoleId | undefined)

      if (taskDef.reviewOfTaskId) {
        const sourceTaskId = taskDef.reviewOfTaskId
        const sourceDef = this.taskDefinitions.get(sourceTaskId)
        const sourceRole = sourceDef?.roleId ?? (sourceDef?.role as AgentRoleId | undefined)

        const handoff = createTaskHandoff({
          kind: 'REVIEW',
          sourceTaskId,
          targetTaskId,
          sourceRoleId: sourceRole,
          targetRoleId: targetRole,
          requiredArtifactIds: taskDef.requiredArtifacts ?? [],
          state: 'BLOCKED',
          reasonCode: 'REVIEW_REQUIRED',
        })
        this.handoffs.set(handoff.id, handoff)
      }

      const depIds = extractDependencyIds(taskDef)
      for (const depId of depIds) {
        if (taskDef.reviewOfTaskId === depId) continue

        const sourceDef = this.taskDefinitions.get(depId)
        const sourceRole = sourceDef?.roleId ?? (sourceDef?.role as AgentRoleId | undefined)
        const isIntegration = targetRole === 'role:integration:integration-engineer'

        const handoff = createTaskHandoff({
          kind: isIntegration ? 'INTEGRATION' : 'DEPENDENCY',
          sourceTaskId: depId,
          targetTaskId,
          sourceRoleId: sourceRole,
          targetRoleId: targetRole,
          requiredArtifactIds: taskDef.requiredArtifacts ?? [],
          state: 'BLOCKED',
          reasonCode: isIntegration ? 'INTEGRATION_PENDING' : 'UPSTREAM_PENDING',
        })
        this.handoffs.set(handoff.id, handoff)
      }
    }

    // Evaluate initial readiness: tasks with 0 dependencies become READY immediately
    for (const [id, task] of this.tasks.entries()) {
      const evaluation = evaluateTaskReadiness(task, (depId) => this.tasks.get(depId))
      const incomingHandoffs = this.getIncomingHandoffs(id)
      const allHandoffsSatisfied =
        incomingHandoffs.length === 0 || incomingHandoffs.every((h) => h.state === 'SATISFIED')

      let initialTask: Task
      if (evaluation.status === 'READY' && allHandoffsSatisfied) {
        initialTask = { ...task, state: 'READY', updatedAt: new Date().toISOString() }
        this.readyQueue.push(id)
      } else {
        initialTask = { ...task, state: 'BLOCKED', updatedAt: new Date().toISOString() }
      }
      this.tasks.set(id, initialTask)
    }

    // Sort ready queue by task ID for deterministic ordering
    this.readyQueue.sort()
  }

  public getHandoffs(): readonly TaskHandoff[] {
    return Object.freeze(Array.from(this.handoffs.values()))
  }

  public getArtifacts(): readonly TaskArtifactRef[] {
    return Object.freeze(Array.from(this.artifacts.values()))
  }

  public getReviewResults(): readonly IndependentReviewResult[] {
    return Object.freeze(Array.from(this.reviewResults.values()))
  }

  public getIntegrationResults(): readonly IntegrationPreparationResult[] {
    return Object.freeze(Array.from(this.integrationResults.values()))
  }

  public getIncomingHandoffs(taskId: string): readonly TaskHandoff[] {
    const list: TaskHandoff[] = []
    for (const handoff of this.handoffs.values()) {
      if (handoff.targetTaskId === taskId) {
        list.push(handoff)
      }
    }
    return Object.freeze(list)
  }

  public getOutgoingHandoffs(taskId: string): readonly TaskHandoff[] {
    const list: TaskHandoff[] = []
    for (const handoff of this.handoffs.values()) {
      if (handoff.sourceTaskId === taskId) {
        list.push(handoff)
      }
    }
    return Object.freeze(list)
  }

  public recordReviewResult(result: IndependentReviewResult): void {
    this.reviewResults.set(result.reviewerTaskId, result)
    for (const [hId, handoff] of this.handoffs.entries()) {
      if (handoff.kind === 'REVIEW' && handoff.sourceTaskId === result.reviewedTaskId) {
        if (result.verdict === 'PASS') {
          const updated: TaskHandoff = {
            ...handoff,
            state: 'SATISFIED',
            reasonCode: 'REVIEW_PASSED',
          }
          this.handoffs.set(hId, updated)
          this.onHandoffUpdated?.(updated)
        } else if (result.verdict === 'CHANGES_REQUIRED') {
          const updated: TaskHandoff = {
            ...handoff,
            state: 'FAILED',
            reasonCode: 'REVIEW_CHANGES_REQUIRED',
            details: result.findings.map((f) => `[${f.severity}] ${f.message}`).join('; '),
          }
          this.handoffs.set(hId, updated)
          this.onHandoffUpdated?.(updated)
        } else if (result.verdict === 'BLOCKED') {
          const updated: TaskHandoff = {
            ...handoff,
            state: 'BLOCKED',
            reasonCode: 'REVIEW_BLOCKED',
            details: result.findings.map((f) => `[${f.severity}] ${f.message}`).join('; '),
          }
          this.handoffs.set(hId, updated)
          this.onHandoffUpdated?.(updated)
        }
      }
    }
  }

  public recordIntegrationResult(result: IntegrationPreparationResult): void {
    this.integrationResults.set(result.integrationTaskId, result)
    if (result.disposition === 'CONFLICT') {
      for (const [hId, handoff] of this.handoffs.entries()) {
        if (handoff.targetTaskId === result.integrationTaskId) {
          const updated: TaskHandoff = {
            ...handoff,
            state: 'FAILED',
            reasonCode: 'INTEGRATION_CONFLICT',
            details: `Conflict in files: ${result.conflictFiles.join(', ')}`,
          }
          this.handoffs.set(hId, updated)
          this.onHandoffUpdated?.(updated)
        }
      }
    }
  }

  /**
   * Returns current scheduler telemetry snapshot.
   */
  public getTelemetry(): SchedulerTelemetry {
    return {
      maxConcurrency: this.maxConcurrency,
      activeCount: this.activeTasks.size,
      readyCount: this.readyQueue.length,
      waitingApprovalCount: this.waitingApprovalTasks.size,
      completedCount: this.succeededTasks.size + this.approvedTasks.size,
      failedCount: this.failedTasks.size,
      cancelledCount: this.cancelledTasks.size,
    }
  }

  public getGatewayRegistry(): GatewayRegistry | undefined {
    return this.gatewayRegistry
  }

  public getRouter(): InferenceRouter | undefined {
    return this.router
  }

  public getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId)
  }

  public listTasks(): readonly Task[] {
    return Array.from(this.tasks.values())
  }

  public getMaterializedCommits(): Readonly<Record<string, string>> {
    const result: Record<string, string> = {}
    for (const [taskId, sha] of this.materializedCommits.entries()) {
      result[taskId] = sha
    }
    return Object.freeze(result)
  }

  public get isComplete(): boolean {
    return this.isExecutionComplete
  }

  /**
   * Wake up the event loop when state changes (task completion, approval, rejection).
   */
  private wakeUp(): void {
    const resolvers = this.wakeUpResolvers
    this.wakeUpResolvers = []
    for (const resolve of resolvers) {
      resolve()
    }
  }

  /**
   * Waits for the next scheduling event signal (event-driven, no busy waiting).
   */
  private async waitForSignal(): Promise<void> {
    return new Promise((resolve) => {
      this.wakeUpResolvers.push(resolve)
    })
  }

  /**
   * Checks if all tasks have reached a terminal state.
   */
  private isAllTerminal(): boolean {
    for (const task of this.tasks.values()) {
      if (!isTerminalState(task.state)) {
        return false
      }
    }
    return true
  }

  /**
   * Main orchestrator execution loop.
   */
  public async execute(): Promise<OrchestratorResult> {
    if (this.isRunning) {
      throw new OrchestratorExecutionError(`Run '${this.runId}' is already executing.`)
    }
    this.isRunning = true

    // 1. Emit RUN_PLAN_CREATED
    this.onEvent(
      createRunPlanCreatedEvent(this.runId, {
        taskCount: this.tasks.size,
        maxConcurrency: this.maxConcurrency,
        initialReadyCount: this.readyQueue.length,
      })
    )

    // 2. Emit initial TASK_CREATED and TASK_READY events
    for (const task of this.tasks.values()) {
      this.onEvent(createTaskCreatedEvent(task))
      if (task.state === 'READY') {
        this.onEvent(createTaskReadyEvent(this.runId, task.id))
      }
    }

    // 3. Scheduling loop
    while (!this.isAllTerminal()) {
      // Dispatch ready tasks up to maxConcurrency
      while (this.activeTasks.size < this.maxConcurrency && this.readyQueue.length > 0) {
        const nextTaskId = this.readyQueue.shift()!
        const slot = this.activeTasks.size + 1
        this.onEvent(createTaskScheduledEvent(this.runId, nextTaskId, slot))
        this.dispatchTask(nextTaskId)
      }

      if (this.isAllTerminal()) {
        break
      }

      // If auto-pause is enabled and all currently active slots are idle while waiting approval
      if (
        this.autoPauseOnWaitingApproval &&
        this.activeTasks.size === 0 &&
        this.readyQueue.length === 0 &&
        this.waitingApprovalTasks.size > 0
      ) {
        break
      }

      // If active tasks are running, wait for any to complete or wake up signal
      if (this.activeTasks.size > 0 || this.waitingApprovalTasks.size > 0) {
        await this.waitForSignal()
      } else {
        // No active tasks and no waiting approvals, but not all terminal?
        // Check if remaining tasks are blocked/unsatisfiable
        this.evaluateRemainingTasks()
        if (this.readyQueue.length === 0 && this.activeTasks.size === 0) {
          break
        }
      }
    }

    this.isExecutionComplete = true
    this.isRunning = false

    // Determine final aggregated run status
    let finalStatus: RunStatus = 'COMPLETED'
    if (this.failedTasks.size > 0) {
      finalStatus = 'FAILED'
    } else if (this.cancelledTasks.size > 0) {
      finalStatus = 'CANCELLED'
    } else if (this.waitingApprovalTasks.size > 0) {
      finalStatus = 'WAITING_APPROVAL'
    }

    return {
      runId: this.runId,
      status: finalStatus,
      tasks: Array.from(this.tasks.values()),
      materializedCommits: this.getMaterializedCommits(),
      handoffs: this.getHandoffs(),
      artifacts: this.getArtifacts(),
      reviewResults: this.getReviewResults(),
      integrationResults: this.getIntegrationResults(),
    }
  }

  /**
   * Dispatches a single READY task to execute asynchronously.
   */
  private dispatchTask(taskId: string): void {
    const taskPromise = this.runSingleTask(taskId)
      .catch((err) => {
        // Unexpected error during task execution
        this.handleTaskCrash(taskId, err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        this.activeTasks.delete(taskId)
        this.wakeUp()
      })

    this.activeTasks.set(taskId, taskPromise)
  }

  /**
   * Executes the complete Golden Loop for a single task within an isolated worktree.
   */
  private async runSingleTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId)
    if (!task) return

    const taskDef = this.taskDefinitions.get(taskId)
    const depIds = extractDependencyIds(taskDef ?? { id: taskId, title: task.title, objective: task.objective })

    // Resolve parent commit SHAs from dependencies
    const parentCommitShas: string[] = []
    for (const depId of depIds) {
      const commitSha = this.materializedCommits.get(depId)
      if (commitSha) {
        parentCommitShas.push(commitSha)
      }
    }

    // 1. Task transitions READY -> RUNNING
    this.updateTaskState(taskId, 'RUNNING', 'Dispatched: composing worktree and preparing execution')

    // 1b. Verify agent capabilities if AgentRegistry is provided
    if (this.agentRegistry && taskDef?.requiredCapabilities && taskDef.requiredCapabilities.length > 0) {
      try {
        this.agentRegistry.requestGrant({
          taskId,
          requiredCapabilities: taskDef.requiredCapabilities,
          role: taskDef.role,
        })
      } catch (grantErr) {
        this.handleTaskCrash(taskId, `Capability grant refused: ${(grantErr as Error).message}`)
        return
      }
    }

    // 2. Compose / Allocate Worktree
    let worktreeAlloc: WorktreeAllocation
    try {
      worktreeAlloc = await composeTaskWorktree({
        repositoryRoot: this.repositoryRoot,
        runId: this.runId,
        taskId: task.id,
        baseRef: this.baseBranch,
        parentCommitShas,
        runtimeRoot: this.runtimeRoot,
      })
      this.activeAllocations.set(taskId, worktreeAlloc)
    } catch (err) {
      if (err instanceof CompositionConflictError) {
        this.onEvent(
          createTaskCompositionConflictEvent(this.runId, taskId, {
            parentCommitShas: err.parentCommitShas,
            conflictDetails: err.conflictDetails,
          })
        )
        this.failTask(taskId, 'COMPOSITION_CONFLICT')
        return
      }
      this.failTask(taskId, `Worktree allocation error: ${err instanceof Error ? err.message : String(err)}`)
      return
    }

    try {
      // 3. Pre-execution snapshot
      const beforeSnapshot = await takeWorktreeSnapshot(worktreeAlloc.worktreePath)
      this.onEvent(createWorkerStartedEvent(this.runId, taskId, { harnessId: this.harness.id }))

      // 4. Compile managed prompt
      const compiledAt = new Date().toISOString()
      const dummyContract: ExecutionContract = {
        version: '1.0.0',
        goal: this.plan.goal,
        repository: this.repositoryRoot,
        baseBranch: this.baseBranch,
        constraints: this.plan.constraints ?? [],
        acceptanceCriteria: task.acceptanceCriteria,
        requiredEvidence: taskDef?.requiredEvidence ?? [],
      }

      const managedPrompt = compilePrompt({
        projectContext: this.plan.projectContext,
        contract: dummyContract,
        task: this.tasks.get(taskId)!,
        role: task.role ?? 'IMPLEMENTER',
        runtimeContext: {
          runId: this.runId,
          taskId,
          worktreePath: worktreeAlloc.worktreePath,
          taskBranch: worktreeAlloc.branch,
          baseSha: worktreeAlloc.baseSha,
          allowedPaths: this.plan.constraints ?? [],
          harnessId: this.harness.id,
          compiledAt,
        },
      })
      this.onCompiledPrompt?.(taskId, managedPrompt)

      // 4b. Deterministic route resolution (Wave 11.3)
      const workerIdentity = `${this.harness.id}@${(this.harness as any).cachedVersion ?? '1.0.0'}`
      let resolvedRoute: ResolvedInferenceRoute = {
        workerId: this.harness.id,
        workerQualificationIdentity: workerIdentity,
        transport: 'DIRECT',
        reason: 'DIRECT_DEFAULT',
        fallbackPolicy: 'GATEWAY_ONLY',
        routePolicyVersion: '1.0.0',
      }

      if (this.router) {
        resolvedRoute = await this.router.resolveRoute({
          workerId: this.harness.id,
          workerQualificationIdentity: workerIdentity,
          workerProtocol:
            taskDef?.inferenceRoute?.workerProtocol ??
            (this.harness.id === 'codex' ? 'openai_chat_completions' : undefined),
          requirement: taskDef?.inferenceRoute,
        })
      }

      this.onEvent(
        createRouteSelectedEvent(this.runId, taskId, {
          workerId: resolvedRoute.workerId,
          transport: resolvedRoute.transport,
          gatewayId: resolvedRoute.gatewayId ?? null,
          reason: resolvedRoute.reason,
          requestedProvider: resolvedRoute.requestedProvider ?? null,
          requestedModel: resolvedRoute.requestedModel ?? null,
          fallbackPolicy: resolvedRoute.fallbackPolicy,
          transportFallbackOccurred: resolvedRoute.transportFallbackOccurred ?? false,
        })
      )
      this.onRouteResolved?.(taskId, resolvedRoute)

      // If route resolution failed (e.g. GATEWAY_ONLY failure without direct fallback)
      if (
        resolvedRoute.transport === 'GATEWAY' &&
        (resolvedRoute.reason === 'GATEWAY_UNQUALIFIED' ||
          resolvedRoute.reason === 'GATEWAY_UNHEALTHY' ||
          resolvedRoute.reason === 'GATEWAY_INCOMPATIBLE' ||
          resolvedRoute.reason === 'NO_VALID_ROUTE')
      ) {
        this.onEvent(
          createGatewayRouteFailedEvent(this.runId, taskId, {
            gatewayId: resolvedRoute.gatewayId,
            reason: resolvedRoute.reason,
            message: `Inference gateway route rejected: ${resolvedRoute.reason}`,
          })
        )
        this.failTask(taskId, `GATEWAY_ROUTE_FAILED: ${resolvedRoute.reason}`)
        return
      }

      if (resolvedRoute.transport === 'GATEWAY') {
        this.onEvent(
          createGatewayRouteStartedEvent(this.runId, taskId, {
            gatewayId: resolvedRoute.gatewayId,
            requestedProvider: resolvedRoute.requestedProvider ?? null,
            requestedModel: resolvedRoute.requestedModel ?? null,
          })
        )
      } else if (resolvedRoute.transportFallbackOccurred) {
        this.onEvent(
          createTransportFallbackOccurredEvent(this.runId, taskId, {
            originalGatewayId: resolvedRoute.gatewayId ?? 'omniroute-local',
            fallbackTransport: 'DIRECT',
            reason: resolvedRoute.reason,
          })
        )
      }

      // 5. Execute harness
      const executionResult = await this.harness.execute({
        executionId: generateEventId('exec'),
        runId: this.runId,
        taskId,
        worktreePath: worktreeAlloc.worktreePath,
        compiledPrompt: managedPrompt.text,
        permissions: { allowFileEdits: true },
        timeoutMs: 60000,
        routeContext: resolvedRoute as any,
      })

      if (resolvedRoute.transport === 'GATEWAY') {
        if (executionResult.exitCode === 0) {
          this.onEvent(
            createGatewayRouteCompletedEvent(this.runId, taskId, {
              gatewayId: resolvedRoute.gatewayId,
              durationMs: executionResult.durationMs,
            })
          )
        } else {
          this.onEvent(
            createGatewayRouteFailedEvent(this.runId, taskId, {
              gatewayId: resolvedRoute.gatewayId,
              exitCode: executionResult.exitCode,
              terminationReason: executionResult.terminationReason,
            })
          )
        }
      }

      this.onEvent(
        createWorkerFinishedEvent(this.runId, taskId, {
          exitCode: executionResult.exitCode,
          terminationReason: executionResult.terminationReason,
          durationMs: executionResult.durationMs,
        })
      )

      // 6. Capture worktree mutation
      let allowedPaths = this.plan.constraints ?? []
      if (allowedPaths.length === 0) {
        // When plan has no file constraints, all worker modifications are permitted
        const statusCheck = await executeGit({
          cwd: worktreeAlloc.worktreePath,
          args: ['status', '--porcelain'],
        })
        const lines = statusCheck.stdout.split(/\r?\n/)
        const autoPaths: string[] = []
        for (const line of lines) {
          if (!line || line.length < 4) continue
          let filePath = line.slice(3).trim()
          if (filePath.includes(' -> ')) {
            filePath = filePath.split(' -> ')[1]?.trim() ?? filePath
          }
          if (filePath) autoPaths.push(filePath)
        }
        allowedPaths = autoPaths
      }

      const mutation = await captureWorktreeMutation(
        worktreeAlloc.worktreePath,
        beforeSnapshot,
        allowedPaths
      )
      this.onMutation?.(taskId, mutation)

      // 7. Transition to VERIFYING
      this.updateTaskState(taskId, 'VERIFYING', 'Agent execution finished; verifier starting')
      this.onEvent(createVerificationStartedEvent(this.runId, taskId))

      // 8. Execute independent verification
      const plan =
        taskDef?.verificationPlan ??
        this.plan.defaultVerificationPlan ??
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
      this.onVerification?.(taskId, verification)

      this.onEvent(
        createVerificationFinishedEvent(this.runId, taskId, {
          status: verification.status,
          totalCommands: verification.commands.length,
          passedCommands: verification.commands.filter((c) => c.exitCode === 0).length,
          failedCommands: verification.commands.filter((c) => c.exitCode !== 0).length,
        })
      )

      // 9. Apply verification outcome
      const currentTask = this.tasks.get(taskId)!
      const outcome = applyVerificationOutcome({
        task: currentTask,
        mutation,
        verification,
      })

      let finalTaskState = outcome.task.state
      let qaResult: BrowserQaResult | undefined

      if (outcome.task.state === 'FAILED') {
        // Deterministic verifier failed
        this.tasks.set(taskId, outcome.task)
        this.onTaskUpdated?.(outcome.task)
        this.onEvent(outcome.event)
      } else if (taskDef?.browserQa) {
        // Verifier passed, but Browser QA is required — task remains in VERIFYING during QA
        const browserQa = taskDef.browserQa
        this.onEvent(
          createBrowserQaStartedEvent(this.runId, taskId, {
            contractId: browserQa.id,
            actionCount: browserQa.actions.length,
          })
        )

        try {
          const qaScreenshotDir = join(
            this.runtimeRoot,
            'scratch',
            this.runId,
            taskId,
            'browser-qa-screenshots'
          )
          qaResult = await executeBrowserQa({
            taskId,
            contract: browserQa,
            screenshotDir: qaScreenshotDir,
            headless: true,
          })
          this.onBrowserQa?.(taskId, qaResult)

          if (qaResult.status === 'PASSED') {
            this.onEvent(createBrowserQaCompletedEvent(this.runId, taskId, qaResult))
            // Browser QA passed! Now transition to WAITING_APPROVAL / SUCCEEDED
            this.tasks.set(taskId, outcome.task)
            this.onTaskUpdated?.(outcome.task)
            this.onEvent(outcome.event)
          } else {
            this.onEvent(
              createBrowserQaFailedEvent(this.runId, taskId, {
                contractId: browserQa.id,
                error: qaResult.error ?? 'Browser QA verification failed',
                result: qaResult,
              })
            )
            finalTaskState = 'FAILED'
            const failedTask: Task = {
              ...outcome.task,
              state: 'FAILED',
              failureReason: `Browser QA verification rejected candidate: ${qaResult.error ?? 'Assertion failure'}`,
              updatedAt: new Date().toISOString(),
            }
            this.tasks.set(taskId, failedTask)
            this.onTaskUpdated?.(failedTask)
            this.onEvent(
              createTaskStateChangedEvent({
                runId: this.runId,
                taskId,
                fromState: 'VERIFYING',
                toState: 'FAILED',
                reason: failedTask.failureReason,
              })
            )
          }
        } catch (qaErr) {
          const errorMsg = (qaErr as Error).message || String(qaErr)
          this.onEvent(
            createBrowserQaFailedEvent(this.runId, taskId, {
              contractId: browserQa.id,
              error: errorMsg,
            })
          )
          finalTaskState = 'FAILED'
          const failedTask: Task = {
            ...outcome.task,
            state: 'FAILED',
            failureReason: `Browser QA execution error: ${errorMsg}`,
            updatedAt: new Date().toISOString(),
          }
          this.tasks.set(taskId, failedTask)
          this.onTaskUpdated?.(failedTask)
          this.onEvent(
            createTaskStateChangedEvent({
              runId: this.runId,
              taskId,
              fromState: 'VERIFYING',
              toState: 'FAILED',
              reason: failedTask.failureReason,
            })
          )
        }
      } else {
        // Verifier passed and no Browser QA required
        this.tasks.set(taskId, outcome.task)
        this.onTaskUpdated?.(outcome.task)
        this.onEvent(outcome.event)
      }

      // 10. Write evidence bundle
      const bundleResult = await writeEvidenceBundle({
        runtimeRoot: this.runtimeRoot,
        runId: this.runId,
        taskId,
        goal: this.plan.goal,
        repositoryPath: this.repositoryRoot,
        baseBranch: this.baseBranch,
        baseSha: worktreeAlloc.baseSha,
        taskBranch: worktreeAlloc.branch,
        worktreePath: worktreeAlloc.worktreePath,
        worker: {
          harnessId: this.harness.id,
          executionId: executionResult.executionId,
          exitCode: executionResult.exitCode,
          terminationReason: executionResult.terminationReason,
          durationMs: executionResult.durationMs,
          promptSha256: managedPrompt.sha256,
          compilerVersion: managedPrompt.compilerVersion,
          globalPolicyVersion: managedPrompt.globalPolicyVersion,
          roleTemplateVersion: managedPrompt.roleTemplateVersion,
          compiledPromptText: managedPrompt.text,
          rawResult: executionResult,
        },
        mutation,
        verification,
        finalTaskState,
        routeProvenance:
          executionResult.routeProvenance ??
          (resolvedRoute as unknown as Record<string, unknown>),
      })

      this.onEvidence?.(taskId, {
        runId: this.runId,
        taskId,
        evidenceDir: bundleResult.bundleDir,
        manifestPath: `${bundleResult.bundleDir}/evidence-manifest.json`,
        artifactFiles: Object.keys(bundleResult.artifactPaths),
        createdAt: new Date().toISOString(),
      })

      this.onEvent(
        createEvidenceCreatedEvent(this.runId, taskId, {
          bundleDir: bundleResult.bundleDir,
          manifestSha256: bundleResult.manifestSha256,
        })
      )

      // 11. Handle outcome state transitions (gated strictly on finalTaskState)
      if (finalTaskState === 'WAITING_APPROVAL') {
        this.waitingApprovalTasks.add(taskId)
        this.onEvent(createApprovalRequiredEvent(this.runId, taskId))
        // Note: Do NOT remove worktree yet! Worktree changes are needed for commit upon approval.
      } else if (finalTaskState === 'SUCCEEDED') {
        this.succeededTasks.add(taskId)
        // Materialize result commit immediately!
        const commitSha = await materializeVerifiedResult({
          worktreePath: worktreeAlloc.worktreePath,
          taskId,
        })
        this.materializedCommits.set(taskId, commitSha)
        this.onEvent(createTaskResultMaterializedEvent(this.runId, taskId, commitSha))

        this.registerTaskCompletion(taskId, commitSha)

        // Clean up worktree
        await this.cleanWorktree(taskId)

        // Evaluate downstream tasks
        this.unlockDownstreamTasks(taskId)
      } else if (finalTaskState === 'FAILED') {
        this.failedTasks.add(taskId)
        this.registerTaskFailure(taskId, 'FAILED')
        await this.cleanWorktree(taskId)
        this.propagateFailure(taskId, 'DEPENDENCY_FAILED')
      }
    } catch (err) {
      this.handleTaskCrash(taskId, err instanceof Error ? err.message : String(err))
    }
  }

  /**
   * Approves a task in WAITING_APPROVAL state.
   */
  public async approveTask(taskId: string, reviewer = 'local_operator'): Promise<Task> {
    const task = this.tasks.get(taskId)
    if (!task) {
      throw new OrchestratorExecutionError(`Task '${taskId}' not found.`)
    }
    if (task.state !== 'WAITING_APPROVAL') {
      throw new OrchestratorExecutionError(
        `Task '${taskId}' is in '${task.state}' state, expected 'WAITING_APPROVAL'.`
      )
    }

    const alloc = this.activeAllocations.get(taskId)
    let commitSha = alloc?.baseSha ?? 'unknown'

    // 1. Materialize verified result commit
    if (alloc) {
      try {
        commitSha = await materializeVerifiedResult({
          worktreePath: alloc.worktreePath,
          taskId,
        })
      } catch (err) {
        throw new OrchestratorExecutionError(
          `Failed to materialize verified result for '${taskId}': ${err instanceof Error ? err.message : String(err)}`
        )
      }
    }

    this.materializedCommits.set(taskId, commitSha)
    this.onEvent(createTaskResultMaterializedEvent(this.runId, taskId, commitSha))

    this.registerTaskCompletion(taskId, commitSha)

    // 2. Transition task to APPROVED
    this.waitingApprovalTasks.delete(taskId)
    this.approvedTasks.add(taskId)
    this.updateTaskState(taskId, 'APPROVED', `Approved by ${reviewer}`)
    this.onEvent(createTaskApprovedEvent(this.runId, taskId, { reviewer, commitSha }))

    // 3. Clean up worktree
    await this.cleanWorktree(taskId)

    // 4. Unlock downstream dependencies
    this.unlockDownstreamTasks(taskId)

    // 5. Wake up scheduler (or resume next wave if auto-paused)
    if (this.autoPauseOnWaitingApproval && !this.isRunning && this.readyQueue.length > 0) {
      void this.execute().catch((err) => {
        console.error(`Error during resumed execution after approving ${taskId}:`, err)
      })
    } else {
      this.wakeUp()
    }

    return this.tasks.get(taskId)!
  }

  /**
   * Rejects a task in WAITING_APPROVAL state.
   */
  public async rejectTask(taskId: string, reason = 'Rejected by human operator'): Promise<Task> {
    const task = this.tasks.get(taskId)
    if (!task) {
      throw new OrchestratorExecutionError(`Task '${taskId}' not found.`)
    }
    if (task.state !== 'WAITING_APPROVAL') {
      throw new OrchestratorExecutionError(
        `Task '${taskId}' is in '${task.state}' state, expected 'WAITING_APPROVAL'.`
      )
    }

    this.waitingApprovalTasks.delete(taskId)
    this.failedTasks.add(taskId)
    this.registerTaskFailure(taskId, reason)
    this.updateTaskState(taskId, 'FAILED', reason)
    this.onEvent(createTaskRejectedEvent(this.runId, taskId, reason))

    // Clean up worktree
    await this.cleanWorktree(taskId)

    // Propagate failure to downstream tasks
    this.propagateFailure(taskId, 'DEPENDENCY_FAILED')

    // Wake up scheduler
    this.wakeUp()

    return this.tasks.get(taskId)!
  }

  /**
   * Evaluates all downstream tasks of a completed task and unlocks newly READY tasks.
   */
  private unlockDownstreamTasks(_completedTaskId: string): void {
    for (const [id, task] of this.tasks.entries()) {
      if (task.state === 'BLOCKED' || task.state === 'PLANNED') {
        const evalResult = evaluateTaskReadiness(task, (depId) => this.tasks.get(depId))
        const incomingHandoffs = this.getIncomingHandoffs(id)
        const allHandoffsSatisfied =
          incomingHandoffs.length === 0 || incomingHandoffs.every((h) => h.state === 'SATISFIED')

        if (evalResult.status === 'READY' && allHandoffsSatisfied) {
          this.updateTaskState(id, 'READY', 'All upstream dependencies and handoffs satisfied')
          this.onEvent(createTaskReadyEvent(this.runId, id))
          this.readyQueue.push(id)
        }
      }
    }
    this.readyQueue.sort()
  }

  private registerTaskCompletion(taskId: string, commitSha: string): void {
    const task = this.tasks.get(taskId)
    const taskDef = this.taskDefinitions.get(taskId)
    const roleId =
      task?.roleAssignment?.roleId ?? taskDef?.roleId ?? (taskDef?.role as AgentRoleId | undefined)

    // 1. Create verified artifact reference
    const defaultArtifactId = `artifact_${taskId}`
    const artifact = createArtifactRef({
      artifactId: defaultArtifactId,
      sourceTaskId: taskId,
      sourceRoleId: roleId,
      sourceHarnessId: this.harness.id,
      commitSha,
      verificationState: 'VERIFIED',
    })
    this.artifacts.set(artifact.artifactId, artifact)
    this.onArtifactCreated?.(artifact)

    if (taskDef?.requiredArtifacts) {
      for (const artId of taskDef.requiredArtifacts) {
        const declaredArt = createArtifactRef({
          artifactId: artId,
          sourceTaskId: taskId,
          sourceRoleId: roleId,
          sourceHarnessId: this.harness.id,
          commitSha,
          verificationState: 'VERIFIED',
        })
        this.artifacts.set(declaredArt.artifactId, declaredArt)
        this.onArtifactCreated?.(declaredArt)
      }
    }

    // 2. If review task, record review result if not already recorded
    if (taskDef?.reviewOfTaskId && roleId === 'role:quality:independent-reviewer') {
      if (!this.reviewResults.has(taskId)) {
        const reviewResult: IndependentReviewResult = {
          reviewedTaskId: taskDef.reviewOfTaskId,
          reviewerTaskId: taskId,
          reviewerRoleId: roleId,
          reviewerHarnessId: this.harness.id,
          verdict: 'PASS',
          findings: [],
          timestamp: new Date().toISOString(),
        }
        this.reviewResults.set(taskId, reviewResult)
      }
    }

    // 3. If integration task, record integration result if not already recorded
    if (roleId === 'role:integration:integration-engineer') {
      if (!this.integrationResults.has(taskId)) {
        const depIds = extractDependencyIds(
          taskDef ?? { id: taskId, title: task?.title ?? '', objective: task?.objective ?? '' }
        )
        const integrationResult: IntegrationPreparationResult = {
          sourceTaskIds: depIds,
          integrationTaskId: taskId,
          disposition: 'READY_FOR_VERIFICATION',
          conflictFiles: [],
          candidateRef: commitSha,
          timestamp: new Date().toISOString(),
        }
        this.integrationResults.set(taskId, integrationResult)
      }
    }

    // 4. Update outgoing handoffs
    for (const [hId, handoff] of this.handoffs.entries()) {
      if (handoff.sourceTaskId === taskId) {
        let custodySatisfied = true
        if (handoff.requiredArtifactIds && handoff.requiredArtifactIds.length > 0) {
          const custody = validateArtifactCustody({
            handoff,
            availableArtifacts: Array.from(this.artifacts.values()),
          })
          custodySatisfied = custody.satisfied
        }

        const nextState = custodySatisfied ? 'SATISFIED' : 'BLOCKED'
        const nextReason = custodySatisfied ? 'UPSTREAM_SATISFIED' : 'ARTIFACT_MISSING'

        const updatedHandoff: TaskHandoff = {
          ...handoff,
          state: nextState,
          reasonCode: nextReason,
        }
        this.handoffs.set(hId, updatedHandoff)
        this.onHandoffUpdated?.(updatedHandoff)
      }
    }
  }

  private registerTaskFailure(taskId: string, reason: string): void {
    for (const [hId, handoff] of this.handoffs.entries()) {
      if (handoff.sourceTaskId === taskId) {
        const updatedHandoff: TaskHandoff = {
          ...handoff,
          state: 'FAILED',
          reasonCode: 'UPSTREAM_FAILED',
          details: reason,
        }
        this.handoffs.set(hId, updatedHandoff)
        this.onHandoffUpdated?.(updatedHandoff)
      }
    }
  }

  /**
   * Transitively cancels all downstream tasks when an upstream task fails.
   */
  private propagateFailure(failedTaskId: string, reason: string): void {
    const affected = new Set<string>()

    const findDependents = (upstreamId: string) => {
      for (const [id, task] of this.tasks.entries()) {
        if (task.state !== 'FAILED' && task.state !== 'CANCELLED' && task.state !== 'APPROVED' && task.state !== 'SUCCEEDED') {
          const depIds = task.dependencies.map((d) => d.taskId)
          if (depIds.includes(upstreamId) && !affected.has(id)) {
            affected.add(id)
            findDependents(id)
          }
        }
      }
    }

    findDependents(failedTaskId)

    for (const id of affected) {
      this.cancelledTasks.add(id)
      this.updateTaskState(id, 'CANCELLED', reason)
      // Remove from readyQueue if present
      const qIdx = this.readyQueue.indexOf(id)
      if (qIdx !== -1) {
        this.readyQueue.splice(qIdx, 1)
      }
    }
  }

  private handleTaskCrash(taskId: string, errorMessage: string): void {
    this.failTask(taskId, errorMessage)
  }

  private failTask(taskId: string, reason: string): void {
    this.failedTasks.add(taskId)
    this.registerTaskFailure(taskId, reason)
    this.updateTaskState(taskId, 'FAILED', reason)
    this.propagateFailure(taskId, 'DEPENDENCY_FAILED')
    void this.cleanWorktree(taskId)
    this.wakeUp()
  }

  private async cleanWorktree(taskId: string): Promise<void> {
    const alloc = this.activeAllocations.get(taskId)
    if (alloc) {
      try {
        await removeWorktree(alloc.worktreePath)
      } catch {
        // Best-effort cleanup
      }
      this.activeAllocations.delete(taskId)
    }
  }

  private updateTaskState(taskId: string, toState: TaskState, reason?: string): void {
    const task = this.tasks.get(taskId)
    if (!task) return

    const fromState = task.state
    const transitionResult = transitionTask(task, toState, { reason })
    this.tasks.set(taskId, transitionResult.task)

    this.onTaskUpdated?.(transitionResult.task)
    this.onEvent(
      createTaskStateChangedEvent({
        runId: this.runId,
        taskId,
        fromState,
        toState,
        reason,
      })
    )
  }

  private evaluateRemainingTasks(): void {
    for (const [id, task] of this.tasks.entries()) {
      if (task.state === 'BLOCKED' || task.state === 'PLANNED') {
        const evalResult = evaluateTaskReadiness(task, (depId) => this.tasks.get(depId))
        if (evalResult.status === 'READY') {
          this.updateTaskState(id, 'READY', 'Dependencies evaluated as ready')
          this.onEvent(createTaskReadyEvent(this.runId, id))
          this.readyQueue.push(id)
        } else if (evalResult.status === 'UNSATISFIABLE') {
          this.cancelledTasks.add(id)
          this.updateTaskState(id, 'CANCELLED', 'Unsatisfiable dependencies')
        }
      }
    }
    this.readyQueue.sort()
  }
}
