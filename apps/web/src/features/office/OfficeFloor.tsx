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
}) => {
  const totalWorkers = workers.length
  const activeCount = workers.filter((w) => w.state === 'WORKING' || w.state === 'VERIFYING').length
  const needsYouCount = workers.filter((w) => w.state === 'NEEDS_YOU').length
  const failedCount = workers.filter((w) => w.state === 'FAILED').length

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
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '16px',
            }}
          >
            {workers.map((worker) => (
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
        )}
      </div>
    </div>
  )
}
