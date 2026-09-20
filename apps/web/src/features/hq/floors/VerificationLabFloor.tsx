import React from 'react'
import type { CoworkerStationState } from '../livingHqState.js'
import { CoworkerAvatar } from '../characters/CoworkerAvatar.js'
import type { WorkPacketData } from '../artifacts/WorkPacket.js'

export interface VerificationLabFloorProps {
  readonly verifierCoworker: CoworkerStationState
  readonly browserQaCoworker: CoworkerStationState
  readonly activeWorkPacket: WorkPacketData | null
  readonly onInspectEvidence?: () => void
}

export const VerificationLabFloor: React.FC<VerificationLabFloorProps> = ({
  verifierCoworker,
  browserQaCoworker,
  activeWorkPacket,
  onInspectEvidence,
}) => {
  const isVerifying = verifierCoworker.isWorking
  const isVerifiedPass = activeWorkPacket?.verificationPassed === true
  const isFailed = verifierCoworker.pose === 'FAILED'

  return (
    <section
      data-testid="verification-lab-floor"
      style={{
        padding: '20px 24px',
        backgroundColor: '#FFFFFF',
        border: '1px solid var(--hq-border-subtle, #E3DFD5)',
        borderRadius: '8px',
        boxShadow: 'var(--hq-shadow-tactile)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        position: 'relative',
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
              backgroundColor: 'var(--hq-mineral-iris, #6B46C1)',
              color: '#FFFFFF',
              borderRadius: '4px',
              letterSpacing: '0.6px',
            }}
          >
            FLOOR 3
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
              VERIFICATION LAB &amp; EVIDENCE CLEANROOM
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--hq-text-secondary, #555B66)' }}>
              Independent Evidence Authority · Shell Test Execution, Mutation Gate &amp; DOM Audit
            </span>
          </div>
        </div>

        <span
          style={{
            fontSize: '10px',
            fontWeight: 700,
            color: isVerifying ? '#6B46C1' : '#059669',
            backgroundColor: isVerifying ? '#F5F0FF' : '#EBF5F1',
            border: `1px solid ${isVerifying ? '#D6BCFA' : '#A3D4C4'}`,
            padding: '2px 8px',
            borderRadius: '12px',
          }}
        >
          {isVerifying ? '● VERIFYING CANDIDATE' : '✓ CLEANROOM STANDBY'}
        </span>
      </div>

      {/* Verification Workspace Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        {/* Verifier Bench */}
        <div
          data-testid="verifier-bench"
          style={{
            padding: '16px',
            backgroundColor: isVerifying ? '#F5F0FF' : 'var(--hq-surface-parchment, #FCFAF6)',
            border: `1.5px solid ${isVerifying ? '#9061F9' : 'var(--hq-border-subtle, #E3DFD5)'}`,
            borderRadius: '6px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <CoworkerAvatar identity={verifierCoworker.identity} pose={verifierCoworker.pose} size={50} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--hq-text-primary, #1C1E21)' }}>
                  {verifierCoworker.identity.name}
                </div>
                <div style={{ fontSize: '11px', color: '#059669' }}>
                  {verifierCoworker.identity.roleTitle}
                </div>
              </div>
            </div>
          </div>

          <p style={{ fontSize: '11px', color: 'var(--hq-text-secondary, #555B66)', margin: 0 }}>
            {verifierCoworker.identity.bio}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--hq-text-secondary, #555B66)' }}>Test Suite Status:</span>
              <strong style={{ color: isVerifiedPass ? 'var(--hq-mineral-sage, #3D7A68)' : isFailed ? 'var(--hq-mineral-crimson, #B91C1C)' : '#6B46C1' }}>
                {isVerifiedPass ? 'PASSED (0 Failures)' : isVerifying ? 'Running Vitest / Playwright...' : 'Idle'}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--hq-text-secondary, #555B66)' }}>Mutation Scope Check:</span>
              <strong style={{ color: isFailed ? 'var(--hq-mineral-crimson, #B91C1C)' : 'var(--hq-mineral-sage, #3D7A68)' }}>
                {isFailed ? 'VIOLATION DETECTED' : 'ENFORCED'}
              </strong>
            </div>
          </div>

          {onInspectEvidence && (
            <button
              onClick={onInspectEvidence}
              style={{
                marginTop: '4px',
                padding: '6px 12px',
                backgroundColor: '#FFFFFF',
                color: 'var(--hq-text-secondary, #555B66)',
                border: '1px solid var(--hq-border-strong, #C8C2B4)',
                borderRadius: '4px',
                fontSize: '11px',
                cursor: 'pointer',
                alignSelf: 'flex-start',
              }}
            >
              Open Evidence Terminal
            </button>
          )}
        </div>

        {/* Browser QA Bench */}
        <div
          data-testid="browser-qa-bench"
          style={{
            padding: '16px',
            backgroundColor:
              browserQaCoworker.pose === 'WORKING'
                ? '#F0FDFA'
                : browserQaCoworker.pose === 'FAILED'
                  ? '#FEF2F2'
                  : browserQaCoworker.pose === 'DONE'
                    ? '#F0FDF4'
                    : 'var(--hq-surface-parchment, #FCFAF6)',
            border: `1.5px solid ${
              browserQaCoworker.pose === 'WORKING'
                ? '#0D9488'
                : browserQaCoworker.pose === 'FAILED'
                  ? '#EF4444'
                  : browserQaCoworker.pose === 'DONE'
                    ? '#10B981'
                    : 'var(--hq-border-subtle, #E3DFD5)'
            }`,
            borderRadius: '6px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <CoworkerAvatar identity={browserQaCoworker.identity} pose={browserQaCoworker.pose} size={50} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--hq-text-primary, #1C1E21)' }}>
                  {browserQaCoworker.identity.name}
                </div>
                <div style={{ fontSize: '11px', color: '#0D9488', fontWeight: 700 }}>
                  {browserQaCoworker.identity.roleTitle}
                </div>
              </div>
            </div>
            <span
              data-testid="browser-qa-status-badge"
              style={{
                fontSize: '10px',
                fontWeight: 700,
                fontFamily: 'var(--font-mono, monospace)',
                padding: '2px 8px',
                borderRadius: '10px',
                backgroundColor:
                  browserQaCoworker.pose === 'WORKING'
                    ? '#CCFBF1'
                    : browserQaCoworker.pose === 'FAILED'
                      ? '#FEE2E2'
                      : browserQaCoworker.pose === 'DONE'
                        ? '#DCFCE7'
                        : '#F3F4F6',
                color:
                  browserQaCoworker.pose === 'WORKING'
                    ? '#0F766E'
                    : browserQaCoworker.pose === 'FAILED'
                      ? '#B91C1C'
                      : browserQaCoworker.pose === 'DONE'
                        ? '#15803D'
                        : '#6B7280',
                border: `1px solid ${
                  browserQaCoworker.pose === 'WORKING'
                    ? '#5EEAD4'
                    : browserQaCoworker.pose === 'FAILED'
                      ? '#FCA5A5'
                      : browserQaCoworker.pose === 'DONE'
                        ? '#86EFAC'
                        : '#E5E7EB'
                }`,
              }}
            >
              {browserQaCoworker.pose === 'WORKING'
                ? '● EXECUTING BROWSER QA'
                : browserQaCoworker.pose === 'FAILED'
                  ? '⚠ QA REJECTED'
                  : browserQaCoworker.pose === 'DONE'
                    ? '✓ RUNTIME QA VERIFIED'
                    : 'STANDBY'}
            </span>
          </div>

          <p style={{ fontSize: '11px', color: 'var(--hq-text-secondary, #555B66)', margin: 0 }}>
            {browserQaCoworker.identity.bio}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--hq-text-secondary, #555B66)' }}>Runtime Browser Engine:</span>
              <strong style={{ color: '#0F766E', fontFamily: 'monospace' }}>Playwright (Loopback Sandbox)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--hq-text-secondary, #555B66)' }}>Observation Capture:</span>
              <strong style={{ color: browserQaCoworker.pose === 'FAILED' ? '#B91C1C' : '#059669' }}>
                {browserQaCoworker.pose === 'FAILED'
                  ? 'ASSERTION FAILURE / ERROR LOGGED'
                  : browserQaCoworker.pose === 'DONE'
                    ? 'SCREENSHOT & CONSOLE CLEAN'
                    : browserQaCoworker.pose === 'WORKING'
                      ? 'SAMPLING DOM & ERRORS...'
                      : 'ARMED'}
              </strong>
            </div>
          </div>

          {browserQaCoworker.failureReason && (
            <div
              data-testid="browser-qa-failure-alert"
              style={{
                padding: '8px 10px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: '4px',
                fontSize: '11px',
                color: '#991B1B',
                lineHeight: 1.4,
              }}
            >
              <strong>QA Rejection:</strong> {browserQaCoworker.failureReason}
            </div>
          )}

          {/* Matrix Wall Viewports Preview */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', fontSize: '10px' }}>
            <div style={{ padding: '6px', backgroundColor: '#FFFFFF', border: '1px solid var(--hq-border-subtle, #E3DFD5)', borderRadius: '3px', textAlign: 'center' }}>
              <div style={{ fontWeight: 700 }}>1920×1080</div>
              <div style={{ color: browserQaCoworker.pose === 'FAILED' ? '#DC2626' : '#0D9488' }}>
                {browserQaCoworker.pose === 'FAILED' ? 'Assertion Failed' : 'Desktop OK'}
              </div>
            </div>
            <div style={{ padding: '6px', backgroundColor: '#FFFFFF', border: '1px solid var(--hq-border-subtle, #E3DFD5)', borderRadius: '3px', textAlign: 'center' }}>
              <div style={{ fontWeight: 700 }}>1440×900</div>
              <div style={{ color: browserQaCoworker.pose === 'FAILED' ? '#DC2626' : '#0D9488' }}>
                {browserQaCoworker.pose === 'FAILED' ? 'Error Logged' : 'Laptop OK'}
              </div>
            </div>
            <div style={{ padding: '6px', backgroundColor: '#FFFFFF', border: '1px solid var(--hq-border-subtle, #E3DFD5)', borderRadius: '3px', textAlign: 'center' }}>
              <div style={{ fontWeight: 700 }}>1024×768</div>
              <div style={{ color: browserQaCoworker.pose === 'FAILED' ? '#DC2626' : '#0D9488' }}>
                {browserQaCoworker.pose === 'FAILED' ? 'Viewport Alert' : 'No Scrollbar'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cryptographic Evidence Vault preview if packet exists */}
      {activeWorkPacket && activeWorkPacket.stage === 'SEALED' && (
        <div
          data-testid="evidence-vault-archive"
          style={{
            padding: '12px 16px',
            backgroundColor: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px' }}>🔒</span>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#166534' }}>
                EVIDENCE VAULT ARCHIVE · TASK [{activeWorkPacket.taskId}]
              </span>
              <div style={{ fontSize: '10px', color: '#15803D' }}>
                Immutable cryptographically verified worktree snapshot saved.
              </div>
            </div>
          </div>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#166534' }}>
            VERIFIED &amp; MATERIALIZED
          </span>
        </div>
      )}
    </section>
  )
}
