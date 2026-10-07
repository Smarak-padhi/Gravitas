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

export interface ModelHistorySummary {
  readonly modelId: string;
  readonly totalAttempts: number;
  readonly verifiedPasses: number;
  readonly verifiedFailures: number;
  readonly inconclusiveOrNotRun: number;
  readonly successRate: number;
  readonly averageLatencyMs: number;
}

export class ModelCapabilityHistory {
  private static instance: ModelCapabilityHistory | null = null;
  private readonly observations: ModelExecutionObservation[] = [];

  public constructor() {}

  public static getInstance(): ModelCapabilityHistory {
    if (!ModelCapabilityHistory.instance) {
      ModelCapabilityHistory.instance = new ModelCapabilityHistory();
    }
    return ModelCapabilityHistory.instance;
  }

  /**
   * Records a new execution observation with K5 verification outcome.
   */
  public recordObservation(observation: ModelExecutionObservation): void {
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
  }
}
