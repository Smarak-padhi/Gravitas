# GRAVITAS K5 — INDEPENDENT VERIFICATION RUNTIME INPUT PACKET
## Handoff from Completed & Hardened Wave K4 to Future Wave K5

**Source Wave**: K4 (Architecture Arena Final Runtime-Integration & Hardening Loop)  
**Target Wave**: K5 (Independent Verification & Adversarial Falsification Runtime)  
**State**: INPUT_PACKET_ONLY — K5 IMPLEMENTATION IS STRICTLY NOT AUTHORIZED  
**Baseline Git Commit**: `516e01c82cb4c3afd1080e72e68a4e1e56687335`  

---

## 1. Upstream Frozen Contracts Delivered by Hardened K4

When Wave K5 is authorized by sovereign human approval, it will build upon:

1. **Architecture Arena Runtime (`packages/orchestrator/src/k4/`)**:
   - `ArchitectureArena`, `ArchitectureQuestion`, `ArchitectureCandidate`, `EvidenceItem`, `EvidenceFitness`.
   - Structural critic independence (`CRITIC != AUTHOR`).
   - Claim-relative 10-dimensional evidence weighting and benchmark incomparability detection.
   - Objective `DecisionPacket` generation stopping dead at `WAITING_FOR_HUMAN_DECISION`.
   - Canonical persistence to K0 via `CREATE_DURABLE_JOB` (`K4_WRITES_SQLITE_DIRECTLY = NO`).
   - Scout dispatch via K2 bounded orchestration leases with stale submission rejection (`REJECTED_STALE`).
   - Tool execution through K3 `CapabilityGrantEngine` on K1 qualified surfaces (`K4_SPAWNS_PROCESS_DIRECTLY = NO`).
   - Untrusted research data boundary and prompt injection defusal (`defuseUntrustedResearchData`).
2. **K0–K3 Substrates**:
   - K0: Single-writer SQLite WorkSession Kernel (51 tests).
   - K1: Execution-surface harness adapter and qualification ladder (108 tests).
   - K2: Supervisor ↔ Worker closed-loop orchestration (53 tests).
   - K3: Tool Registry and revocable `CapabilityGrant` authority runtime (85 tests).
   - K4: Architecture Arena runtime (35 tests).
   - Total Regression Suite: **332 passing tests**, 0 failures, 0 skips.
3. **Zero-Spend Financial Gate**:
   - `AUTONOMOUS_INCREMENTAL_SPEND = 0`.
   - Unknown-cost and paid tools fail closed immediately (`COST_UNKNOWN`).
   - Future candidate production costs ($20/mo) are modeled as economic properties, distinct from autonomous execution spend.
4. **Human Sovereign Gate**:
   - All architecture decisions terminate at `WAITING_FOR_HUMAN_DECISION` for explicit operator sign-off.
   - `HUMAN_ARCHITECTURE_DECISION != IMPLEMENTATION_AUTHORIZATION` (zero tasks spawned).

---

## 2. K5 Scope Boundaries & Responsibilities

Wave K5 will address:
1. Multi-tier independent verification pipeline (linter, compiler, test runner, differential oracle).
2. Autonomous adversarial falsification generation.
3. Mutation verification and worktree invariant checkers.
4. Independent verifier state machine and failure quarantine.

---

## 3. Strict Prohibitions for K5

- Do NOT start K5 implementation before sovereign human authorization.
- Do NOT weaken K4 critic independence invariants.
- Do NOT bypass zero-spend invariants.
- Do NOT bypass human decision boundaries.
- Do NOT build desktop/Electron Living HQ.
