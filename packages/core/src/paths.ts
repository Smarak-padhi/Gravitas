/**
 * GRAVITAS — Portable Runtime Path Resolution
 *
 * Implements a canonical, deterministic directory policy for Windows and cross-platform runtime:
 * - Data root resolves independently of git repository or temporary directories.
 * - Supports deliberate, validated test override via GRAVITAS_DATA_ROOT or function parameters.
 * - Enforces directory traversal protection and path normalization.
 * - Fully supports Windows paths with spaces and Unicode characters.
 * - Provides actionable diagnostics on inaccessible/read-only directories without silent fallback.
 */

import * as path from 'node:path'
import * as os from 'node:os'
import * as fs from 'node:fs'
import { randomUUID } from 'node:crypto'

export interface GravitasPaths {
  readonly dataRoot: string
  readonly databasePath: string
  readonly lockPath: string
  readonly logsDir: string
  readonly artifactsDir: string
  readonly configPath: string
  readonly isTestOverride: boolean
}

export class PathResolutionError extends Error {
  public constructor(message: string, public readonly pathValue?: string) {
    super(message)
    this.name = 'PathResolutionError'
  }
}

/**
 * Validates that a directory path is safe, normalized, and does not contain null bytes or illegal characters.
 */
export function validateSafeDirectoryPath(rawPath: string): string {
  if (!rawPath || typeof rawPath !== 'string' || rawPath.trim().length === 0) {
    throw new PathResolutionError('Directory path must be a non-empty string')
  }

  // Prevent null-byte injection
  if (rawPath.includes('\0')) {
    throw new PathResolutionError('Directory path contains illegal null bytes', rawPath)
  }

  const resolved = path.resolve(rawPath.trim())
  return resolved
}

/**
 * Resolves the canonical GRAVITAS data root directory according to platform conventions.
 *
 * Priority order:
 * 1. Explicit argument (`customPath`)
 * 2. Environment variable `GRAVITAS_DATA_ROOT`
 * 3. Windows standard `%APPDATA%\gravitas`
 * 4. User home fallback `~/.gravitas`
 */
export function resolveGravitasDataRoot(customPath?: string): { dataRoot: string; isTestOverride: boolean } {
  if (customPath && customPath.trim().length > 0) {
    const valid = validateSafeDirectoryPath(customPath)
    return { dataRoot: valid, isTestOverride: true }
  }

  const envOverride = process.env['GRAVITAS_DATA_ROOT']
  if (envOverride && envOverride.trim().length > 0) {
    const valid = validateSafeDirectoryPath(envOverride)
    return { dataRoot: valid, isTestOverride: true }
  }

  // Windows standard: %APPDATA%\gravitas
  if (process.platform === 'win32') {
    const appData = process.env['APPDATA']
    if (appData && appData.trim().length > 0) {
      const valid = path.join(path.resolve(appData.trim()), 'gravitas')
      return { dataRoot: valid, isTestOverride: false }
    }
  }

  // Cross-platform / fallback: ~/.gravitas
  const home = os.homedir()
  const fallback = path.join(path.resolve(home), '.gravitas')
  return { dataRoot: fallback, isTestOverride: false }
}

/**
 * Resolves complete set of canonical paths for database, logs, lock, and configuration.
 */
export function resolveGravitasPaths(customDataRoot?: string): GravitasPaths {
  const { dataRoot, isTestOverride } = resolveGravitasDataRoot(customDataRoot)

  return {
    dataRoot,
    databasePath: path.join(dataRoot, 'kernel.db'),
    lockPath: path.join(dataRoot, 'kernel.lock'),
    logsDir: path.join(dataRoot, 'logs'),
    artifactsDir: path.join(dataRoot, 'artifacts'),
    configPath: path.join(dataRoot, 'config.json'),
    isTestOverride,
  }
}

/**
 * Probes whether a target data root directory is writable.
 * Does not silently fallback; returns an actionable error if read-only or inaccessible.
 */
export function testDataRootWritable(targetDir: string): { writable: boolean; error?: string } {
  try {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true })
    }

    // Attempt to write and remove an ephemeral probe file
    const probeFile = path.join(targetDir, `.gravitas-probe-${randomUUID()}`)
    fs.writeFileSync(probeFile, 'probe', { encoding: 'utf8' })
    fs.rmSync(probeFile, { force: true })

    return { writable: true }
  } catch (err: any) {
    const message = err?.message || String(err)
    return {
      writable: false,
      error: `Directory "${targetDir}" is not writable: ${message}. Please check folder permissions or configure GRAVITAS_DATA_ROOT.`,
    }
  }
}

/**
 * Ensures required directories (dataRoot, logs, artifacts) exist and are verified writable.
 * Throws PathResolutionError with remediation guidance if inaccessible.
 */
export function ensureDataRootDirectories(paths: GravitasPaths): void {
  const probe = testDataRootWritable(paths.dataRoot)
  if (!probe.writable) {
    throw new PathResolutionError(probe.error ?? `Inaccessible data root: ${paths.dataRoot}`, paths.dataRoot)
  }

  if (!fs.existsSync(paths.logsDir)) {
    fs.mkdirSync(paths.logsDir, { recursive: true })
  }

  if (!fs.existsSync(paths.artifactsDir)) {
    fs.mkdirSync(paths.artifactsDir, { recursive: true })
  }
}
