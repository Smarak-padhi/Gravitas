# GRAVITAS 3D HEADQUARTERS — MOTION SYSTEM & KINETIC GRAMMAR
## Spatial Motion, Interface Transitions & Zero-Fake-Activity Rules

> **FUNDAMENTAL LAW OF MOTION**: Motion in Gravitas communicates causality, custody, and system state.  
> It is NEVER decorative filler.  
> **NO FAKE PRODUCTIVE ACTIVITY**: Characters type only when an authoritative task is executing. Packets transit only when real files or contracts move.

---

## 1. Motion Ownership Boundary: 3D World vs. 2D DOM

To avoid architectural corruption and synchronization bugs, motion systems are strictly separated by rendering medium:

```
+-----------------------------------------------------------------------------------+
| 3D SCENE GRAPH MOTION (Owned by Three.js / WebGL RAF Loop)                       |
| - Character skeletal locomotion, posture blends, and typing loops                 |
| - Spline-based packet gliding along recessed optical conduits                     |
| - Vertical carriage lift travel                                                   |
| - Camera pan, tilt, and slerp transitions                                         |
| - Driven by: Three.js AnimationMixer, Vector3.lerp, Quaternion.slerp              |
+-----------------------------------------------------------------------------------+
                                        | (Zero DOM libraries crossing into WebGL)
                                        v
+-----------------------------------------------------------------------------------+
| 2D INTERFACE MOTION (Owned by CSS / Web Animations API / Anime.js)                |
| - TaskInspector side-drawer slide-out and dock transitions                        |
| - TopBar telemetry pill color cross-fades                                         |
| - Unified git diff accordion expansions                                           |
| - Modal overlays (GoalComposer, CommandPalette)                                   |
| - Driven by: CSS custom properties, var(--motion-ease-standard), WAAPI            |
+-----------------------------------------------------------------------------------+
```

---

## 2. Motion Duration Families & Easing Curves

All animations adhere to three unified duration tiers:

| Tier | Duration | Easing Function | Application |
| :--- | :--- | :--- | :--- |
| **Micro (Instant Feedback)** | `120ms - 180ms` | `cubic-bezier(0.2, 0.0, 0.0, 1.0)` (Snap In) | Raycast hover highlight, LED pulse trigger, button click depress. |
| **Standard (State Transitions)** | `280ms - 380ms` | `cubic-bezier(0.4, 0.0, 0.2, 1.0)` (Standard Ease) | Character sit/stand, packet open/close, camera room focus shift. |
| **Macro / Spatial Transit** | `600ms - 1200ms` | `cubic-bezier(0.25, 1.0, 0.5, 1.0)` (Smooth Decel) | Packet gliding along transit spline, vertical lift ascent, full HQ camera framing. |

---

## 3. Kinetic Catalog by Motion Class

### 3.1 World Motion (3D Spatial Layer)

| Motion Entity | Authoritative Trigger | Duration / Curve | Interruptibility | Visual Mechanics | Reduced-Motion Fallback |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Character Locomotion** | `TASK_SCHEDULED` / Authoritative assignment \(\rightarrow\) Worker moves to desk. | \(d / 1.4\text{s}\) (Linear with \(150\text{ms}\) ease) | **Interruptible**: If task cancelled, character returns to standby. | Natural walking gait; spine tilt slightly forward; packet held in hand. | Instant snap to destination chair with brief cross-fade. |
| **Typing / Work Execution** | `WORKER_STARTED` \(\rightarrow\) `WORKER_FINISHED` | Continuous Loop until finished | **Immediate Halt** upon `WORKER_FINISHED` or `FAILED`. | Alternating hands on drafting console; occasional head glance at CRT monitor. | Static seated posture with illuminated desk halo. |
| **Packet Spline Glide** | `TASK_SCHEDULED` or `VERIFICATION_STARTED` | `800ms` (Cubic ease-in-out) | **Uninterruptible** (Fixed topological transit). | Folio travels along Catmull-Rom curve with soft directional tilt. | Instant teleportation to destination station. |
| **Vertical Lift Ascent** | `APPROVAL_REQUIRED` | `800ms` (Linear with ease-out) | **Queued**: Waits until top before plinth transfer. | Lift carriage ascends with glowing base ring; arrives at Mezzanine level. | Packet appears directly on Mezzanine plinth. |
| **Approval Seal Deboss** | `TASK_APPROVED` | `250ms` (Subtle deboss) | **Uninterruptible**. | Gold embossed verification seal appears on packet. | Seal appears immediately without drop motion. |
| **Camera Orbit Slerp** | Room focus click or keyboard preset | `500ms` (Spherical slerp) | **Interruptible**: New click re-targets immediately. | Smooth pan/zoom arc preserving horizon stability. | Instant camera repositioning (0ms). |

---

### 3.2 Ambient Motion (Quiet Environmental Life)

To prevent the 3D scene from looking like a dead screenshot during idle periods, subtle ambient physics are applied:
1. **Character Breathing**: Subtle vertical chest oscillation (\(\pm 3\text{mm}\), \(0.3\text{Hz}\) frequency).
2. **Infrastructure Fan Rotation**: Slow, steady rotation of cooling fan blades inside the server racks (\(2.0\text{rad/s}\)).
3. **Optical Conduit Indicator Trickle**: Low-intensity amber LED pulse traveling along inactive conduits once every \(8\text{s}\).
4. **Natural Skylight Shift**: Ambient sky fill angle rotates by \(1^{\circ}\) every 5 minutes to simulate real-world time passing.

---

## 4. `prefers-reduced-motion` Behavioral Specification

When the user enables `prefers-reduced-motion: reduce` in their operating system:

1. **Camera Transitions**:
   - Zero panning or zoom slerps. The camera cuts instantly to the target framing preset.
2. **Character Animations**:
   - Locomotion walk cycles are disabled. Characters transition between postures via instantaneous pose swaps.
   - Continuous typing loops are replaced by a static, focused seated pose with steady workstation lighting.
3. **Work Packet Transits**:
   - Packets do not glide along transit splines; they unmount from the source station and immediately mount at the destination station.
4. **2D Interface**:
   - All CSS transitions collapse to `0ms`; sidebars and drawers toggle with instant visibility switches.
