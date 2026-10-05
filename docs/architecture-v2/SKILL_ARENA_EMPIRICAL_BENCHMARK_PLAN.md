# GRAVITAS — POST-B0 DEFERRED PROGRAM SPECIFICATION
# SKILL ARENA: HISTORICAL CAPABILITY CURATION & FUTURE-PROJECT TOOLBOX
## Empirical Benchmark Plan, Blind Review Protocol & Dynamic Context Resolution

**Document ID**: `DOC-SA-005`  
**Classification**: `POST-B0-DEFERRED-DESIGN`  
**Status**: `DEFERRED_CANDIDATE`  
**Value**: `HIGH`  
**Implementation Authorization**: `NO`  
**Created**: `2026-10-05T08:24:00+05:30`  
**Governing Baseline**: Phase B0 Freeze Gate (`docs/architecture-v2/B0_OBJECTIVE_LEDGER.md`)

---

## 1. Rationale: The Limits of Static Evaluation

Static prompt evaluation can verify that a rule is grammatically sound, logically non-contradictory, and security-safe. However, **static evaluation cannot prove that a design rule produces beautiful, accessible, performant software**.

An agent provided with 5,000 lines of CSS advice may still generate generic card grids with illegible contrast, jarring animations, and broken responsive layouts. Therefore, shortlisted capabilities must compete in a **Blind Empirical Benchmark Arena**, where competing candidate bundles generate concrete frontend code against standardized briefs under identical conditions.

> **Status Notice**: This plan is a formal architecture specification for future waves (SA4–SA5). **No benchmarks are being implemented or executed during the frozen B0 wave.**

---

## 2. Standardized Benchmark Classes

Eight representative benchmark challenges designed to test orthogonal engineering and aesthetic capabilities:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   STANDARDIZED BENCHMARK SUITE                         │
├───────────────────────────────────┬────────────────────────────────────┤
│ 1. Premium Hospitality Landing    │ 2. Dense SaaS Operations Console   │
│    (Editorial, luxury, calm)      │    (High-density, telemetry, mono) │
├───────────────────────────────────┼────────────────────────────────────┤
│ 3. Creative Interactive Portfolio │ 4. Consumer Mobile-First Web App   │
│    (WebGL 3D, physics, narrative) │    (Touch, thumb zone, responsive) │
├───────────────────────────────────┼────────────────────────────────────┤
│ 5. Hostile Frontend Redesign      │ 6. High-Fidelity Reference Transfer│
│    (Anti-generic salvage test)    │    (Screenshot-to-code accuracy)   │
├───────────────────────────────────┼────────────────────────────────────┤
│ 7. Accessibility Crucible         │ 8. Performance Budget Limit Run    │
│    (WCAG AAA, keyboard, VoiceOver)│    (60fps, 0-idle loop, <50KB JS)  │
└───────────────────────────────────┴────────────────────────────────────┘
```

### Benchmark Specification Details:
1. **Premium Hospitality Landing Page**:
   - *Target Domain*: High-end architectural retreat / fine dining (inspired by `hospitality-aama`).
   - *Tests*: Typographic elegance, spatial white space, mineral/material color harmony, non-generic hero composition, fluid responsive layout.
2. **Dense SaaS / Operations Console**:
   - *Target Domain*: Real-time multi-agent observability dashboard (inspired by `Multi-agent` and `o-travelz`).
   - *Tests*: Information density, hairline dividers, monospace telemetry alignment, table sorting without layout shift, status chip clarity.
3. **Creative Interactive Portfolio**:
   - *Target Domain*: Experimental interactive showcase (inspired by `Algoryxz` and Codrops).
   - *Tests*: WebGL Three.js canvas integration, zero-idle render loop, inertial physics curves, canvas degradation fallbacks.
4. **Consumer Mobile-First Web Product**:
   - *Target Domain*: Travel discovery and booking interface (inspired by `o-travelz`).
   - *Tests*: Mobile viewport fidelity (390x844), bottom navigation rails, touch targets (`>=44x44px`), zero horizontal overflow, fluid keyboard insets.
5. **Hostile Frontend Redesign**:
   - *Target Domain*: Refactoring a deliberately horrific, generic AI frontend (purple glowing cards, nested drop-shadows, bad contrast).
   - *Tests*: Aesthetic discipline, YAGNI code deletion, reduction of CSS bloat, transformation into dignified, usable UI.
6. **Reference-Image to Faithful Code**:
   - *Target Domain*: Recreating a curated high-end Figma/photo mock (inspired by `taste-skill` and image-to-code workflows).
   - *Tests*: Visual proportion fidelity, spacing accuracy, font matching, color extraction accuracy.
7. **Accessibility Crucible**:
   - *Target Domain*: Critical multi-step form with complex custom comboboxes, date pickers, and modal drawers.
   - *Tests*: 100% Axe-core passing, WCAG 2.1 AA contrast, complete keyboard tab ring with visible 2px focus, ARIA live regions, `prefers-reduced-motion` compliance.
8. **Performance Budget Limit Run**:
   - *Target Domain*: Data-intensive list with 1,000 items, animated state transitions, and canvas overlays.
   - *Tests*: 60fps frame rate during scroll/drag, Core Web Vitals (LCP < 1.2s, CLS = 0.00, INP < 100ms), bundle size under strict limits.

---

## 3. Blind Review Protocol

To prevent evaluation bias (e.g., an LLM favoring a rule because it mentions a famous repository or author), the evaluation enforces strict **double-blind isolation**:

```
                       BENCHMARK TASK EXECUTION
                                   │
               ┌───────────────────┴───────────────────┐
               ▼                                       ▼
     Trial Output Alpha                      Trial Output Beta
     (Candidate Set 1)                       (Candidate Set 2)
               │                                       │
               └───────────────────┬───────────────────┘
                                   ▼
                       PROVENANCE STRIPPING LAYER
                 (Stripped of author names, repo URLs,
                  skill IDs, model identifiers, tokens)
                                   │
                                   ▼
                        BLIND EVALUATION PANEL
                 (Evaluator Scouts see only Artifact A,
                  Artifact B, DOM tree, and Lighthouse traces)
                                   │
                                   ▼
                       MULTI-DIMENSIONAL SCORING
                                   │
                                   ▼
                     CRYPTOGRAPHIC PROVENANCE LINK
                 (Scored evidence reconciled with true IDs
                  inside K0 durable event ledger)
```

### Protocol Rules:
1. **Source Obfuscation**: Generated HTML/CSS/JS artifacts are stripped of all comments referencing skill names, prompt origins, or author metadata.
2. **Evaluator Blindness**: Evaluator agents receive identical inspection prompts with anonymized identifiers (`Artifact Alpha` vs `Artifact Beta`).
3. **Automated Evidence Grounding**: Human and LLM critics do not evaluate in a vacuum; they receive objective automated traces:
   - Playwright headless screenshots at 1440x900, 768x1024, and 390x844.
   - Axe-core accessibility violation JSON.
   - Chrome DevTools performance traces (LCP, CLS, long tasks).
   - DOM node count and CSS rule complexity metrics.
4. **Isolated Provenance Ledger**: The true mapping of `Trial ID -> Candidate Rule Bundle -> Execution Surface` is cryptographically hashed and sealed in K0 before the evaluation begins, preventing tampering.

---

## 4. Multi-Dimensional Evidence Vector

Output is never collapsed into an arbitrary single number (e.g., "Score: 87/100"). The Arena preserves an uncompressed **14-dimensional evidential vector**:

```typescript
export interface EmpiricalEvidenceVector {
  // Functional & Semantic Correctness
  briefAdherence: number;        // 1-5: Adherence to user requirements and constraints
  semanticCorrectness: number;   // 1-5: Clean HTML5 semantic tags, valid DOM nesting
  codeQuality: number;           // 1-5: TypeScript correctness, clean idioms, zero debt
  maintainability: number;       // 1-5: Readability, modularity, zero speculative bloat

  // Aesthetics & Visual Design
  visualHierarchy: number;       // 1-5: Clear focal points, intentional eye flow
  originality: number;           // 1-5: Dignified, distinctive character; anti-generic
  typographyFidelity: number;    // 1-5: Font scaling, line heights, typographic hierarchy
  spacingDiscipline: number;     // 1-5: Strict baseline adherence (4px/8px), zero drift

  // Interaction & Motion
  interactionQuality: number;    // 1-5: Micro-feedback feel, hover/press state precision
  motionQuality: number;         // 1-5: Inertial physics, timing budget compliance
  responsiveBehavior: number;    // 1-5: Seamless adaptation across breakpoints

  // Hard Engineering Gates (Objective Metrics)
  accessibilityScore: {
    axeViolationsCount: number;  // Must be 0 for critical/serious
    contrastCompliance: boolean; // WCAG AA text and UI contrast verified
    reducedMotionVerified: boolean; // Animations disable/collapse under media query
  };

  performanceMetrics: {
    cumulativeLayoutShift: number; // Must be < 0.05
    largestContentfulPaintMs: number;
    interactionToNextPaintMs: number;
    idleRenderHaltVerified: boolean; // Three.js / animation loop stops when idle
  };
}
```

---

## 5. Combination Arena & Marginal Capability Value

Evaluating skills in isolation is insufficient; in practice, skills are loaded in bundles. A skill that performs moderately well alone may introduce severe friction when combined with others, or may offer zero incremental benefit over the baseline.

The **Combination Arena** tests candidate bundles systematically:

```
[Trial 0: Canonical Base Core]
             │
             ├──► [Trial 1: Base Core + Motion Rule Candidate]
             │
             ├──► [Trial 2: Base Core + Visual Rule Candidate]
             │
             └──► [Trial 3: Base Core + Engineering Rule Candidate]
```

### Mathematical Definition of Marginal Capability Value:
For a candidate rule $R$ added to baseline context $B$ evaluated across dimension vector $V$:

$$\Delta V(R) = V(B \cup \{R\}) - V(B)$$

$$\text{TokenCost}(R) = \text{prompt tokens consumed by } R$$

$$\text{Marginal Capability Value } (\text{MCV}) = \frac{\sum w_i \cdot \Delta V_i(R)}{\text{TokenCost}(R)}$$

### Decision Rules:
1. If $\Delta V(R) \le 0$ across all dimensions: Rule $R$ is classified as `DUPLICATE_INFERIOR` or `REJECTED`. It consumes prompt budget while providing zero marginal improvement.
2. If $\Delta V(R) > 0$ on aesthetics but $\Delta V(R) < 0$ on performance: Rule $R$ cannot be global; it is routed to a specialized `OPTIONAL_PROFILE`.
3. If $\Delta V(R) > 0$ with high token efficiency: Rule $R$ is promoted to `CANONICAL_GLOBAL` candidate.

---

## 6. Context Cost Model & Prompt Economy

Prompt tokens are a finite, expensive resource that degrades attention and latency. Skill Arena treats context consumption as a primary cost metric:

| Metric | Measurement | Ideal Target |
| :--- | :--- | :--- |
| `rawInstructionSize` | Line count of ingested skill file | Reduced by $\ge 80\%$ via distillation |
| `tokenCost` | Tokens consumed in system prompt | $\le 250$ tokens per canonical rule |
| `uniqueRuleCount` | Distinct, non-overlapping constraints | Maximized |
| `duplicateRuleCount`| Redundant rules merged or removed | Target: 0 duplicates in canonical set |
| `marginalValue` | Measurable delta per token | $\ge 0.05$ score points per 100 tokens |

**Optimization Mandate**: The future GRAVITAS system prompt must deliver maximum capability with the minimum possible token footprint. Three crystal-clear, non-conflicting canonical rules are vastly superior to a 2,000-line skill document bloated with introductory prose and generic examples.

---

## 7. Project-Aware Dynamic Activation Pipeline

The ultimate goal of the Skill Arena is **NOT** a massive, static prompt containing dozens of rules. The goal is a **Dynamic Skill Resolver** that constructs the optimal, context-minimal capability package for any specific project:

```
                          PROJECT INITIATION
                                   │
                                   ▼
                             Project Brief
                       (e.g., "Build an editorial
                        luxury hotel booking site")
                                   │
                                   ▼
                    PROJECT CLASSIFIER (K2 Supervisor)
                    • Platform: Web (Next.js / React)
                    • Aesthetic Archetype: PREMIUM_EDITORIAL
                    • Motion Requirements: SCROLL_NARRATIVE
                    • Core Constraints: WCAG AA, Core Web Vitals
                                   │
                                   ▼
                      DYNAMIC CAPABILITY RESOLVER
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         ▼                         ▼                         ▼
   CANONICAL CORE          CONTEXTUAL MODULE        DESIGN PROFILE
   • A11y baseline         • React 19 idioms        • Serif typography
   • 4px/8px grid          • Next.js Server Actions • Editorial density
   • Reduced motion        • Radix headless UI      • Mineral palette
   • Zero-idle loop                                 • Hairline dividers
         │                         │                         │
         └─────────────────────────┼─────────────────────────┘
                                   │
                                   ▼
                     PASSIVE REFERENCE RETRIEVAL
                     • hospitality-aama spatial layout notes
                     • awesome-design-md editorial rules
                                   │
                                   ▼
                      COMPILED AGENT SYSTEM CONTEXT
                    (Minimal tokens, zero contradictions,
                     maximum domain alignment)
```
