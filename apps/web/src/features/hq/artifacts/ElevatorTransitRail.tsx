import React from 'react'

export interface ElevatorTransitRailProps {
  readonly activeFloor: 1 | 2 | 3 | 4 // 1: Eng, 2: Astra, 3: Lab, 4: Mezzanine
  readonly onSelectFloor: (floor: 1 | 2 | 3 | 4) => void
  readonly packetLocationText?: string | undefined
}

export const ElevatorTransitRail: React.FC<ElevatorTransitRailProps> = ({
  activeFloor,
  onSelectFloor,
  packetLocationText,
}) => {
  const floors = [
    { level: 4 as const, label: 'MEZZANINE', short: 'M', name: 'Operator Area', glyph: '🖋️' },
    { level: 3 as const, label: 'FLOOR 3', short: '3', name: 'Verification Lab', glyph: '⚖️' },
    { level: 2 as const, label: 'FLOOR 2', short: '2', name: 'Astra Studio', glyph: '✨' },
    { level: 1 as const, label: 'FLOOR 1', short: '1', name: 'Engineering Core', glyph: '📐' },
  ]

  return (
    <div
      data-testid="elevator-transit-rail"
      style={{
        width: '58px',
        backgroundColor: '#EFECE6',
        borderRight: '1px solid var(--hq-border-strong, #C8C2B4)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '16px 0',
        position: 'relative',
        userSelect: 'none',
      }}
    >
      {/* Brass Pneumatic Pipe Vertical Track */}
      <div
        style={{
          position: 'absolute',
          top: '24px',
          bottom: '24px',
          width: '6px',
          borderRadius: '3px',
          backgroundColor: '#C8C2B4',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)',
          zIndex: 1,
        }}
      />

      {/* Floor Call Stations */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: '100%',
          width: '100%',
          zIndex: 2,
        }}
      >
        {floors.map((fl) => {
          const isActive = activeFloor === fl.level
          return (
            <button
              key={fl.level}
              data-testid={`floor-call-btn-${fl.level}`}
              onClick={() => onSelectFloor(fl.level)}
              title={`${fl.label} · ${fl.name}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '3px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '6px 0',
                width: '100%',
              }}
            >
              {/* Floor Button */}
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: isActive ? 'var(--hq-wood-walnut, #5A4231)' : '#FFFFFF',
                  color: isActive ? '#FFFFFF' : 'var(--hq-text-primary, #1C1E21)',
                  border: `2px solid ${isActive ? 'var(--hq-metal-brass, #D97706)' : 'var(--hq-border-strong, #C8C2B4)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 800,
                  boxShadow: isActive ? '0 0 10px rgba(217, 119, 6, 0.4)' : '0 1px 3px rgba(0,0,0,0.1)',
                  transition: 'all 0.2s cubic-bezier(0.2, 0, 0, 1)',
                  position: 'relative',
                }}
              >
                <span>{fl.short}</span>
                {isActive && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-2px',
                      right: '-2px',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--hq-metal-brass, #D97706)',
                      boxShadow: '0 0 6px var(--hq-metal-brass, #D97706)',
                    }}
                  />
                )}
              </div>

              <span
                style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  color: isActive ? 'var(--hq-text-primary, #1C1E21)' : 'var(--hq-text-muted, #848B98)',
                  letterSpacing: '0.4px',
                }}
              >
                {fl.short === 'M' ? 'MEZZ' : `FL ${fl.short}`}
              </span>
            </button>
          )
        })}
      </div>

      {/* Real Transit Status Tooltip */}
      {packetLocationText && (
        <div
          title={packetLocationText}
          style={{
            position: 'absolute',
            bottom: '4px',
            fontSize: '9px',
            color: 'var(--hq-text-muted, #848B98)',
            textAlign: 'center',
            padding: '2px 4px',
          }}
        >
          🛗
        </div>
      )}
    </div>
  )
}
