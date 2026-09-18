# Architecture - System Context & Complete Mermaid Blueprint Catalog

> **Document Type:** Phase 0 Architecture Blueprint  
> **Status:** Authoritative  

This document consolidates the complete architectural diagrams for the Multi-Agent Computer Operating System.

---

## 1. Overall System Context Diagram

```mermaid
flowchart TD
    User([Human Engineer]) <-->|Interactive UI & Approvals| TauriApp[Tauri 2.x Command Center UI]
    
    subgraph LocalMachine [Local Windows 11 Developer Workstation]
        TauriApp <-->|Rust IPC / WebSocket| CoreEngine[Durable Task Orchestrator & FSM]
        
        CoreEngine <--> SQLite[(Embedded SQLite: State & Event Store)]
        CoreEngine <--> GitMgr[Git Worktree & Merge Queue Manager]
        CoreEngine <--> Router[Capability Router & Policy Guard]
        
        subgraph IsolationLayer [Isolated Execution Surfaces]
            Worktree1[.worktrees/task-101 / Claude Code]
            Worktree2[.worktrees/task-102 / Codex CLI]
            PlaywrightCtx[Playwright Headless Browser Context]
        end
        
        GitMgr --> Worktree1
        GitMgr --> Worktree2
        
        Router --> Worktree1
        Router --> Worktree2
        Router --> PlaywrightCtx
        
        subgraph EvidenceVerification [Proof Verification Engine]
            VitestRunner[Deterministic Test Runner]
            DOMChecker[Playwright DOM & Viewport Inspector]
            VisualCritic[Multimodal LLM Visual Critic]
        end
        
        Worktree1 --> VitestRunner
        PlaywrightCtx --> DOMChecker
        PlaywrightCtx --> VisualCritic
        
        VitestRunner -->|Proof Bundle| CoreEngine
        DOMChecker -->|Proof Bundle| CoreEngine
        VisualCritic -->|Proof Bundle| CoreEngine
    end
    
    subgraph ExternalEcosystem [External Services & Model APIs]
        ClaudeAPI[Anthropic API: Claude 3.5 / 4.x]
        OpenAIAPI[OpenAI API: o1 / o3 / GPT-4o]
        GitHubSaaS[GitHub REST API / Octokit]
        MCPRegistry[Local & Remote MCP Servers]
    end
    
    Worktree1 <--> ClaudeAPI
    Worktree2 <--> OpenAIAPI
    Router <--> GitHubSaaS
    Router <--> MCPRegistry
```

---

## 2. Complete Task Lifecycle FSM State Diagram

```mermaid
stateDiagram-v2
    [*] --> PLANNED: Goal parsed into Task DAG
    PLANNED --> BLOCKED: Dependencies pending
    PLANNED --> READY: All dependencies DONE
    BLOCKED --> READY: Dependencies resolved
    
    READY --> RUNNING: Agent assigned & Worktree created
    RUNNING --> WAITING_AGENT: Subagent delegation
    RUNNING --> WAITING_TOOL: Long-running async action
    RUNNING --> WAITING_HUMAN: L4 Critical action or Approval Gate
    
    WAITING_AGENT --> RUNNING: Subagent returned
    WAITING_TOOL --> RUNNING: Tool completed
    WAITING_HUMAN --> RUNNING: Human approved
    WAITING_HUMAN --> CANCELLED: Human rejected
    
    RUNNING --> VERIFYING: Worker claims completion
    VERIFYING --> RUNNING: Verifier REJECTED (retries < max)
    VERIFYING --> FAILED: Verifier REJECTED (retries >= max)
    VERIFYING --> DONE: All Acceptance Criteria satisfied with Evidence
    
    DONE --> [*]: Worktree merged to base
    FAILED --> [*]: Worktree preserved for audit
    CANCELLED --> [*]: Worktree dismantled
```

---

## 3. Capability Routing Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    participant A as Agent in Worktree
    participant R as Capability Router
    participant SEC as Security Policy Engine
    participant P_API as Native REST API
    participant P_MCP as MCP Server
    participant P_CLI as Developer CLI
    
    A->>R: invoke_capability(name="github.create_pull_request", params={...})
    R->>SEC: check_permission(agentId, taskTier, capabilityRisk)
    
    alt Permission Denied
        SEC-->>R: DENIED (Requires L3 EXTERNAL)
        R-->>A: CapabilityError("Insufficient permissions")
    else Permission Approved
        SEC-->>R: APPROVED (Scoped token issued)
        R->>R: Evaluate Provider Hierarchy
        alt Native API Provider Available (Priority 1)
            R->>P_API: execute(params, scopedToken)
            P_API-->>R: Result {pr_url, status: 201}
        else Fallback to MCP Server (Priority 2)
            R->>P_MCP: tools/call(name, params)
            P_MCP-->>R: MCPResult
        else Fallback to CLI (Priority 3)
            R->>P_CLI: run(gh pr create ...)
            P_CLI-->>R: CLI stdout
        end
        R-->>A: CapabilityResult(data)
    end
```

---

## 4. Git Worktree Isolation & Merge Queue Strategy

```mermaid
flowchart TD
    Main[Base Branch: main / 000] -->|git worktree add| WT1[.worktrees/task-101
branch: task/T-101]
    Main -->|git worktree add| WT2[.worktrees/task-102
branch: task/T-102]
    
    WT1 -->|Agent Edits & Commits| C1[Commit: checkpoint T-101]
    WT2 -->|Agent Edits & Commits| C2[Commit: checkpoint T-102]
    
    C1 -->|claim_completion + Verifier Pass| MQ[Merge Queue Engine]
    C2 -->|claim_completion + Verifier Pass| MQ
    
    MQ -->|Pre-Merge Conflict Test| MergeSim{Clean Merge?}
    MergeSim -- Yes --> MainMerge[Merge commit into Base]
    MergeSim -- Conflict --> ConflictRebase[Rebase task branch on latest base]
    ConflictRebase --> WorkerRecheck[Worker resolves conflict in worktree]
    WorkerRecheck --> MQ
    MainMerge --> Cleanup[git worktree remove]
```

---

## 5. Event Sourcing Bus Architecture

```mermaid
flowchart LR
    subgraph Producers [Event Producers]
        E_Orch[Orchestrator FSM]
        E_Agent[Agent Harness]
        E_Tool[Capability Tool]
        E_Verifier[Verifier Subsystem]
    end
    
    subgraph EventStore [Durable SQLite Append-Only Log]
        Log[(system_events Table)]
    end
    
    subgraph Consumers [Reactive Consumers]
        C_UI[Tauri Live Webview / SSE]
        C_Audit[Security Audit Trail]
        C_Meter[Real-Time Cost Meter]
        C_FSM[Dependency Graph Resolver]
    end
    
    Producers -->|Publish Event| Log
    Log -->|Stream Event| C_UI
    Log -->|Stream Event| C_Audit
    Log -->|Stream Event| C_Meter
    Log -->|Trigger Transition| C_FSM
```
