# SA3-R Specialist Capability Reconciliation

## 1. Deconfounding Specialist Terminology
A surface reading of SA3 outputs presents a potential counting conflict:
- **`SPECIALIST_RULE_CANDIDATE` Objects**: **5**
- **`RETAINED_SEPARATELY` Primary Rules**: **4**

SA3-R audits the machine files to determine whether this discrepancy represents an accounting bug or distinct semantic concepts.

---

## 2. Definitive Forensic Finding: Two Distinct Concepts
The investigation confirms that SA3 defines **two separate specialist streams** representing 9 distinct source rules:

### Stream A: Synthesized Specialist Candidates (5 Objects, 5 Rules)
These are candidate objects in `canonical-candidates.jsonl` typed as `SPECIALIST_RULE_CANDIDATE`. Their source rules have primary disposition `SYNTHESIZED_INTO_PROPOSAL`:
1. `CANON-SPEC-001` (CameraX Hardware Parity): binds `RULE-AND-CAM-000352`
2. `CANON-SPEC-002` (MetricKit Async Diagnostic Telemetry): binds `RULE-IOS-MET-000587`
3. `CANON-SPEC-003` (Geocoding Fallback Handling): binds `RULE-IOS-MAP-000650`
4. `CANON-SPEC-004` (APNs User Authorization): binds `RULE-IOS-PUSH-000653`
5. `CANON-SPEC-005` (Android BackupAgent Restore Key): binds `RULE-AND-REST-000389`

Each of these 5 candidates is a formal 1-to-1 candidate wrapper with explicit `appliesWhen`, `doesNotApplyWhen`, and `scope` fields.

### Stream B: Retained Standalone Specialist Tools (4 Target Objects, 4 Rules)
These are standalone utility/workflow rules from the `ponytail` capability suite that were intentionally retained as standalone tools to prevent dilution of their extreme specificity. Their primary disposition in `rule-dispositions.jsonl` is `RETAINED_SEPARATELY`:
1. `RETAIN-RULE-PONY-CORE-000006`: `RULE-PONY-CORE-000006` ("Can it be one line?: One line.")
2. `RETAIN-RULE-PONY-AUDIT-000010`: `RULE-PONY-AUDIT-000010` (Whole-repo audit for over-engineering)
3. `RETAIN-RULE-PONY-DEBT-000011`: `RULE-PONY-DEBT-000011` (Harvest `ponytail:` comments into a debt ledger)
4. `RETAIN-RULE-PONY-REV-000012`: `RULE-PONY-REV-000012` (Code review focused exclusively on over-engineering)

---

## 3. Reconciliation Conclusion
The 5 specialist candidates and 4 retained rules do NOT conflict:
$$\text{Synthesized Specialist Rules}(5) + \text{Retained Specialist Rules}(4) = \mathbf{9 \text{ Total Specialist Rules}}$$

All 9 rules have unbroken provenance back to SA1. The documentation ambiguity in SA3 arose from using the word "specialist" for both synthesized candidate tiers and retained standalone tools.

Full machine records are preserved in [`docs/skill-arena/sa3-r/specialist-reconciliation.json`](file:///c:/Users/smara/Desktop/Multi-agent/docs/skill-arena/sa3-r/specialist-reconciliation.json).
