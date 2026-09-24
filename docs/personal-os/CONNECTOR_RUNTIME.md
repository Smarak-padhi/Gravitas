# GRAVITAS — PERSONAL OS CONNECTOR RUNTIME ARCHITECTURE
## Wave 12J: Bounded Capability Transport Kernel

**Status**: PRODUCTION REFERENCE
**Phase**: WAVE 12J (Connector Kernel + Calendar Operations Foundation)
**Authority**: PERSONAL OS KERNEL

---

## 1. Operating Axiom & Identity Separation

A connector is a bounded capability transport. It is **NOT** an agent, **NOT** a reasoning entity, and **NOT** an autonomous daemon.

$$\text{ROLE} \neq \text{HARNESS} \neq \text{PROVIDER/MODEL} \neq \text{CONNECTOR} \neq \text{EXTERNAL ACCOUNT}$$

- **Role**: Organizational responsibility and governance tier (e.g., `role:strategy:chief-planner`, `role:engineering:backend-engineer`).
- **Harness**: Subprocess execution sandbox for code generation and task attempts (e.g., `codex-worker`, `fcc-worker`, `mock-harness`).
- **Provider/Model**: LLM inference routing and generation engine (e.g., OmniRoute, Anthropic Claude, OpenAI Codex).
- **Connector**: Deterministic capability transport bridge implementing bounded read/write protocols to external systems.
- **External Account**: A specific credentialed identity authorized on an external service (e.g., Google Calendar primary account).

Connectors execute with **zero prompt templates**, **zero LLM inference**, and **zero autonomous judgment**. They translate structured capability requests into validated external API transactions, normalize incoming payloads, handle protocol pagination and token refreshment, and emit sanitized telemetry.

---

## 2. Core Architecture & Components

```
                   +----------------------------------+
                   |  JobScheduler / ActionExecutor   |
                   +-----------------+----------------+
                                     |
                                     | Capability Execution Request
                                     v
                   +----------------------------------+
                   |        ConnectorRegistry         |
                   +--------+----------------+--------+
                            |                |
                Authority   |                | Resolve Credential
                Validation  |                | Handle
                            v                v
                   +--------+-------+ +------+--------+
                   |  Credential    | | SQLite Store  |
                   |  Broker Vault  | | (Audit & State|
                   +--------+-------+ +------+--------+
                            |                |
             Token Refresh  |                |
             & Decryption   v                |
                   +-------------------------+
                   |    ConnectorAdapter     |
                   | (e.g., Google Calendar, |
                   |  Mock Calendar Provider)|
                   +------------+------------+
                                |
                                v REST / HTTP Native Fetch
                   +-------------------------+
                   |  External Service API   |
                   +-------------------------+
```

### 2.1 ConnectorRegistry
Maintains runtime registration of connector adapters (`ConnectorAdapter`). Enforces:
- Schema validation for execution requests.
- Account status verification (`CONNECTED` vs `DISCONNECTED` vs `ERROR`).
- Authority and permission checks (`READ` vs `WRITE`).
- Execution timeout bounds.
- Structured audit log persistence to SQLite.

### 2.2 CredentialBroker
Isolates all credentials in a protected memory vault:
- Assigns opaque cryptographic handles (`CredentialHandle`).
- Enforces zero raw credential exposure across the system boundary.
- Automatically invokes registered refresh handlers when tokens expire or are within a 5-minute skew window.
- Redacts raw secrets from all logs, errors, and traces.

### 2.3 SQLite Connector Store (`SqliteConnectorStore`)
Persists relational connector state in SQLite under WAL mode with foreign keys enabled:
- `connector_accounts`: External identities, granted scopes, status, and synchronization timestamps.
- `connector_audit_log`: Append-only chronological trace of capability executions with sanitized summaries.
- `connector_sync_state`: Cursor tokens, page tokens, and sync markers.

---

## 3. Least-Privilege Authority Model

Every capability exposed by a connector declares an explicit authority requirement:

| Authority Class | Sovereign Approval Required? | Permitted Autonomy | Description |
| :--- | :--- | :--- | :--- |
| **`READ`** | No | L1, L2, L3 | Deterministic data ingestion; read-only querying with zero external mutation. |
| **`WRITE`** | **YES (Mandatory)** | L0 / Sovereign Human | External state mutation (create, edit, delete); requires explicit operator signature. |
| **`ADMIN`** | **YES (Mandatory)** | L0 / Sovereign Human | Account linking, credential revocation, permission elevation. |

In Wave 12J, the capability surface is strictly restricted to **`READ`**. Any attempt to invoke write actions without explicit cryptographic approval tokens is rejected fail-closed with `FORBIDDEN`.

---

## 4. Sanitization & Audit Guarantees

Every invocation through `ConnectorRegistry.execute()` generates an immutable audit record:
```typescript
export interface ConnectorAuditLogEntry {
  readonly id: string
  readonly timestamp: string
  readonly connectorId: string
  readonly accountId?: string
  readonly capabilityId?: string
  readonly actorType: 'JOB' | 'AGENT' | 'USER' | 'SYSTEM'
  readonly actorId: string
  readonly authority: 'READ' | 'WRITE' | 'ADMIN'
  readonly action: string
  readonly success: boolean
  readonly durationMs: number
  readonly sanitizedInputSummary?: string
  readonly sanitizedOutputSummary?: string
  readonly errorCode?: string
  readonly errorMessage?: string
}
```

- **Zero Credential Storage in Logs**: Tokens, refresh tokens, and client secrets are stripped before generating `sanitizedInputSummary` and `sanitizedOutputSummary`.
- **Durable Persistence**: Audit logs are written directly to SQLite with versioned schema migrations.
- **Operator Inspection**: UI exposes the sanitized audit log drawer in real-time with zero token leakage.
