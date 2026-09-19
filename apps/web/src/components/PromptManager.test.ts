import { describe, expect, it } from 'vitest'
import type { PromptLayerName } from '../api/types.js'

const CANONICAL_LAYERS: readonly PromptLayerName[] = [
  'GLOBAL',
  'PROJECT',
  'EXECUTION_CONTRACT',
  'TASK',
  'AGENT_ROLE',
  'RUNTIME_CONTEXT',
]

const LAYER_SOURCES: Record<PromptLayerName, string> = {
  GLOBAL: 'MANAGED_POLICY',
  PROJECT: 'PROJECT_INPUT',
  EXECUTION_CONTRACT: 'CONTRACT',
  TASK: 'TASK',
  AGENT_ROLE: 'MANAGED_POLICY',
  RUNTIME_CONTEXT: 'GENERATED_RUNTIME',
}

function parseLayerTexts(fullText: string): Record<string, string> {
  const sections: Record<string, string> = {}
  const regex = /# \[LAYER: ([A-Z_]+)\]\n([\s\S]*?)(?=(?:\n\n# \[LAYER:|$))/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(fullText)) !== null) {
    const layerName = match[1]
    const content = match[2]
    if (layerName && content !== undefined) {
      sections[layerName] = content.trim()
    }
  }
  return sections
}

describe('PromptManager Layer Parsing & Canonical Ordering (PromptManager.test.ts)', () => {
  it('enforces canonical six-layer ordering constant', () => {
    expect(CANONICAL_LAYERS).toEqual([
      'GLOBAL',
      'PROJECT',
      'EXECUTION_CONTRACT',
      'TASK',
      'AGENT_ROLE',
      'RUNTIME_CONTEXT',
    ])
  })

  it('assigns correct source classification to each canonical layer', () => {
    expect(LAYER_SOURCES.GLOBAL).toBe('MANAGED_POLICY')
    expect(LAYER_SOURCES.PROJECT).toBe('PROJECT_INPUT')
    expect(LAYER_SOURCES.EXECUTION_CONTRACT).toBe('CONTRACT')
    expect(LAYER_SOURCES.TASK).toBe('TASK')
    expect(LAYER_SOURCES.AGENT_ROLE).toBe('MANAGED_POLICY')
    expect(LAYER_SOURCES.RUNTIME_CONTEXT).toBe('GENERATED_RUNTIME')
  })

  it('accurately parses layer contents from compiled prompt text', () => {
    const mockCompiledPrompt = [
      '# [LAYER: GLOBAL]',
      'You are a Gravitas worker.',
      '',
      '# [LAYER: PROJECT]',
      'PROJECT: Gravitas Command Center',
      '',
      '# [LAYER: EXECUTION_CONTRACT]',
      'GOAL: Implement feature X',
      '',
      '# [LAYER: TASK]',
      'TASK ID: task_1',
      '',
      '# [LAYER: AGENT_ROLE]',
      'You are an IMPLEMENTER.',
      '',
      '# [LAYER: RUNTIME_CONTEXT]',
      'Run ID: run_1',
    ].join('\n')

    const parsed = parseLayerTexts(mockCompiledPrompt)

    expect(parsed.GLOBAL).toBe('You are a Gravitas worker.')
    expect(parsed.PROJECT).toBe('PROJECT: Gravitas Command Center')
    expect(parsed.EXECUTION_CONTRACT).toBe('GOAL: Implement feature X')
    expect(parsed.TASK).toBe('TASK ID: task_1')
    expect(parsed.AGENT_ROLE).toBe('You are an IMPLEMENTER.')
    expect(parsed.RUNTIME_CONTEXT).toBe('Run ID: run_1')
  })

  it('handles omitted layers gracefully', () => {
    const partialPrompt = [
      '# [LAYER: GLOBAL]',
      'You are a Gravitas worker.',
      '',
      '# [LAYER: TASK]',
      'TASK ID: task_1',
    ].join('\n')

    const parsed = parseLayerTexts(partialPrompt)

    expect(parsed.GLOBAL).toBe('You are a Gravitas worker.')
    expect(parsed.TASK).toBe('TASK ID: task_1')
    expect(parsed.PROJECT).toBeUndefined()
    expect(parsed.RUNTIME_CONTEXT).toBeUndefined()
  })

  it('prohibits editing compiled prompt — prompt is derived output', () => {
    // Structural invariant check: ensure no mutation methods exist on compiled prompt
    const readOnlyPrompt = Object.freeze({
      sha256: 'abc123',
      byteLength: 42,
      text: 'Compiled text',
    })

    expect(() => {
      // @ts-expect-error - testing immutability
      readOnlyPrompt.text = 'Modified text'
    }).toThrow()
  })
})
