# GRAVITAS K3 — CAPABILITY GRANT CONTRACT
## Wave K3 Final Hardening: Schema, Durability & Anti-Replay Contract

**Wave**: K3 — Tool Registry + CapabilityGrants Runtime  
**Status**: APPROVED CONTRACT & EMPIRICALLY VERIFIED  
**Date**: 2026-10-02  

---

## 1. Schema Contract

```typescript
export interface CapabilityGrant {
  readonly grantId: string
  readonly requestId: string
  readonly subjectId: string
  readonly workSessionId: string
  readonly runId: string
  readonly taskId: string
  readonly grantedCapabilities: readonly string[]
  readonly authorizedToolIds: readonly string[]
  readonly resourceScope: ToolResourceScope
  readonly authorityCeiling: AuthorityClass
  readonly costCeiling: CostClass
  readonly issuedBy: string
  readonly issuedAt: string
  readonly expiresAt: string
  readonly status: 'ACTIVE' | 'REVOKED' | 'EXPIRED'
  readonly humanApprovalReference?: string | undefined
  readonly credentialReferences?: readonly string[] | undefined
}
```

---

## 2. Invariants & Guarantees

1. **Canonical Storage Lookup Over Caller Objects**: Authorization resolves authority from canonical storage (`CapabilityGrantEngine` store), rendering caller-side mutations completely ineffective.
2. **Deep Immutability**: All returned grant objects are frozen (`Object.freeze`) as defense-in-depth.
3. **Canonical Durability**: Grants and revocations are persisted through K0 command `CREATE_DURABLE_JOB` (`jobType: 'CAPABILITY_GRANT'` / `'GRANT_REVOCATION'`) and survive complete process crashes and restarts.
4. **Deterministic Expiry Across Restarts**: Grants carry bounded expiration timestamps. Process restarts never reset or extend grant lifetimes.
5. **Instant Revocation Across Restarts**: Revocation permanently takes effect at dispatch time, surviving process reboot without resurrecting revoked authority.
6. **Subject Anti-Replay**: Grants cannot be replayed across different workers (`SUBJECT_MISMATCH`).
7. **Scope Anti-Replay**: Grants cannot be transferred across tasks or sessions (`TASK_SCOPE_MISMATCH`).
8. **Resource Scope & Path Traversal Containment**: Directory paths are strictly validated with boundary containment, blocking `..`, UNC paths, drive-relative escapes, null bytes, URL encodings, and prefix collisions.
