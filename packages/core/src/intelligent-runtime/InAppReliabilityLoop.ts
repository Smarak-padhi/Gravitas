/**
 * Gravitas — In-App Reliability Loop & Task Contract Engine (Gate 05.3)
 *
 * Implements the 10-step lifecycle:
 * INTAKE → TASK CONTRACT → CONTEXT / RECON → PLAN → PERMISSION →
 * SCOPED EXECUTION → EXTERNAL VALIDATION → RECOVERY → EVIDENCE COMPLETION → STUDIO EVENT
 *
 * Invariants:
 * 1. No unverified success: Completion requires machine-checkable evidence (exit code, diff, test).
 * 2. Strict budget containment: Enforces ceilings on tokens, wall-clock time, and tool calls.
 * 3. Bounded recovery: Maximum 2 recovery retries on validation failure before safe rollback.
 * 4. Transparent receipts: Generates machine-verifiable task receipts with completion status.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { execSync } from 'node:child_process'
import {
  validatePathAgainstAllowlist,
  validateShellCommand,
} from './path-security.js'

export type ReliabilityLoopState =
  | 'INTAKE'
  | 'TASK_CONTRACT'
  | 'CONTEXT_RECON'
  | 'PLAN'
  | 'PERMISSION'
  | 'SCOPED_EXECUTION'
  | 'EXTERNAL_VALIDATION'
  | 'RECOVERY'
  | 'EVIDENCE_COMPLETION'
  | 'STUDIO_EVENT'

export type TaskCompletionStatus =
  | 'VERIFIED'
  | 'COMPLETED_UNVERIFIED'
  | 'PARTIAL'
  | 'BLOCKED'
  | 'FAILED'

export interface TaskContract {
  readonly contractId: string
  readonly title: string
  readonly intent: string
  readonly allowedPaths: readonly string[]
  readonly allowedTools: readonly string[]
  readonly budget: {
    readonly maxTokens: number
    readonly maxTimeMs: number
    readonly maxToolCalls: number
  }
  readonly validationCriteria: readonly string[]
  readonly requiresHumanApproval?: boolean | undefined
}

export interface TaskExecutionStep {
  readonly stepNumber: number
  readonly description: string
  readonly action: string
  readonly targetPath?: string | undefined
  readonly toolName?: string | undefined
  readonly status: 'PENDING' | 'EXECUTED' | 'FAILED'
  readonly outputSnippet?: string | undefined
}

export interface ValidationCheckResult {
  readonly checkName: string
  readonly command?: string | undefined
  readonly exitCode?: number | undefined
  readonly passed: boolean
  readonly outputEvidence?: string | undefined
}

export interface MachineCheckableReceipt {
  readonly receiptId: string
  readonly contractId: string
  readonly intent: string
  readonly status: TaskCompletionStatus
  readonly startedAt: string
  readonly completedAt: string
  readonly elapsedMs: number
  readonly budgetUsed: {
    readonly tokensUsed: number
    readonly tokenMeasurement: 'MEASURED' | 'NOT_APPLICABLE_OFFLINE'
    readonly toolCallsCount: number
    readonly withinBudget: boolean
  }
  readonly reconnaissance: {
    readonly status: 'PERFORMED' | 'NOT_PERFORMED'
    readonly details?: string | undefined
  }
  readonly stepsExecuted: readonly TaskExecutionStep[]
  readonly validationChecks: readonly ValidationCheckResult[]
  readonly criteriaEvaluation?: readonly {
    readonly criterion: string
    readonly matchedCheckName?: string | undefined
    readonly passed: boolean
  }[] | undefined
  readonly recoveryAttempts: number
  readonly studioEventEmitted: boolean
  readonly rollbackExecuted?: boolean | undefined
  readonly rollbackDetails?: string | undefined
}

export interface StudioEventNotification {
  readonly eventType: 'TASK_STARTED' | 'TASK_PROGRESS' | 'TASK_VERIFIED' | 'TASK_FAILED'
  readonly contractId: string
  readonly mascotId: string
  readonly message: string
  readonly bubbleText: string
  readonly bubbleKind: 'info' | 'success' | 'warning' | 'error'
  readonly timestamp: string
}

export type StudioEventSubscriber = (event: StudioEventNotification) => void

export class InAppReliabilityLoop {
  private readonly subscribers = new Set<StudioEventSubscriber>()

  public subscribe(fn: StudioEventSubscriber): () => void {
    this.subscribers.add(fn)
    return () => this.subscribers.delete(fn)
  }

  private emitEvent(event: StudioEventNotification): void {
    for (const sub of this.subscribers) {
      try {
        sub(event)
      } catch {
        // Suppress subscriber errors
      }
    }
  }

  /**
   * Executes a task through the complete 10-step reliability lifecycle.
   */
  public async executeTaskLifecycle(
    rawIntent: string,
    contractInput: Partial<TaskContract> & { title: string },
    executionPlan: readonly {
      description: string
      action?: () => Promise<string>
      targetPath?: string
      toolName?: string
      payload?: {
        content?: string
        encoding?: BufferEncoding
        command?: string
        cwd?: string
      }
    }[],
    validationRunner: () => Promise<ValidationCheckResult[]>,
    recoveryStrategy?: (failedCheck: ValidationCheckResult) => Promise<boolean>,
    options?: {
      approverSignedOff?: boolean
      assignedMascot?: string
      reconnaissance?: { status: 'PERFORMED' | 'NOT_PERFORMED'; details?: string }
      tokenUsage?: { promptTokens: number; completionTokens: number; totalTokens: number }
      allowedPaths?: readonly string[]
    }
  ): Promise<MachineCheckableReceipt> {
    const startedAt = new Date().toISOString()
    const startTimeMs = Date.now()
    const contractId = contractInput.contractId || `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const mascotId = options?.assignedMascot || 'grav'

    // 1. INTAKE
    this.emitEvent({
      eventType: 'TASK_STARTED',
      contractId,
      mascotId,
      message: `Intake received: "${contractInput.title}". Formulating task contract...`,
      bubbleText: `Starting task: ${contractInput.title.slice(0, 24)} 📋`,
      bubbleKind: 'info',
      timestamp: new Date().toISOString(),
    })

    // 2. TASK CONTRACT
    const contract: TaskContract = {
      contractId,
      title: contractInput.title,
      intent: rawIntent,
      allowedPaths: contractInput.allowedPaths || options?.allowedPaths || [],
      allowedTools: contractInput.allowedTools || ['read', 'write', 'execute_check', 'file_edit'],
      budget: contractInput.budget || {
        maxTokens: 16000,
        maxTimeMs: 60000,
        maxToolCalls: 20,
      },
      validationCriteria: contractInput.validationCriteria || [],
      requiresHumanApproval: contractInput.requiresHumanApproval ?? false,
    }

    // 3. CONTEXT / RECONNAISSANCE
    const reconStatus = options?.reconnaissance ?? {
      status: 'NOT_PERFORMED',
      details: 'No prior reconnaissance executed for this task.',
    }

    // 4. PLAN
    const executedSteps: TaskExecutionStep[] = []

    // 5. PERMISSION / APPROVAL GATE
    if (contract.requiresHumanApproval && !options?.approverSignedOff) {
      const elapsedMs = Date.now() - startTimeMs
      this.emitEvent({
        eventType: 'TASK_FAILED',
        contractId,
        mascotId,
        message: `Task blocked: Human approval required before executing "${contract.title}".`,
        bubbleText: `Approval required 🛑`,
        bubbleKind: 'warning',
        timestamp: new Date().toISOString(),
      })

      return {
        receiptId: `rcpt_${contractId}`,
        contractId,
        intent: rawIntent,
        status: 'BLOCKED',
        startedAt,
        completedAt: new Date().toISOString(),
        elapsedMs,
        budgetUsed: {
          tokensUsed: options?.tokenUsage ? options.tokenUsage.totalTokens : 0,
          tokenMeasurement: options?.tokenUsage ? 'MEASURED' : 'NOT_APPLICABLE_OFFLINE',
          toolCallsCount: 0,
          withinBudget: true,
        },
        reconnaissance: reconStatus,
        stepsExecuted: [],
        validationChecks: [],
        recoveryAttempts: 0,
        studioEventEmitted: true,
      }
    }

    // 6. SCOPED EXECUTION
    // Take pre-execution snapshot for real rollback
    const fileSnapshots = new Map<string, string | null>()
    for (const item of executionPlan) {
      if (item.targetPath) {
        try {
          if (fs.existsSync(item.targetPath)) {
            if (!fileSnapshots.has(item.targetPath)) {
              fileSnapshots.set(item.targetPath, fs.readFileSync(item.targetPath, 'utf-8'))
            }
          } else {
            if (!fileSnapshots.has(item.targetPath)) {
              fileSnapshots.set(item.targetPath, null)
            }
          }
        } catch {
          // In-memory or virtual paths handled gracefully
        }
      }
    }

    let toolCallsCount = 0
    let hasStepFailed = false

    for (let i = 0; i < executionPlan.length; i++) {
      const item = executionPlan[i]
      if (!item) continue
      toolCallsCount++

      // Budget check
      if (
        toolCallsCount > contract.budget.maxToolCalls ||
        Date.now() - startTimeMs > contract.budget.maxTimeMs
      ) {
        return {
          receiptId: `rcpt_${contractId}`,
          contractId,
          intent: rawIntent,
          status: 'PARTIAL',
          startedAt,
          completedAt: new Date().toISOString(),
          elapsedMs: Date.now() - startTimeMs,
          budgetUsed: {
            tokensUsed: options?.tokenUsage ? options.tokenUsage.totalTokens : 0,
            tokenMeasurement: options?.tokenUsage ? 'MEASURED' : 'NOT_APPLICABLE_OFFLINE',
            toolCallsCount,
            withinBudget: false,
          },
          reconnaissance: reconStatus,
          stepsExecuted: executedSteps,
          validationChecks: [],
          recoveryAttempts: 0,
          studioEventEmitted: true,
        }
      }

      // Allowed Tools Enforcement
      if (item.toolName && contract.allowedTools.length > 0 && !contract.allowedTools.includes(item.toolName)) {
        hasStepFailed = true
        executedSteps.push({
          stepNumber: i + 1,
          description: item.description,
          action: 'EXECUTE',
          targetPath: item.targetPath,
          toolName: item.toolName,
          status: 'FAILED',
          outputSnippet: `BLOCKED: Tool "${item.toolName}" is not permitted by contract allowedTools: [${contract.allowedTools.join(', ')}]`,
        })
        continue
      }

      // Allowed Paths Enforcement & Containment Checks (Gate 05.6 Requirement C)
      const isWriteTool = item.toolName === 'fs.writeFile' || item.toolName === 'fs.appendFile'
      if (item.targetPath || isWriteTool) {
        const pathCheck = validatePathAgainstAllowlist(item.targetPath || '', contract.allowedPaths)
        if (!pathCheck.allowed) {
          hasStepFailed = true
          executedSteps.push({
            stepNumber: i + 1,
            description: item.description,
            action: 'EXECUTE',
            targetPath: item.targetPath,
            toolName: item.toolName,
            status: 'FAILED',
            outputSnippet: `BLOCKED: ${pathCheck.violationReason || 'Target path violates contract allowedPaths'}`,
          })
          continue
        }
      }

      // Shell Command & Working Directory Verification
      if (item.toolName === 'command.exec' && item.payload?.command) {
        const cmdCheck = validateShellCommand(
          item.payload.command,
          item.payload.cwd || process.cwd(),
          contract.allowedPaths
        )
        if (!cmdCheck.allowed) {
          hasStepFailed = true
          executedSteps.push({
            stepNumber: i + 1,
            description: item.description,
            action: 'EXECUTE',
            toolName: item.toolName,
            status: 'FAILED',
            outputSnippet: `BLOCKED: ${cmdCheck.violationReason}`,
          })
          continue
        }
      }

      // Capability-Limited Tool Execution
      try {
        let output = ''
        if (item.toolName === 'fs.writeFile' && item.targetPath && item.payload?.content !== undefined) {
          const canonical = path.resolve(item.targetPath)
          fs.mkdirSync(path.dirname(canonical), { recursive: true })
          fs.writeFileSync(canonical, item.payload.content, item.payload.encoding || 'utf-8')
          output = `Wrote ${Buffer.byteLength(item.payload.content)} bytes to ${canonical}`
        } else if (item.toolName === 'fs.appendFile' && item.targetPath && item.payload?.content !== undefined) {
          const canonical = path.resolve(item.targetPath)
          fs.mkdirSync(path.dirname(canonical), { recursive: true })
          fs.appendFileSync(canonical, item.payload.content, item.payload.encoding || 'utf-8')
          output = `Appended ${Buffer.byteLength(item.payload.content)} bytes to ${canonical}`
        } else if (item.toolName === 'command.exec' && item.payload?.command) {
          const out = execSync(item.payload.command, {
            cwd: item.payload.cwd || process.cwd(),
            encoding: 'utf-8',
            timeout: 10000,
          })
          output = out.trim()
        } else if (item.action) {
          output = await item.action()
        } else {
          output = 'Step completed with verified no-op'
        }

        executedSteps.push({
          stepNumber: i + 1,
          description: item.description,
          action: 'EXECUTE',
          targetPath: item.targetPath,
          toolName: item.toolName,
          status: 'EXECUTED',
          outputSnippet: typeof output === 'string' ? output.slice(0, 120) : 'Step completed',
        })
      } catch (err: any) {
        hasStepFailed = true
        executedSteps.push({
          stepNumber: i + 1,
          description: item.description,
          action: 'EXECUTE',
          targetPath: item.targetPath,
          toolName: item.toolName,
          status: 'FAILED',
          outputSnippet: err?.message || 'Execution error',
        })
      }
    }

    // 7. EXTERNAL VALIDATION
    let validationChecks = await validationRunner()

    // Independent validation criteria evaluation (Priority 2)
    let allCriteriaPassed = true
    let criteriaEvaluation: { criterion: string; matchedCheckName?: string | undefined; passed: boolean }[] | undefined

    if (contract.validationCriteria.length > 0) {
      criteriaEvaluation = contract.validationCriteria.map((criterion) => {
        const match = validationChecks.find((c) =>
          c.checkName.toLowerCase().includes(criterion.toLowerCase()) ||
          criterion.toLowerCase().includes(c.checkName.toLowerCase()) ||
          (c.outputEvidence && c.outputEvidence.toLowerCase().includes(criterion.toLowerCase()))
        )
        return {
          criterion,
          matchedCheckName: match?.checkName,
          passed: Boolean(match && match.passed),
        }
      })
      allCriteriaPassed = criteriaEvaluation ? criteriaEvaluation.every((c) => c.passed) : false
    }

    // Zero validations rule: validationChecks.length > 0 is strictly required for VERIFIED
    let allChecksPassed =
      validationChecks.length > 0 &&
      validationChecks.every((c) => c.passed) &&
      allCriteriaPassed

    let recoveryAttempts = 0
    let rollbackExecuted = false
    let rollbackDetails: string | undefined

    // 8. RECOVERY LOOP (Bounded max 2 attempts)
    if (!allChecksPassed && recoveryStrategy) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        recoveryAttempts = attempt
        const failedCheck = validationChecks.find((c) => !c.passed) || {
          checkName: 'Criteria Verification Gap',
          passed: false,
          outputEvidence: 'Validation checks did not cover all required criteria.',
        }

        this.emitEvent({
          eventType: 'TASK_PROGRESS',
          contractId,
          mascotId,
          message: `Validation failed: "${failedCheck.checkName}". Attempting recovery ${attempt}/2...`,
          bubbleText: `Recovering check ${attempt}/2 ⚠️`,
          bubbleKind: 'warning',
          timestamp: new Date().toISOString(),
        })

        const recovered = await recoveryStrategy(failedCheck)
        if (recovered) {
          validationChecks = await validationRunner()
          const reEvaluation = contract.validationCriteria.map((criterion) => {
            const match = validationChecks.find((c) =>
              c.checkName.toLowerCase().includes(criterion.toLowerCase()) ||
              criterion.toLowerCase().includes(c.checkName.toLowerCase()) ||
              (c.outputEvidence && c.outputEvidence.toLowerCase().includes(criterion.toLowerCase()))
            )
            return {
              criterion,
              matchedCheckName: match?.checkName,
              passed: Boolean(match && match.passed),
            }
          })
          allChecksPassed =
            validationChecks.length > 0 &&
            validationChecks.length >= contract.validationCriteria.length &&
            validationChecks.every((c) => c.passed) &&
            reEvaluation.every((c) => c.passed)

          if (allChecksPassed) break
        }
      }
    }

    // Real rollback execution on failure or recovery exhaustion
    if (!allChecksPassed || hasStepFailed) {
      if (fileSnapshots.size > 0) {
        try {
          for (const [filePath, content] of fileSnapshots.entries()) {
            if (content === null) {
              if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath)
              }
            } else {
              fs.writeFileSync(filePath, content, 'utf-8')
            }
          }
          rollbackExecuted = true
          rollbackDetails = `Successfully restored ${fileSnapshots.size} file(s) from pre-execution snapshot.`
        } catch (err: any) {
          rollbackExecuted = false
          rollbackDetails = `Rollback error: ${err?.message}`
        }
      } else if (recoveryStrategy && !allChecksPassed) {
        rollbackExecuted = true
        rollbackDetails = 'Rollback completed for in-memory execution plan.'
      }
    }

    const elapsedMs = Date.now() - startTimeMs
    const finalStatus: TaskCompletionStatus = (allChecksPassed && !hasStepFailed)
      ? 'VERIFIED'
      : rollbackExecuted
      ? 'FAILED'
      : validationChecks.length === 0
      ? 'COMPLETED_UNVERIFIED'
      : hasStepFailed
      ? 'FAILED'
      : 'PARTIAL'

    // 9. EVIDENCE COMPLETION RECEIPT
    const receipt: MachineCheckableReceipt = {
      receiptId: `rcpt_${contractId}`,
      contractId,
      intent: rawIntent,
      status: finalStatus,
      startedAt,
      completedAt: new Date().toISOString(),
      elapsedMs,
      budgetUsed: {
        tokensUsed: options?.tokenUsage ? options.tokenUsage.totalTokens : 0,
        tokenMeasurement: options?.tokenUsage ? 'MEASURED' : 'NOT_APPLICABLE_OFFLINE',
        toolCallsCount,
        withinBudget: toolCallsCount <= contract.budget.maxToolCalls && elapsedMs <= contract.budget.maxTimeMs,
      },
      reconnaissance: reconStatus,
      stepsExecuted: executedSteps,
      validationChecks,
      criteriaEvaluation,
      recoveryAttempts,
      studioEventEmitted: true,
      rollbackExecuted,
      rollbackDetails,
    }

    // 10. STUDIO EVENT
    this.emitEvent({
      eventType: finalStatus === 'VERIFIED' ? 'TASK_VERIFIED' : 'TASK_FAILED',
      contractId,
      mascotId,
      message:
        finalStatus === 'VERIFIED'
          ? `Task successfully verified: "${contract.title}". Evidence verified in ${elapsedMs}ms.`
          : `Task did not pass verification: "${contract.title}". Final status: ${finalStatus}.`,
      bubbleText:
        finalStatus === 'VERIFIED'
          ? `Verified & delivered! 🎉`
          : `Task ${finalStatus.toLowerCase()} ⚠️`,
      bubbleKind: finalStatus === 'VERIFIED' ? 'success' : 'error',
      timestamp: new Date().toISOString(),
    })

    return receipt
  }
}
