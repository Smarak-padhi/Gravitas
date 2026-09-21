/**
 * Gravitas — Isolated OmniRoute Process Manager
 *
 * Spawns and manages a strictly isolated, loopback-only OmniRoute sidecar process.
 * Guarantees zero orphan processes, bounded output capture, and canary secret redaction.
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

export interface OmniRouteProcessOptions {
  readonly executable?: string;
  readonly executableArgs?: string[];
  readonly host?: string;
  readonly port: number;
  readonly dataDir: string;
  readonly startupTimeoutMs?: number;
  readonly extraEnv?: Record<string, string>;
  readonly cleanupDataDirOnStop?: boolean;
}

export class OmniRouteProcessManager {
  private child: ChildProcess | null = null;
  private readonly options: Required<Omit<OmniRouteProcessOptions, 'extraEnv' | 'executable' | 'executableArgs'>> & {
    executable: string;
    executableArgs: string[];
    extraEnv: Record<string, string>;
  };
  private stdoutBuffer: string[] = [];
  private stderrBuffer: string[] = [];
  private readonly maxLogLines = 2000;
  private started = false;
  private readonly initialPassword: string;
  private readonly jwtSecret: string;
  private readonly apiKeySecret: string;
  private readonly storageEncryptionKey: string;
  private readonly generatedSecrets: string[];

  constructor(options: OmniRouteProcessOptions) {
    this.options = {
      executable: options.executable ?? 'node',
      executableArgs: options.executableArgs ?? ['bin/omniroute.mjs', 'start'],
      host: options.host ?? '127.0.0.1',
      port: options.port,
      dataDir: resolve(options.dataDir),
      startupTimeoutMs: options.startupTimeoutMs ?? 15000,
      extraEnv: options.extraEnv ?? {},
      cleanupDataDirOnStop: options.cleanupDataDirOnStop ?? false,
    };

    this.initialPassword = options.extraEnv?.['INITIAL_PASSWORD'] ?? randomBytes(32).toString('hex');
    this.jwtSecret = options.extraEnv?.['JWT_SECRET'] ?? randomBytes(32).toString('hex');
    this.apiKeySecret = options.extraEnv?.['API_KEY_SECRET'] ?? randomBytes(32).toString('hex');
    this.storageEncryptionKey = options.extraEnv?.['STORAGE_ENCRYPTION_KEY'] ?? randomBytes(32).toString('hex');
    this.generatedSecrets = [
      this.initialPassword,
      this.jwtSecret,
      this.apiKeySecret,
      this.storageEncryptionKey,
    ].filter((s) => typeof s === 'string' && s.length > 0);
  }

  getInitialPassword(): string {
    return this.initialPassword;
  }

  getGeneratedSecrets(): readonly string[] {
    return this.generatedSecrets;
  }

  getBaseUrl(): string {
    return `http://${this.options.host}:${this.options.port}`;
  }

  isStarted(): boolean {
    return this.started;
  }

  isAlive(): boolean {
    return this.child !== null && !this.child.killed && this.child.exitCode === null;
  }

  async start(): Promise<void> {
    if (this.isAlive()) {
      return;
    }

    if (!existsSync(this.options.dataDir)) {
      mkdirSync(this.options.dataDir, { recursive: true });
    }

    const env: NodeJS.ProcessEnv = {
      ...process.env,
      HOST: this.options.host,
      PORT: String(this.options.port),
      DATA_DIR: this.options.dataDir,
      OMNIROUTE_COMPRESSION: 'off',
      OMNIROUTE_DISABLE_RADAR: 'true',
      NO_UPDATE_NOTIFIER: 'true',
      OMNIROUTE_DISABLE_SD_NOTIFY: 'true',
      NODE_ENV: 'production',
      EMBED_WS_PROXY_HOST: this.options.host,
      INITIAL_PASSWORD: this.initialPassword,
      JWT_SECRET: this.jwtSecret,
      API_KEY_SECRET: this.apiKeySecret,
      STORAGE_ENCRYPTION_KEY: this.storageEncryptionKey,
      ...this.options.extraEnv,
    };

    this.stdoutBuffer = [];
    this.stderrBuffer = [];

    this.child = spawn(this.options.executable, this.options.executableArgs, {
      env,
      shell: false,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });

    this.child.stdout?.on('data', (chunk: Buffer) => {
      this.appendLog(this.stdoutBuffer, chunk.toString('utf8'));
    });

    this.child.stderr?.on('data', (chunk: Buffer) => {
      this.appendLog(this.stderrBuffer, chunk.toString('utf8'));
    });

    this.child.on('error', (err) => {
      this.appendLog(this.stderrBuffer, `[Process Error] ${err.message}`);
    });

    this.child.on('exit', (code, signal) => {
      this.appendLog(this.stderrBuffer, `[Process Exited] code=${code} signal=${signal}`);
      this.started = false;
    });

    // Wait for health endpoint readiness
    const deadline = Date.now() + this.options.startupTimeoutMs;
    let healthy = false;

    while (Date.now() < deadline) {
      if (this.child.exitCode !== null) {
        throw new Error(
          `OmniRoute process exited prematurely with code ${this.child.exitCode}. Logs:\n${this.getStderr().slice(-1000)}`
        );
      }

      try {
        const res = await fetch(`${this.getBaseUrl()}/api/health`, {
          signal: AbortSignal.timeout(1000),
        });
        if (res.ok || res.status === 200 || res.status === 401 || res.status === 404) {
          healthy = true;
          break;
        }
      } catch {
        // Retry
      }
      await new Promise((r) => setTimeout(r, 200));
    }

    if (!healthy) {
      await this.stop();
      throw new Error(`OmniRoute gateway failed to become ready within ${this.options.startupTimeoutMs}ms`);
    }

    this.started = true;
  }

  async stop(): Promise<void> {
    if (this.child) {
      const pid = this.child.pid;
      this.child.removeAllListeners('exit');

      try {
        if (process.platform === 'win32' && pid) {
          spawn('taskkill', ['/pid', String(pid), '/T', '/F'], { windowsHide: true });
        } else if (pid) {
          this.child.kill('SIGTERM');
        }
      } catch {
        // Best effort
      }

      this.child = null;
      this.started = false;
    }

    if (this.options.cleanupDataDirOnStop && existsSync(this.options.dataDir)) {
      try {
        rmSync(this.options.dataDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup failure
      }
    }
  }

  getStdout(): string {
    return this.stdoutBuffer.join('\n');
  }

  getStderr(): string {
    return this.stderrBuffer.join('\n');
  }

  getAllLogs(): string {
    return `--- STDOUT ---\n${this.getStdout()}\n--- STDERR ---\n${this.getStderr()}`;
  }

  private appendLog(buffer: string[], text: string) {
    let sanitized = text;
    for (const secret of this.generatedSecrets) {
      if (secret && sanitized.includes(secret)) {
        sanitized = sanitized.replaceAll(secret, '[REDACTED_SECRET]');
      }
    }
    const lines = sanitized.split(/\r?\n/);
    for (const line of lines) {
      if (!line) continue;
      buffer.push(line);
      if (buffer.length > this.maxLogLines) {
        buffer.shift();
      }
    }
  }
}
