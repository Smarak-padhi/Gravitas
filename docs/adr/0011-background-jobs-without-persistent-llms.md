# ADR 0011: Background Work Execution Without Persistent LLM Daemons

**Status**: Accepted  
**Date**: 2026-09-22  
**Scope**: Scheduling & Logistics (`@gravitas/orchestrator`, `packages/courier`)  

---

## 1. Context

Background operations in personal productivity systems are predominantly high-frequency and routine:
- Checking if a scheduled calendar reminder should fire.
- Polling an IMAP server for unread message headers.
- Downloading a multi-gigabyte dataset or code repository.
- Running a test suite when files change.
- Computing SHA256 checksums on downloaded archives.

If an AI system relies on persistent LLM background daemons (agents continuously running in an infinite loop), it incurs immense idle token costs, memory bloat, high CPU utilization, and unpredictable behavior.

---

## 2. Decision

We establish that **Background Work Does Not Use Persistent LLMs**:

$$\text{Idle System Cost} = \$0.00$$

1. **Deterministic Schedulers & Workers:** Periodic reminders, cron evaluations, and condition watching are executed by native TypeScript services (`ReminderService`, `ConditionWatcher`) consuming zero inference tokens.
2. **Deterministic Courier Service:** High-throughput I/O (file downloads, archive extractions, hash checks) is offloaded to a dedicated async I/O worker pool.
3. **Transient LLM Spawning:** When semantic reasoning is required (e.g., decomposing a new goal, evaluating an academic weakness, drafting a client reply), a worker harness subprocess is spawned on demand, executes the single task contract, and terminates immediately upon completion.

---

## 3. Consequences

- **Positive:** Zero idle monetary cost for the operator.
- **Positive:** System can run continuously 24/7 on local laptops or mini-PCs without overheating or consuming excessive RAM.
- **Positive:** High reliability and determinism for file and scheduling operations.
- **Negative:** Cold-start latency of ~500ms to 2s when spawning a fresh CLI worker subprocess for reasoning tasks.
