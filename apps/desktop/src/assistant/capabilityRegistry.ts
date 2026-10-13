/**
 * GRAVITAS V1-F-01 — Supervised Self-Improvement & Assistant Capability Registry
 *
 * Tracks assistant capabilities, test coverage, failed attempts, user feedback,
 * and supervised improvement proposals in SQLite.
 *
 * Safety Invariants:
 * - A failed task may produce an ImprovementProposal.
 * - It MUST NOT silently modify source code, install tools, grant permissions, or deploy updates.
 */

import type { DatabaseSync } from 'node:sqlite'
import { randomUUID } from 'node:crypto'

export interface CapabilityTestCoverage {
  readonly covered: boolean
  readonly suiteName: string
  readonly verifiedAssertionsCount: number
}

export interface CapabilityFeedbackItem {
  readonly feedbackId: string
  readonly capabilityId: string
  readonly rating: 'POSITIVE' | 'NEGATIVE'
  readonly comment: string
  readonly createdAt: string
}

export interface ImprovementProposal {
  readonly proposalId: string
  readonly capabilityId: string
  readonly triggerCommand: string
  readonly failureReason: string
  readonly suggestedImprovement: string
  readonly status: 'PROPOSED_AWAITING_HUMAN_REVIEW' | 'REVIEWED' | 'DISMISSED'
  readonly autoApplied: false
  readonly modifiedSourceCode: false
  readonly installedTools: false
  readonly grantedPermissions: false
  readonly deployedUpdates: false
  readonly createdAt: string
}

export interface AssistantCapabilityRecord {
  readonly capabilityId: string
  readonly capabilityName: string
  readonly supportedActions: readonly string[]
  readonly requiredPermissions: readonly string[]
  readonly testCoverage: CapabilityTestCoverage
  readonly failedAttempts: number
  readonly userFeedback: readonly CapabilityFeedbackItem[]
  readonly suggestedImprovements: readonly ImprovementProposal[]
  readonly updatedAt: string
}

export const DEFAULT_ASSISTANT_CAPABILITIES: ReadonlyArray<{
  readonly capabilityId: string
  readonly capabilityName: string
  readonly supportedActions: readonly string[]
  readonly requiredPermissions: readonly string[]
  readonly testCoverage: CapabilityTestCoverage
}> = [
  {
    capabilityId: 'cap:assistant:ideas-vault',
    capabilityName: 'Local Ideas Vault',
    supportedActions: ['SAVE_IDEA', 'LIST_IDEAS', 'SEARCH_IDEAS', 'GET_IDEA', 'UPDATE_IDEA', 'DELETE_IDEA_CONFIRMED'],
    requiredPermissions: ['fs:sqlite:ideas-vault'],
    testCoverage: {
      covered: true,
      suiteName: 'apps/desktop/src/companion-vault.test.ts',
      verifiedAssertionsCount: 12,
    },
  },
  {
    capabilityId: 'cap:assistant:knowledge-hub',
    capabilityName: 'Unified Local Knowledge Hub (Ideas, Study Notes, Projects, Tasks)',
    supportedActions: [
      'SAVE_STUDY_NOTE',
      'CREATE_PROJECT',
      'CREATE_TASK',
      'COMPLETE_TASK',
      'LIST_UNFINISHED_TASKS',
      'LIST_BY_SUBJECT_OR_COLLECTION',
      'LINK_ITEMS',
      'UNLINK_ITEMS',
    ],
    requiredPermissions: ['fs:sqlite:ideas-vault'],
    testCoverage: {
      covered: true,
      suiteName: 'apps/desktop/src/knowledge-hub.test.ts',
      verifiedAssertionsCount: 18,
    },
  },
  {
    capabilityId: 'cap:assistant:markdown-portability',
    capabilityName: 'Local Markdown Import & Export (Obsidian-Compatible)',
    supportedActions: ['EXPORT_ITEM_MARKDOWN', 'EXPORT_ALL_MARKDOWN_DIRECTORY', 'IMPORT_MARKDOWN'],
    requiredPermissions: ['fs:sqlite:ideas-vault', 'fs:local-markdown-export-dir'],
    testCoverage: {
      covered: true,
      suiteName: 'apps/desktop/src/knowledge-hub.test.ts',
      verifiedAssertionsCount: 8,
    },
  },
  {
    capabilityId: 'cap:assistant:nl-command',
    capabilityName: 'Deterministic Natural-Language Command Router',
    supportedActions: [
      'PARSE_SAVE_IDEA',
      'PARSE_ADD_STUDY_NOTE',
      'PARSE_CREATE_PROJECT',
      'PARSE_CREATE_TASK',
      'PARSE_LIST_UNFINISHED_TASKS',
      'PARSE_LINK_ITEMS',
      'PARSE_LIST_IDEAS',
      'PARSE_SEARCH_IDEAS',
      'PARSE_LAUNCH_APP',
      'PARSE_AUTOMATE_NOTEPAD',
      'CANCEL_ACTIVE_COMMAND',
    ],
    requiredPermissions: ['ipc:authorized-companion-frame', 'kernel:worksession-task-tracking'],
    testCoverage: {
      covered: true,
      suiteName: 'apps/desktop/src/knowledge-hub.test.ts',
      verifiedAssertionsCount: 16,
    },
  },
  {
    capabilityId: 'cap:desktop:launch-app',
    capabilityName: 'Scoped Allowlisted Application Launcher',
    supportedActions: ['LAUNCH_NOTEPAD', 'LAUNCH_CALCULATOR', 'LAUNCH_PAINT'],
    requiredPermissions: ['cap:desktop:launch-app', 'os:spawn-allowlisted-win32-binary'],
    testCoverage: {
      covered: true,
      suiteName: 'apps/desktop/src/companion-vault.test.ts',
      verifiedAssertionsCount: 6,
    },
  },
  {
    capabilityId: 'cap:desktop:bounded-automation',
    capabilityName: 'Bounded Windows Notepad Automation (Approval-Gated)',
    supportedActions: ['AUTOMATE_NOTEPAD_TYPE', 'SAVE_APPROVED_NOTE_FILE'],
    requiredPermissions: [
      'cap:desktop:bounded-automation',
      'cap:desktop:launch-app',
      'fs:write:operator-approved-note',
    ],
    testCoverage: {
      covered: true,
      suiteName: 'apps/desktop/src/knowledge-hub.test.ts',
      verifiedAssertionsCount: 6,
    },
  },
  {
    capabilityId: 'cap:assistant:voice-ptt',
    capabilityName: 'Push-to-Talk Offline Speech-to-Text',
    supportedActions: [
      'START_PTT_LISTENING',
      'STOP_PTT_TRANSCRIBE',
      'VERIFY_STT_SETUP',
      'TRANSCRIBE_WAV_WINDOWS_SYSTEM_SPEECH_OFFLINE',
    ],
    requiredPermissions: ['audio:user-initiated-ptt-only', 'fs:read:local-stt-model'],
    testCoverage: {
      covered: true,
      suiteName: 'apps/desktop/src/companion-vault.test.ts',
      verifiedAssertionsCount: 8,
    },
  },
]

export class AssistantCapabilityRegistry {
  private readonly db: DatabaseSync

  public constructor(db: DatabaseSync) {
    this.db = db
    this.seedDefaults()
  }

  private seedDefaults(): void {
    const now = new Date().toISOString()
    this.db.exec('BEGIN IMMEDIATE TRANSACTION;')
    try {
      const checkStmt = this.db.prepare('SELECT capability_id FROM assistant_capabilities WHERE capability_id = ?;')
      const insertStmt = this.db.prepare(`
        INSERT INTO assistant_capabilities (
          capability_id, capability_name, supported_actions_json, required_permissions_json,
          test_coverage_json, failed_attempts, updated_at
        ) VALUES (?, ?, ?, ?, ?, 0, ?);
      `)
      const updateMetaStmt = this.db.prepare(`
        UPDATE assistant_capabilities
        SET capability_name = ?, supported_actions_json = ?, required_permissions_json = ?, test_coverage_json = ?
        WHERE capability_id = ?;
      `)

      for (const cap of DEFAULT_ASSISTANT_CAPABILITIES) {
        const existing = checkStmt.get(cap.capabilityId)
        if (!existing) {
          insertStmt.run(
            cap.capabilityId,
            cap.capabilityName,
            JSON.stringify(cap.supportedActions),
            JSON.stringify(cap.requiredPermissions),
            JSON.stringify(cap.testCoverage),
            now
          )
        } else {
          updateMetaStmt.run(
            cap.capabilityName,
            JSON.stringify(cap.supportedActions),
            JSON.stringify(cap.requiredPermissions),
            JSON.stringify(cap.testCoverage),
            cap.capabilityId
          )
        }
      }
      this.db.exec('COMMIT;')
    } catch (err) {
      this.db.exec('ROLLBACK;')
      throw err
    }
  }

  public listCapabilities(): readonly AssistantCapabilityRecord[] {
    const rows = this.db
      .prepare('SELECT * FROM assistant_capabilities ORDER BY capability_id ASC;')
      .all() as Record<string, unknown>[]

    return rows.map((row) => this.mapCapabilityRow(row))
  }

  public getCapability(capabilityId: string): AssistantCapabilityRecord | null {
    const row = this.db
      .prepare('SELECT * FROM assistant_capabilities WHERE capability_id = ?;')
      .get(capabilityId) as Record<string, unknown> | undefined
    if (!row) return null
    return this.mapCapabilityRow(row)
  }

  public recordFailedAttempt(params: {
    readonly capabilityId: string
    readonly triggerCommand: string
    readonly failureReason: string
    readonly suggestedImprovement: string
  }): ImprovementProposal {
    const now = new Date().toISOString()
    const proposal: ImprovementProposal = {
      proposalId: `prop_${randomUUID()}`,
      capabilityId: params.capabilityId,
      triggerCommand: params.triggerCommand.slice(0, 512),
      failureReason: params.failureReason.slice(0, 1024),
      suggestedImprovement: params.suggestedImprovement.slice(0, 1024),
      status: 'PROPOSED_AWAITING_HUMAN_REVIEW',
      autoApplied: false,
      modifiedSourceCode: false,
      installedTools: false,
      grantedPermissions: false,
      deployedUpdates: false,
      createdAt: now,
    }

    this.db.exec('BEGIN IMMEDIATE TRANSACTION;')
    try {
      this.db
        .prepare(`
          UPDATE assistant_capabilities
          SET failed_attempts = failed_attempts + 1, updated_at = ?
          WHERE capability_id = ?;
        `)
        .run(now, params.capabilityId)

      this.db
        .prepare(`
          INSERT INTO assistant_improvement_proposals (
            proposal_id, capability_id, trigger_command, failure_reason, suggested_improvement,
            status, auto_applied, modified_source_code, installed_tools, granted_permissions,
            deployed_updates, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, ?);
        `)
        .run(
          proposal.proposalId,
          proposal.capabilityId,
          proposal.triggerCommand,
          proposal.failureReason,
          proposal.suggestedImprovement,
          proposal.status,
          proposal.createdAt
        )
      this.db.exec('COMMIT;')
    } catch (err) {
      this.db.exec('ROLLBACK;')
      throw err
    }

    return proposal
  }

  public recordUserFeedback(params: {
    readonly capabilityId: string
    readonly rating: 'POSITIVE' | 'NEGATIVE'
    readonly comment: string
  }): CapabilityFeedbackItem {
    if (params.rating !== 'POSITIVE' && params.rating !== 'NEGATIVE') {
      throw new Error('Feedback rating must be POSITIVE or NEGATIVE')
    }

    const now = new Date().toISOString()
    const item: CapabilityFeedbackItem = {
      feedbackId: `fb_${randomUUID()}`,
      capabilityId: params.capabilityId,
      rating: params.rating,
      comment: (params.comment || '').trim().slice(0, 1024),
      createdAt: now,
    }

    this.db.exec('BEGIN IMMEDIATE TRANSACTION;')
    try {
      this.db
        .prepare(`
          INSERT INTO assistant_feedback (feedback_id, capability_id, rating, comment, created_at)
          VALUES (?, ?, ?, ?, ?);
        `)
        .run(item.feedbackId, item.capabilityId, item.rating, item.comment, item.createdAt)
      this.db.exec('COMMIT;')
    } catch (err) {
      this.db.exec('ROLLBACK;')
      throw err
    }

    return item
  }

  public listImprovementProposals(): readonly ImprovementProposal[] {
    const rows = this.db
      .prepare('SELECT * FROM assistant_improvement_proposals ORDER BY created_at DESC;')
      .all() as Record<string, unknown>[]
    return rows.map((r) => this.mapProposalRow(r))
  }

  private mapCapabilityRow(row: Record<string, unknown>): AssistantCapabilityRecord {
    const capabilityId = String(row['capability_id'])
    let supportedActions: string[] = []
    let requiredPermissions: string[] = []
    let testCoverage: CapabilityTestCoverage = {
      covered: true,
      suiteName: 'apps/desktop/src/companion-vault.test.ts',
      verifiedAssertionsCount: 1,
    }

    try {
      supportedActions = JSON.parse(String(row['supported_actions_json'] ?? '[]'))
    } catch {}
    try {
      requiredPermissions = JSON.parse(String(row['required_permissions_json'] ?? '[]'))
    } catch {}
    try {
      testCoverage = JSON.parse(String(row['test_coverage_json'] ?? '{}'))
    } catch {}

    const feedbackRows = this.db
      .prepare('SELECT * FROM assistant_feedback WHERE capability_id = ? ORDER BY created_at DESC;')
      .all(capabilityId) as Record<string, unknown>[]

    const proposalRows = this.db
      .prepare('SELECT * FROM assistant_improvement_proposals WHERE capability_id = ? ORDER BY created_at DESC;')
      .all(capabilityId) as Record<string, unknown>[]

    return {
      capabilityId,
      capabilityName: String(row['capability_name']),
      supportedActions,
      requiredPermissions,
      testCoverage,
      failedAttempts: Number(row['failed_attempts'] ?? 0),
      userFeedback: feedbackRows.map((f) => ({
        feedbackId: String(f['feedback_id']),
        capabilityId: String(f['capability_id']),
        rating: f['rating'] === 'NEGATIVE' ? 'NEGATIVE' : 'POSITIVE',
        comment: String(f['comment']),
        createdAt: String(f['created_at']),
      })),
      suggestedImprovements: proposalRows.map((p) => this.mapProposalRow(p)),
      updatedAt: String(row['updated_at']),
    }
  }

  private mapProposalRow(row: Record<string, unknown>): ImprovementProposal {
    return {
      proposalId: String(row['proposal_id']),
      capabilityId: String(row['capability_id']),
      triggerCommand: String(row['trigger_command']),
      failureReason: String(row['failure_reason']),
      suggestedImprovement: String(row['suggested_improvement']),
      status: (row['status'] as ImprovementProposal['status']) || 'PROPOSED_AWAITING_HUMAN_REVIEW',
      autoApplied: false,
      modifiedSourceCode: false,
      installedTools: false,
      grantedPermissions: false,
      deployedUpdates: false,
      createdAt: String(row['created_at']),
    }
  }
}
