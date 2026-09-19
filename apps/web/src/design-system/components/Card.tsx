import React from 'react'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  readonly isSelected?: boolean | undefined
  readonly isHoverable?: boolean | undefined
}

export const Card: React.FC<CardProps> = ({
  children,
  isSelected = false,
  isHoverable = false,
  style,
  ...props
}) => {
  return (
    <div
      style={{
        backgroundColor: isSelected ? 'var(--bg-panel-elevated)' : 'var(--bg-panel)',
        border: `1px solid ${isSelected ? 'var(--border-focus)' : 'var(--border-color)'}`,
        borderRadius: 'var(--radius-md)',
        padding: '12px 14px',
        transition: 'all var(--motion-duration-fast) var(--motion-ease-standard)',
        cursor: isHoverable ? 'pointer' : 'default',
        boxShadow: isSelected ? '0 0 12px rgba(59, 130, 246, 0.2)' : 'var(--shadow-sm)',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
}
