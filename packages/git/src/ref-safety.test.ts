import { describe, it, expect } from 'vitest'
import { UnsafeRefError } from './errors.js'
import {
  assertValidGitBranchRef,
  buildTaskBranchName,
  validateIdentifier,
} from './ref-safety.js'

describe('Git Ref and Identifier Safety', () => {
  describe('Valid identifiers', () => {
    it.each([
      ['run-001', 'run-001'],
      ['task_a', 'task_a'],
      ['step.1', 'step.1'],
      ['RUN_42-v2', 'RUN_42-v2'],
      ['alpha-beta-gamma', 'alpha-beta-gamma'],
    ])('accepts valid identifier "%s"', (input, expected) => {
      expect(validateIdentifier(input)).toBe(expected)
    })

    it('builds canonical task branch name gravitas/<runId>/<taskId>', () => {
      const branch = buildTaskBranchName('run-001', 'task-alpha')
      expect(branch).toBe('gravitas/run-001/task-alpha')
    })
  })

  describe('Mandatory rejection of malicious and unsafe inputs', () => {
    const maliciousInputs = [
      ['../foo', 'consecutive dots / traversal'],
      ['../../main', 'deep path traversal'],
      ['foo bar', 'whitespace'],
      ['foo\tbar', 'tab whitespace'],
      ['foo\nbar', 'newline whitespace'],
      ['foo~bar', 'tilde'],
      ['foo^bar', 'caret'],
      ['foo:bar', 'colon'],
      ['foo?bar', 'question mark'],
      ['foo*bar', 'asterisk / glob'],
      ['foo[bar', 'bracket / glob'],
      ['-leading', 'leading hyphen (flag injection)'],
      ['trailing.', 'trailing period'],
      ['.leading', 'leading period'],
      ['/leading', 'leading slash'],
      ['trailing/', 'trailing slash'],
      ['foo..bar', 'consecutive dots'],
      ['foo//bar', 'consecutive slashes'],
      ['task.lock', 'ending with .lock'],
      ['@', 'git @ token'],
      ['@{upstream}', 'git @{ token'],
      ['HEAD', 'git HEAD token'],
      ['head', 'git head token'],
      ['', 'empty string'],
      ['   ', 'whitespace only'],
    ]

    it.each(maliciousInputs)('rejects "%s" (%s)', (input) => {
      expect(() => validateIdentifier(input)).toThrow(UnsafeRefError)
    })

    it('buildTaskBranchName rejects unsafe runId', () => {
      expect(() => buildTaskBranchName('../evil-run', 'task-1')).toThrow(UnsafeRefError)
      expect(() => buildTaskBranchName('-flag-injection', 'task-1')).toThrow(UnsafeRefError)
    })

    it('buildTaskBranchName rejects unsafe taskId', () => {
      expect(() => buildTaskBranchName('run-1', 'task~evil')).toThrow(UnsafeRefError)
      expect(() => buildTaskBranchName('run-1', 'task:name')).toThrow(UnsafeRefError)
    })
  })

  describe('Native git check-ref-format verification', () => {
    it('accepts valid branch names with git check-ref-format', async () => {
      await expect(assertValidGitBranchRef('gravitas/run-001/task-a')).resolves.toBeUndefined()
      await expect(assertValidGitBranchRef('feat/v0-golden-loop')).resolves.toBeUndefined()
    })

    it('rejects invalid branch names with git check-ref-format', async () => {
      await expect(assertValidGitBranchRef('-invalid-leading-dash')).rejects.toThrow(UnsafeRefError)
      await expect(assertValidGitBranchRef('invalid..double-dots')).rejects.toThrow(UnsafeRefError)
      await expect(assertValidGitBranchRef('invalid/trailing-dot.')).rejects.toThrow(UnsafeRefError)
    })
  })
})
