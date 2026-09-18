# Event Architecture

> **Status:** Architecture Design — Phase 0  
> **Date:** 2026-09-18

## Event-Driven Design

All agent activity is represented as immutable events on an event bus.
Events power: the UI, the audit log, the dependency resolver, and crash recovery.

## Core Event Schema

```typescript
interface SystemEvent {
  id: string;           // UUID v7 (time-ordered)
  type: EventType;
  timestamp: ISO8601;
  projectId: string;
  taskId: string | null;
  agentId: string | null;
  payload: Record<string, unknown>;
  correlationId: string; // groups related events (e.g. one tool call cycle)
}
```

## Event Catalog

### Task Lifecycle
- TASK_CREATED        { task }
- TASK_UPDATED        { taskId, field, oldValue, newValue }
- TASK_STATUS_CHANGED { taskId, from, to, reason }
- TASK_ASSIGNED       { taskId, agentId }
- TASK_COMPLETED      { taskId, evidence[] }
- TASK_FAILED         { taskId, error, retryCount }
- TASK_CANCELLED      { taskId, reason }

### Agent Lifecycle
- AGENT_REGISTERED    { agent }
- AGENT_STARTED       { agentId, taskId }
- AGENT_IDLE          { agentId }
- AGENT_ERROR         { agentId, error }
- AGENT_HEARTBEAT     { agentId, taskId, statusMessage }

### Tool Calls
- TOOL_CALL_STARTED   { agentId, tool, params, permissionLevel }
- TOOL_CALL_COMPLETED { agentId, tool, result, durationMs }
- TOOL_CALL_FAILED    { agentId, tool, error }
- TOOL_CALL_BLOCKED   { agentId, tool, reason: "permission_denied" | "policy" }

### File System
- FILE_READ           { agentId, path }
- FILE_WRITTEN        { agentId, path, hash, sizeBytes }
- FILE_DELETED        { agentId, path }

### Terminal
- COMMAND_STARTED     { agentId, command, cwd, pid }
- COMMAND_OUTPUT      { pid, chunk, stream: "stdout"|"stderr" }
- COMMAND_FINISHED    { pid, exitCode, durationMs }

### Git
- GIT_BRANCH_CREATED  { agentId, branch, from }
- GIT_COMMITTED       { agentId, branch, sha, message, filesChanged[] }
- GIT_PUSHED          { agentId, branch, remote }
- GIT_WORKTREE_CREATED { taskId, path, branch }

### Browser
- BROWSER_NAVIGATED   { agentId, url, statusCode }
- BROWSER_SCREENSHOT  { agentId, url, path, viewport }
- BROWSER_FORM_FILLED { agentId, url, selector }
- BROWSER_CLICK       { agentId, url, selector }

### Testing
- TEST_RUN_STARTED    { agentId, command }
- TEST_PASSED         { agentId, suite, count }
- TEST_FAILED         { agentId, suite, failures[] }

### Verification & Evidence
- EVIDENCE_COLLECTED  { taskId, evidenceId, type, criterionId }
- CRITERION_PASSED    { taskId, criterionId }
- CRITERION_FAILED    { taskId, criterionId, reason }
- VERIFICATION_PASSED { taskId, verifierAgentId }
- VERIFICATION_FAILED { taskId, verifierAgentId, failedCriteria[] }

### Human-in-the-Loop
- HUMAN_APPROVAL_REQUIRED { taskId, type, context, evidence[] }
- HUMAN_APPROVED          { taskId, approvedBy, comment }
- HUMAN_REJECTED          { taskId, rejectedBy, comment }

### System
- ORCHESTRATOR_STARTED  { version }
- ORCHESTRATOR_SHUTDOWN { graceful }
- PROJECT_LOADED        { projectId }
- CRASH_DETECTED        { error, lastTaskId }
- CRASH_RECOVERED       { fromEventId }

## Storage Strategy

Events are stored in SQLite as append-only log.
State is derived from event replay (event sourcing).

Benefits:
- Crash recovery: replay events to restore exact state
- Full audit trail: every action is recorded
- Time travel: can reconstruct state at any point
- UI can subscribe to real-time events via SSE or WebSocket

## Transport Options (to research)

- In-process EventEmitter (Node.js) for V0 simplicity
- SQLite trigger-based notifications
- Redis Pub/Sub for future multi-process architecture
- SSE stream to UI clients

## V0 Decision

For V0: in-process EventEmitter + SQLite append-only events table.
No external message queue required for local-first single-process orchestrator.
