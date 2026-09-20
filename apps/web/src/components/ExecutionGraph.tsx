import React, { useState } from 'react'
import type { Task, TaskDetailResponse } from '../api/types.js'

export interface ExecutionGraphProps {
  readonly task: Task | null
  readonly taskDetail: TaskDetailResponse | null
  readonly runStatus: string | null
  readonly tasks?: readonly Task[] | undefined
  readonly selectedTaskId?: string | null | undefined
  readonly onSelectTask?: ((taskId: string) => void) | undefined
}

type NodeStatus =
  | 'PENDING'
  | 'READY'
  | 'RUNNING'
  | 'VERIFYING'
  | 'WAITING_APPROVAL'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'BLOCKED'

interface StageNode {
  readonly id: string
  readonly label: string
  readonly sublabel: string
  readonly status: NodeStatus
  readonly detail?: string | undefined
}

export const ExecutionGraph: React.FC<ExecutionGraphProps> = ({
  task,
  taskDetail,
  runStatus,
  tasks = [],
  selectedTaskId,
  onSelectTask,
}) => {
  const hasMultipleTasks = tasks.length > 1
  const [viewMode, setViewMode] = useState<'DAG' | 'PIPELINE'>(hasMultipleTasks ? 'DAG' : 'PIPELINE')

  const getStageStatuses = (): StageNode[] => {
    if (!task) {
      return [
        { id: 'goal', label: '1. GOAL', sublabel: 'Contract & Spec', status: 'PENDING' },
        { id: 'task', label: '2. TASK', sublabel: 'Worktree & Branch', status: 'PENDING' },
        { id: 'worker', label: '3. WORKER', sublabel: 'AI Mutation', status: 'PENDING' },
        { id: 'verify', label: '4. VERIFY', sublabel: 'Shell-Free Runner', status: 'PENDING' },
        { id: 'evidence', label: '5. EVIDENCE', sublabel: 'Bundle & Diff', status: 'PENDING' },
        { id: 'approval', label: '6. APPROVAL', sublabel: 'Human Review', status: 'PENDING' },
      ]
    }

    const state = task.state
    const hasEvidence = taskDetail?.evidenceAvailable ?? false
    const verifPassed = taskDetail?.verificationSummary?.status === 'PASSED'
    const verifFailed = taskDetail?.verificationSummary?.status === 'FAILED'

    // Stage 1: GOAL
    const goalStatus: NodeStatus = 'COMPLETED'

    // Stage 2: TASK
    const taskStatus: NodeStatus = 'COMPLETED'

    // Stage 3: WORKER
    const isFinished = state === 'APPROVED' || state === 'SUCCEEDED' || (state as string) === 'COMPLETED'

    let workerStatus: NodeStatus = 'PENDING'
    if (state === 'RUNNING') {
      workerStatus = 'RUNNING'
    } else if (state === 'VERIFYING' || state === 'WAITING_APPROVAL' || isFinished) {
      workerStatus = 'COMPLETED'
    } else if (state === 'FAILED' && !taskDetail?.verificationSummary) {
      workerStatus = 'FAILED'
    } else if (state === 'FAILED' && taskDetail?.verificationSummary) {
      workerStatus = 'COMPLETED'
    }

    // Stage 4: VERIFY
    let verifyStatus: NodeStatus = 'PENDING'
    if (state === 'VERIFYING') {
      verifyStatus = 'VERIFYING'
    } else if (verifPassed) {
      verifyStatus = 'COMPLETED'
    } else if (verifFailed) {
      verifyStatus = 'FAILED'
    } else if (state === 'WAITING_APPROVAL' || isFinished) {
      verifyStatus = 'COMPLETED'
    }

    // Stage 5: EVIDENCE
    let evidenceStatus: NodeStatus = 'PENDING'
    if (hasEvidence) {
      evidenceStatus = 'COMPLETED'
    } else if (state === 'WAITING_APPROVAL' || isFinished) {
      evidenceStatus = 'COMPLETED'
    }

    // Stage 6: APPROVAL
    let approvalStatus: NodeStatus = 'PENDING'
    if (state === 'WAITING_APPROVAL') {
      approvalStatus = 'WAITING_APPROVAL'
    } else if (isFinished || runStatus === 'COMPLETED') {
      approvalStatus = 'COMPLETED'
    } else if (state === 'FAILED') {
      approvalStatus = 'FAILED'
    }

    return [
      {
        id: 'goal',
        label: '1. GOAL',
        sublabel: 'Contract Validated',
        status: goalStatus,
      },
      {
        id: 'task',
        label: '2. TASK',
        sublabel: 'Isolated Worktree',
        status: taskStatus,
      },
      {
        id: 'worker',
        label: '3. WORKER',
        sublabel: 'AI Mutation Capture',
        status: workerStatus,
      },
      {
        id: 'verify',
        label: '4. VERIFY',
        sublabel: 'Independent Runner',
        status: verifyStatus,
      },
      {
        id: 'evidence',
        label: '5. EVIDENCE',
        sublabel: 'Diff & Manifest',
        status: evidenceStatus,
      },
      {
        id: 'approval',
        label: '6. APPROVAL',
        sublabel: 'Human Review Gate',
        status: approvalStatus,
      },
    ]
  }

  const stages = getStageStatuses()

  const getNodeColors = (status: NodeStatus | string) => {
    switch (status) {
      case 'RUNNING':
        return {
          fg: 'var(--state-running-fg)',
          bg: 'var(--state-running-bg)',
          border: 'var(--state-running-border)',
          glow: true,
        }
      case 'VERIFYING':
        return {
          fg: 'var(--state-verifying-fg)',
          bg: 'var(--state-verifying-bg)',
          border: 'var(--state-verifying-border)',
          glow: true,
        }
      case 'WAITING_APPROVAL':
        return {
          fg: 'var(--state-waiting-fg)',
          bg: 'var(--state-waiting-bg)',
          border: 'var(--state-waiting-border)',
          pulse: true,
        }
      case 'APPROVED':
      case 'COMPLETED':
        return {
          fg: 'var(--state-success-fg)',
          bg: 'var(--state-success-bg)',
          border: 'var(--state-success-border)',
        }
      case 'FAILED':
        return {
          fg: 'var(--state-failure-fg)',
          bg: 'var(--state-failure-bg)',
          border: 'var(--state-failure-border)',
        }
      case 'READY':
        return {
          fg: 'var(--accent-primary)',
          bg: 'rgba(56, 189, 248, 0.12)',
          border: 'rgba(56, 189, 248, 0.4)',
        }
      case 'BLOCKED':
      case 'CANCELLED':
        return {
          fg: 'var(--text-muted)',
          bg: 'var(--bg-panel)',
          border: 'var(--border-subtle)',
        }
      case 'PENDING':
      default:
        return {
          fg: 'var(--text-muted)',
          bg: 'var(--bg-panel)',
          border: 'var(--border-subtle)',
        }
    }
  }

  return (
    <div
      style={{
        padding: '14px 20px',
        backgroundColor: 'var(--bg-panel-subtle)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        overflowX: 'auto',
      }}
    >
      {/* Header bar with View Switcher & Telemetry */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              color: 'var(--text-muted)',
              letterSpacing: '0.5px',
            }}
          >
            EXECUTION GRAPH
          </span>
          {tasks.length > 0 && (
            <span
              style={{
                fontSize: '10px',
                fontFamily: 'var(--font-mono)',
                padding: '1px 6px',
                backgroundColor: 'var(--bg-panel)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-secondary)',
              }}
            >
              {tasks.length} {tasks.length === 1 ? 'TASK' : 'TASKS'}
            </span>
          )}
        </div>

        {/* View Mode Toggle */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--bg-panel)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '2px',
            gap: '2px',
          }}
        >
          <button
            onClick={() => setViewMode('DAG')}
            style={{
              background: viewMode === 'DAG' ? 'var(--accent-primary)' : 'transparent',
              color: viewMode === 'DAG' ? '#0f172a' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: 'var(--radius-xs)',
              padding: '3px 8px',
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            RUN DAG
          </button>
          <button
            onClick={() => setViewMode('PIPELINE')}
            style={{
              background: viewMode === 'PIPELINE' ? 'var(--accent-primary)' : 'transparent',
              color: viewMode === 'PIPELINE' ? '#0f172a' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: 'var(--radius-xs)',
              padding: '3px 8px',
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            TASK PIPELINE
          </button>
        </div>
      </div>

      {/* VIEW 1: RUN DAG */}
      {viewMode === 'DAG' && (
        <div
          data-testid="run-dag-view"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            alignItems: 'stretch',
            minHeight: '80px',
          }}
        >
          {tasks.length === 0 ? (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '12px' }}>
              No tasks declared in this run plan yet.
            </div>
          ) : (
            tasks.map((t) => {
              const isSelected = (selectedTaskId ?? task?.id) === t.id
              const colors = getNodeColors(t.state)
              const depIds = t.dependencies.map((d) => (typeof d === 'string' ? d : d.taskId))

              return (
                <div
                  key={t.id}
                  onClick={() => onSelectTask?.(t.id)}
                  data-testid={`dag-task-node-${t.id}`}
                  style={{
                    flex: '1 1 200px',
                    maxWidth: '280px',
                    padding: '10px 12px',
                    backgroundColor: isSelected ? 'var(--bg-panel-elevated)' : colors.bg,
                    border: isSelected
                      ? '2px solid var(--accent-primary)'
                      : `1px solid ${colors.border}`,
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    cursor: 'pointer',
                    boxShadow: isSelected ? '0 0 12px rgba(56, 189, 248, 0.3)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: colors.fg,
                      }}
                    >
                      {t.id}
                    </span>
                    <span
                      style={{
                        fontSize: '9px',
                        fontFamily: 'var(--font-mono)',
                        padding: '1px 5px',
                        borderRadius: 'var(--radius-xs)',
                        backgroundColor: colors.bg,
                        color: colors.fg,
                        border: `1px solid ${colors.border}`,
                        fontWeight: 700,
                      }}
                    >
                      {t.state}
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      lineHeight: '1.3',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                    title={t.title}
                  >
                    {t.title}
                  </div>

                  {/* Dependency relationships */}
                  <div
                    style={{
                      fontSize: '9px',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-muted)',
                      marginTop: 'auto',
                      paddingTop: '4px',
                      borderTop: '1px solid var(--border-subtle)',
                    }}
                  >
                    {depIds.length === 0 ? (
                      <span>Root Task (No Deps)</span>
                    ) : (
                      <span>Depends on: {depIds.join(', ')}</span>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* VIEW 2: TASK PIPELINE (6-stage Golden Loop) */}
      {viewMode === 'PIPELINE' && (
        <div
          data-testid="task-pipeline-view"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            minWidth: '700px',
          }}
        >
          {stages.map((stage, idx) => {
            const colors = getNodeColors(stage.status)
            const isLast = idx === stages.length - 1

            return (
              <React.Fragment key={stage.id}>
                <div
                  style={{
                    flex: 1,
                    minWidth: '100px',
                    maxWidth: '160px',
                    padding: '10px 12px',
                    backgroundColor: colors.bg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    position: 'relative',
                    animation: colors.pulse ? 'pulseGlow 1.8s infinite ease-in-out' : 'none',
                    boxShadow: colors.glow ? `0 0 10px ${colors.border}` : 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: colors.fg,
                      }}
                    >
                      {stage.label}
                    </span>
                    <span
                      style={{
                        fontSize: '10px',
                        color: colors.fg,
                        fontWeight: 700,
                      }}
                    >
                      {stage.status === 'COMPLETED' && '✓'}
                      {stage.status === 'FAILED' && '✕'}
                      {stage.status === 'WAITING_APPROVAL' && '⚠'}
                      {stage.status === 'RUNNING' && '●'}
                      {stage.status === 'VERIFYING' && '●'}
                      {stage.status === 'PENDING' && '○'}
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: '10px',
                      color: 'var(--text-secondary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={stage.sublabel}
                  >
                    {stage.sublabel}
                  </div>
                </div>

                {!isLast && (
                  <div
                    style={{
                      color: 'var(--border-color)',
                      fontSize: '16px',
                      fontWeight: 700,
                      userSelect: 'none',
                      padding: '0 2px',
                    }}
                  >
                    →
                  </div>
                )}
              </React.Fragment>
            )
          })}
        </div>
      )}
    </div>
  )
}
