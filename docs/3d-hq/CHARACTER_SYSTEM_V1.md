# GRAVITAS 3D HEADQUARTERS — CHARACTER SYSTEM V1 CONTRACT
## Reusable Grammar, Role Identities & Runtime Integration Specification

**Status**: Frozen Reference Contract (Wave 12F-C)  
**Accepted Reference Character**: Frontend Engineer (`role:engineering:frontend-engineer`) on Floor 2  
**Applicability**: Authoritative 3D Cutaway Tower and Campus Character Assets  

---

## 1. Visual Target & Core Aesthetic Definition

The visual target for all humanoid characters in Gravitas 3D Headquarters is:

> **PREMIUM STYLIZED MINIATURE HUMANOID**

Characters are rendered as bespoke architectural miniature figures inhabiting a precision modern atelier (1:6 miniature scale).

### What We Deliberately Support:
- **Stylized Proportions**: Natural adult miniature proportions (~6 heads tall, standing height ~1.46m).
- **Expressive Head Silhouettes**: Sculpted cranial mass, soft chin, defined jawline, and 3D nose bridge.
- **Authored Hair & Accessories**: Layered hair masses (e.g. swept bangs, sideburns, tapered nape) and physical accessories (e.g. wireframe spectacles, tablets, folios).
- **Rounded Clothing & Body Forms**: Tailored raglan knitwear/jackets with deltoid shoulder caps, organic continuous cloth elbow transitions, and folded rib-knit cuffs/hems.
- **Believable Seated & Standing Interaction**: Ergonomic alignment with task chairs, desks, consoles, and floor inlays.
- **Distinct Hands & Footwear**: Sculpted hands with anatomical palm, opposed thumb, and 4 curled fingers; minimalist cupsole sneakers with defined outsole, upper, and toe grounded directly on the floor.
- **Coherent Miniature Architectural Scale**: Perfect scale alignment with architectural furniture, peripherals, and room bounds.
- **Restrained Premium Materials**: Matte knitwear, tailored charcoal denim, warm cognac hair, champagne brass, and soft architectural skin tones.
- **Individual Role Personality**: Unique silhouette, attire, posture, and station interactions for each reasoning role.

### What We Explicitly Do NOT Pursue:
- ❌ **Photorealism / Grime**: Uncanny human faces, dirty photoreal textures, skin pores, or lifelike wrinkles.
- ❌ **Roblox / Toy Proportions**: Blocky heads, cylinder necks, floating disconnected limbs, or bobbleheads.
- ❌ **Generic Low-Poly Mannequins**: Faceless featureless polygons, featureless capsules, or cylinder dolls.
- ❌ **Capsule People**: Abstract peg figurines without arms, hands, or articulated wardrobe.
- ❌ **Asset-Store Clutter**: Incoherent third-party assets that clash with the architectural miniature language.
- ❌ **Provider / Vendor Mascots**: Artificial mascots, branded corporate logos, or vendor robot avatars.

---

## 2. Shared Character Grammar vs Role-Specific Identity

The Character System strictly separates the **Shared Technical Grammar** (reusable baseline rules) from **Role-Specific Identity** (unique creative expression per role).

### 2.1 Shared Character Grammar (Universal Contract)

All characters across the headquarters must adhere to the following shared grammar:

1. **Coordinate & Orientation Conventions**:
   - Local `+Z` is character **forward** (facing direction).
   - Local `+Y` is character **up**.
   - Local `+X` is character **stage right** (viewer's left when facing front).
   - At workstations, seated characters are oriented with `rotY = Math.PI` (facing world `-Z` toward the desk).
2. **Scale Envelope**:
   - Total standing height: `1.42m – 1.48m`.
   - Head-to-body proportion: `~1:6.0 – 1:6.3`.
   - Seated eye height: `~1.00m – 1.05m` above floor level.
   - Base torso elevation: `Y = 0.74m` seated (`Y = 0.70m` standing).
3. **Rig & Skeletal Hierarchy**:
   - Canonical 20-bone humanoid armature:
     - `Root` → `Hips` → `Spine` → `Chest` → `Neck` → `Head`
     - `Chest` → `Clavicle_L/R` → `UpperArm_L/R` → `LowerArm_L/R` → `Hand_L/R`
     - `Hips` → `UpperLeg_L/R` → `LowerLeg_L/R` → `Foot_L/R`
4. **Animation-State Interface**:
   All characters implement the presentation finite-state machine interface:
   - `IDLE`: Relaxed breathing cycle (0.2 Hz, ±0.003m), subtle head drift (7s period), arms motionless, status ring opacity 0.08.
   - `ATTENTION`: Upright alert posture, acknowledged task assignment/preparation, no typing micro-motion, status ring orange (`#f97316`, opacity 0.8).
   - `FOCUSED` (`WORKING`): Leaning forward (0.08 rad torso tilt), head angled at display (0.08 rad), active typing micro-motion on arms (7.5 rad/s, ±0.004m), status ring cobalt (`#38bdf8`, opacity 0.7).
   - `WAITING`: Upright leaning slightly back (-0.02 rad), arms at rest, status ring amber (`#f59e0b`, opacity 0.65).
   - `VERIFYING`: Precision examination posture (0.06 rad torso tilt, 0.14 rad head dip toward diff scanner), status ring emerald (`#34d399`, opacity 0.75).
   - `SUCCESS`: Relaxed triumphant posture (-0.04 rad torso tilt), status ring green (`#22c55e`, opacity 0.8).
   - `FAILURE`: Tense attentive posture (0.05 rad torso tilt), status ring crimson (`#ef4444`, opacity 0.8).
5. **Material Grammar**:
   - Physical PBR (`MeshStandardMaterial`) with roughness/metalness parameters.
   - Standard material slots: `skin`, `hair`, `clothingPrimary`, `clothingSecondary`, `trousers`, `footwear`, `accessory`.
   - Materials must react cleanly to both daylight skylight and night task lighting.
6. **Workstation & Seating Anchors**:
   - Seated legs and chair interaction calibrated to canonical desk height (`Y = 7.94m`) and seat height (`Y = 7.69m`).
   - Hands rest precisely at desk surface level (`Y = 7.96m`) over keyboard and mouse.
   - Sneaker soles rest flush on floor level (`Y = 7.20m`).
7. **Accessibility & Reduced-Motion Contract**:
   - When `prefers-reduced-motion` is active:
     - Zero continuous sine-wave bobbing or limb oscillation.
     - Instant pose snapping between states (upright vs focused lean).
     - Full semantic state preserved (status rings, forward tilt, head angle) without motion.
8. **Performance Budget**:
   - Triangle count: `<6,000` triangles per character.
   - Draw calls: `<25` draw calls per character (instanced accessories where applicable).
   - Texture budget: Shared material library, zero uncompressed individual character textures.

---

### 2.2 Role-Specific Identity (Creative Differentiation)

While adhering strictly to the shared grammar, each reasoning role must possess an authored visual identity:

| Role | Department | Canonical Station | Primary Wardrobe | Accent Semantic | Silhouette & Character Expression |
|---|---|---|---|---|---|
| **Frontend Engineer** | `ENGINEERING` | `engineering-workstation-01` (`codex-workstation`) | Tailored deep slate cobalt raglan knitwear (`#243352`), charcoal denim | Cobalt / Cyan (`#38bdf8`) | Creative, expressive silhouette, cognac hair with swept bangs, champagne wireframe glasses, desk-focused postures. |
| **Backend Engineer** | `ENGINEERING` | `engineering-workstation-02` (`fcc-workstation`) | Structured dark graphite utility overshirt (`#1e232a`), dark slacks | Ochre / Terracotta (`#f59e0b`) | Technical systems-oriented silhouette, structured collar, distinct haircut, terminal/server-focused postures. |
| **Independent Reviewer** | `QUALITY` | `verification-lab-console` (`verifier-console`) | Tailored pale sage cleanroom coat (`#3f4f46`), minimal trousers | Emerald / Mint (`#34d399`) | Precision-oriented, clinical silhouette, cleanroom collar/hood clasp, evidence inspection postures on Floor 3. |
| **Browser QA Specialist**| `QUALITY` | `browser-qa-station` (`browser-qa-matrix`) | Technical studio workwear, utility dark trousers | Cyan / Ice (`#06b6d4`) | Observational, multi-device monitoring silhouette, device bench interaction postures on Floor 4. |
| **Chief Planner** | `CONTROL_STRATEGY` | `planning-table` | Deep navy tailoring (`#172033`), dark slacks | Warm Brass / Gold (`#d4af37`) | Composed, upright strategic silhouette, planning folio/datapad gestures at the central planning table on Floor 1. |

---

## 3. Critical Invariant: Role != Model != Provider != Harness

The most critical architectural rule of the Character System is:

> **THE CHARACTER REPRESENTS THE ORGANIZATIONAL ROLE.**  
> **THE HARNESS, MODEL, AND PROVIDER ARE MERELY TOOLS BEING USED BY THAT ROLE.**

### Explicit Architectural Invariants:
1. **Zero Provider Branding**:
   - No character may receive OpenAI, Anthropic, Claude, Codex, Gemini, GPT, NVIDIA, OmniRoute, or AgentRouter branding, badges, or mascot coloring.
2. **Provider Agnostic Continuity**:
   - A Frontend Engineer executing a task through `codex-worker` is the **exact same character** as a Frontend Engineer executing through `claude-worker`, `antigravity-worker`, or any other inference backend.
   - Switching providers or fallbacks alters **only telemetry metadata** in the inspector, NEVER the character identity, mesh, or wardrobe.
3. **Tool Metaphor**:
   - Just as a human engineer does not become a keyboard or a compiler, a Gravitas character does not become an LLM. The character is the logical autonomous worker; the LLM is the cognitive engine currently driving their tools.

---

## 4. Rollout Constraint: No Reskins Allowed

A strict production constraint is enforced for all future character implementations:

> **FUTURE ROLES MUST NOT BE COLOR-SWAPS OR HAIR-SWAPS OF THE FRONTEND ENGINEER.**

Each future role must have:
- Authentically authored head geometry and facial silhouette.
- Tailored clothing construction specific to the role's function (e.g. cleanroom coat for Reviewer, structured overshirt for Backend, tailored suit for Planner).
- Role-specific ergonomic postures and idle/working behaviors.
- Distinct accessories reflecting their actual domain (e.g. inspection scanner for Reviewer, planning datapad for Planner, device grips for Browser QA).

**Mass rollout to other roles remains locked until individual fidelity proofs are reviewed.**

---

## 5. Runtime State Binding Architecture

The 3D character state is purely reactive and strictly caused by authoritative runtime projection:

```
[Authoritative Backend Event / Task FSM]
                   ↓
     [Runtime Projection Snapshot]
     (epoch, revision, activeTasks)
                   ↓
      [SSE / State Polling Stream]
                   ↓
          [deriveWorldState]
      (combines tasks + projection)
                   ↓
   [deriveRolePresentationStates]
  (pure function: worldState → roles)
                   ↓
      [HqCharacters.reconcileRoles]
  (updates figure controller state)
                   ↓
      [HqCharacters.update Loop]
  (drives forward lean & typing motion)
```

- **IDLE**: Character resting, arms still, no typing motion, status ring dimmed.
- **ASSIGNED / PREPARING**: Character alert, status ring active (`ATTENTION`), zero false typing.
- **WORKER_RUNNING**: Character forward lean, active typing micro-motion, status ring active (`FOCUSED`).
- **WORKER_FINISHED / CANDIDATE_PRODUCED**: Character typing ceases immediately, returns to resting posture (`WAITING`).
- **VERIFYING**: Task transitions to verification; Frontend Engineer returns to `IDLE`, Independent Reviewer enters `VERIFYING`.
