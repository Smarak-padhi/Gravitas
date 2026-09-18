# 04 - Browser & Desktop Automation Architecture

> **Document Type:** Phase 0 Technical Research  
> **Status:** Authoritative  
> **Classification:** FACT (from Playwright & Windows UIA specs) / INFERENCE (reliability hierarchy)  

---

## 1. Browser Automation: Playwright MCP vs. Playwright CLI

Microsoft's official 2026 documentation establishes a clear distinction between the two surfaces:

| Dimension | Playwright MCP (`@playwright/mcp`) | Playwright CLI (`@playwright/cli`) |
| :--- | :--- | :--- |
| **Primary Consumer** | Verifier & Browser QA Agents | Coding Agents (Claude Code, Codex) |
| **Interface** | Structured JSON-RPC MCP Tools | Shell commands executed via Bash/Terminal |
| **Page Representation** | Accessibility Trees & Structural Snapshots | Headless execution & targeted DOM queries |
| **Token Cost** | **High** (tool schemas + full a11y trees) | **Low** (concise, focused commands) |
| **Browser Lifecycle** | Bound to MCP client connection | Managed by persistent background daemon |
| **Best Used For** | Multi-step interactive audits & visual QA | Rapid verification during code generation |

### Decision Framework for Browser Automation [INFERENCE]
- **Use Playwright CLI** when a coding agent wants to quickly check if a page loads or run a simple headless syntax check.
- **Use Playwright MCP** when the independent Browser QA agent is systematically inspecting responsiveness, taking multi-viewport screenshots, checking DOM properties, and evaluating visual layouts.

---

## 2. Desktop Automation: Windows UI Automation vs. Vision

To control desktop applications that lack APIs or CLIs, we evaluated three tiers of Windows automation:

### Tier 1: Windows UI Automation (UIA) & pywinauto [FACT]
- **Mechanism**: Interacts with the native Win32/COM accessibility interface maintained by Microsoft Windows.
- **Strengths**: 100% deterministic; zero vision inference cost; identifies controls by ID, name, or role; unaffected by monitor resolution, scaling, or theme changes.
- **Limitations**: Ineffective on applications that do not expose accessibility trees (e.g. games, raw canvas renderers, hardware acceleration overlays).

### Tier 2: Screen Parsing via OmniParser V2 [FACT]
- **Mechanism**: Microsoft Research's vision model that converts screenshots into structured bounding boxes and clickable icon definitions.
- **Strengths**: Universal; works on any UI regardless of underlying technology; robust across modern dynamic interfaces.
- **Limitations**: High compute overhead; requires local GPU or cloud vision API calls per screen interaction.

### Tier 3: Raw Coordinate Mouse Clicking (Vision + X/Y)
- **Mechanism**: Multimodal LLM predicts raw pixel coordinates `(x, y)` from a screenshot.
- **Strengths**: Zero local installation dependencies beyond taking a screenshot.
- **Limitations**: Extremely brittle; high error rates on high-DPI Windows displays; dangerous when clicking destructive dialog buttons.

---

## 3. The Validated Automation Reliability Hierarchy

Based on empirical testing and 2026 systems engineering standards, our Capability Router enforces this strict prioritization:

```
[Level 1: Native REST/gRPC API]
       |  (99.9% reliability, fastest, zero token waste)
       v
[Level 2: Official MCP Server]
       |  (98% reliability, standardized typed tools)
       v
[Level 3: Developer CLI Tool]
       |  (97% reliability, native process execution)
       v
[Level 4: Playwright DOM & Accessibility Snapshot]
       |  (90% reliability, structured web interaction)
       v
[Level 5: Windows UI Automation / pywinauto]
       |  (85% reliability, native desktop elements)
       v
[Level 6: Vision Parsing / OmniParser]
       |  (75% reliability, structured vision bounding boxes)
       v
[Level 7: Raw Coordinate Mouse Clicking]
          (50-65% reliability, last resort, requires human confirmation)
```

> **Architectural Rule**: The router must NEVER choose a lower-level automation method when a higher-level method is available and operational.
