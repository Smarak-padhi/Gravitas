import React from 'react'
import type { CoworkerStationState } from '../livingHqState.js'
import { CoworkerAvatar } from '../characters/CoworkerAvatar.js'
import { WorkPacket, type WorkPacketData } from '../artifacts/WorkPacket.js'
import type { Task } from '../../../api/types.js'

export interface EngineeringFloorProps {
  readonly primaryCoworker: CoworkerStationState
  readonly concurrentCoworkers: readonly CoworkerStationState[]
  readonly standbyTasks: readonly Task[]
  readonly activeWorkPacket: WorkPacketData | null
  readonly selectedWorkerId: string | null
  readonly onSelectWorker: (workerId: string) => void
  readonly onExecuteTask?: () => void
  readonly onApproveResult?: () => void
  readonly onInspectEvidence?: () => void
  readonly isActing?: boolean | undefined
  readonly isScaleMode: boolean
  readonly onSelectTask?: (taskId: string) => void
}

export const EngineeringFloor: React.FC<EngineeringFloorProps> = ({
  primaryCoworker,
  concurrentCoworkers,
  standbyTasks,
  activeWorkPacket: _activeWorkPacket,
  selectedWorkerId,
  onSelectWorker,
  onExecuteTask,
  onApproveResult,
  onInspectEvidence,
  isActing = false,
  isScaleMode,
  onSelectTask,
}) => {
  const isPrimarySelected = selectedWorkerId === primaryCoworker.identity.id
  const isReady = primaryCoworker.pose === 'READING'
  const isNeedsYou = primaryCoworker.pose === 'NEEDS_OPERATOR'
  const isWorking = primaryCoworker.pose === 'WORKING'
  const isDone = primaryCoworker.pose === 'DONE'
  const isFailed = primaryCoworker.pose === 'FAILED'

  // Map pose to state badge label for backward-compatibility with tests
  const getStateBadgeText = (pose: string) => {
    switch (pose) {
      case 'READING':
        return 'ASSIGNED'
      case 'WORKING':
        return 'WORKING'
      case 'NEEDS_OPERATOR':
        return 'NEEDS_YOU'
      case 'DONE':
        return 'DONE'
      case 'FAILED':
        return 'FAILED'
      case 'BLOCKED':
        return 'BLOCKED'
      default:
        return 'IDLE'
    }
  }

  const primaryBadgeText = getStateBadgeText(primaryCoworker.pose)

  return (
    <section
      data-testid="engineering-floor"
      style={{
        padding: '20px 24px',
        backgroundColor: '#FFFFFF',
        border: '1px solid var(--hq-border-subtle, #E3DFD5)',
        borderRadius: '8px',
        boxShadow: 'var(--hq-shadow-tactile)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        position: 'relative',
      }}
    >
      {/* Floor Architectural Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1.5px solid var(--hq-border-subtle, #E3DFD5)',
          paddingBottom: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 800,
              padding: '3px 8px',
              backgroundColor: 'var(--hq-mineral-blue, #2B59C3)',
              color: '#FFFFFF',
              borderRadius: '4px',
              letterSpacing: '0.6px',
            }}
          >
            FLOOR 1
          </span>
          <div>
            <h3
              style={{
                fontSize: '14px',
                fontWeight: 800,
                color: 'var(--hq-text-primary, #1C1E21)',
                letterSpacing: '0.4px',
                textTransform: 'uppercase',
                margin: 0,
              }}
            >
              ENGINEERING OPERATIONS FLOOR
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--hq-text-secondary, #555B66)' }}>
              Implementation Core · Isolated Git Worktrees &amp; AST Transforms
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            data-testid="concurrency-pill"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '10px',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              color: primaryCoworker.isWorking || concurrentCoworkers.length > 0 ? 'var(--hq-mineral-blue, #2B59C3)' : 'var(--hq-text-secondary, #555B66)',
              backgroundColor: primaryCoworker.isWorking || concurrentCoworkers.length > 0 ? 'var(--hq-mineral-blue-bg, #EFF4FE)' : 'var(--hq-surface-subtle, #EFECE6)',
              padding: '2px 8px',
              borderRadius: '12px',
              border: '1px solid var(--hq-border-subtle, #E3DFD5)',
            }}
          >
            <span>CONCURRENCY:</span>
            <span>{(primaryCoworker.isWorking ? 1 : 0) + concurrentCoworkers.filter((c) => c.isWorking).length} ACTIVE</span>
          </div>

          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: primaryCoworker.isWorking ? 'var(--hq-mineral-blue, #2B59C3)' : 'var(--hq-text-muted, #848B98)',
              backgroundColor: primaryCoworker.isWorking ? 'var(--hq-mineral-blue-bg, #EFF4FE)' : 'var(--hq-surface-subtle, #EFECE6)',
              padding: '2px 8px',
              borderRadius: '12px',
            }}
          >
            {primaryCoworker.isWorking ? '● EXECUTING' : '○ STANDBY'}
          </span>
        </div>
      </div>

      {/* Primary Autonomous Worker Station */}
      <div
        data-testid={`worker-station-${primaryCoworker.identity.id}`}
        onClick={() => onSelectWorker(primaryCoworker.identity.id)}
        style={{
          padding: '16px',
          backgroundColor: isPrimarySelected ? '#F8FAFF' : 'var(--hq-surface-parchment, #FCFAF6)',
          border: `1.5px solid ${
            isNeedsYou
              ? 'var(--hq-mineral-amber, #B45309)'
              : isFailed
                ? 'var(--hq-mineral-crimson, #B91C1C)'
                : isPrimarySelected
                  ? 'var(--hq-mineral-blue, #2B59C3)'
                  : 'var(--hq-border-strong, #C8C2B4)'
          }`,
          borderRadius: '6px',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxShadow: isPrimarySelected
            ? '0 4px 12px rgba(43, 89, 195, 0.12)'
            : '0 1px 3px rgba(60, 50, 40, 0.05)',
          animation: isNeedsYou ? 'attentionPulse 2.2s ease-in-out infinite' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <CoworkerAvatar
              identity={primaryCoworker.identity}
              pose={primaryCoworker.pose}
              isSelected={isPrimarySelected}
              size={54}
            />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: 800,
                    color: 'var(--hq-text-primary, #1C1E21)',
                  }}
                >
                  {primaryCoworker.identity.name}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--hq-text-muted, #848B98)', fontFamily: 'var(--font-mono)' }}>
                  Station 01
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--hq-text-secondary, #555B66)' }}>
                {primaryCoworker.identity.roleTitle} · {primaryCoworker.identity.stationName}
              </div>
            </div>
          </div>

          {/* State Badge */}
          <div
            data-testid={`worker-state-badge-${primaryCoworker.identity.id}`}
            style={{
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.4px',
              backgroundColor: isWorking
                ? 'var(--hq-mineral-blue-bg, #EFF4FE)'
                : isNeedsYou
                  ? 'var(--hq-mineral-amber-bg, #FEF7ED)'
                  : isDone
                    ? 'var(--hq-mineral-sage-bg, #EBF5F1)'
                    : isFailed
                      ? 'var(--hq-mineral-crimson-bg, #FEF2F2)'
                      : 'var(--hq-surface-subtle, #EFECE6)',
              color: isWorking
                ? 'var(--hq-mineral-blue, #2B59C3)'
                : isNeedsYou
                  ? 'var(--hq-mineral-amber, #B45309)'
                  : isDone
                    ? 'var(--hq-mineral-sage, #3D7A68)'
                    : isFailed
                      ? 'var(--hq-mineral-crimson, #B91C1C)'
                      : 'var(--hq-text-secondary, #555B66)',
              border: `1px solid ${
                isWorking
                  ? 'var(--hq-mineral-blue-border, #93B4F5)'
                  : isNeedsYou
                    ? 'var(--hq-mineral-amber-border, #FCD34D)'
                    : isDone
                      ? 'var(--hq-mineral-sage-border, #A3D4C4)'
                      : isFailed
                        ? 'var(--hq-mineral-crimson-border, #FECACA)'
                        : 'var(--hq-border-subtle, #E3DFD5)'
              }`,
            }}
          >
            {primaryBadgeText}
          </div>
        </div>

        {/* Current Task Detail on Desk */}
        {primaryCoworker.activeTaskId ? (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: '4px',
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--hq-border-subtle, #E3DFD5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--hq-text-primary, #1C1E21)' }}>
                Active Task: [{primaryCoworker.activeTaskId}] {primaryCoworker.activeTaskTitle}
              </span>
              <span style={{ fontSize: '10px', color: 'var(--hq-text-muted, #848B98)' }}>
                Tool: {primaryCoworker.identity.toolName}
              </span>
            </div>
            {primaryCoworker.activeTaskObjective && (
              <p style={{ fontSize: '11px', color: 'var(--hq-text-secondary, #555B66)', margin: 0 }}>
                {primaryCoworker.activeTaskObjective}
              </p>
            )}
            {primaryCoworker.failureReason && (
              <div style={{ fontSize: '11px', color: 'var(--hq-mineral-crimson, #B91C1C)', fontWeight: 600 }}>
                Failure: {primaryCoworker.failureReason}
              </div>
            )}
          </div>
        ) : (
          <div style={{ fontSize: '11px', color: 'var(--hq-text-muted, #848B98)', fontStyle: 'italic' }}>
            No task currently checked out. Workstation idle.
          </div>
        )}

        {/* Interactive Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
          {isReady && onExecuteTask && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onExecuteTask()
              }}
              disabled={isActing}
              style={{
                padding: '6px 14px',
                backgroundColor: 'var(--hq-mineral-blue, #2B59C3)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '4px',
                fontWeight: 700,
                fontSize: '11px',
                cursor: isActing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <span>▶</span>
              <span>Dispatch Worker</span>
            </button>
          )}

          {isNeedsYou && onApproveResult && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onApproveResult()
              }}
              disabled={isActing}
              style={{
                padding: '6px 14px',
                backgroundColor: 'var(--hq-mineral-sage, #3D7A68)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '4px',
                fontWeight: 700,
                fontSize: '11px',
                cursor: isActing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <span>✓</span>
              <span>Approve Result</span>
            </button>
          )}

          {onInspectEvidence && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onInspectEvidence()
              }}
              style={{
                padding: '6px 12px',
                backgroundColor: '#FFFFFF',
                color: 'var(--hq-text-secondary, #555B66)',
                border: '1px solid var(--hq-border-strong, #C8C2B4)',
                borderRadius: '4px',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              Inspect Evidence
            </button>
          )}
        </div>
      </div>

      {/* Concurrent Worker Stations */}
      {concurrentCoworkers.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--hq-text-secondary, #555B66)' }}>
            CONCURRENT WORKTREE WORKSTATIONS ({concurrentCoworkers.length})
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
            {concurrentCoworkers.map((c) => (
              <div
                key={c.identity.id}
                data-testid={`worker-station-${c.identity.id}`}
                onClick={() => onSelectWorker(c.identity.id)}
                style={{
                  padding: '12px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid var(--hq-border-subtle, #E3DFD5)',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                }}
              >
                <CoworkerAvatar identity={c.identity} pose={c.pose} size={42} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--hq-text-primary, #1C1E21)' }}>
                    {c.identity.name}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--hq-text-secondary, #555B66)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    Task [{c.activeTaskId}] · {getStateBadgeText(c.pose)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Standby Shelf for Scale Verification */}
      {(isScaleMode || standbyTasks.length > 0) && (
        <div
          data-testid="office-standby-shelf"
          style={{
            marginTop: '8px',
            padding: '14px 16px',
            backgroundColor: 'var(--hq-surface-panel, #F4F1EA)',
            border: '1.5px dashed var(--hq-border-strong, #C8C2B4)',
            borderRadius: '6px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '14px' }}>🗄️</span>
              <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--hq-text-primary, #1C1E21)', letterSpacing: '0.4px' }}>
                STANDBY QUEUE SHELF ({standbyTasks.length} TASKS)
              </span>
            </div>
            <span style={{ fontSize: '10px', color: 'var(--hq-text-secondary, #555B66)' }}>
              Awaiting DAG dependencies or concurrency slot
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '8px',
              maxHeight: '180px',
              overflowY: 'auto',
            }}
          >
            {standbyTasks.map((task) => (
              <WorkPacket
                key={task.id}
                compact
                packet={{
                  taskId: task.id,
                  taskTitle: task.title,
                  workerId: 'standby',
                  workerName: 'Standby Queue',
                  stage: 'CLAIM',
                }}
                onClick={() => onSelectTask && onSelectTask(task.id)}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
