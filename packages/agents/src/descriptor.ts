/**
 * Agent Descriptor & Qualification Model.
 *
 * Distinguishes:
 * 1. Role vs Provider:
 *    - Role is the functional responsibility in the task DAG (e.g. IMPLEMENTER, TESTER, VERIFIER).
 *    - Provider is the underlying engine/harness implementation (e.g. claude-code, playwright-qa, codex).
 * 2. Qualification States:
 *    - INSTALLED: Harness/binary is physically present on host system.
 *    - READY: Qualified and approved for production task execution.
 *    - DEGRADED: Operational but experiencing rate limits, fallback mode, or partial capability.
 *    - UNQUALIFIED: Registered or discovered, but explicitly barred from production orchestration (e.g. Codex).
 *    - DISABLED: Manually turned off by human operator.
 */

import type { AgentRole } from '@gravitas/core'

export type QualificationStatus =
  | 'INSTALLED'
  | 'READY'
  | 'DEGRADED'
  | 'UNQUALIFIED'
  | 'DISABLED'

export type AgentProvider =
  | 'claude-code'
  | 'free-claude-code'
  | 'playwright-qa'
  | 'deterministic-verifier'
  | 'codex'
  | (string & {})

export interface AgentDescriptor {
  readonly id: string
  readonly name: string
  readonly provider: AgentProvider
  readonly defaultRole: AgentRole
  readonly capabilities: readonly string[]
  readonly qualificationStatus: QualificationStatus
  readonly qualificationNotes?: string | undefined
  readonly maxConcurrency?: number | undefined
  readonly isProductionQualified: boolean
}

/**
 * Checks if an agent is qualified to execute production tasks.
 */
export function isEligibleForProduction(descriptor: AgentDescriptor): boolean {
  return (
    descriptor.isProductionQualified &&
    descriptor.qualificationStatus === 'READY'
  )
}
