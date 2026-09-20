/**
 * @gravitas/server — Main Entrypoint & CLI Server Runtime.
 *
 * Local-only control plane HTTP server and live event stream.
 */

import { pathToFileURL } from 'node:url'
import { GRAVITAS_VERSION } from '@gravitas/core'
import { FreeClaudeCodeHarness, type AgentHarness } from '@gravitas/harnesses'
import { EventHub } from './events.js'
import { InMemoryRegistry } from './registry.js'
import { GravitasServer } from './server.js'
import { RunService } from './service.js'

// Export public symbols
export { GravitasServer, DEFAULT_HOST, DEFAULT_PORT } from './server.js'
export { RunService } from './service.js'
export { InMemoryRegistry, DEFAULT_MAX_RECENT_EVENTS } from './registry.js'
export { EventHub } from './events.js'
export {
  ApiError,
  NotFoundError,
  TaskStateConflictError,
  InvalidRequestError,
  PayloadTooLargeError,
  RunAlreadyExecutingError,
} from './errors.js'
export type {
  ApiErrorEnvelope,
  TaskEvidenceRef,
  TaskEvidenceDiffResponse,
  CreateRunInput,
  CreateRunResponse,
  RunDetailResponse,
  TaskDetailResponse,
  TaskEvidenceResponse,
  ApproveTaskInput,
  RejectTaskInput,
  HealthResponse,
  StateSummaryResponse,
  ServerOptions,
  ServerAddressInfo,
} from './types.js'

/**
 * Boots a standalone Gravitas server instance.
 */
export async function createStandaloneServer(options?: {
  host?: string | undefined
  port?: number | undefined
  runtimeRoot?: string | undefined
  defaultRepository?: string | undefined
  harness?: AgentHarness | undefined
}): Promise<GravitasServer> {
  const registry = new InMemoryRegistry()
  const eventHub = new EventHub(registry)
  const harness = options?.harness ?? new FreeClaudeCodeHarness()

  const service = new RunService({
    registry,
    eventHub,
    harness,
    runtimeRoot: options?.runtimeRoot,
    defaultRepository: options?.defaultRepository,
  })

  const server = new GravitasServer({
    service,
    eventHub,
  })

  return server
}

/**
 * CLI execution bootstrap when invoked directly via node or npm script.
 */
const entryArg = process.argv[1]
const isDirectlyExecuted =
  Boolean(entryArg) &&
  (import.meta.url === pathToFileURL(entryArg as string).href ||
    (entryArg as string).endsWith('index.ts') ||
    (entryArg as string).endsWith('index.js'))

async function bootstrap(): Promise<void> {
  const server = await createStandaloneServer()
  const addr = await server.start()

  // Minimal clean startup line — zero credentials or internal paths
  console.log(`[gravitas] server listening on ${addr.url} (v${GRAVITAS_VERSION})`)

  const shutdown = async () => {
    console.log('\n[gravitas] shutting down server cleanly...')
    await server.stop()
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

if (isDirectlyExecuted) {
  void bootstrap()
}
