import React, { useEffect, useState } from 'react'
import { api } from '../api/client.js'
import type {
  PromptLayerName,
  PromptPreviewResponse,
  TaskPromptResponse,
} from '../api/types.js'

export interface PromptManagerProps {
  readonly runId: string
  readonly taskId: string
  readonly taskState: string
}

interface DisplayLayer {
  readonly name: PromptLayerName
  readonly source: string
  readonly included: boolean
  readonly byteLength: number
  readonly text?: string | undefined
}

const CANONICAL_LAYERS: readonly PromptLayerName[] = [
  'GLOBAL',
  'PROJECT',
  'EXECUTION_CONTRACT',
  'TASK',
  'AGENT_ROLE',
  'RUNTIME_CONTEXT',
]

const LAYER_SOURCES: Record<PromptLayerName, string> = {
  GLOBAL: 'MANAGED_POLICY',
  PROJECT: 'PROJECT_INPUT',
  EXECUTION_CONTRACT: 'CONTRACT',
  TASK: 'TASK',
  AGENT_ROLE: 'MANAGED_POLICY',
  RUNTIME_CONTEXT: 'GENERATED_RUNTIME',
}

function parseLayerTexts(fullText: string): Record<string, string> {
  const sections: Record<string, string> = {}
  const regex = /# \[LAYER: ([A-Z_]+)\]\n([\s\S]*?)(?=(?:\n\n# \[LAYER:|$))/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(fullText)) !== null) {
    const layerName = match[1]
    const content = match[2]
    if (layerName && content !== undefined) {
      sections[layerName] = content.trim()
    }
  }
  return sections
}

export const PromptManager: React.FC<PromptManagerProps> = ({
  runId,
  taskId,
  taskState,
}) => {
  const [taskPrompt, setTaskPrompt] = useState<TaskPromptResponse | null>(null)
  const [preview, setPreview] = useState<PromptPreviewResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedLayers, setExpandedLayers] = useState<Record<string, boolean>>({
    GLOBAL: false,
    PROJECT: false,
    EXECUTION_CONTRACT: false,
    TASK: true,
    AGENT_ROLE: false,
    RUNTIME_CONTEXT: false,
  })
  const [isPanelOpen, setIsPanelOpen] = useState(true)

  useEffect(() => {
    let isCurrent = true
    setIsLoading(true)
    setError(null)
    setPreview(null)

    api
      .getTaskPrompt(runId, taskId)
      .then((data) => {
        if (isCurrent) {
          setTaskPrompt(data)
          setIsLoading(false)
        }
      })
      .catch((err) => {
        if (isCurrent) {
          setError(err instanceof Error ? err.message : 'Failed to load task prompt')
          setIsLoading(false)
        }
      })

    return () => {
      isCurrent = false
    }
  }, [runId, taskId, taskState])

  const handlePreview = async () => {
    setIsPreviewing(true)
    setError(null)
    try {
      const res = await api.previewPrompt({ runId, taskId })
      setPreview(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compile prompt preview')
    } finally {
      setIsPreviewing(false)
    }
  }

  const toggleLayer = (layerName: string) => {
    setExpandedLayers((prev) => ({
      ...prev,
      [layerName]: !prev[layerName],
    }))
  }

  // Determine active prompt data (authoritative compiled prompt or preview)
  const activePrompt = taskPrompt?.compiled && taskPrompt.prompt
    ? {
        sha256: taskPrompt.prompt.sha256,
        byteLength: taskPrompt.prompt.byteLength,
        compilerVersion: taskPrompt.prompt.compilerVersion,
        globalPolicyVersion: taskPrompt.prompt.globalPolicyVersion,
        roleTemplateVersion: taskPrompt.prompt.roleTemplateVersion,
        roleUsed: taskPrompt.prompt.roleUsed,
        compiledAt: taskPrompt.prompt.compiledAt,
        text: taskPrompt.prompt.text,
        isAuthoritative: true,
      }
    : preview
    ? {
        sha256: preview.sha256,
        byteLength: preview.byteLength,
        compilerVersion: preview.compilerVersion,
        globalPolicyVersion: preview.globalPolicyVersion,
        roleTemplateVersion: preview.roleTemplateVersion,
        roleUsed: preview.roleUsed,
        compiledAt: preview.compiledAt,
        text: preview.compiledPrompt,
        isAuthoritative: false,
      }
    : null

  const layerTexts = activePrompt ? parseLayerTexts(activePrompt.text) : {}

  const displayLayers: DisplayLayer[] = CANONICAL_LAYERS.map((name) => {
    const text = layerTexts[name]
    const included = text !== undefined && text.length > 0
    return {
      name,
      source: LAYER_SOURCES[name],
      included,
      byteLength: text ? new TextEncoder().encode(text).length : 0,
      text,
    }
  })

  const getSourceBadgeColor = (source: string) => {
    switch (source) {
      case 'MANAGED_POLICY':
        return { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.4)', text: '#60a5fa' }
      case 'PROJECT_INPUT':
        return { bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.4)', text: '#c084fc' }
      case 'CONTRACT':
        return { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.4)', text: '#34d399' }
      case 'TASK':
        return { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.4)', text: '#fbbf24' }
      case 'GENERATED_RUNTIME':
        return { bg: 'rgba(107, 114, 128, 0.15)', border: 'rgba(107, 114, 128, 0.4)', text: '#9ca3af' }
      default:
        return { bg: 'rgba(255, 255, 255, 0.05)', border: 'var(--border-color)', text: 'var(--text-muted)' }
    }
  }

  return (
    <div
      data-testid="prompt-manager"
      style={{
        backgroundColor: 'var(--bg-panel)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          backgroundColor: 'var(--bg-panel-elevated)',
          borderBottom: isPanelOpen ? '1px solid var(--border-color)' : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
        }}
        onClick={() => setIsPanelOpen(!isPanelOpen)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {isPanelOpen ? '▼' : '▶'}
          </span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.5px',
              color: 'var(--text-secondary)',
            }}
          >
            PROMPT MANAGER & CANONICAL COMPILATION
          </span>
          {activePrompt && (
            <span
              style={{
                fontSize: '10px',
                fontFamily: 'var(--font-mono)',
                padding: '2px 6px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: activePrompt.isAuthoritative
                  ? 'rgba(16, 185, 129, 0.15)'
                  : 'rgba(245, 158, 11, 0.15)',
                color: activePrompt.isAuthoritative
                  ? 'var(--state-success-fg)'
                  : 'var(--state-waiting-fg)',
                border: `1px solid ${
                  activePrompt.isAuthoritative
                    ? 'rgba(16, 185, 129, 0.3)'
                    : 'rgba(245, 158, 11, 0.3)'
                }`,
              }}
            >
              {activePrompt.isAuthoritative ? 'RECORDED EXECUTION PROMPT' : 'PREVIEW'}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            data-testid="preview-prompt-btn"
            onClick={(e) => {
              e.stopPropagation()
              void handlePreview()
            }}
            disabled={isPreviewing}
            style={{
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: 'var(--bg-app)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              cursor: isPreviewing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {isPreviewing ? 'Compiling...' : 'Preview Prompt'}
          </button>
        </div>
      </div>

      {/* Body */}
      {isPanelOpen && (
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {error && (
            <div
              data-testid="prompt-error"
              style={{
                padding: '10px 12px',
                backgroundColor: 'rgba(248, 113, 113, 0.1)',
                border: '1px solid var(--state-failure-border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--state-failure-fg)',
                fontSize: '11px',
              }}
            >
              {error}
            </div>
          )}

          {isLoading ? (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Loading prompt data...
            </div>
          ) : !activePrompt ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                This task has not executed yet. Click <strong>Preview Prompt</strong> to compile the canonical six-layer prompt with SHA-256 provenance.
              </div>
            </div>
          ) : (
            <>
              {/* Provenance Metadata Bar */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '10px',
                  padding: '12px',
                  backgroundColor: 'var(--bg-app)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  fontSize: '11px',
                }}
              >
                <div>
                  <div style={{ color: 'var(--text-muted)', marginBottom: '3px' }}>SHA-256 Hash</div>
                  <div
                    data-testid="prompt-hash"
                    title={activePrompt.sha256}
                    style={{
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '180px',
                      fontWeight: 600,
                    }}
                  >
                    {activePrompt.sha256.slice(0, 16)}...
                  </div>
                </div>

                <div>
                  <div style={{ color: 'var(--text-muted)', marginBottom: '3px' }}>Byte Length</div>
                  <div
                    data-testid="prompt-bytes"
                    style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 600 }}
                  >
                    {activePrompt.byteLength.toLocaleString()} B
                  </div>
                </div>

                <div>
                  <div style={{ color: 'var(--text-muted)', marginBottom: '3px' }}>Compiler Version</div>
                  <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                    v{activePrompt.compilerVersion}
                  </div>
                </div>

                <div>
                  <div style={{ color: 'var(--text-muted)', marginBottom: '3px' }}>Policy / Role Ver</div>
                  <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                    p:{activePrompt.globalPolicyVersion} / r:{activePrompt.roleTemplateVersion}
                  </div>
                </div>

                <div>
                  <div style={{ color: 'var(--text-muted)', marginBottom: '3px' }}>Role Used</div>
                  <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                    {activePrompt.roleUsed}
                  </div>
                </div>
              </div>

              {/* Six Canonical Layers */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--text-secondary)',
                    letterSpacing: '0.5px',
                  }}
                >
                  CANONICAL PROMPT LAYERS (IN EXECUTION ORDER)
                </div>

                {displayLayers.map((layer) => {
                  const isExpanded = expandedLayers[layer.name] ?? false
                  const badgeColor = getSourceBadgeColor(layer.source)

                  return (
                    <div
                      key={layer.name}
                      data-testid={`prompt-layer-${layer.name}`}
                      style={{
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--bg-panel-elevated)',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Layer Header */}
                      <div
                        onClick={() => toggleLayer(layer.name)}
                        style={{
                          padding: '8px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          userSelect: 'none',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                            {isExpanded ? '▼' : '▶'}
                          </span>
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '11px',
                              fontWeight: 700,
                              color: layer.included
                                ? 'var(--text-primary)'
                                : 'var(--text-muted)',
                            }}
                          >
                            {layer.name}
                          </span>
                          <span
                            style={{
                              fontSize: '9px',
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: 'var(--radius-sm)',
                              backgroundColor: badgeColor.bg,
                              border: `1px solid ${badgeColor.border}`,
                              color: badgeColor.text,
                            }}
                          >
                            {layer.source}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span
                            style={{
                              fontSize: '10px',
                              fontFamily: 'var(--font-mono)',
                              color: layer.included ? 'var(--text-muted)' : 'var(--text-dim)',
                            }}
                          >
                            {layer.included ? `${layer.byteLength} B` : 'OMITTED'}
                          </span>
                        </div>
                      </div>

                      {/* Layer Content */}
                      {isExpanded && (
                        <div
                          style={{
                            padding: '10px 12px',
                            borderTop: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-app)',
                          }}
                        >
                          {layer.included && layer.text ? (
                            <pre
                              style={{
                                margin: 0,
                                fontSize: '11px',
                                fontFamily: 'var(--font-mono)',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                color: 'var(--text-secondary)',
                                maxHeight: '240px',
                                overflowY: 'auto',
                                lineHeight: '1.45',
                              }}
                            >
                              {layer.text}
                            </pre>
                          ) : (
                            <div
                              style={{
                                fontSize: '11px',
                                color: 'var(--text-dim)',
                                fontStyle: 'italic',
                              }}
                            >
                              Layer omitted from this compilation (no input provided).
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
