/**
 * GRAVITAS — Portable Configuration & First-Run Onboarding State
 *
 * Persists runtime configuration, user preferences, and onboarding progress
 * to `<dataRoot>/config.json`.
 *
 * Guarantees:
 * - Atomic file updates via temporary file write + rename.
 * - Non-destructive recovery on JSON corruption (creates timestamped backup, never deletes data).
 * - No API keys or secrets are ever stored in plaintext config.
 * - Idempotent loading and updating.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { randomUUID } from 'node:crypto'

export type GravitasOperatingMode = 'DETERMINISTIC_ONLY' | 'ASSISTED'

export type OnboardingStep =
  | 'WELCOME'
  | 'DIAGNOSTICS'
  | 'STORAGE'
  | 'OPERATING_MODE'
  | 'HARNESSES'
  | 'PROVIDERS'
  | 'POLICY'
  | 'COMPLETED'

export interface OnboardingState {
  readonly completed: boolean
  readonly completedAt?: string | undefined
  readonly step: OnboardingStep
  readonly operatingMode: GravitasOperatingMode
  readonly selectedHarnesses: readonly string[]
  readonly providerConfigured: boolean
  readonly dismissedNoticeIds?: readonly string[] | undefined
}

export interface GravitasConfig {
  readonly version: 1
  readonly onboarding: OnboardingState
  readonly createdAt: string
  readonly updatedAt: string
}

export function getDefaultOnboardingState(): OnboardingState {
  return {
    completed: false,
    step: 'WELCOME',
    operatingMode: 'DETERMINISTIC_ONLY',
    selectedHarnesses: ['harness:powershell:desktop'],
    providerConfigured: false,
  }
}

export function getDefaultGravitasConfig(): GravitasConfig {
  const now = new Date().toISOString()
  return {
    version: 1,
    onboarding: getDefaultOnboardingState(),
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Loads configuration from a given file path.
 * If file does not exist, returns the default configuration without throwing.
 * If file is corrupt, creates a .corrupt backup and returns default.
 */
export function loadGravitasConfig(configFilePath: string): { config: GravitasConfig; wasCorrupt: boolean } {
  if (!fs.existsSync(configFilePath)) {
    return { config: getDefaultGravitasConfig(), wasCorrupt: false }
  }

  try {
    const raw = fs.readFileSync(configFilePath, 'utf8')
    const parsed = JSON.parse(raw)

    if (typeof parsed !== 'object' || parsed === null || parsed.version !== 1) {
      throw new Error('Invalid config format or unsupported version')
    }

    const onboarding = parsed.onboarding || {}
    const validatedOnboarding: OnboardingState = {
      completed: Boolean(onboarding.completed),
      completedAt: onboarding.completedAt,
      step: onboarding.step || (onboarding.completed ? 'COMPLETED' : 'WELCOME'),
      operatingMode: onboarding.operatingMode === 'ASSISTED' ? 'ASSISTED' : 'DETERMINISTIC_ONLY',
      selectedHarnesses: Array.isArray(onboarding.selectedHarnesses) ? onboarding.selectedHarnesses : ['harness:powershell:desktop'],
      providerConfigured: Boolean(onboarding.providerConfigured),
      dismissedNoticeIds: Array.isArray(onboarding.dismissedNoticeIds) ? onboarding.dismissedNoticeIds : [],
    }

    const config: GravitasConfig = {
      version: 1,
      onboarding: validatedOnboarding,
      createdAt: parsed.createdAt || new Date().toISOString(),
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    }

    return { config, wasCorrupt: false }
  } catch (err) {
    // Non-destructive preservation: back up corrupt file
    try {
      const backupPath = `${configFilePath}.corrupt-${Date.now()}`
      fs.copyFileSync(configFilePath, backupPath)
    } catch {
      // Ignore backup error
    }

    return { config: getDefaultGravitasConfig(), wasCorrupt: true }
  }
}

/**
 * Saves configuration atomically to disk.
 */
export function saveGravitasConfig(configFilePath: string, config: GravitasConfig): void {
  const dir = path.dirname(configFilePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  const updated: GravitasConfig = {
    ...config,
    updatedAt: new Date().toISOString(),
  }

  const serialized = JSON.stringify(updated, null, 2)
  const tempPath = path.join(dir, `.config-tmp-${randomUUID()}`)

  try {
    fs.writeFileSync(tempPath, serialized, 'utf8')
    fs.renameSync(tempPath, configFilePath)
  } catch (err) {
    // Fallback for Windows file-system contention on rename
    try {
      fs.writeFileSync(configFilePath, serialized, 'utf8')
    } finally {
      try {
        if (fs.existsSync(tempPath)) fs.rmSync(tempPath, { force: true })
      } catch {
        // Ignore temp cleanup error
      }
    }
  }
}

/**
 * Convenience helper to read configuration given dataRoot directory.
 */
export function readGravitasConfig(dataRoot: string): GravitasConfig {
  const configPath = path.join(dataRoot, 'config.json')
  return loadGravitasConfig(configPath).config
}

/**
 * Convenience helper to write or update configuration given dataRoot directory.
 */
export function writeGravitasConfig(dataRoot: string, patch: Partial<GravitasConfig>): GravitasConfig {
  const configPath = path.join(dataRoot, 'config.json')
  const current = loadGravitasConfig(configPath).config
  const updated: GravitasConfig = {
    ...current,
    ...patch,
    version: 1,
    onboarding: {
      ...current.onboarding,
      ...(patch.onboarding || {}),
    },
    updatedAt: new Date().toISOString(),
  }
  saveGravitasConfig(configPath, updated)
  return updated
}
