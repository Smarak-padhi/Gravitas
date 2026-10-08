# GRAVITAS — Wave V1-B-R2 Audit Report
**K5 Persistence, Receipt Provenance & Evidence Closure Audit**

---

## 1. Executive Summary

Wave **V1-B-R2** was executed to eliminate the remaining architectural and epistemic risks in the Gravitas Model Intelligence layer:
1. **Model Capability Durability Gap**: In V1-B and V1-B-R, `ModelCapabilityHistory` operated exclusively as an in-memory session cache (`isDurable: false`), meaning verified model track records vanished on process termination.
2. **K5 Receipt Provenance Vulnerability**: While V1-B-R added checks for non-empty `verificationPlanId`, receipt identifiers were arbitrary caller-supplied strings without independent cryptographic or authority verification, risking synthetic or unverified history inflation.
3. **Restart Idempotency**: Prior to V1-B-R2, there was no deterministic mechanism to restore capability profiles from the canonical K0 SQLite store on daemon restart without risking duplicate observation recording.
4. **Accurate Evidence Accounting**: Full forensic reconciliation between the 1,643 Vitest baseline of V1-B, the 1,651 Vitest count of V1-B-R (+8 tests), and the 1,662 Vitest count of V1-B-R2 (+11 tests).

All four gaps have been resolved under fail-closed security and zero out-of-pocket spend ($0.00).

---

## 2. In-Memory Caching vs. Durable K0 SQLite Authority

### The Flaw
The V1-B-R disclosure truthfully stated:
```typescript
public readonly isDurable: false = false;
```
However, in production, a command center cannot rely on ephemeral process memory for model routing decisions. If a model consistently fails code repair tasks or passes deterministic verification, that knowledge must persist across application restarts.

### The Resolution
We integrated durable observation persistence directly into the canonical **K0 WorkSession Kernel SQLite schema** (`packages/core/src/kernel/persistence/schema.ts`) and **SqliteWriter** (`packages/core/src/kernel/persistence/sqliteWriter.ts`), avoiding unowned SQLite writes and respecting the single-canonical-writer architectural invariant:
- **`k5_verification_receipts` table**: Stores authoritative receipts issued by `@gravitas/verifier`.
- **`model_observations` table**: Stores empirical execution records with token telemetry, latency, and foreign-key binding to authoritative receipts.

When `SqliteWriter` is supplied, `ModelCapabilityHistory.isDurable` evaluates to `true`, and observations are synchronously written to SQLite during `recordObservation`.

---

## 3. Receipt Provenance & Anti-Fabrication Security

### The Threat Model
A caller (e.g. rogue worker, untrusted test, or hallucinating agent) could fabricate an observation claiming `k5VerifiedOutcome: 'VERIFIED_PASS'` with a fabricated `verificationReceiptId`.

### The 8 Provenance Invariants
In V1-B-R2, `ModelCapabilityHistory.recordObservation` enforces 8 fail-closed invariant checks:
1. **Invariant A (Existence)**: Receipt ID must exist in authoritative verification records (memory or K0 SQLite).
2. **Invariant B (Task Binding)**: Receipt `taskId` must match observation `taskId`; callers cannot substitute another task's receipt.
3. **Invariant C (Plan Binding)**: Receipt `planId` must match observation `verificationPlanId`.
4. **Invariant D (Time Monotonicity)**: Receipt `completedAt` must precede or match observation `timestamp` (rejects postdated receipts).
5. **Invariant E (Verdict Consistency)**: Receipt verdict (`VERIFIED_PASS` / `VERIFIED_FAIL`) must strictly match observation outcome.
6. **Invariant F (Revocation Status)**: Receipt must not be marked `superseded` or revoked.
7. **Invariant G (Single-Use 1:1 Binding)**: A receipt cannot be bound to more than one observation (rejects receipt reuse).
8. **Invariant H (Durable Mandatory Receipt)**: Observations recorded into the durable store must carry an authentic receipt ID.

Any violation immediately fails closed and aborts recording without side effects.

---

## 4. Test Accounting & Lineage

| Wave | Vitest Tests | Vitest Files | K0 Native Tests | Automated Total | Dogfood Steps | Combined Checks |
|---|---|---|---|---|---|---|
| **V1-B** | 1,643 | 96 | 51 | 1,694 | 13 | 1,707 |
| **V1-B-R** | 1,651 (+8) | 97 (+1) | 51 | 1,702 (+8) | 13 | 1,715 (+8) |
| **V1-B-R2** | 1,662 (+11) | 98 (+1) | 51 | 1,713 (+11) | 13 | 1,726 (+11) |

The exact 11 tests added in V1-B-R2 reside in `packages/gateways/src/__tests__/k5-persistence-and-provenance.test.ts`.

---

## 5. Epistemic Calibration & Production Status

- **Live NVIDIA API Calls**: 0
- **Real Model Executions**: 0
- **Provider Status**: `AUTH_REQUIRED` (fail-closed, no synthetic API keys)
- **Qualified Models**: 0 live qualified (catalog models require hardware/key configuration)
- **Autonomous Spend**: $0.00
- **Physical Electron Dogfood**: 13 / 13 steps passed with clean process lifecycle.
