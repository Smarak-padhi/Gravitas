# GRAVITAS V1-A — LEGACY SURFACE REACHABILITY & QUARANTINE AUDIT

**SURFACES AUDITED:** `apps/server`, `apps/web`  
**CANONICAL REPLACEMENT:** `apps/desktop`  
**STATUS:** AUDITED & QUARANTINED  

---

## 1. Physical Reachability Analysis

A comprehensive scan across all production packages (`packages/*`) and the canonical desktop client (`apps/desktop`) was conducted to evaluate dependencies on `apps/server` and `apps/web`:

1. **Imports:**
   - Zero files in `packages/core`, `packages/harnesses`, `packages/orchestrator`, `packages/verifier`, `packages/gateways`, `packages/git`, `packages/prompts`, or `packages/agents` import from `apps/server` or `apps/web`.
   - Zero files in `apps/desktop` import from `apps/server` or `apps/web`.

2. **Package Manifest Dependencies:**
   - `apps/desktop/package.json` depends only on `@gravitas/core`, `@gravitas/harnesses`, `@gravitas/orchestrator`, and `three`.
   - No workspace package declares `@gravitas/server` or `@gravitas/web` as a dependency.

3. **State Authority Contradiction:**
   - `apps/server` boots an `InMemoryRegistry` (`new InMemoryRegistry()`) and exposes Fastify HTTP endpoints. It completely bypasses `WorkSessionKernel`, SQLite durability, and single-writer file locking.
   - `apps/desktop` launches `WorkSessionKernel` in an isolated Electron `utilityProcess` with `DataRootLock` and SQLite transactions.
   - Allowing `apps/server` to serve as a runtime control plane creates an intolerable split-brain architecture where in-memory state contradicts canonical disk state.

---

## 2. Disposition: Quarantined Non-Canonical

Because historical Playwright end-to-end tests (`tests/*.spec.ts`) reference `apps/web` fixtures:
- `apps/server` and `apps/web` are classified as **`LEGACY_QUARANTINED`**.
- They are formally excluded from canonical V1 execution.
- Invariants verified in `apps/desktop/src/legacy-quarantine.test.ts` prove that the canonical V1 desktop application cannot accidentally instantiate or communicate with `InMemoryRegistry`.
