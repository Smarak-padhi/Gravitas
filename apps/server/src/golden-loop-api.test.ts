/**
 * End-to-End Deterministic Golden Loop API Integration Test.
 *
 * Section 23 Mandatory Acceptance Gate:
 * Proves:
 * 1. POST /api/v1/runs creates run, contract, and task
 * 2. POST /api/v1/runs/:runId/execute executes Golden Loop
 * 3. Injected deterministic fake worker produces candidate mutation
 * 4. Independent verifier tests candidate shell-free
 * 5. Evidence bundle is written and retrievable via GET /api/v1/runs/:runId/tasks/:taskId/evidence
 * 6. Task reaches WAITING_APPROVAL, SSE emits APPROVAL_REQUIRED
 * 7. POST /api/v1/runs/:runId/tasks/:taskId/approve explicitly transitions task to APPROVED
 * 8. Primary fixture repository remains completely untouched
 * 9. Re-approval attempts return 409 Conflict
 * 10. Zero AI / external network calls
 */

import http from 'node:http'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { executeGit, inspectRepository } from '@gravitas/git'
import type {
  AgentExecutionRequest,
  AgentExecutionResult,
  AgentHarness,
  HarnessAvailability,
} from '@gravitas/harnesses'
import type { VerificationPlan } from '@gravitas/verifier'
import { EventHub } from './events.js'
import { InMemoryRegistry } from './registry.js'
import { GravitasServer } from './server.js'
import { RunService } from './service.js'

/**
 * Deterministic Fake Agent Harness for tests.
 * Performs a known valid mutation in the worktree without external calls.
 */
class DeterministicFakeHarness implements AgentHarness {
  public readonly id = 'fake-deterministic-worker'

  public async availability(): Promise<HarnessAvailability> {
    return {
      status: 'AVAILABLE',
      installed: true,
      usableNoninteractive: true,
    }
  }

  public async execute(request: AgentExecutionRequest): Promise<AgentExecutionResult> {
    const startedAt = new Date().toISOString()

    // Deterministically modify src/math.js to implement add(a, b) correctly
    const mathJsPath = join(request.worktreePath, 'src', 'math.js')
    await writeFile(
      mathJsPath,
      'export function add(a, b) {\n  return a + b;\n}\n',
      'utf8'
    )

    const finishedAt = new Date().toISOString()
    return {
      executionId: request.executionId,
      harnessId: this.id,
      startedAt,
      finishedAt,
      durationMs: 50,
      exitCode: 0,
      terminationReason: 'COMPLETED',
      stdout: 'Successfully implemented add function in src/math.js',
      stderr: '',
      stdoutTruncated: false,
      stderrTruncated: false,
      worktreePath: request.worktreePath,
    }
  }
}

describe('Golden Loop API Proof (golden-loop-api.test.ts)', () => {
  let primaryRepoPath: string
  let runtimeRoot: string
  let server: GravitasServer
  let serverUrl: string
  let registry: InMemoryRegistry
  let eventHub: EventHub
  let fakeHarness: DeterministicFakeHarness

  beforeEach(async () => {
    primaryRepoPath = await mkdtemp(join(tmpdir(), 'gravitas-api-fixture-'))
    runtimeRoot = await mkdtemp(join(tmpdir(), 'gravitas-api-runtime-'))

    // 1. Initialize clean fixture git repository
    await executeGit({ cwd: primaryRepoPath, args: ['init', '-b', 'main'] })
    await executeGit({ cwd: primaryRepoPath, args: ['config', 'user.name', 'Api Tester'] })
    await executeGit({ cwd: primaryRepoPath, args: ['config', 'user.email', 'tester@api.local'] })

    await writeFile(
      join(primaryRepoPath, 'package.json'),
      JSON.stringify({ name: 'api-fixture', type: 'module', version: '1.0.0' }, null, 2),
      'utf8'
    )

    await mkdir(join(primaryRepoPath, 'src'), { recursive: true })
    await writeFile(
      join(primaryRepoPath, 'src', 'math.js'),
      'export function add(a, b) {\n  return 0;\n}\n',
      'utf8'
    )

    await mkdir(join(primaryRepoPath, 'test'), { recursive: true })
    await writeFile(
      join(primaryRepoPath, 'test', 'math.test.js'),
      `import test from 'node:test';
import assert from 'node:assert/strict';
import { add } from '../src/math.js';

test('adds numbers correctly', () => {
  assert.equal(add(2, 3), 5);
  assert.equal(add(-1, 1), 0);
});
`,
      'utf8'
    )

    await executeGit({ cwd: primaryRepoPath, args: ['add', '.'] })
    await executeGit({ cwd: primaryRepoPath, args: ['commit', '-m', 'Initial baseline fixture'] })

    // 2. Setup server with DeterministicFakeHarness
    registry = new InMemoryRegistry()
    eventHub = new EventHub(registry)
    fakeHarness = new DeterministicFakeHarness()

    const verificationPlan: VerificationPlan = {
      id: 'plan_node_test',
      commands: [
        {
          id: 'test_runner',
          executable: process.execPath,
          args: ['--test', 'test/math.test.js'],
          mandatory: true,
          timeoutMs: 15000,
        },
      ],
    }

    const service = new RunService({
      registry,
      eventHub,
      harness: fakeHarness,
      runtimeRoot,
      defaultRepository: primaryRepoPath,
      defaultVerificationPlan: verificationPlan,
    })

    server = new GravitasServer({
      service,
      eventHub,
    })

    const addr = await server.start({ host: '127.0.0.1', port: 0 })
    serverUrl = addr.url
  })

  afterEach(async () => {
    await server.stop()

    try {
      await rm(primaryRepoPath, { recursive: true, force: true })
    } catch {
      // Best-effort
    }
    try {
      await rm(runtimeRoot, { recursive: true, force: true })
    } catch {
      // Best-effort
    }
  })

  it('proves complete API-driven Golden Loop from creation to independent verification to approval', async () => {
    // 1. Connect SSE listener to verify live event emissions
    const sseEvents: string[] = []
    const clientReq = http.request({
      hostname: '127.0.0.1',
      port: Number(new URL(serverUrl).port),
      path: '/api/v1/events',
      method: 'GET',
    })

    clientReq.on('response', (res) => {
      res.setEncoding('utf8')
      res.on('data', (chunk: string) => {
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            sseEvents.push(line.slice(7).trim())
          }
        }
      })
    })
    clientReq.end()

    // Wait for SSE connection to establish
    await new Promise((r) => setTimeout(r, 50))

    // 2. POST /api/v1/runs — create run
    const createRunRes = await fetch(`${serverUrl}/api/v1/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        goal: 'Implement math add(a, b) function',
        repository: primaryRepoPath,
        constraints: ['src/math.js'],
        requiresApproval: true,
      }),
    })

    expect(createRunRes.status).toBe(201)
    const runData = await createRunRes.json()
    expect(runData.runId).toBeDefined()
    expect(runData.tasks).toHaveLength(1)
    expect(runData.tasks[0].state).toBe('READY')

    const runId = runData.runId
    const taskId = runData.tasks[0].id

    // 3. POST /api/v1/runs/:runId/execute — trigger Golden Loop execution
    const executeRes = await fetch(`${serverUrl}/api/v1/runs/${runId}/execute`, {
      method: 'POST',
    })

    expect(executeRes.status).toBe(200)
    const executeData = await executeRes.json()
    expect(executeData.task.state).toBe('WAITING_APPROVAL')

    // 4. GET /api/v1/runs/:runId/tasks/:taskId — inspect task details
    const taskRes = await fetch(`${serverUrl}/api/v1/runs/${runId}/tasks/${taskId}`)
    expect(taskRes.status).toBe(200)
    const taskDetail = await taskRes.json()

    expect(taskDetail.task.state).toBe('WAITING_APPROVAL')
    expect(taskDetail.evidenceAvailable).toBe(true)
    expect(taskDetail.mutationSummary.headMutated).toBe(false)
    expect(taskDetail.mutationSummary.isScopeCompliant).toBe(true)
    expect(taskDetail.mutationSummary.allowedChanges).toEqual(['src/math.js'])
    expect(taskDetail.mutationSummary.unexpectedChanges).toEqual([])
    expect(taskDetail.verificationSummary.status).toBe('PASSED')
    expect(taskDetail.verificationSummary.passedCommands).toBe(1)
    expect(taskDetail.verificationSummary.failedCommands).toBe(0)

    // 5. GET /api/v1/runs/:runId/tasks/:taskId/evidence — inspect evidence manifest
    const evidenceRes = await fetch(`${serverUrl}/api/v1/runs/${runId}/tasks/${taskId}/evidence`)
    expect(evidenceRes.status).toBe(200)
    const evidenceData = await evidenceRes.json()

    expect(evidenceData.runId).toBe(runId)
    expect(evidenceData.taskId).toBe(taskId)
    expect(evidenceData.manifest.schemaVersion).toBe('gravitas.evidence.v1')
    expect(evidenceData.manifest.verification.status).toBe('PASSED')
    expect(evidenceData.manifest.worker.harnessId).toBe('fake-deterministic-worker')
    expect(evidenceData.manifest.mutation.diffSha256).toBeDefined()
    expect(evidenceData.artifactFiles.length).toBeGreaterThan(0)

    // 6. Verify primary fixture repository remains completely pristine
    const primaryInspection = await inspectRepository(primaryRepoPath)
    expect(primaryInspection.isClean).toBe(true)
    expect(primaryInspection.currentBranch).toBe('main')

    // 7. Verify live SSE received APPROVAL_REQUIRED
    expect(sseEvents).toContain('RUN_CREATED')
    expect(sseEvents).toContain('TASK_CREATED')
    expect(sseEvents).toContain('WORKER_STARTED')
    expect(sseEvents).toContain('WORKER_FINISHED')
    expect(sseEvents).toContain('VERIFICATION_STARTED')
    expect(sseEvents).toContain('VERIFICATION_FINISHED')
    expect(sseEvents).toContain('EVIDENCE_CREATED')
    expect(sseEvents).toContain('APPROVAL_REQUIRED')

    // 8. POST /api/v1/runs/:runId/tasks/:taskId/approve — explicit human approval
    const approveRes = await fetch(`${serverUrl}/api/v1/runs/${runId}/tasks/${taskId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewer: 'senior_lead' }),
    })

    expect(approveRes.status).toBe(200)
    const approveData = await approveRes.json()
    expect(approveData.task.state).toBe('APPROVED')

    // 9. Verify run completed in registry
    const runRes = await fetch(`${serverUrl}/api/v1/runs/${runId}`)
    expect(runRes.status).toBe(200)
    const runDetail = await runRes.json()
    expect(runDetail.run.status).toBe('COMPLETED')
    expect(runDetail.tasks[0].state).toBe('APPROVED')

    // Verify SSE emitted TASK_APPROVED and RUN_COMPLETED
    expect(sseEvents).toContain('TASK_APPROVED')
    expect(sseEvents).toContain('RUN_COMPLETED')

    // 10. Attempting to approve an already APPROVED task returns 409 Conflict
    const reApproveRes = await fetch(`${serverUrl}/api/v1/runs/${runId}/tasks/${taskId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewer: 'senior_lead' }),
    })
    expect(reApproveRes.status).toBe(409)
    const conflictData = await reApproveRes.json()
    expect(conflictData.error.code).toBe('TASK_NOT_APPROVABLE')

    // Cleanup SSE client
    clientReq.destroy()
  })
})
