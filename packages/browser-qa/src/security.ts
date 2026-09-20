/**
 * Security boundaries for Deterministic Browser QA.
 *
 * Invariants:
 * 1. ONLY local loopback origins (`127.0.0.1`, `localhost`, `[::1]`) are allowed.
 * 2. Cloud metadata endpoints (`169.254.169.254`, `metadata.google.internal`) are strictly blocked.
 * 3. LAN private networks (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`) are strictly blocked.
 * 4. External internet hosts (`example.com`, `google.com`, etc.) are strictly blocked.
 * 5. Schemes other than `http:` and `https:` (`file:`, `data:`, `javascript:`, `ftp:`) are strictly blocked.
 * 6. Screenshot names must be safe identifiers without path traversal.
 */

import { BrowserQaSecurityError } from './errors.js'

export const ALLOWED_LOOPBACK_HOSTS: readonly string[] = Object.freeze([
  '127.0.0.1',
  'localhost',
  '::1',
  '[::1]',
])

const FORBIDDEN_METADATA_IPS: readonly string[] = Object.freeze([
  '169.254.169.254',
  '169.254.170.2',
  'metadata.google.internal',
  '100.100.100.200',
])

/**
 * Validates a target URL against loopback and origin constraints.
 * Throws BrowserQaSecurityError if the URL violates security boundaries.
 */
export function validateTargetUrl(rawUrl: string, allowedOrigins?: readonly string[] | undefined): URL {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) {
    throw new BrowserQaSecurityError('Target URL must be a non-empty string')
  }

  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch (err) {
    throw new BrowserQaSecurityError(`Invalid URL format '${rawUrl}': ${(err as Error).message}`)
  }

  // Scheme validation: strictly http or https
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new BrowserQaSecurityError(
      `Disallowed URL protocol '${parsed.protocol}'. Only 'http:' and 'https:' are permitted.`
    )
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '')

  // Explicit check for cloud metadata
  if (FORBIDDEN_METADATA_IPS.includes(hostname)) {
    throw new BrowserQaSecurityError(
      `Security Violation: Access to cloud metadata endpoint '${hostname}' is strictly forbidden`
    )
  }

  // Check against explicit allowedOrigins if provided
  if (allowedOrigins && allowedOrigins.length > 0) {
    const origin = parsed.origin.toLowerCase()
    const matchesAllowed = allowedOrigins.some((allowed) => {
      try {
        const allowedOrigin = new URL(allowed).origin.toLowerCase()
        return origin === allowedOrigin
      } catch {
        return false
      }
    })

    if (!matchesAllowed) {
      throw new BrowserQaSecurityError(
        `Target origin '${origin}' is not in the configured allowedOrigins list: ${allowedOrigins.join(', ')}`
      )
    }
  }

  // Check loopback host requirement
  const isLoopback =
    ALLOWED_LOOPBACK_HOSTS.includes(hostname) ||
    hostname === '127.0.0.1' ||
    hostname === '::1'

  if (!isLoopback) {
    // Check if it's a private LAN IP
    if (isPrivateLanIp(hostname)) {
      throw new BrowserQaSecurityError(
        `Security Violation: Access to private LAN address '${hostname}' is strictly forbidden`
      )
    }

    throw new BrowserQaSecurityError(
      `Security Violation: Non-loopback host '${hostname}' is strictly forbidden. Browser QA only runs against 127.0.0.1 or localhost.`
    )
  }

  return parsed
}

/**
 * Detects private IPv4 networks (RFC 1918) and carrier-grade NAT (RFC 6598).
 */
function isPrivateLanIp(hostname: string): boolean {
  // 10.0.0.0 - 10.255.255.255
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true

  // 172.16.0.0 - 172.31.255.255
  const match172 = /^172\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/.exec(hostname)
  if (match172) {
    const secondOctet = Number.parseInt(match172[1] ?? '', 10)
    if (secondOctet >= 16 && secondOctet <= 31) return true
  }

  // 192.168.0.0 - 192.168.255.255
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true

  // 100.64.0.0 - 100.127.255.255 (CGNAT)
  const match100 = /^100\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/.exec(hostname)
  if (match100) {
    const secondOctet = Number.parseInt(match100[1] ?? '', 10)
    if (secondOctet >= 64 && secondOctet <= 127) return true
  }

  return false
}

/**
 * Validates screenshot artifact file name against directory traversal.
 */
export function validateScreenshotName(name: string): string {
  if (typeof name !== 'string' || !name.trim()) {
    throw new BrowserQaSecurityError('Screenshot name must be a non-empty string')
  }

  const trimmed = name.trim()
  if (trimmed.includes('..') || trimmed.includes('/') || trimmed.includes('\\')) {
    throw new BrowserQaSecurityError(
      `Security Violation: Screenshot name '${trimmed}' contains forbidden path traversal characters`
    )
  }

  // Safe file characters: letters, numbers, dash, underscore, dot
  if (!/^[a-zA-Z0-9_\-\.]+$/.test(trimmed)) {
    throw new BrowserQaSecurityError(
      `Screenshot name '${trimmed}' contains unsafe characters. Only alphanumeric, dashes, dots, and underscores allowed.`
    )
  }

  return trimmed.endsWith('.png') ? trimmed : `${trimmed}.png`
}
