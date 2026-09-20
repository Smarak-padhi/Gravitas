import React from 'react'
import type { CoworkerStationState } from '../livingHqState.js'
import { CoworkerAvatar } from '../characters/CoworkerAvatar.js'

export interface AstraStudioFloorProps {
  readonly astraCoworker: CoworkerStationState
}

export const AstraStudioFloor: React.FC<AstraStudioFloorProps> = ({ astraCoworker }) => {
  const mineralSwatches = [
    { name: 'Confident Blue', hex: '#2B59C3', role: 'Active / Working' },
    { name: 'Sage Celadon', hex: '#3D7A68', role: 'Ready / Approved' },
    { name: 'Honey Amber', hex: '#B45309', role: 'Needs Operator' },
    { name: 'Forensic Iris', hex: '#6B46C1', role: 'Verifying' },
    { name: 'Crimson Red', hex: '#B91C1C', role: 'Failed' },
  ]

  const motionRules = [
    { label: 'Instant', time: '50ms', purpose: 'Micro-feedback' },
    { label: 'Fast', time: '150ms', purpose: 'Button press / hover' },
    { label: 'Normal', time: '250ms', purpose: 'Drawer / modal transit' },
    { label: 'Deliberate', time: '400ms', purpose: 'Elevator & seal stamp' },
  ]

  return (
    <section
      data-testid="astra-studio-floor"
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
      {/* Floor Header */}
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
              backgroundColor: '#A855F7',
              color: '#FFFFFF',
              borderRadius: '4px',
              letterSpacing: '0.6px',
            }}
          >
            FLOOR 2
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
              ASTRA DESIGN STUDIO &amp; ATELIER
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--hq-text-secondary, #555B66)' }}>
              Design Authority · Visual Contracts, Tactile Hierarchy &amp; Kinetic Motion
            </span>
          </div>
        </div>

        <span
          style={{
            fontSize: '10px',
            fontWeight: 700,
            color: '#7E22CE',
            backgroundColor: '#FAF5FF',
            border: '1px solid #E9D8FD',
            padding: '2px 8px',
            borderRadius: '12px',
          }}
        >
          ● DESIGN SYSTEM ACTIVE
        </span>
      </div>

      {/* Main Studio Workspace Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        {/* Astra Drafting Desk */}
        <div
          style={{
            padding: '16px',
            backgroundColor: '#FAF5FF',
            border: '1px solid #E9D8FD',
            borderRadius: '6px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <CoworkerAvatar identity={astraCoworker.identity} pose={astraCoworker.pose} size={50} />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--hq-text-primary, #1C1E21)' }}>
                {astraCoworker.identity.name}
              </div>
              <div style={{ fontSize: '11px', color: '#7E22CE' }}>
                {astraCoworker.identity.roleTitle}
              </div>
            </div>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--hq-text-secondary, #555B66)', margin: 0, lineHeight: 1.4 }}>
            {astraCoworker.identity.bio}
          </p>
          <div style={{ fontSize: '10px', color: 'var(--hq-text-muted, #848B98)', fontFamily: 'var(--font-mono)' }}>
            Active Tool: {astraCoworker.identity.toolName}
          </div>
        </div>

        {/* Mineral Swatches Wall */}
        <div
          style={{
            padding: '14px 16px',
            backgroundColor: 'var(--hq-surface-parchment, #FCFAF6)',
            border: '1px solid var(--hq-border-subtle, #E3DFD5)',
            borderRadius: '6px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--hq-text-primary, #1C1E21)' }}>
            MINERAL PALETTE SWATCHES
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '6px' }}>
            {mineralSwatches.map((sw) => (
              <div
                key={sw.name}
                style={{
                  padding: '6px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid var(--hq-border-subtle, #E3DFD5)',
                  borderRadius: '4px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div style={{ height: '14px', borderRadius: '2px', backgroundColor: sw.hex }} />
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--hq-text-primary, #1C1E21)' }}>
                  {sw.name}
                </div>
                <div style={{ fontSize: '9px', color: 'var(--hq-text-muted, #848B98)' }}>
                  {sw.role}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Kinetic Motion Timing Card */}
        <div
          style={{
            padding: '14px 16px',
            backgroundColor: 'var(--hq-surface-parchment, #FCFAF6)',
            border: '1px solid var(--hq-border-subtle, #E3DFD5)',
            borderRadius: '6px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--hq-text-primary, #1C1E21)' }}>
            KINETIC MOTION CURVES
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {motionRules.map((m) => (
              <div
                key={m.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '10px',
                  padding: '4px 6px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '3px',
                  border: '1px solid var(--hq-border-subtle, #E3DFD5)',
                }}
              >
                <span style={{ fontWeight: 700, color: 'var(--hq-text-primary, #1C1E21)' }}>{m.label}</span>
                <span style={{ color: 'var(--hq-text-secondary, #555B66)' }}>{m.purpose}</span>
                <code style={{ fontFamily: 'var(--font-mono)', color: '#7E22CE' }}>{m.time}</code>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
