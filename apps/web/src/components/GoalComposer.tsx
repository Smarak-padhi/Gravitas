import React, { useState } from 'react'
import type { CreateRunInput } from '../api/types.js'

export interface GoalComposerProps {
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly onSubmit: (input: CreateRunInput) => Promise<void>
  readonly isSubmitting: boolean
}

export const GoalComposer: React.FC<GoalComposerProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}) => {
  const [goal, setGoal] = useState('')
  const [repository, setRepository] = useState('')
  const [baseBranch, setBaseBranch] = useState('HEAD')
  const [constraintsText, setConstraintsText] = useState('src/math.js')
  const [requiresApproval, setRequiresApproval] = useState(true)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!goal.trim()) {
      setError('Goal is required.')
      return
    }

    const constraints = constraintsText
      .split(/[\n,]/)
      .map((c) => c.trim())
      .filter(Boolean)

    try {
      setError(null)
      await onSubmit({
        goal: goal.trim(),
        ...(repository.trim() ? { repository: repository.trim() } : {}),
        baseBranch: baseBranch.trim() || 'HEAD',
        constraints,
        requiresApproval,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create run')
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '20px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          backgroundColor: 'var(--bg-panel)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: 'var(--bg-panel-elevated)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Compose New Run
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '18px',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div
              style={{
                padding: '8px 12px',
                backgroundColor: 'var(--state-failure-bg)',
                border: '1px solid var(--state-failure-border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--state-failure-fg)',
                fontSize: '12px',
              }}
            >
              {error}
            </div>
          )}

          {/* Goal Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label
              htmlFor="composer-goal"
              style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}
            >
              Run Goal (Objective) *
            </label>
            <textarea
              id="composer-goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. Implement add(a, b) function in src/math.js"
              rows={3}
              style={{
                padding: '8px 12px',
                backgroundColor: 'var(--bg-app)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                fontSize: '13px',
                resize: 'vertical',
              }}
              required
            />
          </div>

          {/* Repository Path */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label
              htmlFor="composer-repo"
              style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}
            >
              Target Repository Path (leave empty for default)
            </label>
            <input
              id="composer-repo"
              type="text"
              value={repository}
              onChange={(e) => setRepository(e.target.value)}
              placeholder="c:\Users\... or empty"
              style={{
                padding: '8px 12px',
                backgroundColor: 'var(--bg-app)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
              }}
            />
          </div>

          {/* Base Branch & Scope Constraints */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label
                htmlFor="composer-branch"
                style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}
              >
                Base Ref / Branch
              </label>
              <input
                id="composer-branch"
                type="text"
                value={baseBranch}
                onChange={(e) => setBaseBranch(e.target.value)}
                style={{
                  padding: '8px 12px',
                  backgroundColor: 'var(--bg-app)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label
                htmlFor="composer-constraints"
                style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}
              >
                Allowed Paths (Scope)
              </label>
              <input
                id="composer-constraints"
                type="text"
                value={constraintsText}
                onChange={(e) => setConstraintsText(e.target.value)}
                placeholder="e.g. src/math.js, test/math.test.js"
                style={{
                  padding: '8px 12px',
                  backgroundColor: 'var(--bg-app)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                }}
              />
            </div>
          </div>

          {/* Requires Approval Checkbox */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            <input
              id="composer-requires-approval"
              type="checkbox"
              checked={requiresApproval}
              onChange={(e) => setRequiresApproval(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <label
              htmlFor="composer-requires-approval"
              style={{ fontSize: '12px', color: 'var(--text-primary)', cursor: 'pointer' }}
            >
              Require human approval before completing run (recommended)
            </label>
          </div>

          {/* Footer Actions */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              marginTop: '12px',
              paddingTop: '16px',
              borderTop: '1px solid var(--border-color)',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '7px 14px',
                backgroundColor: 'var(--bg-panel-elevated)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-secondary)',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '7px 18px',
                backgroundColor: 'var(--border-focus)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              {isSubmitting ? 'Creating...' : 'Create Run'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
