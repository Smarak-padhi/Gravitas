/**
 * Stylized 2D/SVG Illustrated Agent Avatars for Floor 2 Hybrid HQ (Wave 12H)
 *
 * Implements charming, warm, management-sim illustrated inhabitants:
 * - Frontend Engineer: Lavender / muted lilac accent, stylish hair, over-ear headphones, cozy sweater
 * - Backend Engineer: Slate / teal accent, technical silhouette, tech headset, work jacket
 * - Independent Reviewer: Sage / neutral accent, glasses, calm analytical posture, inspection loupe
 *
 * Strictly role-oriented (NOT LLM/harness identity).
 * States: IDLE (ambient non-productive), WORKING (productive typing only), COMPLETED, REVIEWING, WAITING_APPROVAL, FAILED.
 */

import React from 'react'
import type { IllustratedAgentRole, IllustratedAgentState } from './types.js'

export interface IllustratedAgentProps {
  readonly role: IllustratedAgentRole
  readonly state: IllustratedAgentState
  readonly isSelected?: boolean
  readonly onClick?: () => void
  readonly label?: string
}

export const IllustratedAgent: React.FC<IllustratedAgentProps> = ({
  role,
  state,
  isSelected = false,
  onClick,
  label,
}) => {
  const isWorking = state === 'WORKING'
  const isReviewing = state === 'REVIEWING'
  const isWaitingApproval = state === 'WAITING_APPROVAL'
  const isFailed = state === 'FAILED'

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
            bottom: '12px',
            width: '84px',
            height: '24px',
            borderRadius: '50%',
            background: 'radial-gradient(ellipse at center, rgba(129, 140, 248, 0.45) 0%, rgba(129, 140, 248, 0) 70%)',
            pointerEvents: 'none',
            animation: 'hybridPulse 2s infinite ease-in-out',
          }}
        />
      )}

      {/* SVG Character Silhouette */}
      <div
        style={{
          width: '92px',
          height: '110px',
          filter: isSelected
            ? 'drop-shadow(0 6px 16px rgba(129, 140, 248, 0.5))'
            : 'drop-shadow(0 4px 10px rgba(0, 0, 0, 0.35))',
          position: 'relative',
        }}
      >
        {role === 'role:engineering:frontend-engineer' && (
          <FrontendEngineerSvg state={state} />
        )}
        {role === 'role:engineering:backend-engineer' && (
          <BackendEngineerSvg state={state} />
        )}
        {role === 'role:quality:independent-reviewer' && (
          <IndependentReviewerSvg state={state} />
        )}
      </div>

      {/* Role Pill Label */}
      <div
        style={{
          marginTop: '4px',
          padding: '2px 8px',
          borderRadius: '12px',
          backgroundColor: isSelected
            ? 'rgba(79, 70, 229, 0.92)'
            : 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(8px)',
          border: isSelected
            ? '1px solid #818cf8'
            : '1px solid rgba(255, 255, 255, 0.12)',
          color: '#f8fafc',
          fontSize: '11px',
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
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: isWorking
              ? '#38bdf8'
              : isReviewing
              ? '#a3e635'
              : isWaitingApproval
              ? '#22c55e'
              : isFailed
              ? '#ef4444'
              : '#94a3b8',
            boxShadow: isWorking || isReviewing || isWaitingApproval
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

      {/* CSS Keyframes */}
      <style>{`
        @keyframes hybridBreathe {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-2.5px); }
        }
        @keyframes hybridType {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          25% { transform: translateY(-1.5px) rotate(-1deg); }
          75% { transform: translateY(-1.5px) rotate(1deg); }
        }
        @keyframes hybridPulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        @keyframes hybridSteam {
          0% { opacity: 0; transform: translateY(0px) scale(0.8); }
          50% { opacity: 0.7; transform: translateY(-4px) scale(1); }
          100% { opacity: 0; transform: translateY(-8px) scale(1.2); }
        }
      `}</style>
    </div>
  )
}

/**
 * FRONTEND ENGINEER SVG
 * Lavender palette, stylish bangs + bun/ponytail, lilac sweater, sleek over-ear headphones, matcha cup.
 */
const FrontendEngineerSvg: React.FC<{ state: IllustratedAgentState }> = ({ state }) => {
  const isWorking = state === 'WORKING'
  const animStyle = isWorking
    ? { animation: 'hybridType 0.28s infinite ease-in-out' }
    : { animation: 'hybridBreathe 3.2s infinite ease-in-out' }

  return (
    <svg
      viewBox="0 0 92 110"
      width="92"
      height="110"
      style={{ overflow: 'visible', ...animStyle }}
    >
      <defs>
        <linearGradient id="feSweaterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id="feHairGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
        <linearGradient id="feDeskGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
      </defs>

      {/* Desk surface */}
      <rect x="10" y="86" width="72" height="12" rx="4" fill="url(#feDeskGrad)" stroke="#475569" strokeWidth="1" />

      {/* Matcha latte cup on desk */}
      <rect x="66" y="80" width="8" height="9" rx="2" fill="#c7d2fe" />
      <path d="M 74 82 Q 77 84 74 86" fill="none" stroke="#a5b4fc" strokeWidth="1" />
      {/* Cup steam in idle */}
      {state === 'IDLE' && (
        <circle cx="70" cy="76" r="1.5" fill="#e0e7ff" style={{ animation: 'hybridSteam 2s infinite ease-out' }} />
      )}

      {/* Keyboard & Screen Glow if Working */}
      {isWorking ? (
        <g>
          <rect x="26" y="87" width="28" height="5" rx="1.5" fill="#0f172a" stroke="#818cf8" strokeWidth="1" />
          {/* Subtle code spark glow */}
          <ellipse cx="40" cy="85" rx="12" ry="3" fill="rgba(129, 140, 248, 0.4)" />
        </g>
      ) : (
        <rect x="26" y="87" width="28" height="4" rx="1.5" fill="#1e293b" stroke="#334155" strokeWidth="0.8" />
      )}

      {/* Hair back / ponytail bun */}
      <circle cx="46" cy="30" r="19" fill="url(#feHairGrad)" />
      <path d="M 58 26 C 68 22, 66 38, 56 36 Z" fill="url(#feHairGrad)" />

      {/* Torso / Lavender Sweater */}
      <path
        d="M 30 62 C 30 52, 62 52, 62 62 L 64 86 C 64 88, 28 88, 28 86 Z"
        fill="url(#feSweaterGrad)"
      />
      {/* Sweater knit collar */}
      <path d="M 40 54 Q 46 59 52 54" fill="none" stroke="#c4b5fd" strokeWidth="2.5" strokeLinecap="round" />

      {/* Arms & Hands */}
      {isWorking ? (
        <g>
          {/* Hands typing on keyboard */}
          <path d="M 32 64 Q 28 76 34 86" fill="none" stroke="#a78bfa" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M 60 64 Q 64 76 58 86" fill="none" stroke="#a78bfa" strokeWidth="4.5" strokeLinecap="round" />
          <circle cx="34" cy="86" r="2.5" fill="#fcd34d" />
          <circle cx="58" cy="86" r="2.5" fill="#fcd34d" />
        </g>
      ) : (
        <g>
          {/* Relaxed hands holding mug or resting */}
          <path d="M 32 64 Q 29 74 36 82" fill="none" stroke="#a78bfa" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M 60 64 Q 63 74 56 82" fill="none" stroke="#a78bfa" strokeWidth="4.5" strokeLinecap="round" />
          <circle cx="36" cy="82" r="2.5" fill="#fcd34d" />
          <circle cx="56" cy="82" r="2.5" fill="#fcd34d" />
        </g>
      )}

      {/* Neck */}
      <rect x="43" y="48" width="6" height="8" rx="2" fill="#fcd34d" />

      {/* Head / Face */}
      <circle cx="46" cy="40" r="13" fill="#fde68a" />

      {/* Eyes & Expression */}
      {state === 'FAILED' ? (
        <g>
          <path d="M 41 40 L 44 42" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M 48 42 L 51 40" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M 43 46 Q 46 44 49 46" fill="none" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />
        </g>
      ) : isWorking ? (
        <g>
          {/* Focused eyes looking down at work */}
          <ellipse cx="42" cy="41" rx="1.5" ry="1.2" fill="#1e293b" />
          <ellipse cx="50" cy="41" rx="1.5" ry="1.2" fill="#1e293b" />
          {/* Cute focus mouth */}
          <line x1="44" y1="46" x2="48" y2="46" stroke="#475569" strokeWidth="1.2" strokeLinecap="round" />
        </g>
      ) : (
        <g>
          {/* Friendly calm eyes */}
          <ellipse cx="42" cy="39" rx="1.4" ry="1.8" fill="#1e293b" />
          <ellipse cx="50" cy="39" rx="1.4" ry="1.8" fill="#1e293b" />
          {/* Warm smile */}
          <path d="M 43 44 Q 46 47 49 44" fill="none" stroke="#b45309" strokeWidth="1.4" strokeLinecap="round" />
          {/* Cute blush cheeks */}
          <circle cx="39" cy="43" r="1.8" fill="rgba(244, 114, 182, 0.4)" />
          <circle cx="53" cy="43" r="1.8" fill="rgba(244, 114, 182, 0.4)" />
        </g>
      )}

      {/* Hair front bangs */}
      <path d="M 34 35 Q 46 26 58 35 Q 52 30 46 32 Q 40 30 34 35 Z" fill="url(#feHairGrad)" />

      {/* Over-ear Headphones (Lavender / Lilac with white band) */}
      <path d="M 33 40 C 33 22, 59 22, 59 40" fill="none" stroke="#ede9fe" strokeWidth="3" strokeLinecap="round" />
      {/* Left ear cup */}
      <rect x="30" y="34" width="5" height="12" rx="2.5" fill="#818cf8" stroke="#ede9fe" strokeWidth="1" />
      {/* Right ear cup */}
      <rect x="57" y="34" width="5" height="12" rx="2.5" fill="#818cf8" stroke="#ede9fe" strokeWidth="1" />
    </svg>
  )
}

/**
 * BACKEND ENGINEER SVG
 * Slate / teal palette, technical silhouette, tech headset, teal work jacket, sleek thermos.
 */
const BackendEngineerSvg: React.FC<{ state: IllustratedAgentState }> = ({ state }) => {
  const isWorking = state === 'WORKING'
  const animStyle = isWorking
    ? { animation: 'hybridType 0.22s infinite ease-in-out' }
    : { animation: 'hybridBreathe 3.6s infinite ease-in-out' }

  return (
    <svg
      viewBox="0 0 92 110"
      width="92"
      height="110"
      style={{ overflow: 'visible', ...animStyle }}
    >
      <defs>
        <linearGradient id="beJacketGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0d9488" />
          <stop offset="100%" stopColor="#115e59" />
        </linearGradient>
        <linearGradient id="beHairGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
      </defs>

      {/* Desk surface */}
      <rect x="10" y="86" width="72" height="12" rx="4" fill="#1e293b" stroke="#334155" strokeWidth="1" />

      {/* Sleek stainless steel thermos */}
      <rect x="14" y="78" width="7" height="11" rx="1.5" fill="#94a3b8" stroke="#cbd5e1" strokeWidth="0.8" />
      <rect x="15" y="76" width="5" height="2" rx="1" fill="#475569" />

      {/* Keyboard / Dual Screens */}
      {isWorking ? (
        <g>
          <rect x="30" y="87" width="28" height="5" rx="1.5" fill="#042f2e" stroke="#2dd4bf" strokeWidth="1" />
          <ellipse cx="44" cy="85" rx="12" ry="3" fill="rgba(45, 212, 191, 0.4)" />
        </g>
      ) : (
        <rect x="30" y="87" width="28" height="4" rx="1.5" fill="#0f172a" stroke="#334155" strokeWidth="0.8" />
      )}

      {/* Hair back */}
      <circle cx="46" cy="31" r="18" fill="url(#beHairGrad)" />

      {/* Torso / Teal Work Jacket */}
      <path
        d="M 28 62 C 28 52, 64 52, 64 62 L 66 86 C 66 88, 26 88, 26 86 Z"
        fill="url(#beJacketGrad)"
      />
      {/* Inner dark crewneck */}
      <path d="M 41 54 L 51 54 L 46 64 Z" fill="#0f172a" />

      {/* Arms & Hands */}
      {isWorking ? (
        <g>
          <path d="M 30 64 Q 26 76 36 86" fill="none" stroke="#0d9488" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M 62 64 Q 66 76 56 86" fill="none" stroke="#0d9488" strokeWidth="4.5" strokeLinecap="round" />
          <circle cx="36" cy="86" r="2.5" fill="#fed7aa" />
          <circle cx="56" cy="86" r="2.5" fill="#fed7aa" />
        </g>
      ) : (
        <g>
          <path d="M 30 64 Q 28 74 38 82" fill="none" stroke="#0d9488" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M 62 64 Q 64 74 54 82" fill="none" stroke="#0d9488" strokeWidth="4.5" strokeLinecap="round" />
          <circle cx="38" cy="82" r="2.5" fill="#fed7aa" />
          <circle cx="54" cy="82" r="2.5" fill="#fed7aa" />
        </g>
      )}

      {/* Neck */}
      <rect x="43" y="48" width="6" height="8" rx="2" fill="#fed7aa" />

      {/* Head / Face */}
      <circle cx="46" cy="40" r="13" fill="#fed7aa" />

      {/* Hair textured front */}
      <path d="M 33 34 Q 42 24 59 31 Q 50 28 42 30 Z" fill="url(#beHairGrad)" />

      {/* Eyes */}
      <ellipse cx="42" cy="39" rx="1.4" ry="1.6" fill="#0f172a" />
      <ellipse cx="50" cy="39" rx="1.4" ry="1.6" fill="#0f172a" />
      {/* Calm straight/half-smile mouth */}
      <path d="M 44 45 Q 46 46 48 45" fill="none" stroke="#78350f" strokeWidth="1.3" strokeLinecap="round" />

      {/* Single-ear Technical Headset with Glowing Mic */}
      <path d="M 34 38 C 34 24, 54 24, 58 36" fill="none" stroke="#cbd5e1" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="32" y="34" width="4" height="10" rx="2" fill="#0f766e" stroke="#2dd4bf" strokeWidth="0.8" />
      {/* Boom mic extending to mouth */}
      <path d="M 33 42 Q 33 48 40 48" fill="none" stroke="#0d9488" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="40" cy="48" r="1.2" fill="#2dd4bf" />
    </svg>
  )
}

/**
 * INDEPENDENT REVIEWER SVG
 * Sage / neutral palette, analytical posture, thin wireframe glasses, cleanroom coat, inspection loupe.
 */
const IndependentReviewerSvg: React.FC<{ state: IllustratedAgentState }> = ({ state }) => {
  const isReviewing = state === 'REVIEWING'
  const isWaitingApproval = state === 'WAITING_APPROVAL'
  const animStyle = isReviewing
    ? { animation: 'hybridType 0.4s infinite ease-in-out' }
    : { animation: 'hybridBreathe 3.4s infinite ease-in-out' }

  return (
    <svg
      viewBox="0 0 92 110"
      width="92"
      height="110"
      style={{ overflow: 'visible', ...animStyle }}
    >
      <defs>
        <linearGradient id="revCoatGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4d7c0f" />
          <stop offset="100%" stopColor="#365314" />
        </linearGradient>
        <linearGradient id="revHairGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#64748b" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>
      </defs>

      {/* Inspection Bench Surface */}
      <rect x="10" y="86" width="72" height="12" rx="4" fill="#1e293b" stroke="#334155" strokeWidth="1" />

      {/* Verification Loupe / Slate on bench */}
      {isReviewing ? (
        <g>
          {/* Review Diff Glow */}
          <rect x="28" y="85" width="36" height="7" rx="2" fill="#14532d" stroke="#a3e635" strokeWidth="1" />
          <ellipse cx="46" cy="83" rx="14" ry="4" fill="rgba(163, 230, 53, 0.45)" />
        </g>
      ) : isWaitingApproval ? (
        <g>
          {/* Green verified stamp on desk */}
          <rect x="34" y="85" width="24" height="6" rx="2" fill="#15803d" stroke="#4ade80" strokeWidth="1" />
          <circle cx="46" cy="88" r="2.5" fill="#22c55e" />
        </g>
      ) : (
        <rect x="32" y="87" width="28" height="4" rx="1.5" fill="#1e293b" stroke="#475569" strokeWidth="0.8" />
      )}

      {/* Hair back */}
      <circle cx="46" cy="30" r="18" fill="url(#revHairGrad)" />

      {/* Torso / Sage Cleanroom Coat */}
      <path
        d="M 28 60 C 28 50, 64 50, 64 60 L 66 86 C 66 88, 26 88, 26 86 Z"
        fill="url(#revCoatGrad)"
      />
      {/* Coat lapels */}
      <path d="M 38 52 L 46 68 L 54 52" fill="none" stroke="#a3e635" strokeWidth="1.2" />

      {/* Arms & Hands */}
      {isReviewing ? (
        <g>
          {/* Holding loupe / checking list */}
          <path d="M 30 64 Q 32 76 40 84" fill="none" stroke="#4d7c0f" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M 62 64 Q 60 76 52 84" fill="none" stroke="#4d7c0f" strokeWidth="4.5" strokeLinecap="round" />
          <circle cx="40" cy="84" r="2.5" fill="#fde047" />
          <circle cx="52" cy="84" r="2.5" fill="#fde047" />
          {/* Inspection loupe handle */}
          <line x1="52" y1="84" x2="57" y2="78" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
          <circle cx="59" cy="76" r="4" fill="rgba(163, 230, 53, 0.4)" stroke="#a3e635" strokeWidth="1.5" />
        </g>
      ) : (
        <g>
          <path d="M 30 64 Q 28 74 38 82" fill="none" stroke="#4d7c0f" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M 62 64 Q 64 74 54 82" fill="none" stroke="#4d7c0f" strokeWidth="4.5" strokeLinecap="round" />
          <circle cx="38" cy="82" r="2.5" fill="#fde047" />
          <circle cx="54" cy="82" r="2.5" fill="#fde047" />
        </g>
      )}

      {/* Neck */}
      <rect x="43" y="48" width="6" height="8" rx="2" fill="#fde047" />

      {/* Head / Face */}
      <circle cx="46" cy="40" r="13" fill="#fde047" />

      {/* Hair front */}
      <path d="M 34 32 Q 46 25 58 32 Q 52 28 46 29 Z" fill="url(#revHairGrad)" />

      {/* Wireframe Glasses (Signature Reviewer Accessory) */}
      <circle cx="41" cy="40" r="4.2" fill="rgba(255, 255, 255, 0.2)" stroke="#94a3b8" strokeWidth="1.2" />
      <circle cx="51" cy="40" r="4.2" fill="rgba(255, 255, 255, 0.2)" stroke="#94a3b8" strokeWidth="1.2" />
      <line x1="45.2" y1="40" x2="46.8" y2="40" stroke="#94a3b8" strokeWidth="1.2" />

      {/* Eyes behind glasses */}
      <circle cx="41" cy="40" r="1.3" fill="#0f172a" />
      <circle cx="51" cy="40" r="1.3" fill="#0f172a" />

      {/* Expression */}
      {isWaitingApproval ? (
        <g>
          {/* Confident satisfied smile */}
          <path d="M 43 45 Q 46 48 49 45" fill="none" stroke="#15803d" strokeWidth="1.5" strokeLinecap="round" />
        </g>
      ) : state === 'FAILED' ? (
        <g>
          {/* Stern / concerned mouth */}
          <path d="M 43 47 Q 46 45 49 47" fill="none" stroke="#991b1b" strokeWidth="1.5" strokeLinecap="round" />
        </g>
      ) : (
        <g>
          <path d="M 43 46 L 49 46" stroke="#475569" strokeWidth="1.2" strokeLinecap="round" />
        </g>
      )}
    </svg>
  )
}
