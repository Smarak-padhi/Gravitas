# SA0 License & Provenance Audit

## License Verification Principles
1. Public availability on GitHub or npm does NOT imply unrestricted redistribution or copying.
2. In SA0, every candidate source is audited to determine its governing license, confidence level, and whether atomic rule extraction or code copying is legally permissible.
3. Classifications:
   - `LICENSE_VERIFIED`: Confirmed via official LICENSE file or package manifest.
   - `LICENSE_UNCLEAR`: Source text contains ambiguous or missing license headers.
   - `PROPRIETARY`: Internal user project or closed platform contract.
   - `QUARANTINED`: Suspicious distribution or closed proprietary binaries.

---

## Audit Ledger

| Candidate / Cluster | Declared License | License Confidence | Source Owner / Authority | Redistribution & Extraction Implications |
| :--- | :--- | :--- | :--- | :--- |
| **Ponytail Suite** | MIT License | `LICENSE_VERIFIED` | Dietrich Gebert (`@dietrichgebert`) | Full extraction and adaptation permitted with attribution. |
| **GSD Core Suite** | MIT License | `LICENSE_VERIFIED` | OpenGSD (`@opengsd/gsd-core`) | Full extraction and adaptation permitted with attribution. |
| **Android / Kotlin Skills** | Apache-2.0 | `LICENSE_VERIFIED` | Google Android Team / AOSP | Full extraction and adaptation permitted under Apache-2.0 terms. |
| **iOS / Swift Skills** | Apple Public Documentation | `LICENSE_VERIFIED` | Apple Inc. | Conceptual extraction permitted; do not reproduce proprietary assets. |
| **Antigravity Builtins** | Google Proprietary | `LICENSE_VERIFIED` | Google DeepMind / Antigravity | Environment reference only; runtime contracts belong to host platform. |
| **Graphify** | Proprietary / Internal | `LICENSE_VERIFIED` | Local Antigravity Configuration | Internal capability extraction permitted. |
| **Playwright MCP** | Apache-2.0 | `LICENSE_VERIFIED` | Microsoft | Tool usage permitted under Apache-2.0. |
| **Stitch MCP** | Proprietary | `LICENSE_VERIFIED` | Stitch Platform | Remote tool execution only; no decompilation or reverse engineering. |
| **Reticle MCP** | Proprietary | `LICENSE_VERIFIED` | Reticle Tooling | Internal tool execution only. |
| **CodeRabbit VS Code** | Commercial Proprietary | `LICENSE_VERIFIED` | CodeRabbit AI | Tool execution only; no extraction of proprietary engine weights. |
| **Ralph Loop VS Code** | MIT License | `LICENSE_VERIFIED` | Alex J (`alexj11324`) | Open-source extension runner. |
| **Roo Code VS Code** | Apache-2.0 | `LICENSE_VERIFIED` | Roo Veterinary Inc. | Open-source extension runner. |
| **Multi-agent (Gravitas)** | MIT License | `LICENSE_VERIFIED` | User Repository | Sovereign user codebase. Full extraction permitted. |
| **Ember & Root** | Proprietary | `LICENSE_VERIFIED` | User Repository | Sovereign user codebase. Universal design rules transferable. |
| **O-TRAVELZ** | Proprietary | `LICENSE_VERIFIED` | User Repository | Sovereign user codebase. Universal UI tokens transferable. |
| **Hospitality-AAMA** | Proprietary | `LICENSE_VERIFIED` | User Repository | Sovereign user codebase. 3D WebGL contracts transferable. |
| **Algoryxz** | Proprietary | `LICENSE_VERIFIED` | User Repository | Sovereign user codebase. Theatre archive contracts transferable. |
| **Sherlock** | MIT License | `LICENSE_VERIFIED` | Sherlock Project | Open-source CLI runner. |
| **SIH2026** | Internal Academic | `LICENSE_VERIFIED` | User Research | Sovereign analysis. Evaluation frameworks transferable. |
| **Vercel Agent Skills** | Apache-2.0 | `LICENSE_VERIFIED` | Vercel Labs (`vercel-labs`) | Open-source Next.js/React guidelines; extraction permitted. |
| **Awesome-Design-MD** | MIT License | `LICENSE_VERIFIED` | VoltAgent (`VoltAgent`) | Collection of public guidelines; reference extraction permitted. |
| **Taste Skill** | MIT License | `LICENSE_VERIFIED` | Leonxlnx (`Leonxlnx`) | Heuristic prompts; extraction permitted with attribution. |
| **Arena-SkiIl** | Non-Standard / Binary | `QUARANTINED` | arena-skiIl | Closed binary distribution; DO NOT EXTRACT OR RUN CODE. |
| **Obscura** | MIT / Public | `LICENSE_VERIFIED` | Open Source Crawler | Separate tool qualification under K1. |
| **shadcn/ui** | MIT License | `LICENSE_VERIFIED` | shadcn | Copy-paste UI code; full integration permitted. |
| **Radix Primitives** | MIT License | `LICENSE_VERIFIED` | WorkOS | Headless primitives; full integration permitted. |
| **Three.js** | MIT License | `LICENSE_VERIFIED` | Ricardo Cabello (Mr.doob) | Open-source 3D library; active dependency. |
| **Anime.js** | MIT License | `LICENSE_VERIFIED` | Julian Garnier | Open-source animation engine. |
| **Codrops** | CC BY 4.0 | `LICENSE_VERIFIED` | Codrops / Tympanus | Reference inspiration only; attribution required for direct code. |
| **21st.dev / Skiper UI** | Community Varied | `LICENSE_UNCLEAR` | 21st.dev Authors | Snippet-level inspection required before code adoption. |
