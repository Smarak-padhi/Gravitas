/**
 * GRAVITAS K3 — Tool Registry & CapabilityGrant Contracts & Types
 *
 * Core Architectural Invariants:
 *   SKILL != TOOL != HARNESS != GATEWAY != PROVIDER != MODEL != PROCESS
 *   CAPABILITY != TOOL != TRANSPORT != CREDENTIAL != AUTHORITY
 *   TOOL DISCOVERY != TOOL REGISTRATION != TOOL QUALIFICATION != TOOL AUTHORIZATION != TOOL EXECUTION
 *   TOOL INSTALLED != TOOL TRUSTED
 *   TOOL QUALIFIED != TOOL AUTHORIZED
 *   CAPABILITY REQUEST != CAPABILITY GRANT
 *   CAPABILITY GRANT != CREDENTIAL
 *   CAPABILITY GRANT != EXECUTION
 *   CREDENTIAL REFERENCE != CREDENTIAL VALUE
 *   ROLE != AUTHORITY
 *   HARNESS READY != TOOL AUTHORIZED
 *   TOOL OUTPUT != CANONICAL STATE
 *   TOOL SUCCESS != TASK SUCCESS
 *   TOOL SUCCESS != INDEPENDENT VERIFICATION
 *   AUTONOMOUS_INCREMENTAL_SPEND = 0
 */

import { k1 } from '@gravitas/harnesses'

export type ToolKind =
  | 'LOCAL_PROCESS_TOOL'
  | 'BUILTIN_KERNEL_TOOL'
  | 'MCP_TOOL'
  | 'PLUGIN_TOOL'
  | 'GATEWAY_TOOL'
  | 'API_TOOL'
  | 'HUMAN_ONLY_TOOL'

export type ToolQualificationState =
  | 'DISCOVERED'
  | 'PROBED'
  | 'SCHEMA_PINNED'
  | 'QUALIFIED'
  | 'QUARANTINED'
  | 'UNQUALIFIED'

export type SideEffectClass =
  | 'READ_ONLY'
  | 'LOCAL_REVERSIBLE_MUTATION'
  | 'LOCAL_IRREVERSIBLE_MUTATION'
  | 'MUTATING_EXTERNAL'
  | 'DESTRUCTIVE'
  | 'FINANCIAL'

export type CostClass = k1.CostEligibility

export type AuthorityClass =
  | 'READ_ONLY'
  | 'CODE_MUTATION'
  | 'DEPENDENCY_RESOLUTION'
  | 'INTEGRATION_GATE'
  | 'DESTRUCTIVE_CREDENTIAL_STATE'
  | 'HUMAN_APPROVAL_BYPASS'
  | 'PRODUCTION_DEPLOY'
  | 'FINANCIAL_TRANSACTION'

// ─── Tool Descriptor ────────────────────────────────────────────────────────

export interface ToolResourceScope {
  readonly allowedPaths?: readonly string[] | undefined
  readonly allowedOrigins?: readonly string[] | undefined
  readonly allowedOperations?: readonly string[] | undefined
}

export interface ToolDescriptor {
  readonly toolId: string
  readonly displayName: string
  readonly kind: ToolKind
  readonly version: string
  readonly supportedCapabilities: readonly string[]
  readonly qualificationState: ToolQualificationState
  readonly costClass: CostClass
  readonly authorityClass: AuthorityClass
  readonly sideEffectClass: SideEffectClass
  readonly requiresHumanApproval: boolean
  readonly defaultScope?: ToolResourceScope | undefined
  readonly credentialRequirements?: readonly string[] | undefined
  readonly inputSchema?: Record<string, unknown> | undefined
  readonly outputSchema?: Record<string, unknown> | undefined
}

// ─── Capability Request & Grant ─────────────────────────────────────────────

export interface CapabilityRequest {
  readonly requestId: string
  readonly workSessionId: string
  readonly runId: string
  readonly taskId: string
  readonly subjectId: string // worker or executor id
  readonly requestedCapabilities: readonly string[]
  readonly requestedToolIds?: readonly string[] | undefined
  readonly resourceScope?: ToolResourceScope | undefined
  readonly rationale: string
}

export type GrantRevocationStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED'

export interface CapabilityGrant {
  readonly grantId: string
  readonly requestId: string
  readonly subjectId: string
  readonly workSessionId: string
  readonly runId: string
  readonly taskId: string
  readonly grantedCapabilities: readonly string[]
  readonly authorizedToolIds: readonly string[]
  readonly resourceScope: ToolResourceScope
  readonly authorityCeiling: AuthorityClass
  readonly costCeiling: CostClass
  readonly issuedBy: string
  readonly issuedAt: string
  readonly expiresAt: string
  readonly status: GrantRevocationStatus
  readonly humanApprovalReference?: string | undefined
  readonly credentialReferences?: readonly string[] | undefined
}

// ─── Tool Execution & Results ───────────────────────────────────────────────

export interface ToolRequest {
  readonly requestId: string
  readonly toolId: string
  readonly grantId: string
  readonly subjectId: string
  readonly workSessionId: string
  readonly taskId: string
  readonly operation: string
  readonly parameters: Record<string, unknown>
  readonly timestamp: string
}

export type ToolExecutionStatus =
  | 'SUCCESS'
  | 'DENIED'
  | 'BLOCKED_POLICY'
  | 'BLOCKED_COST'
  | 'BLOCKED_HUMAN_APPROVAL'
  | 'NOT_QUALIFIED'
  | 'NOT_READY'
  | 'TIMED_OUT'
  | 'CANCELLED'
  | 'EXECUTION_FAILURE'
  | 'UNKNOWN_EXTERNAL_OUTCOME'

export interface ToolResult {
  readonly toolRequestId: string
  readonly toolId: string
  readonly status: ToolExecutionStatus
  readonly denialReasonCode?: string | undefined
  readonly output?: string | undefined
  readonly structuredData?: Record<string, unknown> | undefined
  readonly errorOutput?: string | undefined
  readonly durationMs: number
  readonly completedAt: string
}
