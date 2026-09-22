import { createServer } from 'node:net'

/**
 * Allocates a temporary, guaranteed available loopback port from the OS kernel.
 */
export async function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const s = createServer()
    s.unref()
    s.listen(0, '127.0.0.1', () => {
      const addr = s.address()
      if (!addr || typeof addr === 'string') {
        s.close(() => reject(new Error('Failed to obtain free port address')))
        return
      }
      const port = addr.port
      s.close((err) => {
        if (err) reject(err)
        else resolve(port)
      })
    })
    s.on('error', reject)
  })
}
