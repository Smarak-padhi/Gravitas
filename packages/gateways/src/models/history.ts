/**
 * Gravitas — Model Capability & Verification History (Wave V1-B)
 *
 * Tracks empirical model execution observations and K5 verification results.
 *
 * Invariants:
 * - MODEL_SAYS_DONE != VERIFIED_SUCCESS
 * - WORKER_SUCCESS != VERIFIED_SUCCESS
 * - PROVIDER_200 != VERIFIED_SUCCESS
 * - Historical capability derived strictly from independent K5 verification
 */

import type {
  ModelExecutionObservation,
} from './types.js';
import {
  K5_AUTHORITY_BRAND,
  type DurableModelObservationStore,
} from '@gravitas/core';

export interface ModelHistorySummary {
  readonly modelId: string;
  readonly totalAttempts: number;
  readonly verifiedPasses: number;
  readonly verifiedFailures: number;
  readonly inconclusiveOrNotRun: number;
  readonly successRate: number;
  readonly averageLatencyMs: number;
}

export interface K5ReceiptLike {
  readonly receiptId: string;
  readonly planId: string;
  readonly workSessionId: string;
  readonly taskId: string;
  readonly runId: string;
  readonly attemptNumber: number;
  readonly verdict: 'VERIFIED_PASS' | 'VERIFIED_FAIL';
  readonly commandsCount: number;
  readonly passedCommandsCount: number;
  readonly failedCommandsCount: number;
  readonly completedAt: string;
  readonly issuedAt: string;
  readonly superseded?: boolean | undefined;
}

export class ModelCapabilityHistory {
  private static instance: ModelCapabilityHistory | null = null;
  private readonly observations: ModelExecutionObservation[] = [];
  private readonly seenObservationIds = new Set<string>();
  private readonly authoritativeReceipts = new Map<string, K5ReceiptLike>();
  private readonly receiptToObservationId = new Map<string, string>();
  private durableWriter: DurableModelObservationStore | null = null;

  public constructor(durableWriter?: DurableModelObservationStore | null) {
    if (durableWriter) {
      this.setDurableWriter(durableWriter);
    }
  }

  /**
   * Discloses whether this capability history is backed by a durable SQLite store.
   */
  public get isDurable(): boolean {
    return this.durableWriter !== null;
  }

  public setDurableWriter(writer: DurableModelObservationStore | null): void {
    this.durableWriter = writer;
    if (writer) {
      this.reconstructFromDurableStore(writer);
    }
  }

  public detachDurableWriter(): void {
    this.durableWriter = null;
  }

  public static getInstance(durableWriter?: DurableModelObservationStore | null): ModelCapabilityHistory {
    if (!ModelCapabilityHistory.instance) {
      ModelCapabilityHistory.instance = new ModelCapabilityHistory(durableWriter);
    } else if (durableWriter && !ModelCapabilityHistory.instance.durableWriter) {
      ModelCapabilityHistory.instance.setDurableWriter(durableWriter);
    }
    return ModelCapabilityHistory.instance;
  }

  public static resetInstance(): void {
    if (ModelCapabilityHistory.instance) {
      ModelCapabilityHistory.instance.clear();
      ModelCapabilityHistory.instance = null;
    }
  }

  /**
   * Registers an authoritative K5 verification receipt.
   * Strictly asserts trusted issuance brand to block forged receipts.
   */
  public registerAuthoritativeReceipt(receipt: K5ReceiptLike): void {
    const isBranded = (receipt as any)[K5_AUTHORITY_BRAND] === true;
    if (!isBranded) {
      throw new Error(
        `K5 receipt provenance failure: receipt '${receipt.receiptId}' was not issued by trusted verification authority. Forged receipts are rejected fail-closed.`
      );
    }

    this.authoritativeReceipts.set(receipt.receiptId, receipt);
    if (this.durableWriter) {
      this.durableWriter.insertK5Receipt({
        receiptId: receipt.receiptId,
        planId: receipt.planId,
        workSessionId: receipt.workSessionId,
        taskId: receipt.taskId,
        runId: receipt.runId,
        attemptNumber: receipt.attemptNumber,
        verdict: receipt.verdict,
        commandsCount: receipt.commandsCount,
        passedCommandsCount: receipt.passedCommandsCount,
        failedCommandsCount: receipt.failedCommandsCount,
        completedAt: receipt.completedAt,
        issuedAt: receipt.issuedAt,
        superseded: Boolean(receipt.superseded),
      });
    }
  }

  /**
   * Retrieves an authoritative receipt by ID from memory or durable store.
   */
  public getAuthoritativeReceipt(receiptId: string): K5ReceiptLike | undefined {
    const memoryReceipt = this.authoritativeReceipts.get(receiptId);
    if (memoryReceipt) return memoryReceipt;
    if (this.durableWriter) {
      const dbReceipt = this.durableWriter.getK5Receipt(receiptId);
      if (dbReceipt) {
        this.authoritativeReceipts.set(dbReceipt.receiptId, dbReceipt);
        return dbReceipt;
      }
    }
    return undefined;
  }

  /**
   * Reconstructs history deterministically from the canonical SQLite store.
   */
  public reconstructFromDurableStore(writer: DurableModelObservationStore): number {
    this.durableWriter = writer;
    const dbReceipts = writer.listAllK5Receipts();
    for (const r of dbReceipts) {
      Object.defineProperty(r, K5_AUTHORITY_BRAND, {
        value: true,
        enumerable: false,
        writable: false,
        configurable: false,
      });
      this.authoritativeReceipts.set(r.receiptId, r);
    }

    const dbObservations = writer.listModelObservations();
    let reconstructedCount = 0;
    for (const row of dbObservations) {
      if (!this.seenObservationIds.has(row.observationId)) {
        this.seenObservationIds.add(row.observationId);
        this.receiptToObservationId.set(row.k5ReceiptId, row.observationId);
        this.observations.push({
          observationId: row.observationId,
          workSessionId: row.workSessionId,
          runId: row.runId,
          taskId: row.taskId,
          taskDomain: row.taskDomain,
          taskComplexityClass: (row.taskComplexity as 'LOW' | 'MEDIUM' | 'HIGH') || 'MEDIUM',
          provider: row.providerId,
          model: row.modelId,
          qualificationIdentity: row.qualificationIdentity,
          attemptNumber: row.attemptNumber,
          k5VerifiedOutcome: row.verifiedOutcome,
          latencyMs: row.latencyMs,
          tokenUsage: {
            promptTokens: row.promptTokens,
            completionTokens: row.completionTokens,
            totalTokens: row.totalTokens,
          },
          failureClass: row.failureClass,
          verificationPlanId: row.k5PlanId,
          verificationReceiptId: row.k5ReceiptId,
          schemaVersion: row.schemaVersion,
          timestamp: row.createdAt,
        });
        reconstructedCount++;
      }
    }
    return reconstructedCount;
  }

  /**
   * Records a new execution observation with K5 verification outcome.
   *
   * Enforces:
   * 1. Idempotency: Duplicate observationId records are ignored safely.
   * 2. Receipt binding: VERIFIED_PASS / VERIFIED_FAIL outcomes require a valid K5 verificationPlanId.
   * 3. Independently authenticated receipt provenance: validates receipt against 8 invariants.
   */
  public recordObservation(observation: ModelExecutionObservation): void {
    if (this.seenObservationIds.has(observation.observationId)) {
      return;
    }

    if (this.durableWriter) {
      const existing = this.durableWriter.getModelObservation(observation.observationId);
      if (existing) {
        this.seenObservationIds.add(observation.observationId);
        return;
      }
    }

    if (observation.k5VerifiedOutcome === 'VERIFIED_PASS') {
      if (!observation.verificationPlanId || observation.verificationPlanId.trim().length === 0) {
        throw new Error(
          `Cannot record VERIFIED_PASS observation for model ${observation.model} without valid K5 verificationPlanId receipt binding.`
        );
      }
    }

    // Receipt provenance validation
    if (observation.verificationReceiptId || this.durableWriter) {
      if (!observation.verificationReceiptId) {
        throw new Error(
          `Cannot record durable observation for model ${observation.model} without authoritative K5 verification receipt ID.`
        );
      }

      const receipt = this.getAuthoritativeReceipt(observation.verificationReceiptId);
      if (!receipt) {
        throw new Error(
          `K5 receipt provenance failure: receipt '${observation.verificationReceiptId}' does not exist in authoritative verification records.`
        );
      }

      // Invariant b: receipt.taskId matches observation.taskId
      if (observation.taskId && receipt.taskId !== observation.taskId) {
        throw new Error(
          `K5 receipt provenance failure: receipt task ID '${receipt.taskId}' does not match observation task ID '${observation.taskId}'. Caller cannot substitute another task's receipt.`
        );
      }

      // Invariant c: receipt.planId matches observation.verificationPlanId
      if (observation.verificationPlanId && receipt.planId !== observation.verificationPlanId) {
        throw new Error(
          `K5 receipt provenance failure: receipt plan ID '${receipt.planId}' does not match observation verificationPlanId '${observation.verificationPlanId}'.`
        );
      }

      // Invariant d: receipt completed before or at observation timestamp
      if (observation.timestamp && receipt.completedAt) {
        const receiptTime = new Date(receipt.completedAt).getTime();
        const obsTime = new Date(observation.timestamp).getTime();
        if (receiptTime > obsTime) {
          throw new Error(
            `K5 receipt provenance failure: receipt completion time '${receipt.completedAt}' postdates observation timestamp '${observation.timestamp}'.`
          );
        }
      }

      // Invariant e: receipt verdict matches observation outcome
      if (observation.k5VerifiedOutcome === 'VERIFIED_PASS' && receipt.verdict !== 'VERIFIED_PASS') {
        throw new Error(
          `K5 receipt provenance failure: receipt verdict '${receipt.verdict}' does not match observation outcome 'VERIFIED_PASS'.`
        );
      }
      if (observation.k5VerifiedOutcome === 'VERIFIED_FAIL' && receipt.verdict !== 'VERIFIED_FAIL') {
        throw new Error(
          `K5 receipt provenance failure: receipt verdict '${receipt.verdict}' does not match observation outcome 'VERIFIED_FAIL'.`
        );
      }

      // Invariant f: receipt was not revoked or superseded
      if (receipt.superseded) {
        throw new Error(
          `K5 receipt provenance failure: receipt '${receipt.receiptId}' was superseded or revoked.`
        );
      }

      // Invariant g: receipt is not reused across multiple observations (1:1 binding)
      const boundObsId = this.receiptToObservationId.get(receipt.receiptId);
      if (boundObsId && boundObsId !== observation.observationId) {
        throw new Error(
          `K5 receipt provenance failure: receipt '${receipt.receiptId}' is already bound to observation '${boundObsId}'. Receipts cannot be reused across multiple observations.`
        );
      }
      if (this.durableWriter) {
        const existingObs = this.durableWriter.getModelObservationByReceiptId(receipt.receiptId);
        if (existingObs && existingObs.observationId !== observation.observationId) {
          throw new Error(
            `K5 receipt provenance failure: receipt '${receipt.receiptId}' is already bound to durable observation '${existingObs.observationId}'. Receipts cannot be reused across multiple observations.`
          );
        }
      }

      this.receiptToObservationId.set(receipt.receiptId, observation.observationId);
    }

    if (this.durableWriter) {
      this.durableWriter.insertModelObservation({
        observationId: observation.observationId,
        workSessionId: observation.workSessionId ?? 'session-default',
        runId: observation.runId ?? 'run-default',
        taskId: observation.taskId ?? 'task-default',
        attemptNumber: observation.attemptNumber,
        providerId: observation.provider,
        modelId: observation.model,
        taskDomain: observation.taskDomain,
        taskComplexity: observation.taskComplexityClass,
        qualificationIdentity: observation.qualificationIdentity,
        k5PlanId: observation.verificationPlanId ?? '',
        k5ReceiptId: observation.verificationReceiptId ?? '',
        verifiedOutcome: observation.k5VerifiedOutcome === 'VERIFIED_PASS' ? 'VERIFIED_PASS' : 'VERIFIED_FAIL',
        latencyMs: observation.latencyMs,
        promptTokens: observation.tokenUsage?.promptTokens ?? 0,
        completionTokens: observation.tokenUsage?.completionTokens ?? 0,
        totalTokens: observation.tokenUsage?.totalTokens ?? 0,
        failureClass: observation.failureClass,
        schemaVersion: observation.schemaVersion ?? 1,
        createdAt: observation.timestamp,
      });
    }

    this.seenObservationIds.add(observation.observationId);
    this.observations.push({ ...observation });
  }

  /**
   * Returns all observations matching an optional filter.
   */
  public getObservations(filter?: {
    modelId?: string | undefined;
    taskDomain?: string | undefined;
  }): readonly ModelExecutionObservation[] {
    return this.observations.filter((obs) => {
      if (filter?.modelId && obs.model !== filter.modelId) return false;
      if (filter?.taskDomain && obs.taskDomain !== filter.taskDomain) return false;
      return true;
    });
  }

  /**
   * Calculates the verified success rate for a given model and optional domain.
   */
  public queryVerifiedSuccessRate(
    modelId: string,
    taskDomain?: string
  ): ModelHistorySummary {
    const relevant = this.getObservations({ modelId, taskDomain });
    const totalAttempts = relevant.length;

    if (totalAttempts === 0) {
      return {
        modelId,
        totalAttempts: 0,
        verifiedPasses: 0,
        verifiedFailures: 0,
        inconclusiveOrNotRun: 0,
        successRate: 0,
        averageLatencyMs: 0,
      };
    }

    let passes = 0;
    let failures = 0;
    let inconclusiveOrNotRun = 0;
    let totalLatency = 0;

    for (const obs of relevant) {
      totalLatency += obs.latencyMs;
      if (obs.k5VerifiedOutcome === 'VERIFIED_PASS') {
        passes += 1;
      } else if (obs.k5VerifiedOutcome === 'VERIFIED_FAIL') {
        failures += 1;
      } else {
        inconclusiveOrNotRun += 1;
      }
    }

    const completedVerifications = passes + failures;
    const successRate = completedVerifications > 0 ? passes / completedVerifications : 0;
    const averageLatencyMs = Math.round(totalLatency / totalAttempts);

    return {
      modelId,
      totalAttempts,
      verifiedPasses: passes,
      verifiedFailures: failures,
      inconclusiveOrNotRun,
      successRate,
      averageLatencyMs,
    };
  }

  /**
   * Clears historical observations (for testing).
   */
  public clear(): void {
    this.observations.length = 0;
    this.seenObservationIds.clear();
    this.authoritativeReceipts.clear();
    this.receiptToObservationId.clear();
  }
}
