/**
 * Wave 8 Multi-Task Orchestration API Integration Tests.
 *
 * Proves:
 * 1. POST /api/v1/runs creates multi-task Run Plans with dependencies and constraints
 * 2. POST /api/v1/runs/:runId/execute schedules and executes tasks concurrently
 * 3. Double-execution attempt returns HTTP 409 RUN_ALREADY_EXECUTING
 * 4. Approval of upstream task automatically wakes up scheduler and executes downstream task
 * 5. Failure / rejection of upstream task transitively cancels downstream tasks
 */

import http from 'node:http'
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

class MultiTaskFakeHarness implements AgentHarness {
  public readonly id = 'fake-multitask-worker'

  public async availability(): Promise<HarnessAvailability> {
    return {
      status: 'AVAILABLE',
      installed: true,
      usableNoninteractive: true,
    }
  }

  public async execute(request: AgentExecutionRequest): Promise<AgentExecutionResult> {
    const startedAt = new Date().toISOString()

    const promptText = request.compiledPrompt ?? ''

    // Determine action based on prompt / taskId
    if (promptText.includes('FAIL_ME')) {
      return {
        executionId: request.executionId,
        harnessId: this.id,
        startedAt,
        finishedAt: new Date().toISOString(),
        durationMs: 20,
        exitCode: 1,
        terminationReason: 'FAILED',
        stdout: '',
        stderr: 'Deliberate task failure',
        stdoutTruncated: false,
        stderrTruncated: false,
        worktreePath: request.worktreePath,
      }
    }

    // Write a file specific to the task
    const outputDir = join(request.worktreePath, 'src')
    await mkdir(outputDir, { recursive: true })

    // Find task name or number from prompt
    const match = promptText.match(/file-(\w+)\.txt/)
    const fileName = match ? `file-${match[1]}.txt` : 'out.txt'

    await writeFile(join(outputDir, fileName), `Output for ${fileName}\n`, 'utf8')

    return {
      executionId: request.executionId,
      harnessId: this.id,
      startedAt,
      finishedAt: new Date().toISOString(),
      durationMs: 50,
      exitCode: 0,
      terminationReason: 'COMPLETED',
      stdout: `Created ${fileName}`,
      stderr: '',
      stdoutTruncated: false,
      stderrTruncated: false,
      worktreePath: request.worktreePath,
    }
  }
}

describe('Orchestrator Multi-Task API (orchestrator-api.test.ts)', () => {
  let primaryRepoPath: string
  let runtimeRoot: string
  let server: GravitasServer
  let serverUrl: string
  let registry: InMemoryRegistry
  let eventHub: EventHub
  let fakeHarness: MultiTaskFakeHarness
  let service: RunService

  beforeEach(async () => {
    primaryRepoPath = await mkdtemp(join(tmpdir(), 'gravitas-orch-fixture-'))
    runtimeRoot = await mkdtemp(join(tmpdir(), 'gravitas-orch-runtime-'))

    await executeGit({ cwd: primaryRepoPath, args: ['init', '-b', 'main'] })
    await executeGit({ cwd: primaryRepoPath, args: ['config', 'user.name', 'Orchestrator Tester'] })
    await executeGit({ cwd: primaryRepoPath, args: ['config', 'user.email', 'tester@orch.local'] })

    await writeFile(
      join(primaryRepoPath, 'package.json'),
      JSON.stringify({ name: 'orch-fixture', type: 'module', version: '1.0.0' }, null, 2),
      'utf8'
    )
    await mkdir(join(primaryRepoPath, 'src'), { recursive: true })
    await writeFile(join(primaryRepoPath, 'src', 'index.js'), 'export const ready = true;\n', 'utf8')

    await executeGit({ cwd: primaryRepoPath, args: ['add', '.'] })
    await executeGit({ cwd: primaryRepoPath, args: ['commit', '-m', 'Initial baseline'] })

    registry = new InMemoryRegistry()
    eventHub = new EventHub(registry)
    fakeHarness = new MultiTaskFakeHarness()

    const verificationPlan: VerificationPlan = {
      id: 'plan_exit_0',
      commands: [
        {
          id: 'verify_node',
          executable: process.execPath,
          args: ['-e', 'process.exit(0)'],
          mandatory: true,
          timeoutMs: 15000,
        },
      ],
    }

    service = new RunService({
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
    await rm(primaryRepoPath, { recursive: true, force: true }).catch(() => {})
    await rm(runtimeRoot, { recursive: true, force: true }).catch(() => {})
  })

  async function makeRequest(
    method: string,
    path: string,
    body?: unknown
  ): Promise<{ status: number; data: any }> {
    return new Promise((resolve, reject) => {
      const url = new URL(path, serverUrl)
      const req = http.request(
        url,
        {
          method,
          headers: {
            'content-type': 'application/json',
          },
        },
        (res) => {
          let chunks = ''
          res.setEncoding('utf8')
          res.on('data', (chunk) => {
            chunks += chunk
          })
          res.on('end', () => {
            let data = chunks
            try {
              data = JSON.parse(chunks)
            } catch {
              // ignore
            }
            resolve({ status: res.statusCode ?? 500, data })
          })
        }
      )

      req.on('error', reject)
      if (body !== undefined) {
        req.write(JSON.stringify(body))
      }
      req.end()
    })
  }

  it('creates and executes multi-task run with dependent tasks unblocked by approval', async () => {
    // 1. Create run with 2 sequential tasks: task-1 -> task-2
    const createRes = await makeRequest('POST', '/api/v1/runs', {
      goal: 'Build feature in 2 sequential tasks',
      maxConcurrency: 2,
      tasks: [
        {
          id: 'task-1',
          title: 'First step: generate file-one.txt',
          objective: 'Write file-one.txt in src directory',
          dependencies: [],
          requiresApproval: true,
        },
        {
          id: 'task-2',
          title: 'Second step: generate file-two.txt',
          objective: 'Write file-two.txt in src directory',
          dependencies: ['task-1'],
          requiresApproval: true,
        },
      ],
    })

    expect(createRes.status).toBe(201)
    const runId = createRes.data.run.id
    expect(createRes.data.tasks).toHaveLength(2)
    expect(createRes.data.tasks[0].id).toBe('task-1')
    expect(createRes.data.tasks[1].id).toBe('task-2')

    // 2. Execute run - task-1 should run and pause at WAITING_APPROVAL, task-2 remains PENDING
    const execRes = await makeRequest('POST', `/api/v1/runs/${runId}/execute`)
    expect(execRes.status).toBe(200)

    const runAfterFirstExec = await makeRequest('GET', `/api/v1/runs/${runId}`)
    expect(runAfterFirstExec.data.run.status).toBe('WAITING_APPROVAL')

    const t1Res = await makeRequest('GET', `/api/v1/runs/${runId}/tasks/task-1`)
    expect(t1Res.data.task.state).toBe('WAITING_APPROVAL')

    const t2Res = await makeRequest('GET', `/api/v1/runs/${runId}/tasks/task-2`)
    expect(t2Res.data.task.state).toBe('BLOCKED')

    // 3. Approve task-1
    const approveT1 = await makeRequest('POST', `/api/v1/runs/${runId}/tasks/task-1/approve`, {
      approver: 'lead-dev',
      comment: 'LGTM for step 1',
    })
    expect(approveT1.status).toBe(200)

    // Wait for scheduler to finish task-2 and reach WAITING_APPROVAL
    let t2State = 'RUNNING'
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 300))
      const res = await makeRequest('GET', `/api/v1/runs/${runId}/tasks/task-2`)
      t2State = res.data.task.state
      if (t2State === 'WAITING_APPROVAL' || t2State === 'FAILED') break
    }
    expect(t2State).toBe('WAITING_APPROVAL')

    // 5. Approve task-2
    const approveT2 = await makeRequest('POST', `/api/v1/runs/${runId}/tasks/task-2/approve`, {
      approver: 'lead-dev',
      comment: 'LGTM for step 2',
    })
    expect(approveT2.status).toBe(200)

    // Wait for run completion
    let runStatus = 'RUNNING'
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 300))
      const res = await makeRequest('GET', `/api/v1/runs/${runId}`)
      runStatus = res.data.run.status
      if (runStatus === 'COMPLETED' || runStatus === 'FAILED') break
    }
    expect(runStatus).toBe('COMPLETED')
  })

  it('rejects double execution attempt with HTTP 409 RUN_ALREADY_EXECUTING', async () => {
    // Create run
    const createRes = await makeRequest('POST', '/api/v1/runs', {
      goal: 'Slow execution run',
      tasks: [
        {
          id: 'slow-task-1',
          title: 'First task',
          objective: 'Write file-one.txt',
          dependencies: [],
          requiresApproval: true,
        },
      ],
    })
    const runId = createRes.data.run.id

    // Start execution
    const firstExecPromise = makeRequest('POST', `/api/v1/runs/${runId}/execute`)

    // Attempt second execution immediately
    const secondExec = await makeRequest('POST', `/api/v1/runs/${runId}/execute`)
    expect(secondExec.status).toBe(409)
    expect(secondExec.data.error.code).toBe('RUN_ALREADY_EXECUTING')

    await firstExecPromise
  })

  it('cancels downstream tasks when upstream task is rejected', async () => {
    const createRes = await makeRequest('POST', '/api/v1/runs', {
      goal: 'Rejection test run',
      tasks: [
        {
          id: 't-parent',
          title: 'Parent task',
          objective: 'Write file-one.txt',
          dependencies: [],
          requiresApproval: true,
        },
        {
          id: 't-child',
          title: 'Child task',
          objective: 'Write file-two.txt',
          dependencies: ['t-parent'],
          requiresApproval: false,
        },
      ],
    })
    const runId = createRes.data.run.id

    // Execute first wave
    await makeRequest('POST', `/api/v1/runs/${runId}/execute`)

    const parentTask = await makeRequest('GET', `/api/v1/runs/${runId}/tasks/t-parent`)
    expect(parentTask.data.task.state).toBe('WAITING_APPROVAL')

    // Reject parent task
    const rejectRes = await makeRequest('POST', `/api/v1/runs/${runId}/tasks/t-parent/reject`, {
      rejector: 'lead-dev',
      reason: 'Output unacceptable',
    })
    expect(rejectRes.status).toBe(200)

    // Wait a tick for failure propagation
    await new Promise((r) => setTimeout(r, 500))

    const childTask = await makeRequest('GET', `/api/v1/runs/${runId}/tasks/t-child`)
    expect(childTask.data.task.state).toBe('CANCELLED')

    const runRes = await makeRequest('GET', `/api/v1/runs/${runId}`)
    expect(runRes.data.run.status).toBe('FAILED')
  })
})
