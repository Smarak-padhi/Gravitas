# ADR 0006: Strict Separation of Reasoning Roles and Deterministic Services

**Status**: Accepted  
**Date**: 2026-09-22  
**Scope**: Whole system architecture  

---

## 1. Context

A common trap in modern agent systems is assigning every task to an LLM, including tasks that are entirely deterministic:
- Running periodic cron timers.
- Calculating SHA256 file hashes.
- Downloading multi-gigabyte datasets over HTTP.
- Parsing structured JSON files.
- Executing git diff commands.

Using an LLM for deterministic tasks causes severe token waste, slow execution latency, unreliability, and potential hallucinations.

---

## 2. Decision

We establish an immutable architectural boundary:

$$\text{System Component} = \text{Reasoning Role} \oplus \text{Deterministic Service}$$

1. **Reasoning Roles (`REASONING_ROLE`):** Reserved exclusively for semantic problem-solving, code creation, architectural planning, research synthesis, and creative judgment.
2. **Deterministic Services (`DETERMINISTIC_SERVICE`):** Used for all algorithmic, I/O, timed, or rule-based operations. They contain zero LLM calls, run at native machine speed, and emit deterministic exit codes.
3. **No LLM Daemons for Background Work:** Background I/O (such as file downloads or cache sweeps) runs on lightweight async worker pools. An LLM process is never kept alive waiting for I/O to finish.

---

## 3. Consequences

- **Positive:** System costs effectively zero dollars while idle.
- **Positive:** High performance: file downloads and checksums run at native network/disk speeds.
- **Positive:** Eliminates hallucination risk in file operations, timers, and mathematical calculations.
- **Negative:** Requires developers to explicitly classify new components into either `REASONING_ROLE` or `DETERMINISTIC_SERVICE`.
