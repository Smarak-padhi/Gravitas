import React, { useEffect, useState } from 'react'
import { api, GravitasApiError } from '../../api/client.js'
import type { AgentCapabilityItem, AgentDescriptor } from '../../api/types.js'

interface QualificationExperimentResult {
  experimentId: string
  title: string
  mandatory: boolean
  passed: boolean
  message?: string
  durationMs: number
}

interface QualificationEvidence {
  codexVersion: string
  qualifiedAt: string
  schemaVersion: number
  experiments: QualificationExperimentResult[]
  decision: 'APPROVED' | 'REJECTED' | 'INCONCLUSIVE'
  rejectionReason?: string
}

export const AgentRegistryView: React.FC = () => {
  const [agents, setAgents] = useState<readonly AgentDescriptor[]>([])
  const [capabilities, setCapabilities] = useState<readonly AgentCapabilityItem[]>([])
  const [codexQualification, setCodexQualification] = useState<QualificationEvidence | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    async function fetchRegistry() {
      try {
        setIsLoading(true)
        const [agentsData, capsData] = await Promise.all([
          api.listAgents(),
          api.listCapabilities(),
        ])
        if (isMounted) {
          setAgents(agentsData)
          setCapabilities(capsData)
          setError(null)
        }

        // Fetch Codex qualification evidence (404 = not yet qualified — not an error)
        try {
          const qualData = (await api.getAgentQualification('codex-worker')) as QualificationEvidence
          if (isMounted) {
            setCodexQualification(qualData)
          }
        } catch (qualErr) {
          if (!(qualErr instanceof GravitasApiError && qualErr.statusCode === 404)) {
            // Only ignore 404 — other errors are real
            console.warn('[AgentRegistryView] qualification fetch failed:', qualErr)
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load Agent Registry')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }
    void fetchRegistry()
    return () => {
      isMounted = false
    }
  }, [])

  const getStatusBadgeStyle = (status: AgentDescriptor['qualificationStatus']) => {
    switch (status) {
      case 'READY':
        return { bg: 'rgba(16, 185, 129, 0.15)', fg: '#10B981', border: '#10B981' }
      case 'INSTALLED':
        return { bg: 'rgba(56, 189, 248, 0.15)', fg: '#38BDF8', border: '#38BDF8' }
      case 'DEGRADED':
        return { bg: 'rgba(234, 179, 8, 0.15)', fg: '#EAB308', border: '#EAB308' }
      case 'UNQUALIFIED':
        return { bg: 'rgba(239, 68, 68, 0.15)', fg: '#EF4444', border: '#EF4444' }
      case 'DISABLED':
      default:
        return { bg: 'rgba(156, 163, 175, 0.15)', fg: '#9CA3AF', border: '#9CA3AF' }
    }
  }

  if (isLoading) {
    return (
      <div
        data-testid="agent-registry-loading"
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: '13px',
        }}
      >
        Loading Agent Registry V0...
      </div>
    )
  }

  if (error) {
    return (
      <div
        data-testid="agent-registry-error"
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--state-failure-fg)',
          fontSize: '13px',
          padding: '24px',
        }}
      >
        Failed to load agent registry: {error}
      </div>
    )
  }

  return (
    <div
      data-testid="agent-registry-view"
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        backgroundColor: 'var(--bg-app)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '16px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            CAPABILITY REGISTRY V0 · AGENT CATALOG
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            Provider-neutral capability verification and qualification authority. Role ≠ Provider.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span
            style={{
              fontSize: '11px',
              fontFamily: 'monospace',
              padding: '4px 10px',
              backgroundColor: 'var(--bg-panel)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-muted)',
            }}
          >
            {agents.length} Registered Agents · {capabilities.length} Vocabulary Tokens
          </span>
        </div>
      </div>

      {/* Kernel Invariant Banner */}
      <div
        style={{
          padding: '12px 16px',
          backgroundColor: 'rgba(56, 189, 248, 0.08)',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          borderRadius: 'var(--radius-md)',
          fontSize: '11px',
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
        }}
      >
        <strong style={{ color: '#38BDF8' }}>Kernel Security Invariant:</strong> Agents may declare and receive{' '}
        <code style={{ fontFamily: 'monospace' }}>git.clone</code>,{' '}
        <code style={{ fontFamily: 'monospace' }}>git.status</code>, and{' '}
        <code style={{ fontFamily: 'monospace' }}>git.diff</code> capabilities.{' '}
        <strong style={{ color: '#EF4444' }}>git.commit</strong> and{' '}
        <strong style={{ color: '#EF4444' }}>git.push</strong> are strictly forbidden from the capability vocabulary;
        repository mutations are materialized exclusively through the 4-Authority Golden Loop.
      </div>

      {/* Agent Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '16px',
        }}
      >
        {agents.map((agent) => {
          const badgeStyle = getStatusBadgeStyle(agent.qualificationStatus)
          const isCodex = agent.id.toLowerCase().includes('codex')
          return (
            <div
              key={agent.id}
              data-testid={`agent-card-${agent.id}`}
              style={{
                padding: '16px',
                backgroundColor: 'var(--bg-panel)',
                border: `1px solid ${isCodex ? '#EF4444' : 'var(--border-color)'}`,
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                position: 'relative',
              }}
            >
              {/* Card Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {agent.name}
                  </div>
                  <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                    ID: {agent.id}
                  </div>
                </div>
                <span
                  data-testid={`agent-status-${agent.id}`}
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-xs)',
                    backgroundColor: badgeStyle.bg,
                    color: badgeStyle.fg,
                    border: `1px solid ${badgeStyle.border}`,
                  }}
                >
                  {agent.qualificationStatus}
                </span>
              </div>

              {/* Provider & Role */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Provider:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{agent.provider}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Default Role:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{agent.defaultRole}</strong>
              </div>

              {/* Codex Qualification Panel */}
              {isCodex && (
                <div
                  data-testid="codex-disqualification-notice"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  {/* Status Banner */}
                  {codexQualification ? (
                    <div
                      data-testid="codex-qualification-evidence"
                      style={{
                        padding: '8px 10px',
                        backgroundColor:
                          codexQualification.decision === 'APPROVED'
                            ? 'rgba(16, 185, 129, 0.1)'
                            : 'rgba(239, 68, 68, 0.1)',
                        border: `1px solid ${codexQualification.decision === 'APPROVED' ? 'rgba(16,185,129,0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '10px',
                        color: codexQualification.decision === 'APPROVED' ? '#10B981' : '#EF4444',
                        lineHeight: 1.4,
                      }}
                    >
                      {codexQualification.decision === 'APPROVED' ? '✓' : '⚠'}{' '}
                      <strong>Qualification Decision: {codexQualification.decision}</strong>
                      {codexQualification.rejectionReason && (
                        <div style={{ marginTop: '4px', opacity: 0.85 }}>
                          {codexQualification.rejectionReason}
                        </div>
                      )}
                      <div style={{ marginTop: '4px', opacity: 0.7 }}>
                        Version: <code style={{ fontFamily: 'monospace' }}>{codexQualification.codexVersion}</code> ·
                        Run: {new Date(codexQualification.qualifiedAt).toLocaleString()}
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: '8px 10px',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '10px',
                        color: '#EF4444',
                        lineHeight: 1.4,
                      }}
                    >
                      ⚠ <strong>Production Access Disallowed:</strong> Codex is cataloged but marked{' '}
                      <code style={{ fontFamily: 'monospace' }}>UNQUALIFIED</code>. Run{' '}
                      <code style={{ fontFamily: 'monospace' }}>npm run qualify:codex</code> to execute the
                      adversarial qualification suite.
                    </div>
                  )}

                  {/* Experiment Results Table */}
                  {codexQualification && codexQualification.experiments.length > 0 && (
                    <div
                      data-testid="codex-qualification-experiments"
                      style={{
                        backgroundColor: 'var(--bg-app)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          padding: '6px 10px',
                          fontSize: '10px',
                          fontWeight: 600,
                          color: 'var(--text-muted)',
                          borderBottom: '1px solid var(--border-subtle)',
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span>
                          Qualification Experiments ({codexQualification.experiments.filter((e) => e.passed).length}/
                          {codexQualification.experiments.length} passed)
                        </span>
                        <span>
                          {codexQualification.experiments.filter((e) => e.mandatory && !e.passed).length} mandatory
                          failures
                        </span>
                      </div>
                      {codexQualification.experiments.map((exp) => (
                        <div
                          key={exp.experimentId}
                          data-testid={`codex-experiment-${exp.experimentId}`}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '6px',
                            padding: '4px 10px',
                            borderBottom: '1px solid var(--border-subtle)',
                            fontSize: '10px',
                          }}
                        >
                          <span
                            style={{
                              color: exp.passed ? '#10B981' : exp.mandatory ? '#EF4444' : '#EAB308',
                              flexShrink: 0,
                              width: '10px',
                            }}
                          >
                            {exp.passed ? '✓' : '✗'}
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                              {exp.experimentId}
                            </span>
                            {!exp.passed && exp.message && (
                              <div
                                style={{
                                  color: 'var(--text-muted)',
                                  marginTop: '1px',
                                  wordBreak: 'break-word',
                                }}
                              >
                                {exp.message}
                              </div>
                            )}
                          </div>
                          <span
                            style={{
                              fontSize: '9px',
                              color: 'var(--text-muted)',
                              flexShrink: 0,
                            }}
                          >
                            {exp.mandatory ? 'REQ' : 'OPT'}
                          </span>
                          <span
                            style={{
                              fontSize: '9px',
                              color: 'var(--text-muted)',
                              flexShrink: 0,
                            }}
                          >
                            {exp.durationMs}ms
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Qualification Notes (non-Codex agents) */}
              {Boolean(agent.qualificationNotes) && !isCodex && (
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {agent.qualificationNotes}
                </div>
              )}


              {/* Capabilities List */}
              <div>
                <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Verified Capabilities ({agent.capabilities.length}):
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {agent.capabilities.map((cap) => (
                    <span
                      key={cap}
                      style={{
                        fontSize: '10px',
                        fontFamily: 'monospace',
                        padding: '1px 6px',
                        backgroundColor: 'var(--bg-app)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        color: cap.startsWith('browser') ? '#0D9488' : 'var(--text-primary)',
                      }}
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Vocabulary Reference Table */}
      <div
        style={{
          padding: '16px',
          backgroundColor: 'var(--bg-panel)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
          Authoritative Capability Vocabulary V0
        </div>
        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>
          Typed capability grants strictly required by the Bounded Scheduler before task dispatch.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
          {capabilities.map((cap) => {
            const capId = typeof cap === 'string' ? cap : cap.id
            const capDesc = typeof cap === 'string' ? '' : cap.description
            return (
              <span
                key={capId}
                title={capDesc}
                style={{
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  padding: '3px 8px',
                  backgroundColor: 'var(--bg-app)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                }}
              >
                {capId}
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}
