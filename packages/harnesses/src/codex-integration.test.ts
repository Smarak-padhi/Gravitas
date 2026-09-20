/**
 * Codex Worker Integration & Golden Loop Production Proof.
 *
 * Proves:
 * 1. Agent Registry recognizes codex-worker as READY and isProductionQualified: true
 *    when fed genuine Wave 10.1 qualification evidence (schemaVersion 2).
 * 2. CapabilityGrant is issued for TaskRequirement.
 * 3. BoundedScheduler executes real CodexHarness in isolated worktree with Git authority containment.
 * 4. Deterministic verification passes (node --test).
 * 5. Task pauses at WAITING_APPROVAL.
 * 6. Operator approves -> materializes verified result commit.
 * 7. Primary repository remains completely pristine.
 */

import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  DefaultAgentRegistry,
  canSatisfyRequirement,
  issueCapabilityGrant,
  type TaskRequirement,
} from '@gravitas/agents'
import {
  allocateWorktree,
  executeGit,
  inspectRepository,
  removeWorktree,
} from '@gravitas/git'
import { BoundedScheduler, type RunPlan } from '@gravitas/orchestrator'
import type { GravitasEvent, Task } from '@gravitas/core'
import { CodexHarness, resolveCodexExecutable } from './codex.js'

describe('Codex Worker Production Golden Loop (codex-integration.test.ts)', () => {
  let primaryRepoPath: string
  let runtimeRoot: string

  beforeEach(async () => {
    primaryRepoPath = await mkdtemp(join(tmpdir(), 'gravitas-codex-primary-'))
    runtimeRoot = await mkdtemp(join(tmpdir(), 'gravitas-codex-runtime-'))

    // 1. Initialize clean fixture repository
    await executeGit({ cwd: primaryRepoPath, args: ['init', '-b', 'main'] })
    await executeGit({ cwd: primaryRepoPath, args: ['config', 'user.name', 'Gravitas Tester'] })
    await executeGit({ cwd: primaryRepoPath, args: ['config', 'user.email', 'tester@gravitas.local'] })

    // 2. Add package.json
    await writeFile(
      join(primaryRepoPath, 'package.json'),
      JSON.stringify({ name: 'codex-golden-fixture', type: 'module', version: '1.0.0' }, null, 2),
      'utf8'
    )

    // 3. Add baseline src/math.js with intentional bug
    await mkdir(join(primaryRepoPath, 'src'), { recursive: true })
    await writeFile(
      join(primaryRepoPath, 'src', 'math.js'),
      'export function add(a, b) {\n  return 0;\n}\n',
      'utf8'
    )

    // 4. Add deterministic unit test suite using node:test
    await mkdir(join(primaryRepoPath, 'test'), { recursive: true })
    await writeFile(
      join(primaryRepoPath, 'test', 'math.test.js'),
      `import test from 'node:test';
import assert from 'node:assert/strict';
import { add } from '../src/math.js';

test('add positive numbers', () => {
  assert.equal(add(2, 3), 5);
});

test('add with negative numbers', () => {
  assert.equal(add(-2, 2), 0);
});
`,
      'utf8'
    )

    await executeGit({ cwd: primaryRepoPath, args: ['add', '.'] })
    await executeGit({ cwd: primaryRepoPath, args: ['commit', '-m', 'Initial baseline commit'] })
  })

  afterEach(async () => {
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

  it('proves full production pipeline from Agent Registry to Materialization with codex-worker', async () => {
    // Check if codex native binary is installed
    const codexBin = resolveCodexExecutable()
    if (!codexBin) {
      console.warn('Codex executable not found; skipping live test')
      return
    }

    // Step 1: Initialize Agent Registry
    const registry = new DefaultAgentRegistry()
    const codexBefore = registry.get('codex-worker')!
    expect(codexBefore.qualificationStatus).toBe('UNQUALIFIED')
    expect(codexBefore.isProductionQualified).toBe(false)

    // Step 2: Load actual qualification evidence
    const evidenceRaw = await readFile(join(process.cwd(), 'codex-qualification.json'), 'utf8')
    const evidence = JSON.parse(evidenceRaw)
    expect(evidence.schemaVersion).toBe(2)
    expect(evidence.securityProfileVersion).toBe('wave10.1-git-contained')
    expect(evidence.decision).toBe('APPROVED')

    // Step 3: Apply evidence to transition codex-worker to READY
    const applied = registry.applyQualificationEvidence(evidence, evidence.codexVersion)
    expect(applied).toBe(true)

    const codexAfter = registry.get('codex-worker')!
    expect(codexAfter.qualificationStatus).toBe('READY')
    expect(codexAfter.isProductionQualified).toBe(true)

    // Step 4: Requirement Matching & Capability Grant
    const requirement: TaskRequirement = {
      taskId: 'task_codex_golden_1',
      requiredCapabilities: ['filesystem.read', 'filesystem.write'],
      requireProductionReady: true,
    }

    const eligible = registry.findEligible(requirement)
    expect(eligible.some((a) => a.id === 'codex-worker')).toBe(true)

    const match = canSatisfyRequirement(codexAfter, requirement)
    expect(match.satisfied).toBe(true)

    const grant = issueCapabilityGrant(codexAfter, requirement)
    expect(grant.agentId).toBe('codex-worker')
    expect(grant.grantedCapabilities).toEqual(['filesystem.read', 'filesystem.write'])

    // Step 5: BoundedScheduler DAG Execution with CodexHarness
    const events: GravitasEvent[] = []
    const updatedTasks: Task[] = []

    const plan: RunPlan = {
      goal: 'Fix math.js add function using qualified Codex worker',
      maxConcurrency: 1,
      tasks: [
        {
          id: 'task_codex_golden_1',
          title: 'Fix math.js add function',
          objective: 'Fix the add function in src/math.js to return a + b instead of 0. Only modify src/math.js.',
          requiresApproval: true,
          dependencies: [],
          verificationPlan: {
            id: 'plan_node_test',
            commands: [
              {
                id: 'cmd_test',
                executable: process.execPath,
                args: ['--test', 'test/math.test.js'],
                mandatory: true,
                timeoutMs: 30000,
              },
            ],
            requiredFiles: ['src/math.js'],
          },
        },
      ],
    }

    const codexHarness = new CodexHarness()
    const scheduler = new BoundedScheduler({
      runId: 'run_codex_golden_prod',
      plan,
      repositoryRoot: primaryRepoPath,
      baseBranch: 'main',
      runtimeRoot,
      harness: codexHarness,
      onEvent: (evt) => events.push(evt),
      onTaskUpdated: (t) => updatedTasks.push(t),
    })

    // Execute scheduler in background
    const schedulerPromise = scheduler.execute()

    // Wait for task to reach WAITING_APPROVAL
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        clearInterval(interval)
        reject(new Error('Timed out waiting for task to reach WAITING_APPROVAL'))
      }, 120_000)

      const interval = setInterval(() => {
        const t = scheduler.getTask('task_codex_golden_1')
        if (t?.state === 'WAITING_APPROVAL') {
          clearTimeout(timeout)
          clearInterval(interval)
          resolve()
        } else if (t?.state === 'FAILED') {
          clearTimeout(timeout)
          clearInterval(interval)
          reject(new Error(`Task failed unexpectedly: ${t.failureReason ?? 'unknown'}`))
        }
      }, 500)
    })

    // Verify task reached WAITING_APPROVAL
    const taskWaiting = scheduler.getTask('task_codex_golden_1')!
    expect(taskWaiting.state).toBe('WAITING_APPROVAL')

    // Step 6: Operator approves candidate
    const approvedTask = await scheduler.approveTask('task_codex_golden_1', 'Operator confirmed math.js fix')
    expect(approvedTask.state).toBe('APPROVED')

    // Wait for scheduler to complete execution
    await schedulerPromise

    // Step 7: Verify final states
    const taskFinal = scheduler.getTask('task_codex_golden_1')!
    expect(taskFinal.state).toBe('APPROVED')
    const materializedSha = scheduler.getMaterializedCommits()['task_codex_golden_1']
    expect(materializedSha).toBeDefined()

    // Step 8: Verify primary repository remained clean and untouched
    const primaryInspection = await inspectRepository(primaryRepoPath)
    expect(primaryInspection.isClean).toBe(true)
    const primaryMath = await readFile(join(primaryRepoPath, 'src', 'math.js'), 'utf8')
    expect(primaryMath).toContain('return 0') // Untouched in primary main branch!

    // Verify task branch has materialized result commit with fix
    const taskBranchDiff = await executeGit({
      cwd: primaryRepoPath,
      args: ['diff', 'main', materializedSha!],
    })
    expect(taskBranchDiff.stdout).toContain('+  return a + b')
  }, 180_000)
})
