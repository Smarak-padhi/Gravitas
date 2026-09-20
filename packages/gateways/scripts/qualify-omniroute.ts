/**
 * Gravitas — OmniRoute Qualification CLI Runner
 *
 * Usage:
 *   npx tsx packages/gateways/scripts/qualify-omniroute.ts [--dry-run] [--url <url>] [--port <port>]
 *
 * Modes:
 *   --dry-run: Deterministic simulation using in-process mock server (CI-safe, marks evidence DRY).
 *   (default): Real qualification against host-installed OmniRoute binary (marks evidence REAL).
 */

import http from 'node:http';
import { spawnSync } from 'node:child_process';
import { OmniRouteQualificationRunner, type ExperimentResult } from '../src/qualification.js';

function findOmniRouteExecutable(): string | null {
  try {
    const isWindows = process.platform === 'win32';
    const cmd = isWindows ? 'where.exe' : 'which';
    const res = spawnSync(cmd, ['omniroute'], { encoding: 'utf8' });
    if (res.status === 0 && res.stdout) {
      const line = res.stdout.trim().split(/\r?\n/)[0];
      return line && line.length > 0 ? line : null;
    }
  } catch {
    // ignore
  }
  return null;
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run') || args.includes('-d');
  const urlArgIdx = args.indexOf('--url');
  const portArgIdx = args.indexOf('--port');

  let baseUrl = urlArgIdx !== -1 && args[urlArgIdx + 1] ? args[urlArgIdx + 1] : undefined;
  let mockServer: http.Server | null = null;
  let realExePath: string | null = null;

  console.log('============================================================');
  console.log('GRAVITAS — OMNIROUTE GATEWAY QUALIFICATION SUITE');
  console.log('Security Profile: wave11.2-isolated');
  console.log(`Mode: ${isDryRun ? 'DRY QUALIFICATION REHEARSAL (CI-Safe / Mock Gateway)' : 'REAL OMNIROUTE QUALIFICATION'}`);
  console.log('============================================================\n');

  if (!isDryRun && !baseUrl) {
    realExePath = findOmniRouteExecutable();
    if (!realExePath) {
      console.error('============================================================');
      console.error('WAVE 11.2 — BLOCKED');
      console.error('reason: REAL_OMNIROUTE_NOT_INSTALLED');
      console.error('No OmniRoute executable was found on host PATH or system.');
      console.error('Operator authorization is required to install external dependencies.');
      console.error('Run "npm run qualify:omniroute:dry" for deterministic rehearsal.');
      console.error('============================================================\n');
      process.exitCode = 2;
      return;
    }
  }

  if (isDryRun || !baseUrl) {
    // Spin up deterministic mock server on a disposable port for dry-run
    const port = portArgIdx !== -1 && args[portArgIdx + 1] ? parseInt(args[portArgIdx + 1], 10) : 20129;
    baseUrl = `http://127.0.0.1:${port}`;

    mockServer = http.createServer((req, res) => {
      const url = new URL(req.url ?? '/', `http://127.0.0.1:${port}`);
      const pathname = url.pathname;

      // Ensure zero-transformation headers are checked
      const compressionHeader = req.headers['x-omniroute-compression'];
      const guardrailsHeader = req.headers['x-omniroute-disabled-guardrails'];

      res.setHeader('x-omniroute-compression', compressionHeader ?? 'off');
      res.setHeader('x-omniroute-disabled-guardrails', guardrailsHeader ?? '*');
      res.setHeader('x-omniroute-provider', 'mock-openai-provider');
      res.setHeader('x-omniroute-model', 'gpt-4o-mini');
      res.setHeader('x-request-id', `req_${Date.now()}`);

      if (pathname === '/api/health') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ status: 'HEALTHY', ok: true }));
        return;
      }

      if (pathname === '/v1/models') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(
          JSON.stringify({
            object: 'list',
            data: [
              { id: 'gpt-4o', object: 'model', owned_by: 'openai', context_window: 128000, available: true },
              { id: 'claude-3-5-sonnet', object: 'model', owned_by: 'anthropic', context_window: 200000, available: true },
            ],
          })
        );
        return;
      }

      if (pathname === '/v1/chat/completions') {
        let bodyStr = '';
        req.on('data', (c) => (bodyStr += c));
        req.on('end', () => {
          let bodyObj: Record<string, unknown> = {};
          try {
            bodyObj = JSON.parse(bodyStr);
          } catch {
            // pass
          }

          if (bodyObj['model'] === 'force-500-model') {
            res.writeHead(500, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ error: { message: 'Internal provider simulated failure', type: 'server_error' } }));
            return;
          }

          if (bodyObj['model'] === 'force-429-quota-model') {
            res.writeHead(429, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ error: { message: 'Rate limit / quota exceeded', type: 'quota_error' } }));
            return;
          }

          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(
            JSON.stringify({
              id: `chatcmpl_${Date.now()}`,
              object: 'chat.completion',
              model: typeof bodyObj['model'] === 'string' ? bodyObj['model'] : 'gpt-4o-mini',
              choices: [
                {
                  index: 0,
                  message: {
                    role: 'assistant',
                    content: 'Gravitas gateway qualification test response.',
                  },
                  finish_reason: 'stop',
                },
              ],
              echo: bodyObj,
            })
          );
        });
        return;
      }

      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: { message: 'Not Found' } }));
    });

    await new Promise<void>((resolve) => {
      mockServer!.listen(port, '127.0.0.1', () => {
        resolve();
      });
    });
  }

  const runner = new OmniRouteQualificationRunner({
    baseUrl: baseUrl!,
    isDryRun,
    qualificationMode: isDryRun ? 'DRY' : 'REAL',
    runtimeExecutable: realExePath ?? undefined,
    evidenceOutputPath: './omniroute-qualification.json',
    onExperimentResult: (res: ExperimentResult) => {
      const mark = res.passed ? '✓' : '✗';
      const statusStr = res.passed ? 'PASS' : 'FAIL';
      console.log(`[${statusStr}] ${mark} [${res.id}] ${res.description} (${res.durationMs}ms)`);
      if (res.error) {
        console.error(`       Error: ${res.error}`);
      }
    },
  });

  console.log(`Starting execution against ${baseUrl}...\n`);
  const summary = await runner.runAll();

  if (mockServer) {
    await new Promise<void>((resolve) => mockServer!.close(() => resolve()));
  }

  console.log('\n============================================================');
  console.log(`QUALIFICATION DECISION: ${summary.decision}`);
  console.log(`Qualification Mode: ${summary.evidence.qualificationMode}`);
  console.log(`Passed: ${summary.evidence.experimentsPassed} / ${summary.evidence.experimentsTotal}`);
  console.log(`Config Integrity Maintained: ${summary.evidence.configIntegrityMaintained}`);
  console.log(`Evidence Saved: ./omniroute-qualification.json`);
  if (summary.evidence.qualificationMode === 'DRY') {
    console.log(`Note: DRY qualification evidence is for rehearsal only and cannot transition gateway to READY in production.`);
  }
  console.log('============================================================\n');

  process.exitCode = summary.decision === 'APPROVED' ? 0 : 1;
}

main().catch((err) => {
  console.error('Fatal qualification runner error:', err);
  process.exitCode = 1;
});
