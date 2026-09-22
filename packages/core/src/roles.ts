/**
 * Canonical Reasoning Role Runtime Contract (Wave 12E)
 *
 * Establishes the authoritative role taxonomy, deterministic harness resolution,
 * capability separation, and independence invariants for Gravitas.
 *
 * Strictly non-presentation: contains NO visual, Three.js, wardrobe, or spatial coordinates.
 */

/**
 * The canonical 5 reasoning role identifiers in the Personal OS.
 */
export type AgentRoleId =
  | 'role:strategy:chief-planner'
  | 'role:engineering:frontend-engineer'
  | 'role:engineering:backend-engineer'
  | 'role:quality:independent-reviewer'
  | 'role:integration:integration-engineer'

/**
 * Organizational departments housing reasoning roles.
 */
export type DepartmentId =
  | 'CONTROL_STRATEGY'
  | 'ENGINEERING'
  | 'QUALITY'
  | 'INTEGRATION'

/**
 * Authority classes governing consequential actions and boundaries.
 */
export type AuthorityClass =
  | 'CODE_MUTATION'
  | 'DEPENDENCY_RESOLUTION'
  | 'INDEPENDENT_REVIEW'
  | 'INTEGRATION_GATE'
  | 'HUMAN_APPROVAL_BYPASS'
  | 'PRODUCTION_DEPLOY'
  | (string & {})

/**
 * Canonical Role Descriptor.
 */
export interface RoleDescriptor {
  readonly id: AgentRoleId
  readonly displayName: string
  readonly department: DepartmentId
  readonly responsibilities: readonly string[]
  readonly defaultCapabilities: readonly string[]
  readonly prohibitedAuthorities: readonly AuthorityClass[]
}

/**
 * Explicit task role requirement contract.
 */
export interface TaskRoleRequirement {
  readonly requiredRoleId: AgentRoleId
  readonly reason: string
}

/**
 * Provenance of how a role was assigned to a task.
 */
export type RoleAssignmentSource =
  | 'PLAN'
  | 'OPERATOR'
  | 'POLICY'
  | 'LEGACY_COMPATIBILITY'

/**
 * Authoritative role assignment record.
 */
export interface RoleAssignment {
  readonly taskId: string
  readonly roleId: AgentRoleId
  readonly assignedAt: string
  readonly source: RoleAssignmentSource
}

/**
 * Reason codes for deterministic harness resolution.
 */
export type HarnessSelectionReasonCode =
  | 'EXPLICIT_OPERATOR'
  | 'CAPABILITY_MATCH'
  | 'POLICY_DEFAULT'
  | 'HARNESS_UNAVAILABLE'
  | 'NO_QUALIFIED_HARNESS'

/**
 * Result of deterministic harness resolution for an assigned role.
 */
export interface HarnessSelection {
  readonly roleId: AgentRoleId
  readonly harnessId: string
  readonly reasonCode: HarnessSelectionReasonCode
  readonly details?: string | undefined
}

/**
 * Deterministic service identifiers (strictly non-LLM, non-character entities).
 */
export type DeterministicServiceId =
  | 'service:courier'
  | 'service:scheduler'
  | 'service:notification'
  | 'service:voice'
  | 'service:file-indexer'
  | 'service:git'
  | 'service:verification-runner'

export interface DeterministicServiceDescriptor {
  readonly id: DeterministicServiceId
  readonly name: string
  readonly purpose: string
  readonly isLlmWorker: false
}

// ─── CANONICAL REASONING ROLES REGISTRY ───────────────────────────────────────

export const CANONICAL_ROLE_DEFINITIONS: Record<AgentRoleId, RoleDescriptor> = Object.freeze({
  'role:strategy:chief-planner': {
    id: 'role:strategy:chief-planner',
    displayName: 'Chief Planner',
    department: 'CONTROL_STRATEGY',
    responsibilities: [
      'Decompose operator goal into directed acyclic task graph (DAG)',
      'Establish topological execution sequence and dependency constraints',
      'Assign required reasoning specialties to tasks',
      'Define acceptance criteria and verification requirements',
      'Never write production application code unless explicitly granted',
    ],
    defaultCapabilities: ['filesystem.read', 'git.read', 'git.status'],
    prohibitedAuthorities: ['CODE_MUTATION', 'HUMAN_APPROVAL_BYPASS'],
  },
  'role:engineering:frontend-engineer': {
    id: 'role:engineering:frontend-engineer',
    displayName: 'Frontend Engineer',
    department: 'ENGINEERING',
    responsibilities: [
      'Implement user interface components and styling systems',
      'Architect client-side state, event handlers, and data flows',
      'Ensure web accessibility, responsiveness, and performance',
      'Write deterministic Playwright and component tests',
    ],
    defaultCapabilities: [
      'filesystem.read',
      'filesystem.write',
      'filesystem.edit',
      'git.read',
      'git.status',
      'git.diff',
      'browser.navigate',
      'browser.click',
      'browser.fill',
      'browser.assert',
      'browser.screenshot',
    ],
    prohibitedAuthorities: ['HUMAN_APPROVAL_BYPASS', 'INDEPENDENT_REVIEW'],
  },
  'role:engineering:backend-engineer': {
    id: 'role:engineering:backend-engineer',
    displayName: 'Backend Engineer',
    department: 'ENGINEERING',
    responsibilities: [
      'Implement server services, REST APIs, and SSE event streaming',
      'Design domain models, FSM lifecycle transitions, and persistence',
      'Build and maintain external gateway and harness integrations',
      'Write unit, integration, and security verification tests',
    ],
    defaultCapabilities: [
      'filesystem.read',
      'filesystem.write',
      'filesystem.edit',
      'git.read',
      'git.status',
      'git.diff',
      'verifier.test',
      'verifier.build',
    ],
    prohibitedAuthorities: ['HUMAN_APPROVAL_BYPASS', 'INDEPENDENT_REVIEW'],
  },
  'role:quality:independent-reviewer': {
    id: 'role:quality:independent-reviewer',
    displayName: 'Independent Reviewer',
    department: 'QUALITY',
    responsibilities: [
      'Conduct rigorous architectural, security, and quality code reviews',
      'Verify task output against acceptance criteria and evidence requirements',
      'Inspect diff scopes for unintended modifications or security regressions',
      'Cannot approve work authored by itself (reviewer independence rule)',
    ],
    defaultCapabilities: ['filesystem.read', 'git.read', 'git.status', 'git.diff'],
    prohibitedAuthorities: ['CODE_MUTATION', 'HUMAN_APPROVAL_BYPASS'],
  },
  'role:integration:integration-engineer': {
    id: 'role:integration:integration-engineer',
    displayName: 'Integration Engineer',
    department: 'INTEGRATION',
    responsibilities: [
      'Reconcile independently produced task branch results',
      'Detect and resolve composition conflicts and merge boundaries',
      'Run end-to-end integration and smoke verification gates',
      'Prepare candidate integration branches without bypassing human approval',
    ],
    defaultCapabilities: [
      'filesystem.read',
      'filesystem.write',
      'filesystem.edit',
      'git.read',
      'git.status',
      'git.diff',
      'git.stage',
      'verifier.deterministic',
      'verifier.test',
      'verifier.build',
    ],
    prohibitedAuthorities: ['HUMAN_APPROVAL_BYPASS'],
  },
})

export const CANONICAL_ROLES: readonly RoleDescriptor[] = Object.freeze(
  Object.values(CANONICAL_ROLE_DEFINITIONS)
)

export const CANONICAL_ROLE_IDS: readonly AgentRoleId[] = Object.freeze([
  'role:strategy:chief-planner',
  'role:engineering:frontend-engineer',
  'role:engineering:backend-engineer',
  'role:quality:independent-reviewer',
  'role:integration:integration-engineer',
])

// ─── CANONICAL DETERMINISTIC SERVICES REGISTRY ───────────────────────────────

export const CANONICAL_DETERMINISTIC_SERVICES: Record<
  DeterministicServiceId,
  DeterministicServiceDescriptor
> = Object.freeze({
  'service:courier': {
    id: 'service:courier',
    name: 'Courier Service',
    purpose: 'Handles file downloads, external asset ingestion, and SHA256 integrity verification.',
    isLlmWorker: false,
  },
  'service:scheduler': {
    id: 'service:scheduler',
    name: 'Scheduler Service',
    purpose: 'Evaluates task dependency graphs, topological order, and triggers dispatch when ready.',
    isLlmWorker: false,
  },
  'service:notification': {
    id: 'service:notification',
    name: 'Notification Service',
    purpose: 'Dispatches bounded system notifications, alerts, and operator inbox updates.',
    isLlmWorker: false,
  },
  'service:voice': {
    id: 'service:voice',
    name: 'Voice / TTS Service',
    purpose: 'Renders spoken audio briefing output from pre-approved system scripts.',
    isLlmWorker: false,
  },
  'service:file-indexer': {
    id: 'service:file-indexer',
    name: 'File Indexer Service',
    purpose: 'Indexes repository files, AST symbols, and worktree file trees.',
    isLlmWorker: false,
  },
  'service:git': {
    id: 'service:git',
    name: 'Git Worktree Service',
    purpose: 'Allocates isolated git worktrees, creates branches, and manages commit refs.',
    isLlmWorker: false,
  },
  'service:verification-runner': {
    id: 'service:verification-runner',
    name: 'Verification Runner Service',
    purpose: 'Executes independent verification subprocesses (builds, tests, lints) deterministically.',
    isLlmWorker: false,
  },
})

// ─── PURE INVARIANTS & RESOLVERS ─────────────────────────────────────────────

/**
 * Type guard checking if a string is a canonical AgentRoleId.
 */
export function isCanonicalRoleId(roleId: string): roleId is AgentRoleId {
  return roleId in CANONICAL_ROLE_DEFINITIONS
}

/**
 * Retrieves the descriptor for a canonical role.
 */
export function getCanonicalRole(roleId: string): RoleDescriptor | undefined {
  if (isCanonicalRoleId(roleId)) {
    return CANONICAL_ROLE_DEFINITIONS[roleId]
  }
  return undefined
}

/**
 * Enforces the Reviewer Independence Invariant (B8):
 * AUTHOR_ROLE(task) must not equal REVIEW_ROLE(task result).
 */
export function checkReviewerIndependence(
  authorRoleId: string,
  reviewerRoleId: string
): { readonly allowed: boolean; readonly reason?: string } {
  if (!authorRoleId || !reviewerRoleId) {
    return {
      allowed: false,
      reason: 'Reviewer independence requires both author and reviewer role identifiers.',
    }
  }

  if (authorRoleId === reviewerRoleId) {
    return {
      allowed: false,
      reason: `Violation of Reviewer Independence: Author role '${authorRoleId}' cannot act as independent reviewer for its own output.`,
    }
  }

  return { allowed: true }
}

/**
 * Enforces Integrator vs Human Approval separation (B17):
 * Integration Engineer may never bypass human approval or auto-merge main.
 */
export function assertIntegratorAuthority(
  roleId: string,
  attemptedAction: 'MERGE_MAIN' | 'BYPASS_APPROVAL' | 'PREPARE_INTEGRATION' | 'RUN_INTEGRATION_TESTS'
): { readonly allowed: boolean; readonly reason?: string } {
  if (roleId === 'role:integration:integration-engineer') {
    if (attemptedAction === 'MERGE_MAIN' || attemptedAction === 'BYPASS_APPROVAL') {
      return {
        allowed: false,
        reason: `Violation of Governance: Integration Engineer cannot execute '${attemptedAction}'. Consequential merge requires explicit operator approval on the Mezzanine.`,
      }
    }
  }
  return { allowed: true }
}

export interface AvailableHarnessInfo {
  readonly id: string
  readonly isAvailable: boolean
  readonly capabilities: readonly string[]
}

/**
 * Deterministic Harness Resolver (B6):
 * Resolves a qualified harness for an assigned role and task requirements.
 * Deterministic — does NOT use an LLM to select a harness.
 */
export function resolveHarnessForRole(params: {
  readonly roleId: AgentRoleId
  readonly explicitHarnessId?: string | undefined
  readonly requiredCapabilities?: readonly string[] | undefined
  readonly availableHarnesses: readonly AvailableHarnessInfo[]
  readonly defaultHarnessPolicy?: Record<AgentRoleId, string> | undefined
}): HarnessSelection {
  const {
    roleId,
    explicitHarnessId,
    requiredCapabilities = [],
    availableHarnesses,
    defaultHarnessPolicy,
  } = params

  // 1. Explicit operator override
  if (explicitHarnessId) {
    const candidate = availableHarnesses.find((h) => h.id === explicitHarnessId)
    if (candidate && candidate.isAvailable) {
      return {
        roleId,
        harnessId: candidate.id,
        reasonCode: 'EXPLICIT_OPERATOR',
        details: `Operator explicitly assigned harness '${candidate.id}'.`,
      }
    }
    if (candidate && !candidate.isAvailable) {
      return {
        roleId,
        harnessId: explicitHarnessId,
        reasonCode: 'HARNESS_UNAVAILABLE',
        details: `Explicitly requested harness '${explicitHarnessId}' is currently unavailable.`,
      }
    }
  }

  // 2. Policy default for role
  const policyDefaultId = defaultHarnessPolicy?.[roleId]
  if (policyDefaultId) {
    const candidate = availableHarnesses.find((h) => h.id === policyDefaultId)
    if (candidate && candidate.isAvailable) {
      return {
        roleId,
        harnessId: candidate.id,
        reasonCode: 'POLICY_DEFAULT',
        details: `Selected default policy harness '${candidate.id}' for role '${roleId}'.`,
      }
    }
  }

  // 3. Capability match across available harnesses
  for (const harness of availableHarnesses) {
    if (!harness.isAvailable) continue
    const satisfiesAll = requiredCapabilities.every((cap) =>
      harness.capabilities.includes(cap)
    )
    if (satisfiesAll) {
      return {
        roleId,
        harnessId: harness.id,
        reasonCode: 'CAPABILITY_MATCH',
        details: `Harness '${harness.id}' satisfies all required capabilities for role '${roleId}'.`,
      }
    }
  }

  // 4. Fallback to any available harness if no specific capabilities are required
  if (requiredCapabilities.length === 0) {
    const available = availableHarnesses.find((h) => h.isAvailable)
    if (available) {
      return {
        roleId,
        harnessId: available.id,
        reasonCode: 'POLICY_DEFAULT',
        details: `Fallback to first available qualified harness '${available.id}'.`,
      }
    }
  }

  // 5. No qualified harness
  return {
    roleId,
    harnessId: 'UNKNOWN',
    reasonCode: 'NO_QUALIFIED_HARNESS',
    details: `No available harness qualifies for role '${roleId}'.`,
  }
}
