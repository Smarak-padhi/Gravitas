import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, afterEach } from 'vitest'
import type { GravitasEvent } from '@gravitas/core'
import { BoundedScheduler } from './scheduler.js'
import { createDeterministicHarness, createTestRepo, type TestRepo } from './test-utils.js'
import type { RunPlan } from './types.js'

describe('BoundedScheduler Multi-Task DAG Execution (scheduler.ts)', () => {
  let repo: TestRepo | null = null
  let runtimeRoot: string | null = null

  afterEach(async () => {
    if (repo) {
      await repo.cleanup()
      repo = null
    }
    if (runtimeRoot) {
      try {
        await rm(runtimeRoot, { recursive: true, force: true })
      } catch {
        // ignore
      }
      runtimeRoot = null
    }
  })

  it('executes a linear chain (T1 -> T2) with requiresApproval=false', async () => {
    repo = await createTestRepo()
    runtimeRoot = await mkdtemp(join(tmpdir(), 'gravitas-runtime-'))

    const events: GravitasEvent[] = []
    const harness = createDeterministicHarness({
      onExecute: async (req) => {
        // Each task writes a distinct file
        await writeFile(join(req.worktreePath, `${req.taskId}.txt`), `done by ${req.taskId}\n`, 'utf8')
      },
    })

    const plan: RunPlan = {
      goal: 'Linear pipeline test',
      tasks: [
        { id: 't1', title: 'Task 1', objective: 'Step 1', requiresApproval: false },
        { id: 't2', title: 'Task 2', objective: 'Step 2', dependencies: ['t1'], requiresApproval: false },
      ],
    }

    const scheduler = new BoundedScheduler({
      runId: 'run_linear',
      plan,
      repositoryRoot: repo.dir,
      baseBranch: repo.defaultBranch,
      runtimeRoot,
      harness,
      onEvent: (evt) => events.push(evt),
    })

    const result = await scheduler.execute()

    expect(result.status).toBe('COMPLETED')
    expect(result.tasks).toHaveLength(2)
    expect(result.tasks[0]?.state).toBe('SUCCEEDED')
    expect(result.tasks[1]?.state).toBe('SUCCEEDED')

    // Verified result commits were materialized for both tasks
    expect(result.materializedCommits['t1']).toMatch(/^[0-9a-f]{40}$/)
    expect(result.materializedCommits['t2']).toMatch(/^[0-9a-f]{40}$/)
    expect(result.materializedCommits['t1']).not.toBe(result.materializedCommits['t2'])

    // Events sequence verified
    const scheduledEvents = events.filter((e) => e.type === 'TASK_SCHEDULED')
    expect(scheduledEvents).toHaveLength(2)
    expect(scheduledEvents[0]?.taskId).toBe('t1')
    expect(scheduledEvents[1]?.taskId).toBe('t2')
  })

  it('enforces concurrency bounds when multiple tasks are ready', async () => {
    repo = await createTestRepo()
    runtimeRoot = await mkdtemp(join(tmpdir(), 'gravitas-runtime-'))

    let peakConcurrency = 0
    let currentConcurrency = 0

    const harness = createDeterministicHarness({
      delayMs: 100, // artificial delay to allow measuring concurrency
      onExecute: async () => {
        currentConcurrency++
        if (currentConcurrency > peakConcurrency) {
          peakConcurrency = currentConcurrency
        }
        await new Promise((resolve) => setTimeout(resolve, 50))
        currentConcurrency--
      },
    })

    const plan: RunPlan = {
      goal: 'Concurrency bound test',
      maxConcurrency: 2,
      tasks: [
        { id: 't1', title: 'T1', objective: 'Obj', requiresApproval: false },
        { id: 't2', title: 'T2', objective: 'Obj', requiresApproval: false },
        { id: 't3', title: 'T3', objective: 'Obj', requiresApproval: false },
        { id: 't4', title: 'T4', objective: 'Obj', requiresApproval: false },
      ],
    }

    const scheduler = new BoundedScheduler({
      runId: 'run_concurrency',
      plan,
      repositoryRoot: repo.dir,
      baseBranch: repo.defaultBranch,
      runtimeRoot,
      harness,
      onEvent: () => {},
    })

    const result = await scheduler.execute()

    expect(result.status).toBe('COMPLETED')
    expect(result.tasks).toHaveLength(4)
    // Verify peak concurrency never exceeded limit of 2
    expect(peakConcurrency).toBeLessThanOrEqual(2)
    expect(peakConcurrency).toBeGreaterThanOrEqual(1)
  })

  it('executes a diamond DAG (T1 -> [T2, T3] -> T4) successfully', async () => {
    repo = await createTestRepo()
    runtimeRoot = await mkdtemp(join(tmpdir(), 'gravitas-runtime-'))

    const harness = createDeterministicHarness({
      onExecute: async (req) => {
        if (req.taskId === 't1') {
          await writeFile(join(req.worktreePath, 'base.txt'), 'base content\n', 'utf8')
        } else if (req.taskId === 't2') {
          await writeFile(join(req.worktreePath, 'left.txt'), 'left branch\n', 'utf8')
        } else if (req.taskId === 't3') {
          await writeFile(join(req.worktreePath, 'right.txt'), 'right branch\n', 'utf8')
        } else if (req.taskId === 't4') {
          await writeFile(join(req.worktreePath, 'final.txt'), 'joined both\n', 'utf8')
        }
      },
    })

    const plan: RunPlan = {
      goal: 'Diamond DAG test',
      tasks: [
        { id: 't1', title: 'Root', objective: 'Obj', requiresApproval: false },
        { id: 't2', title: 'Branch Left', objective: 'Obj', dependencies: ['t1'], requiresApproval: false },
        { id: 't3', title: 'Branch Right', objective: 'Obj', dependencies: ['t1'], requiresApproval: false },
        { id: 't4', title: 'Join', objective: 'Obj', dependencies: ['t2', 't3'], requiresApproval: false },
      ],
    }

    const scheduler = new BoundedScheduler({
      runId: 'run_diamond',
      plan,
      repositoryRoot: repo.dir,
      baseBranch: repo.defaultBranch,
      runtimeRoot,
      harness,
      onEvent: () => {},
    })

    const result = await scheduler.execute()

    expect(result.status).toBe('COMPLETED')
    expect(result.tasks.every((t) => t.state === 'SUCCEEDED')).toBe(true)
    expect(Object.keys(result.materializedCommits)).toHaveLength(4)
  })

  it('gates downstream tasks on WAITING_APPROVAL and unblocks on approveTask', async () => {
    repo = await createTestRepo()
    runtimeRoot = await mkdtemp(join(tmpdir(), 'gravitas-runtime-'))

    const events: GravitasEvent[] = []
    const harness = createDeterministicHarness({
      onExecute: async (req) => {
        await writeFile(join(req.worktreePath, `${req.taskId}.txt`), 'ok\n', 'utf8')
      },
    })

    const plan: RunPlan = {
      goal: 'Approval gating test',
      tasks: [
        { id: 't1', title: 'Task 1 (Requires Approval)', objective: 'Obj', requiresApproval: true },
        { id: 't2', title: 'Task 2 (Dependent)', objective: 'Obj', dependencies: ['t1'], requiresApproval: false },
      ],
    }

    const scheduler = new BoundedScheduler({
      runId: 'run_approval_gate',
      plan,
      repositoryRoot: repo.dir,
      baseBranch: repo.defaultBranch,
      runtimeRoot,
      harness,
      onEvent: (e) => events.push(e),
    })

    // Start execution in background
    const executePromise = scheduler.execute()

    // Wait until T1 reaches WAITING_APPROVAL
    await new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        const t1 = scheduler.getTask('t1')
        if (t1?.state === 'WAITING_APPROVAL') {
          clearInterval(interval)
          resolve()
        }
      }, 50)
    })

    // At this point, T1 is WAITING_APPROVAL and T2 must still be BLOCKED
    expect(scheduler.getTask('t1')?.state).toBe('WAITING_APPROVAL')
    expect(scheduler.getTask('t2')?.state).toBe('BLOCKED')

    // Approve T1
    await scheduler.approveTask('t1', 'test_operator')

    // Wait for run to finish
    const result = await executePromise

    expect(result.status).toBe('COMPLETED')
    expect(scheduler.getTask('t1')?.state).toBe('APPROVED')
    expect(scheduler.getTask('t2')?.state).toBe('SUCCEEDED')
  })

  it('cancels downstream tasks when upstream task is rejected by operator', async () => {
    repo = await createTestRepo()
    runtimeRoot = await mkdtemp(join(tmpdir(), 'gravitas-runtime-'))

    const harness = createDeterministicHarness({
      onExecute: async (req) => {
        await writeFile(join(req.worktreePath, `${req.taskId}.txt`), 'ok\n', 'utf8')
      },
    })

    const plan: RunPlan = {
      goal: 'Rejection test',
      tasks: [
        { id: 't1', title: 'Task 1', objective: 'Obj', requiresApproval: true },
        { id: 't2', title: 'Task 2', objective: 'Obj', dependencies: ['t1'], requiresApproval: false },
      ],
    }

    const scheduler = new BoundedScheduler({
      runId: 'run_rejection',
      plan,
      repositoryRoot: repo.dir,
      baseBranch: repo.defaultBranch,
      runtimeRoot,
      harness,
      onEvent: () => {},
    })

    const executePromise = scheduler.execute()

    await new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        if (scheduler.getTask('t1')?.state === 'WAITING_APPROVAL') {
          clearInterval(interval)
          resolve()
        }
      }, 50)
    })

    // Reject T1
    await scheduler.rejectTask('t1', 'Rejection reason test')

    const result = await executePromise

    expect(result.status).toBe('FAILED')
    expect(scheduler.getTask('t1')?.state).toBe('FAILED')
    expect(scheduler.getTask('t2')?.state).toBe('CANCELLED')
  })

  it('propagates verification failure and transitively cancels dependent tasks', async () => {
    repo = await createTestRepo()
    runtimeRoot = await mkdtemp(join(tmpdir(), 'gravitas-runtime-'))

    const harness = createDeterministicHarness({
      onExecute: async () => {},
    })

    const plan: RunPlan = {
      goal: 'Failure propagation test',
      tasks: [
        {
          id: 't1',
          title: 'T1 (Fails Verification)',
          objective: 'Obj',
          requiresApproval: false,
          verificationPlan: {
            id: 'fail_plan',
            commands: [
              {
                id: 'fail_cmd',
                executable: process.execPath,
                args: ['-e', 'process.exit(1)'],
                mandatory: true,
              },
            ],
          },
        },
        { id: 't2', title: 'T2 (Direct Dep)', objective: 'Obj', dependencies: ['t1'], requiresApproval: false },
        { id: 't3', title: 'T3 (Transitive Dep)', objective: 'Obj', dependencies: ['t2'], requiresApproval: false },
      ],
    }

    const scheduler = new BoundedScheduler({
      runId: 'run_fail_prop',
      plan,
      repositoryRoot: repo.dir,
      baseBranch: repo.defaultBranch,
      runtimeRoot,
      harness,
      onEvent: () => {},
    })

    const result = await scheduler.execute()

    expect(result.status).toBe('FAILED')
    expect(scheduler.getTask('t1')?.state).toBe('FAILED')
    expect(scheduler.getTask('t2')?.state).toBe('CANCELLED')
    expect(scheduler.getTask('t3')?.state).toBe('CANCELLED')
  })

  it('handles composition conflict by failing task with COMPOSITION_CONFLICT', async () => {
    repo = await createTestRepo()
    runtimeRoot = await mkdtemp(join(tmpdir(), 'gravitas-runtime-'))

    const harness = createDeterministicHarness({
      onExecute: async (req) => {
        if (req.taskId === 't1') {
          // Edit shared.txt line 1
          await writeFile(join(req.worktreePath, 'shared.txt'), 'T1 VERSION\nline 2: base line\n', 'utf8')
        } else if (req.taskId === 't2') {
          // Conflicting edit on shared.txt line 1
          await writeFile(join(req.worktreePath, 'shared.txt'), 'T2 CONFLICTING VERSION\nline 2: base line\n', 'utf8')
        }
      },
    })

    const plan: RunPlan = {
      goal: 'Conflict DAG test',
      tasks: [
        { id: 't1', title: 'T1', objective: 'Obj', requiresApproval: false },
        { id: 't2', title: 'T2', objective: 'Obj', requiresApproval: false },
        { id: 't3', title: 'T3 (Joins both)', objective: 'Obj', dependencies: ['t1', 't2'], requiresApproval: false },
      ],
    }

    const scheduler = new BoundedScheduler({
      runId: 'run_conflict_dag',
      plan,
      repositoryRoot: repo.dir,
      baseBranch: repo.defaultBranch,
      runtimeRoot,
      harness,
      onEvent: () => {},
    })

    const result = await scheduler.execute()

    expect(result.status).toBe('FAILED')
    expect(scheduler.getTask('t1')?.state).toBe('SUCCEEDED')
    expect(scheduler.getTask('t2')?.state).toBe('SUCCEEDED')
    expect(scheduler.getTask('t3')?.state).toBe('FAILED')
  })

  it('rejects double execution when scheduler is already running', async () => {
    repo = await createTestRepo()
    runtimeRoot = await mkdtemp(join(tmpdir(), 'gravitas-runtime-'))

    const harness = createDeterministicHarness({ delayMs: 200 })

    const plan: RunPlan = {
      goal: 'Double execution test',
      tasks: [{ id: 't1', title: 'T1', objective: 'Obj', requiresApproval: false }],
    }

    const scheduler = new BoundedScheduler({
      runId: 'run_double_exec',
      plan,
      repositoryRoot: repo.dir,
      baseBranch: repo.defaultBranch,
      runtimeRoot,
      harness,
      onEvent: () => {},
    })

    const runPromise = scheduler.execute()

    await expect(scheduler.execute()).rejects.toThrow(/already executing/)

    await runPromise
  })
})
