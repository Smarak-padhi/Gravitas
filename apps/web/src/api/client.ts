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
}
