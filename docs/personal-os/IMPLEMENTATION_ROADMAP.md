# Gravitas Master Implementation Roadmap: Waves 12C.5 to 20 (Wave 12C.5)

## 1. Master Execution Sequence

This roadmap governs the disciplined implementation sequence for Gravitas from the spatial character foundation through the complete Personal Operating System. Each wave is an independently verifiable, testable milestone with explicit non-goals, security boundaries, and rollback points.

```
Wave 12C.5: Architecture Freeze (CURRENT)
     │
     ▼
Wave 12D:   Minimal Role-Based Character Foundation (4 Roles)
     │
     ▼
Wave 12E:   Physical Golden Loop Spatial Lifecycle & Dossiers
     │
     ▼
Wave 13:    Role / Harness Runtime Separation Engine
     │
     ▼
Wave 14:    Background Job System & Courier Logistics
     │
     ▼
Wave 15:    Connector SDK & Bounded External Platforms
     │
     ▼
Wave 16:    Multi-Class Memory & Knowledge Learning Store
     │
     ▼
Wave 17:    Personal Operations & Daily Rhythm Engine
     │
     ▼
Wave 18:    Business Operations & Algoryxz Pipeline
     │
     ▼
Wave 19:    Mobile Companion Control Surface
     │
     ▼
Wave 20:    Strategic Opportunity & Cross-Domain Synthesis
```

---

## 2. Detailed Wave Specifications

### Wave 12C.5: Architecture Freeze (CURRENT WAVE)
- **Goal:** Author and lock the comprehensive Personal OS architectural specifications and ADRs without modifying production runtime code or adding locomotion.
- **Dependencies:** Wave 12C authoritative world projection pass.
- **Non-Goals:** Writing character locomotion code, adding external connectors, modifying core scheduler.
- **Proof Required:** All existing unit/integration/typecheck/build tests pass; documentation package complete in `docs/personal-os/`.
- **Rollback Boundary:** Discard doc commits; feature branch remains clean at Wave 12C.

---

### Wave 12D: Minimal Role-Based Character Foundation
- **Goal:** Implement the initial 4-character role roster (Chief Planner, Frontend Engineer, Backend Engineer, Independent Reviewer) in the 3D Headquarters, anchored to their respective stations with subtle idle breathing animations.
- **Dependencies:** Wave 12C.5 architecture freeze.
- **Non-Goals:** No locomotion between rooms; no complex interactive dialog trees; no external connectors.
- **Proof Required:** Playwright E2E test verifying character geometry mount at workstations, inspector metadata docking showing decoupled role vs. harness attributes, zero visual drift across viewports.
- **Security Implications:** Zero network or filesystem impact (pure presentation layer).
- **Rollback Boundary:** Revert 3D character component files in `apps/web/src/hq3d/geometry/characters.ts`.

---

### Wave 12E: Physical Golden Loop Spatial Lifecycle
- **Goal:** Project the physical task lifecycle through high-contrast dossier artifacts: task creation at Planning Table, handoff to Engineer Desk, transfer to Cleanroom Console, and elevation to Approval Plinth.
- **Dependencies:** Wave 12D character models.
- **Non-Goals:** Freeform humanoid walking paths; simulated typing without authoritative tasks.
- **Proof Required:** Deterministic Playwright test suite validating dossier coordinates during a full Golden Loop run (`PLANNED` -> `SUCCEEDED` / `APPROVED`).
- **Rollback Boundary:** Revert dossier geometry and HqDirector reconciliation logic.

---

### Wave 13: Role / Harness Runtime Separation Engine
- **Goal:** Formalize `AgentRole` and `WorkerHarness` decoupling in `@gravitas/agents` and `@gravitas/orchestrator`. Tasks request roles; scheduler matches qualified harnesses.
- **Dependencies:** Wave 12E.
- **Non-Goals:** Adding 10 new LLM providers.
- **Proof Required:** Unit tests proving a role can execute on `codex-worker` or `fcc-worker` interchangeably without modifying task contract.
- **Security Implications:** Validates that capability grants adhere strictly to role definitions.
- **Rollback Boundary:** Revert orchestrator dispatcher changes.

---

### Wave 14: Background Job System & Courier Logistics
- **Goal:** Implement the deterministic `BackgroundJobQueue` and `CourierService` for high-speed file downloading, extraction, and SHA256 checksum validation outside the LLM execution pipeline.
- **Dependencies:** Wave 13.
- **Non-Goals:** Letting LLM processes remain alive during I/O.
- **Proof Required:** Automated tests downloading test assets, calculating SHA256 hashes, and confirming zero token consumption during download.
- **Security Implications:** Enforces path sandboxing in `staging/downloads/`; execution permissions stripped.
- **Rollback Boundary:** Revert courier service package.

---

### Wave 15: Connector SDK & Platform Integrations
- **Goal:** Deploy the standard `Connector` SDK and implement bounded adapters for Google/Apple Calendar, IMAP/SMTP Email, and GitHub REST.
- **Dependencies:** Wave 14.
- **Non-Goals:** Autonomous mass messaging; arbitrary web scraping; storing plain-text secrets in prompts.
- **Proof Required:** Mock connector tests validating capability grants, circuit breaker trips, and mandatory approval tokens for `CAP_SEND_EMAIL`.
- **Security Implications:** Strict secret isolation; credentials held exclusively in server memory.
- **Rollback Boundary:** Revert connector packages.

---

### Wave 16: Multi-Class Memory & Academic Learning Store
- **Goal:** Deploy the 5-class memory architecture: SQLite structured memory, concept mastery graphs, and spaced repetition (FSRS) scheduler for the Learning Subsystem.
- **Dependencies:** Wave 15.
- **Non-Goals:** Unstructured vector dumps without provenance.
- **Proof Required:** Unit tests verifying state transitions (`NEW` -> `LEARNING` -> `WEAK` -> `APPLIED`) and exact epistemic class tagging.
- **Rollback Boundary:** Revert memory schemas and migrations.

---

### Wave 17: Personal Operations & Daily Rhythm Engine
- **Goal:** Implement the non-diagnostic `PersonalCoach`, reminder cron services, and the Daily Operating Experience (Morning Briefing, Today View, Evening Review).
- **Dependencies:** Wave 16, Wave 15 (Calendar).
- **Non-Goals:** Psychological or medical diagnostic claims.
- **Proof Required:** E2E test of Morning Briefing synthesis and deterministic cron hydration alerts.
- **Rollback Boundary:** Revert personal ops module.

---

### Wave 18: Business Operations & Algoryxz Lead Pipeline
- **Goal:** Deploy the ethical B2B research and outreach preparation pipeline: Lead Researcher, Opportunity Analyst, and Outreach Drafter with mandatory human approval.
- **Dependencies:** Wave 17, Wave 15 (Email/Messaging).
- **Non-Goals:** Automated bulk email blasts or unverified marketing claims.
- **Proof Required:** Complete mock pipeline run from research goal to verified lead dossier and staged email draft in human approval inbox.
- **Security Implications:** Enforces `APPROVAL_TO_PUBLISH` gate before external dispatch.
- **Rollback Boundary:** Revert business operations module.

---

### Wave 19: Mobile Companion Control Surface
- **Goal:** Build the lightweight, mobile-optimized PWA companion for remote approvals, daily rhythm feed, and active study flashcard review.
- **Dependencies:** Wave 18.
- **Non-Goals:** Recreating the heavy 3D WebGL scene on mobile.
- **Proof Required:** Mobile viewport tests for biometric approval drawer, today feed, and flashcard review.
- **Security Implications:** Mutual TLS / token authentication over WireGuard/Tailscale mesh.
- **Rollback Boundary:** Revert PWA frontend package.

---

### Wave 20: Strategic Opportunity & Cross-Domain Synthesis
- **Goal:** Deploy high-level cross-domain intelligence connecting academic learnings, open-source project opportunities, and commercial client leads into strategic roadmap suggestions.
- **Dependencies:** Waves 12–19.
- **Non-Goals:** Fully autonomous strategic self-direction.
- **Proof Required:** Verified end-to-end multi-agent scenario synthesizing a complete project proposal from learning weaknesses and market needs.
- **Rollback Boundary:** Revert strategic intelligence rules.
