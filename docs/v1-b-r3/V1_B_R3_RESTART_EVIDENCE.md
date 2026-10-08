# GRAVITAS V1-B-R3 RESTART EVIDENCE
## Persistence, Idempotency & Legacy Compatibility Proof

**Wave:** V1-B-R3  
**Status:** VERIFIED_BY_AUTOMATED_SUITE  

---

### 1. Test Verification Summary

All persistence, recovery, anti-forgery, and backward compatibility invariants have been verified through automated integration tests in `apps/server/src/production-persistence.test.ts`.

| Test ID | Invariant Proven | Test Result |
| :--- | :--- | :--- |
| **TEST 1** | Production startup attaches canonical persistence authority (`isDurable === true`) | **PASS** |
| **TEST 2** | Trusted K5 result creates durable receipt-bound observation in SQLite | **PASS** |
| **TEST 3** | Shutdown and restart preserve the observation in SQLite | **PASS** |
| **TEST 4** | Reconstructed history produces identical routing aggregates | **PASS** |
| **TEST 5** | Replaying same observation does not increase counts (idempotency) | **PASS** |
| **TEST 6** | Forged receipt cannot create verified success (fails closed) | **PASS** |
| **TEST 7** | Unavailable database cannot falsely claim durable mode | **PASS** |
| **TEST 8** | Pre-V1-B database remains compatible | **PASS** |
| **TEST 9** | Offline desktop startup remains functional with zero qualified models | **PASS** |
| **TEST 10** | No secrets or model results leak into IPC or logs | **PASS** |

---

### 2. Evidence Findings

1. **Restart Recovery & Aggregate Identity:**
   - Pre-shutdown: 1 observation with 1 verified pass recorded for `mistralai/mixtral-8x7b-instruct-v0.1`.
   - Post-shutdown & restart on same data directory: `WorkSessionKernel` initializes, reopens SQLite schema without migration churn, and `reconstructFromDurableStore` restores exact statistics:
     - `totalAttempts`: 1
     - `verifiedPasses`: 1
     - `verifiedFailures`: 0
     - `successRate`: 1.0
     - `averageLatencyMs`: 220
   - Both pre- and post-restart aggregates are strictly identical.

2. **Restart-Safe Idempotency:**
   - When an observation with an identical `observationId` is recorded multiple times (e.g. replayed event or network retry), the system deduplicates on both memory index and SQLite primary key.
   - Result: row count in `model_execution_observations` remains 1; total attempts query remains 1.

3. **Anti-Forgery Fail-Closed Guarantees:**
   - Unbranded K5 receipt registration rejected with: `Error: K5 receipt provenance failure: receipt ... was not issued by trusted verification authority.`
   - Manufactured `VerificationResult` not executed through `executeVerification` rejected with: `VerificationPolicyError: Cannot issue authoritative K5 verification receipt: VerificationResult was not produced by executeVerification authority.`
   - Unrecorded receipt ID in observation rejected with: `Error: ... does not exist in authoritative verification records.`

4. **Backward Compatibility:**
   - Pre-V1-B databases lacking `k5_verification_receipts` and `model_execution_observations` tables open cleanly.
   - Legacy `work_sessions` and other entities remain untouched and fully queryable.
   - V1-B tables are created without destructive schema alterations.
