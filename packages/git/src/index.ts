/**
 * @gravitas/git — Public Export Boundary
 *
 * Git subprocess boundary, repository inspection, worktree allocation,
 * and ref safety.
 */

// Types
export type {
  GitExecutionOptions,
  GitExecutionResult,
  GitRemote,
  RepositoryInspection,
  CleanlinessPolicy,
  WorktreeAllocationInput,
  WorktreeAllocation,
  WorktreeInspection,
  WorktreeRemovalResult,
} from './types.js'

// Errors
export {
  GitExecutionError,
  RepositoryInspectionError,
  UnsafeRefError,
  WorktreeAllocationError,
  WorktreeRemovalError,
} from './errors.js'

// Git process boundary
export {
  executeGit,
  runGit,
  sanitizeGitOutput,
} from './process.js'

// Ref safety & identifiers
export {
  validateIdentifier,
  buildTaskBranchName,
  assertValidGitBranchRef,
} from './ref-safety.js'

// Repository inspector
export {
  inspectRepository,
  parseGitRemotes,
  parsePorcelainStatusV2,
} from './inspector.js'

// Worktree allocation & management
export {
  allocateWorktree,
  inspectWorktree,
  removeWorktree,
} from './worktree.js'
