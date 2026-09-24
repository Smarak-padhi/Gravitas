# Gravitas 3D Headquarters — Asset Provenance & Licensing Register
**Wave:** 12K-R (Living HQ Visual Rebuild)
**Status:** 100% In-Repo Authored Procedural Three.js Assets

---

## 1. Asset Strategy & Licensing Policy
To ensure zero licensing ambiguity, zero third-party redistribution constraints, and optimal runtime performance (no 100MB external asset downloads or opaque binary meshes), all 3D geometries, materials, procedural textures, and mascot character kits in Gravitas 3D Headquarters are **100% custom-authored procedural assets** built using Three.js core geometries and high-performance HTML5 Canvas 2D procedural texture synthesizers.

No third-party commercial GLB/GLTF models, unverified downloads, or copyrighted meshes have been introduced into the repository.

---

## 2. Inventory of Authored Assets

| Asset Name | Type | Creator | Source / Generation Method | License / Rights | Local Path |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Stylized Mascot Character Kit** | 3D Meshes & Materials | Antigravity / Gravitas Team | Custom procedural compound hierarchy (`SphereGeometry`, `CylinderGeometry`, `BoxGeometry`) with stylized eyes, knit sweaters, denim, and sneakers | MIT (Project Native) | `apps/web/src/hq3d/geometry/characters.ts` |
| **Architectural Workstations V2** | 3D Meshes & Materials | Antigravity / Gravitas Team | Custom procedural furniture with scaled 0.72m slim displays, aluminum laptop, ceramic mugs, task lamps | MIT (Project Native) | `apps/web/src/hq3d/geometry/furniture.ts` |
| **Natural Oak Plank Flooring** | 2D Procedural Texture | Antigravity / Gravitas Team | Pure HTML5 Canvas 2D math synthesizer generating wood grain, bevel seams, and organic tone variance | MIT (Project Native) | `apps/web/src/hq3d/materials/textures.ts` |
| **Woven Wool Area Rug** | 2D Procedural Texture | Antigravity / Gravitas Team | Pure HTML5 Canvas 2D micro-weave texture synthesizer | MIT (Project Native) | `apps/web/src/hq3d/materials/textures.ts` |
| **Abstract Studio Wall Art** | 2D Procedural Texture | Antigravity / Gravitas Team | Pure HTML5 Canvas 2D composition generator rendering contemporary geometric abstract art | MIT (Project Native) | `apps/web/src/hq3d/materials/textures.ts` |
| **Architecture Whiteboard Canvas**| 2D Procedural Texture | Antigravity / Gravitas Team | Pure HTML5 Canvas 2D technical flowchart and architecture diagram generator | MIT (Project Native) | `apps/web/src/hq3d/materials/textures.ts` |
| **Architectural Cutaway Envelope** | 3D Meshes & Materials | Antigravity / Gravitas Team | Charcoal facade cladding, open front cutaway apertures, glass elevator shaft tower | MIT (Project Native) | `apps/web/src/hq3d/geometry/architecture.ts` |

---

## 3. Modification & Redistribution Notes
- All assets are self-contained within TypeScript source code.
- Zero external HTTP dependencies or asset-store CDNs required at runtime.
- Assets load synchronously with zero network latency, zero CORS concerns, and zero tracking.
- Memory footprint is under 400KB of raw geometry and procedural textures.
