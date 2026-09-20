/**
 * Typed Capability Vocabulary for Gravitas Agents.
 *
 * Invariants:
 * 1. Workers NEVER receive `git.commit` or `git.push` capabilities.
 * 2. All agent actions are validated against strictly registered capabilities.
 * 3. Prohibited capabilities cannot be granted under any circumstance.
 */

import type { AgentCapability } from '@gravitas/core'

/**
 * Standard known capability identifiers.
 */
export const CANONICAL_CAPABILITIES = [
  // Filesystem domain
  { id: 'filesystem.read', domain: 'filesystem', description: 'Read file contents from assigned task worktree' },
  { id: 'filesystem.write', domain: 'filesystem', description: 'Write or create files in assigned task worktree' },
  { id: 'filesystem.edit', domain: 'filesystem', description: 'Apply localized line edits within assigned worktree' },
  { id: 'filesystem.snapshot', domain: 'filesystem', description: 'Capture snapshot of current worktree filesystem state' },

  // Git domain (strictly bounded)
  { id: 'git.read', domain: 'git', description: 'Read commit logs, commit SHAs, and ref status' },
  { id: 'git.status', domain: 'git', description: 'Inspect git status and porcelain untracked/modified changes' },
  { id: 'git.stage', domain: 'git', description: 'Stage modified files within worktree (`git add`)' },
  { id: 'git.diff', domain: 'git', description: 'Inspect unstaged and staged diffs against base commit' },

  // Verifier domain
  { id: 'verifier.deterministic', domain: 'verifier', description: 'Execute independent deterministic test and build verification' },
  { id: 'verifier.test', domain: 'verifier', description: 'Execute automated unit and integration tests' },
  { id: 'verifier.build', domain: 'verifier', description: 'Execute workspace compilation and typecheck' },
  { id: 'verifier.lint', domain: 'verifier', description: 'Execute codebase lint and formatting checks' },

  // Browser domain (strictly deterministic Playwright QA)
  { id: 'browser.navigate', domain: 'browser', description: 'Navigate to validated local loopback URL (127.0.0.1 or localhost)' },
  { id: 'browser.click', domain: 'browser', description: 'Simulate user click on DOM selector' },
  { id: 'browser.fill', domain: 'browser', description: 'Simulate user text input into DOM selector' },
  { id: 'browser.assert', domain: 'browser', description: 'Verify DOM visibility, text content, and element state' },
  { id: 'browser.screenshot', domain: 'browser', description: 'Capture viewport screenshot to candidate evidence directory' },
] as const satisfies readonly AgentCapability[]

export type CanonicalCapabilityId = (typeof CANONICAL_CAPABILITIES)[number]['id']

/**
 * Explicitly prohibited capabilities that must NEVER be granted to any worker.
 */
export const PROHIBITED_WORKER_CAPABILITIES: readonly string[] = Object.freeze([
  'git.commit',
  'git.push',
  'git.branch.delete',
  'git.reset.hard',
  'system.raw_exec',
  'network.external',
])

const CAPABILITY_MAP = new Map<string, AgentCapability>(
  CANONICAL_CAPABILITIES.map((c) => [c.id, c])
)

/**
 * Checks if a capability identifier is registered in the canonical vocabulary.
 */
export function isKnownCapability(id: string): boolean {
  return CAPABILITY_MAP.has(id)
}

/**
 * Gets a capability definition by identifier.
 */
export function getCapability(id: string): AgentCapability | undefined {
  return CAPABILITY_MAP.get(id)
}

/**
 * Checks if a capability is explicitly prohibited for workers.
 */
export function isProhibitedWorkerCapability(id: string): boolean {
  return PROHIBITED_WORKER_CAPABILITIES.includes(id)
}

/**
 * Validates a list of capabilities against prohibited lists and known format.
 * Throws an error if any capability is prohibited.
 */
export function validateRequestedCapabilities(capabilities: readonly string[]): void {
  for (const cap of capabilities) {
    if (isProhibitedWorkerCapability(cap)) {
      throw new Error(`Security Violation: Prohibited capability '${cap}' cannot be requested or granted`)
    }
  }
}
