# GRAVITAS K1 — THIRD-PARTY TOOL CLASSIFICATION REGISTER

**Wave**: K1 — Recursive Harness Adapter & Execution-Surface Qualification Loop  
**Date**: 2026-10-02  
**Status**: APPROVED & FROZEN  

---

## 1. Third-Party Tool Governance Policy

External tools and community scripts must undergo rigorous boundary classification before integration into GRAVITAS. Tools with unknown license terms, unchecked auto-installers, or broad system repair scripts are quarantined or restricted to human-initiated execution.

---

## 2. Frozen Classifications

### 2.1 Bhanunamikaze/Agentic-SEO-Skill
- **Classification**: `ADOPT_SELECTIVELY`
- **Trust Level**: `CONDITIONAL`
- **License**: `LICENSE_NOT_VERIFIED`
- **Policy**: Do not inject globally. Cherry-pick specific skill definitions. SEO automation capabilities must be reviewed for scope and unintended data access.
- **Human Gate**: Required before skill activation.

### 2.2 Sn4kyGit/antigravity-project-starter
- **Classification**: `CHERRY_PICK_ONLY`
- **Trust Level**: `CONDITIONAL`
- **License**: `LICENSE_NOT_VERIFIED`
- **Policy**: Do not run universal installer scripts. Cherry-pick individual patterns or configurations only.
- **Human Gate**: Required before applying scripts.

### 2.3 Aminetwiti/antigravity-patch-proxy-remote
- **Classification**: `HUMAN_INITIATED_ONLY`
- **Trust Level**: `UNQUALIFIED`
- **License**: `LICENSE_NOT_VERIFIED`
- **Policy**: `NO_CREDENTIAL_WRITES_DURING_K1`. Separate the remote daemon concept from the IDE patcher. Autonomous execution forbidden.
- **Human Gate**: Required.

### 2.4 fulldiagnose/antigravity-fixer
- **Classification**: `HUMAN_INITIATED_ONLY / AUTONOMOUS_EXECUTION_FORBIDDEN`
- **Trust Level**: `UNQUALIFIED`
- **License**: `LICENSE_NOT_VERIFIED`
- **Policy**: Repair/fixer tools carry high risk of irreversible system mutations. Autonomous invocation by agents is forbidden.
- **Human Gate**: Strictly human operator initiated.

### 2.5 Draculabo/AntigravityManager
- **Classification**: `COMMERCIAL_USE_RESTRICTED`
- **Trust Level**: `CONDITIONAL`
- **License**: `CC BY-NC-SA 4.0` (Non-commercial, ShareAlike)
- **Policy**: `DO_NOT_VENDOR_INTO_COMMERCIAL_PRODUCTS`. Autonomous execution blocked pending license clearance.
- **Human Gate**: Required.

### 2.6 lbjlaq/Antigravity-Tools-LS
- **Classification**: `QUARANTINED / DO NOT EXECUTE`
- **Trust Level**: `QUARANTINED`
- **License**: `LICENSE_NOT_VERIFIED`
- **Policy**: `TRUST=UNQUALIFIED`, `EXECUTION=QUARANTINED`, `INSTALL_GLOBAL=NO`.
- **Human Gate**: Completely quarantined. Do not run or vendor.
