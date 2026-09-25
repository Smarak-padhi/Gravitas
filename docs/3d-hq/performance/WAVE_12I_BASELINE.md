# GRAVITAS — WAVE 12I: BASELINE PERFORMANCE FORENSICS

**Target Checkpoint**: `886b5df7714a756543a1ceb8e728a59a45dc3e96` (Wave 12H-R3C-C Accepted Final Closure)  
**Test Viewport**: 1600 × 900, Device Pixel Ratio (DPR) = 1.0  
**Host Environment**: Windows 11, Chromium (Hardware-Accelerated WebGL 2.0)  
**Evidence Artifact**: `.evidence/wave-12i-baseline.json` & `docs/3d-hq/evidence/12i/telemetry-before.json`

---

## 1. Executive Summary & Root Cause Findings

Forensic profiling of the accepted Wave 12H-R3C-C checkpoint reveals why real foreground interactive rendering runs at **~21–22 FPS (~46–48ms frame times)** on Floor 2, while automated headless testing measured ~50 FPS:

1. **Massive Geometry & Draw Call Fragmentation (601 unique geometries, 429–459 draw calls)**:
   - 394 separate `BoxGeometry` instances and 104 separate `CylinderGeometry` instances exist in memory.
   - Identical geometric primitives (chair legs, caster wheels, monitor bezels, desk stretchers, structural mullions, planters, books) are repeatedly allocated as individual `BufferGeometry` instances with zero geometry sharing or batching.
2. **Heavy Directional Shadow Pass (166 Draw Calls, 38.2% of Total Draw Calls)**:
   - A single `DirectionalLight` (`keyLight`) casts shadows with a 2048 × 2048 shadow map and `PCFSoftShadowMap` filtering.
   - **189 meshes** across the entire building are marked `castShadow: true`.
   - In A/B measurement, disabling the shadow map drops draw calls from **435 down to 269** (a delta of 166 draw calls dedicated entirely to shadow map rendering).
3. **No Floor-Level Frustum / Inactive-Floor Culling (342 out-of-view meshes rendered)**:
   - When the camera is framed tightly on Floor 2 (Agent Operations), all other floors (Floors 0, 1, 3, 4, 5, 6) remain fully active in the scene graph.
   - Out-of-view floors account for **342 meshes**, **100 shadow casters**, and **312 unique geometries** that are continually traversed, transformed, and submitted to the shadow pass every frame.
4. **Total Matrix Auto-Update Inefficiency (782 of 782 nodes)**:
   - Every single node in the scene (`matrixAutoUpdate: true`) triggers recursive local-to-world matrix recomputation on every frame, despite >95% of the architecture and furniture being completely static.
5. **Fragment Shader Multi-Light Load**:
   - 14 dynamic lights (1 key directional, 1 fill directional, 1 hemisphere, 10 spot lights, 1 point light) evaluate lighting loops for every visible fragment on Floor 2's large floor, desk, and wall surfaces.

---

## 2. Renderer Inspection

| Parameter | Baseline Value | Notes |
| :--- | :--- | :--- |
| `renderer.info.render.calls` | **429 – 435** (Day Floor 2) | Includes 166 shadow pass calls |
| `renderer.info.render.triangles` | **48,936 – 54,752** | High density across furniture & props |
| `renderer.info.render.points` | 0 | None used |
| `renderer.info.render.lines` | 0 | None used |
| `renderer.info.memory.geometries` | **586 – 601** | Severe lack of geometry instancing/sharing |
| `renderer.info.memory.textures` | **23** | 512x512 procedural canvas textures |
| Active DPR | **1.0** (capped at 2.0 max) | 1600 × 900 canvas backbuffer |
| Antialias State | `true` | Standard MSAA |
| Shadow Map Configuration | `enabled: true`, `type: 1` (`PCFSoftShadowMap`) | Map size: 2048 × 2048 |
| Tone Mapping | `ACESFilmicToneMapping` (4), exposure 1.05 | High dynamic range architectural tone |
| Output Color Space | `SRGBColorSpace` | Standard color fidelity |

---

## 3. Scene Graph Forensics & Breakdown by Floor

Total Object3D Nodes: **782**  
Total Mesh Nodes: **648**  
InstancedMesh Nodes: **12** (only 1.8% of meshes!)  
Shadow Casters: **189**  
Shadow Receivers: **65**  
Transparent Meshes: **19**  
Nodes with `matrixAutoUpdate: true`: **782** (100%)  
Hidden Nodes Traversed: **5**

### Floor-by-Floor Inventory

| Floor Level | Object Nodes | Mesh Nodes | Instanced | Shadow Casters | Shadow Receivers | Geometries | Materials |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Floor 0** (Foundation / Plinth) | 69 | 49 | 0 | 9 | 5 | 46 | 15 |
| **Floor 1** (Mission Control) | 65 | 54 | 0 | 20 | 8 | 48 | 25 |
| **Floor 2** (Agent Operations - Focused) | **371** | **306** | **11** | **89** | **32** | **289** | **57** |
| **Floor 3** (Verification Lab) | 83 | 63 | 1 | 22 | 4 | 57 | 26 |
| **Floor 4** (Browser QA Lab) | 63 | 59 | 0 | 30 | 4 | 58 | 19 |
| **Floor 5** (Infrastructure Servers) | 76 | 69 | 0 | 9 | 9 | 67 | 13 |
| **Floor 6** (Approval Mezzanine) | 55 | 48 | 0 | 10 | 3 | 36 | 15 |
| **Total Entire Tower** | **782** | **648** | **12** | **189** | **65** | **601** | **84** |

**Crucial Finding**: When the camera is zoomed into Floor 2, the non-active floors (Floors 0, 1, 3, 4, 5, 6) represent **342 meshes, 100 shadow casters, and 312 geometries**. Every single one of these 100 out-of-view shadow casters is re-rendered into the 2048x2048 directional shadow map on every frame!

---

## 4. Geometry & Material Analysis

### Geometry Redundancy
Breakdown by geometry primitive type:
- `BoxGeometry`: **394** separate instances
- `CylinderGeometry`: **104** separate instances
- `SphereGeometry`: **38** separate instances
- `ExtrudeGeometry`: **23** separate instances
- `CapsuleGeometry`: **23** separate instances
- `TorusGeometry`: **7** separate instances
- `PlaneGeometry`: **5** separate instances
- `RingGeometry`: **4** separate instances
- `ConeGeometry`: **3** separate instances

**Redundancy Examples**:
- 20 identical desk feet and column extrusions are created as individual BoxGeometries.
- 15 task chair wheels, 15 chair legs, 6 arm rest pads each instantiate new Cylinders/Boxes.
- Monitor bezels, screens, desk pads, books, mugs, coffee cups have identical primitive dimensions but separate BufferGeometry allocations.

### Material Analysis
- Total unique material instances: **84** (79 `MeshStandardMaterial`, 5 `MeshBasicMaterial`).
- `MaterialLibrary` tracks shared materials, but several components construct local materials or clone materials with ad-hoc colors, generating unnecessary WebGL state/program changes.
- 19 transparent meshes require depth sorting and prevent early-Z rejection.

---

## 5. Shadow Pass Forensics

- **Key Directional Light Shadow**:
  - Map Size: `2048 × 2048`
  - Frustum Bounds: Left `-22.0`, Right `22.0`, Top `32.0`, Bottom `-4.0`, Near `5.0`, Far `95.0` (covers the entire vertical tower).
  - Bias: `-0.0003`, Radius: `2.0` (Soft PCF).
- **A/B Measurement**:
  - `drawCallsWithShadow`: **435**
  - `drawCallsWithoutShadow`: **269**
  - `shadowDrawCallsDelta`: **166 draw calls**
- **Root Cause**: The shadow frustum spans the entire 24m tall building, and 189 objects are flagged `castShadow: true`. Even when looking only at Floor 2, all 189 objects (including tiny screws, ducts, cable trays, and chairs on floors 1, 3, 4, 5, 6) are drawn into the shadow buffer.

---

## 6. CPU vs GPU & Render Loop Breakdown

Measured over 60 isolated frames:
- `scene.update(...)`: **0.022 ms** (pure JavaScript logic is negligible)
- `cameraRig.update(...)`: **0.008 ms**
- `renderer.render(...)`: **7.308 ms** CPU submission time

In real foreground Chromium interactive rendering:
- **DAY Floor 2**:
  - Average FPS: **21.79 FPS**
  - Average Frame Time: **45.89 ms**
  - Median Frame Time: **49.9 ms**
  - p95 Frame Time: **66.8 ms**
  - p99 Frame Time: **67.1 ms**
  - Minimum FPS: **12.00 FPS**
  - 1% Low FPS: **14.90 FPS**
- **NIGHT Floor 2**:
  - Average FPS: **20.77 FPS**
  - Average Frame Time: **48.15 ms**
  - Median Frame Time: **50.0 ms**
  - p95 Frame Time: **66.9 ms**
  - p99 Frame Time: **83.3 ms**
  - Minimum FPS: **12.00 FPS**
  - 1% Low FPS: **12.00 FPS**
- **Tower Overview DAY**:
  - Average FPS: **39.47 FPS**
  - Average Frame Time: **25.34 ms**
  - Median Frame Time: **17.0 ms**
  - p95 Frame Time: **33.7 ms**
  - p99 Frame Time: **50.1 ms**
  - Minimum FPS: **14.97 FPS**
  - 1% Low FPS: **19.96 FPS**

### Key Conclusion
The CPU scene traversal and update costs are small (~7.3ms), but GPU draw submission and fragment processing in the shadow-mapped WebGL pipeline take ~38–40ms per frame when zoomed in on Floor 2. The primary culprits are:
1. **166 shadow draw calls** covering unneeded out-of-view objects across 6 floors.
2. **435 main draw calls** from unshared, uninstanced geometries.
3. Continuous **matrix recalculation** across 782 static nodes.
4. Heavy fragment fill rate from 14 dynamic lights across the entire screen.
