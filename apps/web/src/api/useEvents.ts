/**
 * React hook for consuming the Gravitas live SSE event stream.
 * Manages EventSource lifecycle, deduplication by eventId, and reconnection.
 *
 * Wave 12C Invariant:
 * SSE is STRICTLY an invalidation channel, NEVER a source of local state mutations.
 * When an invalidating event arrives, the client performs an authoritative refetch
 * of GET /api/v1/state to obtain the fresh RuntimeProjectionSnapshot and Task list.
 */

import { useEffect, useRef, useState } from 'react'
import type { GravitasEvent, GravitasEventType } from './types.js'

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

export type EventWorldPolicy = 'INVALIDATE_SNAPSHOT' | 'WORLD_EFFECT_NONE'

/**
 * Exhaustive mapping of all 29 canonical GravitasEventType from domain core.
 * Enforced via Record<GravitasEventType, EventWorldPolicy> for compile-time safety.
 *
 * 24 INVALIDATE_SNAPSHOT events trigger an authoritative refetch of /api/v1/state.
 * 5 WORLD_EFFECT_NONE events represent informational/metadata contracts without scene effect.
 */
export const EVENT_WORLD_POLICIES: Record<GravitasEventType, EventWorldPolicy> = {
  // ─── 24 Snapshot-Invalidating Lifecycle & Execution Events ──────────────────
  RUN_CREATED: 'INVALIDATE_SNAPSHOT',
  TASK_CREATED: 'INVALIDATE_SNAPSHOT',
  TASK_STATE_CHANGED: 'INVALIDATE_SNAPSHOT',
  RUN_STATE_CHANGED: 'INVALIDATE_SNAPSHOT',
  WORKER_STARTED: 'INVALIDATE_SNAPSHOT',
  WORKER_FINISHED: 'INVALIDATE_SNAPSHOT',
  VERIFICATION_STARTED: 'INVALIDATE_SNAPSHOT',
  VERIFICATION_FINISHED: 'INVALIDATE_SNAPSHOT',
  APPROVAL_REQUIRED: 'INVALIDATE_SNAPSHOT',
  TASK_APPROVED: 'INVALIDATE_SNAPSHOT',
  TASK_REJECTED: 'INVALIDATE_SNAPSHOT',
  RUN_COMPLETED: 'INVALIDATE_SNAPSHOT',
  RUN_FAILED: 'INVALIDATE_SNAPSHOT',
  TASK_READY: 'INVALIDATE_SNAPSHOT',
  TASK_SCHEDULED: 'INVALIDATE_SNAPSHOT',
  BROWSER_QA_STARTED: 'INVALIDATE_SNAPSHOT',
  BROWSER_QA_COMPLETED: 'INVALIDATE_SNAPSHOT',
  BROWSER_QA_FAILED: 'INVALIDATE_SNAPSHOT',
  ROUTE_SELECTED: 'INVALIDATE_SNAPSHOT',
  GATEWAY_ROUTE_STARTED: 'INVALIDATE_SNAPSHOT',
  GATEWAY_ROUTE_COMPLETED: 'INVALIDATE_SNAPSHOT',
  GATEWAY_ROUTE_FAILED: 'INVALIDATE_SNAPSHOT',
  PROVIDER_FALLBACK_OCCURRED: 'INVALIDATE_SNAPSHOT',
  TRANSPORT_FALLBACK_OCCURRED: 'INVALIDATE_SNAPSHOT',

  // ─── 5 Informational / Metadata Events (No Physical HQ Scene Effect) ────────
  EXECUTION_CONTRACT_CREATED: 'WORLD_EFFECT_NONE',
  EVIDENCE_CREATED: 'WORLD_EFFECT_NONE',
  RUN_PLAN_CREATED: 'WORLD_EFFECT_NONE',
  TASK_RESULT_MATERIALIZED: 'WORLD_EFFECT_NONE',
  TASK_COMPOSITION_CONFLICT: 'WORLD_EFFECT_NONE',
}

/**
 * All 29 canonical event types as an array for SSE listener subscription.
 */
export const ALL_CANONICAL_EVENT_TYPES: readonly GravitasEventType[] = Object.freeze(
  Object.keys(EVENT_WORLD_POLICIES) as GravitasEventType[]
)

/**
 * Pure predicate checking whether an event type requires snapshot invalidation.
 */
export function isSnapshotInvalidatingEvent(type: GravitasEventType | string): boolean {
  if (type in EVENT_WORLD_POLICIES) {
    return EVENT_WORLD_POLICIES[type as GravitasEventType] === 'INVALIDATE_SNAPSHOT'
  }
  return false
}

export interface UseEventsOptions {
  readonly onEvent?: (event: GravitasEvent) => void
  readonly onInvalidate?: (event?: GravitasEvent) => void
  readonly maxEvents?: number
}

export interface UseEventsResult {
  readonly events: readonly GravitasEvent[]
  readonly status: ConnectionStatus
  readonly clearEvents: () => void
}

export function useEvents(options?: UseEventsOptions): UseEventsResult {
  const [events, setEvents] = useState<GravitasEvent[]>([])
  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  const seenIdsRef = useRef<Set<string>>(new Set())
  const onEventRef = useRef(options?.onEvent)
  onEventRef.current = options?.onEvent
  const onInvalidateRef = useRef(options?.onInvalidate)
  onInvalidateRef.current = options?.onInvalidate

  const maxEvents = options?.maxEvents ?? 200

  useEffect(() => {
    let es: EventSource | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let hasConnectedOnce = false

    const connect = () => {
      setStatus('connecting')
      es = new EventSource('/api/v1/events')

      es.onopen = () => {
        setStatus('connected')
        // On reconnection after disconnect, trigger snapshot refetch to recover truth
        if (hasConnectedOnce) {
          onInvalidateRef.current?.()
        }
        hasConnectedOnce = true
      }

      const handleMessage = (messageEvent: MessageEvent) => {
        try {
          const raw = JSON.parse(messageEvent.data) as GravitasEvent
          if (!raw || !raw.eventId) return

          // Deduplicate by eventId
          if (seenIdsRef.current.has(raw.eventId)) {
            return
          }
          seenIdsRef.current.add(raw.eventId)

          setEvents((prev) => {
            const next = [raw, ...prev]
            if (next.length > maxEvents) {
              return next.slice(0, maxEvents)
            }
            return next
          })

          if (onEventRef.current) {
            onEventRef.current(raw)
          }

          // Trigger authoritative invalidation if policy requires it
          if (isSnapshotInvalidatingEvent(raw.type)) {
            onInvalidateRef.current?.(raw)
          }
        } catch {
          // Ignore parse errors on keep-alive comments/pings
        }
      }

      es.onmessage = handleMessage
      for (const eventType of ALL_CANONICAL_EVENT_TYPES) {
        es.addEventListener(eventType, handleMessage as EventListener)
      }

      es.onerror = () => {
        setStatus('disconnected')
        if (es) {
          es.close()
          es = null
        }
        // Attempt reconnect after 3 seconds
        reconnectTimer = setTimeout(connect, 3000)
      }
    }

    connect()

    return () => {
      if (es) {
        es.close()
        es = null
      }
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
    }
  }, [maxEvents])

  const clearEvents = () => {
    setEvents([])
  }

  return {
    events,
    status,
    clearEvents,
  }
}
