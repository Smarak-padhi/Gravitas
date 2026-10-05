# D3 Three.js Render Boundary & Loop Lifecycle

## 1. Scene Graph Architecture & Ownership

The Three.js adapter (`renderAdapter.ts`) is strictly a presentation sink:
- **No Authority**: It has zero reference to Electron IPC, Kernel instances, or database connections.
- **Single Render Loop**: Exactly one `requestAnimationFrame` loop is active at any time. View switches pause or dispose of the loop cleanly.
- **Resource Management**: Geometries and materials are cached and deterministically disposed on unmount or context loss.

```
+-------------------------------------------------------------+
|                     WorldView (DOM Controller)              |
+-------------------------------------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|             WorldRenderer (Three.js Presentation)           |
|  - Scene, PerspectiveCamera, Raycaster, WebGLRenderer       |
|  - Caches: GeometryCache, MaterialCache                     |
|  - Loop: loopInstrumentation tracks frame handles           |
+-------------------------------------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                     HTMLCanvasElement                       |
|   (Unprivileged pointer event target; no authority)         |
+-------------------------------------------------------------+
```

## 2. Raycaster & Picking Contract

- Clicking an entity projects canvas coordinates to NDC `[-1, 1]`.
- The raycaster intersects bounding volumes and returns the **canonical identity** (`spatialEntityId`).
- The returned identity is passed to the DOM view to open the **Semantic Inspector**.
- **Crucial Rule**: Raycast picking CANNOT trigger mutations, approvals, rejections, tool execution, or process spawns.

## 3. Context Loss & Loop Instrumentation

- Listening for `webglcontextlost`:
  Immediately unmounts canvas, sets degradation level to `SEMANTIC_ONLY`, logs event, and announces to screen readers.
- Single Loop Proof:
  `loopInstrumentation.activeRenderers <= 1` and `loopInstrumentation.pendingFrameHandles <= 1` across all view switches.
