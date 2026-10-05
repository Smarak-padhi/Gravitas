/**
 * GRAVITAS K5 — Integrity digests, canonical serialisation, redaction, target-state capture.
 *
 * A digest here is CHANGE-DETECTION metadata relative to a reference digest.
 * It is not a signature, does not identify an author, and does not make content trusted.
 *
 * This module reads files (node:fs) only to hash them. It never writes files,
 * opens databases, starts processes, or touches the network.
 */

import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import type { IntegrityComparison, IntegrityDigest } from './types.js'

export function computeIntegrityDigest(data: string | Buffer): IntegrityDigest {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8')
  return {
    algorithm: 'sha256',
    digestHex: createHash('sha256').update(buf).digest('hex'),
    byteLength: buf.length,
    semantics: 'CHANGE_DETECTION_RELATIVE_TO_REFERENCE_DIGEST',
    isDigitalSignature: false,
    confersExternalTrust: false,
    confersImmutability: false,
  }
}

/** Compares bytes against a previously recorded reference digest. Says nothing about who changed them. */
export function compareToReferenceDigest(
  data: string | Buffer,
  reference: Pick<IntegrityDigest, 'digestHex'>
): IntegrityComparison {
  return computeIntegrityDigest(data).digestHex === reference.digestHex
    ? 'MATCHES_REFERENCE_DIGEST'
    : 'CONTENT_CHANGED_RELATIVE_TO_REFERENCE_DIGEST'
}

/** Deterministic JSON: object keys sorted recursively; arrays keep their order. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeys(value))
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const k of Object.keys(value as Record<string, unknown>).sort()) {
      const v = (value as Record<string, unknown>)[k]
      if (v !== undefined) out[k] = sortKeys(v)
    }
    return out
  }
  return value
}

export function digestOfCanonical(value: unknown): IntegrityDigest {
  return computeIntegrityDigest(canonicalJson(value))
}

/** Normalises CRLF/LF and trims trailing whitespace/newlines so artifact comparison is shell-agnostic. */
export function normalizeContent(s: string): string {
  return s.replace(/\r\n/g, '\n').trim()
}

// ─── Redaction (pattern/value based; not a guarantee against unknown secret formats) ────

export interface RedactionPolicy {
  readonly exactValues: readonly string[]
  readonly patterns: readonly RegExp[]
}

const DEFAULT_PATTERNS: readonly RegExp[] = [
  /\b(?:sk|ghp|gho|xox[bap])-?[A-Za-z0-9_-]{16,}\b/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\b(?:api[_-]?key|token|secret|password)\s*[:=]\s*\S+/gi,
]

export function makeRedactor(policy?: Partial<RedactionPolicy>): (text: string) => string {
  const values = (policy?.exactValues ?? []).filter((v) => v.length > 0)
  const patterns = [...DEFAULT_PATTERNS, ...(policy?.patterns ?? [])].map((p) =>
    p.global ? p : new RegExp(p.source, p.flags + 'g')
  )
  return (text: string): string => {
    let out = text
    for (const v of values) out = out.split(v).join('[REDACTED]')
    for (const p of patterns) out = out.replace(p, '[REDACTED]')
    return out
  }
}

// ─── Target-state capture ────────────────────────────────────────────────────

export const ABSENT = 'ABSENT'

/** path → sha256 hex of current bytes, or 'ABSENT'. Read-only. */
export function captureTargetState(paths: readonly string[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const p of [...paths].sort()) {
    out[p] = existsSync(p) ? computeIntegrityDigest(readFileSync(p)).digestHex : ABSENT
  }
  return out
}

/** Lists files below a directory (read-only). Missing directory → empty list. */
export function listFilesRecursive(dir: string): string[] {
  if (!existsSync(dir)) return []
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...listFilesRecursive(full))
    else out.push(full)
  }
  return out.sort()
}

export function diffTargetState(
  before: Readonly<Record<string, string>>,
  after: Readonly<Record<string, string>>
): string[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)])
  return [...keys].filter((k) => before[k] !== after[k]).sort()
}

export function readArtifactIfPresent(path: string): Buffer | undefined {
  return existsSync(path) ? readFileSync(path) : undefined
}
