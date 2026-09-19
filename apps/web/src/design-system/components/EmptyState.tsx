import React from 'react'
import { Button } from './Button.js'

export interface EmptyStateProps {
  readonly title: string
  readonly description: string
  readonly icon?: React.ReactNode | undefined
  readonly actionLabel?: string | undefined
  readonly onAction?: () => void
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  actionLabel,
  onAction,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '36px 20px',
        gap: '12px',
        color: 'var(--text-muted)',
      }}
    >
      {icon && (
        <div
          style={{
            fontSize: '28px',
            color: 'var(--text-dim)',
            lineHeight: 1,
            marginBottom: '4px',
          }}
        >
          {icon}
        </div>
      )}
      <div
        style={{
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--text-secondary)',
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: '12px',
          maxWidth: '380px',
          lineHeight: 1.5,
          color: 'var(--text-muted)',
        }}
      >
        {description}
      </div>
      {actionLabel && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction} style={{ marginTop: '8px' }}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
