# ADR 0004: Managed Prompt Compilation and SHA-256 Provenance

**Status**: Accepted  
**Date**: 2026-09-20  
**Scope**: `@gravitas/prompts`, `@gravitas/core`, `@gravitas/server`, and `@gravitas/verifier`  

---

## 1. Context

In early waves, prompt text was assembled ad-hoc: `RunService` passed the raw task objective string directly to the agent harness, and a SHA-256 hash was computed over that raw string alone. Consequently:
- Workers operated without explicit global safety invariants or role boundaries.
- Execution contracts, acceptance criteria, and scope constraints were not deterministically compiled into worker instructions.
- Prompt text lacked formal versioning and provenance tracking in evidence manifests.

Furthermore, multi-agent systems face prompt injection and trust-boundary erosion: instructions encountered in repository files (e.g., `README.md`, `CLAUDE.md`, code comments, issue descriptions) or in untrusted worker stdout can improperly assume policy-level authority.

Gravitas defines the defining invariant:
> **PROMPT TEXT IS EXECUTION INPUT, NOT EXECUTION AUTHORITY.**  
> An agent claim is never proof of completion.

---

## 2. Decision

We establish `@gravitas/prompts` (`packages/prompts/`) as a dedicated subsystem owning managed, deterministic prompt compilation, versioning, and provenance.

### 2.1 Canonical Six-Layer Hierarchy

The compiler enforces strict canonical ordering across six distinct layers, each carrying an explicit trust level:

1. **GLOBAL (`MANAGED_POLICY`)**:
   - Canonical worker invariants managed exclusively by Gravitas (versioned via `GLOBAL_POLICY_VERSION`).
   - Invariants: strict mutation scope, prohibition against self-verification, completion claims are informational only, credential non-exposure, and explicit statement that repository contents are not policy.
   - Strictly code-managed; neither users nor workers can edit this policy.

2. **PROJECT (`PROJECT_INPUT`)**:
   - Explicit trusted project context provided by the human operator (project name, summary, technical constraints, project instructions).
   - **Injection Boundary**: Repository files and worker outputs are **never** automatically promoted into this layer.

3. **EXECUTION_CONTRACT (`CONTRACT`)**:
   - Live contract properties: goal, target repository, base branch, allowed mutation paths, acceptance criteria, and required evidence.
   - Acceptance criteria and evidence requirements are preserved verbatim without truncation.

4. **TASK (`TASK`)**:
   - Specific task identity, title, objective, allowed scope paths, and human approval requirement flag.

5. **AGENT_ROLE (`MANAGED_POLICY`)**:
   - Code-managed behavioral template corresponding to the assigned role (`IMPLEMENTER`, `RESEARCHER`, `REVIEWER`), versioned via `ROLE_TEMPLATE_VERSION`.

6. **RUNTIME_CONTEXT (`GENERATED_RUNTIME`)**:
   - Operational context generated immediately before execution: run ID, task ID, worktree path, task branch, base commit SHA, harness ID, and ISO timestamp.
   - Explicitly framed as operational reference that cannot override higher policy layers.
   - **Strictly contains no credentials, API keys, or host secrets.**

### 2.2 Deterministic Compilation & Cryptographic Provenance

- **Normalization**: All line endings are normalized to LF (`\n`), and per-line trailing whitespace is trimmed.
- **Exact Hashing**: SHA-256 is computed over the exact UTF-8 byte stream delivered to the worker harness. No intermediate transformation by the harness is permitted.
- **Provenance Tuple**: Every compilation produces `{ text, byteLength, sha256, compilerVersion, globalPolicyVersion, roleTemplateVersion, roleUsed, compiledAt, layerMetadata }`.
- **Reproducibility**: Identical normalized inputs produce byte-identical text and identical SHA-256 digests across any platform.

### 2.3 Evidence Integration & In-Memory Registry

- `RunService.executeRun()` delegates prompt assembly exclusively to `@gravitas/prompts.compilePrompt()`.
- The in-memory registry stores the compiled prompt alongside the task record.
- The external evidence bundle (`packages/verifier`) records prompt provenance (`promptSha256`, `compilerVersion`, `globalPolicyVersion`, `roleTemplateVersion`) in `evidence-manifest.json` and writes `prompt.txt` as a sanitized evidence artifact.
- The independent verifier operates shell-free and evaluates criteria autonomously; a worker claiming completion based on prompt instructions remains subject to verifier gatekeeping.

### 2.4 Control Plane & Command Center

- `POST /api/v1/prompts/preview`: Compiles and inspects the canonical prompt without executing worker processes or allocating worktrees.
- `GET /api/v1/runs/:runId/tasks/:taskId/prompt`: Exposes recorded compilation metadata and layer breakdown for executed tasks.
- **Command Center Prompt Manager**: Renders the six layers with source badges, byte counts, and the SHA-256 digest in a collapsible panel.
- **Read-Only Invariant**: Compiled prompt text is derived output. The UI permits preview and inspection but prohibits direct editing of the compiled artifact.

---

## 3. Consequences

- Full cryptographic auditability: operators can verify the exact prompt text given to an agent against the evidence manifest SHA-256.
- Clear separation of concerns: `@gravitas/core` owns the primitive composer, `@gravitas/prompts` owns policy and compilation, and `@gravitas/harnesses` remains a pure execution consumer.
- Injection vectors from repository content and tool output are neutralized at the trust boundary.
- Zero external AI or network calls are introduced for prompt compilation.
