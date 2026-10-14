import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { isSemesterCourse } from './renderer/renderer.js'
import { KnowledgeHubStore } from './assistant/ideasVault.js'
import { ICloudAssignmentInbox } from './assistant/icloudInbox.js'

describe('GRAVITAS Desktop V1 — Gate 2 (Phase B: Workspace and Subjects)', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gravitas-phase-b-test-'))
  })

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch {}
  })

  describe('1. Course & Discipline Classification (isSemesterCourse)', () => {
    it('classifies all 7 university curriculum courses as semester courses', () => {
      const semesterCourses = [
        'CSE 2195',
        'CSE 2221',
        'CSE 2631',
        'MTH 2002',
        'MTH 2787',
        'CHM 2041',
        'GET 1433',
      ]

      for (const code of semesterCourses) {
        expect(isSemesterCourse(code)).toBe(true)
      }
    })

    it('classifies all 3 foundational subjects as non-semester disciplines', () => {
      const foundational = ['Mathematics', 'Computer Science', 'Physics']

      for (const name of foundational) {
        expect(isSemesterCourse(name)).toBe(false)
      }
    })

    it('handles whitespace, lowercase, and missing inputs gracefully', () => {
      expect(isSemesterCourse('  cse 2195  ')).toBe(true)
      expect(isSemesterCourse('mth 2002')).toBe(true)
      expect(isSemesterCourse('')).toBe(false)
      expect(isSemesterCourse(undefined)).toBe(false)
    })
  })

  describe('2. Data Preservation & Subject Partitioning', () => {
    it('initializes default subjects preserving 7 semester courses and 3 foundational subjects', () => {
      const hub = new KnowledgeHubStore(tempDir)
      const inbox = new ICloudAssignmentInbox({ vault: hub, dataRoot: tempDir })

      // Seed 3 foundational disciplines as onboarding does
      const defaultStarters = ['Mathematics', 'Computer Science', 'Physics']
      for (const code of defaultStarters) {
        inbox.createSemesterSubject({ code, name: code, credits: 4 })
      }

      const subjects = inbox.listSemesterSubjects()
      expect(subjects).toHaveLength(10)

      const semester = subjects.filter((s) => isSemesterCourse(s.code))
      const foundational = subjects.filter((s) => !isSemesterCourse(s.code))

      expect(semester).toHaveLength(7)
      expect(foundational).toHaveLength(3)

      const foundationalCodes = foundational.map((s) => s.code).sort()
      expect(foundationalCodes).toEqual(['Computer Science', 'Mathematics', 'Physics'])

      hub.close()
    })

    it('does not delete, overwrite, or mutate generic subjects when querying or updating', () => {
      const hub = new KnowledgeHubStore(tempDir)
      const inbox = new ICloudAssignmentInbox({ vault: hub, dataRoot: tempDir })

      const defaultStarters = ['Mathematics', 'Computer Science', 'Physics']
      for (const code of defaultStarters) {
        inbox.createSemesterSubject({ code, name: code, credits: 4 })
      }

      const math = inbox.getSemesterSubject('Mathematics')
      expect(math).toBeDefined()
      expect(math?.name).toBe('Mathematics')
      expect(math?.credits).toBe(4)

      const cs = inbox.getSemesterSubject('Computer Science')
      expect(cs).toBeDefined()
      expect(cs?.name).toBe('Computer Science')

      const phys = inbox.getSemesterSubject('Physics')
      expect(phys).toBeDefined()
      expect(phys?.name).toBe('Physics')

      hub.close()
    })
  })

  describe('3. Real Subject Activity Reporting (Truthful Counts, No Repetitive Zeroes)', () => {
    it('truthfully reports zero activity for inactive subjects without dummy badges', () => {
      const hub = new KnowledgeHubStore(tempDir)
      new ICloudAssignmentInbox({ vault: hub, dataRoot: tempDir })
      const subjects = hub.listSubjects()

      const cse2195 = subjects.find((s) => s.code === 'CSE 2195')
      expect(cse2195).toBeDefined()
      expect(cse2195?.noteCount).toBe(0)
      expect(cse2195?.taskCount).toBe(0)
      expect(cse2195?.assignmentCount).toBe(0)

      hub.close()
    })

    it('accurately aggregates notes, revision tasks, and section entries when items are added', () => {
      const hub = new KnowledgeHubStore(tempDir)
      const inbox = new ICloudAssignmentInbox({ vault: hub, dataRoot: tempDir })

      // Add a study note linked to CSE 2195
      hub.saveStudyNote({
        title: 'Pandas DataFrames',
        originalText: 'Data cleaning and transformation methods.',
        subject: 'CSE 2195',
        topic: 'EDA',
      })

      // Add a task linked to CSE 2195
      hub.createTask({
        title: 'Submit Lab 1 report',
        originalText: 'Submit Lab 1 report by Friday.',
        subject: 'CSE 2195',
      })

      // Add a section entry in bucket ASSIGNMENTS
      inbox.addSubjectSectionEntry({
        subjectCode: 'CSE 2195',
        bucket: 'ASSIGNMENTS',
        title: 'Lab 1 - Exploratory Data Analysis',
        originalContent: 'Analyze customer purchase datasets using pandas and matplotlib.',
      })

      const subjects = hub.listSubjects()
      const cse = subjects.find((s) => s.code === 'CSE 2195')
      expect(cse).toBeDefined()
      expect(cse?.noteCount).toBe(1)
      expect(cse?.taskCount).toBe(1)
      expect(cse?.assignmentCount).toBe(1)

      hub.close()
    })
  })

  describe('4. Dedicated Subject Workspace (5 Buckets Projection)', () => {
    it('returns full 5-bucket projection for semester courses and foundational disciplines', () => {
      const hub = new KnowledgeHubStore(tempDir)
      const inbox = new ICloudAssignmentInbox({ vault: hub, dataRoot: tempDir })

      // Add entries across buckets
      inbox.addSubjectSectionEntry({
        subjectCode: 'CSE 2631',
        bucket: 'NOTES',
        title: 'Divide & Conquer Recurrences',
        originalContent: 'Master theorem cases and master theorem recurrence examples.',
      })
      inbox.addSubjectSectionEntry({
        subjectCode: 'CSE 2631',
        bucket: 'ASSIGNMENTS',
        title: 'Assignment 2: Sorting Complexities',
        originalContent: 'Compare QuickSort and MergeSort under worst-case inputs.',
      })
      inbox.addSubjectSectionEntry({
        subjectCode: 'CSE 2631',
        bucket: 'ANSWERS',
        title: 'Proof for MergeSort O(n log n)',
        originalContent: 'Detailed induction proof for recursion tree depth log2(n).',
      })
      inbox.addSubjectSectionEntry({
        subjectCode: 'CSE 2631',
        bucket: 'RESOURCES',
        title: 'CLRS Algorithms Textbook Reference',
        originalContent: 'Chapters 2 to 4 recommended readings.',
      })
      inbox.addSubjectSectionEntry({
        subjectCode: 'CSE 2631',
        bucket: 'REVISION_TASKS',
        title: 'Revise Master Theorem Proofs',
        originalContent: 'Prepare flashcards for case 1, 2, and 3.',
      })

      const workspace = inbox.getSubjectWorkspace('CSE 2631')
      expect(workspace).toBeDefined()
      expect(workspace.subject.code).toBe('CSE 2631')
      expect(workspace.subject.name).toBe('Algorithms Analysis and Design 1')
      expect(workspace.notes).toHaveLength(1)
      expect(workspace.notes[0]?.title).toBe('Divide & Conquer Recurrences')
      expect(workspace.assignments).toHaveLength(1)
      expect(workspace.assignments[0]?.title).toBe('Assignment 2: Sorting Complexities')
      expect(workspace.answers).toHaveLength(1)
      expect(workspace.answers[0]?.title).toBe('Proof for MergeSort O(n log n)')
      expect(workspace.resources).toHaveLength(1)
      expect(workspace.resources[0]?.title).toBe('CLRS Algorithms Textbook Reference')
      expect(workspace.revisionTasks).toHaveLength(1)
      expect(workspace.revisionTasks[0]?.title).toBe('Revise Master Theorem Proofs')

      hub.close()
    })
  })

  describe('5. Task Prioritization & State Persistence', () => {
    it('persists task completion toggle in SQLite', () => {
      const hub = new KnowledgeHubStore(tempDir)

      const task = hub.createTask({
        title: 'Review MTH 2002 Probability axioms',
        originalText: 'Review Kolmogorov probability axioms tonight.',
        subject: 'MTH 2002',
      })
      expect(task.completed).toBe(false)
      expect(task.completedAt).toBeNull()

      const completed = hub.setTaskCompletion(task.id, true)
      expect(completed.completed).toBe(true)
      expect(completed.completedAt).not.toBeNull()

      // Re-read from database
      const reRead = hub.getIdea(task.id)
      expect(reRead?.completed).toBe(true)
      expect(reRead?.completedAt).not.toBeNull()

      // Toggle back to incomplete
      const reopened = hub.setTaskCompletion(task.id, false)
      expect(reopened.completed).toBe(false)
      expect(reopened.completedAt).toBeNull()

      hub.close()
    })
  })
})
