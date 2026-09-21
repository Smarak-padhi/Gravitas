# GRAVITAS 3D HEADQUARTERS — CHARACTER & ENTITY SYSTEM
## Inhabitant Archetypes, Silhouettes & Phased Asset Strategy

> **AESTHETIC ARCHETYPE**: The Modern Architectural Miniature Inhabitant  
> **DESIGN ETHOS**: Serious, tactile, miniature architectural figures. Distinct recognizable silhouettes with workshop-tailored utility attire, high-grade matte materials, and clear tool-carrying identity.  
> **RESTRAINT PRINCIPLES**: Modern, tactile, architectural, quietly futuristic — NOT steampunk. Zero cartoon mascots, zero fake operator NPCs, zero arbitrary socializing.

---

## 1. Character Architecture & Inhabitant Roster

### 1.1 The Codex Worker (`worker-codex`)
- **Role**: High-precision engineering specialist, AST manipulations, syntax constraints, and Git operations.
- **Silhouette**: Lean, upright, focused architectural miniature figure.
- **Visual Identifier**:
  - Primary Accent: Sapphire Blue (`#2B59C3`).
  - Attire: Minimalist indigo utility jacket with precision caliper pocket.
  - Equipment: Modern digital drafting stylus and AST terminal monitor.
- **Dedicated Workstation**: Workstation 01 (Drafting desk, dual worktree display, code buffer plinth).
- **Authoritative Behavioral States**:
  - *IDLE*: Seated or standing quietly at workstation, reviewing technical specifications on terminal.
  - *WORKING*: Actively typing/navigating on drafting console strictly when a real worker process executes.
  - *TRANSIT*: Direct, purposeful linear walk strictly between Planning Table and assigned workstation.
  - *STANDBY / AUDIT*: Standing beside desk observing terminal test outputs.
  - *Zero Fake Wandering*: Never leaves station without a concrete navigation objective.

---

### 1.2 The FCC Worker (`worker-fcc` / `worker-claude`)
- **Role**: Deep architectural reasoning, multi-file invariants, full-stack implementation, and refactoring boundaries.
- **Silhouette**: Broader, contemplative, structured architectural figure.
- **Visual Identifier**:
  - Primary Accent: Warm Ochre / Terracotta (`#B45309`).
  - Attire: Structured charcoal-and-ochre workshop smock.
  - Equipment: High-density multi-file buffer terminal.
- **Dedicated Workstation**: Workstation 02 (Expanded walnut desk with dual display buffers).
- **Authoritative Behavioral States**:
  - *IDLE*: Quietly observing terminal buffers or standing at rest beside station.
  - *WORKING*: Rhythmic, focused console typing and architecture review during execution.
  - *TRANSIT*: Controlled linear walk between Planning Table and workstation.
  - *WAITING_DEPENDENCY*: Standing alert at desk while dependency tether remains locked.

---

### 1.3 The Independent Verifier (`gate-verifier`)
- **Role**: Deterministic gate authority, isolated worktree test execution, mutation scope enforcement, and cryptographic diff audit.
- **Representation**: **Restrained humanoid avatar** stationed inside the glass-enclosed Verification Lab.
- **Strict Behavioral Constraint**:
  - **Zero arbitrary coworker behavior**: Does not chat, pace, or wander.
  - **Entirely state-driven**: Poses derive strictly from verifier engine states (`IDLE`, `VERIFYING`, `PASS`, `FAIL`).
- **Visual Identifier**:
  - Primary Accent: Cleanroom Sage (`#3D7A68`).
  - Attire: Minimalist pale sage cleanroom coat with titanium collar clasp.
  - Apparatus: Cleanroom audit console, diff comparison monitor, and verification seal dock.
- **Authoritative Behavioral States**:
  - *IDLE*: Standing at rest behind the verification console, hands relaxed at sides.
  - *VERIFYING*: Leaning forward over the console monitoring live test runner execution.
  - *PASS*: Confirms verified audit docket; illuminates green cleanroom indicator.
  - *FAIL*: Stamps red failure marker on candidate docket; logs assertion failure.

---

### 1.4 Browser QA: The Device Matrix Station
- **Representation: Dedicated Hardware Station (Not a Humanoid)**:
  - Playwright browser QA is an automated runtime assertion suite. It is represented as a specialized **Device Matrix Wall**:
    - A vertical walnut mounting panel displaying three physical device viewports: Desktop (1920x1080), Tablet, and Mobile.
    - Active test steps illuminate the corresponding device screen with wireframe DOM validation highlights.
  - The Verifier observes the bench from the cleanroom observation line. Zero fake anthropomorphic "browser agents."

---

### 1.5 OmniRoute & Gateways: Strict Infrastructure Constraint
- **INVIOLABLE MANDATE**: OmniRoute and LLM providers (Anthropic, OpenAI, local Ollama) **ARE STRICTLY INFRASTRUCTURE**.
- Physically represented as **Dual 42U Server Cabinets** inside the acoustic Infrastructure Room:
  - Clean brushed-steel server racks.
  - Fiber-optic route bus and provider relay LEDs.
  - Token activity tachometer and latency readouts.
  - Never represented as characters or avatars.

---

### 1.6 The Human Operator (Removal of Fake Operator NPC)
- **CRITICAL ARCHITECTURAL DECISION**:
  - **The fake System Operator NPC is REMOVED**.
  - **The HUMAN USER is the operator**.
  - Approval Control on the Mezzanine represents the **user's physical control position** within the operations headquarters.
  - No synthetic character may pretend to perform human governance or approve candidate code mutations.
  - The Approval Plinth holds the candidate task folio under an illuminated spotlight, awaiting the real human operator's action via the docked 2D Task Inspector.

---

## 2. Phased Character Asset Strategy

To prioritize architecture and foundation over cosmetic assets:

```
[WAVES 12B – 12D: Foundation Phase]
  - Use clean, procedural / custom geometric prototype characters
  - Simple stylized geometric scale references (capsules, cylinders, faceted low-poly meshes)
  - Purpose: Prove camera framing, proportions, waypoint navigation, selection, and multi-agent density
  - Zero external character packs downloaded; zero licensing overhead

[POST-WAVE 12D: Production Asset Phase]
  - Deferred until camera, proportions, navigation, animation FSM, and selection are 100% proven
  - Evaluate custom stylized Blender GLB characters compressed via Draco / KTX2
  - Each character strictly budgeted under 850KB and 8,000 triangles
```

### Character Pipeline Rules:
1. **Waves 12B–12D**:
   - Prototype figures are authored in pure Three.js code as clean, proportioned geometric mannequins with distinct color accents (Codex: sapphire, FCC: ochre, Verifier: sage).
   - Serves as reliable spatial scale references without asset pipeline dependencies.
2. **Waves 12E+**:
   - Only when the complete Golden Loop and multi-worker handoffs are verified in code will bespoke rigged character meshes be evaluated and integrated.
