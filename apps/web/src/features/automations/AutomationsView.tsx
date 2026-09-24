import React, { useCallback, useEffect, useState } from 'react'
import { api } from '../../api/client.js'
import type {
  BackgroundJob,
  JobRun,
  PersonalOsNotification,
} from '../../api/types.js'

export const AutomationsView: React.FC = () => {
  const [jobs, setJobs] = useState<readonly BackgroundJob[]>([])
  const [recentRuns, setRecentRuns] = useState<readonly JobRun[]>([])
  const [notifications, setNotifications] = useState<readonly PersonalOsNotification[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Filters & Tabs
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [runsTab, setRunsTab] = useState<'ALL' | 'WAITING_APPROVAL'>('ALL')
  const [showNotificationsDrawer, setShowNotificationsDrawer] = useState<boolean>(false)
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false)

  // Create Job Form State
  const [formId, setFormId] = useState<string>(() => `job_${Date.now().toString(36)}`)
  const [formTitle, setFormTitle] = useState<string>('')
  const [formDescription, setFormDescription] = useState<string>('')
  const [formPreset, setFormPreset] = useState<'REMINDER' | 'REPO_CHECK' | 'FILE_STAT' | 'NOOP' | 'CALENDAR_AGENDA' | 'CALENDAR_REMINDER' | 'CALENDAR_CONFLICT'>('REMINDER')
  const [formTriggerType, setFormTriggerType] = useState<'INTERVAL' | 'MANUAL' | 'CRON'>('INTERVAL')
  const [formIntervalSec, setFormIntervalSec] = useState<number>(3600)
  const [formCron, setFormCron] = useState<string>('0 14 * * *')
  const [formActionTitle, setFormActionTitle] = useState<string>('Hydration Alert')
  const [formActionMessage, setFormActionMessage] = useState<string>('Remember to drink water.')
  const [formFilePath, setFormFilePath] = useState<string>('README.md')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      const [jobsData, stateData, notifsData] = await Promise.all([
        api.listJobs(),
        api.getState(),
        api.listNotifications(),
      ])
      setJobs(jobsData)
      setNotifications(notifsData)
      if (stateData.projection?.recentJobRuns) {
        setRecentRuns(stateData.projection.recentJobRuns)
      }
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch automation state')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchData()
    const interval = setInterval(fetchData, 3000)
    return () => clearInterval(interval)
  }, [fetchData])

  // Actions
  const handleTriggerRun = async (jobId: string) => {
    try {
      await api.triggerJobRun(jobId)
      await fetchData()
    } catch (err) {
      alert(`Trigger failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const handlePause = async (jobId: string) => {
    try {
      await api.pauseJob(jobId)
      await fetchData()
    } catch (err) {
      alert(`Pause failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const handleResume = async (jobId: string) => {
    try {
      await api.resumeJob(jobId)
      await fetchData()
    } catch (err) {
      alert(`Resume failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const handleCancel = async (jobId: string) => {
    try {
      await api.cancelJob(jobId)
      await fetchData()
    } catch (err) {
      console.error('Cancel failed:', err)
    }
  }

  const handleApproveRun = async (jobId: string, runId: string) => {
    try {
      await api.approveJobRun(jobId, runId)
      await fetchData()
    } catch (err) {
      alert(`Approval failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const handleRejectRun = async (jobId: string, runId: string) => {
    try {
      await api.rejectJobRun(jobId, runId, 'Rejected from Sovereign Automations Console')
      await fetchData()
    } catch (err) {
      alert(`Rejection failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const handleMarkNotificationRead = async (id: string) => {
    try {
      await api.markNotificationRead(id)
      await fetchData()
    } catch (err) {
      console.error(err)
    }
  }

  const handleMarkAllNotificationsRead = async () => {
    try {
      await api.markAllNotificationsRead()
      await fetchData()
    } catch (err) {
      console.error(err)
    }
  }

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      let action: any
      let jobKind: any = 'CHECK'
      let domains: any = ['system']

      if (formPreset === 'REMINDER') {
        jobKind = 'REMINDER'
        action = {
          type: 'EMIT_NOTIFICATION',
          title: formActionTitle,
          message: formActionMessage,
          severity: 'INFO',
        }
      } else if (formPreset === 'REPO_CHECK') {
        jobKind = 'REPOSITORY_CHECK'
        action = {
          type: 'REPOSITORY_CHECK',
          repositoryId: 'repo:core',
          checkType: 'STATUS',
        }
      } else if (formPreset === 'FILE_STAT') {
        jobKind = 'FILE_OPERATION'
        action = {
          type: 'FILE_OPERATION',
          operation: 'STAT',
          path: formFilePath,
        }
      } else if (formPreset === 'CALENDAR_AGENDA') {
        jobKind = 'SUMMARY'
        domains = ['calendar']
        action = {
          type: 'CONNECTOR_READ',
          connectorId: 'connector-calendar-google',
          capability: 'calendar.events.list',
          params: { calendarId: 'primary', maxResults: 10 },
        }
      } else if (formPreset === 'CALENDAR_REMINDER') {
        jobKind = 'REMINDER'
        domains = ['calendar']
        action = {
          type: 'CONNECTOR_READ',
          connectorId: 'connector-calendar-google',
          capability: 'calendar.events.list',
          params: { calendarId: 'primary', maxResults: 5 },
        }
      } else if (formPreset === 'CALENDAR_CONFLICT') {
        jobKind = 'CHECK'
        domains = ['calendar']
        action = {
          type: 'CONNECTOR_READ',
          connectorId: 'connector-calendar-google',
          capability: 'calendar.events.list',
          params: { calendarId: 'primary', maxResults: 20 },
        }
      } else {
        action = {
          type: 'NOOP',
          message: 'Zero Mutation Ping',
        }
      }

      let trigger: any
      if (formTriggerType === 'INTERVAL') {
        trigger = {
          type: 'INTERVAL',
          intervalSeconds: Math.max(60, Number(formIntervalSec) || 3600),
          anchorAt: new Date().toISOString(),
          timezone: 'UTC',
        }
      } else if (formTriggerType === 'CRON') {
        trigger = {
          type: 'CRON',
          expression: formCron || '0 14 * * *',
          timezone: 'UTC',
        }
      } else {
        trigger = {
          type: 'MANUAL',
        }
      }

      const newJob: BackgroundJob = {
        id: formId.trim() || `job_${Date.now().toString(36)}`,
        title: formTitle.trim() || 'Untitled Automation',
        description: formDescription.trim() || undefined,
        kind: jobKind,
        status: 'ENABLED',
        trigger,
        action,
        autonomyLevel: 'L1',
        requiredAuthority: 'READ',
        contextDomains: domains,
        executionBudget: {
          maxRuntimeMs: 30000,
          maxAttempts: 1,
        },
        retryPolicy: {
          mode: 'NONE',
          maxAttempts: 1,
          delayMs: 1000,
        },
        notificationPolicy: {
          deliveryPolicy: 'IMMEDIATE',
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await api.createJob(newJob)
      setShowCreateModal(false)
      setFormId(`job_${Date.now().toString(36)}`)
      setFormTitle('')
      setFormDescription('')
      await fetchData()
    } catch (err) {
      console.error('Create job failed:', err)
      setError(`Create job failed: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Derived metrics
  const unreadNotifs = notifications.filter((n) => !n.readAt)
  const waitingApprovalRuns = recentRuns.filter((r) => r.status === 'WAITING_APPROVAL')
  const runningRuns = recentRuns.filter((r) => r.status === 'RUNNING')

  const filteredJobs = jobs.filter((j) => {
    if (statusFilter === 'ALL') return true
    return j.status === statusFilter
  })

  const displayedRuns = runsTab === 'WAITING_APPROVAL' ? waitingApprovalRuns : recentRuns

  return (
    <div
      data-testid="automations-view"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        backgroundColor: 'var(--bg-canvas)',
        color: 'var(--text-primary)',
        overflowY: 'auto',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* 1. Header & Summary Telemetry Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 24px',
          backgroundColor: 'var(--bg-panel)',
          borderBottom: '1px solid var(--border-color)',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>⚡</span>
            <h1
              data-testid="automations-title"
              style={{
                fontSize: '18px',
                fontWeight: 700,
                letterSpacing: '-0.3px',
                margin: 0,
              }}
            >
              Personal OS Background Automations & Scheduler
            </h1>
            {isLoading && (
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                [SYNCING]
              </span>
            )}
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
            Deterministic background execution kernel — Zero LLM daemons, complete SQLite restart survival.
          </p>
        </div>

        {/* Stats strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            data-testid="stat-total-jobs"
            style={{
              padding: '6px 12px',
              backgroundColor: 'var(--bg-panel-elevated)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Jobs</div>
            <div style={{ fontSize: '16px', fontWeight: 700 }}>{jobs.length}</div>
          </div>

          <div
            data-testid="stat-running-jobs"
            style={{
              padding: '6px 12px',
              backgroundColor: 'var(--bg-panel-elevated)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Running</div>
            <div
              style={{
                fontSize: '16px',
                fontWeight: 700,
                color: runningRuns.length > 0 ? 'var(--state-verifying-fg)' : 'inherit',
              }}
            >
              {runningRuns.length}
            </div>
          </div>

          <div
            data-testid="stat-approval-needed"
            style={{
              padding: '6px 12px',
              backgroundColor: 'var(--bg-panel-elevated)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Approvals</div>
            <div
              style={{
                fontSize: '16px',
                fontWeight: 700,
                color: waitingApprovalRuns.length > 0 ? 'var(--state-failure-fg)' : 'inherit',
              }}
            >
              {waitingApprovalRuns.length}
            </div>
          </div>

          {/* Notifications toggle */}
          <button
            data-testid="toggle-notifications-btn"
            onClick={() => setShowNotificationsDrawer((prev) => !prev)}
            style={{
              position: 'relative',
              padding: '8px 14px',
              backgroundColor: showNotificationsDrawer ? 'var(--brand-primary)' : 'var(--bg-panel-elevated)',
              color: showNotificationsDrawer ? '#fff' : 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>🔔 Notifications</span>
            {unreadNotifs.length > 0 && (
              <span
                data-testid="unread-notifications-badge"
                style={{
                  padding: '2px 6px',
                  backgroundColor: 'var(--state-failure-fg)',
                  color: '#fff',
                  borderRadius: '10px',
                  fontSize: '10px',
                  fontWeight: 700,
                }}
              >
                {unreadNotifs.length}
              </span>
            )}
          </button>

          {/* New Job Button */}
          <button
            data-testid="new-job-button"
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: '8px 16px',
              backgroundColor: 'var(--brand-primary, #3b82f6)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>+</span>
            <span>New Automation</span>
          </button>
        </div>
      </div>

      {error && (
        <div
          data-testid="automations-error-banner"
          style={{
            padding: '10px 24px',
            backgroundColor: 'var(--state-failure-bg)',
            color: 'var(--state-failure-fg)',
            borderBottom: '1px solid var(--state-failure-border, rgba(239, 68, 68, 0.3))',
            fontSize: '12px',
          }}
        >
          {error}
        </div>
      )}

      {/* Main Content Layout */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* Left Column: Scheduled Jobs and Recent Runs */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            padding: '20px 24px',
            gap: '24px',
          }}
        >
          {/* Scheduled Jobs Section */}
          <section data-testid="scheduled-jobs-section">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
              }}
            >
              <h2 style={{ fontSize: '15px', fontWeight: 600, margin: 0, letterSpacing: '-0.2px' }}>
                Configured Background Jobs ({filteredJobs.length})
              </h2>

              {/* Status Filter */}
              <div style={{ display: 'flex', gap: '6px' }}>
                {(['ALL', 'ENABLED', 'PAUSED', 'CANCELLED'] as const).map((st) => (
                  <button
                    key={st}
                    data-testid={`filter-${st.toLowerCase()}`}
                    onClick={() => setStatusFilter(st)}
                    style={{
                      padding: '4px 10px',
                      fontSize: '11px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: statusFilter === st ? 'var(--bg-panel-elevated)' : 'transparent',
                      color: statusFilter === st ? 'var(--text-primary)' : 'var(--text-muted)',
                      border: statusFilter === st ? '1px solid var(--border-color)' : '1px solid transparent',
                      cursor: 'pointer',
                      fontWeight: statusFilter === st ? 600 : 400,
                    }}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {filteredJobs.length === 0 ? (
              <div
                data-testid="empty-jobs-state"
                style={{
                  padding: '32px',
                  textAlign: 'center',
                  backgroundColor: 'var(--bg-panel)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px dashed var(--border-color)',
                  color: 'var(--text-muted)',
                  fontSize: '13px',
                }}
              >
                No background jobs found. Click "+ New Automation" above to schedule safe background execution.
              </div>
            ) : (
              <div
                style={{
                  backgroundColor: 'var(--bg-panel)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  overflow: 'hidden',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr
                      style={{
                        backgroundColor: 'var(--bg-panel-elevated)',
                        borderBottom: '1px solid var(--border-color)',
                        textAlign: 'left',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <th style={{ padding: '10px 14px', fontWeight: 600 }}>Job</th>
                      <th style={{ padding: '10px 14px', fontWeight: 600 }}>Kind</th>
                      <th style={{ padding: '10px 14px', fontWeight: 600 }}>Status</th>
                      <th style={{ padding: '10px 14px', fontWeight: 600 }}>Trigger</th>
                      <th style={{ padding: '10px 14px', fontWeight: 600 }}>Authority</th>
                      <th style={{ padding: '10px 14px', fontWeight: 600 }}>Next Run</th>
                      <th style={{ padding: '10px 14px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredJobs.map((job) => (
                      <tr
                        key={job.id}
                        data-testid={`job-row-${job.id}`}
                        style={{ borderBottom: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.05))' }}
                      >
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{job.title}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            {job.id}
                          </div>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span
                            style={{
                              padding: '2px 6px',
                              borderRadius: 'var(--radius-sm)',
                              backgroundColor: 'var(--bg-panel-elevated)',
                              fontSize: '10px',
                              fontFamily: 'var(--font-mono)',
                            }}
                          >
                            {job.kind}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span
                            data-testid={`job-status-${job.id}`}
                            style={{
                              padding: '2px 8px',
                              borderRadius: '10px',
                              fontSize: '10px',
                              fontWeight: 600,
                              backgroundColor:
                                job.status === 'ENABLED'
                                  ? 'var(--state-success-bg, rgba(34, 197, 94, 0.15))'
                                  : job.status === 'PAUSED'
                                    ? 'var(--state-verifying-bg, rgba(234, 179, 8, 0.15))'
                                    : 'var(--state-failure-bg, rgba(239, 68, 68, 0.15))',
                              color:
                                job.status === 'ENABLED'
                                  ? 'var(--state-success-fg, #22c55e)'
                                  : job.status === 'PAUSED'
                                    ? 'var(--state-verifying-fg, #eab308)'
                                    : 'var(--state-failure-fg, #ef4444)',
                            }}
                          >
                            {job.status}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>
                          {job.trigger.type === 'INTERVAL' && `Every ${job.trigger.intervalSeconds}s`}
                          {job.trigger.type === 'CRON' && `Cron (${job.trigger.expression})`}
                          {job.trigger.type === 'ONE_TIME' && `Once at ${new Date(job.trigger.runAt).toLocaleTimeString()}`}
                          {job.trigger.type === 'MANUAL' && 'Manual Only'}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                            {job.autonomyLevel} / {job.requiredAuthority}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: '11px' }}>
                          {job.nextRunAt ? new Date(job.nextRunAt).toLocaleString() : '—'}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                            <button
                              data-testid={`run-now-btn-${job.id}`}
                              onClick={() => handleTriggerRun(job.id)}
                              style={{
                                padding: '3px 8px',
                                fontSize: '11px',
                                backgroundColor: 'var(--bg-panel-elevated)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-sm)',
                                color: 'var(--text-primary)',
                                cursor: 'pointer',
                              }}
                            >
                              ▶ Run
                            </button>

                            {job.status === 'ENABLED' ? (
                              <button
                                data-testid={`pause-btn-${job.id}`}
                                onClick={() => handlePause(job.id)}
                                style={{
                                  padding: '3px 8px',
                                  fontSize: '11px',
                                  backgroundColor: 'var(--bg-panel-elevated)',
                                  border: '1px solid var(--border-color)',
                                  borderRadius: 'var(--radius-sm)',
                                  color: 'var(--text-primary)',
                                  cursor: 'pointer',
                                }}
                              >
                                ⏸ Pause
                              </button>
                            ) : job.status === 'PAUSED' ? (
                              <button
                                data-testid={`resume-btn-${job.id}`}
                                onClick={() => handleResume(job.id)}
                                style={{
                                  padding: '3px 8px',
                                  fontSize: '11px',
                                  backgroundColor: 'var(--bg-panel-elevated)',
                                  border: '1px solid var(--border-color)',
                                  borderRadius: 'var(--radius-sm)',
                                  color: 'var(--text-primary)',
                                  cursor: 'pointer',
                                }}
                              >
                                ⏵ Resume
                              </button>
                            ) : null}

                            {job.status !== 'CANCELLED' && (
                              <button
                                data-testid={`cancel-btn-${job.id}`}
                                onClick={() => handleCancel(job.id)}
                                style={{
                                  padding: '3px 8px',
                                  fontSize: '11px',
                                  backgroundColor: 'transparent',
                                  border: '1px solid var(--state-failure-border, rgba(239, 68, 68, 0.3))',
                                  borderRadius: 'var(--radius-sm)',
                                  color: 'var(--state-failure-fg, #ef4444)',
                                  cursor: 'pointer',
                                }}
                              >
                                ✕ Cancel
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Recent Runs Section */}
          <section data-testid="recent-runs-section">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
              }}
            >
              <h2 style={{ fontSize: '15px', fontWeight: 600, margin: 0, letterSpacing: '-0.2px' }}>
                Execution History & Audit Log
              </h2>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  data-testid="tab-all-runs"
                  onClick={() => setRunsTab('ALL')}
                  style={{
                    padding: '4px 10px',
                    fontSize: '11px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: runsTab === 'ALL' ? 'var(--bg-panel-elevated)' : 'transparent',
                    color: runsTab === 'ALL' ? 'var(--text-primary)' : 'var(--text-muted)',
                    border: runsTab === 'ALL' ? '1px solid var(--border-color)' : '1px solid transparent',
                    cursor: 'pointer',
                    fontWeight: runsTab === 'ALL' ? 600 : 400,
                  }}
                >
                  All Runs ({recentRuns.length})
                </button>
                <button
                  data-testid="tab-waiting-approval"
                  onClick={() => setRunsTab('WAITING_APPROVAL')}
                  style={{
                    padding: '4px 10px',
                    fontSize: '11px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: runsTab === 'WAITING_APPROVAL' ? 'var(--bg-panel-elevated)' : 'transparent',
                    color: runsTab === 'WAITING_APPROVAL' ? 'var(--state-failure-fg)' : 'var(--text-muted)',
                    border: runsTab === 'WAITING_APPROVAL' ? '1px solid var(--border-color)' : '1px solid transparent',
                    cursor: 'pointer',
                    fontWeight: runsTab === 'WAITING_APPROVAL' ? 600 : 400,
                  }}
                >
                  Needs Approval ({waitingApprovalRuns.length})
                </button>
              </div>
            </div>

            {displayedRuns.length === 0 ? (
              <div
                data-testid="empty-runs-state"
                style={{
                  padding: '24px',
                  textAlign: 'center',
                  backgroundColor: 'var(--bg-panel)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px dashed var(--border-color)',
                  color: 'var(--text-muted)',
                  fontSize: '12px',
                }}
              >
                No execution records in this view.
              </div>
            ) : (
              <div
                style={{
                  backgroundColor: 'var(--bg-panel)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  overflow: 'hidden',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr
                      style={{
                        backgroundColor: 'var(--bg-panel-elevated)',
                        borderBottom: '1px solid var(--border-color)',
                        textAlign: 'left',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <th style={{ padding: '8px 12px', fontWeight: 600 }}>Run ID / Job</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600 }}>Status</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600 }}>Tokens / Cost</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600 }}>Result Summary</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600 }}>Finished At</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedRuns.map((run) => (
                      <tr
                        key={run.id}
                        data-testid={`run-row-${run.id}`}
                        style={{ borderBottom: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.05))' }}
                      >
                        <td style={{ padding: '8px 12px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{run.jobId}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            {run.id}
                          </div>
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <span
                            data-testid={`run-status-${run.id}`}
                            style={{
                              padding: '2px 6px',
                              borderRadius: '10px',
                              fontSize: '10px',
                              fontWeight: 600,
                              backgroundColor:
                                run.status === 'SUCCEEDED'
                                  ? 'var(--state-success-bg, rgba(34, 197, 94, 0.15))'
                                  : run.status === 'RUNNING'
                                    ? 'var(--state-verifying-bg, rgba(59, 130, 246, 0.15))'
                                    : run.status === 'WAITING_APPROVAL'
                                      ? 'rgba(245, 158, 11, 0.15)'
                                      : 'var(--state-failure-bg, rgba(239, 68, 68, 0.15))',
                              color:
                                run.status === 'SUCCEEDED'
                                  ? 'var(--state-success-fg, #22c55e)'
                                  : run.status === 'RUNNING'
                                    ? 'var(--brand-primary, #3b82f6)'
                                    : run.status === 'WAITING_APPROVAL'
                                      ? '#f59e0b'
                                      : 'var(--state-failure-fg, #ef4444)',
                            }}
                          >
                            {run.status}
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <span
                            data-testid={`run-tokens-${run.id}`}
                            style={{
                              fontSize: '11px',
                              fontFamily: 'var(--font-mono)',
                              color: run.reasoningUsed ? 'var(--brand-primary)' : 'var(--state-success-fg)',
                            }}
                          >
                            {run.reasoningUsed ? `${run.tokenUsage?.totalTokens ?? 0} tokens` : '0 (Deterministic)'}
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontSize: '11px' }}>
                          {run.resultSummary || run.errorCode || '—'}
                        </td>
                        <td style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: '11px' }}>
                          {run.finishedAt ? new Date(run.finishedAt).toLocaleTimeString() : 'In Progress'}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                          {run.status === 'WAITING_APPROVAL' ? (
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                              <button
                                data-testid={`approve-btn-${run.id}`}
                                onClick={() => handleApproveRun(run.jobId, run.id)}
                                style={{
                                  padding: '3px 8px',
                                  fontSize: '11px',
                                  backgroundColor: 'var(--state-success-bg, rgba(34, 197, 94, 0.2))',
                                  color: 'var(--state-success-fg, #22c55e)',
                                  border: '1px solid var(--state-success-fg, #22c55e)',
                                  borderRadius: 'var(--radius-sm)',
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                }}
                              >
                                ✓ Approve
                              </button>
                              <button
                                data-testid={`reject-btn-${run.id}`}
                                onClick={() => handleRejectRun(run.jobId, run.id)}
                                style={{
                                  padding: '3px 8px',
                                  fontSize: '11px',
                                  backgroundColor: 'transparent',
                                  color: 'var(--state-failure-fg, #ef4444)',
                                  border: '1px solid var(--state-failure-border, rgba(239, 68, 68, 0.3))',
                                  borderRadius: 'var(--radius-sm)',
                                  cursor: 'pointer',
                                }}
                              >
                                ✕ Reject
                              </button>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Notification Center Drawer */}
        {showNotificationsDrawer && (
          <div
            data-testid="notifications-drawer"
            style={{
              width: '360px',
              backgroundColor: 'var(--bg-panel)',
              borderLeft: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 16px',
                borderBottom: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-panel-elevated)',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: '14px' }}>Notification Center</div>
              {unreadNotifs.length > 0 && (
                <button
                  data-testid="mark-all-read-btn"
                  onClick={handleMarkAllNotificationsRead}
                  style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  Mark All Read
                </button>
              )}
            </div>

            <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              {notifications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)', fontSize: '12px' }}>
                  No notifications emitted yet.
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    data-testid={`notification-card-${notif.id}`}
                    style={{
                      padding: '12px',
                      backgroundColor: notif.readAt ? 'var(--bg-panel)' : 'var(--bg-panel-elevated)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      opacity: notif.readAt ? 0.7 : 1,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: 700,
                          backgroundColor:
                            notif.severity === 'ACTION_REQUIRED' || notif.severity === 'CRITICAL'
                              ? 'var(--state-failure-bg)'
                              : notif.severity === 'IMPORTANT'
                                ? 'var(--state-verifying-bg)'
                                : 'var(--bg-panel)',
                          color:
                            notif.severity === 'ACTION_REQUIRED' || notif.severity === 'CRITICAL'
                              ? 'var(--state-failure-fg)'
                              : notif.severity === 'IMPORTANT'
                                ? 'var(--state-verifying-fg)'
                                : 'var(--text-muted)',
                        }}
                      >
                        {notif.severity}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        {new Date(notif.createdAt).toLocaleTimeString()}
                      </span>
                    </div>

                    <div style={{ fontWeight: 600, fontSize: '12px', marginTop: '2px' }}>{notif.title}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {notif.body}
                    </div>

                    {!notif.readAt && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                        <button
                          data-testid={`mark-read-btn-${notif.id}`}
                          onClick={() => handleMarkNotificationRead(notif.id)}
                          style={{
                            fontSize: '10px',
                            padding: '2px 6px',
                            backgroundColor: 'transparent',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-secondary)',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                          }}
                        >
                          Mark Read
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Job Modal */}
      {showCreateModal && (
        <div
          data-testid="create-job-modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            data-testid="create-job-modal"
            style={{
              width: '480px',
              maxWidth: '90vw',
              backgroundColor: 'var(--bg-panel)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg, 8px)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Create New Background Automation</h3>
              <button
                data-testid="close-create-modal"
                onClick={() => setShowCreateModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '16px',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateJob} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Automation Title
                </label>
                <input
                  data-testid="input-job-title"
                  type="text"
                  required
                  placeholder="e.g. Repository Integrity Check"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-panel-elevated)',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Preset Safe Action
                </label>
                <select
                  data-testid="select-job-preset"
                  value={formPreset}
                  onChange={(e) => setFormPreset(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-panel-elevated)',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="REMINDER">Personal Reminder (Emit Notification)</option>
                  <option value="CALENDAR_AGENDA">📅 Calendar: Morning Agenda Sync (CONNECTOR_READ)</option>
                  <option value="CALENDAR_REMINDER">📅 Calendar: Upcoming Event Reminders (CONNECTOR_READ)</option>
                  <option value="CALENDAR_CONFLICT">📅 Calendar: Meeting Conflict Detection (CONNECTOR_READ)</option>
                  <option value="REPO_CHECK">Repository Integrity Check (repo:core)</option>
                  <option value="FILE_STAT">Local File Stat Check</option>
                  <option value="NOOP">Zero-Mutation Ping (No-op)</option>
                </select>
              </div>

              {formPreset === 'REMINDER' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      Alert Title
                    </label>
                    <input
                      data-testid="input-alert-title"
                      type="text"
                      value={formActionTitle}
                      onChange={(e) => setFormActionTitle(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-panel-elevated)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      Alert Message
                    </label>
                    <input
                      data-testid="input-alert-message"
                      type="text"
                      value={formActionMessage}
                      onChange={(e) => setFormActionMessage(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-panel-elevated)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </>
              )}

              {formPreset === 'FILE_STAT' && (
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Relative File Path
                  </label>
                  <input
                    data-testid="input-file-path"
                    type="text"
                    value={formFilePath}
                    onChange={(e) => setFormFilePath(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-panel-elevated)',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Trigger Type
                  </label>
                  <select
                    data-testid="select-trigger-type"
                    value={formTriggerType}
                    onChange={(e) => setFormTriggerType(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-panel-elevated)',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="INTERVAL">Recurring Interval</option>
                    <option value="CRON">Cron Expression</option>
                    <option value="MANUAL">Manual Trigger Only</option>
                  </select>
                </div>

                {formTriggerType === 'INTERVAL' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      Interval (Seconds, min 60)
                    </label>
                    <input
                      data-testid="input-interval-sec"
                      type="number"
                      min={60}
                      value={formIntervalSec}
                      onChange={(e) => setFormIntervalSec(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-panel-elevated)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                )}

                {formTriggerType === 'CRON' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      Cron Expression (5-part)
                    </label>
                    <input
                      data-testid="input-cron-expr"
                      type="text"
                      placeholder="0 14 * * *"
                      value={formCron}
                      onChange={(e) => setFormCron(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-panel-elevated)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button
                  type="button"
                  data-testid="cancel-create-btn"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'transparent',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  data-testid="submit-create-job-btn"
                  disabled={isSubmitting}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    backgroundColor: 'var(--brand-primary, #3b82f6)',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  {isSubmitting ? 'Creating...' : 'Create Automation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
