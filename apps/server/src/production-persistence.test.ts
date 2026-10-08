/**
 * GRAVITAS V1-B-R3 — Production K5 Persistence & Runtime Verification Suite
 *
 * Proves that:
 * 1. Production startup attaches canonical persistence authority (isDurable === true).
 * 2. Trusted K5 result creates durable receipt-bound observation in SQLite.
 * 3. Shutdown and restart preserve the observation in SQLite.
 * 4. Reconstructed history produces identical routing aggregates.
 * 5. Replaying same observation does not increase counts (idempotency).
 * 6. Forged receipt cannot create verified success (fails closed).
 * 7. Unavailable database cannot falsely claim durable mode.
 * 8. Pre-V1-B database remains compatible.
 * 9. Offline desktop startup remains functional with zero qualified models.
 * 10. No secrets or model results leak into IPC or logs.
 */

import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { DatabaseSync } from 'node:sqlite';
import { executeGit } from '@gravitas/git';
import { WorkSessionKernel } from '@gravitas/core/kernel';
import { SqliteWriter, K5_AUTHORITY_BRAND, type DurableModelObservationStore } from '@gravitas/core';
import { ModelCapabilityHistory } from '@gravitas/gateways';
import { executeVerification, createVerificationReceipt, type VerificationPlan } from '@gravitas/verifier';
import { RunService } from './service.js';
import { InMemoryRegistry } from './registry.js';
import { EventHub } from './events.js';
import { KernelHost } from '../../desktop/src/kernel-host/kernelHost.js';

describe('GRAVITAS V1-B-R3 — Production K5 Persistence & Runtime Verification', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gravitas-v1b-r3-test-'));
    ModelCapabilityHistory.resetInstance();
  });

  afterEach(() => {
    ModelCapabilityHistory.resetInstance();
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  async function createTestWorktree(dir: string): Promise<string> {
    fs.mkdirSync(dir, { recursive: true });
    await executeGit({ cwd: dir, args: ['init', '-b', 'main'] });
    await executeGit({ cwd: dir, args: ['config', 'user.name', 'Tester'] });
    await executeGit({ cwd: dir, args: ['config', 'user.email', 'tester@test.local'] });
    await executeGit({ cwd: dir, args: ['commit', '--allow-empty', '-m', 'Initial'] });
    return dir;
  }

  it('1. Production startup attaches canonical persistence authority (isDurable === true)', async () => {
    const serviceRoot = path.join(tempDir, 'server-runtime');
    const runService = new RunService({
      registry: new InMemoryRegistry(),
      eventHub: new EventHub(),
      runtimeRoot: serviceRoot,
    });

    await runService.ensureKernelStarted();
    const history = ModelCapabilityHistory.getInstance();
    expect(history.isDurable).toBe(true);

    const kernel = runService.getKernel();
    expect(kernel).toBeDefined();
    expect(kernel!.getLifecycleState()).toBe('READY');

    await runService.stopScheduler();
  });

  it('2. Trusted K5 result creates durable receipt-bound observation in SQLite', async () => {
    const kernelRoot = path.join(tempDir, 'kernel-live');
    const kernel = new WorkSessionKernel({ dataRoot: kernelRoot });
    await kernel.start();

    const store = kernel.getModelObservationStore();
    const history = ModelCapabilityHistory.getInstance(store);
    expect(history.isDurable).toBe(true);

    const wsDir = await createTestWorktree(path.join(tempDir, 'worktree-02'));
    const plan: VerificationPlan = {
      id: 'plan-prod-002',
      commands: [
        {
          id: 'cmd-01',
          executable: process.execPath,
          args: ['-e', 'process.exit(0)'],
          mandatory: true,
        },
      ],
    };

    const result = await executeVerification({ plan, worktreePath: wsDir });
    expect(result.status).toBe('PASSED');

    const receipt = createVerificationReceipt(result, {
      workSessionId: 'ws-prod-002',
      taskId: 'task-prod-002',
      runId: 'run-prod-002',
      attemptNumber: 1,
    });
    expect((receipt as any)[K5_AUTHORITY_BRAND]).toBe(true);

    history.registerAuthoritativeReceipt(receipt);
    history.recordObservation({
      observationId: 'obs-prod-002',
      workSessionId: receipt.workSessionId,
      runId: receipt.runId,
      taskId: receipt.taskId,
      taskDomain: 'code_generation',
      taskComplexityClass: 'LOW',
      provider: 'nvidia-nim',
      model: 'meta/llama-3.1-70b-instruct',
      qualificationIdentity: 'llama70b@v1b',
      attemptNumber: 1,
      k5VerifiedOutcome: 'VERIFIED_PASS',
      latencyMs: 320,
      verificationPlanId: plan.id,
      verificationReceiptId: receipt.receiptId,
      verificationCompletedAt: receipt.completedAt,
      timestamp: new Date().toISOString(),
    });

    // Inspect SQLite directly
    const savedReceipt = store.getK5Receipt(receipt.receiptId);
    expect(savedReceipt).toBeDefined();
    expect(savedReceipt?.receiptId).toBe(receipt.receiptId);
    expect(savedReceipt?.verdict).toBe('VERIFIED_PASS');

    const savedObservations = store.listModelObservations();
    expect(savedObservations.length).toBe(1);
    expect(savedObservations[0].observationId).toBe('obs-prod-002');

    await kernel.shutdown();
  });

  it('3. Shutdown and restart preserve the observation in SQLite', async () => {
    const kernelRoot = path.join(tempDir, 'kernel-restart');
    
    // First boot
    const kernel1 = new WorkSessionKernel({ dataRoot: kernelRoot });
    await kernel1.start();
    const store1 = kernel1.getModelObservationStore();
    const history1 = new ModelCapabilityHistory(store1);

    const wsDir = await createTestWorktree(path.join(tempDir, 'worktree-03'));
    const plan: VerificationPlan = {
      id: 'plan-restart-003',
      commands: [
        {
          id: 'cmd-01',
          executable: process.execPath,
          args: ['-e', 'process.exit(0)'],
          mandatory: true,
        },
      ],
    };
    const result = await executeVerification({ plan, worktreePath: wsDir });
    const receipt = createVerificationReceipt(result, {
      workSessionId: 'ws-restart-003',
      taskId: 'task-restart-003',
      runId: 'run-restart-003',
      attemptNumber: 1,
    });
    history1.registerAuthoritativeReceipt(receipt);
    history1.recordObservation({
      observationId: 'obs-restart-003',
      taskId: receipt.taskId,
      taskDomain: 'code_generation',
      taskComplexityClass: 'LOW',
      provider: 'nvidia-nim',
      model: 'meta/llama-3.1-8b-instruct',
      qualificationIdentity: 'llama8b@v1b',
      attemptNumber: 1,
      k5VerifiedOutcome: 'VERIFIED_PASS',
      latencyMs: 150,
      verificationPlanId: plan.id,
      verificationReceiptId: receipt.receiptId,
      verificationCompletedAt: receipt.completedAt,
      timestamp: new Date().toISOString(),
    });

    await kernel1.shutdown();

    // Second boot on same data directory
    const kernel2 = new WorkSessionKernel({ dataRoot: kernelRoot });
    await kernel2.start();
    const store2 = kernel2.getModelObservationStore();

    const restoredObservations = store2.listModelObservations();
    expect(restoredObservations.length).toBe(1);
    expect(restoredObservations[0].observationId).toBe('obs-restart-003');

    const restoredReceipt = store2.getK5Receipt(receipt.receiptId);
    expect(restoredReceipt).toBeDefined();
    expect(restoredReceipt?.receiptId).toBe(receipt.receiptId);

    await kernel2.shutdown();
  });

  it('4. Reconstructed history produces identical routing aggregates', async () => {
    const kernelRoot = path.join(tempDir, 'kernel-aggregates');
    const kernel1 = new WorkSessionKernel({ dataRoot: kernelRoot });
    await kernel1.start();
    const history1 = new ModelCapabilityHistory(kernel1.getModelObservationStore());

    const wsDir = await createTestWorktree(path.join(tempDir, 'worktree-04'));
    const plan: VerificationPlan = {
      id: 'plan-agg-004',
      commands: [
        {
          id: 'cmd-01',
          executable: process.execPath,
          args: ['-e', 'process.exit(0)'],
          mandatory: true,
        },
      ],
    };
    const result = await executeVerification({ plan, worktreePath: wsDir });
    const receipt = createVerificationReceipt(result, {
      workSessionId: 'ws-agg-004',
      taskId: 'task-agg-004',
      runId: 'run-agg-004',
      attemptNumber: 1,
    });
    history1.registerAuthoritativeReceipt(receipt);
    history1.recordObservation({
      observationId: 'obs-agg-004',
      taskId: receipt.taskId,
      taskDomain: 'code_generation',
      taskComplexityClass: 'LOW',
      provider: 'nvidia-nim',
      model: 'mistralai/mixtral-8x7b-instruct-v0.1',
      qualificationIdentity: 'mixtral@v1b',
      attemptNumber: 1,
      k5VerifiedOutcome: 'VERIFIED_PASS',
      latencyMs: 220,
      verificationPlanId: plan.id,
      verificationReceiptId: receipt.receiptId,
      verificationCompletedAt: receipt.completedAt,
      timestamp: new Date().toISOString(),
    });

    const stats1 = history1.queryVerifiedSuccessRate('mistralai/mixtral-8x7b-instruct-v0.1');
    await kernel1.shutdown();

    // Reconstruct in a new session
    const kernel2 = new WorkSessionKernel({ dataRoot: kernelRoot });
    await kernel2.start();
    const history2 = new ModelCapabilityHistory(kernel2.getModelObservationStore());
    const stats2 = history2.queryVerifiedSuccessRate('mistralai/mixtral-8x7b-instruct-v0.1');

    expect(stats2.totalAttempts).toBe(stats1.totalAttempts);
    expect(stats2.verifiedPasses).toBe(stats1.verifiedPasses);
    expect(stats2.verifiedFailures).toBe(stats1.verifiedFailures);
    expect(stats2.successRate).toBe(stats1.successRate);
    expect(stats2.averageLatencyMs).toBe(stats1.averageLatencyMs);

    await kernel2.shutdown();
  });

  it('5. Replaying same observation does not increase counts (idempotency)', async () => {
    const kernelRoot = path.join(tempDir, 'kernel-idempotency');
    const kernel = new WorkSessionKernel({ dataRoot: kernelRoot });
    await kernel.start();
    const store = kernel.getModelObservationStore();
    const history = new ModelCapabilityHistory(store);

    const wsDir = await createTestWorktree(path.join(tempDir, 'worktree-05'));
    const plan: VerificationPlan = {
      id: 'plan-idemp-005',
      commands: [
        {
          id: 'cmd-01',
          executable: process.execPath,
          args: ['-e', 'process.exit(0)'],
          mandatory: true,
        },
      ],
    };
    const result = await executeVerification({ plan, worktreePath: wsDir });
    const receipt = createVerificationReceipt(result, {
      workSessionId: 'ws-idemp-005',
      taskId: 'task-idemp-005',
      runId: 'run-idemp-005',
      attemptNumber: 1,
    });
    history.registerAuthoritativeReceipt(receipt);

    const obs = {
      observationId: 'obs-idemp-005',
      taskId: receipt.taskId,
      taskDomain: 'code_generation' as const,
      taskComplexityClass: 'LOW' as const,
      provider: 'nvidia-nim',
      model: 'meta/llama-3.1-70b-instruct',
      qualificationIdentity: 'llama70b@v1b',
      attemptNumber: 1,
      k5VerifiedOutcome: 'VERIFIED_PASS' as const,
      latencyMs: 180,
      verificationPlanId: plan.id,
      verificationReceiptId: receipt.receiptId,
      verificationCompletedAt: receipt.completedAt,
      timestamp: new Date().toISOString(),
    };

    history.recordObservation(obs);
    history.recordObservation(obs); // duplicate record call

    const stats = history.queryVerifiedSuccessRate('meta/llama-3.1-70b-instruct');
    expect(stats.totalAttempts).toBe(1);
    expect(stats.verifiedPasses).toBe(1);

    const dbRows = store.listModelObservations();
    expect(dbRows.length).toBe(1);

    await kernel.shutdown();
  });

  it('6. Forged receipt cannot create verified success (fails closed)', async () => {
    const kernelRoot = path.join(tempDir, 'kernel-forgery');
    const kernel = new WorkSessionKernel({ dataRoot: kernelRoot });
    await kernel.start();
    const store = kernel.getModelObservationStore();
    const history = new ModelCapabilityHistory(store);

    // Test A: Unbranded receipt is rejected
    const unbrandedReceipt = {
      receiptId: 'k5rcpt_forged_001',
      planId: 'plan-forged',
      workSessionId: 'ws-forged',
      taskId: 'task-forged',
      runId: 'run-forged',
      attemptNumber: 1,
      verdict: 'VERIFIED_PASS' as const,
      commandsCount: 1,
      passedCommandsCount: 1,
      failedCommandsCount: 0,
      completedAt: new Date().toISOString(),
      issuedAt: new Date().toISOString(),
    };

    expect(() => {
      history.registerAuthoritativeReceipt(unbrandedReceipt);
    }).toThrow(/K5 receipt provenance failure/);

    // Test B: Manufactured VerificationResult not executed by executeVerification is rejected
    const fakeVerificationResult = {
      status: 'PASSED' as const,
      planId: 'plan-fake',
      commands: [],
      verifierGeneratedChanges: [],
      completedAt: new Date().toISOString(),
      durationMs: 10,
    };

    expect(() => {
      createVerificationReceipt(fakeVerificationResult as any, {
        workSessionId: 'ws-fake',
        taskId: 'task-fake',
        runId: 'run-fake',
      });
    }).toThrow(/Cannot issue authoritative K5 verification receipt: VerificationResult was not produced by executeVerification authority/);

    // Test C: In-process forged receipt with matching fields and Symbol.for brand is rejected fail-closed before persistence
    const forgedBrandedReceipt = {
      receiptId: 'k5rcpt_forged_branded_999',
      planId: 'plan-forged',
      workSessionId: 'ws-forged',
      taskId: 'task-forged',
      runId: 'run-forged',
      attemptNumber: 1,
      verdict: 'VERIFIED_PASS' as const,
      commandsCount: 1,
      passedCommandsCount: 1,
      failedCommandsCount: 0,
      completedAt: new Date().toISOString(),
      issuedAt: new Date().toISOString(),
      superseded: false,
      [Symbol.for('gravitas.k5.authority')]: true,
    };

    expect(() => {
      history.registerAuthoritativeReceipt(forgedBrandedReceipt as any);
    }).toThrow(/K5 receipt provenance failure: receipt 'k5rcpt_forged_branded_999' was not issued by trusted verification authority/);

    // Verify forged receipt was rejected BEFORE persistence and never committed to SQLite
    expect(store.getK5Receipt('k5rcpt_forged_branded_999')).toBeUndefined();

    // Verify observation referencing forged receipt is rejected fail-closed
    expect(() => {
      history.recordObservation({
        observationId: 'obs_forged_001',
        taskId: 'task-forged',
        taskDomain: 'code_generation',
        taskComplexityClass: 'LOW',
        provider: 'nvidia-nim',
        model: 'meta/llama-3.1-70b-instruct',
        qualificationIdentity: 'test',
        attemptNumber: 1,
        k5VerifiedOutcome: 'VERIFIED_PASS',
        latencyMs: 100,
        verificationPlanId: 'plan-forged',
        verificationReceiptId: 'k5rcpt_forged_branded_999',
        timestamp: new Date().toISOString(),
      });
    }).toThrow(/does not exist in authoritative verification records/);

    await kernel.shutdown();
  });

  it('7. Unavailable database cannot falsely claim durable mode', () => {
    const memoryHistory = new ModelCapabilityHistory(null);
    expect(memoryHistory.isDurable).toBe(false);

    // Detaching writer restores non-durable status
    const dummyWriter: DurableModelObservationStore = {
      insertK5Receipt: () => {},
      getK5Receipt: () => undefined,
      listK5ReceiptsForTask: () => [],
      listAllK5Receipts: () => [],
      markK5ReceiptSuperseded: () => {},
      insertModelObservation: () => {},
      getModelObservation: () => undefined,
      getModelObservationByReceiptId: () => undefined,
      listModelObservations: () => [],
      listModelObservationsForModel: () => [],
    };

    memoryHistory.setDurableWriter(dummyWriter);
    expect(memoryHistory.isDurable).toBe(true);

    memoryHistory.detachDurableWriter();
    expect(memoryHistory.isDurable).toBe(false);
  });

  it('8. Pre-V1-B database remains compatible', async () => {
    const preDbDir = path.join(tempDir, 'pre-v1b-db');
    fs.mkdirSync(preDbDir, { recursive: true });
    const dbPath = path.join(preDbDir, 'kernel.db');

    // Create a pre-V1-B database with legacy schema
    const rawDb = new DatabaseSync(dbPath);
    rawDb.exec(`
      CREATE TABLE schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL,
        checksum_sha256 TEXT NOT NULL
      );
      INSERT INTO schema_migrations VALUES (1, 'v1_initial', '2026-10-01T00:00:00.000Z', 'pre-v1b-checksum');
      CREATE TABLE work_sessions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        objective TEXT NOT NULL,
        repository_root TEXT NOT NULL,
        base_branch TEXT NOT NULL DEFAULT 'main',
        state TEXT NOT NULL CHECK (state IN ('CREATED', 'READY', 'ACTIVE', 'WAITING_APPROVAL', 'PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED', 'RECOVERY_REQUIRED')),
        revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        terminal_reason TEXT,
        recovery_metadata_json TEXT NOT NULL DEFAULT '{}',
        metadata_json TEXT NOT NULL DEFAULT '{}'
      );
      INSERT INTO work_sessions (id, title, objective, repository_root, state, revision, created_at, updated_at)
      VALUES ('ws-legacy-01', 'Legacy Session', 'Legacy Goal', '/repo/legacy', 'READY', 1, '2026-10-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z');
    `);
    rawDb.close();

    // Start kernel on this database
    const kernel = new WorkSessionKernel({ dataRoot: preDbDir });
    await kernel.start();
    expect(kernel.getLifecycleState()).toBe('READY');

    // Verify legacy rows still exist
    const writer = new SqliteWriter({ databasePath: dbPath });
    const legacySession = writer.getWorkSession('ws-legacy-01');
    expect(legacySession).toBeDefined();
    expect(legacySession?.objective).toBe('Legacy Goal');

    // Verify new V1-B tables were migrated cleanly and are operational
    const store = kernel.getModelObservationStore();
    expect(store).toBeDefined();
    expect(store.listAllK5Receipts().length).toBe(0);
    expect(store.listModelObservations().length).toBe(0);

    writer.close();
    await kernel.shutdown();
  });

  it('9. Offline desktop startup remains functional with zero qualified models', async () => {
    const hostDir = path.join(tempDir, 'desktop-kernel');
    const host = new KernelHost({ dataRoot: hostDir });
    await host.start();

    expect(host.getStatus()).toBe('READY');
    expect(ModelCapabilityHistory.getInstance().isDurable).toBe(true);

    const projection = host.generateSystemProjection();
    expect(projection.modelIntelligenceSummary).toBeDefined();
    const summary = projection.modelIntelligenceSummary!;

    // Offline uncredentialed state has 0 qualified models, 3 candidates
    expect(summary.qualifiedModelsCount).toBe(0);
    expect(summary.candidateModelsCount).toBe(3);
    expect(summary.outOfPocketUsd).toBe(0);
    expect(summary.costPolicy).toBe('STRICT_ZERO_DOLLAR_FREE');

    await host.shutdown();
    expect(host.getStatus()).toBe('STOPPED');
  });

  it('10. No secrets or model results leak into IPC or logs', async () => {
    const hostDir = path.join(tempDir, 'desktop-leak-test');
    let emittedMessages: any[] = [];
    const host = new KernelHost({
      dataRoot: hostDir,
      onMessage: (msg) => {
        emittedMessages.push(msg);
      },
    });
    await host.start();

    // Trigger projection queries
    host.generateSystemProjection();
    host.generateOverviewProjection();

    const serialized = JSON.stringify(emittedMessages);
    expect(serialized).not.toContain('nvapi-');
    expect(serialized).not.toContain('Bearer ');
    expect(serialized).not.toContain('sk-');
    expect(serialized).not.toContain('password');

    await host.shutdown();
  });
});
