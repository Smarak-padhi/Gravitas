import React from 'react'
import type { WorkerPresentation } from './officeState.js'
import { WorkerStation } from './WorkerStation.js'
import { EmptyState } from '../../design-system/components/EmptyState.js'

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
  waitingApprovalTask,
}) => {
  const totalWorkers = workers.length
  const activeCount = workers.filter((w) => w.state === 'WORKING' || w.state === 'VERIFYING').length
  const needsYouCount = workers.filter((w) => w.state === 'NEEDS_YOU').length
  const failedCount = workers.filter((w) => w.state === 'FAILED').length

  const isScaleMode = workers.length > 6
  const activeStations = isScaleMode
    ? workers.filter(
        (w) =>
          w.state === 'WORKING' ||
          w.state === 'VERIFYING' ||
          w.state === 'NEEDS_YOU' ||
          w.state === 'ASSIGNED' ||
          w.state === 'FAILED'
      )
    : workers
  const standbyStations = isScaleMode
    ? workers.filter(
        (w) =>
          w.state !== 'WORKING' &&
          w.state !== 'VERIFYING' &&
          w.state !== 'NEEDS_YOU' &&
          w.state !== 'ASSIGNED' &&
          w.state !== 'FAILED'
      )
    : []

  return (
    <div
      data-testid="office-floor"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-canvas)',
      }}
    >
      {/* Human Review Gate Zone (OperatorReviewBar) */}
      {waitingApprovalTask && (
        <div
          data-testid="operator-review-bar"
          style={{
            padding: '10px 20px',
            backgroundColor: 'var(--state-waiting-bg)',
            borderBottom: '2px solid var(--state-waiting-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            animation: 'attentionPulse 2.4s ease-in-out infinite',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px' }}>⚠</span>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--state-waiting-fg)',
                letterSpacing: '0.4px',
              }}
            >
              OPERATOR REVIEW REQUIRED: Task [{waitingApprovalTask.id}] &quot;{waitingApprovalTask.title}&quot; has passed verification and awaits human approval.
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onApproveTask && (
              <button
                onClick={onApproveTask}
                disabled={isActing}
                style={{
                  padding: '5px 14px',
                  backgroundColor: 'var(--state-waiting-border)',
                  border: '1px solid #ca8a04',
                  borderRadius: 'var(--radius-sm)',
                  color: '#000',
                  fontWeight: 700,
                  fontSize: '11px',
                  cursor: isActing ? 'not-allowed' : 'pointer',
                }}
              >
                ✓ Approve &amp; Merge
              </button>
            )}
            {onInspectEvidence && (
              <button
                onClick={onInspectEvidence}
                style={{
                  padding: '5px 12px',
                  backgroundColor: 'var(--bg-panel-elevated)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                Inspect Diff
              </button>
            )}
          </div>
        </div>
      )}

      {/* Floor Telemetry Header */}
      <div
        style={{
          padding: '12px 20px',
          backgroundColor: 'var(--bg-panel)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.4px' }}>
            ENGINEERING OPERATIONS FLOOR
          </div>
          <span
            style={{
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              padding: '2px 6px',
              backgroundColor: 'var(--bg-panel-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)',
            }}
          >
            {totalWorkers} STATIONS
          </span>
        </div>

        {/* Telemetry Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
          <div data-testid="concurrency-pill" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ color: 'var(--text-muted)' }}>CONCURRENCY:</span>
            <span style={{ color: activeCount > 0 ? 'var(--state-running-fg)' : 'var(--text-secondary)', fontWeight: 700 }}>
              {activeCount} ACTIVE
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ color: 'var(--text-muted)' }}>ACTIVE:</span>
            <span style={{ color: activeCount > 0 ? 'var(--state-running-fg)' : 'var(--text-secondary)', fontWeight: 700 }}>
              {activeCount}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ color: 'var(--text-muted)' }}>NEEDS YOU:</span>
            <span style={{ color: needsYouCount > 0 ? 'var(--state-waiting-fg)' : 'var(--text-secondary)', fontWeight: 700 }}>
              {needsYouCount}
            </span>
          </div>

          {failedCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: 'var(--state-failure-fg)' }}>FAILED:</span>
              <span style={{ color: 'var(--state-failure-fg)', fontWeight: 700 }}>
                {failedCount}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Floor Workspace */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        {workers.length === 0 ? (
          <EmptyState
            title="No Active Stations"
            description="The engineering floor is currently idle. Compose a new goal to activate workers and begin orchestrating."
            actionLabel="+ New Run"
            onAction={onNewRunClick}
          />
        ) : (
          <>
            {/* Active & High-Attention Worker Stations */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '16px',
              }}
            >
              {activeStations.map((worker) => (
                <WorkerStation
                  key={worker.id}
                  worker={worker}
                  isSelected={worker.id === selectedWorkerId}
                  onSelect={() => onSelectWorker(worker.id)}
                  onExecute={onExecuteTask}
                  onApprove={onApproveTask}
                  onInspect={onInspectEvidence}
                  isActing={isActing}
                />
              ))}
            </div>

            {/* Progressive Density: Standby & Queued Stations Shelf for Scale (8, 15, 30 tasks) */}
            {standbyStations.length > 0 && (
              <div data-testid="office-standby-shelf" style={{ marginTop: '8px' }}>
                <div
                  style={{
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-secondary)',
                    marginBottom: '8px',
                    fontWeight: 700,
                    letterSpacing: '0.4px',
                  }}
                >
                  STANDBY &amp; QUEUED STATIONS ({standbyStations.length})
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                    gap: '8px',
                  }}
                >
                  {standbyStations.map((worker) => (
                    <div
                      key={worker.id}
                      data-testid={`worker-station-${worker.id}`}
                      onClick={() => onSelectWorker(worker.id)}
                      style={{
                        padding: '10px 14px',
                        backgroundColor:
                          worker.id === selectedWorkerId
                            ? 'var(--bg-panel-elevated)'
                            : 'var(--bg-panel)',
                        border: `1px solid ${
                          worker.id === selectedWorkerId
                            ? 'var(--border-focus)'
                            : 'var(--border-subtle)'
                        }`,
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        fontSize: '11px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          overflow: 'hidden',
                        }}
                      >
                        <span
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: worker.accentColor,
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {worker.displayName}
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
                          fontWeight: 600,
                        }}
                      >
                        {worker.state}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
