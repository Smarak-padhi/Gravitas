# 10 - Telemetry, Observability & Live Event Streaming

> **Document Type:** Phase 0 Technical Research  
> **Status:** Authoritative  
> **Classification:** FACT (OpenTelemetry specs) / INFERENCE (live streaming)  

---

## 1. OpenTelemetry Semantic Conventions for Multi-Agent Systems

Our observability subsystem complies with the **OpenTelemetry GenAI Semantic Conventions v1.31+** [FACT]:

```
Root Trace: Goal Execution ("Finish ALGORYXZ Gate 1")
   │
   ├── Span: Task Planning (Agent: Planner / Model: claude-3-5-sonnet)
   │      └── Event: gen_ai.choice (Task DAG generated)
   │
   ├── Span: Task T-101 (Worker: Codex / Worktree: .worktrees/T-101)
   │      ├── Span: Tool Execution (filesystem.read)
   │      ├── Span: Tool Execution (terminal.run: npm test)
   │      └── Metric: gen_ai.usage.cost ($0.042)
   │
   └── Span: Verification (Verifier: Playwright / Viewport: 390x844)
          ├── Event: Screenshot Captured (SHA256: 4f9a...)
          └── Event: Verification Passed
```

---

## 2. Real-Time Event Bus Schema

All orchestrator events stream to the Command Center UI via Server-Sent Events (SSE) or local WebSocket IPC:

```typescript
export interface SystemTelemetryEvent {
  id: string;                         // UUIDv7
  timestamp: string;                  // ISO8601
  projectId: string;
  taskId: string | null;
  agentId: string | null;
  eventType: SystemEventType;
  payload: Record<string, any>;
  costUsd?: number;
  tokensConsumed?: {
    prompt: number;
    completion: number;
  };
}

export type SystemEventType =
  | 'TASK_DAG_UPDATED'
  | 'TASK_STATUS_CHANGED'
  | 'WORKTREE_PROVISIONED'
  | 'AGENT_SPAWNED'
  | 'TOOL_CALL_DISPATCHED'
  | 'TERMINAL_OUTPUT_CHUNK'
  | 'BROWSER_FRAME_CAPTURED'
  | 'EVIDENCE_COLLECTED'
  | 'VERIFICATION_DECIDED'
  | 'HUMAN_APPROVAL_PROMPTED'
  | 'GIT_CHECKPOINT_COMMITTED'
  | 'TASK_MERGED_TO_BASE';
```

---

## 3. Local-First Metrics & Cost Tracking

- **Real-Time Token & Cost Metering**: Every LLM invocation records model name, input tokens, cached tokens, and output tokens. Real-time dollar costs are calculated against a local pricing catalog (`pricing.json`) and displayed live in the Command Center UI.
- **Zero Cloud Leakage**: Telemetry remains stored locally in SQLite (`telemetry.db`). Developers can optionally export standard OTLP JSON bundles for analysis in Jaeger or Langfuse.
