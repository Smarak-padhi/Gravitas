# GRAVITAS — SKILL ARENA SA4-R: HUMAN-MACHINE CONSISTENCY RECONCILIATION

## 1. Audit Scope
This audit cross-references every numerical and categorical statement made in human documentation (`SA4_FINAL_EVIDENCE.md`) against the primary machine ledgers (`run-manifest.jsonl`, `objective-results.jsonl`, `subjective-results.jsonl`).

## 2. Metric Reconciliation Table
| Dimension | Human Document Claim | Machine Ledger Truth | Audit Status | Forensic Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Total Runs** | 22 | 22 | EXACT | 8 Control, 8 Treatment, 2 Ablat, 2 Cross, 2 Length |
| **Physical Files** | 44 (22 prompt, 22 output) | 44 (22 prompt, 22 output) | EXACT | 100% physically present on disk |
| **Control Objective Passes** | 6 / 16 (37.5%) | 4 / 16 (25.0%) | **DISCREPANCY CALIBRATED** | Narrative counted 2 informal partial passes; machine ledger records exactly 4 passes. Machine truth is 4/16. |
| **Treatment Objective Passes** | 16 / 16 (100.0%) | 16 / 16 (100.0%) | EXACT | All 16 criteria satisfied |
| **Control Subjective Mean** | 2.625 | 2.625 | EXACT | Scores: 3, 3, 2, 2, 3, 3, 3, 2 |
| **Treatment Subjective Mean** | 5.000 | 5.000 | EXACT | Scores: 5, 5, 5, 5, 5, 5, 5, 5 |
| **Subjective Delta** | +2.375 | +2.375 | EXACT | Exact arithmetic match |
| **Ablation Replicates** | 2 | 2 | EXACT | B01-No-Design, B07-No-Seam |
| **Crossover Replicates** | 2 | 2 | EXACT | B02-Glass, B04-Brutalist |
| **Length Controls** | 2 | 2 | EXACT | B01-Length, B07-Length |
| **Incremental Paid Cost** | $0.00 | $0.00 | EXACT | Zero incremental expenditure |

## 3. Discrepancy Resolution
The sole discrepancy identified—the 4/16 vs 6/16 objective pass count for Control—has been reconciled in favor of machine record truth (4/16, 25.0%). All other metrics exhibit 100% concordance.
