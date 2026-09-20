import React from 'react'

export interface WorkPacketData {
  readonly taskId: string
  readonly taskTitle: string
  readonly workerId: string
  readonly workerName: string
  readonly branchName?: string | undefined
  readonly promptHash?: string | undefined
  readonly verificationPassed?: boolean | undefined
  readonly scopeCompliant?: boolean | undefined
  readonly diffBytes?: number | undefined
  readonly operatorApproved?: boolean | undefined
  readonly operatorReviewer?: string | undefined
  readonly stage: 'CLAIM' | 'VERIFYING' | 'WAITING_APPROVAL' | 'SEALED' | 'FAILED'
  readonly failureReason?: string | undefined
}

export interface WorkPacketProps {
  readonly packet: WorkPacketData
  readonly isSelected?: boolean | undefined
  readonly onClick?: () => void
  readonly onApproveResult?: () => void
  readonly onInspectDiff?: () => void
  readonly isActing?: boolean | undefined
  readonly compact?: boolean | undefined
}

export const WorkPacket: React.FC<WorkPacketProps> = ({
  packet,
  isSelected = false,
  onClick,
  onApproveResult,
  onInspectDiff,
  isActing = false,
  compact = false,
}) => {
  const isWaitingApproval = packet.stage === 'WAITING_APPROVAL'
  const isSealed = packet.stage === 'SEALED'
  const isFailed = packet.stage === 'FAILED'

  if (compact) {
    return (
      <div
        data-testid={`work-packet-compact-${packet.taskId}`}
        onClick={onClick}
        title={`Task Work Packet: ${packet.taskId} - ${packet.taskTitle}`}
        style={{
          padding: '6px 10px',
          backgroundColor: '#FFFDF9',
          border: `1.5px solid ${
            isWaitingApproval
              ? 'var(--hq-mineral-amber, #B45309)'
              : isSealed
                ? 'var(--hq-mineral-sage, #3D7A68)'
                : isFailed
                  ? 'var(--hq-mineral-crimson, #B91C1C)'
                  : 'var(--hq-border-subtle, #E3DFD5)'
          }`,
          borderRadius: '4px',
          boxShadow: isWaitingApproval
            ? '0 2px 8px rgba(180, 83, 9, 0.2)'
            : '0 1px 3px rgba(60, 50, 40, 0.08)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: isWaitingApproval ? 'attentionPulse 2s ease-in-out infinite' : 'none',
        }}
      >
        <span style={{ fontSize: '14px' }}>📁</span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--hq-text-primary, #1C1E21)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {packet.taskId}
          </div>
          <div
            style={{
              fontSize: '10px',
              color: 'var(--hq-text-muted, #848B98)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {packet.taskTitle}
          </div>
        </div>
        {isSealed && (
          <span
            style={{
              fontSize: '10px',
              fontWeight: 800,
              color: 'var(--hq-mineral-sage, #3D7A68)',
              backgroundColor: 'var(--hq-mineral-sage-bg, #EBF5F1)',
              padding: '2px 5px',
              borderRadius: '3px',
              border: '1px solid var(--hq-mineral-sage-border, #A3D4C4)',
            }}
          >
            SEALED
          </span>
        )}
        {isWaitingApproval && (
          <span
            style={{
              fontSize: '10px',
              fontWeight: 800,
              color: 'var(--hq-mineral-amber, #B45309)',
              backgroundColor: 'var(--hq-mineral-amber-bg, #FEF7ED)',
              padding: '2px 5px',
              borderRadius: '3px',
              border: '1px solid var(--hq-mineral-amber-border, #FCD34D)',
            }}
          >
            SEAL REQ
          </span>
        )}
      </div>
    )
  }

  return (
    <div
      data-testid={`work-packet-${packet.taskId}`}
      onClick={onClick}
      style={{
        backgroundColor: '#FFFDF9',
        border: `1.5px solid ${
          isWaitingApproval
            ? 'var(--hq-mineral-amber, #B45309)'
            : isSealed
              ? 'var(--hq-mineral-sage, #3D7A68)'
              : isFailed
                ? 'var(--hq-mineral-crimson, #B91C1C)'
                : isSelected
                  ? 'var(--hq-mineral-blue, #2B59C3)'
                  : 'var(--hq-border-strong, #C8C2B4)'
        }`,
        borderRadius: '6px',
        padding: '16px',
        boxShadow: isWaitingApproval
          ? '0 6px 16px rgba(180, 83, 9, 0.22)'
          : 'var(--hq-shadow-tactile)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        position: 'relative',
        transition: 'all 0.2s cubic-bezier(0.2, 0, 0, 1)',
        animation: isWaitingApproval ? 'attentionPulse 2.4s ease-in-out infinite' : 'none',
      }}
    >
      {/* Manila Folder Tab Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--hq-border-subtle, #E3DFD5)',
          paddingBottom: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>📂</span>
          <div>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 800,
                color: 'var(--hq-text-primary, #1C1E21)',
                letterSpacing: '0.2px',
              }}
            >
              CUSTODY PACKET · [{packet.taskId}]
            </div>
            <div style={{ fontSize: '11px', color: 'var(--hq-text-secondary, #555B66)' }}>
              {packet.taskTitle}
            </div>
          </div>
        </div>

        {/* Physical Wax Seal Stamp Visual */}
        {isSealed && (
          <div
            data-testid="wax-seal-approved"
            style={{
              padding: '4px 10px',
              borderRadius: '20px',
              backgroundColor: '#15803D',
              color: '#FFFFFF',
              fontSize: '11px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              boxShadow: '0 2px 6px rgba(21, 128, 61, 0.35)',
              animation: 'sealStamp 0.35s cubic-bezier(0.2, 0, 0, 1)',
            }}
          >
            <span>🛡️</span>
            <span>SEALED RESULT</span>
          </div>
        )}

        {isWaitingApproval && (
          <div
            data-testid="wax-seal-pending"
            style={{
              padding: '4px 10px',
              borderRadius: '20px',
              backgroundColor: 'var(--hq-mineral-amber, #B45309)',
              color: '#FFFFFF',
              fontSize: '11px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              animation: 'waxGlow 2s ease-in-out infinite',
            }}
          >
            <span>🖋️</span>
            <span>AWAITING SEAL</span>
          </div>
        )}

        {isFailed && (
          <div
            data-testid="seal-failed"
            style={{
              padding: '4px 10px',
              borderRadius: '20px',
              backgroundColor: 'var(--hq-mineral-crimson, #B91C1C)',
              color: '#FFFFFF',
              fontSize: '11px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <span>✕</span>
            <span>REJECTED</span>
          </div>
        )}
      </div>

      {/* SECTION 1: WORKER CLAIM (NON-AUTHORITATIVE) */}
      <div
        style={{
          padding: '10px 12px',
          borderRadius: '4px',
          backgroundColor: '#F8FAFC',
          border: '1px solid #E2E8F0',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '10px', fontWeight: 800, color: '#475569', letterSpacing: '0.4px' }}>
            SECTION 1 · WORKER CLAIM
          </span>
          <span
            style={{
              fontSize: '9px',
              fontWeight: 700,
              color: '#64748B',
              backgroundColor: '#E2E8F0',
              padding: '1px 5px',
              borderRadius: '3px',
            }}
          >
            NON-AUTHORITATIVE
          </span>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--hq-text-secondary, #555B66)' }}>
          Assigned Worker: <strong style={{ color: 'var(--hq-text-primary, #1C1E21)' }}>{packet.workerName}</strong>
          {packet.branchName && (
            <span> · Branch: <code style={{ fontFamily: 'var(--font-mono)', fontSize: '10px' }}>{packet.branchName}</code></span>
          )}
        </div>
      </div>

      {/* SECTION 2: VERIFIED EVIDENCE (AUTHORITATIVE PROOF) */}
      <div
        style={{
          padding: '10px 12px',
          borderRadius: '4px',
          backgroundColor: packet.verificationPassed ? 'var(--hq-mineral-sage-bg, #EBF5F1)' : '#FAF5FF',
          border: `1px solid ${packet.verificationPassed ? 'var(--hq-mineral-sage-border, #A3D4C4)' : '#E9D8FD'}`,
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 800,
              color: packet.verificationPassed ? 'var(--hq-mineral-sage, #3D7A68)' : 'var(--hq-mineral-iris, #6B46C1)',
              letterSpacing: '0.4px',
            }}
          >
            SECTION 2 · INDEPENDENT VERIFICATION EVIDENCE
          </span>
          <span
            style={{
              fontSize: '9px',
              fontWeight: 700,
              color: packet.verificationPassed ? '#065F46' : '#5B21B6',
              backgroundColor: packet.verificationPassed ? '#D1FAE5' : '#EDE9FE',
              padding: '1px 5px',
              borderRadius: '3px',
            }}
          >
            AUTHORITATIVE GATE
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', fontSize: '11px' }}>
          <div>
            <span style={{ color: 'var(--hq-text-secondary, #555B66)' }}>Test Suite: </span>
            <strong style={{ color: packet.verificationPassed ? 'var(--hq-mineral-sage, #3D7A68)' : packet.stage === 'VERIFYING' ? '#6B46C1' : '#B91C1C' }}>
              {packet.verificationPassed ? 'PASSED ✓' : packet.stage === 'VERIFYING' ? 'EXECUTING...' : 'PENDING'}
            </strong>
          </div>
          <div>
            <span style={{ color: 'var(--hq-text-secondary, #555B66)' }}>Change Scope: </span>
            <strong style={{ color: packet.scopeCompliant !== false ? 'var(--hq-mineral-sage, #3D7A68)' : '#B91C1C' }}>
              {packet.scopeCompliant !== false ? 'COMPLIANT' : 'OUT-OF-SCOPE'}
            </strong>
          </div>
          {packet.diffBytes !== undefined && (
            <div>
              <span style={{ color: 'var(--hq-text-secondary, #555B66)' }}>Diff Size: </span>
              <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '10px' }}>{packet.diffBytes} bytes</strong>
            </div>
          )}
        </div>

        {packet.promptHash && (
          <div style={{ fontSize: '10px', color: 'var(--hq-text-muted, #848B98)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Prompt SHA:</span>
            <code style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--hq-text-secondary, #555B66)' }}>
              {packet.promptHash.slice(0, 16)}...
            </code>
          </div>
        )}
      </div>

      {/* SECTION 3: OPERATOR AUTHORIZATION (HUMAN CONTROL GATE) */}
      <div
        style={{
          padding: '10px 12px',
          borderRadius: '4px',
          backgroundColor: isWaitingApproval ? 'var(--hq-mineral-amber-bg, #FEF7ED)' : '#FFFFFF',
          border: `1px solid ${isWaitingApproval ? 'var(--hq-mineral-amber-border, #FCD34D)' : 'var(--hq-border-subtle, #E3DFD5)'}`,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--hq-mineral-amber, #B45309)', letterSpacing: '0.4px' }}>
            SECTION 3 · OPERATOR SEAL &amp; AUTHORIZATION
          </span>
          <span
            style={{
              fontSize: '9px',
              fontWeight: 700,
              color: isSealed ? '#15803D' : isWaitingApproval ? '#B45309' : '#64748B',
              backgroundColor: isSealed ? '#DCFCE7' : isWaitingApproval ? '#FEF3C7' : '#F1F5F9',
              padding: '1px 5px',
              borderRadius: '3px',
            }}
          >
            {isSealed ? 'SEALED & MATERIALIZED' : isWaitingApproval ? 'ACTION REQUIRED' : 'STANDBY'}
          </span>
        </div>

        {isWaitingApproval && onApproveResult && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onApproveResult()
              }}
              disabled={isActing}
              style={{
                flex: 1,
                padding: '8px 16px',
                backgroundColor: 'var(--hq-mineral-sage, #3D7A68)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '4px',
                fontWeight: 700,
                fontSize: '12px',
                cursor: isActing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 2px 4px rgba(61, 122, 104, 0.25)',
              }}
            >
              <span>🖋️</span>
              <span>Approve Result</span>
            </button>

            {onInspectDiff && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onInspectDiff()
                }}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#FFFFFF',
                  color: 'var(--hq-text-secondary, #555B66)',
                  border: '1px solid var(--hq-border-strong, #C8C2B4)',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                Inspect Evidence
              </button>
            )}
          </div>
        )}

        {isSealed && (
          <div style={{ fontSize: '11px', color: 'var(--hq-mineral-sage, #3D7A68)' }}>
            Authorized by: <strong>{packet.operatorReviewer || 'Operator'}</strong> · Materialized to Git worktree DAG.
          </div>
        )}
      </div>
    </div>
  )
}
