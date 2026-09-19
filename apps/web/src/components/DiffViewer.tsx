import React from 'react'

export interface DiffViewerProps {
  readonly diff: string
  readonly isLoading?: boolean
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ diff, isLoading }) => {
  if (isLoading) {
    return (
      <div
        style={{
          padding: '24px',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
        }}
      >
        Loading evidence diff...
      </div>
    )
  }

  if (!diff || diff.trim() === '') {
    return (
      <div
        style={{
          padding: '24px',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          backgroundColor: 'var(--bg-panel)',
          borderRadius: 'var(--radius-md)',
          border: '1px dashed var(--border-color)',
        }}
      >
        No git diff present for this task.
      </div>
    )
  }

  const lines = diff.split(/\r?\n/)

  let addCount = 0
  let delCount = 0

  lines.forEach((line) => {
    if (line.startsWith('+') && !line.startsWith('+++')) addCount++
    if (line.startsWith('-') && !line.startsWith('---')) delCount++
  })

  return (
    <div
      style={{
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-panel)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Diff Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          backgroundColor: 'var(--bg-panel-elevated)',
          borderBottom: '1px solid var(--border-color)',
          fontSize: '11px',
          fontFamily: 'var(--font-mono)',
        }}
      >
        <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
          EVIDENCE GIT DIFF
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span style={{ color: 'var(--state-success-fg)' }}>+{addCount}</span>
          <span style={{ color: 'var(--state-failure-fg)' }}>-{delCount}</span>
          <span style={{ color: 'var(--text-muted)' }}>{lines.length} lines</span>
        </div>
      </div>

      {/* Diff Content */}
      <div
        style={{
          padding: '8px 0',
          overflowX: 'auto',
          maxHeight: '360px',
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          lineHeight: 1.5,
        }}
      >
        {lines.map((line, idx) => {
          let lineBg = 'transparent'
          let lineFg = 'var(--text-secondary)'

          if (line.startsWith('+') && !line.startsWith('+++')) {
            lineBg = 'rgba(74, 222, 128, 0.12)'
            lineFg = 'var(--state-success-fg)'
          } else if (line.startsWith('-') && !line.startsWith('---')) {
            lineBg = 'rgba(248, 113, 113, 0.12)'
            lineFg = 'var(--state-failure-fg)'
          } else if (line.startsWith('@@')) {
            lineBg = 'rgba(56, 189, 248, 0.08)'
            lineFg = 'var(--state-running-fg)'
          } else if (
            line.startsWith('diff --git') ||
            line.startsWith('index ') ||
            line.startsWith('---') ||
            line.startsWith('+++')
          ) {
            lineFg = 'var(--text-muted)'
          }

          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                backgroundColor: lineBg,
                padding: '1px 12px',
                whiteSpace: 'pre',
              }}
            >
              <span
                style={{
                  width: '36px',
                  userSelect: 'none',
                  color: 'var(--text-dim)',
                  textAlign: 'right',
                  marginRight: '12px',
                  flexShrink: 0,
                }}
              >
                {idx + 1}
              </span>
              <span style={{ color: lineFg }}>{line || ' '}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
