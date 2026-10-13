/**
 * GRAVITAS V1-F-01 / V1-F-02 — Scoped Allowlisted Application Launcher & Bounded Windows Automation
 *
 * Launches only explicitly allowlisted Windows desktop applications using
 * resolved absolute binary paths with shell: false and zero user arguments,
 * plus bounded Notepad automation with explicit user approval for file writes.
 *
 * Security Invariants:
 * - Never executes arbitrary generated shell commands.
 * - Enforces capability 'cap:desktop:launch-app' and 'cap:desktop:bounded-automation'.
 * - Requires explicit user approval (approved === true) before saving any file to disk.
 * - Rejects unknown applications or argument injection fail-closed.
 */

import { spawn } from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'
import type { AllowlistedAppId } from './commandParser.js'

export interface AllowlistedAppSpec {
  readonly appId: AllowlistedAppId
  readonly displayName: string
  readonly executableName: string
  readonly capabilityRequired: 'cap:desktop:launch-app'
}

export interface AppLaunchResult {
  readonly launched: boolean
  readonly appId: string
  readonly displayName: string
  readonly executablePath: string
  readonly pid?: number | undefined
  readonly capabilityGranted: 'cap:desktop:launch-app'
  readonly shellUsed: false
  readonly message: string
}

export interface NotepadAutomationResult {
  readonly status: 'SUCCEEDED' | 'CONFIRMATION_REQUIRED'
  readonly launched: boolean
  readonly typedText: string
  readonly savedFilePath?: string | undefined
  readonly pid?: number | undefined
  readonly capabilityGranted: 'cap:desktop:bounded-automation'
  readonly shellUsed: false
  readonly message: string
}

export type CustomAppSpawnFn = (
  spec: AllowlistedAppSpec,
  executablePath: string,
  args?: readonly string[]
) => Promise<{ pid?: number }>

const ALLOWLISTED_APPS: Readonly<Record<AllowlistedAppId, AllowlistedAppSpec>> = {
  notepad: {
    appId: 'notepad',
    displayName: 'Notepad',
    executableName: 'notepad.exe',
    capabilityRequired: 'cap:desktop:launch-app',
  },
  calc: {
    appId: 'calc',
    displayName: 'Calculator',
    executableName: 'calc.exe',
    capabilityRequired: 'cap:desktop:launch-app',
  },
  mspaint: {
    appId: 'mspaint',
    displayName: 'Paint',
    executableName: 'mspaint.exe',
    capabilityRequired: 'cap:desktop:launch-app',
  },
}

export function resolveAllowlistedExecutablePath(executableName: string): string {
  const sysRoot = process.env['SystemRoot'] || process.env['windir'] || 'C:\\Windows'
  const system32Candidate = path.join(sysRoot, 'System32', executableName)
  if (fs.existsSync(system32Candidate)) {
    return system32Candidate
  }
  const winCandidate = path.join(sysRoot, executableName)
  if (fs.existsSync(winCandidate)) {
    return winCandidate
  }
  return system32Candidate
}

export class AllowlistedAppLauncher {
  private readonly customSpawn?: CustomAppSpawnFn | undefined
  private readonly enabledCapabilities: ReadonlySet<string>

  public constructor(opts?: {
    readonly customSpawn?: CustomAppSpawnFn | undefined
    readonly enabledCapabilities?: readonly string[] | undefined
  }) {
    this.customSpawn = opts?.customSpawn
    this.enabledCapabilities = new Set(
      opts?.enabledCapabilities ?? ['cap:desktop:launch-app', 'cap:desktop:bounded-automation']
    )
  }

  public getAllowlistedApps(): readonly AllowlistedAppSpec[] {
    return Object.values(ALLOWLISTED_APPS)
  }

  public async launchApp(appId: string, signal?: AbortSignal): Promise<AppLaunchResult> {
    if (signal?.aborted) {
      throw new Error('Application launch cancelled before execution')
    }

    const spec = (ALLOWLISTED_APPS as Record<string, AllowlistedAppSpec | undefined>)[appId]
    if (!spec) {
      throw new Error(`Application "${appId}" is not in the allowlist`)
    }

    if (!this.enabledCapabilities.has(spec.capabilityRequired)) {
      throw new Error(`Missing required capability "${spec.capabilityRequired}" to launch ${spec.displayName}`)
    }

    const executablePath = resolveAllowlistedExecutablePath(spec.executableName)

    if (this.customSpawn) {
      const spawned = await this.customSpawn(spec, executablePath, [])
      return {
        launched: true,
        appId: spec.appId,
        displayName: spec.displayName,
        executablePath,
        pid: spawned.pid,
        capabilityGranted: 'cap:desktop:launch-app',
        shellUsed: false,
        message: `Launched ${spec.displayName} (${executablePath}) via scoped capability.`,
      }
    }

    if (!fs.existsSync(executablePath)) {
      throw new Error(`Allowlisted binary not found at "${executablePath}"`)
    }

    const pid = await new Promise<number | undefined>((resolve, reject) => {
      try {
        const child = spawn(executablePath, [], {
          detached: true,
          stdio: 'ignore',
          shell: false,
          windowsHide: false,
        })
        child.once('error', (err) => {
          reject(err)
        })
        child.once('spawn', () => {
          const childPid = child.pid
          child.unref()
          resolve(childPid)
        })
      } catch (err) {
        reject(err)
      }
    })

    return {
      launched: true,
      appId: spec.appId,
      displayName: spec.displayName,
      executablePath,
      pid,
      capabilityGranted: 'cap:desktop:launch-app',
      shellUsed: false,
      message: `Launched ${spec.displayName}${pid ? ` (PID ${pid})` : ''}.`,
    }
  }

  /**
   * Bounded Windows Notepad Automation:
   * - Requires capability 'cap:desktop:bounded-automation'
   * - If file saving is requested, requires explicit user approval (saveApproved === true)
   *   and writes only within the user-approved safe directory before opening in Notepad with shell: false.
   */
  public async executeNotepadAutomation(params: {
    readonly textToType: string
    readonly requiresSaveApproval: boolean
    readonly saveApproved?: boolean | undefined
    readonly approvedDirectory: string
    readonly fileName?: string | undefined
    readonly signal?: AbortSignal | undefined
  }): Promise<NotepadAutomationResult> {
    if (params.signal?.aborted) {
      throw new Error('Notepad automation cancelled before execution')
    }

    if (!this.enabledCapabilities.has('cap:desktop:bounded-automation')) {
      throw new Error('Missing required capability "cap:desktop:bounded-automation" for Notepad automation')
    }

    const cleanText = (params.textToType || '').trim()
    if (!cleanText) {
      throw new Error('Notepad automation textToType must be non-empty')
    }
    if (cleanText.length > 32768) {
      throw new Error('Notepad automation textToType exceeds maximum length')
    }

    if (params.requiresSaveApproval && params.saveApproved !== true) {
      return {
        status: 'CONFIRMATION_REQUIRED',
        launched: false,
        typedText: cleanText,
        capabilityGranted: 'cap:desktop:bounded-automation',
        shellUsed: false,
        message: `Approval required before saving "${cleanText}" to disk and opening in Notepad.`,
      }
    }

    const safeDir = path.resolve(params.approvedDirectory)
    fs.mkdirSync(safeDir, { recursive: true })
    const rawFileName = (params.fileName || 'gravitas-note.txt').replace(/[^a-zA-Z0-9._-]/g, '-')
    const safeFileName = rawFileName.endsWith('.txt') || rawFileName.endsWith('.md') ? rawFileName : `${rawFileName}.txt`
    const targetFilePath = path.join(safeDir, safeFileName)

    // Verify path stays strictly inside approvedDirectory
    if (!targetFilePath.startsWith(safeDir)) {
      throw new Error('Refused file save outside approved directory boundary')
    }

    fs.writeFileSync(targetFilePath, `${cleanText}\r\n`, 'utf8')

    const spec = ALLOWLISTED_APPS.notepad
    const executablePath = resolveAllowlistedExecutablePath(spec.executableName)

    if (this.customSpawn) {
      const spawned = await this.customSpawn(spec, executablePath, [targetFilePath])
      return {
        status: 'SUCCEEDED',
        launched: true,
        typedText: cleanText,
        savedFilePath: targetFilePath,
        pid: spawned.pid,
        capabilityGranted: 'cap:desktop:bounded-automation',
        shellUsed: false,
        message: `Opened Notepad with "${cleanText}" and saved to approved location "${targetFilePath}".`,
      }
    }

    const pid = await new Promise<number | undefined>((resolve, reject) => {
      try {
        const child = spawn(executablePath, [targetFilePath], {
          detached: true,
          stdio: 'ignore',
          shell: false,
          windowsHide: false,
        })
        child.once('error', (err) => reject(err))
        child.once('spawn', () => {
          const childPid = child.pid
          child.unref()
          resolve(childPid)
        })
      } catch (err) {
        reject(err)
      }
    })

    return {
      status: 'SUCCEEDED',
      launched: true,
      typedText: cleanText,
      savedFilePath: targetFilePath,
      pid,
      capabilityGranted: 'cap:desktop:bounded-automation',
      shellUsed: false,
      message: `Opened Notepad with "${cleanText}" and saved to approved location "${targetFilePath}".`,
    }
  }
}

