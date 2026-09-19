import React from 'react'

export interface PanelProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  readonly title?: React.ReactNode | undefined
  readonly actions?: React.ReactNode | undefined
}

export const Panel: React.FC<PanelProps> = ({
  title,
  actions,
  children,
  style,
  ...props
}) => {
  return (
    <section
      style={{
        backgroundColor: 'var(--bg-panel)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        ...style,
      }}
      {...props}
    >
      {(title || actions) && (
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            backgroundColor: 'var(--bg-panel-elevated)',
            borderBottom: '1px solid var(--border-color)',
            userSelect: 'none',
          }}
        >
          {typeof title === 'string' ? (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.8px',
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {title}
            </span>
          ) : (
            title
          )}
          {actions && <div>{actions}</div>}
        </header>
      )}
      <div style={{ flex: 1, overflow: 'auto' }}>{children}</div>
    </section>
  )
}
