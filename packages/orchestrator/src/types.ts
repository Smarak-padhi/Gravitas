/**
 * Type definitions for @gravitas/orchestrator.
 */

import type {
  AcceptanceCriterion,
  AgentRole,
  AgentRoleId,
  BrowserQaContract,
  EvidenceRequirement,
  IndependentReviewResult,
  IntegrationPreparationResult,
  RunStatus,
  Task,
  TaskArtifactRef,
  TaskDependency,
  TaskHandoff,
  TaskRoleRequirement,
} from '@gravitas/core'
import type { ProjectPromptContext } from '@gravitas/prompts'
import type { VerificationPlan } from '@gravitas/verifier'
import type { InferenceRouteRequirement } from '@gravitas/gateways'

/**
 * Declaration of a single task within a RunPlan.
 */
export interface TaskPlanDefinition {
  readonly id: string
  readonly title: string
  readonly objective: string
  readonly dependencies?: readonly (string | TaskDependency)[] | undefined
  readonly acceptanceCriteria?: readonly AcceptanceCriterion[] | undefined
  readonly requiresApproval?: boolean | undefined
  readonly role?: AgentRole | undefined
  readonly roleId?: AgentRoleId | undefined
  readonly roleRequirement?: TaskRoleRequirement | undefined
  readonly reviewOfTaskId?: string | undefined
  readonly requiredArtifacts?: readonly string[] | undefined
  readonly handoffs?: readonly TaskHandoff[] | undefined
  readonly requiredCapabilities?: readonly string[] | undefined
  readonly browserQa?: BrowserQaContract | undefined
  readonly verificationPlan?: VerificationPlan | undefined
  readonly requiredEvidence?: readonly EvidenceRequirement[] | undefined
  readonly inferenceRoute?: InferenceRouteRequirement | undefined
}

/**
 * Complete multi-task DAG plan input.
 */
export interface RunPlan {
  readonly runId?: string | undefined
  readonly goal: string
  readonly repository?: string | undefined
  readonly baseBranch?: string | undefined
  readonly maxConcurrency?: number | undefined
  readonly tasks: readonly TaskPlanDefinition[]
  readonly constraints?: readonly string[] | undefined
  readonly projectContext?: ProjectPromptContext | undefined
  readonly defaultVerificationPlan?: VerificationPlan | undefined
}

/**
 * Result of orchestrator run execution.
 */
export interface OrchestratorResult {
  readonly runId: string
  readonly status: RunStatus
  readonly tasks: readonly Task[]
  readonly materializedCommits: Readonly<Record<string, string>>
  readonly handoffs?: readonly TaskHandoff[] | undefined
  readonly artifacts?: readonly TaskArtifactRef[] | undefined
  readonly reviewResults?: readonly IndependentReviewResult[] | undefined
  readonly integrationResults?: readonly IntegrationPreparationResult[] | undefined
}

/**
 * Runtime state snapshot of the bounded scheduler.
 */
export interface SchedulerTelemetry {
  readonly maxConcurrency: number
  readonly activeCount: number
  readonly readyCount: number
  readonly waitingApprovalCount: number
  readonly completedCount: number
  readonly failedCount: number
  readonly cancelledCount: number
}
