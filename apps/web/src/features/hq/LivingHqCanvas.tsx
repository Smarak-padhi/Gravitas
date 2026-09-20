import React, { useEffect, useRef, useState } from 'react'
import type { Run, Task } from '../../api/types.js'
import { deriveLivingHqState } from './livingHqState.js'
import { ElevatorTransitRail } from './artifacts/ElevatorTransitRail.js'
import { OperatorMezzanine } from './floors/OperatorMezzanine.js'
import { VerificationLabFloor } from './floors/VerificationLabFloor.js'
import { AstraStudioFloor } from './floors/AstraStudioFloor.js'
import { EngineeringFloor } from './floors/EngineeringFloor.js'

export interface LivingHqCanvasProps {
  readonly run: Run | null
  readonly tasks: readonly Task[]
  readonly activeTask: Task | null
  readonly harness: {
    readonly id: string
    readonly status: string
    readonly message?: string | undefined
  }
  readonly selectedWorkerId: string | null
  readonly onSelectWorker: (workerId: string) => void
  readonly onExecuteTask?: () => void
  readonly onApproveResult?: () => void
  readonly onInspectEvidence?: () => void
  readonly isActing?: boolean | undefined
  readonly onNewRunClick?: () => void
  readonly onSelectTask?: (taskId: string) => void
}

export const LivingHqCanvas: React.FC<LivingHqCanvasProps> = ({
  run,
  tasks,
  activeTask,
  harness,
  selectedWorkerId,
  onSelectWorker,
  onExecuteTask,
  onApproveResult,
  onInspectEvidence,
  isActing = false,
  onNewRunClick,
  onSelectTask,
}) => {
  const hqState = deriveLivingHqState({ run, tasks, activeTask, harness })
  const [activeFloor, setActiveFloor] = useState<1 | 2 | 3 | 4>(hqState.activeFloor)

  const mezzanineRef = useRef<HTMLDivElement>(null)
  const labRef = useRef<HTMLDivElement>(null)
  const studioRef = useRef<HTMLDivElement>(null)
  const engineeringRef = useRef<HTMLDivElement>(null)

  // Sync active floor from authoritative state when state changes
  useEffect(() => {
    setActiveFloor(hqState.activeFloor)
  }, [hqState.activeFloor])

  const scrollToFloor = (floor: 1 | 2 | 3 | 4) => {
    setActiveFloor(floor)
    const targetMap: Record<number, React.RefObject<HTMLDivElement | null>> = {
      4: mezzanineRef,
      3: labRef,
      2: studioRef,
      1: engineeringRef,
    }
    const ref = targetMap[floor]
    if (ref && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div
      data-testid="living-hq-canvas"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'row',
        overflow: 'hidden',
        backgroundColor: 'var(--hq-canvas, #F7F5F0)',
        fontFamily: 'var(--font-sans)',
        color: 'var(--hq-text-primary, #1C1E21)',
        position: 'relative',
      }}
    >
      {/* Brass Pneumatic Elevator Rail (Left Fixed Column) */}
      <ElevatorTransitRail
        activeFloor={activeFloor}
        onSelectFloor={scrollToFloor}
        packetLocationText={hqState.transitStatusText}
      />

      {/* Main Multi-Floor Scrollable Atelier Viewport */}
      <div
        data-testid="hq-scroll-container"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '20px 24px',
          gap: '20px',
        }}
      >
        {/* Living HQ Architecture Header Bar */}
        <div
          data-testid="hq-header-bar"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            padding: '12px 18px',
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--hq-border-subtle, #E3DFD5)',
            borderRadius: '8px',
            boxShadow: 'var(--hq-shadow-tactile)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>🏛️</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                  LIVING HQ · THE TACTILE ATELIER
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: 'var(--hq-surface-subtle, #EFECE6)',
                    color: 'var(--hq-text-secondary, #555B66)',
                  }}
                >
                  DENSITY: {hqState.densityLevel}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--hq-text-secondary, #555B66)' }}>
                {hqState.transitStatusText}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onNewRunClick && (
              <button
                onClick={onNewRunClick}
                style={{
                  padding: '6px 14px',
                  backgroundColor: 'var(--hq-wood-walnut, #5A4231)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '4px',
                  fontWeight: 700,
                  fontSize: '11px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>+</span>
                <span>New Run</span>
              </button>
            )}
          </div>
        </div>

        {/* Level 4: Operator Mezzanine */}
        <div ref={mezzanineRef}>
          <OperatorMezzanine
            waitingApprovalTask={hqState.waitingApprovalTask}
            activeWorkPacket={hqState.activeWorkPacket}
            onApproveResult={onApproveResult}
            onInspectEvidence={onInspectEvidence}
            isActing={isActing}
          />
        </div>

        {/* Level 3: Verification Lab & Evidence Cleanroom */}
        <div ref={labRef}>
          <VerificationLabFloor
            verifierCoworker={hqState.verifierCoworker}
            browserQaCoworker={hqState.browserQaCoworker}
            activeWorkPacket={hqState.activeWorkPacket}
            onInspectEvidence={onInspectEvidence}
          />
        </div>

        {/* Level 2: Astra Design Studio */}
        <div ref={studioRef}>
          <AstraStudioFloor astraCoworker={hqState.astraCoworker} />
        </div>

        {/* Level 1: Engineering Operations Floor */}
        <div ref={engineeringRef}>
          <EngineeringFloor
            primaryCoworker={hqState.primaryCoworker}
            concurrentCoworkers={hqState.concurrentCoworkers}
            standbyTasks={hqState.standbyTasks}
            activeWorkPacket={hqState.activeWorkPacket}
            selectedWorkerId={selectedWorkerId}
            onSelectWorker={onSelectWorker}
            onExecuteTask={onExecuteTask}
            onApproveResult={onApproveResult}
            onInspectEvidence={onInspectEvidence}
            isActing={isActing}
            isScaleMode={hqState.isScaleMode}
            onSelectTask={onSelectTask}
          />
        </div>
      </div>
    </div>
  )
}
