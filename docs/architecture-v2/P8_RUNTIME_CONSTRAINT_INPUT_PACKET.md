# P8 RUNTIME CONSTRAINT INPUT PACKET
## Architectural Constraints & Runtime Surface Specification for Wave P8

**Status:** APPROVED HANDOFF INPUT DOSSIER  
**Target Wave:** Wave P8 — Visual & Renderer Strategy Decision  
**Date:** 2026-10-01  
**Git Baseline Commit:** `516e01c82cb4c3afd1080e72e68a4e1e56687335`  
**Governing Invariants:**
- $\mathbf{P7\ RUNTIME\ DECISION \neq P8\ RENDERER\ DECISION}$
- $\mathbf{P7\ OUTPUT \to P8\ INPUT}$
- $\mathbf{VISUAL\ WORLD = PROJECTION\ OF\ RUNTIME\ STATE}$
- $\mathbf{RENDERER \neq PRIVILEGED\ KERNEL}$
- $\mathbf{UI\ COMPROMISE \neq UNRESTRICTED\ OS\ AUTHORITY}$

---

## 1. Scope & Sovereign Boundary of Wave P8

Wave P7 has finalized the **Desktop Runtime Architecture**:
$$\mathbf{SELECTED\ DESKTOP\ RUNTIME = ELECTRON\ (LATEST\ STABLE)}$$

Wave P8 retains **sovereign authority** over the **Visual Engine & Rendering Strategy**. Wave P8 will decide:
- Whether the visual world uses DOM, 2D HTML5 Canvas, WebGL2, WebGPU, or a hybrid renderer.
- Visual metaphor and simulation architecture (e.g. 2.5D isometric spatial world vs hierarchical control canvas).
- Component libraries, layout systems, and visual simulation frameworks (e.g. PixiJS, Three.js, Babylon.js, or custom WebGL shader pipeline).

This document serves strictly as the **technical boundary specification** provided by the P7 desktop container to Wave P8.

---

## 2. Supported Rendering Surfaces in Chromium 148+

Electron’s bundled Chromium runtime exposes the following graphics APIs on modern Windows 11 (Direct3D 12 backing):

| Surface / API | Version / Standard | Hardware Acceleration Support | Notes for Wave P8 |
| :--- | :--- | :--- | :--- |
| **DOM / CSS 3D** | HTML5 / CSS Transform 3D | Fully accelerated by Blink compositor | Ideal for standard text controls, inspectors, and forms. |
| **2D Canvas** | HTML5 Canvas 2D Context | Hardware-accelerated (Direct2D / Skia) | Fast for 2D charts, simple node graphs, and UI overlays. |
| **WebGL 2.0** | OpenGL ES 3.0 equivalent | Direct3D 11/12 via ANGLE (DirectX) | Mature, streamlined cross-platform 2D/3D rendering. |
| **WebGPU** | W3C WebGPU Recommendation | Direct3D 12 via Dawn backend | Modern compute shaders, low-overhead multi-agent simulations. |

---

## 3. Renderer Security Sandbox Constraints for P8

Wave P8 renderers operate under strict zero-trust sandbox rules:
1. **Node.js Runtime Access Disabled:**
   - `nodeIntegration: false`
   - `contextIsolation: true`
   - `sandbox: true`
   - The visual renderer cannot call `require()`, cannot access Node globals (`process`, `Buffer`), and cannot import filesystem or network modules directly.
2. **Strict Content Security Policy (CSP):**
   - Inline script tags and `eval()` are blocked (`script-src 'self'`).
   - Web workers are supported via `worker-src 'self' blob:`.
   - External asset loading from arbitrary remote HTTP origins is blocked. All local sprites, textures, and 3D models must be bundled locally or served through registered local protocol schemes (`app://`).
3. **IPC Channel Restrictions:**
   - The renderer communicates with the Kernel exclusively via `window.gravitasAPI`.
   - Heavy visual assets (e.g. screenshots, model textures) must be transferred via structured clone `ArrayBuffer` or read from local disk via the Kernel staging protocol.

---

## 4. Window & Display Capabilities on Windows 11

1. **Per-Monitor High-DPI Scaling:**
   - Chromium automatically handles Windows 11 per-monitor DPI scaling (100%, 125%, 150%, 200%).
   - Canvas backing buffers must scale by `window.devicePixelRatio` to prevent blurriness.
2. **Frame Rate & Background Throttling:**
   - When the main window is focused: full 60fps / 120fps refresh rate supported via `requestAnimationFrame`.
   - When the window is minimized or hidden to system tray: Chromium automatically throttles `requestAnimationFrame` to $1\text{fps}$ or pauses rendering to conserve host CPU and GPU energy.
   - P8 visual simulation loops must decouple **visual animation ticks** from **underlying state updates** so the Kernel's simulation continues accurately even when rendering is throttled.
3. **Window Chrome & Transparency:**
   - Frameless windows (`frame: false`), rounded corners (Windows 11 DWM Mica / Acrylic effects), and custom titlebars are fully supported by the Electron container.

---

## 5. Performance & Measurement Directives for Wave P8

Before finalizing the visual engine, Wave P8 must evaluate:
1. **Idle GPU Utilization:** Idle rendering must consume $< 5\%$ GPU load on integrated graphics (Intel Iris Xe / AMD Radeon).
2. **Garbage Collection Pressure:** Visual sprite creation, node updates, and particle systems must minimize object churn to avoid V8 GC pauses.
3. **Accessibility:** Ensure visual canvas elements have accessible DOM equivalents or ARIA live regions for screen readers.

---

## 6. P7 $\to$ P8 Handoff Verification

- [x] Desktop runtime container decided: Electron.
- [x] Host environment probed and verified.
- [x] Sandbox constraints and CSP documented.
- [x] WebGL2 and WebGPU availability confirmed.
- [x] Visual engine choice left open to Wave P8.
