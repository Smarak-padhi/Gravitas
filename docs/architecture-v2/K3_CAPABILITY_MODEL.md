# GRAVITAS K3 — CAPABILITY MODEL

**Wave**: K3 — Tool Registry + CapabilityGrants Runtime  
**Status**: APPROVED CONTRACT  
**Date**: 2026-10-02  

---

## 1. Capability Taxonomy

Capabilities represent discrete, bounded operation types:
- `fixture.read`: Safe, deterministic read-only built-in fixture.
- `fixture.write`: Safe, deterministic local mutation within temporary scope.
- `process.execute.deterministic`: Deterministic host process execution mediated strictly through frozen K1 `powershell-local` adapter.
- `antigravity.authentication.repair`: Destructive credential maintenance operation (`HUMAN_ONLY_TOOL`).
- `gateway.unrestricted`: High-authority experimental gateway (`QUARANTINED`).

---

## 2. Invariant Distinctions

```text
ROLE != AUTHORITY
CAPABILITY != TOOL
CAPABILITY REQUEST != CAPABILITY GRANT
CREDENTIAL REFERENCE != CREDENTIAL VALUE
```

1. **Role $\neq$ Authority**: Being assigned `role:engineering:backend-engineer` does not grant ambient filesystem, process, or network authority.
2. **Capability $\neq$ Tool**: A capability declares an operation requirement; multiple qualified tools may satisfy it.
3. **Request $\neq$ Grant**: Asking for authority does not issue authority. The `CapabilityGrantEngine` evaluates least privilege, qualifications, cost, and human gates.
4. **Reference $\neq$ Value**: Grants hold opaque identifiers (e.g. `vault:ref:github-token`), never raw API keys or tokens.
