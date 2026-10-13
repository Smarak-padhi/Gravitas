/**
 * GRAVITAS V1-F-01 / V1-F-02 — Local Ideas Vault & Unified Knowledge Hub
 *
 * Offline-first, zero-cloud persistent SQLite storage using GRAVITAS persistence patterns:
 * - Single canonical writer owned by KernelHost
 * - WAL mode with BEGIN IMMEDIATE transactions
 * - Parameterized SQL queries
 * - Organized collections: IDEA, STUDY_NOTE, PROJECT, PLAN_TASK
 * - Study subjects and topic-based organization
 * - Tasks with completion status and optional due dates
 * - Bidirectional links between related ideas, study notes, projects, and tasks
 * - Local Markdown import/export (with Obsidian-compatible YAML frontmatter & WikiLinks)
 * - Preserves original user wording/transcript verbatim even when generating/editing summaries
 * - Requires explicit confirmation before deleting any item
 */

import { DatabaseSync } from 'node:sqlite'
import * as path from 'node:path'
import * as fs from 'node:fs'
import { randomUUID } from 'node:crypto'

export type IdeaPersistenceStatus = 'PERSISTED' | 'PENDING_SAVE' | 'ERROR'

export type KnowledgeCollection = 'IDEA' | 'STUDY_NOTE' | 'PROJECT' | 'PLAN_TASK'

export type KnowledgeTaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE'

export interface IdeaRecord {
  readonly id: string
  readonly collection: KnowledgeCollection
  readonly title: string
  readonly originalText: string
  readonly summary: string | null
  readonly createdAt: string
  readonly updatedAt: string
  readonly category: string
  readonly tags: readonly string[]
  readonly persistenceStatus: IdeaPersistenceStatus
  readonly subject: string | null
  readonly topic: string | null
  readonly taskStatus: KnowledgeTaskStatus | null
  readonly completed: boolean
  readonly dueDate: string | null
  readonly completedAt: string | null
  readonly projectId: string | null
  readonly linkedItemIds: readonly string[]
}

export type KnowledgeItemRecord = IdeaRecord

export interface KnowledgeLinkRecord {
  readonly linkId: string
  readonly sourceId: string
  readonly targetId: string
  readonly relationship: string
  readonly createdAt: string
}

export interface StudySubjectSummary {
  readonly subject: string
  readonly topics: readonly string[]
  readonly noteCount: number
  readonly taskCount: number
}

export interface SaveIdeaInput {
  readonly id?: string | undefined
  readonly collection?: KnowledgeCollection | undefined
  readonly title?: string | undefined
  readonly originalText: string
  readonly summary?: string | null | undefined
  readonly category?: string | undefined
  readonly tags?: readonly string[] | undefined
  readonly subject?: string | null | undefined
  readonly topic?: string | null | undefined
  readonly taskStatus?: KnowledgeTaskStatus | null | undefined
  readonly completed?: boolean | undefined
  readonly dueDate?: string | null | undefined
  readonly projectId?: string | null | undefined
  readonly linkedItemIds?: readonly string[] | undefined
}

export interface UpdateIdeaInput {
  readonly id: string
  readonly collection?: KnowledgeCollection | undefined
  readonly title?: string | undefined
  readonly summary?: string | null | undefined
  readonly category?: string | undefined
  readonly tags?: readonly string[] | undefined
  readonly subject?: string | null | undefined
  readonly topic?: string | null | undefined
  readonly taskStatus?: KnowledgeTaskStatus | null | undefined
  readonly completed?: boolean | undefined
  readonly dueDate?: string | null | undefined
  readonly projectId?: string | null | undefined
  readonly linkedItemIds?: readonly string[] | undefined
}

export interface KnowledgeFilterInput {
  readonly collection?: KnowledgeCollection | undefined
  readonly subject?: string | undefined
  readonly topic?: string | undefined
  readonly category?: string | undefined
  readonly tag?: string | undefined
  readonly unfinishedTasksOnly?: boolean | undefined
  readonly projectId?: string | undefined
  readonly query?: string | undefined
}

export interface DeleteIdeaResult {
  readonly deleted: boolean
  readonly id: string
  readonly message: string
}

export interface MarkdownExportResult {
  readonly exportedCount: number
  readonly exportDirectory: string
  readonly filePaths: readonly string[]
}

const IDEAS_VAULT_DDL = `
CREATE TABLE IF NOT EXISTS ideas_vault (
  id TEXT PRIMARY KEY,
  collection TEXT NOT NULL DEFAULT 'IDEA' CHECK (collection IN ('IDEA', 'STUDY_NOTE', 'PROJECT', 'PLAN_TASK')),
  title TEXT NOT NULL,
  original_text TEXT NOT NULL,
  summary TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  tags_json TEXT NOT NULL DEFAULT '[]',
  persistence_status TEXT NOT NULL CHECK (persistence_status IN ('PERSISTED', 'PENDING_SAVE', 'ERROR')),
  subject TEXT,
  topic TEXT,
  task_status TEXT CHECK (task_status IS NULL OR task_status IN ('TODO', 'IN_PROGRESS', 'DONE')),
  completed INTEGER NOT NULL DEFAULT 0,
  due_date TEXT,
  completed_at TEXT,
  project_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_ideas_vault_updated ON ideas_vault(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ideas_vault_category ON ideas_vault(category);

CREATE TABLE IF NOT EXISTS knowledge_links (
  link_id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  relationship TEXT NOT NULL DEFAULT 'related',
  created_at TEXT NOT NULL,
  UNIQUE(source_id, target_id)
);

CREATE INDEX IF NOT EXISTS idx_knowledge_links_source ON knowledge_links(source_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_links_target ON knowledge_links(target_id);

CREATE TABLE IF NOT EXISTS assistant_capabilities (
  capability_id TEXT PRIMARY KEY,
  capability_name TEXT NOT NULL,
  supported_actions_json TEXT NOT NULL DEFAULT '[]',
  required_permissions_json TEXT NOT NULL DEFAULT '[]',
  test_coverage_json TEXT NOT NULL DEFAULT '{}',
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS assistant_feedback (
  feedback_id TEXT PRIMARY KEY,
  capability_id TEXT NOT NULL,
  rating TEXT NOT NULL CHECK (rating IN ('POSITIVE', 'NEGATIVE')),
  comment TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_assistant_feedback_cap ON assistant_feedback(capability_id);

CREATE TABLE IF NOT EXISTS assistant_improvement_proposals (
  proposal_id TEXT PRIMARY KEY,
  capability_id TEXT NOT NULL,
  trigger_command TEXT NOT NULL,
  failure_reason TEXT NOT NULL,
  suggested_improvement TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PROPOSED_AWAITING_HUMAN_REVIEW', 'REVIEWED', 'DISMISSED')),
  auto_applied INTEGER NOT NULL DEFAULT 0 CHECK (auto_applied = 0),
  modified_source_code INTEGER NOT NULL DEFAULT 0 CHECK (modified_source_code = 0),
  installed_tools INTEGER NOT NULL DEFAULT 0 CHECK (installed_tools = 0),
  granted_permissions INTEGER NOT NULL DEFAULT 0 CHECK (granted_permissions = 0),
  deployed_updates INTEGER NOT NULL DEFAULT 0 CHECK (deployed_updates = 0),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_assistant_proposals_cap ON assistant_improvement_proposals(capability_id);
`

/**
 * Resolves natural-language relative date expressions ("today", "tomorrow", "next week", "in N days", or YYYY-MM-DD)
 * into a deterministic ISO date string (YYYY-MM-DD).
 */
export function resolveDueDateExpression(
  rawDue: string | null | undefined,
  referenceDate: Date = new Date()
): string | null {
  if (!rawDue || typeof rawDue !== 'string') return null
  const cleaned = rawDue.trim().toLowerCase().replace(/[.!?]+$/, '').trim()
  if (!cleaned) return null

  const formatIsoDate = (d: Date): string => {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned
  }

  const base = new Date(referenceDate.getTime())
  if (cleaned === 'today' || cleaned === 'tonight') {
    return formatIsoDate(base)
  }
  if (cleaned === 'tomorrow') {
    base.setDate(base.getDate() + 1)
    return formatIsoDate(base)
  }
  if (cleaned === 'next week') {
    base.setDate(base.getDate() + 7)
    return formatIsoDate(base)
  }
  const inDaysMatch = cleaned.match(/^in\s+(\d+)\s+days?$/)
  if (inDaysMatch && inDaysMatch[1]) {
    const days = Math.min(Math.max(Number(inDaysMatch[1]) || 1, 1), 3650)
    base.setDate(base.getDate() + days)
    return formatIsoDate(base)
  }

  return rawDue.trim().slice(0, 64)
}

/**
 * Generates a deterministic title from the user's raw text without calling any external model.
 */
export function deriveIdeaTitle(originalText: string): string {
  const cleaned = originalText
    .replace(/^(?:save\s+(?:this\s+)?idea\s*[:\-]?\s*)/i, '')
    .replace(/^(?:add\s+(?:these\s+)?notes?\s+to\s+[a-z0-9\s_-]+\s*[:\-]?\s*)/i, '')
    .replace(/^(?:remind\s+me\s+to\s+)/i, '')
    .trim()
    .replace(/[.!?]+$/, '')
    .trim()

  if (!cleaned) {
    return 'Untitled Idea'
  }

  const words = cleaned.split(/\s+/)
  const slice = words.slice(0, 8).join(' ')
  const capitalized = slice.charAt(0).toUpperCase() + slice.slice(1)
  return words.length > 8 ? `${capitalized}...` : capitalized
}

/**
 * Generates a deterministic cleaned-up summary while keeping the original text untouched.
 */
export function deriveIdeaSummary(originalText: string): string {
  const body = originalText
    .replace(/^(?:save\s+(?:this\s+)?idea\s*[:\-]?\s*)/i, '')
    .trim()

  if (!body) {
    return 'Captured offline idea.'
  }

  const normalized = body.charAt(0).toUpperCase() + body.slice(1)
  return normalized.endsWith('.') ? `Summary: ${normalized}` : `Summary: ${normalized}.`
}

/**
 * Extracts deterministic tags and category from item text offline.
 */
export function deriveIdeaTagsAndCategory(
  originalText: string,
  collection: KnowledgeCollection = 'IDEA',
  subject?: string | null
): { category: string; tags: string[] } {
  const lower = originalText.toLowerCase()
  const tags = new Set<string>()

  const keywordMap: ReadonlyArray<readonly [RegExp, string]> = [
    [/\b(?:ai|llm|model|agent|assistant|ml)\b/, 'ai'],
    [/\b(?:study|learn|course|exam|school|education|revise|chapter|lecture)\b/, 'education'],
    [/\b(?:plan|planner|schedule|calendar|todo|task|remind|deadline)\b/, 'planning'],
    [/\b(?:free|open-source|offline|local)\b/, 'free-local'],
    [/\b(?:app|desktop|web|mobile|ui|tool)\b/, 'product'],
    [/\b(?:code|dev|git|repo|typescript|rust|python)\b/, 'engineering'],
    [/\b(?:physics|quantum|mechanics|thermodynamics|kinematics|optics)\b/, 'physics'],
    [/\b(?:math|calculus|algebra|geometry|statistics)\b/, 'mathematics'],
    [/\b(?:chemistry|biology|science)\b/, 'science'],
  ]

  for (const [rx, tag] of keywordMap) {
    if (rx.test(lower)) {
      tags.add(tag)
    }
  }

  if (subject && subject.trim()) {
    tags.add(subject.trim().toLowerCase().replace(/\s+/g, '-'))
  }

  if (collection === 'STUDY_NOTE') {
    tags.add('study-note')
  } else if (collection === 'PROJECT') {
    tags.add('project')
  } else if (collection === 'PLAN_TASK') {
    tags.add('task')
  } else if (tags.size === 0) {
    tags.add('idea')
  }

  let category = 'general'
  if (collection === 'STUDY_NOTE') {
    category = 'study'
  } else if (collection === 'PROJECT') {
    category = 'project'
  } else if (collection === 'PLAN_TASK') {
    category = 'planning'
  } else if (tags.has('education') || tags.has('planning')) {
    category = 'productivity'
  } else if (tags.has('ai') || tags.has('engineering')) {
    category = 'technology'
  } else if (tags.has('product')) {
    category = 'product'
  }

  return {
    category,
    tags: Array.from(tags),
  }
}

export class IdeasVaultStore {
  private readonly db: DatabaseSync
  private readonly dbPath: string
  private readonly dataRoot: string
  private closed = false

  public constructor(dataRoot: string) {
    this.dataRoot = path.resolve(dataRoot)
    if (!fs.existsSync(this.dataRoot)) {
      fs.mkdirSync(this.dataRoot, { recursive: true })
    }
    this.dbPath = path.join(this.dataRoot, 'ideas-vault.db')
    this.db = new DatabaseSync(this.dbPath)
    this.configurePragmas()
    this.initializeSchema()
  }

  public getDatabase(): DatabaseSync {
    return this.db
  }

  public getDatabasePath(): string {
    return this.dbPath
  }

  private configurePragmas(): void {
    this.db.exec('PRAGMA journal_mode = WAL;')
    this.db.exec('PRAGMA synchronous = NORMAL;')
    this.db.exec('PRAGMA foreign_keys = ON;')
    this.db.exec('PRAGMA busy_timeout = 5000;')
  }

  private initializeSchema(): void {
    this.db.exec('BEGIN IMMEDIATE TRANSACTION;')
    try {
      this.db.exec(IDEAS_VAULT_DDL)
      this.migrateExistingColumnsIfNeeded()
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_ideas_vault_collection ON ideas_vault(collection);')
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_ideas_vault_subject ON ideas_vault(subject);')
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_ideas_vault_completed ON ideas_vault(completed);')
      this.db.exec('COMMIT;')
    } catch (err) {
      this.db.exec('ROLLBACK;')
      throw err
    }
  }

  private migrateExistingColumnsIfNeeded(): void {
    const columns = this.db.prepare('PRAGMA table_info(ideas_vault);').all() as Array<{ name?: string }>
    const existingNames = new Set(columns.map((c) => String(c.name)))

    const migrations: ReadonlyArray<readonly [string, string]> = [
      ['collection', "ALTER TABLE ideas_vault ADD COLUMN collection TEXT NOT NULL DEFAULT 'IDEA';"],
      ['subject', 'ALTER TABLE ideas_vault ADD COLUMN subject TEXT;'],
      ['topic', 'ALTER TABLE ideas_vault ADD COLUMN topic TEXT;'],
      ['task_status', 'ALTER TABLE ideas_vault ADD COLUMN task_status TEXT;'],
      ['completed', 'ALTER TABLE ideas_vault ADD COLUMN completed INTEGER NOT NULL DEFAULT 0;'],
      ['due_date', 'ALTER TABLE ideas_vault ADD COLUMN due_date TEXT;'],
      ['completed_at', 'ALTER TABLE ideas_vault ADD COLUMN completed_at TEXT;'],
      ['project_id', 'ALTER TABLE ideas_vault ADD COLUMN project_id TEXT;'],
    ]

    for (const [colName, sql] of migrations) {
      if (!existingNames.has(colName)) {
        this.db.exec(sql)
      }
    }
  }

  private assertOpen(): void {
    if (this.closed) {
      throw new Error('IdeasVaultStore is closed')
    }
  }

  public saveIdea(input: SaveIdeaInput): IdeaRecord {
    this.assertOpen()
    if (!input || typeof input.originalText !== 'string' || input.originalText.trim().length === 0) {
      throw new Error('Idea originalText must be a non-empty string')
    }
    if (input.originalText.length > 32768) {
      throw new Error('Idea originalText exceeds maximum length (32768 characters)')
    }

    const collection: KnowledgeCollection = input.collection ?? 'IDEA'
    const originalText = input.originalText.trim()
    const prefixMap: Readonly<Record<KnowledgeCollection, string>> = {
      IDEA: 'idea',
      STUDY_NOTE: 'note',
      PROJECT: 'proj',
      PLAN_TASK: 'task',
    }
    const id =
      input.id && input.id.trim().length > 0
        ? input.id.trim()
        : `${prefixMap[collection]}_${randomUUID()}`

    const now = new Date().toISOString()
    const subject =
      input.subject !== undefined && input.subject !== null && input.subject.trim().length > 0
        ? input.subject.trim().slice(0, 128)
        : null
    const topic =
      input.topic !== undefined && input.topic !== null && input.topic.trim().length > 0
        ? input.topic.trim().slice(0, 128)
        : null

    const derivedMeta = deriveIdeaTagsAndCategory(originalText, collection, subject)

    const title =
      input.title && input.title.trim().length > 0
        ? input.title.trim().slice(0, 256)
        : deriveIdeaTitle(originalText)

    const summary =
      input.summary !== undefined
        ? input.summary === null
          ? null
          : input.summary.trim().slice(0, 8192)
        : deriveIdeaSummary(originalText)

    const category =
      input.category && input.category.trim().length > 0
        ? input.category.trim().slice(0, 64)
        : derivedMeta.category

    const tags =
      input.tags && input.tags.length > 0
        ? Array.from(new Set(input.tags.map((t) => t.trim().toLowerCase()).filter(Boolean))).slice(0, 24)
        : derivedMeta.tags

    const completed = Boolean(input.completed)
    const taskStatus: KnowledgeTaskStatus | null =
      collection === 'PLAN_TASK'
        ? input.taskStatus ?? (completed ? 'DONE' : 'TODO')
        : input.taskStatus ?? null
    const dueDate = resolveDueDateExpression(input.dueDate)
    const completedAt = completed ? now : null
    const projectId =
      input.projectId !== undefined && input.projectId !== null && input.projectId.trim().length > 0
        ? input.projectId.trim()
        : null

    this.db.exec('BEGIN IMMEDIATE TRANSACTION;')
    try {
      const stmt = this.db.prepare(`
        INSERT INTO ideas_vault (
          id, collection, title, original_text, summary, created_at, updated_at,
          category, tags_json, persistence_status, subject, topic, task_status,
          completed, due_date, completed_at, project_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `)
      stmt.run(
        id,
        collection,
        title,
        originalText,
        summary,
        now,
        now,
        category,
        JSON.stringify(tags),
        'PERSISTED',
        subject,
        topic,
        taskStatus,
        completed ? 1 : 0,
        dueDate,
        completedAt,
        projectId
      )

      if (input.linkedItemIds && input.linkedItemIds.length > 0) {
        for (const targetId of input.linkedItemIds) {
          if (targetId && targetId.trim() && targetId.trim() !== id) {
            this.insertLinkRowInternal(id, targetId.trim(), 'related', now)
          }
        }
      }

      if (projectId && projectId !== id) {
        this.insertLinkRowInternal(id, projectId, 'belongs_to_project', now)
      }

      this.db.exec('COMMIT;')
    } catch (err) {
      this.db.exec('ROLLBACK;')
      throw err
    }

    return this.getIdea(id)!
  }

  public saveStudyNote(input: {
    readonly id?: string | undefined
    readonly title?: string | undefined
    readonly originalText: string
    readonly summary?: string | null | undefined
    readonly subject: string
    readonly topic?: string | null | undefined
    readonly category?: string | undefined
    readonly tags?: readonly string[] | undefined
    readonly projectId?: string | null | undefined
    readonly linkedItemIds?: readonly string[] | undefined
  }): IdeaRecord {
    const cleanSubject = (input.subject || 'General Studies').trim()
    return this.saveIdea({
      ...input,
      collection: 'STUDY_NOTE',
      subject: cleanSubject,
      category: input.category ?? 'study',
    })
  }

  public createProject(input: {
    readonly id?: string | undefined
    readonly title: string
    readonly originalText?: string | undefined
    readonly summary?: string | null | undefined
    readonly category?: string | undefined
    readonly tags?: readonly string[] | undefined
    readonly subject?: string | null | undefined
    readonly linkedItemIds?: readonly string[] | undefined
  }): IdeaRecord {
    const cleanTitle = input.title.trim()
    if (!cleanTitle) {
      throw new Error('Project title must be a non-empty string')
    }
    const originalText =
      input.originalText && input.originalText.trim().length > 0
        ? input.originalText.trim()
        : `Project: ${cleanTitle}`

    return this.saveIdea({
      ...input,
      collection: 'PROJECT',
      title: cleanTitle,
      originalText,
      category: input.category ?? 'project',
    })
  }

  public createTask(input: {
    readonly id?: string | undefined
    readonly title?: string | undefined
    readonly originalText: string
    readonly summary?: string | null | undefined
    readonly dueDate?: string | null | undefined
    readonly completed?: boolean | undefined
    readonly taskStatus?: KnowledgeTaskStatus | undefined
    readonly subject?: string | null | undefined
    readonly topic?: string | null | undefined
    readonly projectId?: string | null | undefined
    readonly category?: string | undefined
    readonly tags?: readonly string[] | undefined
    readonly linkedItemIds?: readonly string[] | undefined
  }): IdeaRecord {
    return this.saveIdea({
      ...input,
      collection: 'PLAN_TASK',
      category: input.category ?? 'planning',
      completed: Boolean(input.completed),
      taskStatus: input.taskStatus ?? (input.completed ? 'DONE' : 'TODO'),
    })
  }

  public setTaskCompletion(id: string, completed: boolean): IdeaRecord {
    this.assertOpen()
    const existing = this.getIdea(id)
    if (!existing) {
      throw new Error(`Item not found: ${id}`)
    }
    return this.updateIdea({
      id: existing.id,
      completed,
      taskStatus: completed ? 'DONE' : 'TODO',
    })
  }

  public getIdea(id: string): IdeaRecord | null {
    this.assertOpen()
    if (!id || typeof id !== 'string') return null
    const row = this.db
      .prepare('SELECT * FROM ideas_vault WHERE id = ?;')
      .get(id.trim()) as Record<string, unknown> | undefined
    if (!row) return null
    return this.mapRowToIdea(row)
  }

  public listIdeas(): readonly IdeaRecord[] {
    this.assertOpen()
    const rows = this.db
      .prepare('SELECT * FROM ideas_vault ORDER BY updated_at DESC, created_at DESC;')
      .all() as Record<string, unknown>[]
    return rows.map((r) => this.mapRowToIdea(r))
  }

  public listItems(filter?: KnowledgeFilterInput): readonly IdeaRecord[] {
    this.assertOpen()
    let items = this.listIdeas()
    if (!filter) return items

    if (filter.collection) {
      items = items.filter((item) => item.collection === filter.collection)
    }
    if (filter.subject && filter.subject.trim()) {
      const subLower = filter.subject.trim().toLowerCase()
      items = items.filter(
        (item) =>
          (item.subject && item.subject.toLowerCase() === subLower) ||
          item.tags.includes(subLower)
      )
    }
    if (filter.topic && filter.topic.trim()) {
      const topLower = filter.topic.trim().toLowerCase()
      items = items.filter(
        (item) =>
          (item.topic && item.topic.toLowerCase().includes(topLower)) ||
          item.title.toLowerCase().includes(topLower) ||
          item.originalText.toLowerCase().includes(topLower)
      )
    }
    if (filter.category && filter.category.trim()) {
      const catLower = filter.category.trim().toLowerCase()
      items = items.filter((item) => item.category.toLowerCase() === catLower)
    }
    if (filter.tag && filter.tag.trim()) {
      const tagLower = filter.tag.trim().toLowerCase().replace(/^#/, '')
      items = items.filter((item) => item.tags.includes(tagLower))
    }
    if (filter.unfinishedTasksOnly) {
      items = items.filter(
        (item) => item.collection === 'PLAN_TASK' && !item.completed && item.taskStatus !== 'DONE'
      )
    }
    if (filter.projectId && filter.projectId.trim()) {
      const pid = filter.projectId.trim()
      items = items.filter(
        (item) => item.projectId === pid || item.linkedItemIds.includes(pid)
      )
    }
    if (filter.query && filter.query.trim()) {
      const matchedIds = new Set(this.searchIdeas(filter.query).map((i) => i.id))
      items = items.filter((item) => matchedIds.has(item.id))
    }

    return items
  }

  public listUnfinishedTasks(): readonly IdeaRecord[] {
    return this.listItems({ unfinishedTasksOnly: true })
  }

  public listSubjects(): readonly StudySubjectSummary[] {
    this.assertOpen()
    const items = this.listIdeas()
    const map = new Map<string, { display: string; topics: Set<string>; noteCount: number; taskCount: number }>()

    for (const item of items) {
      if (!item.subject) continue
      const key = item.subject.toLowerCase()
      let entry = map.get(key)
      if (!entry) {
        entry = { display: item.subject, topics: new Set<string>(), noteCount: 0, taskCount: 0 }
        map.set(key, entry)
      }
      if (item.topic) {
        entry.topics.add(item.topic)
      }
      if (item.collection === 'STUDY_NOTE') {
        entry.noteCount++
      } else if (item.collection === 'PLAN_TASK') {
        entry.taskCount++
      }
    }

    return Array.from(map.values()).map((e) => ({
      subject: e.display,
      topics: Array.from(e.topics),
      noteCount: e.noteCount,
      taskCount: e.taskCount,
    }))
  }

  public searchIdeas(query: string): readonly IdeaRecord[] {
    this.assertOpen()
    const trimmed = (query || '').trim().toLowerCase()
    if (!trimmed) {
      return this.listIdeas()
    }

    const all = this.listIdeas()
    const stopWords = new Set([
      'my',
      'the',
      'a',
      'an',
      'for',
      'idea',
      'ideas',
      'note',
      'notes',
      'project',
      'projects',
      'task',
      'tasks',
      'plan',
      'plans',
      'find',
      'search',
      'show',
      'in',
      'about',
      'on',
    ])
    const tokens = trimmed
      .replace(/[^\w\s-]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 0 && !stopWords.has(t))

    return all.filter((idea) => {
      const haystack = [
        idea.title,
        idea.originalText,
        idea.summary ?? '',
        idea.category,
        idea.subject ?? '',
        idea.topic ?? '',
        idea.collection,
        ...idea.tags,
      ]
        .join(' ')
        .toLowerCase()

      if (haystack.includes(trimmed)) {
        return true
      }
      if (tokens.length === 0) {
        return true
      }
      return tokens.every((tok) => haystack.includes(tok))
    })
  }

  /**
   * Finds an item by exact ID or by best-matching title/search query.
   */
  public findItemByTitleOrId(queryOrId: string): IdeaRecord | null {
    this.assertOpen()
    const trimmed = (queryOrId || '').trim()
    if (!trimmed) return null

    const byId = this.getIdea(trimmed)
    if (byId) return byId

    const lower = trimmed.toLowerCase()
    const all = this.listIdeas()
    const exactTitle = all.find((item) => item.title.toLowerCase() === lower)
    if (exactTitle) return exactTitle

    const partialTitle = all.find(
      (item) =>
        item.title.toLowerCase().includes(lower) ||
        item.originalText.toLowerCase().includes(lower)
    )
    if (partialTitle) return partialTitle

    const searched = this.searchIdeas(trimmed)
    return searched[0] ?? null
  }

  /**
   * Creates a persistent link between two Knowledge Hub items.
   */
  public linkItems(
    sourceId: string,
    targetId: string,
    relationship: string = 'related'
  ): KnowledgeLinkRecord {
    this.assertOpen()
    const src = this.getIdea(sourceId)
    const tgt = this.getIdea(targetId)
    if (!src) {
      throw new Error(`Source item not found: ${sourceId}`)
    }
    if (!tgt) {
      throw new Error(`Target item not found: ${targetId}`)
    }
    if (src.id === tgt.id) {
      throw new Error('Cannot link an item to itself')
    }

    const now = new Date().toISOString()
    let linkRecord: KnowledgeLinkRecord
    this.db.exec('BEGIN IMMEDIATE TRANSACTION;')
    try {
      linkRecord = this.insertLinkRowInternal(src.id, tgt.id, relationship, now)
      this.db.exec('COMMIT;')
    } catch (err) {
      this.db.exec('ROLLBACK;')
      throw err
    }
    return linkRecord
  }

  public unlinkItems(sourceId: string, targetId: string): boolean {
    this.assertOpen()
    const s = (sourceId || '').trim()
    const t = (targetId || '').trim()
    if (!s || !t) return false

    this.db.exec('BEGIN IMMEDIATE TRANSACTION;')
    try {
      const res = this.db
        .prepare(
          'DELETE FROM knowledge_links WHERE (source_id = ? AND target_id = ?) OR (source_id = ? AND target_id = ?);'
        )
        .run(s, t, t, s)
      this.db.exec('COMMIT;')
      return Number(res.changes ?? 0) > 0
    } catch (err) {
      this.db.exec('ROLLBACK;')
      throw err
    }
  }

  public getLinkedItems(itemId: string): readonly IdeaRecord[] {
    this.assertOpen()
    const existing = this.getIdea(itemId)
    if (!existing) return []
    const items: IdeaRecord[] = []
    for (const linkedId of existing.linkedItemIds) {
      const found = this.getIdea(linkedId)
      if (found) items.push(found)
    }
    return items
  }

  public listLinksForItem(itemId: string): readonly KnowledgeLinkRecord[] {
    this.assertOpen()
    const cleanId = (itemId || '').trim()
    if (!cleanId) return []
    const rows = this.db
      .prepare(
        'SELECT * FROM knowledge_links WHERE source_id = ? OR target_id = ? ORDER BY created_at DESC;'
      )
      .all(cleanId, cleanId) as Record<string, unknown>[]
    return rows.map((r) => ({
      linkId: String(r['link_id']),
      sourceId: String(r['source_id']),
      targetId: String(r['target_id']),
      relationship: String(r['relationship'] ?? 'related'),
      createdAt: String(r['created_at']),
    }))
  }

  private insertLinkRowInternal(
    sourceId: string,
    targetId: string,
    relationship: string,
    now: string
  ): KnowledgeLinkRecord {
    const existing = this.db
      .prepare(
        'SELECT * FROM knowledge_links WHERE (source_id = ? AND target_id = ?) OR (source_id = ? AND target_id = ?);'
      )
      .get(sourceId, targetId, targetId, sourceId) as Record<string, unknown> | undefined

    if (existing) {
      return {
        linkId: String(existing['link_id']),
        sourceId: String(existing['source_id']),
        targetId: String(existing['target_id']),
        relationship: String(existing['relationship']),
        createdAt: String(existing['created_at']),
      }
    }

    const linkId = `link_${randomUUID()}`
    const rel = (relationship || 'related').trim().slice(0, 64)
    this.db
      .prepare(`
        INSERT INTO knowledge_links (link_id, source_id, target_id, relationship, created_at)
        VALUES (?, ?, ?, ?, ?);
      `)
      .run(linkId, sourceId, targetId, rel, now)

    return {
      linkId,
      sourceId,
      targetId,
      relationship: rel,
      createdAt: now,
    }
  }

  /**
   * Updates an item's fields (title, summary, category, tags, subject, topic, taskStatus, completed, dueDate, links)
   * while strictly preserving originalText verbatim.
   */
  public updateIdea(input: UpdateIdeaInput): IdeaRecord {
    this.assertOpen()
    if (!input || typeof input.id !== 'string' || input.id.trim().length === 0) {
      throw new Error('Idea id is required for update')
    }

    const existing = this.getIdea(input.id)
    if (!existing) {
      throw new Error(`Idea not found: ${input.id}`)
    }

    const updatedCollection: KnowledgeCollection = input.collection ?? existing.collection

    const updatedTitle =
      input.title !== undefined && input.title.trim().length > 0
        ? input.title.trim().slice(0, 256)
        : existing.title

    const updatedSummary =
      input.summary !== undefined
        ? input.summary === null
          ? null
          : input.summary.trim().slice(0, 8192)
        : existing.summary

    const updatedCategory =
      input.category !== undefined && input.category.trim().length > 0
        ? input.category.trim().slice(0, 64)
        : existing.category

    const updatedTags =
      input.tags !== undefined
        ? Array.from(new Set(input.tags.map((t) => t.trim().toLowerCase()).filter(Boolean))).slice(0, 24)
        : existing.tags

    const updatedSubject =
      input.subject !== undefined
        ? input.subject === null || input.subject.trim().length === 0
          ? null
          : input.subject.trim().slice(0, 128)
        : existing.subject

    const updatedTopic =
      input.topic !== undefined
        ? input.topic === null || input.topic.trim().length === 0
          ? null
          : input.topic.trim().slice(0, 128)
        : existing.topic

    const updatedCompleted =
      input.completed !== undefined ? Boolean(input.completed) : existing.completed

    const updatedTaskStatus: KnowledgeTaskStatus | null =
      input.taskStatus !== undefined
        ? input.taskStatus
        : input.completed !== undefined
          ? updatedCompleted
            ? 'DONE'
            : 'TODO'
          : existing.taskStatus

    const updatedDueDate =
      input.dueDate !== undefined
        ? input.dueDate === null || input.dueDate.trim().length === 0
          ? null
          : resolveDueDateExpression(input.dueDate)
        : existing.dueDate

    const updatedProjectId =
      input.projectId !== undefined
        ? input.projectId === null || input.projectId.trim().length === 0
          ? null
          : input.projectId.trim()
        : existing.projectId

    const updatedAt = new Date().toISOString()
    const updatedCompletedAt = updatedCompleted
      ? existing.completedAt ?? updatedAt
      : null

    this.db.exec('BEGIN IMMEDIATE TRANSACTION;')
    try {
      const stmt = this.db.prepare(`
        UPDATE ideas_vault
        SET collection = ?, title = ?, summary = ?, category = ?, tags_json = ?,
            subject = ?, topic = ?, task_status = ?, completed = ?, due_date = ?,
            completed_at = ?, project_id = ?, updated_at = ?
        WHERE id = ?;
      `)
      stmt.run(
        updatedCollection,
        updatedTitle,
        updatedSummary,
        updatedCategory,
        JSON.stringify(updatedTags),
        updatedSubject,
        updatedTopic,
        updatedTaskStatus,
        updatedCompleted ? 1 : 0,
        updatedDueDate,
        updatedCompletedAt,
        updatedProjectId,
        updatedAt,
        existing.id
      )

      if (input.linkedItemIds !== undefined) {
        this.db
          .prepare('DELETE FROM knowledge_links WHERE source_id = ? OR target_id = ?;')
          .run(existing.id, existing.id)
        for (const targetId of input.linkedItemIds) {
          if (targetId && targetId.trim() && targetId.trim() !== existing.id) {
            this.insertLinkRowInternal(existing.id, targetId.trim(), 'related', updatedAt)
          }
        }
      }

      this.db.exec('COMMIT;')
    } catch (err) {
      this.db.exec('ROLLBACK;')
      throw err
    }

    return this.getIdea(existing.id)!
  }

  /**
   * Deletes an item ONLY when explicit user confirmation is provided (confirmed === true).
   */
  public deleteIdea(id: string, confirmed: boolean): DeleteIdeaResult {
    this.assertOpen()
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw new Error('Idea id is required')
    }
    if (confirmed !== true) {
      throw new Error('Deletion requires explicit user confirmation (confirmed === true)')
    }

    const existing = this.getIdea(id)
    if (!existing) {
      return {
        deleted: false,
        id: id.trim(),
        message: `Idea ${id.trim()} not found.`,
      }
    }

    this.db.exec('BEGIN IMMEDIATE TRANSACTION;')
    try {
      this.db
        .prepare('DELETE FROM knowledge_links WHERE source_id = ? OR target_id = ?;')
        .run(existing.id, existing.id)
      this.db.prepare('DELETE FROM ideas_vault WHERE id = ?;').run(existing.id)
      this.db.exec('COMMIT;')
    } catch (err) {
      this.db.exec('ROLLBACK;')
      throw err
    }

    return {
      deleted: true,
      id: existing.id,
      message: `Idea "${existing.title}" deleted after confirmation.`,
    }
  }

  // ─── Markdown Portability (Export & Import) ────────────────────────────────

  /**
   * Formats a single Knowledge Hub item as a clean, Obsidian-compatible Markdown document
   * with YAML frontmatter, verbatim original transcript preservation, and [[WikiLinks]].
   */
  public exportItemToMarkdown(id: string): string {
    this.assertOpen()
    const item = this.getIdea(id)
    if (!item) {
      throw new Error(`Item not found: ${id}`)
    }

    const linkedItems = this.getLinkedItems(item.id)
    const lines: string[] = [
      '---',
      `id: "${item.id}"`,
      `collection: "${item.collection}"`,
      `title: ${JSON.stringify(item.title)}`,
      `category: ${JSON.stringify(item.category)}`,
      `tags: ${JSON.stringify(item.tags)}`,
      `created_at: "${item.createdAt}"`,
      `updated_at: "${item.updatedAt}"`,
    ]

    if (item.subject) lines.push(`subject: ${JSON.stringify(item.subject)}`)
    if (item.topic) lines.push(`topic: ${JSON.stringify(item.topic)}`)
    if (item.taskStatus) lines.push(`task_status: "${item.taskStatus}"`)
    if (item.collection === 'PLAN_TASK') lines.push(`completed: ${item.completed ? 'true' : 'false'}`)
    if (item.dueDate) lines.push(`due_date: "${item.dueDate}"`)
    if (item.projectId) lines.push(`project_id: "${item.projectId}"`)
    if (item.linkedItemIds.length > 0) {
      lines.push(`linked_ids: ${JSON.stringify(item.linkedItemIds)}`)
    }
    lines.push('---', '')
    lines.push(`# ${item.title}`, '')

    if (item.collection === 'PLAN_TASK') {
      const checkbox = item.completed ? '[x]' : '[ ]'
      const dueSuffix = item.dueDate ? ` (Due: ${item.dueDate})` : ''
      lines.push(`- ${checkbox} **Task Status:** ${item.taskStatus ?? 'TODO'}${dueSuffix}`, '')
    }

    if (item.subject || item.topic) {
      lines.push(
        `**Subject:** ${item.subject ?? 'General'}${item.topic ? ` | **Topic:** ${item.topic}` : ''}`,
        ''
      )
    }

    lines.push('## Original Transcript / Wording', '')
    lines.push(item.originalText, '')

    if (item.summary) {
      lines.push('## Summary & Notes', '')
      lines.push(item.summary, '')
    }

    if (linkedItems.length > 0) {
      lines.push('## Linked Knowledge Items', '')
      for (const linked of linkedItems) {
        lines.push(`- [[${linked.title}]] (\`${linked.id}\` · ${linked.collection})`)
      }
      lines.push('')
    }

    return lines.join('\n')
  }

  /**
   * Exports all items in the Knowledge Hub to an organized local Markdown directory tree
   * (`ideas/`, `study-notes/`, `projects/`, `tasks/`).
   */
  public exportAllToMarkdownDirectory(targetDirectory?: string): MarkdownExportResult {
    this.assertOpen()
    const exportDir = targetDirectory
      ? path.resolve(targetDirectory)
      : path.join(this.dataRoot, 'knowledge-hub-markdown')

    const folderMap: Readonly<Record<KnowledgeCollection, string>> = {
      IDEA: 'ideas',
      STUDY_NOTE: 'study-notes',
      PROJECT: 'projects',
      PLAN_TASK: 'tasks',
    }

    const items = this.listIdeas()
    const filePaths: string[] = []

    for (const folder of Object.values(folderMap)) {
      fs.mkdirSync(path.join(exportDir, folder), { recursive: true })
    }

    for (const item of items) {
      const folder = folderMap[item.collection] ?? 'ideas'
      const safeSlug = item.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48) || 'item'
      const fileName = `${safeSlug}-${item.id.slice(-8)}.md`
      const fullPath = path.join(exportDir, folder, fileName)
      const md = this.exportItemToMarkdown(item.id)
      fs.writeFileSync(fullPath, md, 'utf8')
      filePaths.push(fullPath)
    }

    return {
      exportedCount: filePaths.length,
      exportDirectory: exportDir,
      filePaths,
    }
  }

  /**
   * Imports a Markdown note (with or without YAML frontmatter) into the local Knowledge Hub,
   * preserving its original transcript/content and metadata.
   */
  public importFromMarkdown(markdownContent: string): IdeaRecord {
    this.assertOpen()
    if (!markdownContent || typeof markdownContent !== 'string' || !markdownContent.trim()) {
      throw new Error('Markdown content must be a non-empty string')
    }

    const normalized = markdownContent.replace(/\r\n/g, '\n').trim()
    let frontmatterBlock = ''
    let bodyBlock = normalized

    if (normalized.startsWith('---\n')) {
      const endIdx = normalized.indexOf('\n---\n', 4)
      if (endIdx !== -1) {
        frontmatterBlock = normalized.slice(4, endIdx)
        bodyBlock = normalized.slice(endIdx + 5).trim()
      }
    }

    const meta: Record<string, string> = {}
    for (const line of frontmatterBlock.split('\n')) {
      const sep = line.indexOf(':')
      if (sep !== -1) {
        const key = line.slice(0, sep).trim()
        const val = line.slice(sep + 1).trim()
        meta[key] = val
      }
    }

    const unquote = (v?: string): string | undefined => {
      if (!v) return undefined
      try {
        const parsed = JSON.parse(v)
        if (typeof parsed === 'string') return parsed
      } catch {}
      return v.replace(/^["']|["']$/g, '').trim()
    }

    const parseStringArray = (v?: string): string[] | undefined => {
      if (!v) return undefined
      try {
        const parsed = JSON.parse(v)
        if (Array.isArray(parsed)) return parsed.map((x) => String(x))
      } catch {}
      return v
        .replace(/^\[|\]$/g, '')
        .split(',')
        .map((s) => s.replace(/^["']|["']$/g, '').trim())
        .filter(Boolean)
    }

    const validCollections: readonly KnowledgeCollection[] = ['IDEA', 'STUDY_NOTE', 'PROJECT', 'PLAN_TASK']
    const rawCollection = unquote(meta['collection']) as KnowledgeCollection | undefined
    const collection: KnowledgeCollection =
      rawCollection && validCollections.includes(rawCollection) ? rawCollection : 'STUDY_NOTE'

    // Extract original transcript section if exported by GRAVITAS, otherwise use the markdown body
    let originalText = bodyBlock
    let summary: string | null | undefined = undefined

    const origMarker = '## Original Transcript / Wording\n'
    const sumMarker = '## Summary & Notes\n'
    const linkMarker = '## Linked Knowledge Items\n'

    const origIdx = bodyBlock.indexOf(origMarker)
    if (origIdx !== -1) {
      const afterOrig = bodyBlock.slice(origIdx + origMarker.length)
      const nextHeadingIdx = afterOrig.search(/\n##\s+/)
      originalText = (nextHeadingIdx !== -1 ? afterOrig.slice(0, nextHeadingIdx) : afterOrig).trim()
    } else {
      // Strip top H1 if present to get clean body
      originalText = bodyBlock.replace(/^#\s+.+\n+/, '').trim() || bodyBlock
    }

    const sumIdx = bodyBlock.indexOf(sumMarker)
    if (sumIdx !== -1) {
      const afterSum = bodyBlock.slice(sumIdx + sumMarker.length)
      const linkIdx = afterSum.indexOf(linkMarker)
      summary = (linkIdx !== -1 ? afterSum.slice(0, linkIdx) : afterSum).trim()
    }

    const headingMatch = bodyBlock.match(/^#\s+(.+)$/m)
    const title = unquote(meta['title']) || (headingMatch?.[1]?.trim() ?? deriveIdeaTitle(originalText))
    const subject = unquote(meta['subject']) ?? null
    const topic = unquote(meta['topic']) ?? null
    const category = unquote(meta['category'])
    const tags = parseStringArray(meta['tags'])
    const linkedItemIds = parseStringArray(meta['linked_ids'])
    const dueDate = unquote(meta['due_date']) ?? null
    const completed = unquote(meta['completed']) === 'true'
    const rawTaskStatus = unquote(meta['task_status']) as KnowledgeTaskStatus | undefined

    return this.saveIdea({
      collection,
      title,
      originalText,
      summary,
      category,
      tags,
      subject,
      topic,
      dueDate,
      completed,
      taskStatus: rawTaskStatus,
      linkedItemIds,
    })
  }

  public close(): void {
    if (!this.closed) {
      this.closed = true
      try {
        this.db.close()
      } catch {
        // Ignore close errors during shutdown
      }
    }
  }

  private mapRowToIdea(row: Record<string, unknown>): IdeaRecord {
    let parsedTags: string[] = []
    try {
      const raw = JSON.parse(String(row['tags_json'] ?? '[]'))
      if (Array.isArray(raw)) {
        parsedTags = raw.map((x) => String(x))
      }
    } catch {
      parsedTags = []
    }

    const id = String(row['id'])
    const linkRows = this.db
      .prepare('SELECT source_id, target_id FROM knowledge_links WHERE source_id = ? OR target_id = ?;')
      .all(id, id) as Array<{ source_id?: unknown; target_id?: unknown }>
    const linkedSet = new Set<string>()
    for (const lr of linkRows) {
      const s = String(lr.source_id ?? '')
      const t = String(lr.target_id ?? '')
      if (s && s !== id) linkedSet.add(s)
      if (t && t !== id) linkedSet.add(t)
    }

    const rawCollection = String(row['collection'] ?? 'IDEA') as KnowledgeCollection
    const collection: KnowledgeCollection = ['IDEA', 'STUDY_NOTE', 'PROJECT', 'PLAN_TASK'].includes(rawCollection)
      ? rawCollection
      : 'IDEA'

    const completed = Number(row['completed'] ?? 0) === 1
    const rawTaskStatus = row['task_status'] ? (String(row['task_status']) as KnowledgeTaskStatus) : null

    return {
      id,
      collection,
      title: String(row['title']),
      originalText: String(row['original_text']),
      summary: row['summary'] !== null && row['summary'] !== undefined ? String(row['summary']) : null,
      createdAt: String(row['created_at']),
      updatedAt: String(row['updated_at']),
      category: String(row['category'] ?? 'general'),
      tags: parsedTags,
      persistenceStatus: (row['persistence_status'] as IdeaPersistenceStatus) || 'PERSISTED',
      subject: row['subject'] !== null && row['subject'] !== undefined ? String(row['subject']) : null,
      topic: row['topic'] !== null && row['topic'] !== undefined ? String(row['topic']) : null,
      taskStatus: rawTaskStatus,
      completed,
      dueDate: row['due_date'] !== null && row['due_date'] !== undefined ? String(row['due_date']) : null,
      completedAt:
        row['completed_at'] !== null && row['completed_at'] !== undefined
          ? String(row['completed_at'])
          : null,
      projectId:
        row['project_id'] !== null && row['project_id'] !== undefined ? String(row['project_id']) : null,
      linkedItemIds: Array.from(linkedSet),
    }
  }
}

export const KnowledgeHubStore = IdeasVaultStore

