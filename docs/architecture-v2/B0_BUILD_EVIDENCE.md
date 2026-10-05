# GRAVITAS Phase B0 — Build Evidence & Artifact Record

**Phase**: B0 — Repository Typecheck & Build Convergence  
**Status**: CONVERGED & FULLY REPRODUCIBLE  
**Timestamp**: 2026-10-05T07:43:00+05:30  

---

## 1. Root Build Command Execution

```bash
npm run build
```

**Exit Code**: `0`  
**Standard Output & Step Trace**:
```text
> gravitas@0.0.1 build
> npm run build --workspaces --if-present

> @gravitas/agents@0.0.1 build
> tsc

> @gravitas/browser-qa@0.0.1 build
> tsc

> @gravitas/core@0.0.1 build
> tsc

> @gravitas/gateways@0.0.1 build
> tsc

> @gravitas/git@0.0.1 build
> tsc

> @gravitas/harnesses@0.0.1 build
> tsc

> @gravitas/orchestrator@0.0.1 build
> tsc

> @gravitas/prompts@0.0.1 build
> tsc

> @gravitas/verifier@0.0.1 build
> tsc

> @gravitas/desktop@0.0.1 build
> node ./build.mjs

Desktop package bundled successfully.

> @gravitas/server@0.0.1 build
> tsc

> @gravitas/web@0.0.1 build
> tsc --noEmit && vite build

vite v6.4.3 building for production...
transforming...
✓ 134 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                     0.87 kB │ gzip:   0.47 kB
dist/assets/index-Bvb0FXpu.css      8.36 kB │ gzip:   2.61 kB
dist/assets/index-IetHVRkZ.js   1,402.77 kB │ gzip: 349.46 kB
✓ built in 5.04s
```

---

## 2. Workspace Artifact Inventory

Every package produces valid build artifacts in its respective `dist/` directory:

1. **`packages/core/dist`**:
   - `index.js`, `index.d.ts` (Core domain contracts, FSM, events, handoff, jobs, connectors)
   - `kernel/` (K0 WorkSessionKernel, single-writer SQLite, DataRootLock, schemas)
2. **`packages/harnesses/dist`**:
   - `index.js`, `index.d.ts`
   - `k1/` (K1 qualification ladder, surface adapters)
3. **`packages/orchestrator/dist`**:
   - `index.js`, `index.d.ts`
   - `k2/`, `k3/`, `k4/`, `k5/` (Closed-loop orchestrator, tool registry, arena, independent verifier)
4. **`packages/prompts/dist`**:
   - `index.js`, `index.d.ts` (Managed prompt compiler)
5. **`apps/desktop/dist`**:
   - `main/` (Electron main, window manager, tray, background supervisor)
   - `preload/` (Strict contextBridge allowlisted preload APIs)
   - `renderer/` (Three.js WebGL Living HQ, Command Center, semantic DOM overlay)
   - `kernel-host/` (utilityProcess entrypoint, protocol handlers)
6. **`apps/server/dist`**:
   - `index.js`, `service.js`, `app.js` (Fastify REST and SSE server)
7. **`apps/web/dist`**:
   - `index.html`, `assets/index-*.js`, `assets/index-*.css` (Vite-bundled browser client)

---

## 3. Subpath Boundary Separation Proof

- `@gravitas/core` root exports domain models, events, FSM, and types consumable in both browser and Node.
- `@gravitas/core/kernel` exports the backend `WorkSessionKernel`, `DataRootLock`, and `SqliteWriter` specifically for Node and Electron utilityProcess runtimes.
- This ensures clean separation between browser-compatible interfaces and Node-native persistence mechanics without bundling leaks or dummy runtime abstractions.
