/**
 * GRAVITAS Wave V1-F-02 — Unified Local Knowledge Hub Test Suite (Slice 1)
 *
 * Covers:
 * 1. Organized collections: IDEA, STUDY_NOTE, PROJECT, PLAN_TASK
 * 2. Create, edit, search, tag, and categorize notes while preserving verbatim originalText
 * 3. Study subjects and topic-based organization
 * 4. Tasks with completion status and optional due dates (including relative expressions like "tomorrow")
 * 5. Bidirectional links between related ideas, study notes, projects, and tasks
 * 6. Seamless schema migration of existing V1-F-01 ideas_vault tables
 * 7. Local Markdown export (Obsidian-compatible YAML frontmatter + [[WikiLinks]]) and Markdown import
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import {
  IdeasVaultStore,
  KnowledgeHubStore,
  resolveDueDateExpression,
} from './assistant/ideasVault.js'

describe('GRAVITAS Wave V1-F-02 — Local Knowledge Hub Persistence & Markdown IO (Slice 1)', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'gravitas-khub-slice1-'))
  })

  afterEach(async () => {
    try {
      await rm(tempDir, { recursive: true, force: true })
    } catch {}
  })

  it('Migrates an existing V1-F-01 ideas_vault SQLite database without losing saved ideas or transcripts', () => {
    const dbPath = join(tempDir, 'ideas-vault.db')
    const legacyDb = new DatabaseSync(dbPath)
    legacyDb.exec(`
      CREATE TABLE ideas_vault (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        original_text TEXT NOT NULL,
        summary TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'general',
        tags_json TEXT NOT NULL DEFAULT '[]',
        persistence_status TEXT NOT NULL
      );
      INSERT INTO ideas_vault (
        id, title, original_text, summary, created_at, updated_at, category, tags_json, persistence_status
      ) VALUES (
        'idea_legacy_001',
        'Legacy Study Planner Idea',
        'build a free AI study planner.',
        'Summary: Build a free AI study planner.',
        '2026-10-12T10:00:00.000Z',
        '2026-10-12T10:00:00.000Z',
        'productivity',
        '["ai","education"]',
        'PERSISTED'
      );
    `)
    legacyDb.close()

    const hub = new KnowledgeHubStore(tempDir)
    const legacyIdea = hub.getIdea('idea_legacy_001')
    expect(legacyIdea).not.toBeNull()
    expect(legacyIdea?.collection).toBe('IDEA')
    expect(legacyIdea?.title).toBe('Legacy Study Planner Idea')
    expect(legacyIdea?.originalText).toBe('build a free AI study planner.')
    expect(legacyIdea?.tags).toEqual(['ai', 'education'])
    expect(legacyIdea?.completed).toBe(false)
    hub.close()
  })

  it('Organizes Ideas, Study Notes (with Subject & Topic), Projects, and Plans/Tasks (with due dates & completion)', () => {
    const hub = new KnowledgeHubStore(tempDir)

    const idea = hub.saveIdea({
      originalText: 'build an interactive spaced-repetition flashcards generator.',
      tags: ['flashcards', 'study'],
    })
    expect(idea.collection).toBe('IDEA')

    const physicsNote = hub.saveStudyNote({
      title: 'Newton Laws & Momentum',
      originalText: 'Second law: net force equals rate of change of momentum (F = dp/dt = ma).',
      subject: 'Physics',
      topic: 'Classical Mechanics',
      tags: ['mechanics', 'exam-prep'],
    })
    expect(physicsNote.collection).toBe('STUDY_NOTE')
    expect(physicsNote.subject).toBe('Physics')
    expect(physicsNote.topic).toBe('Classical Mechanics')

    const project = hub.createProject({
      title: 'Study Planner',
      originalText: 'Create a project called Study Planner for semester exam preparation.',
      subject: 'Physics',
    })
    expect(project.collection).toBe('PROJECT')
    expect(project.title).toBe('Study Planner')

    const refDate = new Date('2026-10-13T09:00:00.000Z')
    const tomorrowIso = resolveDueDateExpression('tomorrow', refDate)
    expect(tomorrowIso).toBe('2026-10-14')

    const task = hub.createTask({
      title: 'Revise chapter 3',
      originalText: 'Remind me to revise chapter 3 tomorrow.',
      dueDate: tomorrowIso,
      subject: 'Physics',
      topic: 'Chapter 3',
      projectId: project.id,
    })
    expect(task.collection).toBe('PLAN_TASK')
    expect(task.completed).toBe(false)
    expect(task.taskStatus).toBe('TODO')
    expect(task.dueDate).toBe('2026-10-14')
    expect(task.projectId).toBe(project.id)
    expect(task.linkedItemIds).toContain(project.id)

    // Verify subject aggregation
    const subjects = hub.listSubjects()
    expect(subjects).toHaveLength(1)
    expect(subjects[0]?.subject).toBe('Physics')
    expect(subjects[0]?.topics).toEqual(expect.arrayContaining(['Classical Mechanics', 'Chapter 3']))
    expect(subjects[0]?.noteCount).toBe(1)
    expect(subjects[0]?.taskCount).toBe(1)

    // Verify unfinished tasks filter
    expect(hub.listUnfinishedTasks()).toHaveLength(1)
    expect(hub.listUnfinishedTasks()[0]?.id).toBe(task.id)

    // Complete task and verify status + completedAt
    const completedTask = hub.setTaskCompletion(task.id, true)
    expect(completedTask.completed).toBe(true)
    expect(completedTask.taskStatus).toBe('DONE')
    expect(completedTask.completedAt).not.toBeNull()
    expect(completedTask.originalText).toBe('Remind me to revise chapter 3 tomorrow.')
    expect(hub.listUnfinishedTasks()).toHaveLength(0)

    hub.close()
  })

  it('Creates and queries bidirectional links between related ideas, study notes, and projects', () => {
    const hub = new KnowledgeHubStore(tempDir)

    const idea = hub.saveIdea({
      title: 'AI Study Planner Idea',
      originalText: 'Save this idea: build an AI study planner.',
    })
    const project = hub.createProject({
      title: 'Study Planner',
      originalText: 'Create a project called Study Planner.',
    })
    const note = hub.saveStudyNote({
      title: 'Physics Chapter 3 Thermodynamics',
      originalText: 'First law of thermodynamics conservation of energy dU = dQ - dW.',
      subject: 'Physics',
      topic: 'Chapter 3',
    })

    hub.linkItems(idea.id, project.id, 'implements')
    hub.linkItems(note.id, project.id, 'study_material')

    const updatedProject = hub.getIdea(project.id)!
    expect(updatedProject.linkedItemIds).toEqual(expect.arrayContaining([idea.id, note.id]))

    const linkedToProject = hub.getLinkedItems(project.id)
    expect(linkedToProject.map((i) => i.id)).toEqual(expect.arrayContaining([idea.id, note.id]))

    // Unlink and verify
    expect(hub.unlinkItems(idea.id, project.id)).toBe(true)
    expect(hub.getIdea(project.id)?.linkedItemIds).toEqual([note.id])

    hub.close()
  })

  it('Exports Knowledge Hub items to Obsidian-compatible Markdown and imports Markdown preserving verbatim transcript', async () => {
    const hub = new KnowledgeHubStore(tempDir)

    const project = hub.createProject({
      title: 'Study Planner',
      originalText: 'Master project for Physics & AI study planning.',
    })
    const note = hub.saveStudyNote({
      title: 'Physics Kinematics Notes',
      originalText: 'Constant acceleration equations: v = u + at, s = ut + 0.5at^2.',
      summary: 'Key equations for uniform acceleration in 1D.',
      subject: 'Physics',
      topic: 'Kinematics',
      tags: ['physics', 'kinematics'],
      linkedItemIds: [project.id],
    })

    const mdText = hub.exportItemToMarkdown(note.id)
    expect(mdText).toContain('collection: "STUDY_NOTE"')
    expect(mdText).toContain('subject: "Physics"')
    expect(mdText).toContain('topic: "Kinematics"')
    expect(mdText).toContain('Constant acceleration equations: v = u + at, s = ut + 0.5at^2.')
    expect(mdText).toContain('[[Study Planner]]')

    const exportDir = join(tempDir, 'exported-md')
    const exportRes = hub.exportAllToMarkdownDirectory(exportDir)
    expect(exportRes.exportedCount).toBe(2)
    expect(exportRes.filePaths.length).toBe(2)

    const diskContent = await readFile(exportRes.filePaths[0]!, 'utf8')
    expect(diskContent).toContain('## Original Transcript / Wording')

    // Import into a fresh KnowledgeHubStore
    const secondDir = await mkdtemp(join(tmpdir(), 'gravitas-khub-import-'))
    try {
      const hub2 = new KnowledgeHubStore(secondDir)
      const imported = hub2.importFromMarkdown(mdText)
      expect(imported.collection).toBe('STUDY_NOTE')
      expect(imported.title).toBe('Physics Kinematics Notes')
      expect(imported.subject).toBe('Physics')
      expect(imported.topic).toBe('Kinematics')
      expect(imported.originalText).toBe('Constant acceleration equations: v = u + at, s = ut + 0.5at^2.')
      expect(imported.summary).toBe('Key equations for uniform acceleration in 1D.')
      expect(imported.tags).toEqual(expect.arrayContaining(['physics', 'kinematics']))
      hub2.close()
    } finally {
      await rm(secondDir, { recursive: true, force: true })
    }

    hub.close()
  })
})

import {
  DesktopSupervisor,
  KernelHost,
  parseAssistantCommand,
  synthesizeOfflineWavSample,
  type ProcessBridge,
  type AllowlistedAppSpec,
} from './index.js'

describe('GRAVITAS Wave V1-F-02 — Voice/Text Intents, Offline STT & Bounded Windows Automation (Slice 2)', () => {
  let tempDir: string
  let host: KernelHost
  let supervisor: DesktopSupervisor
  let spawnedApps: Array<{ spec: AllowlistedAppSpec; executablePath: string; args: readonly string[] }>

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'gravitas-khub-slice2-'))
    spawnedApps = []

    const mainListeners: {
      message?: (msg: unknown) => void
      exit?: (code: number) => void
      error?: (err: Error) => void
    } = {}

    host = new KernelHost({
      dataRoot: tempDir,
      pid: 7201,
      customAppSpawn: async (spec, executablePath, args = []) => {
        spawnedApps.push({ spec, executablePath, args })
        return { pid: 9500 + spawnedApps.length }
      },
      onMessage: (msg) => {
        mainListeners.message?.(msg)
      },
    })

    const bridge: ProcessBridge = {
      pid: 7201,
      postMessage: async (msg: unknown) => {
        await host.handleMessage(msg)
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

    supervisor = new DesktopSupervisor({
      dataRoot: tempDir,
      forkProcess: () => bridge,
    })

    await supervisor.start()
    await host.start()
  })

  afterEach(async () => {
    await supervisor.shutdown()
    await host.shutdown()
    try {
      await rm(tempDir, { recursive: true, force: true })
    } catch {}
  })

  it('Executes required Knowledge Hub voice/text commands end-to-end through Supervisor and KernelHost', async () => {
    // 1. "Save this idea..."
    const ideaRes = await supervisor.executeAssistantCommand({
      input: 'Save this idea: build an AI study planner.',
    })
    expect(ideaRes.status).toBe('SUCCESS')
    expect(ideaRes.intentKind).toBe('SAVE_IDEA')
    expect(ideaRes.savedIdea?.collection).toBe('IDEA')
    expect(ideaRes.savedIdea?.originalText).toBe('build an AI study planner.')

    // 2. "Add these notes to Physics."
    const noteRes1 = await supervisor.executeAssistantCommand({
      input: 'Add these notes to Physics.',
    })
    expect(noteRes1.status).toBe('SUCCESS')
    expect(noteRes1.intentKind).toBe('ADD_STUDY_NOTE')
    expect(noteRes1.savedIdea?.collection).toBe('STUDY_NOTE')
    expect(noteRes1.savedIdea?.subject).toBe('Physics')

    const noteRes2 = await supervisor.executeAssistantCommand({
      input: 'Add these notes to Physics on Chapter 3: Conservation of energy and work-energy theorem.',
    })
    expect(noteRes2.status).toBe('SUCCESS')
    expect(noteRes2.savedIdea?.subject).toBe('Physics')
    expect(noteRes2.savedIdea?.topic).toBe('Chapter 3')
    expect(noteRes2.savedIdea?.originalText).toBe('Conservation of energy and work-energy theorem.')

    // 3. "Create a project called Study Planner."
    const projRes = await supervisor.executeAssistantCommand({
      input: 'Create a project called Study Planner.',
    })
    expect(projRes.status).toBe('SUCCESS')
    expect(projRes.intentKind).toBe('CREATE_PROJECT')
    expect(projRes.savedIdea?.collection).toBe('PROJECT')
    expect(projRes.savedIdea?.title).toBe('Study Planner')
    // Automatically linked to matching idea "build an AI study planner."
    expect(projRes.savedIdea?.linkedItemIds).toContain(ideaRes.savedIdea?.id)

    // 4. "Remind me to revise chapter 3 tomorrow."
    const taskRes = await supervisor.executeAssistantCommand({
      input: 'Remind me to revise chapter 3 tomorrow.',
    })
    expect(taskRes.status).toBe('SUCCESS')
    expect(taskRes.intentKind).toBe('CREATE_TASK')
    expect(taskRes.savedIdea?.collection).toBe('PLAN_TASK')
    expect(taskRes.savedIdea?.title).toBe('Revise chapter 3')
    expect(taskRes.savedIdea?.topic).toBe('Chapter 3')
    expect(taskRes.savedIdea?.completed).toBe(false)
    expect(taskRes.savedIdea?.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(taskRes.savedIdea?.originalText).toBe('Remind me to revise chapter 3 tomorrow.')

    // 5. "Show my unfinished tasks."
    const unfinishedRes = await supervisor.executeAssistantCommand({
      input: 'Show my unfinished tasks.',
    })
    expect(unfinishedRes.status).toBe('SUCCESS')
    expect(unfinishedRes.intentKind).toBe('LIST_UNFINISHED_TASKS')
    expect(unfinishedRes.ideas).toHaveLength(1)
    expect(unfinishedRes.ideas?.[0]?.title).toBe('Revise chapter 3')
    expect(unfinishedRes.message).toContain('Revise chapter 3')

    // 6. Link Physics note to Study Planner project via natural language
    const linkRes = await supervisor.executeAssistantCommand({
      input: 'Link Study Planner to Conservation of energy',
    })
    expect(linkRes.status).toBe('SUCCESS')
    expect(linkRes.intentKind).toBe('LINK_ITEMS')
    expect(linkRes.linkedRecord).toBeDefined()

    // 7. Filter by subject ("Show my Physics notes.")
    const physicsNotesRes = await supervisor.executeAssistantCommand({
      input: 'Show my Physics notes.',
    })
    expect(physicsNotesRes.status).toBe('SUCCESS')
    expect(physicsNotesRes.intentKind).toBe('LIST_COLLECTION')
    expect(physicsNotesRes.ideas).toHaveLength(2)

    // 8. Complete task and verify unfinished tasks becomes empty
    const completeRes = await supervisor.executeAssistantCommand({
      input: 'Complete task: revise chapter 3',
    })
    expect(completeRes.status).toBe('SUCCESS')
    expect(completeRes.savedIdea?.completed).toBe(true)

    const unfinishedAfter = await supervisor.executeAssistantCommand({
      input: 'Show my unfinished tasks.',
    })
    expect(unfinishedAfter.ideas).toHaveLength(0)

    // 9. Export Knowledge Hub to Markdown
    const exportRes = await supervisor.executeAssistantCommand({
      input: 'Export my knowledge hub to Markdown.',
    })
    expect(exportRes.status).toBe('SUCCESS')
    expect(exportRes.intentKind).toBe('EXPORT_MARKDOWN')
    expect(exportRes.markdownExport?.exportedCount).toBe(5)
  })

  it('Enforces explicit operator approval for bounded Windows Notepad file-save automation', async () => {
    const cmd = 'Open Notepad, type Hello from GRAVITAS, and save it to a user-approved location.'
    const parsed = parseAssistantCommand(cmd)
    expect(parsed.kind).toBe('AUTOMATE_NOTEPAD')

    // Without saveApproved=true, returns CONFIRMATION_REQUIRED and does not launch or write file
    const unapprovedRes = await supervisor.executeAssistantCommand({
      input: cmd,
    })
    expect(unapprovedRes.status).toBe('CONFIRMATION_REQUIRED')
    expect(unapprovedRes.terminalState).toBe('WAITING_CONFIRMATION')
    expect(spawnedApps).toHaveLength(0)

    // With explicit operator approval (saveApproved: true), writes file to approved directory and launches Notepad with shell: false
    const approvedRes = await supervisor.executeAssistantCommand({
      input: cmd,
      saveApproved: true,
    })
    expect(approvedRes.status).toBe('SUCCESS')
    expect(approvedRes.terminalState).toBe('SUCCEEDED')
    expect(approvedRes.notepadAutomation?.launched).toBe(true)
    expect(approvedRes.notepadAutomation?.shellUsed).toBe(false)
    expect(approvedRes.notepadAutomation?.savedFilePath).toBeDefined()
    expect(spawnedApps).toHaveLength(1)
    expect(spawnedApps[0]?.spec.appId).toBe('notepad')

    const savedContent = await readFile(approvedRes.notepadAutomation!.savedFilePath!, 'utf8')
    expect(savedContent.trim()).toBe('Hello from GRAVITAS')
  })

  it('Performs real offline Windows System.Speech WAV transcription through Push-to-Talk and executes transcribed command', async () => {
    const wavPath = join(tempDir, 'spoken_sample.wav')
    const wavBuf = synthesizeOfflineWavSample('Show my unfinished tasks', wavPath)
    expect(wavBuf).not.toBeNull()

    await supervisor.executeAssistantCommand({
      input: 'Remind me to revise chapter 3 tomorrow.',
    })

    const startRes = await supervisor.startPushToTalk(true)
    expect(startRes.started).toBe(true)

    const stopRes = await supervisor.stopPushToTalk(
      startRes.pttSessionId,
      wavBuf!.toString('base64')
    )
    expect(stopRes.transcribed).toBe(true)
    expect(stopRes.status).toBe('TRANSCRIBED')
    expect(stopRes.cloudAudioSent).toBe(false)
    expect(stopRes.silentDownloadPerformed).toBe(false)
    expect(stopRes.transcript?.toLowerCase()).toContain('unfinished tasks')

    const cmdRes = await supervisor.executeAssistantCommand({
      input: stopRes.transcript!,
    })
    expect(cmdRes.status).toBe('SUCCESS')
    expect(cmdRes.intentKind).toBe('LIST_UNFINISHED_TASKS')
    expect(cmdRes.ideas).toHaveLength(1)
  })

  it('Registers Knowledge Hub, Markdown Portability, and Bounded Windows Automation in the Supervised Capability Registry without auto-modification', async () => {
    const reg = await supervisor.getAssistantCapabilities()
    const capIds = reg.capabilities.map((c) => c.capabilityId)

    expect(capIds).toEqual(
      expect.arrayContaining([
        'cap:assistant:ideas-vault',
        'cap:assistant:knowledge-hub',
        'cap:assistant:markdown-portability',
        'cap:assistant:nl-command',
        'cap:desktop:launch-app',
        'cap:desktop:bounded-automation',
        'cap:assistant:voice-ptt',
      ])
    )
  })

  it('Supports direct supervisor Knowledge Hub methods for task completion, linking/unlinking, subjects, and Markdown import/export (Slice 3)', async () => {
    const idea = await supervisor.saveIdea({
      title: 'Study Planner Architecture',
      originalText: 'Use local SQLite and Markdown export for study planner.',
      collection: 'IDEA',
    })
    const note = await supervisor.saveIdea({
      title: 'Thermodynamics Notes',
      originalText: 'First law of thermodynamics: conservation of energy.',
      collection: 'STUDY_NOTE',
      subject: 'Physics',
      topic: 'Chapter 4',
    })
    const task = await supervisor.saveIdea({
      title: 'Solve Chapter 4 Problem Set',
      originalText: 'Remind me to solve Chapter 4 problems tomorrow.',
      collection: 'PLAN_TASK',
      subject: 'Physics',
      dueDate: '2026-10-15',
      completed: false,
    })

    const subjects = await supervisor.listStudySubjects()
    expect(subjects.map((s) => s.subject)).toEqual(['Physics'])

    const linkRes = await supervisor.linkKnowledgeItems(idea.id, note.id, 'RELATES_TO')
    expect(linkRes.sourceId).toBe(idea.id)
    expect(linkRes.targetId).toBe(note.id)

    const refreshedIdea = await supervisor.getIdea(idea.id)
    expect(refreshedIdea?.linkedItemIds).toContain(note.id)

    const completedTask = await supervisor.completeTask(task.id, true)
    expect(completedTask.completed).toBe(true)
    expect(completedTask.taskStatus).toBe('DONE')

    const unlinkRes = await supervisor.unlinkKnowledgeItems(idea.id, note.id)
    expect(unlinkRes).toBe(true)

    const mdExport = await supervisor.exportKnowledgeMarkdown()
    expect(mdExport.exportedCount).toBe(3)

    const imported = await supervisor.importKnowledgeMarkdown(
      [
        '---',
        'title: "Imported Optics Summary"',
        'collection: STUDY_NOTE',
        'subject: "Physics"',
        'topic: "Optics"',
        'tags: ["optics", "waves"]',
        '---',
        '',
        '## Original Transcript / Wording',
        '',
        'Snell law of refraction: n1 sin(theta1) = n2 sin(theta2).',
      ].join('\n')
    )
    expect(imported.collection).toBe('STUDY_NOTE')
    expect(imported.subject).toBe('Physics')
    expect(imported.topic).toBe('Optics')
    expect(imported.originalText).toBe('Snell law of refraction: n1 sin(theta1) = n2 sin(theta2).')
  })
})


