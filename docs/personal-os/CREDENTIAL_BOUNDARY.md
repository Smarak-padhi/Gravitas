# GRAVITAS — CREDENTIAL BOUNDARY & SECURITY SPECIFICATION
## Wave 12J: Zero-Leakage Credential Architecture

**Status**: PRODUCTION REFERENCE
**Phase**: WAVE 12J (Connector Kernel + Calendar Operations Foundation)
**Authority**: PERSONAL OS KERNEL & STATE AUTHORITY

---

## 1. Threat Model & Security Axiom

External capability connectors require sensitive authentication tokens (OAuth2 access/refresh tokens, API keys, client secrets). If exposed to reasoning models, frontend bundles, or unredacted audit trails, these credentials present severe operational and privacy vulnerabilities.

### Absolute Security Invariants:
1. **ZERO CREDENTIALS IN PROMPTS**: Raw tokens, secrets, and refresh credentials are NEVER injected into LLM prompt templates, context windows, or completion histories.
2. **ZERO CREDENTIALS IN PUBLIC APIS / PROJECTIONS**: Server REST endpoints (`/api/v1/connectors`, `/api/v1/state`, `/api/v1/calendar/*`) and SSE telemetry streams NEVER emit raw tokens.
3. **ZERO CREDENTIALS IN SQLITE / DURABLE LOGS**: The SQLite connector store persists account metadata (`providerAccountId`, `displayLabel`, `grantedScopes`), but NEVER plain-text tokens or secret keys.
4. **OPAQUE CREDENTIAL HANDLES**: The connector runtime references credentials exclusively through ephemeral cryptographic handles (`CredentialHandle`).
5. **READ != WRITE**: Autonomous execution is strictly confined to read-only capabilities. Write mutations demand cryptographic sovereign approval tokens.

---

## 2. In-Memory Vault & Credential Broker

```
 [ Operator Provisioning ]
           |
           | POST /api/v1/connectors/:id/accounts
           | (Over TLS / Localhost Loopback)
           v
 +---------------------------------------------------------------+
 |                       CredentialBroker                        |
 |                                                               |
 |  +---------------------------------------------------------+  |
 |  | Secure Memory Map: Map<accountId, StoredCredentials>   |  |
 |  |  - accessToken                                          |  |
 |  |  - refreshToken                                         |  |
 |  |  - clientSecret                                         |  |
 |  |  - expiresAt                                            |  |
 |  +---------------------------------------------------------+  |
 |                                                               |
 |   Methods:                                                    |
 |    - storeCredentials(accountId, creds): CredentialHandle     |
 |    - resolveCredentials(handle | accountId): ResolvedCreds    |
 |    - refreshCredentials(accountId): ResolvedCreds             |
 |    - revokeCredentials(accountId): void                       |
 +---------------------------------------------------------------+
           |
           | Opaque CredentialHandle (accountId + provider + fingerprint)
           v
 +---------------------------------------------------------------+
 |                     ConnectorRegistry                         |
 |  (Enforces authority, logs sanitized metrics, runs adapter)   |
 +---------------------------------------------------------------+
```

### 2.1 Credential Handle Structure
```typescript
export interface CredentialHandle {
  readonly accountId: string
  readonly provider: 'google-calendar' | 'mock-calendar' | 'custom'
  readonly scopes: readonly string[]
  readonly fingerprint: string // SHA-256 hash of token material (safe for verification)
}
```

### 2.2 Skew-Aware Token Refresh
- Expiration check occurs prior to any capability dispatch.
- If `Date.now() >= expiresAt - (5 * 60 * 1000)` (5-minute buffer), `CredentialBroker` automatically initiates token refreshment via the adapter's registered refresh handler.
- If refresh fails or no refresh token exists, the handle is marked invalid, and execution fails immediately with `UNAUTHORIZED`.

---

## 3. Redaction Engine & Sanitization Matrix

The kernel applies defensive string filtering across all operational traces:

```typescript
export function sanitizeLogString(str: string): string {
  return str
    .replace(/ya29\.[a-zA-Z0-9_\-]+/g, '[REDACTED_ACCESS_TOKEN]')
    .replace(/1\/[a-zA-Z0-9_\-]+/g, '[REDACTED_REFRESH_TOKEN]')
    .replace(/(client_secret|secret|password|access_token|refreshToken)=[^&\s]+/gi, '$1=[REDACTED]')
}
```

| Ingestion Point | Storage Mechanism | Public Exposure | Sanitization Applied |
| :--- | :--- | :--- | :--- |
| **Account Creation** | In-Memory Vault | Account ID, Scopes only | Passwords/keys stripped before SQLite write. |
| **Adapter Requests** | Native Fetch | TLS Request Header only | Outgoing tokens never logged in plain text. |
| **Audit Log Store** | SQLite DB (`connector_audit_log`) | Sanitized summaries only | Regex token redaction on inputs/outputs. |
| **UI Telemetry** | React State (`ConnectorsView`) | Account metadata only | Zero credentials loaded or accessible. |
| **Agent Action** | `JobRunner` (`CONNECTOR_READ`) | Status & error summaries | Agent context receives sanitized data payload. |

---

## 4. Verification Evidence & Proofs

Visual and programmatic proof of credential isolation is preserved in the test suite:
- **Test `connectors-api.test.ts`**: Verifies that `POST /api/v1/connectors/:id/accounts` and `GET /api/v1/connectors/:id/accounts` never return access tokens or secrets in HTTP response bodies.
- **Test `tests/connectors-calendar.spec.ts` (04-audit-trail-drawer.png)**: Asserts that the audit trail drawer UI contains zero tokens or secrets.
- **Unit test suite (`packages/orchestrator/src/connectors/connectors.test.ts`)**: Proves that invalid credentials fail-closed and token revocation purges memory.
