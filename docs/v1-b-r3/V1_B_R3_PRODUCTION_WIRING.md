# GRAVITAS V1-B-R3 PRODUCTION WIRING
## Canonical K0 Persistence & Model History Architecture

**Wave:** V1-B-R3  
**Status:** IMPLEMENTED_AND_VERIFIED  

---

### 1. Structural Wiring Architecture

```
+-----------------------------------------------------------------------------------+
|                            ELECTRON UTILITY PROCESS / SERVER                      |
|                                                                                   |
|  +--------------------+                                                           |
|  | WorkSessionKernel  | (Canonical state authority & single writer)               |
|  |   - sqliteWriter   | ---> [kernel.db: SQLite WAL Mode]                         |
|  +---------+----------+      - k5_verification_receipts                           |
|            |                 - model_execution_observations                       |
|   getModelObservationStore() (Narrow DurableModelObservationStore port)           |
|            |                                                                      |
|            v                                                                      |
|  +---------------------------+       reconstructFromDurableStore() on boot        |
|  |  ModelCapabilityHistory   | <--------------------------------------------+     |
|  |  - isDurable: true        |                                              |     |
|  |  - in-memory lookup cache |                                              |     |
|  +-------------+-------------+                                              |     |
|                ^                                                            |     |
|                | registerAuthoritativeReceipt(receipt)                      |     |
|                | [requires K5_AUTHORITY_BRAND: true]                        |     |
|                |                                                            |     |
|  +-------------+-------------+                                              |     |
|  |    BoundedScheduler       |                                              |     |
|  |    - durableWriter        |                                              |     |
|  +-------------+-------------+                                              |     |
|                ^                                                            |     |
|                | executeVerification() & createVerificationReceipt()        |     |
|                |                                                            |     |
|  +-------------+-------------+                                              |     |
|  |  Independent Verifier     | (Shell-free, container-restricted)          |     |
|  |  - WeakSet membership     |                                              |     |
|  +---------------------------+                                              |     |
+-----------------------------------------------------------------------------------+
```

---

### 2. Exact Source References

#### A. Kernel Port Interface
- **File:** `packages/core/src/kernel/persistence/sqliteWriter.ts`
  - `K5_AUTHORITY_BRAND = Symbol.for('gravitas.k5.authority')` (L44)
  - `DurableModelObservationStore` interface (L89–L100)
  - `SqliteWriter implements DurableModelObservationStore` (L108)
- **File:** `packages/core/src/kernel/kernel.ts`
  - `public getModelObservationStore(): DurableModelObservationStore` (L868–L873)
  - Asserts `lifecycleState === 'READY'` and returns `this.writer`.

#### B. Independent Verifier Receipt Authority
- **File:** `packages/verifier/src/verifier.ts`
  - `const verifiedExecutions = new WeakSet<VerificationResult>()` (L18)
  - In `executeVerification`: `verifiedExecutions.add(result)` (L116)
  - In `createVerificationReceipt`: asserts `verifiedExecutions.has(verification)` (L135–L139)
  - Brands issued receipt with `[K5_AUTHORITY_BRAND]: true` (L157–L162)

#### C. Model Capability History Rehydration & Verification
- **File:** `packages/gateways/src/models/history.ts`
  - `setDurableWriter(writer: DurableModelObservationStore | null)` (L69–L74)
  - `detachDurableWriter()` (L76–L78)
  - `registerAuthoritativeReceipt`: validates `(receipt as any)[K5_AUTHORITY_BRAND] === true` (L97–L105)
  - `reconstructFromDurableStore`: loads SQLite receipts and observations, marks DB receipts with `[K5_AUTHORITY_BRAND]: true`, and rehydrates memory index (L146–L190)

#### D. Production Desktop Kernel Host Wiring
- **File:** `apps/desktop/src/kernel-host/kernelHost.ts`
  - In `start()`:
    ```ts
    await this.kernel.start()
    const observationStore = this.kernel.getModelObservationStore()
    ModelCapabilityHistory.getInstance(observationStore)
    ```
  - In `shutdown()` and `SHUTDOWN_REQUEST`:
    ```ts
    ModelCapabilityHistory.getInstance().detachDurableWriter()
    await this.kernel.shutdown()
    ```

#### E. Production Server RunService Wiring
- **File:** `apps/server/src/service.ts`
  - In `ensureKernelStarted()`:
    ```ts
    if (this.kernel.getLifecycleState() === 'STOPPED') {
      await this.kernel.start()
    }
    const store = this.kernel.getModelObservationStore()
    ModelCapabilityHistory.getInstance(store)
    ```
  - In `executeRun()`: passes `durableWriter: this.kernel?.getModelObservationStore()` to `BoundedScheduler`.
  - In `stopScheduler()`: calls `detachDurableWriter()` and shuts down kernel.
