/**
 * GRAVITAS Wave V1-G-01 — iPhone Assignment Inbox + 7-Subject Study Guardian Test Suite
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, writeFile, utimes } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  IdeasVaultStore,
  ICloudAssignmentInbox,
  SEVEN_SEMESTER_SUBJECTS,
} from './index.js'

describe('GRAVITAS Wave V1-G-01 — 7-Subject Seeding, iCloud Drive Inbox & Assignment Detection (Slice 1)', () => {
  let tempDir: string
  let inboxDir: string

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'gravitas-v1g01-s1-'))
    inboxDir = join(tempDir, 'iCloudDrive', 'GRAVITAS', 'Inbox')
  })

  afterEach(async () => {
    try {
      await rm(tempDir, { recursive: true, force: true })
    } catch {}
  })

  it('1. Seeds the 7 real semester subjects idempotently, supports editing, provides all 5 buckets, and preserves existing Knowledge Hub items across restarts', () => {
    const vault1 = new IdeasVaultStore(tempDir)
    const savedIdea = vault1.saveIdea({
      title: 'Existing Study Planner Idea',
      originalText: 'Preserve existing Knowledge Hub content across restarts.',
    })

    const inbox1 = new ICloudAssignmentInbox({ vault: vault1, dataRoot: tempDir })
    const subjects1 = inbox1.listSemesterSubjects()
    expect(subjects1).toHaveLength(7)

    const expectedMap = new Map(SEVEN_SEMESTER_SUBJECTS.map((s) => [s.code, s]))
    for (const s of subjects1) {
      const exp = expectedMap.get(s.code as any)
      expect(exp).toBeDefined()
      expect(s.name).toBe(exp!.name)
      expect(s.credits).toBe(exp!.credits)
    }

    // Edit a subject record
    const updatedAlgo = inbox1.updateSemesterSubject({
      code: 'CSE 2631',
      notes: 'Focus on recurrence relations, dynamic programming, and graph algorithms.',
    })
    expect(updatedAlgo.notes).toContain('dynamic programming')

    // Populate all 5 buckets in CSE 2631: Notes, Assignments, Answers, Resources, Revision Tasks
    inbox1.addSubjectSectionEntry({
      subjectCode: 'CSE 2631',
      bucket: 'NOTES',
      title: 'Master Theorem Lecture Notes',
      originalContent: 'T(n) = aT(n/b) + f(n)',
    })
    inbox1.addSubjectSectionEntry({
      subjectCode: 'CSE 2631',
      bucket: 'ASSIGNMENTS',
      title: 'Problem Set 2: Divide and Conquer',
      originalContent: 'Solve recurrence relations for Strassen and Karatsuba.',
    })
    inbox1.addSubjectSectionEntry({
      subjectCode: 'CSE 2631',
      bucket: 'ANSWERS',
      title: 'Draft Solution for Problem Set 2',
      originalContent: 'Solve recurrence relations for Strassen and Karatsuba.',
      generatedOrEditedContent: 'For Strassen, a=7, b=2, so T(n) = O(n^log2(7)).',
    })
    inbox1.addSubjectSectionEntry({
      subjectCode: 'CSE 2631',
      bucket: 'RESOURCES',
      title: 'CLRS Chapter 4 Reference',
      originalContent: 'Introduction to Algorithms, 4th Edition, Chapter 4',
    })
    inbox1.addSubjectSectionEntry({
      subjectCode: 'CSE 2631',
      bucket: 'REVISION_TASKS',
      title: 'Revise Master Theorem Cases 1-3',
      originalContent: 'Practice 5 recurrence problems before quiz.',
    })

    const workspace = inbox1.getSubjectWorkspace('Algorithms')
    expect(workspace.subject.code).toBe('CSE 2631')
    expect(workspace.notes).toHaveLength(1)
    expect(workspace.assignments).toHaveLength(1)
    expect(workspace.answers).toHaveLength(1)
    expect(workspace.resources).toHaveLength(1)
    expect(workspace.revisionTasks).toHaveLength(1)
    expect(workspace.knowledgeHubItems.length).toBeGreaterThanOrEqual(2)

    vault1.close()

    // Re-open (simulate app restart) and verify zero duplication and preserved edits + Knowledge Hub content
    const vault2 = new IdeasVaultStore(tempDir)
    const inbox2 = new ICloudAssignmentInbox({ vault: vault2, dataRoot: tempDir })
    const subjects2 = inbox2.listSemesterSubjects()
    expect(subjects2).toHaveLength(7)
    expect(inbox2.getSemesterSubject('CSE 2631')?.notes).toContain('dynamic programming')
    expect(vault2.getIdea(savedIdea.id)?.originalText).toBe(
      'Preserve existing Knowledge Hub content across restarts.'
    )
    vault2.close()
  })

  it('2. iCloud Drive Inbox safely handles .icloud placeholders, zero-byte files, size limits, SHA-256 deduplication, attachment preservation, and never deletes original files', async () => {
    const vault = new IdeasVaultStore(tempDir)
    const inbox = new ICloudAssignmentInbox({ vault, dataRoot: tempDir })

    // Configure Inbox folder with a 4 KB max size limit for testing size limit enforcement
    const cfg = inbox.setInboxFolder(inboxDir, { startWatcher: false, maxFileSizeBytes: 4096 })
    expect(cfg.inboxFolderPath).toBe(inboxDir)

    // A) Incomplete .icloud placeholder file & zero-byte file
    const placeholderPath = join(inboxDir, '.Algo_HW1.pdf.icloud')
    const zeroBytePath = join(inboxDir, 'Syncing_Notes.txt')
    await writeFile(placeholderPath, 'icloud-placeholder-metadata')
    await writeFile(zeroBytePath, '')

    // B) Oversized file (> 4096 bytes)
    const oversizedPath = join(inboxDir, 'Huge_Dataset.txt')
    await writeFile(oversizedPath, 'X'.repeat(5000))

    // C) Unsupported executable file (must never execute or import)
    const exePath = join(inboxDir, 'untrusted_script.bat')
    await writeFile(exePath, '@echo off\r\necho should never run')

    // D) Valid assignment text file with custom source timestamp
    const validAssignmentPath = join(inboxDir, 'CSE2631_Assignment_1.txt')
    const assignmentContent = [
      'Title: Assignment 1 — Recurrence Relations and Quicksort Analysis',
      'Course: CSE 2631 Algorithms Analysis and Design 1',
      'Due: 2026-10-25',
      'Instructions:',
      '1. Prove the Master Theorem bound for T(n) = 2T(n/2) + n log n.',
      '2. Analyze worst-case and average-case complexity of Quicksort.',
    ].join('\n')
    await writeFile(validAssignmentPath, assignmentContent, 'utf8')
    const customMtime = new Date('2026-10-12T15:30:00.000Z')
    await utimes(validAssignmentPath, customMtime, customMtime)

    // Run first scan
    const scan1 = await inbox.scanAndReconcileInbox()
    expect(scan1.importedRecords).toHaveLength(1)
    expect(scan1.pendingCloudRecords).toHaveLength(2) // .icloud and 0-byte file
    expect(scan1.errorRecords).toHaveLength(2) // oversized + .bat unsupported
    expect(scan1.createdDrafts).toHaveLength(1)

    const imp = scan1.importedRecords[0]!
    expect(imp.sourceFileName).toBe('CSE2631_Assignment_1.txt')
    expect(imp.sourceModifiedAt).toBe(customMtime.toISOString())
    expect(imp.preservedAttachmentPath).toBeTruthy()
    expect(existsSync(imp.preservedAttachmentPath!)).toBe(true)
    // Original iCloud file is NEVER deleted automatically
    expect(existsSync(validAssignmentPath)).toBe(true)

    // Re-scan identical Inbox folder -> must skip duplicate and NEVER create a second draft
    const scan2 = await inbox.scanAndReconcileInbox()
    expect(scan2.importedRecords).toHaveLength(0)
    expect(scan2.duplicateSkippedRecords).toHaveLength(1)
    expect(scan2.createdDrafts).toHaveLength(0)
    expect(inbox.listAssignmentDrafts()).toHaveLength(1)

    // Pending cloud files incremented retry count safely
    const pendingRetry = scan2.pendingCloudRecords.find((r) => r.sourceFileName === '.Algo_HW1.pdf.icloud')
    expect(pendingRetry?.retryCount).toBe(2)

    vault.close()
  })

  it('3. Assignment Detection extracts explicit deadlines, flags relative deadlines ("next week") and ambiguous subjects for confirmation, extracts readable PDFs, and marks screenshots "Needs manual review"', async () => {
    const vault = new IdeasVaultStore(tempDir)
    const inbox = new ICloudAssignmentInbox({ vault, dataRoot: tempDir })
    inbox.setInboxFolder(inboxDir, { startWatcher: false })

    // 1) Relative deadline ("next week") + ambiguous subject (mentions both Data Science pandas and Probability variance)
    const relativeAmbiguousPath = join(inboxDir, 'Lab_Task.txt')
    await writeFile(
      relativeAmbiguousPath,
      [
        'Lab Task: Exploratory Data Analysis and Variance Calculation',
        'Due next week',
        '- Load CSV dataset using pandas dataframe',
        '- Compute sample variance and normal distribution fit',
      ].join('\n'),
      'utf8'
    )

    // 2) Readable PDF with explicit text stream
    const readablePdfPath = join(inboxDir, 'MTH2787_AI_Search.pdf')
    const pdfContent = [
      '%PDF-1.4',
      '1 0 obj << /Type /Catalog >> endobj',
      '2 0 obj << /Length 120 >>',
      'stream',
      'BT (MTH 2787 Assignment: A* Search and Minimax Alpha-Beta Pruning) Tj (Due: 2026-10-28) Tj (- Implement A* heuristic) Tj ET',
      'endstream',
      'endobj',
      '%%EOF',
    ].join('\n')
    await writeFile(readablePdfPath, pdfContent, 'latin1')

    // 3) Screenshot PNG (no OCR extractor configured -> must preserve attachment and mark NEEDS_MANUAL_REVIEW without fabricating text)
    const screenshotPath = join(inboxDir, 'whiteboard_homework.png')
    await writeFile(screenshotPath, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01]))

    const scan = await inbox.scanAndReconcileInbox()
    expect(scan.createdDrafts).toHaveLength(3)

    const drafts = inbox.listAssignmentDrafts()
    const labDraft = drafts.find((d) => d.title.includes('Exploratory Data Analysis'))!
    expect(labDraft).toBeDefined()
    // Relative deadline "next week" must NOT invent a due date
    expect(labDraft.extractedDueDate).toBeNull()
    expect(labDraft.relativeDeadlineExpression?.toLowerCase()).toBe('next week')
    expect(labDraft.dueDateConfirmationRequired).toBe(true)
    expect(labDraft.subjectConfirmationRequired).toBe(true)
    expect(labDraft.subtasks).toHaveLength(2)

    const pdfDraft = drafts.find((d) => d.sourceKind === 'PDF')!
    expect(pdfDraft.extractionStatus).toBe('EXTRACTED')
    expect(pdfDraft.suggestedSubjectCode).toBe('MTH 2787')
    expect(pdfDraft.extractedDueDate).toBe('2026-10-28')
    expect(pdfDraft.dueDateConfirmationRequired).toBe(false)

    const screenshotDraft = drafts.find((d) => d.sourceKind === 'SCREENSHOT')!
    expect(screenshotDraft.extractionStatus).toBe('NEEDS_MANUAL_REVIEW')
    expect(screenshotDraft.extractionNote).toContain('Needs manual review')
    expect(screenshotDraft.originalAttachmentPath).toBeTruthy()
    expect(existsSync(screenshotDraft.originalAttachmentPath!)).toBe(true)

    vault.close()
  })
})
