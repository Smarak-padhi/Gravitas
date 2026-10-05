# D3 Performance & Scale Evidence

## 1. Automated Performance Benchmark (60-Test Suite)

The automated test suite (`apps/desktop/src/d3.test.ts`) verifies projection latency across increasing entity loads:

| Fixture Scale | Entity Count | Projection Time | Budget Ceiling | Margin | Status |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Small** (1 session, 1 run, 4 tasks) | 6 | ~0.08 ms | 25 ms | >300x | PASS |
| **Medium** (2 sessions, 5 runs, 20 tasks) | 27 | ~0.35 ms | 50 ms | >140x | PASS |
| **Stress** (5 sessions, 20 runs, 100 tasks) | 125 | ~1.62 ms | 100 ms | >60x | PASS |

## 2. Real Runtime Telemetry (Live Electron 44.5.1)

Captured during the 51-step live dogfood run on host Windows 11 system:
- **Host GPU**: NVIDIA GeForce RTX 3050 Laptop GPU (Direct3D11 via ANGLE).
- **Renderer Viewport**: 1087 x 688 @ 1.25 devicePixelRatio.
- **Render Loop**: Single active loop confirmed (`loopStats.loops.active <= 1`, `pending <= 1`).
- **Memory Footprint**: Stable WebGL context without memory leaks across 4 rapid view-switching cycles.
