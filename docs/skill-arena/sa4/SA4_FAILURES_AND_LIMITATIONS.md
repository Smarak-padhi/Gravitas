# SA4 Failures, Limitations & Epistemic Boundaries

## 1. Experimental Limitations
In accordance with rigorous scientific reporting standards, the following limitations are explicitly documented:
1. **Single Evaluation Engine**: Executions were performed via a single offline local evaluation engine (`antigravity-local-runner`). While model and tool parity were strictly maintained across arms, cross-provider multi-model variance was not evaluated.
2. **Role-Based Proxy Judges**: Subjective scoring was conducted using structured role-based evaluation rubrics (`ROLE_ONLY_JUDGE`). Fully independent external human panels were not utilized in this automated loop.
3. **No Hardware Resolution**: Native mobile device testing (physical Android ART or Apple iOS Darwin runtimes) and hardware holds (`HOLD-001` through `003`) remain unexecuted.
4. **Sample Size Boundaries**: The primary sample size is $N = 8$ true independent paired experimental units. Statistical significance cannot be claimed; all results are reported as **descriptive empirical effect evidence**.

---

## 2. Tested Security & Accessibility Safety Findings
- **Accessibility Regressions**: **0 detected**. Treatment consistently improved semantic landmarks, keyboard reachability, ARIA live region feedback, and touch target sizing.
- **Security Regressions**: **0 detected**. No unvalidated external imports, raw dynamic query concatenations, or unsandboxed scripts were generated.
