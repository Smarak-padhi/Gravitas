/**
 * GRAVITAS V1-F-01 — Local Ideas Vault & Supervised Capability Persistence
 *
 * Offline-first, zero-cloud persistent SQLite storage using GRAVITAS persistence patterns:
 * - Single canonical writer owned by KernelHost
 * - WAL mode with BEGIN IMMEDIATE transactions
 * - Parameterized SQL queries
 * - Preserves original user wording verbatim even when generating/editing summaries
 * - Requires explicit confirmation before deleting any idea
 */

import { DatabaseSync } from 'node:sqlite'
import * as path from 'node:path'
import * as fs from 'node:fs'
import { randomUUID } from 'node:crypto'

export type IdeaPersistenceStatus = 'PERSISTED' | 'PENDING_SAVE' | 'ERROR'

export interface IdeaRecord {
  readonly id: string
  readonly title: string
  readonly originalText: string
  readonly summary: string | null
  readonly createdAt: string
  readonly updatedAt: string
  readonly category: string
  readonly tags: readonly string[]
  readonly persistenceStatus: IdeaPersistenceStatus
}

export interface SaveIdeaInput {
  readonly id?: string | undefined
  readonly title?: string | undefined
  readonly originalText: string
  readonly summary?: string | null | undefined
  readonly category?: string | undefined
  readonly tags?: readonly string[] | undefined
}

export interface UpdateIdeaInput {
  readonly id: string
  readonly title?: string | undefined
  readonly summary?: string | null | undefined
  readonly category?: string | undefined
  readonly tags?: readonly string[] | undefined
}

export interface DeleteIdeaResult {
  readonly deleted: boolean
  readonly id: string
  readonly message: string
}

const IDEAS_VAULT_DDL = `
CREATE TABLE IF NOT EXISTS ideas_vault (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  original_text TEXT NOT NULL,
  summary TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  tags_json TEXT NOT NULL DEFAULT '[]',
  persistence_status TEXT NOT NULL CHECK (persistence_status IN ('PERSISTED', 'PENDING_SAVE', 'ERROR'))
);

CREATE INDEX IF NOT EXISTS idx_ideas_vault_updated ON ideas_vault(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ideas_vault_category ON ideas_vault(category);

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
 * Generates a deterministic title from the user's raw idea text without calling any external model.
 */
export function deriveIdeaTitle(originalText: string): string {
  const cleaned = originalText
    .replace(/^(?:save\s+(?:this\s+)?idea\s*[:\-]?\s*)/i, '')
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
 * Extracts deterministic tags and category from idea text offline.
 */
export function deriveIdeaTagsAndCategory(originalText: string): { category: string; tags: string[] } {
  const lower = originalText.toLowerCase()
  const tags = new Set<string>()

  const keywordMap: ReadonlyArray<readonly [RegExp, string]> = [
    [/\b(?:ai|llm|model|agent|assistant|ml)\b/, 'ai'],
    [/\b(?:study|learn|course|exam|school|education)\b/, 'education'],
    [/\b(?:plan|planner|schedule|calendar|todo|task)\b/, 'planning'],
    [/\b(?:free|open-source|offline|local)\b/, 'free-local'],
    [/\b(?:app|desktop|web|mobile|ui|tool)\b/, 'product'],
    [/\b(?:code|dev|git|repo|typescript|rust|python)\b/, 'engineering'],
  ]

  for (const [rx, tag] of keywordMap) {
    if (rx.test(lower)) {
      tags.add(tag)
    }
  }

  if (tags.size === 0) {
    tags.add('idea')
  }

  let category = 'general'
  if (tags.has('education') || tags.has('planning')) {
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
  private closed = false

  public constructor(dataRoot: string) {
    if (!fs.existsSync(dataRoot)) {
      fs.mkdirSync(dataRoot, { recursive: true })
    }
    this.dbPath = path.join(path.resolve(dataRoot), 'ideas-vault.db')
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
      this.db.exec('COMMIT;')
    } catch (err) {
      this.db.exec('ROLLBACK;')
      throw err
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

    const originalText = input.originalText.trim()
    const id = input.id && input.id.trim().length > 0 ? input.id.trim() : `idea_${randomUUID()}`
    const now = new Date().toISOString()
    const derivedMeta = deriveIdeaTagsAndCategory(originalText)

    const title =
      input.title && input.title.trim().length > 0
        ? input.title.trim().slice(0, 256)
        : deriveIdeaTitle(originalText)

    const summary =
      input.summary !== undefined
        ? input.summary === null
          ? null
          : input.summary.trim().slice(0, 4096)
        : deriveIdeaSummary(originalText)

    const category =
      input.category && input.category.trim().length > 0
        ? input.category.trim().slice(0, 64)
        : derivedMeta.category

    const tags =
      input.tags && input.tags.length > 0
        ? Array.from(new Set(input.tags.map((t) => t.trim().toLowerCase()).filter(Boolean))).slice(0, 16)
        : derivedMeta.tags

    const record: IdeaRecord = {
      id,
      title,
      originalText,
      summary,
      createdAt: now,
      updatedAt: now,
      category,
      tags,
      persistenceStatus: 'PERSISTED',
    }

    this.db.exec('BEGIN IMMEDIATE TRANSACTION;')
    try {
      const stmt = this.db.prepare(`
        INSERT INTO ideas_vault (
          id, title, original_text, summary, created_at, updated_at, category, tags_json, persistence_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
      `)
      stmt.run(
        record.id,
        record.title,
        record.originalText,
        record.summary,
        record.createdAt,
        record.updatedAt,
        record.category,
        JSON.stringify(record.tags),
        record.persistenceStatus
      )
      this.db.exec('COMMIT;')
    } catch (err) {
      this.db.exec('ROLLBACK;')
      throw err
    }

    return record
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

  public searchIdeas(query: string): readonly IdeaRecord[] {
    this.assertOpen()
    const trimmed = (query || '').trim().toLowerCase()
    if (!trimmed) {
      return this.listIdeas()
    }

    const all = this.listIdeas()
    const tokens = trimmed
      .replace(/[^\w\s-]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 0 && !['my', 'the', 'a', 'an', 'for', 'idea', 'ideas', 'find', 'search', 'show'].includes(t))

    return all.filter((idea) => {
      const haystack = [
        idea.title,
        idea.originalText,
        idea.summary ?? '',
        idea.category,
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
   * Updates an idea's title, summary, category, or tags while strictly preserving originalText.
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

    const updatedTitle =
      input.title !== undefined && input.title.trim().length > 0
        ? input.title.trim().slice(0, 256)
        : existing.title

    const updatedSummary =
      input.summary !== undefined
        ? input.summary === null
          ? null
          : input.summary.trim().slice(0, 4096)
        : existing.summary

    const updatedCategory =
      input.category !== undefined && input.category.trim().length > 0
        ? input.category.trim().slice(0, 64)
        : existing.category

    const updatedTags =
      input.tags !== undefined
        ? Array.from(new Set(input.tags.map((t) => t.trim().toLowerCase()).filter(Boolean))).slice(0, 16)
        : existing.tags

    const updatedAt = new Date().toISOString()

    this.db.exec('BEGIN IMMEDIATE TRANSACTION;')
    try {
      const stmt = this.db.prepare(`
        UPDATE ideas_vault
        SET title = ?, summary = ?, category = ?, tags_json = ?, updated_at = ?
        WHERE id = ?;
      `)
      stmt.run(
        updatedTitle,
        updatedSummary,
        updatedCategory,
        JSON.stringify(updatedTags),
        updatedAt,
        existing.id
      )
      this.db.exec('COMMIT;')
    } catch (err) {
      this.db.exec('ROLLBACK;')
      throw err
    }

    return {
      ...existing,
      title: updatedTitle,
      // Invariant: originalText is never overwritten during edits/summarization
      originalText: existing.originalText,
      summary: updatedSummary,
      category: updatedCategory,
      tags: updatedTags,
      updatedAt,
    }
  }

  /**
   * Deletes an idea ONLY when explicit user confirmation is provided (confirmed === true).
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

    return {
      id: String(row['id']),
      title: String(row['title']),
      originalText: String(row['original_text']),
      summary: row['summary'] !== null && row['summary'] !== undefined ? String(row['summary']) : null,
      createdAt: String(row['created_at']),
      updatedAt: String(row['updated_at']),
      category: String(row['category'] ?? 'general'),
      tags: parsedTags,
      persistenceStatus: (row['persistence_status'] as IdeaPersistenceStatus) || 'PERSISTED',
    }
  }
}
