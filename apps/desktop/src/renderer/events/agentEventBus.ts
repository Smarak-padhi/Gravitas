/**
 * GRAVITAS 2.0 — Living Studio Agent Event Bus (Phase 04)
 *
 * Lightweight, zero-dependency, typed event bus connecting real runtime/IPC events
 * and user interactions to Mascot character states and genuine activity bubbles.
 */

import type { MascotId, MascotState } from '../components/studio/MascotFamily.js'

export type AgentEventType =
  | 'TASK_STATE_CHANGED'
  | 'APPROVAL_REQUIRED'
  | 'NOTE_SAVED'
  | 'BUILD_FINISHED'
  | 'RESEARCH_INDEXED'
  | 'FOCUS_TIMER_TICK'
  | 'FOCUS_TIMER_COMPLETED'
  | 'AGENT_SPEECH_STARTED'
  | 'AGENT_SPEECH_FINISHED'

export interface AgentEventPayloadMap {
  TASK_STATE_CHANGED: { taskId: string; title: string; completed: boolean }
  APPROVAL_REQUIRED: { actionName: string; details: string; agentId?: MascotId }
  NOTE_SAVED: { noteTitle: string; subject: string; noteId?: string }
  BUILD_FINISHED: { outcome: 'success' | 'failure'; summary: string }
  RESEARCH_INDEXED: { sourceCount: number; topic?: string }
  FOCUS_TIMER_TICK: { remainingSeconds: number }
  FOCUS_TIMER_COMPLETED: { sprintDurationMinutes: number }
  AGENT_SPEECH_STARTED: { agentId: MascotId; text: string }
  AGENT_SPEECH_FINISHED: { agentId: MascotId }
}

type EventListener<K extends AgentEventType> = (payload: AgentEventPayloadMap[K]) => void

class AgentEventBus {
  private listeners: Map<AgentEventType, Set<EventListener<any>>> = new Map()

  subscribe<K extends AgentEventType>(type: K, listener: EventListener<K>): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set())
    }
    this.listeners.get(type)!.add(listener)

    return () => {
      this.listeners.get(type)?.delete(listener)
    }
  }

  dispatch<K extends AgentEventType>(type: K, payload: AgentEventPayloadMap[K]): void {
    const handlers = this.listeners.get(type)
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(payload)
        } catch (err) {
          console.warn(`[AgentEventBus] Error in listener for ${type}:`, err)
        }
      })
    }
  }

  clear(): void {
    this.listeners.clear()
  }
}

export const agentEventBus = new AgentEventBus()

export function dispatchAgentEvent<K extends AgentEventType>(type: K, payload: AgentEventPayloadMap[K]): void {
  agentEventBus.dispatch(type, payload)
}

export function subscribeAgentEvent<K extends AgentEventType>(type: K, listener: EventListener<K>): () => void {
  return agentEventBus.subscribe(type, listener)
}
