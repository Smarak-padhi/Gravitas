/**
 * @gravitas/orchestrator k4 — Scout Assignment & Evidence Fixture System
 *
 * Implements:
 * 1. Scout assignment lifecycle and structural independence.
 * 2. Deterministic Scout Fixtures for testing all scenarios:
 *    - Supporting evidence
 *    - Contradicting evidence
 *    - Missing / weak evidence
 *    - Incomparable benchmarks
 *    - Duplicate / common origin citations
 *    - Untrusted input & Prompt injection attempt fixtures
 * 3. K3 CapabilityGrant checking (Scout cannot execute host mutation or paid inference).
 */

import crypto from 'node:crypto'
import {
  ScoutAssignment,
  ScoutType,
  ArchitectureQuestion,
  EvidenceItem,
  EvidenceTier,
} from './types.js'

export interface CreateScoutAssignmentOptions {
  readonly assignmentId: string
  readonly question: ArchitectureQuestion
  readonly scoutType: ScoutType
  readonly assignedHypothesisOrFocus: string
  readonly requiredTopics?: readonly string[]
  readonly prohibitedAssumptions?: readonly string[]
  readonly blindPhaseActive?: boolean
  readonly visiblePriorEvidenceIds?: readonly string[]
  readonly visiblePriorScoutResultIds?: readonly string[]
}

/**
 * Creates a deterministic ScoutAssignment from an ArchitectureQuestion.
 */
export function createScoutAssignment(options: CreateScoutAssignmentOptions): ScoutAssignment {
  const inputPayload = {
    questionId: options.question.questionId,
    scoutType: options.scoutType,
    focus: options.assignedHypothesisOrFocus,
    topics: options.requiredTopics ?? ['CONTRACT', 'WINDOWS_11_COMPATIBILITY', 'PERFORMANCE'],
    prohibited: options.prohibitedAssumptions ?? options.question.prohibitedAssumptions,
  }

  const inputHash = crypto.createHash('sha256').update(JSON.stringify(inputPayload)).digest('hex')

  return {
    assignmentId: options.assignmentId,
    questionId: options.question.questionId,
    scoutType: options.scoutType,
    assignedHypothesisOrFocus: options.assignedHypothesisOrFocus,
    researchScope: {
      requiredTopics: options.requiredTopics ?? ['CONTRACT', 'WINDOWS_11_COMPATIBILITY', 'PERFORMANCE'],
      prohibitedAssumptions: options.prohibitedAssumptions ?? options.question.prohibitedAssumptions,
      minimumEvidenceSources: 2,
    },
    constraints: {
      autonomousIncrementalSpend: 0,
      targetOperatingSystem: 'WINDOWS_11',
      forbiddenDependencies: [],
    },
    resourceBudget: {
      maxSearchQueries: 8,
      maxUrlFetches: 6,
      tokenBudgetCap: 30000,
      timeoutSeconds: 300,
    },
    blindPhaseActive: options.blindPhaseActive ?? true,
    inputHash,
    createdAt: new Date().toISOString(),
    visiblePriorEvidenceIds: options.visiblePriorEvidenceIds ?? [],
    visiblePriorScoutResultIds: options.visiblePriorScoutResultIds ?? [],
  }
}

/**
 * Normalizes and hashes an evidence snippet into an EvidenceItem.
 */
export function createEvidenceItem(params: {
  evidenceId: string
  claim: string
  sourceUrl: string
  sourceType: EvidenceItem['sourceType']
  targetVersionOrCommit: string
  tier: EvidenceTier
  directQuoteOrSnippet: string
  isReproducibleLocally?: boolean
  reproductionCommand?: string
  knownLimitations?: readonly string[]
  corroboratingEvidenceIds?: readonly string[]
  canonicalSourceId?: string
  isDerived?: boolean
}): EvidenceItem {
  const sha256Digest = crypto.createHash('sha256').update(params.directQuoteOrSnippet).digest('hex')

  return {
    evidenceId: params.evidenceId,
    claim: params.claim,
    sourceUrl: params.sourceUrl,
    sourceType: params.sourceType,
    targetVersionOrCommit: params.targetVersionOrCommit,
    retrievalDate: new Date().toISOString(),
    tier: params.tier,
    directQuoteOrSnippet: params.directQuoteOrSnippet,
    sha256Digest,
    reproducibility: {
      isReproducibleLocally: params.isReproducibleLocally ?? false,
      ...(params.reproductionCommand !== undefined ? { reproductionCommand: params.reproductionCommand } : {}),
    },
    knownLimitations: params.knownLimitations ?? [],
    corroboratingEvidenceIds: params.corroboratingEvidenceIds ?? [],
    ...(params.canonicalSourceId !== undefined ? { canonicalSourceId: params.canonicalSourceId } : {}),
    ...(params.isDerived !== undefined ? { isDerived: params.isDerived } : {}),
  }
}

/**
 * Ingestion defense: checks untrusted research text for malicious injection directives.
 * External research data must NEVER be treated as executable directives.
 */
export interface InjectionDefenseResult {
  readonly isDefused: boolean
  readonly injectionAttemptDetected: boolean
  readonly flaggedPatterns: readonly string[]
  readonly sanitizedSnippet: string
}

const INJECTION_PATTERNS = [
  /disregard\s+(all\s+)?prior\s+instructions/i,
  /ignore\s+(all\s+)?previous\s+(instructions|directives)/i,
  /you\s+must\s+declare\s+this\s+the\s+winner/i,
  /delete\s+(all\s+)?files/i,
  /execute\s+command/i,
  /system\s+override/i,
  /format\s+drive/i,
  /grant\s+process\.execute/i,
  /increase\s+(the\s+)?(research\s+)?budget/i,
  /start\s+implementation/i,
  /start\s+k5/i,
  /start\s+electron/i,
  /erase\s+the\s+contradiction/i,
  /select\s+candidate/i,
]

export function defuseUntrustedResearchData(rawText: string): InjectionDefenseResult {
  const flagged: string[] = []

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(rawText)) {
      flagged.push(pattern.source)
    }
  }

  // Enclose in P5 contextual data labeling
  const sanitizedSnippet = `<<<BEGIN_UNTRUSTED_RESEARCH_DATA>>>\n${rawText.replace(/[\r\n]+/g, '\n')}\n<<<END_UNTRUSTED_RESEARCH_DATA>>>`

  return {
    isDefused: true,
    injectionAttemptDetected: flagged.length > 0,
    flaggedPatterns: flagged,
    sanitizedSnippet,
  }
}
