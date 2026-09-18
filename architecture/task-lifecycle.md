# Task Lifecycle & Agent Assignment

> **Status:** Architecture Design — Phase 0  
> **Date:** 2026-09-18

## Orchestrator Responsibility

The Orchestrator is the central coordinator. It does NOT do work itself.
It manages: task graph, agent assignment, dependency resolution, evidence collection, human gates.

## Task Lifecycle Sequence

```
USER: "Finish ALGORYXZ Gate 1"
  |
  v
[1] INTAKE
  Orchestrator receives goal
  Invokes: Repository Inspector agent
  Repository Inspector produces: repository analysis artifact
  
  |
  v
[2] PLANNING
  Orchestrator invokes: Planner agent
  Planner reads: repository analysis + project context
  Planner produces: Task DAG (list of Tasks with dependencies)
  Orchestrator persists: Task DAG to database
  Orchestrator emits: TASK_CREATED x N events
  
  |
  v
[3] DEPENDENCY RESOLUTION (continuous loop)
  Orchestrator evaluates ready tasks:
    - Status = PLANNED
    - All dependencies in status DONE
    ? Move to READY
  
  |
  v
[4] AGENT ASSIGNMENT
  For each READY task:
    - Evaluate available agents (capability match + cost + performance history)
    - Select best agent
    - Create workspace (git worktree + isolated dir)
    - Grant permissions (per task policy)
    - Inject context (task, inputs, relevant project knowledge)
    - Start agent (via harness adapter)
    - Emit: AGENT_ASSIGNED, TASK_STATUS_CHANGED(READY?RUNNING)
  
  |
  v
[5] AGENT EXECUTION
  Agent works in isolated workspace
  Agent emits tool calls ? Capability Router handles them
  All tool calls logged as events
  Agent heartbeats every N seconds (or orchestrator polls)
  
  |
  v
[6] COMPLETION CLAIM
  Agent sends: claim_completion(task_id, summary, files_changed)
  Orchestrator does NOT immediately mark DONE
  Orchestrator moves task to: VERIFYING
  Orchestrator assigns Verifier agent (different from implementer)
  
  |
  v
[7] VERIFICATION
  Verifier agent receives: task, acceptance_criteria, workspace_path
  Verifier collects evidence for each criterion
  Verifier produces: Evidence[] objects
  
  If all required criteria have satisfying evidence:
    ? Move to human approval gate (if required) OR DONE
  
  If any required criterion fails:
    ? Emit VERIFICATION_FAILED
    ? Increment retries
    ? If retries < maxRetries: move back to RUNNING (agent gets feedback)
    ? If retries >= maxRetries: move to FAILED
  
  |
  v
[8] HUMAN APPROVAL (if required by task policy)
  Orchestrator presents: evidence bundle, screenshots, diff, summary
  Human reviews and decides
  Orchestrator records: HumanApprovalEvidence
  
  If approved: DONE
  If rejected: agent gets feedback, retry or FAILED
  
  |
  v
[9] INTEGRATION
  On DONE, downstream tasks may now become READY
  Orchestrator integrates work: cherry-pick or merge task branch
  Orchestrator emits: GIT_COMMITTED, GIT_MERGED
  Orchestrator frees workspace (cleanup worktree)
  
  |
  v
[10] COMPLETION
  All tasks DONE ? project goal achieved
  Orchestrator generates: completion summary
  Human receives: final summary, all evidence
```

## Agent Selection Logic

```python
def select_agent(task: Task, available_agents: list[Agent]) -> Agent:
    candidates = []
    
    for agent in available_agents:
        # Must have required capabilities
        if not agent.capabilities.satisfies(task.required_capabilities):
            continue
        
        # Must not be at capacity
        if agent.current_task is not None:
            continue
        
        # Score by: performance history on similar tasks
        score = agent.metrics.success_rate_for(task.type)
        score -= agent.cost_profile.estimated_cost(task.complexity)
        
        candidates.append((agent, score))
    
    return max(candidates, key=lambda x: x[1])[0]
```

## Human Interruption

At any point, the human can:
1. PAUSE a running task ? agent gracefully yields after current tool call
2. CANCEL a task ? agent terminated, workspace preserved for inspection
3. FORCE-APPROVE ? skip verifier (emergency override, logged)
4. INJECT context ? send additional information to running agent
5. REASSIGN ? cancel current agent, assign new one (workspace preserved)

## Crash Recovery

All task state is persisted to SQLite after every status transition.
On restart:
1. Load all tasks from DB
2. For RUNNING tasks: determine if agent process is still alive
3. If agent is dead: move task back to READY (workspace preserved)
4. Reassign agent (agent can inspect workspace to understand where it was)
5. Emit CRASH_RECOVERED event

## Agent Context Injection

Agent receives at task start:
```json
{
  "task": { ... },
  "project": {
    "name": "ALGORYXZ",
    "architecture": "...",    // from ARCHITECTURE.md
    "conventions": "...",     // from relevant DECISIONS/
    "relevant_files": [...]   // retrieved, not entire repo
  },
  "workspace": {
    "path": "/path/to/worktree",
    "branch": "task/T-042/agent/claude"
  },
  "inputs": [...],
  "permissions": ["L0", "L1", "L2"],
  "acceptance_criteria": [...],
  "context_budget": 50000     // max tokens agent can use in context
}
```

Agent does NOT receive:
- Entire codebase in context
- Other agents conversations
- Production credentials
- Full .env file
- History of other tasks
