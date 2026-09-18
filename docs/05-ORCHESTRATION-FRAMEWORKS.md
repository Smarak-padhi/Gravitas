# 05 - Multi-Agent Orchestration Frameworks & Durable Execution

> **Document Type:** Phase 0 Technical Research  
> **Status:** Authoritative  
> **Classification:** FACT / INFERENCE (engine selection)  

---

## 1. The Orchestration Dilemma: "The Brain" vs. "The Muscle"

In multi-agent systems engineering, two distinct paradigms have emerged:

1. **Agent State Graphs ("The Brain")**: Frameworks like **LangGraph**, **AutoGen**, and **CrewAI** manage LLM reasoning loops, tool dispatching, prompt routing, and cyclic node transitions.
2. **Durable Execution Engines ("The Muscle")**: Systems like **Temporal**, **Inngest**, and **DBOS** guarantee fault tolerance, activity retries, persistent event sourcing, and crash survivability.

### 2026 Architectural Consensus [FACT]
Agent frameworks are excellent for modeling the non-deterministic reasoning loops of individual agents, but brittle when relied upon as the sole persistence and orchestration substrate. Conversely, durable workflow engines guarantee industrial-grade execution but are model-agnostic.

---

## 2. Framework Benchmark Matrix

| Feature / Dimension | LangGraph | Temporal | CrewAI | AutoGen v0.4+ | Semantic Kernel | Google ADK | PydanticAI | Embedded SQLite State Machine |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Primary Architecture**| Cyclic State Graph| Durable Event Log| Role-Playing Crew| Event-Driven Actors| Enterprise SDK | Modular Agent Teams| Type-Safe Agents | Event-Sourced FSM |
| **Durable Persistence** | Checkpointers (SQL)| Native Replay Log| In-Memory / Redis| In-Memory / State | Custom Store | Vertex / Cloud | In-Memory | SQLite WAL Engine |
| **Crash Recovery** | Resumes node [FACT]| Exact Replay [FACT]| Manual / None | Session Re-init | Manual / State | Cloud checkpoint | Manual | Exact Replay [FACT] |
| **Local-First Fit** | High | Low (Docker req) | High | Medium | Medium | Low (GCP dep) | High | **Optimal (Embedded)**|
| **Human-in-the-Loop** | Native Breakpoints | Native Signals | Basic Prompting | Human Input Mode | Filters / Hooks | ADK Web UI | Interrupts | Native Event Gates |
| **Subprocess Agent Wrap**| Custom Nodes | Activities | Tools only | Custom Agents | Plugins | Custom Workers | Tool calls | First-Class Workers |
| **Memory / Footprint** | ~50MB RAM | Heavy Cluster | ~40MB RAM | ~60MB RAM | ~80MB RAM | Cloud SDK | ~30MB RAM | **< 15MB RAM** |

---

## 3. The Core Architectural Decision

### Question: Do we use an off-the-shelf agent framework, a Temporal cluster, or build an Embedded Durable Engine?

#### Evaluation of Options:
1. **Using Temporal directly**:
   - *Pros*: Bulletproof replay, battle-tested distributed durability.
   - *Cons*: Requires running an external Temporal server, PostgreSQL database, and Docker daemon on the user's local Windows machine. Violates our "zero-friction local-first" requirement.
2. **Using CrewAI / AutoGen v0.2**:
   - *Pros*: Quick prototyping.
   - *Cons*: Fragile state recovery, uncontrolled agent-to-agent conversational drift, lack of first-class Git worktree lifecycle hooks.
3. **Recommended Architecture: Embedded SQLite Durable State Engine**:
   - *Design*: We construct a lightweight, embedded TypeScript/Rust event-sourcing engine backed by SQLite (WAL mode).
   - *Mechanism*: Inspired by Temporal's activity model and LangGraph's cyclic state graphs. Every task transition, tool execution, and agent heartbeat is an immutable row in an append-only `events` table.
   - *Result*: Zero external infrastructure dependencies. Instant startup on Windows. 100% crash-resilient (rebuilding complete state from the event log upon restart).
