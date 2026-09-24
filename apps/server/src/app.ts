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
import { randomUUID } from 'node:crypto'
import { GRAVITAS_VERSION, type BackgroundJob } from '@gravitas/core'
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

      // --- Personal OS Background Jobs Collection: /api/v1/jobs ---
      if (pathname === '/api/v1/jobs') {
        if (method === 'GET') {
          const status = url.searchParams.get('status') as any
          const kind = url.searchParams.get('kind') as any
          const jobs = service.listJobs({ status: status || undefined, kind: kind || undefined })
          sendJson(res, 200, jobs)
          return
        }
        if (method === 'POST') {
          const body = await readJsonBody<any>(req, requestId)
          if (!body || !body.title || !body.trigger || !body.action) {
            sendError(res, 400, 'INVALID_REQUEST', 'Missing required fields for background job (title, trigger, action).', requestId)
            return
          }

          // Normalize trigger & action (accept kind or type)
          const trigger = {
            ...body.trigger,
            type: body.trigger.type ?? body.trigger.kind,
            ...(body.trigger.type === 'CRON' || body.trigger.kind === 'CRON'
              ? {
                  expression: body.trigger.expression ?? body.trigger.cronExpression ?? body.trigger.cron,
                  timezone: body.trigger.timezone ?? 'UTC',
                }
              : {}),
          }
          const action = {
            ...body.action,
            type: body.action.type ?? body.action.kind,
          }

          if (action.type === 'INVOKE_ROLE') {
            sendError(
              res,
              403,
              'AUTHORITY_DENIED',
              'INVOKE_ROLE is INTERNAL_NOT_READY in Wave 12I-R. Autonomous reasoning loops are restricted from public automation creation surface until capability and harness verification boundaries are sealed.',
              requestId
            )
            return
          }

          const allowedActions = ['EMIT_NOTIFICATION', 'REPOSITORY_CHECK', 'FILE_OPERATION', 'NOOP', 'CONNECTOR_READ']
          if (!allowedActions.includes(action.type)) {
            sendError(
              res,
              400,
              'INVALID_REQUEST',
              `Unsupported action type '${action.type}'. Wave 12J supports: [${allowedActions.join(', ')}].`,
              requestId
            )
            return
          }

          if (action.type === 'CONNECTOR_READ') {
            if (!action.connectorId || !action.accountId || !action.capabilityId) {
              sendError(
                res,
                400,
                'INVALID_REQUEST',
                'CONNECTOR_READ action requires connectorId, accountId, and capabilityId.',
                requestId
              )
              return
            }
          }

          const fullJob: BackgroundJob = {
            id: body.id || `job_${randomUUID()}`,
            title: body.title,
            description: body.description ?? '',
            kind: body.kind || 'MAINTENANCE',
            status: body.status || 'ENABLED',
            trigger,
            action,
            autonomyLevel: body.autonomyLevel || 'L1',
            requiredAuthority: body.requiredAuthority || body.authorityClass || 'READ',
            contextDomains: body.contextDomains || ['system'],
            executionBudget: body.executionBudget || body.budget || { maxRuntimeMs: 60000, maxAttempts: 3 },
            retryPolicy: body.retryPolicy || { mode: 'NONE', maxAttempts: 1, delayMs: 1000 },
            notificationPolicy: body.notificationPolicy || {
              deliveryPolicy: body.deferDuringQuietHours ? 'QUIET_HOURS_AWARE' : 'IMMEDIATE',
            },
            createdAt: body.createdAt || new Date().toISOString(),
            updatedAt: body.updatedAt || new Date().toISOString(),
            nextRunAt: body.nextRunAt,
          }
          const created = service.createJob(fullJob)
          sendJson(res, 201, created)
          return
        }
        sendError(res, 405, 'METHOD_NOT_ALLOWED', `Method ${method} not allowed on /api/v1/jobs.`, requestId)
        return
      }

      // --- Job Actions: POST /api/v1/jobs/:id/(pause|resume|cancel|run) ---
      const jobActionMatch = pathname.match(/^\/api\/v1\/jobs\/([^/]+)\/(pause|resume|cancel|run)$/)
      if (jobActionMatch) {
        if (method === 'POST') {
          const [, jobId, action] = jobActionMatch
          if (!jobId) {
            sendError(res, 400, 'INVALID_REQUEST', 'Missing jobId.', requestId)
            return
          }
          if (action === 'pause') {
            const updated = service.pauseJob(jobId)
            sendJson(res, 200, updated)
            return
          }
          if (action === 'resume') {
            const updated = service.resumeJob(jobId)
            sendJson(res, 200, updated)
            return
          }
          if (action === 'cancel') {
            const updated = service.cancelJob(jobId)
            sendJson(res, 200, updated)
            return
          }
          if (action === 'run') {
            let body: { runCommandId?: string; idempotencyKey?: string } = {}
            try {
              body = await readJsonBody<{ runCommandId?: string; idempotencyKey?: string }>(req, requestId)
            } catch {
              // Body is optional for manual run
            }
            const idempotencyKey =
              (req.headers['idempotency-key'] as string) ||
              (req.headers['x-idempotency-key'] as string) ||
              body?.idempotencyKey ||
              body?.runCommandId

            const run = await service.triggerManualJobRun(jobId, idempotencyKey)
            sendJson(res, 200, { jobRun: run })
            return
          }
        }
        sendError(res, 405, 'METHOD_NOT_ALLOWED', `Method ${method} not allowed on job action.`, requestId)
        return
      }

      // --- Job Run Approval / Rejection: POST /api/v1/jobs/:jobId/runs/:runId/(approve|reject) ---
      const jobRunApprovalMatch = pathname.match(/^\/api\/v1\/jobs\/([^/]+)\/runs\/([^/]+)\/(approve|reject)$/)
      if (jobRunApprovalMatch) {
        if (method === 'POST') {
          const [, jobId, runId, subAction] = jobRunApprovalMatch
          if (!jobId || !runId) {
            sendError(res, 400, 'INVALID_REQUEST', 'Missing jobId or runId.', requestId)
            return
          }
          if (subAction === 'approve') {
            const run = await service.approveJobRun(jobId, runId)
            sendJson(res, 200, { jobRun: run })
            return
          }
          if (subAction === 'reject') {
            let body: { reason?: string } = {}
            try {
              body = await readJsonBody<{ reason?: string }>(req, requestId)
            } catch {
              // Body is optional
            }
            const run = await service.rejectJobRun(jobId, runId, body?.reason)
            sendJson(res, 200, { jobRun: run })
            return
          }
        }
        sendError(res, 405, 'METHOD_NOT_ALLOWED', `Method ${method} not allowed on job run approval.`, requestId)
        return
      }

      // --- Job Runs Collection: GET /api/v1/jobs/:id/runs ---
      const jobRunsMatch = pathname.match(/^\/api\/v1\/jobs\/([^/]+)\/runs$/)
      if (jobRunsMatch) {
        if (method === 'GET') {
          const jobId = jobRunsMatch[1]
          if (!jobId) {
            sendError(res, 400, 'INVALID_REQUEST', 'Missing jobId.', requestId)
            return
          }
          const limitStr = url.searchParams.get('limit')
          const limit = limitStr ? parseInt(limitStr, 10) : 50
          const runs = service.getJobRuns(jobId, limit)
          sendJson(res, 200, runs)
          return
        }
        sendError(res, 405, 'METHOD_NOT_ALLOWED', `Method ${method} not allowed on /api/v1/jobs/:id/runs.`, requestId)
        return
      }

      // --- Individual Job Detail / Update / Archive: GET, PATCH, DELETE /api/v1/jobs/:id ---
      const jobDetailMatch = pathname.match(/^\/api\/v1\/jobs\/([^/]+)$/)
      if (jobDetailMatch) {
        const jobId = jobDetailMatch[1]
        if (!jobId) {
          sendError(res, 400, 'INVALID_REQUEST', 'Missing jobId.', requestId)
          return
        }
        if (method === 'GET') {
          const job = service.getJob(jobId)
          if (!job) {
            sendError(res, 404, 'NOT_FOUND', `Background job ${jobId} not found.`, requestId)
            return
          }
          sendJson(res, 200, job)
          return
        }
        if (method === 'PATCH') {
          const updates = await readJsonBody<Partial<BackgroundJob>>(req, requestId)
          const updated = service.updateJob(jobId, updates)
          sendJson(res, 200, updated)
          return
        }
        if (method === 'DELETE') {
          const job = service.getJob(jobId)
          if (!job) {
            sendError(res, 404, 'NOT_FOUND', `Background job ${jobId} not found.`, requestId)
            return
          }
          // Physical deletion forbidden: soft-delete archives the job definition,
          // retaining all occurrence claims, run attempts, and audit logs.
          const cancelled = service.cancelJob(jobId)
          sendJson(res, 200, { archived: true, job: cancelled })
          return
        }
        sendError(res, 405, 'METHOD_NOT_ALLOWED', `Method ${method} not allowed on /api/v1/jobs/:id.`, requestId)
        return
      }

      // --- Personal OS Notifications: /api/v1/notifications ---
      if (pathname === '/api/v1/notifications') {
        if (method === 'GET') {
          const unreadOnly = url.searchParams.get('unreadOnly') === 'true'
          const limitStr = url.searchParams.get('limit')
          const limit = limitStr ? parseInt(limitStr, 10) : 50
          const notifs = service.listNotifications({ unreadOnly, limit })
          sendJson(res, 200, notifs)
          return
        }
        sendError(res, 405, 'METHOD_NOT_ALLOWED', `Method ${method} not allowed on /api/v1/notifications.`, requestId)
        return
      }

      // --- Mark All Notifications Read: POST /api/v1/notifications/read-all ---
      if (pathname === '/api/v1/notifications/read-all') {
        if (method === 'POST') {
          service.markAllNotificationsRead()
          sendJson(res, 200, { success: true })
          return
        }
        sendError(res, 405, 'METHOD_NOT_ALLOWED', `Method ${method} not allowed on /api/v1/notifications/read-all.`, requestId)
        return
      }

      // --- Mark Single Notification Read: POST /api/v1/notifications/:id/read ---
      const notifReadMatch = pathname.match(/^\/api\/v1\/notifications\/([^/]+)\/read$/)
      if (notifReadMatch) {
        if (method === 'POST') {
          const notifId = notifReadMatch[1]
          if (!notifId) {
            sendError(res, 400, 'INVALID_REQUEST', 'Missing notification id.', requestId)
            return
          }
          service.markNotificationRead(notifId)
          sendJson(res, 200, { success: true })
          return
        }
        sendError(res, 405, 'METHOD_NOT_ALLOWED', `Method ${method} not allowed on /api/v1/notifications/:id/read.`, requestId)
        return
      }

      // --- Connector Audit Logs: GET /api/v1/connectors/audit ---
      if (pathname === '/api/v1/connectors/audit') {
        if (method === 'GET') {
          const filter: { connectorId?: string; accountId?: string; limit?: number } = {}
          const cId = url.searchParams.get('connectorId')
          if (cId) filter.connectorId = cId
          const aId = url.searchParams.get('accountId')
          if (aId) filter.accountId = aId
          const limitStr = url.searchParams.get('limit')
          if (limitStr) filter.limit = parseInt(limitStr, 10)
          const logs = service.getConnectorAuditLogs(filter)
          sendJson(res, 200, { auditLogs: logs })
          return
        }
        sendError(res, 405, 'METHOD_NOT_ALLOWED', `Method ${method} not allowed on /api/v1/connectors/audit.`, requestId)
        return
      }

      // --- Connectors List: GET /api/v1/connectors ---
      if (pathname === '/api/v1/connectors') {
        if (method === 'GET') {
          const connectors = service.listConnectors()
          sendJson(res, 200, { connectors })
          return
        }
        sendError(res, 405, 'METHOD_NOT_ALLOWED', `Method ${method} not allowed on /api/v1/connectors.`, requestId)
        return
      }

      // --- Connector Detail: GET /api/v1/connectors/:id ---
      const connectorDetailMatch = pathname.match(/^\/api\/v1\/connectors\/([^/]+)$/)
      if (connectorDetailMatch) {
        if (method === 'GET') {
          const connectorId = connectorDetailMatch[1]
          if (!connectorId) {
            sendError(res, 400, 'INVALID_REQUEST', 'Missing connector id.', requestId)
            return
          }
          const connector = service.getConnector(connectorId)
          if (!connector) {
            sendError(res, 404, 'NOT_FOUND', `Connector ${connectorId} not found.`, requestId)
            return
          }
          sendJson(res, 200, connector)
          return
        }
        sendError(res, 405, 'METHOD_NOT_ALLOWED', `Method ${method} not allowed on /api/v1/connectors/:id.`, requestId)
        return
      }

      // --- Connector Health Check: POST /api/v1/connectors/:id/health ---
      const connectorHealthMatch = pathname.match(/^\/api\/v1\/connectors\/([^/]+)\/health$/)
      if (connectorHealthMatch) {
        if (method === 'POST') {
          const connectorId = connectorHealthMatch[1]
          if (!connectorId) {
            sendError(res, 400, 'INVALID_REQUEST', 'Missing connector id.', requestId)
            return
          }
          const accountId = url.searchParams.get('accountId') || undefined
          const health = await service.checkConnectorHealth(connectorId, accountId)
          sendJson(res, 200, health)
          return
        }
        sendError(res, 405, 'METHOD_NOT_ALLOWED', `Method ${method} not allowed on health check.`, requestId)
        return
      }

      // --- Connector Accounts: GET, POST /api/v1/connectors/:id/accounts ---
      const connectorAccountsMatch = pathname.match(/^\/api\/v1\/connectors\/([^/]+)\/accounts$/)
      if (connectorAccountsMatch) {
        const connectorId = connectorAccountsMatch[1]
        if (!connectorId) {
          sendError(res, 400, 'INVALID_REQUEST', 'Missing connector id.', requestId)
          return
        }
        if (method === 'GET') {
          const accounts = service.listConnectorAccounts(connectorId)
          sendJson(res, 200, { accounts })
          return
        }
        if (method === 'POST') {
          const body = await readJsonBody<any>(req, requestId)
          if (!body || !body.providerAccountId || !body.displayLabel) {
            sendError(res, 400, 'INVALID_REQUEST', 'Missing required fields for connector account (providerAccountId, displayLabel).', requestId)
            return
          }
          const accountId = body.id || `acc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
          const account = {
            id: accountId,
            connectorId,
            providerAccountId: String(body.providerAccountId),
            displayLabel: String(body.displayLabel),
            status: 'CONNECTED' as const,
            grantedScopes: Array.isArray(body.grantedScopes) ? body.grantedScopes.map(String) : [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }

          let credentials = undefined
          if (body.credentials) {
            credentials = {
              accountId,
              provider: connectorId === 'calendar-google' ? ('google-calendar' as const) : ('mock-calendar' as const),
              accessToken: String(body.credentials.accessToken || ''),
              refreshToken: body.credentials.refreshToken ? String(body.credentials.refreshToken) : undefined,
              expiresAt: body.credentials.expiresAt ? Number(body.credentials.expiresAt) : undefined,
              clientId: body.credentials.clientId ? String(body.credentials.clientId) : undefined,
              clientSecret: body.credentials.clientSecret ? String(body.credentials.clientSecret) : undefined,
              scopes: account.grantedScopes,
              updatedAt: new Date().toISOString(),
            }
          }

          service.provisionConnectorAccount(account, credentials)
          // Strictly return account WITHOUT credentials
          sendJson(res, 201, { success: true, account })
          return
        }
        sendError(res, 405, 'METHOD_NOT_ALLOWED', `Method ${method} not allowed on connector accounts.`, requestId)
        return
      }

      // --- Disconnect Account: DELETE /api/v1/connectors/:id/accounts/:accountId ---
      const disconnectAccountMatch = pathname.match(/^\/api\/v1\/connectors\/([^/]+)\/accounts\/([^/]+)$/)
      if (disconnectAccountMatch) {
        if (method === 'DELETE') {
          const accountId = disconnectAccountMatch[2]
          if (!accountId) {
            sendError(res, 400, 'INVALID_REQUEST', 'Missing account id.', requestId)
            return
          }
          const success = service.disconnectConnectorAccount(accountId)
          if (!success) {
            sendError(res, 404, 'NOT_FOUND', `Account ${accountId} not found.`, requestId)
            return
          }
          sendJson(res, 200, { success: true })
          return
        }
        sendError(res, 405, 'METHOD_NOT_ALLOWED', `Method ${method} not allowed on account.`, requestId)
        return
      }

      // --- Calendar Calendars Query: GET /api/v1/calendar/calendars ---
      if (pathname === '/api/v1/calendar/calendars') {
        if (method === 'GET') {
          const connectorId = url.searchParams.get('connectorId') || 'calendar-mock'
          const accountId = url.searchParams.get('accountId') || undefined
          const calendars = await service.getCalendars(connectorId, accountId)
          sendJson(res, 200, { calendars })
          return
        }
        sendError(res, 405, 'METHOD_NOT_ALLOWED', `Method ${method} not allowed on /api/v1/calendar/calendars.`, requestId)
        return
      }

      // --- Calendar Events Query: GET /api/v1/calendar/events ---
      if (pathname === '/api/v1/calendar/events') {
        if (method === 'GET') {
          const connectorId = url.searchParams.get('connectorId') || 'calendar-mock'
          const accountId = url.searchParams.get('accountId') || undefined
          const calendarId = url.searchParams.get('calendarId') || 'primary'
          const timeMin = url.searchParams.get('timeMin') || undefined
          const timeMax = url.searchParams.get('timeMax') || undefined
          const pageToken = url.searchParams.get('pageToken') || undefined
          const maxResultsStr = url.searchParams.get('maxResults')
          const maxResults = maxResultsStr ? parseInt(maxResultsStr, 10) : undefined

          const eventsPage = await service.getCalendarEvents(
            { calendarId, timeMin, timeMax, maxResults, pageToken },
            connectorId,
            accountId,
          )
          sendJson(res, 200, eventsPage)
          return
        }
        sendError(res, 405, 'METHOD_NOT_ALLOWED', `Method ${method} not allowed on /api/v1/calendar/events.`, requestId)
        return
      }

      // --- Calendar Single Event: GET /api/v1/calendar/events/:eventId ---
      const calendarSingleEventMatch = pathname.match(/^\/api\/v1\/calendar\/events\/([^/]+)$/)
      if (calendarSingleEventMatch) {
        if (method === 'GET') {
          const eventId = calendarSingleEventMatch[1]
          if (!eventId) {
            sendError(res, 400, 'INVALID_REQUEST', 'Missing event id.', requestId)
            return
          }
          const connectorId = url.searchParams.get('connectorId') || 'calendar-mock'
          const accountId = url.searchParams.get('accountId') || undefined
          const calendarId = url.searchParams.get('calendarId') || 'primary'

          const event = await service.getCalendarEvent(calendarId, eventId, connectorId, accountId)
          sendJson(res, 200, event)
          return
        }
        sendError(res, 405, 'METHOD_NOT_ALLOWED', `Method ${method} not allowed on event.`, requestId)
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
