/**
 * React hook for consuming the Gravitas live SSE event stream.
 * Manages EventSource lifecycle, deduplication by eventId, and reconnection.
 */

import { useEffect, useRef, useState } from 'react'
import type { GravitasEvent } from './types.js'

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

export interface UseEventsOptions {
  readonly onEvent?: (event: GravitasEvent) => void
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

  const maxEvents = options?.maxEvents ?? 200

  useEffect(() => {
    let es: EventSource | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null

    const connect = () => {
      setStatus('connecting')
      es = new EventSource('/api/v1/events')

      es.onopen = () => {
        setStatus('connected')
      }

      es.onmessage = (messageEvent) => {
        try {
          const raw = JSON.parse(messageEvent.data) as GravitasEvent
          if (!raw || !raw.eventId) return

          // Deduplicate
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
        } catch {
          // Ignore parse errors on ping/comments
        }
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
