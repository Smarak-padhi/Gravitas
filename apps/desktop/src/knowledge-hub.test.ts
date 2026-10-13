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
