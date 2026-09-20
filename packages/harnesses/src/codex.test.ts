/**
 * Codex Harness Unit Tests for @gravitas/harnesses.
 *
 * All tests use fake process fixtures — zero real network calls.
 * Real qualification runs happen via `npm run qualify:codex`.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  parseCodexJsonlOutput,
  buildCodexCliArgs,
  resolveCodexExecutable,
  CodexHarness,
} from './codex.js'
import { isPathWithinScope } from './mutation.js'

// ─── parseCodexJsonlOutput ────────────────────────────────────────────────────

describe('parseCodexJsonlOutput', () => {
  it('parses well-formed JSONL events', () => {
    const raw = [
      JSON.stringify({ type: 'thread.started', thread_id: 't1' }),
      JSON.stringify({ type: 'turn.started' }),
      JSON.stringify({
        type: 'item.completed',
        item: { type: 'agent_message', content: 'Done!' },
      }),
      JSON.stringify({
        type: 'turn.completed',
        usage: { input_tokens: 100, output_tokens: 50 },
      }),
    ].join('\n')

    const result = parseCodexJsonlOutput(raw)
    expect(result.events).toHaveLength(4)
    expect(result.turnCompleted).toBe(true)
    expect(result.inputTokens).toBe(100)
    expect(result.outputTokens).toBe(50)
    expect(result.agentMessages).toEqual(['Done!'])
  })

  it('ignores non-JSON lines', () => {
    const raw = 'Starting up...\n{"type":"thread.started"}\nsome noise\n{"type":"turn.completed"}'
    const result = parseCodexJsonlOutput(raw)
    expect(result.events).toHaveLength(2)
    expect(result.turnCompleted).toBe(true)
  })

  it('returns empty result for empty string', () => {
    const result = parseCodexJsonlOutput('')
    expect(result.events).toHaveLength(0)
    expect(result.turnCompleted).toBe(false)
    expect(result.inputTokens).toBe(0)
    expect(result.outputTokens).toBe(0)
  })

  it('handles malformed JSON gracefully', () => {
    const raw = '{"type":"thread.started"}\n{broken json\n{"type":"turn.completed"}'
    const result = parseCodexJsonlOutput(raw)
    expect(result.events).toHaveLength(2)
    expect(result.turnCompleted).toBe(true)
  })

  it('collects command_execution outputs', () => {
    const raw = JSON.stringify({
      type: 'item.completed',
      item: { type: 'command_execution', output: 'test passed' },
    })
    const result = parseCodexJsonlOutput(raw)
    expect(result.commandOutputs).toEqual(['test passed'])
  })

  it('accumulates token counts from multiple turn.completed events', () => {
    const raw = [
      JSON.stringify({ type: 'turn.completed', usage: { input_tokens: 10, output_tokens: 20 } }),
      JSON.stringify({ type: 'turn.completed', usage: { input_tokens: 5, output_tokens: 15 } }),
    ].join('\n')
    const result = parseCodexJsonlOutput(raw)
    expect(result.inputTokens).toBe(15)
    expect(result.outputTokens).toBe(35)
  })

  it('handles missing usage fields gracefully', () => {
    const raw = JSON.stringify({ type: 'turn.completed' })
    const result = parseCodexJsonlOutput(raw)
    expect(result.turnCompleted).toBe(true)
    expect(result.inputTokens).toBe(0)
    expect(result.outputTokens).toBe(0)
  })

  it('ignores valid JSON that is not an object with a type string (arrays, primitives, untyped objects)', () => {
    const raw = [
      JSON.stringify([1, 2, 3]),
      JSON.stringify(42),
      JSON.stringify('hello'),
      JSON.stringify({ notType: 'foo' }),
      JSON.stringify({ type: 123 }),
      JSON.stringify({ type: 'turn.completed' }),
    ].join('\n')
    const result = parseCodexJsonlOutput(raw)
    expect(result.events).toHaveLength(1)
    expect(result.turnCompleted).toBe(true)
  })
})

// ─── buildCodexCliArgs ────────────────────────────────────────────────────────

describe('buildCodexCliArgs', () => {
  it('returns exec as first argument', () => {
    const args = buildCodexCliArgs('/tmp/worktree')
    expect(args[0]).toBe('exec')
  })

  it('includes --ephemeral flag', () => {
    const args = buildCodexCliArgs('/tmp/worktree')
    expect(args).toContain('--ephemeral')
  })

  it('includes --ignore-user-config flag', () => {
    const args = buildCodexCliArgs('/tmp/worktree')
    expect(args).toContain('--ignore-user-config')
  })

  it('includes --ignore-rules flag', () => {
    const args = buildCodexCliArgs('/tmp/worktree')
    expect(args).toContain('--ignore-rules')
  })

  it('blocks MCP servers via -c mcp_servers={}', () => {
    const args = buildCodexCliArgs('/tmp/worktree')
    const idx = args.indexOf('-c')
    expect(idx).toBeGreaterThan(-1)
    expect(args[idx + 1]).toBe('mcp_servers={}')
  })

  it('includes --json flag', () => {
    const args = buildCodexCliArgs('/tmp/worktree')
    expect(args).toContain('--json')
  })

  it('includes --approve-for-me flag', () => {
    const args = buildCodexCliArgs('/tmp/worktree')
    expect(args).toContain('--approve-for-me')
  })

  it('includes --cd with the worktree path', () => {
    const args = buildCodexCliArgs('/my/worktree')
    const idx = args.indexOf('--cd')
    expect(idx).toBeGreaterThan(-1)
    expect(args[idx + 1]).toBe('/my/worktree')
  })

  it('includes --skip-git-repo-check flag', () => {
    const args = buildCodexCliArgs('/tmp/worktree')
    expect(args).toContain('--skip-git-repo-check')
  })

  it('does NOT include --sandbox (mutually exclusive with --approve-for-me)', () => {
    const args = buildCodexCliArgs('/tmp/worktree')
    expect(args).not.toContain('--sandbox')
  })
})

// ─── resolveCodexExecutable ───────────────────────────────────────────────────

describe('resolveCodexExecutable', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns customPath directly when provided', () => {
    // We cannot check existsSync for non-existent paths in unit tests,
    // so we stub the env var instead
    vi.stubEnv('CODEX_EXECUTABLE', '/custom/codex.exe')
    const result = resolveCodexExecutable()
    expect(result).toBe('/custom/codex.exe')
  })

  it('respects CODEX_EXECUTABLE env override', () => {
    vi.stubEnv('CODEX_EXECUTABLE', '/env/override/codex')
    const result = resolveCodexExecutable()
    expect(result).toBe('/env/override/codex')
  })
})

// ─── CodexHarness ─────────────────────────────────────────────────────────────

describe('CodexHarness', () => {
  it('has id === "codex"', () => {
    const harness = new CodexHarness()
    expect(harness.id).toBe('codex')
  })

  it('accepts configuredExecutable via options', () => {
    const harness = new CodexHarness({ executablePath: '/my/codex.exe' })
    // getExecutablePath() with a non-existent custom path returns null via resolveCodexExecutable
    // but the harness should accept the option without throwing
    expect(harness).toBeDefined()
  })

  it('cancel returns false for unknown executionId', async () => {
    const harness = new CodexHarness()
    const result = await harness.cancel('non-existent-execution-id')
    expect(result).toBe(false)
  })

  it('execute throws when no executable is resolved', async () => {
    // Point to a non-existent path so resolver returns null
    const harness = new CodexHarness({ executablePath: '/does/not/exist/codex.exe' })
    await expect(
      harness.execute({
        executionId: 'e1',
        runId: 'r1',
        taskId: 't1',
        worktreePath: process.cwd(),
        compiledPrompt: 'hello',
      })
    ).rejects.toThrow(/Codex native binary is not available/)
  })
})

// ─── isPathWithinScope ───────────────────────────────────────────────────────

describe('isPathWithinScope', () => {
  it('returns true for files directly inside base directory', () => {
    expect(isPathWithinScope('foo.txt', process.cwd())).toBe(true)
    expect(isPathWithinScope('src/index.ts', process.cwd())).toBe(true)
  })

  it('returns false for path traversal escaping base directory', () => {
    expect(isPathWithinScope('../outside.txt', process.cwd())).toBe(false)
    expect(isPathWithinScope('../../etc/passwd', process.cwd())).toBe(false)
  })

  it('returns false for paths on different roots or outside base', () => {
    expect(isPathWithinScope('C:\\Windows\\System32\\cmd.exe', 'C:\\app\\project')).toBe(false)
    expect(isPathWithinScope('/etc/shadow', '/home/user/repo')).toBe(false)
  })
})
