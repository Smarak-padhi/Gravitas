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
} from './mutation.js'

// Claude Code harness adapter
export {
  ClaudeCodeHarness,
  buildClaudeCliArgs,
  resolveClaudeExecutable,
} from './claude-code.js'
