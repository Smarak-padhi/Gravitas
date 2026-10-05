# SA2-R Scope Lock & Operating Boundary

## 1. Authority & Baseline
- **Mission**: Forensic precision audit and reclassification of the conflict-like portion of the frozen Phase SA2 relationship graph (667 edges: 429 `TRUE_CONFLICT`, 238 `APPARENT_CONFLICT`).
- **Baseline Commit**: `7d65cae34beed6fc37940e2427c387d9b7d8ed31`
- **Branch**: `feat/v0-golden-loop`
- **Operating Mode**: `FORENSIC / PRECISION-AUDIT / RELATIONSHIP-RECLASSIFICATION / NON-CANONICAL / LOCAL-COMMIT-ONLY`

## 2. Inviolable Constraints & Guarantees
1. **Preserve Original SA2 Evidence**: `docs/skill-arena/sa2/` remains completely immutable. Historical commit `7d65cae` is never amended, rebased, or rewritten.
2. **Preserve SA1 Input Corpus**: All 708 `RuleCandidates` in `docs/skill-arena/sa1/rules.jsonl` remain bit-for-bit identical to the SA1 baseline.
3. **Zero Canonicalization**: SA2-R creates 0 canonical rules, promotes 0 winners, and ranks 0 skills.
4. **Zero Rule Deletions / Merges**: No rules are pruned, consolidated, or hidden.
5. **Zero Runtime / Test Mutations**: Files in `src/`, `desktop/`, `tests/`, and build configs remain untouched.
6. **Zero External / Paid Calls**: Evaluation runs deterministically on local data with 0 external network requests and 0 dependencies installed.
7. **Local Commit Only**: A single local commit is created. Remote push is strictly disabled.
8. **SA3 Prohibited**: Canonical synthesis remains strictly unstarted until sovereign human review and gate approval.
