/**
 * Gravitas HTTP Server Container.
 *
 * Wraps Node.js built-in http.Server with:
 * - Deterministic loopback default (127.0.0.1)
 * - Ephemeral port support (port 0 for test isolation)
 * - Graceful connection and SSE stream teardown
 */

import { createServer, type Server } from 'node:http'
import type { Socket } from 'node:net'
import { createRequestListener } from './app.js'
import type { EventHub } from './events.js'
import type { RunService } from './service.js'
import type { ServerAddressInfo, ServerOptions } from './types.js'

export const DEFAULT_HOST = '127.0.0.1'
export const DEFAULT_PORT = 4317

export interface GravitasServerDependencies {
  readonly service: RunService
  readonly eventHub: EventHub
}

export class GravitasServer {
  private readonly server: Server
  private readonly eventHub: EventHub
  private readonly sockets = new Set<Socket>()
  private addressInfo?: ServerAddressInfo | undefined

  public constructor(deps: GravitasServerDependencies) {
    this.eventHub = deps.eventHub
    const requestListener = createRequestListener(deps)
    this.server = createServer(requestListener)

    // Track active sockets for immediate clean teardown on stop()
    this.server.on('connection', (socket: Socket) => {
      this.sockets.add(socket)
      socket.on('close', () => {
        this.sockets.delete(socket)
      })
    })
  }

  /**
   * Starts listening on the configured host and port.
   * Defaults strictly to loopback (127.0.0.1).
   */
  public async start(options?: ServerOptions | undefined): Promise<ServerAddressInfo> {
    const host = options?.host ?? process.env['HOST'] ?? DEFAULT_HOST
    const port = options?.port ?? (process.env['PORT'] ? Number(process.env['PORT']) : DEFAULT_PORT)

    return new Promise((resolve, reject) => {
      this.server.once('error', reject)

      this.server.listen(port, host, () => {
        this.server.removeListener('error', reject)
        const addr = this.server.address()
        if (!addr || typeof addr === 'string') {
          reject(new Error('Failed to resolve server listening address.'))
          return
        }

        this.addressInfo = {
          host: addr.address,
          port: addr.port,
          url: `http://${addr.address}:${addr.port}`,
        }
        resolve(this.addressInfo)
      })
    })
  }

  /**
   * Current server address info, if listening.
   */
  public get address(): ServerAddressInfo | undefined {
    return this.addressInfo
  }

  /**
   * Stops the server, closes all SSE streams, and destroys pending sockets.
   */
  public async stop(): Promise<void> {
    // 1. Close all active SSE streams
    this.eventHub.close()

    // 2. Destroy any pending raw TCP sockets
    for (const socket of this.sockets) {
      if (!socket.destroyed) {
        socket.destroy()
      }
    }
    this.sockets.clear()

    // 3. Close the HTTP server
    return new Promise((resolve, reject) => {
      if (!this.server.listening) {
        resolve()
        return
      }

      this.server.close((err) => {
        if (err) {
          reject(err)
        } else {
          this.addressInfo = undefined
          resolve()
        }
      })
    })
  }
}
