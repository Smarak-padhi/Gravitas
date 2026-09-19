import React from 'react'
import type { WorkerPresentation } from './officeState.js'
import { Badge, type BadgeVariant } from '../../design-system/components/Badge.js'
import { Button } from '../../design-system/components/Button.js'

export interface WorkerStationProps {
  readonly worker: WorkerPresentation
  readonly isSelected?: boolean | undefined
  readonly onSelect?: () => void
  readonly onExecute?: () => void
  readonly onApprove?: () => void
  readonly onInspect?: () => void
  readonly isActing?: boolean | undefined
}

export const WorkerStation: React.FC<WorkerStationProps> = ({
  worker,
  isSelected = false,
  onSelect,
  onExecute,
  onApprove,
  onInspect,
  isActing = false,
}) => {
  const getBadgeVariant = (state: WorkerPresentation['state']): BadgeVariant => {
    switch (state) {
      case 'WORKING':
      case 'THINKING':
      case 'READING':
        return 'running'
      case 'VERIFYING':
        return 'verifying'
      case 'NEEDS_YOU':
        return 'waiting'
      case 'DONE':
        return 'success'
      case 'FAILED':
        return 'failure'
      case 'ASSIGNED':
        return 'ready'
      case 'BLOCKED':
      case 'WAITING_FOR_DEPENDENCY':
        return 'failure'
      case 'IDLE':
      default:
        return 'muted'
    }
  }

  const isNeedsYou = worker.state === 'NEEDS_YOU'
  const isFailed = worker.state === 'FAILED'
  const isAssigned = worker.state === 'ASSIGNED'
  const isWorking = worker.state === 'WORKING' || worker.state === 'VERIFYING'

  return (
    <div
      data-testid={`worker-station-${worker.id}`}
      onClick={onSelect}
      style={{
        backgroundColor: isSelected ? 'var(--bg-panel-elevated)' : 'var(--bg-panel)',
        border: `1px solid ${
          isNeedsYou
            ? 'var(--state-waiting-border)'
            : isFailed
              ? 'var(--state-failure-border)'
              : isSelected
                ? 'var(--border-focus)'
                : 'var(--border-color)'
        }`,
        borderRadius: 'var(--radius-lg)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        cursor: 'pointer',
        transition: 'all var(--motion-duration-fast) var(--motion-ease-standard)',
        position: 'relative',
        animation: isNeedsYou ? 'attentionPulse 2.4s ease-in-out infinite' : 'none',
        boxShadow: isSelected ? '0 0 16px rgba(59, 130, 246, 0.25)' : 'var(--shadow-sm)',
      }}
    >
      {/* Station Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: worker.accentColor,
              boxShadow: isWorking ? `0 0 8px ${worker.accentColor}` : 'none',
              animation: isWorking ? 'activityBreathe 2s ease-in-out infinite' : 'none',
            }}
          />
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.3px' }}>
              {worker.displayName}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              {worker.role}
            </div>
          </div>
        </div>

        <Badge variant={getBadgeVariant(worker.state)} pulse={isNeedsYou}>
          {worker.state}
        </Badge>
      </div>

      {/* Capabilities Tag Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
        {worker.capabilities.map((cap) => (
          <span
            key={cap}
            style={{
              fontSize: '9px',
              fontFamily: 'var(--font-mono)',
              padding: '1px 5px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-panel-subtle)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)',
            }}
          >
            {cap}
          </span>
        ))}
      </div>

      {/* Active Task / Work Assignment Status */}
      <div
        style={{
          marginTop: 'auto',
          padding: '10px 12px',
          backgroundColor: 'var(--bg-app)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          minHeight: '52px',
          justifyContent: 'center',
        }}
      >
        {worker.currentTaskTitle ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                ASSIGNMENT [{worker.currentTaskId}]
              </span>
              {isWorking && (
                <span style={{ fontSize: '10px', color: 'var(--state-running-fg)', fontFamily: 'var(--font-mono)' }}>
                  ACTIVE
                </span>
              )}
            </div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={worker.currentTaskTitle}
            >
              {worker.currentTaskTitle}
            </div>
          </>
        ) : (
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontStyle: 'italic' }}>
            Station idle. Awaiting task assignment.
          </div>
        )}
      </div>

      {/* Station Actions */}
      {isNeedsYou && onApprove && (
        <Button
          variant="primary"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onApprove()
          }}
          disabled={isActing}
          style={{
            backgroundColor: 'var(--state-waiting-border)',
            borderColor: '#ca8a04',
            color: '#000',
            fontWeight: 700,
          }}
        >
          ⚠ Review & Approve
        </Button>
      )}

      {isAssigned && onExecute && (
        <Button
          variant="primary"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onExecute()
          }}
          disabled={isActing}
        >
          ▶ Execute Task
        </Button>
      )}

      {isFailed && onInspect && (
        <Button
          variant="danger"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onInspect()
          }}
        >
          ✕ Inspect Failure
        </Button>
      )}
    </div>
  )
}
