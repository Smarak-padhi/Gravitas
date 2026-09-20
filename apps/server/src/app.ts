/**
 * HTTP Application Request Dispatcher for @gravitas/server.
 *
 * Lightweight, zero-dependency router with:
 * - Request ID tagging (X-Gravitas-Request-Id)
 * - Strict body payload limits (256 KiB)
 * - Safe JSON error envelope (no stack traces or host paths)
 * - SSE live event stream support
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { GRAVITAS_VERSION } from '@gravitas/core'
import {
  ApiError,
  InvalidRequestError,
  NotFoundError,
  PayloadTooLargeError,
} from './errors.js'
import type { EventHub } from './events.js'
import type { RunService } from './service.js'
import type {
  ApproveTaskInput,
  CreateRunInput,
  HealthResponse,
  PromptPreviewRequest,
  RejectTaskInput,
} from './types.js'

export const MAX_BODY_BYTES = 256 * 1024 // 256 KiB

export interface AppDependencies {
  readonly service: RunService
  readonly eventHub: EventHub
}

/**
 * Generates a unique request identifier.
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

/**
 * Sends a JSON response with proper headers.
 */
function sendJson(res: ServerResponse, statusCode: number, data: unknown): void {
  const payload = JSON.stringify(data)
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload, 'utf8'),
  })
  res.end(payload)
}

/**
 * Sends a sanitized error response conforming to the standard API envelope.
 */
function sendError(
  res: ServerResponse,
  statusCode: number,
  code: string,
  message: string,
  requestId: string
): void {
  if (statusCode === 413) {
    res.setHeader('Connection', 'close')
  }
  sendJson(res, statusCode, {
    error: {
      code,
      message,
      requestId,
    },
  })
}

/**
 * Reads and parses JSON request body with a hard byte limit.
 */
async function readJsonBody<T>(req: IncomingMessage, requestId: string): Promise<T> {
  return new Promise((resolve, reject) => {
    let bytesRead = 0
    let oversized = false
    const chunks: Buffer[] = []

    req.on('data', (chunk: Buffer) => {
      bytesRead += chunk.length
      if (bytesRead > MAX_BODY_BYTES) {
        if (!oversized) {
          oversized = true
          req.resume() // Drain stream without accumulating memory
          reject(new PayloadTooLargeError(`Request body exceeded ${MAX_BODY_BYTES} bytes limit.`))
        }
        return
      }
      chunks.push(chunk)
    })

    req.on('end', () => {
      if (oversized) {
        return
      }

      if (chunks.length === 0) {
        resolve({} as T)
        return
      }

      const raw = Buffer.concat(chunks).toString('utf8').trim()
      if (raw.length === 0) {
        resolve({} as T)
        return
      }

      try {
        const parsed = JSON.parse(raw) as T
        resolve(parsed)
      } catch {
        reject(new InvalidRequestError('MALFORMED_JSON', 'Request body must be valid JSON.'))
      }
    })

    req.on('error', (err) => {
      if (!oversized) {
        reject(err)
      }
    })
  })
}

/**
 * Creates the HTTP request listener dispatching Gravitas API routes.
 */
export function createRequestListener(deps: AppDependencies) {
  const { service, eventHub } = deps

  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const requestId = generateRequestId()
    res.setHeader('X-Gravitas-Request-Id', requestId)

    try {
      const url = new URL(req.url ?? '/', 'http://127.0.0.1')
      const pathname = url.pathname.replace(/\/+$/, '') || '/'
      const method = (req.method ?? 'GET').toUpperCase()

      // --- Health ---
      if (method === 'GET' && pathname === '/api/v1/health') {
        const response: HealthResponse = {
          status: 'ok',
          service: 'gravitas',
          version: GRAVITAS_VERSION,
          timestamp: new Date().toISOString(),
        }
        sendJson(res, 200, response)
        return
      }

      // --- State ---
      if (method === 'GET' && pathname === '/api/v1/state') {
        const response = await service.getStateSummary()
        sendJson(res, 200, response)
        return
      }

      // --- Gateways ---
      if (pathname === '/api/v1/gateways') {
        if (method === 'GET') {
          const gateways = service.listGateways()
          sendJson(res, 200, { gateways })
          return
        }
        sendError(res, 405, 'METHOD_NOT_ALLOWED', `Method ${method} not allowed on /api/v1/gateways.`, requestId)
        return
      }

      // --- Live SSE Stream ---
      if (method === 'GET' && pathname === '/api/v1/events') {
        eventHub.registerSubscriber(res)
        return
      }

      // --- Runs Collection ---
      if (pathname === '/api/v1/runs') {
        if (method === 'GET') {
          const runs = service.listRuns()
          sendJson(res, 200, runs)
          return
        }
        if (method === 'POST') {
          const body = await readJsonBody<CreateRunInput>(req, requestId)
          const created = await service.createRun(body)
          sendJson(res, 201, created)
          return
        }
        sendError(res, 405, 'METHOD_NOT_ALLOWED', `Method ${method} not allowed on /api/v1/runs.`, requestId)
        return
      }

      // --- Run Execution: POST /api/v1/runs/:runId/execute ---
      const executeMatch = pathname.match(/^\/api\/v1\/runs\/([^/]+)\/execute$/)
      if (executeMatch) {
        if (method === 'POST') {
          const runId = executeMatch[1]
          if (!runId) {
            sendError(res, 400, 'INVALID_REQUEST', 'Missing runId.', requestId)
            return
          }
          const task = await service.executeRun(runId)
          sendJson(res, 200, { runId, task })
          return
        }
        sendError(res, 405, 'METHOD_NOT_ALLOWED', `Method ${method} not allowed on run execution.`, requestId)
        return
      }

      // --- Task Approval: POST /api/v1/runs/:runId/tasks/:taskId/approve ---
      const approveMatch = pathname.match(/^\/api\/v1\/runs\/([^/]+)\/tasks\/([^/]+)\/approve$/)
      if (approveMatch) {
        if (method === 'POST') {
          const [, runId, taskId] = approveMatch
          if (!runId || !taskId) {
            sendError(res, 400, 'INVALID_REQUEST', 'Missing runId or taskId.', requestId)
            return
          }
          const body = await readJsonBody<ApproveTaskInput>(req, requestId)
          const task = await service.approveTask(runId, taskId, body)
          sendJson(res, 200, { runId, task })
          return
        }
        sendError(res, 405, 'METHOD_NOT_ALLOWED', `Method ${method} not allowed on task approval.`, requestId)
        return
      }

      // --- Task Rejection: POST /api/v1/runs/:runId/tasks/:taskId/reject ---
      const rejectMatch = pathname.match(/^\/api\/v1\/runs\/([^/]+)\/tasks\/([^/]+)\/reject$/)
      if (rejectMatch) {
        if (method === 'POST') {
          const [, runId, taskId] = rejectMatch
          if (!runId || !taskId) {
            sendError(res, 400, 'INVALID_REQUEST', 'Missing runId or taskId.', requestId)
            return
          }
          const body = await readJsonBody<RejectTaskInput>(req, requestId)
          const task = await service.rejectTask(runId, taskId, body)
          sendJson(res, 200, { runId, task })
          return
        }
        sendError(res, 405, 'METHOD_NOT_ALLOWED', `Method ${method} not allowed on task rejection.`, requestId)
        return
      }

      // --- Task Evidence Diff: GET /api/v1/runs/:runId/tasks/:taskId/evidence/diff ---
      const diffMatch = pathname.match(/^\/api\/v1\/runs\/([^/]+)\/tasks\/([^/]+)\/evidence\/diff$/)
      if (diffMatch) {
        if (method === 'GET') {
          const [, runId, taskId] = diffMatch
          if (!runId || !taskId) {
            sendError(res, 400, 'INVALID_REQUEST', 'Missing runId or taskId.', requestId)
            return
          }
          const diffData = await service.getEvidenceDiff(runId, taskId)
          sendJson(res, 200, diffData)
          return
        }
        sendError(res, 405, 'METHOD_NOT_ALLOWED', `Method ${method} not allowed on evidence diff.`, requestId)
        return
      }

      // --- Task Evidence: GET /api/v1/runs/:runId/tasks/:taskId/evidence ---
      const evidenceMatch = pathname.match(/^\/api\/v1\/runs\/([^/]+)\/tasks\/([^/]+)\/evidence$/)
      if (evidenceMatch) {
        if (method === 'GET') {
          const [, runId, taskId] = evidenceMatch
          if (!runId || !taskId) {
            sendError(res, 400, 'INVALID_REQUEST', 'Missing runId or taskId.', requestId)
            return
          }
          const evidence = await service.getEvidence(runId, taskId)
          sendJson(res, 200, evidence)
          return
        }
        sendError(res, 405, 'METHOD_NOT_ALLOWED', `Method ${method} not allowed on evidence.`, requestId)
        return
      }

      // --- Task Detail: GET /api/v1/runs/:runId/tasks/:taskId ---
      const taskMatch = pathname.match(/^\/api\/v1\/runs\/([^/]+)\/tasks\/([^/]+)$/)
      if (taskMatch) {
        if (method === 'GET') {
          const [, runId, taskId] = taskMatch
          if (!runId || !taskId) {
            sendError(res, 400, 'INVALID_REQUEST', 'Missing runId or taskId.', requestId)
            return
          }
          const taskDetail = service.getTask(runId, taskId)
          sendJson(res, 200, taskDetail)
          return
        }
        sendError(res, 405, 'METHOD_NOT_ALLOWED', `Method ${method} not allowed on task detail.`, requestId)
        return
      }

      // --- Run Detail: GET /api/v1/runs/:runId ---
      const runDetailMatch = pathname.match(/^\/api\/v1\/runs\/([^/]+)$/)
      if (runDetailMatch) {
        if (method === 'GET') {
          const runId = runDetailMatch[1]
          if (!runId) {
            sendError(res, 400, 'INVALID_REQUEST', 'Missing runId.', requestId)
            return
          }
          const runDetail = service.getRun(runId)
          sendJson(res, 200, runDetail)
          return
        }
        sendError(res, 405, 'METHOD_NOT_ALLOWED', `Method ${method} not allowed on run detail.`, requestId)
        return
      }

      // --- Prompt Preview: POST /api/v1/prompts/preview ---
      if (pathname === '/api/v1/prompts/preview') {
        if (method === 'POST') {
          const body = await readJsonBody<PromptPreviewRequest>(req, requestId)
          const preview = service.previewPrompt(body)
          sendJson(res, 200, preview)
          return
        }
        sendError(res, 405, 'METHOD_NOT_ALLOWED', `Method ${method} not allowed on prompt preview.`, requestId)
        return
      }

      // --- Task Prompt: GET /api/v1/runs/:runId/tasks/:taskId/prompt ---
      const taskPromptMatch = pathname.match(/^\/api\/v1\/runs\/([^/]+)\/tasks\/([^/]+)\/prompt$/)
      if (taskPromptMatch) {
        if (method === 'GET') {
          const [, runId, taskId] = taskPromptMatch
          if (!runId || !taskId) {
            sendError(res, 400, 'INVALID_REQUEST', 'Missing runId or taskId.', requestId)
            return
          }
          const taskPrompt = service.getTaskPrompt(runId, taskId)
          sendJson(res, 200, taskPrompt)
          return
        }
        sendError(res, 405, 'METHOD_NOT_ALLOWED', `Method ${method} not allowed on task prompt.`, requestId)
        return
      }

      // --- Task Browser QA: GET /api/v1/runs/:runId/tasks/:taskId/browser-qa ---
      const browserQaMatch = pathname.match(/^\/api\/v1\/runs\/([^/]+)\/tasks\/([^/]+)\/browser-qa$/)
      if (browserQaMatch) {
        if (method === 'GET') {
          const [, runId, taskId] = browserQaMatch
          if (!runId || !taskId) {
            sendError(res, 400, 'INVALID_REQUEST', 'Missing runId or taskId.', requestId)
            return
          }
          const qaResult = service.getBrowserQa(runId, taskId)
          if (!qaResult) {
            sendError(res, 404, 'NOT_FOUND', `Browser QA result not found for task '${taskId}'.`, requestId)
            return
          }
          sendJson(res, 200, qaResult)
          return
        }
        sendError(res, 405, 'METHOD_NOT_ALLOWED', `Method ${method} not allowed on task browser QA.`, requestId)
        return
      }

      // --- Agent Qualification Evidence: GET /api/v1/agents/:agentId/qualification ---
      const agentQualMatch = pathname.match(/^\/api\/v1\/agents\/([^/]+)\/qualification$/)
      if (agentQualMatch) {
        if (method === 'GET') {
          const agentId = agentQualMatch[1]
          if (!agentId) {
            sendError(res, 400, 'INVALID_REQUEST', 'Missing agentId.', requestId)
            return
          }
          const qualData = await service.getAgentQualification(agentId)
          if (!qualData) {
            sendError(res, 404, 'NOT_FOUND', `No qualification evidence found for agent '${agentId}'.`, requestId)
            return
          }
          sendJson(res, 200, qualData)
          return
        }
        sendError(res, 405, 'METHOD_NOT_ALLOWED', `Method ${method} not allowed on agent qualification.`, requestId)
        return
      }

      // --- Agents Registry: GET /api/v1/agents ---
      if (pathname === '/api/v1/agents') {
        if (method === 'GET') {
          const agents = service.listAgents()
          sendJson(res, 200, agents)
          return
        }
        sendError(res, 405, 'METHOD_NOT_ALLOWED', `Method ${method} not allowed on /api/v1/agents.`, requestId)
        return
      }

      // --- Capability Vocabulary: GET /api/v1/capabilities ---
      if (pathname === '/api/v1/capabilities') {
        if (method === 'GET') {
          const capabilities = service.listCapabilities()
          sendJson(res, 200, capabilities)
          return
        }
        sendError(res, 405, 'METHOD_NOT_ALLOWED', `Method ${method} not allowed on /api/v1/capabilities.`, requestId)
        return
      }

      // --- Not Found ---
      sendError(res, 404, 'NOT_FOUND', `Route '${pathname}' not found.`, requestId)
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        sendError(res, err.statusCode, err.code, err.message, requestId)
        return
      }

      // Internal errors: strictly never leak stack traces or internal paths
      const safeMessage = err instanceof Error ? err.message : 'An unexpected internal error occurred.'
      sendError(res, 500, 'INTERNAL_ERROR', safeMessage, requestId)
    }
  }
}
