import React, { useMemo, useState } from 'react'
import { computeTopologicalRanks } from '@gravitas/core'
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
      case 'COMPOSITION_CONFLICT':
        return {
          fg: '#fb7185',
          bg: 'rgba(225, 29, 72, 0.15)',
          border: '#e11d48',
          pulse: true,
        }
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

  const getTaskVisualBadge = (t: Task): string => {
    const raw = t as unknown as { readonly failureReason?: string; readonly statusMessage?: string }
    if (
      t.state === 'FAILED' &&
      (raw.statusMessage?.includes('COMPOSITION') || raw.failureReason?.includes('COMPOSITION'))
    ) {
      return 'COMPOSITION_CONFLICT'
    }
    return t.state
  }

  const colWidth = 230
  const colGap = 56
  const nodeHeight = 92
  const nodeGap = 14
  const headerHeight = 28

  const dagLayout = useMemo(() => {
    if (tasks.length === 0) {
      return { levels: [], edges: [], canvasWidth: 300, canvasHeight: 120, colWidth, colGap }
    }

    const ranks = computeTopologicalRanks(
      tasks.map((t) => ({
        id: t.id,
        dependencies: t.dependencies.map((d) => (typeof d === 'string' ? d : d.taskId)),
      }))
    )

    const maxRank = Math.max(...Array.from(ranks.values()), 0)
    const levels: Task[][] = Array.from({ length: maxRank + 1 }, () => [])

    for (const t of tasks) {
      const r = ranks.get(t.id) ?? 0
      levels[r]!.push(t)
    }

    const nodePositions = new Map<string, { x: number; y: number }>()

    levels.forEach((lvlTasks, colIdx) => {
      const colX = colIdx * (colWidth + colGap) + 20
      lvlTasks.forEach((t, rowIdx) => {
        const rowY = headerHeight + rowIdx * (nodeHeight + nodeGap)
        nodePositions.set(t.id, { x: colX, y: rowY })
      })
    })

    interface DagEdge {
      readonly id: string
      readonly fromX: number
      readonly fromY: number
      readonly toX: number
      readonly toY: number
      readonly isBlocked: boolean
    }

    const edges: DagEdge[] = []

    for (const t of tasks) {
      const targetPos = nodePositions.get(t.id)
      if (!targetPos) continue

      const depIds = t.dependencies.map((d) => (typeof d === 'string' ? d : d.taskId))
      for (const depId of depIds) {
        const sourcePos = nodePositions.get(depId)
        if (!sourcePos) continue

        const depTask = tasks.find((item) => item.id === depId)
        const isBlocked = depTask ? depTask.state !== 'APPROVED' && depTask.state !== 'SUCCEEDED' : true

        edges.push({
          id: `${depId}->${t.id}`,
          fromX: sourcePos.x + colWidth,
          fromY: sourcePos.y + nodeHeight / 2,
          toX: targetPos.x,
          toY: targetPos.y + nodeHeight / 2,
          isBlocked,
        })
      }
    }

    const maxRows = Math.max(...levels.map((lvl) => lvl.length), 1)
    const canvasHeight = Math.max(headerHeight + maxRows * (nodeHeight + nodeGap) + 30, 160)
    const canvasWidth = Math.max(levels.length * (colWidth + colGap) + 40, 560)

    return { levels, edges, canvasWidth, canvasHeight, colWidth, colGap }
  }, [tasks])

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

      {/* VIEW 1: RUN DAG (TOPOLOGICAL LEVEL COLUMNS & DIRECTED EDGES) */}
      {viewMode === 'DAG' && (
        <div
          data-testid="run-dag-view"
          style={{
            position: 'relative',
            minHeight: `${dagLayout.canvasHeight}px`,
            minWidth: `${dagLayout.canvasWidth}px`,
            overflowX: 'auto',
            padding: '16px 0',
          }}
        >
          {tasks.length === 0 ? (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '12px' }}>
              No tasks declared in this run plan yet.
            </div>
          ) : (
            <>
              {/* SVG Connecting Directed Arrows Layer */}
              <svg
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: `${dagLayout.canvasWidth}px`,
                  height: `${dagLayout.canvasHeight}px`,
                  pointerEvents: 'none',
                  zIndex: 1,
                }}
              >
                <defs>
                  <marker
                    id="dag-arrow"
                    viewBox="0 0 10 10"
                    refX="9"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--border-focus)" />
                  </marker>
                </defs>
                {dagLayout.edges.map((edge) => (
                  <path
                    key={edge.id}
                    d={`M ${edge.fromX} ${edge.fromY} C ${edge.fromX + 36} ${edge.fromY}, ${edge.toX - 36} ${edge.toY}, ${edge.toX} ${edge.toY}`}
                    stroke="var(--border-focus)"
                    strokeWidth="2"
                    strokeDasharray={edge.isBlocked ? '4 3' : 'none'}
                    fill="none"
                    markerEnd="url(#dag-arrow)"
                    opacity={edge.isBlocked ? 0.4 : 0.85}
                  />
                ))}
              </svg>

              {/* Column Rank Headers & Task Nodes */}
              {dagLayout.levels.map((level, colIdx) => {
                const colX = colIdx * (dagLayout.colWidth + dagLayout.colGap) + 20
                const levelLabel =
                  colIdx === 0
                    ? 'LEVEL 0 (ROOT)'
                    : colIdx === dagLayout.levels.length - 1 && dagLayout.levels.length > 2
                      ? `LEVEL ${colIdx} (JOIN)`
                      : `LEVEL ${colIdx} (PARALLEL)`

                return (
                  <div
                    key={colIdx}
                    style={{
                      position: 'absolute',
                      left: `${colX}px`,
                      top: 0,
                      width: `${dagLayout.colWidth}px`,
                      zIndex: 2,
                    }}
                  >
                    <div
                      style={{
                        fontSize: '10px',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        color: 'var(--text-secondary)',
                        letterSpacing: '0.4px',
                        marginBottom: '8px',
                        paddingBottom: '4px',
                        borderBottom: '1px solid var(--border-subtle)',
                        textTransform: 'uppercase',
                      }}
                    >
                      {levelLabel}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {level.map((t) => {
                        const isSelected = (selectedTaskId ?? task?.id) === t.id
                        const displayState = getTaskVisualBadge(t)
                        const colors = getNodeColors(displayState)
                        const depIds = t.dependencies.map((d) => (typeof d === 'string' ? d : d.taskId))

                        return (
                          <div
                            key={t.id}
                            onClick={() => onSelectTask?.(t.id)}
                            data-testid={`dag-task-node-${t.id}`}
                            style={{
                              width: '100%',
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
                              boxShadow: isSelected
                                ? '0 0 14px rgba(56, 189, 248, 0.35)'
                                : 'none',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '6px',
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
                                {displayState}
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
                      })}
                    </div>
                  </div>
                )
              })}
            </>
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
