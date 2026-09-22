import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, afterEach } from 'vitest'
import {
  assertIntegratorAuthority,
  type GravitasEvent,
} from '@gravitas/core'
import { BoundedScheduler } from './scheduler.js'
import { createDeterministicHarness, createTestRepo, type TestRepo } from './test-utils.js'
import type { RunPlan } from './types.js'
import { PlanValidationError } from './errors.js'

describe('Role-Aware Multi-Agent Handoffs & Integration Pipeline (Wave 12F)', () => {
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

  it('executes role-aware review and integration pipeline end-to-end', { timeout: 60000 }, async () => {
    repo = await createTestRepo()
    runtimeRoot = await mkdtemp(join(tmpdir(), 'gravitas-handoff-'))

    const events: GravitasEvent[] = []
    const harness = createDeterministicHarness({
      id: 'codex-worker',
      onExecute: async (req) => {
        await writeFile(join(req.worktreePath, `${req.taskId}.txt`), `output of ${req.taskId}\n`, 'utf8')
      },
    })

    const plan: RunPlan = {
      goal: 'Role-aware collaboration and integration pipeline',
      tasks: [
        {
          id: 't_fe',
          title: 'Frontend Component',
          objective: 'Build client UI component',
          roleId: 'role:engineering:frontend-engineer',
          requiresApproval: false,
          requiredArtifacts: ['artifact_t_fe'],
        },
        {
          id: 't_be',
          title: 'Backend API',
          objective: 'Build API handler',
          roleId: 'role:engineering:backend-engineer',
          requiresApproval: false,
          requiredArtifacts: ['artifact_t_be'],
        },
        {
          id: 't_rev',
          title: 'Independent Review of Frontend',
          objective: 'Audit frontend implementation',
          roleId: 'role:quality:independent-reviewer',
          reviewOfTaskId: 't_fe',
          dependencies: ['t_fe'],
          requiresApproval: false,
        },
        {
          id: 't_int',
          title: 'Integration Preparation',
          objective: 'Reconcile frontend and backend changes',
          roleId: 'role:integration:integration-engineer',
          dependencies: ['t_fe', 't_be', 't_rev'],
          requiresApproval: false,
        },
      ],
    }

    const scheduler = new BoundedScheduler({
      runId: 'run_role_handoff',
      plan,
      repositoryRoot: repo.dir,
      baseBranch: repo.defaultBranch,
      runtimeRoot,
      harness,
      onEvent: (evt) => events.push(evt),
    })

    // Check initial handoffs created
    const initialHandoffs = scheduler.getHandoffs()
    expect(initialHandoffs.length).toBeGreaterThanOrEqual(4)

    const reviewHandoff = initialHandoffs.find((h) => h.kind === 'REVIEW')
    expect(reviewHandoff).toBeDefined()
    expect(reviewHandoff?.sourceTaskId).toBe('t_fe')
    expect(reviewHandoff?.targetTaskId).toBe('t_rev')
    expect(reviewHandoff?.sourceRoleId).toBe('role:engineering:frontend-engineer')
    expect(reviewHandoff?.targetRoleId).toBe('role:quality:independent-reviewer')

    const integrationHandoffs = initialHandoffs.filter((h) => h.kind === 'INTEGRATION')
    expect(integrationHandoffs.length).toBe(3) // from t_fe, t_be, and t_rev to t_int

    const result = await scheduler.execute()
    expect(result.status).toBe('COMPLETED')

    // Verify artifact custody & provenance
    const artifacts = result.artifacts ?? scheduler.getArtifacts()
    expect(artifacts.length).toBeGreaterThanOrEqual(2)
    const feArtifact = artifacts.find((a) => a.sourceTaskId === 't_fe')
    expect(feArtifact?.sourceRoleId).toBe('role:engineering:frontend-engineer')
    expect(feArtifact?.sourceHarnessId).toBe('codex-worker')
    expect(feArtifact?.verificationState).toBe('VERIFIED')

    const beArtifact = artifacts.find((a) => a.sourceTaskId === 't_be')
    expect(beArtifact?.sourceRoleId).toBe('role:engineering:backend-engineer')
    expect(beArtifact?.sourceHarnessId).toBe('codex-worker')

    // Verify review result recorded
    const reviews = result.reviewResults ?? scheduler.getReviewResults()
    expect(reviews.length).toBe(1)
    expect(reviews[0]?.verdict).toBe('PASS')
    expect(reviews[0]?.reviewedTaskId).toBe('t_fe')

    // Verify integration preparation recorded
    const integrations = result.integrationResults ?? scheduler.getIntegrationResults()
    expect(integrations.length).toBe(1)
    expect(integrations[0]?.disposition).toBe('READY_FOR_VERIFICATION')

    // Verify all handoffs satisfied
    const finalHandoffs = result.handoffs ?? scheduler.getHandoffs()
    for (const handoff of finalHandoffs) {
      expect(handoff.state).toBe('SATISFIED')
    }
  })

  it('rejects plan when reviewer equals author role (independence violation)', async () => {
    repo = await createTestRepo()
    runtimeRoot = await mkdtemp(join(tmpdir(), 'gravitas-indep-'))

    const plan: RunPlan = {
      goal: 'Invalid self-review plan',
      tasks: [
        {
          id: 't_fe',
          title: 'Frontend Component',
          objective: 'Build UI',
          roleId: 'role:engineering:frontend-engineer',
        },
        {
          id: 't_rev',
          title: 'Review Frontend',
          objective: 'Review UI',
          roleId: 'role:engineering:frontend-engineer', // VIOLATION: same role
          reviewOfTaskId: 't_fe',
          dependencies: ['t_fe'],
        },
      ],
    }

    const harness = createDeterministicHarness({ id: 'dummy' })

    expect(
      () =>
        new BoundedScheduler({
          runId: 'run_violating',
          plan,
          repositoryRoot: repo.dir,
          baseBranch: repo.defaultBranch,
          runtimeRoot,
          harness,
          onEvent: () => {},
        })
    ).toThrow(PlanValidationError)
  })

  it('blocks integration when review verdict is CHANGES_REQUIRED', async () => {
    repo = await createTestRepo()
    runtimeRoot = await mkdtemp(join(tmpdir(), 'gravitas-rev-changes-'))

    const harness = createDeterministicHarness({
      id: 'codex-worker',
      onExecute: async (req) => {
        await writeFile(join(req.worktreePath, `${req.taskId}.txt`), 'content\n', 'utf8')
      },
    })

    const plan: RunPlan = {
      goal: 'Review rejection test',
      tasks: [
        {
          id: 't_fe',
          title: 'Frontend Component',
          objective: 'Build UI',
          roleId: 'role:engineering:frontend-engineer',
          requiresApproval: false,
        },
        {
          id: 't_rev',
          title: 'Review',
          objective: 'Audit UI',
          roleId: 'role:quality:independent-reviewer',
          reviewOfTaskId: 't_fe',
          dependencies: ['t_fe'],
          requiresApproval: false,
        },
        {
          id: 't_int',
          title: 'Integration',
          objective: 'Integrate',
          roleId: 'role:integration:integration-engineer',
          dependencies: ['t_fe', 't_rev'],
          requiresApproval: false,
        },
      ],
    }

    const scheduler = new BoundedScheduler({
      runId: 'run_rev_changes',
      plan,
      repositoryRoot: repo.dir,
      baseBranch: repo.defaultBranch,
      runtimeRoot,
      harness,
      onEvent: () => {},
    })

    // Simulate reviewer rejecting before downstream unlocks
    scheduler.recordReviewResult({
      reviewedTaskId: 't_fe',
      reviewerTaskId: 't_rev',
      reviewerRoleId: 'role:quality:independent-reviewer',
      verdict: 'CHANGES_REQUIRED',
      findings: [{ severity: 'BLOCKER', message: 'Visual regression detected' }],
      timestamp: new Date().toISOString(),
    })

    const handoffs = scheduler.getHandoffs()
    const revHandoff = handoffs.find((h) => h.kind === 'REVIEW')
    expect(revHandoff?.state).toBe('FAILED')
    expect(revHandoff?.reasonCode).toBe('REVIEW_CHANGES_REQUIRED')
  })

  it('proves integration conflict blocks verifier and marks handoff failed', async () => {
    repo = await createTestRepo()
    runtimeRoot = await mkdtemp(join(tmpdir(), 'gravitas-conflict-'))

    const harness = createDeterministicHarness({ id: 'dummy' })
    const plan: RunPlan = {
      goal: 'Integration conflict test',
      tasks: [
        { id: 't_fe', title: 'FE', objective: 'fe', roleId: 'role:engineering:frontend-engineer' },
        {
          id: 't_int',
          title: 'INT',
          objective: 'int',
          roleId: 'role:integration:integration-engineer',
          dependencies: ['t_fe'],
        },
      ],
    }

    const scheduler = new BoundedScheduler({
      runId: 'run_conflict',
      plan,
      repositoryRoot: repo.dir,
      baseBranch: repo.defaultBranch,
      runtimeRoot,
      harness,
      onEvent: () => {},
    })

    scheduler.recordIntegrationResult({
      sourceTaskIds: ['t_fe'],
      integrationTaskId: 't_int',
      disposition: 'CONFLICT',
      conflictFiles: ['apps/web/src/App.tsx'],
      timestamp: new Date().toISOString(),
    })

    const incoming = scheduler.getIncomingHandoffs('t_int')
    expect(incoming[0]?.state).toBe('FAILED')
    expect(incoming[0]?.reasonCode).toBe('INTEGRATION_CONFLICT')
  })

  it('proves Integration Engineer has zero auto-merge authority', () => {
    const mergeCheck = assertIntegratorAuthority('role:integration:integration-engineer', 'MERGE_MAIN')
    expect(mergeCheck.allowed).toBe(false)
    expect(mergeCheck.reason).toMatch(/cannot execute 'MERGE_MAIN'/i)

    const bypassCheck = assertIntegratorAuthority('role:integration:integration-engineer', 'BYPASS_APPROVAL')
    expect(bypassCheck.allowed).toBe(false)

    const prepCheck = assertIntegratorAuthority('role:integration:integration-engineer', 'PREPARE_INTEGRATION')
    expect(prepCheck.allowed).toBe(true)
  })

  it('harness swap leaves role and handoffs invariant across executions', { timeout: 60000 }, async () => {
    repo = await createTestRepo()
    runtimeRoot = await mkdtemp(join(tmpdir(), 'gravitas-swap-'))

    const makePlan = (): RunPlan => ({
      goal: 'Harness swap invariance test',
      tasks: [
        {
          id: 't_fe',
          title: 'FE',
          objective: 'FE step',
          roleId: 'role:engineering:frontend-engineer',
          requiresApproval: false,
        },
        {
          id: 't_be',
          title: 'BE',
          objective: 'BE step',
          roleId: 'role:engineering:backend-engineer',
          dependencies: ['t_fe'],
          requiresApproval: false,
        },
      ],
    })

    // Run 1: with codex-worker harness
    const codexHarness = createDeterministicHarness({
      id: 'codex-worker',
      onExecute: async (req) => {
        await writeFile(join(req.worktreePath, `${req.taskId}.txt`), 'codex', 'utf8')
      },
    })
    const scheduler1 = new BoundedScheduler({
      runId: 'run_codex',
      plan: makePlan(),
      repositoryRoot: repo.dir,
      baseBranch: repo.defaultBranch,
      runtimeRoot,
      harness: codexHarness,
      onEvent: () => {},
    })
    const res1 = await scheduler1.execute()

    // Run 2: with fcc-worker harness
    const fccHarness = createDeterministicHarness({
      id: 'fcc-worker',
      onExecute: async (req) => {
        await writeFile(join(req.worktreePath, `${req.taskId}.txt`), 'fcc', 'utf8')
      },
    })
    const scheduler2 = new BoundedScheduler({
      runId: 'run_fcc',
      plan: makePlan(),
      repositoryRoot: repo.dir,
      baseBranch: repo.defaultBranch,
      runtimeRoot,
      harness: fccHarness,
      onEvent: () => {},
    })
    const res2 = await scheduler2.execute()

    // Invariant checks:
    expect(res1.status).toBe('COMPLETED')
    expect(res2.status).toBe('COMPLETED')

    // Same role identity on both runs
    expect(res1.tasks[0]?.roleAssignment?.roleId).toBe('role:engineering:frontend-engineer')
    expect(res2.tasks[0]?.roleAssignment?.roleId).toBe('role:engineering:frontend-engineer')

    // Same handoff structure
    expect(res1.handoffs?.length).toBe(res2.handoffs?.length)
    expect(res1.handoffs?.[0]?.sourceRoleId).toBe(res2.handoffs?.[0]?.sourceRoleId)
    expect(res1.handoffs?.[0]?.targetRoleId).toBe(res2.handoffs?.[0]?.targetRoleId)

    // Only harness telemetry differs in artifacts
    expect(res1.artifacts?.[0]?.sourceHarnessId).toBe('codex-worker')
    expect(res2.artifacts?.[0]?.sourceHarnessId).toBe('fcc-worker')
  })
})
