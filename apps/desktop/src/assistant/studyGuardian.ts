/**
 * GRAVITAS V1-G-01 — Study Guardian & Study Answers Engine
 *
 * Implements:
 * 4. Study Guardian:
 *    - Persistent assignments with TODO / IN_PROGRESS / COMPLETED status
 *    - Confirmed due date, progress from 0 to 100%, and subject association
 *    - Configurable reminder interval, snooze, pause, and quiet hours
 *    - Reminder history and deterministic deduplication (never spams repeated notifications)
 *    - Startup / active-Windows-session unfinished task briefing
 *    - Stops all follow-ups immediately after completion
 * 5. Study Answers:
 *    - "Prepare answer draft" action using an authorized local model when available
 *    - Manual "Copy for ChatGPT/Claude" prompt workflow when no local model is available
 *    - Paste-back answer persistence under the correct subject
 *    - Strict separation between original teacher material and drafted/AI answer text
 *    - Never marks an assignment completed or submitted merely because an answer was generated/pasted
 */

import type { DatabaseSync } from 'node:sqlite'
import { randomUUID } from 'node:crypto'
import type { IdeasVaultStore } from './ideasVault.js'
import {
  type ICloudAssignmentInbox,
  type AssignmentDraftRecord,
  resolveSemesterSubjectQuery,
} from './icloudInbox.js'

export type StudyAssignmentStatus = 'TODO' | 'IN_PROGRESS' | 'COMPLETED'

export interface StudyAssignmentRecord {
  readonly assignmentId: string
  readonly draftId: string | null
  readonly importId: string | null
  readonly title: string
  readonly subjectCode: string
  readonly teacherInstructions: string
  readonly subtasks: readonly string[]
  readonly originalAttachmentPath: string | null
  readonly status: StudyAssignmentStatus
  readonly dueDate: string
  readonly progressPercent: number
  readonly reminderIntervalMinutes: number
  readonly snoozedUntil: string | null
  readonly paused: boolean
  readonly quietHoursStart: string
  readonly quietHoursEnd: string
  readonly createdAt: string
  readonly updatedAt: string
  readonly completedAt: string | null
}

export interface AssignmentReminderRecord {
  readonly reminderId: string
  readonly assignmentId: string
  readonly reminderKind: 'DEADLINE_APPROACHING' | 'PROGRESS_CHECKIN' | 'SESSION_RESUME'
  readonly dedupKey: string
  readonly message: string
  readonly triggeredAt: string
}

export interface StudyAnswerRecord {
  readonly answerId: string
  readonly assignmentId: string
  readonly subjectCode: string
  readonly title: string
  readonly teacherInstructionsVerbatim: string
  readonly answerDraftText: string
  readonly provenance: 'AUTHORIZED_LOCAL_MODEL' | 'PASTED_EXTERNAL_OR_USER'
  readonly modelId: string | null
  readonly createdAt: string
  readonly updatedAt: string
}

export interface PrepareAnswerDraftResult {
  readonly assignmentId: string
  readonly subjectCode: string
  readonly mode: 'GENERATED_BY_LOCAL_MODEL' | 'MANUAL_COPY_FOR_EXTERNAL_AI'
  readonly teacherInstructionsVerbatim: string
  readonly copyForExternalAiPrompt: string
  readonly savedAnswer: StudyAnswerRecord | null
  readonly assignmentStatusUnchanged: StudyAssignmentStatus
  readonly message: string
}

export interface ReminderEvaluationResult {
  readonly evaluatedAt: string
  readonly quietHoursActive: boolean
  readonly triggeredReminders: readonly AssignmentReminderRecord[]
  readonly deduplicatedSkippedCount: number
  readonly completedSkippedCount: number
  readonly snoozedOrPausedSkippedCount: number
}

export interface SessionBriefingResult {
  readonly generatedAt: string
  readonly trigger: 'APP_STARTUP' | 'WINDOWS_SESSION_ACTIVE'
  readonly unfinishedAssignments: readonly StudyAssignmentRecord[]
  readonly dueThisWeekAssignments: readonly StudyAssignmentRecord[]
  readonly summaryMessage: string
}

export type AuthorizedLocalAnswerGenerator = (input: {
  readonly assignment: StudyAssignmentRecord
  readonly prompt: string
}) => Promise<{ readonly answerText: string; readonly modelId: string } | null>

const STUDY_GUARDIAN_DDL = `
CREATE TABLE IF NOT EXISTS study_assignments (
  assignment_id TEXT PRIMARY KEY,
  draft_id TEXT,
  import_id TEXT,
  title TEXT NOT NULL,
  subject_code TEXT NOT NULL,
  teacher_instructions TEXT NOT NULL,
  subtasks_json TEXT NOT NULL DEFAULT '[]',
  original_attachment_path TEXT,
  status TEXT NOT NULL CHECK (status IN ('TODO', 'IN_PROGRESS', 'COMPLETED')),
  due_date TEXT NOT NULL,
  progress_percent INTEGER NOT NULL DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  reminder_interval_minutes INTEGER NOT NULL DEFAULT 180,
  snoozed_until TEXT,
  paused INTEGER NOT NULL DEFAULT 0,
  quiet_hours_start TEXT NOT NULL DEFAULT '22:00',
  quiet_hours_end TEXT NOT NULL DEFAULT '07:00',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_study_assignments_subject ON study_assignments(subject_code);
CREATE INDEX IF NOT EXISTS idx_study_assignments_status ON study_assignments(status);
CREATE INDEX IF NOT EXISTS idx_study_assignments_due ON study_assignments(due_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_study_assignments_import_unique ON study_assignments(import_id) WHERE import_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS assignment_reminders (
  reminder_id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL,
  reminder_kind TEXT NOT NULL CHECK (reminder_kind IN ('DEADLINE_APPROACHING', 'PROGRESS_CHECKIN', 'SESSION_RESUME')),
  dedup_key TEXT NOT NULL UNIQUE,
  message TEXT NOT NULL,
  triggered_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_assignment_reminders_assignment ON assignment_reminders(assignment_id);

CREATE TABLE IF NOT EXISTS study_answers (
  answer_id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL,
  subject_code TEXT NOT NULL,
  title TEXT NOT NULL,
  teacher_instructions_verbatim TEXT NOT NULL,
  answer_draft_text TEXT NOT NULL,
  provenance TEXT NOT NULL CHECK (provenance IN ('AUTHORIZED_LOCAL_MODEL', 'PASTED_EXTERNAL_OR_USER')),
  model_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_study_answers_assignment ON study_answers(assignment_id);
CREATE INDEX IF NOT EXISTS idx_study_answers_subject ON study_answers(subject_code);
`

/**
 * Checks if a given Date falls inside a `HH:MM` -> `HH:MM` quiet-hours window in local time.
 */
export function isWithinQuietHours(
  now: Date,
  quietStart: string = '22:00',
  quietEnd: string = '07:00'
): boolean {
  const parseMinutes = (hhmm: string): number | null => {
    const m = hhmm.trim().match(/^(\d{1,2}):(\d{2})$/)
    if (!m || !m[1] || !m[2]) return null
    const h = Number(m[1])
    const min = Number(m[2])
    if (h < 0 || h > 23 || min < 0 || min > 59) return null
    return h * 60 + min
  }

  const startMins = parseMinutes(quietStart)
  const endMins = parseMinutes(quietEnd)
  if (startMins === null || endMins === null || startMins === endMins) {
    return false
  }

  const currentMins = now.getHours() * 60 + now.getMinutes()
  if (startMins < endMins) {
    return currentMins >= startMins && currentMins < endMins
  }
  // Overnight window (e.g. 22:00 to 07:00)
  return currentMins >= startMins || currentMins < endMins
}

export class StudyGuardianService {
  private readonly db: DatabaseSync
  private readonly vault: IdeasVaultStore
  private readonly inbox: ICloudAssignmentInbox
  private localAnswerGenerator?: AuthorizedLocalAnswerGenerator | undefined

  public constructor(opts: {
    readonly vault: IdeasVaultStore
    readonly inbox: ICloudAssignmentInbox
    readonly localAnswerGenerator?: AuthorizedLocalAnswerGenerator | undefined
  }) {
    this.vault = opts.vault
    this.inbox = opts.inbox
    this.db = opts.vault.getDatabase()
    this.localAnswerGenerator = opts.localAnswerGenerator
    this.initializeSchema()
  }

  private initializeSchema(): void {
    this.db.exec('BEGIN IMMEDIATE TRANSACTION;')
    try {
      this.db.exec(STUDY_GUARDIAN_DDL)
      this.db.exec('COMMIT;')
    } catch (err) {
      this.db.exec('ROLLBACK;')
      throw err
    }
  }

  // ─── 4. Persistent Study Assignments ───────────────────────────────────────

  /**
   * Promotes an AssignmentDraftRecord (or creates a direct assignment) after subject and exact dueDate confirmation.
   * Deduplicates by `importId` so re-importing or re-promoting the same source never creates a duplicate assignment.
   */
  public createOrConfirmAssignment(input: {
    readonly draftId?: string | undefined
    readonly title?: string | undefined
    readonly confirmedSubjectCode: string
    readonly confirmedDueDate: string
    readonly teacherInstructions?: string | undefined
    readonly subtasks?: readonly string[] | undefined
    readonly reminderIntervalMinutes?: number | undefined
    readonly quietHoursStart?: string | undefined
    readonly quietHoursEnd?: string | undefined
  }): StudyAssignmentRecord {
    if (!input.confirmedSubjectCode || !input.confirmedSubjectCode.trim()) {
      throw new Error('Confirmed subject is required to create a Study Guardian assignment.')
    }
    if (!input.confirmedDueDate || !/^\d{4}-\d{2}-\d{2}$/.test(input.confirmedDueDate.trim())) {
      throw new Error(
        'An exact confirmed due date (YYYY-MM-DD) is required. Relative deadlines must be confirmed first.'
      )
    }

    let draft: AssignmentDraftRecord | null = null
    if (input.draftId) {
      draft = this.inbox.getAssignmentDraft(input.draftId)
      if (!draft) {
        throw new Error(`Assignment draft not found: ${input.draftId}`)
      }
      if (draft.promotedAssignmentId) {
        const alreadyPromoted = this.getAssignment(draft.promotedAssignmentId)
        if (alreadyPromoted) {
          return alreadyPromoted
        }
      }
      const existingByImport = this.db
        .prepare('SELECT * FROM study_assignments WHERE import_id = ? LIMIT 1;')
        .get(draft.importId) as Record<string, unknown> | undefined
      if (existingByImport) {
        return this.mapAssignmentRow(existingByImport)
      }
    }

    const canonicalSubject = resolveSemesterSubjectQuery(input.confirmedSubjectCode)
    const dueDate = input.confirmedDueDate.trim()
    const title = (input.title ?? draft?.title ?? 'Untitled Assignment').trim()
    const teacherInstructions = (
      input.teacherInstructions ??
      draft?.teacherInstructions ??
      title
    ).trim()
    const subtasks = input.subtasks ?? draft?.subtasks ?? []
    const attachmentPath = draft?.originalAttachmentPath ?? null
    const reminderInterval = Math.max(5, Math.min(Number(input.reminderIntervalMinutes ?? 180), 10080))
    const quietStart = input.quietHoursStart ?? '22:00'
    const quietEnd = input.quietHoursEnd ?? '07:00'

    const assignmentId = `asgn_${randomUUID()}`
    const now = new Date().toISOString()

    this.db.exec('BEGIN IMMEDIATE TRANSACTION;')
    try {
      this.db
        .prepare(`
          INSERT INTO study_assignments (
            assignment_id, draft_id, import_id, title, subject_code,
            teacher_instructions, subtasks_json, original_attachment_path,
            status, due_date, progress_percent, reminder_interval_minutes,
            snoozed_until, paused, quiet_hours_start, quiet_hours_end,
            created_at, updated_at, completed_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'TODO', ?, 0, ?, NULL, 0, ?, ?, ?, ?, NULL);
        `)
        .run(
          assignmentId,
          draft?.draftId ?? null,
          draft?.importId ?? null,
          title,
          canonicalSubject,
          teacherInstructions,
          JSON.stringify(subtasks),
          attachmentPath,
          dueDate,
          reminderInterval,
          quietStart,
          quietEnd,
          now,
          now
        )

      if (draft) {
        this.inbox.markDraftPromoted(draft.draftId, assignmentId)
      }

      this.db.exec('COMMIT;')
    } catch (err) {
      this.db.exec('ROLLBACK;')
      throw err
    }

    // Record in subject's ASSIGNMENTS bucket and Knowledge Hub tasks
    this.inbox.addSubjectSectionEntry({
      subjectCode: canonicalSubject,
      bucket: 'ASSIGNMENTS',
      title,
      originalContent: teacherInstructions,
      linkedAssignmentId: assignmentId,
      attachmentPath,
    })

    this.vault.createTask({
      id: assignmentId,
      title,
      originalText: teacherInstructions,
      subject: canonicalSubject,
      dueDate,
      completed: false,
      taskStatus: 'TODO',
      tags: [canonicalSubject.toLowerCase().replace(/\s+/g, '-'), 'assignment'],
    })

    return this.getAssignment(assignmentId)!
  }

  public getAssignment(assignmentId: string): StudyAssignmentRecord | null {
    const row = this.db
      .prepare('SELECT * FROM study_assignments WHERE assignment_id = ?;')
      .get(assignmentId) as Record<string, unknown> | undefined
    return row ? this.mapAssignmentRow(row) : null
  }

  public listAssignments(filter?: {
    readonly subjectCode?: string | undefined
    readonly status?: StudyAssignmentStatus | undefined
    readonly unfinishedOnly?: boolean | undefined
    readonly dueBeforeOrOn?: string | undefined
  }): readonly StudyAssignmentRecord[] {
    const clauses: string[] = []
    const params: Array<string | number> = []

    if (filter?.subjectCode) {
      const canonical = resolveSemesterSubjectQuery(filter.subjectCode)
      clauses.push('(UPPER(subject_code) = UPPER(?) OR UPPER(subject_code) LIKE UPPER(?))')
      params.push(canonical, `%${filter.subjectCode.trim()}%`)
    }
    if (filter?.status) {
      clauses.push('status = ?')
      params.push(filter.status)
    }
    if (filter?.unfinishedOnly) {
      clauses.push("status != 'COMPLETED'")
    }
    if (filter?.dueBeforeOrOn) {
      clauses.push('due_date <= ?')
      params.push(filter.dueBeforeOrOn)
    }

    const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''
    const rows = this.db
      .prepare(`SELECT * FROM study_assignments ${whereSql} ORDER BY due_date ASC, created_at DESC;`)
      .all(...params) as Array<Record<string, unknown>>
    return rows.map((r) => this.mapAssignmentRow(r))
  }

  public listDueThisWeek(referenceDate: Date = new Date()): readonly StudyAssignmentRecord[] {
    const end = new Date(referenceDate.getTime())
    end.setDate(end.getDate() + 7)
    const endIso = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`
    return this.listAssignments({
      unfinishedOnly: true,
      dueBeforeOrOn: endIso,
    })
  }

  public updateAssignmentProgress(
    assignmentId: string,
    progressPercent: number
  ): StudyAssignmentRecord {
    const existing = this.getAssignment(assignmentId)
    if (!existing) {
      throw new Error(`Assignment not found: ${assignmentId}`)
    }
    const clamped = Math.max(0, Math.min(Math.round(Number(progressPercent)), 100))
    const nextStatus: StudyAssignmentStatus =
      clamped >= 100 ? 'COMPLETED' : clamped > 0 ? 'IN_PROGRESS' : 'TODO'
    const now = new Date().toISOString()
    const completedAt = nextStatus === 'COMPLETED' ? existing.completedAt ?? now : null

    this.db
      .prepare(`
        UPDATE study_assignments
        SET progress_percent = ?, status = ?, completed_at = ?, updated_at = ?
        WHERE assignment_id = ?;
      `)
      .run(clamped, nextStatus, completedAt, now, existing.assignmentId)

    try {
      this.vault.updateIdea({
        id: existing.assignmentId,
        completed: nextStatus === 'COMPLETED',
        taskStatus: nextStatus === 'COMPLETED' ? 'DONE' : nextStatus === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'TODO',
      })
    } catch {}

    return this.getAssignment(existing.assignmentId)!
  }

  public markAssignmentCompleted(assignmentId: string): StudyAssignmentRecord {
    return this.updateAssignmentProgress(assignmentId, 100)
  }

  public configureReminderSettings(input: {
    readonly assignmentId: string
    readonly reminderIntervalMinutes?: number | undefined
    readonly snoozedUntil?: string | null | undefined
    readonly paused?: boolean | undefined
    readonly quietHoursStart?: string | undefined
    readonly quietHoursEnd?: string | undefined
  }): StudyAssignmentRecord {
    const existing = this.getAssignment(input.assignmentId)
    if (!existing) {
      throw new Error(`Assignment not found: ${input.assignmentId}`)
    }
    const nextInterval =
      input.reminderIntervalMinutes !== undefined
        ? Math.max(5, Math.min(Number(input.reminderIntervalMinutes), 10080))
        : existing.reminderIntervalMinutes
    const nextSnoozed =
      input.snoozedUntil !== undefined ? input.snoozedUntil : existing.snoozedUntil
    const nextPaused = input.paused !== undefined ? (input.paused ? 1 : 0) : existing.paused ? 1 : 0
    const nextQuietStart = input.quietHoursStart ?? existing.quietHoursStart
    const nextQuietEnd = input.quietHoursEnd ?? existing.quietHoursEnd
    const now = new Date().toISOString()

    this.db
      .prepare(`
        UPDATE study_assignments
        SET reminder_interval_minutes = ?, snoozed_until = ?, paused = ?,
            quiet_hours_start = ?, quiet_hours_end = ?, updated_at = ?
        WHERE assignment_id = ?;
      `)
      .run(
        nextInterval,
        nextSnoozed,
        nextPaused,
        nextQuietStart,
        nextQuietEnd,
        now,
        existing.assignmentId
      )

    return this.getAssignment(existing.assignmentId)!
  }

  public findMatchingAssignments(
    targetQuery: string,
    unfinishedOnly = true
  ): readonly StudyAssignmentRecord[] {
    const cleaned = targetQuery.trim()
    const lower = cleaned.toLowerCase()
    const canonicalSubject = resolveSemesterSubjectQuery(cleaned)
    const all = this.listAssignments({ unfinishedOnly })

    // 1. Exact assignmentId match
    const byId = all.find((a) => a.assignmentId.toLowerCase() === lower)
    if (byId) return [byId]

    // 2. Match by subject code, title, or teacher instructions
    return all.filter((a) => {
      if (a.subjectCode.toLowerCase() === canonicalSubject.toLowerCase()) return true
      if (a.subjectCode.toLowerCase().includes(lower)) return true
      if (a.title.toLowerCase().includes(lower)) return true
      if (a.teacherInstructions.toLowerCase().includes(lower)) return true
      return false
    })
  }

  public snoozeAssignmentByExpression(
    assignmentId: string,
    whenExpression: string,
    referenceDate: Date = new Date()
  ): StudyAssignmentRecord {
    const target = new Date(referenceDate.getTime())
    const lower = whenExpression.trim().toLowerCase()

    const hoursMatch = lower.match(/in\s+(\d+)\s+hours?/)
    const minsMatch = lower.match(/in\s+(\d+)\s+min(?:ute)?s?/)

    if (hoursMatch && hoursMatch[1]) {
      target.setHours(target.getHours() + Number(hoursMatch[1]))
    } else if (minsMatch && minsMatch[1]) {
      target.setMinutes(target.getMinutes() + Number(minsMatch[1]))
    } else if (lower.includes('tomorrow')) {
      target.setDate(target.getDate() + 1)
      if (lower.includes('morning')) {
        target.setHours(9, 0, 0, 0)
      } else if (lower.includes('afternoon')) {
        target.setHours(14, 0, 0, 0)
      } else {
        // Default "tomorrow evening" -> 19:00 local
        target.setHours(19, 0, 0, 0)
      }
    } else if (lower.includes('tonight') || lower.includes('this evening')) {
      target.setHours(20, 0, 0, 0)
      if (target.getTime() <= referenceDate.getTime()) {
        target.setDate(target.getDate() + 1)
      }
    } else {
      // Default snooze +12 hours
      target.setHours(target.getHours() + 12)
    }

    return this.configureReminderSettings({
      assignmentId,
      snoozedUntil: target.toISOString(),
    })
  }

  // ─── 4b. Reminder Evaluation, Deduplication & Session Briefing ─────────────

  /**
   * Evaluates deadline reminders and progress check-ins across assignments.
   * - Stops follow-ups immediately after an assignment is COMPLETED.
   * - Respects quiet hours, pause, and snooze.
   * - Deduplicates using `dedup_key` so repeated checks never spam notifications.
   */
  public evaluateReminders(
    referenceTime: Date = new Date(),
    opts?: { readonly ignoreQuietHours?: boolean }
  ): ReminderEvaluationResult {
    const all = this.listAssignments()
    const triggeredReminders: AssignmentReminderRecord[] = []
    let deduplicatedSkippedCount = 0
    let completedSkippedCount = 0
    let snoozedOrPausedSkippedCount = 0
    let quietHoursActive = false

    const nowIso = referenceTime.toISOString()
    const nowMs = referenceTime.getTime()

    for (const asgn of all) {
      // Stop all follow-ups after completion!
      if (asgn.status === 'COMPLETED' || asgn.progressPercent >= 100) {
        completedSkippedCount++
        continue
      }

      if (asgn.paused) {
        snoozedOrPausedSkippedCount++
        continue
      }

      if (asgn.snoozedUntil && new Date(asgn.snoozedUntil).getTime() > nowMs) {
        snoozedOrPausedSkippedCount++
        continue
      }

      if (
        !opts?.ignoreQuietHours &&
        isWithinQuietHours(referenceTime, asgn.quietHoursStart, asgn.quietHoursEnd)
      ) {
        quietHoursActive = true
        continue
      }

      // Compute deterministic time bucket for this assignment's reminder interval
      const intervalMs = asgn.reminderIntervalMinutes * 60 * 1000
      const bucketIndex = Math.floor(nowMs / intervalMs)
      const dedupKey = `${asgn.assignmentId}:interval:${bucketIndex}`

      const existingReminder = this.db
        .prepare('SELECT * FROM assignment_reminders WHERE dedup_key = ? LIMIT 1;')
        .get(dedupKey) as Record<string, unknown> | undefined

      if (existingReminder) {
        deduplicatedSkippedCount++
        continue
      }

      const reminderId = `rem_${randomUUID()}`
      const reminderKind =
        asgn.progressPercent > 0 ? 'PROGRESS_CHECKIN' : 'DEADLINE_APPROACHING'
      const message = `[${asgn.subjectCode}] "${asgn.title}" is ${asgn.progressPercent}% complete (Due: ${asgn.dueDate}).`

      this.db
        .prepare(`
          INSERT INTO assignment_reminders (
            reminder_id, assignment_id, reminder_kind, dedup_key, message, triggered_at
          ) VALUES (?, ?, ?, ?, ?, ?);
        `)
        .run(reminderId, asgn.assignmentId, reminderKind, dedupKey, message, nowIso)

      triggeredReminders.push({
        reminderId,
        assignmentId: asgn.assignmentId,
        reminderKind,
        dedupKey,
        message,
        triggeredAt: nowIso,
      })
    }

    return {
      evaluatedAt: nowIso,
      quietHoursActive,
      triggeredReminders,
      deduplicatedSkippedCount,
      completedSkippedCount,
      snoozedOrPausedSkippedCount,
    }
  }

  public listReminderHistory(assignmentId?: string): readonly AssignmentReminderRecord[] {
    if (assignmentId) {
      const rows = this.db
        .prepare(
          'SELECT * FROM assignment_reminders WHERE assignment_id = ? ORDER BY triggered_at DESC;'
        )
        .all(assignmentId) as Array<Record<string, unknown>>
      return rows.map((r) => this.mapReminderRow(r))
    }
    const rows = this.db
      .prepare('SELECT * FROM assignment_reminders ORDER BY triggered_at DESC;')
      .all() as Array<Record<string, unknown>>
    return rows.map((r) => this.mapReminderRow(r))
  }

  public getSessionBriefing(
    trigger: 'APP_STARTUP' | 'WINDOWS_SESSION_ACTIVE' = 'APP_STARTUP',
    referenceDate: Date = new Date()
  ): SessionBriefingResult {
    const unfinished = this.listAssignments({ unfinishedOnly: true })
    const dueThisWeek = this.listDueThisWeek(referenceDate)
    const summaryMessage =
      unfinished.length === 0
        ? 'All Study Guardian assignments are completed.'
        : `You have ${unfinished.length} unfinished assignment(s) (${dueThisWeek.length} due within 7 days). Next due: [${unfinished[0]!.subjectCode}] "${unfinished[0]!.title}" (${unfinished[0]!.progressPercent}% done, due ${unfinished[0]!.dueDate}).`

    return {
      generatedAt: referenceDate.toISOString(),
      trigger,
      unfinishedAssignments: unfinished,
      dueThisWeekAssignments: dueThisWeek,
      summaryMessage,
    }
  }

  // ─── 5. Study Answers ("Prepare answer draft" + Paste-Back) ────────────────

  public buildExternalAiPrompt(assignment: StudyAssignmentRecord): string {
    const subtaskLines =
      assignment.subtasks.length > 0
        ? `\nSubtasks:\n${assignment.subtasks.map((s, idx) => `${idx + 1}. ${s}`).join('\n')}`
        : ''
    return [
      `Course / Subject: ${assignment.subjectCode}`,
      `Assignment Title: ${assignment.title}`,
      `Due Date: ${assignment.dueDate}`,
      '',
      '--- ORIGINAL TEACHER INSTRUCTIONS (DO NOT ALTER) ---',
      assignment.teacherInstructions,
      subtaskLines,
      '----------------------------------------------------',
      '',
      'Please prepare a structured, step-by-step study answer draft explaining the core concepts and derivations clearly.',
    ]
      .filter((line) => line !== undefined)
      .join('\n')
  }

  /**
   * Prepares an answer draft for an assignment:
   * - Uses an authorized local model if configured and available.
   * - Otherwise provides a ready-to-copy prompt for ChatGPT/Claude.
   * - Keeps original teacher material strictly separate from drafted answers.
   * - NEVER marks the assignment completed or submitted.
   */
  public async prepareAnswerDraft(assignmentId: string): Promise<PrepareAnswerDraftResult> {
    const assignment = this.getAssignment(assignmentId)
    if (!assignment) {
      throw new Error(`Assignment not found: ${assignmentId}`)
    }

    const copyPrompt = this.buildExternalAiPrompt(assignment)

    if (this.localAnswerGenerator) {
      try {
        const localGen = await this.localAnswerGenerator({
          assignment,
          prompt: copyPrompt,
        })
        if (localGen && localGen.answerText.trim()) {
          const saved = this.saveStudyAnswer({
            assignmentId: assignment.assignmentId,
            answerDraftText: localGen.answerText.trim(),
            provenance: 'AUTHORIZED_LOCAL_MODEL',
            modelId: localGen.modelId,
          })
          const refreshed = this.getAssignment(assignment.assignmentId)!
          return {
            assignmentId: assignment.assignmentId,
            subjectCode: assignment.subjectCode,
            mode: 'GENERATED_BY_LOCAL_MODEL',
            teacherInstructionsVerbatim: assignment.teacherInstructions,
            copyForExternalAiPrompt: copyPrompt,
            savedAnswer: saved,
            assignmentStatusUnchanged: refreshed.status,
            message: `Prepared answer draft via authorized local model (${localGen.modelId}) under ${assignment.subjectCode}. Assignment status remains ${refreshed.status}.`,
          }
        }
      } catch {
        // Fall through to manual copy workflow safely
      }
    }

    return {
      assignmentId: assignment.assignmentId,
      subjectCode: assignment.subjectCode,
      mode: 'MANUAL_COPY_FOR_EXTERNAL_AI',
      teacherInstructionsVerbatim: assignment.teacherInstructions,
      copyForExternalAiPrompt: copyPrompt,
      savedAnswer: null,
      assignmentStatusUnchanged: assignment.status,
      message:
        'No local model active. Prepared "Copy for ChatGPT/Claude" prompt. Paste your answer back to save it under this subject.',
    }
  }

  /**
   * Saves a pasted or generated answer draft under the assignment's subject while keeping
   * teacher instructions separate and NEVER marking the assignment completed.
   */
  public saveStudyAnswer(input: {
    readonly assignmentId: string
    readonly answerDraftText: string
    readonly title?: string | undefined
    readonly provenance?: 'AUTHORIZED_LOCAL_MODEL' | 'PASTED_EXTERNAL_OR_USER' | undefined
    readonly modelId?: string | null | undefined
  }): StudyAnswerRecord {
    const assignment = this.getAssignment(input.assignmentId)
    if (!assignment) {
      throw new Error(`Assignment not found: ${input.assignmentId}`)
    }
    if (!input.answerDraftText || !input.answerDraftText.trim()) {
      throw new Error('Answer draft text cannot be empty')
    }

    const answerId = `ans_${randomUUID()}`
    const now = new Date().toISOString()
    const title = (input.title ?? `Answer Draft: ${assignment.title}`).trim()
    const provenance = input.provenance ?? 'PASTED_EXTERNAL_OR_USER'
    const draftText = input.answerDraftText.trim()

    this.db.exec('BEGIN IMMEDIATE TRANSACTION;')
    try {
      this.db
        .prepare(`
          INSERT INTO study_answers (
            answer_id, assignment_id, subject_code, title,
            teacher_instructions_verbatim, answer_draft_text,
            provenance, model_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `)
        .run(
          answerId,
          assignment.assignmentId,
          assignment.subjectCode,
          title,
          assignment.teacherInstructions,
          draftText,
          provenance,
          input.modelId ?? null,
          now,
          now
        )

      // Also record in the subject's ANSWERS bucket (keeping originalContent = teacherInstructions separate from generatedOrEditedContent = draftText)
      this.inbox.addSubjectSectionEntry({
        subjectCode: assignment.subjectCode,
        bucket: 'ANSWERS',
        title,
        originalContent: assignment.teacherInstructions,
        generatedOrEditedContent: draftText,
        linkedAssignmentId: assignment.assignmentId,
        attachmentPath: assignment.originalAttachmentPath,
      })

      this.db.exec('COMMIT;')
    } catch (err) {
      this.db.exec('ROLLBACK;')
      throw err
    }

    return this.getStudyAnswer(answerId)!
  }

  public getStudyAnswer(answerId: string): StudyAnswerRecord | null {
    const row = this.db
      .prepare('SELECT * FROM study_answers WHERE answer_id = ?;')
      .get(answerId) as Record<string, unknown> | undefined
    return row ? this.mapAnswerRow(row) : null
  }

  public listStudyAnswers(filter?: {
    readonly assignmentId?: string | undefined
    readonly subjectCode?: string | undefined
  }): readonly StudyAnswerRecord[] {
    if (filter?.assignmentId) {
      const rows = this.db
        .prepare('SELECT * FROM study_answers WHERE assignment_id = ? ORDER BY created_at DESC;')
        .all(filter.assignmentId) as Array<Record<string, unknown>>
      return rows.map((r) => this.mapAnswerRow(r))
    }
    if (filter?.subjectCode) {
      const canonical = resolveSemesterSubjectQuery(filter.subjectCode)
      const rows = this.db
        .prepare(
          'SELECT * FROM study_answers WHERE UPPER(subject_code) = UPPER(?) ORDER BY created_at DESC;'
        )
        .all(canonical) as Array<Record<string, unknown>>
      return rows.map((r) => this.mapAnswerRow(r))
    }
    const rows = this.db
      .prepare('SELECT * FROM study_answers ORDER BY created_at DESC;')
      .all() as Array<Record<string, unknown>>
    return rows.map((r) => this.mapAnswerRow(r))
  }

  private mapAssignmentRow(row: Record<string, unknown>): StudyAssignmentRecord {
    let subtasks: string[] = []
    try {
      subtasks = JSON.parse(String(row['subtasks_json'] ?? '[]'))
    } catch {}
    return {
      assignmentId: String(row['assignment_id']),
      draftId: row['draft_id'] !== null && row['draft_id'] !== undefined ? String(row['draft_id']) : null,
      importId: row['import_id'] !== null && row['import_id'] !== undefined ? String(row['import_id']) : null,
      title: String(row['title']),
      subjectCode: String(row['subject_code']),
      teacherInstructions: String(row['teacher_instructions']),
      subtasks,
      originalAttachmentPath:
        row['original_attachment_path'] !== null && row['original_attachment_path'] !== undefined
          ? String(row['original_attachment_path'])
          : null,
      status: String(row['status']) as StudyAssignmentStatus,
      dueDate: String(row['due_date']),
      progressPercent: Number(row['progress_percent'] ?? 0),
      reminderIntervalMinutes: Number(row['reminder_interval_minutes'] ?? 180),
      snoozedUntil:
        row['snoozed_until'] !== null && row['snoozed_until'] !== undefined
          ? String(row['snoozed_until'])
          : null,
      paused: Number(row['paused'] ?? 0) === 1,
      quietHoursStart: String(row['quiet_hours_start'] ?? '22:00'),
      quietHoursEnd: String(row['quiet_hours_end'] ?? '07:00'),
      createdAt: String(row['created_at']),
      updatedAt: String(row['updated_at']),
      completedAt:
        row['completed_at'] !== null && row['completed_at'] !== undefined
          ? String(row['completed_at'])
          : null,
    }
  }

  private mapReminderRow(row: Record<string, unknown>): AssignmentReminderRecord {
    return {
      reminderId: String(row['reminder_id']),
      assignmentId: String(row['assignment_id']),
      reminderKind: String(row['reminder_kind']) as AssignmentReminderRecord['reminderKind'],
      dedupKey: String(row['dedup_key']),
      message: String(row['message']),
      triggeredAt: String(row['triggered_at']),
    }
  }

  private mapAnswerRow(row: Record<string, unknown>): StudyAnswerRecord {
    return {
      answerId: String(row['answer_id']),
      assignmentId: String(row['assignment_id']),
      subjectCode: String(row['subject_code']),
      title: String(row['title']),
      teacherInstructionsVerbatim: String(row['teacher_instructions_verbatim']),
      answerDraftText: String(row['answer_draft_text']),
      provenance: String(row['provenance']) as StudyAnswerRecord['provenance'],
      modelId:
        row['model_id'] !== null && row['model_id'] !== undefined ? String(row['model_id']) : null,
      createdAt: String(row['created_at']),
      updatedAt: String(row['updated_at']),
    }
  }
}
