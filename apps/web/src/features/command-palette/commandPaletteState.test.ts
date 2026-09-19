import { describe, expect, it, vi } from 'vitest'
import { searchCommands, type CommandItem } from './commandPaletteState.js'

describe('Command Palette State & Fuzzy Search (commandPaletteState.test.ts)', () => {
  const dummyFn = vi.fn()
  const sampleCommands: CommandItem[] = [
    { id: 'view-office', title: 'Open Living Office', category: 'NAVIGATION', run: dummyFn },
    { id: 'view-graph', title: 'Open Graph Pipeline', category: 'NAVIGATION', run: dummyFn },
    { id: 'view-evidence', title: 'Open Evidence & Diff Inspector', category: 'INSPECTION', run: dummyFn },
    { id: 'view-timeline', title: 'Open Activity Timeline', category: 'NAVIGATION', run: dummyFn },
    { id: 'run-new', title: 'Compose New Run', category: 'EXECUTION', run: dummyFn },
  ]

  it('returns all commands on empty search query', () => {
    const results = searchCommands(sampleCommands, '')
    expect(results).toHaveLength(5)
  })

  it('filters commands accurately by title substring', () => {
    const results = searchCommands(sampleCommands, 'office')
    expect(results).toHaveLength(1)
    expect(results[0]!.id).toBe('view-office')
  })

  it('filters commands by category', () => {
    const results = searchCommands(sampleCommands, 'execution')
    expect(results).toHaveLength(1)
    expect(results[0]!.id).toBe('run-new')
  })
})
