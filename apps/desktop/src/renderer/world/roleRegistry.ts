/**
 * GRAVITAS D4 — Role Visual Registry & Taxonomy Mapping
 *
 * Governing Invariants:
 * - ROLE != EXECUTOR != HARNESS != MODEL != PROVIDER != GATEWAY != PROCESS
 * - VISUAL_BOT != ROLE
 * - VISUAL_BOT != EXECUTOR
 * - VISUAL_BOT != HARNESS
 * - VISUAL_BOT != MODEL
 * - VISUAL_BOT != PROCESS
 * - VISUAL_BOT != CAPABILITY_GRANT
 * - VISUAL_PRESENCE != PROCESS_LIVENESS
 * - VISUAL_ACTIVITY != EXECUTION
 * - ANIMATION != EXECUTION
 * - BOT_SUCCESS_ANIMATION != VERIFIED_SUCCESS
 * - BOT_CELEBRATION != HUMAN_APPROVAL
 *
 * Tier 1: Core Reasoning Roles (7)
 * Tier 2: Specialist Domain Profiles (14)
 * Tier 3: Deterministic Mechanical Services (4)
 * Generic Fallback: for future/unregistered roles.
 */

export type RoleTier = 'TIER1_REASONING' | 'TIER2_SPECIALIST' | 'TIER3_MECHANICAL_SERVICE'

export interface RoleVisualArchetype {
  readonly roleId: string
  readonly tier: RoleTier
  readonly displayName: string
  readonly shapeCategory: 'HUMANOID_REASONER' | 'SPECIALIST_OPERATOR' | 'MECHANICAL_UNIT'
  readonly silhouette: 'CYLINDER_HEAD' | 'HELMET_OCTA' | 'CONE_PRISM' | 'TORUS_DEVICE' | 'BOX_UNIT'
  readonly primaryColor: number
  readonly emblem: string
  readonly defaultZone: 'OPERATIONS' | 'EXECUTION' | 'VERIFICATION' | 'HUMAN_GATE' | 'SYSTEM'
  readonly mechanicalService: boolean
}

export const TIER1_ROLE_IDS = [
  'role:strategy:chief-planner',
  'role:engineering:frontend-engineer',
  'role:engineering:backend-engineer',
  'role:engineering:desktop-engineer',
  'role:quality:independent-reviewer',
  'role:integration:integration-engineer',
  'role:governance:security-auditor',
] as const

export const TIER2_ROLE_IDS = [
  'role:research:technical-researcher',
  'role:design:design-library-scout',
  'role:architecture:pattern-librarian',
  'profile:domain:study-coach',
  'profile:domain:personal-coach',
  'profile:connector:calendar-agent',
  'profile:connector:inbox-agent',
  'profile:domain:lead-researcher',
  'profile:domain:business-analyst',
  'profile:external:outreach-assistant',
  'protocol:evaluation:architecture-arena',
  'profile:domain:systems-architect',
  'profile:domain:data-engineer',
  'profile:domain:devops-engineer',
] as const

export const TIER3_SERVICE_IDS = [
  'service:verification:deterministic-runner',
  'service:verification:browser-qa',
  'service:infrastructure:courier-jobs',
  'service:governance:mcp-tool-broker',
] as const

export const CANONICAL_ROLE_REGISTRY: Readonly<Record<string, RoleVisualArchetype>> = {
  // ── Tier 1: Core Reasoning Roles (7) ──────────────────────────────────────
  'role:strategy:chief-planner': {
    roleId: 'role:strategy:chief-planner',
    tier: 'TIER1_REASONING',
    displayName: 'Chief Planner',
    shapeCategory: 'HUMANOID_REASONER',
    silhouette: 'CYLINDER_HEAD',
    primaryColor: 0x38bdf8, // Sky blue
    emblem: '♜',
    defaultZone: 'OPERATIONS',
    mechanicalService: false,
  },
  'role:engineering:frontend-engineer': {
    roleId: 'role:engineering:frontend-engineer',
    tier: 'TIER1_REASONING',
    displayName: 'Frontend Engineer',
    shapeCategory: 'HUMANOID_REASONER',
    silhouette: 'CYLINDER_HEAD',
    primaryColor: 0x818cf8, // Indigo
    emblem: '◧',
    defaultZone: 'EXECUTION',
    mechanicalService: false,
  },
  'role:engineering:backend-engineer': {
    roleId: 'role:engineering:backend-engineer',
    tier: 'TIER1_REASONING',
    displayName: 'Backend Engineer',
    shapeCategory: 'HUMANOID_REASONER',
    silhouette: 'CYLINDER_HEAD',
    primaryColor: 0x6366f1, // Blue-indigo
    emblem: '⚙',
    defaultZone: 'EXECUTION',
    mechanicalService: false,
  },
  'role:engineering:desktop-engineer': {
    roleId: 'role:engineering:desktop-engineer',
    tier: 'TIER1_REASONING',
    displayName: 'Desktop Runtime Engineer',
    shapeCategory: 'HUMANOID_REASONER',
    silhouette: 'CYLINDER_HEAD',
    primaryColor: 0x06b6d4, // Cyan
    emblem: '◫',
    defaultZone: 'EXECUTION',
    mechanicalService: false,
  },
  'role:quality:independent-reviewer': {
    roleId: 'role:quality:independent-reviewer',
    tier: 'TIER1_REASONING',
    displayName: 'Independent Reviewer',
    shapeCategory: 'HUMANOID_REASONER',
    silhouette: 'HELMET_OCTA',
    primaryColor: 0xa855f7, // Purple
    emblem: '⚖',
    defaultZone: 'VERIFICATION',
    mechanicalService: false,
  },
  'role:integration:integration-engineer': {
    roleId: 'role:integration:integration-engineer',
    tier: 'TIER1_REASONING',
    displayName: 'Integration Engineer',
    shapeCategory: 'HUMANOID_REASONER',
    silhouette: 'CYLINDER_HEAD',
    primaryColor: 0x14b8a6, // Teal
    emblem: '☍',
    defaultZone: 'HUMAN_GATE',
    mechanicalService: false,
  },
  'role:governance:security-auditor': {
    roleId: 'role:governance:security-auditor',
    tier: 'TIER1_REASONING',
    displayName: 'Security Auditor',
    shapeCategory: 'HUMANOID_REASONER',
    silhouette: 'HELMET_OCTA',
    primaryColor: 0xe11d48, // Rose
    emblem: '🛡',
    defaultZone: 'VERIFICATION',
    mechanicalService: false,
  },

  // ── Tier 2: Specialist Domain Profiles (14) ───────────────────────────────
  'role:research:technical-researcher': {
    roleId: 'role:research:technical-researcher',
    tier: 'TIER2_SPECIALIST',
    displayName: 'Technical Researcher',
    shapeCategory: 'SPECIALIST_OPERATOR',
    silhouette: 'CONE_PRISM',
    primaryColor: 0xf59e0b, // Amber
    emblem: '🔍',
    defaultZone: 'OPERATIONS',
    mechanicalService: false,
  },
  'role:design:design-library-scout': {
    roleId: 'role:design:design-library-scout',
    tier: 'TIER2_SPECIALIST',
    displayName: 'Design Library Scout',
    shapeCategory: 'SPECIALIST_OPERATOR',
    silhouette: 'CONE_PRISM',
    primaryColor: 0xf43f5e, // Rose
    emblem: '🎨',
    defaultZone: 'OPERATIONS',
    mechanicalService: false,
  },
  'role:architecture:pattern-librarian': {
    roleId: 'role:architecture:pattern-librarian',
    tier: 'TIER2_SPECIALIST',
    displayName: 'Pattern Librarian',
    shapeCategory: 'SPECIALIST_OPERATOR',
    silhouette: 'CONE_PRISM',
    primaryColor: 0xec4899, // Pink
    emblem: '📚',
    defaultZone: 'OPERATIONS',
    mechanicalService: false,
  },
  'profile:domain:study-coach': {
    roleId: 'profile:domain:study-coach',
    tier: 'TIER2_SPECIALIST',
    displayName: 'Study Coach',
    shapeCategory: 'SPECIALIST_OPERATOR',
    silhouette: 'CONE_PRISM',
    primaryColor: 0x10b981, // Emerald
    emblem: '📖',
    defaultZone: 'OPERATIONS',
    mechanicalService: false,
  },
  'profile:domain:personal-coach': {
    roleId: 'profile:domain:personal-coach',
    tier: 'TIER2_SPECIALIST',
    displayName: 'Personal Coach',
    shapeCategory: 'SPECIALIST_OPERATOR',
    silhouette: 'CONE_PRISM',
    primaryColor: 0x059669, // Dark emerald
    emblem: '⏱',
    defaultZone: 'OPERATIONS',
    mechanicalService: false,
  },
  'profile:connector:calendar-agent': {
    roleId: 'profile:connector:calendar-agent',
    tier: 'TIER2_SPECIALIST',
    displayName: 'Calendar Agent',
    shapeCategory: 'SPECIALIST_OPERATOR',
    silhouette: 'CONE_PRISM',
    primaryColor: 0x3b82f6, // Blue
    emblem: '📅',
    defaultZone: 'OPERATIONS',
    mechanicalService: false,
  },
  'profile:connector:inbox-agent': {
    roleId: 'profile:connector:inbox-agent',
    tier: 'TIER2_SPECIALIST',
    displayName: 'Inbox Agent',
    shapeCategory: 'SPECIALIST_OPERATOR',
    silhouette: 'CONE_PRISM',
    primaryColor: 0x2563eb, // Dark blue
    emblem: '✉',
    defaultZone: 'OPERATIONS',
    mechanicalService: false,
  },
  'profile:domain:lead-researcher': {
    roleId: 'profile:domain:lead-researcher',
    tier: 'TIER2_SPECIALIST',
    displayName: 'Lead Researcher',
    shapeCategory: 'SPECIALIST_OPERATOR',
    silhouette: 'CONE_PRISM',
    primaryColor: 0xd97706, // Amber dark
    emblem: '🔎',
    defaultZone: 'OPERATIONS',
    mechanicalService: false,
  },
  'profile:domain:business-analyst': {
    roleId: 'profile:domain:business-analyst',
    tier: 'TIER2_SPECIALIST',
    displayName: 'Business Analyst',
    shapeCategory: 'SPECIALIST_OPERATOR',
    silhouette: 'CONE_PRISM',
    primaryColor: 0xb45309, // Dark gold
    emblem: '📊',
    defaultZone: 'OPERATIONS',
    mechanicalService: false,
  },
  'profile:external:outreach-assistant': {
    roleId: 'profile:external:outreach-assistant',
    tier: 'TIER2_SPECIALIST',
    displayName: 'Outreach Assistant',
    shapeCategory: 'SPECIALIST_OPERATOR',
    silhouette: 'CONE_PRISM',
    primaryColor: 0x9333ea, // Purple dark
    emblem: '📢',
    defaultZone: 'OPERATIONS',
    mechanicalService: false,
  },
  'protocol:evaluation:architecture-arena': {
    roleId: 'protocol:evaluation:architecture-arena',
    tier: 'TIER2_SPECIALIST',
    displayName: 'Architecture Arena Evaluator',
    shapeCategory: 'SPECIALIST_OPERATOR',
    silhouette: 'CONE_PRISM',
    primaryColor: 0x8b5cf6, // Violet
    emblem: '⚔',
    defaultZone: 'OPERATIONS',
    mechanicalService: false,
  },
  'profile:domain:systems-architect': {
    roleId: 'profile:domain:systems-architect',
    tier: 'TIER2_SPECIALIST',
    displayName: 'Systems Architect',
    shapeCategory: 'SPECIALIST_OPERATOR',
    silhouette: 'CONE_PRISM',
    primaryColor: 0x0284c7, // Light blue
    emblem: '🏛',
    defaultZone: 'OPERATIONS',
    mechanicalService: false,
  },
  'profile:domain:data-engineer': {
    roleId: 'profile:domain:data-engineer',
    tier: 'TIER2_SPECIALIST',
    displayName: 'Data Engineer',
    shapeCategory: 'SPECIALIST_OPERATOR',
    silhouette: 'CONE_PRISM',
    primaryColor: 0x0d9488, // Teal dark
    emblem: '🗄',
    defaultZone: 'EXECUTION',
    mechanicalService: false,
  },
  'profile:domain:devops-engineer': {
    roleId: 'profile:domain:devops-engineer',
    tier: 'TIER2_SPECIALIST',
    displayName: 'DevOps Engineer',
    shapeCategory: 'SPECIALIST_OPERATOR',
    silhouette: 'CONE_PRISM',
    primaryColor: 0x475569, // Slate
    emblem: '🚢',
    defaultZone: 'EXECUTION',
    mechanicalService: false,
  },

  // ── Tier 3: Deterministic Mechanical Services (4) ─────────────────────────
  'service:verification:deterministic-runner': {
    roleId: 'service:verification:deterministic-runner',
    tier: 'TIER3_MECHANICAL_SERVICE',
    displayName: 'Deterministic Verifier Runner',
    shapeCategory: 'MECHANICAL_UNIT',
    silhouette: 'BOX_UNIT',
    primaryColor: 0x64748b, // Industrial Slate
    emblem: '▣',
    defaultZone: 'VERIFICATION',
    mechanicalService: true,
  },
  'service:verification:browser-qa': {
    roleId: 'service:verification:browser-qa',
    tier: 'TIER3_MECHANICAL_SERVICE',
    displayName: 'Browser QA Service',
    shapeCategory: 'MECHANICAL_UNIT',
    silhouette: 'TORUS_DEVICE',
    primaryColor: 0x475569, // Dark slate
    emblem: '🌐',
    defaultZone: 'VERIFICATION',
    mechanicalService: true,
  },
  'service:infrastructure:courier-jobs': {
    roleId: 'service:infrastructure:courier-jobs',
    tier: 'TIER3_MECHANICAL_SERVICE',
    displayName: 'Courier Job Service',
    shapeCategory: 'MECHANICAL_UNIT',
    silhouette: 'BOX_UNIT',
    primaryColor: 0x71717a, // Zinc
    emblem: '📦',
    defaultZone: 'EXECUTION',
    mechanicalService: true,
  },
  'service:governance:mcp-tool-broker': {
    roleId: 'service:governance:mcp-tool-broker',
    tier: 'TIER3_MECHANICAL_SERVICE',
    displayName: 'MCP Tool Broker Service',
    shapeCategory: 'MECHANICAL_UNIT',
    silhouette: 'TORUS_DEVICE',
    primaryColor: 0x52525b, // Dark zinc
    emblem: '🔌',
    defaultZone: 'SYSTEM',
    mechanicalService: true,
  },
}

/**
 * Resolves a roleId to a deterministic visual archetype.
 * Normalizes short names (e.g. 'role:planner' or 'chief-planner') to standard keys.
 * Unknown role IDs receive a safe generic fallback without failing or inflating authority.
 */
export function resolveRoleArchetype(roleId: string): RoleVisualArchetype {
  if (!roleId || typeof roleId !== 'string') {
    return createGenericFallback('unknown-empty-role')
  }

  // Exact match
  if (CANONICAL_ROLE_REGISTRY[roleId]) {
    return CANONICAL_ROLE_REGISTRY[roleId]!
  }

  // Common aliases / normalization
  const normalized = roleId.toLowerCase()
  for (const [key, val] of Object.entries(CANONICAL_ROLE_REGISTRY)) {
    if (key.endsWith(`:${normalized}`) || key.endsWith(`/${normalized}`) || val.displayName.toLowerCase() === normalized) {
      return val
    }
  }

  if (normalized.includes('chief-planner') || normalized.includes('planner')) {
    return CANONICAL_ROLE_REGISTRY['role:strategy:chief-planner']!
  }
  if (normalized.includes('frontend')) {
    return CANONICAL_ROLE_REGISTRY['role:engineering:frontend-engineer']!
  }
  if (normalized.includes('backend')) {
    return CANONICAL_ROLE_REGISTRY['role:engineering:backend-engineer']!
  }
  if (normalized.includes('desktop')) {
    return CANONICAL_ROLE_REGISTRY['role:engineering:desktop-engineer']!
  }
  if (normalized.includes('reviewer')) {
    return CANONICAL_ROLE_REGISTRY['role:quality:independent-reviewer']!
  }
  if (normalized.includes('integrat')) {
    return CANONICAL_ROLE_REGISTRY['role:integration:integration-engineer']!
  }
  if (normalized.includes('security') || normalized.includes('auditor')) {
    return CANONICAL_ROLE_REGISTRY['role:governance:security-auditor']!
  }
  if (normalized.includes('verifier') || normalized.includes('runner')) {
    return CANONICAL_ROLE_REGISTRY['service:verification:deterministic-runner']!
  }
  if (normalized.includes('browser-qa') || normalized.includes('browser')) {
    return CANONICAL_ROLE_REGISTRY['service:verification:browser-qa']!
  }
  if (normalized.includes('courier')) {
    return CANONICAL_ROLE_REGISTRY['service:infrastructure:courier-jobs']!
  }
  if (normalized.includes('mcp') || normalized.includes('broker')) {
    return CANONICAL_ROLE_REGISTRY['service:governance:mcp-tool-broker']!
  }

  return createGenericFallback(roleId)
}

function createGenericFallback(roleId: string): RoleVisualArchetype {
  return {
    roleId,
    tier: 'TIER2_SPECIALIST',
    displayName: `Generic Role [${roleId}]`,
    shapeCategory: 'SPECIALIST_OPERATOR',
    silhouette: 'CONE_PRISM',
    primaryColor: 0x94a3b8, // Neutral slate
    emblem: '◇',
    defaultZone: 'OPERATIONS',
    mechanicalService: false,
  }
}
