import React, { useState } from 'react'
import type {
  AcceptanceCriterionInput,
  CreateRunInput,
  RequiredEvidenceInput,
} from '../api/types.js'

export interface GoalComposerProps {
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly onSubmit: (input: CreateRunInput) => Promise<void>
  readonly isSubmitting: boolean
}

export interface ComposerFormState {
  readonly goal: string
  readonly repository?: string | undefined
  readonly baseBranch: string
  readonly constraintsText: string
  readonly acceptanceCriteria: readonly AcceptanceCriterionInput[]
  readonly requiredEvidence: readonly RequiredEvidenceInput[]
  readonly requiresApproval: boolean
}

export function addCriterion(
  criteria: readonly AcceptanceCriterionInput[]
): AcceptanceCriterionInput[] {
  const nextId = `ac_${criteria.length + 1}`
  return [...criteria, { id: nextId, description: '' }]
}

export function removeCriterion(
  criteria: readonly AcceptanceCriterionInput[],
  index: number
): AcceptanceCriterionInput[] {
  if (criteria.length <= 1) return [...criteria]
  return criteria.filter((_, i) => i !== index)
}

export function addEvidence(
  evidence: readonly RequiredEvidenceInput[]
): RequiredEvidenceInput[] {
  const nextId = `ev_${evidence.length + 1}`
  return [...evidence, { id: nextId, type: 'TEST_REPORT', description: '', mandatory: true }]
}

export function removeEvidence(
  evidence: readonly RequiredEvidenceInput[],
  index: number
): RequiredEvidenceInput[] {
  if (evidence.length <= 1) return [...evidence]
  return evidence.filter((_, i) => i !== index)
}

export function validateAndBuildCreateRunPayload(
  state: ComposerFormState
): { valid: true; payload: CreateRunInput } | { valid: false; error: string } {
  if (!state.goal.trim()) {
    return { valid: false, error: 'Goal is required.' }
  }

  if (state.acceptanceCriteria.length === 0) {
    return { valid: false, error: 'At least one acceptance criterion is required.' }
  }

  for (let i = 0; i < state.acceptanceCriteria.length; i++) {
    const ac = state.acceptanceCriteria[i]
    if (!ac || !ac.description.trim()) {
      return { valid: false, error: `Acceptance criterion #${i + 1} must have a non-empty description.` }
    }
  }

  if (state.requiredEvidence.length === 0) {
    return { valid: false, error: 'At least one evidence requirement is required.' }
  }

  for (let i = 0; i < state.requiredEvidence.length; i++) {
    const ev = state.requiredEvidence[i]
    if (!ev || !ev.description.trim()) {
      return { valid: false, error: `Evidence requirement #${i + 1} must have a non-empty description.` }
    }
  }

  const constraints = state.constraintsText
    .split(/[\n,]/)
    .map((c) => c.trim())
    .filter(Boolean)

  return {
    valid: true,
    payload: {
      goal: state.goal.trim(),
      ...(state.repository?.trim() ? { repository: state.repository.trim() } : {}),
      baseBranch: state.baseBranch.trim() || 'HEAD',
      constraints,
      acceptanceCriteria: state.acceptanceCriteria.map((ac) => ({
        id: ac.id,
        description: ac.description.trim(),
        verificationMethod: ac.verificationMethod,
      })),
      requiredEvidence: state.requiredEvidence.map((ev) => ({
        id: ev.id,
        type: ev.type,
        description: ev.description.trim(),
        mandatory: ev.mandatory,
      })),
      requiresApproval: state.requiresApproval,
    },
  }
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

  const [acceptanceCriteria, setAcceptanceCriteria] = useState<AcceptanceCriterionInput[]>([
    { id: 'ac_1', description: 'Deliver specified goal functionality' },
  ])

  const [requiredEvidence, setRequiredEvidence] = useState<RequiredEvidenceInput[]>([
    {
      id: 'ev_1',
      type: 'GIT_DIFF',
      description: 'Non-empty valid git diff in scope',
      mandatory: true,
    },
  ])

  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleAddCriterion = () => {
    setAcceptanceCriteria(addCriterion(acceptanceCriteria))
  }

  const handleRemoveCriterion = (index: number) => {
    setAcceptanceCriteria(removeCriterion(acceptanceCriteria, index))
  }

  const handleCriterionChange = (index: number, description: string) => {
    setAcceptanceCriteria(
      acceptanceCriteria.map((item, i) => (i === index ? { ...item, description } : item))
    )
  }

  const handleAddEvidence = () => {
    setRequiredEvidence(addEvidence(requiredEvidence))
  }

  const handleRemoveEvidence = (index: number) => {
    setRequiredEvidence(removeEvidence(requiredEvidence, index))
  }

  const handleEvidenceChange = (
    index: number,
    field: keyof RequiredEvidenceInput,
    value: string | boolean
  ) => {
    setRequiredEvidence(
      requiredEvidence.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const validation = validateAndBuildCreateRunPayload({
      goal,
      repository,
      baseBranch,
      constraintsText,
      acceptanceCriteria,
      requiredEvidence,
      requiresApproval,
    })

    if (!validation.valid) {
      setError(validation.error)
      return
    }

    try {
      setError(null)
      await onSubmit(validation.payload)
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
          maxWidth: '640px',
          maxHeight: '90vh',
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
            flexShrink: 0,
          }}
        >
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Compose New Run
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
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

        {/* Form Body (Scrollable) */}
        <form
          onSubmit={handleSubmit}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {error && (
            <div
              data-testid="composer-error"
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
              rows={2}
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

          {/* Repository & Branch */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label
                htmlFor="composer-repo"
                style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}
              >
                Target Repository
              </label>
              <input
                id="composer-repo"
                type="text"
                value={repository}
                onChange={(e) => setRepository(e.target.value)}
                placeholder="Leave empty for default"
                style={{
                  padding: '7px 10px',
                  backgroundColor: 'var(--bg-app)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                }}
              />
            </div>

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
                  padding: '7px 10px',
                  backgroundColor: 'var(--bg-app)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                }}
              />
            </div>
          </div>

          {/* Scope Constraints */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label
              htmlFor="composer-constraints"
              style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}
            >
              Allowed Paths (Scope Constraints)
            </label>
            <input
              id="composer-constraints"
              type="text"
              value={constraintsText}
              onChange={(e) => setConstraintsText(e.target.value)}
              placeholder="e.g. src/math.js, test/math.test.js"
              style={{
                padding: '7px 10px',
                backgroundColor: 'var(--bg-app)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
              }}
            />
          </div>

          {/* Acceptance Criteria Section */}
          <div
            style={{
              padding: '12px',
              backgroundColor: 'var(--bg-panel-subtle)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.5px',
                  color: 'var(--text-secondary)',
                }}
              >
                ACCEPTANCE CRITERIA ({acceptanceCriteria.length}) *
              </span>
              <button
                type="button"
                onClick={handleAddCriterion}
                style={{
                  padding: '3px 8px',
                  backgroundColor: 'var(--bg-panel-elevated)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: '11px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                + Add Criterion
              </button>
            </div>

            {acceptanceCriteria.map((ac, idx) => (
              <div
                key={ac.id ?? idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    color: 'var(--text-dim)',
                    width: '36px',
                  }}
                >
                  #{idx + 1}
                </span>
                <input
                  type="text"
                  value={ac.description}
                  onChange={(e) => handleCriterionChange(idx, e.target.value)}
                  placeholder="Criterion description (e.g. math.add(2, 3) returns 5)"
                  aria-label={`Criterion ${idx + 1} description`}
                  data-testid={`criterion-desc-${idx}`}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    backgroundColor: 'var(--bg-app)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleRemoveCriterion(idx)}
                  disabled={acceptanceCriteria.length <= 1}
                  aria-label={`Remove criterion ${idx + 1}`}
                  data-testid={`remove-criterion-${idx}`}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    color:
                      acceptanceCriteria.length <= 1
                        ? 'var(--text-dim)'
                        : 'var(--state-failure-fg)',
                    fontSize: '11px',
                    cursor: acceptanceCriteria.length <= 1 ? 'not-allowed' : 'pointer',
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* Required Evidence Section */}
          <div
            style={{
              padding: '12px',
              backgroundColor: 'var(--bg-panel-subtle)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.5px',
                  color: 'var(--text-secondary)',
                }}
              >
                REQUIRED EVIDENCE ({requiredEvidence.length}) *
              </span>
              <button
                type="button"
                onClick={handleAddEvidence}
                style={{
                  padding: '3px 8px',
                  backgroundColor: 'var(--bg-panel-elevated)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: '11px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                + Add Evidence Requirement
              </button>
            </div>

            {requiredEvidence.map((ev, idx) => (
              <div
                key={ev.id ?? idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexWrap: 'wrap',
                }}
              >
                <select
                  value={ev.type}
                  onChange={(e) => handleEvidenceChange(idx, 'type', e.target.value)}
                  aria-label={`Evidence ${idx + 1} type`}
                  data-testid={`evidence-type-${idx}`}
                  style={{
                    padding: '6px 8px',
                    backgroundColor: 'var(--bg-app)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    width: '130px',
                  }}
                >
                  <option value="GIT_DIFF">GIT_DIFF</option>
                  <option value="TEST_REPORT">TEST_REPORT</option>
                  <option value="COMMAND_LOG">COMMAND_LOG</option>
                  <option value="SCREENSHOT">SCREENSHOT</option>
                  <option value="BROWSER_TRACE">BROWSER_TRACE</option>
                </select>

                <input
                  type="text"
                  value={ev.description}
                  onChange={(e) => handleEvidenceChange(idx, 'description', e.target.value)}
                  placeholder="Evidence description"
                  aria-label={`Evidence ${idx + 1} description`}
                  data-testid={`evidence-desc-${idx}`}
                  style={{
                    flex: 1,
                    minWidth: '160px',
                    padding: '6px 8px',
                    backgroundColor: 'var(--bg-app)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                  }}
                />

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                    userSelect: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={ev.mandatory}
                    onChange={(e) => handleEvidenceChange(idx, 'mandatory', e.target.checked)}
                    data-testid={`evidence-mandatory-${idx}`}
                  />
                  Mandatory
                </label>

                <button
                  type="button"
                  onClick={() => handleRemoveEvidence(idx)}
                  disabled={requiredEvidence.length <= 1}
                  aria-label={`Remove evidence ${idx + 1}`}
                  data-testid={`remove-evidence-${idx}`}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    color:
                      requiredEvidence.length <= 1
                        ? 'var(--text-dim)'
                        : 'var(--state-failure-fg)',
                    fontSize: '11px',
                    cursor: requiredEvidence.length <= 1 ? 'not-allowed' : 'pointer',
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* Requires Approval Checkbox */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
              marginTop: '4px',
              paddingTop: '16px',
              borderTop: '1px solid var(--border-color)',
              flexShrink: 0,
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
