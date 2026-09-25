/**
 * Stylized 2D/SVG Illustrated Gravitas Character Species for Floor 2 Hybrid HQ (Wave 12H-R)
 *
 * Implements an ORIGINAL Gravitas mascot species ("Pebble-Kin / Orb-Sprite"):
 * - Shared Species Grammar:
 *   - Oversized expressive head (40–45% of total visual height)
 *   - Soft rounded capsule silhouette with signature Gravitas crown crest
 *   - High-contrast minimal face plane: expressive dark pill eyes, brow/eyelid states, cute blush
 *   - Compact bean-shaped torso with glowing runtime status core node
 *   - Short expressive noodle/mitten arms (working, presenting, holding loupe/slate, slump)
 *   - Compact peg legs with rounded boots + soft radial contact shadow
 *   - Readability proof: identifiable and charming at both 40px and 80px CSS height
 *
 * Role Identifiers (Costume & Accessories on the same species):
 * - Frontend Engineer: Lavender / violet palette (#818cf8, #c4b5fd), oversized headphones,
 *   tiny digital stylus, energetic posture
 * - Backend Engineer: Teal / cyan palette (#0d9488, #2dd4bf), compact tech headset with mic,
 *   mini terminal slate, grounded posture
 * - Independent Reviewer: Sage / lime palette (#65a30d, #84cc16), wireframe inspection loupe,
 *   verification checklist slate, attentive posture
 *
 * Strictly role-oriented (NOT LLM/harness identity).
 * Zero-fake: only productive motion during active work.
 */

import React from 'react'
import type { IllustratedAgentRole, IllustratedAgentState } from './types.js'

export interface IllustratedAgentProps {
  readonly role: IllustratedAgentRole
  readonly state: IllustratedAgentState
  readonly isSelected?: boolean
  readonly onClick?: () => void
  readonly label?: string
  readonly height?: number
  readonly hideLabel?: boolean
}

export const IllustratedAgent: React.FC<IllustratedAgentProps> = ({
  role,
  state,
  isSelected = false,
  onClick,
  label,
  height = 116,
  hideLabel = false,
}) => {
  const isWorking = state === 'WORKING'
  const isReviewing = state === 'REVIEWING'
  const isWaitingApproval = state === 'WAITING_APPROVAL'
  const isFailed = state === 'FAILED'
  const isCompleted = state === 'COMPLETED'

  // Proportional width based on 96:116 aspect ratio
  const width = Math.round((height * 96) / 116)

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.()
        }
      }}
      data-testid={`hybrid-agent-${role}`}
      data-agent-state={state}
      style={{
        position: 'relative',
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        cursor: 'pointer',
        userSelect: 'none',
        transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
        transform: isSelected ? 'scale(1.08)' : 'scale(1.0)',
      }}
    >
      {/* Selection Glow Ring */}
      {isSelected && (
        <div
          style={{
            position: 'absolute',
            bottom: hideLabel ? '6px' : '22px',
            width: `${Math.round(width * 0.9)}px`,
            height: '24px',
            borderRadius: '50%',
            background: 'radial-gradient(ellipse at center, rgba(129, 140, 248, 0.5) 0%, rgba(129, 140, 248, 0) 70%)',
            pointerEvents: 'none',
            animation: 'gravitasPulse 2s infinite ease-in-out',
          }}
        />
      )}

      {/* SVG Character Silhouette */}
      <div
        style={{
          width: `${width}px`,
          height: `${height}px`,
          filter: isSelected
            ? 'drop-shadow(0 6px 16px rgba(129, 140, 248, 0.55))'
            : 'drop-shadow(0 4px 10px rgba(0, 0, 0, 0.35))',
          position: 'relative',
        }}
      >
        <GravitasSpeciesSvg role={role} state={state} width={width} height={height} />
      </div>

      {/* Role Pill Label */}
      {!hideLabel && (
        <div
          style={{
            marginTop: '4px',
            padding: height <= 60 ? '1px 5px' : '2px 8px',
            borderRadius: '12px',
            backgroundColor: isSelected
              ? 'rgba(79, 70, 229, 0.94)'
              : 'rgba(15, 23, 42, 0.88)',
            backdropFilter: 'blur(8px)',
            border: isSelected
              ? '1px solid #818cf8'
              : '1px solid rgba(255, 255, 255, 0.12)',
            color: '#f8fafc',
            fontSize: height <= 60 ? '9px' : '11px',
            fontWeight: 600,
            letterSpacing: '0.2px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
          }}
        >
          <span
            style={{
              width: height <= 60 ? '5px' : '6px',
              height: height <= 60 ? '5px' : '6px',
              borderRadius: '50%',
              backgroundColor: isWorking
                ? '#38bdf8'
                : isReviewing
                ? '#a3e635'
                : isWaitingApproval || isCompleted
                ? '#22c55e'
                : isFailed
                ? '#ef4444'
                : '#94a3b8',
              boxShadow: isWorking || isReviewing || isWaitingApproval || isCompleted
                ? '0 0 6px currentColor'
                : 'none',
            }}
          />
          <span>
            {label ??
              (role === 'role:engineering:frontend-engineer'
                ? 'Frontend'
                : role === 'role:engineering:backend-engineer'
                ? 'Backend'
                : 'Reviewer')}
          </span>
        </div>
      )}

      {/* Global Character CSS Keyframes */}
      <style>{`
        @keyframes gravitasBreathe {
          0%, 100% { transform: translateY(0px) scale(1, 1); }
          50% { transform: translateY(-3px) scale(1.02, 0.98); }
        }
        @keyframes gravitasWork {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          25% { transform: translateY(-1.5px) rotate(-1.5deg); }
          75% { transform: translateY(-1.5px) rotate(1.5deg); }
        }
        @keyframes gravitasPerkUp {
          0%, 100% { transform: translateY(0px) scale(1, 1); }
          50% { transform: translateY(-5px) scale(1.04, 1.02); }
        }
        @keyframes gravitasSlump {
          0%, 100% { transform: translateY(2px) scale(0.98, 0.96); }
          50% { transform: translateY(3px) scale(0.97, 0.95); }
        }
        @keyframes gravitasPulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.12); }
        }
        @keyframes gravitasBlink {
          0%, 94%, 98%, 100% { transform: scaleY(1); }
          96% { transform: scaleY(0.1); }
        }
        @keyframes gravitasTypingLeft {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2.5px); }
        }
        @keyframes gravitasTypingRight {
          0%, 100% { transform: translateY(-2.5px); }
          50% { transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

/**
 * Unified Gravitas Mascot Species SVG Component
 *
 * Implements the shared morphological grammar:
 * - Head: 48px wide x 44px tall capsule with rounded antenna crown
 * - Torso: 42px wide x 36px tall rounded bean with status jewel
 * - Limbs: stubby expressive arms, rounded boots
 * - Soft contact blob shadow at baseline
 */
interface GravitasSpeciesSvgProps {
  readonly role: IllustratedAgentRole
  readonly state: IllustratedAgentState
  readonly width: number
  readonly height: number
}

const GravitasSpeciesSvg: React.FC<GravitasSpeciesSvgProps> = ({
  role,
  state,
  width,
  height,
}) => {
  const isWorking = state === 'WORKING'
  const isCompleted = state === 'COMPLETED'
  const isReviewing = state === 'REVIEWING'
  const isWaitingApproval = state === 'WAITING_APPROVAL'
  const isFailed = state === 'FAILED'
  const isWaiting = state === 'WAITING'

  // Micro-animation choreography
  let animStyle: React.CSSProperties = {
    animation: 'gravitasBreathe 3.4s infinite ease-in-out',
    transformOrigin: '48px 105px',
  }
  if (isWorking) {
    animStyle = {
      animation: 'gravitasWork 0.28s infinite ease-in-out',
      transformOrigin: '48px 105px',
    }
  } else if (isCompleted || isWaitingApproval) {
    animStyle = {
      animation: 'gravitasPerkUp 1.8s infinite ease-in-out',
      transformOrigin: '48px 105px',
    }
  } else if (isFailed) {
    animStyle = {
      animation: 'gravitasSlump 2.5s infinite ease-in-out',
      transformOrigin: '48px 105px',
    }
  }

  // Palette parameters per role
  const isFrontend = role === 'role:engineering:frontend-engineer'
  const isBackend = role === 'role:engineering:backend-engineer'
  const isReviewer = role === 'role:quality:independent-reviewer'

  const roleAccent = isFrontend ? '#818cf8' : isBackend ? '#2dd4bf' : '#84cc16'
  const roleSecondary = isFrontend ? '#a78bfa' : isBackend ? '#0d9488' : '#4d7c0f'
  const roleLight = isFrontend ? '#ede9fe' : isBackend ? '#ccfbf1' : '#ecfccb'

  // Status jewel glow color
  const statusColor = isWorking
    ? '#38bdf8'
    : isReviewing
    ? '#a3e635'
    : isCompleted || isWaitingApproval
    ? '#22c55e'
    : isFailed
    ? '#ef4444'
    : isWaiting
    ? '#fbbf24'
    : '#94a3b8'

  return (
    <svg
      viewBox="0 0 96 116"
      width={width}
      height={height}
      style={{ overflow: 'visible' }}
    >
      <defs>
        {/* Soft Radial Contact Shadow */}
        <radialGradient id={`contactGrad-${role}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(0, 0, 0, 0.45)" />
          <stop offset="60%" stopColor="rgba(0, 0, 0, 0.2)" />
          <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
        </radialGradient>

        {/* Species Porcelain Skin Gradient (Universal) */}
        <linearGradient id={`speciesSkin-${role}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>

        {/* Role Accent Gradient for Torso / Garment */}
        <linearGradient id={`roleAccentGrad-${role}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={roleSecondary} />
          <stop offset="100%" stopColor={isFrontend ? '#6366f1' : isBackend ? '#115e59' : '#365314'} />
        </linearGradient>
      </defs>

      {/* 0. SOFT GROUND CONTACT BLOB SHADOW */}
      <ellipse cx="48" cy="110" rx="32" ry="5.5" fill={`url(#contactGrad-${role})`} />

      {/* Animated Creature Body Container */}
      <g style={animStyle}>
        {/* 1. COMPACT LEGS & FEET */}
        {/* Left Leg */}
        <rect x="36" y="88" width="8" height="15" rx="4" fill="#334155" />
        <ellipse cx="40" cy="103" rx="7" ry="4" fill="#1e293b" />
        {/* Right Leg */}
        <rect x="52" y="88" width="8" height="15" rx="4" fill="#334155" />
        <ellipse cx="56" cy="103" rx="7" ry="4" fill="#1e293b" />

        {/* 2. COMPACT BEAN-SHAPED TORSO */}
        <path
          d="M 28 62 C 28 50, 68 50, 68 62 C 70 78, 66 90, 48 90 C 30 90, 26 78, 28 62 Z"
          fill={`url(#roleAccentGrad-${role})`}
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth="1.2"
        />

        {/* Species Belly Plate / Warm Apron Surface */}
        <path
          d="M 34 65 C 34 57, 62 57, 62 65 C 63 77, 60 84, 48 84 C 36 84, 33 77, 34 65 Z"
          fill={roleLight}
          opacity={0.28}
        />

        {/* STATUS CORE JEWEL (Derived directly from runtime state) */}
        <circle cx="48" cy="72" r="4.2" fill={statusColor} />
        <circle cx="48" cy="72" r="2" fill="#ffffff" opacity={0.8} />
        <circle
          cx="48"
          cy="72"
          r="6.5"
          fill="none"
          stroke={statusColor}
          strokeWidth="1"
          opacity={isWorking || isCompleted || isWaitingApproval ? 0.7 : 0.2}
        />

        {/* 3. HEAD & FACE (Distinctive Gravitas Species Capsule, 45% visual height) */}
        <g id="gravitas-head">
          {/* Gravitas Crown Crest / Species Antenna */}
          {isFrontend && (
            <g id="fe-crest">
              {/* Dual energetic perky antennae with glowing lavender tips */}
              <path d="M 42 20 Q 36 8 32 10" fill="none" stroke="#818cf8" strokeWidth="2.6" strokeLinecap="round" />
              <circle cx="31" cy="10" r="3.2" fill="#c4b5fd" />
              <path d="M 54 20 Q 60 8 64 10" fill="none" stroke="#818cf8" strokeWidth="2.6" strokeLinecap="round" />
              <circle cx="65" cy="10" r="3.2" fill="#c4b5fd" />
            </g>
          )}

          {isBackend && (
            <g id="be-crest">
              {/* Sleek architectural fin antenna with glowing teal node */}
              <path d="M 48 20 L 48 9" stroke="#0d9488" strokeWidth="3" strokeLinecap="round" />
              <rect x="44.5" y="7" width="7" height="4.5" rx="2" fill="#2dd4bf" />
            </g>
          )}

          {isReviewer && (
            <g id="rev-crest">
              {/* Sage crown crest with observation node */}
              <path d="M 48 20 L 48 11" stroke="#65a30d" strokeWidth="2.8" strokeLinecap="round" />
              <circle cx="48" cy="10" r="3.6" fill="#a3e635" />
            </g>
          )}

          {/* Capsule Head Geometry */}
          <rect
            x="24"
            y="18"
            width="48"
            height="42"
            rx="21"
            fill={`url(#speciesSkin-${role})`}
            stroke="#cbd5e1"
            strokeWidth="1.2"
          />

          {/* High-Contrast Face Elements */}
          {/* A. Blush Cheeks */}
          <circle cx="30" cy="43" r="3.5" fill="rgba(244, 114, 182, 0.4)" />
          <circle cx="66" cy="43" r="3.5" fill="rgba(244, 114, 182, 0.4)" />

          {/* B. Expressive Eyes & Expression Rig */}
          {isWorking ? (
            /* WORKING: Focused lowered eyes with tiny code spark */
            <g id="eyes-working">
              <ellipse cx="37" cy="38" rx="3.2" ry="2.2" fill="#0f172a" />
              <ellipse cx="59" cy="38" rx="3.2" ry="2.2" fill="#0f172a" />
              {/* Focus Brow */}
              <line x1="33" y1="33" x2="41" y2="35" stroke="#334155" strokeWidth="1.6" strokeLinecap="round" />
              <line x1="63" y1="33" x2="55" y2="35" stroke="#334155" strokeWidth="1.6" strokeLinecap="round" />
              {/* Tiny determined mouth */}
              <line x1="45" y1="45" x2="51" y2="45" stroke="#475569" strokeWidth="1.4" strokeLinecap="round" />
            </g>
          ) : isCompleted || isWaitingApproval ? (
            /* COMPLETED / HAPPY: Joyful crescent arc eyes `^ ^` and cute smile */
            <g id="eyes-happy">
              <path d="M 33 39 Q 37 33 41 39" fill="none" stroke="#0f172a" strokeWidth="2.4" strokeLinecap="round" />
              <path d="M 55 39 Q 59 33 63 39" fill="none" stroke="#0f172a" strokeWidth="2.4" strokeLinecap="round" />
              {/* Upturned cheerful mouth */}
              <path d="M 44 43 Q 48 48 52 43" fill="none" stroke="#0f172a" strokeWidth="1.8" strokeLinecap="round" />
            </g>
          ) : isFailed ? (
            /* FAILED: Concerned squint eyes `> <` and downcast mouth */
            <g id="eyes-failed">
              <path d="M 33 35 L 41 41 M 33 41 L 41 35" stroke="#dc2626" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M 55 35 L 63 41 M 55 41 L 63 35" stroke="#dc2626" strokeWidth="2.2" strokeLinecap="round" />
              {/* Sad droop mouth */}
              <path d="M 44 47 Q 48 43 52 47" fill="none" stroke="#991b1b" strokeWidth="2" strokeLinecap="round" />
            </g>
          ) : isReviewing ? (
            /* REVIEWING: Observant analytical eyes */
            <g id="eyes-reviewing">
              <ellipse cx="37" cy="37" rx="3.6" ry="4.4" fill="#0f172a" />
              <circle cx="38" cy="35" r="1.2" fill="#ffffff" />
              <ellipse cx="59" cy="37" rx="3.6" ry="4.4" fill="#0f172a" />
              <circle cx="60" cy="35" r="1.2" fill="#ffffff" />
              {/* Focused attentive mouth */}
              <line x1="45" y1="44" x2="51" y2="44" stroke="#334155" strokeWidth="1.4" strokeLinecap="round" />
            </g>
          ) : (
            /* IDLE: Friendly open pill eyes with subtle blink animation */
            <g id="eyes-idle" style={{ animation: 'gravitasBlink 4s infinite' }}>
              <ellipse cx="37" cy="37" rx="3.5" ry="4.5" fill="#0f172a" />
              <circle cx="38.5" cy="35" r="1.3" fill="#ffffff" />
              <ellipse cx="59" cy="37" rx="3.5" ry="4.5" fill="#0f172a" />
              <circle cx="60.5" cy="35" r="1.3" fill="#ffffff" />
              {/* Calm, warm smile */}
              <path d="M 44 44 Q 48 47 52 44" fill="none" stroke="#475569" strokeWidth="1.6" strokeLinecap="round" />
            </g>
          )}

          {/* 4. ROLE-SPECIFIC ACCESSORIES */}
          {/* Frontend: Oversized Chic Lavender Headphones */}
          {isFrontend && (
            <g id="fe-headphones">
              {/* Headband */}
              <path d="M 23 37 C 23 15, 73 15, 73 37" fill="none" stroke="#f1f5f9" strokeWidth="3.4" strokeLinecap="round" />
              <path d="M 23 37 C 23 15, 73 15, 73 37" fill="none" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" />
              {/* Left Ear Cup */}
              <rect x="20" y="29" width="6" height="16" rx="3" fill="#818cf8" stroke="#f8fafc" strokeWidth="1" />
              {/* Right Ear Cup */}
              <rect x="70" y="29" width="6" height="16" rx="3" fill="#818cf8" stroke="#f8fafc" strokeWidth="1" />
            </g>
          )}

          {/* Backend: Tech Headset with Cyan Mic Node */}
          {isBackend && (
            <g id="be-headset">
              {/* Single Ear Frame */}
              <path d="M 23 35 C 23 18, 66 18, 71 31" fill="none" stroke="#94a3b8" strokeWidth="2.2" strokeLinecap="round" />
              {/* Tech Earpiece */}
              <rect x="20" y="30" width="5.5" height="14" rx="2.5" fill="#0d9488" stroke="#ccfbf1" strokeWidth="1" />
              {/* Boom Mic */}
              <path d="M 22 41 Q 23 48 34 49" fill="none" stroke="#0d9488" strokeWidth="1.8" strokeLinecap="round" />
              <circle cx="35" cy="49" r="2.2" fill="#2dd4bf" />
            </g>
          )}

          {/* Reviewer: Signature Wireframe Glasses / Magnifying Loupe */}
          {isReviewer && (
            <g id="rev-glasses">
              {/* Round Wireframe Lens Left */}
              <circle cx="37" cy="37" r="7.5" fill="rgba(255, 255, 255, 0.25)" stroke="#65a30d" strokeWidth="1.6" />
              {/* Round Wireframe Lens Right */}
              <circle cx="59" cy="37" r="7.5" fill="rgba(255, 255, 255, 0.25)" stroke="#65a30d" strokeWidth="1.6" />
              {/* Bridge */}
              <line x1="44.5" y1="37" x2="51.5" y2="37" stroke="#65a30d" strokeWidth="1.6" />
            </g>
          )}
        </g>

        {/* 5. SHORT EXPRESSIVE ARMS & HANDS */}
        {isWorking ? (
          /* WORKING: Alternating typing gestures */
          <g id="arms-working">
            <g style={{ animation: 'gravitasTypingLeft 0.28s infinite ease-in-out' }}>
              <path d="M 27 63 Q 22 75 32 82" fill="none" stroke={roleAccent} strokeWidth="5" strokeLinecap="round" />
              <circle cx="33" cy="82" r="3.2" fill="#f8fafc" />
            </g>
            <g style={{ animation: 'gravitasTypingRight 0.28s infinite ease-in-out' }}>
              <path d="M 69 63 Q 74 75 64 82" fill="none" stroke={roleAccent} strokeWidth="5" strokeLinecap="round" />
              <circle cx="63" cy="82" r="3.2" fill="#f8fafc" />
            </g>
          </g>
        ) : isCompleted ? (
          /* COMPLETED: Cheerful perk-up / presenting pose */
          <g id="arms-completed">
            <path d="M 27 63 Q 18 53 23 44" fill="none" stroke={roleAccent} strokeWidth="5" strokeLinecap="round" />
            <circle cx="23" cy="43" r="3.4" fill="#f8fafc" />
            <path d="M 69 63 Q 78 53 73 44" fill="none" stroke={roleAccent} strokeWidth="5" strokeLinecap="round" />
            <circle cx="73" cy="43" r="3.4" fill="#f8fafc" />
          </g>
        ) : isReviewer && isReviewing ? (
          /* REVIEWING: Holding magnifying loupe / checklist */
          <g id="arms-reviewing">
            {/* Left arm holding clipboard */}
            <path d="M 27 63 Q 22 75 33 78" fill="none" stroke={roleAccent} strokeWidth="5" strokeLinecap="round" />
            <circle cx="34" cy="78" r="3.2" fill="#f8fafc" />
            {/* Checklist slate */}
            <rect x="29" y="72" width="12" height="15" rx="2" fill="#334155" stroke="#a3e635" strokeWidth="1" />
            <line x1="32" y1="76" x2="38" y2="76" stroke="#a3e635" strokeWidth="1" />
            <line x1="32" y1="80" x2="38" y2="80" stroke="#a3e635" strokeWidth="1" />
            <line x1="32" y1="84" x2="36" y2="84" stroke="#a3e635" strokeWidth="1" />

            {/* Right arm holding inspection loupe */}
            <path d="M 69 63 Q 73 72 63 76" fill="none" stroke={roleAccent} strokeWidth="5" strokeLinecap="round" />
            <circle cx="62" cy="76" r="3.2" fill="#f8fafc" />
            {/* Loupe */}
            <line x1="62" y1="76" x2="66" y2="70" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
            <circle cx="69" cy="67" r="5" fill="rgba(163, 230, 53, 0.35)" stroke="#84cc16" strokeWidth="1.4" />
          </g>
        ) : isFailed ? (
          /* FAILED: Downward limp/slump arms */
          <g id="arms-failed">
            <path d="M 27 63 Q 24 77 26 86" fill="none" stroke={roleAccent} strokeWidth="5" strokeLinecap="round" />
            <circle cx="26" cy="86" r="3.2" fill="#f8fafc" />
            <path d="M 69 63 Q 72 77 70 86" fill="none" stroke={roleAccent} strokeWidth="5" strokeLinecap="round" />
            <circle cx="70" cy="86" r="3.2" fill="#f8fafc" />
          </g>
        ) : (
          /* IDLE: Peaceful resting arms */
          <g id="arms-idle">
            <path d="M 27 63 Q 24 74 34 78" fill="none" stroke={roleAccent} strokeWidth="5" strokeLinecap="round" />
            <circle cx="35" cy="78" r="3.2" fill="#f8fafc" />
            <path d="M 69 63 Q 72 74 62 78" fill="none" stroke={roleAccent} strokeWidth="5" strokeLinecap="round" />
            <circle cx="61" cy="78" r="3.2" fill="#f8fafc" />
            {/* Tiny stylus for Frontend in idle */}
            {isFrontend && (
              <line x1="35" y1="78" x2="31" y2="72" stroke="#c4b5fd" strokeWidth="2" strokeLinecap="round" />
            )}
          </g>
        )}
      </g>
    </svg>
  )
}

/**
 * Neutral Background Showcase Component for Character Family Evidence (01-character-family.png, 40px, 80px)
 */
export const CharacterFamilyShowcase: React.FC<{
  readonly height?: number
  readonly hideLabels?: boolean
  readonly background?: string
}> = ({
  height = 120,
  hideLabels = false,
  background = 'rgba(15, 23, 42, 0.96)',
}) => {
  return (
    <div
      data-testid="gravitas-character-family-showcase"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: `${Math.round(height * 0.4)}px`,
        padding: `${Math.round(height * 0.25)}px ${Math.round(height * 0.35)}px`,
        backgroundColor: background,
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4)',
      }}
    >
      <IllustratedAgent
        role="role:engineering:frontend-engineer"
        state="WORKING"
        height={height}
        hideLabel={hideLabels}
        label="Frontend"
      />
      <IllustratedAgent
        role="role:quality:independent-reviewer"
        state="REVIEWING"
        height={height}
        hideLabel={hideLabels}
        label="Reviewer"
      />
      <IllustratedAgent
        role="role:engineering:backend-engineer"
        state="IDLE"
        height={height}
        hideLabel={hideLabels}
        label="Backend"
      />
    </div>
  )
}
