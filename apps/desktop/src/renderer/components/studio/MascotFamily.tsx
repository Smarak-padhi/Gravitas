import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, CheckCircle, AlertCircle, Clock, Volume2 } from 'lucide-react'

export type MascotId = 'grav' | 'ada' | 'pixel' | 'cipher' | 'scout'

export type MascotState =
  | 'idle'
  | 'attentive'
  | 'working'
  | 'waiting_permission'
  | 'success'
  | 'error'
  | 'speaking'

export interface MascotBubbleData {
  text: string
  kind?: 'info' | 'success' | 'warning' | 'error'
  category?: 'work' | 'decorative' | 'system'
  timestamp?: number
}

export const MASCOT_REGISTRY: Record<MascotId, { name: string; role: string; color: string }> = {
  grav: { name: 'Grav', role: 'Companion & Coordinator', color: '#F4A261' },
  ada: { name: 'Ada', role: 'Study & Coursework Specialist', color: '#81B29A' },
  pixel: { name: 'Pixel', role: 'Visual & UI Design Specialist', color: '#FF7B72' },
  cipher: { name: 'Cipher', role: 'Backend, Systems & DB Specialist', color: '#4A89C8' },
  scout: { name: 'Scout', role: 'Research & Source Specialist', color: '#E9C46A' },
}

interface MascotProps {
  state: MascotState
  bubble: MascotBubbleData | null
  isSelected: boolean
  isReducedMotion: boolean
  onClick: () => void
}

/**
 * Shared Speech / Activity Bubble Component
 * Displays genuine runtime events above mascot heads with subtle pointer tail.
 */
export const ActivityBubble: React.FC<{
  bubble: MascotBubbleData | null
  agentName: string
  color: string
}> = ({ bubble, agentName, color }) => {
  if (!bubble) return null

  const getIcon = () => {
    switch (bubble.kind) {
      case 'success':
        return <CheckCircle size={12} color="#81B29A" />
      case 'warning':
        return <Clock size={12} color="#F4A261" />
      case 'error':
        return <AlertCircle size={12} color="#E76F51" />
      default:
        return <Sparkles size={12} color={color} />
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -6, scale: 0.92 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: '10px',
          zIndex: 40,
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        <div
          style={{
            background: 'rgba(24, 27, 30, 0.96)',
            backdropFilter: 'blur(8px)',
            border: `1px solid ${color}66`,
            boxShadow: `0 8px 24px rgba(0, 0, 0, 0.45), 0 0 12px ${color}22`,
            borderRadius: '10px',
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            color: '#EDEAE3',
            fontSize: '11.5px',
            fontWeight: 500,
            letterSpacing: '0.01em',
          }}
        >
          {getIcon()}
          <span>{bubble.text}</span>
        </div>
        {/* Pointer downward tail */}
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderTop: `6px solid ${color}66`,
            margin: '0 auto',
          }}
        />
      </motion.div>
    </AnimatePresence>
  )
}

/**
 * 1. GRAV — Studio Lead & Personal Companion
 * Silhouette: Floating capsule droid with copper chassis, magnetic floating ears, expressive OLED visor.
 */
export const GravMascot: React.FC<MascotProps> = ({
  state,
  bubble,
  isSelected,
  isReducedMotion,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      aria-label="Grav: Studio Lead and Companion"
      style={{
        position: 'relative',
        width: '90px',
        height: '110px',
        cursor: 'pointer',
        outline: 'none',
        userSelect: 'none',
      }}
    >
      <ActivityBubble bubble={bubble} agentName="Grav" color="#F4A261" />

      {/* Mascot Hover/Selection Glow Indicator */}
      {isSelected && (
        <div
          style={{
            position: 'absolute',
            inset: '-10px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(244,162,97,0.2) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* SVG Character */}
      <motion.div
        animate={
          isReducedMotion
            ? {}
            : state === 'working'
            ? { y: [0, -3, 0], rotate: [0, 1, -1, 0] }
            : state === 'attentive'
            ? { y: -6, scale: 1.04 }
            : { y: [0, -4, 0] }
        }
        transition={
          isReducedMotion
            ? {}
            : {
                repeat: Infinity,
                duration: state === 'working' ? 1.4 : 3.5,
                ease: 'easeInOut',
              }
        }
        style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center' }}
      >
        <svg width="86" height="106" viewBox="0 0 86 106" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Subtle Drop Shadow */}
          <ellipse cx="43" cy="98" rx="24" ry="5" fill="#000000" fillOpacity="0.35" />

          {/* Floating Repulsor Ring */}
          <ellipse
            cx="43"
            cy="84"
            rx="18"
            ry="4.5"
            stroke="#F4A261"
            strokeWidth="2"
            strokeDasharray="4 2"
            strokeOpacity="0.8"
          />

          {/* Left Magnetic Antenna Pod */}
          <g className="grav-ear-left">
            <rect x="6" y="32" width="7" height="16" rx="3.5" fill="#252A30" stroke="#F4A261" strokeWidth="1.5" />
            <circle cx="9.5" cy="40" r="2" fill="#F4A261" />
          </g>

          {/* Right Magnetic Antenna Pod */}
          <g className="grav-ear-right">
            <rect x="73" y="32" width="7" height="16" rx="3.5" fill="#252A30" stroke="#F4A261" strokeWidth="1.5" />
            <circle cx="76.5" cy="40" r="2" fill="#F4A261" />
          </g>

          {/* Main Capsule Body */}
          <rect
            x="17"
            y="14"
            width="52"
            height="68"
            rx="26"
            fill="url(#gravBodyGradient)"
            stroke={isSelected ? '#F4A261' : '#373D45'}
            strokeWidth="2"
          />

          {/* Copper Chest Inset Plate */}
          <path
            d="M26 50 Q43 54 60 50 L58 66 Q43 72 28 66 Z"
            fill="#D97736"
            fillOpacity="0.85"
            stroke="#E08E58"
            strokeWidth="1"
          />

          {/* Core Power Crystal / Heartbeat */}
          <circle cx="43" cy="60" r="3.5" fill="#81B29A">
            <animate attributeName="opacity" values="0.7;1;0.7" dur="2s" repeatCount="indefinite" />
          </circle>

          {/* Curved Black Visor Screen */}
          <rect x="23" y="24" width="40" height="23" rx="10" fill="#101214" stroke="#252A30" strokeWidth="1.5" />

          {/* Visor Eye Displays (Dynamic Expressions) */}
          {state === 'success' ? (
            <g>
              <path d="M29 34 Q34 29 39 34" stroke="#81B29A" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M47 34 Q52 29 57 34" stroke="#81B29A" strokeWidth="2.5" strokeLinecap="round" />
            </g>
          ) : state === 'error' ? (
            <g>
              <path d="M30 36 L38 32" stroke="#E76F51" strokeWidth="2" strokeLinecap="round" />
              <path d="M48 32 L56 36" stroke="#E76F51" strokeWidth="2" strokeLinecap="round" />
            </g>
          ) : state === 'waiting_permission' ? (
            <g>
              <circle cx="34" cy="34" r="3" fill="#F4A261" />
              <circle cx="52" cy="34" r="3" fill="#F4A261" />
              {/* Amber Permission Shield Glyph on Visor */}
              <path d="M40 30 L43 28 L46 30 V35 C46 38 43 40 43 40 C43 40 40 38 40 35 Z" fill="#F4A261" opacity="0.9" />
            </g>
          ) : state === 'speaking' ? (
            <g>
              <circle cx="34" cy="33" r="3.5" fill="#F4A261" />
              <circle cx="52" cy="33" r="3.5" fill="#F4A261" />
              <path d="M38 41 Q43 45 48 41" stroke="#F4A261" strokeWidth="2" strokeLinecap="round" fill="none" />
            </g>
          ) : state === 'attentive' ? (
            <g>
              <circle cx="34" cy="33" r="4.2" fill="#F4A261" />
              <circle cx="52" cy="33" r="4.2" fill="#F4A261" />
              <circle cx="35.5" cy="31.5" r="1.5" fill="#FFF" />
              <circle cx="53.5" cy="31.5" r="1.5" fill="#FFF" />
            </g>
          ) : (
            <g>
              {/* Natural Resting Eyes with Subtle Blink */}
              <circle cx="34" cy="34" r="3.5" fill="#F4A261">
                {!isReducedMotion && (
                  <animate
                    attributeName="ry"
                    values="3.5;3.5;0.5;3.5;3.5"
                    keyTimes="0;0.92;0.95;0.98;1"
                    dur="4s"
                    repeatCount="indefinite"
                  />
                )}
              </circle>
              <circle cx="52" cy="34" r="3.5" fill="#F4A261">
                {!isReducedMotion && (
                  <animate
                    attributeName="ry"
                    values="3.5;3.5;0.5;3.5;3.5"
                    keyTimes="0;0.92;0.95;0.98;1"
                    dur="4s"
                    repeatCount="indefinite"
                  />
                )}
              </circle>
            </g>
          )}

          {/* Head Antenna Stem & Bulb */}
          <path d="M43 14 V7" stroke="#F4A261" strokeWidth="2" strokeLinecap="round" />
          <circle cx="43" cy="5" r="3" fill="#F4A261" />

          {/* Gradients */}
          <defs>
            <linearGradient id="gravBodyGradient" x1="17" y1="14" x2="69" y2="82" gradientUnits="userSpaceOnUse">
              <stop stopColor="#252A30" />
              <stop offset="0.6" stopColor="#1C2025" />
              <stop offset="1" stopColor="#14171A" />
            </linearGradient>
          </defs>
        </svg>
      </motion.div>

      {/* Name Pill Tag */}
      <div
        style={{
          textAlign: 'center',
          marginTop: '2px',
          fontSize: '11px',
          fontWeight: 600,
          color: isSelected ? '#F4A261' : '#9DA3A8',
          letterSpacing: '0.04em',
        }}
      >
        GRAV
      </div>
    </div>
  )
}

/**
 * 2. ADA — Study Guardian & Knowledge Curator
 * Silhouette: Elegant scholar droid with sage green finish, circular spectacles, open digital notebook.
 */
export const AdaMascot: React.FC<MascotProps> = ({
  state,
  bubble,
  isSelected,
  isReducedMotion,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      aria-label="Ada: Study Guardian and Coursework Curator"
      style={{
        position: 'relative',
        width: '84px',
        height: '110px',
        cursor: 'pointer',
        outline: 'none',
        userSelect: 'none',
      }}
    >
      <ActivityBubble bubble={bubble} agentName="Ada" color="#81B29A" />

      {isSelected && (
        <div
          style={{
            position: 'absolute',
            inset: '-10px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(129,178,154,0.2) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
      )}

      <motion.div
        animate={
          isReducedMotion
            ? {}
            : state === 'working'
            ? { rotate: [0, -2, 2, 0] }
            : { y: [0, -3, 0] }
        }
        transition={
          isReducedMotion
            ? {}
            : {
                repeat: Infinity,
                duration: 4,
                ease: 'easeInOut',
              }
        }
        style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center' }}
      >
        <svg width="80" height="106" viewBox="0 0 80 106" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Shadow */}
          <ellipse cx="40" cy="98" rx="20" ry="4.5" fill="#000000" fillOpacity="0.3" />

          {/* Twin Scholar Antenna Ribbons */}
          <path d="M30 18 Q20 8 16 12 Q14 18 26 22" fill="#6B9080" />
          <path d="M50 18 Q60 8 64 12 Q66 18 54 22" fill="#6B9080" />

          {/* Slender Bell/Hourglass Body */}
          <path
            d="M26 30 C26 20 54 20 54 30 C54 44 60 52 64 74 C64 82 56 84 40 84 C24 84 16 82 16 74 C20 52 26 44 26 30 Z"
            fill="url(#adaBodyGradient)"
            stroke={isSelected ? '#81B29A' : '#373D45'}
            strokeWidth="1.8"
          />

          {/* Gentle Visor with Rounded Spectacles */}
          <rect x="23" y="30" width="34" height="20" rx="9" fill="#121614" stroke="#2D3B34" strokeWidth="1.5" />

          {/* Thin Wireframe Glasses */}
          <circle cx="31" cy="40" r="7" stroke="#81B29A" strokeWidth="1.2" fill="none" />
          <circle cx="49" cy="40" r="7" stroke="#81B29A" strokeWidth="1.2" fill="none" />
          <line x1="38" y1="40" x2="42" y2="40" stroke="#81B29A" strokeWidth="1.2" />

          {/* Sage Glowing Eyes (Dynamic Expressions) */}
          {state === 'success' ? (
            <g>
              <path d="M28 40 Q31 36 34 40" stroke="#81B29A" strokeWidth="2" strokeLinecap="round" />
              <path d="M46 40 Q49 36 52 40" stroke="#81B29A" strokeWidth="2" strokeLinecap="round" />
            </g>
          ) : state === 'error' ? (
            <g>
              <line x1="28" y1="42" x2="34" y2="38" stroke="#E76F51" strokeWidth="2" strokeLinecap="round" />
              <line x1="46" y1="38" x2="52" y2="42" stroke="#E76F51" strokeWidth="2" strokeLinecap="round" />
            </g>
          ) : state === 'waiting_permission' ? (
            <g>
              <circle cx="31" cy="40" r="2.5" fill="#F4A261" />
              <circle cx="49" cy="40" r="2.5" fill="#F4A261" />
              {/* Permission Badge */}
              <circle cx="40" cy="33" r="3" fill="#F4A261" opacity="0.9" />
            </g>
          ) : state === 'speaking' ? (
            <g>
              <circle cx="31" cy="40" r="2.8" fill="#81B29A" />
              <circle cx="49" cy="40" r="2.8" fill="#81B29A" />
              <line x1="37" y1="45" x2="43" y2="45" stroke="#81B29A" strokeWidth="1.5" strokeLinecap="round" />
            </g>
          ) : state === 'attentive' ? (
            <g>
              <circle cx="31" cy="40" r="3.2" fill="#81B29A" />
              <circle cx="49" cy="40" r="3.2" fill="#81B29A" />
              <circle cx="32" cy="38.5" r="1.2" fill="#FFF" />
              <circle cx="50" cy="38.5" r="1.2" fill="#FFF" />
            </g>
          ) : (
            <g>
              <circle cx="31" cy="40" r="2.8" fill="#81B29A">
                {!isReducedMotion && (
                  <animate
                    attributeName="ry"
                    values="2.8;2.8;0.4;2.8;2.8"
                    keyTimes="0;0.9;0.94;0.97;1"
                    dur="4.5s"
                    repeatCount="indefinite"
                  />
                )}
              </circle>
              <circle cx="49" cy="40" r="2.8" fill="#81B29A">
                {!isReducedMotion && (
                  <animate
                    attributeName="ry"
                    values="2.8;2.8;0.4;2.8;2.8"
                    keyTimes="0;0.9;0.94;0.97;1"
                    dur="4.5s"
                    repeatCount="indefinite"
                  />
                )}
              </circle>
            </g>
          )}

          {/* Leather-bound Study Notebook (held in hands) */}
          <g transform="translate(24, 62)">
            <rect
              x="0"
              y="0"
              width="32"
              height="20"
              rx="3"
              fill={state === 'waiting_permission' ? '#382B1E' : '#2C3E35'}
              stroke={state === 'waiting_permission' ? '#F4A261' : '#81B29A'}
              strokeWidth="1.2"
            />
            <line x1="16" y1="0" x2="16" y2="20" stroke="#81B29A" strokeWidth="1" strokeDasharray="2 1" />
            {/* Book Bookmark Ribbon */}
            <path d="M14 20 L16 16 L18 20 Z" fill={state === 'success' ? '#81B29A' : '#D97736'} />
          </g>

          <defs>
            <linearGradient id="adaBodyGradient" x1="20" y1="18" x2="60" y2="84" gradientUnits="userSpaceOnUse">
              <stop stopColor="#25332C" />
              <stop offset="0.6" stopColor="#1B2520" />
              <stop offset="1" stopColor="#141B18" />
            </linearGradient>
          </defs>
        </svg>
      </motion.div>

      <div
        style={{
          textAlign: 'center',
          marginTop: '2px',
          fontSize: '11px',
          fontWeight: 600,
          color: isSelected ? '#81B29A' : '#9DA3A8',
          letterSpacing: '0.04em',
        }}
      >
        ADA
      </div>
    </div>
  )
}

/**
 * 3. PIXEL — Frontend & Visual Specialist
 * Silhouette: Energetic geometric hexagonal bot with coral/lilac finish, stylus pen, dynamic palette.
 */
export const PixelMascot: React.FC<MascotProps> = ({
  state,
  bubble,
  isSelected,
  isReducedMotion,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      aria-label="Pixel: Frontend Design and UI Specialist"
      style={{
        position: 'relative',
        width: '84px',
        height: '110px',
        cursor: 'pointer',
        outline: 'none',
        userSelect: 'none',
      }}
    >
      <ActivityBubble bubble={bubble} agentName="Pixel" color="#FF7B72" />

      {isSelected && (
        <div
          style={{
            position: 'absolute',
            inset: '-10px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,123,114,0.2) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
      )}

      <motion.div
        animate={
          isReducedMotion
            ? {}
            : state === 'working'
            ? { y: [0, -5, 0], rotate: [0, 2, -2, 0] }
            : { y: [0, -3.5, 0] }
        }
        transition={
          isReducedMotion
            ? {}
            : {
                repeat: Infinity,
                duration: 3.2,
                ease: 'easeInOut',
              }
        }
        style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center' }}
      >
        <svg width="82" height="106" viewBox="0 0 82 106" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Shadow */}
          <ellipse cx="41" cy="98" rx="21" ry="4.5" fill="#000000" fillOpacity="0.3" />

          {/* Floating UI Bracket Accents (Design Crop Markings) */}
          <path d="M12 28 H18 V34" stroke="#A371F7" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M70 28 H64 V34" stroke="#A371F7" strokeWidth="1.5" strokeLinecap="round" />

          {/* Prismatic Hexagonal Torso */}
          <polygon
            points="41,16 68,32 68,68 41,84 14,68 14,32"
            fill="url(#pixelBodyGradient)"
            stroke={isSelected ? '#FF7B72' : '#373D45'}
            strokeWidth="1.8"
          />

          {/* Angular Wide Screen Visor */}
          <polygon
            points="41,26 62,38 62,54 41,62 20,54 20,38"
            fill="#121015"
            stroke="#2A2033"
            strokeWidth="1.5"
          />

          {/* Sharp Vibrant Coral Eyes (Dynamic Expressions) */}
          {state === 'success' ? (
            <g>
              <path d="M28 46 L32 50 L38 44" stroke="#FF7B72" strokeWidth="2" strokeLinecap="round" fill="none" />
              <path d="M46 46 L50 50 L56 44" stroke="#FF7B72" strokeWidth="2" strokeLinecap="round" fill="none" />
            </g>
          ) : state === 'error' ? (
            <g>
              <line x1="28" y1="42" x2="36" y2="50" stroke="#E76F51" strokeWidth="2" strokeLinecap="round" />
              <line x1="36" y1="42" x2="28" y2="50" stroke="#E76F51" strokeWidth="2" strokeLinecap="round" />
              <line x1="48" y1="42" x2="56" y2="50" stroke="#E76F51" strokeWidth="2" strokeLinecap="round" />
              <line x1="56" y1="42" x2="48" y2="50" stroke="#E76F51" strokeWidth="2" strokeLinecap="round" />
            </g>
          ) : state === 'waiting_permission' ? (
            <g>
              <polygon points="30,44 34,46 30,48" fill="#F4A261" />
              <polygon points="52,44 48,46 52,48" fill="#F4A261" />
              <circle cx="41" cy="38" r="3" fill="#F4A261" />
            </g>
          ) : state === 'speaking' ? (
            <g>
              <line x1="28" y1="46" x2="28" y2="50" stroke="#FF7B72" strokeWidth="2" strokeLinecap="round" />
              <line x1="34" y1="43" x2="34" y2="53" stroke="#FF7B72" strokeWidth="2" strokeLinecap="round" />
              <line x1="41" y1="41" x2="41" y2="55" stroke="#FF7B72" strokeWidth="2" strokeLinecap="round" />
              <line x1="48" y1="43" x2="48" y2="53" stroke="#FF7B72" strokeWidth="2" strokeLinecap="round" />
              <line x1="54" y1="46" x2="54" y2="50" stroke="#FF7B72" strokeWidth="2" strokeLinecap="round" />
            </g>
          ) : state === 'attentive' ? (
            <g>
              <polygon points="28,40 38,46 28,52" fill="#FF7B72" />
              <polygon points="54,40 44,46 54,52" fill="#FF7B72" />
              <circle cx="33" cy="46" r="1.5" fill="#FFF" />
              <circle cx="49" cy="46" r="1.5" fill="#FFF" />
            </g>
          ) : (
            <g>
              <polygon points="30,42 36,46 30,50" fill="#FF7B72" />
              <polygon points="52,42 46,46 52,50" fill="#FF7B72" />
            </g>
          )}

          {/* Digital Stylus Pen (slung across shoulder) */}
          <line x1="60" y1="50" x2="74" y2="76" stroke="#E76F51" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="74" cy="76" r={state === 'working' ? 3.5 : 2} fill={state === 'working' ? '#FF7B72' : '#A371F7'}>
            {state === 'working' && !isReducedMotion && (
              <animate attributeName="r" values="2;4;2" dur="0.8s" repeatCount="indefinite" />
            )}
          </circle>

          {/* Floating Color Swatch Badge */}
          <rect x="20" y="66" width="6" height="6" rx="1.5" fill="#FF7B72" />
          <rect x="28" y="66" width="6" height="6" rx="1.5" fill="#A371F7" />
          <rect x="36" y="66" width="6" height="6" rx="1.5" fill="#81B29A" />

          <defs>
            <linearGradient id="pixelBodyGradient" x1="14" y1="16" x2="68" y2="84" gradientUnits="userSpaceOnUse">
              <stop stopColor="#301E28" />
              <stop offset="0.6" stopColor="#221720" />
              <stop offset="1" stopColor="#171018" />
            </linearGradient>
          </defs>
        </svg>
      </motion.div>

      <div
        style={{
          textAlign: 'center',
          marginTop: '2px',
          fontSize: '11px',
          fontWeight: 600,
          color: isSelected ? '#FF7B72' : '#9DA3A8',
          letterSpacing: '0.04em',
        }}
      >
        PIXEL
      </div>
    </div>
  )
}

/**
 * 4. CIPHER — Backend & Systems Specialist
 * Silhouette: Heavy industrial square-shouldered chassis with dark slate steel, cyan telemetry visor, server cable.
 */
export const CipherMascot: React.FC<MascotProps> = ({
  state,
  bubble,
  isSelected,
  isReducedMotion,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      aria-label="Cipher: Backend Systems and Code Specialist"
      style={{
        position: 'relative',
        width: '88px',
        height: '110px',
        cursor: 'pointer',
        outline: 'none',
        userSelect: 'none',
      }}
    >
      <ActivityBubble bubble={bubble} agentName="Cipher" color="#4A89C8" />

      {isSelected && (
        <div
          style={{
            position: 'absolute',
            inset: '-10px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(74,137,200,0.2) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
      )}

      <motion.div
        animate={
          isReducedMotion
            ? {}
            : state === 'working'
            ? { y: [0, -2, 0] }
            : { y: [0, -2.5, 0] }
        }
        transition={
          isReducedMotion
            ? {}
            : {
                repeat: Infinity,
                duration: 4.2,
                ease: 'easeInOut',
              }
        }
        style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center' }}
      >
        <svg width="86" height="106" viewBox="0 0 86 106" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Shadow */}
          <ellipse cx="43" cy="98" rx="24" ry="5" fill="#000000" fillOpacity="0.4" />

          {/* Heavy Chamfered Box Shoulders */}
          <rect
            x="14"
            y="28"
            width="58"
            height="56"
            rx="8"
            fill="url(#cipherBodyGradient)"
            stroke={isSelected ? '#4A89C8' : '#373D45'}
            strokeWidth="2"
          />

          {/* Reinforced Head Turret */}
          <rect x="24" y="16" width="38" height="18" rx="6" fill="#1C232B" stroke="#2D3B47" strokeWidth="1.5" />

          {/* Dual Band Horizontal Telemetry Visor (Dynamic Expressions) */}
          <rect x="28" y="22" width="30" height="7" rx="3.5" fill="#0D1117" />
          {state === 'success' ? (
            <path d="M30 25.5 L36 25.5 L40 23 L44 28 L48 25.5 L56 25.5" stroke="#81B29A" strokeWidth="1.5" fill="none" />
          ) : state === 'error' ? (
            <path d="M30 25.5 L39 25.5 L42 22 L45 29 L48 25.5 L56 25.5" stroke="#E76F51" strokeWidth="1.5" fill="none" />
          ) : state === 'waiting_permission' ? (
            <rect x="30" y="24" width="26" height="3" rx="1.5" fill="#F4A261" />
          ) : state === 'speaking' ? (
            <g>
              <line x1="32" y1="24" x2="32" y2="27" stroke="#4A89C8" strokeWidth="1.5" />
              <line x1="36" y1="23" x2="36" y2="28" stroke="#4A89C8" strokeWidth="1.5" />
              <line x1="40" y1="22.5" x2="40" y2="28.5" stroke="#4A89C8" strokeWidth="1.5" />
              <line x1="44" y1="23" x2="44" y2="28" stroke="#4A89C8" strokeWidth="1.5" />
              <line x1="48" y1="24" x2="48" y2="27" stroke="#4A89C8" strokeWidth="1.5" />
              <line x1="52" y1="24.5" x2="52" y2="26.5" stroke="#4A89C8" strokeWidth="1.5" />
            </g>
          ) : state === 'attentive' ? (
            <rect x="30" y="23.5" width="26" height="4" rx="2" fill="#5D9BD8">
              {!isReducedMotion && (
                <animate attributeName="opacity" values="0.8;1;0.8" dur="1.2s" repeatCount="indefinite" />
              )}
            </rect>
          ) : (
            <rect x="30" y="24" width="26" height="3" rx="1.5" fill="#4A89C8">
              {!isReducedMotion && (
                <animate attributeName="opacity" values="0.6;1;0.6" dur="2.5s" repeatCount="indefinite" />
              )}
            </rect>
          )}

          {/* Cooling Grille on Chest */}
          <line x1="28" y1="46" x2="58" y2="46" stroke="#2D3B47" strokeWidth="2" strokeLinecap="round" />
          <line x1="28" y1="52" x2="58" y2="52" stroke="#2D3B47" strokeWidth="2" strokeLinecap="round" />
          <line x1="28" y1="58" x2="58" y2="58" stroke="#2D3B47" strokeWidth="2" strokeLinecap="round" />

          {/* Database WAL Activity Status Dot */}
          <circle
            cx="28"
            cy="72"
            r={state === 'working' ? 3.5 : 3}
            fill={state === 'error' ? '#E76F51' : state === 'waiting_permission' ? '#F4A261' : '#81B29A'}
          >
            {state === 'working' && !isReducedMotion && (
              <animate attributeName="opacity" values="0.3;1;0.3" dur="0.6s" repeatCount="indefinite" />
            )}
          </circle>
          <text x="36" y="75" fill="#9DA3A8" fontSize="8" fontFamily="Geist Mono, monospace" fontWeight="600">
            SQLITE
          </text>

          {/* Heavy Server Conduit Cable */}
          <path d="M72 64 C80 64 80 82 86 86" stroke="#373D45" strokeWidth="3" strokeLinecap="round" fill="none" />

          <defs>
            <linearGradient id="cipherBodyGradient" x1="14" y1="16" x2="72" y2="84" gradientUnits="userSpaceOnUse">
              <stop stopColor="#1E2833" />
              <stop offset="0.6" stopColor="#161E26" />
              <stop offset="1" stopColor="#11161C" />
            </linearGradient>
          </defs>
        </svg>
      </motion.div>

      <div
        style={{
          textAlign: 'center',
          marginTop: '2px',
          fontSize: '11px',
          fontWeight: 600,
          color: isSelected ? '#4A89C8' : '#9DA3A8',
          letterSpacing: '0.04em',
        }}
      >
        CIPHER
      </div>
    </div>
  )
}

/**
 * 5. SCOUT — Research & Discovery Scout
 * Silhouette: Spherical explorer bot with warm amber finish, aviator cap/goggles, dual camera lenses.
 */
export const ScoutMascot: React.FC<MascotProps> = ({
  state,
  bubble,
  isSelected,
  isReducedMotion,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      aria-label="Scout: Research and Source Gathering Scout"
      style={{
        position: 'relative',
        width: '84px',
        height: '110px',
        cursor: 'pointer',
        outline: 'none',
        userSelect: 'none',
      }}
    >
      <ActivityBubble bubble={bubble} agentName="Scout" color="#E9C46A" />

      {isSelected && (
        <div
          style={{
            position: 'absolute',
            inset: '-10px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(233,196,106,0.2) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
      )}

      <motion.div
        animate={
          isReducedMotion
            ? {}
            : state === 'working'
            ? { y: [0, -4, 0], rotate: [0, -3, 3, 0] }
            : { y: [0, -3, 0] }
        }
        transition={
          isReducedMotion
            ? {}
            : {
                repeat: Infinity,
                duration: 3.6,
                ease: 'easeInOut',
              }
        }
        style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center' }}
      >
        <svg width="80" height="106" viewBox="0 0 80 106" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Shadow */}
          <ellipse cx="40" cy="98" rx="20" ry="4.5" fill="#000000" fillOpacity="0.35" />

          {/* Leather Aviator Ear Flaps & Strap */}
          <path d="M18 36 C14 44 14 60 20 66" stroke="#6F4E37" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M62 36 C66 44 66 60 60 66" stroke="#6F4E37" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M22 28 C26 14 54 14 58 28" fill="#6F4E37" />

          {/* Aviator Brass Goggles pushed up on cap */}
          <rect x="22" y="24" width="16" height="10" rx="4" fill="#B8860B" stroke="#4A3525" strokeWidth="1.2" />
          <rect x="42" y="24" width="16" height="10" rx="4" fill="#B8860B" stroke="#4A3525" strokeWidth="1.2" />
          <line x1="38" y1="29" x2="42" y2="29" stroke="#4A3525" strokeWidth="2" />

          {/* Spherical Explorer Droid Body */}
          <circle
            cx="40"
            cy="54"
            r="26"
            fill="url(#scoutBodyGradient)"
            stroke={isSelected ? '#E9C46A' : '#373D45'}
            strokeWidth="1.8"
          />

          {/* Dual Camera Shutter Lens Eyes (Dynamic Expressions) */}
          <circle cx="32" cy="54" r="8.5" fill="#1A1812" stroke={state === 'error' ? '#E76F51' : '#D4A373'} strokeWidth="1.5" />
          <circle cx="48" cy="54" r="8.5" fill="#1A1812" stroke={state === 'error' ? '#E76F51' : '#D4A373'} strokeWidth="1.5" />

          {state === 'success' ? (
            <g>
              <polygon points="32,50 33.5,53 36.5,54 33.5,55 32,58 30.5,55 27.5,54 30.5,53" fill="#E9C46A" />
              <polygon points="48,50 49.5,53 52.5,54 49.5,55 48,58 46.5,55 43.5,54 46.5,53" fill="#E9C46A" />
            </g>
          ) : state === 'error' ? (
            <g>
              <line x1="28" y1="50" x2="36" y2="58" stroke="#E76F51" strokeWidth="2" strokeLinecap="round" />
              <line x1="44" y1="58" x2="52" y2="50" stroke="#E76F51" strokeWidth="2" strokeLinecap="round" />
            </g>
          ) : state === 'waiting_permission' ? (
            <g>
              <circle cx="32" cy="54" r="3.5" fill="#F4A261" />
              <circle cx="48" cy="54" r="3.5" fill="#F4A261" />
              {/* Permission Alert Badge */}
              <circle cx="40" cy="46" r="3" fill="#F4A261" />
            </g>
          ) : state === 'speaking' ? (
            <g>
              <circle cx="32" cy="54" r="4.5" fill="#E9C46A" />
              <circle cx="48" cy="54" r="4.5" fill="#E9C46A" />
              <path d="M37 62 Q40 65 43 62" stroke="#E9C46A" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            </g>
          ) : state === 'attentive' ? (
            <g>
              <circle cx="32" cy="54" r="5" fill="#E9C46A" />
              <circle cx="48" cy="54" r="5" fill="#E9C46A" />
              <circle cx="33.5" cy="52" r="1.5" fill="#FFF" />
              <circle cx="49.5" cy="52" r="1.5" fill="#FFF" />
            </g>
          ) : (
            <g>
              <circle cx="32" cy="54" r="4.5" fill="#E9C46A">
                {!isReducedMotion && (
                  <animate attributeName="r" values="4.5;4.5;1;4.5;4.5" keyTimes="0;0.88;0.92;0.96;1" dur="4.2s" repeatCount="indefinite" />
                )}
              </circle>
              <circle cx="48" cy="54" r="4.5" fill="#E9C46A">
                {!isReducedMotion && (
                  <animate attributeName="r" values="4.5;4.5;1;4.5;4.5" keyTimes="0;0.88;0.92;0.96;1" dur="4.2s" repeatCount="indefinite" />
                )}
              </circle>
            </g>
          )}

          {/* Compass / Research Satchel Strap */}
          <path d="M20 64 Q40 76 60 64" stroke="#8A6240" strokeWidth="2.5" fill="none" />
          <circle cx="40" cy="73" r="3.5" fill={state === 'waiting_permission' ? '#F4A261' : '#E9C46A'} />

          <defs>
            <linearGradient id="scoutBodyGradient" x1="14" y1="28" x2="66" y2="80" gradientUnits="userSpaceOnUse">
              <stop stopColor="#2E2818" />
              <stop offset="0.6" stopColor="#221D12" />
              <stop offset="1" stopColor="#17130B" />
            </linearGradient>
          </defs>
        </svg>
      </motion.div>

      <div
        style={{
          textAlign: 'center',
          marginTop: '2px',
          fontSize: '11px',
          fontWeight: 600,
          color: isSelected ? '#E9C46A' : '#9DA3A8',
          letterSpacing: '0.04em',
        }}
      >
        SCOUT
      </div>
    </div>
  )
}
