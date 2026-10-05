# GRAVITAS — WAVE K0 TEST & EVIDENCE REPORT
## Complete Contract, Adversarial & Fault Injection Test Suite Execution Log

**Status**: 100% PASSING (51/51 TESTS PASS)  
**Runner**: Native Node.js `v24.13.0` Test Runner (`node --test`) via Maintained Test Loader Hook  
**Command**: `npm run test:kernel`  
*(Equivalent to `node --experimental-strip-types --loader ./packages/core/scripts/test-loader.mjs --test packages/core/src/kernel/__tests__/kernel.test.ts`)*  
**Suite File**: [`packages/core/src/kernel/__tests__/kernel.test.ts`](file:///c:/Users/smara/Desktop/Multi-agent/packages/core/src/kernel/__tests__/kernel.test.ts)  
**Execution Time**: 3433.8 ms

---

## 1. Full Test Execution Matrix

| Test ID | Category | Description | Status | Duration |
| :--- | :--- | :--- | :--- | :--- |
| **TEST 01** | Contract | Create WorkSession initializes DB, writes entity, revision = 1 | PASS | 52.1 ms |
| **TEST 02** | Contract | Retrieve WorkSession returns complete matching entity | PASS | 42.1 ms |
| **TEST 03** | Contract | Persistence after restart - survives clean process shutdown | PASS | 51.2 ms |
| **TEST 04** | Contract | Valid FSM transition updates state and increments revision | PASS | 37.3 ms |
| **TEST 05** | Contract | Illegal FSM transition rejected fail-closed without mutation | PASS | 40.4 ms |
| **TEST 06** | Contract | Durable event written for every state transition | PASS | 43.4 ms |
| **TEST 07** | Contract | Event sequence numbers are strictly monotonically increasing | PASS | 42.6 ms |
| **TEST 08** | Contract | Duplicate identical command returns cached receipt (idempotency) | PASS | 34.9 ms |
| **TEST 09** | Contract | Conflicting reused commandId fails with CommandConflictError | PASS | 37.7 ms |
| **TEST 10** | Contract | Stale expectedRevision fails with RevisionConflictError | PASS | 44.2 ms |
| **TEST 11** | Contract | Transaction rollback on failure leaves zero partial state | PASS | 43.3 ms |
| **TEST 12** | Contract | Schema initialization creates all required tables and PRAGMAs | PASS | 40.8 ms |
| **TEST 13** | Contract | Reopening existing schema succeeds without schema mutation | PASS | 44.8 ms |
| **TEST 14** | Contract | Unsupported schema version throws SchemaVersionUnsupportedError | PASS | 41.4 ms |
| **TEST 15** | Contract | Durable job persistence and query by state | PASS | 44.1 ms |
| **TEST 16** | Contract | Interrupted and expired job lease recovery | PASS | 73.8 ms |
| **TEST 17** | Contract | Startup reconciliation is idempotent | PASS | 49.2 ms |
| **TEST 18** | Contract | Clean shutdown releases lock and stops accepting commands | PASS | 34.5 ms |
| **TEST 19** | Contract | Query snapshot produces complete aggregated representation | PASS | 42.0 ms |
| **TEST 20** | Contract | Live subscription != canonical truth (reconstructed log truth) | PASS | 44.3 ms |
| **TEST 21** | Contract | Malformed payload rejected fail-closed with ValidationFailedError | PASS | 42.8 ms |
| **TEST 22** | Contract | SQL injection payload remains treated strictly as literal data | PASS | 40.1 ms |
| **TEST 23** | Contract | Malicious script/HTML text stored safely as semantic data | PASS | 35.6 ms |
| **TEST 24** | Contract | Isolated data roots operate independently without interference | PASS | 80.4 ms |
| **TEST 25** | Contract | Two instances do not compete as writers (single-writer lock) | PASS | 49.6 ms |
| **ADV 01** | Adversarial | Conflicting payload mutation rejected on duplicate commandId | PASS | 38.9 ms |
| **ADV 02** | Adversarial | Stale optimistic revision conflict with multiple updates | PASS | 41.5 ms |
| **ADV 03** | Adversarial | Reopening dirty or aborted database performs clean rollback | PASS | 37.9 ms |
| **ADV 04** | Adversarial | Interrupted task in RUNNING state reconciled to INTERRUPTED | PASS | 39.3 ms |
| **ADV 05** | Adversarial | WAITING_APPROVAL preserved across restart without auto-advance | PASS | 39.8 ms |
| **ADV 06** | Adversarial | Active session without running tasks $\to$ RECOVERY_REQUIRED | PASS | 32.3 ms |
| **ADV 07** | Adversarial | Stale data root lock with dead PID reclaimed safely | PASS | 38.5 ms |
| **ADV 08** | Adversarial | Live process active in lock prevents second instance start | PASS | 4.0 ms |
| **ADV 09** | Adversarial | Corrupted database file detected via integrity check fail-closed | PASS | 8.9 ms |
| **ADV 10** | Adversarial | Future schema version rejected without downgrade attempt | PASS | 43.6 ms |
| **ADV 11** | Adversarial | Rapid concurrent command execution retains monotonic sequence | PASS | 51.8 ms |
| **ADV 12** | Adversarial | Terminal state rejection: cannot transition from COMPLETED | PASS | 41.4 ms |
| **ADV 13** | Adversarial | Terminal state rejection: cannot transition from CANCELLED | PASS | 47.7 ms |
| **ADV 14** | Adversarial | Terminal state rejection: cannot transition from FAILED | PASS | 38.3 ms |
| **ADV 15** | Adversarial | Command execution while STOPPED throws KernelNotReadyError | PASS | 1.8 ms |
| **ADV 16** | Adversarial | Multiple subscribers receive events independently | PASS | 35.1 ms |
| **ADV 17** | Adversarial | Faulty subscriber throwing error does not break kernel command | PASS | 37.9 ms |
| **ADV 18** | Adversarial | Zero unhandled promise rejections on duplicate start call | PASS | 43.9 ms |
| **ADV 19** | Adversarial | Payload with extreme JSON size and special characters persists | PASS | 39.5 ms |
| **ADV 20** | Adversarial | Heartbeat update and lock touch prevents premature expiration | PASS | 84.1 ms |
| **CRASH-A** | Fault-Inj | Process terminates before SQLite commit $\to$ mutation absent after restart | PASS | 315.4 ms |
| **CRASH-B** | Fault-Inj | Commits, process dies before response $\to$ retry returns receipt without dup | PASS | 304.4 ms |
| **CRASH-C** | Fault-Inj | Job lease commits, process dies $\to$ restart marks lease EXPIRED | PASS | 287.5 ms |
| **CRASH-D** | Fault-Inj | WAITING_APPROVAL reached, process dies uncleanly $\to$ preserved intact | PASS | 292.2 ms |
| **CRASH-E** | Fault-Inj | Dies while ACTIVE / RUNNING $\to$ reconciled to RECOVERY_REQUIRED / INTERRUPTED | PASS | 341.9 ms |

---

## 2. Deterministic Verification Output

```
▶ GRAVITAS K0 WORKSESSION KERNEL TEST SUITE
  ✔ TEST 01 ...
  ...
  ✔ CRASH-E ...
✔ GRAVITAS K0 WORKSESSION KERNEL TEST SUITE (3433.8196ms)
ℹ tests 51
ℹ suites 0
ℹ pass 51
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 3697.7569
```
Zero failures. Zero skips. Zero unhandled rejections across all 51 tests.
