import React from 'react'

export interface TabItem<T extends string = string> {
  readonly id: T
  readonly label: string
  readonly count?: number | undefined
  readonly badge?: React.ReactNode | undefined
  readonly icon?: React.ReactNode | undefined
}

export interface TabsProps<T extends string = string> {
  readonly items: readonly TabItem<T>[]
  readonly activeId: T
  readonly onChange: (id: T) => void
  readonly ariaLabel?: string | undefined
}

export function Tabs<T extends string = string>({
  items,
  activeId,
  onChange,
  ariaLabel = 'Workspace views',
}: TabsProps<T>): React.ReactElement {
  return (
    <nav
      role="tablist"
      aria-label={ariaLabel}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        backgroundColor: 'var(--bg-panel-subtle, rgba(15, 20, 34, 0.6))',
        border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
        borderRadius: 'var(--radius-md, 6px)',
        padding: '2px',
        gap: '2px',
      }}
    >
      {items.map((item) => {
        const isActive = item.id === activeId
        return (
          <button
            key={item.id}
            role="tab"
            data-testid={`tab-${item.id}`}
            aria-selected={isActive}
            onClick={() => onChange(item.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: 'var(--radius-sm, 4px)',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.02em',
              fontFamily: 'var(--font-sans, system-ui, sans-serif)',
              border: 'none',
              backgroundColor: isActive
                ? 'var(--surface-active, rgba(59, 130, 246, 0.2))'
                : 'transparent',
              color: isActive
                ? 'var(--text-primary, #ffffff)'
                : 'var(--text-secondary, #94a3b8)',
              cursor: 'pointer',
              transition: 'background-color 150ms ease, color 150ms ease',
              userSelect: 'none',
              whiteSpace: 'nowrap',
              outline: 'none',
            }}
          >
            {item.icon && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  color: isActive ? 'var(--brand-primary, #60a5fa)' : 'inherit',
                }}
              >
                {item.icon}
              </span>
            )}
            <span>{item.label}</span>
            {item.count !== undefined && (
              <span
                style={{
                  fontSize: '9px',
                  padding: '1px 5px',
                  borderRadius: 'var(--radius-sm, 4px)',
                  backgroundColor: isActive
                    ? 'rgba(255, 255, 255, 0.2)'
                    : 'var(--bg-panel-elevated, rgba(255, 255, 255, 0.06))',
                  color: isActive ? '#ffffff' : 'var(--text-muted, #64748b)',
                  fontFamily: 'var(--font-mono, monospace)',
                }}
              >
                {item.count}
              </span>
            )}
            {item.badge}
          </button>
        )
      })}
    </nav>
  )
}
