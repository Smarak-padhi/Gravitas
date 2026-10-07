# SA4 Scope Lock & Experimental Boundary

## 1. Baseline & Authority
- **Repository**: `C:\Users\smara\Desktop\Multi-agent`
- **Working Branch**: `feat/v0-golden-loop`
- **Pre-SA4 Baseline Commit**: `c1133e0beb5c3fd3eacf264fcf52ed8fea604f50` (Phase SA3-R frozen baseline)
- **Phase**: **Skill Arena SA4 — Empirical Capability Benchmark Arena**
- **Mode**: EMPIRICAL / CONTROLLED / CONTEXT-AWARE / BLIND-WHERE-PRACTICAL / ZERO-PAID-COST / NON-REGISTRY / NON-INSTALLING / HUMAN-GATED / LOCAL-COMMIT-ONLY

---

## 2. Inviolable Governance Boundaries
1. **Zero External Skill Installation**: No historical source skills, packages, or registries installed into production.
2. **Zero Production Mutation**: Core packages (`packages/core/`, `packages/orchestrator/`), application wrappers (`apps/desktop/`), and production tests are untouched.
3. **No Automatic Resolver**: The automatic capability resolver (SA7) does NOT exist; manual deterministic bundle manifests are locked prior to generation.
4. **Zero Incremental Paid Cost**: All executions run locally offline at zero incremental financial cost (`ZERO_INCREMENTAL_COST`).
5. **No Push to Remote**: Operations remain strictly local.

---

## 3. Cryptographic Input Locks
All upstream artifacts across SA0, SA1, SA2, SA2-R, SA3, and SA3-R are cryptographically locked and verified identical against baseline hashes recorded in `pre-sa4-hashes.json`.
