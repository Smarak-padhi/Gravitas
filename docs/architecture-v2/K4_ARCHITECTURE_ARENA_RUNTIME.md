# GRAVITAS K4 — ARCHITECTURE ARENA RUNTIME SPECIFICATION
## Bounded Multi-Agent Decision System Runtime Engine

**Status**: WAVE K4 RUNTIME SPECIFICATION (HARDENED)  
**Date**: 2026-10-03  
**Baseline Git Commit**: `516e01c82cb4c3afd1080e72e68a4e1e56687335`  
**Governing Invariants**:
- `HUMAN_DECISION != AGENT_CONSENSUS`
- `SCOUT != ADVOCATE != CRITIC != SYNTHESIZER != DECISION_MAKER`
- `NUMBER_OF_AGENTS != STRENGTH_OF_EVIDENCE`
- `CONSENSUS != CORRECTNESS`
- `CONFIDENCE != EVIDENCE_QUALITY`
- `AUTONOMOUS_INCREMENTAL_SPEND = 0`
- `UNKNOWN_COST != FREE (FAIL CLOSED)`
- `UNTRUSTED_RESEARCH_DATA != EXECUTABLE_INSTRUCTION`
- `CRITIC != AUTHOR (SELF-REVIEW STRICTLY PROHIBITED)`
- `K4_WRITES_SQLITE_DIRECTLY = NO (K0 ONLY)`
- `K4_SPAWNS_PROCESS_DIRECTLY = NO (K1 VIA K3 ONLY)`
- `K4_USES_UNAUTHORIZED_NETWORK_DIRECTLY = NO`
- `HUMAN_ARCHITECTURE_DECISION != IMPLEMENTATION_AUTHORIZATION`

---

## 1. Executive Summary & Purpose

The GRAVITAS Architecture Arena runtime (`packages/orchestrator/src/k4/`) implements the frozen P5 Architecture Arena specification as an empirical, bounded, multi-agent evaluation engine.

It establishes an end-to-end decision pipeline:
`Architecture Question -> Candidate Proposals -> Independent Scouts -> Evidence Ingestion -> Claim-Relative Fitness Evaluation -> Contradiction Detection -> Benchmark Incomparability Analysis -> Adversarial Review -> Impartial Decision Packet -> Sovereign Human Decision Gate`.

K4 strictly enforces that **agents recommend and critique, while only the human operator decides**. The runtime always terminates at `WAITING_FOR_HUMAN_DECISION` and is architecturally barred from autonomously picking a winner or mutating project architecture without sovereign approval. Furthermore, an approved architectural decision does NOT spawn implementation tasks or mutate code; implementation requires a distinct, authorized human wave.

---

## 2. Architecture & File Topology

The K4 runtime is partitioned into 4 cohesive TypeScript modules and an exhaustive test suite:

1. `packages/orchestrator/src/k4/types.ts`:
   - `ArchitectureQuestion`, `ArchitectureConstraint`, `ConstraintClass`
   - `EvidenceTier`, `TargetClaimType`, `EvidenceFitness`, `EvidenceItem`
   - `ArchitectureCandidate`, `ArchitectureClaim`, `ReversibilityTier`
   - `ScoutAssignment`, `ScoutType`, `ScoutResult`
   - `Contradiction`, `ContradictionStatus`, `IncomparableBenchmark`
   - `AdversarialFinding`, `AdversarialReviewReport`
   - `DecisionPacket`, `HumanDecisionBlock`, `HumanDecisionRecord`
   - `ArenaBudgetPolicy`, `ArenaProvenance`
2. `packages/orchestrator/src/k4/fitness.ts`:
   - Claim-relative evidential fitness scoring (`evaluateEvidenceWeight`) across 10 orthogonal dimensions.
   - Benchmark incomparability detector (`detectBenchmarkIncomparability`).
3. `packages/orchestrator/src/k4/scouts.ts`:
   - Deterministic `createScoutAssignment` factory computing SHA-256 `inputHash`, tracking visible prior items, and enforcing blind phase isolation.
   - Evidence item builder with SHA-256 cryptographic hashing (`createEvidenceItem`).
   - Untrusted research data boundary & prompt injection defusal (`defuseUntrustedResearchData`).
4. `packages/orchestrator/src/k4/arena.ts`:
   - `ArchitectureArena` engine orchestrating the full candidate lifecycle.
   - Persists state canonically to K0 via `CREATE_DURABLE_JOB` and reloads via `loadFromKernel` (`K4_WRITES_SQLITE_DIRECTLY = NO`).
   - Dispatches scout tasks via K2 bounded orchestration and executes tools strictly via K3 CapabilityGrants on K1 qualified surfaces (`K4_SPAWNS_PROCESS_DIRECTLY = NO`).
   - Manages bounded scout leases (`acquireScoutLease`) and rejects stale submissions (`REJECTED_STALE`).
   - Idempotently filters duplicate command deliveries (`processedEvidenceCommandIds`) and tags common-origin derived evidence (`commonOriginSourceIds`).
   - Enforces hard constraints (`CONST-ZERO-SPEND`, `CONST-WIN11-COMPAT`) and disqualifies non-compliant candidates immediately.
   - Distinguishes candidate future production cost ($20/mo) from autonomous execution cost (`autonomousCost = 0`).
   - Preserves active contradictions, unverified claims, and incomparable benchmarks in `DecisionPacket`.
   - Enforces structural critic independence: throws `Error` if `criticScoutId === authorScoutId`.
   - Enforces budget caps: `maxCandidates`, `maxClaimsPerCandidate`, `maxScouts`, `maxEvidenceItems`, `maxExecutions`.
   - Durable state snapshotting and hydration (`snapshotState`, `hydrateState`).
   - Terminal human decision recording and provenance generation.
5. `packages/orchestrator/src/k4/k4.test.ts`:
   - 35 comprehensive unit and integration tests verifying all 22 required capability areas with zero failures and zero skips.
