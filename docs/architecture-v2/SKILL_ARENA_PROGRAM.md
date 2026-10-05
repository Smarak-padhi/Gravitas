# GRAVITAS — POST-B0 DEFERRED PROGRAM SPECIFICATION
# SKILL ARENA: HISTORICAL CAPABILITY CURATION & FUTURE-PROJECT TOOLBOX
## Subsystem Specification & Program Architecture

**Document ID**: `DOC-SA-001`  
**Classification**: `POST-B0-DEFERRED-DESIGN`  
**Status**: `DEFERRED_CANDIDATE`  
**Value**: `HIGH`  
**Implementation Authorization**: `NO`  
**Created**: `2026-10-05T08:20:00+05:30`  
**Author**: Gravitas Architecture Team (Autonomous Planning Loop)  
**Governing Baseline**: Phase B0 Freeze Gate (`docs/architecture-v2/B0_OBJECTIVE_LEDGER.md`)

---

## 1. Executive Mission & Purpose

The **Skill Arena** is a future, deferred subsystem of GRAVITAS designed to formally audit, evaluate, reconcile, and synthesize the total sum of capabilities, design knowledge, workflows, design references, component sources, agent instructions, MCP/tool techniques, and reusable engineering practices accumulated across all historical and active projects of the user.

Its mission is defined by a single governing directive:
> *"Given everything we have learned and used across previous projects, determine the smallest, strongest, non-conflicting capability set worth carrying into future web, design, and software projects."*

Skill Arena is **NOT** a skill installer, package manager, or blind aggregator. It is an empirical curation, evaluation, and synthesis system built to answer:
1. Which capabilities from our historical work are genuinely worth keeping?
2. Which capabilities are semantic duplicates of existing knowledge?
3. Which capabilities are inferior variations of stronger, existing rules?
4. Which capabilities conflict with one another, and which conflicts are genuine incompatibilities versus context-specific alternatives?
5. Which capabilities are outdated due to platform or runtime evolution?
6. Which capabilities are too framework-, provider-, or tool-specific to live in global memory?
7. Which capabilities are useful strictly as passive references rather than active rules?
8. Which capabilities require empirical testing before any trust is granted?
9. Which capabilities deserve to become permanent GRAVITAS canonical knowledge?

---

## 2. Program Order & Invariant Priority

Skill Arena is governed by the following strict execution hierarchy:

```
[Phase B0: Typecheck & Build Convergence] (STATUS: COMPLETE / FREEZE GATE READY)
                         │
                         ▼
        [Reviewed Repository Baseline Freeze]
                         │
                         ▼
   [Sovereign Human Operator Phase Authorization]
                         │
                         ▼
     [Candidate Future Waves: SA0...SA7] (STATUS: DEFERRED_CANDIDATE — NOT AUTHORIZED)
```

### Invariant Program Status:
- `STATUS`: **`DEFERRED_CANDIDATE`**
- `VALUE`: **`HIGH`**
- `IMPLEMENTATION_AUTHORIZATION`: **`NO`**
- `B0_RUNTIME_CHANGED`: **`NO`**
- `FROZEN_PKD_RUNTIME_CHANGED`: **`NO`**

This specification serves to permanently preserve the complete architectural blueprint and historical inventory so that no capability or design lesson is lost, while strictly forbidding any runtime execution, test suite modification, dependency alteration, or package manifest mutation during the frozen B0 wave.

---

## 3. Fundamental Architecture Invariants

The Skill Arena is anchored on 17 absolute invariants that cannot be bypassed by any agent, model, or consensus:

1. `SOURCE_SKILL != CANONICAL_SKILL`: The raw text of an external skill file is not canonical knowledge.
2. `SOURCE_REPOSITORY != TRUSTED_CAPABILITY`: The presence of a capability in a well-known repository does not guarantee its correctness, safety, or utility.
3. `RAW_RULE != APPROVED_RULE`: Ingested instructions remain unapproved candidates until formally validated and approved.
4. `DESIGN_REFERENCE != GLOBAL_INSTRUCTION`: A visual or architectural reference is passive inspiration, not an unvarying mandate.
5. `TEXT_SIMILARITY != SEMANTIC_DUPLICATION`: Two rules sharing similar phrasing may govern orthogonal technical concerns.
6. `TEXT_DIFFERENCE != SEMANTIC_CONFLICT`: Phrasing differences often express identical underlying engineering constraints.
7. `CONFLICT != ONE_RULE_MUST_BE_REJECTED`: True conflicts frequently reveal distinct operational contexts requiring contextual profiles.
8. `ARENA_WINNER != AUTOMATIC_INSTALLATION`: An evaluation victory produces a recommendation packet, never an unmediated installation.
9. `ARENA_CONSENSUS != HUMAN_APPROVAL`: Multi-agent agreement cannot supersede the sovereign human gate.
10. `HIGH_SCORE != UNIVERSAL_APPLICABILITY`: A skill excelling in a creative portfolio benchmark may fail disastrously in high-density SaaS operations.
11. `MODEL_OPINION != EMPIRICAL_EVIDENCE`: An LLM stating that a rule is effective is not evidence; verifiable runtime execution is evidence.
12. `POPULARITY != QUALITY`: GitHub stars and community adoption do not establish technical fitness or architectural alignment.
13. `README_CLAIM != VERIFIED_CAPABILITY`: Unverified documentation assertions are treated as unsubstantiated claims until tested.
14. `REFERENCE_INSPIRATION != IMPLEMENTATION_DEPENDENCY`: Adopting a visual layout principle must never introduce an unneeded runtime library.
15. `SKILL != TOOL != HARNESS != MODEL != PROVIDER != PROCESS`: The fundamental separation of roles, tools, and execution surfaces is strictly preserved.
16. `UNKNOWN_COST = BLOCKED`: Any capability, model evaluation, or benchmark with unknown or unbounded cost is immediately blocked.
17. `SOVEREIGN_HUMAN_GATE = FINAL`: The human operator retains sole authority over canonical adoption, profile activation, and execution spend.

---

## 4. Kernel Reuse Architecture (K0–K5 Mapping)

Skill Arena does **NOT** introduce a new orchestration kernel or bespoke execution engine. It directly reuses and specializes the battle-tested GRAVITAS K-Series architecture:

```
                            GRAVITAS K-KERNEL
                                    │
    ┌───────────────────────────────┴───────────────────────────────┐
    ▼                                                               ▼
K0: SQLite State & Event Ledger                             K1: Surface Qualification & Cost Gate
(Durable jobs, atomic run state,                            (Harness adapters, zero-spend enforcement,
 cryptographically hashed artifacts)                         process execution boundaries)
    │                                                               │
    ▼                                                               ▼
K2: Multi-Agent Orchestration                               K3: CapabilityGrants & Tool Authority
(Controlled supervisor-worker trees,                        (Least-privilege tokens, read-only boundaries,
 isolated agent contexts, bounded turns)                    credential defusal)
    │                                                               │
    └───────────────────────────────┬───────────────────────────────┘
                                    ▼
                         K4: ARENA FRAMEWORK CORE
                                    │
            ┌───────────────────────┴───────────────────────┐
            ▼                                               ▼
  Architecture Arena                              Skill Arena
  (System topology, DB decisions,                 (Capability curation, atomic rule extraction,
   packaging, framework tradeoffs)                 conflict resolution, empirical benchmarking)
                                    │
                                    ▼
                         K5: INDEPENDENT VERIFIER
                         (Automated test runs, Playwright DOM/accessibility audit,
                          deterministic diff verification, zero-leak validation)
                                    │
                                    ▼
                         SOVEREIGN HUMAN GATE
                         (Final canonical promotion, profile approval,
                          and repository adoption)
```

### Specific Subsystem Mappings:
- **K0 (Kernel Persistence)**: Stores `RuleCandidate`, `ConflictRecord`, `ArenaTrial`, and `CanonicalRule` entities in the SQLite database via durable job operations (`CREATE_DURABLE_JOB`). No direct ad-hoc file writes without transaction journaling.
- **K1 (Surface Qualification)**: Dispatches evaluation tasks only to qualified, zero-spend execution surfaces. Enforces strict zero-cost boundaries (`AUTONOMOUS_INCREMENTAL_SPEND = 0`).
- **K2 (Agent Orchestration)**: Runs independent scout agents, critics, and synthesizers in bounded, isolated worktrees with dedicated context budgets.
- **K3 (Tool Authority)**: Guarantees that external skills being evaluated are treated strictly as read-only data inputs. Evaluators receive read-only CapabilityGrants; network and arbitrary code execution are denied by default.
- **K4 (Arena Engine)**: Reuses the claim-relative evidential fitness scoring, contradiction detection, and adversarial review machinery developed for the Architecture Arena.
- **K5 (Independent Verification)**: Independently verifies benchmark claims using automated browser fixtures (Playwright), accessibility audits (Axe-core), performance tracing, and static TypeScript analysis.

---

## 5. Scope & Candidate Taxonomy

The Skill Arena encompasses twelve distinct candidate source types:

| Candidate Source Type | Description | Historical Examples |
| :--- | :--- | :--- |
| `SKILL` | Structured agent instruction documents (`SKILL.md`) with trigger metadata and procedural rules. | Android/iOS skills, GSD skills, Vercel agent skills. |
| `RULESET` | Granular coding or architecture rulesets (`rules/*.md`, Cursor rules, Copilot instructions). | Ponytail rules, prompt engineering rules. |
| `WORKFLOW` | Multi-step agent execution workflows and orchestration scripts. | Sync-skills, image-to-code workflows, Stitch flows. |
| `DESIGN_REFERENCE` | Visual, spatial, and editorial specifications extracted from previous project deliverables. | `hospitality-aama` Three.js docs, `ember-and-root` UX brief. |
| `DESIGN_SYSTEM` | Formal token hierarchies, component states, and typographic systems. | 3-tier token model, hairline architectural borders. |
| `COMPONENT_LIBRARY` | Curated collections of reusable component implementations. | shadcn/ui, Radix Primitives, 21st.dev snippets. |
| `MOTION_LIBRARY` | Motion contracts, animation curves, and physics specifications. | High-mass bezier curves, reduced-motion collapses. |
| `CODE_LIBRARY` | Specialized runtime libraries, math utilities, or algorithm packages. | Three.js, Anime.js, Lucide icons. |
| `MCP_TOOL` | Model Context Protocol servers exposing tool capabilities to agents. | Playwright MCP, Chrome DevTools MCP, Filesystem MCP. |
| `AGENT_TOOL` | Custom CLI or script tools invoked directly by agents during execution. | GSD CLI, Ponytail audit CLI, Sherlock probes. |
| `RESEARCH_SOURCE` | Structured domain research, competitive analyses, and RFC digests. | SIH2026 candidate matrix, MCP research papers. |
| `PROJECT_SPECIFIC_KNOWLEDGE` | Domain models and business rules specific to a single product that must not leak globally. | Travel itineraries (`o-travelz`), fantasy economy (`ember-and-root`). |

---

## 6. Target Output System

The eventual execution of Skill Arena produces thirteen authoritative artifacts:

1. **`CANONICAL_CORE`**: The universally applicable, non-conflicting rules that govern all software engineering in GRAVITAS (e.g., WCAG accessibility, strict typing, responsive stability, reduced motion).
2. **`CONTEXTUAL_MODULES`**: Specialized engineering modules loaded only when specific technology stacks are active (e.g., React, Next.js, Android Compose, iOS SwiftUI).
3. **`DESIGN_PROFILES`**: Cohesive aesthetic grammars loaded selectively per project type (e.g., `PREMIUM_EDITORIAL`, `TECHNICAL_OPERATIONAL`, `SPATIAL_TECHNICAL`).
4. **`REFERENCE_LIBRARY`**: Passive visual, spatial, and material reference catalogs with zero active instruction weight.
5. **`SPECIALIST_CAPABILITIES`**: Deep domain capabilities activated on explicit user request (e.g., advanced SEO, security hardening, database migration forensics).
6. **`REJECTED_CAPABILITIES`**: Formally audited candidates rejected due to architectural bloat, poor evidence, unsafe directives, or severe maintenance drag.
7. **`SUPERSEDED_CAPABILITIES`**: Outdated or weaker capabilities replaced by modern canonical counterparts.
8. **`CONFLICT_REGISTER`**: Detailed ledger of identified conflicts, distinguishing genuine technical incompatibilities from contextual alternatives.
9. **`PROVENANCE_GRAPH`**: Complete cryptographic graph tracing every canonical rule back to its original source repositories and authors.
10. **`BENCHMARK_RESULTS`**: Empirical performance, accessibility, and visual quality scores from blind execution trials.
11. **`MODEL_COMPARISON_RESULTS`**: Evidential comparison of different LLM architectures and evaluators across decision dimensions.
12. **`HUMAN_DECISION_LEDGER`**: Formal audit trail of every human gate approval, override, and disposition decision.
13. **`DYNAMIC_SKILL_RESOLVER`**: The runtime routing engine that computes the minimal, context-optimal prompt package for any given project brief.

---

## 7. Deferred Execution Guardrails

To prevent any premature execution or drift from current repository priorities:

- **NO RUNTIME IMPLEMENTATION**: No code shall be written in `packages/core/src/kernel/`, `packages/orchestrator/src/k4/`, or elsewhere under this program until formally authorized by the human operator.
- **NO DEPENDENCY INSTALLATION**: No `npm install`, `cargo add`, or Python environment creation for Skill Arena.
- **NO EXTERNAL DOWNLOADS**: No downloading of untrusted skill bundles, ZIP archives, or compiled binaries.
- **NO SPEND DISPATCH**: Zero API calls against paid LLM endpoints or cloud infrastructure.
- **PRESERVATION OF B0**: The Phase B0 convergence work remains 100% frozen and clean.
