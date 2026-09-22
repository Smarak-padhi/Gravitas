# ADR 0008: Tiered Human Approval Boundaries for Consequential Actions

**Status**: Accepted  
**Date**: 2026-09-22  
**Scope**: Governance & Orchestrator (`@gravitas/orchestrator`, `@gravitas/web`)  

---

## 1. Context

Autonomous AI agents operating in local repositories or connected to communication channels have the potential to cause catastrophic damage if not properly governed:
- Force-pushing or merging unreviewed code into protected branches.
- Accidentally deleting user directories or uncommitted work.
- Sending unsolicited or hallucinatory emails to real clients.
- Incurring unexpected monetary charges or subscription commitments.

Systems that rely on agent self-restraint or single-tier "approve all" checkboxes fail to provide reliable safety.

---

## 2. Decision

We establish a **Tiered, Non-Collapsible Human Governance Model**:

$$\text{Action Execution} = \text{Policy Check} \wedge \text{Independent Verification} \wedge \text{Mandatory Human Sign-Off (for Consequential Actions)}$$

1. **Non-Collapsible Tiers:** We distinguish four independent approval tiers:
   - `Approval to PREPARE`: Authorizing token spend to generate candidate work.
   - `Approval to EXECUTE`: Authorizing isolated local test runs or worktree modifications.
   - `Approval to INTEGRATE`: Authorizing fast-forward merge of verified candidate branches.
   - `Approval to PUBLISH`: Authorizing external transmission (emails, public git pushes, financial transactions).
2. **Mandatory Human Gate:** Consequential operations (`CAP_SEND_EMAIL`, `CAP_MERGE_MAIN`, `CAP_DELETE_FILES`, `CAP_SPEND_MONEY`) halt at `WAITING_APPROVAL` and require an explicit human cryptographic or session approval token.
3. **Dedicated Physical Surface:** In the 3D Headquarters, tasks awaiting sign-off illuminate the **Approval Plinth on the Mezzanine**, providing a spatial reminder of pending human responsibility.

---

## 3. Consequences

- **Positive:** Mathematically prevents unauthorized real-world side effects.
- **Positive:** Clear audit trail: every consequential action is accompanied by an immutable approval record with human timestamp.
- **Positive:** Human remains firmly in control of strategic direction and public reputation.
- **Negative:** Introduces an intentional human bottleneck for outbound communications and branch integration.
