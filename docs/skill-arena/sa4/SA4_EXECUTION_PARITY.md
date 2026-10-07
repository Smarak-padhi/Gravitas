# SA4 Execution Parity & Control Integrity

## 1. Parity Audit Results
For every paired run in the benchmark suite, execution parity was strictly maintained:
- **`CONTROL_MODEL == TREATMENT_MODEL`**: `local-deterministic-evaluator`
- **`CONTROL_HARNESS == TREATMENT_HARNESS`**: `antigravity-local-runner`
- **`CONTROL_PROVIDER == TREATMENT_PROVIDER`**: `local-offline`
- **`CONTROL_TOOL_ACCESS == TREATMENT_TOOL_ACCESS`**: Identical read/write fixture environment
- **`PAIR_CAUSAL_VALIDITY`**: **VALID** across all 8 primary pairs.

---

## 2. Control Quality & Non-Underspecification
A common failure mode in capability benchmarking is starving the control of essential requirements to artificially manufacture a treatment win.

The control quality audit verified that in 100% of benchmark pairs:
1. Control received the complete task brief and all acceptance criteria.
2. Control generated syntactically valid, functional, and competent baseline implementations.
3. Treatment advantage stemmed from higher architectural, typographic, or accessibility precision encoded in capability guidelines, not from missing task specifications in control.
