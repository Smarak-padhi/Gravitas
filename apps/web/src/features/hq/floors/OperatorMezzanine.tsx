import React from 'react'
import { COWORKER_IDENTITIES } from '../characters/coworkerIdentities.js'
import { CoworkerAvatar } from '../characters/CoworkerAvatar.js'
import { WorkPacket, type WorkPacketData } from '../artifacts/WorkPacket.js'
import type { Task } from '../../../api/types.js'

export interface OperatorMezzanineProps {
  readonly waitingApprovalTask: Task | null
  readonly activeWorkPacket: WorkPacketData | null
  readonly onApproveResult?: () => void
  readonly onInspectEvidence?: () => void
  readonly isActing?: boolean | undefined
}

export const OperatorMezzanine: React.FC<OperatorMezzanineProps> = ({
  waitingApprovalTask,
  activeWorkPacket,
  onApproveResult,
  onInspectEvidence,
  isActing = false,
}) => {
  const operatorIdentity = COWORKER_IDENTITIES['operator']!
  const hasTaskNeedingReview = Boolean(waitingApprovalTask)

  return (
    <section
      data-testid="operator-mezzanine"
      style={{
        padding: '20px 24px',
        backgroundColor: hasTaskNeedingReview ? '#FFFDF9' : '#FFFFFF',
        border: `1.5px solid ${hasTaskNeedingReview ? 'var(--hq-mineral-amber, #B45309)' : 'var(--hq-border-subtle, #E3DFD5)'}`,
        borderRadius: '8px',
        boxShadow: hasTaskNeedingReview ? '0 8px 24px rgba(180, 83, 9, 0.15)' : 'var(--hq-shadow-tactile)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        position: 'relative',
        transition: 'all 0.25s cubic-bezier(0.2, 0, 0, 1)',
      }}
    >
      {/* Floor Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1.5px solid var(--hq-border-subtle, #E3DFD5)',
          paddingBottom: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 800,
              padding: '3px 8px',
              backgroundColor: 'var(--hq-metal-brass, #D97706)',
              color: '#FFFFFF',
              borderRadius: '4px',
              letterSpacing: '0.6px',
            }}
          >
            MEZZANINE
          </span>
          <div>
            <h3
              style={{
                fontSize: '14px',
                fontWeight: 800,
                color: 'var(--hq-text-primary, #1C1E21)',
                letterSpacing: '0.4px',
                textTransform: 'uppercase',
                margin: 0,
              }}
            >
              OPERATOR OBSERVATORY &amp; HUMAN CONTROL
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--hq-text-secondary, #555B66)' }}>
              Final Authority · Wax Seal Authorization &amp; Non-Authoritative Worker Claim Audit
            </span>
          </div>
        </div>

        <span
          style={{
            fontSize: '10px',
            fontWeight: 700,
            color: hasTaskNeedingReview ? '#B45309' : '#555B66',
            backgroundColor: hasTaskNeedingReview ? '#FEF3C7' : '#F1F5F9',
            border: `1px solid ${hasTaskNeedingReview ? '#FCD34D' : '#E2E8F0'}`,
            padding: '2px 8px',
            borderRadius: '12px',
            animation: hasTaskNeedingReview ? 'attentionPulse 2s ease-in-out infinite' : 'none',
          }}
        >
          {hasTaskNeedingReview ? '⚠️ OPERATOR REVIEW REQUIRED' : '● OBSERVATORY STANDBY'}
        </span>
      </div>

      {/* Operator Attention Bar (Preserving testid for browser specs) */}
      {waitingApprovalTask && (
        <div
          data-testid="operator-review-bar"
          style={{
            padding: '12px 18px',
            backgroundColor: 'var(--hq-mineral-amber-bg, #FEF7ED)',
            border: '1.5px solid var(--hq-mineral-amber-border, #FCD34D)',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            animation: 'attentionPulse 2.4s ease-in-out infinite',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>⚠️</span>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--hq-mineral-amber, #B45309)',
                letterSpacing: '0.2px',
              }}
            >
              OPERATOR REVIEW REQUIRED: Task [{waitingApprovalTask.id}] &quot;{waitingApprovalTask.title}&quot; has passed verification and awaits human approval.
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onApproveResult && (
              <button
                onClick={onApproveResult}
                disabled={isActing}
                style={{
                  padding: '7px 18px',
                  backgroundColor: 'var(--hq-mineral-sage, #3D7A68)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '4px',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: isActing ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 6px rgba(61, 122, 104, 0.3)',
                }}
              >
                <span>🖋️</span>
                <span>Approve Result</span>
              </button>
            )}

            {onInspectEvidence && (
              <button
                onClick={onInspectEvidence}
                style={{
                  padding: '7px 14px',
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
        </div>
      )}

      {/* Operator Desk & Work Packet Review */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        {/* Observatory Desk Profile */}
        <div
          style={{
            padding: '16px',
            backgroundColor: 'var(--hq-surface-parchment, #FCFAF6)',
            border: '1px solid var(--hq-border-subtle, #E3DFD5)',
            borderRadius: '6px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <CoworkerAvatar
              identity={operatorIdentity}
              pose={hasTaskNeedingReview ? 'REVIEWING' : 'IDLE'}
              size={50}
            />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--hq-text-primary, #1C1E21)' }}>
                {operatorIdentity.name}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--hq-metal-brass, #D97706)' }}>
                {operatorIdentity.roleTitle}
              </div>
            </div>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--hq-text-secondary, #555B66)', margin: 0, lineHeight: 1.4 }}>
            {operatorIdentity.bio}
          </p>
          <div style={{ fontSize: '10px', color: 'var(--hq-text-muted, #848B98)', fontFamily: 'var(--font-mono)' }}>
            Authority: {operatorIdentity.garmentDescription}
          </div>
        </div>

        {/* Work Packet Under Review */}
        {activeWorkPacket ? (
          <WorkPacket
            packet={activeWorkPacket}
            onApproveResult={onApproveResult}
            onInspectDiff={onInspectEvidence}
            isActing={isActing}
          />
        ) : (
          <div
            style={{
              padding: '24px',
              backgroundColor: '#FFFFFF',
              border: '1px dashed var(--hq-border-strong, #C8C2B4)',
              borderRadius: '6px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--hq-text-muted, #848B98)',
              gap: '6px',
              fontSize: '11px',
            }}
          >
            <span style={{ fontSize: '20px' }}>📭</span>
            <span>Observatory In-Tray Empty</span>
            <span style={{ fontSize: '10px', color: '#94A3B8' }}>
              Work packets arrive here automatically after passing verification.
            </span>
          </div>
        )}
      </div>
    </section>
  )
}
