import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { executeGit } from '@gravitas/git';
import {
  executeVerification,
  createVerificationReceipt,
  type VerificationResult,
  type K5VerificationReceipt,
  type VerificationPlan,
} from '@gravitas/verifier';
import type { K5ReceiptLike } from '../models/history.js';

let sharedPassedResult: VerificationResult | null = null;
let sharedFailedResult: VerificationResult | null = null;
let sharedTempDir: string | null = null;
let fixtureInitialized = false;

export async function getSharedTestVerificationResults(): Promise<{
  passedResult: VerificationResult;
  failedResult: VerificationResult;
}> {
  if (sharedPassedResult && sharedFailedResult) {
    return { passedResult: sharedPassedResult, failedResult: sharedFailedResult };
  }

  sharedTempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gravitas-test-fixture-wt-'));
  await executeGit({ cwd: sharedTempDir, args: ['init', '-b', 'main'] });
  await executeGit({ cwd: sharedTempDir, args: ['config', 'user.name', 'Tester'] });
  await executeGit({ cwd: sharedTempDir, args: ['config', 'user.email', 'tester@test.local'] });
  await executeGit({ cwd: sharedTempDir, args: ['commit', '--allow-empty', '-m', 'Initial'] });

  const passPlan: VerificationPlan = {
    id: 'plan-pass-shared',
    commands: [
      {
        id: 'cmd-pass',
        executable: process.execPath,
        args: ['-e', 'process.exit(0)'],
        mandatory: true,
      },
    ],
  };

  const failPlan: VerificationPlan = {
    id: 'plan-fail-shared',
    commands: [
      {
        id: 'cmd-fail',
        executable: process.execPath,
        args: ['-e', 'process.exit(1)'],
        mandatory: true,
      },
    ],
  };

  sharedPassedResult = await executeVerification({ plan: passPlan, worktreePath: sharedTempDir });
  sharedFailedResult = await executeVerification({ plan: failPlan, worktreePath: sharedTempDir });

  return { passedResult: sharedPassedResult, failedResult: sharedFailedResult };
}

export async function initTestReceiptFixture(): Promise<void> {
  if (fixtureInitialized) return;
  const { passedResult, failedResult } = await getSharedTestVerificationResults();
  sharedPassedResult = passedResult;
  sharedFailedResult = failedResult;
  fixtureInitialized = true;
}

export function createTestAuthoritativeReceipt(
  overrides: Partial<K5ReceiptLike> = {}
): K5VerificationReceipt {
  if (!fixtureInitialized || !sharedPassedResult || !sharedFailedResult) {
    throw new Error('Test receipt fixture not initialized. Call initTestReceiptFixture() in beforeAll.');
  }

  const isFail = overrides.verdict === 'VERIFIED_FAIL';
  const result = isFail ? sharedFailedResult : sharedPassedResult;

  const receipt = createVerificationReceipt(result, {
    workSessionId: overrides.workSessionId ?? 'ws-test-001',
    taskId: overrides.taskId ?? 'task-001',
    runId: overrides.runId ?? 'run-001',
    attemptNumber: overrides.attemptNumber ?? 1,
  });

  if (overrides.receiptId) (receipt as any).receiptId = overrides.receiptId;
  if (overrides.planId) (receipt as any).planId = overrides.planId;
  if (overrides.verdict) (receipt as any).verdict = overrides.verdict;
  if (overrides.completedAt) (receipt as any).completedAt = overrides.completedAt;
  if (overrides.issuedAt) (receipt as any).issuedAt = overrides.issuedAt;
  if (overrides.passedCommandsCount !== undefined) (receipt as any).passedCommandsCount = overrides.passedCommandsCount;
  if (overrides.failedCommandsCount !== undefined) (receipt as any).failedCommandsCount = overrides.failedCommandsCount;
  if (overrides.commandsCount !== undefined) (receipt as any).commandsCount = overrides.commandsCount;
  if (overrides.superseded !== undefined) (receipt as any).superseded = overrides.superseded;

  return receipt;
}
