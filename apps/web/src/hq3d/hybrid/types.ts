/**
 * Gravitas Wave 12H — Hybrid HQ Experience Reset Types
 *
 * Defines the presentation models for the hybrid experience:
 * - 3D architectural diorama room + illustrated 2D/SVG agents
 * - Concise operational speech bubbles
 * - Physical task artifact handoffs
 * - Contextual clean inspector
 */

import type { RoleId } from '../roles/types.js'

export type AgentStatusCategory =
  | 'TASK_STARTED'
  | 'TASK_COMPLETED'
  | 'HANDOFF_STARTED'
  | 'HANDOFF_RECEIVED'
  | 'VERIFICATION_STARTED'
  | 'VERIFICATION_PASSED'
  | 'VERIFICATION_FAILED'
  | 'DEPENDENCY_WAIT'
  | 'TASK_FAILED'
  | 'WAITING_APPROVAL'

export interface AgentStatusMessage {
  readonly id: string
  readonly roleId: RoleId
  readonly taskId?: string
  readonly category: AgentStatusCategory
  readonly shortText: string
  readonly timestamp: number
  readonly severity: 'info' | 'success' | 'warning' | 'error'
  readonly expiresAfterMs: number
}

export type IllustratedAgentRole = RoleId

export type IllustratedAgentState =
  | 'IDLE'
  | 'WORKING'
  | 'COMPLETED'
  | 'WAITING'
  | 'REVIEWING'
  | 'FAILED'
  | 'WAITING_APPROVAL'

export interface TaskArtifactHandoffState {
  readonly taskId: string
  readonly taskTitle?: string
  readonly sourceRoleId?: RoleId
  readonly targetRoleId?: RoleId
  readonly sourceRole?: string
  readonly targetRole?: string
  readonly progress: number // 0.0 to 1.0
  readonly status: 'IDLE' | 'IN_TRANSIT' | 'ARRIVED' | 'DELIVERED' | 'FAILED'
  readonly resultState?: 'PASSED' | 'FAILED' | 'PENDING'
  readonly artifact?: {
    readonly id: string
    readonly title: string
    readonly provenanceHash: string
    readonly verificationState: 'PENDING' | 'PASSED' | 'FAILED'
  } | null
}

export interface HybridTaskDetail {
  readonly id: string
  readonly taskId?: string
  readonly title: string
  readonly sourceRoleId?: RoleId
  readonly destinationRoleId?: RoleId
  readonly sourceRole: string
  readonly destinationRole: string
  readonly state: string
  readonly currentState?: string
  readonly runtimePhase?: string
  readonly dependencies: readonly string[]
  readonly dependencyInfo?: string
  readonly verificationStatus: 'NOT_STARTED' | 'RUNNING' | 'PASSED' | 'FAILED' | 'PENDING'
  readonly evidenceAvailable: boolean
  readonly evidencePath?: string
  readonly currentHarness?: string
}

export type HybridExperienceMode = 'HYBRID' | 'EXPERIMENTAL_3D'
