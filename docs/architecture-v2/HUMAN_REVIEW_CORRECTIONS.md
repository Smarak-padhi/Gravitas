# GRAVITAS P0/P1 HUMAN REVIEW CORRECTIONS

## Gate decision

`WAVES P0-P1 BLOCKED`

P0 is substantially usable. P1 is not yet approvable because the original P1 contract required a complete evidence field set for each execution surface and sequential qualification with no skipped states.

## Material corrections applied

1. Downgraded PowerShell from `READY` to `CAPABILITY_PROBED`; local execution does not prove GRAVITAS containment/qualification.
2. Removed “production ready” language for Playwright; its documented state remains `CAPABILITY_PROBED`.
3. Reclassified `agy --help` results as advertised capabilities, not proven successful headless execution.
4. Replaced the claim that the Antigravity IDE has no programmatic surface with the narrower claim that none was proven in this audit.
5. Marked ChatGPT desktop programmatic integration as unproven rather than absent.
6. Removed unsupported containment-quality ratings for Codex/Claude/FCC/Playwright where current behavior was not actually tested.
7. Added a blocking P1 coverage-gap section for required fields missing across surfaces.
8. Prevented historical Codex/OmniRoute qualification artifacts from overriding current runtime state.
9. Removed invented/preselected model IDs from conceptual examples and kept them explicitly hypothetical.
10. Relaxed overbroad process-containment wording so containment can be designed per execution type.
11. Kept P6/P7/P8 choices open and removed unnecessary preselection/arbitrary benchmark counts.
12. Redacted the configured Git email from the reviewed toolchain artifact because it is not needed for architecture provenance.
13. Carried dependency advisories into P2 risk forensics instead of preassigning remediation to a later implementation phase.
14. Changed the Antigravity session summary final state from READY to BLOCKED.

## P1 evidence still required before P2

- Complete required field coverage for every candidate surface.
- Safely prove or mark N/A: authentication, reachability, stdin/stdout/stderr, structured output, streaming, session lifecycle, cancellation, timeout, MCP/plugin support, filesystem/shell/Git/network authority, containment, model/provider provenance, quotas, automation suitability.
- Run an authorized non-destructive `agy -p` probe if allowed and capture actual output/exit behavior.
- Inventory desktop notification and background facilities explicitly.
- Complete MCP/plugin/connector authority and containment evidence rather than only listing configuration/process presence.
- Keep Codex, Claude, FCC, GitHub CLI, OmniRoute at their current proven states until auth/runtime prerequisites are actually satisfied.

No P2 prompt is generated because the P1 human gate has not passed.
