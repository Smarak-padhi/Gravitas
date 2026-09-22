/**
 * Docked 2D Inspector Panel for 3D Headquarters (Wave 12D)
 * Displays authoritative metadata for selected stations, role scale figures, and rooms.
 * Strictly separates Role, Department, Status, Task, Harness, Transport, Provider, and Model.
 */

import React from 'react'
import type { PerformanceStats, RoomId, SelectedEntity } from '../types.js'
import type { RoleId } from '../roles/types.js'
import { ROOM_DEFINITIONS } from '../world/rooms.js'
import { FROZEN_ROLES } from '../roles/roles.js'

export interface Hq3dInspectorProps {
  readonly entity: SelectedEntity | null
  readonly performanceStats: PerformanceStats | null
  readonly showPerformance: boolean
  readonly onTogglePerformance: () => void
  readonly onSelectRoom: (roomId: RoomId) => void
  readonly onSelectRole?: ((roleId: RoleId) => void) | undefined
  readonly onResetOverview: () => void
  readonly onClose: () => void
}

export const Hq3dInspector: React.FC<Hq3dInspectorProps> = ({
  entity,
  performanceStats,
  showPerformance,
  onTogglePerformance,
  onSelectRoom,
  onSelectRole,
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

          {/* Role Presentation Domain Breakdown (B7) */}
          {entity.roleMetadata ? (
            <div
              data-testid="role-inspector-details"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '12px',
                borderRadius: '6px',
                backgroundColor: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid var(--border-color, #232b3e)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '10px' }}>LOGICAL ROLE</span>
                {entity.roleMetadata.isFixtureOnly && (
                  <span
                    data-testid="fixture-only-badge"
                    style={{
                      fontSize: '9px',
                      padding: '1px 5px',
                      borderRadius: '3px',
                      backgroundColor: 'rgba(234, 179, 8, 0.2)',
                      color: '#fbbf24',
                      border: '1px solid rgba(234, 179, 8, 0.4)',
                    }}
                  >
                    FIXTURE ONLY
                  </span>
                )}
              </div>

              <div data-testid="inspector-role-name" style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                {entity.roleMetadata.roleName}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                <div>
                  <div style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '10px' }}>DEPARTMENT</div>
                  <div data-testid="inspector-department" style={{ fontWeight: 600, color: '#e2e8f0' }}>
                    {entity.roleMetadata.department}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '10px' }}>CURRENT STATUS</div>
                  <div
                    data-testid="inspector-status"
                    style={{
                      fontWeight: 600,
                      color:
                        entity.roleMetadata.status === 'FOCUSED'
                          ? '#38bdf8'
                          : entity.roleMetadata.status === 'VERIFYING'
                            ? '#34d399'
                            : entity.roleMetadata.status === 'WAITING'
                              ? '#f59e0b'
                              : entity.roleMetadata.status === 'SUCCESS'
                                ? '#22c55e'
                                : entity.roleMetadata.status === 'FAILURE'
                                  ? '#ef4444'
                                  : '#94a3b8',
                    }}
                  >
                    {entity.roleMetadata.status}
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '6px' }}>
                <div style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '10px' }}>CURRENT TASK</div>
                <div data-testid="inspector-current-task" style={{ fontWeight: 600, color: '#e2e8f0', wordBreak: 'break-all' }}>
                  {entity.roleMetadata.currentTaskTitle
                    ? `${entity.roleMetadata.currentTaskTitle} (${entity.roleMetadata.currentTaskId})`
                    : entity.roleMetadata.currentTaskId ?? 'NONE'}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '6px' }}>
                <div>
                  <div style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '10px' }}>CURRENT HARNESS</div>
                  <div data-testid="inspector-current-harness" style={{ fontWeight: 600, color: '#cbd5e1' }}>
                    {entity.roleMetadata.currentHarness}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '10px' }}>TRANSPORT</div>
                  <div data-testid="inspector-transport" style={{ fontWeight: 600, color: '#cbd5e1' }}>
                    {entity.roleMetadata.transport}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <div style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '10px' }}>PROVIDER</div>
                  <div data-testid="inspector-provider" style={{ fontWeight: 600, color: '#cbd5e1' }}>
                    {entity.roleMetadata.provider}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '10px' }}>MODEL</div>
                  <div data-testid="inspector-model" style={{ fontWeight: 600, color: '#cbd5e1' }}>
                    {entity.roleMetadata.model}
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '6px' }}>
                <div style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '10px' }}>HOME STATION</div>
                <div data-testid="inspector-station" style={{ fontWeight: 600, color: '#94a3b8' }}>
                  {entity.roleMetadata.stationName}
                </div>
              </div>

              {entity.roleMetadata.roleSource && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '6px' }}>
                  <div style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '10px' }}>ROLE SOURCE</div>
                  <div
                    data-testid="inspector-role-source"
                    style={{
                      fontWeight: 600,
                      color: entity.roleMetadata.roleSource === 'CANONICAL' ? '#38bdf8' : '#eab308',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>{entity.roleMetadata.roleSource === 'CANONICAL' ? '✓' : '⚠️'}</span>
                    <span>{entity.roleMetadata.roleSource}</span>
                  </div>
                </div>
              )}

              {/* Wave 12F Handoff & Custody Panels */}
              {entity.roleMetadata.handoffsIn && entity.roleMetadata.handoffsIn.length > 0 && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '6px' }}>
                  <div style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '10px' }}>HANDOFFS IN</div>
                  <div data-testid="inspector-handoffs-in" style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
                    {entity.roleMetadata.handoffsIn.map((h) => (
                      <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                        <span style={{ color: '#94a3b8' }}>← from {h.sourceTaskId}</span>
                        <span style={{ fontWeight: 600, color: h.state === 'SATISFIED' ? '#10b981' : h.state === 'FAILED' ? '#ef4444' : '#38bdf8' }}>{h.state}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {entity.roleMetadata.handoffsOut && entity.roleMetadata.handoffsOut.length > 0 && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '6px' }}>
                  <div style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '10px' }}>HANDOFFS OUT</div>
                  <div data-testid="inspector-handoffs-out" style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
                    {entity.roleMetadata.handoffsOut.map((h) => (
                      <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                        <span style={{ color: '#94a3b8' }}>→ to {h.targetTaskId}</span>
                        <span style={{ fontWeight: 600, color: h.state === 'SATISFIED' ? '#10b981' : h.state === 'FAILED' ? '#ef4444' : '#38bdf8' }}>{h.state}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {entity.roleMetadata.upstreamTasks && entity.roleMetadata.upstreamTasks.length > 0 && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '6px' }}>
                  <div style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '10px' }}>UPSTREAM TASKS</div>
                  <div data-testid="inspector-upstream-tasks" style={{ fontWeight: 600, color: '#cbd5e1' }}>
                    {entity.roleMetadata.upstreamTasks.join(', ')}
                  </div>
                </div>
              )}

              {entity.roleMetadata.downstreamTasks && entity.roleMetadata.downstreamTasks.length > 0 && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '6px' }}>
                  <div style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '10px' }}>DOWNSTREAM TASKS</div>
                  <div data-testid="inspector-downstream-tasks" style={{ fontWeight: 600, color: '#cbd5e1' }}>
                    {entity.roleMetadata.downstreamTasks.join(', ')}
                  </div>
                </div>
              )}

              {entity.roleMetadata.artifactCustody && entity.roleMetadata.artifactCustody.length > 0 && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '6px' }}>
                  <div style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '10px' }}>ARTIFACT CUSTODY</div>
                  <div data-testid="inspector-artifact-custody" style={{ fontWeight: 600, color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>📦</span>
                    <span>{entity.roleMetadata.artifactCustody.join(', ')}</span>
                  </div>
                </div>
              )}

              {entity.roleMetadata.reviewStatus && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '6px' }}>
                  <div style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '10px' }}>REVIEW STATUS</div>
                  <div data-testid="inspector-review-status" style={{ fontWeight: 600, color: '#38bdf8' }}>
                    {entity.roleMetadata.reviewStatus}
                  </div>
                </div>
              )}

              {entity.roleMetadata.integrationStatus && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '6px' }}>
                  <div style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '10px' }}>INTEGRATION STATUS</div>
                  <div data-testid="inspector-integration-status" style={{ fontWeight: 600, color: '#38bdf8' }}>
                    {entity.roleMetadata.integrationStatus}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>
      ) : (
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ color: 'var(--text-secondary, #cbd5e1)', margin: 0, lineHeight: '1.5' }}>
            Interactive 3D Headquarters Foundation. Orbit with pointer, zoom with wheel, or select a
            reasoning role or room preset below.
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

      {/* Accessible Reasoning Role Roster (B20) */}
      <div
        data-testid="role-roster-section"
        style={{
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
          <span>REASONING ROLES (ACCESSIBLE DOM)</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {FROZEN_ROLES.map((r) => {
            const isSelected = entity?.id === r.roleId
            return (
              <button
                key={r.roleId}
                onClick={() => onSelectRole?.(r.roleId)}
                data-testid={`role-btn-${r.displayName.toLowerCase().replace(/\s+/g, '-')}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 8px',
                  borderRadius: '4px',
                  backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.15)' : 'var(--bg-panel-elevated, #171e2c)',
                  border: isSelected ? '1px solid #38bdf8' : '1px solid var(--border-color, #232b3e)',
                  color: isSelected ? '#38bdf8' : 'var(--text-secondary, #cbd5e1)',
                  fontSize: '11px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{r.displayName}</div>
                  <div style={{ fontSize: '9px', color: 'var(--text-muted, #94a3b8)' }}>{r.departmentId}</div>
                </div>
                <span
                  style={{
                    fontSize: '9px',
                    fontFamily: 'monospace',
                    padding: '2px 4px',
                    borderRadius: '2px',
                    backgroundColor: 'rgba(0,0,0,0.3)',
                  }}
                >
                  {r.stationAlias}
                </span>
              </button>
            )
          })}
        </div>
      </div>

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
