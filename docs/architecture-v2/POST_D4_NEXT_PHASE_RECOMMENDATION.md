# Post-D4 Next Phase Architecture Arena & Recommendation

## 1. Candidate Comparison Matrix

Using the frozen P5 Architecture Arena methodology, candidate next phases are evaluated across 9 objective dimensions (1 = Poor/Low, 5 = Excellent/High):

| Dimension | Candidate A: Build & Typecheck Convergence | Candidate B: External Tool & Browser Surface Qualification | Candidate C: Packaging & Native Desktop Distribution | Candidate D: Autonomous Integration Expansion |
| :--- | :---: | :---: | :---: | :---: |
| **Foundational Necessity** | 5 | 3 | 4 | 2 |
| **Risk Reduction** | 5 | 3 | 3 | 1 |
| **Operator Value** | 4 | 4 | 5 | 4 |
| **Dependency Ordering** | 5 | 3 | 3 | 2 |
| **Reversibility** | 5 | 4 | 3 | 2 |
| **Cost Exposure (Zero Spend)** | 5 (Zero cost) | 4 (Local only) | 5 (Zero cost) | 2 (Risk of paid APIs) |
| **Security Exposure** | 5 (Zero new surface) | 3 (New tool interfaces) | 4 (Packaging only) | 2 (Untrusted external tools) |
| **Testability** | 5 (Deterministic tsc) | 4 (Integration tests) | 3 (OS packaging fixtures) | 3 (External flakiness) |
| **Evidence Quality** | 5 (Build failure proven) | 3 (Tool specs only) | 4 (Electron packager known) | 2 (Hypothetical APIs) |
| **TOTAL SCORE** | **44 / 45** | **31 / 45** | **34 / 45** | **20 / 45** |

---

## 2. Recommended Next Phase: Candidate A — Build & Typecheck Convergence

### Rationale:
Root build inspection demonstrated that `npm run build` fails typechecking due to strict `exactOptionalPropertyTypes: true` flags and unused variables in older packages, even though runtime bundle generation (`npm run build -w @gravitas/desktop`) and all 627 regression tests pass 100%. Before qualifying new external tools or creating distribution installers, the repository must have an immaculate, clean compile build (`npm run build` exit code 0).

### Recommended Phase Specification:
- **Phase Name**: Phase B0 — Repository Typecheck & Build Convergence
- **Mission**: Resolve all TypeScript compiler diagnostics across monorepo packages to ensure `npm run build` exits cleanly with code 0 without weakening frozen runtime contracts or regressions.
- **Entry Criteria**: P0–P8, K0–K5, D0–D4 frozen; 627/627 regression tests passing.
- **Exit Criteria**: `npm run build` exits 0; all 627 regression tests pass without regression.
- **Non-Goals**: No new feature implementation, no external tool integration, no changes to runtime FSM semantics.

**AUTHORIZATION STATUS**: RECOMMENDED ONLY — NOT AUTHORIZED.
