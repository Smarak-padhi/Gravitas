import React from 'react'

export type StatusIndicatorType = 'online' | 'busy' | 'verifying' | 'waiting' | 'error' | 'offline'

export interface StatusIndicatorProps {
  readonly status: StatusIndicatorType
  readonly label?: string | undefined
  readonly title?: string | undefined
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  label,
  title,
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'online':
        return 'var(--state-success-fg)'
      case 'busy':
        return 'var(--state-running-fg)'
      case 'verifying':
        return 'var(--state-verifying-fg)'
      case 'waiting':
        return 'var(--state-waiting-fg)'
      case 'error':
        return 'var(--state-failure-fg)'
      case 'offline':
      default:
        return 'var(--text-dim)'
    }
  }

  const color = getStatusColor()

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '11px',
        fontFamily: 'var(--font-mono)',
        color: 'var(--text-secondary)',
      }}
      title={title ?? label ?? status}
    >
      <span
        style={{
          display: 'inline-block',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: color,
          boxShadow: status === 'waiting' || status === 'busy' ? `0 0 6px ${color}` : 'none',
        }}
      />
      {label && <span>{label}</span>}
    </div>
  )
}
