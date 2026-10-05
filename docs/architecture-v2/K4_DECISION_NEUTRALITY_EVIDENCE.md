# GRAVITAS K4 — DECISION NEUTRALITY & HUMAN SOVEREIGNTY EVIDENCE
## Trade-Off Matrix Synthesis, Zero-Winner Terminal State & Non-Implementation Invariant

**Status**: WAVE K4 EVIDENCE ARTIFACT (HARDENED & RECONCILED)  
**Date**: 2026-10-03  
**Baseline Git Commit**: `516e01c82cb4c3afd1080e72e68a4e1e56687335`  

---

## 1. Principles of Decision Neutrality

- `HUMAN_DECISION != AGENT_CONSENSUS`
- `NO AUTONOMOUS WINNER SELECTION`
- `DECISION PACKET PRESENTS TRADE-OFFS, NEVER FINAL MANDATES`
- `HUMAN_ARCHITECTURE_DECISION != IMPLEMENTATION_AUTHORIZATION`

The Architecture Arena synthesizes trade-offs, illuminates contradictions, highlights incomparabilities, and stops dead at `WAITING_FOR_HUMAN_DECISION`.

---

## 2. Objective Trade-Off Matrix vs Winner Selection (Tests 35, 40)

In `packages/orchestrator/src/k4/arena.ts`, `generateDecisionPacket()` constructs an impartial comparison across all registered, eligible candidates:
- **Descriptive-Only Matrix**: Evaluates candidates across dimensions (`REVERSIBILITY`, `OPERATIONAL_COMPLEXITY`, `SUPPLY_CHAIN_MAINTENANCE`, `PERFORMANCE_RESOURCE`, `SECURITY_CONTAINMENT`, `MIGRATION_COST`, `ZERO_SPEND_RISK`).
- **No Scalar Winner**: No opaque universal candidate score is computed or used to select an architectural winner (`OPAQUE_UNIVERSAL_CANDIDATE_SCORE_USED = NO`).
- **Zero Winner Selected**: `packet.humanDecisionBlock.selectedCandidateId` is initialized strictly to `undefined` (`DECISION_PACKET_HAS_AUTONOMOUS_WINNER = NO`).
- **Status Frozen**: `packet.humanDecisionBlock.status = 'PENDING_HUMAN_REVIEW'`.
- **Preservation of Contradictions & Uncertainties**:
  - The uncertainty register explicitly highlights claims lacking empirical evidence (`MISSING_EVIDENCE_PRESERVED = YES`).
  - Active contradictions between scout findings are retained in the packet without forced reconciliation (`CONTRADICTING_EVIDENCE_PRESERVED = YES`).

---

## 3. Decision Actor Matrix & Authority Boundaries (Test 40)

The authority boundary structurally restricts candidate selection:
- `SUPERVISOR_CAN_SELECT_ARCHITECTURE = NO`
- `SCOUT_CAN_SELECT_ARCHITECTURE = NO`
- `CRITIC_CAN_SELECT_ARCHITECTURE = NO`
- `REVIEWER_CAN_SELECT_ARCHITECTURE = NO`
- `TIMER_CAN_SELECT_ARCHITECTURE = NO`
- `TOOL_OUTPUT_CAN_SELECT_ARCHITECTURE = NO`
- `MODEL_OUTPUT_CAN_SELECT_ARCHITECTURE = NO`
- `SYNTHESIZER_CAN_SELECT_CANDIDATE = NO`

Only a signed human decision record (`HumanDecisionRecord`) containing an authorized operator signature (`humanOperatorSignature`) can populate `selectedCandidateId` and transition the decision block to `DECIDED`.

---

## 4. Human Sovereignty & Non-Implementation Enforcement (Tests 33, 34)

### 4.1 Non-Implementation Invariant (Test 34)
Recording an approved architecture decision does **NOT** spawn implementation tasks or execute changes against the codebase:
- In Test 34:
  1. Human decision approving `cand-jsonl` is recorded in the Arena.
  2. The K0 Kernel session snapshot is queried: `snapshot.tasks.length === 0`.
  3. No child tasks are created in K0 or dispatched via K2 (`DECISION_PACKET_STARTS_IMPLEMENTATION = NO`).
  4. Code implementation is strictly decoupled and requires an independent human authorization wave (`HUMAN_DECISION_IMPLIES_IMPLEMENTATION_AUTHORIZATION = NO`).
  5. Automated git merging is disabled (`AUTO_MERGE_ENABLED = NO`).
