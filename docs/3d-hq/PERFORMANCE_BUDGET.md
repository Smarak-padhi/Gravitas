# GRAVITAS 3D HEADQUARTERS — PERFORMANCE BUDGET & RENDERING SPECIFICATION
## Measured Performance Targets, Render Lifecycles & Suspension Rules

> **PERFORMANCE MANDATE**: Gravitas is a mission-critical developer tool.  
> The 3D Headquarters must never degrade CPU responsiveness, stall the SSE event stream, overheat developer laptops, or drain battery life during long-running orchestrations.  
> **REALISTIC BENCHMARKING**: Acceptance criteria are defined as measured empirical targets rather than rigid theoretical assumptions.

---

## 1. Measured Frame Rate & Latency Targets

Rather than assuming an unyielding "rock-solid 60 FPS" across all hardware, Gravitas establishes measured operational targets:

| Operating State | Target Performance | Acceptable Floor | Measurement Protocol |
| :--- | :--- | :--- | :--- |
| **Reference Development Machine (Dedicated GPU / Apple Silicon)** | **\(\sim 60\) FPS** (\(16.6\text{ms}\) frame time) | \(\ge 50\) FPS | 95th percentile frame time during active camera orbit and worker execution. |
| **Normal Active Operation (Integrated GPU / Laptop)** | **\(\ge 45\) FPS** (\(\le 22.2\text{ms}\) frame time) | \(\ge 35\) FPS | Measured during concurrent Golden Loop execution with 2D inspector open. |
| **Idle Floor (No active tasks, no camera interaction for 30s)** | **\(\le 30\) FPS** or **Render-on-Demand** | N/A (Power save) | Render loop throttles to 30 FPS or pauses until pointer move or SSE event occurs. |
| **Background / Minimized Tab** | **0 Continuous RAF** (Full Freeze) | 0 FPS | `cancelAnimationFrame` invoked; WebGL rendering completely suspended. |
| **HQ3D View Inactive (User on Office, Graph, or Evidence view)** | **0 Continuous RAF** (Full Freeze) | 0 FPS | Render loop suspended; canvas hidden; zero GPU draw calls. |

---

## 2. Quantitative Initial Resource Budgets (Subject to Measurement)

The following targets are initial engineering baselines that must be measured and validated during implementation waves:

| Metric | Initial Target | Recommended Headroom | Invariant Constraint |
| :--- | :--- | :--- | :--- |
| **Initial 3D JS Bundle Addition** | \(\le 160\text{KB}\) (Gzipped target) | Up to \(220\text{KB}\) | Must be measured via Vite bundle analyzer; not an unquestionable hard blocker if Three.js core requires minor utilities. |
| **Total 3D Geometry Assets (GLB/Draco)** | \(\le 3.5\text{MB}\) combined | \(5.0\text{MB}\) max | All assets lazy-loaded after 2D app shell bootstrap. |
| **Per-Character Geometry Size (Waves 12E+)** | \(\le 850\text{KB}\) | \(1.2\text{MB}\) | Budget for future rigged characters; prototype characters in 12B–12D are procedural (\(<20\text{KB}\)). |
| **Total Texture VRAM Footprint** | \(\le 35\text{MB}\) | \(50\text{MB}\) | Single shared \(2048 \times 2048\) KTX2 / Basis Universal atlas for all architectural elements. |
| **Active Draw Calls per Frame** | \(\le 45\) | \(65\) | Aggressive `InstancedMesh` usage for modular conduits, brackets, and racks. |
| **Scene Triangle Count** | \(\le 50,000\) | \(80,000\) | Geometric blockout in 12B will be \(\le 15,000\) triangles. |
| **Active PBR Lights** | 1 Directional + 1 Ambient + 3 Spotlights | 6 total lights | Only 1 dynamic shadow caster (Primary Sun Directional). |
| **Device Pixel Ratio (DPR) Cap** | `Math.min(window.devicePixelRatio, 2.0)` | Capped at `1.25` on laptops | Never exceed `2.0` to avoid fillrate bottlenecks on 4K/Retina displays. |

---

## 3. Dual-Condition Render Loop Suspension Lifecycle

To guarantee zero background battery drain, the 3D render loop is governed by **both document visibility AND active application view**:

```
+-------------------------------------------------------------------------+
|                  RENDER LOOP GOVERNANCE CONTROLLER                      |
|                                                                         |
|  isRenderingActive = (document.visibilityState === 'visible')           |
|                      && (currentWorkspaceView === 'HQ3D')               |
+-------------------------------------------------------------------------+
                                    |
          +-------------------------+-------------------------+
          |                                                   |
          v (isRenderingActive: TRUE)                         v (isRenderingActive: FALSE)
   [ACTIVE RENDER LOOP]                                [FULL SUSPENSION]
  - Normal RAF loop (45 - 60 FPS)                     - cancelAnimationFrame()
  - Dynamic camera slerp and picking                  - Zero WebGL draw calls
  - Throttles to 30 FPS after 30s idle                - Zero GPU clock boost
  - Instantly responsive to input                     - Memory preserved; resumes immediately
```

### Suspension Rules:
1. **Document Visibility**:
   - `document.addEventListener('visibilitychange')`: When hidden, the render loop stops immediately.
2. **Application View State**:
   - When the user switches to `'OFFICE'`, `'GRAPH'`, `'EVIDENCE'`, `'TIMELINE'`, or `'AGENTS'`, the 3D canvas is unmounted or hidden via CSS, and its internal RAF loop is **immediately cancelled**.
   - The lightweight pure TypeScript `WorldState` adapter continues tracking state updates in memory. When the user returns to `'HQ3D'`, the canvas resumes instantly with current world positions.

---

## 4. Adaptive Profiling & Degradation Paths

- **Frame Time Measurement**: The director records rolling 60-frame average frame times.
- If average frame time exceeds \(28\text{ms}\) (<35 FPS) consistently over 5 seconds:
  1. Downscale DPR to `1.0`.
  2. Disable directional shadow maps (`renderer.shadowMap.enabled = false`).
  3. Notify operator via subtle banner: `3D HQ running in low-power mode · Switch to 2D Office`.
- If WebGL context loss occurs (`webglcontextlost`), the application safely falls back to the 2D `OfficeFloor` without crashing the active run.
