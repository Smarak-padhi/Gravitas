# SA3 Workflow Profiles Dossier

## 1. Workflow Architecture
Workflow Profiles organize disciplined software delivery methodologies, meta-programming tools, knowledge-graph indexing, and store submission compliance. These capabilities govern development processes rather than running inside client binaries.

SA3 defines **3 Workflow Profiles**:

---

## 2. Profile Definitions

### PROFILE-WORK-001: GSD (Get Stuff Done) Phased Lifecycle Workflow
- **Profile ID**: `PROFILE-WORK-001`
- **Name**: GSD Phased Lifecycle Workflow
- **Member Rules**: **206 rules**
- **Lifecycle Scope**: Autonomous and human-in-the-loop software engineering lifecycle orchestration.
- **Key Disciplines & Phases**:
  - Context gathering and problem framing (`gsd-discuss-phase`, `gsd-explore`).
  - Spec and design contract generation (`gsd-spec-phase`, `gsd-ai-integration-phase`).
  - Phased task execution and wave parallelization (`gsd-execute-phase`, `gsd-quick`).
  - Quality gates, code reviews, and forensic debugging (`gsd-code-review`, `gsd-audit-fix`, `gsd-forensics`).
  - Context persistence and handoff (`gsd-thread`, `gsd-pause-work`, `gsd-resume-work`).
- **Primary Mechanism**: Structured markdown-based state management (`.planning/` directory structure) with strict gate checkpoints.

---

### PROFILE-WORK-002: Graphify Codebase Knowledge Graph Workflow
- **Profile ID**: `PROFILE-WORK-002`
- **Name**: Graphify Codebase Knowledge Graph Workflow
- **Member Rules**: **16 rules**
- **Lifecycle Scope**: Automated codebase analysis, architectural mapping, and persistent relational graph construction.
- **Key Disciplines**:
  - Semantic node extraction from source code, documentation, and design specifications.
  - God-node detection and circular dependency highlighting.
  - Community detection algorithms for subsystem clustering.
  - Topological path queries for impact analysis before refactoring.
- **Primary Artifacts**: Graph databases and graph visualization outputs (`graphify-out/`).

---

### PROFILE-WORK-003: App Store Submission & Optimization Workflow
- **Profile ID**: `PROFILE-WORK-003`
- **Name**: App Store Submission & Optimization Workflow
- **Member Rules**: **44 rules**
- **Lifecycle Scope**: Commercial mobile store readiness, regulatory compliance, and app store metadata optimization.
- **Key Disciplines**:
  - Apple App Store Review Guideline compliance (`app-store-review`).
  - Required-reason API declarations and PrivacyInfo (`PrivacyInfo.xcprivacy`).
  - Google Play Policy domain verification (`play-policy-insights`).
  - User Data Safety and Privacy declaration cross-referencing.
  - App Store Optimization (ASO) keyword metadata, screenshot captions, and localized promotional text.
- **Primary Deliverables**: Audit compliance matrices, store privacy manifests, and release packaging sign-offs.
