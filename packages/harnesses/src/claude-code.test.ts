import { describe, expect, it } from 'vitest'
import {
  buildClaudeCliArgs,
  ClaudeCodeHarness,
  resolveClaudeExecutable,
} from './claude-code.js'

describe('Claude Code Harness Adapter (claude-code.ts)', () => {
  describe('buildClaudeCliArgs', () => {
    it('constructs safe default arguments without dangerous permissions', () => {
      const args = buildClaudeCliArgs()

      expect(args).toEqual([
        '-p',
        '--output-format',
        'json',
        '--no-session-persistence',
        '--permission-mode',
        'acceptEdits',
        '--tools',
        'Edit,Read',
      ])

      // Strict negative assertions: must NEVER include permission bypasses
      expect(args).not.toContain('--dangerously-skip-permissions')
      expect(args).not.toContain('--bypass-permissions')
      expect(args).not.toContain('Bash')
    })

    it('allows tool whitelisting and custom output format', () => {
      const args = buildClaudeCliArgs({
        allowedTools: ['Edit', 'Read', 'Glob'],
        outputFormat: 'text',
        permissionMode: 'acceptEdits',
      })

      expect(args).toEqual([
        '-p',
        '--output-format',
        'text',
        '--no-session-persistence',
        '--permission-mode',
        'acceptEdits',
        '--tools',
        'Edit,Read,Glob',
      ])
    })
  })

  describe('resolveClaudeExecutable', () => {
    it('respects explicitly configured executable if it exists', () => {
      const customPath = process.execPath
      const resolved = resolveClaudeExecutable(customPath)
      expect(resolved).toBe(customPath)
    })

    it('resolves a string path across operating systems', () => {
      const resolved = resolveClaudeExecutable()
      expect(typeof resolved).toBe('string')
      expect(resolved?.length).toBeGreaterThan(0)
    })
  })

  describe('availability()', () => {
    it('queries host environment and returns structured readiness telemetry', async () => {
      const harness = new ClaudeCodeHarness()
      const availability = await harness.availability()

      expect(typeof availability.installed).toBe('boolean')
      expect(['AVAILABLE', 'AUTH_REQUIRED', 'INSTALLED', 'UNAVAILABLE']).toContain(
        availability.status
      )
      expect(typeof availability.usableNoninteractive).toBe('boolean')

      if (availability.installed) {
        expect(availability.version).toBeDefined()
        expect(availability.version).toContain('Claude Code')
      }
    })

    it('accurately reports UNAVAILABLE when configured with non-existent binary', async () => {
      const nonExistent = new ClaudeCodeHarness({
        executablePath: 'C:\\__definitely_non_existent_claude_binary_99999__.exe',
      })
      const availability = await nonExistent.availability()

      expect(availability.installed).toBe(false)
      expect(availability.status).toBe('UNAVAILABLE')
      expect(availability.usableNoninteractive).toBe(false)
    })
  })

  describe('cancel()', () => {
    it('returns false when attempting to cancel non-existent executionId', async () => {
      const harness = new ClaudeCodeHarness()
      const cancelled = await harness.cancel('non-existent-exec-id')
      expect(cancelled).toBe(false)
    })
  })
})
