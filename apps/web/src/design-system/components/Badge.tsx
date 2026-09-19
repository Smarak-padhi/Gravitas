import React from 'react'

export type BadgeVariant =
  | 'ready'
  | 'running'
  | 'verifying'
  | 'waiting'
  | 'success'
  | 'failure'
  | 'muted'
  | 'neutral'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  readonly variant?: BadgeVariant | undefined
  readonly icon?: React.ReactNode | undefined
  readonly pulse?: boolean | undefined
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  icon,
  pulse = false,
  style,
  ...props
}) => {
  const getColors = () => {
    switch (variant) {
      case 'ready':
        return {
          fg: 'var(--state-ready-fg)',
          bg: 'var(--state-ready-bg)',
          border: 'var(--state-ready-border)',
        }
      case 'running':
        return {
          fg: 'var(--state-running-fg)',
          bg: 'var(--state-running-bg)',
          border: 'var(--state-running-border)',
        }
      case 'verifying':
        return {
          fg: 'var(--state-verifying-fg)',
          bg: 'var(--state-verifying-bg)',
          border: 'var(--state-verifying-border)',
        }
      case 'waiting':
        return {
          fg: 'var(--state-waiting-fg)',
          bg: 'var(--state-waiting-bg)',
          border: 'var(--state-waiting-border)',
        }
      case 'success':
        return {
          fg: 'var(--state-success-fg)',
          bg: 'var(--state-success-bg)',
          border: 'var(--state-success-border)',
        }
      case 'failure':
        return {
          fg: 'var(--state-failure-fg)',
          bg: 'var(--state-failure-bg)',
          border: 'var(--state-failure-border)',
        }
      case 'muted':
        return {
          fg: 'var(--text-muted)',
          bg: 'var(--bg-panel-subtle)',
          border: 'var(--border-subtle)',
        }
      case 'neutral':
      default:
        return {
          fg: 'var(--text-secondary)',
          bg: 'var(--bg-panel-elevated)',
          border: 'var(--border-color)',
        }
    }
  }

  const { fg, bg, border } = getColors()

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 6px',
        borderRadius: 'var(--radius-sm)',
        fontSize: '10px',
        fontWeight: 700,
        fontFamily: 'var(--font-mono)',
        color: fg,
        backgroundColor: bg,
        border: `1px solid ${border}`,
        lineHeight: 1.2,
        userSelect: 'none',
        whiteSpace: 'nowrap',
        animation: pulse ? 'attentionPulse 2s ease-in-out infinite' : 'none',
        ...style,
      }}
      {...props}
    >
      {icon}
      {children}
    </span>
  )
}
