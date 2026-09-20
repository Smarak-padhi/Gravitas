/**
 * Gravitas Living HQ — Coworker Identities & Personalities
 * Distinct autonomous team members inhabiting the Tactile Atelier.
 */

export type CoworkerPersonaId =
  | 'codex'
  | 'claude'
  | 'astra'
  | 'verifier'
  | 'browser-qa'
  | 'operator'
  | 'worker-slot'

export interface CoworkerIdentity {
  readonly id: string
  readonly name: string
  readonly roleTitle: string
  readonly floor: 1 | 2 | 3 | 4 // 1: Engineering, 2: Astra Studio, 3: Verification Lab, 4: Mezzanine
  readonly floorName: string
  readonly stationName: string
  readonly accentColor: string
  readonly bgTint: string
  readonly borderColor: string
  readonly toolName: string
  readonly toolGlyph: string
  readonly bio: string
  readonly garmentDescription: string
}

export const COWORKER_IDENTITIES: Record<string, CoworkerIdentity> = {
  codex: {
    id: 'codex',
    name: 'Codex',
    roleTitle: 'Engineering Specialist',
    floor: 1,
    floorName: 'Engineering Core',
    stationName: 'Drafting Workstation 01',
    accentColor: '#2B59C3',
    bgTint: '#EFF4FE',
    borderColor: '#93B4F5',
    toolName: 'Drafting T-Square & Compiler Engine',
    toolGlyph: '📐',
    bio: 'Direct, structured, surgical. Specializes in AST transformations, syntax constraints, and Git operations.',
    garmentDescription: 'Heavy denim apron with brass caliper pocket',
  },
  claude: {
    id: 'claude',
    name: 'Claude / FCC',
    roleTitle: 'Architectural Reasoning',
    floor: 1,
    floorName: 'Engineering Core',
    stationName: 'Drafting Workstation 02',
    accentColor: '#B45309',
    bgTint: '#FEF7ED',
    borderColor: '#FCD34D',
    toolName: 'Specification Scroll & Multi-File Buffer',
    toolGlyph: '📜',
    bio: 'Deep contextual thinker. Manages multi-file cohesion, refactoring boundaries, and contractual invariants.',
    garmentDescription: 'Woolen architect cardigan with notebook sleeve',
  },
  astra: {
    id: 'astra',
    name: 'Astra',
    roleTitle: 'Design & Interaction Authority',
    floor: 2,
    floorName: 'Astra Design Studio',
    stationName: 'Artisan Drafting Desk',
    accentColor: '#A855F7',
    bgTint: '#FAF5FF',
    borderColor: '#E9D8FD',
    toolName: 'Mineral Swatches & Motion Timing Ruler',
    toolGlyph: '✨',
    bio: 'Spatial and tactile experience collaborator. Crafts typography hierarchies, kinetic grammar, and visual contracts.',
    garmentDescription: 'Tailored studio smock with geometric horn-rimmed loupe',
  },
  verifier: {
    id: 'verifier',
    name: 'Independent Verifier',
    roleTitle: 'Evidence & Integrity Gate',
    floor: 3,
    floorName: 'Verification Lab',
    stationName: 'Cleanroom Inspection Bench',
    accentColor: '#3D7A68',
    bgTint: '#EBF5F1',
    borderColor: '#A3D4C4',
    toolName: 'Cryptographic Diff Scale & Test Harness',
    toolGlyph: '⚖️',
    bio: 'Impartial evidence authority. Ignores worker self-claims; executes shell tests and validates diff scopes.',
    garmentDescription: 'Unstained cleanroom coat with precision jeweler loupe',
  },
  'browser-qa': {
    id: 'browser-qa',
    name: 'Browser QA',
    roleTitle: 'Runtime DOM Validation',
    floor: 3,
    floorName: 'Verification Lab',
    stationName: 'Device Matrix Wall',
    accentColor: '#0D9488',
    bgTint: '#F0FDFA',
    borderColor: '#99F6E4',
    toolName: 'Multi-Viewport Frame & Event Inspector',
    toolGlyph: '📱',
    bio: 'Verifies real DOM rendering, layout stability, clickability, and zero horizontal scroll across devices.',
    garmentDescription: 'Light utility vest with multi-device belt clips',
  },
  operator: {
    id: 'operator',
    name: 'System Operator',
    roleTitle: 'Human Authority & Oversight',
    floor: 4,
    floorName: 'Operator Mezzanine',
    stationName: 'Observatory Control Desk',
    accentColor: '#D97706',
    bgTint: '#FFFBEB',
    borderColor: '#FDE68A',
    toolName: 'Wax Authorization Seal & Diff Loupe',
    toolGlyph: '🖋️',
    bio: 'Final authority on candidate mutations. Evaluates verified evidence before authorizing state materialization.',
    garmentDescription: 'Walnut leather desk ledger with brass seal stamper',
  },
}

/**
 * Deterministically maps any worker/harness identifier to its persona identity.
 */
export function resolveCoworkerIdentity(workerId: string, role?: string): CoworkerIdentity {
  const lowerId = workerId.toLowerCase()
  const lowerRole = (role ?? '').toLowerCase()

  if (lowerId.includes('astra')) return { ...COWORKER_IDENTITIES['astra']!, id: workerId }
  if (lowerId.includes('verifier') || lowerRole.includes('verifier')) return { ...COWORKER_IDENTITIES['verifier']!, id: workerId }
  if (lowerId.includes('qa') || lowerRole.includes('qa') || lowerRole.includes('browser')) return { ...COWORKER_IDENTITIES['browser-qa']!, id: workerId }
  if (lowerId.includes('operator') || lowerRole.includes('operator')) return { ...COWORKER_IDENTITIES['operator']!, id: workerId }
  if (lowerId.includes('codex')) return { ...COWORKER_IDENTITIES['codex']!, id: workerId }
  if (lowerId.includes('claude') || lowerId.includes('fcc') || lowerId.includes('fake-deterministic')) {
    return {
      ...COWORKER_IDENTITIES['claude']!,
      id: workerId,
      name: workerId === 'fake-deterministic-worker' ? 'Deterministic Worker' : COWORKER_IDENTITIES['claude']!.name,
    }
  }

  // Dynamic concurrent worker slot fallback
  return {
    id: workerId,
    name: workerId.startsWith('worker-') ? `Worker (${workerId.slice(7)})` : workerId,
    roleTitle: role || 'Concurrent Implementation Worker',
    floor: 1,
    floorName: 'Engineering Core',
    stationName: 'Concurrent Workstation',
    accentColor: '#2B59C3',
    bgTint: '#EFF4FE',
    borderColor: '#93B4F5',
    toolName: 'Task Worktree & Commit Pipe',
    toolGlyph: '🛠️',
    bio: 'Autonomous task-worktree executor operating inside isolated Git worktree.',
    garmentDescription: 'Workshop utility vest',
  }
}
