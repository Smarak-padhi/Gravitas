# 13 - Build vs. Buy vs. Adapt Matrix

> **Document Type:** Phase 0 Technical Research  
> **Status:** Authoritative  
> **Classification:** FACT / INFERENCE  

---

## 1. Component Strategy: Avoid Reinventing Wheels

To ship a rock-solid V0 in record time, we reuse mature open-source developer infrastructure while focusing proprietary engineering strictly on our core differentiator: **Proof-Carrying Orchestration and Evidence Verification**.

| System Component | Strategy | Recommended Selection | Architectural Rationale |
| :--- | :--- | :--- | :--- |
| **Desktop Application Container**| **BUY (OSS)** | **Tauri 2.x** | Fast, native Windows WebView2, 50MB RAM, secure Rust IPC. [FACT] |
| **Task Graph Visualization** | **BUY (OSS)** | **React Flow (`@xyflow/react`)** | Standard for node graphs; customizable nodes and real-time state. [FACT] |
| **Browser Automation Engine** | **BUY (OSS)** | **Playwright + `@playwright/cli`**| Microsoft's battle-tested browser automation with full Windows support. [FACT] |
| **Coding Agent Harnesses** | **ADAPT** | **Claude Code, Codex CLI, Aider** | Wrap their existing non-interactive CLI flags; do not build a code LLM from scratch. [INFERENCE] |
| **Durable Task & Event Store** | **BUILD** | **Custom SQLite Event Engine** | Temporal is too heavy for local Windows; custom embedded SQLite FSM is <15MB and zero-dependency. [INFERENCE] |
| **Git Worktree Isolation Manager**| **BUILD** | **Native Git Worktree Wrapper** | Bespoke integration with our task FSM, branch naming, and merge queue. [INFERENCE] |
| **Evidence & Verification Loop** | **BUILD** | **Proprietary Proof Engine** | Our primary competitive differentiator: tying Acceptance Criteria to cryptographic evidence. [INFERENCE] |
| **Telemetry & Cost Meter** | **ADAPT** | **OpenTelemetry Semantic Convs**| Export standard spans; calculate local costs using static pricing JSON. [FACT] |
