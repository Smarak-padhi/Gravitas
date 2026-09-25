/**
 * Task Artifact Card & Handoff Animation Component for Hybrid HQ (Wave 12H)
 *
 * Renders the tactile task artifact card (T-142).
 * Animates a smooth Bezier arc across Floor 2 when task handoff is triggered by canonical state.
 * Reviewer receives it, triggering verification.
 */

import React, { useEffect, useState } from 'react'
import type { TaskArtifactHandoffState } from './types.js'

export interface TaskArtifactHandoffProps {
  readonly handoff: TaskArtifactHandoffState
  readonly fromPos: { x: number; y: number } // Frontend desk
  readonly toPos: { x: number; y: number }   // Reviewer desk
  readonly onClick?: () => void
  readonly onArrived?: () => void
}

export const TaskArtifactHandoff: React.FC<TaskArtifactHandoffProps> = ({
  handoff,
  fromPos,
  toPos,
  onClick,
  onArrived,
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
        const arcY = -Math.sin(progress * Math.PI) * 55

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
            ? 'scale(1.15) rotate(4deg)'
            : isHovered
            ? 'scale(1.08) rotate(0deg)'
            : 'scale(1.0) rotate(0deg)'
        }`,
        transition: isTransit ? 'none' : 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
        cursor: 'pointer',
        zIndex: 25,
        userSelect: 'none',
      }}
    >
      {/* Physical Sealed Packet / Modern Card */}
      <div
        style={{
          width: '136px',
          padding: '8px 10px',
          backgroundColor: 'rgba(15, 23, 42, 0.94)',
          backdropFilter: 'blur(12px)',
          border: isTransit
            ? '1.5px solid #a855f7'
            : isArrived
            ? '1.5px solid #84cc16'
            : '1.5px solid #818cf8',
          borderRadius: '10px',
          boxShadow: isTransit
            ? '0 12px 28px rgba(168, 85, 247, 0.45), 0 0 16px rgba(168, 85, 247, 0.3)'
            : '0 8px 20px rgba(0, 0, 0, 0.45)',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        {/* Card Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '13px' }}>📋</span>
            <span
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                fontWeight: 700,
                fontSize: '11px',
                color: '#f8fafc',
              }}
            >
              {handoff.taskId}
            </span>
          </div>
          <span
            style={{
              fontSize: '9px',
              fontWeight: 600,
              padding: '1px 5px',
              borderRadius: '4px',
              backgroundColor: isTransit
                ? 'rgba(168, 85, 247, 0.25)'
                : isArrived
                ? 'rgba(132, 204, 22, 0.25)'
                : 'rgba(129, 140, 248, 0.25)',
              color: isTransit ? '#c084fc' : isArrived ? '#a3e635' : '#818cf8',
            }}
          >
            {isTransit ? 'Handoff' : isArrived ? 'Under Review' : 'Ready'}
          </span>
        </div>

        {/* Task Title */}
        <div
          style={{
            fontSize: '10px',
            color: '#cbd5e1',
            lineHeight: '1.3',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {handoff.artifact?.title ?? 'Itinerary card components'}
        </div>

        {/* Route Path Indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '9px',
            color: '#94a3b8',
            marginTop: '2px',
          }}
        >
          <span>Frontend</span>
          <span style={{ color: '#64748b' }}>➔</span>
          <span style={{ color: isArrived ? '#a3e635' : '#94a3b8' }}>Reviewer</span>
        </div>
      </div>
    </div>
  )
}
