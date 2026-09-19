/**
 * Command Palette State & Action Definitions
 * Real executable commands matching authoritative Gravitas operations.
 * Strictly zero fake actions.
 */

export interface CommandItem {
  readonly id: string
  readonly title: string
  readonly subtitle?: string | undefined
  readonly category: 'NAVIGATION' | 'EXECUTION' | 'INSPECTION' | 'SYSTEM'
  readonly shortcut?: string | undefined
  readonly run: () => void
  readonly disabled?: boolean | undefined
}

export function searchCommands(
  commands: readonly CommandItem[],
  query: string
): readonly CommandItem[] {
  if (!query.trim()) {
    return commands
  }

  const q = query.toLowerCase().trim()
  return commands.filter((cmd) => {
    return (
      cmd.title.toLowerCase().includes(q) ||
      (cmd.subtitle && cmd.subtitle.toLowerCase().includes(q)) ||
      cmd.category.toLowerCase().includes(q)
    )
  })
}
