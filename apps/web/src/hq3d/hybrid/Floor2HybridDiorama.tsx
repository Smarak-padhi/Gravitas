/**
 * Floor 2 Hybrid Experience Diorama Coordinator (Wave 12H-R)
 *
 * Merges Layer A (3D Architectural World) with Layer B (2D Illustrated Gravitas Species):
 * - Projects 3D station anchors to 2D DOM screen coordinates
 * - Renders original Gravitas mascot species (Frontend, Reviewer, Backend) with cute expressions
 * - Drives tactile small T-142 sealed packet handoff animation from Frontend to Reviewer
 * - Streamlined, non-cluttered character speech bubbles
 * - Eliminates state contradictions: FAILED never displays "Working on..."
 * - Prototype scenario controls hidden behind `?debug=hybrid`
 * - Serious Contextual Inspector (Layer C)
 */

import React, { useEffect, useState, useCallback } from 'react'
import * as THREE from 'three'
import type {
  AgentStatusMessage,
  HybridTaskDetail,
  IllustratedAgentRole,
  IllustratedAgentState,
  TaskArtifactHandoffState,
} from './types.js'
import { deriveAgentStatusMessage } from './statusMapper.js'
import { IllustratedAgent, CharacterFamilyShowcase } from './illustratedCharacters.js'
import { SpeechBubble } from './speechBubble.js'
import { TaskArtifactHandoff } from './taskArtifactHandoff.js'
import { HybridInspector } from './HybridInspector.js'

export interface Floor2HybridDioramaProps {
  readonly camera: THREE.Camera | null
  readonly canvasRect: { width: number; height: number }
  readonly activeFloorId: string
  readonly isFocused?: boolean
  readonly onSelectEntity?: (entity: any) => void
}

// 3D Station Anchors on Floor 2 (Y = 7.2m, matching chair home positions)
const ANCHORS_3D = {
  frontend: new THREE.Vector3(-3.5, 7.9, 1.15),
  reviewer: new THREE.Vector3(-0.2, 7.9, 0.7),
  backend: new THREE.Vector3(2.5, 7.9, 1.15),
}

export const Floor2HybridDiorama: React.FC<Floor2HybridDioramaProps> = ({
  camera,
  canvasRect,
  activeFloorId,
  isFocused: _isFocused,
}) => {
  // Agent States
  const [frontendState, setFrontendState] = useState<IllustratedAgentState>('IDLE')
  const [backendState, setBackendState] = useState<IllustratedAgentState>('IDLE')
  const [reviewerState, setReviewerState] = useState<IllustratedAgentState>('IDLE')

  // Screen Coordinates (Projected from 3D)
  const [screenCoords, setScreenCoords] = useState<{
    frontend: { x: number; y: number }
    reviewer: { x: number; y: number }
    backend: { x: number; y: number }
  }>({
    frontend: { x: 1200, y: 560 },
    reviewer: { x: 780, y: 560 },
    backend: { x: 380, y: 560 },
  })

  // Speech Bubble Messages
  const [frontendMessage, setFrontendMessage] = useState<AgentStatusMessage | null>(null)
  const [reviewerMessage, setReviewerMessage] = useState<AgentStatusMessage | null>(null)
  const [backendMessage, setBackendMessage] = useState<AgentStatusMessage | null>(null)

  // Activity Timeline (Persistent Record of all events)
  const [messageHistory, setMessageHistory] = useState<AgentStatusMessage[]>([])

  // Handoff Animation State
  const [handoffState, setHandoffState] = useState<TaskArtifactHandoffState>({
    taskId: 'T-142',
    sourceRole: 'role:engineering:frontend-engineer',
    targetRole: 'role:quality:independent-reviewer',
    status: 'IDLE',
    progress: 0,
    artifact: {
      id: 'T-142',
      title: 'Responsive itinerary cards',
      provenanceHash: '0xfe42_itinerary',
      verificationState: 'PENDING',
    },
  })

  // Contextual Selection
  const [selectedAgentRole, setSelectedAgentRole] = useState<IllustratedAgentRole | null>(null)
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<HybridTaskDetail | null>(null)

  // Debug Scenario Controls: Gated behind ?debug=hybrid
  const [showDebugToolbar, setShowDebugToolbar] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    const params = new URLSearchParams(window.location.search)
    return params.get('debug') === 'hybrid' || window.location.hash.includes('debug=hybrid')
  })

  // Toggle debug toolbar with Ctrl+Shift+D
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        setShowDebugToolbar((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Check if character preview is requested
  const isCharacterShowcase = typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('preview') === 'characters'

  // Project 3D anchors to 2D screen coordinates
  const updateProjections = useCallback(() => {
    if (!camera || canvasRect.width <= 0 || canvasRect.height <= 0) return

    const project = (pos: THREE.Vector3) => {
      const v = pos.clone().project(camera)
      return {
        x: ((v.x + 1) / 2) * canvasRect.width,
        y: ((-v.y + 1) / 2) * canvasRect.height,
      }
    }

    setScreenCoords({
      frontend: project(ANCHORS_3D.frontend),
      reviewer: project(ANCHORS_3D.reviewer),
      backend: project(ANCHORS_3D.backend),
    })
  }, [camera, canvasRect.width, canvasRect.height])

  useEffect(() => {
    updateProjections()
    const interval = setInterval(updateProjections, 200)
    return () => clearInterval(interval)
  }, [updateProjections])

  // Helper to record an operational message
  const broadcastMessage = useCallback((msg: AgentStatusMessage | null) => {
    if (!msg) return
    setMessageHistory((prev) => [msg, ...prev].slice(0, 30))

    if (msg.roleId === 'role:engineering:frontend-engineer') {
      setFrontendMessage(msg)
    } else if (msg.roleId === 'role:quality:independent-reviewer') {
      setReviewerMessage(msg)
    } else if (msg.roleId === 'role:engineering:backend-engineer') {
      setBackendMessage(msg)
    }
  }, [])

  // SCENARIO 1: Full Golden Loop Handoff Sequence
  const runGoldenHandoff = useCallback(() => {
    // 1. Frontend starts working
    setFrontendState('WORKING')
    setReviewerState('IDLE')
    setBackendState('IDLE')
    const startMsg = deriveAgentStatusMessage({
      roleId: 'role:engineering:frontend-engineer',
      taskId: 'T-142',
      event: 'TASK_STARTED',
    })
    broadcastMessage(startMsg)

    // 2. Frontend completes work after 1.8s
    setTimeout(() => {
      setFrontendState('COMPLETED')
      const compMsg = deriveAgentStatusMessage({
        roleId: 'role:engineering:frontend-engineer',
        taskId: 'T-142',
        event: 'TASK_COMPLETED',
      })
      broadcastMessage(compMsg)

      // Small task packet appears on Frontend desk & begins flight
      setHandoffState((prev) => ({
        ...prev,
        status: 'IN_TRANSIT',
      }))
    }, 1800)
  }, [broadcastMessage])

  // When task packet lands at Reviewer
  const handleHandoffArrived = useCallback(() => {
    setHandoffState((prev) => ({
      ...prev,
      status: 'ARRIVED',
    }))

    // Reviewer receives T-142 and starts reviewing
    setReviewerState('REVIEWING')
    const recvMsg = deriveAgentStatusMessage({
      roleId: 'role:quality:independent-reviewer',
      taskId: 'T-142',
      event: 'HANDOFF_RECEIVED',
    })
    broadcastMessage(recvMsg)

    // After 2.4s of verification, pass verification
    setTimeout(() => {
      setReviewerState('WAITING_APPROVAL')
      const passMsg = deriveAgentStatusMessage({
        roleId: 'role:quality:independent-reviewer',
        taskId: 'T-142',
        event: 'VERIFICATION_PASSED',
      })
      broadcastMessage(passMsg)

      setHandoffState((prev) => ({
        ...prev,
        artifact: prev.artifact ? { ...prev.artifact, verificationState: 'PASSED' } : null,
      }))
    }, 2400)
  }, [broadcastMessage])

  // SCENARIO 2: Verification Failure Case
  const runFailureScenario = useCallback(() => {
    setFrontendState('IDLE')
    setReviewerState('REVIEWING')
    setHandoffState({
      taskId: 'T-142',
      sourceRole: 'role:engineering:frontend-engineer',
      targetRole: 'role:quality:independent-reviewer',
      status: 'ARRIVED',
      progress: 1,
      artifact: {
        id: 'T-142',
        title: 'Responsive itinerary cards',
        provenanceHash: '0xfe42_itinerary',
        verificationState: 'FAILED',
      },
    })

    setTimeout(() => {
      setReviewerState('FAILED')
      const failMsg = deriveAgentStatusMessage({
        roleId: 'role:quality:independent-reviewer',
        taskId: 'T-142',
        event: 'VERIFICATION_FAILED',
        errorCount: 2,
      })
      broadcastMessage(failMsg)

      // Return to Frontend after 1.5s
      setTimeout(() => {
        setFrontendState('FAILED')
      }, 1500)
    }, 1200)
  }, [broadcastMessage])

  // Reset to Idle
  const resetToIdle = useCallback(() => {
    setFrontendState('IDLE')
    setBackendState('IDLE')
    setReviewerState('IDLE')
    setFrontendMessage(null)
    setReviewerMessage(null)
    setBackendMessage(null)
    setHandoffState({
      taskId: 'T-142',
      sourceRole: 'role:engineering:frontend-engineer',
      targetRole: 'role:quality:independent-reviewer',
      status: 'IDLE',
      progress: 0,
      artifact: null,
    })
  }, [])

  // Agent Click Handler
  const handleAgentClick = (role: IllustratedAgentRole) => {
    setSelectedTaskDetail(null)
    setSelectedAgentRole(role)
  }

  // Task Click Handler
  const handleTaskClick = () => {
    setSelectedAgentRole(null)
    setSelectedTaskDetail({
      id: handoffState.taskId,
      title: handoffState.artifact?.title ?? 'Responsive itinerary cards',
      sourceRole: 'Frontend Engineer',
      destinationRole: 'Independent Reviewer',
      state:
        reviewerState === 'WAITING_APPROVAL'
          ? 'WAITING_APPROVAL'
          : reviewerState === 'REVIEWING'
          ? 'IN_REVIEW'
          : reviewerState === 'FAILED'
          ? 'FAILED'
          : 'COMPLETED',
      dependencies: [],
      verificationStatus:
        reviewerState === 'WAITING_APPROVAL'
          ? 'PASSED'
          : reviewerState === 'FAILED'
          ? 'FAILED'
          : 'PENDING',
      evidenceAvailable: true,
    })
  }

  // Build Inspector Data with strict status consistency
  const selectedAgentData = selectedAgentRole
    ? {
        role: selectedAgentRole,
        name:
          selectedAgentRole === 'role:engineering:frontend-engineer'
            ? 'Frontend Engineer'
            : selectedAgentRole === 'role:engineering:backend-engineer'
            ? 'Backend Engineer'
            : 'Independent Reviewer',
        state:
          selectedAgentRole === 'role:engineering:frontend-engineer'
            ? frontendState
            : selectedAgentRole === 'role:engineering:backend-engineer'
            ? backendState
            : reviewerState,
        currentTaskId:
          selectedAgentRole === 'role:engineering:frontend-engineer' && frontendState !== 'IDLE'
            ? 'T-142'
            : selectedAgentRole === 'role:quality:independent-reviewer' && reviewerState !== 'IDLE'
            ? 'T-142'
            : undefined,
        taskTitle:
          selectedAgentRole === 'role:engineering:frontend-engineer' && frontendState !== 'IDLE'
            ? 'Implement responsive itinerary cards'
            : selectedAgentRole === 'role:quality:independent-reviewer' && reviewerState !== 'IDLE'
            ? 'Verification of responsive itinerary cards'
            : undefined,
        phase:
          selectedAgentRole === 'role:engineering:frontend-engineer'
            ? frontendState === 'WORKING'
              ? 'WORKER_RUNNING'
              : frontendState === 'COMPLETED'
              ? 'WORKER_COMPLETED'
              : frontendState === 'FAILED'
              ? 'EXECUTION_HALTED'
              : 'STANDBY'
            : selectedAgentRole === 'role:quality:independent-reviewer'
            ? reviewerState === 'REVIEWING'
              ? 'VERIFICATION_ACTIVE'
              : reviewerState === 'WAITING_APPROVAL'
              ? 'WAITING_APPROVAL'
              : reviewerState === 'FAILED'
              ? 'VERIFICATION_FAILED'
              : 'STANDBY'
            : 'STANDBY',
        harness:
          selectedAgentRole === 'role:engineering:frontend-engineer'
            ? 'Codex'
            : selectedAgentRole === 'role:engineering:backend-engineer'
            ? 'FCC'
            : 'Independent Verification Suite',
        model:
          selectedAgentRole === 'role:engineering:frontend-engineer'
            ? 'gpt-5-hybrid'
            : selectedAgentRole === 'role:engineering:backend-engineer'
            ? 'claude-3-7-sonnet'
            : 'rule-based-evaluator',
        startedAt: '10:42 AM',
      }
    : null

  // Neutral Background Character Showcase Route for 01-character-family.png, 40px, 80px proofs
  if (isCharacterShowcase) {
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
    const previewHeight = searchParams?.get('height') ? parseInt(searchParams.get('height')!, 10) : 128
    const hideShowcaseLabels = searchParams?.get('labels') === 'false'

    return (
      <div
        data-testid="character-family-preview-overlay"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: '#0f172a',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '20px',
        }}
      >
        <h2 style={{ color: '#f8fafc', margin: 0, fontSize: '18px', fontWeight: 600 }}>
          Gravitas Mascot Species — Role Variants ({previewHeight}px)
        </h2>
        <CharacterFamilyShowcase height={previewHeight} hideLabels={hideShowcaseLabels} />
      </div>
    )
  }

  // Ensure Floor 2 is visible
  if (activeFloorId !== 'AGENT_OPERATIONS') {
    return null
  }

  return (
    <div
      data-testid="floor2-hybrid-diorama"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 12,
      }}
    >
      {/* Simulation & Scenario Toolbar: Visible ONLY in Debug Mode (?debug=hybrid or Ctrl+Shift+D) */}
      {showDebugToolbar && (
        <div
          data-testid="hybrid-scenario-toolbar"
          style={{
            position: 'absolute',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            backgroundColor: 'rgba(15, 23, 42, 0.94)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '24px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.55)',
            pointerEvents: 'auto',
            zIndex: 35,
          }}
        >
          <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginRight: '4px' }}>
            Floor 2 Dev:
          </span>
          <button
            onClick={runGoldenHandoff}
            data-testid="scenario-golden-handoff"
            title="Frontend completes T-142 -> Handoff to Reviewer -> Verification passes"
            style={{
              padding: '5px 12px',
              borderRadius: '16px',
              backgroundColor: 'rgba(129, 140, 248, 0.2)',
              border: '1px solid #818cf8',
              color: '#c4b5fd',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ▶ Play Handoff (T-142)
          </button>
          <button
            onClick={runFailureScenario}
            data-testid="scenario-verification-failed"
            title="Reviewer finds issues -> Returns T-142 to Frontend"
            style={{
              padding: '5px 12px',
              borderRadius: '16px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#f87171',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ⚠️ Test Failure Case
          </button>
          <button
            onClick={resetToIdle}
            data-testid="scenario-reset-idle"
            title="Reset to peaceful ambient standby"
            style={{
              padding: '5px 12px',
              borderRadius: '16px',
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#94a3b8',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ☕ Reset Idle
          </button>
        </div>
      )}

      {/* AGENT 1: FRONTEND ENGINEER */}
      <div
        style={{
          position: 'absolute',
          left: `${screenCoords.frontend.x}px`,
          top: `${screenCoords.frontend.y}px`,
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'auto',
        }}
      >
        <IllustratedAgent
          role="role:engineering:frontend-engineer"
          state={frontendState}
          isSelected={selectedAgentRole === 'role:engineering:frontend-engineer'}
          onClick={() => handleAgentClick('role:engineering:frontend-engineer')}
          label="Frontend"
          height={116}
        />
        <SpeechBubble
          message={frontendMessage}
          onDismiss={() => setFrontendMessage(null)}
          onClick={() => handleAgentClick('role:engineering:frontend-engineer')}
        />
      </div>

      {/* AGENT 2: INDEPENDENT REVIEWER (Middle Workbench) */}
      <div
        style={{
          position: 'absolute',
          left: `${screenCoords.reviewer.x}px`,
          top: `${screenCoords.reviewer.y}px`,
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'auto',
        }}
      >
        <IllustratedAgent
          role="role:quality:independent-reviewer"
          state={reviewerState}
          isSelected={selectedAgentRole === 'role:quality:independent-reviewer'}
          onClick={() => handleAgentClick('role:quality:independent-reviewer')}
          label="Reviewer"
          height={116}
        />
        <SpeechBubble
          message={reviewerMessage}
          onDismiss={() => setReviewerMessage(null)}
          onClick={() => handleAgentClick('role:quality:independent-reviewer')}
        />
      </div>

      {/* AGENT 3: BACKEND ENGINEER */}
      <div
        style={{
          position: 'absolute',
          left: `${screenCoords.backend.x}px`,
          top: `${screenCoords.backend.y}px`,
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'auto',
        }}
      >
        <IllustratedAgent
          role="role:engineering:backend-engineer"
          state={backendState}
          isSelected={selectedAgentRole === 'role:engineering:backend-engineer'}
          onClick={() => handleAgentClick('role:engineering:backend-engineer')}
          label="Backend"
          height={116}
        />
        <SpeechBubble
          message={backendMessage}
          onDismiss={() => setBackendMessage(null)}
          onClick={() => handleAgentClick('role:engineering:backend-engineer')}
        />
      </div>

      {/* TACTILE TASK ARTIFACT PACKET HANDOFF (T-142) */}
      <TaskArtifactHandoff
        handoff={handoffState}
        fromPos={screenCoords.frontend}
        toPos={screenCoords.reviewer}
        onClick={handleTaskClick}
        onArrived={handleHandoffArrived}
        isSelected={Boolean(selectedTaskDetail)}
      />

      {/* LAYER C: CONTEXTUAL INSPECTOR (Opens on Agent or Task click) */}
      {(selectedAgentData || selectedTaskDetail) && (
        <div
          style={{
            position: 'absolute',
            right: '24px',
            top: '64px',
            bottom: '24px',
            zIndex: 40,
            display: 'flex',
          }}
        >
          <HybridInspector
            selectedAgent={selectedAgentData}
            selectedTask={selectedTaskDetail}
            messageHistory={messageHistory}
            onClose={() => {
              setSelectedAgentRole(null)
              setSelectedTaskDetail(null)
            }}
            onApproveTask={(taskId) => {
              setReviewerState('IDLE')
              resetToIdle()
              broadcastMessage({
                id: `msg-approved-${Date.now()}`,
                roleId: 'role:quality:independent-reviewer',
                taskId,
                category: 'WAITING_APPROVAL',
                shortText: `Task ${taskId} approved and merged to main.`,
                timestamp: Date.now(),
                severity: 'success',
                expiresAfterMs: 5000,
              })
            }}
          />
        </div>
      )}
    </div>
  )
}
