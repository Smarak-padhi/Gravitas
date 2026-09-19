/**
 * Deterministic Failure and Rejection Boundary API Tests.
 *
 * Section 24 Mandatory Acceptance Gate:
 * Proves:
 * 1. Worker claims success, but independent verification fails
 * 2. Task transitions strictly to FAILED
 * 3. FAILED task can NEVER be approved (POST /approve returns 409 Conflict)
 * 4. Human rejection: WAITING_APPROVAL task can be rejected via POST /reject
 * 5. Rejection transitions task to FAILED with recorded human reason
 * 6. Non-WAITING_APPROVAL tasks reject approve/reject attempts with 409 Conflict
 */

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { executeGit } from '@gravitas/git'
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
 * Worker harness that claims completion, but writes broken code that fails tests.
 */
class RogueWorkerHarness implements AgentHarness {
  public readonly id = 'rogue-worker'

  public async availability(): Promise<HarnessAvailability> {
    return {
      status: 'AVAILABLE',
      installed: true,
      usableNoninteractive: true,
    }
  }

  public async execute(request: AgentExecutionRequest): Promise<AgentExecutionResult> {
    const startedAt = new Date().toISOString()

    // Writes incorrect implementation
    const mathJsPath = join(request.worktreePath, 'src', 'math.js')
    await writeFile(
      mathJsPath,
      'export function add(a, b) {\n  return 9999;\n}\n',
      'utf8'
    )

    const finishedAt = new Date().toISOString()
    return {
      executionId: request.executionId,
      harnessId: this.id,
      startedAt,
      finishedAt,
      durationMs: 30,
      exitCode: 0,
      terminationReason: 'COMPLETED',
      stdout: 'Worker claims: all tests pass!',
      stderr: '',
      stdoutTruncated: false,
      stderrTruncated: false,
      worktreePath: request.worktreePath,
    }
  }
}

describe('Failure and Rejection API Proof (failure-api.test.ts)', () => {
  let primaryRepoPath: string
  let runtimeRoot: string
  let server: GravitasServer
  let serverUrl: string
  let registry: InMemoryRegistry
  let eventHub: EventHub
  let harness: RogueWorkerHarness

  beforeEach(async () => {
    primaryRepoPath = await mkdtemp(join(tmpdir(), 'gravitas-failure-fixture-'))
    runtimeRoot = await mkdtemp(join(tmpdir(), 'gravitas-failure-runtime-'))

    await executeGit({ cwd: primaryRepoPath, args: ['init', '-b', 'main'] })
    await executeGit({ cwd: primaryRepoPath, args: ['config', 'user.name', 'Failure Tester'] })
    await executeGit({ cwd: primaryRepoPath, args: ['config', 'user.email', 'fail@tester.local'] })

    await writeFile(
      join(primaryRepoPath, 'package.json'),
      JSON.stringify({ name: 'failure-fixture', type: 'module', version: '1.0.0' }, null, 2),
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
});
`,
      'utf8'
    )

    await executeGit({ cwd: primaryRepoPath, args: ['add', '.'] })
    await executeGit({ cwd: primaryRepoPath, args: ['commit', '-m', 'Initial baseline fixture'] })

    registry = new InMemoryRegistry()
    eventHub = new EventHub(registry)
    harness = new RogueWorkerHarness()

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
      harness,
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

  it('fails task when verification fails despite worker claiming success; blocks approval with 409', async () => {
    // 1. Create run
    const createRes = await fetch(`${serverUrl}/api/v1/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        goal: 'Implement math add function',
        repository: primaryRepoPath,
        constraints: ['src/math.js'],
        requiresApproval: true,
      }),
    })
    expect(createRes.status).toBe(201)
    const { runId, tasks } = await createRes.json()
    const taskId = tasks[0].id

    // 2. Execute run — rogue worker modifies code to 9999, verifier runs and fails
    const executeRes = await fetch(`${serverUrl}/api/v1/runs/${runId}/execute`, {
      method: 'POST',
    })
    expect(executeRes.status).toBe(200)
    const executeData = await executeRes.json()

    // Defining Invariant: Worker claim is NOT verification
    expect(executeData.task.state).toBe('FAILED')

    // 3. Inspect task details
    const taskRes = await fetch(`${serverUrl}/api/v1/runs/${runId}/tasks/${taskId}`)
    const taskDetail = await taskRes.json()
    expect(taskDetail.task.state).toBe('FAILED')
    expect(taskDetail.verificationSummary.status).toBe('FAILED')
    expect(taskDetail.verificationSummary.failedCommands).toBe(1)

    // 4. Attempting to approve FAILED task returns 409 Conflict
    const approveRes = await fetch(`${serverUrl}/api/v1/runs/${runId}/tasks/${taskId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewer: 'tester' }),
    })
    expect(approveRes.status).toBe(409)
    const errorData = await approveRes.json()
    expect(errorData.error.code).toBe('TASK_NOT_APPROVABLE')
    expect(errorData.error.message).toContain("is in 'FAILED' state, not 'WAITING_APPROVAL'")

    // 5. Run is also marked FAILED
    const runRes = await fetch(`${serverUrl}/api/v1/runs/${runId}`)
    const runDetail = await runRes.json()
    expect(runDetail.run.status).toBe('FAILED')
  })

  it('allows human rejection of WAITING_APPROVAL task, transitioning it to FAILED with reason', async () => {
    // Manually register a task in WAITING_APPROVAL in registry
    const runId = 'run_reject_01'
    const taskId = 'task_reject_01'
    const now = new Date().toISOString()

    registry.addRun({
      id: runId,
      goal: 'Rejection test run',
      status: 'WAITING_APPROVAL',
      contractId: 'c1',
      taskIds: [taskId],
      createdAt: now,
      updatedAt: now,
    })

    registry.addTask({
      id: taskId,
      runId,
      title: 'Rejectable task',
      objective: 'Task objective',
      state: 'WAITING_APPROVAL',
      dependencies: [],
      acceptanceCriteria: [],
      requiresApproval: true,
      createdAt: now,
      updatedAt: now,
    })

    // Reject the task with reason
    const rejectRes = await fetch(`${serverUrl}/api/v1/runs/${runId}/tasks/${taskId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Code quality does not meet team standard.' }),
    })

    expect(rejectRes.status).toBe(200)
    const rejectData = await rejectRes.json()
    expect(rejectData.task.state).toBe('FAILED')

    // Task is now FAILED in registry
    const task = registry.getTask(taskId)
    expect(task?.state).toBe('FAILED')

    // Run is marked FAILED in registry
    const run = registry.getRun(runId)
    expect(run?.status).toBe('FAILED')

    // Attempting to reject again returns 409 Conflict
    const reRejectRes = await fetch(`${serverUrl}/api/v1/runs/${runId}/tasks/${taskId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Second reject' }),
    })
    expect(reRejectRes.status).toBe(409)
  })
})
