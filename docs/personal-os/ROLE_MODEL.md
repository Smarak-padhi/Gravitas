# Gravitas AgentRole Domain Model & Identity Contract (Wave 12C.5)

## 1. The Fundamental Identity Decoupling

In Gravitas, an agent's organizational identity is completely decoupled from execution engines, LLM providers, and models:

$$\text{AgentRole} \neq \text{WorkerHarness} \neq \text{InferenceTransport} \neq \text{Provider} \neq \text{Model} \neq \text{Tool} \neq \text{Connector} \neq \text{DeterministicService}$$

### Concrete Demonstration
```
Scenario A (Today):
FrontendEngineer (Role)
 └── executed by CodexWorker (WorkerHarness)
      └── routed via OmniRoute (InferenceTransport)
           └── upstream OpenAI (Provider)
                └── gpt-4o (Model)
                     └── operates Worktree Git & Filesystem (Capabilities)

Scenario B (Tomorrow):
FrontendEngineer (Role)
 └── executed by FccWorker (WorkerHarness)
      └── routed DIRECT (InferenceTransport)
           └── upstream Anthropic (Provider)
                └── claude-3-7-sonnet (Model)
                     └── operates Worktree Git & Filesystem (Capabilities)
```

**Architectural Rule:**
- **The role remains `FrontendEngineer` in both scenarios.**
- Codex is not an employee.
- FCC is not a character.
- OmniRoute is not an agent.
- Changing the underlying model or harness updates qualification status, but never renames, reshuffles, or alters the organizational role.

---

## 2. The Core `AgentRole` Domain Contract

The domain contract defines the functional responsibilities, required capabilities, containment constraints, and governance policies for each role.

```typescript
export interface AgentRole {
  /** Unique architectural identifier (e.g., 'role:engineering:frontend-engineer') */
  readonly id: string

  /** Human-readable title displayed across command center and 3D inspector */
  readonly displayName: string

  /** Parent department assignment */
  readonly department: DepartmentId

  /** High-level mission and primary operational purpose */
  readonly purpose: string

  /** Mandatory capabilities required for task assignment */
  readonly requiredCapabilities: ReadonlyArray<CapabilityId>

  /** Optional capabilities that may enhance execution if granted */
  readonly optionalCapabilities: ReadonlyArray<CapabilityId>

  /** Permitted execution harnesses capable of hosting this role */
  readonly allowedHarnesses: ReadonlyArray<HarnessId>

  /** Strict context scopes permitted in prompt compilation */
  readonly contextScopes: ReadonlyArray<ContextScopeId>

  /** Policy governing the role's authority to propose vs. execute */
  readonly authorityPolicy: AuthorityPolicy

  /** Standing autonomy boundaries (L0 through L4) */
  readonly autonomyPolicy: AutonomyPolicy

  /** Verification rules mandatory before task completion */
  readonly verificationPolicy: RoleVerificationPolicy

  /** Resource ceilings and limits for a single task execution */
  readonly executionBudgetPolicy: ExecutionBudgetPolicy

  /** Presentation metadata for spatial 3D visualization (strictly decoupled) */
  readonly hqPresentation: RoleHqPresentationMetadata
}
```

### Separation of Core Domain from Presentation Metadata

To ensure the core backend runtime never depends on WebGL or Three.js, presentation attributes are strictly isolated into `RoleHqPresentationMetadata`:

```typescript
export interface RoleHqPresentationMetadata {
  /** Canonical workstation station ID (e.g., 'codex-workstation', 'planning-table') */
  readonly defaultStationId: string

  /** Color palette token used for desk accents and uniform trim */
  readonly accentColorToken: string

  /** Badge icon identifier displayed on the chest badge or inspector */
  readonly badgeIconId: string

  /** Scale model archetype (e.g., 'engineer-female', 'specialist-male') */
  readonly visualArchetype: string
}
```

---

## 3. Initial Role Roster Definitions

Gravitas defines 13 specialized reasoning roles covering the entire operational spectrum:

### 1. Chief Planner (`role:strategy:chief-planner`)
- **Department:** `STRATEGY`
- **Purpose:** Analyze unstructured user goals, break them into discrete tasks, evaluate dependencies, and construct valid execution DAGs.
- **Required Capabilities:** `CAP_READ_PROJECT`, `CAP_PLAN_DAG`.
- **Allowed Harnesses:** `codex-worker`, `fcc-worker`, `claude-code-worker`.
- **Context Scopes:** `PROJECT`, `LEARNING`, `BUSINESS`.
- **Default Station:** `planning-table` (Mission Control).

### 2. Integrator (`role:engineering:integrator`)
- **Department:** `ENGINEERING`
- **Purpose:** Review multi-task branches, resolve git merge conflicts, verify cross-package contracts, and prepare release candidate branches.
- **Required Capabilities:** `CAP_READ_PROJECT`, `CAP_SAFE_WRITE_GIT`, `CAP_EXEC_TESTS`.
- **Allowed Harnesses:** `codex-worker`, `claude-code-worker`.
- **Context Scopes:** `PROJECT`.
- **Default Station:** `systems-workstation` (Operations Floor).

### 3. Frontend Engineer (`role:engineering:frontend-engineer`)
- **Department:** `ENGINEERING`
- **Purpose:** Author and refactor React/TypeScript web components, CSS design tokens, 3D Canvas integrations, and client state machines.
- **Required Capabilities:** `CAP_READ_PROJECT`, `CAP_SAFE_WRITE_CODE`, `CAP_EXEC_TESTS`, `CAP_EXEC_BROWSER_QA`.
- **Allowed Harnesses:** `codex-worker`, `fcc-worker`.
- **Context Scopes:** `PROJECT`.
- **Default Station:** `codex-workstation` (Operations Floor Desk 1).

### 4. Backend Engineer (`role:engineering:backend-engineer`)
- **Department:** `ENGINEERING`
- **Purpose:** Implement server endpoints, database migrations, authentication boundaries, and event stream pipelines.
- **Required Capabilities:** `CAP_READ_PROJECT`, `CAP_SAFE_WRITE_CODE`, `CAP_EXEC_TESTS`.
- **Allowed Harnesses:** `codex-worker`, `claude-code-worker`.
- **Context Scopes:** `PROJECT`.
- **Default Station:** `fcc-workstation` (Operations Floor Desk 2).

### 5. Systems Engineer (`role:engineering:systems-engineer`)
- **Department:** `ENGINEERING`
- **Purpose:** Manage build scripts, monorepo tooling, container configurations, and environment dependencies.
- **Required Capabilities:** `CAP_READ_PROJECT`, `CAP_SAFE_WRITE_CONFIG`, `CAP_EXEC_TESTS`.
- **Allowed Harnesses:** `claude-code-worker`, `codex-worker`.
- **Context Scopes:** `PROJECT`.
- **Default Station:** `systems-workstation` (Operations Floor Desk 3).

### 6. Independent Reviewer (`role:quality:independent-reviewer`)
- **Department:** `QUALITY`
- **Purpose:** Perform semantic code reviews, detect architectural drift, verify security boundaries, and flag unexpected code diffs.
- **Required Capabilities:** `CAP_READ_PROJECT`, `CAP_AUDIT_DIFF`.
- **Allowed Harnesses:** `claude-code-worker`, `codex-worker`.
- **Context Scopes:** `PROJECT`.
- **Default Station:** `verification-lab-console` (Verification Cleanroom).

### 7. Technical Researcher (`role:knowledge:researcher`)
- **Department:** `KNOWLEDGE`
- **Purpose:** Research libraries, study technical specifications, synthesize API references, and produce structured technical folios.
- **Required Capabilities:** `CAP_WEB_SEARCH`, `CAP_READ_DOCS`, `CAP_WRITE_NOTES`.
- **Allowed Harnesses:** `fcc-worker`, `codex-worker`.
- **Context Scopes:** `PROJECT`, `LEARNING`.
- **Default Station:** `research-desk` (Knowledge Library).

### 8. Learning Coach (`role:knowledge:learning-coach`)
- **Department:** `KNOWLEDGE`
- **Purpose:** Track academic syllabus progress, assess concept mastery, identify weak topics, and design active-recall review sessions.
- **Required Capabilities:** `CAP_READ_LEARNING_STATE`, `CAP_WRITE_LEARNING_STATE`.
- **Allowed Harnesses:** `fcc-worker`, `codex-worker`.
- **Context Scopes:** `LEARNING`.
- **Default Station:** `study-nook` (Knowledge Library).

### 9. Project Scout (`role:strategy:project-scout`)
- **Department:** `STRATEGY`
- **Purpose:** Identify practical, small-scale software projects that directly exercise recently studied theoretical concepts.
- **Required Capabilities:** `CAP_READ_LEARNING_STATE`, `CAP_READ_PROJECT`, `CAP_PLAN_DAG`.
- **Allowed Harnesses:** `fcc-worker`, `codex-worker`.
- **Context Scopes:** `LEARNING`, `PROJECT`.
- **Default Station:** `planning-table` (Mission Control).

### 10. Personal Coach (`role:personal:personal-coach`)
- **Department:** `PERSONAL_OPERATIONS`
- **Purpose:** Review daily workload distribution, detect overloaded work days, suggest breaks, and assist in schedule rebalancing.
- **Required Capabilities:** `CAP_READ_CALENDAR`, `CAP_SUGGEST_SCHEDULE`.
- **Allowed Harnesses:** `fcc-worker`.
- **Context Scopes:** `PERSONAL` (and `HEALTH` only if explicitly unlocked by user).
- **Default Station:** `personal-ops-terminal` (Personal Operations Lounge).

### 11. Lead Researcher (`role:business:lead-researcher`)
- **Department:** `BUSINESS`
- **Purpose:** Investigate public business entities, verify digital presence, and synthesize factual lead dossiers with citations.
- **Required Capabilities:** `CAP_WEB_SEARCH`, `CAP_READ_DOCS`, `CAP_WRITE_LEAD_DOSSIER`.
- **Allowed Harnesses:** `fcc-worker`, `codex-worker`.
- **Context Scopes:** `BUSINESS`.
- **Default Station:** `market-intel-station` (Business Operations Suite).

### 12. Opportunity Analyst (`role:business:opportunity-analyst`)
- **Department:** `BUSINESS`
- **Purpose:** Evaluate verified lead dossiers to identify concrete, high-value technical opportunities and strategic fit.
- **Required Capabilities:** `CAP_READ_LEAD_DOSSIER`, `CAP_WRITE_OPPORTUNITY_REPORT`.
- **Allowed Harnesses:** `fcc-worker`, `codex-worker`.
- **Context Scopes:** `BUSINESS`.
- **Default Station:** `market-intel-station` (Business Operations Suite).

### 13. Outreach Drafter (`role:business:outreach-drafter`)
- **Department:** `BUSINESS`
- **Purpose:** Draft personalized, value-first communication proposals tailored to specific client needs for human review.
- **Required Capabilities:** `CAP_READ_LEAD_DOSSIER`, `CAP_WRITE_COMMUNICATION_DRAFT`.
- **Allowed Harnesses:** `fcc-worker`, `codex-worker`.
- **Context Scopes:** `BUSINESS`, `COMMUNICATION`.
- **Default Station:** `communications-desk` (Business Operations Suite).

---

## 4. Architectural Rules for Roles

1. **Roles Never Own Execution Subprocesses:**  
   Roles define logic and capability needs. When scheduled, the orchestrator pairs the role with a qualified `WorkerHarness` currently available in the environment.

2. **Roles Cannot Widen Their Own Capabilities:**  
   A task assigned to `role:engineering:frontend-engineer` cannot dynamically grant itself `CAP_SEND_EMAIL` or `CAP_MERGE_MAIN`. Capability grants are strictly validated at scheduler admission.

3. **No Direct Character-to-Character Gossip:**  
   Inter-role handoffs occur strictly via verifiable artifacts (e.g., git commits, test evidence manifests, lead dossiers, study flashcards) persisted in authoritative storage. Roles never exchange informal, unrecorded messages.
