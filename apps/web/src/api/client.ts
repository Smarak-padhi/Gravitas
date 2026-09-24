/**
 * Strongly-typed API client for Gravitas Local Control Plane.
 * Communicates through same-origin /api/v1 endpoints via Vite proxy.
 */

import type {
  AgentCapabilityItem,
  AgentDescriptor,
  ApiErrorPayload,
  BrowserQaResult,
  CreateRunInput,
  CreateRunResponse,
  HealthResponse,
  PromptPreviewRequest,
  PromptPreviewResponse,
  Run,
  RunDetailResponse,
  StateSummaryResponse,
  Task,
  TaskDetailResponse,
  TaskEvidenceDiffResponse,
  TaskEvidenceResponse,
  TaskPromptResponse,
  BackgroundJob,
  JobRun,
  PersonalOsNotification,
  ConnectorDescriptor,
  ConnectorAccount,
  ConnectorAuditLogEntry,
  CalendarSummary,
  CalendarEventSummary,
  CalendarEventsPage,
  CalendarEventsQuery,
} from './types.js'

export class GravitasApiError extends Error {
  public readonly code: string
  public readonly statusCode: number
  public readonly requestId?: string

  constructor(statusCode: number, code: string, message: string, requestId?: string) {
    super(message)
    this.name = 'GravitasApiError'
    this.statusCode = statusCode
    this.code = code
    this.requestId = requestId
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!res.ok) {
    let code = 'HTTP_ERROR'
    let message = `Request failed with status ${res.status}`
    let requestId = res.headers.get('X-Gravitas-Request-Id') ?? undefined

    try {
      const data = (await res.json()) as ApiErrorPayload
      if (data && data.error) {
        code = data.error.code || code
        message = data.error.message || message
        requestId = data.error.requestId || requestId
      }
    } catch {
      // Ignore json parse error on non-json error responses
    }

    throw new GravitasApiError(res.status, code, message, requestId)
  }

  return res.json() as Promise<T>
}

export const api = {
  getHealth(): Promise<HealthResponse> {
    return request<HealthResponse>('/api/v1/health')
  },

  getState(): Promise<StateSummaryResponse> {
    return request<StateSummaryResponse>('/api/v1/state')
  },

  listRuns(): Promise<readonly Run[]> {
    return request<readonly Run[]>('/api/v1/runs')
  },

  getRun(runId: string): Promise<RunDetailResponse> {
    return request<RunDetailResponse>(`/api/v1/runs/${encodeURIComponent(runId)}`)
  },

  getTask(runId: string, taskId: string): Promise<TaskDetailResponse> {
    return request<TaskDetailResponse>(
      `/api/v1/runs/${encodeURIComponent(runId)}/tasks/${encodeURIComponent(taskId)}`
    )
  },

  getEvidence(runId: string, taskId: string): Promise<TaskEvidenceResponse> {
    return request<TaskEvidenceResponse>(
      `/api/v1/runs/${encodeURIComponent(runId)}/tasks/${encodeURIComponent(taskId)}/evidence`
    )
  },

  getEvidenceDiff(runId: string, taskId: string): Promise<TaskEvidenceDiffResponse> {
    return request<TaskEvidenceDiffResponse>(
      `/api/v1/runs/${encodeURIComponent(runId)}/tasks/${encodeURIComponent(taskId)}/evidence/diff`
    )
  },

  createRun(input: CreateRunInput): Promise<CreateRunResponse> {
    return request<CreateRunResponse>('/api/v1/runs', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  executeRun(runId: string): Promise<{ runId: string; task: Task }> {
    return request<{ runId: string; task: Task }>(
      `/api/v1/runs/${encodeURIComponent(runId)}/execute`,
      { method: 'POST' }
    )
  },

  approveTask(
    runId: string,
    taskId: string,
    reviewer: string = 'human_reviewer'
  ): Promise<{ runId: string; task: Task }> {
    return request<{ runId: string; task: Task }>(
      `/api/v1/runs/${encodeURIComponent(runId)}/tasks/${encodeURIComponent(taskId)}/approve`,
      {
        method: 'POST',
        body: JSON.stringify({ reviewer }),
      }
    )
  },

  rejectTask(
    runId: string,
    taskId: string,
    reason: string = 'Rejected by operator'
  ): Promise<{ runId: string; task: Task }> {
    return request<{ runId: string; task: Task }>(
      `/api/v1/runs/${encodeURIComponent(runId)}/tasks/${encodeURIComponent(taskId)}/reject`,
      {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }
    )
  },

  previewPrompt(input: PromptPreviewRequest): Promise<PromptPreviewResponse> {
    return request<PromptPreviewResponse>('/api/v1/prompts/preview', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  getTaskPrompt(runId: string, taskId: string): Promise<TaskPromptResponse> {
    return request<TaskPromptResponse>(
      `/api/v1/runs/${encodeURIComponent(runId)}/tasks/${encodeURIComponent(taskId)}/prompt`
    )
  },

  getBrowserQa(runId: string, taskId: string): Promise<BrowserQaResult> {
    return request<BrowserQaResult>(
      `/api/v1/runs/${encodeURIComponent(runId)}/tasks/${encodeURIComponent(taskId)}/browser-qa`
    )
  },

  listAgents(): Promise<readonly AgentDescriptor[]> {
    return request<readonly AgentDescriptor[]>('/api/v1/agents')
  },

  listCapabilities(): Promise<readonly AgentCapabilityItem[]> {
    return request<readonly AgentCapabilityItem[]>('/api/v1/capabilities')
  },

  getAgentQualification(agentId: string): Promise<unknown> {
    return request<unknown>(`/api/v1/agents/${encodeURIComponent(agentId)}/qualification`)
  },

  // Personal OS Background Jobs
  listJobs(filter?: { status?: string; kind?: string }): Promise<readonly BackgroundJob[]> {
    const params = new URLSearchParams()
    if (filter?.status) params.set('status', filter.status)
    if (filter?.kind) params.set('kind', filter.kind)
    const qs = params.toString() ? `?${params.toString()}` : ''
    return request<readonly BackgroundJob[]>(`/api/v1/jobs${qs}`)
  },

  createJob(job: BackgroundJob): Promise<BackgroundJob> {
    return request<BackgroundJob>('/api/v1/jobs', {
      method: 'POST',
      body: JSON.stringify(job),
    })
  },

  getJob(jobId: string): Promise<BackgroundJob> {
    return request<BackgroundJob>(`/api/v1/jobs/${encodeURIComponent(jobId)}`)
  },

  updateJob(jobId: string, updates: Partial<BackgroundJob>): Promise<BackgroundJob> {
    return request<BackgroundJob>(`/api/v1/jobs/${encodeURIComponent(jobId)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
  },

  pauseJob(jobId: string): Promise<BackgroundJob> {
    return request<BackgroundJob>(`/api/v1/jobs/${encodeURIComponent(jobId)}/pause`, {
      method: 'POST',
    })
  },

  resumeJob(jobId: string): Promise<BackgroundJob> {
    return request<BackgroundJob>(`/api/v1/jobs/${encodeURIComponent(jobId)}/resume`, {
      method: 'POST',
    })
  },

  cancelJob(jobId: string): Promise<BackgroundJob> {
    return request<BackgroundJob>(`/api/v1/jobs/${encodeURIComponent(jobId)}/cancel`, {
      method: 'POST',
    })
  },

  triggerJobRun(jobId: string, runCommandId?: string): Promise<{ jobRun: JobRun }> {
    return request<{ jobRun: JobRun }>(`/api/v1/jobs/${encodeURIComponent(jobId)}/run`, {
      method: 'POST',
      body: JSON.stringify({ runCommandId }),
    })
  },

  getJobRuns(jobId: string, limit?: number): Promise<readonly JobRun[]> {
    const qs = limit ? `?limit=${limit}` : ''
    return request<readonly JobRun[]>(`/api/v1/jobs/${encodeURIComponent(jobId)}/runs${qs}`)
  },

  approveJobRun(jobId: string, runId: string): Promise<{ jobRun: JobRun }> {
    return request<{ jobRun: JobRun }>(
      `/api/v1/jobs/${encodeURIComponent(jobId)}/runs/${encodeURIComponent(runId)}/approve`,
      { method: 'POST' }
    )
  },

  rejectJobRun(jobId: string, runId: string, reason?: string): Promise<{ jobRun: JobRun }> {
    return request<{ jobRun: JobRun }>(
      `/api/v1/jobs/${encodeURIComponent(jobId)}/runs/${encodeURIComponent(runId)}/reject`,
      {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }
    )
  },

  // Personal OS Notifications
  listNotifications(filter?: { unreadOnly?: boolean; limit?: number }): Promise<readonly PersonalOsNotification[]> {
    const params = new URLSearchParams()
    if (filter?.unreadOnly !== undefined) params.set('unreadOnly', String(filter.unreadOnly))
    if (filter?.limit) params.set('limit', String(filter.limit))
    const qs = params.toString() ? `?${params.toString()}` : ''
    return request<readonly PersonalOsNotification[]>(`/api/v1/notifications${qs}`)
  },

  markNotificationRead(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/v1/notifications/${encodeURIComponent(id)}/read`, {
      method: 'POST',
    })
  },

  markAllNotificationsRead(): Promise<{ success: boolean }> {
    return request<{ success: boolean }>('/api/v1/notifications/read-all', {
      method: 'POST',
    })
  },

  // Personal OS Connectors (Wave 12J)
  listConnectors(): Promise<{ connectors: readonly ConnectorDescriptor[] }> {
    return request<{ connectors: readonly ConnectorDescriptor[] }>('/api/v1/connectors')
  },

  getConnector(id: string): Promise<ConnectorDescriptor> {
    return request<ConnectorDescriptor>(`/api/v1/connectors/${encodeURIComponent(id)}`)
  },

  checkConnectorHealth(id: string, accountId?: string): Promise<{ healthy: boolean; status: string; message?: string }> {
    const qs = accountId ? `?accountId=${encodeURIComponent(accountId)}` : ''
    return request<{ healthy: boolean; status: string; message?: string }>(
      `/api/v1/connectors/${encodeURIComponent(id)}/health${qs}`,
      { method: 'POST' },
    )
  },

  listConnectorAccounts(connectorId: string): Promise<{ accounts: readonly ConnectorAccount[] }> {
    return request<{ accounts: readonly ConnectorAccount[] }>(
      `/api/v1/connectors/${encodeURIComponent(connectorId)}/accounts`,
    )
  },

  provisionConnectorAccount(
    connectorId: string,
    data: {
      id?: string
      providerAccountId: string
      displayLabel: string
      grantedScopes?: readonly string[]
      credentials?: Record<string, unknown>
    },
  ): Promise<{ success: boolean; account: ConnectorAccount }> {
    return request<{ success: boolean; account: ConnectorAccount }>(
      `/api/v1/connectors/${encodeURIComponent(connectorId)}/accounts`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    )
  },

  disconnectConnectorAccount(connectorId: string, accountId: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(
      `/api/v1/connectors/${encodeURIComponent(connectorId)}/accounts/${encodeURIComponent(accountId)}`,
      { method: 'DELETE' },
    )
  },

  getConnectorAuditLogs(filter?: {
    connectorId?: string
    accountId?: string
    limit?: number
  }): Promise<{ auditLogs: readonly ConnectorAuditLogEntry[] }> {
    const params = new URLSearchParams()
    if (filter?.connectorId) params.set('connectorId', filter.connectorId)
    if (filter?.accountId) params.set('accountId', filter.accountId)
    if (filter?.limit) params.set('limit', String(filter.limit))
    const qs = params.toString() ? `?${params.toString()}` : ''
    return request<{ auditLogs: readonly ConnectorAuditLogEntry[] }>(`/api/v1/connectors/audit${qs}`)
  },

  // Calendar Operations Foundation (Wave 12J)
  getCalendars(connectorId?: string, accountId?: string): Promise<{ calendars: readonly CalendarSummary[] }> {
    const params = new URLSearchParams()
    if (connectorId) params.set('connectorId', connectorId)
    if (accountId) params.set('accountId', accountId)
    const qs = params.toString() ? `?${params.toString()}` : ''
    return request<{ calendars: readonly CalendarSummary[] }>(`/api/v1/calendar/calendars${qs}`)
  },

  getCalendarEvents(
    query?: CalendarEventsQuery,
    connectorId?: string,
    accountId?: string,
  ): Promise<CalendarEventsPage> {
    const params = new URLSearchParams()
    if (connectorId) params.set('connectorId', connectorId)
    if (accountId) params.set('accountId', accountId)
    if (query?.calendarId) params.set('calendarId', query.calendarId)
    if (query?.timeMin) params.set('timeMin', query.timeMin)
    if (query?.timeMax) params.set('timeMax', query.timeMax)
    if (query?.maxResults) params.set('maxResults', String(query.maxResults))
    if (query?.pageToken) params.set('pageToken', query.pageToken)
    const qs = params.toString() ? `?${params.toString()}` : ''
    return request<CalendarEventsPage>(`/api/v1/calendar/events${qs}`)
  },

  getCalendarEvent(
    eventId: string,
    calendarId = 'primary',
    connectorId?: string,
    accountId?: string,
  ): Promise<CalendarEventSummary> {
    const params = new URLSearchParams()
    if (calendarId) params.set('calendarId', calendarId)
    if (connectorId) params.set('connectorId', connectorId)
    if (accountId) params.set('accountId', accountId)
    const qs = params.toString() ? `?${params.toString()}` : ''
    return request<CalendarEventSummary>(
      `/api/v1/calendar/events/${encodeURIComponent(eventId)}${qs}`,
    )
  },
}
