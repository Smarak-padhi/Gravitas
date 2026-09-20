import { describe, it, expect, beforeEach } from 'vitest'
import {
  CANONICAL_CAPABILITIES,
  PROHIBITED_WORKER_CAPABILITIES,
  isKnownCapability,
  getCapability,
  isProhibitedWorkerCapability,
  validateRequestedCapabilities,
} from './capabilities.js'
import { isEligibleForProduction, type AgentDescriptor } from './descriptor.js'
import {
  canSatisfyRequirement,
  issueCapabilityGrant,
  type TaskRequirement,
} from './grants.js'
import { DefaultAgentRegistry, CANONICAL_AGENTS } from './registry.js'

describe('Agent Capability Vocabulary & Security', () => {
  it('registers all canonical capabilities with valid domains', () => {
    expect(CANONICAL_CAPABILITIES.length).toBeGreaterThanOrEqual(16)
    for (const cap of CANONICAL_CAPABILITIES) {
      expect(isKnownCapability(cap.id)).toBe(true)
      expect(getCapability(cap.id)).toEqual(cap)
      expect(['filesystem', 'git', 'verifier', 'browser']).toContain(cap.domain)
    }
  })

  it('rejects unknown capabilities', () => {
    expect(isKnownCapability('unknown.magic')).toBe(false)
    expect(getCapability('unknown.magic')).toBeUndefined()
  })

  it('strictly identifies prohibited worker capabilities', () => {
    expect(isProhibitedWorkerCapability('git.commit')).toBe(true)
    expect(isProhibitedWorkerCapability('git.push')).toBe(true)
    expect(isProhibitedWorkerCapability('git.branch.delete')).toBe(true)
    expect(isProhibitedWorkerCapability('system.raw_exec')).toBe(true)
    expect(isProhibitedWorkerCapability('filesystem.read')).toBe(false)
  })

  it('throws security error when prohibited capabilities are requested', () => {
    expect(() => {
      validateRequestedCapabilities(['filesystem.read', 'git.commit'])
    }).toThrow(/Security Violation: Prohibited capability 'git.commit'/)

    expect(() => {
      validateRequestedCapabilities(['git.push'])
    }).toThrow(/Security Violation: Prohibited capability 'git.push'/)

    expect(() => {
      validateRequestedCapabilities(['filesystem.read', 'filesystem.write'])
    }).not.toThrow()
  })
})

describe('Agent Descriptors & Qualification', () => {
  it('strictly distinguishes role from provider', () => {
    const claude = CANONICAL_AGENTS.find((a) => a.id === 'claude-code-worker')!
    expect(claude.provider).toBe('claude-code')
    expect(claude.defaultRole).toBe('IMPLEMENTER')
    expect(claude.provider).not.toBe(claude.defaultRole)

    const browserQa = CANONICAL_AGENTS.find((a) => a.id === 'playwright-browser-qa')!
    expect(browserQa.provider).toBe('playwright-qa')
    expect(browserQa.defaultRole).toBe('TESTER')
  })

  it('marks Codex strictly as UNQUALIFIED for production', () => {
    const codex = CANONICAL_AGENTS.find((a) => a.id === 'codex-worker')!
    expect(codex).toBeDefined()
    expect(codex.qualificationStatus).toBe('UNQUALIFIED')
    expect(codex.isProductionQualified).toBe(false)
    expect(isEligibleForProduction(codex)).toBe(false)
  })

  it('only considers READY and production-qualified agents eligible', () => {
    const agent: AgentDescriptor = {
      id: 'test-agent',
      name: 'Test',
      provider: 'test',
      defaultRole: 'IMPLEMENTER',
      capabilities: ['filesystem.read'],
      qualificationStatus: 'INSTALLED',
      isProductionQualified: true,
    }
    // INSTALLED is not eligible
    expect(isEligibleForProduction(agent)).toBe(false)

    // READY is eligible
    expect(isEligibleForProduction({ ...agent, qualificationStatus: 'READY' })).toBe(true)

    // DEGRADED is not eligible
    expect(isEligibleForProduction({ ...agent, qualificationStatus: 'DEGRADED' })).toBe(false)

    // DISABLED is not eligible
    expect(isEligibleForProduction({ ...agent, qualificationStatus: 'DISABLED' })).toBe(false)

    // UNQUALIFIED is not eligible even if status said READY
    expect(isEligibleForProduction({ ...agent, qualificationStatus: 'READY', isProductionQualified: false })).toBe(false)
  })
})

describe('Capability Grants & Requirement Matching', () => {
  const sampleWorker = CANONICAL_AGENTS.find((a) => a.id === 'claude-code-worker')!

  it('satisfies requirement when agent has all requested capabilities', () => {
    const requirement: TaskRequirement = {
      taskId: 'task_1',
      requiredCapabilities: ['filesystem.read', 'filesystem.write'],
    }

    const result = canSatisfyRequirement(sampleWorker, requirement)
    expect(result.satisfied).toBe(true)
    expect(result.missingCapabilities).toHaveLength(0)

    const grant = issueCapabilityGrant(sampleWorker, requirement)
    expect(grant.taskId).toBe('task_1')
    expect(grant.agentId).toBe(sampleWorker.id)
    expect(grant.grantedCapabilities).toEqual(['filesystem.read', 'filesystem.write'])
  })

  it('rejects requirement when agent is missing a capability', () => {
    const requirement: TaskRequirement = {
      taskId: 'task_2',
      requiredCapabilities: ['filesystem.read', 'browser.navigate'],
    }

    const result = canSatisfyRequirement(sampleWorker, requirement)
    expect(result.satisfied).toBe(false)
    expect(result.missingCapabilities).toContain('browser.navigate')

    expect(() => issueCapabilityGrant(sampleWorker, requirement)).toThrow(
      /missing required capabilities: browser.navigate/
    )
  })

  it('rejects requirement when prohibited capability is demanded', () => {
    const requirement: TaskRequirement = {
      taskId: 'task_3',
      requiredCapabilities: ['git.commit'],
    }

    const result = canSatisfyRequirement(sampleWorker, requirement)
    expect(result.satisfied).toBe(false)
    expect(result.reason).toContain('prohibited')

    expect(() => issueCapabilityGrant(sampleWorker, requirement)).toThrow(
      /Security Violation: Prohibited capability 'git.commit'/
    )
  })

  it('rejects Codex for production tasks even if capabilities match', () => {
    const codex = CANONICAL_AGENTS.find((a) => a.id === 'codex-worker')!
    const requirement: TaskRequirement = {
      taskId: 'task_4',
      requiredCapabilities: ['filesystem.read'],
      requireProductionReady: true,
    }

    const result = canSatisfyRequirement(codex, requirement)
    expect(result.satisfied).toBe(false)
    expect(result.reason).toContain('not production eligible')

    expect(() => issueCapabilityGrant(codex, requirement)).toThrow(/not production eligible/)
  })
})

describe('DefaultAgentRegistry', () => {
  let registry: DefaultAgentRegistry

  beforeEach(() => {
    registry = new DefaultAgentRegistry()
  })

  it('preloads canonical agents', () => {
    const all = registry.list()
    expect(all.length).toBeGreaterThanOrEqual(5)
    expect(registry.get('claude-code-worker')).toBeDefined()
    expect(registry.get('playwright-browser-qa')).toBeDefined()
    expect(registry.get('deterministic-verifier')).toBeDefined()
    expect(registry.get('codex-worker')).toBeDefined()
  })

  it('finds eligible agents for browser testing requirements', () => {
    const requirement: TaskRequirement = {
      taskId: 'task_browser_test',
      requiredCapabilities: ['browser.navigate', 'browser.click', 'browser.assert'],
    }

    const eligible = registry.findEligible(requirement)
    expect(eligible.length).toBe(1)
    expect(eligible[0]?.id).toBe('playwright-browser-qa')

    const grant = registry.requestGrant(requirement)
    expect(grant.agentId).toBe('playwright-browser-qa')
  })

  it('throws error when requesting grant for unsatisfied requirement', () => {
    const impossibleReq: TaskRequirement = {
      taskId: 'task_fail',
      requiredCapabilities: ['nonexistent.capability'],
    }

    expect(() => registry.requestGrant(impossibleReq)).toThrow(
      /No eligible agent found to satisfy requirements/
    )
  })

  it('prevents registering duplicate agent IDs', () => {
    expect(() => {
      registry.register({
        id: 'claude-code-worker',
        name: 'Duplicate',
        provider: 'claude-code',
        defaultRole: 'IMPLEMENTER',
        capabilities: [],
        qualificationStatus: 'READY',
        isProductionQualified: true,
      })
    }).toThrow(/already registered/)
  })

  it('updates agent qualification status and affects eligibility', () => {
    registry.updateStatus('playwright-browser-qa', 'DEGRADED', 'High memory usage')
    const agent = registry.get('playwright-browser-qa')
    expect(agent?.qualificationStatus).toBe('DEGRADED')
    expect(agent?.qualificationNotes).toBe('High memory usage')

    const requirement: TaskRequirement = {
      taskId: 'task_browser_test',
      requiredCapabilities: ['browser.navigate'],
    }

    // Now it should NOT be eligible
    const eligible = registry.findEligible(requirement)
    expect(eligible).toHaveLength(0)

    // Reset restores it
    registry.reset()
    expect(registry.get('playwright-browser-qa')?.qualificationStatus).toBe('READY')
  })
})
