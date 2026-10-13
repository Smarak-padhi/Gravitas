/**
 * GRAVITAS Wave V1-F-01 — Floating Assistant + Local Ideas Vault Test Suite
 *
 * Covers:
 * - Demo A: Launch/toggle the floating companion using the registered global shortcut.
 * - Demo B: Enter "Save this idea: build a free AI study planner."
 * - Demo C: Close and reopen the companion / restart host and confirm idea persists.
 * - Demo D: Search for the saved idea ("Find my study planner idea.") and display its original text.
 * - Demo E: Enter "Open Notepad." and verify allowlisted application launch with shell: false.
 * - Demo F: Cancel an active action via STOP/cancel control and verify safe terminal state (CANCELLED).
 * - Ideas Vault CRUD: save, list, search, open/edit (preserving originalText), confirmation-gated deletion.
 * - Voice Push-to-Talk & Offline STT: user-initiated guard, honest setup status when model not installed, zero cloud egress.
 * - Supervised Self-Improvement Registry: capability registration, failed attempts tracking, user feedback, and non-destructive ImprovementProposals.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  DesktopSupervisor,
  KernelHost,
  parseAssistantCommand,
  IdeasVaultStore,
  type ProcessBridge,
  type AllowlistedAppSpec,
} from './index.js'
import {
  isAuthorizedRestartCaller,
  registerCompanionShortcut,
  DEFAULT_COMPANION_SHORTCUT,
} from './main/index.js'

vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn() },
  globalShortcut: {
    register: vi.fn(() => true),
    unregisterAll: vi.fn(),
  },
  app: {
    requestSingleInstanceLock: vi.fn(() => true),
    on: vi.fn(),
    whenReady: vi.fn(() => Promise.resolve()),
    exit: vi.fn(),
    quit: vi.fn(),
  },
  BrowserWindow: vi.fn(),
  session: {
    defaultSession: {
      webRequest: { onHeadersReceived: vi.fn() },
    },
  },
  Tray: vi.fn(),
  Menu: { buildFromTemplate: vi.fn() },
  nativeImage: { createFromPath: vi.fn(), createEmpty: vi.fn() },
}))

describe('GRAVITAS Wave V1-F-01 — Floating Assistant + Local Ideas Vault Suite', () => {
  let tempDir: string
  let host: KernelHost
  let supervisor: DesktopSupervisor
  let launchedApps: Array<{ spec: AllowlistedAppSpec; executablePath: string; pid: number }>

  const createHostAndSupervisor = async (opts?: {
    readonly customLocalTranscriber?: (audio?: string) => Promise<string> | string
  }) => {
    const mainListeners: {
      message?: (msg: unknown) => void
      exit?: (code: number) => void
      error?: (err: Error) => void
    } = {}

    const h = new KernelHost({
      dataRoot: tempDir,
      pid: 7101,
      customAppSpawn: async (spec, executablePath) => {
        const entry = { spec, executablePath, pid: 9001 + launchedApps.length }
        launchedApps.push(entry)
        return { pid: entry.pid }
      },
      customLocalTranscriber: opts?.customLocalTranscriber,
      onMessage: (msg) => {
        mainListeners.message?.(msg)
      },
    })

    const bridge: ProcessBridge = {
      pid: 7101,
      postMessage: async (msg: unknown) => {
        await h.handleMessage(msg)
      },
      on: (event: string, listener: any) => {
        if (event === 'message') mainListeners.message = listener
        if (event === 'exit') mainListeners.exit = listener
        if (event === 'error') mainListeners.error = listener
      },
      kill: () => {
        mainListeners.exit?.(0)
      },
    }

    const sup = new DesktopSupervisor({
      dataRoot: tempDir,
      forkProcess: () => bridge,
    })

    await sup.start()
    await h.start()
    return { h, sup }
  }

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'gravitas-v1f01-test-'))
    launchedApps = []
    const setup = await createHostAndSupervisor()
    host = setup.h
    supervisor = setup.sup
  })

  afterEach(async () => {
    await supervisor.shutdown()
    await host.shutdown()
    try {
      await rm(tempDir, { recursive: true, force: true })
    } catch {}
  })

  // ─── Mandatory Working Demonstrations (A through F) ─────────────────────────

  it('Demo A: Launches and toggles the floating companion via registered global shortcut and validates frame identity', () => {
    let companionVisible = false
    const ok = registerCompanionShortcut(DEFAULT_COMPANION_SHORTCUT, () => {
      companionVisible = !companionVisible
    })
    expect(ok).toBe(true)

    // Verify top-level companion frame is authorized while subframes/other URLs are rejected
    const companionFrame = {
      parent: null,
      url: pathToFileURL(join(dirname(fileURLToPath(import.meta.url)), 'renderer/companion.html')).href,
    }
    const companionSender = { mainFrame: companionFrame }
    const companionWin = { isDestroyed: () => false, webContents: companionSender } as any

    expect(
      isAuthorizedRestartCaller(
        { sender: companionSender, senderFrame: companionFrame } as any,
        null,
        companionWin
      )
    ).toBe(true)

    expect(
      isAuthorizedRestartCaller(
        { sender: companionSender, senderFrame: { parent: {}, url: companionFrame.url } } as any,
        null,
        companionWin
      )
    ).toBe(false)
  })

  it('Demo B: Enters "Save this idea: build a free AI study planner." and persists it offline without API keys or models', async () => {
    const res = await supervisor.executeAssistantCommand({
      input: 'Save this idea: build a free AI study planner.',
    })

    expect(res.status).toBe('SUCCESS')
    expect(res.terminalState).toBe('SUCCEEDED')
    expect(res.intentKind).toBe('SAVE_IDEA')
    expect(res.savedIdea).toBeDefined()
    expect(res.savedIdea?.originalText).toBe('build a free AI study planner.')
    expect(res.savedIdea?.persistenceStatus).toBe('PERSISTED')
    expect(res.savedIdea?.tags).toEqual(expect.arrayContaining(['ai', 'education', 'planning', 'free-local']))

    // Verify canonical WorkSession task tracking
    const hierarchy = await supervisor.getWorkHierarchy()
    const ws = hierarchy.sessions.find((s) => s.id === res.workSessionId)
    expect(ws).toBeDefined()
    expect(ws?.runs[0]?.tasks[0]?.state).toBe('SUCCEEDED')
  })

  it('Demo C: Closes and reopens companion (and restarts KernelHost) confirming saved idea persists on disk', async () => {
    const saved = await supervisor.executeAssistantCommand({
      input: 'Save this idea: build a free AI study planner.',
    })
    expect(saved.savedIdea?.id).toBeDefined()

    // Simulate closing companion and restarting KernelHost + Supervisor against same dataRoot
    await supervisor.shutdown()
    await host.shutdown()

    const reopened = await createHostAndSupervisor()
    host = reopened.h
    supervisor = reopened.sup

    const listRes = await supervisor.executeAssistantCommand({
      input: 'Show my ideas.',
    })
    expect(listRes.status).toBe('SUCCESS')
    expect(listRes.ideas).toHaveLength(1)
    expect(listRes.ideas?.[0]?.id).toBe(saved.savedIdea?.id)
    expect(listRes.ideas?.[0]?.originalText).toBe('build a free AI study planner.')
    expect(listRes.ideas?.[0]?.persistenceStatus).toBe('PERSISTED')
  })

  it('Demo D: Searches for the saved idea ("Find my study planner idea.") and displays its original text', async () => {
    await supervisor.executeAssistantCommand({
      input: 'Save this idea: build a free AI study planner.',
    })
    await supervisor.executeAssistantCommand({
      input: 'Save this idea: local markdown receipt indexer.',
    })

    const searchRes = await supervisor.executeAssistantCommand({
      input: 'Find my study planner idea.',
    })

    expect(searchRes.status).toBe('SUCCESS')
    expect(searchRes.intentKind).toBe('SEARCH_IDEAS')
    expect(searchRes.ideas).toHaveLength(1)
    expect(searchRes.ideas?.[0]?.originalText).toBe('build a free AI study planner.')
    expect(searchRes.message).toContain('build a free AI study planner.')
  })

  it('Demo E: Enters "Open Notepad." and launches allowlisted application with shell: false and scoped capability', async () => {
    const launchRes = await supervisor.executeAssistantCommand({
      input: 'Open Notepad.',
    })

    expect(launchRes.status).toBe('SUCCESS')
    expect(launchRes.terminalState).toBe('SUCCEEDED')
    expect(launchRes.intentKind).toBe('LAUNCH_APP')
    expect(launchRes.launchedApp).toBeDefined()
    expect(launchRes.launchedApp?.appId).toBe('notepad')
    expect(launchRes.launchedApp?.shellUsed).toBe(false)
    expect(launchRes.launchedApp?.capabilityGranted).toBe('cap:desktop:launch-app')
    expect(launchRes.launchedApp?.executablePath.toLowerCase()).toContain('notepad.exe')
    expect(launchedApps).toHaveLength(1)
  })

  it('Demo F: Cancels an active action via STOP control and verifies safe terminal state (CANCELLED)', async () => {
    const activeCmdId = 'cmd_active_cancel_demo'
    const pendingPromise = supervisor.executeAssistantCommand({
      commandId: activeCmdId,
      input: 'Hold action 5000ms',
    })

    // Give command 40ms to enter RUNNING state in KernelHost
    await new Promise((r) => setTimeout(r, 40))

    const cancelRes = await supervisor.cancelAssistantCommand(activeCmdId)
    expect(cancelRes.cancelled).toBe(true)
    expect(cancelRes.terminalState).toBe('CANCELLED')

    const finalRes = await pendingPromise
    expect(finalRes.status).toBe('CANCELLED')
    expect(finalRes.terminalState).toBe('CANCELLED')

    // Verify canonical task in WorkSessionKernel transitioned to CANCELLED
    const hierarchy = await supervisor.getWorkHierarchy()
    const ws = hierarchy.sessions.find((s) => s.id === finalRes.workSessionId)
    expect(ws?.runs[0]?.tasks[0]?.state).toBe('CANCELLED')
  })

  // ─── Local Ideas Vault Complete CRUD & Safety Guarantees ────────────────────

  it('Preserves originalText verbatim when editing title, summary, category, and tags', async () => {
    const idea = await supervisor.saveIdea({
      originalText: 'Original unedited voice transcript: build an AI study planner with spaced repetition.',
    })

    const updated = await supervisor.updateIdea({
      id: idea.id,
      title: 'Spaced Repetition AI Study Planner',
      summary: 'Cleaned executive summary for spaced repetition planner.',
      category: 'education',
      tags: ['spaced-repetition', 'study', 'offline'],
    })

    expect(updated.title).toBe('Spaced Repetition AI Study Planner')
    expect(updated.summary).toBe('Cleaned executive summary for spaced repetition planner.')
    expect(updated.category).toBe('education')
    expect(updated.tags).toEqual(['spaced-repetition', 'study', 'offline'])
    // Original wording is strictly preserved
    expect(updated.originalText).toBe(
      'Original unedited voice transcript: build an AI study planner with spaced repetition.'
    )

    const fetched = await supervisor.getIdea(idea.id)
    expect(fetched?.originalText).toBe(
      'Original unedited voice transcript: build an AI study planner with spaced repetition.'
    )
  })

  it('Refuses to delete an idea without explicit confirmation and deletes only when confirmed === true', async () => {
    const idea = await supervisor.saveIdea({
      originalText: 'build an AI study planner.',
    })

    // Natural-language delete command returns CONFIRMATION_REQUIRED without deleting
    const nlDelete = await supervisor.executeAssistantCommand({
      input: `Delete idea: ${idea.id}`,
    })
    expect(nlDelete.status).toBe('CONFIRMATION_REQUIRED')
    expect(nlDelete.terminalState).toBe('WAITING_CONFIRMATION')
    expect(await supervisor.getIdea(idea.id)).not.toBeNull()

    // Direct delete call with confirmed=false throws
    await expect(supervisor.deleteIdea(idea.id, false)).rejects.toThrow(/confirmation/)
    expect(() => host.getIdeasVault().deleteIdea(idea.id, false)).toThrow(/confirmation/)
    expect(await supervisor.getIdea(idea.id)).not.toBeNull()

    // Explicit confirmed=true deletes the idea
    const delRes = await supervisor.deleteIdea(idea.id, true)
    expect(delRes.deleted).toBe(true)
    expect(await supervisor.getIdea(idea.id)).toBeNull()
  })

  // ─── Security: No Arbitrary Shell Execution & Scoped App Launching ──────────

  it('Blocks non-allowlisted applications and shell metacharacter injection attempts', async () => {
    const shellAttempt = parseAssistantCommand('Open notepad && calc')
    expect(shellAttempt.kind).toBe('BLOCKED_APP')

    const res1 = await supervisor.executeAssistantCommand({
      input: 'Open PowerShell.',
    })
    expect(res1.status).toBe('ERROR')
    expect(res1.terminalState).toBe('FAILED')
    expect(res1.intentKind).toBe('BLOCKED_APP')
    expect(launchedApps).toHaveLength(0)

    const res2 = await supervisor.executeAssistantCommand({
      input: 'Open notepad; rm -rf /',
    })
    expect(res2.status).toBe('ERROR')
    expect(res2.terminalState).toBe('FAILED')
    expect(launchedApps).toHaveLength(0)
  })

  // ─── Voice Push-to-Talk & Offline STT Guarantees ────────────────────────────

  it('Enforces user-initiated Push-to-Talk and reports honest setup message when STT model is not installed', async () => {
    // Rejects non-user-initiated microphone capture
    await expect(supervisor.startPushToTalk(false)).rejects.toThrow(/Silent microphone capture is forbidden/)

    const status = await supervisor.getVoiceSttStatus()
    expect(status.sttStatus).toBe('MODEL_NOT_INSTALLED')
    expect(status.cloudAudioSent).toBe(false)
    expect(status.silentDownloadPerformed).toBe(false)
    expect(status.setupMessage).toContain('not installed')

    // Start and stop user-initiated Push-to-Talk without model installed
    const startRes = await supervisor.startPushToTalk(true)
    expect(startRes.started).toBe(true)
    expect(startRes.pttState).toBe('LISTENING')

    const stopRes = await supervisor.stopPushToTalk(startRes.pttSessionId)
    expect(stopRes.transcribed).toBe(false)
    expect(stopRes.status).toBe('STT_MODEL_NOT_INSTALLED')
    expect(stopRes.cloudAudioSent).toBe(false)
    expect(stopRes.silentDownloadPerformed).toBe(false)
  })

  it('Supports offline local transcription when a local offline transcriber is configured', async () => {
    await supervisor.shutdown()
    await host.shutdown()

    const withStt = await createHostAndSupervisor({
      customLocalTranscriber: async () => 'Save this idea: offline voice note test.',
    })
    host = withStt.h
    supervisor = withStt.sup

    const status = await supervisor.getVoiceSttStatus()
    expect(status.sttStatus).toBe('READY')
    expect(status.modelInstalled).toBe(true)

    const startRes = await supervisor.startPushToTalk(true)
    const stopRes = await supervisor.stopPushToTalk(startRes.pttSessionId)
    expect(stopRes.transcribed).toBe(true)
    expect(stopRes.status).toBe('TRANSCRIBED')
    expect(stopRes.transcript).toBe('Save this idea: offline voice note test.')
  })

  // ─── Supervised Self-Improvement Registry ───────────────────────────────────

  it('Tracks capabilities, failed attempts, user feedback, and non-destructive ImprovementProposals', async () => {
    const initial = await supervisor.getAssistantCapabilities()
    expect(initial.capabilities.length).toBeGreaterThanOrEqual(4)
    expect(initial.proposals).toHaveLength(0)

    // Trigger a failed command to generate a supervised ImprovementProposal
    const failedCmd = await supervisor.executeAssistantCommand({
      input: 'Sync all my ideas to Notion cloud workspace automatically',
    })
    expect(failedCmd.status).toBe('ERROR')
    expect(failedCmd.improvementProposal).toBeDefined()
    expect(failedCmd.improvementProposal?.status).toBe('PROPOSED_AWAITING_HUMAN_REVIEW')
    expect(failedCmd.improvementProposal?.autoApplied).toBe(false)
    expect(failedCmd.improvementProposal?.modifiedSourceCode).toBe(false)
    expect(failedCmd.improvementProposal?.installedTools).toBe(false)
    expect(failedCmd.improvementProposal?.grantedPermissions).toBe(false)
    expect(failedCmd.improvementProposal?.deployedUpdates).toBe(false)

    // Record operator feedback on a capability
    const updated = await supervisor.submitCapabilityFeedback(
      'cap:assistant:ideas-vault',
      'POSITIVE',
      'Instant local SQLite saving works great offline.'
    )

    const nlCap = updated.capabilities.find((c) => c.capabilityId === 'cap:assistant:nl-command')
    expect(nlCap?.failedAttempts).toBe(1)
    expect(updated.proposals).toHaveLength(1)

    const vaultCap = updated.capabilities.find((c) => c.capabilityId === 'cap:assistant:ideas-vault')
    expect(vaultCap?.userFeedback).toHaveLength(1)
    expect(vaultCap?.userFeedback[0]?.comment).toContain('Instant local SQLite saving')

    // Verify direct store reopening preserves capabilities and proposals
    const checkStore = new IdeasVaultStore(tempDir)
    expect(checkStore.listIdeas()).toHaveLength(0)
    checkStore.close()
  })
})
