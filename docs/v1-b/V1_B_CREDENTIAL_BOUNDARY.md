# GRAVITAS — Wave V1-B Credential Boundary & Isolation Specification

### 1. Invariant: `CREDENTIAL_REFERENCE != CREDENTIAL_VALUE`
In Gravitas, raw API keys, bearer tokens, and secrets are strictly isolated from the rest of the system:
1. **Opaque References:** Tasks, plans, events, logs, database entities, and desktop UI projections handle only opaque references formatted as `vault:cred:<providerId>` (e.g. `vault:cred:nvidia-nim`).
2. **Volatile Memory Vault:** The raw secret string resides exclusively within the `ModelCredentialBroker` memory vault (`Map<string, string>`). It is never written to disk, never stored in SQLite, and never serialized into JSON snapshots.
3. **Point-of-Use Resolution:** The raw secret is resolved strictly at the final network boundary immediately before creating the HTTP `Authorization` header.

---

### 2. Sentinel Redaction & Error Defense
To guarantee that accidental logging, debug traces, or upstream HTTP errors never leak sensitive tokens:
- `ModelCredentialBroker.redactSensitive(text)` runs on all external error messages and network responses.
- Regex rules sanitize:
  - `Bearer [token]` $\rightarrow$ `Bearer [REDACTED]`
  - `nvapi-[token]` $\rightarrow$ `[REDACTED_NVIDIA_KEY]`
  - `"apiKey": "..."` $\rightarrow$ `"apiKey": "[REDACTED]"`
  - Direct exact matching against all currently registered secrets in the broker vault.

---

### 3. Desktop Surface Non-Exposure Proof
In `apps/desktop/src/kernel-host/kernelHost.ts`, `generateSystemProjection()` exposes only:
```typescript
modelIntelligenceSummary: {
  providerStatus: (hasKey) ? 'AVAILABLE' : 'AUTH_REQUIRED',
  qualifiedModelsCount: 3,
  qualifiedModelIds: ['...'],
  defaultModel: 'meta/llama-3.1-8b-instruct',
  costPolicy: 'STRICT_ZERO_DOLLAR_FREE',
  outOfPocketUsd: 0,
  paidFallbackPermitted: false
}
```
Automated unit tests (`apps/desktop/src/desktop-v1b-offline.test.ts`) assert that `JSON.stringify(projection)` contains zero occurrences of `nvapi-`, `Bearer `, or registered secret values.
