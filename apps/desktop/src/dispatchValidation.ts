/** Shared, bounded validation for the Main and utility-process boundaries. */
export function validateDispatchPayload(value: unknown): void {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid dispatch payload')
  const p = value as Record<string, unknown>
  const keys = ['workSessionId', 'modelId', 'prompt', 'messages', 'maxTokens', 'temperature', 'timeoutMs', 'type', 'protocolVersion', 'requestId', 'timestamp']
  if (Object.keys(p).some(k => !keys.includes(k))) throw new Error('Unknown dispatch field')
  for (const key of ['modelId', 'workSessionId']) {
    if (p[key] !== undefined && (typeof p[key] !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_./:-]{0,199}$/.test(p[key] as string))) throw new Error('Invalid dispatch identifier')
  }
  if (typeof p.prompt !== 'string' || p.prompt.length > 65536 || (!p.prompt.trim() && p.messages === undefined)) throw new Error('Invalid prompt')
  if (p.messages !== undefined) {
    if (!Array.isArray(p.messages) || p.messages.length < 1 || p.messages.length > 64) throw new Error('Invalid messages')
    let total = 0
    for (const m of p.messages) {
      if (!m || typeof m !== 'object' || !['system', 'user', 'assistant'].includes(m.role) || typeof m.content !== 'string' || !m.content.trim() || Object.keys(m).some(k => !['role', 'content'].includes(k))) throw new Error('Invalid message')
      total += m.content.length
    }
    if (total > 65536) throw new Error('Messages exceed limit')
  }
  for (const [key, min, max, integer] of [['maxTokens', 1, 8192, true], ['timeoutMs', 1, 120000, true], ['temperature', 0, 2, false]] as const) {
    const n = p[key]
    if (n !== undefined && (typeof n !== 'number' || !Number.isFinite(n) || n < min || n > max || (integer && !Number.isInteger(n)))) throw new Error('Invalid dispatch numeric limit')
  }
}
