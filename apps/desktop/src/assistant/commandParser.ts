/**
 * GRAVITAS V1-F-01 — Deterministic Natural-Language Command Parser
 *
 * Parses user natural-language commands into structured, allowlisted intents.
 * Never generates or executes arbitrary shell commands.
 */

export type AssistantIntentKind =
  | 'SAVE_IDEA'
  | 'LIST_IDEAS'
  | 'SEARCH_IDEAS'
  | 'LAUNCH_APP'
  | 'BLOCKED_APP'
  | 'DELETE_IDEA_PROMPT'
  | 'SIMULATE_LONG_TASK'
  | 'UNKNOWN_COMMAND'

export type AllowlistedAppId = 'notepad' | 'calc' | 'mspaint'

export interface ParsedSaveIdeaIntent {
  readonly kind: 'SAVE_IDEA'
  readonly rawInput: string
  readonly ideaText: string
}

export interface ParsedListIdeasIntent {
  readonly kind: 'LIST_IDEAS'
  readonly rawInput: string
}

export interface ParsedSearchIdeasIntent {
  readonly kind: 'SEARCH_IDEAS'
  readonly rawInput: string
  readonly query: string
}

export interface ParsedLaunchAppIntent {
  readonly kind: 'LAUNCH_APP'
  readonly rawInput: string
  readonly appId: AllowlistedAppId
  readonly displayName: string
  readonly requiredCapability: 'cap:desktop:launch-app'
}

export interface ParsedBlockedAppIntent {
  readonly kind: 'BLOCKED_APP'
  readonly rawInput: string
  readonly requestedApp: string
  readonly reason: string
}

export interface ParsedDeleteIdeaPromptIntent {
  readonly kind: 'DELETE_IDEA_PROMPT'
  readonly rawInput: string
  readonly targetQueryOrId: string
  readonly requiresConfirmation: true
}

export interface ParsedSimulateLongTaskIntent {
  readonly kind: 'SIMULATE_LONG_TASK'
  readonly rawInput: string
  readonly durationMs: number
}

export interface ParsedUnknownCommandIntent {
  readonly kind: 'UNKNOWN_COMMAND'
  readonly rawInput: string
  readonly reason: string
}

export type ParsedAssistantIntent =
  | ParsedSaveIdeaIntent
  | ParsedListIdeasIntent
  | ParsedSearchIdeasIntent
  | ParsedLaunchAppIntent
  | ParsedBlockedAppIntent
  | ParsedDeleteIdeaPromptIntent
  | ParsedSimulateLongTaskIntent
  | ParsedUnknownCommandIntent

const ALLOWLISTED_APP_ALIASES: Readonly<Record<string, { appId: AllowlistedAppId; displayName: string }>> = {
  notepad: { appId: 'notepad', displayName: 'Notepad' },
  'notepad.exe': { appId: 'notepad', displayName: 'Notepad' },
  calculator: { appId: 'calc', displayName: 'Calculator' },
  calc: { appId: 'calc', displayName: 'Calculator' },
  'calc.exe': { appId: 'calc', displayName: 'Calculator' },
  paint: { appId: 'mspaint', displayName: 'Paint' },
  mspaint: { appId: 'mspaint', displayName: 'Paint' },
  'mspaint.exe': { appId: 'mspaint', displayName: 'Paint' },
}

export function parseAssistantCommand(rawInput: string): ParsedAssistantIntent {
  if (typeof rawInput !== 'string') {
    return {
      kind: 'UNKNOWN_COMMAND',
      rawInput: '',
      reason: 'Command must be a non-empty string.',
    }
  }

  const trimmed = rawInput.trim()
  if (!trimmed) {
    return {
      kind: 'UNKNOWN_COMMAND',
      rawInput: '',
      reason: 'Command cannot be empty.',
    }
  }

  // 1. SAVE_IDEA patterns:
  // "Save this idea: build an AI study planner."
  // "Save idea: ..." / "Remember this idea: ..." / "New idea: ..." / "Capture idea: ..."
  const saveMatch = trimmed.match(
    /^(?:save\s+(?:this\s+|an?\s+|my\s+)?idea|remember\s+(?:this\s+)?idea|new\s+idea|capture\s+(?:this\s+)?idea|add\s+(?:an?\s+)?idea)\s*(?:[:\-]|that)?\s+(.+)$/i
  )
  if (saveMatch && saveMatch[1]) {
    const ideaText = saveMatch[1].trim()
    if (ideaText.length > 0) {
      return {
        kind: 'SAVE_IDEA',
        rawInput: trimmed,
        ideaText,
      }
    }
  }

  // 2. LIST_IDEAS patterns:
  // "Show my ideas." / "List my ideas." / "Show saved ideas" / "What are my ideas?"
  if (
    /^(?:show|list|view|display|get)\s+(?:all\s+)?(?:my\s+|saved\s+|the\s+)?ideas[.!?]*$/i.test(trimmed) ||
    /^what\s+are\s+my\s+(?:saved\s+)?ideas[.!?]*$/i.test(trimmed) ||
    /^ideas\s*vault[.!?]*$/i.test(trimmed)
  ) {
    return {
      kind: 'LIST_IDEAS',
      rawInput: trimmed,
    }
  }

  // 3. SEARCH_IDEAS patterns:
  // "Find my study planner idea."
  // "Find my <X> idea." / "Search ideas for <X>" / "Find idea about <X>" / "Search my ideas: <X>"
  const findPossessiveMatch = trimmed.match(
    /^(?:find|search|look\s+for|locate|show)\s+(?:my\s+|the\s+|an?\s+)?(.+?)\s+ideas?[.!?]*$/i
  )
  if (findPossessiveMatch && findPossessiveMatch[1]) {
    const candidateQuery = findPossessiveMatch[1]
      .replace(/^(?:saved|all)\s+/i, '')
      .trim()
    if (candidateQuery.length > 0 && !/^(?:all|saved|my)$/i.test(candidateQuery)) {
      return {
        kind: 'SEARCH_IDEAS',
        rawInput: trimmed,
        query: candidateQuery.replace(/[.!?]+$/, '').trim(),
      }
    }
  }

  const searchPrefixMatch = trimmed.match(
    /^(?:find|search)\s+(?:my\s+|saved\s+)?ideas?\s*(?:for|about|matching|[:\-])\s*(.+)$/i
  )
  if (searchPrefixMatch && searchPrefixMatch[1]) {
    const query = searchPrefixMatch[1].replace(/[.!?]+$/, '').trim()
    if (query.length > 0) {
      return {
        kind: 'SEARCH_IDEAS',
        rawInput: trimmed,
        query,
      }
    }
  }

  // 4. DELETE_IDEA_PROMPT patterns (always requires explicit confirmation):
  const deleteMatch = trimmed.match(/^(?:delete|remove)\s+(?:my\s+|the\s+)?idea\s*[:\-]?\s*(.+)$/i)
  if (deleteMatch && deleteMatch[1]) {
    return {
      kind: 'DELETE_IDEA_PROMPT',
      rawInput: trimmed,
      targetQueryOrId: deleteMatch[1].replace(/[.!?]+$/, '').trim(),
      requiresConfirmation: true,
    }
  }

  // 5. SIMULATE_LONG_TASK (for testing / demonstrating active action + STOP cancellation):
  const longTaskMatch = trimmed.match(
    /^(?:run\s+long\s+task|analyze\s+vault\s+deeply|hold\s+action|wait\s+for\s+cancel)(?:\s+(\d+)ms)?[.!?]*$/i
  )
  if (longTaskMatch) {
    const customMs = longTaskMatch[1] ? Number(longTaskMatch[1]) : 5000
    const boundedMs = Math.min(Math.max(customMs || 5000, 200), 15000)
    return {
      kind: 'SIMULATE_LONG_TASK',
      rawInput: trimmed,
      durationMs: boundedMs,
    }
  }

  // 6. LAUNCH_APP / BLOCKED_APP patterns:
  // "Open Notepad." / "Launch Notepad" / "Start Calculator"
  const launchMatch = trimmed.match(/^(?:open|launch|start)\s+(.+?)[.!?]*$/i)
  if (launchMatch && launchMatch[1]) {
    const targetRaw = launchMatch[1].trim()
    const targetKey = targetRaw.toLowerCase()

    // Reject shell metacharacters or argument injection attempts immediately
    if (/[;&|`$<>\\/]/.test(targetRaw) || /\s+-/.test(targetRaw)) {
      return {
        kind: 'BLOCKED_APP',
        rawInput: trimmed,
        requestedApp: targetRaw,
        reason: `Refused application launch "${targetRaw}": shell metacharacters, paths, or flags are forbidden.`,
      }
    }

    const allowlisted = ALLOWLISTED_APP_ALIASES[targetKey]
    if (allowlisted) {
      return {
        kind: 'LAUNCH_APP',
        rawInput: trimmed,
        appId: allowlisted.appId,
        displayName: allowlisted.displayName,
        requiredCapability: 'cap:desktop:launch-app',
      }
    }

    return {
      kind: 'BLOCKED_APP',
      rawInput: trimmed,
      requestedApp: targetRaw,
      reason: `Application "${targetRaw}" is not in the GRAVITAS allowlisted desktop launcher catalog (Allowed: Notepad, Calculator, Paint).`,
    }
  }

  return {
    kind: 'UNKNOWN_COMMAND',
    rawInput: trimmed,
    reason:
      'Unrecognized command. Supported commands: "Save this idea: <text>", "Show my ideas.", "Find my <topic> idea.", "Open Notepad."',
  }
}
