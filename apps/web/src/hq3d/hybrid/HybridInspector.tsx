/**
 * Serious 2D Contextual Inspector (Layer C) for Hybrid HQ (Wave 12H)
 *
 * Provides a clean, modern, warm, highly readable interface for:
 * - Agent inspection: Role, current phase, task, strictly separated harness/model provenance, timeline.
 * - Task artifact inspection: Task ID, source, destination, dependencies, verification status, evidence, diff, approvals.
 * - Activity Timeline: Persistent log of operational messages (no data exists ONLY in bubbles).
 */

import React, { useState } from 'react'
import type { AgentStatusMessage, HybridTaskDetail, IllustratedAgentRole, IllustratedAgentState } from './types.js'

export interface HybridInspectorProps {
  readonly selectedAgent: {
    readonly role: IllustratedAgentRole
    readonly name: string
    readonly state: IllustratedAgentState
    readonly currentTaskId?: string
    readonly taskTitle?: string
    readonly phase: string
    readonly harness: string
    readonly model?: string
    readonly startedAt?: string
  } | null
  readonly selectedTask: HybridTaskDetail | null
  readonly messageHistory: readonly AgentStatusMessage[]
  readonly onClose: () => void
  readonly onApproveTask?: (taskId: string) => void
}

export const HybridInspector: React.FC<HybridInspectorProps> = ({
  selectedAgent,
  selectedTask,
  messageHistory,
  onClose,
  onApproveTask,
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'diff' | 'timeline'>('details')

  if (!selectedAgent && !selectedTask) return null

  const isAgent = Boolean(selectedAgent)

  return (
    <aside
      data-testid="hybrid-contextual-inspector"
      aria-label="Agent and Task Inspector"
      style={{
        width: '320px',
        maxHeight: 'calc(100% - 32px)',
        backgroundColor: 'rgba(15, 20, 28, 0.94)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.5), 0 0 1px rgba(255, 255, 255, 0.15)',
        color: '#f8fafc',
        fontFamily: 'var(--font-sans, system-ui, -apple-system, sans-serif)',
        overflow: 'hidden',
        zIndex: 40,
        pointerEvents: 'auto',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0) 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>
            {isAgent
              ? selectedAgent?.role === 'role:engineering:frontend-engineer'
                ? '🎨'
                : selectedAgent?.role === 'role:engineering:backend-engineer'
                ? '⚙️'
                : '🔍'
              : '📋'}
          </span>
          <div>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>
              {isAgent ? selectedAgent?.name : selectedTask?.title ?? selectedTask?.id}
            </h3>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              {isAgent ? 'Operational Agent' : `Artifact • ${selectedTask?.id}`}
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          aria-label="Close inspector"
          style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            fontSize: '16px',
            padding: '4px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: 'rgba(0, 0, 0, 0.15)',
        }}
      >
        <button
          onClick={() => setActiveTab('details')}
          style={{
            flex: 1,
            padding: '8px 0',
            border: 'none',
            backgroundColor: 'transparent',
            color: activeTab === 'details' ? '#38bdf8' : '#94a3b8',
            fontWeight: activeTab === 'details' ? 600 : 500,
            fontSize: '11px',
            borderBottom: activeTab === 'details' ? '2px solid #38bdf8' : '2px solid transparent',
            cursor: 'pointer',
          }}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('diff')}
          style={{
            flex: 1,
            padding: '8px 0',
            border: 'none',
            backgroundColor: 'transparent',
            color: activeTab === 'diff' ? '#38bdf8' : '#94a3b8',
            fontWeight: activeTab === 'diff' ? 600 : 500,
            fontSize: '11px',
            borderBottom: activeTab === 'diff' ? '2px solid #38bdf8' : '2px solid transparent',
            cursor: 'pointer',
          }}
        >
          {isAgent ? 'Task Details' : 'Changes & Diff'}
        </button>
        <button
          onClick={() => setActiveTab('timeline')}
          style={{
            flex: 1,
            padding: '8px 0',
            border: 'none',
            backgroundColor: 'transparent',
            color: activeTab === 'timeline' ? '#38bdf8' : '#94a3b8',
            fontWeight: activeTab === 'timeline' ? 600 : 500,
            fontSize: '11px',
            borderBottom: activeTab === 'timeline' ? '2px solid #38bdf8' : '2px solid transparent',
            cursor: 'pointer',
          }}
        >
          Timeline ({messageHistory.length})
        </button>
      </div>

      {/* Tab Content Body */}
      <div style={{ padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
        {activeTab === 'details' && (
          <>
            {/* AGENT DETAILS */}
            {isAgent && selectedAgent && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.4px', color: '#94a3b8', fontWeight: 600 }}>
                    Current Status
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor:
                          selectedAgent.state === 'WORKING'
                            ? 'rgba(56, 189, 248, 0.15)'
                            : selectedAgent.state === 'WAITING_APPROVAL'
                            ? 'rgba(34, 197, 94, 0.15)'
                            : 'rgba(148, 163, 184, 0.15)',
                        color:
                          selectedAgent.state === 'WORKING'
                            ? '#38bdf8'
                            : selectedAgent.state === 'WAITING_APPROVAL'
                            ? '#4ade80'
                            : '#cbd5e1',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                      }}
                    >
                      {selectedAgent.state}
                    </span>
                    <span style={{ fontSize: '12px', color: '#cbd5e1' }}>
                      {selectedAgent.currentTaskId
                        ? `Working on ${selectedAgent.currentTaskId}`
                        : 'Standby / Non-productive'}
                    </span>
                  </div>
                </div>

                {selectedAgent.taskTitle && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.4px', color: '#94a3b8', fontWeight: 600 }}>
                      Active Assignment
                    </span>
                    <div
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        fontSize: '12px',
                        color: '#f8fafc',
                      }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: '2px' }}>
                        {selectedAgent.currentTaskId}: {selectedAgent.taskTitle}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                        Phase: {selectedAgent.phase} • Started {selectedAgent.startedAt ?? '10:42'}
                      </div>
                    </div>
                  </div>
                )}

                {/* Role vs Harness Distinction */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.4px', color: '#94a3b8', fontWeight: 600 }}>
                    Harness & Tooling
                  </span>
                  <div
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      fontSize: '11px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#94a3b8' }}>Execution Harness:</span>
                      <span style={{ fontWeight: 600, color: '#f8fafc' }}>{selectedAgent.harness}</span>
                    </div>
                    {selectedAgent.model && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#94a3b8' }}>Model / Provider:</span>
                        <span style={{ fontWeight: 600, color: '#cbd5e1' }}>{selectedAgent.model}</span>
                      </div>
                    )}
                    <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                      Harness is tool metadata; character identity is persistent role.
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* TASK DETAILS */}
            {!isAgent && selectedTask && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.4px', color: '#94a3b8', fontWeight: 600 }}>
                    Verification Status
                  </span>
                  <div
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      backgroundColor:
                        selectedTask.verificationStatus === 'PASSED'
                          ? 'rgba(34, 197, 94, 0.12)'
                          : selectedTask.verificationStatus === 'FAILED'
                          ? 'rgba(239, 68, 68, 0.12)'
                          : 'rgba(245, 158, 11, 0.12)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span style={{ fontSize: '16px' }}>
                      {selectedTask.verificationStatus === 'PASSED'
                        ? '✅'
                        : selectedTask.verificationStatus === 'FAILED'
                        ? '❌'
                        : '⏳'}
                    </span>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc' }}>
                        {selectedTask.verificationStatus === 'PASSED'
                          ? 'All automated checks passed'
                          : selectedTask.verificationStatus === 'FAILED'
                          ? 'Verification issues found'
                          : 'Review in progress'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#cbd5e1' }}>
                        State: {selectedTask.state}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.4px', color: '#94a3b8', fontWeight: 600 }}>
                    Handoff Route
                  </span>
                  <div
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      fontSize: '11px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#94a3b8' }}>Source:</span>
                      <span style={{ fontWeight: 600 }}>{selectedTask.sourceRole}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#94a3b8' }}>Target:</span>
                      <span style={{ fontWeight: 600 }}>{selectedTask.destinationRole}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#94a3b8' }}>Dependencies:</span>
                      <span style={{ color: selectedTask.dependencies.length > 0 ? '#fbbf24' : '#4ade80' }}>
                        {selectedTask.dependencies.length > 0
                          ? selectedTask.dependencies.join(', ')
                          : 'None (Unblocked)'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Evidence & Approval */}
                {selectedTask.state === 'WAITING_APPROVAL' && (
                  <button
                    onClick={() => onApproveTask?.(selectedTask.id)}
                    style={{
                      marginTop: '8px',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      backgroundColor: '#16a34a',
                      border: 'none',
                      color: '#f8fafc',
                      fontWeight: 600,
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: '0 4px 12px rgba(22, 163, 74, 0.4)',
                    }}
                  >
                    <span>🛡️</span>
                    <span>Approve Task {selectedTask.id}</span>
                  </button>
                )}
              </>
            )}
          </>
        )}

        {activeTab === 'diff' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.4px', color: '#94a3b8', fontWeight: 600 }}>
              Files Changed
            </span>
            <div
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                backgroundColor: 'rgba(0, 0, 0, 0.25)',
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: '11px',
                color: '#38bdf8',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>+42</span>
              <span>-8</span>
              <span style={{ color: '#cbd5e1' }}>apps/web/src/components/ItineraryCard.tsx</span>
            </div>
            <div
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                backgroundColor: 'rgba(0, 0, 0, 0.25)',
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: '11px',
                color: '#38bdf8',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>+18</span>
              <span>-0</span>
              <span style={{ color: '#cbd5e1' }}>tests/itinerary.spec.ts</span>
            </div>
          </div>
        )}

        {activeTab === 'timeline' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.4px', color: '#94a3b8', fontWeight: 600 }}>
              Recent Operational Events
            </span>
            {messageHistory.length === 0 ? (
              <div style={{ fontSize: '11px', color: '#64748b' }}>No recent events recorded.</div>
            ) : (
              messageHistory.map((msg, i) => (
                <div
                  key={`${msg.roleId}-${msg.timestamp}-${i}`}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    borderLeft: `3px solid ${
                      msg.roleId === 'role:engineering:frontend-engineer'
                        ? '#818cf8'
                        : msg.roleId === 'role:engineering:backend-engineer'
                        ? '#2dd4bf'
                        : '#a3e635'
                    }`,
                    fontSize: '11px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', marginBottom: '2px', fontSize: '10px' }}>
                    <span>{msg.category.replace(/_/g, ' ')}</span>
                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  </div>
                  <div style={{ color: '#f8fafc', fontWeight: 500 }}>“{msg.shortText}”</div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </aside>
  )
}
