import React, { useState } from 'react'
import type { Task, TaskDetailResponse } from '../api/types.js'
import { DiffViewer } from './DiffViewer.js'
import { PromptManager } from './PromptManager.js'

export interface TaskInspectorProps {
  readonly task: Task | null
  readonly taskDetail: TaskDetailResponse | null
  readonly diff: string
  readonly isLoadingDiff: boolean
  readonly onApprove: (reviewer: string) => Promise<void>
  readonly onReject: (reason: string) => Promise<void>
  readonly onExecuteRun?: () => Promise<void>
  readonly isActing: boolean
}

export const TaskInspector: React.FC<TaskInspectorProps> = ({
  task,
  taskDetail,
  diff,
  isLoadingDiff,
  onApprove,
  onReject,
  onExecuteRun,
  isActing,
}) => {
  const [reviewer, setReviewer] = useState('operator')
  const [rejectReason, setRejectReason] = useState('Scope mismatch')
  const [showRejectBox, setShowRejectBox] = useState(false)

  if (!task) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: '13px',
          padding: '40px',
        }}
      >
        Select a run or create a new run to inspect task execution details.
      </div>
    )
  }

  const isWaitingApproval = task.state === 'WAITING_APPROVAL'
  const isReady = task.state === 'READY'
  const isRunning = task.state === 'RUNNING' || task.state === 'VERIFYING'

  const getStatusBadge = (state: string) => {
    let fg = 'var(--text-muted)'
    let bg = 'var(--bg-panel)'
    let border = 'var(--border-color)'

    if (state === 'READY') {
      fg = 'var(--state-ready-fg)'
      bg = 'var(--state-ready-bg)'
      border = 'var(--state-ready-border)'
    } else if (state === 'RUNNING') {
      fg = 'var(--state-running-fg)'
      bg = 'var(--state-running-bg)'
      border = 'var(--state-running-border)'
    } else if (state === 'VERIFYING') {
      fg = 'var(--state-verifying-fg)'
      bg = 'var(--state-verifying-bg)'
      border = 'var(--state-verifying-border)'
    } else if (state === 'WAITING_APPROVAL') {
      fg = 'var(--state-waiting-fg)'
      bg = 'var(--state-waiting-bg)'
      border = 'var(--state-waiting-border)'
    } else if (state === 'APPROVED' || state === 'SUCCEEDED') {
      fg = 'var(--state-success-fg)'
      bg = 'var(--state-success-bg)'
      border = 'var(--state-success-border)'
    } else if (state === 'FAILED') {
      fg = 'var(--state-failure-fg)'
      bg = 'var(--state-failure-bg)'
      border = 'var(--state-failure-border)'
    }

    return (
      <span
        style={{
          fontSize: '11px',
          fontWeight: 700,
          fontFamily: 'var(--font-mono)',
          padding: '3px 8px',
          borderRadius: 'var(--radius-sm)',
          color: fg,
          backgroundColor: bg,
          border: `1px solid ${border}`,
        }}
      >
        {state}
      </span>
    )
  }

  const isCompositionConflict =
    task.state === 'FAILED' &&
    Boolean(
      (task as unknown as { readonly failureReason?: string; readonly statusMessage?: string }).failureReason?.includes('COMPOSITION') ||
        (task as unknown as { readonly failureReason?: string; readonly statusMessage?: string }).statusMessage?.includes('COMPOSITION')
    )

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      {/* Header Info */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          paddingBottom: '16px',
          borderBottom: '1px solid var(--border-color)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                color: 'var(--text-muted)',
              }}
            >
              TASK: {task.id}
            </span>
            {getStatusBadge(isCompositionConflict ? 'COMPOSITION_CONFLICT' : task.state)}
          </div>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {task.title}
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {task.objective}
          </p>
        </div>

        {/* Action if READY */}
        {isReady && onExecuteRun && (
          <button
            onClick={() => void onExecuteRun()}
            disabled={isActing}
            style={{
              padding: '8px 18px',
              backgroundColor: 'var(--state-running-border)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              fontSize: '12px',
              cursor: isActing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            ▶ Execute Golden Loop
          </button>
        )}
      </div>

      {/* COMPOSITION CONFLICT UX BANNER */}
      {isCompositionConflict && (
        <div
          data-testid="composition-conflict-banner"
          style={{
            padding: '16px 20px',
            backgroundColor: 'rgba(225, 29, 72, 0.12)',
            border: '2px solid #e11d48',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 0 16px rgba(225, 29, 72, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px', color: '#f43f5e' }}>⚠</span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#f43f5e', letterSpacing: '0.5px' }}>
                COMPOSITION CONFLICT DETECTED
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                A Git merge or cherry-pick conflict occurred while composing upstream parent commits into this task&apos;s isolated worktree.
                Verification was safely aborted before execution because clean rebase onto upstream dependencies was not possible.
              </div>
            </div>
          </div>
          <div
            style={{
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              padding: '8px 12px',
              backgroundColor: 'var(--bg-app)',
              border: '1px solid rgba(225, 29, 72, 0.3)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
            }}
          >
            Resolution: Reconcile upstream branch divergence or update RunPlan dependencies to establish strict sequential precedence.
          </div>
        </div>
      )}

      {/* 3 VISUALLY DISTINCT AUTHORITY SECTIONS */}
      {/* SECTIONS 1 & 2: 2-COLUMN RESPONSIVE GRID */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '12px',
          flexShrink: 0,
        }}
      >
        {/* AUTHORITY SECTION 1: WORKER CLAIM (MUTATION CAPTURE) */}
        <div
          data-testid="authority-section-worker"
          style={{
            padding: '14px 16px',
            backgroundColor: 'var(--bg-panel)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '8px',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.4px' }}>
              SECTION 1 · WORKER CLAIM: MUTATION CAPTURE
            </div>
            <span
              style={{
                fontSize: '9px',
                fontFamily: 'var(--font-mono)',
                padding: '2px 6px',
                borderRadius: 'var(--radius-xs)',
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                color: 'var(--state-running-fg)',
                fontWeight: 700,
              }}
            >
              AUTHORITY: WORKER CLAIM
            </span>
          </div>

          {taskDetail?.mutationSummary ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Scope Compliant:</span>
                <span
                  style={{
                    fontWeight: 700,
                    color: taskDetail.mutationSummary.isScopeCompliant
                      ? 'var(--state-success-fg)'
                      : 'var(--state-failure-fg)',
                  }}
                >
                  {taskDetail.mutationSummary.isScopeCompliant ? 'YES' : 'NO (VIOLATION)'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>HEAD Mutated (Commit):</span>
                <span
                  style={{
                    fontWeight: 700,
                    color: taskDetail.mutationSummary.headMutated
                      ? 'var(--state-failure-fg)'
                      : 'var(--state-success-fg)',
                  }}
                >
                  {taskDetail.mutationSummary.headMutated ? 'YES (FORBIDDEN)' : 'NO'}
                </span>
              </div>

              <div style={{ marginTop: '4px' }}>
                <div style={{ color: 'var(--text-muted)', marginBottom: '2px' }}>
                  Allowed Changes:
                </div>
                {taskDetail.mutationSummary.allowedChanges.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {taskDetail.mutationSummary.allowedChanges.map((f, i) => (
                      <span
                        key={i}
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '10px',
                          padding: '1px 5px',
                          backgroundColor: 'rgba(74, 222, 128, 0.1)',
                          border: '1px solid rgba(74, 222, 128, 0.3)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--state-success-fg)',
                        }}
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span style={{ color: 'var(--text-dim)' }}>None specified</span>
                )}
              </div>

              {taskDetail.mutationSummary.unexpectedChanges.length > 0 && (
                <div style={{ marginTop: '4px' }}>
                  <div style={{ color: 'var(--state-failure-fg)', fontWeight: 600, marginBottom: '2px' }}>
                    Unexpected Changes:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {taskDetail.mutationSummary.unexpectedChanges.map((f, i) => (
                      <span
                        key={i}
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '10px',
                          padding: '1px 5px',
                          backgroundColor: 'rgba(248, 113, 113, 0.15)',
                          border: '1px solid var(--state-failure-border)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--state-failure-fg)',
                        }}
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {isRunning ? 'Mutation inspection in progress...' : 'No mutation recorded yet.'}
            </div>
          )}
        </div>

        {/* AUTHORITY SECTION 2: INDEPENDENT DETERMINISTIC VERIFIER */}
        <div
          data-testid="authority-section-verifier"
          style={{
            padding: '14px 16px',
            backgroundColor: 'var(--bg-panel)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '8px',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.4px' }}>
              SECTION 2 · INDEPENDENT VERIFIER: VERIFIED EVIDENCE
            </div>
            <span
              style={{
                fontSize: '9px',
                fontFamily: 'var(--font-mono)',
                padding: '2px 6px',
                borderRadius: 'var(--radius-xs)',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: 'var(--state-success-fg)',
                fontWeight: 700,
              }}
            >
              AUTHORITY: INDEPENDENT VERIFIER
            </span>
          </div>

          {taskDetail?.verificationSummary ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Result:</span>
                <span
                  style={{
                    fontWeight: 700,
                    color:
                      taskDetail.verificationSummary.status === 'PASSED'
                        ? 'var(--state-success-fg)'
                        : 'var(--state-failure-fg)',
                  }}
                >
                  {taskDetail.verificationSummary.status}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Commands Passed:</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>
                  {taskDetail.verificationSummary.passedCommands} /{' '}
                  {taskDetail.verificationSummary.totalCommands}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Commands Failed:</span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    color:
                      taskDetail.verificationSummary.failedCommands > 0
                        ? 'var(--state-failure-fg)'
                        : 'var(--text-primary)',
                  }}
                >
                  {taskDetail.verificationSummary.failedCommands}
                </span>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {isRunning ? 'Verification pending worker execution...' : 'Verification has not executed.'}
            </div>
          )}
        </div>
      </div>

      {/* AUTHORITY SECTION 3: HUMAN OPERATOR REVIEW GATE */}
      {isWaitingApproval ? (
        <div
          data-testid="authority-section-human"
          style={{
            padding: '14px 16px',
            backgroundColor: 'var(--state-waiting-bg)',
            border: '1px solid var(--state-waiting-border)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '8px',
              borderBottom: '1px solid var(--state-waiting-border)',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--state-waiting-fg)',
                letterSpacing: '0.4px',
              }}
            >
              SECTION 3 · OPERATOR GATE: APPROVAL / REJECTION
            </div>
            <span
              style={{
                fontSize: '9px',
                fontFamily: 'var(--font-mono)',
                padding: '2px 6px',
                borderRadius: 'var(--radius-xs)',
                backgroundColor: 'rgba(234, 179, 8, 0.2)',
                border: '1px solid var(--state-waiting-border)',
                color: 'var(--state-waiting-fg)',
                fontWeight: 700,
              }}
            >
              AUTHORITY: HUMAN OPERATOR
            </span>
          </div>

          <div
            data-testid="approval-action-box"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '18px' }}>⚠</span>
              <div>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: 'var(--state-waiting-fg)',
                    letterSpacing: '0.5px',
                  }}
                >
                  HUMAN REVIEW REQUIRED
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Independent verifier passed all criteria. Verify the git diff below before approving mutation.
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                flexWrap: 'wrap',
                marginTop: '4px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <label
                  htmlFor="reviewer-input"
                  style={{ fontSize: '11px', color: 'var(--text-secondary)' }}
                >
                  Reviewer:
                </label>
                <input
                  id="reviewer-input"
                  type="text"
                  value={reviewer}
                  onChange={(e) => setReviewer(e.target.value)}
                  style={{
                    padding: '5px 8px',
                    backgroundColor: 'var(--bg-app)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    fontFamily: 'var(--font-mono)',
                    width: '140px',
                  }}
                />
              </div>

              <button
                onClick={() => void onApprove(reviewer)}
                disabled={isActing}
                style={{
                  padding: '7px 18px',
                  backgroundColor: 'var(--state-success-border)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: isActing ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                ✓ Approve Result
              </button>

              <button
                onClick={() => setShowRejectBox(!showRejectBox)}
                disabled={isActing}
                style={{
                  padding: '7px 14px',
                  backgroundColor: 'var(--bg-panel-elevated)',
                  border: '1px solid var(--state-failure-border)',
                  color: 'var(--state-failure-fg)',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: isActing ? 'not-allowed' : 'pointer',
                }}
              >
                Reject Task
              </button>
            </div>

            {showRejectBox && (
              <div
                style={{
                  marginTop: '8px',
                  padding: '12px',
                  backgroundColor: 'rgba(69, 10, 10, 0.4)',
                  border: '1px solid var(--state-failure-border)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <label
                  htmlFor="reject-reason"
                  style={{ fontSize: '11px', color: 'var(--text-secondary)' }}
                >
                  Rejection Reason:
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    id="reject-reason"
                    type="text"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Reason for rejecting mutation"
                    style={{
                      flex: 1,
                      padding: '5px 8px',
                      backgroundColor: 'var(--bg-app)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                    }}
                  />
                  <button
                    onClick={() => void onReject(rejectReason)}
                    disabled={isActing}
                    style={{
                      padding: '5px 14px',
                      backgroundColor: 'var(--state-failure-border)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      fontWeight: 600,
                      fontSize: '12px',
                      cursor: isActing ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Confirm Reject
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div
          data-testid="authority-section-human"
          style={{
            padding: '8px 14px',
            backgroundColor: 'var(--bg-panel)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
            <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>
              SECTION 3 · OPERATOR GATE:
            </span>
            <span style={{ color: 'var(--text-muted)' }}>
              {task.state === 'APPROVED'
                ? 'Task was explicitly reviewed and authorized by human operator. Mutation materialized to repository.'
                : task.state === 'SUCCEEDED'
                  ? 'Task completed successfully and met all deterministic verification criteria.'
                  : task.state === 'FAILED'
                    ? 'Task failed verification, composition, or was rejected by human operator.'
                    : 'Human review gate unlocks once independent verifier successfully passes.'}
            </span>
          </div>
          <span
            style={{
              fontSize: '9px',
              fontFamily: 'var(--font-mono)',
              padding: '2px 6px',
              borderRadius: 'var(--radius-xs)',
              backgroundColor: 'var(--bg-app)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            AUTHORITY: HUMAN OPERATOR
          </span>
        </div>
      )}

      {/* Prompt Manager (Canonical Compilation & Provenance) */}
      <PromptManager
        runId={task.runId}
        taskId={task.id}
        taskState={task.state}
      />

      {/* Diff Viewer */}
      <div style={{ flexShrink: 0 }}>
        <DiffViewer diff={diff} isLoading={isLoadingDiff} />
      </div>
    </div>
  )
}
