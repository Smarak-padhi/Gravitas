# GRAVITAS K3 — CREDENTIAL AND SECRET BOUNDARY

**Wave**: K3 — Tool Registry + CapabilityGrants Runtime  
**Status**: APPROVED CONTRACT  
**Date**: 2026-10-02  

---

## 1. Architectural Invariant

$$\mathbf{CREDENTIAL\ REFERENCE \neq CREDENTIAL\ VALUE}$$

Raw credentials, secrets, tokens, API keys, and private keys MUST NEVER be stored in:
- `ToolDescriptor`
- `CapabilityRequest`
- `CapabilityGrant`
- `ToolRequest`
- `ToolResult`
- K0 `CommandReceipt` or `DurableEvent`
- Logging outputs or exception traces

---

## 2. Ephemeral In-Memory Injection

Grants store only opaque reference handles (e.g. `vault:ref:github-token-01`).
- The Credential Broker resolves references at the actual process spawn boundary.
- Child processes receive credentials strictly in-memory or via standard input streams.
- All emitted events and audit trails are scrubbed via sentinel pattern matchers (`sk-ant-`, `AKIA`, `ghp_`).
