# GRAVITAS — Wave V1-C Security & Cost Policy
## Zero-Dollar Spend Invariants & Secret Containment

### 1. Invariant Commitments

GRAVITAS is architected with strict financial containment:
- **$0.00 Out-of-Pocket Expense:** Autonomous execution cannot spend money under any circumstances.
- **Paid Fallback Permitted:** `false` (hardcoded). System fails closed rather than failing over to paid endpoints.
- **Autonomous Payment Authority:** `false`. No agent or model has purchasing or billing authority.

---

### 2. Secret Containment Architecture

- **`ModelCredentialBroker` (`packages/gateways/src/credentials/modelCredentialBroker.ts`):**
  - Raw API credentials exist **only in an unexported in-memory `Map`** during the lifetime of the process.
  - Callers outside the low-level HTTP transport boundary receive only opaque handles (`vault:cred:nvidia-nim`).
  - Configuration files (`config.json`), telemetry payloads, diagnostic reports, and audit logs are sanitized to strip any tokens matching `nvapi-`, `sk-`, `Bearer `, or similar patterns.
  - The setup wizard clears credentials from volatile memory on demand without leaving residual files.

---

### 3. Fail-Closed Model Routing Policy

When running in `DETERMINISTIC_ONLY` mode (the default), all task execution paths use deterministic tools, compilation checks, and test harnesses. If model intelligence is requested while credentials are unconfigured or unavailable, the system safely reports `AUTH_REQUIRED` and terminates the request fail-closed rather than guessing or calling unauthorized third parties.
