/**
 * Streamlined Character Speech Bubble Component for Hybrid HQ (Wave 12H-R)
 *
 * Implements clean, charming, non-cluttered operational character dialogue:
 * - Pure character quote: "Implementation finished. Sending T-142 to Review."
 * - Stripped of redundant HUD clutter (no category badges, task chips, timestamps inside the bubble)
 * - Tail pointing to agent, auto-fade (4-7s), role-based accent outline
 * - Zero LLM, zero fake chat, strictly derived from canonical runtime state.
 */

import React, { useEffect, useState } from 'react'
import type { AgentStatusMessage } from './types.js'

export interface SpeechBubbleProps {
  readonly message: AgentStatusMessage | null
  readonly onDismiss?: () => void
  readonly onClick?: () => void
}

export const SpeechBubble: React.FC<SpeechBubbleProps> = ({
  message,
  onDismiss,
  onClick,
}) => {
  const [visible, setVisible] = useState(false)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    if (!message) {
      setVisible(false)
      setFading(false)
      return
    }

    setVisible(true)
    setFading(false)

    // Schedule fade out based on expiresAfterMs (4000 - 7000ms)
    const duration = message.expiresAfterMs || 5000
    const fadeTimer = setTimeout(() => {
      setFading(true)
    }, duration - 600)

    const dismissTimer = setTimeout(() => {
      setVisible(false)
      onDismiss?.()
    }, duration)

    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(dismissTimer)
    }
  }, [message, onDismiss])

  if (!visible || !message) return null

  // Role Accent Colors
  const accentColor =
    message.roleId === 'role:engineering:frontend-engineer'
      ? '#818cf8' // Lavender
      : message.roleId === 'role:engineering:backend-engineer'
      ? '#2dd4bf' // Teal
      : '#84cc16' // Sage / Lime

  return (
    <div
      onClick={onClick}
      role="status"
      aria-live="polite"
      data-testid={`hybrid-speech-bubble-${message.roleId}`}
      data-category={message.category}
      style={{
        position: 'absolute',
        bottom: '128px',
        left: '50%',
        transform: fading
          ? 'translateX(-50%) translateY(4px) scale(0.96)'
          : 'translateX(-50%) translateY(0) scale(1)',
        opacity: fading ? 0 : 1,
        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        minWidth: '150px',
        maxWidth: '220px',
        padding: '8px 12px',
        backgroundColor: 'rgba(15, 23, 42, 0.94)',
        backdropFilter: 'blur(16px)',
        border: `1.5px solid ${accentColor}`,
        borderRadius: '12px',
        boxShadow: `0 8px 24px rgba(0, 0, 0, 0.5), 0 0 14px ${accentColor}25`,
        cursor: 'pointer',
        zIndex: 30,
        pointerEvents: 'auto',
      }}
    >
      {/* Speech Tail */}
      <div
        style={{
          position: 'absolute',
          bottom: '-7px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: `7px solid ${accentColor}`,
        }}
      />

      {/* Pure Character Communication Message */}
      <p
        style={{
          margin: 0,
          fontSize: '11.5px',
          lineHeight: '1.4',
          color: '#f8fafc',
          fontWeight: 500,
          textAlign: 'center',
          letterSpacing: '0.1px',
        }}
      >
        “{message.shortText}”
      </p>
    </div>
  )
}
