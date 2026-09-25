/**
 * Cute Tactile Task Packet & Handoff Component for Hybrid HQ (Wave 12H-R)
 *
 * Implements a charming physical sealed document packet / mini-envelope:
 * - Default representation: compact physical folder/envelope (56px x 38px)
 *   with prominent monospace identifier "T-142" and status seal.
 * - When hovered or clicked: expands into or pops out richer task details.
 * - During handoff: the SMALL physical packet moves in a smooth parabolic arc
 *   from Frontend to Reviewer.
 * - Zero LLM, zero fake cards, purely deterministic.
 */

import React, { useEffect, useState } from 'react'
import type { TaskArtifactHandoffState } from './types.js'

export interface TaskArtifactHandoffProps {
  readonly handoff: TaskArtifactHandoffState
  readonly fromPos: { x: number; y: number } // Frontend desk
  readonly toPos: { x: number; y: number }   // Reviewer desk
  readonly onClick?: () => void
  readonly onArrived?: () => void
  readonly isSelected?: boolean
}

export const TaskArtifactHandoff: React.FC<TaskArtifactHandoffProps> = ({
  handoff,
  fromPos,
  toPos,
  onClick,
  onArrived,
  isSelected = false,
}) => {
  const [currentCoord, setCurrentCoord] = useState<{ x: number; y: number }>(fromPos)
  const [isHovered, setIsHovered] = useState(false)

  const isTransit = handoff.status === 'IN_TRANSIT'
  const isArrived = handoff.status === 'ARRIVED'

  useEffect(() => {
    if (handoff.status === 'IDLE') {
      setCurrentCoord(fromPos)
      return
    }

    if (handoff.status === 'IN_TRANSIT') {
      // Animate from fromPos to toPos with a smooth parabolic arc over 1400ms
      const startTime = performance.now()
      const duration = 1400

      let frameId: number
      const animate = (now: number) => {
        const elapsed = now - startTime
        const progress = Math.min(1.0, elapsed / duration)
        // EaseInOutCubic
        const ease =
          progress < 0.5
            ? 4 * progress * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 3) / 2

        // Parabolic arc height (-60px at peak)
        const arcY = -Math.sin(progress * Math.PI) * 58

        const curX = fromPos.x + (toPos.x - fromPos.x) * ease
        const curY = fromPos.y + (toPos.y - fromPos.y) * ease + arcY

        setCurrentCoord({ x: curX, y: curY })

        if (progress < 1.0) {
          frameId = requestAnimationFrame(animate)
        } else {
          setCurrentCoord(toPos)
          onArrived?.()
        }
      }

      frameId = requestAnimationFrame(animate)
      return () => cancelAnimationFrame(frameId)
    }

    if (handoff.status === 'ARRIVED') {
      setCurrentCoord(toPos)
    }
  }, [handoff.status, fromPos.x, fromPos.y, toPos.x, toPos.y, onArrived])

  if (handoff.status === 'IDLE' && !handoff.artifact) {
    return null
  }

  const posX = isArrived ? toPos.x : currentCoord.x
  const posY = isArrived ? toPos.y : currentCoord.y

  // Sealed stamp accent
  const sealColor =
    handoff.artifact?.verificationState === 'PASSED'
      ? '#22c55e'
      : handoff.artifact?.verificationState === 'FAILED'
      ? '#ef4444'
      : isArrived
      ? '#84cc16'
      : '#818cf8'

  const showExpanded = isHovered || isSelected

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      tabIndex={0}
      data-testid="hybrid-task-artifact"
      data-task-id={handoff.taskId}
      data-handoff-status={handoff.status}
      style={{
        position: 'absolute',
        left: `${posX}px`,
        top: `${posY}px`,
        transform: `translate(-50%, -50%) ${
          isTransit
            ? 'scale(1.15) rotate(6deg)'
            : showExpanded
            ? 'scale(1.08) rotate(0deg)'
            : 'scale(1.0) rotate(0deg)'
        }`,
        transition: isTransit ? 'none' : 'transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
        cursor: 'pointer',
        zIndex: isTransit ? 32 : 25,
        userSelect: 'none',
      }}
    >
      {/* 1. TACTILE SMALL ENVELOPE / DOCUMENT PACKET */}
      <div
        style={{
          width: '58px',
          height: '40px',
          backgroundColor: 'rgba(23, 29, 42, 0.94)',
          backdropFilter: 'blur(12px)',
          border: `1.5px solid ${sealColor}`,
          borderRadius: '7px',
          boxShadow: isTransit
            ? `0 10px 24px rgba(0, 0, 0, 0.5), 0 0 14px ${sealColor}66`
            : `0 6px 16px rgba(0, 0, 0, 0.45)`,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'visible',
        }}
      >
        {/* Envelope Top Flap Silhouette */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '14px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
            backgroundColor: 'rgba(255, 255, 255, 0.06)',
            pointerEvents: 'none',
          }}
        />

        {/* Small Wax/Jewel Seal */}
        <div
          style={{
            position: 'absolute',
            top: '8px',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: sealColor,
            boxShadow: `0 0 6px ${sealColor}`,
            zIndex: 2,
          }}
        />

        {/* Readable Bold Monospace Identifier */}
        <span
          style={{
            marginTop: '10px',
            fontFamily: 'var(--font-mono, "SF Mono", monospace)',
            fontWeight: 800,
            fontSize: '11px',
            letterSpacing: '0.5px',
            color: '#f8fafc',
            textShadow: '0 1px 3px rgba(0, 0, 0, 0.8)',
            zIndex: 2,
          }}
        >
          {handoff.taskId}
        </span>
      </div>

      {/* 2. EXPANDED TOOLTIP / RICH INFORMATION (Appears on Hover or Selection) */}
      {showExpanded && (
        <div
          style={{
            position: 'absolute',
            bottom: '48px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '180px',
            padding: '8px 10px',
            backgroundColor: 'rgba(15, 23, 42, 0.96)',
            backdropFilter: 'blur(16px)',
            border: `1px solid ${sealColor}`,
            borderRadius: '10px',
            boxShadow: '0 12px 28px rgba(0, 0, 0, 0.6), 0 0 12px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            pointerEvents: 'none',
            zIndex: 35,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, fontSize: '11px', color: '#f8fafc' }}>
              {handoff.taskId}
            </span>
            <span
              style={{
                fontSize: '9px',
                fontWeight: 600,
                padding: '1px 5px',
                borderRadius: '4px',
                backgroundColor: `${sealColor}25`,
                color: sealColor,
              }}
            >
              {isTransit ? 'In Transit' : isArrived ? 'Under Review' : 'Ready'}
            </span>
          </div>
          <div style={{ fontSize: '10px', color: '#cbd5e1', lineHeight: '1.3' }}>
            {handoff.artifact?.title ?? 'Responsive itinerary cards'}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#94a3b8', marginTop: '2px' }}>
            <span>Frontend</span>
            <span style={{ color: '#64748b' }}>➔</span>
            <span>Reviewer</span>
          </div>
        </div>
      )}
    </div>
  )
}
