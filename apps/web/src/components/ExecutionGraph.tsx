import React from 'react'
import type { Task, TaskDetailResponse } from '../api/types.js'

export interface ExecutionGraphProps {
  readonly task: Task | null
  readonly taskDetail: TaskDetailResponse | null
  readonly runStatus: string | null
}

type NodeStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'VERIFYING'
  | 'WAITING_APPROVAL'
  | 'COMPLETED'
  | 'FAILED'

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
}) => {
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
    let workerStatus: NodeStatus = 'PENDING'
    if (state === 'RUNNING') {
      workerStatus = 'RUNNING'
    } else if (
      state === 'VERIFYING' ||
      state === 'WAITING_APPROVAL' ||
      state === 'APPROVED' ||
      state === 'SUCCEEDED'
    ) {
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
    } else if (
      state === 'WAITING_APPROVAL' ||
      state === 'APPROVED' ||
      state === 'SUCCEEDED'
    ) {
      verifyStatus = 'COMPLETED'
    }

    // Stage 5: EVIDENCE
    let evidenceStatus: NodeStatus = 'PENDING'
    if (hasEvidence) {
      evidenceStatus = 'COMPLETED'
    } else if (state === 'WAITING_APPROVAL' || state === 'APPROVED' || state === 'SUCCEEDED') {
      evidenceStatus = 'COMPLETED'
    }

    // Stage 6: APPROVAL
    let approvalStatus: NodeStatus = 'PENDING'
    if (state === 'WAITING_APPROVAL') {
      approvalStatus = 'WAITING_APPROVAL'
    } else if (state === 'APPROVED' || state === 'SUCCEEDED' || runStatus === 'COMPLETED') {
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

  const getNodeColors = (status: NodeStatus) => {
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
        padding: '16px 20px',
        backgroundColor: 'var(--bg-panel-subtle)',
        borderBottom: '1px solid var(--border-color)',
        overflowX: 'auto',
      }}
    >
      <div
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
    </div>
  )
}
