/**
 * Living 3D Headquarters Canvas Container for Gravitas
 * React 19 host for Vanilla Three.js HqDirector with ResizeObserver,
 * keyboard shortcuts, accessibility announcements, and graceful 2D fallback.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { HqDirector } from './engine/HqDirector.js'
import type { PerformanceStats, RoomId, SelectedEntity } from './types.js'
import { Hq3dInspector } from './ui/Hq3dInspector.js'
import { ROOM_DEFINITIONS } from './world/rooms.js'

export interface LivingHqCanvas3DProps {
  readonly isViewActive: boolean
  readonly onFallbackTo2D: () => void
}

export const LivingHqCanvas3D: React.FC<LivingHqCanvas3DProps> = ({
  isViewActive,
  onFallbackTo2D,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const directorRef = useRef<HqDirector | null>(null)

  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity | null>(null)
  const [performanceStats, setPerformanceStats] = useState<PerformanceStats | null>(null)
  const [showPerformance, setShowPerformance] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [announcement, setAnnouncement] = useState<string>('')
  const [webglError, setWebglError] = useState<string | null>(null)

  // 1. Accessibility: Detect prefers-reduced-motion
  useEffect(() => {
    if (typeof window === 'undefined') return

    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mql.matches)

    const handler = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches)
      directorRef.current?.setReducedMotion(e.matches)
    }

    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  // 2. Initialize Three.js HqDirector
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    try {
      // Test WebGL availability before constructing
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
      if (!gl) {
        throw new Error('WebGL is not supported on this device/browser')
      }

      const director = new HqDirector({
        canvas,
        reducedMotion,
        onEntitySelected: (entity) => {
          setSelectedEntity(entity)
          if (entity) {
            setAnnouncement(`Selected ${entity.type} ${entity.name} in ${entity.room}`)
          } else {
            setAnnouncement('Selection cleared')
          }
        },
        onContextLost: () => {
          console.warn('WebGL context lost — invoking graceful fallback to 2D OfficeFloor')
          setWebglError('WebGL context lost')
          onFallbackTo2D()
        },
      })

      directorRef.current = director
      director.setViewActive(isViewActive)

      // Initial size
      const { clientWidth, clientHeight } = canvas
      director.handleResize(clientWidth, clientHeight)
    } catch (err) {
      console.error('Failed to initialize Gravitas 3D Headquarters:', err)
      const msg = err instanceof Error ? err.message : 'WebGL initialization failed'
      setWebglError(msg)
      onFallbackTo2D()
    }

    return () => {
      directorRef.current?.dispose()
      directorRef.current = null
    }
  }, [onFallbackTo2D])

  // 3. React to isViewActive changes (Dual-condition render loop suspension)
  useEffect(() => {
    directorRef.current?.setViewActive(isViewActive)
  }, [isViewActive])

  // 4. ResizeObserver for responsive canvas scaling
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0) {
          directorRef.current?.handleResize(width, height)
        }
      }
    })

    ro.observe(container)
    return () => ro.disconnect()
  }, [])

  // 5. Telemetry polling (every 500ms when view is active and HUD enabled)
  useEffect(() => {
    if (!isViewActive || !showPerformance) return

    const interval = setInterval(() => {
      if (directorRef.current) {
        setPerformanceStats(directorRef.current.getPerformanceStats())
      }
    }, 500)

    return () => clearInterval(interval)
  }, [isViewActive, showPerformance])

  // 6. Keyboard navigation (Keys 1-6 for rooms, 0/Space for overview)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isViewActive) return

      // Don't intercept if user is typing in an input
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return
      }

      if (e.key >= '1' && e.key <= '6') {
        const framed = directorRef.current?.frameRoomByKey(e.key)
        if (framed) {
          const room = Object.values(ROOM_DEFINITIONS).find((r) => r.numberKey === e.key)
          if (room) {
            setAnnouncement(`Framing Room: ${room.name} (Key ${room.numberKey})`)
          }
        }
      } else if (e.key === '0' || e.key === ' ') {
        e.preventDefault()
        directorRef.current?.resetToOverview()
        setAnnouncement('Reset camera to Headquarters Overview')
      }
    },
    [isViewActive]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const handleSelectRoom = (roomId: RoomId) => {
    directorRef.current?.frameRoom(roomId)
    const room = ROOM_DEFINITIONS[roomId]
    if (room) {
      setAnnouncement(`Framing Room: ${room.name}`)
    }
  }

  const handleResetOverview = () => {
    directorRef.current?.resetToOverview()
    setAnnouncement('Reset camera to Headquarters Overview')
  }

  if (webglError) {
    return (
      <div
        data-testid="hq3d-error-fallback"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          backgroundColor: 'var(--bg-panel, #0f172a)',
          color: 'var(--text-primary, #e2e8f0)',
          gap: '12px',
        }}
      >
        <span style={{ fontSize: '32px' }}>⚠️</span>
        <h3 style={{ margin: 0, fontSize: '16px' }}>3D Scene Unavailable</h3>
        <p style={{ margin: 0, color: 'var(--text-secondary, #94a3b8)', fontSize: '13px' }}>
          {webglError}. Falling back to 2D Operations Floor.
        </p>
        <button
          onClick={onFallbackTo2D}
          style={{
            marginTop: '8px',
            padding: '8px 16px',
            backgroundColor: 'var(--accent-primary, #38bdf8)',
            color: '#000',
            border: 'none',
            borderRadius: '4px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Switch to 2D Floor
        </button>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      data-testid="living-hq-canvas-container"
      style={{
        flex: 1,
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        display: 'flex',
        backgroundColor: '#0e1117',
      }}
    >
      {/* Screen Reader Live Region */}
      <div
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        {announcement}
      </div>

      {/* 3D WebGL Canvas */}
      <div style={{ flex: 1, position: 'relative', height: '100%', overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          data-testid="hq-webgl-canvas"
          tabIndex={0}
          aria-label="3D Gravitas Headquarters Scene. Use pointer to orbit and zoom, or keys 1 to 6 to jump to rooms."
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            outline: 'none',
            cursor: 'grab',
            touchAction: 'none',
          }}
        />

        {/* Floating Room Shortcut Pills at Top */}
        <nav
          aria-label="3D Room Quick Navigation"
          style={{
            position: 'absolute',
            top: '12px',
            left: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            flexWrap: 'wrap',
            zIndex: 5,
            pointerEvents: 'auto',
          }}
        >
          <button
            onClick={handleResetOverview}
            data-testid="hq-nav-overview-pill"
            style={{
              padding: '4px 10px',
              borderRadius: '20px',
              backgroundColor: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#e2e8f0',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>🏛️</span>
            <span>Overview</span>
            <span style={{ fontSize: '10px', color: '#94a3b8' }}>[0]</span>
          </button>

          {Object.values(ROOM_DEFINITIONS).map((room) => (
            <button
              key={room.id}
              onClick={() => handleSelectRoom(room.id)}
              data-testid={`hq-nav-room-${room.numberKey}`}
              style={{
                padding: '4px 8px',
                borderRadius: '20px',
                backgroundColor: 'rgba(15, 23, 42, 0.75)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                color: '#cbd5e1',
                fontSize: '11px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span style={{ color: room.accentColor, fontWeight: 700 }}>{room.numberKey}</span>
              <span>{room.name}</span>
            </button>
          ))}

          {reducedMotion && (
            <span
              style={{
                fontSize: '10px',
                padding: '2px 8px',
                borderRadius: '12px',
                backgroundColor: 'rgba(234, 179, 8, 0.2)',
                border: '1px solid rgba(234, 179, 8, 0.4)',
                color: '#fde047',
                fontFamily: 'monospace',
              }}
            >
              Reduced Motion: Instant Cuts
            </span>
          )}
        </nav>
      </div>

      {/* Docked 2D Inspector on Right Side */}
      <Hq3dInspector
        entity={selectedEntity}
        performanceStats={performanceStats}
        showPerformance={showPerformance}
        onTogglePerformance={() => setShowPerformance(!showPerformance)}
        onSelectRoom={handleSelectRoom}
        onResetOverview={handleResetOverview}
        onClose={() => {
          setSelectedEntity(null)
          directorRef.current?.resetToOverview()
        }}
      />
    </div>
  )
}
