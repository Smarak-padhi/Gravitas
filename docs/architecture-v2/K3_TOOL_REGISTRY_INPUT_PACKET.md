# GRAVITAS K3 — TOOL REGISTRY INPUT PACKET
## Handoff from Frozen Wave K2 to Future Wave K3

**Source Wave**: K2 (Supervisor ↔ Worker Closed-Loop Orchestration)  
**Target Wave**: K3 (Tool Registry, MCP Server Discovery, Qualification & Capability Model)  
**State**: INPUT_PACKET_ONLY — K3 IMPLEMENTATION IS STRICTLY NOT AUTHORIZED  

---

## 1. Upstream Frozen Contracts Delivered by K2

When Wave K3 is authorized by human approval, it will build upon:

1. **Closed-Loop Orchestration Harness (`ClosedLoopOrchestrator`)**:
   - The verified Golden Loop: `Objective -> Supervisor -> Task -> Executor/Harness -> K1 Dispatch -> Worker Execution -> K0 Durable Result -> Supervisor Evaluation -> Terminal State`.
2. **Canonical State Authority (`K0 WorkSession Kernel`)**:
   - All tool invocations and registry operations must preserve the single-writer invariant: `TOOL != CANONICAL DATABASE WRITER`.
3. **Execution-Surface Boundary (`K1 Harness Layer`)**:
   - Distinct structural kinds (`PROCESS`, `API`, `DAEMON`, `GATEWAY`).
   - Tools are invoked via execution surfaces; they are not themselves execution surfaces.
   - Preserves: `CAPABILITY != TOOL != TRANSPORT != CREDENTIAL != AUTHORITY`.
4. **Zero-Spend Financial Gate**:
   - Any external tool or MCP server requiring paid utility billing or uncertain pricing is classified `UNKNOWN_COST` and fails closed.
5. **Human Sovereignty Boundary**:
   - Consequential or destructive tool mutations (filesystem delete outside worktree, external publishing, database migrations) strictly require `WAIT_FOR_HUMAN` gates.

---

## 2. K3 Scope Boundaries & Responsibilities

Wave K3 will address:
1. Discovery and cataloging of internal tools and external MCP servers.
2. Formal Tool Qualification ladder (`DISCOVERED -> PROBED -> SCHEMA_PINNED -> QUALIFIED`).
3. Cryptographic schema hashing and drift detection.
4. Least-privilege authority scoping (`AuthorityClass`).
5. Mediation of tool outputs as untrusted data (`[UNTRUSTED_TOOL_DATA]`), preventing prompt injection.

---

## 3. Strict Prohibitions for K3

- Do NOT implement automatic installation of external MCP packages during K3.
- Do NOT begin Phase K4 Architecture Arena or Phase D Living HQ UI.
- Do NOT grant autonomous execution to quarantined tools (e.g. `lbjlaq/Antigravity-Tools-LS`).
