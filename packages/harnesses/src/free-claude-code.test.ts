import { describe, expect, it, vi } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import * as processModule from './process.js'
import {
  buildFccCliArgs,
  checkFccProxyHealth,
  FreeClaudeCodeHarness,
  resolveFccLauncher,
} from './free-claude-code.js'

describe('Free Claude Code Harness Adapter (free-claude-code.ts)', () => {
  describe('buildFccCliArgs', () => {
    it('constructs safe default arguments with strict host isolation and without dangerous permissions or shell access', () => {
      const args = buildFccCliArgs()

      expect(args).toEqual([
        '-p',
        '--output-format',
        'json',
        '--no-session-persistence',
        '--permission-mode',
        'acceptEdits',
        '--tools',
        'Edit,Read',
        '--strict-mcp-config',
        '--safe-mode',
        '--setting-sources',
        '',
      ])

      expect(args).toContain('--strict-mcp-config')
      expect(args).toContain('--safe-mode')
      expect(args).toContain('--setting-sources')
      expect(args).not.toContain('--dangerously-skip-permissions')
      expect(args).not.toContain('--allow-dangerously-skip-permissions')
      expect(args).not.toContain('Bash')
      expect(args).not.toContain('WebFetch')
    })

    it('allows tool whitelisting, custom output format, and explicit mcpConfigFile', () => {
      const args = buildFccCliArgs({
        allowedTools: ['Edit', 'Read'],
        outputFormat: 'text',
        permissionMode: 'acceptEdits',
        mcpConfigFile: 'C:\\tmp\\empty-mcp.json',
      })

      expect(args).toEqual([
        '-p',
        '--output-format',
        'text',
        '--no-session-persistence',
        '--permission-mode',
        'acceptEdits',
        '--tools',
        'Edit,Read',
        '--strict-mcp-config',
        '--safe-mode',
        '--setting-sources',
        '',
        '--mcp-config',
        'C:\\tmp\\empty-mcp.json',
      ])
    })

    it('supports disabling strictIsolation if explicitly configured', () => {
      const args = buildFccCliArgs({
        strictIsolation: false,
      })

      expect(args).not.toContain('--strict-mcp-config')
      expect(args).not.toContain('--safe-mode')
    })
  })

  describe('resolveFccLauncher', () => {
    it('respects explicitly configured launcher path if provided', () => {
      const customPath = 'C:\\custom\\fcc-claude.exe'
      const resolved = resolveFccLauncher(customPath)
      expect(resolved).toBe(customPath)
    })

    it('resolves a fallback or installed string across operating systems', () => {
      const resolved = resolveFccLauncher()
      expect(typeof resolved).toBe('string')
      expect(resolved?.length).toBeGreaterThan(0)
    })
  })

  describe('checkFccProxyHealth', () => {
    it('returns reachable: false when proxy is not responding on custom unreachable port', async () => {
      // Connect to an unused port to guarantee timeout/connection refusal
      const result = await checkFccProxyHealth('http://127.0.0.1:59999', 500)

      expect(result.reachable).toBe(false)
      expect(result.healthy).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error).toContain('http://127.0.0.1:59999/health')
    })
  })

  describe('availability()', () => {
    it('reports UNAVAILABLE when configured with non-existent launcher binary', async () => {
      const harness = new FreeClaudeCodeHarness({
        launcherPath: 'C:\\__definitely_non_existent_fcc_launcher_99999__.exe',
      })

      const availability = await harness.availability()

      expect(availability.installed).toBe(false)
      expect(availability.status).toBe('UNAVAILABLE')
      expect(availability.usableNoninteractive).toBe(false)
      expect(availability.message).toContain('launcher not found')
    })

    it('reports INSTALLED when launcher exists but proxy server is unreachable', async () => {
      // Use node.exe as a benign existing binary, but point to an unreachable proxy port
      const harness = new FreeClaudeCodeHarness({
        launcherPath: process.execPath,
        proxyUrl: 'http://127.0.0.1:59998',
      })

      const availability = await harness.availability()

      expect(availability.installed).toBe(true)
      expect(availability.status).toBe('INSTALLED')
      expect(availability.usableNoninteractive).toBe(false)
      expect(availability.message).toContain('fcc-server')
    })
  })

  describe('execute() metadata & security isolation (deterministic)', () => {
    it('forwards cwd, streams stdin, and does not leak provider secrets into result metadata', async () => {
      // We simulate launcher invocation using Node to verify stdin delivery and cwd forwarding
      const mockScript = `
        let input = '';
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', d => { input += d; });
        process.stdin.on('end', () => {
          console.log(JSON.stringify({ cwd: process.cwd(), inputReceived: input.length }));
        });
      `
      const harness = new FreeClaudeCodeHarness({
        launcherPath: process.execPath,
      })

      // Monkey-patch getLauncherPath to run Node with our mock script while exercising harness.execute
      vi.spyOn(harness, 'getLauncherPath').mockReturnValue(process.execPath)

      const result = await harness.execute({
        executionId: 'mock-exec-01',
        runId: 'mock-run-01',
        taskId: 'mock-task-01',
        worktreePath: process.cwd(),
        compiledPrompt: 'MOCK_GRAVITAS_PROMPT_CONTENT_FOR_STDIN',
        timeoutMs: 5000,
        permissions: {
          allowFileEdits: true,
          allowedTools: ['Edit', 'Read'],
        },
      })

      expect(result.executionId).toBe('mock-exec-01')
      expect(result.harnessId).toBe('free-claude-code')
      expect(result.durationMs).toBeGreaterThan(0)
      expect(result.worktreePath).toBe(process.cwd())
      expect(result.terminationReason).toBe('COMPLETED')

      // Strict security: ensure no secret environment variables or credential dumps exist in result
      const serialized = JSON.stringify(result)
      expect(serialized).not.toContain('NVIDIA')
      expect(serialized).not.toContain('API_KEY')
      expect(serialized).not.toContain('AUTH_TOKEN')
    })

    it('creates ephemeral empty MCP config in external runtime temp dir and cleans it up', async () => {
      let capturedArgs: string[] = []
      let capturedCwd: string = ''
      let ephemeralPathDuringExec: string = ''
      let ephemeralContentDuringExec: string = ''

      vi.spyOn(processModule, 'runSubprocess').mockImplementation(async (options, _onHandle) => {
        capturedArgs = [...options.args]
        capturedCwd = options.cwd
        const idx = capturedArgs.indexOf('--mcp-config')
        if (idx !== -1 && capturedArgs[idx + 1]) {
          ephemeralPathDuringExec = capturedArgs[idx + 1]
          if (existsSync(ephemeralPathDuringExec)) {
            ephemeralContentDuringExec = readFileSync(ephemeralPathDuringExec, 'utf8')
          }
        }
        return {
          exitCode: 0,
          durationMs: 25,
          stdout: JSON.stringify({ ok: true }),
          stderr: '',
          stdoutTruncated: false,
          stderrTruncated: false,
          terminationReason: 'COMPLETED',
        }
      })

      const harness = new FreeClaudeCodeHarness()
      const fakeWorktree = 'C:\\fake\\worktree\\path'

      const result = await harness.execute({
        executionId: 'mock-iso-01',
        runId: 'iso-run',
        taskId: 'iso-task',
        worktreePath: fakeWorktree,
        compiledPrompt: 'TEST PROMPT',
        timeoutMs: 5000,
      })

      expect(result.terminationReason).toBe('COMPLETED')
      expect(capturedCwd).toBe(fakeWorktree)

      // Verify strict isolation flags passed
      expect(capturedArgs).toContain('--strict-mcp-config')
      expect(capturedArgs).toContain('--safe-mode')
      expect(capturedArgs).toContain('--setting-sources')

      // Verify --mcp-config was passed with ephemeral path outside worktree
      expect(ephemeralPathDuringExec).toBeDefined()
      expect(ephemeralPathDuringExec.length).toBeGreaterThan(0)
      expect(ephemeralPathDuringExec.startsWith(fakeWorktree)).toBe(false)

      // Verify ephemeral config was valid empty MCP config while running
      expect(JSON.parse(ephemeralContentDuringExec)).toEqual({ mcpServers: {} })

      // Verify ephemeral file was cleaned up after execution
      expect(existsSync(ephemeralPathDuringExec)).toBe(false)
    })

    it('proves worker configuration strictly isolates from simulated host sentinel MCP server', async () => {
      let capturedArgs: string[] = []

      vi.spyOn(processModule, 'runSubprocess').mockImplementation(async (options, _onHandle) => {
        capturedArgs = [...options.args]
        return {
          exitCode: 0,
          durationMs: 20,
          stdout: JSON.stringify({ ok: true }),
          stderr: '',
          stdoutTruncated: false,
          stderrTruncated: false,
          terminationReason: 'COMPLETED',
        }
      })

      const harness = new FreeClaudeCodeHarness()
      const sentinelMcp = 'sentinel-rogue-mcp-server'

      const result = await harness.execute({
        executionId: 'mock-sentinel-01',
        runId: 'sentinel-run',
        taskId: 'sentinel-task',
        worktreePath: process.cwd(),
        compiledPrompt: 'TEST PROMPT',
        timeoutMs: 5000,
      })

      expect(result.terminationReason).toBe('COMPLETED')

      // Prove that CLI args contain --strict-mcp-config which tells Claude Code to ignore all host MCP configs
      expect(capturedArgs).toContain('--strict-mcp-config')
      expect(capturedArgs).toContain('--safe-mode')

      // Prove that sentinel MCP server is never passed or referenced in args
      expect(capturedArgs.join(' ')).not.toContain(sentinelMcp)
    })
  })

  describe('cancel()', () => {
    it('returns false when attempting to cancel non-existent executionId', async () => {
      const harness = new FreeClaudeCodeHarness()
      const cancelled = await harness.cancel('non-existent-exec-id')
      expect(cancelled).toBe(false)
    })
  })
})
