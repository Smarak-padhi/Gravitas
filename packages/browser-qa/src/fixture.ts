/**
 * Isolated Local HTTP Server Fixture for Deterministic Browser QA.
 *
 * Binds exclusively to 127.0.0.1 on an ephemeral port (port 0).
 * Provides reproducible endpoints for verifying Browser QA actions, assertions,
 * console errors, and network failure observations.
 */

import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http'

export type RouteHandler = (req: IncomingMessage, res: ServerResponse) => void

export interface FixtureServerOptions {
  readonly routes?: Record<string, string | RouteHandler> | undefined
}

export interface FixtureServerInstance {
  readonly url: string
  readonly port: number
  close(): Promise<void>
}

/**
 * Starts a deterministic local fixture server on 127.0.0.1.
 */
export async function startFixtureServer(options?: FixtureServerOptions | undefined): Promise<FixtureServerInstance> {
  const routes = options?.routes ?? {}

  const server: Server = createServer((req, res) => {
    const pathname = req.url?.split('?')[0] ?? '/'
    const handlerOrContent = routes[pathname]

    if (typeof handlerOrContent === 'function') {
      handlerOrContent(req, res)
      return
    }

    if (typeof handlerOrContent === 'string') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(handlerOrContent)
      return
    }

    // Default 404
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end(`Not Found: ${pathname}`)
  })

  await new Promise<void>((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => resolve())
    server.on('error', reject)
  })

  const address = server.address()
  if (!address || typeof address !== 'object') {
    throw new Error('Failed to resolve fixture server address')
  }

  const port = address.port
  const url = `http://127.0.0.1:${port}`

  return {
    url,
    port,
    close: async () => {
      await new Promise<void>((resolve) => {
        server.close(() => resolve())
      })
    },
  }
}
