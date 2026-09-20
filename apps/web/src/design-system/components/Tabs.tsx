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
        backgroundColor: 'var(--bg-panel-subtle)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
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
              padding: '5px 12px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.4px',
              fontFamily: 'var(--font-mono)',
              border: 'none',
              backgroundColor: isActive ? 'var(--border-focus)' : 'transparent',
              color: isActive ? '#ffffff' : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all var(--motion-duration-fast) var(--motion-ease-standard)',
              userSelect: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {item.icon}
            <span>{item.label}</span>
            {item.count !== undefined && (
              <span
                style={{
                  fontSize: '9px',
                  padding: '1px 5px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: isActive ? 'rgba(255, 255, 255, 0.2)' : 'var(--bg-panel-elevated)',
                  color: isActive ? '#ffffff' : 'var(--text-muted)',
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
