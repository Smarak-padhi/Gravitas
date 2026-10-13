/**
 * GRAVITAS V1-G-02 — Onboarding & Persona Setup Service
 *
 * Implements research-informed first-run onboarding architecture:
 * 1. Personalize starter content by use case (Notion pattern):
 *    - STUDENT: arbitrary custom subjects OR optional Semester 3 seven-subject template.
 *    - WORK: Projects, Tasks, Meetings, Notes, Documents.
 *    - PERSONAL: Ideas, Plans, Notes, Reminders.
 *    - EVERYTHING: Unified Knowledge Hub with customizable collections.
 * 2. Idempotent setup guarantees:
 *    - Never overwrites existing user collections or data.
 *    - Never forces developer subjects onto new users.
 *    - Cleans up unused developer templates only if 0 user entries exist.
 *    - Preserves existing users and allows resuming interrupted onboarding.
 */

import fs from 'node:fs'
import path from 'node:path'
import {
  writeGravitasConfig,
  readGravitasConfig,
  type PersonaArchetype,
  type InboxVerificationState,
  type OnboardingStep,
  type OnboardingPreferences,
} from '@gravitas/core'
import type { ICloudAssignmentInbox, SemesterSubjectRecord } from './icloudInbox.js'
import type { IdeasVaultStore, IdeaRecord } from './ideasVault.js'
import type { InboxVerificationResult, FirstSuccessResult } from '../types.js'

export interface PersonaSetupResult {
  readonly success: boolean
  readonly persona: PersonaArchetype
  readonly createdSubjectsCount: number
  readonly createdKnowledgeItemsCount: number
  readonly createdItemTitles: readonly string[]
  readonly message: string
}

export class OnboardingService {
  constructor(
    private readonly inbox: ICloudAssignmentInbox,
    private readonly vault: IdeasVaultStore,
    private readonly dataRoot: string
  ) {}

  public applyPersonaSetup(options: {
    readonly persona: PersonaArchetype
    readonly customSubjects?: readonly string[] | undefined
    readonly useSevenSubjectTemplate?: boolean | undefined
  }): PersonaSetupResult {
    const persona = options.persona
    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    let createdSubjectsCount = 0
    let createdKnowledgeItemsCount = 0
    const createdItemTitles: string[] = []

    // Helper to add item to vault idempotently (never duplicates if title exists)
    const existingIdeas = this.vault.listIdeas()
    const existingTitles = new Set(existingIdeas.map((i) => i.title.trim().toLowerCase()))

    const ensureVaultItem = (item: {
      readonly title: string
      readonly originalText: string
      readonly collection: 'IDEA' | 'STUDY_NOTE' | 'PROJECT' | 'PLAN_TASK'
      readonly category: string
      readonly tags: readonly string[]
      readonly subject?: string | null
      readonly summary?: string | null
      readonly dueDate?: string | null
    }): IdeaRecord | null => {
      if (existingTitles.has(item.title.trim().toLowerCase())) {
        return null
      }
      const saved = this.vault.saveIdea(item)
      existingTitles.add(item.title.trim().toLowerCase())
      createdKnowledgeItemsCount++
      createdItemTitles.push(saved.title)
      return saved
    }

    switch (persona) {
      case 'STUDENT': {
        if (options.useSevenSubjectTemplate) {
          const seeded = this.inbox.seedDefaultSubjects()
          createdSubjectsCount = seeded.length
          for (const s of seeded) {
            createdItemTitles.push(s.code)
          }

          // Optional starter task for students
          ensureVaultItem({
            title: 'Review Semester 3 syllabus and deadlines',
            originalText: 'Review semester schedule, assignments, and exam deadlines.',
            collection: 'PLAN_TASK',
            category: 'Tasks',
            subject: 'CSE 2631',
            tags: ['study', 'syllabus'],
            dueDate: tomorrow,
          })
        } else if (options.customSubjects && options.customSubjects.length > 0) {
          // Remove default developer subjects if they have 0 user entries
          this.inbox.clearUnusedDefaultSubjects()

          for (const raw of options.customSubjects) {
            const code = raw.trim()
            if (!code) continue
            const subj = this.inbox.createSemesterSubject({
              code,
              name: code,
              credits: 4,
              keywords: [code.toLowerCase()],
              notes: `Workspace for ${code}`,
            })
            createdSubjectsCount++
            createdItemTitles.push(subj.code)

            // Seed syllabus entry in subject's NOTES bucket
            this.inbox.addSubjectSectionEntry({
              subjectCode: subj.code,
              bucket: 'NOTES',
              title: `${subj.code} Syllabus & Course Overview`,
              originalContent: `Welcome to ${subj.code}. Track lectures, problem sets, and revision here.`,
            })
          }

          const primarySubject = options.customSubjects[0]!.trim()
          ensureVaultItem({
            title: `Review ${primarySubject} syllabus and deadlines`,
            originalText: `Read through course outline and upcoming due dates for ${primarySubject}.`,
            collection: 'PLAN_TASK',
            category: 'Tasks',
            subject: primarySubject,
            tags: ['study', 'syllabus'],
            dueDate: tomorrow,
          })
        } else {
          // Default clean 3-subject student starter
          this.inbox.clearUnusedDefaultSubjects()
          const defaultStarters = ['Mathematics', 'Computer Science', 'Physics']
          for (const code of defaultStarters) {
            const subj = this.inbox.createSemesterSubject({ code, name: code, credits: 4 })
            createdSubjectsCount++
            createdItemTitles.push(subj.code)
          }
          ensureVaultItem({
            title: 'Review course outlines and upcoming deadlines',
            originalText: 'Review lecture schedules and problem sets.',
            collection: 'PLAN_TASK',
            category: 'Tasks',
            subject: 'Computer Science',
            tags: ['study', 'syllabus'],
            dueDate: tomorrow,
          })
        }
        break
      }

      case 'WORK': {
        // Clear unused developer subjects so user has a clean professional workspace
        this.inbox.clearUnusedDefaultSubjects()

        ensureVaultItem({
          title: 'Q4 Product Roadmap & Execution',
          originalText: 'Coordinate cross-functional deliverables, milestones, and release gates for Q4.',
          collection: 'PROJECT',
          category: 'Projects',
          tags: ['work', 'roadmap', 'planning'],
          summary: 'Quarterly roadmap tracking high-impact project milestones.',
        })

        ensureVaultItem({
          title: 'Prepare weekly team sync agenda',
          originalText: 'Review project blockers, upcoming release candidates, and team action items.',
          collection: 'PLAN_TASK',
          category: 'Tasks',
          tags: ['work', 'tasks'],
          dueDate: tomorrow,
        })

        ensureVaultItem({
          title: 'System Architecture Decisions',
          originalText: 'Record trade-offs, security invariants, and API contracts for client apps.',
          collection: 'STUDY_NOTE',
          category: 'Documents',
          tags: ['work', 'architecture', 'docs'],
          summary: 'Living architectural decision log and technical specifications.',
        })

        ensureVaultItem({
          title: 'Weekly Standup Action Items',
          originalText: 'Sync notes: frontend milestones on track, staging integration ready for verification.',
          collection: 'STUDY_NOTE',
          category: 'Meetings',
          tags: ['work', 'meetings'],
          summary: 'Decisions and follow-ups from Monday team standup.',
        })
        break
      }

      case 'PERSONAL': {
        // Clear unused developer subjects
        this.inbox.clearUnusedDefaultSubjects()

        ensureVaultItem({
          title: 'Morning routine & focus habits',
          originalText: '30-minute morning walk, coffee, deep work block before checking incoming messages.',
          collection: 'IDEA',
          category: 'Ideas',
          tags: ['personal', 'habits', 'focus'],
          summary: 'Daily personal habit stack for clarity and energy.',
        })

        ensureVaultItem({
          title: 'Organize digital documents and backups',
          originalText: 'Verify local backup drive and clean up desktop downloads.',
          collection: 'PLAN_TASK',
          category: 'Plans',
          tags: ['personal', 'organization'],
          dueDate: tomorrow,
        })

        ensureVaultItem({
          title: 'Reading reflections: The Design of Everyday Things',
          originalText: 'Affordances, signifiers, and mental models make intuitive products effortless.',
          collection: 'STUDY_NOTE',
          category: 'Notes',
          tags: ['personal', 'reading', 'design'],
          summary: 'Core principles of human-centered design and intuitive feedback.',
        })

        ensureVaultItem({
          title: 'Schedule dentist appointment',
          originalText: 'Call dental clinic for routine semi-annual dental checkup.',
          collection: 'PLAN_TASK',
          category: 'Reminders',
          tags: ['personal', 'health'],
        })
        break
      }

      case 'EVERYTHING': {
        // Preserves any existing subjects and adds rich multi-category hub
        ensureVaultItem({
          title: 'Personal Knowledge Hub Architecture',
          originalText: 'Central offline workspace connecting study notes, work projects, and daily ideas.',
          collection: 'PROJECT',
          category: 'Projects',
          tags: ['hub', 'knowledge', 'architecture'],
          summary: 'Unified local dashboard organizing all life areas.',
        })

        ensureVaultItem({
          title: 'Weekly review and priority planning',
          originalText: 'Review completed items from last week, plan top 3 priorities for this week.',
          collection: 'PLAN_TASK',
          category: 'Plans',
          tags: ['review', 'weekly'],
          dueDate: tomorrow,
        })

        ensureVaultItem({
          title: 'Continuous Learning & Research Log',
          originalText: 'Synthesizing insights across technology, psychology, and distributed systems.',
          collection: 'STUDY_NOTE',
          category: 'Notes',
          tags: ['learning', 'research'],
        })

        ensureVaultItem({
          title: 'Build automated local phone inbox workflow',
          originalText: 'Capture thoughts on phone, sync locally via iCloud or Syncthing, review on Windows.',
          collection: 'IDEA',
          category: 'Ideas',
          tags: ['ideas', 'automation'],
        })
        break
      }
    }

    // Persist choice into config.json
    try {
      const current = readGravitasConfig(this.dataRoot)
      writeGravitasConfig(this.dataRoot, {
        onboarding: {
          ...current.onboarding,
          step: 'PERSONALIZE',
          preferences: {
            ...(current.onboarding.preferences || {}),
            persona,
            customSubjects: options.customSubjects,
            useSevenSubjectTemplate: options.useSevenSubjectTemplate,
          },
        },
      })
    } catch {
      // Non-fatal if config write is mocked or testing in-memory
    }

    const message =
      persona === 'STUDENT'
        ? `Configured Student setup with ${createdSubjectsCount} subject(s).`
        : `Configured ${persona} setup with ${createdKnowledgeItemsCount} starter item(s).`

    return {
      success: true,
      persona,
      createdSubjectsCount,
      createdKnowledgeItemsCount,
      createdItemTitles,
      message,
    }
  }

  public async verifyInbox(options?: {
    readonly folderPath?: string | undefined
    readonly checkType?: 'folder_only' | 'full_scan' | undefined
  }): Promise<InboxVerificationResult> {
    const rawPath = options?.folderPath?.trim() || this.inbox.getInboxConfig().inboxFolderPath
    if (!rawPath) {
      return {
        state: 'UNCONFIGURED',
        folderPath: null,
        isAccessible: false,
        fileCount: 0,
        importedCount: 0,
        hasCrossDeviceEvidence: false,
        message: 'No inbox folder has been configured yet.',
      }
    }

    const resolved = path.resolve(rawPath)
    let isAccessible = false
    try {
      if (fs.existsSync(resolved)) {
        const stat = fs.statSync(resolved)
        if (stat.isDirectory()) {
          const testFile = path.join(
            resolved,
            `.gravitas-vfy-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.tmp`
          )
          fs.writeFileSync(testFile, 'test')
          fs.unlinkSync(testFile)
          isAccessible = true
        }
      }
    } catch {
      isAccessible = false
    }

    if (!isAccessible) {
      return {
        state: 'UNCONFIGURED',
        folderPath: resolved,
        isAccessible: false,
        fileCount: 0,
        importedCount: 0,
        hasCrossDeviceEvidence: false,
        message: `Inbox folder "${resolved}" is not accessible or not writable. Check folder permissions or select another folder.`,
      }
    }

    if (options?.checkType === 'folder_only') {
      let fileCount = 0
      try {
        fileCount = fs.readdirSync(resolved).filter((f) => !f.startsWith('.')).length
      } catch {}
      const importedCount = this.inbox.listInboxImports().length
      return {
        state: 'FOLDER_ACCESSIBLE',
        folderPath: resolved,
        isAccessible: true,
        fileCount,
        importedCount,
        hasCrossDeviceEvidence: false,
        message: `Inbox folder is accessible and writable at "${resolved}".`,
      }
    }

    // Full scan / test inbox mode
    let entries: string[] = []
    try {
      entries = fs.readdirSync(resolved)
    } catch {}
    const validFiles = entries.filter((f) => !f.startsWith('.') && !f.endsWith('.tmp'))
    const existingImports = this.inbox.listInboxImports()

    if (validFiles.length === 0 && existingImports.length === 0) {
      return {
        state: 'AWAITING_FIRST_FILE',
        folderPath: resolved,
        isAccessible: true,
        fileCount: 0,
        importedCount: 0,
        hasCrossDeviceEvidence: false,
        message: `Inbox folder is connected and waiting for your first file. Use iPhone Share Sheet -> Save to Files or folder sync to drop your first item.`,
      }
    }

    // Reconcile scan
    try {
      await this.inbox.scanAndReconcileInbox(resolved)
    } catch {}

    const allImports = this.inbox.listInboxImports()

    // Cross-device sync evidence detection
    let hasCrossDeviceEvidence = false
    let evidenceSummary: string | undefined

    const hasICloudPlaceholder = entries.some((f) => f.endsWith('.icloud'))
    const mobileNamingRegex = /^(?:IMG_\d+|RPReplay_|Scan_\d+|Mobile_\d+|Camera_\d+|Audio_\d+|Recording_\d+|PXL_\d+)/i
    const mobileFile = entries.find((f) => mobileNamingRegex.test(f))
    const hasSyncthingMarker =
      fs.existsSync(path.join(resolved, '.stfolder')) ||
      fs.existsSync(path.join(resolved, '.stversions')) ||
      fs.existsSync(path.join(path.dirname(resolved), '.stfolder'))

    const importWithDeviceEvidence = allImports.find(
      (imp) =>
        imp.sourceFileName.endsWith('.icloud') ||
        mobileNamingRegex.test(imp.sourceFileName)
    )

    if (hasICloudPlaceholder) {
      hasCrossDeviceEvidence = true
      evidenceSummary = 'iCloud Drive file synchronization markers detected.'
    } else if (mobileFile) {
      hasCrossDeviceEvidence = true
      evidenceSummary = `Mobile device file naming pattern detected (${mobileFile}).`
    } else if (hasSyncthingMarker) {
      hasCrossDeviceEvidence = true
      evidenceSummary = 'Syncthing synchronization folder markers detected.'
    } else if (importWithDeviceEvidence) {
      hasCrossDeviceEvidence = true
      evidenceSummary = `Cross-device transfer evidenced from "${importWithDeviceEvidence.sourceFileName}".`
    }

    if (hasCrossDeviceEvidence) {
      return {
        state: 'CROSS_DEVICE_SYNC_VERIFIED',
        folderPath: resolved,
        isAccessible: true,
        fileCount: validFiles.length,
        importedCount: allImports.length,
        hasCrossDeviceEvidence: true,
        evidenceSummary,
        message: `Cross-device sync verified! Received files from mobile device (${evidenceSummary}).`,
      }
    }

    return {
      state: 'LOCAL_IMPORT_VERIFIED',
      folderPath: resolved,
      isAccessible: true,
      fileCount: validFiles.length,
      importedCount: allImports.length,
      hasCrossDeviceEvidence: false,
      evidenceSummary: 'Files processed from local inbox folder without mobile sync metadata.',
      message: `Local import verified! ${validFiles.length} file(s) accessible and imported into Knowledge Hub.`,
    }
  }

  public executeFirstSuccessAction(options: {
    readonly successAction: 'SAVE_IDEA' | 'CREATE_TASK' | 'IMPORT_ASSIGNMENT' | 'EXPLORE_SAMPLE'
    readonly title?: string | undefined
    readonly text?: string | undefined
    readonly subjectCode?: string | undefined
    readonly dueDate?: string | undefined
  }): FirstSuccessResult {
    const action = options.successAction
    const title = options.title?.trim() || ''
    const text = options.text?.trim() || ''
    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    let createdItemId = ''
    let itemTitle = ''
    let collection = 'IDEA'
    let message = ''

    switch (action) {
      case 'SAVE_IDEA': {
        const finalTitle = title || 'First Saved Idea'
        const finalDesc = text || 'Quick thought captured into GRAVITAS local Knowledge Hub.'
        const saved = this.vault.saveIdea({
          title: finalTitle,
          originalText: finalDesc,
          category: 'Ideas',
          tags: ['first-success', 'idea'],
        })
        createdItemId = saved.id
        itemTitle = saved.title
        collection = 'IDEA'
        message = `Saved idea "${itemTitle}" to Knowledge Hub.`
        break
      }

      case 'CREATE_TASK': {
        const finalTitle = title || 'First Knowledge Hub Task'
        const finalDesc = text || 'Action item created during first-run onboarding.'
        const saved = this.vault.createTask({
          title: finalTitle,
          originalText: finalDesc,
          dueDate: options.dueDate || tomorrow,
          subject: options.subjectCode,
          tags: ['first-success', 'task'],
        })
        createdItemId = saved.id
        itemTitle = saved.title
        collection = 'PLAN_TASK'
        message = `Created task "${itemTitle}" (due ${saved.dueDate ?? 'soon'}).`
        break
      }

      case 'IMPORT_ASSIGNMENT': {
        const finalTitle = title || 'Assignment 1 Submission Draft'
        const finalDesc = text || 'Lecture homework questions and solution scratchpad.'
        const subjCode = options.subjectCode || 'CSE 2631'
        const entry = this.inbox.addSubjectSectionEntry({
          subjectCode: subjCode,
          bucket: 'ASSIGNMENTS',
          title: finalTitle,
          originalContent: finalDesc,
        })
        createdItemId = entry.entryId
        itemTitle = entry.title
        collection = 'ASSIGNMENT'
        message = `Imported assignment "${itemTitle}" into ${subjCode}.`
        break
      }

      case 'EXPLORE_SAMPLE': {
        const samples = this.vault.listIdeas()
        if (samples.length > 0) {
          createdItemId = samples[0]!.id
          itemTitle = samples[0]!.title
          collection = samples[0]!.collection
        } else {
          const sample = this.vault.saveIdea({
            title: 'Sample Knowledge Hub Item',
            originalText: 'Explore connections, search, and voice assistant commands.',
            category: 'Ideas',
            tags: ['sample'],
          })
          createdItemId = sample.id
          itemTitle = sample.title
          collection = 'IDEA'
        }
        message = `Sample item "${itemTitle}" ready for exploration.`
        break
      }
    }

    try {
      const current = readGravitasConfig(this.dataRoot)
      writeGravitasConfig(this.dataRoot, {
        onboarding: {
          ...current.onboarding,
          step: 'FIRST_SUCCESS',
        },
      })
    } catch {}

    return {
      success: true,
      action,
      createdItemId,
      itemTitle,
      collection,
      persisted: true,
      message,
    }
  }

  public completeOnboarding(): void {
    try {
      const current = readGravitasConfig(this.dataRoot)
      writeGravitasConfig(this.dataRoot, {
        onboarding: {
          ...current.onboarding,
          completed: true,
          completedAt: new Date().toISOString(),
          step: 'COMPLETED',
        },
      })
    } catch {}
  }

  public resetOnboarding(): void {
    try {
      const current = readGravitasConfig(this.dataRoot)
      writeGravitasConfig(this.dataRoot, {
        onboarding: {
          ...current.onboarding,
          completed: false,
          step: 'WELCOME',
        },
      })
    } catch {}
  }
}
