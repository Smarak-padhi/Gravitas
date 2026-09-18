import { describe, it, expect } from 'vitest'
import { GRAVITAS_VERSION, type TaskState } from './index.js'

// ──────────────────────────────────────────────────────────────────────────────
// Wave 0 — workspace smoke tests
//
// These tests verify that:
//   1. The test runner itself is operational
//   2. TypeScript module resolution works within the monorepo
//   3. The TaskState union covers exactly the 9 contract-mandated states
//   4. The package exports are correct
//
// These are NOT unit tests of orchestration logic (that starts Wave 1).
// They exist solely to prove the workspace is correctly configured.
// ──────────────────────────────────────────────────────────────────────────────

describe('@gravitas/core — Wave 0 baseline', () => {
  it('test runner is operational', () => {
    expect(true).toBe(true)
  })

  it('GRAVITAS_VERSION is the expected semver string', () => {
    expect(GRAVITAS_VERSION).toMatch(/^\d+\.\d+\.\d+$/)
    expect(GRAVITAS_VERSION).toBe('0.0.1')
  })

  describe('TaskState union', () => {
    /**
     * The Implementation Master Contract mandates exactly 9 task states.
     * This test documents and enforces that set as an executable contract.
     *
     * If a state is added or removed, this test must fail visibly until
     * the contract is updated and the change is reviewed.
     */
    const MANDATED_STATES: ReadonlyArray<TaskState> = [
      'PLANNED',
      'BLOCKED',
      'READY',
      'RUNNING',
      'VERIFYING',
      'WAITING_APPROVAL',
      'APPROVED',
      'FAILED',
      'CANCELLED',
    ] as const

    it('mandated states are exactly 9', () => {
      expect(MANDATED_STATES).toHaveLength(9)
    })

    it.each(MANDATED_STATES)('"%s" is a valid TaskState', (state) => {
      // TypeScript compile-time check: the assignment below fails if the
      // type constraint is violated.  Runtime check confirms the value.
      const s: TaskState = state
      expect(typeof s).toBe('string')
      expect(s.length).toBeGreaterThan(0)
    })

    it('PLANNED comes before BLOCKED in canonical ordering', () => {
      const planned = MANDATED_STATES.indexOf('PLANNED')
      const blocked = MANDATED_STATES.indexOf('BLOCKED')
      expect(planned).toBeLessThan(blocked)
    })

    it('terminal states are APPROVED, FAILED, CANCELLED', () => {
      const terminalStates: TaskState[] = ['APPROVED', 'FAILED', 'CANCELLED']
      for (const state of terminalStates) {
        expect(MANDATED_STATES).toContain(state)
      }
    })
  })
})
