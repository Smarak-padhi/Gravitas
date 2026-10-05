# GRAVITAS K1 — OBJECTIVE LEDGER (HARDENED RECONCILIATION)

**Wave**: K1 — Recursive Harness Adapter & Execution-Surface Qualification Loop  
**Date**: 2026-10-02  
**Status**: OBJECTIVE COMPLETE — SURFACES TRUTHFULLY CLASSIFIED  

---

## 1. Primary Objectives Ledger

| # | Directive Mandate | Target Outcome | Hardened Status | Verification Evidence |
|---|---|---|---|---|
| 1 | Preserved Taxonomy Invariants | `ROLE != EXECUTOR != HARNESS != MODEL != PROVIDER != GATEWAY != PROCESS` | **COMPLETE** | Modeled in `types.ts`, test 01. |
| 2 | Preserved Zero-Spend Invariant | `AUTONOMOUS_INCREMENTAL_SPEND = 0`, fail-closed | **COMPLETE** | `isCostEligibleForAutonomousDispatch`, tests 17–22. |
| 3 | Qualification Ladder FSM | 8-stage monotonic qualification ladder | **COMPLETE** | `isValidQualificationTransition`, tests 09–16. |
| 4 | Host Surface Qualification | Empirical non-destructive probes on all candidate surfaces | **COMPLETE** | `K1_EXECUTION_SURFACE_QUALIFICATION_REGISTER.md` (truthful downgraded states recorded). |
| 5 | Adapter Implementation | ProcessHarness, ApiHarness, DaemonHarness implementations | **COMPLETE** | 6 adapters implemented and verified. |
| 6 | K0 Integration | Harnesses never write SQLite; command-envelope job flow | **COMPLETE** | `k0Integration.ts`, tests 39. `test:kernel` 51/51 PASS. |
| 7 | Third-Party Tool Classification | 6 repositories classified per human directive | **COMPLETE** | `thirdPartyClassifications.ts`, test 38. |
| 8 | Automated Test Suite | Disjoint test suites with exact accounting (159 total) | **COMPLETE** | K0: 51, Legacy: 60, K1: 48. Total: 159 tests PASS. |
| 9 | 10 Documentation Files | Complete architectural documentation suite | **COMPLETE** | Verified and reconciled against repository reality. |
| 10 | K2 Input Packet | Handoff specifications for K2 Executor Routing wave | **COMPLETE** | `K2_EXECUTOR_ROUTING_INPUT_PACKET.md` generated. |

---

## 2. Surface Qualification vs. Dispatch Status

| Surface | Qualification State | Readiness State | Cost Class | Autonomous Dispatch Status |
|---|---|---|---|---|
| `codex` | `INSTALLED` | `NOT_READY` | `UNKNOWN_COST` | **BLOCKED** (Auth missing) |
| `claude-code` | `INSTALLED` | `NOT_READY` | `UNKNOWN_COST` | **BLOCKED** (Logged out) |
| `free-claude-code` | `INSTALLED` | `NOT_READY` | `LOCAL_FOSS` | **BLOCKED** (Proxy offline) |
| `agy` | `INSTALLED` | `READY` (Technical) | `UNKNOWN_COST` | **BLOCKED_COST_UNKNOWN** |
| `powershell-local` | `QUALIFIED` | `READY` | `OPERATOR_INCLUDED_HOST_RUNTIME` | **ELIGIBLE** (Deterministic Only) |
| `bedrock` | `DISCOVERED` | `COST_ELIGIBILITY_UNKNOWN` | `PROMOTIONAL_CREDIT` | **BLOCKED** (SDK absent, cost unknown) |
| `omniroute` | `DISCOVERED` | `NOT_READY` | `LOCAL_FOSS` | **BLOCKED** (Gateway process offline) |
| `manus` | `DISCOVERED` | `BLOCKED` | `UNKNOWN_COST` | **BLOCKED** (Quarantined) |


---

## 3. Program State Lock

```text
P0–P8 = APPROVED_AND_FROZEN
K0 = APPROVED_AND_FROZEN
K1 = COMPLETE_AND_HARDENED (Ready for Human Gate)
K2–K5 = NOT_AUTHORIZED
PHASE_D = NOT_AUTHORIZED
```
