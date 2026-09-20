/**
 * In-Memory Registry for @gravitas/server.
 *
 * Centralized, non-persistent registry tracking runs, execution contracts,
 * tasks, evidence references, verification results, and a bounded recent event history.
 *
 * Explicit limitation:
 * In-memory only. Server restarts clear state.
 */

import type { BrowserQaResult, ExecutionContract, GravitasEvent, Run, Task } from '@gravitas/core'
import type { ManagedCompiledPrompt, ProjectPromptContext } from '@gravitas/prompts'
import type { MutationCapture } from '@gravitas/harnesses'
import type { VerificationPlan, VerificationResult } from '@gravitas/verifier'
import { DefaultAgentRegistry, type AgentRegistry } from '@gravitas/agents'
import type { TaskEvidenceRef } from './types.js'

export const DEFAULT_MAX_RECENT_EVENTS = 1000

export interface RegistryOptions {
  readonly maxEvents?: number | undefined
}

export class InMemoryRegistry {
  private readonly runs = new Map<string, Run>()
  private readonly contracts = new Map<string, ExecutionContract>()
  private readonly tasks = new Map<string, Task>()
  private readonly evidenceRefs = new Map<string, TaskEvidenceRef>()
  private readonly mutations = new Map<string, MutationCapture>()
  private readonly verifications = new Map<string, VerificationResult>()
  private readonly verificationPlans = new Map<string, VerificationPlan>()
  private readonly browserQaResults = new Map<string, BrowserQaResult>()
  private readonly agentRegistry = new DefaultAgentRegistry()
  private readonly compiledPrompts = new Map<string, ManagedCompiledPrompt>()
  private readonly projectContexts = new Map<string, ProjectPromptContext>()
  private readonly events: GravitasEvent[] = []
  private readonly maxEvents: number

  public constructor(options?: RegistryOptions | undefined) {
    this.maxEvents = options?.maxEvents ?? DEFAULT_MAX_RECENT_EVENTS
  }

  // --- Run operations ---

  public addRun(run: Run): void {
    this.runs.set(run.id, Object.freeze({ ...run }))
  }

  public getRun(id: string): Run | undefined {
    return this.runs.get(id)
  }

  public listRuns(): readonly Run[] {
    return Array.from(this.runs.values())
  }

  public updateRun(run: Run): void {
    if (!this.runs.has(run.id)) {
      throw new Error(`Cannot update unknown run '${run.id}'`)
    }
    this.runs.set(run.id, Object.freeze({ ...run }))
  }

  // --- Contract operations ---

  public addContract(contractId: string, contract: ExecutionContract): void {
    this.contracts.set(contractId, Object.freeze({ ...contract }))
  }

  public getContract(contractId: string): ExecutionContract | undefined {
    return this.contracts.get(contractId)
  }

  // --- Task operations ---

  public addTask(task: Task): void {
    this.tasks.set(task.id, Object.freeze({ ...task }))
  }

  public getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId)
  }

  public listTasksForRun(runId: string): readonly Task[] {
    const result: Task[] = []
    for (const task of this.tasks.values()) {
      if (task.runId === runId) {
        result.push(task)
      }
    }
    return result
  }

  public updateTask(task: Task): void {
    if (!this.tasks.has(task.id)) {
      throw new Error(`Cannot update unknown task '${task.id}'`)
    }
    this.tasks.set(task.id, Object.freeze({ ...task }))
  }

  // --- Evidence reference operations ---

  public setEvidenceRef(taskId: string, ref: TaskEvidenceRef): void {
    this.evidenceRefs.set(taskId, Object.freeze({ ...ref }))
  }

  public getEvidenceRef(taskId: string): TaskEvidenceRef | undefined {
    return this.evidenceRefs.get(taskId)
  }

  // --- Mutation capture operations ---

  public setMutation(taskId: string, mutation: MutationCapture): void {
    this.mutations.set(taskId, mutation)
  }

  public getMutation(taskId: string): MutationCapture | undefined {
    return this.mutations.get(taskId)
  }

  // --- Verification result operations ---

  public setVerification(taskId: string, result: VerificationResult): void {
    this.verifications.set(taskId, result)
  }

  public getVerification(taskId: string): VerificationResult | undefined {
    return this.verifications.get(taskId)
  }

  // --- Verification plan operations ---

  public setVerificationPlan(runId: string, plan: VerificationPlan): void {
    this.verificationPlans.set(runId, plan)
  }

  public getVerificationPlan(runId: string): VerificationPlan | undefined {
    return this.verificationPlans.get(runId)
  }

  // --- Browser QA operations ---

  public setBrowserQaResult(taskId: string, result: BrowserQaResult): void {
    this.browserQaResults.set(taskId, Object.freeze({ ...result }))
  }

  public getBrowserQaResult(taskId: string): BrowserQaResult | undefined {
    return this.browserQaResults.get(taskId)
  }

  // --- Agent Registry operations ---

  public getAgentRegistry(): AgentRegistry {
    return this.agentRegistry
  }

  // --- Event operations (Bounded FIFO buffer) ---

  public recordEvent(event: GravitasEvent): void {
    this.events.push(event)
    if (this.events.length > this.maxEvents) {
      // Deterministically evict oldest events
      const evictCount = this.events.length - this.maxEvents
      this.events.splice(0, evictCount)
    }
  }

  public getRecentEvents(limit?: number | undefined): readonly GravitasEvent[] {
    if (limit === undefined || limit >= this.events.length) {
      return [...this.events]
    }
    return this.events.slice(-limit)
  }

  public getEventsForRun(runId: string, limit?: number | undefined): readonly GravitasEvent[] {
    const runEvents = this.events.filter((e) => e.runId === runId)
    if (limit === undefined || limit >= runEvents.length) {
      return runEvents
    }
    return runEvents.slice(-limit)
  }

  // --- Compiled prompt operations ---

  public setCompiledPrompt(taskId: string, prompt: ManagedCompiledPrompt): void {
    this.compiledPrompts.set(taskId, Object.freeze({ ...prompt }))
  }

  public getCompiledPrompt(taskId: string): ManagedCompiledPrompt | undefined {
    return this.compiledPrompts.get(taskId)
  }

  // --- Project context operations ---

  public setProjectContext(runId: string, context: ProjectPromptContext): void {
    this.projectContexts.set(runId, Object.freeze({ ...context }))
  }

  public getProjectContext(runId: string): ProjectPromptContext | undefined {
    return this.projectContexts.get(runId)
  }

  // --- Clear (for clean test fixture reuse) ---

  public clear(): void {
    this.runs.clear()
    this.contracts.clear()
    this.tasks.clear()
    this.evidenceRefs.clear()
    this.mutations.clear()
    this.verifications.clear()
    this.verificationPlans.clear()
    this.browserQaResults.clear()
    this.agentRegistry.reset()
    this.compiledPrompts.clear()
    this.projectContexts.clear()
    this.events.length = 0
  }
}
