# GRAVITAS — WAVE P8 RENDERER FAILURE RECOVERY
## Deterministic State Machine Traces for 24 Operational Failure Scenarios

**Status:** APPROVED ARCHITECTURAL SPECIFICATION  
**Wave:** P8 — Renderer Strategy Decision  
**Date:** 2026-10-01  
**Governing Invariants:**
- $\mathbf{RENDERER \neq PRIVILEGED\ KERNEL}$
- $\mathbf{DESKTOP\ PROCESS\ LIFETIME \neq WORKSESSION\ LIFETIME}$
- $\mathbf{WINDOW\ CLOSED \neq KERNEL\ TERMINATED}$
- $\mathbf{RENDERER\ CRASH \neq STATE\ LOSS}$
- $\mathbf{GPU\ STATE \neq DURABLE\ STATE}$

---

## 1. Failure Taxonomy & Containment Strategy

In accordance with the frozen P6 and P7 lifecycle contracts, the renderer process is an **untrusted, ephemeral consumer** of state. Every failure in the rendering surface is isolated from the underlying control plane:
- **Blast Radius:** Strictly contained to the BrowserWindow DOM and GPU swapchain.
- **Kernel Impact:** None directly on control plane. Running tasks continue executing in child processes; SQLite WAL writes proceed unaffected.

---

## 2. Comprehensive Traces: 24 Failure Scenarios (A through X)

### Scenario A: Renderer Crashes While 10 Agents Work
* **Trigger:** Chromium Blink engine crashes due to a V8 bug or GPU out-of-memory.
* **Detection:** Electron Main process catches `render-process-gone` event on `webContents`.
* **Containment:** Kernel running in Node `utilityProcess` continues executing all 10 agent tasks without pause.
* **Recovery:** Electron Main automatically re-spawns a fresh `BrowserWindow`, loads the UI bundle, authenticates with the Kernel via local IPC, requests `GET /api/v1/state/snapshot`, and reconstructs the scene graph.
* **User Impact:** Brief UI reload; background work continues in Kernel.

### Scenario B: Renderer Reloads While Approval Pending
* **Trigger:** User presses `Ctrl+R` or Developer Tools triggers a hard reload while a human approval gate is displayed.
* **Detection:** UI unmounts; WebSocket/SSE disconnects.
* **Containment:** The pending approval record remains durably stored in SQLite table `approvals` with status `PENDING`.
* **Recovery:** Fresh UI loads, fetches pending approvals from the Kernel, and re-renders the approval plinth with its original cryptographic evidence hash.
* **User Impact:** Approval plinth reappears promptly; decision remains safe.

### Scenario C: GPU Process Crashes
* **Trigger:** Windows display driver crashes or resets (TDR event).
* **Detection:** Electron `child-process-gone` with `type: 'GPU'`.
* **Containment:** Main process logs GPU crash; Chromium automatically re-initializes a new GPU process.
* **Recovery:** `webglcontextlost` fires on the 3D canvas. GRAVITAS catches the event and transitions to Level 3 (2D SVG OfficeFloor) without interrupting work.
* **User Impact:** Transition to 2D view; minimal disruption to workflow.

### Scenario D: WebGL Context Lost (`webglcontextlost`)
* **Trigger:** VRAM exhaustion from running external graphics software.
* **Detection:** Canvas receives `webglcontextlost`.
* **Containment:** `event.preventDefault()` called immediately to prevent permanent canvas invalidation.
* **Recovery:** Three.js `HqDirector` halts rAF, disposes stale textures, and calls `onFallbackTo2D()`. The 2D SVG canvas mounts.
* **User Impact:** Clean transition to 2D schematic diorama.

### Scenario E: WebGPU Unavailable on Host
* **Trigger:** Host machine has outdated drivers or lacks Dawn Direct3D 12 backing.
* **Detection:** `navigator.gpu` returns `undefined` or `requestAdapter()` resolves to `null`.
* **Containment:** Handled at initialization before pipeline creation.
* **Recovery:** Three.js defaults to mature `WebGLRenderer` (WebGL2). If WebGL2 is also missing, falls back to Level 3 (2D SVG).
* **User Impact:** Nominal 2D/WebGL2 operation; no manual configuration required.

### Scenario F: Hardware Acceleration Disabled in OS
* **Trigger:** User launches with `--disable-gpu` or software rendering is forced.
* **Detection:** WebGL initialization throws or yields SwiftShader with high frame-time ($> 40\,\text{ms}$).
* **Containment:** Performance monitor flags persistent low frame-rate.
* **Recovery:** Automatically switches to Level 3 (2D SVG) or Level 4 (Command Center Dashboard), avoiding CPU rendering bottlenecks.
* **User Impact:** Responsive 2D operational experience.

### Scenario G: Kernel Emits Burst of 500 State Changes
* **Trigger:** Large multi-agent wave completes simultaneously, emitting 500 state events in $< 100\,\text{ms}$.
* **Detection:** `VisualEventCoalescer` queue length exceeds high-water mark ($> 50$).
* **Containment:** Coalescer drops intermediate visual animation frames while preserving the latest snapshot.
* **Recovery:** Coalescer flushes only the net terminal state on the next `requestAnimationFrame` tick.
* **User Impact:** Responsive update without unbounded queue lag or visual rubber-banding.

### Scenario H: Agent State Changes Faster Than Animation
* **Trigger:** Task moves `ACTIVE` $\to$ `FAILED` within $50\,\text{ms}$, while walking animation was budgeted for $1200\,\text{ms}$.
* **Detection:** State update arrives while avatar `locomotionProgress < 1.0`.
* **Containment:** Animation Decoupling Invariant enforced: state truth immediately overrides animation progress.
* **Recovery:** Walking tween is aborted; avatar status snaps to `FAILED` with an alert badge at the failure station.
* **User Impact:** Authoritative state displayed promptly; outdated locomotion aborted.

### Scenario I: User Enables Reduced Motion Mid-Animation
* **Trigger:** Operator toggles "Reduced Motion" while camera is mid-flight tweening between rooms.
* **Detection:** `reducedMotion` state changes to `true`.
* **Containment:** All active GSAP / TWEEN / rAF interpolations cancelled.
* **Recovery:** Camera rig sets target position coordinates ($\text{t} = 1.0$); avatar walk gaits freeze into static poses.
* **User Impact:** Direct cessation of motion; avoids disorienting motion drift.

### Scenario J: User Switches to Windows High Contrast Theme
* **Trigger:** Windows OS enters High Contrast / Contrast Themes mode (`forced-colors: active`).
* **Detection:** CSS media query listener `forced-colors` fires.
* **Containment:** 3D PBR materials switch to high-contrast wireframe or automatically fail over to Level 3 (2D SVG).
* **Recovery:** 2D SVG elements apply system semantic colors (`Canvas`, `CanvasText`, `Highlight`).
* **User Impact:** Full readability and contrast compliance.

### Scenario K: Window Resized Rapidly by User
* **Trigger:** Operator rapidly drags window border across multiple screen dimensions.
* **Detection:** `ResizeObserver` fires at high frequency.
* **Containment:** Direct canvas pixel scaling: `renderer.setSize(width, height, false)` and `cameraRig.setAspect(aspect)`.
* **Recovery:** Canvas backing store updates synchronously; DOM overlay coordinates re-project without layout thrashing.
* **User Impact:** Clean continuous resizing without prolonged distortion.

### Scenario L: Window Dragged Between 100% and 200% DPI Monitors
* **Trigger:** Window moved from standard 1080p display to 4K high-DPI display.
* **Detection:** `window.devicePixelRatio` changes; `matchMedia` resolution query triggers.
* **Containment:** Cap DPR at $\le 2.0$ via `Math.min(window.devicePixelRatio, 2.0)`.
* **Recovery:** Renderer adjusts canvas dimensions by new DPR; font sizes scale via CSS rems.
* **User Impact:** Text and 3D geometry remain crisp without double-scaling bugs.

### Scenario M: Display Disconnected While Window Active
* **Trigger:** External monitor unplugged; window migrated to laptop screen.
* **Detection:** Windows DWM sends `WM_DISPLAYCHANGE`; Chromium emits `screen-changed`.
* **Containment:** Viewport bounds clamped to new display work area.
* **Recovery:** Three.js recalculates projection matrix; canvas buffer resizes cleanly.
* **User Impact:** Window snaps onto visible screen bounds.

### Scenario N: Huge DAG Opened (1,000+ Nodes)
* **Trigger:** Complex enterprise workflow generates 1,000 tasks and 2,500 edges.
* **Detection:** Graph node count exceeds SVG threshold ($> 300$).
* **Containment:** Bypasses screen-space DOM SVG rendering to prevent Blink layout tree collapse.
* **Recovery:** Edges switch to instanced Canvas 2D / 3D floor conduits; nodes render via virtualized viewport windowing.
* **User Impact:** Pan and zoom remain responsive.

### Scenario O: Very Long Agent or Task Names (500+ Chars)
* **Trigger:** An adversarial or unconstrained agent generates a 500-character task title.
* **Detection:** CSS text bounds layout.
* **Containment:** Floating 2D badges apply strict CSS truncation (`max-width: 240px; text-overflow: ellipsis; white-space: nowrap;`).
* **Recovery:** Full untruncated name is inspectable inside the docked Layer 3 drawer with horizontal scroll.
* **User Impact:** 3D diorama layout remains legible without overflowing text billboards.

### Scenario P: Malicious HTML Injected in Tool Output
* **Trigger:** LLM tool executes a command returning raw `<script>` or malicious markdown.
* **Detection:** Sanitization layer in Projection Adapter.
* **Containment:** Output passed through `DOMPurify` before DOM insertion, or placed strictly inside `<pre><code>` text nodes (`textContent`).
* **Recovery:** Script tags stripped or rendered as inert plaintext string literals.
* **User Impact:** Safe rendering; mitigates XSS vulnerability.

### Scenario Q: Malicious SVG Asset Loaded
* **Trigger:** An untrusted tool writes an SVG containing embedded JavaScript.
* **Detection:** SVG loading pipeline validates XML tags.
* **Containment:** Embedded `<script>`, `onload`, and `xlink:href` handlers stripped via regex and DOMPurify.
* **Recovery:** Clean vector geometry displayed safely.
* **User Impact:** Malicious payload neutralized.

### Scenario R: Scene Projection Becomes Stale
* **Trigger:** Renderer event loop stalls due to heavy background activity.
* **Detection:** Heartbeat monitor detects elapsed time exceeds staleness threshold (e.g. $\Delta t > 3000\,\text{ms}$ `[NON-NORMATIVE EXAMPLE: REQUIRES_K_PHASE_CALIBRATION]`).
* **Containment:** Visual world dims; displays warning banner `[CONNECTION STALE]`.
* **Recovery:** When loop resumes, renderer requests fresh state snapshot `GET /api/v1/state/snapshot` and fast-forwards.
* **User Impact:** Transparent indication of latency; prevents operator from acting on stale data.

### Scenario S: Event Sequence Gap Detected
* **Trigger:** SSE connection drops and reconnects, missing events sequence 42 to 49.
* **Detection:** Next event carries `sequence: 50`, but last processed sequence was `41`.
* **Containment:** Incremental patching halted.
* **Recovery:** Dispatches request for full snapshot, resetting sequence counter to latest canonical state.
* **User Impact:** Missing intermediate transitions reconciled from full snapshot.

### Scenario T: Renderer Displays Success While Kernel Reports Failure
* **Trigger:** Stale projection bug or dropped failure event.
* **Detection:** User clicks "Deploy / Approve".
* **Containment:** Kernel Sovereign Authority Invariant: Kernel independently verifies state before executing command.
* **Recovery:** Kernel rejects the command with `ERR_STATE_DESYNCHRONIZATION`, sends authoritative failure packet, and forces UI refresh.
* **User Impact:** Prevents accidental deployment; visual discrepancy is resolved by Kernel truth.

### Scenario U: BrowserWindow Hidden for Hours Then Reopened
* **Trigger:** User minimizes GRAVITAS to system tray for 8 hours while agents complete a milestone.
* **Detection:** `window.on('show')` / `document.visibilitychange` fires.
* **Containment:** Render loop was suspended to minimize GPU/CPU consumption while minimized.
* **Recovery:** Upon window restore, renderer requests full snapshot, rebinds camera, and projects completed milestone diorama.
* **User Impact:** Prompt awakening, reduced resource consumption while hidden, up-to-date state.

### Scenario V: Host Machine Resumes from Sleep / Hibernation
* **Trigger:** Laptop lid opened after overnight sleep.
* **Detection:** OS power event `resume`; WebGL context may be lost.
* **Containment:** Kernel reconciles child processes via P6 Startup Reconciler.
* **Recovery:** WebGL context reinitialized or failed over to 2D SVG; SSE stream re-established.
* **User Impact:** Orderly restoration of Living HQ.

### Scenario W: Renderer Memory Pressure Exceeds Budget
* **Trigger:** Extended multi-hour session with 100,000 log lines causes Chromium renderer memory to exceed $400\,\text{MB}$.
* **Detection:** Performance telemetry monitors `window.performance.memory.usedJSHeapSize`.
* **Containment:** Inactive log buffers and offscreen DOM nodes pruned.
* **Recovery:** Forces V8 garbage collection hint, purges cached textures, and caps log history to last 500 lines.
* **User Impact:** Memory stabilizes without application lag.

### Scenario X: Renderer Dependency Fails to Initialize
* **Trigger:** Three.js bundle fails to load or WebGL context creation throws.
* **Detection:** `try / catch` block in `LivingHqCanvas3D.tsx` constructor.
* **Containment:** Error caught cleanly; unmounts 3D component.
* **Recovery:** Automatically activates `onFallbackTo2D()`, mounting the 2D SVG OfficeFloor.
* **User Impact:** User works uninterrupted in 2D mode with a non-intrusive notification: *"3D canvas unavailable — running in 2D mode"*.
