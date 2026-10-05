# GRAVITAS — POST-B0 DEFERRED PROGRAM SPECIFICATION
# SKILL ARENA: HISTORICAL CAPABILITY CURATION & FUTURE-PROJECT TOOLBOX
## Candidate Schema, Atomic Rule Representation & Data Contracts

**Document ID**: `DOC-SA-003`  
**Classification**: `POST-B0-DEFERRED-DESIGN`  
**Status**: `DEFERRED_CANDIDATE`  
**Value**: `HIGH`  
**Implementation Authorization**: `NO`  
**Created**: `2026-10-05T08:22:00+05:30`  
**Governing Baseline**: Phase B0 Freeze Gate (`docs/architecture-v2/B0_OBJECTIVE_LEDGER.md`)

---

## 1. Schema Design Principles

The Skill Arena candidate schema enforces five core architectural principles:
1. **Granularity over Monoliths**: External `SKILL.md` documents, prompt files, and design guides are never evaluated as monolithic black boxes. They are disassembled into atomic rule candidates.
2. **Immutable Provenance**: Every rule, recommendation, or conflict links cryptographically back to its source repository, file path, commit SHA, and author.
3. **Explicit Dependency Typing**: Framework, tool, provider, and network dependencies are declared structurally, allowing automated disqualification when dependencies violate project constraints.
4. **Context Cost Accounting**: Every candidate declares its context footprint in tokens and lines, ensuring prompt efficiency is measured directly against capability gain.
5. **Human Gate Sovereignty**: No rule can achieve canonical status without an explicit, verifiable human approval record.

---

## 2. Ingestion Entity: `CandidateSource`

The top-level entity representing an ingested repository, file, plugin, or catalog:

```typescript
export type CandidateSourceType =
  | 'SKILL'                      // Structured SKILL.md file with prompt rules
  | 'RULESET'                    // Granular ruleset (e.g., .cursorrules, ponytail)
  | 'WORKFLOW'                   // Multi-step automation or execution workflow
  | 'DESIGN_REFERENCE'           // Visual, layout, or architectural design guide
  | 'DESIGN_SYSTEM'              // Formal token specification or component library
  | 'COMPONENT_LIBRARY'          // Reusable UI components (e.g., shadcn, Radix)
  | 'MOTION_LIBRARY'             // Motion contracts, bezier specs, animation code
  | 'CODE_LIBRARY'               // Utility libraries (e.g., Three.js, Anime.js)
  | 'MCP_TOOL'                   // Model Context Protocol server definition
  | 'AGENT_TOOL'                 // Native CLI or executable agent tool
  | 'RESEARCH_SOURCE'            // Research paper, RFC, or domain analysis document
  | 'PROJECT_SPECIFIC_KNOWLEDGE' // Isolated business/lore rules from past projects
  | 'OTHER';                     // Fallback classification

export type HistoricalOutcome =
  | 'USED_WITH_SUCCESS'          // Verified by working production code/tests
  | 'USED_WITH_FRICTION'         // Required manual workarounds or caused issues
  | 'EVALUATED_AND_REJECTED'     // Formally rejected during prior architecture audits
  | 'RECORDED_CANDIDATE'         // Identified candidate; never executed
  | 'UNKNOWN_GAP';               // Found on disk; requires forensic evaluation

export type SourceAvailability =
  | 'LOCAL_FILESYSTEM'           // Available on local disk
  | 'GIT_REPOSITORY'             // Available via public/private git remote
  | 'NPM_REGISTRY'               // Available on npm
  | 'DEPRECATED'                 // Upstream source abandoned or deprecated
  | 'UNREACHABLE';               // Remote source inaccessible

export type CandidateSourceStatus =
  | 'INGESTED'                   // Source registered in inventory
  | 'NORMALIZED'                 // Source split into atomic RuleCandidates
  | 'IN_ARENA'                   // Under active multi-agent evaluation
  | 'SYNTHESIZED'                // Rules integrated into canonical core/profiles
  | 'FROZEN'                     // Stable and locked
  | 'REJECTED';                  // Rejected globally

export interface CandidateSource {
  id: string;                    // Deterministic ID (e.g., "src-ponytail-4.9.0")
  name: string;                  // Human-readable name
  source: string;                // URI, local path, or repo URL
  sourceType: CandidateSourceType;

  historicalProject: string[];   // Projects where this source was utilized
  historicalPurpose: string[];   // What problems it solved historically

  category: string[];            // Functional domains (e.g., ["motion", "accessibility"])
  platform: string[];            // Target platforms (e.g., ["web", "ios", "android"])

  frameworkSpecific: string | null; // e.g., "React 19", "Jetpack Compose", null if universal
  providerSpecific: string | null;  // e.g., "Anthropic", "OpenAI", null if universal
  modelSpecific: string | null;     // e.g., "Claude 3.5 Sonnet", null if universal

  networkRequired: boolean;      // Does using this source require live internet?
  externalActionPossible: boolean; // Can it trigger external side-effects?
  costClass: 'FREE' | 'TOKEN_ONLY' | 'PAID_API' | 'UNKNOWN';

  licenseKnown: boolean;
  license: string;               // e.g., "MIT", "Apache-2.0", "PROPRIETARY", "UNKNOWN"

  historicalEvidence: string;    // Citation of file paths, test logs, or commits
  historicalOutcomeEvidence: HistoricalOutcome;

  currentAvailability: SourceAvailability;
  status: CandidateSourceStatus;

  rawInstructionSize: {
    lineCount: number;
    byteCount: number;
    estimatedTokenCount: number;
  };

  extractedRuleCount: number;
  lastAuditedTimestamp: string;
}
```

---

## 3. Atomic Entity: `RuleCandidate`

An indivisible, testable capability rule extracted from a source:

```typescript
export type RuleEvidenceClass =
  | 'EMPIRICAL_TEST_PASSED'      // Verified by passing automated tests (Playwright, Vitest)
  | 'STATIC_SPEC_VERIFIED'       // Verified by formal specification (W3C, WCAG, MDN)
  | 'USER_PRODUCTION_PROVEN'     // Proven across historical user projects
  | 'MODEL_REASONING_ONLY'       // Claimed only by LLM opinion without runtime evidence
  | 'UNVERIFIED_CLAIM';          // Raw claim from README or documentation

export type RuleDisposition =
  | 'CANONICAL_GLOBAL'           // Universal, non-conflicting law for all projects
  | 'CANONICAL_CONTEXTUAL'       // Canonical rule for a specific stack (e.g., React, Swift)
  | 'OPTIONAL_PROFILE'           // Aesthetic or stylistic rule bound to a design profile
  | 'REFERENCE_ONLY'             // Passive inspiration; zero prompt weight
  | 'DUPLICATE_MERGED'           // Merged into an existing canonical rule
  | 'DUPLICATE_INFERIOR'         // Dropped in favor of a superior formulation
  | 'TOOL_SPECIFIC'              // Restricted to a specific tool harness
  | 'FRAMEWORK_SPECIFIC'         // Restricted to a specific frontend framework
  | 'PLATFORM_SPECIFIC'          // Restricted to iOS, Android, or Desktop
  | 'PROJECT_SPECIFIC'           // Restricted to a single proprietary product
  | 'NETWORK_DEPENDENT'          // Requires external internet access
  | 'EXTERNAL_ACTION'            // Performs active side-effects (requires human approval)
  | 'OUTDATED'                   // Obsolete due to platform improvements
  | 'WEAK_OR_VAGUE'              // Unactionable, ambiguous, or poorly defined
  | 'UNSAFE'                     // Violates security, privacy, or credential invariants
  | 'REJECTED';                  // Fails technical fitness evaluation

export interface RuleCandidate {
  id: string;                    // UUID or deterministic hash: "rc-<sha256(statement)[0..12]>"
  sourceId: string;              // References CandidateSource.id
  sourceVersion: string;         // Semver or commit SHA of source
  sourcePath: string;            // Exact file path inside source repository

  capability: string;            // Short capability name (e.g., "Micro-Response Press Feedback")
  statement: string;             // Exact normative instruction: "Press feedback must execute in 80-120ms."

  category: string;              // e.g., "motion", "typography", "state", "a11y"
  scope: 'GLOBAL' | 'FRAMEWORK' | 'DESIGN_PROFILE' | 'PLATFORM' | 'PROJECT';
  applicability: string;         // Condition under which rule applies

  prerequisites: string[];       // Capabilities that must precede this rule

  frameworkDependency: string | null;
  toolDependency: string | null;
  networkDependency: boolean;
  providerDependency: string | null;

  authorityRequired: 'NONE' | 'READ_ONLY' | 'FILE_WRITE' | 'PROCESS_SPAWN' | 'NETWORK';
  costClass: 'FREE' | 'TOKEN_ONLY' | 'PAID';

  evidenceClass: RuleEvidenceClass;
  tokenCost: number;             // Prompt token consumption of this rule

  duplicates: string[];          // IDs of rules with identical semantic intent
  conflicts: string[];           // IDs of rules with contradictory requirements

  qualityAssessment: {
    clarity: number;             // 1-5 rating (unambiguous, actionable)
    conciseness: number;         // 1-5 rating (minimal token waste)
    testability: number;         // 1-5 rating (can an automated test prove adherence?)
    robustness: number;          // 1-5 rating (handles edge cases, fallbacks)
  };

  confidence: number;            // 0.0 to 1.0 statistical confidence
  proposedDisposition: RuleDisposition;
}
```

---

## 4. Synthesized Entity: `CanonicalRule`

A permanent, hardened GRAVITAS capability rule that has passed multi-agent evaluation and received sovereign human approval:

```typescript
export interface RuleProvenance {
  sourceId: string;              // Source repository or project
  sourceVersion: string;         // Commit or version
  sourcePath: string;            // Original file
  originalStatement: string;     // Exact source text before canonical distillation
  author?: string;               // Original author attribution
  license: string;               // Source license
}

export interface CanonicalRule {
  id: string;                    // Canonical identifier: "CR-A11Y-001"
  statement: string;             // Distilled, concise, authoritative rule statement
  class: 'UNIVERSAL_ENGINEERING' | 'CONTEXTUAL_STACK' | 'DESIGN_PROFILE' | 'SPECIALIST';
  scope: string;                 // Target scope (e.g., "ALL_WEB", "REACT_NATIVE", "PREMIUM_EDITORIAL")

  provenance: RuleProvenance[];  // Preserves ALL historical sources that contributed to this rule
  supersedes: string[];          // Outdated or inferior rule IDs replaced by this rule
  conflicts: string[];           // Known conflicting rules and their resolution contexts
  applicableProfiles: string[];  // Design profiles that inherit this rule

  evidence: {
    benchmarkIds: string[];      // Empirical benchmark trials validating this rule
    testFileReferences: string[];// Automated test files verifying adherence
    evidentiaryScore: number;    // Composite evidential fitness (1-5)
  };

  tokenWeight: number;           // Compact prompt footprint in tokens
  confidence: number;            // Evaluator confidence (0.0 to 1.0)
  humanApproval: {
    status: 'APPROVED' | 'REJECTED' | 'CONDITIONAL';
    approvedBy: 'SOVEREIGN_HUMAN_OPERATOR';
    approvalTimestamp: string;
    operatorNotes?: string;
  };
}
```

---

## 5. Conflict & Contradiction Representation: `ConflictRecord`

```typescript
export type ConflictType =
  | 'DIRECT_CONTRADICTION'       // Rule A says X; Rule B says NOT X in the same context
  | 'AESTHETIC_DIVERGENCE'       // Distinct style choices (e.g., dense technical vs airy editorial)
  | 'FRAMEWORK_PARADIGM_CLASH'   // Imperative vs declarative, controlled vs uncontrolled
  | 'PERFORMANCE_VS_AESTHETICS'  // Heavy 3D effects vs strict 60fps mobile budget
  | 'AUTHORITY_MISMATCH';        // Autonomous execution vs human-in-the-loop requirement

export type ConflictResolutionStrategy =
  | 'REJECT_INFERIOR'            // Weaker rule dropped; stronger rule canonicalized
  | 'PROFILE_SEPARATION'         // Split into two distinct design profiles (no conflict)
  | 'STACK_GATING'               // Gated by framework/platform selector
  | 'CONDITIONAL_HIERARCHY'      // Rule A is base; Rule B is an explicit override when enabled
  | 'ESCALATE_TO_HUMAN';         // Ambiguous; requires human operator intervention

export interface ConflictRecord {
  id: string;
  candidateAId: string;
  candidateBId: string;
  conflictType: ConflictType;
  description: string;
  contestedDimension: string;   // e.g., "motion duration", "component state ownership"
  proposedStrategy: ConflictResolutionStrategy;
  resolvedDispositionA: RuleDisposition;
  resolvedDispositionB: RuleDisposition;
  resolutionRationale: string;
  humanSignOffRequired: boolean;
}
```

---

## 6. Versioning & Upstream Delta Analysis Contract

When upstream repositories publish new versions (e.g., `agent-skills v2.0` or `ponytail v5.0`), the system executes a delta evaluation:

```typescript
export interface SourceDeltaAnalysis {
  sourceId: string;
  previousVersion: string;
  incomingVersion: string;
  timestamp: string;

  deltaMetrics: {
    addedRules: RuleCandidate[];
    removedRules: RuleCandidate[];
    modifiedRules: Array<{
      previous: RuleCandidate;
      incoming: RuleCandidate;
      semanticDiff: string;
    }>;
    unalteredRulesCount: number;
  };

  impactAssessment: {
    affectsCanonicalRules: string[];    // Canonical rules whose provenance links changed
    introducedConflicts: ConflictRecord[];
    introducedDependencies: string[];
    securityRisksDetected: string[];
  };

  recommendedAction: 'NO_ACTION' | 'FAST_TRACK_MERGE' | 'ARENA_REEVALUATION' | 'REJECT_UPDATE';
  humanReviewRequired: boolean;
}
```
