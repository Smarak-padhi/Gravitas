# D3 Visual State Grammar

## 1. 16-State Visual Grammar

Every spatial entity is deterministically mapped to exactly one of 16 visual states. The grammar enforces unambiguous distinction between worker claims, verifier outcomes, and human sovereignty:

| Visual State | Glyph | Color (Hex) | Semantic Label | Epistemic Meaning |
| :--- | :---: | :---: | :--- | :--- |
| `IDLE` | `○` | `#64748b` | Idle | Inactive / resting entity |
| `WAITING` | `◔` | `#94a3b8` | Waiting / Queued | Scheduled or awaiting preconditions |
| `BLOCKED` | `⊘` | `#f97316` | Blocked | Blocked on upstream dependency |
| `ACTIVE` | `◐` | `#38bdf8` | Executing | Worker actively running |
| `WORKER_SUCCEEDED` | `✓` | `#2dd4bf` | Worker Finished (Unverified) | Worker claims success; **NOT verified** |
| `VERIFYING` | `◌` | `#818cf8` | Verifying | Independent verifier executing evaluation |
| `VERIFIED_PASS` | `✓` | `#34d399` | Verified Pass (Not Approved) | Falsification passed; **NOT approved by human** |
| `VERIFICATION_INCONCLUSIVE`| `?` | `#fbbf24` | Verification Inconclusive | Missing or incomplete evidence |
| `VERIFICATION_FAILED` | `✗` | `#f43f5e` | Verification Failed | Target failed verification checks |
| `AWAITING_HUMAN_APPROVAL` | `⚑` | `#fbbf24` | Waiting for Human Approval | Requires sovereign human signoff |
| `HUMAN_APPROVED` | `★` | `#10b981` | Human Approved | Human approved action |
| `HUMAN_REJECTED` | `⮾` | `#ef4444` | Human Rejected | Human rejected action |
| `CANCELLED` | `⊝` | `#64748b` | Cancelled | Cancelled by operator or upstream abort |
| `FAILED` | `✖` | `#ef4444` | Failed | Execution crashed or terminated with error |
| `RECOVERY_REQUIRED` | `▲` | `#f59e0b` | Recovery Required | State reconciliation / crash recovery needed |
| `OFFLINE_STALE` | `⌿` | `#475569` | Offline / Stale | Kernel unavailable; showing historical cache |

## 2. Inviolable Epistemic Invariants

1. `WORKER_SUCCEEDED != VERIFIED_PASS`:
   Worker exit status `0` only maps to `WORKER_SUCCEEDED` (`#2dd4bf`). It CANNOT map to `VERIFIED_PASS` (`#34d399`).
2. `VERIFIED_PASS != AWAITING_HUMAN_APPROVAL != HUMAN_APPROVED`:
   Passing verification does NOT grant human approval. The glyph, color, and zone are completely distinct.
3. `PRESENCE != PROCESS_LIVENESS`:
   An entity appearing in the spatial world represents persisted canonical metadata; live execution requires active `EXECUTION_RECORD_RUNNING` telemetry.
