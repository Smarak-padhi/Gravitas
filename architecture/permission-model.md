# Permission & Safety Model

> **Status:** Architecture Design — Phase 0  
> **Date:** 2026-09-18

## Permission Levels

### L0 — OBSERVE (read-only, no side effects)
- filesystem.read (project dirs only)
- git.log, git.diff, git.status
- browser.navigate (no form submit)
- browser.screenshot
- browser.inspect_dom
- process.list
- terminal.run (read-only commands: ls, cat, find, grep)

### L1 — WORKSPACE (project-scoped writes)
- filesystem.write (project dirs only, allowlisted)
- filesystem.create, filesystem.delete (project scope)
- terminal.run (build, test, lint, format)
- localhost.start, localhost.stop
- git.add, git.commit (task branch only)

### L2 — REPOSITORY (git integration)
- git.branch_create
- git.push (feature branches only, never main)
- git.worktree_create
- git.stash

### L3 — EXTERNAL (external service writes)
- github.create_pr
- github.comment
- vercel.deploy_preview
- slack.send_message (requires explicit project policy)
- notion.create_page

### L4 — CRITICAL (requires human approval, logged, non-delegatable)
- git.merge (protected branches)
- github.merge_pr
- vercel.deploy_production
- dns.modify
- database.production_write
- database.production_delete
- credentials.rotate
- billing.modify
- github.delete_repository

## Capability-Scoped Credentials

Agents receive credentials scoped to the minimum required capability.

Example:
- Agent with L1 needs to run tests ? receives no external tokens
- Agent with L3 (create PR) ? receives GitHub token scoped to: repo:write (target repo only)
- Agent with L4 (deploy production) ? requires human approval FIRST, then short-lived token issued

## Prompt Injection Prevention

Threat: malicious website content instructs agent to escalate permissions or exfiltrate data.

Mitigations:
1. Browser content is ALWAYS treated as untrusted data, never as instructions
2. Agent system prompts explicitly mark "user content zone" boundaries
3. Tool calls from within "browser content" context require elevated validation
4. All L3+ tool calls require cryptographic nonce issued by orchestrator (agent cannot forge)
5. Content from browser DOM is sanitized before inclusion in agent context
6. Network isolation: agents cannot make arbitrary HTTP requests without capability grant

## Permission Assignment

Permissions are:
- Per-task (not per-agent — same agent can have different permissions for different tasks)
- Granted by orchestrator at task creation time
- Based on task type and project policy
- Cannot be self-escalated by agent
- L4 actions trigger immediate human approval gate regardless of agent permission level

## Audit Log

Every capability invocation is logged with:
- timestamp
- agent ID
- task ID
- capability invoked
- parameters (sanitized)
- result
- permission level required
