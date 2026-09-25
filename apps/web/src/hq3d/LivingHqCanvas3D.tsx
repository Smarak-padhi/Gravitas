/**
 * Living 3D Headquarters Canvas Container for Gravitas
 * React 19 host for Vanilla Three.js HqDirector with ResizeObserver,
 * keyboard shortcuts, accessibility announcements, and graceful 2D fallback.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { HqDirector } from './engine/HqDirector.js'
import type { AtmosphereMode } from './engine/HqScene.js'
import type { PerformanceStats, RoomId, SelectedEntity } from './types.js'
import type { RoleId } from './roles/types.js'
import { Hq3dInspector } from './ui/Hq3dInspector.js'
import { ROOM_DEFINITIONS, WORKSTATION_PRESETS, CHARACTER_PRESETS, getRoomByKey } from './world/rooms.js'
import { deriveWorldState, type WorldState } from './world/worldState.js'
import { useEvents } from '../api/useEvents.js'
import type { RuntimeProjectionSnapshot, StateSummaryResponse } from '../api/types.js'
import { Floor2HybridDiorama } from './hybrid/Floor2HybridDiorama.js'

export interface LivingHqCanvas3DProps {
  readonly isViewActive: boolean
  readonly onFallbackTo2D: () => void
  readonly initialWorldState?: WorldState | undefined
  readonly overrideWorldState?: WorldState | undefined
}

export const LivingHqCanvas3D: React.FC<LivingHqCanvas3DProps> = ({
  isViewActive,
  onFallbackTo2D,
  initialWorldState,
  overrideWorldState,
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
  const [experienceMode, setExperienceMode] = useState<'HYBRID' | '3D_EXPERIMENTAL'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('mode') === 'hybrid') return 'HYBRID'
    }
    return '3D_EXPERIMENTAL'
  })
  const [currentRoomId, setCurrentRoomId] = useState<RoomId | 'OVERVIEW'>('OVERVIEW')
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 1280, height: 720 })
  const [atmosphere, setAtmosphere] = useState<AtmosphereMode>(() => {
    if (typeof window === 'undefined') return 'DAY'
    const hour = new Date().getHours()
    if (hour >= 6 && hour < 17) return 'DAY'
    if (hour >= 17 && hour < 21) return 'EVENING'
    return 'NIGHT'
  })
  const [isElevatorActive, setIsElevatorActive] = useState(false)
  const [activeTaskCount, setActiveTaskCount] = useState(0)

  const isHybridFloor2 = experienceMode === 'HYBRID' && currentRoomId === 'AGENT_OPERATIONS'

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

  const onFallbackRef = useRef(onFallbackTo2D)
  useEffect(() => {
    onFallbackRef.current = onFallbackTo2D
  }, [onFallbackTo2D])

  const lastWorldStateRef = useRef<WorldState | null>(null)

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
          onFallbackRef.current()
        },
      })

      directorRef.current = director
      director.setOnElevatorChange((active) => {
        setIsElevatorActive(active)
      })
      director.setAtmosphere(atmosphere)
      director.setViewActive(isViewActive)
      if (typeof window !== 'undefined') {
        ;(window as any).__hqDirector = director
      }

      // Initial size
      const { clientWidth, clientHeight } = canvas
      director.handleResize(clientWidth, clientHeight)

      // Reconcile any existing world state immediately
      if (lastWorldStateRef.current) {
        director.updateWorldState(lastWorldStateRef.current)
      } else if (overrideWorldState) {
        director.updateWorldState(overrideWorldState)
      } else if (initialWorldState) {
        director.updateWorldState(initialWorldState)
      }
    } catch (err) {
      console.error('Failed to initialize Gravitas 3D Headquarters:', err)
      const msg = err instanceof Error ? err.message : 'WebGL initialization failed'
      setWebglError(msg)
      onFallbackRef.current()
    }

    return () => {
      directorRef.current?.dispose()
      directorRef.current = null
    }
  }, []) // Mount once

  // 3. React to isViewActive changes (Dual-condition render loop suspension)
  useEffect(() => {
    directorRef.current?.setViewActive(isViewActive)
  }, [isViewActive])

  // 3b. Fetch Authoritative Server State & Reconcile (Wave 12C)
  const fetchAuthoritativeState = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/state')
      if (!res.ok) return
      const summary = (await res.json()) as StateSummaryResponse
      const projection: RuntimeProjectionSnapshot = summary.projection ?? {
        schemaVersion: '1.0.0',
        epoch: 'epoch_bootstrap',
        revision: 0,
        activeTasks: [],
      }
      const activeRun = summary.runs?.find((r) => r.status === 'RUNNING') ?? summary.runs?.[0]
      const worldState = deriveWorldState({
        projection,
        tasks: summary.tasks ?? [],
        run: activeRun ? { id: activeRun.id, status: activeRun.status } : null,
      })
      lastWorldStateRef.current = worldState
      directorRef.current?.updateWorldState(worldState)
      setActiveTaskCount(projection.activeTasks?.length ?? 0)
      setSelectedEntity((prev) => {
        if (!prev || prev.type !== 'character') return prev
        const fig = directorRef.current?.scene.characters.getFigure(prev.id as RoleId)
        if (!fig?.userData) return prev
        const u = fig.userData
        return {
          id: prev.id,
          type: 'character',
          name: (u.name as string) || prev.name,
          room: (u.room as string) || prev.room,
          role: (u.role as string) || prev.role,
          status: (u.status as string) || prev.status,
          description: (u.description as string) || prev.description,
          roleMetadata: u.roleMetadata,
        }
      })
    } catch (err) {
      console.warn('Failed to fetch authoritative state for 3D HQ:', err)
    }
  }, [])

  // Update world state on mount, view activation, or override change
  useEffect(() => {
    if (overrideWorldState) {
      lastWorldStateRef.current = overrideWorldState
      directorRef.current?.updateWorldState(overrideWorldState)
      const count = Object.values(overrideWorldState.stations).filter(
        (s) => s.status === 'ACTIVE' || s.status === 'VERIFYING'
      ).length
      setActiveTaskCount(count)
    } else if (initialWorldState) {
      lastWorldStateRef.current = initialWorldState
      directorRef.current?.updateWorldState(initialWorldState)
      const count = Object.values(initialWorldState.stations).filter(
        (s) => s.status === 'ACTIVE' || s.status === 'VERIFYING'
      ).length
      setActiveTaskCount(count)
    } else if (isViewActive) {
      void fetchAuthoritativeState()
    }
  }, [isViewActive, overrideWorldState, initialWorldState, fetchAuthoritativeState])

  // Pure SSE Invalidation Channel: invalidating events trigger authoritative refetch
  useEvents({
    onInvalidate: () => {
      if (isViewActive && !overrideWorldState) {
        void fetchAuthoritativeState()
      }
    },
  })

  // 4. ResizeObserver for responsive canvas scaling
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0) {
          setCanvasDimensions({ width, height })
          directorRef.current?.handleResize(width, height)
        }
      }
    })

    ro.observe(container)
    return () => ro.disconnect()
  }, [])

  // 4b. Reconcile 3D character visibility when Floor 2 Hybrid Diorama is active
  useEffect(() => {
    if (directorRef.current) {
      const feFig = directorRef.current.scene.characters.figureMap.get('role:engineering:frontend-engineer')
      const beFig = directorRef.current.scene.characters.figureMap.get('role:engineering:backend-engineer')
      if (feFig) feFig.visible = !isHybridFloor2
      if (beFig) beFig.visible = !isHybridFloor2
    }
  }, [isHybridFloor2])

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

  // 6. Keyboard navigation (Keys 1-6 / M for rooms, 0 for overview, Space for skip/overview)
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

      if ((e.key >= '1' && e.key <= '6') || e.key === 'm' || e.key === 'M') {
        const room = getRoomByKey(e.key)
        if (room) {
          setCurrentRoomId(room.id)
          directorRef.current?.navigateToFloorWithElevator(room.id)
          setAnnouncement(`Elevator moving to: ${room.name} (Floor ${room.numberKey})`)
        }
      } else if (e.key === '0' || e.key === ' ') {
        e.preventDefault()
        if (isElevatorActive) {
          directorRef.current?.skipElevator()
          setAnnouncement('Elevator transit skipped')
        } else {
          setCurrentRoomId('OVERVIEW')
          directorRef.current?.resetToOverview()
          setAnnouncement('Reset camera to Headquarters Overview')
        }
      }
    },
    [isViewActive, isElevatorActive]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const handleSelectRoom = (roomId: RoomId) => {
    setCurrentRoomId(roomId)
    const room = ROOM_DEFINITIONS[roomId]
    if (room) {
      setAnnouncement(`Navigating to ${room.name} via spatial elevator`)
    }
    directorRef.current?.navigateToFloorWithElevator(roomId)
  }

  const handleSkipElevator = () => {
    directorRef.current?.skipElevator()
    setAnnouncement('Elevator transit skipped')
  }

  const handleSetAtmosphere = (mode: AtmosphereMode) => {
    setAtmosphere(mode)
    directorRef.current?.setAtmosphere(mode)
    setAnnouncement(`Atmosphere preset changed to ${mode}`)
  }

  const handleSelectWorkstation = (key: keyof typeof WORKSTATION_PRESETS) => {
    directorRef.current?.frameWorkstation(key)
    const preset = WORKSTATION_PRESETS[key]
    if (preset) {
      setAnnouncement(`Framing workstation: ${preset.description}`)
    }
  }

  const handleSelectCharacterPreset = (key: keyof typeof CHARACTER_PRESETS) => {
    directorRef.current?.frameCharacter(key)
    const preset = CHARACTER_PRESETS[key]
    if (preset) {
      setAnnouncement(`Framing character: ${preset.description}`)
    }
  }

  const handleResetOverview = () => {
    setCurrentRoomId('OVERVIEW')
    directorRef.current?.resetToOverview()
    setAnnouncement('Reset camera to Headquarters Overview')
  }

  const handleSelectRole = (roleId: RoleId) => {
    const entity = directorRef.current?.selectRole(roleId)
    if (entity) {
      setSelectedEntity(entity)
      setAnnouncement(`Selected Role: ${entity.name}`)
    }
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
        backgroundColor: '#0c0f14',
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

        {/* Top Floating Glass Navigation & Atmosphere Bar */}
        <header
          aria-label="3D HQ Navigation and Controls"
          style={{
            position: 'absolute',
            top: '12px',
            left: '16px',
            right: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pointerEvents: 'none',
            zIndex: 20,
          }}
        >
          {/* Left: Quick Floors / Rooms Navigation */}
          <nav
            aria-label="3D Room Quick Navigation"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '2px',
              padding: '3px 4px',
              backgroundColor: 'rgba(15, 20, 28, 0.85)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              pointerEvents: 'auto',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)',
            }}
          >
            <button
              onClick={handleResetOverview}
              data-testid="hq-nav-overview-pill"
              title="Full Building Cutaway Overview (Key: 0)"
              style={{
                padding: '4px 8px',
                borderRadius: '5px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: 'none',
                color: '#e2e8f0',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <span>🏛️</span>
              <span>Building</span>
              <span style={{ fontSize: '10px', color: '#64748b' }}>[0]</span>
            </button>

            <div style={{ width: '1px', height: '14px', backgroundColor: 'rgba(255, 255, 255, 0.12)', margin: '0 3px' }} />

            {Object.values(ROOM_DEFINITIONS).map((room) => {
              const label = room.id === 'APPROVAL_MEZZANINE' ? 'M Mezzanine' : `F${room.numberKey} ${room.name.split(' ')[0]}`
              return (
                <button
                  key={room.id}
                  onClick={() => handleSelectRoom(room.id)}
                  data-testid={`hq-nav-room-${room.numberKey}`}
                  title={`${room.name} (Key: ${room.numberKey})`}
                  style={{
                    padding: '4px 7px',
                    borderRadius: '5px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    fontSize: '11px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-mono, monospace)', color: room.accentColor, fontWeight: 700 }}>
                    {room.numberKey}
                  </span>
                  <span>{label}</span>
                </button>
              )
            })}

            <div style={{ width: '1px', height: '14px', backgroundColor: 'rgba(255, 255, 255, 0.12)', margin: '0 3px' }} />

            {/* Quick Workstation Focus Dropdown / Buttons */}
            <button
              onClick={() => handleSelectWorkstation('WS_FRONTEND')}
              data-testid="hq-nav-ws-frontend"
              title="Focus Frontend Engineer Workstation (Ponytail & Laptop)"
              style={{
                padding: '4px 6px',
                borderRadius: '5px',
                backgroundColor: 'transparent',
                border: 'none',
                color: '#60a5fa',
                fontSize: '11px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              <span>💻</span>
              <span style={{ fontSize: '10px' }}>Frontend</span>
            </button>
            <button
              onClick={() => handleSelectWorkstation('WS_BACKEND')}
              data-testid="hq-nav-ws-backend"
              title="Focus Backend Engineer Workstation"
              style={{
                padding: '4px 6px',
                borderRadius: '5px',
                backgroundColor: 'transparent',
                border: 'none',
                color: '#38bdf8',
                fontSize: '11px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              <span>⚙️</span>
              <span style={{ fontSize: '10px' }}>Backend</span>
            </button>
            <button
              onClick={() => handleSelectCharacterPreset('CHAR_FRONTEND')}
              data-testid="hq-nav-char-frontend"
              title="Focus Frontend Mascot (Stylized Ponytail)"
              style={{
                padding: '4px 6px',
                borderRadius: '5px',
                backgroundColor: 'transparent',
                border: 'none',
                color: '#f472b6',
                fontSize: '11px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              <span>👱‍♀️</span>
              <span style={{ fontSize: '10px' }}>Ponytail</span>
            </button>

            {reducedMotion && (
              <span
                style={{
                  fontSize: '10px',
                  padding: '2px 6px',
                  marginLeft: '4px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(234, 179, 8, 0.15)',
                  border: '1px solid rgba(234, 179, 8, 0.3)',
                  color: '#fbbf24',
                  fontFamily: 'monospace',
                }}
              >
                Reduced Motion: Instant Cuts
              </span>
            )}
          </nav>

          {/* Right: Lighting Atmosphere Controls & Compact Live Activity Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              pointerEvents: 'auto',
            }}
          >
            {/* Experience Mode Toggle: Hybrid Diorama vs 3D Experimental */}
            <div
              data-testid="experience-mode-toggle"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                padding: '3px',
                backgroundColor: 'rgba(15, 20, 28, 0.85)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)',
              }}
            >
              <button
                onClick={() => {
                  setExperienceMode('HYBRID')
                  handleSelectRoom('AGENT_OPERATIONS')
                }}
                data-testid="mode-hybrid-btn"
                title="Hybrid 2D/3D Experience: Illustrated Agents & Management-Sim Diorama"
                style={{
                  padding: '3px 8px',
                  borderRadius: '5px',
                  backgroundColor: experienceMode === 'HYBRID' ? 'rgba(129, 140, 248, 0.25)' : 'transparent',
                  border: experienceMode === 'HYBRID' ? '1px solid #818cf8' : '1px solid transparent',
                  color: experienceMode === 'HYBRID' ? '#c4b5fd' : '#94a3b8',
                  fontSize: '11px',
                  fontWeight: experienceMode === 'HYBRID' ? 700 : 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>✨</span>
                <span>Hybrid HQ</span>
              </button>
              <button
                onClick={() => setExperienceMode('3D_EXPERIMENTAL')}
                data-testid="mode-3d-btn"
                title="3D Experimental Mode: Procedural Architecture & Hero Bay"
                style={{
                  padding: '3px 8px',
                  borderRadius: '5px',
                  backgroundColor: experienceMode === '3D_EXPERIMENTAL' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                  border: experienceMode === '3D_EXPERIMENTAL' ? '1px solid rgba(56, 189, 248, 0.5)' : '1px solid transparent',
                  color: experienceMode === '3D_EXPERIMENTAL' ? '#38bdf8' : '#94a3b8',
                  fontSize: '11px',
                  fontWeight: experienceMode === '3D_EXPERIMENTAL' ? 700 : 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>🏢</span>
                <span>3D Tower</span>
              </button>
            </div>

            {/* Atmosphere Presets Pill */}
            <div
              data-testid="hq-atmosphere-pill"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                padding: '3px',
                backgroundColor: 'rgba(15, 20, 28, 0.85)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)',
              }}
            >
              <button
                onClick={() => handleSetAtmosphere('DAY')}
                data-testid="hq-atmosphere-day"
                title="Soft Daylight Sky & Natural Illumination"
                style={{
                  padding: '3px 8px',
                  borderRadius: '5px',
                  backgroundColor: atmosphere === 'DAY' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                  border: atmosphere === 'DAY' ? '1px solid rgba(56, 189, 248, 0.5)' : '1px solid transparent',
                  color: atmosphere === 'DAY' ? '#38bdf8' : '#94a3b8',
                  fontSize: '11px',
                  fontWeight: atmosphere === 'DAY' ? 700 : 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>☀️</span>
                <span>Day</span>
              </button>

              <button
                onClick={() => handleSetAtmosphere('EVENING')}
                data-testid="hq-atmosphere-evening"
                title="Warm Golden Amber Horizon"
                style={{
                  padding: '3px 8px',
                  borderRadius: '5px',
                  backgroundColor: atmosphere === 'EVENING' ? 'rgba(251, 146, 60, 0.2)' : 'transparent',
                  border: atmosphere === 'EVENING' ? '1px solid rgba(251, 146, 60, 0.5)' : '1px solid transparent',
                  color: atmosphere === 'EVENING' ? '#fb923c' : '#94a3b8',
                  fontSize: '11px',
                  fontWeight: atmosphere === 'EVENING' ? 700 : 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>🌅</span>
                <span>Eve</span>
              </button>

              <button
                onClick={() => handleSetAtmosphere('NIGHT')}
                data-testid="hq-atmosphere-night"
                title="Subdued Midnight Exterior with Warm Architectural Interior Pools"
                style={{
                  padding: '3px 8px',
                  borderRadius: '5px',
                  backgroundColor: atmosphere === 'NIGHT' ? 'rgba(168, 85, 247, 0.2)' : 'transparent',
                  border: atmosphere === 'NIGHT' ? '1px solid rgba(168, 85, 247, 0.5)' : '1px solid transparent',
                  color: atmosphere === 'NIGHT' ? '#c084fc' : '#94a3b8',
                  fontSize: '11px',
                  fontWeight: atmosphere === 'NIGHT' ? 700 : 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>🌙</span>
                <span>Night</span>
              </button>
            </div>

            {/* Authoritative Live Activity Telemetry Badge (Proves no fake activity) */}
            <div
              data-testid="hq-live-activity-badge"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                backgroundColor: 'rgba(15, 20, 28, 0.85)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                fontSize: '11px',
                fontFamily: 'var(--font-mono, monospace)',
                color: activeTaskCount > 0 ? '#4ade80' : '#94a3b8',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: activeTaskCount > 0 ? '#22c55e' : '#64748b',
                  boxShadow: activeTaskCount > 0 ? '0 0 8px #22c55e' : 'none',
                }}
              />
              <span>
                {activeTaskCount > 0
                  ? `${activeTaskCount} Agent${activeTaskCount > 1 ? 's' : ''} Working`
                  : 'Idle (Honest Standby)'}
              </span>
            </div>
          </div>
        </header>

        {/* Spatial Elevator In-Transit Dynamic Overlay */}
        {isElevatorActive && (
          <aside
            data-testid="hq-elevator-transit-pill"
            aria-label="Elevator Transit in Progress"
            style={{
              position: 'absolute',
              top: '64px',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '6px 14px',
              backgroundColor: 'rgba(15, 23, 42, 0.92)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              borderRadius: '24px',
              color: '#f8fafc',
              fontSize: '12px',
              fontWeight: 500,
              zIndex: 15,
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5), 0 0 16px rgba(56, 189, 248, 0.2)',
            }}
          >
            <span style={{ fontSize: '14px', animation: 'pulse 1s infinite' }}>🛗</span>
            <span>Elevator in transit to floor...</span>
            <button
              onClick={handleSkipElevator}
              data-testid="elevator-skip-btn"
              style={{
                padding: '2px 8px',
                borderRadius: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#38bdf8',
                fontSize: '10px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Skip
            </button>
          </aside>
        )}

        {/* Layer B: Floor 2 Hybrid Diorama Overlay */}
        {isHybridFloor2 && (
          <Floor2HybridDiorama
            camera={directorRef.current?.cameraRig.camera ?? null}
            canvasRect={canvasDimensions}
            activeFloorId={currentRoomId}
            isFocused={true}
            onSelectEntity={setSelectedEntity}
          />
        )}
      </div>

      {/* Docked 2D Inspector Floating Glass Overlay on Right Side (Suppressed in Hybrid Floor 2 Mode) */}
      {!isHybridFloor2 && (
        <div
          style={{
            position: 'absolute',
            right: '12px',
            top: '56px',
            bottom: '12px',
            zIndex: 15,
            display: 'flex',
            overflow: 'hidden',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
          }}
        >
          <Hq3dInspector
            entity={selectedEntity}
            performanceStats={performanceStats}
            showPerformance={showPerformance}
            onTogglePerformance={() => setShowPerformance(!showPerformance)}
            onSelectRoom={handleSelectRoom}
            onSelectRole={handleSelectRole}
            onResetOverview={handleResetOverview}
            onClose={() => {
              setSelectedEntity(null)
              directorRef.current?.resetToOverview()
            }}
          />
        </div>
      )}
    </div>
  )
}
