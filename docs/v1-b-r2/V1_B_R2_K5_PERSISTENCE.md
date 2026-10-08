# GRAVITAS — Wave V1-B-R2 K5 Persistence Architecture
**Durable Storage, Single-Writer Authority & Deterministic Reconstruction**

---

## 1. Single Canonical Writer Invariant

Gravitas mandates:
> **ONE CANONICAL OWNER PER MUTABLE DOMAIN**  
> **WORKER PROCESS != CANONICAL DATABASE WRITER**

Model observations and verification receipts are authoritative operational data. Rather than introducing a sidecar database or loose JSON files, V1-B-R2 incorporates persistence directly into the K0 WorkSession Kernel managed by `SqliteWriter` in WAL mode with `BEGIN IMMEDIATE` transaction boundaries.

---

## 2. Schema DDL Specification

The following tables are added to `SCHEMA_V1_DDL` in `packages/core/src/kernel/persistence/schema.ts`:

### Table: `k5_verification_receipts`
```sql
CREATE TABLE IF NOT EXISTS k5_verification_receipts (
  receipt_id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  work_session_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  verdict TEXT NOT NULL CHECK (verdict IN ('VERIFIED_PASS', 'VERIFIED_FAIL')),
  commands_count INTEGER NOT NULL DEFAULT 0,
  passed_commands_count INTEGER NOT NULL DEFAULT 0,
  failed_commands_count INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT NOT NULL,
  issued_at TEXT NOT NULL,
  superseded INTEGER NOT NULL DEFAULT 0 CHECK (superseded IN (0, 1))
);

CREATE INDEX IF NOT EXISTS idx_k5_receipts_session ON k5_verification_receipts(work_session_id);
CREATE INDEX IF NOT EXISTS idx_k5_receipts_task ON k5_verification_receipts(task_id);
CREATE INDEX IF NOT EXISTS idx_k5_receipts_plan ON k5_verification_receipts(plan_id);
```

### Table: `model_observations`
```sql
CREATE TABLE IF NOT EXISTS model_observations (
  observation_id TEXT PRIMARY KEY,
  work_session_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  provider_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  task_domain TEXT NOT NULL,
  task_complexity TEXT NOT NULL,
  qualification_identity TEXT NOT NULL,
  k5_plan_id TEXT NOT NULL,
  k5_receipt_id TEXT NOT NULL REFERENCES k5_verification_receipts(receipt_id) ON DELETE CASCADE,
  verified_outcome TEXT NOT NULL CHECK (verified_outcome IN ('VERIFIED_PASS', 'VERIFIED_FAIL')),
  latency_ms INTEGER NOT NULL DEFAULT 0,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  failure_class TEXT,
  schema_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_model_obs_session ON model_observations(work_session_id);
CREATE INDEX IF NOT EXISTS idx_model_obs_task ON model_observations(task_id);
CREATE INDEX IF NOT EXISTS idx_model_obs_model ON model_observations(provider_id, model_id);
CREATE INDEX IF NOT EXISTS idx_model_obs_receipt ON model_observations(k5_receipt_id);
```

---

## 3. SqliteWriter Methods

`SqliteWriter` exposes synchronous, parameterized operations:
- `insertK5Receipt(receipt: K5ReceiptRecord): void`
- `getK5Receipt(receiptId: string): K5ReceiptRecord | undefined`
- `listK5ReceiptsForTask(taskId: string): readonly K5ReceiptRecord[]`
- `listAllK5Receipts(): readonly K5ReceiptRecord[]`
- `markK5ReceiptSuperseded(receiptId: string): void`
- `insertModelObservation(obs: DurableModelObservation): void`
- `getModelObservation(observationId: string): DurableModelObservation | undefined`
- `getModelObservationByReceiptId(receiptId: string): DurableModelObservation | undefined`
- `listModelObservations(): readonly DurableModelObservation[]`
- `listModelObservationsForModel(providerId: string, modelId: string): readonly DurableModelObservation[]`

---

## 4. Deterministic Restart Reconstruction

When a new `ModelCapabilityHistory` instance is created and attached to an existing database:
```typescript
history.reconstructFromDurableStore(writer);
```
1. All receipts are indexed into the authoritative receipt registry.
2. All observations are loaded in chronological order.
3. 1:1 receipt bindings are reconstructed in `receiptToObservationId`.
4. De-duplication structures are populated (`seenObservationIds`).
5. Success rates, attempt counts, and latencies are immediately available without loss or distortion.
