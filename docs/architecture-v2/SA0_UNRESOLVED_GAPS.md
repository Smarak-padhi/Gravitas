# SA0 Unresolved Gaps & Historical Unknowns

## Invariant
`UNKNOWN != FAILURE. UNRECORDED UNKNOWN = FAILURE.`

This document explicitly catalogues all historical gaps, unverified candidate libraries, missing local repositories, and ambiguous boundaries identified during SA0 qualification.

---

## Gap Ledger

| Gap ID | Area | Entity / Subject | Detailed Gap Description | Impact on SA1 | Proposed Resolution Path |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **GAP-01** | Historical Repos | `nemotron-cline-test` | The folder exists on `Desktop` but is empty (0 files). Local history or prompt logs are missing from disk. | None on core capabilities. | Classify as `UNRESOLVED` in SA0; do not block SA1 entry of verified projects. |
| **GAP-02** | Academic Folders | `DSW 1`, `MCSD`, `IIT BBSR` | Coursework directories containing academic lab code and notes. No reusable architectural or design skills discovered. | None. | Classified as `REJECT` from Arena; excluded from future skill pipelines. |
| **GAP-03** | Third-Party Binary | `Desktop/New folder` | Contains third-party Windows DLLs (`OnlineFix64.dll`). Not a project. | None. | Classified as `REJECT`; permanently quarantined. |
| **GAP-04** | Platform Skills | 40+ Untested Skills in `config/skills` | ~40 Android and iOS skills are installed with valid `SKILL.md` documents, but lack documented production project test evidence in user repos. | Low. They are documented capabilities available for extraction. | Marked `SOURCE_VERIFIED`. Allowed to enter SA1 as candidate capabilities subject to K4/K5 verification. |
| **GAP-05** | Community Snippets | `21st.dev` & `Skiper UI` | Hundreds of uncurated community React/Tailwind snippets with varying licenses and code quality. | Medium. Risk of license conflicts or code bloat if ingested blindly. | Retained as `REFERENCE_ONLY`. Direct snippet adoption requires human review and license inspection per component. |
| **GAP-06** | Design Corpus | `awesome-design-md` | Massive collection of Markdown files across heterogeneous domains. Structural quality and conflict rate unknown. | High potential context cost if ingested unpruned. | Kept as `REFERENCE_ONLY`. In SA1, only universal accessibility and spacing heuristics will be parsed. |
| **GAP-07** | Subagent Prompts | Historical Session Transcripts | Granular prompt evolution across early subagent development sessions is distributed across ephemeral session logs. | Low. Core agent specifications are cleanly frozen in `gravitas-agent-specs/`. | Governed by frozen `gravitas-agent-specs/` baseline. |
| **GAP-08** | Obscura Tooling | Stealth Browser Engine | Not present in local workspace; identified as future candidate tool. | None on design skills. | Bounded under separate tool qualification pipeline. Excluded from SA1 skill arena. |
