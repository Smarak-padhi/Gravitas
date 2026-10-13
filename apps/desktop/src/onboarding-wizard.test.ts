import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import {
  writeGravitasConfig,
  readGravitasConfig,
  type PersonaArchetype,
} from '@gravitas/core'
import {
  IdeasVaultStore,
  ICloudAssignmentInbox,
  OnboardingService,
} from './assistant/index.js'
import { KernelHost } from './kernel-host/kernelHost.js'

describe('GRAVITAS V1-G-02 — First-Run Onboarding Wizard & Phone Inbox Setup', () => {
  let tempDir: string
  let vault: IdeasVaultStore
  let inbox: ICloudAssignmentInbox
  let service: OnboardingService

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gravitas-onboarding-test-'))
    vault = new IdeasVaultStore(tempDir)
    inbox = new ICloudAssignmentInbox({ vault, dataRoot: tempDir })
    service = new OnboardingService(inbox, vault, tempDir)
  })

  afterEach(() => {
    inbox.stopWatcher()
    vault.close()
    try {
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch {}
  })

  describe('1. Fresh launch & existing user state transitions', () => {
    it('fresh launch shows Welcome screen and does not bypass onboarding', () => {
      const cfg = readGravitasConfig(tempDir)
      expect(cfg.onboarding.completed).toBe(false)
      expect(cfg.onboarding.step).toBe('WELCOME')
    })

    it('existing users or completed setups bypass onboarding without data loss', () => {
      // User creates an existing idea
      const idea = vault.saveIdea({
        title: 'Pre-existing Thesis Idea',
        originalText: 'Research notes from before onboarding update.',
        category: 'Ideas',
      })

      // Mark onboarding completed
      service.completeOnboarding()
      const cfg = readGravitasConfig(tempDir)
      expect(cfg.onboarding.completed).toBe(true)
      expect(cfg.onboarding.step).toBe('COMPLETED')
      expect(cfg.onboarding.completedAt).toBeDefined()

      // Verify existing idea is untouched
      const fetched = vault.getIdea(idea.id)
      expect(fetched).not.toBeNull()
      expect(fetched?.title).toBe('Pre-existing Thesis Idea')
    })

    it('interrupted onboarding resumes correctly from saved step and preferences', () => {
      writeGravitasConfig(tempDir, {
        onboarding: {
          completed: false,
          step: 'PERSONALIZE',
          preferences: {
            persona: 'STUDENT',
            customSubjects: ['BIOL 101', 'CHEM 101'],
          },
        },
      })

      const loaded = readGravitasConfig(tempDir)
      expect(loaded.onboarding.completed).toBe(false)
      expect(loaded.onboarding.step).toBe('PERSONALIZE')
      expect(loaded.onboarding.preferences?.persona).toBe('STUDENT')
      expect(loaded.onboarding.preferences?.customSubjects).toEqual(['BIOL 101', 'CHEM 101'])
    })

    it('setup can be reopened from Settings via resetOnboarding', () => {
      service.completeOnboarding()
      expect(readGravitasConfig(tempDir).onboarding.completed).toBe(true)

      service.resetOnboarding()
      const reopened = readGravitasConfig(tempDir)
      expect(reopened.onboarding.completed).toBe(false)
      expect(reopened.onboarding.step).toBe('WELCOME')
    })
  })

  describe('2. Personalized personas & starter collections (Notion pattern)', () => {
    it('Student setup creates selected custom subjects and does not force developer defaults', () => {
      const result = service.applyPersonaSetup({
        persona: 'STUDENT',
        customSubjects: ['ECON 101', 'PSYC 200', 'PHIL 110'],
      })

      expect(result.success).toBe(true)
      expect(result.persona).toBe('STUDENT')
      expect(result.createdSubjectsCount).toBe(3)

      const subjects = inbox.listSemesterSubjects()
      const codes = subjects.map((s) => s.code)
      expect(codes).toContain('ECON 101')
      expect(codes).toContain('PSYC 200')
      expect(codes).toContain('PHIL 110')
      // Developer defaults like CSE 2195 or GET 1433 must NOT be present
      expect(codes).not.toContain('CSE 2195')
      expect(codes).not.toContain('GET 1433')

      // Each custom subject should have a seeded course notes section
      const econWorkspace = inbox.getSubjectWorkspace('ECON 101')
      expect(econWorkspace.notes.length).toBeGreaterThan(0)
      expect(econWorkspace.notes[0]?.title).toContain('ECON 101')
    })

    it('Optional seven-subject template seeds exactly once and idempotently', () => {
      const res1 = service.applyPersonaSetup({
        persona: 'STUDENT',
        useSevenSubjectTemplate: true,
      })
      expect(res1.success).toBe(true)
      expect(res1.createdSubjectsCount).toBe(7)

      const subjects1 = inbox.listSemesterSubjects()
      expect(subjects1.length).toBe(7)

      // Second application must not duplicate or fail
      const res2 = service.applyPersonaSetup({
        persona: 'STUDENT',
        useSevenSubjectTemplate: true,
      })
      expect(res2.success).toBe(true)
      const subjects2 = inbox.listSemesterSubjects()
      expect(subjects2.length).toBe(7)
    })

    it('Work setup creates suitable starter collections and clears unused developer templates', () => {
      const result = service.applyPersonaSetup({
        persona: 'WORK',
      })

      expect(result.success).toBe(true)
      expect(result.persona).toBe('WORK')
      expect(result.createdKnowledgeItemsCount).toBeGreaterThanOrEqual(3)

      const ideas = vault.listIdeas()
      const categories = new Set(ideas.map((i) => i.category))
      expect(categories.has('Projects')).toBe(true)
      expect(categories.has('Tasks')).toBe(true)
      expect(categories.has('Meetings')).toBe(true)

      // No developer subjects left over
      const subjects = inbox.listSemesterSubjects()
      expect(subjects.length).toBe(0)
    })

    it('Personal setup creates suitable starter collections', () => {
      const result = service.applyPersonaSetup({
        persona: 'PERSONAL',
      })

      expect(result.success).toBe(true)
      expect(result.persona).toBe('PERSONAL')

      const ideas = vault.listIdeas()
      const categories = new Set(ideas.map((i) => i.category))
      expect(categories.has('Ideas')).toBe(true)
      expect(categories.has('Plans')).toBe(true)
      expect(categories.has('Reminders')).toBe(true)
    })

    it('Everything setup creates unified multi-category hub idempotently', () => {
      const res = service.applyPersonaSetup({
        persona: 'EVERYTHING',
      })

      expect(res.success).toBe(true)
      expect(res.persona).toBe('EVERYTHING')
      const items = vault.listIdeas()
      expect(items.length).toBeGreaterThanOrEqual(4)

      // Re-running everything setup never duplicates existing items
      const countBefore = items.length
      service.applyPersonaSetup({ persona: 'EVERYTHING' })
      const countAfter = vault.listIdeas().length
      expect(countAfter).toBe(countBefore)
    })
  })

  describe('3. Universal Phone & Inbox Setup State Machine', () => {
    it('distinguishes FOLDER_ACCESSIBLE when directory is checked folder-only', async () => {
      const inboxFolder = path.join(tempDir, 'TestInbox')
      fs.mkdirSync(inboxFolder, { recursive: true })

      const verification = await service.verifyInbox({
        folderPath: inboxFolder,
        checkType: 'folder_only',
      })

      expect(verification.state).toBe('FOLDER_ACCESSIBLE')
      expect(verification.isAccessible).toBe(true)
      expect(verification.folderPath).toBe(path.resolve(inboxFolder))
      expect(verification.fileCount).toBe(0)
    })

    it('distinguishes AWAITING_FIRST_FILE when folder is accessible but empty', async () => {
      const inboxFolder = path.join(tempDir, 'EmptyInbox')
      fs.mkdirSync(inboxFolder, { recursive: true })

      const verification = await service.verifyInbox({
        folderPath: inboxFolder,
        checkType: 'full_scan',
      })

      expect(verification.state).toBe('AWAITING_FIRST_FILE')
      expect(verification.isAccessible).toBe(true)
      expect(verification.fileCount).toBe(0)
      expect(verification.hasCrossDeviceEvidence).toBe(false)
      expect(verification.message).toContain('waiting for your first file')
    })

    it('distinguishes LOCAL_IMPORT_VERIFIED when non-sync local file is imported', async () => {
      const inboxFolder = path.join(tempDir, 'LocalInbox')
      fs.mkdirSync(inboxFolder, { recursive: true })

      // Create a plain local text file with no phone sync markers
      fs.writeFileSync(path.join(inboxFolder, 'lecture-notes.txt'), 'Calculus review notes from laptop')

      const verification = await service.verifyInbox({
        folderPath: inboxFolder,
        checkType: 'full_scan',
      })

      expect(verification.state).toBe('LOCAL_IMPORT_VERIFIED')
      expect(verification.isAccessible).toBe(true)
      expect(verification.fileCount).toBe(1)
      expect(verification.hasCrossDeviceEvidence).toBe(false)
      expect(verification.message).toContain('Local import verified')
    })

    it('distinguishes CROSS_DEVICE_SYNC_VERIFIED when mobile markers or iCloud files are present', async () => {
      const inboxFolder = path.join(tempDir, 'PhoneInbox')
      fs.mkdirSync(inboxFolder, { recursive: true })

      // Create a file matching iOS / phone naming convention (e.g. IMG_2041.pdf or Scan_01.txt)
      fs.writeFileSync(
        path.join(inboxFolder, 'IMG_4821_Assignment.txt'),
        'Assignment 3: Modern Computing Systems Design. Due: 2026-11-15.\n- Read Chapter 4\n- Complete problem 2'
      )

      const verification = await service.verifyInbox({
        folderPath: inboxFolder,
        checkType: 'full_scan',
      })

      expect(verification.state).toBe('CROSS_DEVICE_SYNC_VERIFIED')
      expect(verification.isAccessible).toBe(true)
      expect(verification.hasCrossDeviceEvidence).toBe(true)
      expect(verification.evidenceSummary).toContain('Mobile device file naming pattern')
      expect(verification.message).toContain('Cross-device sync verified')
    })

    it('distinguishes CROSS_DEVICE_SYNC_VERIFIED when syncthing markers are present', async () => {
      const inboxFolder = path.join(tempDir, 'SyncthingInbox')
      fs.mkdirSync(inboxFolder, { recursive: true })
      fs.mkdirSync(path.join(inboxFolder, '.stfolder'), { recursive: true })

      fs.writeFileSync(path.join(inboxFolder, 'physics_notes.txt'), 'Physics lab draft')

      const verification = await service.verifyInbox({
        folderPath: inboxFolder,
        checkType: 'full_scan',
      })

      expect(verification.state).toBe('CROSS_DEVICE_SYNC_VERIFIED')
      expect(verification.hasCrossDeviceEvidence).toBe(true)
      expect(verification.evidenceSummary).toContain('Syncthing')
    })

    it('shows actionable recovery when folder path is invalid or unwritable', async () => {
      const badPath = path.join(tempDir, 'non_existent_dir_12345', 'subfolder')

      const verification = await service.verifyInbox({
        folderPath: badPath,
        checkType: 'full_scan',
      })

      expect(verification.state).toBe('UNCONFIGURED')
      expect(verification.isAccessible).toBe(false)
      expect(verification.message).toContain('not accessible or not writable')
    })

    it('supports local-only mode without internet or cloud configuration', async () => {
      // Local only mode completes without configuring any external cloud or phone sync
      writeGravitasConfig(tempDir, {
        onboarding: {
          completed: false,
          step: 'ASSISTANT_PREFS',
          preferences: {
            phonePlatform: 'NONE',
            inboxVerificationState: 'UNCONFIGURED',
            defaultDenyCloudEgress: true,
          },
        },
      })

      const cfg = readGravitasConfig(tempDir)
      expect(cfg.onboarding.preferences?.phonePlatform).toBe('NONE')
      expect(cfg.onboarding.preferences?.defaultDenyCloudEgress).toBe(true)
    })
  })

  describe('4. Assistant Preferences & Skipped Permissions', () => {
    it('persists assistant shortcut, quiet hours, and notification permissions', () => {
      writeGravitasConfig(tempDir, {
        onboarding: {
          completed: false,
          step: 'ASSISTANT_PREFS',
          preferences: {
            assistantShortcut: 'Alt+Space',
            startWithWindows: true,
            reminderIntervalMinutes: 120,
            quietHoursStart: '22:00',
            quietHoursEnd: '08:00',
            notificationsEnabled: true,
            voiceEnabled: false,
            defaultDenyCloudEgress: true,
          },
        },
      })

      const loaded = readGravitasConfig(tempDir)
      expect(loaded.onboarding.preferences?.assistantShortcut).toBe('Alt+Space')
      expect(loaded.onboarding.preferences?.startWithWindows).toBe(true)
      expect(loaded.onboarding.preferences?.reminderIntervalMinutes).toBe(120)
      expect(loaded.onboarding.preferences?.quietHoursStart).toBe('22:00')
      expect(loaded.onboarding.preferences?.quietHoursEnd).toBe('08:00')
      expect(loaded.onboarding.preferences?.notificationsEnabled).toBe(true)
      expect(loaded.onboarding.preferences?.voiceEnabled).toBe(false)
      expect(loaded.onboarding.preferences?.defaultDenyCloudEgress).toBe(true)
    })

    it('skipped permissions remain disabled', () => {
      writeGravitasConfig(tempDir, {
        onboarding: {
          completed: false,
          step: 'ASSISTANT_PREFS',
          preferences: {
            notificationsEnabled: false,
            voiceEnabled: false,
          },
        },
      })

      const loaded = readGravitasConfig(tempDir)
      expect(loaded.onboarding.preferences?.notificationsEnabled).toBe(false)
      expect(loaded.onboarding.preferences?.voiceEnabled).toBe(false)
    })
  })

  describe('5. First Success Action & Persistence (Todoist pattern)', () => {
    it('actually persists first created idea to Knowledge Hub', () => {
      const res = service.executeFirstSuccessAction({
        successAction: 'SAVE_IDEA',
        title: 'Build automated thesis research index',
        text: 'Structure literature references with tag system.',
      })

      expect(res.success).toBe(true)
      expect(res.action).toBe('SAVE_IDEA')
      expect(res.persisted).toBe(true)
      expect(res.createdItemId).toBeTruthy()

      const inVault = vault.getIdea(res.createdItemId)
      expect(inVault).not.toBeNull()
      expect(inVault?.title).toBe('Build automated thesis research index')
    })

    it('actually persists first created task with due date', () => {
      const res = service.executeFirstSuccessAction({
        successAction: 'CREATE_TASK',
        title: 'Revise Discrete Mathematics Chapter 2',
        dueDate: '2026-10-20',
      })

      expect(res.success).toBe(true)
      expect(res.action).toBe('CREATE_TASK')
      expect(res.persisted).toBe(true)

      const inVault = vault.getIdea(res.createdItemId)
      expect(inVault).not.toBeNull()
      expect(inVault?.title).toBe('Revise Discrete Mathematics Chapter 2')
      expect(inVault?.dueDate).toBe('2026-10-20')
    })

    it('actually persists first imported assignment draft', () => {
      inbox.createSemesterSubject({ code: 'CSE 2631', name: 'Algorithms' })
      const res = service.executeFirstSuccessAction({
        successAction: 'IMPORT_ASSIGNMENT',
        title: 'Dynamic Programming Problem Set 1',
        text: 'Solve 0/1 knapsack and longest common subsequence.',
        subjectCode: 'CSE 2631',
      })

      expect(res.success).toBe(true)
      expect(res.action).toBe('IMPORT_ASSIGNMENT')
      expect(res.persisted).toBe(true)

      const entry = inbox.getSubjectSectionEntry(res.createdItemId)
      expect(entry).not.toBeNull()
      expect(entry?.title).toBe('Dynamic Programming Problem Set 1')
    })
  })

  describe('6. Kernel Host IPC integration for onboarding operations', () => {
    let kernelHost: KernelHost

    beforeEach(async () => {
      kernelHost = new KernelHost({
        dataRoot: tempDir,
        initialDiagnosticContext: 'test-onboarding-kernel',
      })
      await kernelHost.start()
    })

    afterEach(async () => {
      await kernelHost.stop()
    })

    it('handles CREATE_SEMESTER_SUBJECT through KernelHost', async () => {
      const res = await kernelHost.handleStudyGuardianOperation({
        action: 'CREATE_SEMESTER_SUBJECT',
        code: 'PHYS 101',
        name: 'General Physics I',
        credits: 4,
      })

      expect(res.success).toBe(true)
      expect(res.subjectRecord?.code).toBe('PHYS 101')
      expect(res.semesterSubjects?.some((s) => s.code === 'PHYS 101')).toBe(true)
    })

    it('handles APPLY_PERSONA_SETUP through KernelHost', async () => {
      const res = await kernelHost.handleStudyGuardianOperation({
        action: 'APPLY_PERSONA_SETUP',
        persona: 'WORK',
      })

      expect(res.success).toBe(true)
      expect(res.personaSetupResult?.persona).toBe('WORK')
      expect(res.personaSetupResult?.createdKnowledgeItemsCount).toBeGreaterThanOrEqual(3)
    })

    it('handles TEST_INBOX_SETUP through KernelHost', async () => {
      const testFolder = path.join(tempDir, 'KernelInbox')
      fs.mkdirSync(testFolder, { recursive: true })

      const res = await kernelHost.handleStudyGuardianOperation({
        action: 'TEST_INBOX_SETUP',
        folderPath: testFolder,
        checkType: 'folder_only',
      })

      expect(res.success).toBe(true)
      expect(res.inboxVerificationResult?.state).toBe('FOLDER_ACCESSIBLE')
    })

    it('handles EXECUTE_FIRST_SUCCESS and RESET_ONBOARDING through KernelHost', async () => {
      const execRes = await kernelHost.handleStudyGuardianOperation({
        action: 'EXECUTE_FIRST_SUCCESS',
        successAction: 'SAVE_IDEA',
        title: 'Kernel-verified first idea',
      })

      expect(execRes.success).toBe(true)
      expect(execRes.firstSuccessResult?.itemTitle).toBe('Kernel-verified first idea')

      const resetRes = await kernelHost.handleStudyGuardianOperation({
        action: 'RESET_ONBOARDING',
      })

      expect(resetRes.success).toBe(true)
      const cfg = readGravitasConfig(tempDir)
      expect(cfg.onboarding.completed).toBe(false)
      expect(cfg.onboarding.step).toBe('WELCOME')
    })
  })
})
