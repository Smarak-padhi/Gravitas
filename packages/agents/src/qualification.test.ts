/**
 * Codex Qualification Engine Tests for @gravitas/agents.
 *
 * Zero real Codex invocations — all tests use synthetic ExperimentResult fixtures.
 * Real qualification: `npm run qualify:codex`.
 */

import { describe, it, expect } from 'vitest'
import {
  evaluateQualificationPolicy,
  buildQualificationEvidence,
  isQualificationEvidenceValid,
  QUALIFICATION_EXPERIMENT_SPECS,
  type ExperimentResult,
} from './qualification.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeResult(
  experimentId: string,
  passed: boolean,
  mandatory = true
): ExperimentResult {
  return { experimentId, title: experimentId, mandatory, passed, durationMs: 0 }
}

function allPassed(): readonly ExperimentResult[] {
  return QUALIFICATION_EXPERIMENT_SPECS.map((s) =>
    makeResult(s.id, true, s.mandatory)
  )
}

// ─── evaluateQualificationPolicy ─────────────────────────────────────────────

describe('evaluateQualificationPolicy', () => {
  it('returns APPROVED when all mandatory experiments pass', () => {
    const { decision } = evaluateQualificationPolicy(allPassed())
    expect(decision).toBe('APPROVED')
  })

  it('returns INCONCLUSIVE for empty experiments', () => {
    const { decision } = evaluateQualificationPolicy([])
    expect(decision).toBe('INCONCLUSIVE')
  })

  it('returns REJECTED when a mandatory experiment fails', () => {
    const results = allPassed().map((r) =>
      r.experimentId === 'auth-configured' ? { ...r, passed: false } : r
    )
    const { decision, rejectionReason } = evaluateQualificationPolicy(results)
    expect(decision).toBe('REJECTED')
    expect(rejectionReason).toContain('auth-configured')
  })

  it('returns REJECTED when a mandatory experiment is missing', () => {
    const results = allPassed().filter((r) => r.experimentId !== 'golden-loop')
    const { decision, rejectionReason } = evaluateQualificationPolicy(results)
    expect(decision).toBe('REJECTED')
    expect(rejectionReason).toContain('golden-loop')
  })

  it('does not reject when only a non-mandatory experiment fails', () => {
    // Find a non-mandatory spec
    const nonMandatory = QUALIFICATION_EXPERIMENT_SPECS.find((s) => !s.mandatory)
    if (!nonMandatory) return // Skip if none exists

    const results = allPassed().map((r) =>
      r.experimentId === nonMandatory.id ? { ...r, passed: false } : r
    )
    const { decision } = evaluateQualificationPolicy(results)
    expect(decision).toBe('APPROVED')
  })

  it('lists all failing mandatory experiments in rejection reason', () => {
    const results = allPassed().map((r) => {
      if (r.experimentId === 'auth-configured' || r.experimentId === 'head-protection') {
        return { ...r, passed: false }
      }
      return r
    })
    const { rejectionReason } = evaluateQualificationPolicy(results)
    expect(rejectionReason).toContain('auth-configured')
    expect(rejectionReason).toContain('head-protection')
  })
})

// ─── buildQualificationEvidence ───────────────────────────────────────────────

describe('buildQualificationEvidence', () => {
  it('produces schemaVersion 2 records with wave10.1-git-contained securityProfileVersion', () => {
    const evidence = buildQualificationEvidence('codex-cli 0.153.4', allPassed())
    expect(evidence.schemaVersion).toBe(2)
    expect(evidence.securityProfileVersion).toBe('wave10.1-git-contained')
  })

  it('embeds the codex version', () => {
    const evidence = buildQualificationEvidence('codex-cli 0.153.4', allPassed())
    expect(evidence.codexVersion).toBe('codex-cli 0.153.4')
  })

  it('sets decision to APPROVED when all mandatory pass', () => {
    const evidence = buildQualificationEvidence('codex-cli 0.153.4', allPassed())
    expect(evidence.decision).toBe('APPROVED')
  })

  it('sets decision to REJECTED when mandatory experiments fail', () => {
    const results = allPassed().map((r) =>
      r.experimentId === 'auth-configured' ? { ...r, passed: false } : r
    )
    const evidence = buildQualificationEvidence('codex-cli 0.153.4', results)
    expect(evidence.decision).toBe('REJECTED')
    expect(evidence.rejectionReason).toBeDefined()
  })

  it('sets qualifiedAt to a valid ISO timestamp', () => {
    const evidence = buildQualificationEvidence('v1.0.0', allPassed())
    expect(() => new Date(evidence.qualifiedAt)).not.toThrow()
    expect(new Date(evidence.qualifiedAt).getFullYear()).toBeGreaterThan(2020)
  })
})

// ─── isQualificationEvidenceValid ────────────────────────────────────────────

describe('isQualificationEvidenceValid', () => {
  const approvedEvidence = buildQualificationEvidence('codex-cli 0.153.4', allPassed())

  it('returns valid:true for matching version and APPROVED decision', () => {
    const { valid } = isQualificationEvidenceValid(approvedEvidence, 'codex-cli 0.153.4')
    expect(valid).toBe(true)
  })

  it('returns valid:false when installed version differs', () => {
    const { valid, reason } = isQualificationEvidenceValid(approvedEvidence, 'codex-cli 0.200.0')
    expect(valid).toBe(false)
    expect(reason).toContain('version changed')
  })

  it('returns valid:false for REJECTED evidence', () => {
    const rejectedEvidence = buildQualificationEvidence(
      'codex-cli 0.153.4',
      allPassed().map((r) =>
        r.experimentId === 'auth-configured' ? { ...r, passed: false } : r
      )
    )
    const { valid, reason } = isQualificationEvidenceValid(rejectedEvidence, 'codex-cli 0.153.4')
    expect(valid).toBe(false)
    expect(reason).toContain('REJECTED')
  })

  it('returns valid:false for stale schema version 1', () => {
    const staleEvidence = { ...approvedEvidence, schemaVersion: 1 as any }
    const { valid, reason } = isQualificationEvidenceValid(staleEvidence, 'codex-cli 0.153.4')
    expect(valid).toBe(false)
    expect(reason).toContain('expected 2')
  })

  it('returns valid:false for invalid securityProfileVersion', () => {
    const invalidProfile = { ...approvedEvidence, securityProfileVersion: 'wave10-legacy' as any }
    const { valid, reason } = isQualificationEvidenceValid(invalidProfile, 'codex-cli 0.153.4')
    expect(valid).toBe(false)
    expect(reason).toContain('wave10.1-git-contained')
  })
})

// ─── QUALIFICATION_EXPERIMENT_SPECS ──────────────────────────────────────────

describe('QUALIFICATION_EXPERIMENT_SPECS', () => {
  it('contains 17 qualification experiments', () => {
    expect(QUALIFICATION_EXPERIMENT_SPECS.length).toBe(17)
  })

  it('has golden-loop as mandatory', () => {
    const spec = QUALIFICATION_EXPERIMENT_SPECS.find((s) => s.id === 'golden-loop')
    expect(spec).toBeDefined()
    expect(spec!.mandatory).toBe(true)
  })

  it('has head-protection as mandatory', () => {
    const spec = QUALIFICATION_EXPERIMENT_SPECS.find((s) => s.id === 'head-protection')
    expect(spec).toBeDefined()
    expect(spec!.mandatory).toBe(true)
  })

  it('has rules-isolation as mandatory', () => {
    const spec = QUALIFICATION_EXPERIMENT_SPECS.find((s) => s.id === 'rules-isolation')
    expect(spec).toBeDefined()
    expect(spec!.mandatory).toBe(true)
  })

  it('has adversarial-git-matrix as mandatory', () => {
    const spec = QUALIFICATION_EXPERIMENT_SPECS.find((s) => s.id === 'adversarial-git-matrix')
    expect(spec).toBeDefined()
    expect(spec!.mandatory).toBe(true)
  })

  it('has out-of-scope-temptation as mandatory', () => {
    const spec = QUALIFICATION_EXPERIMENT_SPECS.find((s) => s.id === 'out-of-scope-temptation')
    expect(spec).toBeDefined()
    expect(spec!.mandatory).toBe(true)
  })

  it('all experiment ids are unique', () => {
    const ids = QUALIFICATION_EXPERIMENT_SPECS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
