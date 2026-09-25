/**
 * Floating Speech & Status Bubble Component for Hybrid HQ (Wave 12H)
 *
 * Renders concise, non-ephemeral operational status messages over agent avatars.
 * Supports auto-fade (4-7s), dismiss, role-based palette accents, and click-through to inspector.
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
      : '#a3e635' // Sage / Lime

  const severityBg =
    message.severity === 'error'
      ? 'rgba(239, 68, 68, 0.15)'
      : message.severity === 'success'
      ? 'rgba(34, 197, 94, 0.15)'
      : message.severity === 'warning'
      ? 'rgba(245, 158, 11, 0.15)'
      : 'rgba(15, 23, 42, 0.92)'

  return (
    <div
      onClick={onClick}
      role="status"
      aria-live="polite"
      data-testid={`hybrid-speech-bubble-${message.roleId}`}
      data-category={message.category}
      style={{
        position: 'absolute',
        bottom: '124px',
        left: '50%',
        transform: fading
          ? 'translateX(-50%) translateY(4px) scale(0.96)'
          : 'translateX(-50%) translateY(0) scale(1)',
        opacity: fading ? 0 : 1,
        transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        minWidth: '160px',
        maxWidth: '240px',
        padding: '8px 12px',
        backgroundColor: severityBg,
        backdropFilter: 'blur(16px)',
        border: `1.5px solid ${accentColor}`,
        borderRadius: '12px',
        boxShadow: `0 8px 24px rgba(0, 0, 0, 0.45), 0 0 16px ${accentColor}33`,
        cursor: 'pointer',
        zIndex: 30,
        pointerEvents: 'auto',
      }}
    >
      {/* Speech Arrow */}
      <div
        style={{
          position: 'absolute',
          bottom: '-7px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: '7px solid transparent',
          borderRight: '7px solid transparent',
          borderTop: `7px solid ${accentColor}`,
        }}
      />

      {/* Category Mini Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '4px',
          fontSize: '10px',
          fontWeight: 600,
          color: accentColor,
          letterSpacing: '0.3px',
        }}
      >
        <span>
          {message.category.replace(/_/g, ' ')}
        </span>
        {message.taskId && (
          <span
            style={{
              padding: '1px 5px',
              borderRadius: '4px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: '#e2e8f0',
              fontFamily: 'var(--font-mono, monospace)',
            }}
          >
            {message.taskId}
          </span>
        )}
      </div>

      {/* Message Text */}
      <p
        style={{
          margin: 0,
          fontSize: '12px',
          lineHeight: '1.4',
          color: '#f8fafc',
          fontWeight: 500,
        }}
      >
        “{message.shortText}”
      </p>
    </div>
  )
}
