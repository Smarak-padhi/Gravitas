import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DefaultAgentRegistry } from '@gravitas/agents'
import { startFixtureServer, type FixtureServerInstance } from '@gravitas/browser-qa'
import {
  allocateWorktree,
  executeGit,
  removeWorktree,
  type WorktreeAllocation,
} from '@gravitas/git'
import type { AgentExecutionResult, AgentHarness } from '@gravitas/harnesses'
import type { BrowserQaContract, GravitasEvent, Task } from '@gravitas/core'
import { BoundedScheduler } from './scheduler.js'
import type { RunPlan } from './types.js'

describe('BoundedScheduler with Deterministic Browser QA & Agent Registry', () => {
  let fixture: FixtureServerInstance
  let tempRepoDir: string
  let runtimeRoot: string

  beforeAll(async () => {
    // 1. Start local fixture server
    const testHtml = `<!DOCTYPE html>
<html>
<head><title>Gravitas Test Page</title></head>
<body>
  <div id="verified-element">Deterministic Content Verified</div>
</body>
</html>`

    fixture = await startFixtureServer({
      routes: {
        '/app': testHtml,
      },
    })

    // 2. Create clean git repository for testing
    tempRepoDir = await mkdtemp(join(tmpdir(), 'gravitas-orch-qa-repo-'))
    runtimeRoot = await mkdtemp(join(tmpdir(), 'gravitas-orch-qa-runtime-'))

    await executeGit({ cwd: tempRepoDir, args: ['init', '-b', 'main'] })
    await executeGit({ cwd: tempRepoDir, args: ['config', 'user.name', 'Test User'] })
    await executeGit({ cwd: tempRepoDir, args: ['config', 'user.email', 'test@gravitas.local'] })
    await writeFile(join(tempRepoDir, 'README.md'), '# Test Repo\n', 'utf8')
    await executeGit({ cwd: tempRepoDir, args: ['add', 'README.md'] })
    await executeGit({ cwd: tempRepoDir, args: ['commit', '-m', 'Initial commit'] })
  })

  afterAll(async () => {
    if (fixture) {
      await fixture.close()
    }
    if (tempRepoDir) {
      await rm(tempRepoDir, { recursive: true, force: true })
    }
    if (runtimeRoot) {
      await rm(runtimeRoot, { recursive: true, force: true })
    }
  })

  // Mock harness that applies allowed file edit
  const createMockHarness = (modifyFile = 'app.js'): AgentHarness => ({
    id: 'mock_claude_worker',
    name: 'Mock Claude Worker',
    role: 'IMPLEMENTER',
    availability: async () => ({ isReady: true, details: 'ready' }),
    execute: async (req) => {
      await writeFile(join(req.worktreePath, modifyFile), '// modified by worker\n', 'utf8')
      return {
        executionId: req.executionId,
        harnessId: 'mock_claude_worker',
        exitCode: 0,
        terminationReason: 'NORMAL',
        durationMs: 50,
        stdout: 'Success',
        stderr: '',
        structuredOutput: { message: 'Worker claims task complete' },
      }
    },
  })

  it('SUCCESS PROOF: Browser QA passes -> materializes result commit and reaches WAITING_APPROVAL', async () => {
    const events: GravitasEvent[] = []
    const updatedTasks: Task[] = []

    const validBrowserQa: BrowserQaContract = {
      id: 'qa_contract_valid',
      actions: [
        { type: 'navigate', url: `${fixture.url}/app` },
        { type: 'assertVisible', selector: '#verified-element' },
        { type: 'assertText', selector: '#verified-element', expected: 'Deterministic Content Verified' },
      ],
    }

    const plan: RunPlan = {
      goal: 'Verify Browser QA in Golden Loop',
      maxConcurrency: 1,
      tasks: [
        {
          id: 'task_qa_pass',
          title: 'Web Component Build',
          objective: 'Build and verify component',
          requiresApproval: true,
          browserQa: validBrowserQa,
          dependencies: [],
        },
      ],
    }

    const scheduler = new BoundedScheduler({
      runId: 'run_qa_pass_1',
      plan,
      repositoryRoot: tempRepoDir,
      baseBranch: 'main',
      runtimeRoot,
      harness: createMockHarness('component.js'),
      onEvent: (evt) => events.push(evt),
      onTaskUpdated: (t) => updatedTasks.push(t),
    })

    // Start execution in background (because requiresApproval=true pauses on WAITING_APPROVAL)
    const execPromise = scheduler.execute()

    // Wait until task reaches WAITING_APPROVAL
    await new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        const t = scheduler.getTask('task_qa_pass')
        if (t?.state === 'WAITING_APPROVAL') {
          clearInterval(interval)
          resolve()
        }
      }, 50)
    })

    // Verify task reached WAITING_APPROVAL
    const task = scheduler.getTask('task_qa_pass')
    expect(task).toBeDefined()
    expect(task?.state).toBe('WAITING_APPROVAL')

    // Verify events sequence includes BROWSER_QA_STARTED and BROWSER_QA_COMPLETED
    const startEvt = events.find((e) => e.type === 'BROWSER_QA_STARTED')
    expect(startEvt).toBeDefined()
    expect(startEvt?.taskId).toBe('task_qa_pass')

    const compEvt = events.find((e) => e.type === 'BROWSER_QA_COMPLETED')
    expect(compEvt).toBeDefined()
    expect((compEvt?.payload['result'] as any)?.status).toBe('PASSED')

    // Now approve task -> verifies commit is materialized and task SUCCEEDS/APPROVED
    const approvedTask = await scheduler.approveTask('task_qa_pass')
    expect(approvedTask.state).toBe('APPROVED')

    await execPromise

    const matEvt = events.find((e) => e.type === 'TASK_RESULT_MATERIALIZED')
    expect(matEvt).toBeDefined()
  }, 60000)

  it('FAILURE PROOF: Browser QA fails -> blocks result materialization, approval, and cancels downstream task', async () => {
    const events: GravitasEvent[] = []

    const failingBrowserQa: BrowserQaContract = {
      id: 'qa_contract_failing',
      actions: [
        { type: 'navigate', url: `${fixture.url}/app` },
        { type: 'assertVisible', selector: '#missing-element-404', timeoutMs: 500 },
      ],
    }

    const plan: RunPlan = {
      goal: 'Verify Browser QA Failure Blocks Downstream',
      maxConcurrency: 2,
      tasks: [
        {
          id: 'task_upstream',
          title: 'Upstream UI Component',
          objective: 'Build component that fails QA',
          requiresApproval: true,
          browserQa: failingBrowserQa,
          dependencies: [],
        },
        {
          id: 'task_downstream',
          title: 'Downstream Consumer',
          objective: 'Depends on upstream component',
          dependencies: ['task_upstream'],
        },
      ],
    }

    const scheduler = new BoundedScheduler({
      runId: 'run_qa_fail_1',
      plan,
      repositoryRoot: tempRepoDir,
      baseBranch: 'main',
      runtimeRoot,
      harness: createMockHarness('fail.js'),
      onEvent: (evt) => events.push(evt),
    })

    await scheduler.execute()

    // 1. Upstream task MUST transition to FAILED
    const upstream = scheduler.getTask('task_upstream')
    expect(upstream?.state).toBe('FAILED')
    expect(upstream?.failureReason).toContain('Browser QA verification rejected candidate')

    // 2. Downstream task MUST be CANCELLED via DEPENDENCY_FAILED
    const downstream = scheduler.getTask('task_downstream')
    expect(downstream?.state).toBe('CANCELLED')
    expect(downstream?.failureReason).toBe('DEPENDENCY_FAILED')

    // 3. Verification events
    expect(events.some((e) => e.type === 'BROWSER_QA_STARTED')).toBe(true)
    expect(events.some((e) => e.type === 'BROWSER_QA_FAILED')).toBe(true)

    // 4. CRITICAL: Result commit was NEVER materialized for failed task
    expect(events.some((e) => e.type === 'TASK_RESULT_MATERIALIZED')).toBe(false)

    // 5. CRITICAL: Approval was NEVER requested
    expect(events.some((e) => e.type === 'APPROVAL_REQUIRED')).toBe(false)
  }, 60000)

  it('CAPABILITY PROOF: Agent Registry validates requiredCapabilities and refuses unqualified tasks', async () => {
    const registry = new DefaultAgentRegistry()

    // Case A: Valid capabilities
    const validPlan: RunPlan = {
      goal: 'Test Capabilities',
      maxConcurrency: 1,
      tasks: [
        {
          id: 'task_cap_valid',
          title: 'Standard Worker Task',
          objective: 'Use filesystem capabilities',
          requiredCapabilities: ['filesystem.read', 'filesystem.write'],
          requiresApproval: false,
          dependencies: [],
        },
      ],
    }

    const validScheduler = new BoundedScheduler({
      runId: 'run_cap_valid',
      plan: validPlan,
      repositoryRoot: tempRepoDir,
      baseBranch: 'main',
      runtimeRoot,
      harness: createMockHarness('cap.js'),
      agentRegistry: registry,
      onEvent: () => {},
    })

    await validScheduler.execute()
    expect(validScheduler.getTask('task_cap_valid')?.state).toBe('SUCCEEDED')

    // Case B: Impossible capability requirement -> crashes immediately
    const invalidPlan: RunPlan = {
      goal: 'Test Impossible Capabilities',
      maxConcurrency: 1,
      tasks: [
        {
          id: 'task_cap_invalid',
          title: 'Unsatisfied Task',
          objective: 'Demands unknown capability',
          requiredCapabilities: ['quantum.teleportation'],
          requiresApproval: false,
          dependencies: [],
        },
      ],
    }

    const invalidScheduler = new BoundedScheduler({
      runId: 'run_cap_invalid',
      plan: invalidPlan,
      repositoryRoot: tempRepoDir,
      baseBranch: 'main',
      runtimeRoot,
      harness: createMockHarness('cap_fail.js'),
      agentRegistry: registry,
      onEvent: () => {},
    })

    await invalidScheduler.execute()
    const failedTask = invalidScheduler.getTask('task_cap_invalid')
    expect(failedTask?.state).toBe('FAILED')
    expect(failedTask?.failureReason).toContain('Capability grant refused')
  }, 25000)
})
