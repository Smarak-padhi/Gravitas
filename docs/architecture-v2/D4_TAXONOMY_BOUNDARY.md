# D4 Taxonomy Boundary Proof

## 1. Governing Invariant
```
ROLE != EXECUTOR != HARNESS != MODEL != PROVIDER != GATEWAY != PROCESS
VISUAL_BOT != ROLE != EXECUTOR != HARNESS != MODEL != PROVIDER != GATEWAY != PROCESS
VISUAL_BOT != CAPABILITY_GRANT != CANONICAL_AGENT_STATE != AUTHORITY
VISUAL_PRESENCE != PROCESS_LIVENESS
VISUAL_ACTIVITY != EXECUTION
ANIMATION != EXECUTION
BOT_MOVEMENT != TASK_PROGRESS
BOT_SUCCESS_ANIMATION != VERIFIED_SUCCESS
BOT_CELEBRATION != HUMAN_APPROVAL
```

## 2. Concrete Dimension Definitions

1. **ROLE**: The functional responsibility and domain specification assigned to a task (e.g. `chief-planner`, `backend-engineer`, `security-auditor`). It defines authority constraints and verification contracts. It contains NO binary paths, NO model handles, NO process identifiers.
2. **EXECUTOR**: The logical leaseholder and task execution manager responsible for carrying out a task assignment within GRAVITAS.
3. **HARNESS**: The tool execution surface or CLI adaptation harness (e.g. `harness:codex:node`, `harness:claude-code:cli`, `harness:deterministic-runner:local`).
4. **MODEL**: The AI model checkpoint or reasoning engine requested or utilized (e.g. `claude-3-7-sonnet`, `gemini-2.5-pro`, `gpt-4o`).
5. **PROVIDER / GATEWAY**: The routing gateway or API endpoint providing model inference (e.g. Anthropic, Google Vertex, OpenAI, OmniRoute).
6. **PROCESS**: The operating system process executing on host hardware, bound to an OS PID.
7. **VISUAL_BOT**: A transient, derived 3D/DOM projection within the Living HQ representing role assignment for human operator spatial comprehension.

## 3. Dynamic Proof & Isolation Scenarios

### Scenario A: Harness Fallback Preserves Role Identity
- **Action**: Task `task_d4_backend` is executing under Role `backend-engineer`. The primary harness `harness:codex:node` experiences an outage and GRAVITAS falls back to `harness:claude-code:cli`.
- **Runtime Verification**: The Visual Bot's role identity (`roleId: 'backend-engineer'`), primary silhouette (`CYLINDER_HEAD`), color palette, and task causal link remain intact. The Inspector updates the reported Harness field without recreating the bot or altering the assigned task. (Verified in Live Dogfood Step 31-32 and Negative Fixture E).

### Scenario B: Multi-Task Parallel Execution Without Singleton Collision
- **Action**: Two concurrent tasks `task_01` and `task_02` both require `backend-engineer`.
- **Runtime Verification**: Two distinct `SpatialEntity` instances with IDs `sp:ROLE_BOT:ws/run/task_01/backend-engineer` and `sp:ROLE_BOT:ws/run/task_02/backend-engineer` are instantiated in distinct zone offsets. Selecting one highlights only that specific task in the semantic inspector. (Verified in Negative Fixture J).

### Scenario C: Tier 3 Mechanical Service Differentiation
- **Action**: Task assigned to `deterministic-runner` or `mcp-tool-broker`.
- **Runtime Verification**: The visual entity receives silhouette `BOX_UNIT`, is flagged with `mechanicalService: true`, and displays tool-unit styling. The inspector explicitly states: `Mechanical Service (Deterministic tool runner, not an autonomous agent)`. (Verified in Live Step 21 and Negative Fixture D).
