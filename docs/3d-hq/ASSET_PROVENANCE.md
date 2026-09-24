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
| **Wave 12F Hero Frontend Desk** | IN_REPO_AUTHORED | Antigravity / Gravitas Team | Solid white oak beveled desktop, telescoping steel lift columns, dual brass glides, under-desk cable raceway, flush brass status indicator | MIT (Project Native) | `apps/web/src/hq3d/geometry/heroBay/heroFrontendBay.ts` |
| **Wave 12F Hero Task Chair** | IN_REPO_AUTHORED | Antigravity / Gravitas Team | 5-star spider base with twin nylon casters, gas strut, tilt control lever, waterfall cushion, contoured lumbar backrest, and 3D armrests | MIT (Project Native) | `apps/web/src/hq3d/geometry/heroBay/heroFrontendBay.ts` |
| **Wave 12F Hero Dual Displays** | IN_REPO_AUTHORED | Antigravity / Gravitas Team | 34" curved ultrawide with top aluminum light bar and 24" portrait display on articulated gas-spring desk mounting arm | MIT (Project Native) | `apps/web/src/hq3d/geometry/heroBay/heroFrontendBay.ts` |
| **Wave 12F Hero Peripherals & Props** | IN_REPO_AUTHORED | Antigravity / Gravitas Team | Low-profile 75% aluminum mechanical keyboard with coiled aviator cable, sculpted mouse with knurled brass wheel, angled graphics tablet + magnetic stylus, handcrafted ceramic mug, linen dot-grid notebook + brass pen, and cantilever task lamp | MIT (Project Native) | `apps/web/src/hq3d/geometry/heroBay/heroFrontendBay.ts` |
| **Wave 12F Hero Frontend Engineer Character** | IN_REPO_AUTHORED | Antigravity / Gravitas Team | Authored miniature scale human figure with ovoid skull, soft jaw, almond eyes with double catchlights, sweeping bangs and layered bob, designer over-ear headphones, tailored lavender knit sweater, articulated arms resting over keyboard/mouse, seated denim trousers, and white sneakers | MIT (Project Native) | `apps/web/src/hq3d/geometry/heroBay/heroCharacter.ts` |
| **Wave 12F Hero Bay Architecture** | IN_REPO_AUTHORED | Antigravity / Gravitas Team | White oak herringbone floor inlay with brass transition trim and floor-to-ceiling vertical fluted oak acoustic batten slat wall | MIT (Project Native) | `apps/web/src/hq3d/geometry/heroBay/heroFrontendBay.ts` |
| **Wave 12F Hero Procedural Texture Synthesizers** | IN_REPO_PROCEDURAL | Antigravity / Gravitas Team | Canvas 2D math synthesizers for solid white oak grain, herringbone parquet, woven felt desk mat, active/idle ultrawide IDE code canvas, active/idle portrait preview screen, and UI wireframe sketch slate | MIT (Project Native) | `apps/web/src/hq3d/materials/textures.ts` |

---

## 3. Modification & Redistribution Notes
- All assets are self-contained within TypeScript source code and procedural generation routines.
- Zero external HTTP dependencies, CDNs, or external binary glTF files required at runtime.
- Assets load synchronously with zero network latency, zero CORS concerns, and zero tracking.
- Memory footprint across all hero geometries and procedural textures is under 600KB.

