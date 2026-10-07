# SA4 Experiment Design & Methodology

## 1. Primary Causal Formulation
To answer the core question—*Do the proposed SA3 capability bundles improve real implementation outcomes?*—SA4 executes controlled paired experiments:
$$\Delta = \text{TREATMENT} - \text{CONTROL}$$

Where:
- **CONTROL**: Receives task brief, starting fixture, assets, runtime constraints, and full acceptance criteria, with **zero** SA3 capability guidance.
- **TREATMENT**: Receives identical task brief, starting fixture, assets, runtime constraints, and acceptance criteria, **plus** the designated frozen SA3 capability bundle.

---

## 2. Experimental Controls
1. **Model & Harness Parity**: Both arms execute on identical local deterministic evaluation engines (`antigravity-local-runner`).
2. **Competent Control Standard**: Control prompts contain full task acceptance criteria. Treatment is not allowed to win merely because control was starved of requirements.
3. **Double-Arm Blind Evaluation**: Output artifacts are anonymized (`OUTPUT-*-ALPHA` vs `OUTPUT-*-BETA`), stripping condition names, bundle IDs, and generation timestamps before subjective evaluation.
4. **Contextuality & Crossover Testing**: Treatments are tested both in their intended context and in deliberately mismatched contexts to demonstrate that capability benefits are context-dependent rather than universally superior.
5. **Ablation Testing**: Specific capability components are removed from full treatment bundles to isolate and confirm individual component contributions.
