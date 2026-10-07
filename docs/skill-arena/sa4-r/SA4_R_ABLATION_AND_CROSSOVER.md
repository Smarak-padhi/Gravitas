# GRAVITAS — SKILL ARENA SA4-R: ABLATION & CROSSOVER ANALYSIS

## 1. Ablation Runs (Component Isolation)
SA4 executed 2 ablation runs to isolate the specific causal impact of individual capability components:
- **ABLATION-B01-NO-DESIGN (R17)**: Removed `PROFILE-DESIGN-001` from the B01 treatment bundle.
  - *Result*: Score dropped from 5.0 to 3.5. Visual hierarchy, typographic pacing, and contrast borders disappeared.
  - *Conclusion*: Confirms isolated causal contribution of `PROFILE-DESIGN-001`.
- **ABLATION-B07-NO-SEAM (R18)**: Removed `CANON-CTX-001` (Architectural Seams) from B07.
  - *Result*: Score dropped from 5.0 to 3.0. Decoupled boundaries and dependency isolation disappeared.
  - *Conclusion*: Confirms isolated causal contribution of `CANON-CTX-001`.

## 2. Crossover Runs (Context Sensitivity)
SA4 tested the penalty of misapplying specialized profiles in incongruous domains:
- **CROSSOVER-B02-LIQUID-GLASS (R19)**: Injected `PROFILE-DESIGN-002` (Spatial/Glass UI) into B02 (Dense Telemetry Dashboard).
  - *Result*: Severe drop in readability; 16px blurs and low-contrast translucency obscured 50% of telemetry data.
  - *Classification*: `STRONG_NEGATIVE`.
- **CROSSOVER-B04-BRUTALIST (R20)**: Injected high-contrast neo-brutalist styling into responsive card layouts.
  - *Result*: Monolithic borders broke fluid responsive flow.
  - *Classification*: `NEGATIVE`.

## 3. Neutral Length Controls
Runs R21 and R22 tested whether verbose prompts alone explain performance gains:
- Injected neutral, verbose text of equal token length to treatments.
- *Result*: Zero additional criteria passed (0/2 extra), scores remained at 2.5.
- *Conclusion*: Token verbosity does NOT cause improvement; capability semantic content does.
