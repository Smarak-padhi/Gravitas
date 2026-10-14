import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, MessageSquareHeart } from 'lucide-react'

export type CompanionExpression = 'idle' | 'listening' | 'thinking' | 'speaking' | 'success' | 'alert'

export interface CompanionBuddyProps {
  expression: CompanionExpression
  thoughtText: string
  isReducedMotion: boolean
  onQuickPrompt?: (prompt: string) => void
}

export const CompanionBuddy: React.FC<CompanionBuddyProps> = ({
  expression,
  thoughtText,
  isReducedMotion,
  onQuickPrompt,
}) => {
  const [blink, setBlink] = useState(false)

  // Gentle natural blinking every 3-5 seconds
  useEffect(() => {
    if (isReducedMotion) return
    const interval = setInterval(() => {
      setBlink(true)
      setTimeout(() => setBlink(false), 160)
    }, 3800)
    return () => clearInterval(interval)
  }, [isReducedMotion])

  // Determine eye geometry based on expression
  const renderEyes = () => {
    if (blink && expression !== 'speaking') {
      return (
        <g stroke="#F4A261" strokeWidth="2.5" strokeLinecap="round">
          <line x1="28" y1="36" x2="38" y2="36" />
          <line x1="52" y1="36" x2="62" y2="36" />
        </g>
      )
    }

    switch (expression) {
      case 'listening':
        return (
          <g>
            <circle cx="33" cy="35" r="6" fill="#F4A261" />
            <circle cx="57" cy="35" r="6" fill="#F4A261" />
            <circle cx="34" cy="33" r="2" fill="#1C2025" />
            <circle cx="58" cy="33" r="2" fill="#1C2025" />
            {/* Listening glow pulse */}
            <circle cx="33" cy="35" r="9" stroke="#E07A5F" strokeWidth="1" fill="none" opacity="0.6" />
            <circle cx="57" cy="35" r="9" stroke="#E07A5F" strokeWidth="1" fill="none" opacity="0.6" />
          </g>
        )
      case 'thinking':
        return (
          <g>
            <ellipse cx="31" cy="34" rx="5" ry="4" fill="#81B29A" />
            <ellipse cx="55" cy="34" rx="5" ry="4" fill="#81B29A" />
            <circle cx="33" cy="34" r="1.8" fill="#1C2025" />
            <circle cx="57" cy="34" r="1.8" fill="#1C2025" />
          </g>
        )
      case 'success':
        return (
          <g stroke="#81B29A" strokeWidth="2.8" strokeLinecap="round" fill="none">
            <path d="M 27 37 Q 33 30 39 37" />
            <path d="M 51 37 Q 57 30 63 37" />
          </g>
        )
      case 'alert':
        return (
          <g fill="#E07A5F">
            <circle cx="33" cy="34" r="5.5" />
            <circle cx="57" cy="34" r="5.5" />
            <circle cx="33" cy="34" r="1.5" fill="#FFF" />
            <circle cx="57" cy="34" r="1.5" fill="#FFF" />
          </g>
        )
      case 'speaking':
      case 'idle':
      default:
        return (
          <g>
            <circle cx="33" cy="35" r="5" fill="#F4A261" />
            <circle cx="57" cy="35" r="5" fill="#F4A261" />
            <circle cx="34.5" cy="33.5" r="1.6" fill="#FFF" />
            <circle cx="58.5" cy="33.5" r="1.6" fill="#FFF" />
          </g>
        )
    }
  }

  const renderMouth = () => {
    switch (expression) {
      case 'success':
        return <path d="M 38 46 Q 45 53 52 46" stroke="#81B29A" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      case 'speaking':
        return <ellipse cx="45" cy="48" rx="4.5" ry="3.5" fill="#F4A261" />
      case 'thinking':
        return <line x1="41" y1="48" x2="49" y2="48" stroke="#81B29A" strokeWidth="2" strokeLinecap="round" />
      case 'listening':
        return <ellipse cx="45" cy="48" rx="2.5" ry="2.5" fill="#E07A5F" />
      case 'alert':
        return <line x1="40" y1="49" x2="50" y2="49" stroke="#E07A5F" strokeWidth="2" strokeLinecap="round" />
      case 'idle':
      default:
        return <path d="M 39 46 Q 45 50 51 46" stroke="#9DA3A8" strokeWidth="2" strokeLinecap="round" fill="none" />
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '16px 20px', background: 'rgba(28, 32, 37, 0.75)', border: '1px solid #2B3036', borderRadius: '14px', backdropFilter: 'blur(8px)', maxWidth: '640px', width: '100%', boxSizing: 'border-box' }}>
      {/* 2D Vector Companion Avatar */}
      <motion.div
        animate={isReducedMotion ? {} : { y: [0, -3, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'relative', flexShrink: 0 }}
      >
        <svg width="90" height="90" viewBox="0 0 90 90" style={{ filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.35))' }}>
          {/* Subtle antenna/halo */}
          <path d="M 45 20 L 45 10" stroke="#F4A261" strokeWidth="2" strokeLinecap="round" />
          <circle cx="45" cy="8" r="3" fill="#E07A5F" />

          {/* Head Body */}
          <rect x="15" y="18" width="60" height="52" rx="16" fill="#1C2025" stroke="#373D45" strokeWidth="2" />
          {/* Face screen inset */}
          <rect x="20" y="24" width="50" height="40" rx="10" fill="#121518" stroke="#252A30" strokeWidth="1.5" />

          {/* Blush cheeks */}
          <ellipse cx="26" cy="46" rx="3.5" ry="2" fill="#E07A5F" opacity="0.35" />
          <ellipse cx="64" cy="46" rx="3.5" ry="2" fill="#E07A5F" opacity="0.35" />

          {/* Eyes & Mouth */}
          {renderEyes()}
          {renderMouth()}
        </svg>

        {/* Prototype Indicator Badge */}
        <div style={{ position: 'absolute', bottom: '-4px', left: '50%', transform: 'translateX(-50%)', background: '#252A30', border: '1px solid #373D45', borderRadius: '4px', fontSize: '9px', fontWeight: 600, color: '#F4A261', padding: '1px 5px', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
          2D Buddy
        </div>
      </motion.div>

      {/* Reactive Speech / Thought Stream */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#EDEAE3', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={14} color="#F4A261" />
            Grav <span style={{ fontSize: '11px', color: '#81B29A', fontWeight: 400 }}>Personal Companion (Prototype)</span>
          </span>
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={thoughtText}
            initial={isReducedMotion ? {} : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={isReducedMotion ? {} : { opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            style={{ fontSize: '13.5px', color: '#D2D0C9', lineHeight: 1.5, wordBreak: 'break-word' }}
          >
            {thoughtText}
          </motion.div>
        </AnimatePresence>

        <div style={{ marginTop: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button
            onClick={() => onQuickPrompt?.("What's due today?")}
            style={{ background: '#252A30', border: '1px solid #343B42', borderRadius: '6px', color: '#EDEAE3', fontSize: '11px', padding: '3px 8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            "What's due today?"
          </button>
          <button
            onClick={() => onQuickPrompt?.('Open my Algorithms notes')}
            style={{ background: '#252A30', border: '1px solid #343B42', borderRadius: '6px', color: '#EDEAE3', fontSize: '11px', padding: '3px 8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            "Open my Algorithms notes"
          </button>
          <button
            onClick={() => onQuickPrompt?.('Open Netflix')}
            style={{ background: '#252A30', border: '1px solid #343B42', borderRadius: '6px', color: '#EDEAE3', fontSize: '11px', padding: '3px 8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            "Open Netflix"
          </button>
        </div>
      </div>
    </div>
  )
}
