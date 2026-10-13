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

describe('GRAVITAS Wave V1-G-01 — Study Guardian, Study Answers, Companion Commands & End-to-End A–J Flow (Slice 2)', () => {
  let tempDir: string
  let inboxDir: string

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'gravitas-v1g01-s2-'))
    inboxDir = join(tempDir, 'iCloudDrive', 'GRAVITAS', 'Inbox')
  })

  afterEach(async () => {
    try {
      await rm(tempDir, { recursive: true, force: true })
    } catch {}
  })

  it('4. Executes the full Required Working Demonstration (A–J) through KernelHost and DesktopSupervisor', async () => {
    const { KernelHost, DesktopSupervisor } = await import('./index.js')
    const kernelListeners: Array<(msg: unknown) => void> = []
    let host: InstanceType<typeof KernelHost>

    const bridge = {
      pid: 4242,
      postMessage(msg: unknown) {
        void host.handleMessage(msg)
      },
      on(event: string, listener: (arg: any) => void) {
        if (event === 'message') {
          kernelListeners.push(listener)
        }
      },
    }

    host = new KernelHost({
      dataRoot: tempDir,
      pid: 4242,
      onMessage: (msg) => {
        for (const l of kernelListeners) l(msg)
      },
    })

    const supervisor = new DesktopSupervisor({
      dataRoot: tempDir,
      forkProcess: () => bridge as any,
    })

    await supervisor.start()
    await host.start()

    // A. Verify all 7 subjects exist and do not duplicate after restart
    const subjRes1 = await supervisor.executeStudyGuardianOperation({
      action: 'LIST_SEMESTER_SUBJECTS',
    })
    expect(subjRes1.success).toBe(true)
    expect(subjRes1.semesterSubjects).toHaveLength(7)

    // B. Configure a local test Inbox folder representing iCloud Drive/GRAVITAS/Inbox
    const cfgRes = await supervisor.executeStudyGuardianOperation({
      action: 'SET_INBOX_FOLDER',
      folderPath: inboxDir,
      startWatcher: false,
    })
    expect(cfgRes.success).toBe(true)
    expect(cfgRes.inboxConfig?.inboxFolderPath).toBe(inboxDir)

    // C. Drop a realistic CSE 2631 Algorithms assignment file into the Inbox folder
    const dueIn4Days = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000)
    const dueIso = `${dueIn4Days.getFullYear()}-${String(dueIn4Days.getMonth() + 1).padStart(2, '0')}-${String(dueIn4Days.getDate()).padStart(2, '0')}`
    const algoFile = join(inboxDir, 'CSE2631_HW3_Dynamic_Programming.txt')
    const originalInstructions = [
      'Title: Homework 3 — Dynamic Programming & Shortest Paths',
      'Subject: CSE 2631 — Algorithms Analysis and Design 1',
      `Due: ${dueIso}`,
      'Teacher Instructions:',
      '1. Formulate the optimal substructure recurrence for 0/1 Knapsack.',
      '2. Trace Dijkstra algorithm on the weighted directed graph in Figure 2.',
      '3. Prove why negative-weight cycles break greedy relaxation.',
    ].join('\n')
    await writeFile(algoFile, originalInstructions, 'utf8')

    // D. Import and extract a draft assignment with CSE 2631 suggested
    const scanRes1 = await supervisor.executeStudyGuardianOperation({
      action: 'SCAN_INBOX',
    })
    expect(scanRes1.success).toBe(true)
    expect(scanRes1.inboxScan?.importedRecords).toHaveLength(1)
    expect(scanRes1.inboxScan?.createdDrafts).toHaveLength(1)

    const draft = scanRes1.inboxScan!.createdDrafts[0]!
    expect(draft.suggestedSubjectCode).toBe('CSE 2631')
    expect(draft.extractedDueDate).toBe(dueIso)
    expect(draft.subtasks).toHaveLength(3)

    // E. Confirm subject and due date
    const confirmRes = await supervisor.executeStudyGuardianOperation({
      action: 'CONFIRM_ASSIGNMENT',
      draftId: draft.draftId,
      confirmedSubjectCode: 'CSE 2631',
      confirmedDueDate: dueIso,
      reminderIntervalMinutes: 60,
      quietHoursStart: '23:00',
      quietHoursEnd: '06:00',
    })
    expect(confirmRes.success).toBe(true)
    const assignment = confirmRes.assignment!
    expect(assignment.subjectCode).toBe('CSE 2631')
    expect(assignment.dueDate).toBe(dueIso)
    expect(assignment.status).toBe('TODO')
    expect(assignment.progressPercent).toBe(0)

    // F. Prepare or paste an answer draft under CSE 2631 -> Answers
    const prepRes = await supervisor.executeStudyGuardianOperation({
      action: 'PREPARE_ANSWER_DRAFT',
      assignmentId: assignment.assignmentId,
    })
    expect(prepRes.success).toBe(true)
    expect(prepRes.answerDraftResult?.mode).toBe('MANUAL_COPY_FOR_EXTERNAL_AI')
    expect(prepRes.answerDraftResult?.copyForExternalAiPrompt).toContain(
      'Formulate the optimal substructure recurrence for 0/1 Knapsack.'
    )
    // Preparing answer draft NEVER marks assignment completed
    expect(prepRes.answerDraftResult?.assignmentStatusUnchanged).toBe('TODO')

    const pastedAnswerRes = await supervisor.executeStudyGuardianOperation({
      action: 'SAVE_STUDY_ANSWER',
      assignmentId: assignment.assignmentId,
      title: 'My Draft Solution for HW3',
      answerDraftText:
        'Part 1: Let DP[i][w] = max(DP[i-1][w], v_i + DP[i-1][w - w_i]).\nPart 2: Dijkstra priority queue trace...\nPart 3: Negative cycle proof...',
    })
    expect(pastedAnswerRes.success).toBe(true)
    expect(pastedAnswerRes.studyAnswer?.subjectCode).toBe('CSE 2631')
    // Original teacher material is kept strictly separate from AI/pasted answer text
    expect(pastedAnswerRes.studyAnswer?.teacherInstructionsVerbatim).toContain(
      'Formulate the optimal substructure recurrence'
    )
    expect(pastedAnswerRes.studyAnswer?.answerDraftText).toContain('Let DP[i][w] = max')

    // Verify CSE 2631 -> Answers workspace bucket contains the saved answer
    const wsRes = await supervisor.executeStudyGuardianOperation({
      action: 'GET_SUBJECT_WORKSPACE',
      subjectCodeOrQuery: 'CSE 2631',
    })
    expect(wsRes.subjectWorkspace?.answers).toHaveLength(1)
    expect(wsRes.subjectWorkspace?.assignments).toHaveLength(1)

    // Verify assignment status is STILL TODO (never marked completed just because an answer was saved)
    const listBeforeProgress = await supervisor.executeStudyGuardianOperation({
      action: 'LIST_ASSIGNMENTS',
      subjectCode: 'CSE 2631',
    })
    expect(listBeforeProgress.assignments?.[0]?.status).toBe('TODO')

    // G. Trigger a deterministic reminder check and verify no duplicate spam on immediate re-check
    const daytimeDate = new Date('2026-10-15T14:00:00.000')
    const remEval1 = await supervisor.executeStudyGuardianOperation({
      action: 'EVALUATE_REMINDERS',
      referenceTimeIso: daytimeDate.toISOString(),
    })
    expect(remEval1.reminderEvaluation?.triggeredReminders).toHaveLength(1)
    expect(remEval1.reminderEvaluation?.deduplicatedSkippedCount).toBe(0)

    const remEval2 = await supervisor.executeStudyGuardianOperation({
      action: 'EVALUATE_REMINDERS',
      referenceTimeIso: new Date(daytimeDate.getTime() + 10_000).toISOString(),
    })
    expect(remEval2.reminderEvaluation?.triggeredReminders).toHaveLength(0)
    expect(remEval2.reminderEvaluation?.deduplicatedSkippedCount).toBe(1)

    // Verify quiet hours suppression (23:30 local time is inside 23:00-06:00)
    const quietTime = new Date(2026, 9, 15, 23, 30, 0)
    const remQuiet = await supervisor.executeStudyGuardianOperation({
      action: 'EVALUATE_REMINDERS',
      referenceTimeIso: quietTime.toISOString(),
    })
    expect(remQuiet.reminderEvaluation?.quietHoursActive).toBe(true)
    expect(remQuiet.reminderEvaluation?.triggeredReminders).toHaveLength(0)

    // Verify startup / active-Windows-session unfinished task briefing
    const briefingRes = await supervisor.executeStudyGuardianOperation({
      action: 'GET_SESSION_BRIEFING',
      trigger: 'WINDOWS_SESSION_ACTIVE',
    })
    expect(briefingRes.sessionBriefing?.unfinishedAssignments).toHaveLength(1)
    expect(briefingRes.sessionBriefing?.summaryMessage).toContain('CSE 2631')

    // H. Update progress to 50% (via Companion command)
    const cmdShowAll = await supervisor.executeAssistantCommand({
      input: 'Show my assignments.',
    })
    expect(cmdShowAll.status).toBe('SUCCESS')
    expect(cmdShowAll.assignments).toHaveLength(1)

    const cmdDueWeek = await supervisor.executeAssistantCommand({
      input: "What's due this week?",
    })
    expect(cmdDueWeek.status).toBe('SUCCESS')
    expect(cmdDueWeek.assignments).toHaveLength(1)

    const cmdShowAlgo = await supervisor.executeAssistantCommand({
      input: 'Show Algorithms assignments.',
    })
    expect(cmdShowAlgo.status).toBe('SUCCESS')
    expect(cmdShowAlgo.assignments).toHaveLength(1)

    const cmdProgress50 = await supervisor.executeAssistantCommand({
      input: "I'm 50% done with Algorithms.",
    })
    expect(cmdProgress50.status).toBe('SUCCESS')
    expect(cmdProgress50.updatedAssignment?.progressPercent).toBe(50)
    expect(cmdProgress50.updatedAssignment?.status).toBe('IN_PROGRESS')

    const cmdSnooze = await supervisor.executeAssistantCommand({
      input: 'Remind me tomorrow evening.',
    })
    expect(cmdSnooze.status).toBe('SUCCESS')
    expect(cmdSnooze.updatedAssignment?.snoozedUntil).toBeTruthy()

    // I. Mark complete and verify reminders stop
    const cmdComplete = await supervisor.executeAssistantCommand({
      input: 'Mark this assignment complete.',
    })
    expect(cmdComplete.status).toBe('SUCCESS')
    expect(cmdComplete.updatedAssignment?.status).toBe('COMPLETED')
    expect(cmdComplete.updatedAssignment?.progressPercent).toBe(100)

    const remAfterComplete = await supervisor.executeStudyGuardianOperation({
      action: 'EVALUATE_REMINDERS',
      referenceTimeIso: new Date('2026-10-18T14:00:00.000').toISOString(),
    })
    expect(remAfterComplete.reminderEvaluation?.triggeredReminders).toHaveLength(0)
    expect(remAfterComplete.reminderEvaluation?.completedSkippedCount).toBe(1)

    // J. Re-scan the same Inbox file and verify no duplicate assignment is created
    const scanRes2 = await supervisor.executeStudyGuardianOperation({
      action: 'SCAN_INBOX',
    })
    expect(scanRes2.inboxScan?.importedRecords).toHaveLength(0)
    expect(scanRes2.inboxScan?.duplicateSkippedRecords).toHaveLength(1)
    expect(scanRes2.inboxScan?.createdDrafts).toHaveLength(0)

    const finalAssignments = await supervisor.executeStudyGuardianOperation({
      action: 'LIST_ASSIGNMENTS',
    })
    expect(finalAssignments.assignments).toHaveLength(1)

    await supervisor.shutdown()
  })

  it('5. Asks for clarification when multiple unfinished assignments match a Companion command, supports authorized local model answer drafting, and registers all 5 Study Guardian capabilities', async () => {
    const { KernelHost } = await import('./index.js')
    const host = new KernelHost({
      dataRoot: tempDir,
      localAnswerGenerator: async ({ assignment }) => ({
        answerText: `Local Model Draft for ${assignment.title}: Verified step-by-step derivation.`,
        modelId: 'local/llama-3.1-8b-study-instruct',
      }),
    })
    await host.start()

    // Verify all 5 V1-G-01 Study Guardian capabilities are registered in supervised self-improvement registry
    const capRes = host.handleCapabilityRegistryOperation({ action: 'LIST' })
    const capIds = capRes.capabilities.map((c) => c.capabilityId)
    expect(capIds).toContain('cap:study:subject-classification')
    expect(capIds).toContain('cap:study:inbox-import')
    expect(capIds).toContain('cap:study:assignment-extraction')
    expect(capIds).toContain('cap:study:reminder-scheduling')
    expect(capIds).toContain('cap:study:answer-drafting')

    // Create two unfinished assignments under CSE 2195 (Data Science)
    const a1 = await host.handleStudyGuardianOperation({
      action: 'CONFIRM_ASSIGNMENT',
      title: 'Physics & Data Lab 1: Kinematics Dataset',
      confirmedSubjectCode: 'CSE 2195',
      confirmedDueDate: '2026-10-22',
      teacherInstructions: 'Analyze physics kinematics CSV in pandas.',
    })
    const a2 = await host.handleStudyGuardianOperation({
      action: 'CONFIRM_ASSIGNMENT',
      title: 'Physics & Data Lab 2: Optics Regression',
      confirmedSubjectCode: 'CSE 2195',
      confirmedDueDate: '2026-10-24',
      teacherInstructions: 'Fit linear regression to physics optics measurements.',
    })
    expect(a1.assignment).toBeDefined()
    expect(a2.assignment).toBeDefined()

    // Command: "I'm 50% done with Physics." -> matches both unfinished Physics labs -> MUST ask for clarification!
    const ambiguousCmd = await host.executeAssistantCommand({
      input: "I'm 50% done with Physics.",
    })
    expect(ambiguousCmd.status).toBe('CLARIFICATION_REQUIRED')
    expect(ambiguousCmd.terminalState).toBe('WAITING_CONFIRMATION')
    expect(ambiguousCmd.clarificationCandidates).toHaveLength(2)

    // Re-submit with clarified targetAssignmentId
    const clarifiedCmd = await host.executeAssistantCommand({
      input: "I'm 50% done with Physics.",
      targetAssignmentId: a1.assignment!.assignmentId,
    })
    expect(clarifiedCmd.status).toBe('SUCCESS')
    expect(clarifiedCmd.updatedAssignment?.assignmentId).toBe(a1.assignment!.assignmentId)
    expect(clarifiedCmd.updatedAssignment?.progressPercent).toBe(50)

    // Test "Prepare answer draft" with authorized local model
    const draftRes = await host.handleStudyGuardianOperation({
      action: 'PREPARE_ANSWER_DRAFT',
      assignmentId: a1.assignment!.assignmentId,
    })
    expect(draftRes.answerDraftResult?.mode).toBe('GENERATED_BY_LOCAL_MODEL')
    expect(draftRes.answerDraftResult?.savedAnswer?.provenance).toBe('AUTHORIZED_LOCAL_MODEL')
    expect(draftRes.answerDraftResult?.savedAnswer?.modelId).toBe(
      'local/llama-3.1-8b-study-instruct'
    )
    // Assignment status remains IN_PROGRESS (never auto-completed)
    expect(draftRes.answerDraftResult?.assignmentStatusUnchanged).toBe('IN_PROGRESS')

    await host.shutdown()
  })
})

