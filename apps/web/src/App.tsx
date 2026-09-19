import React, { useCallback, useEffect, useState } from 'react'
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
import { TopBar } from './components/TopBar.js'
import './styles/theme.css'

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

  // Fetch full details when selected run changes
  const loadRunDetails = useCallback(async (runId: string) => {
    try {
      const detail = await api.getRun(runId)
      setRunDetail(detail)

      const firstTask = detail.tasks[0]
      if (firstTask) {
        const tDetail = await api.getTask(runId, firstTask.id)
        setTaskDetail(tDetail)

        if (tDetail.evidenceAvailable) {
          setIsLoadingDiff(true)
          try {
            const diffData = await api.getEvidenceDiff(runId, firstTask.id)
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
  }, [])

  useEffect(() => {
    if (selectedRunId) {
      void loadRunDetails(selectedRunId)
    } else {
      setRunDetail(null)
      setTaskDetail(null)
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
      {/* Top Navigation & Status */}
      <TopBar
        connectionStatus={sseStatus}
        version={stateSummary?.version ?? '0.0.1'}
        harness={
          stateSummary?.harness ?? {
            id: 'free-claude-code',
            status: 'UNKNOWN',
          }
        }
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

      {/* Main Workspace (Left Rail + Center Pipeline + Right Inspector) */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
        }}
      >
        {/* Left Rail: Runs List */}
        <RunsList
          runs={runs}
          selectedRunId={selectedRunId}
          onSelectRun={(id) => setSelectedRunId(id)}
          onNewRunClick={() => setIsComposerOpen(true)}
        />

        {/* Central Workspace */}
        <main
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            backgroundColor: 'var(--bg-app)',
          }}
        >
          {/* Central Execution Pipeline */}
          <ExecutionGraph
            task={currentTask}
            taskDetail={taskDetail}
            runStatus={currentRunStatus}
          />

          {/* Task & Evidence Inspector */}
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
        </main>
      </div>

      {/* Live Event Stream Console (Bottom) */}
      <EventConsole events={events} onClear={clearEvents} />

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
