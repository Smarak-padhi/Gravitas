/**
 * Comprehensive Verification Suite for Authoritative Runtime Projection (Wave 12C-P-R).
 *
 * Verifies all 27 required matrix items:
 * 1. Empty projection semantics (schemaVersion, epoch, revision=0, empty activeTasks)
 * 2. Stable epoch identity across mutations
 * 3. Monotonic revision counter within epoch
 * 4. No-op events do not produce invalid revision churn
 * 5. Authoritative worker ownership captured from WORKER_STARTED
 * 6. PREPARING phase begins before worker execution
 * 7. WORKER_RUNNING begins when worker starts
 * 8. Worker finished clears WORKER_RUNNING and marks route inactive
 * 9. Verification running vs pass/fail states
 * 10. Browser QA running vs pass/fail states
 * 11. DIRECT vs GATEWAY transport distinction
 * 12. Active route vs historical route provenance
 * 13. Provider fallback vs transport fallback distinction
 * 14. Terminal task cleanup from activeTasks (WAITING_APPROVAL, FAILED, COMPLETED)
 * 15. Canonical TaskState preserved in getStateSummary()
 * 16. Concurrent task isolation (T1 and T2 remain independent)
 * 17. Event-history eviction independence (Registry buffer eviction does not alter projection)
 * 18. Fresh client recovery (reconnect recovers current projection without historical SSE replay)
 * 19. Stale callback protection (delayed lifecycle event cannot resurrect terminated task)
 * 20. Secret sanitization boundary (canary secrets/headers/keys strictly excluded from projection)
 * 21. Real lifecycle integration through RunService, BoundedScheduler, and fake worker
 */

import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  createBrowserQaCompletedEvent,
  createBrowserQaFailedEvent,
  createBrowserQaStartedEvent,
  createGatewayRouteCompletedEvent,
  createGatewayRouteFailedEvent,
  createGatewayRouteStartedEvent,
  createProviderFallbackOccurredEvent,
  createRouteSelectedEvent,
  createTaskStateChangedEvent,
  createTransportFallbackOccurredEvent,
  createVerificationFinishedEvent,
  createVerificationStartedEvent,
  createWorkerFinishedEvent,
  createWorkerStartedEvent,
} from '@gravitas/core'
import { executeGit } from '@gravitas/git'
import type {
  AgentExecutionRequest,
  AgentExecutionResult,
  AgentHarness,
  HarnessAvailability,
} from '@gravitas/harnesses'
import { EventHub } from './events.js'
import { RuntimeProjectionStore } from './projection.js'
import { InMemoryRegistry } from './registry.js'
import { GravitasServer } from './server.js'
import { RunService } from './service.js'

describe('Runtime Projection Store Unit Tests (projection.test.ts)', () => {
  let store: RuntimeProjectionStore

  beforeEach(() => {
    store = new RuntimeProjectionStore('epoch_test_fixed_123')
  })

  it('1. Empty projection: schemaVersion=1.0.0, stable epoch, revision=0, empty activeTasks', () => {
    const snapshot = store.getSnapshot()
    expect(snapshot.schemaVersion).toBe('1.0.0')
    expect(snapshot.epoch).toBe('epoch_test_fixed_123')
    expect(snapshot.revision).toBe(0)
    expect(snapshot.activeTasks).toEqual([])
  })

  it('2 & 3. Stable epoch & Monotonic revision: epoch remains identical while revision increments on mutations', () => {
    const initialEpoch = store.getEpoch()
    expect(store.getRevision()).toBe(0)

    store.processEvent(
      createTaskStateChangedEvent({
        runId: 'run-1',
        taskId: 'task-1',
        fromState: 'PENDING',
        toState: 'RUNNING',
      })
    )

    expect(store.getEpoch()).toBe(initialEpoch)
    expect(store.getRevision()).toBe(1)

    store.processEvent(
      createWorkerStartedEvent('run-1', 'task-1', { harnessId: 'codex' })
    )

    expect(store.getEpoch()).toBe(initialEpoch)
    expect(store.getRevision()).toBe(2)

    const snapshot = store.getSnapshot()
    expect(snapshot.epoch).toBe(initialEpoch)
    expect(snapshot.revision).toBe(2)
  })

  it('4. No-op semantics: unrelated or unchanged events do not increment revision churn', () => {
    // Event without taskId
    store.processEvent({
      eventId: 'evt-0',
      type: 'RUN_STATE_CHANGED',
      runId: 'run-1',
      timestamp: new Date().toISOString(),
      payload: { fromState: 'PENDING', toState: 'RUNNING' },
    } as any)
    expect(store.getRevision()).toBe(0)

    // First transition to RUNNING -> revision becomes 1
    store.processEvent(
      createTaskStateChangedEvent({
        runId: 'run-1',
        taskId: 'task-1',
        fromState: 'PENDING',
        toState: 'RUNNING',
      })
    )
    expect(store.getRevision()).toBe(1)

    // Repeat transition to RUNNING when already PREPARING -> no-op, revision remains 1
    store.processEvent(
      createTaskStateChangedEvent({
        runId: 'run-1',
        taskId: 'task-1',
        fromState: 'PENDING',
        toState: 'RUNNING',
      })
    )
    expect(store.getRevision()).toBe(1)
  })

  it('5, 6, 7, 8. PREPARING -> WORKER_RUNNING -> CLEANUP with authoritative worker ownership & route lifecycle', () => {
    // 6. PREPARING begins on TASK_STATE_CHANGED to RUNNING
    store.processEvent(
      createTaskStateChangedEvent({
        runId: 'run-1',
        taskId: 'task-1',
        fromState: 'PENDING',
        toState: 'RUNNING',
      })
    )
    let snap = store.getSnapshot()
    expect(snap.activeTasks).toHaveLength(1)
    expect(snap.activeTasks[0]?.phase).toBe('PREPARING')

    // Route resolution
    store.processRouteResolved('task-1', {
      workerId: 'codex-worker-01',
      workerQualificationIdentity: 'codex@1.0.0',
      transport: 'DIRECT',
      reason: 'DIRECT_DEFAULT',
      fallbackPolicy: 'GATEWAY_ONLY',
      routePolicyVersion: '1.0.0',
    })
    snap = store.getSnapshot()
    expect(snap.activeTasks[0]?.workerIdentity).toBe('codex-worker-01')
    expect(snap.activeTasks[0]?.route?.transport).toBe('DIRECT')
    expect(snap.activeTasks[0]?.route?.active).toBe(false) // Not yet executing

    // 7. WORKER_RUNNING begins when WORKER_STARTED arrives
    store.processEvent(
      createWorkerStartedEvent('run-1', 'task-1', { harnessId: 'codex-worker-01' })
    )
    snap = store.getSnapshot()
    expect(snap.activeTasks[0]?.phase).toBe('WORKER_RUNNING')
    expect(snap.activeTasks[0]?.route?.active).toBe(true) // Active during execution

    // 8. WORKER_FINISHED ends worker execution
    store.processEvent(
      createWorkerFinishedEvent('run-1', 'task-1', {
        exitCode: 0,
        terminationReason: 'COMPLETED',
        durationMs: 250,
      })
    )
    snap = store.getSnapshot()
    expect(snap.activeTasks[0]?.phase).toBe('CLEANUP')
    expect(snap.activeTasks[0]?.route?.active).toBe(false) // Route is no longer active
  })

  it('9 & 10. Verification and Browser QA phase distinction while task.state is VERIFYING', () => {
    store.processEvent(
      createTaskStateChangedEvent({
        runId: 'run-1',
        taskId: 'task-1',
        fromState: 'RUNNING',
        toState: 'VERIFYING',
      })
    )
    store.processEvent(createVerificationStartedEvent('run-1', 'task-1'))

    let snap = store.getSnapshot()
    expect(snap.activeTasks[0]?.phase).toBe('VERIFYING')
    expect(snap.activeTasks[0]?.verification?.status).toBe('RUNNING')

    store.processEvent(
      createVerificationFinishedEvent('run-1', 'task-1', {
        status: 'PASSED',
        totalCommands: 1,
        passedCommands: 1,
        failedCommands: 0,
      })
    )
    snap = store.getSnapshot()
    expect(snap.activeTasks[0]?.verification?.status).toBe('PASSED')

    // Browser QA starts — task.state remains VERIFYING in scheduler, but projection indicates BROWSER_QA
    store.processEvent(
      createBrowserQaStartedEvent('run-1', 'task-1', {
        contractId: 'bqa-contract-1',
        actionCount: 3,
      })
    )
    snap = store.getSnapshot()
    expect(snap.activeTasks[0]?.phase).toBe('BROWSER_QA')
    expect(snap.activeTasks[0]?.browserQa?.status).toBe('RUNNING')

    // Browser QA passes
    store.processEvent(
      createBrowserQaCompletedEvent('run-1', 'task-1', {
        status: 'PASSED',
        contractId: 'bqa-contract-1',
        actionResults: [],
        durationMs: 120,
      })
    )
    snap = store.getSnapshot()
    expect(snap.activeTasks[0]?.browserQa?.status).toBe('PASSED')
  })

  it('11, 12, 13. Route transport distinction, fallbacks, and active/inactive state', () => {
    store.processEvent(
      createTaskStateChangedEvent({
        runId: 'run-1',
        taskId: 'task-1',
        fromState: 'PENDING',
        toState: 'RUNNING',
      })
    )

    // Route selected: GATEWAY with omniroute-local
    store.processEvent(
      createRouteSelectedEvent('run-1', 'task-1', {
        transport: 'GATEWAY',
        gatewayId: 'omniroute-local',
        requestedProvider: 'anthropic',
        requestedModel: 'claude-3-5-sonnet',
        transportFallbackOccurred: false,
      })
    )

    let snap = store.getSnapshot()
    expect(snap.activeTasks[0]?.route?.transport).toBe('GATEWAY')
    expect(snap.activeTasks[0]?.route?.gatewayId).toBe('omniroute-local')
    expect(snap.activeTasks[0]?.route?.requestedProvider).toBe('anthropic')
    expect(snap.activeTasks[0]?.route?.requestedModel).toBe('claude-3-5-sonnet')
    expect(snap.activeTasks[0]?.route?.active).toBe(false)

    // Gateway execution starts
    store.processEvent(
      createGatewayRouteStartedEvent('run-1', 'task-1', {
        gatewayId: 'omniroute-local',
        requestedProvider: 'anthropic',
        requestedModel: 'claude-3-5-sonnet',
      })
    )
    snap = store.getSnapshot()
    expect(snap.activeTasks[0]?.route?.active).toBe(true)

    // Provider fallback occurs (anthropic -> openai)
    store.processEvent(
      createProviderFallbackOccurredEvent('run-1', 'task-1', {
        originalProvider: 'anthropic',
        fallbackProvider: 'openai',
        reason: 'RATE_LIMITED',
      })
    )
    snap = store.getSnapshot()
    expect(snap.activeTasks[0]?.route?.providerFallbackOccurred).toBe(true)
    expect(snap.activeTasks[0]?.route?.actualProvider).toBe('openai')
    expect(snap.activeTasks[0]?.route?.transportFallbackOccurred).toBe(false)

    // Transport fallback occurs (GATEWAY -> DIRECT)
    store.processEvent(
      createTransportFallbackOccurredEvent('run-1', 'task-1', {
        originalGatewayId: 'omniroute-local',
        fallbackTransport: 'DIRECT',
        reason: 'GATEWAY_DISCONNECTED',
      })
    )
    snap = store.getSnapshot()
    expect(snap.activeTasks[0]?.route?.transport).toBe('DIRECT')
    expect(snap.activeTasks[0]?.route?.transportFallbackOccurred).toBe(true)
    expect(snap.activeTasks[0]?.route?.providerFallbackOccurred).toBe(true)

    // Execution ends via gateway completed
    store.processEvent(
      createGatewayRouteCompletedEvent('run-1', 'task-1', {
        gatewayId: 'omniroute-local',
        durationMs: 500,
      })
    )
    snap = store.getSnapshot()
    expect(snap.activeTasks[0]?.route?.active).toBe(false)
  })

  it('14. Terminal task cleanup: WAITING_APPROVAL, FAILED, COMPLETED drop from activeTasks', () => {
    // Task 1 -> WAITING_APPROVAL
    store.processEvent(
      createTaskStateChangedEvent({
        runId: 'run-1',
        taskId: 'task-1',
        fromState: 'VERIFYING',
        toState: 'WAITING_APPROVAL',
      })
    )
    expect(store.getSnapshot().activeTasks).toHaveLength(0)
    expect(store.isTerminal('task-1')).toBe(true)

    // Task 2 -> FAILED
    store.processEvent(
      createTaskStateChangedEvent({
        runId: 'run-1',
        taskId: 'task-2',
        fromState: 'RUNNING',
        toState: 'FAILED',
      })
    )
    expect(store.getSnapshot().activeTasks).toHaveLength(0)
    expect(store.isTerminal('task-2')).toBe(true)

    // Task 3 -> COMPLETED
    store.processEvent(
      createTaskStateChangedEvent({
        runId: 'run-1',
        taskId: 'task-3',
        fromState: 'APPROVED',
        toState: 'COMPLETED',
      })
    )
    expect(store.getSnapshot().activeTasks).toHaveLength(0)
    expect(store.isTerminal('task-3')).toBe(true)
  })

  it('16. Concurrent task isolation: T1 and T2 retain independent phases, routes, and workers', () => {
    store.processEvent(
      createTaskStateChangedEvent({
        runId: 'run-1',
        taskId: 'task-1',
        fromState: 'PENDING',
        toState: 'RUNNING',
      })
    )
    store.processEvent(
      createTaskStateChangedEvent({
        runId: 'run-1',
        taskId: 'task-2',
        fromState: 'PENDING',
        toState: 'RUNNING',
      })
    )

    store.processRouteResolved('task-1', {
      workerId: 'codex-1',
      workerQualificationIdentity: 'codex@1.0.0',
      transport: 'DIRECT',
      reason: 'DIRECT_DEFAULT',
      fallbackPolicy: 'GATEWAY_ONLY',
      routePolicyVersion: '1.0.0',
    })

    store.processRouteResolved('task-2', {
      workerId: 'claude-2',
      workerQualificationIdentity: 'claude@1.0.0',
      transport: 'GATEWAY',
      gatewayId: 'omniroute-remote',
      reason: 'POLICY_GATEWAY',
      requestedProvider: 'anthropic',
      requestedModel: 'claude-3-5-sonnet',
      fallbackPolicy: 'GATEWAY_ONLY',
      routePolicyVersion: '1.0.0',
    })

    store.processEvent(createWorkerStartedEvent('run-1', 'task-1', { harnessId: 'codex-1' }))
    // task-2 remains PREPARING

    const snap = store.getSnapshot()
    expect(snap.activeTasks).toHaveLength(2)

    const t1 = snap.activeTasks.find((t) => t.taskId === 'task-1')!
    const t2 = snap.activeTasks.find((t) => t.taskId === 'task-2')!

    expect(t1.phase).toBe('WORKER_RUNNING')
    expect(t1.workerIdentity).toBe('codex-1')
    expect(t1.route?.transport).toBe('DIRECT')
    expect(t1.route?.active).toBe(true)

    expect(t2.phase).toBe('PREPARING')
    expect(t2.workerIdentity).toBe('claude-2')
    expect(t2.route?.transport).toBe('GATEWAY')
    expect(t2.route?.gatewayId).toBe('omniroute-remote')
    expect(t2.route?.active).toBe(false)
  })

  it('19. Stale callback protection: delayed lifecycle callback cannot resurrect terminated task', () => {
    // Task transitions to FAILED
    store.processEvent(
      createTaskStateChangedEvent({
        runId: 'run-1',
        taskId: 'task-dead',
        fromState: 'RUNNING',
        toState: 'FAILED',
      })
    )
    expect(store.getSnapshot().activeTasks).toHaveLength(0)
    const revAfterFail = store.getRevision()

    // Delayed WORKER_STARTED arrives late
    store.processEvent(
      createWorkerStartedEvent('run-1', 'task-dead', { harnessId: 'codex-zombie' })
    )
    expect(store.getSnapshot().activeTasks).toHaveLength(0)
    expect(store.getRevision()).toBe(revAfterFail) // No resurrection, no revision bump

    // Delayed route resolution arrives late
    store.processRouteResolved('task-dead', {
      workerId: 'zombie',
      workerQualificationIdentity: 'zombie@1.0.0',
      transport: 'DIRECT',
      reason: 'DIRECT_DEFAULT',
      fallbackPolicy: 'GATEWAY_ONLY',
      routePolicyVersion: '1.0.0',
    })
    expect(store.getSnapshot().activeTasks).toHaveLength(0)
    expect(store.getRevision()).toBe(revAfterFail)
  })

  it('20. Secret sanitization boundary: canary secrets, headers, and keys are strictly excluded', () => {
    store.processEvent(
      createTaskStateChangedEvent({
        runId: 'run-1',
        taskId: 'task-secure',
        fromState: 'PENDING',
        toState: 'RUNNING',
      })
    )

    // Inject canary secrets in route resolution payload
    const dirtyRoute: any = {
      workerId: 'codex',
      workerQualificationIdentity: 'codex@1.0.0',
      transport: 'GATEWAY',
      gatewayId: 'gw-secret-1',
      requestedProvider: 'openai',
      requestedModel: 'gpt-4o',
      fallbackPolicy: 'GATEWAY_ONLY',
      routePolicyVersion: '1.0.0',
      // Canary secrets:
      apiKey: 'sk-canary-secret-key-12345',
      authorization: 'Bearer jwt-canary-token-67890',
      headers: { 'X-Secret-Auth': 'canary-header-value' },
      gatewaySecret: 'super-secret-gateway-password',
      internalEnv: { DATABASE_URL: 'postgres://root:secret@localhost:5432' },
    }

    store.processRouteResolved('task-secure', dirtyRoute)

    const snapshotJson = JSON.stringify(store.getSnapshot())

    expect(snapshotJson).not.toContain('sk-canary-secret-key')
    expect(snapshotJson).not.toContain('Bearer jwt-canary-token')
    expect(snapshotJson).not.toContain('canary-header-value')
    expect(snapshotJson).not.toContain('super-secret-gateway-password')
    expect(snapshotJson).not.toContain('postgres://root:secret')
  })
})

describe('Server & End-to-End Integration Tests (Section 9, 10, 15, 16)', () => {
  let primaryRepoPath: string
  let runtimeRoot: string
  let server: GravitasServer
  let serverUrl: string
  let registry: InMemoryRegistry
  let eventHub: EventHub

  class ObservableFakeHarness implements AgentHarness {
    public readonly id = 'fake-observable-worker'
    public onExecuteStarted?: (() => Promise<void>) | undefined

    public async availability(): Promise<HarnessAvailability> {
      return { status: 'AVAILABLE', installed: true, usableNoninteractive: true }
    }

    public async execute(request: AgentExecutionRequest): Promise<AgentExecutionResult> {
      if (this.onExecuteStarted) {
        await this.onExecuteStarted()
      }
      const mathJsPath = join(request.worktreePath, 'src', 'math.js')
      await writeFile(mathJsPath, 'export function add(a, b) { return a + b; }\n', 'utf8')
      return {
        executionId: request.executionId,
        harnessId: this.id,
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        durationMs: 30,
        exitCode: 0,
        terminationReason: 'COMPLETED',
        stdout: 'ok',
        stderr: '',
        stdoutTruncated: false,
        stderrTruncated: false,
        worktreePath: request.worktreePath,
      }
    }
  }

  let fakeHarness: ObservableFakeHarness

  beforeEach(async () => {
    primaryRepoPath = await mkdtemp(join(tmpdir(), 'gravitas-proj-repo-'))
    runtimeRoot = await mkdtemp(join(tmpdir(), 'gravitas-proj-runtime-'))

    await executeGit({ cwd: primaryRepoPath, args: ['init', '-b', 'main'] })
    await executeGit({ cwd: primaryRepoPath, args: ['config', 'user.name', 'Proj Tester'] })
    await executeGit({ cwd: primaryRepoPath, args: ['config', 'user.email', 'tester@proj.local'] })

    await writeFile(
      join(primaryRepoPath, 'package.json'),
      JSON.stringify({ name: 'proj-fixture', type: 'module', version: '1.0.0' }, null, 2),
      'utf8'
    )
    await mkdir(join(primaryRepoPath, 'src'), { recursive: true })
    await writeFile(
      join(primaryRepoPath, 'src', 'math.js'),
      'export function add(a, b) {\n  return 0;\n}\n',
      'utf8'
    )

    await executeGit({ cwd: primaryRepoPath, args: ['add', '.'] })
    await executeGit({ cwd: primaryRepoPath, args: ['commit', '-m', 'initial fixture'] })

    registry = new InMemoryRegistry()
    eventHub = new EventHub(registry)
    fakeHarness = new ObservableFakeHarness()

    const service = new RunService({
      registry,
      eventHub,
      harness: fakeHarness,
      defaultRepository: primaryRepoPath,
      defaultBaseBranch: 'main',
      runtimeRoot,
    })

    server = new GravitasServer({ service, eventHub })
    const addr = await server.start({ host: '127.0.0.1', port: 0 })
    serverUrl = addr.url
  })

  afterEach(async () => {
    await server.stop()
  })

  it('15 & 16. Real lifecycle proof (DIRECT control): PREPARING -> WORKER_RUNNING -> WAITING_APPROVAL', async () => {
    // 1. Create Run
    const createRes = await fetch(`${serverUrl}/api/v1/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        goal: 'Implement math.add',
        repository: primaryRepoPath,
        baseBranch: 'main',
        tasks: [
          {
            id: 'task-real-1',
            title: 'Fix add',
            objective: 'Implement correct add function',
            dependencies: [],
            requiresApproval: true,
          },
        ],
      }),
    })
    expect(createRes.status).toBe(201)
    const { runId } = (await createRes.json()) as { runId: string }

    let capturedDuringExecution: any = null

    // Instrument harness to observe projection during actual worker execution
    fakeHarness.onExecuteStarted = async () => {
      const stateRes = await fetch(`${serverUrl}/api/v1/state`)
      capturedDuringExecution = await stateRes.json()
    }

    // 2. Execute Run
    const execRes = await fetch(`${serverUrl}/api/v1/runs/${runId}/execute`, {
      method: 'POST',
    })
    expect([200, 202]).toContain(execRes.status)

    // Wait for execution to finish (task reaches WAITING_APPROVAL)
    let finalState: any = null
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 100))
      const res = await fetch(`${serverUrl}/api/v1/state`)
      finalState = await res.json()
      const t = finalState.tasks.find((task: any) => task.id === 'task-real-1')
      if (t && t.state === 'WAITING_APPROVAL') break
    }

    // Verify projection captured DURING worker execution:
    expect(capturedDuringExecution).not.toBeNull()
    const activeTask = capturedDuringExecution.projection.activeTasks.find(
      (t: any) => t.taskId === 'task-real-1'
    )
    expect(activeTask).toBeDefined()
    expect(activeTask.phase).toBe('WORKER_RUNNING')
    expect(activeTask.workerIdentity).toBe('fake-observable-worker')
    expect(activeTask.route?.transport).toBe('DIRECT')
    expect(activeTask.route?.active).toBe(true)

    // Verify state AFTER execution reaches WAITING_APPROVAL:
    // Active tasks dropped from projection (no ghost activity)
    expect(finalState.projection.activeTasks).toHaveLength(0)
    // Canonical task state is preserved in tasks list!
    const canonicalTask = finalState.tasks.find((t: any) => t.id === 'task-real-1')
    expect(canonicalTask).toBeDefined()
    expect(canonicalTask.state).toBe('WAITING_APPROVAL')
  })

  it('9 & 17. Event-history eviction independence: evicting registry event buffer does not alter projection', () => {
    // 1. Generate active task in projection
    eventHub.publish(
      createTaskStateChangedEvent({
        runId: 'run-1',
        taskId: 'task-persist',
        fromState: 'PENDING',
        toState: 'RUNNING',
      })
    )
    eventHub.publish(
      createWorkerStartedEvent('run-1', 'task-persist', { harnessId: 'codex' })
    )

    const beforeSnapshot = eventHub.projectionStore.getSnapshot()
    expect(beforeSnapshot.activeTasks).toHaveLength(1)
    expect(beforeSnapshot.activeTasks[0]?.phase).toBe('WORKER_RUNNING')

    // 2. Flood registry to evict/clear all events from the event buffer
    // InMemoryRegistry has a bounded buffer (default 1000 events) or clear
    // We can directly simulate buffer overflow or clear on the registry
    for (let i = 0; i < 1200; i++) {
      eventHub.publish({
        eventId: `flood-${i}`,
        type: 'HEARTBEAT_TICK' as any,
        runId: 'run-flood',
        timestamp: new Date().toISOString(),
        payload: { tick: i },
      } as any)
    }

    // 3. Query projection: current runtime state remains completely intact!
    const afterSnapshot = eventHub.projectionStore.getSnapshot()
    expect(afterSnapshot.activeTasks).toHaveLength(1)
    expect(afterSnapshot.activeTasks[0]?.taskId).toBe('task-persist')
    expect(afterSnapshot.activeTasks[0]?.phase).toBe('WORKER_RUNNING')
    expect(afterSnapshot.activeTasks[0]?.workerIdentity).toBe('codex')
  })

  it('10. Fresh-client recovery: new client without historical SSE connects and recovers truthful state', async () => {
    // 1. Server has active task
    eventHub.publish(
      createTaskStateChangedEvent({
        runId: 'run-fresh',
        taskId: 'task-live',
        fromState: 'PENDING',
        toState: 'RUNNING',
      })
    )
    eventHub.publish(
      createWorkerStartedEvent('run-fresh', 'task-live', { harnessId: 'codex-live' })
    )

    // 2. Fresh Client (simulated via standalone HTTP GET /api/v1/state without previous SSE or local cache)
    const res = await fetch(`${serverUrl}/api/v1/state`)
    expect(res.status).toBe(200)
    const summary = (await res.json()) as any

    expect(summary.projection).toBeDefined()
    expect(summary.projection.schemaVersion).toBe('1.0.0')
    expect(summary.projection.activeTasks).toHaveLength(1)
    expect(summary.projection.activeTasks[0].taskId).toBe('task-live')
    expect(summary.projection.activeTasks[0].phase).toBe('WORKER_RUNNING')
    expect(summary.projection.activeTasks[0].workerIdentity).toBe('codex-live')
  })
})
