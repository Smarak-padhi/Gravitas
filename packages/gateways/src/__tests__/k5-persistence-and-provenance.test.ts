import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { SqliteWriter, K5_AUTHORITY_BRAND } from '@gravitas/core';
import { createAuthoritativeReceiptForTest } from '@gravitas/verifier';
import { ModelCapabilityHistory, type K5ReceiptLike } from '../models/history.js';
import type { ModelExecutionObservation } from '../models/types.js';

describe('GRAVITAS V1-B-R2 — K5 Persistence & Receipt Provenance Suite', () => {
  let tempDir: string;
  let dbPath: string;
  let writer: SqliteWriter;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gravitas-k5-test-'));
    dbPath = path.join(tempDir, 'kernel.db');
    writer = new SqliteWriter({ databasePath: dbPath });
    ModelCapabilityHistory.resetInstance();
  });

  afterEach(() => {
    try {
      writer.close();
    } catch {
      // ignore
    }
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
    ModelCapabilityHistory.resetInstance();
  });

  function createValidReceipt(overrides: Partial<K5ReceiptLike> = {}): K5ReceiptLike {
    return createAuthoritativeReceiptForTest({
      receiptId: 'k5rcpt_test_task1_plan1_001',
      planId: 'plan-k5-001',
      workSessionId: 'ws-test-001',
      taskId: 'task-001',
      runId: 'run-001',
      attemptNumber: 1,
      verdict: 'VERIFIED_PASS',
      commandsCount: 2,
      passedCommandsCount: 2,
      failedCommandsCount: 0,
      completedAt: '2026-10-08T10:00:00.000Z',
      issuedAt: '2026-10-08T10:00:01.000Z',
      superseded: false,
      ...overrides,
    } as any);
  }

  function createValidObservation(receipt: K5ReceiptLike, overrides: Partial<ModelExecutionObservation> = {}): ModelExecutionObservation {
    return {
      observationId: 'obs-001',
      workSessionId: receipt.workSessionId,
      runId: receipt.runId,
      taskId: receipt.taskId,
      taskDomain: 'code_generation',
      taskComplexityClass: 'MEDIUM',
      provider: 'nvidia-nim',
      model: 'meta/llama-3.1-70b-instruct',
      qualificationIdentity: 'meta/llama-3.1-70b-instruct@v1b',
      attemptNumber: receipt.attemptNumber,
      k5VerifiedOutcome: 'VERIFIED_PASS',
      latencyMs: 1250,
      tokenUsage: {
        promptTokens: 500,
        completionTokens: 200,
        totalTokens: 700,
      },
      verificationPlanId: receipt.planId,
      verificationReceiptId: receipt.receiptId,
      verificationCompletedAt: receipt.completedAt,
      timestamp: '2026-10-08T10:00:05.000Z',
      ...overrides,
    };
  }

  describe('Receipt Provenance Fail-Closed Invariants', () => {
    it('1. Rejection of unrecorded / fabricated receipt (fail-closed)', () => {
      const history = new ModelCapabilityHistory();
      const obs: ModelExecutionObservation = {
        observationId: 'obs-fabricated',
        taskId: 'task-001',
        taskDomain: 'code_generation',
        taskComplexityClass: 'LOW',
        provider: 'nvidia-nim',
        model: 'meta/llama-3.1-8b-instruct',
        qualificationIdentity: 'test',
        attemptNumber: 1,
        k5VerifiedOutcome: 'VERIFIED_PASS',
        latencyMs: 100,
        verificationPlanId: 'plan-1',
        verificationReceiptId: 'k5rcpt_fabricated_does_not_exist',
        timestamp: new Date().toISOString(),
      };

      expect(() => {
        history.recordObservation(obs);
      }).toThrow(/does not exist in authoritative verification records/);
    });

    it('2. Rejection of receipt from another task (task ID mismatch / substitution)', () => {
      const history = new ModelCapabilityHistory();
      const receipt = createValidReceipt({ taskId: 'task-legitimate' });
      history.registerAuthoritativeReceipt(receipt);

      const obs = createValidObservation(receipt, {
        observationId: 'obs-substituted',
        taskId: 'task-malicious-substitution', // Attempting to use another task's receipt
      });

      expect(() => {
        history.recordObservation(obs);
      }).toThrow(/Caller cannot substitute another task's receipt/);
    });

    it('3. Rejection of receipt with plan ID mismatch', () => {
      const history = new ModelCapabilityHistory();
      const receipt = createValidReceipt({ planId: 'plan-real' });
      history.registerAuthoritativeReceipt(receipt);

      const obs = createValidObservation(receipt, {
        observationId: 'obs-mismatched-plan',
        verificationPlanId: 'plan-fake-mismatch',
      });

      expect(() => {
        history.recordObservation(obs);
      }).toThrow(/receipt plan ID .* does not match observation verificationPlanId/);
    });

    it('4. Rejection of postdated receipt (receipt completed after observation timestamp)', () => {
      const history = new ModelCapabilityHistory();
      const receipt = createValidReceipt({ completedAt: '2026-10-08T12:00:00.000Z' });
      history.registerAuthoritativeReceipt(receipt);

      const obs = createValidObservation(receipt, {
        observationId: 'obs-postdated',
        timestamp: '2026-10-08T11:00:00.000Z', // Observation claims to have happened BEFORE receipt was completed
      });

      expect(() => {
        history.recordObservation(obs);
      }).toThrow(/receipt completion time .* postdates observation timestamp/);
    });

    it('5. Rejection of receipt verdict mismatch (receipt failed but observation claims pass)', () => {
      const history = new ModelCapabilityHistory();
      const receipt = createValidReceipt({ verdict: 'VERIFIED_FAIL' });
      history.registerAuthoritativeReceipt(receipt);

      const obs = createValidObservation(receipt, {
        observationId: 'obs-lying-pass',
        k5VerifiedOutcome: 'VERIFIED_PASS',
      });

      expect(() => {
        history.recordObservation(obs);
      }).toThrow(/receipt verdict 'VERIFIED_FAIL' does not match observation outcome 'VERIFIED_PASS'/);
    });

    it('6. Rejection of revoked or superseded receipt', () => {
      const history = new ModelCapabilityHistory();
      const receipt = createValidReceipt({ superseded: true });
      history.registerAuthoritativeReceipt(receipt);

      const obs = createValidObservation(receipt, {
        observationId: 'obs-superseded',
      });

      expect(() => {
        history.recordObservation(obs);
      }).toThrow(/was superseded or revoked/);
    });

    it('7. Rejection of reused receipt (1:1 binding violation)', () => {
      const history = new ModelCapabilityHistory();
      const receipt = createValidReceipt();
      history.registerAuthoritativeReceipt(receipt);

      const obs1 = createValidObservation(receipt, { observationId: 'obs-first' });
      history.recordObservation(obs1);

      const obs2 = createValidObservation(receipt, { observationId: 'obs-second-reusing-receipt' });
      expect(() => {
        history.recordObservation(obs2);
      }).toThrow(/Receipts cannot be reused across multiple observations/);
    });

    it('8. Rejection of observation without receipt ID in durable mode', () => {
      const history = new ModelCapabilityHistory(writer);

      expect(() => {
        history.recordObservation({
          observationId: 'obs-durable-no-receipt',
          taskId: 'task-001',
          taskDomain: 'code_generation',
          taskComplexityClass: 'LOW',
          provider: 'nvidia-nim',
          model: 'meta/llama-3.1-8b-instruct',
          qualificationIdentity: 'test',
          attemptNumber: 1,
          k5VerifiedOutcome: 'VERIFIED_PASS',
          latencyMs: 100,
          verificationPlanId: 'plan-1',
          // verificationReceiptId omitted in durable mode
          timestamp: new Date().toISOString(),
        });
      }).toThrow(/Cannot record durable observation .* without authoritative K5 verification receipt ID/);
    });
  });

  describe('Durable Persistence, Idempotency & Deterministic Reconstruction', () => {
    it('9. Durable Persistence — records are committed to SQLite tables', () => {
      const history = new ModelCapabilityHistory(writer);
      expect(history.isDurable).toBe(true);

      const receipt = createValidReceipt();
      history.registerAuthoritativeReceipt(receipt);

      const obs = createValidObservation(receipt);
      history.recordObservation(obs);

      // Verify SQLite state directly
      const savedReceipt = writer.getK5Receipt(receipt.receiptId);
      expect(savedReceipt).toBeDefined();
      expect(savedReceipt?.receiptId).toBe(receipt.receiptId);
      expect(savedReceipt?.verdict).toBe('VERIFIED_PASS');

      const savedObs = writer.getModelObservation(obs.observationId);
      expect(savedObs).toBeDefined();
      expect(savedObs?.observationId).toBe(obs.observationId);
      expect(savedObs?.modelId).toBe(obs.model);
      expect(savedObs?.k5ReceiptId).toBe(receipt.receiptId);
      expect(savedObs?.verifiedOutcome).toBe('VERIFIED_PASS');
      expect(savedObs?.totalTokens).toBe(700);
    });

    it('10. Deterministic Reconstruction — survives process restart and restores exact state', () => {
      // Step 1: Write records with first instance
      const history1 = new ModelCapabilityHistory(writer);
      const receipt1 = createValidReceipt({ receiptId: 'rcpt-1', planId: 'plan-1' });
      const obs1 = createValidObservation(receipt1, { observationId: 'obs-1', latencyMs: 200 });

      const receipt2 = createValidReceipt({
        receiptId: 'rcpt-2',
        planId: 'plan-2',
        verdict: 'VERIFIED_FAIL',
        passedCommandsCount: 0,
        failedCommandsCount: 1,
      });
      const obs2 = createValidObservation(receipt2, {
        observationId: 'obs-2',
        k5VerifiedOutcome: 'VERIFIED_FAIL',
        latencyMs: 400,
      });

      history1.registerAuthoritativeReceipt(receipt1);
      history1.recordObservation(obs1);

      history1.registerAuthoritativeReceipt(receipt2);
      history1.recordObservation(obs2);

      const stats1 = history1.queryVerifiedSuccessRate('meta/llama-3.1-70b-instruct');
      expect(stats1.totalAttempts).toBe(2);
      expect(stats1.verifiedPasses).toBe(1);
      expect(stats1.verifiedFailures).toBe(1);
      expect(stats1.successRate).toBe(0.5);
      expect(stats1.averageLatencyMs).toBe(300);

      // Step 2: Simulate restart with a brand new ModelCapabilityHistory instance attached to same SQLite DB
      const history2 = new ModelCapabilityHistory(writer);
      expect(history2.isDurable).toBe(true);

      const stats2 = history2.queryVerifiedSuccessRate('meta/llama-3.1-70b-instruct');
      expect(stats2.totalAttempts).toBe(2);
      expect(stats2.verifiedPasses).toBe(1);
      expect(stats2.verifiedFailures).toBe(1);
      expect(stats2.successRate).toBe(0.5);
      expect(stats2.averageLatencyMs).toBe(300);

      // Verify receipts are reconstructible and cannot be re-bound
      const obsDuplicate = createValidObservation(receipt1, { observationId: 'obs-duplicate-receipt' });
      expect(() => {
        history2.recordObservation(obsDuplicate);
      }).toThrow(/Receipts cannot be reused across multiple observations/);
    });

    it('11. Restart-Safe Idempotency — re-recording existing observations causes zero duplicate inflation', () => {
      const history = new ModelCapabilityHistory(writer);
      const receipt = createValidReceipt();
      const obs = createValidObservation(receipt);

      history.registerAuthoritativeReceipt(receipt);
      history.recordObservation(obs);

      // Re-record exact same observation multiple times
      history.recordObservation(obs);
      history.recordObservation(obs);

      const stats = history.queryVerifiedSuccessRate(obs.model);
      expect(stats.totalAttempts).toBe(1);
      expect(stats.verifiedPasses).toBe(1);

      const allDbObs = writer.listModelObservations();
      expect(allDbObs.length).toBe(1);
    });

    it('12. Rejection of in-process forged receipt with Symbol.for authority brand (fails closed before persistence)', () => {
      const history = new ModelCapabilityHistory(writer);
      const forgedReceipt: any = {
        receiptId: 'k5rcpt_forged_branded_001',
        planId: 'plan-001',
        workSessionId: 'ws-001',
        taskId: 'task-001',
        runId: 'run-001',
        attemptNumber: 1,
        verdict: 'VERIFIED_PASS',
        commandsCount: 1,
        passedCommandsCount: 1,
        failedCommandsCount: 0,
        completedAt: new Date().toISOString(),
        issuedAt: new Date().toISOString(),
        superseded: false,
        [K5_AUTHORITY_BRAND]: true,
      };

      expect(() => {
        history.registerAuthoritativeReceipt(forgedReceipt);
      }).toThrow(/K5 receipt provenance failure: receipt 'k5rcpt_forged_branded_001' was not issued by trusted verification authority/);

      // Invariant: forged receipt is rejected BEFORE persistence and never written to SQLite
      expect(writer.getK5Receipt('k5rcpt_forged_branded_001')).toBeUndefined();
    });
  });
});
