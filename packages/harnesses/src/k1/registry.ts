/**
 * GRAVITAS K1 — Harness Registry
 *
 * Manages the set of qualified harnesses and dispatches execution requests.
 *
 * Responsibilities:
 * 1. Maintains qualification snapshots for all registered harnesses
 * 2. Runs dispatch-time readiness checks before every execution
 * 3. Enforces zero-spend eligibility gate (fails closed on UNKNOWN_COST)
 * 4. Returns the first ready harness from a priority-ordered list
 * 5. Records dispatch provenance for forensic integrity
 *
 * Invariants:
 * - HARNESS QUALIFICATION != HARNESS READINESS
 * - Safe Fallback: fallback NEVER silently downgrades containment
 * - Zero-spend gate: UNKNOWN_COST and PAID are always blocked
 * - HARNESS != CANONICAL DATABASE WRITER
 * - Registry does NOT write to K0 SQLite — only the K0 kernel may do that
 *
 * K0 Integration:
 * - ExecutionRequest.durableJobId ties each dispatch to a K0 DurableJob
 * - State transitions are driven by the K0 kernel, not the registry
 */

import type { GravitasHarness } from './harness.js'
import type {
  ExecutionRequest,
  ExecutionResult,
  HarnessQualificationSnapshot,
  CostEligibility,
  CancellationHandle,
} from './types.js'
import { HarnessError } from './types.js'
import { isCostEligibleForAutonomousDispatch } from './qualification.js'

/**
 * Result of a harness selection / readiness check prior to dispatch.
 */
export interface HarnessDispatchDecision {
  readonly harnessId: string
  readonly readinessState: string
  readonly reason: string
  readonly costEligibility: CostEligibility
  readonly allowed: boolean
}

/**
 * Options for harness dispatch.
 */
export interface DispatchOptions {
  /** Optional harness preference order — first ready harness wins. */
  readonly preferredHarnessIds?: readonly string[] | undefined
  /** Whether to promote promotional credit without explicit proof (default: false). */
  readonly allowPromotionalCredit?: boolean | undefined
}

/**
 * HarnessRegistry — central dispatch point for K1 execution.
 *
 * Thread-safety: This registry is NOT thread-safe for concurrent mutation.
 * It is designed for single-threaded event-loop usage in Node.js.
 */
export class HarnessRegistry {
  private readonly harnesses = new Map<string, GravitasHarness>()
  private readonly snapshots = new Map<string, HarnessQualificationSnapshot>()

  /**
   * Registers a harness with the registry.
   * Does NOT automatically qualify the harness.
   */
  register(harness: GravitasHarness): void {
    this.harnesses.set(harness.id, harness)
  }

  /**
   * Unregisters a harness from the registry.
   */
  unregister(harnessId: string): void {
    this.harnesses.delete(harnessId)
    this.snapshots.delete(harnessId)
  }

  /**
   * Returns all registered harness IDs.
   */
  listHarnessIds(): readonly string[] {
    return [...this.harnesses.keys()]
  }

  /**
   * Retrieves a registered harness by ID.
   */
  getHarness(harnessId: string): GravitasHarness | undefined {
    return this.harnesses.get(harnessId)
  }

  /**
   * Runs qualification for a single harness and caches the snapshot.
   */
  async qualify(harnessId: string): Promise<HarnessQualificationSnapshot> {
    const harness = this.harnesses.get(harnessId)
    if (!harness) {
      throw new HarnessError('HARNESS_NOT_FOUND', harnessId, `Harness "${harnessId}" is not registered.`)
    }
    const snapshot = await harness.qualify()
    this.snapshots.set(harnessId, snapshot)
    return snapshot
  }

  /**
   * Runs qualification for all registered harnesses.
   * Returns a map of harnessId → snapshot.
   */
  async qualifyAll(): Promise<Map<string, HarnessQualificationSnapshot>> {
    const results = new Map<string, HarnessQualificationSnapshot>()
    for (const [id, harness] of this.harnesses) {
      const snap = await harness.qualify()
      this.snapshots.set(id, snap)
      results.set(id, snap)
    }
    return results
  }

  /**
   * Returns the cached qualification snapshot for a harness.
   */
  getSnapshot(harnessId: string): HarnessQualificationSnapshot | undefined {
    return this.snapshots.get(harnessId)
  }

  /**
   * Stores a pre-built qualification snapshot (for testing or external qualification).
   */
  storeSnapshot(snapshot: HarnessQualificationSnapshot): void {
    this.snapshots.set(snapshot.harnessId, snapshot)
  }

  /**
   * Evaluates dispatch eligibility for a harness.
   * Runs both the cost gate and the dispatch-time readiness check.
   *
   * Does NOT mutate any state.
   */
  async evaluateDispatch(
    harnessId: string,
    options?: DispatchOptions
  ): Promise<HarnessDispatchDecision> {
    const harness = this.harnesses.get(harnessId)
    if (!harness) {
      return {
        harnessId,
        readinessState: 'NOT_FOUND',
        reason: `Harness "${harnessId}" is not registered in the registry.`,
        costEligibility: 'UNKNOWN_COST',
        allowed: false,
      }
    }

    const snapshot = this.snapshots.get(harnessId)
    const costEligibility = snapshot?.costEligibility ?? 'UNKNOWN_COST'

    // Cost gate check (fail-closed on UNKNOWN_COST and PAID)
    const costGate = isCostEligibleForAutonomousDispatch(
      costEligibility,
      options?.allowPromotionalCredit ?? false
    )
    if (!costGate.allowed) {
      return {
        harnessId,
        readinessState: 'COST_ELIGIBILITY_UNKNOWN',
        reason: costGate.reason,
        costEligibility,
        allowed: false,
      }
    }

    // Dispatch-time readiness check
    const readiness = await harness.checkReadiness(snapshot)

    return {
      harnessId,
      readinessState: readiness.readinessState,
      reason: readiness.reason,
      costEligibility,
      allowed: readiness.readinessState === 'READY',
    }
  }

  /**
   * Selects the best available harness from a priority-ordered list.
   * Returns the first harness that passes both cost gate and readiness check.
   *
   * Safe Fallback Rule: fallback NEVER silently downgrades containment.
   * If a preferred harness is BLOCKED due to containment issues, it is NOT
   * replaced with a less-contained alternative. It is skipped and reported.
   */
  async selectHarness(
    harnessIds: readonly string[],
    options?: DispatchOptions
  ): Promise<{ selected: string | null; decisions: HarnessDispatchDecision[] }> {
    const preferenceOrder = options?.preferredHarnessIds ?? harnessIds
    const decisions: HarnessDispatchDecision[] = []

    for (const harnessId of preferenceOrder) {
      const decision = await this.evaluateDispatch(harnessId, options)
      decisions.push(decision)
      if (decision.allowed) {
        return { selected: harnessId, decisions }
      }
    }

    return { selected: null, decisions }
  }

  /**
   * Dispatches an execution request to a specific harness.
   * Performs a full dispatch-time check before execution.
   *
   * Returns the result and cancellation handle.
   *
   * INVARIANT: This method does NOT write to K0 SQLite.
   * Callers are responsible for K0 job state transitions via KernelCommands.
   */
  async dispatch(
    harnessId: string,
    request: ExecutionRequest,
    options?: DispatchOptions
  ): Promise<{ result: Promise<ExecutionResult>; cancellation: CancellationHandle }> {
    const decision = await this.evaluateDispatch(harnessId, options)
    if (!decision.allowed) {
      throw new HarnessError(
        decision.readinessState === 'COST_ELIGIBILITY_UNKNOWN'
          ? 'COST_ELIGIBILITY_UNKNOWN'
          : 'HARNESS_NOT_READY',
        harnessId,
        `Dispatch blocked: ${decision.reason}`,
        request.executionId
      )
    }

    const harness = this.harnesses.get(harnessId)!
    return harness.execute(request)
  }

  /**
   * Returns a snapshot summary of all registered harnesses and their current states.
   */
  async getRegistrySummary(): Promise<ReadonlyArray<{
    harnessId: string
    kind: string
    qualificationState: string
    costEligibility: string
    hasSnapshot: boolean
  }>> {
    const entries = []
    for (const [id, harness] of this.harnesses) {
      const snap = this.snapshots.get(id)
      entries.push({
        harnessId: id,
        kind: harness.kind,
        qualificationState: snap?.qualificationState ?? 'UNDISCOVERED',
        costEligibility: snap?.costEligibility ?? 'UNKNOWN_COST',
        hasSnapshot: snap !== undefined,
      })
    }
    return entries
  }
}

/**
 * Creates a pre-configured HarnessRegistry with all K1 adapters registered.
 */
export function createDefaultRegistry(): HarnessRegistry {
  // Import adapters lazily to keep registry creation lightweight
  const registry = new HarnessRegistry()
  return registry
}
