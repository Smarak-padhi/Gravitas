import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as verifierIndex from './index.js';
import * as verifierModule from './verifier.js';
import { isAuthoritativeK5Receipt } from './verifier.js';
import { K5_AUTHORITY_BRAND } from '@gravitas/core';

describe('GRAVITAS V1-B — K5 Verifier Authority Isolation & Test Helper Removal', () => {
  it('1. Production exports do not contain createAuthoritativeReceiptForTest', () => {
    expect('createAuthoritativeReceiptForTest' in verifierIndex).toBe(false);
    expect((verifierIndex as any).createAuthoritativeReceiptForTest).toBeUndefined();
    expect('createAuthoritativeReceiptForTest' in verifierModule).toBe(false);
    expect((verifierModule as any).createAuthoritativeReceiptForTest).toBeUndefined();
  });

  it('2. Compiled package artifacts in dist do not contain createAuthoritativeReceiptForTest', () => {
    const distDir = path.resolve(__dirname, '../dist');
    if (fs.existsSync(distDir)) {
      const files = fs.readdirSync(distDir);
      for (const file of files) {
        const fullPath = path.join(distDir, file);
        if (fs.statSync(fullPath).isFile() && (file.endsWith('.js') || file.endsWith('.d.ts'))) {
          const content = fs.readFileSync(fullPath, 'utf8');
          expect(content).not.toContain('createAuthoritativeReceiptForTest');
        }
      }
    }
  });

  it('3. In-process forged receipt with Symbol.for is rejected before registration', () => {
    const forgedReceipt = {
      receiptId: 'k5rcpt_forged_brand_symbol_injection',
      planId: 'plan-forged',
      workSessionId: 'ws-test',
      taskId: 'task-test',
      runId: 'run-test',
      attemptNumber: 1,
      verdict: 'VERIFIED_PASS',
      commandsCount: 1,
      passedCommandsCount: 1,
      failedCommandsCount: 0,
      completedAt: new Date().toISOString(),
      issuedAt: new Date().toISOString(),
      superseded: false,
      [K5_AUTHORITY_BRAND]: true,
    };

    expect(isAuthoritativeK5Receipt(forgedReceipt)).toBe(false);
  });
});
