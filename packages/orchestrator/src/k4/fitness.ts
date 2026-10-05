/**
 * @gravitas/orchestrator k4 — Evidence Fitness & Benchmark Comparability Evaluator
 *
 * Implements:
 * 1. Claim-Relative EvidenceFitness evaluation (10 orthogonal dimensions).
 * 2. Effective weight calculation depending on TargetClaimType and EvidenceTier.
 * 3. Benchmark Incomparability Detection (INCOMPARABLE_BENCHMARKS).
 * 4. Epistemological standards (Anti-majoritarian, Primary source dominance).
 */

import {
  EvidenceItem,
  EvidenceFitness,
  TargetClaimType,
  EvidenceTier,
  IncomparableBenchmark,
} from './types.js'

export interface RawBenchmarkMetadata {
  readonly benchmarkId: string
  readonly sourceUrl: string
  readonly osKernel: string
  readonly hardwareEnvironment: string
  readonly workloadDefinition: string
  readonly proximityLatency: string
  readonly compilerFlags: string
}

/**
 * Base tier intrinsic scores [0.0 - 1.0]
 */
export const TIER_BASE_WEIGHTS: Record<EvidenceTier, number> = {
  PRIMARY_EVIDENCE: 1.0,
  REPRODUCIBLE_OBSERVATION: 0.9,
  OFFICIAL_CLAIM: 0.7,
  THIRD_PARTY_MEASUREMENT: 0.6,
  COMMUNITY_EXPERIENCE: 0.5,
  ARCHITECTURAL_INFERENCE: 0.4,
  SPECULATION: 0.1,
}

/**
 * Computes the claim-relative effective evidential weight.
 * Under P5 Epistemology:
 * - API_CONTRACT: PRIMARY_EVIDENCE / OFFICIAL_CLAIM dominates.
 * - LOCAL_HOST_PERFORMANCE: REPRODUCIBLE_OBSERVATION on exact Windows 11 dominates.
 * - OPERATIONAL_RELIABILITY: COMMUNITY_EXPERIENCE / issue trackers with reproduction scripts dominate.
 * - SECURITY_CONTAINMENT: PRIMARY_EVIDENCE (kernel / OS model) dominates marketing claims.
 */
export function evaluateEvidenceWeight(
  evidence: EvidenceItem,
  claimType: TargetClaimType,
  fitness?: EvidenceFitness
): number {
  let base = TIER_BASE_WEIGHTS[evidence.tier]

  if (!fitness) {
    return base
  }

  // Dimension modifiers
  let multiplier = 1.0

  // 1. Directness
  if (fitness.directness === 'DIRECT_MEASUREMENT') {
    multiplier *= 1.1
  } else {
    multiplier *= 0.8
  }

  // 2. Authority
  if (fitness.authority === 'PRIMARY_SOURCE') {
    multiplier *= 1.15
  } else {
    multiplier *= 0.85
  }

  // 3. Reproducibility
  if (fitness.reproducibility === 'FULLY_REPRODUCIBLE_LOCALLY') {
    multiplier *= 1.2
  } else if (fitness.reproducibility === 'UNREPRODUCIBLE') {
    multiplier *= 0.5
  }

  // 4. Environment Match
  if (fitness.environmentMatch === 'EXACT_WINDOWS_11_MATCH') {
    multiplier *= 1.15
  } else if (fitness.environmentMatch === 'DISPARATE_CLOUD_LINUX') {
    // If the claim is about local host performance, a disparate cloud Linux benchmark has very low applicability
    if (claimType === 'LOCAL_HOST_PERFORMANCE') {
      multiplier *= 0.3
    } else {
      multiplier *= 0.8
    }
  }

  // 5. Version Match
  if (fitness.versionMatch === 'MAJOR_VERSION_STALE') {
    multiplier *= 0.4
  } else if (fitness.versionMatch === 'MINOR_VERSION_DRIFT') {
    multiplier *= 0.85
  }

  // 6. Freshness
  if (fitness.freshness === 'OBSOLETE') {
    multiplier *= 0.3
  }

  // 7. Conflict of interest
  if (fitness.conflictOfInterest === 'VENDOR_SELF_BENCHMARK') {
    multiplier *= 0.6
  }

  // 8. Methodology disclosed
  if (!fitness.methodologyDisclosed) {
    multiplier *= 0.6
  }

  // 9. Sample quality
  if (fitness.sampleQuality === 'ANECDOTAL_INCIDENT') {
    multiplier *= 0.7
  }

  // Target-claim specific tier adjustments
  if (claimType === 'LOCAL_HOST_PERFORMANCE') {
    if (evidence.tier === 'REPRODUCIBLE_OBSERVATION' && fitness.reproducibility === 'FULLY_REPRODUCIBLE_LOCALLY') {
      base = Math.max(base, 0.95)
    }
    if (evidence.tier === 'THIRD_PARTY_MEASUREMENT' && fitness.environmentMatch === 'DISPARATE_CLOUD_LINUX') {
      multiplier *= 0.5
    }
  } else if (claimType === 'API_CONTRACT') {
    if (evidence.tier === 'PRIMARY_EVIDENCE' || evidence.tier === 'OFFICIAL_CLAIM') {
      base = Math.max(base, 0.9)
    }
  } else if (claimType === 'SECURITY_CONTAINMENT') {
    if (fitness.conflictOfInterest === 'VENDOR_SELF_BENCHMARK') {
      multiplier *= 0.4
    }
  }

  const finalWeight = Math.min(1.0, Math.max(0.01, base * multiplier))
  return Math.round(finalWeight * 1000) / 1000
}

/**
 * Compares two benchmark metadata sets and detects incomparabilities.
 */
export function detectBenchmarkIncomparability(
  benchA: RawBenchmarkMetadata,
  benchB: RawBenchmarkMetadata
): IncomparableBenchmark | null {
  const differing: (
    | 'OS_KERNEL'
    | 'HARDWARE_ENVIRONMENT'
    | 'WORKLOAD_DEFINITION'
    | 'PROXIMITY_LATENCY'
    | 'COMPILER_FLAGS'
  )[] = []

  if (benchA.osKernel.trim().toLowerCase() !== benchB.osKernel.trim().toLowerCase()) {
    differing.push('OS_KERNEL')
  }

  if (benchA.hardwareEnvironment.trim().toLowerCase() !== benchB.hardwareEnvironment.trim().toLowerCase()) {
    differing.push('HARDWARE_ENVIRONMENT')
  }

  if (benchA.workloadDefinition.trim().toLowerCase() !== benchB.workloadDefinition.trim().toLowerCase()) {
    differing.push('WORKLOAD_DEFINITION')
  }

  if (benchA.proximityLatency.trim().toLowerCase() !== benchB.proximityLatency.trim().toLowerCase()) {
    differing.push('PROXIMITY_LATENCY')
  }

  if (benchA.compilerFlags.trim().toLowerCase() !== benchB.compilerFlags.trim().toLowerCase()) {
    differing.push('COMPILER_FLAGS')
  }

  if (differing.length === 0) {
    return null
  }

  return {
    benchmarkAId: benchA.benchmarkId,
    benchmarkBId: benchB.benchmarkId,
    differingParameters: differing,
    explanation: `Benchmarks differ across parameters: ${differing.join(', ')}. Direct synthetic comparison is invalid under P5 rules.`,
    recommendation: 'REQUIRES_LOCAL_STANDARDIZED_EXPERIMENT',
  }
}
