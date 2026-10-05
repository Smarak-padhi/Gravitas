# SA0 Bounded Inventory Scope Specification

## 1. Principle of Bounded Inventory
The goal of SA0 is **not** to solve every unknown across all future projects, nor to ingest external skills into runtime. Rather, SA0 establishes a strictly bounded, verifiable perimeter of all capability assets, historical projects, installed skills/plugins, MCP servers, and referenced external sources.

The SA0 exit criterion is satisfied when:
**100% of discovered and declared sources within the bounded SA0 scope are classified or explicitly marked unresolved.**

## 2. Defined Ingestion Perimeter

The bounded SA0 scope encompasses exactly seven concrete partitions:

1. **Partition A: Installed Skill Repositories (`C:\Users\smara\.gemini\`)**
   - 72 GSD Core workflow skills (`gsd-*`)
   - 22 Android / Kotlin Jetpack Compose skills (`android-*`)
   - 26 iOS / Swift / Apple ecosystem skills (`ios-*`, `swift-*`, etc.)
   - 1 Cross-platform graph analysis skill (`graphify`)
   - 6 Ponytail plugin skills (`ponytail`, `ponytail-audit`, `ponytail-debt`, `ponytail-gain`, `ponytail-help`, `ponytail-review`)
   - 9 Antigravity builtin skills (`agy-customizations`, `antigravity_guide`, `automation`, `generative_ui`, `migrate-workflows`, `permissioned-github`, `plugin`, `ui-extension`, `ui-plugin-navigation`)
   - *Total Skill Sources in Partition A*: 136

2. **Partition B: Local MCP Servers (`C:\Users\smara\.gemini\antigravity\mcp\`)**
   - `playwright` (Browser automation / E2E testing)
   - `stitch` (Visual design and screen generation)
   - `reticle` (UI target tracking / browser inspection)
   - *Total Sources in Partition B*: 3

3. **Partition C: Agent Workflows & Extensions**
   - CodeRabbit VS Code Extension (`coderabbit.coderabbit-vscode@0.21.6`)
   - Ralph Loop Extension (`alexj11324.ralph-loop-for-antigravity-updated@0.7.43`)
   - Roo Code Extension (`rooveterinaryinc.roo-cline@3.54.0`)
   - Antigravity Native Subagent Engine (`define_subagent`, `invoke_subagent`, reactive wakeup)
   - *Total Sources in Partition C*: 4

4. **Partition D: Historical Production & Experimental Projects (`C:\Users\smara\Desktop\`)**
   - `Multi-agent` (GRAVITAS itself — K0–K5 durable runtime, D0–D4 Living HQ)
   - `ember-and-root` (Tactile focus journal, RLS schemas, tactile motion contract)
   - `o-travelz` (Multi-platform tourism transit, bilingual localization, Ponytail audits)
   - `hospitality-aama` (3D WebGL dining spatial theatre, high-mass physics)
   - `Algoryxz` (Canonical theatre archive, WebGL performance contracts)
   - `sherlock` (Async network OSINT probing, Python CLI runner)
   - `SIH2026` (Smart India Hackathon problem analysis, reality gates)
   - *Total Sources in Partition D*: 7

5. **Partition E: Historical Gap Projects (`C:\Users\smara\Desktop\`)**
   - `nemotron-cline-test` (Local model evaluation experiment with Cline)
   - `DSW 1` (Academic coursework and assignment labs)
   - `MCSD` (Academic lab exercises and notes)
   - `IIT BBSR` (Temporary research / lab directory)
   - `New folder` (Binary DLL scratch directory)
   - *Total Sources in Partition E*: 5

6. **Partition F: External Candidate Repositories**
   - `vercel-labs/agent-skills` (Curated React/Next.js agent guidelines)
   - `VoltAgent/awesome-design-md` (Curated repository of DESIGN.md files)
   - `Leonxlnx/taste-skill` (Visual taste heuristics & screenshot-to-code)
   - `arena-skiIl/.github` (Competitive agent arena concepts; binary quarantined)
   - `Obscura` (Headless browser automation tool candidate)
   - *Total Sources in Partition F*: 5

7. **Partition G: External Design & Component Reference Sources**
   - `21st.dev` (Contemporary Tailwind/React component discovery)
   - `React Bits` (Interactive motion and physics snippets)
   - `Skiper UI` (Tactile UI micro-interaction references)
   - `Codrops` (Experimental web art direction and typography)
   - `shadcn/ui` (Copy-paste application primitives)
   - `Radix Primitives` (Headless unstyled WAI-ARIA accessibility primitives)
   - `Anime.js` (Lightweight JavaScript animation engine)
   - `Three.js` (WebGL 3D rendering library)
   - `ThreeUI` (Spatial 3D UI layout overlay concepts)
   - *Total Sources in Partition G*: 9

## 3. Perimeter Cardinality
- Total Candidate Sources Inventoried: **169 sources**
- Partition Coverage: 100% accounted for with zero unclassified items.
