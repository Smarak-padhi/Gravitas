/**
 * GRAVITAS K2 — Executor & Harness Resolver
 *
 * Implements deterministic mapping from Role → Executor → Harness.
 *
 * Invariants Enforced:
 *   ROLE != EXECUTOR != HARNESS != MODEL != PROVIDER != GATEWAY != PROCESS
 *   TECHNICAL_READINESS != COST_ELIGIBILITY != DISPATCH_AUTHORIZATION
 *   FALLBACK MUST NEVER SILENTLY DOWNGRADE CONTAINMENT
 *   UNKNOWN_COST / PAID SURFACES ARE STRICTLY REJECTED FAIL-CLOSED
 */

import { k1 } from '@gravitas/harnesses'
type HarnessRegistry = k1.HarnessRegistry

import type { ExecutorProfile } from './types.js'

export interface ResolutionRequest {
  readonly roleId: string
  readonly requiredCapabilities?: Partial<k1.HarnessCapabilities> | undefined
  readonly preferredExecutorId?: string | undefined
}

export interface ResolutionResult {
  readonly executorId: string
  readonly harnessId: string
  readonly harnessKind: string
  readonly costEligibility: string
}

export class ExecutorHarnessResolver {
  private readonly registry: HarnessRegistry
  private readonly executorProfiles: Map<string, ExecutorProfile> = new Map()

  constructor(registry: HarnessRegistry) {
    this.registry = registry
    this.registerDefaultProfiles()
  }

  private registerDefaultProfiles(): void {
    // Backend engineering profile
    this.executorProfiles.set('executor:backend:primary', {
      executorId: 'executor:backend:primary',
      roleId: 'role:engineering:backend-engineer',
      displayName: 'Primary Backend Execution Profile',
      preferredHarnessIds: ['powershell-local', 'agy', 'codex'],
      allowedCapabilities: ['filesystemRead', 'filesystemWrite', 'shellExecution'],
      prohibitedAuthorities: ['HUMAN_APPROVAL_BYPASS', 'PRODUCTION_DEPLOY'],
    })

    // Deterministic test profile
    this.executorProfiles.set('executor:deterministic:fixture', {
      executorId: 'executor:deterministic:fixture',
      roleId: 'role:engineering:backend-engineer',
      displayName: 'Deterministic Fixture Worker Profile',
      preferredHarnessIds: ['powershell-local'],
      allowedCapabilities: ['filesystemRead', 'filesystemWrite'],
      prohibitedAuthorities: ['HUMAN_APPROVAL_BYPASS'],
    })
  }

  public registerExecutorProfile(profile: ExecutorProfile): void {
    this.executorProfiles.set(profile.executorId, profile)
  }

  /**
   * Resolves an eligible Executor and qualified, ready, cost-eligible Harness.
   * Never falls back to a blocked or UNKNOWN_COST harness.
   */
  public async resolve(req: ResolutionRequest): Promise<ResolutionResult> {
    // 1. Role -> Executor Profile Resolution
    let profile: ExecutorProfile | undefined
    if (req.preferredExecutorId) {
      profile = this.executorProfiles.get(req.preferredExecutorId)
    }
    if (!profile) {
      for (const p of this.executorProfiles.values()) {
        if (p.roleId === req.roleId) {
          profile = p
          break
        }
      }
    }

    if (!profile) {
      throw new Error(`[ResolutionError] No executor profile registered for role: "${req.roleId}"`)
    }

    // 2. Executor -> Harness Resolution via K1 Registry
    const selection = await this.registry.selectHarness(profile.preferredHarnessIds)
    if (!selection.selected) {
      const reasons = selection.decisions.map(d => `${d.harnessId}: ${d.reason}`).join('; ')
      throw new Error(`[ResolutionError] No eligible harness available for executor "${profile.executorId}". Reasons: [${reasons}]`)
    }

    const snapshot = this.registry.getSnapshot(selection.selected)
    const harness = this.registry.getHarness(selection.selected)!

    return {
      executorId: profile.executorId,
      harnessId: selection.selected,
      harnessKind: harness.kind,
      costEligibility: snapshot?.costEligibility ?? 'UNKNOWN_COST',
    }
  }
}
