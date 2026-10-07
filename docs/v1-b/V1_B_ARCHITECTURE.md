# GRAVITAS — Wave V1-B Architecture Specification
## Model Intelligence, NVIDIA NIM Provider & Verified Escalation

### 1. Executive Summary
Wave V1-B introduces deterministic model intelligence, provider abstraction, credential boundary enforcement, and verified escalation into the Gravitas desktop operating system. Prior to V1-B, Gravitas possessed a robust local multi-agent kernel (K0–K5), task worktree sandboxing, and direct/gateway transport routing, but model selection was not integrated into a deterministic governance lifecycle.

Wave V1-B integrates:
1. **Domain Model Types & Separation of Concerns:**
   `ROLE ≠ EXECUTOR ≠ HARNESS ≠ MODEL ≠ PROVIDER ≠ GATEWAY ≠ PROCESS`
2. **Deterministic Model Router:**
   A deterministic multi-candidate ranking algorithm with zero LLM meta-authority, strictly bounded tier mapping, and K5-verified empirical history tie-breaking.
3. **NVIDIA NIM Provider Adapter:**
   Direct HTTPS integration targeting `integrate.api.nvidia.com` with OpenAI chat completion compatibility, versioned catalog snapshotting, and normalized error classification.
4. **Credential Isolation Broker:**
   Enforcement of `CREDENTIAL_REFERENCE != CREDENTIAL_VALUE`, in-memory secret handling, and automatic redaction of `nvapi-` keys and authorization tokens.
5. **Network Containment & SSRF Defenses:**
   Strict destination allowlisting, rejection of insecure protocols, private RFC1918 subnets, and link-local addresses.
6. **Bounded Escalation Manager:**
   Fail-closed escalation algebra enforcing `MAX_ESCALATIONS = 2`, `MAX_SAME_MODEL_RETRIES = 0`, and mandatory human approval gates for critical failures.
7. **Zero-Dollar Budget Policy:**
   Absolute prohibition of autonomous paid spend, blocking unverified or paid models fail-closed.

---

### 2. Architectural Separation of Invariants
A core principle of Gravitas is avoiding category conflation:
- **Role:** High-level problem domain persona (`ARCHITECT`, `IMPLEMENTER`, `CRITIC`, `VERIFIER`).
- **Executor / Harness:** Local process launcher or CLI adapter (`codex`, `claude-code`, `antigravity`).
- **Model:** Concrete LLM weights / endpoint descriptor (`meta/llama-3.1-8b-instruct`, `meta/llama-3.1-70b-instruct`).
- **Provider:** Hosted inference service offering models under API contracts (`nvidia-nim`).
- **Gateway / Transport:** Transport route (`DIRECT` HTTPS vs `GATEWAY` sidecar).
- **Process:** Operating system PID executing code (`kernelHost`, worker child process).

Critically, **Model Routing** is decoupled from **Transport Routing**:
- `ModelRouter`: Evaluates task requirements and selects the qualified candidate model and provider.
- `TransportRouter` (`InferenceRouter`): Determines whether the dispatch executes via direct HTTPS or an external gateway sidecar.

---

### 3. Component Architecture & Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Orchestrator Scheduler                                      │
│                                                             │
│  1. TaskPlanDefinition.modelRequirements                    │
│          │                                                  │
│          ▼                                                  │
│  2. ModelRouter.resolveModel(reqs)                          │
│     ├── ModelRegistry (Qualification Ladder)                │
│     ├── BudgetPolicy ($0.00 Limit)                          │
│     └── ModelCapabilityHistory (K5 Empirical Data)          │
│          │                                                  │
│          ▼                                                  │
│  3. ModelRoutingDecision (selectedModel, provider)          │
│          │                                                  │
│          ▼                                                  │
│  4. TransportRouter.resolveRoute()                          │
│     └── Direct HTTPS vs Gateway                             │
│          │                                                  │
│          ▼                                                  │
│  5. Harness Execution & Provider Invocation                 │
│     ├── ModelCredentialBroker (Opaque Refs)                 │
│     └── NetworkContainment (SSRF & Host Allowlists)         │
│          │                                                  │
│          ▼                                                  │
│  6. K5 Deterministic Independent Verification               │
│     └── applyVerificationOutcome()                          │
│          │                                                  │
│          ▼                                                  │
│  7. Observation Recorded into ModelCapabilityHistory        │
│     (MODEL_SAYS_DONE != VERIFIED_SUCCESS)                   │
└─────────────────────────────────────────────────────────────┘
```

---

### 4. Qualification Ladder & State Transitions
Models transition through a 6-stage qualification ladder in `ModelRegistry`:
1. `DISCOVERED`: Discovered from provider catalog or snapshot.
2. `METADATA_VALIDATED`: Modalities, context limits, and cost attributes verified.
3. `AUTH_AVAILABLE`: Valid credential reference present in credential broker.
4. `ZERO_COST_ELIGIBLE`: Confirmed developer-free or zero-cost tier.
5. `CAPABILITY_PROBED`: Smoke test / capability probe executed.
6. `QUALIFIED`: Eligible for autonomous task assignment.

---

### 5. Desktop Projection Architecture
The desktop Command Center and Living HQ surfaces receive read-only projections of model intelligence via `SystemProjection`:
- `providerStatus`: Current state of the primary provider (`AVAILABLE` or `AUTH_REQUIRED`).
- `qualifiedModelsCount`: Number of eligible models.
- `qualifiedModelIds`: Array of model IDs available for routing.
- `defaultModel`: Initial deterministic fast-tier model.
- `costPolicy`: Human-readable summary of active spend rules (`STRICT_ZERO_DOLLAR_FREE`).
- `outOfPocketUsd`: Guaranteed $0.00 ceiling.
- `paidFallbackPermitted`: Strictly `false`.

Zero secret material, authorization tokens, or environment API keys are included in any IPC message or DOM projection.
