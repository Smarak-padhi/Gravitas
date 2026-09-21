/**
 * Docked 2D Inspector Panel for 3D Headquarters
 * Displays authoritative static metadata for selected stations, scale figures, and rooms.
 */

import React from 'react'
import type { PerformanceStats, RoomId, SelectedEntity } from '../types.js'
import { ROOM_DEFINITIONS } from '../world/rooms.js'

export interface Hq3dInspectorProps {
  readonly entity: SelectedEntity | null
  readonly performanceStats: PerformanceStats | null
  readonly showPerformance: boolean
  readonly onTogglePerformance: () => void
  readonly onSelectRoom: (roomId: RoomId) => void
  readonly onResetOverview: () => void
  readonly onClose: () => void
}

export const Hq3dInspector: React.FC<Hq3dInspectorProps> = ({
  entity,
  performanceStats,
  showPerformance,
  onTogglePerformance,
  onSelectRoom,
  onResetOverview,
  onClose,
}) => {
  return (
    <aside
      data-testid="hq3d-inspector"
      aria-label="3D Headquarters Inspector"
      style={{
        width: '320px',
        maxWidth: '100%',
        backgroundColor: 'var(--bg-panel, #121722)',
        borderLeft: '1px solid var(--border-color, #232b3e)',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        color: 'var(--text-primary, #e2e8f0)',
        fontSize: '12px',
        zIndex: 10,
        boxShadow: '-4px 0 16px rgba(0, 0, 0, 0.4)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-color, #232b3e)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-panel-elevated, #171e2c)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px' }}>🏛️</span>
          <span style={{ fontWeight: 700, letterSpacing: '0.5px' }}>
            {entity ? entity.name : 'Headquarters Overview'}
          </span>
        </div>
        {entity && (
          <button
            onClick={onClose}
            aria-label="Deselect entity"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted, #94a3b8)',
              cursor: 'pointer',
              fontSize: '14px',
              padding: '2px 6px',
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Selected Entity Details */}
      {entity ? (
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                fontSize: '10px',
                padding: '2px 8px',
                borderRadius: '4px',
                fontFamily: 'var(--font-mono, monospace)',
                fontWeight: 700,
                textTransform: 'uppercase',
                backgroundColor:
                  entity.type === 'station'
                    ? 'rgba(56, 189, 248, 0.15)'
                    : entity.type === 'character'
                      ? 'rgba(194, 155, 56, 0.15)'
                      : 'rgba(139, 92, 246, 0.15)',
                color:
                  entity.type === 'station'
                    ? '#38bdf8'
                    : entity.type === 'character'
                      ? '#eab308'
                      : '#a78bfa',
                border: '1px solid currentColor',
              }}
            >
              {entity.type}
            </span>
            <span
              style={{
                fontSize: '10px',
                fontFamily: 'var(--font-mono, monospace)',
                color: 'var(--text-muted, #94a3b8)',
              }}
            >
              ID: {entity.id}
            </span>
          </div>

          <div>
            <div style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '11px' }}>Zone / Room</div>
            <div style={{ fontWeight: 600, marginTop: '2px' }}>{entity.room}</div>
          </div>

          {entity.role && (
            <div>
              <div style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '11px' }}>Function</div>
              <div style={{ fontWeight: 600, marginTop: '2px' }}>{entity.role}</div>
            </div>
          )}

          <div>
            <div style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '11px' }}>Status</div>
            <div
              style={{
                fontWeight: 600,
                color: '#38bdf8',
                marginTop: '2px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#38bdf8',
                }}
              />
              {entity.status}
            </div>
          </div>

          {entity.description && (
            <div
              style={{
                padding: '10px',
                borderRadius: '6px',
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid var(--border-color, #232b3e)',
                lineHeight: '1.45',
                color: 'var(--text-secondary, #cbd5e1)',
              }}
            >
              {entity.description}
            </div>
          )}

          <div
            style={{
              padding: '8px 10px',
              borderRadius: '6px',
              backgroundColor: 'rgba(56, 189, 248, 0.08)',
              border: '1px dashed rgba(56, 189, 248, 0.3)',
              fontSize: '11px',
              color: '#38bdf8',
            }}
          >
            ℹ️ <strong>Truthful Prototype</strong>: Wave 12B verifies scene geometry, camera rig,
            and lighting. Live agent orchestration runs in Wave 12C+.
          </div>
        </div>
      ) : (
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ color: 'var(--text-secondary, #cbd5e1)', margin: 0, lineHeight: '1.5' }}>
            Interactive 3D Headquarters Foundation. Orbit with pointer, zoom with wheel, or select a
            room preset below.
          </p>
          <div
            style={{
              padding: '10px',
              borderRadius: '6px',
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid var(--border-color, #232b3e)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: '11px',
            }}
          >
            <div>
              <span style={{ color: '#38bdf8' }}>Orbit</span> : Drag Left Click
            </div>
            <div>
              <span style={{ color: '#38bdf8' }}>Zoom</span> : Mouse Wheel
            </div>
            <div>
              <span style={{ color: '#38bdf8' }}>Rooms</span> : Keys [1] - [6]
            </div>
            <div>
              <span style={{ color: '#38bdf8' }}>Overview</span> : Key [0] or [Space]
            </div>
          </div>
        </div>
      )}

      {/* Room Preset Direct Framing */}
      <div
        style={{
          marginTop: 'auto',
          padding: '16px',
          borderTop: '1px solid var(--border-color, #232b3e)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: 'var(--text-muted, #94a3b8)',
          }}
        >
          <span>ARCHITECTURAL ROOMS</span>
          <button
            onClick={onResetOverview}
            style={{
              background: 'none',
              border: 'none',
              color: '#38bdf8',
              cursor: 'pointer',
              fontSize: '11px',
              padding: 0,
            }}
          >
            [0] Overview
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          {Object.values(ROOM_DEFINITIONS).map((room) => (
            <button
              key={room.id}
              onClick={() => onSelectRoom(room.id)}
              data-testid={`room-preset-btn-${room.numberKey}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 8px',
                borderRadius: '4px',
                backgroundColor: 'var(--bg-panel-elevated, #171e2c)',
                border: '1px solid var(--border-color, #232b3e)',
                color: 'var(--text-secondary, #cbd5e1)',
                fontSize: '11px',
                cursor: 'pointer',
                textAlign: 'left',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono, monospace)',
                  color: room.accentColor,
                  fontWeight: 700,
                }}
              >
                [{room.numberKey}]
              </span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{room.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Performance Telemetry Drawer / Footer */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--border-color, #232b3e)',
          backgroundColor: 'var(--bg-panel-elevated, #171e2c)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
          }}
        >
          <span style={{ color: 'var(--text-muted, #94a3b8)' }}>TELEMETRY</span>
          <button
            onClick={onTogglePerformance}
            data-testid="toggle-perf-btn"
            style={{
              background: 'none',
              border: 'none',
              color: showPerformance ? '#38bdf8' : 'var(--text-muted, #94a3b8)',
              cursor: 'pointer',
              fontSize: '11px',
              fontFamily: 'var(--font-mono, monospace)',
            }}
          >
            {showPerformance ? 'HIDE HUD' : 'SHOW HUD'}
          </button>
        </div>

        {showPerformance && performanceStats && (
          <div
            data-testid="perf-stats-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '6px',
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: '10px',
              color: 'var(--text-secondary, #cbd5e1)',
            }}
          >
            <div>
              FPS: <strong style={{ color: '#22c55e' }}>{performanceStats.fps}</strong>
            </div>
            <div>
              Frame: <strong>{performanceStats.frameTimeMs}ms</strong>
            </div>
            <div>
              Calls: <strong>{performanceStats.drawCalls}</strong>
            </div>
            <div>
              Triangles: <strong>{performanceStats.triangles.toLocaleString()}</strong>
            </div>
            <div>
              Geom: <strong>{performanceStats.geometries}</strong>
            </div>
            <div>
              Tex: <strong>{performanceStats.textures}</strong>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
