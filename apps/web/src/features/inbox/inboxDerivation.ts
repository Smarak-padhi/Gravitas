/**
 * Deterministic Human Inbox Derivation
 * Derives actionable operator notifications from real Gravitas runs, tasks, and verifier state.
 * Zero synthetic notifications.
 */

import type { GravitasEvent, Run, Task, TaskDetailResponse } from '../../api/types.js'

export type InboxSeverity = 'CRITICAL' | 'ACTION_REQUIRED' | 'IMPORTANT' | 'FYI'

export interface InboxItem {
  readonly id: string
  readonly severity: InboxSeverity
  readonly title: string
  readonly summary: string
  readonly runId: string
  readonly taskId?: string | undefined
  readonly timestamp: string
  readonly actionType?: 'APPROVE' | 'INSPECT_FAILURE' | 'VIEW_DIFF' | 'VIEW_TASK' | undefined
  readonly isAcknowledged?: boolean | undefined
}

export interface DeriveInboxInput {
  readonly runs: readonly Run[]
  readonly tasks: readonly Task[]
  readonly taskDetail: TaskDetailResponse | null
  readonly events: readonly GravitasEvent[]
  readonly acknowledgedIds?: ReadonlySet<string> | undefined
}

const SEVERITY_RANK: Record<InboxSeverity, number> = {
  CRITICAL: 4,
  ACTION_REQUIRED: 3,
  IMPORTANT: 2,
  FYI: 1,
}

/**
 * Pure function deriving prioritized inbox items.
 */
export function deriveInboxItems(input: DeriveInboxInput): readonly InboxItem[] {
  const { runs, tasks, taskDetail, events: _events, acknowledgedIds = new Set() } = input
  const items: InboxItem[] = []

  // 1. Scan tasks for WAITING_APPROVAL (MANDATORY HUMAN REVIEW)
  for (const task of tasks) {
    if (task.state === 'WAITING_APPROVAL') {
      items.push({
        id: `inbox_approval_${task.runId}_${task.id}`,
        severity: 'ACTION_REQUIRED',
        title: `Human Review Required: ${task.title}`,
        summary: `Independent verifier passed all criteria for task [${task.id}]. Verify mutation diff before approving.`,
        runId: task.runId,
        taskId: task.id,
        timestamp: task.updatedAt || task.createdAt,
        actionType: 'APPROVE',
        isAcknowledged: acknowledgedIds.has(`inbox_approval_${task.runId}_${task.id}`),
      })
    }

    // 2. Scan tasks for FAILED
    if (task.state === 'FAILED') {
      items.push({
        id: `inbox_failed_${task.runId}_${task.id}`,
        severity: 'CRITICAL',
        title: `Task Failed: ${task.title}`,
        summary: `Task [${task.id}] failed during worker execution or verification.`,
        runId: task.runId,
        taskId: task.id,
        timestamp: task.updatedAt || task.createdAt,
        actionType: 'INSPECT_FAILURE',
        isAcknowledged: acknowledgedIds.has(`inbox_failed_${task.runId}_${task.id}`),
      })
    }

    // 3. Scan tasks for BLOCKED
    if (task.state === 'BLOCKED') {
      items.push({
        id: `inbox_blocked_${task.runId}_${task.id}`,
        severity: 'IMPORTANT',
        title: `Task Blocked: ${task.title}`,
        summary: `Task [${task.id}] is waiting on upstream task dependencies.`,
        runId: task.runId,
        taskId: task.id,
        timestamp: task.updatedAt || task.createdAt,
        actionType: 'VIEW_TASK',
        isAcknowledged: acknowledgedIds.has(`inbox_blocked_${task.runId}_${task.id}`),
      })
    }
  }

  // 4. Scan taskDetail for mutation violations (HEAD mutated or unexpected files)
  if (taskDetail?.mutationSummary) {
    if (taskDetail.mutationSummary.headMutated) {
      items.push({
        id: `inbox_mutation_head_${taskDetail.task.runId}_${taskDetail.task.id}`,
        severity: 'CRITICAL',
        title: `Security Violation: Unauthorized HEAD Mutation`,
        summary: `Worker created an unauthorized Git commit on task [${taskDetail.task.id}]. Worktree must remain clean commits.`,
        runId: taskDetail.task.runId,
        taskId: taskDetail.task.id,
        timestamp: new Date().toISOString(),
        actionType: 'VIEW_DIFF',
        isAcknowledged: acknowledgedIds.has(`inbox_mutation_head_${taskDetail.task.runId}_${taskDetail.task.id}`),
      })
    }

    if (!taskDetail.mutationSummary.isScopeCompliant && taskDetail.mutationSummary.unexpectedChanges.length > 0) {
      items.push({
        id: `inbox_mutation_scope_${taskDetail.task.runId}_${taskDetail.task.id}`,
        severity: 'CRITICAL',
        title: `Change Scope Violation: Unexpected Files Modified`,
        summary: `Worker modified ${taskDetail.mutationSummary.unexpectedChanges.length} out-of-scope files: ${taskDetail.mutationSummary.unexpectedChanges.join(', ')}`,
        runId: taskDetail.task.runId,
        taskId: taskDetail.task.id,
        timestamp: new Date().toISOString(),
        actionType: 'VIEW_DIFF',
        isAcknowledged: acknowledgedIds.has(`inbox_mutation_scope_${taskDetail.task.runId}_${taskDetail.task.id}`),
      })
    }
  }

  // 5. Scan recent completed runs for FYI notifications
  for (const run of runs) {
    if (run.status === 'COMPLETED') {
      items.push({
        id: `inbox_run_completed_${run.id}`,
        severity: 'FYI',
        title: `Run Completed: ${run.goal}`,
        summary: `Run [${run.id}] finished successfully with all tasks verified and approved.`,
        runId: run.id,
        timestamp: run.updatedAt || run.createdAt,
        actionType: 'VIEW_TASK',
        isAcknowledged: acknowledgedIds.has(`inbox_run_completed_${run.id}`),
      })
    }
  }

  // Deduplicate by ID
  const seen = new Set<string>()
  const deduped: InboxItem[] = []
  for (const item of items) {
    if (!seen.has(item.id)) {
      seen.add(item.id)
      deduped.push(item)
    }
  }

  // Sort by severity descending (CRITICAL -> ACTION_REQUIRED -> IMPORTANT -> FYI), then by timestamp descending
  return deduped.sort((a, b) => {
    const rankDiff = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]
    if (rankDiff !== 0) return rankDiff
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  })
}
