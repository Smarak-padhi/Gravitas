# Post-D4 Operational Gap Register

| Gap ID | Category | Description | Severity | Candidate Future Wave |
| :--- | :--- | :--- | :---: | :---: |
| **GAP-01** | **PACKAGING** | No self-contained installer (NSIS/MSI) or packaged executable binary exists. Desktop runs via `npx electron`. | HIGH | Distribution & Packaging Wave |
| **GAP-02** | **BUILD & TYPES** | Monorepo root `npm run build` fails typechecking due to `exactOptionalPropertyTypes: true` mismatches and unused variables across older packages. | HIGH | Tooling & Build Convergence Wave |
| **GAP-03** | **BROWSER AUTOMATION** | Headless browser testing and browser QA lab currently rely on basic Playwright adapter; candidate local tools (Obscura) are unintegrated and unqualified. | MEDIUM | Browser & External Surface Qualification |
| **GAP-04** | **INTEGRATION** | External harness ecosystem (e.g. Manus Desktop, third-party MCP servers) remains DISCOVERED and unqualified for autonomous execution. | MEDIUM | Tool & Harness Qualification Wave |
| **GAP-05** | **OBSERVABILITY** | Long-term operational telemetry and trace persistence rely entirely on local SQLite events without structured export or visualization dashboards. | LOW | Advanced Observability & Telemetry |
| **GAP-06** | **RELIABILITY** | Main process crash recovery does not reattach to surviving headless kernels; requires cold restart with reconciliation. | MEDIUM | Reliability & Process Supervision Hardening |
