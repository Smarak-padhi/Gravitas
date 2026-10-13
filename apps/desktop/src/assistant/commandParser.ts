/**
 * GRAVITAS V1-F-01 / V1-F-02 — Deterministic Natural-Language Command Parser
 *
 * Parses user natural-language voice/text commands into structured, allowlisted intents
 * for the Unified Local Knowledge Hub and Bounded Windows Desktop Companion.
 * Never generates or executes arbitrary shell commands.
 */

import type { KnowledgeCollection } from './ideasVault.js'

export type AssistantIntentKind =
  | 'SAVE_IDEA'
  | 'ADD_STUDY_NOTE'
  | 'CREATE_PROJECT'
  | 'CREATE_TASK'
  | 'COMPLETE_TASK'
  | 'LIST_UNFINISHED_TASKS'
  | 'LIST_COLLECTION'
  | 'LINK_ITEMS'
  | 'EXPORT_MARKDOWN'
  | 'LIST_IDEAS'
  | 'SEARCH_IDEAS'
  | 'LAUNCH_APP'
  | 'AUTOMATE_NOTEPAD'
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

export interface ParsedAddStudyNoteIntent {
  readonly kind: 'ADD_STUDY_NOTE'
  readonly rawInput: string
  readonly subject: string
  readonly topic: string | null
  readonly noteText: string
}

export interface ParsedCreateProjectIntent {
  readonly kind: 'CREATE_PROJECT'
  readonly rawInput: string
  readonly projectTitle: string
  readonly description: string
}

export interface ParsedCreateTaskIntent {
  readonly kind: 'CREATE_TASK'
  readonly rawInput: string
  readonly taskTitle: string
  readonly originalText: string
  readonly dueDateExpression: string | null
  readonly subject: string | null
  readonly topic: string | null
}

export interface ParsedCompleteTaskIntent {
  readonly kind: 'COMPLETE_TASK'
  readonly rawInput: string
  readonly targetQueryOrId: string
}

export interface ParsedListUnfinishedTasksIntent {
  readonly kind: 'LIST_UNFINISHED_TASKS'
  readonly rawInput: string
}

export interface ParsedListCollectionIntent {
  readonly kind: 'LIST_COLLECTION'
  readonly rawInput: string
  readonly collection?: KnowledgeCollection | undefined
  readonly subject?: string | undefined
}

export interface ParsedLinkItemsIntent {
  readonly kind: 'LINK_ITEMS'
  readonly rawInput: string
  readonly sourceQuery: string
  readonly targetQuery: string
}

export interface ParsedExportMarkdownIntent {
  readonly kind: 'EXPORT_MARKDOWN'
  readonly rawInput: string
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

export interface ParsedAutomateNotepadIntent {
  readonly kind: 'AUTOMATE_NOTEPAD'
  readonly rawInput: string
  readonly textToType: string
  readonly requiresSaveApproval: boolean
  readonly requestedSaveTarget?: string | undefined
  readonly requiredCapability: 'cap:desktop:bounded-automation'
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
  | ParsedAddStudyNoteIntent
  | ParsedCreateProjectIntent
  | ParsedCreateTaskIntent
  | ParsedCompleteTaskIntent
  | ParsedListUnfinishedTasksIntent
  | ParsedListCollectionIntent
  | ParsedLinkItemsIntent
  | ParsedExportMarkdownIntent
  | ParsedListIdeasIntent
  | ParsedSearchIdeasIntent
  | ParsedLaunchAppIntent
  | ParsedAutomateNotepadIntent
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
  // "Save this idea build an AI study planner."
  const saveMatch = trimmed.match(
    /^(?:save\s+(?:this\s+|an?\s+|my\s+)?idea|remember\s+(?:this\s+)?idea|new\s+idea|capture\s+(?:this\s+)?idea|add\s+(?:an?\s+)?idea)(?:\s*(?:[:\-]|that)\s*|\s+)(.+)$/i
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

  // 2. ADD_STUDY_NOTE patterns:
  // "Add these notes to Physics."
  // "Add these notes to Physics: Newton's second law states F = ma."
  // "Add a note to Physics about Kinematics: velocity and acceleration."
  // "Save study note to Mathematics: Fundamental theorem of calculus."
  const studyNoteMatch = trimmed.match(
    /^(?:add|save|record)\s+(?:these\s+|this\s+|a\s+|my\s+)?(?:study\s+)?notes?\s+(?:to|in|for|under)\s+([a-z0-9\s_-]+?)(?:\s+(?:on|about|topic)\s+([a-z0-9\s_-]+?))?(?:\s*[:\-]\s*(.+))?[.!?]*$/i
  )
  if (studyNoteMatch && studyNoteMatch[1]) {
    const rawSubject = studyNoteMatch[1].trim().replace(/[.!?]+$/, '').trim()
    const rawTopic = studyNoteMatch[2] ? studyNoteMatch[2].trim().replace(/[.!?]+$/, '').trim() : null
    const rawBody = studyNoteMatch[3] ? studyNoteMatch[3].trim() : ''
    if (rawSubject.length > 0) {
      const subject = rawSubject.charAt(0).toUpperCase() + rawSubject.slice(1)
      const noteText =
        rawBody.length > 0
          ? rawBody
          : rawTopic
            ? `Study notes for ${subject} (${rawTopic}).`
            : `Study notes added to ${subject}.`
      return {
        kind: 'ADD_STUDY_NOTE',
        rawInput: trimmed,
        subject,
        topic: rawTopic,
        noteText,
      }
    }
  }

  // 3. CREATE_PROJECT patterns:
  // "Create a project called Study Planner."
  // "Create project named Quantum Lab: Simulation of wavefunctions."
  // "New project: Study Planner"
  const createProjMatch = trimmed.match(
    /^(?:create|start|add|new)\s+(?:a\s+|new\s+)?project(?:\s+(?:called|named|titled))?\s*[:\-]?\s*([^:.!?]+?)(?:\s*[:\-]\s*(.+))?[.!?]*$/i
  )
  if (createProjMatch && createProjMatch[1]) {
    const projectTitle = createProjMatch[1].trim().replace(/^["']|["']$/g, '').trim()
    const description = createProjMatch[2]?.trim() || `Project: ${projectTitle}`
    if (projectTitle.length > 0) {
      return {
        kind: 'CREATE_PROJECT',
        rawInput: trimmed,
        projectTitle,
        description,
      }
    }
  }

  // 4. CREATE_TASK / Reminder patterns:
  // "Remind me to revise chapter 3 tomorrow."
  // "Remind me to complete Physics problem set on 2026-10-20."
  // "Add task: revise chapter 3 tomorrow."
  // "Create a plan to review lecture notes today."
  const remindMatch = trimmed.match(
    /^(?:remind\s+me\s+to|add\s+(?:a\s+)?task\s*[:\-]?|create\s+(?:a\s+)?(?:task|plan)\s*(?:to|[:\-])?)\s+(.+?)[.!?]*$/i
  )
  if (remindMatch && remindMatch[1]) {
    const body = remindMatch[1].trim()
    const dueMatch = body.match(
      /^(.*?)\s+(?:(?:by|on|due)\s+)?(today|tonight|tomorrow|next\s+week|in\s+\d+\s+days?|\d{4}-\d{2}-\d{2})$/i
    )
    const rawTaskTitle = (dueMatch && dueMatch[1] ? dueMatch[1] : body).trim()
    const dueDateExpression = dueMatch && dueMatch[2] ? dueMatch[2].trim().toLowerCase() : null

    const chapterMatch = rawTaskTitle.match(/\b(chapter\s+\d+[a-z]?)\b/i)
    const topic = chapterMatch && chapterMatch[1]
      ? chapterMatch[1].charAt(0).toUpperCase() + chapterMatch[1].slice(1)
      : null

    const subjectMatch = rawTaskTitle.match(/\b(physics|mathematics|math|chemistry|biology|computer\s+science|history)\b/i)
    const subject = subjectMatch && subjectMatch[1]
      ? subjectMatch[1].charAt(0).toUpperCase() + subjectMatch[1].slice(1)
      : null

    const cleanTitle = rawTaskTitle.charAt(0).toUpperCase() + rawTaskTitle.slice(1)
    return {
      kind: 'CREATE_TASK',
      rawInput: trimmed,
      taskTitle: cleanTitle,
      originalText: trimmed,
      dueDateExpression,
      subject,
      topic,
    }
  }

  // 5. LIST_UNFINISHED_TASKS patterns:
  // "Show my unfinished tasks." / "List my pending tasks." / "What are my unfinished tasks?" / "Show open tasks"
  if (
    /^(?:show|list|view|display|get|what\s+are)\s+(?:all\s+)?(?:my\s+|the\s+)?(?:unfinished|pending|incomplete|open|todo|active)\s+(?:tasks?|plans?|reminders?)[.!?]*$/i.test(
      trimmed
    ) ||
    /^unfinished\s+tasks[.!?]*$/i.test(trimmed)
  ) {
    return {
      kind: 'LIST_UNFINISHED_TASKS',
      rawInput: trimmed,
    }
  }

  // 6. COMPLETE_TASK patterns:
  // "Complete task: revise chapter 3" / "Mark task revise chapter 3 as done" / "Finish task revise chapter 3"
  const completeTaskMatch = trimmed.match(
    /^(?:complete|finish|check\s+off|mark)\s+(?:my\s+|the\s+)?(?:task|plan|reminder)?\s*[:\-]?\s*(.+?)(?:\s+as\s+(?:done|completed|finished))?[.!?]*$/i
  )
  if (completeTaskMatch && completeTaskMatch[1] && /\b(?:complete|finish|check\s+off|done)\b/i.test(trimmed)) {
    const targetQueryOrId = completeTaskMatch[1].trim()
    if (targetQueryOrId.length > 0) {
      return {
        kind: 'COMPLETE_TASK',
        rawInput: trimmed,
        targetQueryOrId,
      }
    }
  }

  // 7. LINK_ITEMS patterns:
  // "Link Study Planner to revise chapter 3."
  // "Link idea AI study planner with project Study Planner."
  const linkMatch = trimmed.match(
    /^link\s+(?:(?:idea|note|project|task)\s+)?["']?(.+?)["']?\s+(?:to|with)\s+(?:(?:idea|note|project|task)\s+)?["']?(.+?)["']?[.!?]*$/i
  )
  if (linkMatch && linkMatch[1] && linkMatch[2]) {
    return {
      kind: 'LINK_ITEMS',
      rawInput: trimmed,
      sourceQuery: linkMatch[1].trim(),
      targetQuery: linkMatch[2].trim(),
    }
  }

  // 8. EXPORT_MARKDOWN patterns:
  // "Export my knowledge hub to Markdown." / "Export notes to Markdown" / "Export Markdown"
  if (
    /^(?:export|backup|save)\s+(?:my\s+|all\s+)?(?:knowledge\s+hub|ideas|notes|vault|everything)?\s*(?:to|as)\s+markdown[.!?]*$/i.test(
      trimmed
    ) ||
    /^export\s+markdown[.!?]*$/i.test(trimmed)
  ) {
    return {
      kind: 'EXPORT_MARKDOWN',
      rawInput: trimmed,
    }
  }

  // 9. LIST_IDEAS patterns (strictly preserved for V1-F-01 compatibility):
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

  // 10. LIST_COLLECTION patterns (Study Notes, Projects, Tasks, or Subject-specific notes):
  // "Show my projects." / "Show my study notes." / "Show my Physics notes." / "Show my tasks."
  if (/^(?:show|list|view|display|get)\s+(?:all\s+)?(?:my\s+|the\s+)?projects[.!?]*$/i.test(trimmed)) {
    return {
      kind: 'LIST_COLLECTION',
      rawInput: trimmed,
      collection: 'PROJECT',
    }
  }
  if (/^(?:show|list|view|display|get)\s+(?:all\s+)?(?:my\s+|the\s+)?(?:tasks|plans)[.!?]*$/i.test(trimmed)) {
    return {
      kind: 'LIST_COLLECTION',
      rawInput: trimmed,
      collection: 'PLAN_TASK',
    }
  }
  if (/^(?:show|list|view|display|get)\s+(?:all\s+)?(?:my\s+|the\s+)?(?:study\s+)?notes[.!?]*$/i.test(trimmed)) {
    return {
      kind: 'LIST_COLLECTION',
      rawInput: trimmed,
      collection: 'STUDY_NOTE',
    }
  }
  const subjectNotesMatch = trimmed.match(
    /^(?:show|list|view|display|get)\s+(?:all\s+)?(?:my\s+|the\s+)?([a-z0-9\s_-]+?)\s+notes[.!?]*$/i
  )
  if (subjectNotesMatch && subjectNotesMatch[1]) {
    const subj = subjectNotesMatch[1].trim()
    if (subj.toLowerCase() !== 'study' && subj.toLowerCase() !== 'saved') {
      return {
        kind: 'LIST_COLLECTION',
        rawInput: trimmed,
        collection: 'STUDY_NOTE',
        subject: subj.charAt(0).toUpperCase() + subj.slice(1),
      }
    }
  }

  // 11. SEARCH_IDEAS patterns:
  // "Find my study planner idea."
  // "Find my <X> idea." / "Search ideas for <X>" / "Find idea about <X>" / "Search knowledge hub for <X>"
  const findPossessiveMatch = trimmed.match(
    /^(?:find|search|look\s+for|locate|show)\s+(?:my\s+|the\s+|an?\s+)?(.+?)\s+(?:ideas?|notes?|projects?|tasks?)[.!?]*$/i
  )
  if (findPossessiveMatch && findPossessiveMatch[1]) {
    const candidateQuery = findPossessiveMatch[1]
      .replace(/^(?:saved|all)\s+/i, '')
      .trim()
    if (candidateQuery.length > 0 && !/^(?:all|saved|my|unfinished|pending|incomplete|open|study)$/i.test(candidateQuery)) {
      return {
        kind: 'SEARCH_IDEAS',
        rawInput: trimmed,
        query: candidateQuery.replace(/[.!?]+$/, '').trim(),
      }
    }
  }

  const searchPrefixMatch = trimmed.match(
    /^(?:find|search)\s+(?:(?:my\s+|saved\s+)?(?:ideas?|notes?|projects?|tasks?|knowledge\s+hub)\s*)?(?:for|about|matching|[:\-])\s*(.+)$/i
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

  // 12. DELETE_IDEA_PROMPT patterns (always requires explicit confirmation):
  const deleteMatch = trimmed.match(
    /^(?:delete|remove)\s+(?:my\s+|the\s+)?(?:idea|note|project|task)\s*[:\-]?\s*(.+)$/i
  )
  if (deleteMatch && deleteMatch[1]) {
    return {
      kind: 'DELETE_IDEA_PROMPT',
      rawInput: trimmed,
      targetQueryOrId: deleteMatch[1].replace(/[.!?]+$/, '').trim(),
      requiresConfirmation: true,
    }
  }

  // 13. SIMULATE_LONG_TASK (for testing / demonstrating active action + STOP cancellation):
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

  // 14. AUTOMATE_NOTEPAD (Bounded Windows Automation):
  // "Open Notepad, type Hello from GRAVITAS, and save it to a user-approved location."
  // "Open Notepad and type Hello from GRAVITAS."
  const notepadAutoMatch = trimmed.match(
    /^(?:open|launch)\s+notepad(?:\.exe)?\s*(?:,\s*|\s+and\s+)\s*type\s+["']?(.+?)["']?(?:\s*(?:,\s*and\s+|\s+and\s+)\s*save\s+it(?:\s+to\s+(.+?))?)?[.!?]*$/i
  )
  if (notepadAutoMatch && notepadAutoMatch[1]) {
    const textToType = notepadAutoMatch[1].trim()
    const hasSaveClause = /\bsave\s+it\b/i.test(trimmed)
    const requestedSaveTarget = notepadAutoMatch[2]?.trim()
    return {
      kind: 'AUTOMATE_NOTEPAD',
      rawInput: trimmed,
      textToType,
      requiresSaveApproval: hasSaveClause,
      requestedSaveTarget,
      requiredCapability: 'cap:desktop:bounded-automation',
    }
  }

  // 15. LAUNCH_APP / BLOCKED_APP patterns:
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
      'Unrecognized command. Supported commands: "Save this idea: <text>", "Add these notes to <Subject>: <text>", "Create a project called <Title>", "Remind me to <task> tomorrow", "Show my unfinished tasks.", "Open Notepad."',
  }
}

