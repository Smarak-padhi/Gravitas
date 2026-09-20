import React from 'react'
import type { WorkerPresentation } from './officeState.js'
import type { Run, Task } from '../../api/types.js'
import { LivingHqCanvas } from '../hq/LivingHqCanvas.js'

export interface OfficeFloorProps {
  readonly workers: readonly WorkerPresentation[]
  readonly selectedWorkerId: string | null
  readonly onSelectWorker: (workerId: string) => void
  readonly onExecuteTask?: () => void
  readonly onApproveTask?: () => void
  readonly onInspectEvidence?: () => void
  readonly isActing?: boolean | undefined
  readonly onNewRunClick?: () => void
  readonly waitingApprovalTask?: { readonly id: string; readonly title: string } | null | undefined
  readonly run?: Run | null | undefined
  readonly tasks?: readonly Task[] | undefined
  readonly activeTask?: Task | null | undefined
  readonly harness?: {
    readonly id: string
    readonly status: string
    readonly message?: string | undefined
  } | undefined
  readonly onSelectTask?: ((taskId: string) => void) | undefined
}

export const OfficeFloor: React.FC<OfficeFloorProps> = ({
  workers,
  selectedWorkerId,
  onSelectWorker,
  onExecuteTask,
  onApproveTask,
  onInspectEvidence,
  isActing = false,
  onNewRunClick,
  waitingApprovalTask: _waitingApprovalTask,
  run = null,
  tasks = [],
  activeTask = null,
  harness,
  onSelectTask,
}) => {
  // Resolved harness fallback from workers if not explicitly passed
  const resolvedHarness = harness ?? {
    id: workers[0]?.id || 'fake-deterministic-worker',
    status: 'AVAILABLE',
  }

  // Construct Task objects from WorkerPresentation if tasks array is empty but workers exist
  const effectiveTasks: readonly Task[] =
    tasks.length > 0
      ? tasks
      : workers
          .filter((w) => Boolean(w.currentTaskId))
          .map((w) => ({
            id: w.currentTaskId!,
            runId: run?.id || 'run-current',
            title: w.currentTaskTitle || w.currentTaskId!,
            objective: w.currentTaskObjective || 'Autonomous task implementation',
            state: (w.state === 'ASSIGNED'
              ? 'READY'
              : w.state === 'WORKING'
                ? 'RUNNING'
                : w.state === 'VERIFYING'
                  ? 'VERIFYING'
                  : w.state === 'NEEDS_YOU'
                    ? 'WAITING_APPROVAL'
                    : w.state === 'DONE'
                      ? 'SUCCEEDED'
                      : w.state === 'FAILED'
                        ? 'FAILED'
                        : 'READY') as Task['state'],
            requiresApproval: true,
            dependencies: [],
            acceptanceCriteria: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            failureReason: w.failureReason,
          }))

  const effectiveActiveTask: Task | null =
    activeTask ??
    effectiveTasks.find((t) => t.id === workers.find((w) => w.id === selectedWorkerId)?.currentTaskId) ??
    effectiveTasks[0] ??
    null

  return (
    <div
      data-testid="office-floor"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backgroundColor: 'var(--hq-canvas, #F7F5F0)',
      }}
    >
      <LivingHqCanvas
        run={run}
        tasks={effectiveTasks}
        activeTask={effectiveActiveTask}
        harness={resolvedHarness}
        selectedWorkerId={selectedWorkerId}
        onSelectWorker={onSelectWorker}
        onExecuteTask={onExecuteTask}
        onApproveResult={onApproveTask}
        onInspectEvidence={onInspectEvidence}
        isActing={isActing}
        onNewRunClick={onNewRunClick}
        onSelectTask={onSelectTask}
      />
    </div>
  )
}
