/**
 * GRAVITAS K1 — Third-Party Tool Classification Registry
 *
 * Per the K1 directive, six external repositories were investigated and classified.
 * This file records those classifications as frozen architectural metadata.
 *
 * These classifications are NOT harnesses. They are policy records for external
 * code and tools that GRAVITAS may encounter or import.
 *
 * Classifications are FROZEN by human directive and must not be changed
 * without explicit human authorization.
 */

export type TrustLevel =
  | 'QUALIFIED'
  | 'CONDITIONAL'
  | 'UNQUALIFIED'
  | 'QUARANTINED'

export type ExecutionPolicy =
  | 'AUTONOMOUS_ALLOWED'
  | 'HUMAN_INITIATED_ONLY'
  | 'AUTONOMOUS_EXECUTION_FORBIDDEN'
  | 'QUARANTINED'
  | 'ADOPT_SELECTIVELY'
  | 'CHERRY_PICK_ONLY'

export type LicenseClassification =
  | 'OPEN_SOURCE_COMMERCIAL_OK'
  | 'OPEN_SOURCE_NON_COMMERCIAL'
  | 'COMMERCIAL_USE_RESTRICTED'
  | 'LICENSE_NOT_VERIFIED'
  | 'PROPRIETARY'

export interface ThirdPartyToolClassification {
  readonly repoRef: string        // e.g. 'owner/repo-name'
  readonly description: string
  readonly trust: TrustLevel
  readonly executionPolicy: ExecutionPolicy
  readonly licenseClassification: LicenseClassification
  readonly licenseNote?: string | undefined
  readonly installPolicy: string
  readonly autonomousExecutionPolicy: string
  readonly humanReviewRequired: boolean
  readonly notes: string
}

/**
 * FROZEN third-party tool classifications as mandated by K1 directive.
 */
export const THIRD_PARTY_TOOL_CLASSIFICATIONS: Readonly<Record<string, ThirdPartyToolClassification>> = {

  /**
   * Bhanunamikaze/Agentic-SEO-Skill
   * Classification: ADOPT_SELECTIVELY
   */
  'bhanunamikaze/agentic-seo-skill': {
    repoRef: 'Bhanunamikaze/Agentic-SEO-Skill',
    description: 'Agentic SEO skill for Antigravity',
    trust: 'CONDITIONAL',
    executionPolicy: 'ADOPT_SELECTIVELY',
    licenseClassification: 'LICENSE_NOT_VERIFIED',
    installPolicy: 'SELECTIVE_IMPORT_ONLY — cherry-pick specific skill definitions',
    autonomousExecutionPolicy: 'ADOPT_SELECTIVELY: evaluate each skill individually before adoption',
    humanReviewRequired: true,
    notes:
      'Do not inject globally. Evaluate skill content before adoption. ' +
      'SEO automation capabilities must be reviewed for scope and unintended data access.',
  },

  /**
   * Sn4kyGit/antigravity-project-starter
   * Classification: CHERRY_PICK_ONLY
   */
  'sn4kygit/antigravity-project-starter': {
    repoRef: 'Sn4kyGit/antigravity-project-starter',
    description: 'Antigravity project starter template',
    trust: 'CONDITIONAL',
    executionPolicy: 'CHERRY_PICK_ONLY',
    licenseClassification: 'LICENSE_NOT_VERIFIED',
    installPolicy: 'CHERRY_PICK_ONLY — do not run universal installer scripts',
    autonomousExecutionPolicy:
      'AUTONOMOUS_EXECUTION_FORBIDDEN for installation scripts. ' +
      'Cherry-pick individual patterns or configs only.',
    humanReviewRequired: true,
    notes:
      'Universal installer scripts may install unexpected dependencies or ' +
      'reconfigure system paths. Human review of any script before execution is mandatory.',
  },

  /**
   * Aminetwiti/antigravity-patch-proxy-remote
   * Classification: REQUIRES_REVIEW
   */
  'aminetwiti/antigravity-patch-proxy-remote': {
    repoRef: 'Aminetwiti/antigravity-patch-proxy-remote',
    description: 'Remote daemon concept + IDE patcher for Antigravity',
    trust: 'UNQUALIFIED',
    executionPolicy: 'HUMAN_INITIATED_ONLY',
    licenseClassification: 'LICENSE_NOT_VERIFIED',
    installPolicy:
      'NO_CREDENTIAL_WRITES_DURING_K1: Separate the remote daemon concept ' +
      '(structurally interesting) from the IDE patcher (HIGH RISK). ' +
      'Do not execute the patcher without human review.',
    autonomousExecutionPolicy:
      'AUTONOMOUS_EXECUTION_FORBIDDEN for patcher components. ' +
      'Daemon architecture may be reviewed for K2 IPC patterns.',
    humanReviewRequired: true,
    notes:
      'Credential writes from patcher are FORBIDDEN during K1. ' +
      'Remote daemon concept may provide useful IPC architectural precedent for K2.',
  },

  /**
   * fulldiagnose/antigravity-fixer
   * Classification: HUMAN_INITIATED_ONLY / AUTONOMOUS_EXECUTION_FORBIDDEN
   */
  'fulldiagnose/antigravity-fixer': {
    repoRef: 'fulldiagnose/antigravity-fixer',
    description: 'Diagnostic and repair tool for Antigravity installations',
    trust: 'UNQUALIFIED',
    executionPolicy: 'HUMAN_INITIATED_ONLY',
    licenseClassification: 'LICENSE_NOT_VERIFIED',
    installPolicy:
      'NO_AUTONOMOUS_INSTALL: This tool is a diagnostic and repair utility. ' +
      'It must never be invoked autonomously by GRAVITAS agents.',
    autonomousExecutionPolicy:
      'AUTONOMOUS_EXECUTION_FORBIDDEN: ' +
      'This tool may repair, modify, or reconfigure system components. ' +
      'Only a human operator may initiate execution.',
    humanReviewRequired: true,
    notes:
      'Repair/fixer tools carry HIGH RISK of irreversible system changes. ' +
      'Classification: HUMAN_INITIATED_ONLY, AUTONOMOUS_EXECUTION_FORBIDDEN.',
  },

  /**
   * Draculabo/AntigravityManager
   * Classification: CONDITIONAL (license restricted)
   */
  'draculabo/antigravitymanager': {
    repoRef: 'Draculabo/AntigravityManager',
    description: 'Antigravity management utility',
    trust: 'CONDITIONAL',
    executionPolicy: 'HUMAN_INITIATED_ONLY',
    licenseClassification: 'COMMERCIAL_USE_RESTRICTED',
    licenseNote:
      'License: CC BY-NC-SA 4.0 — Non-commercial use only. ' +
      'DO_NOT_VENDOR_INTO_COMMERCIAL_PRODUCTS.',
    installPolicy:
      'DO_NOT_VENDOR_INTO_COMMERCIAL_PRODUCTS: ' +
      'This repository is licensed under CC BY-NC-SA 4.0. ' +
      'Cannot be included in any commercial product or service.',
    autonomousExecutionPolicy:
      'HUMAN_INITIATED_ONLY: License restrictions require human oversight. ' +
      'Autonomous dispatch BLOCKED pending legal review for commercial context.',
    humanReviewRequired: true,
    notes:
      'CC BY-NC-SA 4.0: Attribution required, NonCommercial, ShareAlike. ' +
      'DO_NOT_VENDOR_INTO_COMMERCIAL_PRODUCTS. ' +
      'If GRAVITAS is used commercially, legal review is required before inclusion.',
  },

  /**
   * lbjlaq/Antigravity-Tools-LS
   * Classification: QUARANTINED / DO NOT EXECUTE
   */
  'lbjlaq/antigravity-tools-ls': {
    repoRef: 'lbjlaq/Antigravity-Tools-LS',
    description: 'Antigravity tools collection (unknown provenance)',
    trust: 'QUARANTINED',
    executionPolicy: 'QUARANTINED',
    licenseClassification: 'LICENSE_NOT_VERIFIED',
    installPolicy:
      'INSTALL_GLOBAL=NO: Do not install globally or add to PATH. ' +
      'TRUST=UNQUALIFIED: Source and intent not verified.',
    autonomousExecutionPolicy:
      'EXECUTION=QUARANTINED: ' +
      'This repository has UNQUALIFIED trust level. ' +
      'No autonomous or human execution permitted until security review passes. ' +
      'Do not install or execute any component from this repository.',
    humanReviewRequired: true,
    notes:
      'TRUST=UNQUALIFIED. EXECUTION=QUARANTINED. INSTALL_GLOBAL=NO. ' +
      'Repository has not been security-reviewed. ' +
      'Do not install, run, or vendor any component until human security review completes.',
  },
}

/**
 * Retrieves the classification for a repository reference.
 * Repository references are normalized to lowercase for lookup.
 */
export function getThirdPartyClassification(
  repoRef: string
): ThirdPartyToolClassification | undefined {
  return THIRD_PARTY_TOOL_CLASSIFICATIONS[repoRef.toLowerCase()]
}

/**
 * Returns true if a repository is safe for selective adoption (not quarantined, not forbidden).
 */
export function isAdoptionAllowed(repoRef: string): boolean {
  const classification = getThirdPartyClassification(repoRef)
  if (!classification) return false
  return (
    classification.trust !== 'QUARANTINED' &&
    classification.executionPolicy !== 'QUARANTINED' &&
    classification.executionPolicy !== 'AUTONOMOUS_EXECUTION_FORBIDDEN'
  )
}
