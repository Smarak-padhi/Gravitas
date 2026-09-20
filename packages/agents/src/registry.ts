/**
 * In-Memory Agent Registry.
 *
 * Provider-neutral catalog of system agents and qualification records.
 * Distinguishes roles (responsibilities) from providers (engines).
 * Preloaded with canonical production-qualified and unqualified agents.
 */

import type { AgentDescriptor, QualificationStatus } from './descriptor.js'
import {
  canSatisfyRequirement,
  issueCapabilityGrant,
  type CapabilityGrant,
  type TaskRequirement,
} from './grants.js'
import {
  isQualificationEvidenceValid,
  type QualificationEvidence,
} from './qualification.js'

export const CANONICAL_AGENTS: readonly AgentDescriptor[] = Object.freeze([
  {
    id: 'claude-code-worker',
    name: 'Claude Code Worker (Engineering Desk)',
    provider: 'claude-code',
    defaultRole: 'IMPLEMENTER',
    capabilities: Object.freeze([
      'filesystem.read',
      'filesystem.write',
      'filesystem.edit',
      'filesystem.snapshot',
      'git.read',
      'git.status',
      'git.stage',
      'git.diff',
    ]),
    qualificationStatus: 'READY',
    isProductionQualified: true,
    maxConcurrency: 3,
  },
  {
    id: 'free-claude-code-worker',
    name: 'Free Claude Code Worker (Engineering Desk Alt)',
    provider: 'free-claude-code',
    defaultRole: 'IMPLEMENTER',
    capabilities: Object.freeze([
      'filesystem.read',
      'filesystem.write',
      'filesystem.edit',
      'filesystem.snapshot',
      'git.read',
      'git.status',
      'git.stage',
      'git.diff',
    ]),
    qualificationStatus: 'READY',
    isProductionQualified: true,
    maxConcurrency: 2,
  },
  {
    id: 'playwright-browser-qa',
    name: 'Morgan — Browser QA Analyst (Verification Lab)',
    provider: 'playwright-qa',
    defaultRole: 'TESTER',
    capabilities: Object.freeze([
      'browser.navigate',
      'browser.click',
      'browser.fill',
      'browser.assert',
      'browser.screenshot',
    ]),
    qualificationStatus: 'READY',
    isProductionQualified: true,
    maxConcurrency: 2,
  },
  {
    id: 'deterministic-verifier',
    name: 'Deterministic Verifier (Verification Lab)',
    provider: 'deterministic-verifier',
    defaultRole: 'VERIFIER',
    capabilities: Object.freeze([
      'verifier.deterministic',
      'verifier.test',
      'verifier.build',
      'verifier.lint',
      'git.read',
      'git.diff',
    ]),
    qualificationStatus: 'READY',
    isProductionQualified: true,
    maxConcurrency: 4,
  },
  {
    id: 'codex-worker',
    name: 'Codex Experimental Worker (Unqualified)',
    provider: 'codex',
    defaultRole: 'IMPLEMENTER',
    capabilities: Object.freeze([
      'filesystem.read',
      'filesystem.write',
    ]),
    qualificationStatus: 'UNQUALIFIED',
    isProductionQualified: false,
    qualificationNotes: 'Codex is cataloged as UNQUALIFIED for production tasks (Wave 10 evaluation target).',
    maxConcurrency: 0,
  },
])

export interface AgentRegistry {
  register(agent: AgentDescriptor): void
  get(id: string): AgentDescriptor | undefined
  list(): readonly AgentDescriptor[]
  findEligible(requirement: TaskRequirement): readonly AgentDescriptor[]
  requestGrant(requirement: TaskRequirement, preferredAgentId?: string | undefined): CapabilityGrant
  updateStatus(id: string, status: QualificationStatus, notes?: string | undefined): void
  applyQualificationEvidence(evidence: QualificationEvidence, currentCodexVersion: string): boolean
  reset(): void
}

export class DefaultAgentRegistry implements AgentRegistry {
  private readonly agents = new Map<string, AgentDescriptor>()

  public constructor(initialAgents: readonly AgentDescriptor[] = CANONICAL_AGENTS) {
    for (const agent of initialAgents) {
      this.agents.set(agent.id, Object.freeze({ ...agent }))
    }
  }

  public register(agent: AgentDescriptor): void {
    if (this.agents.has(agent.id)) {
      throw new Error(`Agent '${agent.id}' is already registered`)
    }
    this.agents.set(agent.id, Object.freeze({ ...agent }))
  }

  public get(id: string): AgentDescriptor | undefined {
    return this.agents.get(id)
  }

  public list(): readonly AgentDescriptor[] {
    return Array.from(this.agents.values())
  }

  public findEligible(requirement: TaskRequirement): readonly AgentDescriptor[] {
    const eligible: AgentDescriptor[] = []
    for (const agent of this.agents.values()) {
      if (canSatisfyRequirement(agent, requirement).satisfied) {
        eligible.push(agent)
      }
    }
    return eligible
  }

  public requestGrant(requirement: TaskRequirement, preferredAgentId?: string | undefined): CapabilityGrant {
    if (preferredAgentId) {
      const preferred = this.get(preferredAgentId)
      if (!preferred) {
        throw new Error(`Preferred agent '${preferredAgentId}' is not registered`)
      }
      return issueCapabilityGrant(preferred, requirement)
    }

    const eligible = this.findEligible(requirement)
    if (eligible.length === 0) {
      throw new Error(`No eligible agent found to satisfy requirements for task '${requirement.taskId}'`)
    }

    // Select first eligible agent
    return issueCapabilityGrant(eligible[0]!, requirement)
  }

  public updateStatus(id: string, status: QualificationStatus, notes?: string | undefined): void {
    const existing = this.agents.get(id)
    if (!existing) {
      throw new Error(`Cannot update status for unknown agent '${id}'`)
    }

    const updated: AgentDescriptor = {
      ...existing,
      qualificationStatus: status,
      isProductionQualified: status === 'READY',
      ...(notes !== undefined ? { qualificationNotes: notes } : {}),
    }

    this.agents.set(id, Object.freeze(updated))
  }

  public applyQualificationEvidence(
    evidence: QualificationEvidence,
    currentCodexVersion: string
  ): boolean {
    const validity = isQualificationEvidenceValid(evidence, currentCodexVersion)
    const existing = this.get('codex-worker')
    if (!existing) return false

    if (!validity.valid || evidence.decision !== 'APPROVED') {
      const updated: AgentDescriptor = {
        ...existing,
        name: 'Codex Experimental Worker (Unqualified)',
        qualificationStatus: 'UNQUALIFIED',
        isProductionQualified: false,
        maxConcurrency: 0,
        qualificationNotes: validity.reason ?? evidence.rejectionReason ?? 'Qualification evidence rejected or invalid.',
      }
      this.agents.set('codex-worker', Object.freeze(updated))
      return false
    }

    const updated: AgentDescriptor = {
      ...existing,
      name: 'Codex AI Worker (Engineering Desk)',
      qualificationStatus: 'READY',
      isProductionQualified: true,
      maxConcurrency: 2,
      qualificationNotes: `Qualified on ${evidence.qualifiedAt} (${evidence.codexVersion})`,
    }
    this.agents.set('codex-worker', Object.freeze(updated))
    return true
  }

  public reset(): void {
    this.agents.clear()
    for (const agent of CANONICAL_AGENTS) {
      this.agents.set(agent.id, Object.freeze({ ...agent }))
    }
  }
}
