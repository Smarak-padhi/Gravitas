import { describe, expect, it, beforeAll } from 'vitest';
import { initTestReceiptFixture, createTestAuthoritativeReceipt } from './test-receipt-fixture.js';
import { EscalationManager, HUMAN_GATE_FAILURE_CLASSES } from '../models/escalation.js';
import { ModelCapabilityHistory } from '../models/history.js';

describe('GRAVITAS V1-B — Escalation Policy & K5 Verification History Suite', () => {
  beforeAll(async () => {
    await initTestReceiptFixture();
  });
  describe('EscalationManager', () => {
    it('1. Bounded Escalation Limit — halts for human operator when max escalations reached', () => {
      const manager = new EscalationManager({
        maxEscalations: 2,
        maxSameModelRetries: 0,
        escalationOrder: ['meta/llama-3.1-8b-instruct', 'meta/llama-3.1-70b-instruct'],
      });

      // Attempt 0 fails (e.g. initial attempt) -> escalates to candidate 1
      const action0 = manager.evaluateEscalation(0, 'K5_VERIFICATION_FAILED', 'meta/llama-3.1-8b-instruct');
      expect(action0.action).toBe('ESCALATE_TO_NEXT_MODEL');
      expect(action0.humanGateRequired).toBe(false);
      expect(action0.escalationPosition).toBe(1);

      // Attempt 1 fails -> escalates to candidate 2
      const action1 = manager.evaluateEscalation(1, 'K5_VERIFICATION_FAILED', 'meta/llama-3.1-70b-instruct');
      expect(action1.action).toBe('ESCALATE_TO_NEXT_MODEL');
      expect(action1.humanGateRequired).toBe(false);
      expect(action1.escalationPosition).toBe(2);

      // Attempt 2 fails -> maxEscalations (2) reached, MUST stop for human
      const action2 = manager.evaluateEscalation(2, 'K5_VERIFICATION_FAILED', 'meta/llama-3.1-70b-instruct');
      expect(action2.action).toBe('STOP_AND_REQUIRE_HUMAN');
      expect(action2.humanGateRequired).toBe(true);
      expect(action2.reason).toContain('Maximum escalation bound (2) exhausted');
    });

    it('2. Zero Same-Model Blind Retries — never retries the exact same model when policy is 0', () => {
      const manager = new EscalationManager({
        maxEscalations: 2,
        maxSameModelRetries: 0,
        escalationOrder: ['meta/llama-3.1-8b-instruct', 'meta/llama-3.1-70b-instruct'],
      });

      const action = manager.evaluateEscalation(0, 'SYNTAX_ERROR', 'meta/llama-3.1-8b-instruct');
      expect(action.action).not.toBe('RETRY_SAME_MODEL');
      expect(action.action).toBe('ESCALATE_TO_NEXT_MODEL');
    });

    it('3. Human Gate for Critical Failure Classes — fails closed immediately on critical failures', () => {
      const manager = new EscalationManager();

      for (const criticalClass of HUMAN_GATE_FAILURE_CLASSES) {
        const action = manager.evaluateEscalation(0, criticalClass, 'meta/llama-3.1-8b-instruct');
        expect(action.action).toBe('STOP_AND_REQUIRE_HUMAN');
        expect(action.humanGateRequired).toBe(true);
        expect(action.reason).toContain('sovereign human operator decision');
      }
    });

    it('4. Auth Required Stops Fail-Closed — does not loop or autonomously retry on auth error', () => {
      const manager = new EscalationManager();
      const action = manager.evaluateEscalation(0, 'AUTH_REQUIRED', 'meta/llama-3.1-8b-instruct');
      expect(action.action).toBe('STOP_AND_REQUIRE_HUMAN');
      expect(action.humanGateRequired).toBe(true);
    });

    it('5. Cost Blocked Stops Fail-Closed — does not autonomously retry or upgrade to paid tier', () => {
      const manager = new EscalationManager();
      const action = manager.evaluateEscalation(0, 'COST_BLOCKED', 'meta/llama-3.1-8b-instruct');
      expect(action.action).toBe('STOP_AND_REQUIRE_HUMAN');
      expect(action.humanGateRequired).toBe(true);
    });
  });

  describe('ModelCapabilityHistory (K5 Independent Verification)', () => {
    it('6. MODEL_SAYS_DONE != VERIFIED_SUCCESS — only K5 outcomes determine verified success rate', () => {
      const history = new ModelCapabilityHistory();

      // Model claims completion, but K5 verification FAILS
      history.recordObservation({
        observationId: 'obs-1',
        taskDomain: 'code_generation',
        taskComplexityClass: 'LOW',
        provider: 'nvidia-nim',
        model: 'meta/llama-3.1-8b-instruct',
        qualificationIdentity: 'test-v1b',
        attemptNumber: 1,
        k5VerifiedOutcome: 'VERIFIED_FAIL',
        latencyMs: 150,
        timestamp: new Date().toISOString(),
      });

      // Model claims completion, and K5 verification PASSES
      history.registerAuthoritativeReceipt(createTestAuthoritativeReceipt({
        receiptId: 'receipt-k5-001',
        planId: 'plan-k5-pass-001',
        workSessionId: 'ws-test',
        taskId: 'task-test-001',
        runId: 'run-test',
        attemptNumber: 1,
        verdict: 'VERIFIED_PASS',
        commandsCount: 1,
        passedCommandsCount: 1,
        failedCommandsCount: 0,
        completedAt: new Date(Date.now() - 1000).toISOString(),
        issuedAt: new Date(Date.now() - 1000).toISOString(),
      } as any));

      history.recordObservation({
        observationId: 'obs-2',
        taskId: 'task-test-001',
        taskDomain: 'code_generation',
        taskComplexityClass: 'LOW',
        provider: 'nvidia-nim',
        model: 'meta/llama-3.1-8b-instruct',
        qualificationIdentity: 'test-v1b',
        attemptNumber: 1,
        k5VerifiedOutcome: 'VERIFIED_PASS',
        latencyMs: 250,
        verificationPlanId: 'plan-k5-pass-001',
        verificationReceiptId: 'receipt-k5-001',
        verificationCompletedAt: new Date(Date.now() - 1000).toISOString(),
        timestamp: new Date().toISOString(),
      });

      const stats = history.queryVerifiedSuccessRate('meta/llama-3.1-8b-instruct');
      expect(stats.totalAttempts).toBe(2);
      expect(stats.verifiedPasses).toBe(1);
      expect(stats.verifiedFailures).toBe(1);
      expect(stats.successRate).toBe(0.5); // 50%
      expect(stats.averageLatencyMs).toBe(200);
    });

    it('7. Domain Specific History — can query capability stats by task domain', () => {
      const history = new ModelCapabilityHistory();

      history.registerAuthoritativeReceipt(createTestAuthoritativeReceipt({
        receiptId: 'receipt-k5-domain-001',
        planId: 'plan-k5-domain-001',
        workSessionId: 'ws-test',
        taskId: 'task-code-001',
        runId: 'run-test',
        attemptNumber: 1,
        verdict: 'VERIFIED_PASS',
        commandsCount: 1,
        passedCommandsCount: 1,
        failedCommandsCount: 0,
        completedAt: new Date(Date.now() - 1000).toISOString(),
        issuedAt: new Date(Date.now() - 1000).toISOString(),
      } as any));

      history.recordObservation({
        observationId: 'obs-code-1',
        taskId: 'task-code-001',
        taskDomain: 'code_generation',
        taskComplexityClass: 'LOW',
        provider: 'nvidia-nim',
        model: 'meta/llama-3.1-70b-instruct',
        qualificationIdentity: 'test-v1b',
        attemptNumber: 1,
        k5VerifiedOutcome: 'VERIFIED_PASS',
        latencyMs: 300,
        verificationPlanId: 'plan-k5-domain-001',
        verificationReceiptId: 'receipt-k5-domain-001',
        verificationCompletedAt: new Date(Date.now() - 1000).toISOString(),
        timestamp: new Date().toISOString(),
      });

      history.recordObservation({
        observationId: 'obs-doc-1',
        taskDomain: 'documentation',
        taskComplexityClass: 'LOW',
        provider: 'nvidia-nim',
        model: 'meta/llama-3.1-70b-instruct',
        qualificationIdentity: 'test-v1b',
        attemptNumber: 1,
        k5VerifiedOutcome: 'VERIFIED_FAIL',
        latencyMs: 100,
        timestamp: new Date().toISOString(),
      });

      const codeStats = history.queryVerifiedSuccessRate('meta/llama-3.1-70b-instruct', 'code_generation');
      expect(codeStats.totalAttempts).toBe(1);
      expect(codeStats.verifiedPasses).toBe(1);
      expect(codeStats.successRate).toBe(1.0);

      const docStats = history.queryVerifiedSuccessRate('meta/llama-3.1-70b-instruct', 'documentation');
      expect(docStats.totalAttempts).toBe(1);
      expect(docStats.verifiedFailures).toBe(1);
      expect(docStats.successRate).toBe(0.0);
    });

    it('8. Clean State on Empty Query — returns 0 attempts and 0 rate for unseen model', () => {
      const history = new ModelCapabilityHistory();
      const stats = history.queryVerifiedSuccessRate('unseen/model');
      expect(stats.totalAttempts).toBe(0);
      expect(stats.successRate).toBe(0);
      expect(stats.averageLatencyMs).toBe(0);
    });

    it('9. Receipt-Bound Invariant — VERIFIED_PASS strictly rejects missing verificationPlanId', () => {
      const history = new ModelCapabilityHistory();

      expect(() => {
        history.recordObservation({
          observationId: 'obs-no-receipt',
          taskDomain: 'code_generation',
          taskComplexityClass: 'LOW',
          provider: 'nvidia-nim',
          model: 'meta/llama-3.1-8b-instruct',
          qualificationIdentity: 'test-v1b',
          attemptNumber: 1,
          k5VerifiedOutcome: 'VERIFIED_PASS',
          latencyMs: 100,
          timestamp: new Date().toISOString(),
          // verificationPlanId omitted!
        });
      }).toThrow(/Cannot record VERIFIED_PASS observation .* without valid K5 verificationPlanId/);
    });

    it('10. Observation Idempotency — duplicate observationId is deduplicated safely', () => {
      const history = new ModelCapabilityHistory();

      const obs = {
        observationId: 'obs-idempotent-1',
        taskDomain: 'code_generation',
        taskComplexityClass: 'LOW' as const,
        provider: 'nvidia-nim',
        model: 'meta/llama-3.1-8b-instruct',
        qualificationIdentity: 'test-v1b',
        attemptNumber: 1,
        k5VerifiedOutcome: 'VERIFIED_PASS' as const,
        latencyMs: 100,
        verificationPlanId: 'plan-k5-idempotent-1',
        timestamp: new Date().toISOString(),
      };

      history.recordObservation(obs);
      history.recordObservation(obs); // duplicate!

      const stats = history.queryVerifiedSuccessRate('meta/llama-3.1-8b-instruct');
      expect(stats.totalAttempts).toBe(1);
      expect(stats.verifiedPasses).toBe(1);
    });

    it('11. Durability Disclosure — explicitly discloses in-memory non-durable store', () => {
      const history = new ModelCapabilityHistory();
      expect(history.isDurable).toBe(false);
    });
  });
});
