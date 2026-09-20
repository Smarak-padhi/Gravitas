/**
 * @gravitas/harnesses — Public Export Boundary
 *
 * Provider-neutral agent harness interfaces, process execution,
 * worktree mutation capture, and Claude Code adapter.
 */

// Domain types
export type {
  HarnessAvailabilityStatus,
  HarnessAvailability,
  HarnessPermissions,
  AgentExecutionRequest,
  TerminationReason,
  AgentExecutionResult,
  AgentHarness,
  WorktreeSnapshot,
  MutationCapture,
} from './types.js'

// Domain errors
export {
  HarnessExecutionError,
  HarnessUnavailableError,
  ProcessTimeoutError,
  ProcessCancellationError,
  MutationScopeError,
} from './errors.js'

// Process execution boundary
export {
  runSubprocess,
  killProcessTree,
  sanitizeOutput,
  DEFAULT_MAX_OUTPUT_BYTES,
  type SubprocessLaunchOptions,
  type SubprocessHandle,
  type SubprocessRunResult,
} from './process.js'

// Mutation capture & scope detection
export {
  takeWorktreeSnapshot,
  captureWorktreeMutation,
  normalizePathForScope,
  isPathWithinScope,
} from './mutation.js'

// Claude Code harness adapter (Official)
export {
  ClaudeCodeHarness,
  buildClaudeCliArgs,
  resolveClaudeExecutable,
} from './claude-code.js'

// Free Claude Code harness adapter (FCC Launcher + Local Proxy)
export {
  FreeClaudeCodeHarness,
  buildFccCliArgs,
  resolveFccLauncher,
  checkFccProxyHealth,
  DEFAULT_FCC_PROXY_URL,
  type FccHealthResult,
  type FreeClaudeCodeHarnessOptions,
} from './free-claude-code.js'

// Codex harness adapter (OpenAI Codex CLI — Unqualified until qualification passes)
export {
  CodexHarness,
  buildCodexCliArgs,
  resolveCodexExecutable,
  parseCodexJsonlOutput,
  type CodexHarnessOptions,
  type CodexJsonlEvent,
  type CodexTurnCompletedEvent,
  type CodexItemCompletedEvent,
  type ParsedCodexEvents,
} from './codex.js'
