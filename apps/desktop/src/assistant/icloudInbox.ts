/**
 * GRAVITAS V1-G-01 — 7-Subject Registry, iCloud Drive Inbox & Assignment Detection
 *
 * Implements:
 * 1. Idempotent, editable records for the 7 real semester subjects with Notes, Assignments,
 *    Answers, Resources, and Revision Tasks in each subject.
 * 2. Local iCloud Drive Inbox watcher + reconciliation scanner ("iPhone -> iCloud Drive/GRAVITAS/Inbox -> Windows -> GRAVITAS"):
 *    - Persists selected Inbox folder
 *    - Supports .txt, .md, .url/.webloc, .png/.jpg/.jpeg, and .pdf
 *    - Safely handles incomplete/undownloaded .icloud placeholder or zero-byte/locked files
 *    - SHA-256 content-hash duplicate detection, retry tracking, size limits, and error states
 *    - Preserves original attachments and source timestamps without executing or deleting originals
 * 3. Deterministic Assignment Detection (with optional authorized local AI hook):
 *    - Extracts Title, Subject (syllabus keyword matching + ambiguity confirmation), Teacher instructions,
 *      explicit Due date (never invents due dates; flags relative deadlines like "next week" for confirmation),
 *      Subtasks, and Original source attachment
 *    - Local PDF text extraction where readable; honest "Needs manual review" status for screenshots/unreadable PDFs
 */

import type { DatabaseSync } from 'node:sqlite'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as zlib from 'node:zlib'
import { createHash, randomUUID } from 'node:crypto'
import type { IdeasVaultStore, IdeaRecord } from './ideasVault.js'

export type SemesterSubjectCode =
  | 'CSE 2195'
  | 'CSE 2221'
  | 'CSE 2631'
  | 'MTH 2002'
  | 'MTH 2787'
  | 'CHM 2041'
  | 'GET 1433'

export type SubjectSectionBucket =
  | 'NOTES'
  | 'ASSIGNMENTS'
  | 'ANSWERS'
  | 'RESOURCES'
  | 'REVISION_TASKS'

export interface SemesterSubjectRecord {
  readonly code: string
  readonly name: string
  readonly credits: number
  readonly keywords: readonly string[]
  readonly notes: string
  readonly createdAt: string
  readonly updatedAt: string
}

export interface SubjectSectionEntryRecord {
  readonly entryId: string
  readonly subjectCode: string
  readonly bucket: SubjectSectionBucket
  readonly title: string
  readonly originalContent: string
  readonly generatedOrEditedContent: string | null
  readonly linkedAssignmentId: string | null
  readonly attachmentPath: string | null
  readonly createdAt: string
  readonly updatedAt: string
}

export interface SubjectWorkspaceProjection {
  readonly subject: SemesterSubjectRecord
  readonly notes: readonly SubjectSectionEntryRecord[]
  readonly assignments: readonly SubjectSectionEntryRecord[]
  readonly answers: readonly SubjectSectionEntryRecord[]
  readonly resources: readonly SubjectSectionEntryRecord[]
  readonly revisionTasks: readonly SubjectSectionEntryRecord[]
  readonly knowledgeHubItems: readonly IdeaRecord[]
}

export const SEVEN_SEMESTER_SUBJECTS: ReadonlyArray<{
  readonly code: SemesterSubjectCode
  readonly name: string
  readonly credits: number
  readonly aliases: readonly string[]
  readonly keywords: readonly string[]
}> = [
  {
    code: 'CSE 2195',
    name: 'Data Science Workshop 1',
    credits: 4,
    aliases: ['cse 2195', 'cse2195', 'data science', 'data science workshop', 'dsw'],
    keywords: [
      'cse 2195',
      'cse2195',
      'data science',
      'pandas',
      'numpy',
      'dataframe',
      'exploratory data analysis',
      'eda',
      'matplotlib',
      'seaborn',
      'csv dataset',
      'feature engineering',
      'data cleaning',
    ],
  },
  {
    code: 'CSE 2221',
    name: 'Modern Computing Systems Design',
    credits: 4,
    aliases: ['cse 2221', 'cse2221', 'computing systems', 'modern computing systems', 'systems design'],
    keywords: [
      'cse 2221',
      'cse2221',
      'computing systems',
      'cache coherence',
      'memory hierarchy',
      'instruction pipeline',
      'virtual memory',
      'page table',
      'risc',
      'assembly',
      'processor architecture',
      'alu',
    ],
  },
  {
    code: 'CSE 2631',
    name: 'Algorithms Analysis and Design 1',
    credits: 4,
    aliases: ['cse 2631', 'cse2631', 'algorithms', 'algorithm analysis', 'aad'],
    keywords: [
      'cse 2631',
      'cse2631',
      'algorithms',
      'algorithm analysis',
      'asymptotic',
      'big-o',
      'recurrence',
      'master theorem',
      'divide and conquer',
      'dynamic programming',
      'greedy algorithm',
      'dijkstra',
      'minimum spanning tree',
      'quicksort',
      'mergesort',
      'heapsort',
      'np-complete',
    ],
  },
  {
    code: 'MTH 2002',
    name: 'Probability and Statistics',
    credits: 4,
    aliases: ['mth 2002', 'mth2002', 'probability', 'statistics', 'prob and stats'],
    keywords: [
      'mth 2002',
      'mth2002',
      'probability',
      'statistics',
      'random variable',
      'bayes theorem',
      'conditional probability',
      'binomial distribution',
      'poisson',
      'normal distribution',
      'gaussian',
      'variance',
      'standard deviation',
      'hypothesis testing',
      'confidence interval',
      'p-value',
    ],
  },
  {
    code: 'MTH 2787',
    name: 'A First Course in Artificial Intelligence 1',
    credits: 2,
    aliases: ['mth 2787', 'mth2787', 'artificial intelligence', 'first course in ai', 'ai 1'],
    keywords: [
      'mth 2787',
      'mth2787',
      'artificial intelligence',
      'uninformed search',
      'informed search',
      'heuristic',
      'a* search',
      'minimax',
      'alpha-beta pruning',
      'constraint satisfaction',
      'csp',
      'propositional logic',
      'first-order logic',
      'knowledge representation',
    ],
  },
  {
    code: 'CHM 2041',
    name: 'Introduction to Environmental Studies',
    credits: 2,
    aliases: ['chm 2041', 'chm2041', 'environmental studies', 'environmental', 'evs'],
    keywords: [
      'chm 2041',
      'chm2041',
      'environmental studies',
      'ecosystem',
      'biodiversity',
      'biogeochemical',
      'air pollution',
      'water pollution',
      'climate change',
      'greenhouse effect',
      'sustainability',
      'renewable resources',
      'environmental impact',
    ],
  },
  {
    code: 'GET 1433',
    name: 'Introduction to DevOps',
    credits: 0,
    aliases: ['get 1433', 'get1433', 'devops', 'intro to devops'],
    keywords: [
      'get 1433',
      'get1433',
      'devops',
      'ci/cd',
      'continuous integration',
      'continuous delivery',
      'docker',
      'dockerfile',
      'kubernetes',
      'containerization',
      'github actions',
      'jenkins',
      'infrastructure as code',
      'terraform',
    ],
  },
]

export type InboxSourceKind = 'TEXT' | 'URL' | 'SCREENSHOT' | 'PDF' | 'UNSUPPORTED'

export type InboxImportStatus =
  | 'IMPORTED'
  | 'PENDING_ICLOUD_DOWNLOAD'
  | 'DUPLICATE_SKIPPED'
  | 'ERROR_SIZE_LIMIT'
  | 'ERROR_UNSUPPORTED'
  | 'ERROR_IO'

export type ExtractionReviewStatus = 'EXTRACTED' | 'NEEDS_MANUAL_REVIEW'

export interface InboxConfigRecord {
  readonly inboxFolderPath: string | null
  readonly maxFileSizeBytes: number
  readonly watcherActive: boolean
  readonly lastScanAt: string | null
}

export interface InboxImportRecord {
  readonly importId: string
  readonly sourceFileName: string
  readonly sourceFilePath: string
  readonly sourceKind: InboxSourceKind
  readonly status: InboxImportStatus
  readonly contentSha256: string | null
  readonly fileSizeBytes: number
  readonly sourceModifiedAt: string
  readonly preservedAttachmentPath: string | null
  readonly retryCount: number
  readonly errorMessage: string | null
  readonly draftId: string | null
  readonly importedAt: string
  readonly updatedAt: string
}

export interface AssignmentDraftRecord {
  readonly draftId: string
  readonly importId: string
  readonly title: string
  readonly suggestedSubjectCode: string | null
  readonly candidateSubjects: readonly string[]
  readonly subjectConfidence: 'HIGH' | 'AMBIGUOUS' | 'UNKNOWN'
  readonly subjectConfirmationRequired: boolean
  readonly teacherInstructions: string
  readonly extractedDueDate: string | null
  readonly relativeDeadlineExpression: string | null
  readonly dueDateConfirmationRequired: boolean
  readonly subtasks: readonly string[]
  readonly sourceKind: InboxSourceKind
  readonly extractionStatus: ExtractionReviewStatus
  readonly extractionNote: string
  readonly originalAttachmentPath: string | null
  readonly sourceModifiedAt: string
  readonly promotedAssignmentId: string | null
  readonly createdAt: string
  readonly updatedAt: string
}

export interface InboxScanResult {
  readonly inboxFolderPath: string
  readonly scannedAt: string
  readonly importedRecords: readonly InboxImportRecord[]
  readonly pendingCloudRecords: readonly InboxImportRecord[]
  readonly duplicateSkippedRecords: readonly InboxImportRecord[]
  readonly errorRecords: readonly InboxImportRecord[]
  readonly createdDrafts: readonly AssignmentDraftRecord[]
}

export type AuthorizedLocalAiExtractor = (input: {
  readonly rawText: string
  readonly sourceFileName: string
}) => Promise<{
  readonly title?: string
  readonly suggestedSubjectCode?: string
  readonly dueDate?: string
  readonly subtasks?: readonly string[]
} | null>

export type LocalImageOcrExtractor = (imageFilePath: string) => Promise<string | null>

const INBOX_AND_SUBJECTS_DDL = `
CREATE TABLE IF NOT EXISTS semester_subjects (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  credits INTEGER NOT NULL DEFAULT 0,
  keywords_json TEXT NOT NULL DEFAULT '[]',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subject_section_entries (
  entry_id TEXT PRIMARY KEY,
  subject_code TEXT NOT NULL,
  bucket TEXT NOT NULL CHECK (bucket IN ('NOTES', 'ASSIGNMENTS', 'ANSWERS', 'RESOURCES', 'REVISION_TASKS')),
  title TEXT NOT NULL,
  original_content TEXT NOT NULL,
  generated_or_edited_content TEXT,
  linked_assignment_id TEXT,
  attachment_path TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_subject_entries_code_bucket ON subject_section_entries(subject_code, bucket);

CREATE TABLE IF NOT EXISTS icloud_inbox_config (
  config_key TEXT PRIMARY KEY,
  inbox_folder_path TEXT,
  max_file_size_bytes INTEGER NOT NULL DEFAULT 26214400,
  last_scan_at TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS icloud_inbox_imports (
  import_id TEXT PRIMARY KEY,
  source_file_name TEXT NOT NULL,
  source_file_path TEXT NOT NULL,
  source_kind TEXT NOT NULL,
  status TEXT NOT NULL,
  content_sha256 TEXT,
  file_size_bytes INTEGER NOT NULL DEFAULT 0,
  source_modified_at TEXT NOT NULL,
  preserved_attachment_path TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  draft_id TEXT,
  imported_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_inbox_imports_sha ON icloud_inbox_imports(content_sha256);
CREATE INDEX IF NOT EXISTS idx_inbox_imports_path ON icloud_inbox_imports(source_file_path);

CREATE TABLE IF NOT EXISTS assignment_drafts (
  draft_id TEXT PRIMARY KEY,
  import_id TEXT NOT NULL,
  title TEXT NOT NULL,
  suggested_subject_code TEXT,
  candidate_subjects_json TEXT NOT NULL DEFAULT '[]',
  subject_confidence TEXT NOT NULL CHECK (subject_confidence IN ('HIGH', 'AMBIGUOUS', 'UNKNOWN')),
  subject_confirmation_required INTEGER NOT NULL DEFAULT 1,
  teacher_instructions TEXT NOT NULL,
  extracted_due_date TEXT,
  relative_deadline_expression TEXT,
  due_date_confirmation_required INTEGER NOT NULL DEFAULT 1,
  subtasks_json TEXT NOT NULL DEFAULT '[]',
  source_kind TEXT NOT NULL,
  extraction_status TEXT NOT NULL CHECK (extraction_status IN ('EXTRACTED', 'NEEDS_MANUAL_REVIEW')),
  extraction_note TEXT NOT NULL,
  original_attachment_path TEXT,
  source_modified_at TEXT NOT NULL,
  promoted_assignment_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_assignment_drafts_import ON assignment_drafts(import_id);
`

const DEFAULT_MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024 // 25 MB

const MONTH_NAME_MAP: Readonly<Record<string, number>> = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
}

/**
 * Resolves a human subject query (e.g. "Algorithms", "CSE 2631", "Data Science", "DevOps", "AI")
 * to its canonical subject code if known, or returns the trimmed subject string.
 */
export function resolveSemesterSubjectQuery(query: string): string {
  const cleaned = query.trim()
  const lower = cleaned.toLowerCase()
  for (const subj of SEVEN_SEMESTER_SUBJECTS) {
    if (subj.code.toLowerCase() === lower || subj.name.toLowerCase() === lower) {
      return subj.code
    }
    if (subj.aliases.some((a) => a === lower || lower.includes(a))) {
      return subj.code
    }
  }
  return cleaned
}

/**
 * Deterministically classifies text against the 7 semester subjects using course codes and syllabus keywords.
 * Flags ambiguous or missing matches so the user is asked to confirm.
 */
export function classifySubjectFromText(
  rawText: string,
  customSubjects?: readonly SemesterSubjectRecord[]
): {
  readonly suggestedSubjectCode: string | null
  readonly candidateSubjects: readonly string[]
  readonly confidence: 'HIGH' | 'AMBIGUOUS' | 'UNKNOWN'
  readonly confirmationRequired: boolean
} {
  const lower = rawText.toLowerCase()
  const scores = new Map<string, number>()
  const explicitCodesMatched = new Set<string>()

  // 1. Check explicit course code mention first (e.g. "CSE 2631" or "CSE2631")
  for (const def of SEVEN_SEMESTER_SUBJECTS) {
    const codeNoSpace = def.code.toLowerCase().replace(/\s+/g, '')
    if (lower.includes(def.code.toLowerCase()) || lower.includes(codeNoSpace)) {
      scores.set(def.code, (scores.get(def.code) ?? 0) + 10)
      explicitCodesMatched.add(def.code)
    }
    for (const kw of def.keywords) {
      if (lower.includes(kw.toLowerCase())) {
        scores.set(def.code, (scores.get(def.code) ?? 0) + 2)
      }
    }
  }

  if (customSubjects) {
    for (const custom of customSubjects) {
      if (!scores.has(custom.code)) {
        for (const kw of custom.keywords) {
          if (kw && lower.includes(kw.toLowerCase())) {
            scores.set(custom.code, (scores.get(custom.code) ?? 0) + 2)
          }
        }
      }
    }
  }

  const ranked = Array.from(scores.entries())
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1])

  if (ranked.length === 0) {
    return {
      suggestedSubjectCode: null,
      candidateSubjects: [],
      confidence: 'UNKNOWN',
      confirmationRequired: true,
    }
  }

  const top = ranked[0]!
  const second = ranked[1]

  // Ambiguous if multiple subjects match without a single explicit course code, or scores are close, or top score is weak
  if (
    explicitCodesMatched.size > 1 ||
    (second && explicitCodesMatched.size === 0) ||
    (second && second[1] >= top[1] - 2) ||
    top[1] < 4
  ) {
    return {
      suggestedSubjectCode: top[0],
      candidateSubjects: ranked.map(([code]) => code),
      confidence: 'AMBIGUOUS',
      confirmationRequired: true,
    }
  }

  return {
    suggestedSubjectCode: top[0],
    candidateSubjects: ranked.map(([code]) => code),
    confidence: 'HIGH',
    confirmationRequired: false,
  }
}

/**
 * Extracts explicit calendar due dates vs relative deadlines ("next week", "next Friday", "tomorrow")
 * without ever inventing due dates.
 */
export function extractDeadlineFromText(rawText: string): {
  readonly extractedDueDate: string | null
  readonly relativeDeadlineExpression: string | null
  readonly dueDateConfirmationRequired: boolean
} {
  // 1. Check explicit ISO date: YYYY-MM-DD
  const isoMatch = rawText.match(/\b(?:due|deadline|submit\s+by|before|on)?\s*[:\-]?\s*(20\d{2}-\d{2}-\d{2})\b/i)
  if (isoMatch && isoMatch[1]) {
    return {
      extractedDueDate: isoMatch[1],
      relativeDeadlineExpression: null,
      dueDateConfirmationRequired: false,
    }
  }

  // 2. Check explicit Month Day, Year (e.g. "October 25, 2026" or "Oct 25, 2026")
  const namedDateMatch = rawText.match(
    /\b(January|Jan|February|Feb|March|Mar|April|Apr|May|June|Jun|July|Jul|August|Aug|September|Sep|Sept|October|Oct|November|Nov|December|Dec)\s+(\d{1,2}),?\s+(20\d{2})\b/i
  )
  if (namedDateMatch && namedDateMatch[1] && namedDateMatch[2] && namedDateMatch[3]) {
    const monthNum = MONTH_NAME_MAP[namedDateMatch[1].toLowerCase()]
    const dayNum = Number(namedDateMatch[2])
    const yearNum = Number(namedDateMatch[3])
    if (monthNum && dayNum >= 1 && dayNum <= 31) {
      const iso = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
      return {
        extractedDueDate: iso,
        relativeDeadlineExpression: null,
        dueDateConfirmationRequired: false,
      }
    }
  }

  // 3. Check relative deadline expressions ("next week", "this Friday", "next Monday", "tomorrow", "in N days")
  // Rule: Do NOT invent due dates. Flag relative deadlines for user confirmation.
  const relativeMatch = rawText.match(
    /\b(?:due|submit|deadline|by)\s+(?:on\s+)?(next\s+week|this\s+week|tomorrow(?:\s+evening|\s+morning|\s+night)?|tonight|next\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|this\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|in\s+\d+\s+days?)\b/i
  ) || rawText.match(/\b(next\s+week|next\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/i)

  if (relativeMatch && relativeMatch[1]) {
    return {
      extractedDueDate: null,
      relativeDeadlineExpression: relativeMatch[1].trim(),
      dueDateConfirmationRequired: true,
    }
  }

  // No deadline found — do not invent one!
  return {
    extractedDueDate: null,
    relativeDeadlineExpression: null,
    dueDateConfirmationRequired: true,
  }
}

/**
 * Extracts deterministic subtasks from bulleted or numbered lines in teacher instructions.
 */
export function extractSubtasksFromText(rawText: string): readonly string[] {
  const lines = rawText.split(/\r?\n/)
  const subtasks: string[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    const bulletMatch = trimmed.match(/^(?:[-*•]|\d+[.)]|Part\s+[A-Z0-9]+[:.)]|Q\d+[:.)])\s+(.+)$/i)
    if (bulletMatch && bulletMatch[1]) {
      const taskText = bulletMatch[1].trim()
      if (taskText.length >= 3 && subtasks.length < 25) {
        subtasks.push(taskText)
      }
    }
  }
  return subtasks
}

/**
 * Attempts deterministic local PDF text extraction without external binaries or fabricated content.
 * Supports plain and FlateDecode PDF streams containing BT ... ET and (...) Tj / [...] TJ operators.
 */
export function extractLocalPdfText(pdfBuffer: Buffer): string | null {
  try {
    const rawLatin1 = pdfBuffer.toString('latin1')
    if (!rawLatin1.startsWith('%PDF-')) {
      return null
    }

    const decodePdfStringLiteral = (s: string): string => {
      return s
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')')
        .replace(/\\\\/g, '\\')
    }

    const extractFromStreamContent = (content: string, outChunks: string[]) => {
      const btBlocks = content.match(/BT[\s\S]*?ET/g) ?? [content]
      for (const block of btBlocks) {
        // Match (text) Tj
        const tjRegex = /\(([^()\\]*(?:\\.[^()\\]*)*)\)\s*Tj/g
        let m: RegExpExecArray | null
        while ((m = tjRegex.exec(block)) !== null) {
          if (m[1]) {
            outChunks.push(decodePdfStringLiteral(m[1]))
          }
        }
        // Match [(text) -10 (more)] TJ
        const tjArrayRegex = /\[([\s\S]*?)\]\s*TJ/g
        let arrMatch: RegExpExecArray | null
        while ((arrMatch = tjArrayRegex.exec(block)) !== null) {
          if (arrMatch[1]) {
            const innerRegex = /\(([^()\\]*(?:\\.[^()\\]*)*)\)/g
            let inner: RegExpExecArray | null
            let linePart = ''
            while ((inner = innerRegex.exec(arrMatch[1])) !== null) {
              if (inner[1]) {
                linePart += decodePdfStringLiteral(inner[1])
              }
            }
            if (linePart.trim()) {
              outChunks.push(linePart)
            }
          }
        }
      }
    }

    const extractedChunks: string[] = []
    extractFromStreamContent(rawLatin1, extractedChunks)

    // Also inspect compressed streams if any
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g
    let sm: RegExpExecArray | null
    while ((sm = streamRegex.exec(rawLatin1)) !== null) {
      if (sm[1]) {
        try {
          const compressedBuf = Buffer.from(sm[1], 'latin1')
          const decompressed = zlib.inflateSync(compressedBuf).toString('latin1')
          extractFromStreamContent(decompressed, extractedChunks)
        } catch {
          // Not a valid zlib stream or encrypted; ignore safely
        }
      }
    }

    const joined = extractedChunks
      .map((c) => c.trim())
      .filter(Boolean)
      .join('\n')
      .trim()

    // Ensure extracted text contains genuine printable characters (never fabricate)
    if (joined.length >= 4 && /[a-zA-Z0-9]{2,}/.test(joined)) {
      return joined
    }
    return null
  } catch {
    return null
  }
}

export class ICloudAssignmentInbox {
  private readonly db: DatabaseSync
  private readonly dataRoot: string
  private readonly attachmentsDir: string
  private readonly vault: IdeasVaultStore
  private watcher: fs.FSWatcher | null = null
  private localAiExtractor?: AuthorizedLocalAiExtractor | undefined
  private localImageOcr?: LocalImageOcrExtractor | undefined

  public constructor(opts: {
    readonly vault: IdeasVaultStore
    readonly dataRoot: string
    readonly localAiExtractor?: AuthorizedLocalAiExtractor | undefined
    readonly localImageOcr?: LocalImageOcrExtractor | undefined
  }) {
    this.vault = opts.vault
    this.db = opts.vault.getDatabase()
    this.dataRoot = path.resolve(opts.dataRoot)
    this.attachmentsDir = path.join(this.dataRoot, 'inbox-attachments')
    this.localAiExtractor = opts.localAiExtractor
    this.localImageOcr = opts.localImageOcr

    if (!fs.existsSync(this.attachmentsDir)) {
      fs.mkdirSync(this.attachmentsDir, { recursive: true })
    }

    this.initializeSchemaAndSeedSubjects()
  }

  private initializeSchemaAndSeedSubjects(): void {
    this.db.exec('BEGIN IMMEDIATE TRANSACTION;')
    try {
      this.db.exec(INBOX_AND_SUBJECTS_DDL)
      const now = new Date().toISOString()

      // Idempotent seeding of the 7 real semester subjects (never duplicates on restart)
      const insertSubj = this.db.prepare(`
        INSERT OR IGNORE INTO semester_subjects (code, name, credits, keywords_json, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?);
      `)
      for (const s of SEVEN_SEMESTER_SUBJECTS) {
        insertSubj.run(
          s.code,
          s.name,
          s.credits,
          JSON.stringify(s.keywords),
          `Default ${s.code} (${s.name}) workspace with Notes, Assignments, Answers, Resources, and Revision Tasks.`,
          now,
          now
        )
      }

      // Ensure default inbox config row exists
      this.db
        .prepare(`
          INSERT OR IGNORE INTO icloud_inbox_config (config_key, inbox_folder_path, max_file_size_bytes, last_scan_at, updated_at)
          VALUES ('DEFAULT', NULL, ?, NULL, ?);
        `)
        .run(DEFAULT_MAX_FILE_SIZE_BYTES, now)

      this.db.exec('COMMIT;')
    } catch (err) {
      this.db.exec('ROLLBACK;')
      throw err
    }
  }

  // ─── 1. Seven Semester Subjects API ────────────────────────────────────────

  public listSemesterSubjects(): readonly SemesterSubjectRecord[] {
    const rows = this.db
      .prepare('SELECT * FROM semester_subjects ORDER BY code ASC;')
      .all() as Array<Record<string, unknown>>
    return rows.map((r) => this.mapSubjectRow(r))
  }

  public getSemesterSubject(codeOrQuery: string): SemesterSubjectRecord | null {
    const resolved = resolveSemesterSubjectQuery(codeOrQuery)
    const row = this.db
      .prepare('SELECT * FROM semester_subjects WHERE UPPER(code) = UPPER(?) OR UPPER(name) = UPPER(?);')
      .get(resolved, resolved) as Record<string, unknown> | undefined
    return row ? this.mapSubjectRow(row) : null
  }

  public updateSemesterSubject(input: {
    readonly code: string
    readonly name?: string | undefined
    readonly credits?: number | undefined
    readonly keywords?: readonly string[] | undefined
    readonly notes?: string | undefined
  }): SemesterSubjectRecord {
    const existing = this.getSemesterSubject(input.code)
    if (!existing) {
      throw new Error(`Subject not found: ${input.code}`)
    }
    const nextName = input.name !== undefined ? input.name.trim() : existing.name
    const nextCredits = input.credits !== undefined ? Number(input.credits) : existing.credits
    const nextKeywords = input.keywords !== undefined ? input.keywords : existing.keywords
    const nextNotes = input.notes !== undefined ? input.notes : existing.notes
    const updatedAt = new Date().toISOString()

    this.db
      .prepare(`
        UPDATE semester_subjects
        SET name = ?, credits = ?, keywords_json = ?, notes = ?, updated_at = ?
        WHERE code = ?;
      `)
      .run(nextName, nextCredits, JSON.stringify(nextKeywords), nextNotes, updatedAt, existing.code)

    return this.getSemesterSubject(existing.code)!
  }

  public createSemesterSubject(input: {
    readonly code: string
    readonly name?: string | undefined
    readonly credits?: number | undefined
    readonly keywords?: readonly string[] | undefined
    readonly notes?: string | undefined
  }): SemesterSubjectRecord {
    const code = input.code.trim()
    const existing = this.getSemesterSubject(code)
    if (existing) {
      return existing
    }

    const name = (input.name || code).trim()
    const credits = input.credits !== undefined ? Number(input.credits) : 4
    const keywords = input.keywords ?? [code.toLowerCase(), name.toLowerCase()]
    const notes = input.notes ?? `Workspace for ${code} (${name}) with Notes, Assignments, Answers, Resources, and Revision Tasks.`
    const now = new Date().toISOString()

    this.db
      .prepare(`
        INSERT INTO semester_subjects (code, name, credits, keywords_json, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?);
      `)
      .run(code, name, credits, JSON.stringify(keywords), notes, now, now)

    return this.getSemesterSubject(code)!
  }

  public seedDefaultSubjects(): readonly SemesterSubjectRecord[] {
    const now = new Date().toISOString()
    const insertSubj = this.db.prepare(`
      INSERT OR IGNORE INTO semester_subjects (code, name, credits, keywords_json, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?);
    `)
    for (const s of SEVEN_SEMESTER_SUBJECTS) {
      insertSubj.run(
        s.code,
        s.name,
        s.credits,
        JSON.stringify(s.keywords),
        `Default ${s.code} (${s.name}) workspace with Notes, Assignments, Answers, Resources, and Revision Tasks.`,
        now,
        now
      )
    }
    return this.listSemesterSubjects()
  }

  public deleteSemesterSubject(code: string, force = false): boolean {
    const existing = this.getSemesterSubject(code)
    if (!existing) return false

    // Check if subject has user entries or assignments unless force=true
    if (!force) {
      const entryCountRow = this.db
        .prepare('SELECT COUNT(*) as count FROM subject_section_entries WHERE UPPER(subject_code) = UPPER(?);')
        .get(existing.code) as { count: number } | undefined
      if (entryCountRow && entryCountRow.count > 0) {
        throw new Error(`Cannot delete subject ${existing.code}: contains ${entryCountRow.count} section entries.`)
      }

      try {
        const asgnCountRow = this.db
          .prepare('SELECT COUNT(*) as count FROM study_assignments WHERE UPPER(subject_code) = UPPER(?);')
          .get(existing.code) as { count: number } | undefined
        if (asgnCountRow && asgnCountRow.count > 0) {
          throw new Error(`Cannot delete subject ${existing.code}: contains ${asgnCountRow.count} assignments.`)
        }
      } catch (err) {
        if ((err as Error).message.includes('Cannot delete subject')) throw err
      }
    }

    this.db.prepare('DELETE FROM semester_subjects WHERE UPPER(code) = UPPER(?);').run(existing.code)
    return true
  }

  public clearUnusedDefaultSubjects(): number {
    let cleared = 0
    for (const s of SEVEN_SEMESTER_SUBJECTS) {
      let hasEntries = false
      try {
        const entryCountRow = this.db
          .prepare('SELECT COUNT(*) as count FROM subject_section_entries WHERE UPPER(subject_code) = UPPER(?);')
          .get(s.code) as { count: number } | undefined
        hasEntries = (entryCountRow?.count ?? 0) > 0
      } catch {}

      let hasAssignments = false
      try {
        const asgnCountRow = this.db
          .prepare('SELECT COUNT(*) as count FROM study_assignments WHERE UPPER(subject_code) = UPPER(?);')
          .get(s.code) as { count: number } | undefined
        hasAssignments = (asgnCountRow?.count ?? 0) > 0
      } catch {}

      if (!hasEntries && !hasAssignments) {
        this.db.prepare('DELETE FROM semester_subjects WHERE code = ?;').run(s.code)
        cleared++
      }
    }
    return cleared
  }

  public addSubjectSectionEntry(input: {
    readonly subjectCode: string
    readonly bucket: SubjectSectionBucket
    readonly title: string
    readonly originalContent: string
    readonly generatedOrEditedContent?: string | null | undefined
    readonly linkedAssignmentId?: string | null | undefined
    readonly attachmentPath?: string | null | undefined
  }): SubjectSectionEntryRecord {
    const subj = this.getSemesterSubject(input.subjectCode)
    const canonicalCode = subj ? subj.code : input.subjectCode.trim()
    const entryId = `sentry_${randomUUID()}`
    const now = new Date().toISOString()

    this.db
      .prepare(`
        INSERT INTO subject_section_entries (
          entry_id, subject_code, bucket, title, original_content,
          generated_or_edited_content, linked_assignment_id, attachment_path, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `)
      .run(
        entryId,
        canonicalCode,
        input.bucket,
        input.title.trim(),
        input.originalContent,
        input.generatedOrEditedContent ?? null,
        input.linkedAssignmentId ?? null,
        input.attachmentPath ?? null,
        now,
        now
      )

    // Mirror Notes and Revision Tasks into IdeasVaultStore so unified Knowledge Hub search/collections stay synchronized
    if (input.bucket === 'NOTES') {
      this.vault.saveStudyNote({
        title: input.title.trim(),
        originalText: input.originalContent,
        summary: input.generatedOrEditedContent ?? null,
        subject: canonicalCode,
        tags: [canonicalCode.toLowerCase().replace(/\s+/g, '-'), 'note'],
      })
    } else if (input.bucket === 'REVISION_TASKS') {
      this.vault.createTask({
        title: input.title.trim(),
        originalText: input.originalContent,
        subject: canonicalCode,
        tags: [canonicalCode.toLowerCase().replace(/\s+/g, '-'), 'revision'],
      })
    }

    return this.getSubjectSectionEntry(entryId)!
  }

  public getSubjectSectionEntry(entryId: string): SubjectSectionEntryRecord | null {
    const row = this.db
      .prepare('SELECT * FROM subject_section_entries WHERE entry_id = ?;')
      .get(entryId) as Record<string, unknown> | undefined
    return row ? this.mapSectionEntryRow(row) : null
  }

  public listSubjectSectionEntries(
    subjectCode: string,
    bucket?: SubjectSectionBucket
  ): readonly SubjectSectionEntryRecord[] {
    const subj = this.getSemesterSubject(subjectCode)
    const canonicalCode = subj ? subj.code : subjectCode.trim()
    if (bucket) {
      const rows = this.db
        .prepare(
          'SELECT * FROM subject_section_entries WHERE UPPER(subject_code) = UPPER(?) AND bucket = ? ORDER BY created_at DESC;'
        )
        .all(canonicalCode, bucket) as Array<Record<string, unknown>>
      return rows.map((r) => this.mapSectionEntryRow(r))
    }
    const rows = this.db
      .prepare('SELECT * FROM subject_section_entries WHERE UPPER(subject_code) = UPPER(?) ORDER BY created_at DESC;')
      .all(canonicalCode) as Array<Record<string, unknown>>
    return rows.map((r) => this.mapSectionEntryRow(r))
  }

  public getSubjectWorkspace(subjectCodeOrQuery: string): SubjectWorkspaceProjection {
    const subj = this.getSemesterSubject(subjectCodeOrQuery)
    if (!subj) {
      throw new Error(`Subject not found: ${subjectCodeOrQuery}`)
    }
    const allEntries = this.listSubjectSectionEntries(subj.code)
    const khItems = this.vault.listItems({ subject: subj.code })

    return {
      subject: subj,
      notes: allEntries.filter((e) => e.bucket === 'NOTES'),
      assignments: allEntries.filter((e) => e.bucket === 'ASSIGNMENTS'),
      answers: allEntries.filter((e) => e.bucket === 'ANSWERS'),
      resources: allEntries.filter((e) => e.bucket === 'RESOURCES'),
      revisionTasks: allEntries.filter((e) => e.bucket === 'REVISION_TASKS'),
      knowledgeHubItems: khItems,
    }
  }

  // ─── 2. iCloud Drive Inbox Folder & Watcher ────────────────────────────────

  public getInboxConfig(): InboxConfigRecord {
    const row = this.db
      .prepare("SELECT * FROM icloud_inbox_config WHERE config_key = 'DEFAULT';")
      .get() as Record<string, unknown> | undefined
    return {
      inboxFolderPath: row?.['inbox_folder_path'] ? String(row['inbox_folder_path']) : null,
      maxFileSizeBytes: Number(row?.['max_file_size_bytes'] ?? DEFAULT_MAX_FILE_SIZE_BYTES),
      watcherActive: this.watcher !== null,
      lastScanAt: row?.['last_scan_at'] ? String(row['last_scan_at']) : null,
    }
  }

  public setInboxFolder(
    folderPath: string,
    opts?: { readonly startWatcher?: boolean; readonly maxFileSizeBytes?: number }
  ): InboxConfigRecord {
    if (!folderPath || typeof folderPath !== 'string' || !folderPath.trim()) {
      throw new Error('Inbox folder path is required')
    }
    const resolved = path.resolve(folderPath.trim())
    if (!fs.existsSync(resolved)) {
      fs.mkdirSync(resolved, { recursive: true })
    }
    const stat = fs.statSync(resolved)
    if (!stat.isDirectory()) {
      throw new Error(`Selected iCloud Inbox path is not a directory: ${resolved}`)
    }

    const now = new Date().toISOString()
    const maxBytes = opts?.maxFileSizeBytes ?? this.getInboxConfig().maxFileSizeBytes

    this.db
      .prepare(`
        UPDATE icloud_inbox_config
        SET inbox_folder_path = ?, max_file_size_bytes = ?, updated_at = ?
        WHERE config_key = 'DEFAULT';
      `)
      .run(resolved, maxBytes, now)

    if (opts?.startWatcher !== false) {
      this.startWatcher(resolved)
    }

    return this.getInboxConfig()
  }

  public startWatcher(folderPath?: string): boolean {
    this.stopWatcher()
    const target = folderPath ?? this.getInboxConfig().inboxFolderPath
    if (!target || !fs.existsSync(target)) {
      return false
    }
    try {
      this.watcher = fs.watch(target, { persistent: false }, () => {
        // Trigger background reconciliation scan safely without throwing
        void this.scanAndReconcileInbox().catch(() => {})
      })
      return true
    } catch {
      this.watcher = null
      return false
    }
  }

  public stopWatcher(): void {
    if (this.watcher) {
      try {
        this.watcher.close()
      } catch {}
      this.watcher = null
    }
  }

  /**
   * Scans the configured Windows iCloud Inbox folder, safely handles incomplete/undownloaded
   * `.icloud` or zero-byte placeholder files, enforces file size limits, deduplicates by SHA-256,
   * preserves original attachments + source timestamps, and extracts Assignment Drafts.
   * Never executes imported content and never deletes original iCloud files.
   */
  public async scanAndReconcileInbox(customFolderPath?: string): Promise<InboxScanResult> {
    const config = this.getInboxConfig()
    const inboxPath = customFolderPath ? path.resolve(customFolderPath) : config.inboxFolderPath
    if (!inboxPath) {
      throw new Error('iCloud Drive Inbox folder is not configured. Select an Inbox folder first.')
    }
    if (!fs.existsSync(inboxPath)) {
      throw new Error(`Configured iCloud Drive Inbox folder does not exist: ${inboxPath}`)
    }

    const scannedAt = new Date().toISOString()
    this.db
      .prepare("UPDATE icloud_inbox_config SET last_scan_at = ?, updated_at = ? WHERE config_key = 'DEFAULT';")
      .run(scannedAt, scannedAt)

    const entries = fs.readdirSync(inboxPath, { withFileTypes: true })
    const importedRecords: InboxImportRecord[] = []
    const pendingCloudRecords: InboxImportRecord[] = []
    const duplicateSkippedRecords: InboxImportRecord[] = []
    const errorRecords: InboxImportRecord[] = []
    const createdDrafts: AssignmentDraftRecord[] = []

    for (const entry of entries) {
      if (!entry.isFile()) continue
      const fileName = entry.name
      const fullPath = path.join(inboxPath, fileName)

      const processed = await this.processSingleInboxFile(fullPath, fileName, config.maxFileSizeBytes)
      if (processed.importRecord.status === 'IMPORTED') {
        importedRecords.push(processed.importRecord)
        if (processed.draftRecord) {
          createdDrafts.push(processed.draftRecord)
        }
      } else if (processed.importRecord.status === 'PENDING_ICLOUD_DOWNLOAD') {
        pendingCloudRecords.push(processed.importRecord)
      } else if (processed.importRecord.status === 'DUPLICATE_SKIPPED') {
        duplicateSkippedRecords.push(processed.importRecord)
      } else {
        errorRecords.push(processed.importRecord)
      }
    }

    return {
      inboxFolderPath: inboxPath,
      scannedAt,
      importedRecords,
      pendingCloudRecords,
      duplicateSkippedRecords,
      errorRecords,
      createdDrafts,
    }
  }

  private async processSingleInboxFile(
    fullPath: string,
    fileName: string,
    maxFileSizeBytes: number
  ): Promise<{
    readonly importRecord: InboxImportRecord
    readonly draftRecord: AssignmentDraftRecord | null
  }> {
    const now = new Date().toISOString()
    const lowerName = fileName.toLowerCase()

    // 1. Detect incomplete / not-yet-downloaded iCloud placeholder or temporary sync files
    const isICloudPlaceholder =
      lowerName.endsWith('.icloud') ||
      lowerName.endsWith('.icloud.tmp') ||
      lowerName.endsWith('.part') ||
      lowerName.endsWith('.crdownload') ||
      lowerName.startsWith('~$')

    let stat: fs.Stats
    try {
      stat = fs.statSync(fullPath)
    } catch (err) {
      return {
        importRecord: this.upsertPendingOrErrorImport({
          sourceFileName: fileName,
          sourceFilePath: fullPath,
          sourceKind: 'UNSUPPORTED',
          status: 'PENDING_ICLOUD_DOWNLOAD',
          fileSizeBytes: 0,
          sourceModifiedAt: now,
          errorMessage: `File is temporarily locked or syncing from iCloud: ${(err as Error).message}`,
        }),
        draftRecord: null,
      }
    }

    const sourceModifiedAt = new Date(stat.mtimeMs).toISOString()

    if (isICloudPlaceholder || stat.size === 0) {
      return {
        importRecord: this.upsertPendingOrErrorImport({
          sourceFileName: fileName,
          sourceFilePath: fullPath,
          sourceKind: this.detectSourceKind(fileName),
          status: 'PENDING_ICLOUD_DOWNLOAD',
          fileSizeBytes: stat.size,
          sourceModifiedAt,
          errorMessage: isICloudPlaceholder
            ? 'File is an undownloaded iCloud placeholder (.icloud). Waiting for iCloud for Windows to finish downloading.'
            : 'File size is 0 bytes (incomplete iCloud sync). Will retry automatically on next scan.',
        }),
        draftRecord: null,
      }
    }

    // 2. Enforce file size limit
    if (stat.size > maxFileSizeBytes) {
      return {
        importRecord: this.upsertPendingOrErrorImport({
          sourceFileName: fileName,
          sourceFilePath: fullPath,
          sourceKind: this.detectSourceKind(fileName),
          status: 'ERROR_SIZE_LIMIT',
          fileSizeBytes: stat.size,
          sourceModifiedAt,
          errorMessage: `File size (${stat.size} bytes) exceeds Inbox safety limit (${maxFileSizeBytes} bytes).`,
        }),
        draftRecord: null,
      }
    }

    // 3. Classify file type (never execute .exe, .bat, .ps1, .vbs, .js, etc.)
    const sourceKind = this.detectSourceKind(fileName)
    if (sourceKind === 'UNSUPPORTED') {
      return {
        importRecord: this.upsertPendingOrErrorImport({
          sourceFileName: fileName,
          sourceFilePath: fullPath,
          sourceKind: 'UNSUPPORTED',
          status: 'ERROR_UNSUPPORTED',
          fileSizeBytes: stat.size,
          sourceModifiedAt,
          errorMessage: `Unsupported or non-document file type "${path.extname(fileName)}". Only text, URLs, screenshots, and PDFs are imported; imported files are never executed.`,
        }),
        draftRecord: null,
      }
    }

    // 4. Read file bytes & compute SHA-256 for deterministic deduplication
    let fileBuffer: Buffer
    try {
      fileBuffer = fs.readFileSync(fullPath)
    } catch (err) {
      return {
        importRecord: this.upsertPendingOrErrorImport({
          sourceFileName: fileName,
          sourceFilePath: fullPath,
          sourceKind,
          status: 'ERROR_IO',
          fileSizeBytes: stat.size,
          sourceModifiedAt,
          errorMessage: `Failed to read Inbox file: ${(err as Error).message}`,
        }),
        draftRecord: null,
      }
    }

    const contentSha256 = createHash('sha256').update(fileBuffer).digest('hex')

    // Check if an IMPORTED record with this exact content hash already exists
    const existingImported = this.db
      .prepare(
        "SELECT * FROM icloud_inbox_imports WHERE content_sha256 = ? AND status = 'IMPORTED' ORDER BY imported_at ASC LIMIT 1;"
      )
      .get(contentSha256) as Record<string, unknown> | undefined

    if (existingImported) {
      const mappedExisting = this.mapImportRow(existingImported)
      const duplicateRecord: InboxImportRecord = {
        ...mappedExisting,
        status: 'DUPLICATE_SKIPPED',
        errorMessage: `Duplicate of already-imported source (${mappedExisting.importId}); skipped without creating duplicate assignment.`,
      }
      return {
        importRecord: duplicateRecord,
        draftRecord: mappedExisting.draftId ? this.getAssignmentDraft(mappedExisting.draftId) : null,
      }
    }

    // 5. Preserve original attachment in GRAVITAS attachment storage with original mtime preserved
    const importId = `imp_${randomUUID()}`
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
    const preservedAttachmentPath = path.join(this.attachmentsDir, `${importId}_${safeName}`)
    fs.writeFileSync(preservedAttachmentPath, fileBuffer)
    try {
      const mtimeDate = new Date(stat.mtimeMs)
      fs.utimesSync(preservedAttachmentPath, mtimeDate, mtimeDate)
    } catch {}

    // 6. Extract Assignment Draft from the imported material
    const draftRecord = await this.createDraftFromImportedMaterial({
      importId,
      sourceFileName: fileName,
      sourceKind,
      fileBuffer,
      preservedAttachmentPath,
      sourceModifiedAt,
    })

    // 7. Persist import record
    this.db
      .prepare(`
        INSERT INTO icloud_inbox_imports (
          import_id, source_file_name, source_file_path, source_kind, status,
          content_sha256, file_size_bytes, source_modified_at, preserved_attachment_path,
          retry_count, error_message, draft_id, imported_at, updated_at
        ) VALUES (?, ?, ?, ?, 'IMPORTED', ?, ?, ?, ?, 0, NULL, ?, ?, ?);
      `)
      .run(
        importId,
        fileName,
        fullPath,
        sourceKind,
        contentSha256,
        stat.size,
        sourceModifiedAt,
        preservedAttachmentPath,
        draftRecord.draftId,
        now,
        now
      )

    return {
      importRecord: this.getInboxImport(importId)!,
      draftRecord,
    }
  }

  private detectSourceKind(fileName: string): InboxSourceKind {
    const cleanName = fileName.toLowerCase().replace(/\.icloud$/, '')
    const ext = path.extname(cleanName)
    if (ext === '.txt' || ext === '.md' || ext === '.text') return 'TEXT'
    if (ext === '.url' || ext === '.webloc') return 'URL'
    if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') return 'SCREENSHOT'
    if (ext === '.pdf') return 'PDF'
    return 'UNSUPPORTED'
  }

  private upsertPendingOrErrorImport(input: {
    readonly sourceFileName: string
    readonly sourceFilePath: string
    readonly sourceKind: InboxSourceKind
    readonly status: InboxImportStatus
    readonly fileSizeBytes: number
    readonly sourceModifiedAt: string
    readonly errorMessage: string
  }): InboxImportRecord {
    const now = new Date().toISOString()
    const existing = this.db
      .prepare(
        "SELECT * FROM icloud_inbox_imports WHERE source_file_path = ? AND status != 'IMPORTED' ORDER BY updated_at DESC LIMIT 1;"
      )
      .get(input.sourceFilePath) as Record<string, unknown> | undefined

    if (existing) {
      const importId = String(existing['import_id'])
      const nextRetry = Number(existing['retry_count'] ?? 0) + 1
      this.db
        .prepare(`
          UPDATE icloud_inbox_imports
          SET status = ?, file_size_bytes = ?, source_modified_at = ?, retry_count = ?, error_message = ?, updated_at = ?
          WHERE import_id = ?;
        `)
        .run(
          input.status,
          input.fileSizeBytes,
          input.sourceModifiedAt,
          nextRetry,
          input.errorMessage,
          now,
          importId
        )
      return this.getInboxImport(importId)!
    }

    const importId = `imp_${randomUUID()}`
    this.db
      .prepare(`
        INSERT INTO icloud_inbox_imports (
          import_id, source_file_name, source_file_path, source_kind, status,
          content_sha256, file_size_bytes, source_modified_at, preserved_attachment_path,
          retry_count, error_message, draft_id, imported_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, NULL, ?, ?, NULL, 1, ?, NULL, ?, ?);
      `)
      .run(
        importId,
        input.sourceFileName,
        input.sourceFilePath,
        input.sourceKind,
        input.status,
        input.fileSizeBytes,
        input.sourceModifiedAt,
        input.errorMessage,
        now,
        now
      )
    return this.getInboxImport(importId)!
  }

  // ─── 3. Assignment Detection & Task Draft Creation ─────────────────────────

  private async createDraftFromImportedMaterial(input: {
    readonly importId: string
    readonly sourceFileName: string
    readonly sourceKind: InboxSourceKind
    readonly fileBuffer: Buffer
    readonly preservedAttachmentPath: string
    readonly sourceModifiedAt: string
  }): Promise<AssignmentDraftRecord> {
    const draftId = `draft_${randomUUID()}`
    const now = new Date().toISOString()
    const baseTitleFromFilename = path
      .basename(input.sourceFileName, path.extname(input.sourceFileName))
      .replace(/[-_]+/g, ' ')
      .trim()

    let extractedText: string | null = null
    let extractionStatus: ExtractionReviewStatus = 'EXTRACTED'
    let extractionNote = 'Deterministic text extraction succeeded.'

    if (input.sourceKind === 'TEXT') {
      extractedText = input.fileBuffer.toString('utf8').trim()
      if (!extractedText) {
        extractionStatus = 'NEEDS_MANUAL_REVIEW'
        extractionNote = 'Text file was empty; needs manual review.'
      }
    } else if (input.sourceKind === 'URL') {
      const rawUrlContent = input.fileBuffer.toString('utf8').trim()
      const urlMatch = rawUrlContent.match(/URL=(.+)/i) || rawUrlContent.match(/(https?:\/\/[^\s"<]+)/i)
      extractedText = urlMatch && urlMatch[1] ? `URL Source: ${urlMatch[1].trim()}\n${rawUrlContent}` : rawUrlContent
      extractionNote = 'Extracted URL reference from Inbox shortcut.'
    } else if (input.sourceKind === 'PDF') {
      const pdfText = extractLocalPdfText(input.fileBuffer)
      if (pdfText) {
        extractedText = pdfText
        extractionStatus = 'EXTRACTED'
        extractionNote = 'Extracted text locally from PDF stream.'
      } else {
        extractedText = null
        extractionStatus = 'NEEDS_MANUAL_REVIEW'
        extractionNote = 'Needs manual review: PDF does not contain extractable plain text streams (attachment preserved).'
      }
    } else if (input.sourceKind === 'SCREENSHOT') {
      if (this.localImageOcr) {
        try {
          const ocrText = await this.localImageOcr(input.preservedAttachmentPath)
          if (ocrText && ocrText.trim()) {
            extractedText = ocrText.trim()
            extractionStatus = 'EXTRACTED'
            extractionNote = 'Extracted text via local image OCR.'
          }
        } catch {}
      }
      if (!extractedText) {
        extractionStatus = 'NEEDS_MANUAL_REVIEW'
        extractionNote = 'Needs manual review: Screenshot attachment preserved; no fabricated OCR text.'
      }
    }

    const combinedTextForClassification = [baseTitleFromFilename, extractedText ?? ''].join('\n').trim()
    const subjects = this.listSemesterSubjects()
    const subjectClassification = classifySubjectFromText(combinedTextForClassification, subjects)
    const deadlineInfo = extractedText
      ? extractDeadlineFromText(extractedText)
      : { extractedDueDate: null, relativeDeadlineExpression: null, dueDateConfirmationRequired: true }
    const subtasks = extractedText ? extractSubtasksFromText(extractedText) : []

    // Derive clean title from first heading/title line or filename
    let derivedTitle = baseTitleFromFilename || 'Imported Assignment'
    if (extractedText) {
      const firstLine = extractedText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .find((l) => l.length > 0)
      if (firstLine) {
        derivedTitle = firstLine
          .replace(/^#+\s*/, '')
          .replace(/^(?:assignment|homework|lab|title)\s*[:\-]\s*/i, '')
          .trim()
          .slice(0, 120)
      }
    }

    let suggestedSubjectCode = subjectClassification.suggestedSubjectCode
    let subjectConfirmationRequired = subjectClassification.confirmationRequired
    let subjectConfidence = subjectClassification.confidence

    // Optional authorized local AI enrichment if configured
    if (this.localAiExtractor && extractedText) {
      try {
        const aiSuggestion = await this.localAiExtractor({
          rawText: extractedText,
          sourceFileName: input.sourceFileName,
        })
        if (aiSuggestion?.suggestedSubjectCode && !suggestedSubjectCode) {
          suggestedSubjectCode = aiSuggestion.suggestedSubjectCode
          subjectConfidence = 'AMBIGUOUS'
          subjectConfirmationRequired = true
        }
      } catch {}
    }

    const teacherInstructions =
      extractedText !== null
        ? extractedText
        : `[Needs manual review — see preserved attachment: ${path.basename(input.preservedAttachmentPath)}]`

    this.db
      .prepare(`
        INSERT INTO assignment_drafts (
          draft_id, import_id, title, suggested_subject_code, candidate_subjects_json,
          subject_confidence, subject_confirmation_required, teacher_instructions,
          extracted_due_date, relative_deadline_expression, due_date_confirmation_required,
          subtasks_json, source_kind, extraction_status, extraction_note,
          original_attachment_path, source_modified_at, promoted_assignment_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?);
      `)
      .run(
        draftId,
        input.importId,
        derivedTitle,
        suggestedSubjectCode,
        JSON.stringify(subjectClassification.candidateSubjects),
        subjectConfidence,
        subjectConfirmationRequired ? 1 : 0,
        teacherInstructions,
        deadlineInfo.extractedDueDate,
        deadlineInfo.relativeDeadlineExpression,
        deadlineInfo.dueDateConfirmationRequired ? 1 : 0,
        JSON.stringify(subtasks),
        input.sourceKind,
        extractionStatus,
        extractionNote,
        input.preservedAttachmentPath,
        input.sourceModifiedAt,
        now,
        now
      )

    return this.getAssignmentDraft(draftId)!
  }

  public getInboxImport(importId: string): InboxImportRecord | null {
    const row = this.db
      .prepare('SELECT * FROM icloud_inbox_imports WHERE import_id = ?;')
      .get(importId) as Record<string, unknown> | undefined
    return row ? this.mapImportRow(row) : null
  }

  public listInboxImports(): readonly InboxImportRecord[] {
    const rows = this.db
      .prepare('SELECT * FROM icloud_inbox_imports ORDER BY imported_at DESC;')
      .all() as Array<Record<string, unknown>>
    return rows.map((r) => this.mapImportRow(r))
  }

  public getAssignmentDraft(draftId: string): AssignmentDraftRecord | null {
    const row = this.db
      .prepare('SELECT * FROM assignment_drafts WHERE draft_id = ?;')
      .get(draftId) as Record<string, unknown> | undefined
    return row ? this.mapDraftRow(row) : null
  }

  public listAssignmentDrafts(): readonly AssignmentDraftRecord[] {
    const rows = this.db
      .prepare('SELECT * FROM assignment_drafts ORDER BY created_at DESC;')
      .all() as Array<Record<string, unknown>>
    return rows.map((r) => this.mapDraftRow(r))
  }

  public markDraftPromoted(draftId: string, assignmentId: string): AssignmentDraftRecord {
    const now = new Date().toISOString()
    this.db
      .prepare('UPDATE assignment_drafts SET promoted_assignment_id = ?, updated_at = ? WHERE draft_id = ?;')
      .run(assignmentId, now, draftId)
    return this.getAssignmentDraft(draftId)!
  }

  private mapSubjectRow(row: Record<string, unknown>): SemesterSubjectRecord {
    let keywords: string[] = []
    try {
      keywords = JSON.parse(String(row['keywords_json'] ?? '[]'))
    } catch {}
    return {
      code: String(row['code']),
      name: String(row['name']),
      credits: Number(row['credits'] ?? 0),
      keywords,
      notes: String(row['notes'] ?? ''),
      createdAt: String(row['created_at']),
      updatedAt: String(row['updated_at']),
    }
  }

  private mapSectionEntryRow(row: Record<string, unknown>): SubjectSectionEntryRecord {
    return {
      entryId: String(row['entry_id']),
      subjectCode: String(row['subject_code']),
      bucket: String(row['bucket']) as SubjectSectionBucket,
      title: String(row['title']),
      originalContent: String(row['original_content']),
      generatedOrEditedContent:
        row['generated_or_edited_content'] !== null && row['generated_or_edited_content'] !== undefined
          ? String(row['generated_or_edited_content'])
          : null,
      linkedAssignmentId:
        row['linked_assignment_id'] !== null && row['linked_assignment_id'] !== undefined
          ? String(row['linked_assignment_id'])
          : null,
      attachmentPath:
        row['attachment_path'] !== null && row['attachment_path'] !== undefined
          ? String(row['attachment_path'])
          : null,
      createdAt: String(row['created_at']),
      updatedAt: String(row['updated_at']),
    }
  }

  private mapImportRow(row: Record<string, unknown>): InboxImportRecord {
    return {
      importId: String(row['import_id']),
      sourceFileName: String(row['source_file_name']),
      sourceFilePath: String(row['source_file_path']),
      sourceKind: String(row['source_kind']) as InboxSourceKind,
      status: String(row['status']) as InboxImportStatus,
      contentSha256:
        row['content_sha256'] !== null && row['content_sha256'] !== undefined
          ? String(row['content_sha256'])
          : null,
      fileSizeBytes: Number(row['file_size_bytes'] ?? 0),
      sourceModifiedAt: String(row['source_modified_at']),
      preservedAttachmentPath:
        row['preserved_attachment_path'] !== null && row['preserved_attachment_path'] !== undefined
          ? String(row['preserved_attachment_path'])
          : null,
      retryCount: Number(row['retry_count'] ?? 0),
      errorMessage:
        row['error_message'] !== null && row['error_message'] !== undefined
          ? String(row['error_message'])
          : null,
      draftId:
        row['draft_id'] !== null && row['draft_id'] !== undefined ? String(row['draft_id']) : null,
      importedAt: String(row['imported_at']),
      updatedAt: String(row['updated_at']),
    }
  }

  private mapDraftRow(row: Record<string, unknown>): AssignmentDraftRecord {
    let candidateSubjects: string[] = []
    let subtasks: string[] = []
    try {
      candidateSubjects = JSON.parse(String(row['candidate_subjects_json'] ?? '[]'))
    } catch {}
    try {
      subtasks = JSON.parse(String(row['subtasks_json'] ?? '[]'))
    } catch {}
    return {
      draftId: String(row['draft_id']),
      importId: String(row['import_id']),
      title: String(row['title']),
      suggestedSubjectCode:
        row['suggested_subject_code'] !== null && row['suggested_subject_code'] !== undefined
          ? String(row['suggested_subject_code'])
          : null,
      candidateSubjects,
      subjectConfidence: String(row['subject_confidence']) as 'HIGH' | 'AMBIGUOUS' | 'UNKNOWN',
      subjectConfirmationRequired: Number(row['subject_confirmation_required'] ?? 1) === 1,
      teacherInstructions: String(row['teacher_instructions']),
      extractedDueDate:
        row['extracted_due_date'] !== null && row['extracted_due_date'] !== undefined
          ? String(row['extracted_due_date'])
          : null,
      relativeDeadlineExpression:
        row['relative_deadline_expression'] !== null && row['relative_deadline_expression'] !== undefined
          ? String(row['relative_deadline_expression'])
          : null,
      dueDateConfirmationRequired: Number(row['due_date_confirmation_required'] ?? 1) === 1,
      subtasks,
      sourceKind: String(row['source_kind']) as InboxSourceKind,
      extractionStatus: String(row['extraction_status']) as ExtractionReviewStatus,
      extractionNote: String(row['extraction_note']),
      originalAttachmentPath:
        row['original_attachment_path'] !== null && row['original_attachment_path'] !== undefined
          ? String(row['original_attachment_path'])
          : null,
      sourceModifiedAt: String(row['source_modified_at']),
      promotedAssignmentId:
        row['promoted_assignment_id'] !== null && row['promoted_assignment_id'] !== undefined
          ? String(row['promoted_assignment_id'])
          : null,
      createdAt: String(row['created_at']),
      updatedAt: String(row['updated_at']),
    }
  }
}
