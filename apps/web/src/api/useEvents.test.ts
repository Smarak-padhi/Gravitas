/**
 * Unit Tests for useEvents and Canonical Event Invalidation Policy (Wave 12C)
 * Verifies exhaustive mapping of all 29 GravitasEventType entries from core.
 */

import { describe, expect, it } from 'vitest'
import {
  ALL_CANONICAL_EVENT_TYPES,
  EVENT_WORLD_POLICIES,
  isSnapshotInvalidatingEvent,
} from './useEvents.js'

describe('Wave 12C — Canonical SSE Event Invalidation Policy', () => {
  it('contains exactly 29 canonical event types', () => {
    expect(ALL_CANONICAL_EVENT_TYPES).toHaveLength(29)
    expect(Object.keys(EVENT_WORLD_POLICIES)).toHaveLength(29)
  })

  it('classifies exactly 24 events as INVALIDATE_SNAPSHOT', () => {
    const invalidating = Object.entries(EVENT_WORLD_POLICIES).filter(
      ([, policy]) => policy === 'INVALIDATE_SNAPSHOT'
    )
    expect(invalidating).toHaveLength(24)

    // Spot-check critical invalidating events
    expect(isSnapshotInvalidatingEvent('RUN_CREATED')).toBe(true)
    expect(isSnapshotInvalidatingEvent('TASK_CREATED')).toBe(true)
    expect(isSnapshotInvalidatingEvent('TASK_STATE_CHANGED')).toBe(true)
    expect(isSnapshotInvalidatingEvent('WORKER_STARTED')).toBe(true)
    expect(isSnapshotInvalidatingEvent('WORKER_FINISHED')).toBe(true)
    expect(isSnapshotInvalidatingEvent('VERIFICATION_STARTED')).toBe(true)
    expect(isSnapshotInvalidatingEvent('VERIFICATION_FINISHED')).toBe(true)
    expect(isSnapshotInvalidatingEvent('APPROVAL_REQUIRED')).toBe(true)
    expect(isSnapshotInvalidatingEvent('TASK_APPROVED')).toBe(true)
    expect(isSnapshotInvalidatingEvent('TASK_REJECTED')).toBe(true)
    expect(isSnapshotInvalidatingEvent('RUN_COMPLETED')).toBe(true)
    expect(isSnapshotInvalidatingEvent('RUN_FAILED')).toBe(true)
    expect(isSnapshotInvalidatingEvent('TASK_READY')).toBe(true)
    expect(isSnapshotInvalidatingEvent('TASK_SCHEDULED')).toBe(true)
    expect(isSnapshotInvalidatingEvent('BROWSER_QA_STARTED')).toBe(true)
    expect(isSnapshotInvalidatingEvent('BROWSER_QA_COMPLETED')).toBe(true)
    expect(isSnapshotInvalidatingEvent('BROWSER_QA_FAILED')).toBe(true)
    expect(isSnapshotInvalidatingEvent('ROUTE_SELECTED')).toBe(true)
    expect(isSnapshotInvalidatingEvent('GATEWAY_ROUTE_STARTED')).toBe(true)
    expect(isSnapshotInvalidatingEvent('GATEWAY_ROUTE_COMPLETED')).toBe(true)
    expect(isSnapshotInvalidatingEvent('GATEWAY_ROUTE_FAILED')).toBe(true)
    expect(isSnapshotInvalidatingEvent('PROVIDER_FALLBACK_OCCURRED')).toBe(true)
    expect(isSnapshotInvalidatingEvent('TRANSPORT_FALLBACK_OCCURRED')).toBe(true)
  })

  it('classifies exactly 5 events as WORLD_EFFECT_NONE', () => {
    const noEffect = Object.entries(EVENT_WORLD_POLICIES).filter(
      ([, policy]) => policy === 'WORLD_EFFECT_NONE'
    )
    expect(noEffect).toHaveLength(5)

    const noEffectKeys = noEffect.map(([key]) => key).sort()
    expect(noEffectKeys).toEqual(
      [
        'EVIDENCE_CREATED',
        'EXECUTION_CONTRACT_CREATED',
        'RUN_PLAN_CREATED',
        'TASK_COMPOSITION_CONFLICT',
        'TASK_RESULT_MATERIALIZED',
      ].sort()
    )

    for (const key of noEffectKeys) {
      expect(isSnapshotInvalidatingEvent(key)).toBe(false)
    }
  })

  it('returns false for unknown or synthetic event strings', () => {
    expect(isSnapshotInvalidatingEvent('WORKER_OUTPUT')).toBe(false)
    expect(isSnapshotInvalidatingEvent('VERIFICATION_OUTPUT')).toBe(false)
    expect(isSnapshotInvalidatingEvent('UNKNOWN_EVENT')).toBe(false)
  })
})
