import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { api, GravitasApiError } from './api/client.js'
import type {
  CreateRunInput,
  GravitasEvent,
  Run,
  RunDetailResponse,
  StateSummaryResponse,
  Task,
  TaskDetailResponse,
} from './api/types.js'
import { useEvents } from './api/useEvents.js'
import { EventConsole } from './components/EventConsole.js'
import { ExecutionGraph } from './components/ExecutionGraph.js'
import { GoalComposer } from './components/GoalComposer.js'
import { RunsList } from './components/RunsList.js'
import { TaskInspector } from './components/TaskInspector.js'
import { TopBar, type WorkspaceView } from './components/TopBar.js'
import { deriveOfficeState } from './features/office/officeState.js'
import { OfficeFloor } from './features/office/OfficeFloor.js'
import { deriveInboxItems, type InboxItem } from './features/inbox/inboxDerivation.js'
import { InboxDrawer } from './features/inbox/InboxDrawer.js'
import { browserNotifier } from './features/inbox/browserNotifier.js'
import { ActivityTimeline } from './features/timeline/ActivityTimeline.js'
import { AgentRegistryView } from './features/agents/AgentRegistryView.js'
import { CommandPalette } from './features/command-palette/CommandPalette.js'
import type { CommandItem } from './features/command-palette/commandPaletteState.js'
import './styles/theme.css'
import './design-system/tokens.css'
import './design-system/motion.css'

export const App: React.FC = () => {
  const [stateSummary, setStateSummary] = useState<StateSummaryResponse | null>(null)
  const [runs, setRuns] = useState<readonly Run[]>([])
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [runDetail, setRunDetail] = useState<RunDetailResponse | null>(null)
  const [taskDetail, setTaskDetail] = useState<TaskDetailResponse | null>(null)
  const [diff, setDiff] = useState<string>('')
  const [isLoadingDiff, setIsLoadingDiff] = useState<boolean>(false)
  const [isComposerOpen, setIsComposerOpen] = useState<boolean>(false)
  const [isActing, setIsActing] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Wave 7.5 Experience Controls
  const [activeView, setActiveView] = useState<WorkspaceView>('OFFICE')
  const [isInboxOpen, setIsInboxOpen] = useState<boolean>(false)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false)
  const [acknowledgedInboxIds, setAcknowledgedInboxIds] = useState<Set<string>>(new Set())
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null)

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  // Initial load
  const loadInitialData = useCallback(async () => {
    try {
      const summary = await api.getState()
      setStateSummary(summary)
      setRuns(summary.runs)
      if (summary.runs.length > 0 && !selectedRunId) {
        setSelectedRunId(summary.runs[0]!.id)
      }
    } catch (err) {
      console.error('Failed to load initial state:', err)
      setErrorMessage(err instanceof Error ? err.message : 'Failed to connect to Gravitas server')
    }
  }, [selectedRunId])

  useEffect(() => {
    void loadInitialData()
  }, [loadInitialData])

  // Load specific task details and diff
  const loadTaskDetails = useCallback(async (runId: string, taskId: string) => {
    setSelectedTaskId(taskId)
    try {
      const tDetail = await api.getTask(runId, taskId)
      setTaskDetail(tDetail)

      if (tDetail.evidenceAvailable) {
        setIsLoadingDiff(true)
        try {
          const diffData = await api.getEvidenceDiff(runId, taskId)
          setDiff(diffData.diff)
        } catch {
          setDiff('')
        } finally {
          setIsLoadingDiff(false)
        }
      } else {
        setDiff('')
      }
    } catch (err) {
      console.error(`Failed to load task detail for ${taskId}:`, err)
    }
  }, [])

  // Fetch full details when selected run changes
  const loadRunDetails = useCallback(async (runId: string) => {
    try {
      const detail = await api.getRun(runId)
      setRunDetail(detail)

      const currentlySelected = selectedTaskId ? detail.tasks.find((t) => t.id === selectedTaskId) : null
      const isCurrentTerminal = currentlySelected && (currentlySelected.state === 'APPROVED' || currentlySelected.state === 'SUCCEEDED')

      const targetTask =
        (!isCurrentTerminal && currentlySelected ? currentlySelected : null) ??
        detail.tasks.find((t) => t.state === 'WAITING_APPROVAL' || t.state === 'RUNNING' || t.state === 'VERIFYING') ??
        detail.tasks[0]

      if (targetTask) {
        setSelectedTaskId(targetTask.id)
        const tDetail = await api.getTask(runId, targetTask.id)
        setTaskDetail(tDetail)

        if (tDetail.evidenceAvailable) {
          setIsLoadingDiff(true)
          try {
            const diffData = await api.getEvidenceDiff(runId, targetTask.id)
            setDiff(diffData.diff)
          } catch {
            setDiff('')
          } finally {
            setIsLoadingDiff(false)
          }
        } else {
          setDiff('')
        }
      } else {
        setTaskDetail(null)
        setDiff('')
      }
    } catch (err) {
      console.error('Failed to load run detail:', err)
    }
  }, [selectedTaskId])

  useEffect(() => {
    if (selectedRunId) {
      void loadRunDetails(selectedRunId)
    } else {
      setRunDetail(null)
      setTaskDetail(null)
      setSelectedTaskId(null)
      setDiff('')
    }
  }, [selectedRunId, loadRunDetails])

  // Handle SSE events
  const handleEvent = useCallback(
    (event: GravitasEvent) => {
      // Re-fetch runs list on run creation or state change
      if (event.type.startsWith('RUN_')) {
        void api.listRuns().then((updated) => setRuns(updated))
      }

      // Re-fetch active run if it matches
      if (selectedRunId && event.runId === selectedRunId) {
        void loadRunDetails(selectedRunId)
      }
    },
    [selectedRunId, loadRunDetails]
  )

  const { events, status: sseStatus, clearEvents } = useEvents({ onEvent: handleEvent })

  // Action: Create Run
  const handleCreateRun = async (input: CreateRunInput) => {
    setIsActing(true)
    setErrorMessage(null)
    try {
      const result = await api.createRun(input)
      const updatedRuns = await api.listRuns()
      setRuns(updatedRuns)
      setSelectedRunId(result.runId)
      await loadRunDetails(result.runId)
    } catch (err) {
      const msg = err instanceof GravitasApiError ? err.message : 'Run creation failed'
      setErrorMessage(msg)
      throw err
    } finally {
      setIsActing(false)
    }
  }

  // Action: Execute Run
  const handleExecuteRun = async () => {
    if (!selectedRunId) return
    setIsActing(true)
    setErrorMessage(null)
    try {
      await api.executeRun(selectedRunId)
      await loadRunDetails(selectedRunId)
    } catch (err) {
      const msg = err instanceof GravitasApiError ? err.message : 'Execution failed'
      setErrorMessage(msg)
    } finally {
      setIsActing(false)
    }
  }

  // Action: Approve Task
  const handleApprove = async (reviewer: string) => {
    if (!selectedRunId || !taskDetail) return
    setIsActing(true)
    setErrorMessage(null)
    try {
      await api.approveTask(selectedRunId, taskDetail.task.id, reviewer)
      await loadRunDetails(selectedRunId)
      const updatedRuns = await api.listRuns()
      setRuns(updatedRuns)
    } catch (err) {
      const msg = err instanceof GravitasApiError ? err.message : 'Approval failed'
      setErrorMessage(msg)
    } finally {
      setIsActing(false)
    }
  }

  // Action: Reject Task
  const handleReject = async (reason: string) => {
    if (!selectedRunId || !taskDetail) return
    setIsActing(true)
    setErrorMessage(null)
    try {
      await api.rejectTask(selectedRunId, taskDetail.task.id, reason)
      await loadRunDetails(selectedRunId)
      const updatedRuns = await api.listRuns()
      setRuns(updatedRuns)
    } catch (err) {
      const msg = err instanceof GravitasApiError ? err.message : 'Rejection failed'
      setErrorMessage(msg)
    } finally {
      setIsActing(false)
    }
  }

  const currentTask: Task | null = taskDetail?.task ?? runDetail?.tasks[0] ?? null
  const currentRunStatus = runDetail?.run.status ?? null

  const waitingApprovalTask = useMemo(() => {
    return (
      runDetail?.tasks.find((t) => t.state === 'WAITING_APPROVAL') ??
      (currentTask?.state === 'WAITING_APPROVAL' ? currentTask : null)
    )
  }, [runDetail?.tasks, currentTask])

  // Living Office Stations Derivation
  const officeStations = useMemo(() => {
    return deriveOfficeState({
      run: runDetail?.run ?? null,
      tasks: runDetail?.tasks ?? (currentTask ? [currentTask] : []),
      activeTask: currentTask,
      harness: stateSummary?.harness ?? { id: 'free-claude-code', status: 'UNKNOWN' },
    })
  }, [runDetail, currentTask, stateSummary?.harness])

  // Bidirectional sync: keep selectedWorkerId aligned with selectedTaskId
  useEffect(() => {
    if (selectedTaskId) {
      const match = officeStations.find(
        (w) => w.currentTaskId === selectedTaskId || w.id === selectedTaskId
      )
      if (match) {
        setSelectedWorkerId(match.id)
      }
    }
  }, [selectedTaskId, officeStations])

  // Combined events: live SSE events merged with authoritative run history
  const allEvents = useMemo(() => {
    const combined = [...events]
    if (runDetail?.recentEvents) {
      for (const evt of runDetail.recentEvents) {
        if (!combined.some((e) => e.eventId === evt.eventId)) {
          combined.push(evt)
        }
      }
    }
    return combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [events, runDetail?.recentEvents])

  // Human Inbox Items Derivation
  const inboxItems = useMemo(() => {
    return deriveInboxItems({
      runs,
      tasks: runDetail?.tasks ?? (currentTask ? [currentTask] : []),
      taskDetail,
      events: allEvents,
      acknowledgedIds: acknowledgedInboxIds,
    })
  }, [runs, runDetail?.tasks, currentTask, taskDetail, allEvents, acknowledgedInboxIds])

  // Background Notification Trigger (Policy-Enforced)
  useEffect(() => {
    const unhandledCritical = inboxItems.find(
      (item) =>
        (item.severity === 'ACTION_REQUIRED' || item.severity === 'CRITICAL') &&
        !item.isAcknowledged
    )
    if (unhandledCritical) {
      browserNotifier.send(unhandledCritical)
    }
  }, [inboxItems])

  // Keyboard Shortcuts (Ctrl/Cmd+K for Command Palette, Ctrl/Cmd+I for Inbox)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsCommandPaletteOpen((prev) => !prev)
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
        e.preventDefault()
        setIsInboxOpen((prev) => !prev)
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [])

  // Command Palette Registry
  const paletteCommands: CommandItem[] = useMemo(() => {
    return [
      {
        id: 'nav-office',
        title: 'Open Living Office Floor',
        subtitle: 'Switch workspace view to active spatial worker stations',
        category: 'NAVIGATION',
        shortcut: 'Ctrl+1',
        run: () => setActiveView('OFFICE'),
      },
      {
        id: 'nav-graph',
        title: 'Open Execution Graph',
        subtitle: 'View deterministic execution pipeline and gates',
        category: 'NAVIGATION',
        shortcut: 'Ctrl+2',
        run: () => setActiveView('GRAPH'),
      },
      {
        id: 'nav-evidence',
        title: 'Open Evidence & Diff Inspector',
        subtitle: 'Inspect change scope, verifier runner, and unified git diff',
        category: 'NAVIGATION',
        shortcut: 'Ctrl+3',
        run: () => setActiveView('EVIDENCE'),
      },
      {
        id: 'nav-timeline',
        title: 'Open Activity Timeline',
        subtitle: 'Review operational chronological stream from SSE events',
        category: 'NAVIGATION',
        shortcut: 'Ctrl+4',
        run: () => setActiveView('TIMELINE'),
      },
      {
        id: 'nav-agents',
        title: 'Open Capability Registry V0',
        subtitle: 'Inspect registered agents, qualifications, and capability grants',
        category: 'NAVIGATION',
        shortcut: 'Ctrl+5',
        run: () => setActiveView('AGENTS'),
      },
      {
        id: 'toggle-inbox',
        title: 'Toggle Operator Inbox',
        subtitle: `${inboxItems.length} actionable review items`,
        category: 'SYSTEM',
        shortcut: 'Ctrl+I',
        run: () => setIsInboxOpen((prev) => !prev),
      },
      {
        id: 'act-new-run',
        title: 'Compose New Goal / Run',
        subtitle: 'Open Goal Composer to declare goal and criteria',
        category: 'EXECUTION',
        shortcut: 'Ctrl+N',
        run: () => setIsComposerOpen(true),
      },
      {
        id: 'act-execute',
        title: 'Execute Golden Loop Run',
        subtitle: currentTask?.state === 'READY' ? 'Dispatch active task' : 'Active task not in READY state',
        category: 'EXECUTION',
        disabled: currentTask?.state !== 'READY' || isActing,
        run: () => void handleExecuteRun(),
      },
      {
        id: 'act-approve',
        title: 'Approve Result',
        subtitle: currentTask?.state === 'WAITING_APPROVAL' ? 'Approve verified mutation' : 'Task not awaiting approval',
        category: 'EXECUTION',
        disabled: currentTask?.state !== 'WAITING_APPROVAL' || isActing,
        run: () => void handleApprove('operator'),
      },
      {
        id: 'jump-approval',
        title: 'Jump to Task Needing Approval',
        subtitle: waitingApprovalTask
          ? `Focus task [${waitingApprovalTask.id}] awaiting human review`
          : 'No task currently awaiting approval',
        category: 'NAVIGATION',
        disabled: !waitingApprovalTask,
        run: () => {
          if (waitingApprovalTask && selectedRunId) {
            void loadTaskDetails(selectedRunId, waitingApprovalTask.id)
            setActiveView('OFFICE')
          }
        },
      },
      {
        id: 'jump-active',
        title: 'Jump to Active Executing Task',
        subtitle: 'Focus current running or verifying task in inspector',
        category: 'NAVIGATION',
        run: () => {
          const active = runDetail?.tasks.find(
            (t) => t.state === 'RUNNING' || t.state === 'VERIFYING'
          )
          if (active && selectedRunId) {
            void loadTaskDetails(selectedRunId, active.id)
            setActiveView('OFFICE')
          }
        },
      },
      {
        id: 'act-clear-events',
        title: 'Clear Event Stream',
        subtitle: 'Reset in-memory SSE event history',
        category: 'SYSTEM',
        run: () => clearEvents(),
      },
    ]
  }, [inboxItems.length, currentTask?.state, isActing, waitingApprovalTask, selectedRunId, runDetail?.tasks, loadTaskDetails])

  // Inbox Action Handler
  const handleInboxActionClick = (item: InboxItem) => {
    if (item.runId && item.runId !== selectedRunId) {
      setSelectedRunId(item.runId)
    }

    if (item.actionType === 'APPROVE') {
      setActiveView('EVIDENCE')
      setIsInboxOpen(false)
    } else if (item.actionType === 'INSPECT_FAILURE' || item.actionType === 'VIEW_DIFF' || item.actionType === 'VIEW_TASK') {
      setActiveView('EVIDENCE')
      setIsInboxOpen(false)
    }
  }

  const handleDismissInboxItem = (itemId: string) => {
    setAcknowledgedInboxIds((prev) => new Set([...prev, itemId]))
  }

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-app)',
        color: 'var(--text-primary)',
        overflow: 'hidden',
      }}
    >
      {/* Top Navigation Bar with View Switcher, Inbox, Command Palette */}
      <TopBar
        connectionStatus={sseStatus}
        version={stateSummary?.version ?? '0.0.1'}
        harness={
          stateSummary?.harness ?? {
            id: 'free-claude-code',
            status: 'UNKNOWN',
          }
        }
        currentView={activeView}
        onViewChange={(v) => setActiveView(v)}
        inboxCount={inboxItems.length}
        onToggleInbox={() => setIsInboxOpen(!isInboxOpen)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onNewRunClick={() => setIsComposerOpen(true)}
      />

      {/* Global Error Banner */}
      {errorMessage && (
        <div
          style={{
            padding: '8px 16px',
            backgroundColor: 'var(--state-failure-bg)',
            borderBottom: '1px solid var(--state-failure-border)',
            color: 'var(--state-failure-fg)',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>Error: {errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--state-failure-fg)',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Workspace (Left Rail + Central View) */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Left Rail: Runs List */}
        <RunsList
          runs={runs}
          selectedRunId={selectedRunId}
          onSelectRun={(id) => setSelectedRunId(id)}
          onNewRunClick={() => setIsComposerOpen(true)}
        />

        {/* Central Workspace Area */}
        <main
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            backgroundColor: 'var(--bg-app)',
          }}
        >
          {/* VIEW: LIVING OFFICE FLOOR */}
          {activeView === 'OFFICE' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <OfficeFloor
                workers={officeStations}
                selectedWorkerId={selectedWorkerId}
                onSelectWorker={(wId) => {
                  setSelectedWorkerId(wId)
                  const station = officeStations.find((w) => w.id === wId)
                  if (station?.currentTaskId && selectedRunId) {
                    void loadTaskDetails(selectedRunId, station.currentTaskId)
                  }
                }}
                onExecuteTask={currentTask?.state === 'READY' ? handleExecuteRun : undefined}
                onApproveTask={currentTask?.state === 'WAITING_APPROVAL' ? () => void handleApprove('operator') : undefined}
                onInspectEvidence={() => setActiveView('EVIDENCE')}
                isActing={isActing}
                onNewRunClick={() => setIsComposerOpen(true)}
                waitingApprovalTask={waitingApprovalTask}
                run={runDetail?.run ?? null}
                tasks={runDetail?.tasks ?? []}
                activeTask={currentTask}
                harness={stateSummary?.harness}
                onSelectTask={(taskId) => {
                  if (selectedRunId) {
                    void loadTaskDetails(selectedRunId, taskId)
                  }
                }}
              />

              {/* Task Details & Inspector underneath Office Floor */}
              <div
                style={{
                  flex: '0 0 45%',
                  minHeight: 0,
                  borderTop: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  backgroundColor: 'var(--bg-panel-subtle)',
                }}
              >
                <TaskInspector
                  task={currentTask}
                  taskDetail={taskDetail}
                  diff={diff}
                  isLoadingDiff={isLoadingDiff}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onExecuteRun={currentTask?.state === 'READY' ? handleExecuteRun : undefined}
                  isActing={isActing}
                />
              </div>
            </div>
          )}

          {/* VIEW: TRUTHFUL EXECUTION GRAPH */}
          {activeView === 'GRAPH' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <ExecutionGraph
                task={currentTask}
                taskDetail={taskDetail}
                runStatus={currentRunStatus}
                tasks={runDetail?.tasks ?? []}
                selectedTaskId={selectedTaskId ?? currentTask?.id}
                onSelectTask={(taskId) => {
                  if (selectedRunId) {
                    void loadTaskDetails(selectedRunId, taskId)
                  }
                }}
              />
              <TaskInspector
                task={currentTask}
                taskDetail={taskDetail}
                diff={diff}
                isLoadingDiff={isLoadingDiff}
                onApprove={handleApprove}
                onReject={handleReject}
                onExecuteRun={currentTask?.state === 'READY' ? handleExecuteRun : undefined}
                isActing={isActing}
              />
            </div>
          )}

          {/* VIEW: DEEP FORENSIC EVIDENCE */}
          {activeView === 'EVIDENCE' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <TaskInspector
                task={currentTask}
                taskDetail={taskDetail}
                diff={diff}
                isLoadingDiff={isLoadingDiff}
                onApprove={handleApprove}
                onReject={handleReject}
                onExecuteRun={currentTask?.state === 'READY' ? handleExecuteRun : undefined}
                isActing={isActing}
              />
            </div>
          )}

          {/* VIEW: ACTIVITY TIMELINE */}
          {activeView === 'TIMELINE' && (
            <ActivityTimeline events={allEvents} onClear={clearEvents} />
          )}

          {/* VIEW: AGENT CAPABILITY REGISTRY V0 */}
          {activeView === 'AGENTS' && (
            <AgentRegistryView />
          )}
        </main>

        {/* Human Inbox Drawer */}
        <InboxDrawer
          isOpen={isInboxOpen}
          onClose={() => setIsInboxOpen(false)}
          items={inboxItems}
          onActionClick={handleInboxActionClick}
          onDismissItem={handleDismissInboxItem}
        />
      </div>

      {/* Live Event Stream Console (Bottom Collapsible Bar) */}
      <EventConsole events={allEvents} onClear={clearEvents} />

      {/* Command Palette Modal (Ctrl/Cmd+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        commands={paletteCommands}
      />

      {/* Goal Composer Modal */}
      <GoalComposer
        isOpen={isComposerOpen}
        onClose={() => setIsComposerOpen(false)}
        onSubmit={handleCreateRun}
        isSubmitting={isActing}
      />
    </div>
  )
}
export default App
