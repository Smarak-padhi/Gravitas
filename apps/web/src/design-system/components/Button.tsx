import React from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'subtle'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant | undefined
  readonly size?: ButtonSize | undefined
  readonly isLoading?: boolean | undefined
  readonly icon?: React.ReactNode | undefined
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  isLoading = false,
  icon,
  disabled,
  style,
  ...props
}) => {
  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: 'var(--border-focus)',
          color: '#ffffff',
          border: '1px solid #2563eb',
        }
      case 'danger':
        return {
          backgroundColor: 'var(--state-failure-border)',
          color: '#ffffff',
          border: '1px solid #b91c1c',
        }
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          color: 'var(--text-secondary)',
          border: '1px solid transparent',
        }
      case 'subtle':
        return {
          backgroundColor: 'var(--bg-panel-subtle)',
          color: 'var(--text-secondary)',
          border: '1px solid var(--border-subtle)',
        }
      case 'secondary':
      default:
        return {
          backgroundColor: 'var(--bg-panel-elevated)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-color)',
        }
    }
  }

  const getSizeStyles = (): React.CSSProperties => {
    switch (size) {
      case 'sm':
        return {
          padding: '3px 8px',
          fontSize: '11px',
          borderRadius: 'var(--radius-sm)',
        }
      case 'lg':
        return {
          padding: '8px 18px',
          fontSize: '13px',
          borderRadius: 'var(--radius-md)',
        }
      case 'md':
      default:
        return {
          padding: '6px 14px',
          fontSize: '12px',
          borderRadius: 'var(--radius-md)',
        }
    }
  }

  const isDisabled = disabled || isLoading

  return (
    <button
      disabled={isDisabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        fontWeight: 600,
        fontFamily: 'inherit',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.6 : 1,
        transition: 'all var(--motion-duration-fast) var(--motion-ease-standard)',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        ...getVariantStyles(),
        ...getSizeStyles(),
        ...style,
      }}
      {...props}
    >
      {isLoading ? (
        <span
          style={{
            display: 'inline-block',
            width: '12px',
            height: '12px',
            border: '2px solid rgba(255,255,255,0.3)',
            borderTopColor: '#fff',
            borderRadius: '50%',
            animation: 'spinClockwise 0.8s linear infinite',
          }}
        />
      ) : (
        icon
      )}
      {children}
    </button>
  )
}
