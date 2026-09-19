import React from 'react'
import type { Run, RunStatus } from '../api/types.js'

export interface RunsListProps {
  readonly runs: readonly Run[]
  readonly selectedRunId: string | null
  readonly onSelectRun: (runId: string) => void
  readonly onNewRunClick: () => void
}

export const RunsList: React.FC<RunsListProps> = ({
  runs,
  selectedRunId,
  onSelectRun,
  onNewRunClick,
}) => {
  const getStatusBadge = (status: RunStatus) => {
    let fg = 'var(--state-ready-fg)'
    let bg = 'var(--state-ready-bg)'
    let border = 'var(--state-ready-border)'

    if (status === 'RUNNING') {
      fg = 'var(--state-running-fg)'
      bg = 'var(--state-running-bg)'
      border = 'var(--state-running-border)'
    } else if (status === 'COMPLETED') {
      fg = 'var(--state-success-fg)'
      bg = 'var(--state-success-bg)'
      border = 'var(--state-success-border)'
    } else if (status === 'FAILED') {
      fg = 'var(--state-failure-fg)'
      bg = 'var(--state-failure-bg)'
      border = 'var(--state-failure-border)'
    }

    return (
      <span
        style={{
          fontSize: '10px',
          fontWeight: 600,
          fontFamily: 'var(--font-mono)',
          padding: '2px 6px',
          borderRadius: 'var(--radius-sm)',
          color: fg,
          backgroundColor: bg,
          border: `1px solid ${border}`,
        }}
      >
        {status}
      </span>
    )
  }

  return (
    <aside
      style={{
        width: '280px',
        flexShrink: 0,
        backgroundColor: 'var(--bg-panel)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '1px',
            color: 'var(--text-secondary)',
          }}
        >
          RUNS ({runs.length})
        </span>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        {runs.length === 0 ? (
          <div
            style={{
              padding: '32px 16px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>
              No runs yet
            </div>
            <div style={{ fontSize: '12px', lineHeight: 1.4 }}>
              Click below to compose your first goal and execute the Golden Loop.
            </div>
            <button
              onClick={onNewRunClick}
              style={{
                marginTop: '8px',
                padding: '6px 12px',
                backgroundColor: 'var(--bg-panel-elevated)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Compose Goal
            </button>
          </div>
        ) : (
          runs.map((run) => {
            const isSelected = run.id === selectedRunId
            return (
              <button
                key={run.id}
                onClick={() => onSelectRun(run.id)}
                style={{
                  textAlign: 'left',
                  padding: '10px 12px',
                  backgroundColor: isSelected
                    ? 'var(--bg-panel-elevated)'
                    : 'var(--bg-panel-subtle)',
                  border: isSelected
                    ? '1px solid var(--border-focus)'
                    : '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                  color: 'inherit',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontWeight: 600,
                    }}
                  >
                    {run.id}
                  </span>
                  {getStatusBadge(run.status)}
                </div>

                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={run.goal}
                >
                  {run.goal}
                </div>

                <div
                  style={{
                    fontSize: '10px',
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {new Date(run.createdAt).toLocaleTimeString()}
                </div>
              </button>
            )
          })
        )}
      </div>
    </aside>
  )
}
