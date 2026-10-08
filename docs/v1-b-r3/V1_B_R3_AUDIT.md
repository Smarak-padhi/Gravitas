# GRAVITAS V1-B-R3 AUDIT
## Production Persistence & Authority Reconciliation

**Wave:** V1-B-R3  
**Branch:** `feat/v0-golden-loop`  
**Base Commit:** `cf08d16e865d8d497c921f2aee773341b6470eec`  
**Status:** COMPLETE_AND_VERIFIED  

---

### 1. Defect Analysis & Problem Statement

During the V1-B Final Freeze audit, an architectural gap was verified between unit test fixtures and production boot paths:

1. **Unattached Production Writer:**
   - In unit tests, `ModelCapabilityHistory` was instantiated with a test-injected `SqliteWriter`, correctly storing records into SQLite tables.
   - In production runtime boot paths (`KernelHost` in Electron `utilityProcess` and `RunService` in `@gravitas/server`), `ModelCapabilityHistory.getInstance()` was invoked without attaching the canonical `SqliteWriter` owned by `WorkSessionKernel`.
   - Consequently, in production `durableWriter` remained `null`, leaving model execution observations and K5 receipts non-durable and lost across process restarts.

2. **Absence of Production Reconstruction on Boot:**
   - Production startup failed to rehydrate historical model capability observations from the canonical K0 SQLite store upon process restart.
   - Aggregated success rates, attempt counts, and routing metrics were reset to zero after each app launch.

3. **Receipt Issuance Authority Boundary:**
   - Generic in-process callers could theoretically call `createVerificationReceipt` without executing verification, or register unbranded receipts into `ModelCapabilityHistory`.

---

### 2. Remediation Strategy & Invariants Preserved

1. **Single-Writer Authority Preserved:**
   - `WorkSessionKernel` remains the single canonical owner and manager of SQLite writes.
   - We did NOT expose unrestricted raw SQL or full database handles to outer modules.
   - Instead, `SqliteWriter` implements the narrow port `DurableModelObservationStore`, and `WorkSessionKernel` exposes `getModelObservationStore(): DurableModelObservationStore` once its lifecycle reaches `READY`.

2. **Process Boundary Integrity:**
   - Live SQLite objects never cross IPC boundaries.
   - In Desktop, both `WorkSessionKernel` and `ModelCapabilityHistory` reside in the Electron `utilityProcess` (`KernelHost`).
   - In Server, both reside within the server Node.js process.

3. **Authoritative Receipt Provenance & Anti-Forgery:**
   - In `@gravitas/verifier`, an unexported module-private `WeakSet<object>` (`legitimatelyIssuedReceipts`) tracks genuine receipts issued by `createVerificationReceipt` (which strictly asserts that `executeVerification` produced the result).
   - In `@gravitas/gateways`, `registerAuthoritativeReceipt` enforces `isAuthoritativeK5Receipt(receipt)` fail-closed before any database write or cache entry.
   - Any in-process fabricated receipt—even one attempting to attach `Symbol.for('gravitas.k5.authority')` or synthetic properties—fails closed before persistence.
   - For restart rehydration, `reconstructFromDurableStore` populates the in-memory cache directly from canonical K0 SQLite storage without live re-branding into the verifier `WeakSet`.
   - **Threat Model Boundary:** We defend against accidental, unverified, or synthetic receipt registration via public runtime APIs in the same Node.js/Electron process without claiming cryptographic protection against arbitrary memory execution or bytecode patching.

4. **Clean Lifecycle Shutdown:**
   - Both `KernelHost.shutdown()` and `RunService.stopScheduler()` invoke `ModelCapabilityHistory.getInstance().detachDurableWriter()` prior to shutting down `WorkSessionKernel`, preventing dangling handles.
