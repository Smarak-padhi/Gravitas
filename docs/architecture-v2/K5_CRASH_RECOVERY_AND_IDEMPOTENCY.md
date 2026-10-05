# GRAVITAS K5 — CRASH RECOVERY & IDEMPOTENCY MODEL
## Fault-Tolerant State Resumption and Crash Semantics (K5-A to K5-F)

**Wave**: K5  
**Status**: APPROVED_AND_FROZEN  

---

### 1. Persistence Substrate

All K5 state entities (`PLAN`, `CRITERION`, `CLAIM`, `ASSIGNMENT`, `ASSIGNMENT_STATUS`, `OBSERVATION`, `MUTATION`, `EVIDENCE`, `FINDING`, `REPORT`, `BUNDLE`, `STATE`, `DECISION`, `TRACE`) are persisted through `K0` WorkSessionKernel commands using `CREATE_DURABLE_JOB`.

Because `K0` uses append-only SQLite storage, every record is durable across runtime process crashes and restarts.

---

### 2. Six Canonical Crash Recovery Scenarios (K5-A through K5-F)

| Crash ID | Stage of Interruption | Recovery Behavior | Blind Replay? |
| :--- | :--- | :--- | :--- |
| **K5-A** | `PLAN` persisted, crash before assignment | New engine loads plan from K0, creates assignments, executes cleanly without phantom executions. | **NO** |
| **K5-B** | `ASSIGNMENT` persisted, crash before dispatch | New engine loads assignment, re-evaluates K1 and K3 gates fresh at dispatch time, dispatches verifier. | **NO** |
| **K5-C** | Dispatch started, crash before observation | Assignment marked `UNKNOWN_EXTERNAL_OUTCOME`. The engine **never blind-replays** an ambiguous external execution. | **NO** |
| **K5-D** | Observation persisted, crash before normalization | New engine loads raw observation, normalizes evidence, computes digests without rerunning tool. | **NO** |
| **K5-E** | Evidence persisted, crash before report/bundle | New engine loads evidence, synthesizes report and bundle, attaches manifest. | **NO** |
| **K5-F** | Report/bundle persisted, crash before human gate | New engine restores `WAITING_FOR_HUMAN_APPROVAL` state. | **NO** |

---

### 3. Idempotency & Duplicate Delivery

- `ingestObservation` checks existing observation IDs and assignment IDs. Duplicate deliveries return `DUPLICATE_IGNORED`.
- Stale results for superseded criterion revisions return `STALE_CRITERION_REVISION`.
- Expired assignments return `STALE_VERIFIER_RESULT`.
