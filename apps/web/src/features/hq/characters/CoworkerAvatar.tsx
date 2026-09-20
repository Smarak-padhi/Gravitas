import React from 'react'
import type { CoworkerIdentity } from './coworkerIdentities.js'

export type CanonicalPose =
  | 'IDLE'
  | 'WALKING'
  | 'READING'
  | 'THINKING'
  | 'WORKING'
  | 'REVIEWING'
  | 'BLOCKED'
  | 'NEEDS_OPERATOR'
  | 'DONE'
  | 'FAILED'

export interface CoworkerAvatarProps {
  readonly identity: CoworkerIdentity
  readonly pose: CanonicalPose
  readonly size?: number | undefined
  readonly isSelected?: boolean | undefined
  readonly onClick?: () => void
  readonly showTooltip?: boolean | undefined
}

export const CoworkerAvatar: React.FC<CoworkerAvatarProps> = ({
  identity,
  pose,
  size = 56,
  isSelected = false,
  onClick,
  showTooltip = true,
}) => {
  const isWorking = pose === 'WORKING'
  const isNeedsOperator = pose === 'NEEDS_OPERATOR'

  // Pose badge symbol & color
  const getPoseBadge = () => {
    switch (pose) {
      case 'WORKING':
        return { glyph: '⚡', bg: 'var(--hq-mineral-blue, #2B59C3)', fg: '#ffffff' }
      case 'READING':
        return { glyph: '📖', bg: 'var(--hq-surface-subtle, #EFECE6)', fg: 'var(--hq-text-primary, #1C1E21)' }
      case 'THINKING':
        return { glyph: '💡', bg: '#FDE047', fg: '#713F12' }
      case 'REVIEWING':
        return { glyph: '🔍', bg: 'var(--hq-mineral-iris, #6B46C1)', fg: '#ffffff' }
      case 'NEEDS_OPERATOR':
        return { glyph: '⚠️', bg: 'var(--hq-mineral-amber, #B45309)', fg: '#ffffff' }
      case 'DONE':
        return { glyph: '✓', bg: 'var(--hq-mineral-sage, #3D7A68)', fg: '#ffffff' }
      case 'FAILED':
        return { glyph: '✕', bg: 'var(--hq-mineral-crimson, #B91C1C)', fg: '#ffffff' }
      case 'BLOCKED':
        return { glyph: '⏳', bg: '#64748B', fg: '#ffffff' }
      case 'WALKING':
        return { glyph: '👟', bg: 'var(--hq-surface-panel, #F4F1EA)', fg: 'var(--hq-text-secondary, #555B66)' }
      case 'IDLE':
      default:
        return null
    }
  }

  const badge = getPoseBadge()

  return (
    <div
      data-testid={`coworker-avatar-${identity.id}`}
      onClick={onClick}
      title={showTooltip ? `${identity.name} · ${identity.roleTitle} (${pose})` : undefined}
      style={{
        position: 'relative',
        width: `${size}px`,
        height: `${size}px`,
        cursor: onClick ? 'pointer' : 'default',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        transition: 'transform 0.18s cubic-bezier(0.2, 0, 0, 1)',
        transform: isSelected ? 'scale(1.08)' : 'scale(1)',
      }}
    >
      {/* Halo / Selection Ring */}
      <div
        style={{
          position: 'absolute',
          inset: '-3px',
          borderRadius: '50%',
          border: isSelected
            ? `2.5px solid ${identity.accentColor}`
            : isNeedsOperator
              ? '2px dashed var(--hq-mineral-amber, #B45309)'
              : '1.5px solid var(--hq-border-subtle, #E3DFD5)',
          backgroundColor: identity.bgTint,
          boxShadow: isSelected
            ? `0 0 12px ${identity.accentColor}33`
            : isNeedsOperator
              ? '0 0 12px rgba(180, 83, 9, 0.25)'
              : 'none',
          animation: isNeedsOperator
            ? 'attentionPulse 2s ease-in-out infinite'
            : isWorking
              ? 'activityBreathe 2.5s ease-in-out infinite'
              : 'none',
        }}
      />

      {/* SVG Character Rig */}
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        style={{
          position: 'relative',
          zIndex: 1,
          overflow: 'visible',
        }}
      >
        {/* Head Shadow */}
        <ellipse cx="50" cy="52" rx="22" ry="22" fill="rgba(60, 50, 40, 0.08)" />

        {/* Garment / Torso based on identity */}
        <path
          d="M24 92 C24 66 36 60 50 60 C64 60 76 66 76 92 Z"
          fill={identity.accentColor}
        />

        {/* Apron / Cardigan / Smock accent */}
        <path
          d="M36 68 C42 66 58 66 64 68 L60 92 L40 92 Z"
          fill="#FFFFFF"
          opacity={0.35}
        />

        {/* Head / Face */}
        <circle cx="50" cy="42" r="20" fill="#FDE68A" stroke="#D97706" strokeWidth="1.5" />

        {/* Eyes based on Pose */}
        {pose === 'READING' || pose === 'WORKING' ? (
          // Downward looking eyes
          <g stroke="#1C1E21" strokeWidth="2.5" strokeLinecap="round">
            <line x1="42" y1="44" x2="46" y2="45" />
            <line x1="54" y1="45" x2="58" y2="44" />
          </g>
        ) : pose === 'THINKING' ? (
          // Reflective eyes looking upward
          <g fill="#1C1E21">
            <circle cx="43" cy="38" r="2.5" />
            <circle cx="57" cy="38" r="2.5" />
          </g>
        ) : pose === 'FAILED' ? (
          // Dismayed cross eyes
          <g stroke="#B91C1C" strokeWidth="2" strokeLinecap="round">
            <line x1="41" y1="39" x2="47" y2="45" />
            <line x1="47" y1="39" x2="41" y2="45" />
            <line x1="53" y1="39" x2="59" y2="45" />
            <line x1="59" y1="39" x2="53" y2="45" />
          </g>
        ) : pose === 'DONE' ? (
          // Happy smiling arc eyes
          <g stroke="#15803D" strokeWidth="2.5" fill="none" strokeLinecap="round">
            <path d="M41 42 Q44 38 47 42" />
            <path d="M53 42 Q56 38 59 42" />
          </g>
        ) : (
          // Alert neutral eyes
          <g fill="#1C1E21">
            <circle cx="44" cy="41" r="2.5" />
            <circle cx="56" cy="41" r="41" />
          </g>
        )}

        {/* Hair / Headwear based on coworker identity */}
        {identity.id.includes('astra') ? (
          // Astra geometric hair & designer glasses
          <g>
            <path d="M30 36 C32 18 68 18 70 36 C64 24 36 24 30 36 Z" fill="#4A154B" />
            <circle cx="43" cy="41" r="5" fill="none" stroke="#DB2777" strokeWidth="2" />
            <circle cx="57" cy="41" r="5" fill="none" stroke="#DB2777" strokeWidth="2" />
            <line x1="48" y1="41" x2="52" y2="41" stroke="#DB2777" strokeWidth="2" />
          </g>
        ) : identity.id.includes('verifier') ? (
          // Verifier cleanroom cap & inspection loupe
          <g>
            <path d="M30 32 C32 20 68 20 70 32 Z" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1.5" />
            <circle cx="58" cy="41" r="6" fill="none" stroke="#059669" strokeWidth="2" />
            <line x1="64" y1="44" x2="68" y2="48" stroke="#059669" strokeWidth="2" />
          </g>
        ) : identity.id.includes('codex') ? (
          // Codex structured dark hair & caliper in breast pocket
          <g>
            <path d="M31 35 C32 20 68 18 69 35 C64 28 36 28 31 35 Z" fill="#1E293B" />
            <line x1="38" y1="74" x2="42" y2="82" stroke="#D97706" strokeWidth="2" strokeLinecap="round" />
          </g>
        ) : (
          // Claude / Standard warm brown hair
          <g>
            <path d="M30 34 C35 22 65 22 70 34 C63 26 37 26 30 34 Z" fill="#78350F" />
          </g>
        )}

        {/* Hand Gestures based on Pose */}
        {pose === 'WORKING' && (
          <g fill="#FDE68A" stroke="#D97706" strokeWidth="1">
            <circle cx="34" cy="76" r="4" />
            <circle cx="66" cy="76" r="4" />
          </g>
        )}
        {pose === 'NEEDS_OPERATOR' && (
          <g fill="#FDE68A" stroke="#D97706" strokeWidth="1.5">
            <path d="M68 76 L78 52 L84 54 L74 78 Z" />
            <circle cx="81" cy="50" r="4" />
          </g>
        )}
        {pose === 'THINKING' && (
          <g fill="#FDE68A" stroke="#D97706" strokeWidth="1">
            <circle cx="56" cy="54" r="4" />
          </g>
        )}
      </svg>

      {/* Floating Pose Badge */}
      {badge && (
        <div
          data-testid={`avatar-pose-badge-${pose.toLowerCase()}`}
          style={{
            position: 'absolute',
            bottom: '-2px',
            right: '-2px',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            backgroundColor: badge.bg,
            color: badge.fg,
            border: '2px solid #FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            fontWeight: 800,
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
            zIndex: 3,
          }}
        >
          {badge.glyph}
        </div>
      )}

      {/* Tool Glyph watermark */}
      <div
        style={{
          position: 'absolute',
          top: '-4px',
          left: '-4px',
          fontSize: '12px',
          opacity: 0.85,
          zIndex: 2,
        }}
      >
        {identity.toolGlyph}
      </div>
    </div>
  )
}
