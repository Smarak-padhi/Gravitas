import React, { useState } from 'react'
import type {
  AcceptanceCriterionInput,
  CreateRunInput,
  ProjectPromptContext,
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
  readonly projectName?: string | undefined
  readonly projectSummary?: string | undefined
  readonly technicalConstraints?: string | undefined
  readonly projectInstructions?: string | undefined
  readonly mode?: 'SINGLE' | 'DAG' | undefined
  readonly maxConcurrency?: number | undefined
  readonly dagTasksJson?: string | undefined
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

  const projectContext: ProjectPromptContext = {
    ...(state.projectName?.trim() ? { projectName: state.projectName.trim() } : {}),
    ...(state.projectSummary?.trim() ? { projectSummary: state.projectSummary.trim() } : {}),
    ...(state.technicalConstraints?.trim() ? { technicalConstraints: state.technicalConstraints.trim() } : {}),
    ...(state.projectInstructions?.trim() ? { projectInstructions: state.projectInstructions.trim() } : {}),
  }

  let parsedTasks: any[] = []
  if (state.mode === 'DAG') {
    if (!state.dagTasksJson?.trim()) {
      return { valid: false, error: 'DAG tasks JSON is required in Multi-Task DAG mode.' }
    }
    try {
      parsedTasks = JSON.parse(state.dagTasksJson)
      if (!Array.isArray(parsedTasks) || parsedTasks.length === 0) {
        return { valid: false, error: 'DAG tasks must be a non-empty JSON array.' }
      }
      for (let i = 0; i < parsedTasks.length; i++) {
        const t = parsedTasks[i]
        if (!t || !t.id || !t.title || !t.objective) {
          return { valid: false, error: `DAG task #${i + 1} must include 'id', 'title', and 'objective'.` }
        }
      }
    } catch {
      return { valid: false, error: 'Invalid JSON syntax in DAG tasks.' }
    }
  }

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
      ...(Object.keys(projectContext).length > 0 ? { projectContext } : {}),
      ...(state.mode === 'DAG'
        ? {
            tasks: parsedTasks,
            maxConcurrency: state.maxConcurrency ?? 2,
          }
        : {}),
    },
  }
}

const LINEAR_PRESET = JSON.stringify(
  [
    {
      id: 'task-1',
      title: 'Step 1: Core Implementation',
      objective: 'Implement base functionality in src/math.js',
      dependencies: [],
      requiresApproval: true,
    },
    {
      id: 'task-2',
      title: 'Step 2: Verification and Polish',
      objective: 'Add verification test in test/math.test.js',
      dependencies: ['task-1'],
      requiresApproval: true,
    },
  ],
  null,
  2
)

const DIAMOND_PRESET = JSON.stringify(
  [
    {
      id: 'task-root',
      title: 'Root: Foundation',
      objective: 'Create foundation files',
      dependencies: [],
      requiresApproval: true,
    },
    {
      id: 'task-branch-a',
      title: 'Branch A: Feature Alpha',
      objective: 'Implement Alpha in src/alpha.js',
      dependencies: ['task-root'],
      requiresApproval: true,
    },
    {
      id: 'task-branch-b',
      title: 'Branch B: Feature Beta',
      objective: 'Implement Beta in src/beta.js',
      dependencies: ['task-root'],
      requiresApproval: true,
    },
    {
      id: 'task-join',
      title: 'Join: Integration',
      objective: 'Compose and integrate Alpha and Beta',
      dependencies: ['task-branch-a', 'task-branch-b'],
      requiresApproval: true,
    },
  ],
  null,
  2
)

const FANOUT_PRESET = JSON.stringify(
  [
    {
      id: 'task-a',
      title: 'Worker A: Module 1',
      objective: 'Build module 1',
      dependencies: [],
      requiresApproval: true,
    },
    {
      id: 'task-b',
      title: 'Worker B: Module 2',
      objective: 'Build module 2',
      dependencies: [],
      requiresApproval: true,
    },
  ],
  null,
  2
)

export const GoalComposer: React.FC<GoalComposerProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}) => {
  const [composerMode, setComposerMode] = useState<'SINGLE' | 'DAG'>('SINGLE')
  const [maxConcurrency, setMaxConcurrency] = useState<number>(2)
  const [dagTasksJson, setDagTasksJson] = useState<string>(LINEAR_PRESET)

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

  const [projectName, setProjectName] = useState('')
  const [projectSummary, setProjectSummary] = useState('')
  const [technicalConstraints, setTechnicalConstraints] = useState('')
  const [projectInstructions, setProjectInstructions] = useState('')
  const [showProjectContext, setShowProjectContext] = useState(false)

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
      projectName,
      projectSummary,
      technicalConstraints,
      projectInstructions,
      mode: composerMode,
      maxConcurrency,
      dagTasksJson,
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

        {/* Mode Selector Tabs */}
        <div
          style={{
            padding: '8px 20px',
            backgroundColor: 'var(--bg-panel-subtle)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            gap: '8px',
          }}
        >
          <button
            type="button"
            data-testid="composer-tab-single"
            onClick={() => setComposerMode('SINGLE')}
            style={{
              padding: '4px 12px',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              borderRadius: 'var(--radius-sm)',
              border:
                composerMode === 'SINGLE'
                  ? '1px solid var(--accent-primary)'
                  : '1px solid var(--border-subtle)',
              backgroundColor:
                composerMode === 'SINGLE' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              color: composerMode === 'SINGLE' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            Single Goal (Golden Loop)
          </button>
          <button
            type="button"
            data-testid="composer-tab-dag"
            onClick={() => setComposerMode('DAG')}
            style={{
              padding: '4px 12px',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              borderRadius: 'var(--radius-sm)',
              border:
                composerMode === 'DAG'
                  ? '1px solid var(--accent-primary)'
                  : '1px solid var(--border-subtle)',
              backgroundColor:
                composerMode === 'DAG' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              color: composerMode === 'DAG' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            Multi-Task DAG (Wave 8)
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

          {/* Multi-Task DAG Section */}
          {composerMode === 'DAG' && (
            <div
              style={{
                padding: '12px 14px',
                backgroundColor: 'var(--bg-panel-elevated)',
                border: '1px solid var(--border-subtle)',
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
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    color: 'var(--accent-primary)',
                  }}
                >
                  DAG TASK DEFINITIONS (JSON)
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <label
                    htmlFor="max-concurrency-input"
                    style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}
                  >
                    CONCURRENCY LIMIT:
                  </label>
                  <input
                    id="max-concurrency-input"
                    type="number"
                    min={1}
                    max={8}
                    value={maxConcurrency}
                    onChange={(e) => setMaxConcurrency(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    style={{
                      width: '45px',
                      padding: '2px 4px',
                      fontSize: '11px',
                      fontFamily: 'var(--font-mono)',
                      backgroundColor: 'var(--bg-app)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-xs)',
                      color: 'var(--text-primary)',
                      textAlign: 'center',
                    }}
                  />
                </div>
              </div>

              {/* Template Presets */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  PRESETS:
                </span>
                <button
                  type="button"
                  data-testid="composer-preset-linear"
                  onClick={() => {
                    setDagTasksJson(LINEAR_PRESET)
                    setMaxConcurrency(2)
                  }}
                  style={{
                    fontSize: '10px',
                    fontFamily: 'var(--font-mono)',
                    padding: '2px 8px',
                    backgroundColor: 'var(--bg-panel)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-xs)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  Linear (2-step)
                </button>
                <button
                  type="button"
                  data-testid="composer-preset-diamond"
                  onClick={() => {
                    setDagTasksJson(DIAMOND_PRESET)
                    setMaxConcurrency(2)
                  }}
                  style={{
                    fontSize: '10px',
                    fontFamily: 'var(--font-mono)',
                    padding: '2px 8px',
                    backgroundColor: 'var(--bg-panel)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-xs)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  Diamond (4-step)
                </button>
                <button
                  type="button"
                  data-testid="composer-preset-fanout"
                  onClick={() => {
                    setDagTasksJson(FANOUT_PRESET)
                    setMaxConcurrency(3)
                  }}
                  style={{
                    fontSize: '10px',
                    fontFamily: 'var(--font-mono)',
                    padding: '2px 8px',
                    backgroundColor: 'var(--bg-panel)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-xs)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  Fan-Out (Parallel)
                </button>
              </div>

              <textarea
                data-testid="composer-dag-json"
                value={dagTasksJson}
                onChange={(e) => setDagTasksJson(e.target.value)}
                rows={6}
                placeholder="JSON array of task definitions"
                style={{
                  padding: '8px 10px',
                  backgroundColor: 'var(--bg-app)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  resize: 'vertical',
                }}
              />
            </div>
          )}

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

          {/* Project Context (Prompt Guidance) */}
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
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
              }}
              onClick={() => setShowProjectContext(!showProjectContext)}
              data-testid="project-context-toggle"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {showProjectContext ? '▼' : '▶'}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.5px',
                    color: 'var(--text-secondary)',
                  }}
                >
                  PROJECT CONTEXT (OPTIONAL PROMPT GUIDANCE)
                </span>
              </div>
              <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                {showProjectContext ? 'Collapse' : 'Expand'}
              </span>
            </div>

            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Explicit guidance injected into the compiled prompt's <code>PROJECT</code> layer. Never enter secrets or API keys.
            </div>

            {showProjectContext && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label
                    htmlFor="composer-project-name"
                    style={{ fontSize: '11px', color: 'var(--text-secondary)' }}
                  >
                    Project Name
                  </label>
                  <input
                    id="composer-project-name"
                    data-testid="composer-project-name"
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="e.g. Gravitas"
                    style={{
                      padding: '6px 8px',
                      backgroundColor: 'var(--bg-app)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      fontSize: '11px',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label
                    htmlFor="composer-project-summary"
                    style={{ fontSize: '11px', color: 'var(--text-secondary)' }}
                  >
                    Project Summary
                  </label>
                  <input
                    id="composer-project-summary"
                    data-testid="composer-project-summary"
                    type="text"
                    value={projectSummary}
                    onChange={(e) => setProjectSummary(e.target.value)}
                    placeholder="e.g. Local-first multi-agent orchestration platform"
                    style={{
                      padding: '6px 8px',
                      backgroundColor: 'var(--bg-app)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      fontSize: '11px',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label
                    htmlFor="composer-technical-constraints"
                    style={{ fontSize: '11px', color: 'var(--text-secondary)' }}
                  >
                    Technical Constraints
                  </label>
                  <input
                    id="composer-technical-constraints"
                    data-testid="composer-technical-constraints"
                    type="text"
                    value={technicalConstraints}
                    onChange={(e) => setTechnicalConstraints(e.target.value)}
                    placeholder="e.g. TypeScript strict mode, ESM only, zero network calls"
                    style={{
                      padding: '6px 8px',
                      backgroundColor: 'var(--bg-app)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      fontSize: '11px',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label
                    htmlFor="composer-project-instructions"
                    style={{ fontSize: '11px', color: 'var(--text-secondary)' }}
                  >
                    Project Instructions
                  </label>
                  <textarea
                    id="composer-project-instructions"
                    data-testid="composer-project-instructions"
                    value={projectInstructions}
                    onChange={(e) => setProjectInstructions(e.target.value)}
                    placeholder="e.g. Adhere to existing code formatting and error envelope conventions."
                    rows={2}
                    style={{
                      padding: '6px 8px',
                      backgroundColor: 'var(--bg-app)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      fontSize: '11px',
                      resize: 'vertical',
                    }}
                  />
                </div>
              </div>
            )}
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
