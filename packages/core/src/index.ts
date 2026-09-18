/**
 * @gravitas/core — Wave 0 baseline
 *
 * This module is a placeholder. Domain model types (Project, Run, Goal,
 * ExecutionContract, Task, TaskDependency, AgentHarness, AgentExecution,
 * Verification, EvidenceArtifact, Approval, Event) will be added in Wave 1.
 *
 * Only the task state enum is defined here because it is the invariant
 * that every future wave depends on, and it must be defined before any
 * other type can reference it.
 */

/**
 * Task states — the only valid FSM states for a Task.
 *
 * State transitions are enforced by the orchestrator state machine;
 * no code outside the orchestrator may write directly to task.state.
 *
 * PLANNED      → task exists in the DAG, dependencies not yet resolved
 * BLOCKED      → waiting for upstream tasks to complete
 * READY        → all dependencies satisfied, eligible for dispatch
 * RUNNING      → an agent harness has been launched
 * VERIFYING    → worker has exited; the verifier is inspecting evidence
 * WAITING_APPROVAL → verification complete; human review required
 * APPROVED     → human has explicitly accepted the work
 * FAILED       → non-recoverable error; captured in evidence
 * CANCELLED    → task was aborted before completion (dependency failure, etc.)
 */
export type TaskState =
  | 'PLANNED'
  | 'BLOCKED'
  | 'READY'
  | 'RUNNING'
  | 'VERIFYING'
  | 'WAITING_APPROVAL'
  | 'APPROVED'
  | 'FAILED'
  | 'CANCELLED'

/** Branded package version — single source of truth. */
export const GRAVITAS_VERSION = '0.0.1' as const
