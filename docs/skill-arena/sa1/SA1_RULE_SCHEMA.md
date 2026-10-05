# SA1 Rule Schema & Entity Definition

## Entity Contract: `RuleCandidate`

An indivisible, testable capability rule extracted from an SA0-qualified source.

```typescript
export type Modality =
  | 'MUST'
  | 'MUST_NOT'
  | 'SHOULD'
  | 'SHOULD_NOT'
  | 'PREFER'
  | 'AVOID'
  | 'HEURISTIC'
  | 'ANTI_PATTERN'
  | 'AESTHETIC_PREFERENCE'
  | 'WORKFLOW_STEP';

export type RuleKind =
  | 'PRINCIPLE'
  | 'CONSTRAINT'
  | 'RECOMMENDATION'
  | 'HEURISTIC'
  | 'ANTI_PATTERN'
  | 'WORKFLOW'
  | 'AESTHETIC_GRAMMAR';

export type PrimaryDomain =
  | 'ENGINEERING'
  | 'DESIGN_ENGINEERING'
  | 'VISUAL_DESIGN'
  | 'MOTION'
  | 'ACCESSIBILITY'
  | 'PERFORMANCE'
  | 'RESPONSIVE_DESIGN'
  | 'TYPOGRAPHY'
  | 'LAYOUT'
  | 'INTERACTION'
  | 'COMPONENT_ARCHITECTURE'
  | 'STATE_MANAGEMENT'
  | 'REACT'
  | 'NEXTJS'
  | 'HTML_CSS'
  | 'ANDROID'
  | 'IOS'
  | 'TESTING'
  | 'SECURITY'
  | 'WORKFLOW'
  | 'CONTENT'
  | 'OTHER';

export interface RuleCandidate {
  ruleId: string;                   // Deterministic identifier: "RULE-<PREFIX>-<SEQ>"
  normalizedStatement: string;      // Normalized single propositional statement
  modality: Modality;               // Normative strength (MUST, SHOULD, AVOID, etc.)
  ruleKind: RuleKind;               // Semantic kind (CONSTRAINT, ANTI_PATTERN, etc.)

  primaryDomain: PrimaryDomain;     // Core engineering or design domain
  secondaryDomains: string[];       // Associated cross-cutting domains
  contextScopes: string[];          // Applicability bounds (GLOBAL_CANDIDATE, ANDROID, IOS, etc.)

  sourceCandidateId: string;        // References SA0 CandidateSource.id
  sourceName: string;               // Human-readable source name
  sourceType: string;               // Source type from SA0 taxonomy

  sourceRepository: string;         // Origin repository or local directory
  sourcePath: string;               // Exact path to source file
  sourceVersionOrCommit: string;    // Commit SHA or semver
  sourceSection: string;            // Section or heading where rule appeared
  sourceLocator: string;            // Precise line locator or locator tag

  evidenceClass: string;            // EXPLICIT_DIRECTIVE, EXPLICIT_PRINCIPLE, etc.
  supportingExcerpt: string;        // Minimal excerpt proving source authenticity
  sourceStrength: string;           // STRONG, MODERATE, WEAK

  historicalUsageEvidence: string[];// Links to historical project evidence
  knownProjectContexts: string[];   // Projects where rule was applied
  potentialOverlapHints: string[];  // IDs of rules with similar topics
  potentialConflictHints: string[]; // IDs of rules with contradictory requirements

  licenseClass: string;             // License governing source
  redistributionConstraint: string; // NONE, ATTRIBUTION_REQUIRED, etc.
  securitySensitivity: string;      // LOW, MEDIUM, HIGH

  extractionConfidence: number;     // 0.0 to 1.0 confidence score
  extractorId: string;              // Identifier of extraction worker
  extractionTimestamp: string;      // ISO timestamp of extraction
  status: string;                   // EXTRACTED, AUDITED
}
```
