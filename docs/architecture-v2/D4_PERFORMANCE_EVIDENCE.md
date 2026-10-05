# D4 Performance & Scale Evidence

## 1. Automated Performance Benchmark

Projection benchmarks from the automated test suite (`apps/desktop/src/d4.test.ts`):

| Fixture Scale | Entity Count (incl Role-Bots) | Projection Time | Budget Ceiling | Margin | Status |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Small** (1 session, 1 run, 4 tasks + bots) | 10 | ~0.11 ms | 25 ms | >200x | PASS |
| **Medium** (2 sessions, 5 runs, 20 tasks + bots) | 47 | ~0.48 ms | 50 ms | >100x | PASS |
| **Stress** (5 sessions, 20 runs, 100 tasks + bots) | 225 | ~2.15 ms | 100 ms | >45x | PASS |

## 2. Real Runtime Telemetry (Live Electron 44.5.1)

Captured during the 63-step live dogfood run on host Windows 11 system:
- **Host GPU**: NVIDIA GeForce RTX 3050 Laptop GPU (Direct3D11 via ANGLE).
- **Renderer Viewport**: 1087 x 688 @ 1.25 devicePixelRatio.
- **Render Loop**: Single active loop confirmed (`activeRenderers <= 1`, `pending <= 1`).
- **Memory Footprint**: Stable WebGL context across view switching, window hiding, and renderer reload.
- **Bot Geometries**: Pure procedural geometries (`CYLINDER_HEAD`, `HELMET_OCTA`, `CONE_PRISM`, `TORUS_DEVICE`, `BOX_UNIT`) with zero external network asset dependencies.
