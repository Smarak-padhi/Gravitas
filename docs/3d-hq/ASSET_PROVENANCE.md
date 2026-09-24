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
| **Stylized Mascot Character Kit V2** | IN_REPO_PROCEDURAL | Antigravity / Gravitas Team | Custom procedural compound hierarchy (`CapsuleGeometry` sweater torsos, `SphereGeometry` heads, rounded limbs, articulated seating poses, denim trousers, and white sneakers) | MIT (Project Native) | `apps/web/src/hq3d/geometry/characters.ts` |
| **Asymmetric Floor 2 Workstations** | IN_REPO_PROCEDURAL | Antigravity / Gravitas Team | Custom procedural furniture with curved ultrawide monitors, portrait preview screens, sketch tablets, systems terminal arrays, ceramic mugs, and acoustic timber battens | MIT (Project Native) | `apps/web/src/hq3d/geometry/furniture.ts` |
| **7-Level Vertical Cutaway Tower** | IN_REPO_PROCEDURAL | Antigravity / Gravitas Team | Multi-level architectural slabs ($Y=0\dots 21.6\text{m}$), fluted travertine columns, walnut fascias, external glass elevator shaft with bronze cab | MIT (Project Native) | `apps/web/src/hq3d/geometry/architecture.ts` |
| **Natural Oak Plank Flooring** | IN_REPO_PROCEDURAL | Antigravity / Gravitas Team | Pure HTML5 Canvas 2D math synthesizer generating wood grain, bevel seams, and organic tone variance | MIT (Project Native) | `apps/web/src/hq3d/materials/textures.ts` |
| **Woven Wool Area Rug** | IN_REPO_PROCEDURAL | Antigravity / Gravitas Team | Pure HTML5 Canvas 2D micro-weave texture synthesizer | MIT (Project Native) | `apps/web/src/hq3d/materials/textures.ts` |
| **Abstract Studio Wall Art** | IN_REPO_PROCEDURAL | Antigravity / Gravitas Team | Pure HTML5 Canvas 2D composition generator rendering contemporary geometric abstract art | MIT (Project Native) | `apps/web/src/hq3d/materials/textures.ts` |
| **Architecture Whiteboard Canvas**| IN_REPO_PROCEDURAL | Antigravity / Gravitas Team | Pure HTML5 Canvas 2D technical flowchart and architecture diagram generator | MIT (Project Native) | `apps/web/src/hq3d/materials/textures.ts` |

---

## 3. Modification & Redistribution Notes
- All assets are self-contained within TypeScript source code.
- Zero external HTTP dependencies or asset-store CDNs required at runtime.
- Assets load synchronously with zero network latency, zero CORS concerns, and zero tracking.
- Memory footprint is under 400KB of raw geometry and procedural textures.
