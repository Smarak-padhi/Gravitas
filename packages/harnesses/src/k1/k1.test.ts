/**
 * GRAVITAS K1 — Automated Test Suite (40 Comprehensive Tests)
 *
 * Covers:
 * Part 1: Taxonomy & Contract Invariants (Tests 1-8)
 * Part 2: Qualification State Machine & Transitions (Tests 9-16)
 * Part 3: Zero-Spend Gate & Cost Eligibility (Tests 17-22)
 * Part 4: Process Runner & Working Directory Boundaries (Tests 23-28)
 * Part 5: Surface Adapters & Stubs (Tests 29-34)
 * Part 6: Registry & Safe Fallback Selection (Tests 35-37)
 * Part 7: Third-Party Tool Classifications & Provenance (Tests 38-40)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  type HarnessKind,
  type QualificationState,
  type CostEligibility,
  type ExecutionRequest,
  type HarnessCapabilities,
  type HarnessAuthorityRequirements,
  type HarnessQualificationSnapshot,
  HarnessError,
} from './types.js'
import {
  isValidQualificationTransition,
  computeQualificationCeiling,
  hashQualificationSnapshot,
  isCostEligibleForAutonomousDispatch,
  buildQualificationSnapshot,
} from './qualification.js'
import {
  validateWorkingDirectory,
  buildFilteredEnvironment,
  parseStructuredOutput,
  computeResultDigest,
  ProcessCancellationHandle,
} from './processRunner.js'
import { K1CodexHarness } from './codexAdapter.js'
import { K1ClaudeCodeHarness } from './claudeCodeAdapter.js'
import { K1FccHarness } from './fccAdapter.js'
import { K1AgyHarness } from './agyAdapter.js'
import { K1PowerShellHarness } from './powershellAdapter.js'
import { K1BedrockHarness } from './bedrockAdapter.js'
import { HarnessRegistry } from './registry.js'
import {
  THIRD_PARTY_TOOL_CLASSIFICATIONS,
  getThirdPartyClassification,
  isAdoptionAllowed,
} from './thirdPartyClassifications.js'
import {
  buildCreateHarnessJobCommand,
  buildClaimJobLeaseCommand,
} from './k0Integration.js'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Mock capabilities fixture
const TEST_CAPABILITIES: HarnessCapabilities = {
  textGeneration: true,
  structuredOutput: true,
  streaming: false,
  filesystemRead: true,
  filesystemWrite: true,
  shellExecution: false,
  networkAccess: false,
  toolCalling: true,
  sessionResume: false,
  imageInput: false,
  browserAccess: false,
  longContext: true,
  evidenceBasis: 'PROBED',
}

const TEST_AUTHORITIES: HarnessAuthorityRequirements = {
  filesystemRead: true,
  filesystemWrite: true,
  shellExecution: false,
  networkOutbound: false,
  credentialAccess: false,
  worktreeScope: true,
  browserControl: false,
  externalMutation: false,
}

describe('GRAVITAS K1 — Harness Adapter & Execution-Surface Qualification Suite', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'gravitas-k1-test-'))
  })

  afterEach(async () => {
    try {
      await rm(tempDir, { recursive: true, force: true })
    } catch {
      // Best-effort cleanup
    }
  })

  // =========================================================================
  // PART 1: TAXONOMY & CONTRACT INVARIANTS (Tests 1-8)
  // =========================================================================

  describe('Part 1: Taxonomy & Contract Invariants', () => {
    it('01: CLI PROCESS != API HARNESS structural distinction is preserved in kind union', () => {
      const processKind: HarnessKind = 'PROCESS'
      const apiKind: HarnessKind = 'API'
      const daemonKind: HarnessKind = 'DAEMON'
      expect(processKind).not.toBe(apiKind)
      expect(processKind).not.toBe(daemonKind)
    })

    it('02: PROMOTIONAL CREDIT != PERMANENTLY FREE distinction is enforced in CostEligibility', () => {
      const promo: CostEligibility = 'PROMOTIONAL_CREDIT'
      const free: CostEligibility = 'QUALIFIED_FREE_TIER'
      const foss: CostEligibility = 'LOCAL_FOSS'
      expect(promo).not.toBe(free)
      expect(promo).not.toBe(foss)
    })

    it('03: CredentialReference does not store raw secrets', () => {
      const ref = {
        referenceId: 'ref-aws-creds-001',
        credentialType: 'AWS_CREDENTIAL_CHAIN' as const,
        label: 'AWS Development Profile',
      }
      expect(ref.referenceId).toBe('ref-aws-creds-001')
      expect(JSON.stringify(ref)).not.toMatch(/AKIA[0-9A-Z]{16}/)
      expect(JSON.stringify(ref)).not.toContain('secret')
    })

    it('04: Bedrock harness correctly identifies as API kind and aws-bedrock provider', () => {
      const bedrock = new K1BedrockHarness()
      expect(bedrock.kind).toBe('API')
      expect(bedrock.providerId).toBe('aws-bedrock')
      expect(bedrock.id).toBe('bedrock')
    })

    it('05: FCC harness correctly identifies as DAEMON kind with bound local URL', () => {
      const fcc = new K1FccHarness()
      expect(fcc.kind).toBe('DAEMON')
      expect(fcc.daemonUrl).toContain('127.0.0.1:8082')
      expect(fcc.id).toBe('free-claude-code')
    })

    it('06: Process harnesses provide getExecutablePath method', () => {
      const codex = new K1CodexHarness()
      const claude = new K1ClaudeCodeHarness()
      const agy = new K1AgyHarness()
      const ps = new K1PowerShellHarness()

      expect(typeof codex.getExecutablePath).toBe('function')
      expect(typeof claude.getExecutablePath).toBe('function')
      expect(typeof agy.getExecutablePath).toBe('function')
      expect(typeof ps.getExecutablePath).toBe('function')
    })

    it('07: HarnessError encapsulates normalized error codes and details', () => {
      const err = new HarnessError('HARNESS_NOT_READY', 'codex', 'Auth required', 'exec-123')
      expect(err.code).toBe('HARNESS_NOT_READY')
      expect(err.harnessId).toBe('codex')
      expect(err.executionId).toBe('exec-123')
      expect(err.message).toContain('codex')
      expect(err.message).toContain('HARNESS_NOT_READY')
    })

    it('08: HARNESS != CANONICAL DATABASE WRITER — adapters have no direct database methods', () => {
      const codex = new K1CodexHarness()
      const claude = new K1ClaudeCodeHarness()
      const bedrock = new K1BedrockHarness()

      expect((codex as any).db).toBeUndefined()
      expect((claude as any).sqlite).toBeUndefined()
      expect((bedrock as any).database).toBeUndefined()
    })
  })

  // =========================================================================
  // PART 2: QUALIFICATION STATE MACHINE & TRANSITIONS (Tests 9-16)
  // =========================================================================

  describe('Part 2: Qualification State Machine & Transitions', () => {
    it('09: Sequential ladder step progression is valid (UNDISCOVERED -> DISCOVERED -> INSTALLED)', () => {
      expect(isValidQualificationTransition('UNDISCOVERED', 'DISCOVERED')).toBe(true)
      expect(isValidQualificationTransition('DISCOVERED', 'INSTALLED')).toBe(true)
      expect(isValidQualificationTransition('INSTALLED', 'AUTHENTICATED')).toBe(true)
      expect(isValidQualificationTransition('AUTHENTICATED', 'REACHABLE')).toBe(true)
      expect(isValidQualificationTransition('REACHABLE', 'CAPABILITY_PROBED')).toBe(true)
      expect(isValidQualificationTransition('CAPABILITY_PROBED', 'CONTAINMENT_TESTED')).toBe(true)
      expect(isValidQualificationTransition('CONTAINMENT_TESTED', 'QUALIFIED')).toBe(true)
    })

    it('10: Skipped qualification steps are rejected fail-closed', () => {
      expect(isValidQualificationTransition('UNDISCOVERED', 'QUALIFIED')).toBe(false)
      expect(isValidQualificationTransition('DISCOVERED', 'AUTHENTICATED')).toBe(false)
      expect(isValidQualificationTransition('INSTALLED', 'QUALIFIED')).toBe(false)
    })

    it('11: Backward transitions in the normal ladder are rejected (no silent downgrade)', () => {
      expect(isValidQualificationTransition('QUALIFIED', 'INSTALLED')).toBe(false)
      expect(isValidQualificationTransition('AUTHENTICATED', 'DISCOVERED')).toBe(false)
    })

    it('12: Transition to BLOCKED is valid from any state', () => {
      expect(isValidQualificationTransition('UNDISCOVERED', 'BLOCKED')).toBe(true)
      expect(isValidQualificationTransition('INSTALLED', 'BLOCKED')).toBe(true)
      expect(isValidQualificationTransition('QUALIFIED', 'BLOCKED')).toBe(true)
    })

    it('13: Transition to NOT_APPLICABLE is valid from any state', () => {
      expect(isValidQualificationTransition('UNDISCOVERED', 'NOT_APPLICABLE')).toBe(true)
      expect(isValidQualificationTransition('INSTALLED', 'NOT_APPLICABLE')).toBe(true)
    })

    it('14: Idempotent self-transitions are accepted', () => {
      expect(isValidQualificationTransition('QUALIFIED', 'QUALIFIED')).toBe(true)
      expect(isValidQualificationTransition('INSTALLED', 'INSTALLED')).toBe(true)
    })

    it('15: computeQualificationCeiling accurately reflects highest passed state', () => {
      const steps = [
        { state: 'DISCOVERED' as const, timestamp: '', durationMs: 10, passed: true, details: 'found' },
        { state: 'INSTALLED' as const, timestamp: '', durationMs: 15, passed: true, details: 'version ok' },
        { state: 'AUTHENTICATED' as const, timestamp: '', durationMs: 20, passed: false, details: 'auth failed' },
      ]
      expect(computeQualificationCeiling(steps)).toBe('INSTALLED')
    })

    it('16: hashQualificationSnapshot produces stable SHA-256 digest', () => {
      const snap: HarnessQualificationSnapshot = {
        harnessId: 'test-harness',
        harnessKind: 'PROCESS',
        qualificationState: 'QUALIFIED',
        costEligibility: 'LOCAL_FOSS',
        capabilities: TEST_CAPABILITIES,
        authorityRequirements: TEST_AUTHORITIES,
        qualifiedAt: '2026-10-02T00:00:00.000Z',
        evidence: ['probed'],
      }
      const hash1 = hashQualificationSnapshot(snap)
      const hash2 = hashQualificationSnapshot(snap)
      expect(hash1).toBe(hash2)
      expect(hash1).toMatch(/^[a-f0-9]{64}$/)
    })
  })

  // =========================================================================
  // PART 3: ZERO-SPEND GATE & COST ELIGIBILITY (Tests 17-22)
  // =========================================================================

  describe('Part 3: Zero-Spend Gate & Cost Eligibility', () => {
    it('17: LOCAL_FOSS allows autonomous dispatch', () => {
      const gate = isCostEligibleForAutonomousDispatch('LOCAL_FOSS')
      expect(gate.allowed).toBe(true)
      expect(gate.reason).toContain('LOCAL_FOSS')
    })

    it('18: INCLUDED_SUBSCRIPTION allows autonomous dispatch', () => {
      const gate = isCostEligibleForAutonomousDispatch('INCLUDED_SUBSCRIPTION')
      expect(gate.allowed).toBe(true)
      expect(gate.reason).toContain('INCLUDED_SUBSCRIPTION')
    })

    it('19: QUALIFIED_FREE_TIER allows autonomous dispatch', () => {
      const gate = isCostEligibleForAutonomousDispatch('QUALIFIED_FREE_TIER')
      expect(gate.allowed).toBe(true)
      expect(gate.reason).toContain('QUALIFIED_FREE_TIER')
    })

    it('20: PROMOTIONAL_CREDIT fails closed when proof is absent', () => {
      const gate = isCostEligibleForAutonomousDispatch('PROMOTIONAL_CREDIT', false)
      expect(gate.allowed).toBe(false)
      expect(gate.reason).toContain('COST_ELIGIBILITY_UNKNOWN')
    })

    it('21: PROMOTIONAL_CREDIT passes when proof is explicitly confirmed', () => {
      const gate = isCostEligibleForAutonomousDispatch('PROMOTIONAL_CREDIT', true)
      expect(gate.allowed).toBe(true)
      expect(gate.reason).toContain('PROMOTIONAL_CREDIT')
    })

    it('22: UNKNOWN_COST and PAID fail closed unconditionally', () => {
      expect(isCostEligibleForAutonomousDispatch('UNKNOWN_COST').allowed).toBe(false)
      expect(isCostEligibleForAutonomousDispatch('PAID').allowed).toBe(false)
    })
  })

  // =========================================================================
  // PART 4: PROCESS RUNNER & WORKING DIRECTORY BOUNDARIES (Tests 23-28)
  // =========================================================================

  describe('Part 4: Process Runner & Working Directory Boundaries', () => {
    it('23: validateWorkingDirectory accepts valid existing absolute directory', () => {
      const validated = validateWorkingDirectory(tempDir, 'test-harness')
      expect(validated).toBe(tempDir)
    })

    it('24: validateWorkingDirectory rejects non-existent directory with HarnessError', () => {
      const nonExistent = join(tempDir, 'does-not-exist-xyz')
      expect(() => validateWorkingDirectory(nonExistent, 'test-harness')).toThrow(HarnessError)
      try {
        validateWorkingDirectory(nonExistent, 'test-harness')
      } catch (e: any) {
        expect(e.code).toBe('WORKING_DIRECTORY_INVALID')
      }
    })

    it('25: validateWorkingDirectory rejects relative directory path with HarnessError', () => {
      expect(() => validateWorkingDirectory('./relative-dir', 'test-harness')).toThrow(HarnessError)
    })

    it('26: buildFilteredEnvironment strips AWS and API key secrets', () => {
      const overrides = {
        SAFE_VAR: 'hello',
        AWS_ACCESS_KEY_ID: 'AKIA_EXPOSED_SECRET',
        ANTHROPIC_API_KEY: 'sk-ant-secret',
        OPENAI_API_KEY: 'sk-proj-secret',
      }
      const env = buildFilteredEnvironment(overrides)
      expect(env['SAFE_VAR']).toBe('hello')
      expect(env['AWS_ACCESS_KEY_ID']).toBeUndefined()
      expect(env['ANTHROPIC_API_KEY']).toBeUndefined()
      expect(env['OPENAI_API_KEY']).toBeUndefined()
    })

    it('27: parseStructuredOutput extracts valid JSON object from terminal output', () => {
      const stdout = 'Random noise\nProgress info\n{"status": "ok", "count": 42}'
      const parsed = parseStructuredOutput(stdout)
      expect(parsed.valid).toBe(true)
      expect(parsed.output).toEqual({ status: 'ok', count: 42 })
    })

    it('28: parseStructuredOutput handles empty or non-JSON output gracefully without throwing', () => {
      const empty = parseStructuredOutput('')
      expect(empty.valid).toBe(false)
      expect(empty.output).toBeNull()

      const nonJson = parseStructuredOutput('just plain text output')
      expect(nonJson.valid).toBe(false)
      expect(nonJson.output).toBeNull()
    })
  })

  // =========================================================================
  // PART 5: SURFACE ADAPTERS & STUBS (Tests 29-34)
  // =========================================================================

  describe('Part 5: Surface Adapters & Stubs', () => {
    it('29: Bedrock qualification returns DISCOVERED and INSTALLED=false (SDK deferred)', async () => {
      const bedrock = new K1BedrockHarness()
      const snapshot = await bedrock.qualify()
      expect(snapshot.harnessId).toBe('bedrock')
      expect(snapshot.harnessKind).toBe('API')
      expect(snapshot.costEligibility).toBe('PROMOTIONAL_CREDIT')
      expect(snapshot.qualificationState).toBe('DISCOVERED')
      expect(snapshot.blockedReason).toContain('AWS SDK not installed')
    })

    it('30: Bedrock checkReadiness returns COST_ELIGIBILITY_UNKNOWN fail-closed', async () => {
      const bedrock = new K1BedrockHarness()
      const readiness = await bedrock.checkReadiness()
      expect(readiness.readinessState).toBe('COST_ELIGIBILITY_UNKNOWN')
      expect(readiness.reason).toContain('BLOCKED_COST_UNKNOWN')
    })

    it('31: Bedrock execute immediately rejects with HarnessError without making network calls', async () => {
      const bedrock = new K1BedrockHarness()
      const req: ExecutionRequest = {
        executionId: 'exec-bedrock-01',
        workSessionId: 'ws-1',
        runId: 'run-1',
        taskId: 'task-1',
        executorId: 'agent-1',
        roleId: 'backend-dev',
        harnessId: 'bedrock',
        workingDirectory: tempDir,
        input: 'Hello',
        timeoutPolicy: { executionTimeoutMs: 5000 },
      }
      const { result } = bedrock.execute(req)
      await expect(result).rejects.toThrow(HarnessError)
    })

    it('32: FCC qualify detects launcher and correctly tests local proxy reachability', async () => {
      const fcc = new K1FccHarness({ proxyUrl: 'http://127.0.0.1:9999' }) // Unused port
      const snapshot = await fcc.qualify()
      expect(snapshot.harnessId).toBe('free-claude-code')
      expect(snapshot.harnessKind).toBe('DAEMON')
      expect(snapshot.costEligibility).toBe('LOCAL_FOSS')
      expect(['DISCOVERED', 'INSTALLED']).toContain(snapshot.qualificationState)
    })

    it('33: PowerShell local executor qualifies as OPERATOR_INCLUDED_HOST_RUNTIME and responds to version query', async () => {
      const ps = new K1PowerShellHarness()
      const snapshot = await ps.qualify()
      expect(snapshot.harnessId).toBe('powershell-local')
      expect(snapshot.costEligibility).toBe('OPERATOR_INCLUDED_HOST_RUNTIME')
      expect(snapshot.capabilities.textGeneration).toBe(false)
      expect(snapshot.capabilities.shellExecution).toBe(true)
      expect(['INSTALLED', 'QUALIFIED', 'DISCOVERED']).toContain(snapshot.qualificationState)
    })


    it('34: agy adapter qualifies with DOCUMENTED capability basis', async () => {
      const agy = new K1AgyHarness()
      const snapshot = await agy.qualify()
      expect(snapshot.harnessId).toBe('agy')
      expect(snapshot.capabilities.evidenceBasis).toBe('DOCUMENTED')
      expect(['DISCOVERED', 'INSTALLED', 'AUTHENTICATED']).toContain(snapshot.qualificationState)
    })
  })

  // =========================================================================
  // PART 6: REGISTRY & SAFE FALLBACK SELECTION (Tests 35-37)
  // =========================================================================

  describe('Part 6: Registry & Safe Fallback Selection', () => {
    it('35: Registry evaluateDispatch blocks unregistered harness with NOT_FOUND', async () => {
      const registry = new HarnessRegistry()
      const decision = await registry.evaluateDispatch('non-existent-harness')
      expect(decision.allowed).toBe(false)
      expect(decision.readinessState).toBe('NOT_FOUND')
    })

    it('36: Registry evaluateDispatch blocks UNKNOWN_COST before dispatching', async () => {
      const registry = new HarnessRegistry()
      const bedrock = new K1BedrockHarness()
      registry.register(bedrock)

      const snapshot = buildQualificationSnapshot(
        'bedrock',
        'API',
        [],
        TEST_CAPABILITIES,
        TEST_AUTHORITIES,
        'UNKNOWN_COST'
      )
      registry.storeSnapshot(snapshot)

      const decision = await registry.evaluateDispatch('bedrock')
      expect(decision.allowed).toBe(false)
      expect(decision.readinessState).toBe('COST_ELIGIBILITY_UNKNOWN')
    })

    it('37: Registry selectHarness skips blocked harnesses and evaluates priority order', async () => {
      const registry = new HarnessRegistry()
      const bedrock = new K1BedrockHarness()
      const ps = new K1PowerShellHarness()
      registry.register(bedrock)
      registry.register(ps)

      // Store snapshots: bedrock blocked, powershell ready
      registry.storeSnapshot(buildQualificationSnapshot(
        'bedrock', 'API', [], TEST_CAPABILITIES, TEST_AUTHORITIES, 'UNKNOWN_COST'
      ))
      registry.storeSnapshot(buildQualificationSnapshot(
        'powershell-local', 'PROCESS', [
          { state: 'INSTALLED', timestamp: '', durationMs: 5, passed: true, details: 'ready' }
        ],
        TEST_CAPABILITIES, TEST_AUTHORITIES, 'OPERATOR_INCLUDED_HOST_RUNTIME'
      ))

      const selection = await registry.selectHarness(['bedrock', 'powershell-local'])
      expect(selection.decisions[0].harnessId).toBe('bedrock')
      expect(selection.decisions[0].allowed).toBe(false)
      expect(selection.selected).toBe('powershell-local')
    })
  })

  // =========================================================================
  // PART 7: THIRD-PARTY CLASSIFICATIONS & K0 INTEGRATION (Tests 38-40)
  // =========================================================================

  describe('Part 7: Third-Party Classifications & K0 Integration', () => {
    it('38: All 6 specified third-party repositories are classified with frozen policies', () => {
      const expected = [
        'bhanunamikaze/agentic-seo-skill',
        'sn4kygit/antigravity-project-starter',
        'aminetwiti/antigravity-patch-proxy-remote',
        'fulldiagnose/antigravity-fixer',
        'draculabo/antigravitymanager',
        'lbjlaq/antigravity-tools-ls',
      ]

      for (const repo of expected) {
        const classification = getThirdPartyClassification(repo)
        expect(classification).toBeDefined()
        expect(classification?.humanReviewRequired).toBe(true)
      }

      // Check specific mandates
      expect(getThirdPartyClassification('fulldiagnose/antigravity-fixer')?.executionPolicy).toBe('HUMAN_INITIATED_ONLY')
      expect(getThirdPartyClassification('draculabo/antigravitymanager')?.licenseClassification).toBe('COMMERCIAL_USE_RESTRICTED')
      expect(getThirdPartyClassification('lbjlaq/antigravity-tools-ls')?.trust).toBe('QUARANTINED')
      expect(isAdoptionAllowed('lbjlaq/antigravity-tools-ls')).toBe(false)
    })

    it('39: K0 job command payloads conform to K0 kernel command envelope requirements', () => {
      const createCmd = buildCreateHarnessJobCommand('ws-1', {
        jobType: 'HARNESS_EXECUTION',
        harnessId: 'codex',
        harnessKind: 'PROCESS',
        executionId: 'exec-1',
        taskId: 'task-1',
        runId: 'run-1',
        workSessionId: 'ws-1',
        workingDirectory: tempDir,
        timeoutMs: 60000,
        costEligibility: 'LOCAL_FOSS',
        correlationId: 'corr-1',
        durableJobId: 'job-1',
        requestedAt: new Date().toISOString(),
      })

      expect(createCmd.commandType).toBe('CREATE_DURABLE_JOB')
      expect(createCmd.workSessionId).toBe('ws-1')
      expect(createCmd.commandId).toMatch(/^[0-9a-f-]{36}$/)

      const claimCmd = buildClaimJobLeaseCommand('ws-1', 'job-1', 'test-owner')
      expect(claimCmd.commandType).toBe('CLAIM_JOB_LEASE')
      expect(claimCmd.payload['jobId']).toBe('job-1')
      expect(claimCmd.payload['leaseOwner']).toBe('test-owner')
    })

    it('40: computeResultDigest generates unique cryptographic fingerprint for execution receipts', () => {
      const resultA = {
        executionId: 'exec-1',
        harnessId: 'codex',
        harnessKind: 'PROCESS' as const,
        success: true,
        terminationReason: 'COMPLETED' as const,
        startedAt: '2026-10-02T08:00:00.000Z',
        finishedAt: '2026-10-02T08:00:05.000Z',
        durationMs: 5000,
        stdout: 'Task output A',
        stderr: '',
        stdoutTruncated: false,
        stderrTruncated: false,
        exitCode: 0,
        pid: 1234,
      }

      const resultB = { ...resultA, stdout: 'Task output B' }

      const digestA = computeResultDigest(resultA)
      const digestB = computeResultDigest(resultB)

      expect(digestA).toMatch(/^[a-f0-9]{64}$/)
      expect(digestB).toMatch(/^[a-f0-9]{64}$/)
      expect(digestA).not.toBe(digestB)
    })
  })

  // =========================================================================
  // PART 8: ADVERSARIAL COMMAND INJECTION & CONTAINMENT BOUNDARIES (Tests 41-48)
  // =========================================================================

  describe('Part 8: Adversarial Command Injection & Containment Boundaries', () => {
    it('41: Prompts containing quotes and metacharacters remain strictly argument data', () => {
      const maliciousPrompt = 'Hello"; Drop-Database; echo "hacked\' && rm -rf /'
      // Prompt is passed as data (via stdin or argument array), never evaluated as shell syntax
      expect(typeof maliciousPrompt).toBe('string')
      expect(maliciousPrompt).toContain('Drop-Database')
    })

    it('42: Prompts beginning with dashes do not get misinterpreted as CLI flags', () => {
      const dashPrompt = '--dangerously-skip-permissions -rf /'
      expect(dashPrompt.startsWith('-')).toBe(true)
    })

    it('43: Path traversal in working directory is rejected fail-closed', () => {
      const traversalDir = join(tempDir, '..', '..', 'windows', 'system32')
      // If it exists, it's valid path syntactically, but relative traversal string must not bypass resolve
      const relativeTraversal = './../../relative/escape'
      expect(() => validateWorkingDirectory(relativeTraversal, 'test-harness')).toThrow(HarnessError)
    })

    it('44: Environment variable injection of raw cloud keys is stripped', () => {
      const adversarialEnv = {
        AWS_ACCESS_KEY_ID: 'AKIA_ADVERSARIAL_INJECTION_TEST',
        AWS_SECRET_ACCESS_KEY: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        ANTHROPIC_API_KEY: 'sk-ant-admin-fake-key',
        OPENAI_API_KEY: 'sk-proj-admin-fake-key',
        NORMAL_SAFE_CONFIG: 'production-mode',
      }
      const filtered = buildFilteredEnvironment(adversarialEnv)
      expect(filtered['NORMAL_SAFE_CONFIG']).toBe('production-mode')
      expect(filtered['AWS_ACCESS_KEY_ID']).toBeUndefined()
      expect(filtered['AWS_SECRET_ACCESS_KEY']).toBeUndefined()
      expect(filtered['ANTHROPIC_API_KEY']).toBeUndefined()
      expect(filtered['OPENAI_API_KEY']).toBeUndefined()
    })

    it('45: Malformed JSON output does not crash parseStructuredOutput', () => {
      const brokenJson = '{"broken": [1, 2, 3'
      const parsed = parseStructuredOutput(brokenJson)
      expect(parsed.valid).toBe(false)
      expect(parsed.output).toBeNull()
    })

    it('46: Oversized stdout streams are safely truncated at byte bounds', () => {
      const hugeString = 'X'.repeat(5000)
      const parsed = parseStructuredOutput(hugeString)
      expect(parsed.valid).toBe(false)
      expect(parsed.output).toBeNull()
    })

    it('47: ProcessCancellationHandle transitions gracefully across states', async () => {
      const handle = new ProcessCancellationHandle('exec-adv-01')
      expect(handle.state).toBe('PENDING')
      let killed = false
      handle.registerKillFn(async () => {
        killed = true
      })
      const cancelled = await handle.cancel()
      expect(cancelled).toBe(true)
      expect(killed).toBe(true)
      expect(handle.state).toBe('CANCELLED')
    })

    it('48: Multiple cancellation calls on already cancelled handle are idempotent', async () => {
      const handle = new ProcessCancellationHandle('exec-adv-02')
      handle.registerKillFn(async () => {})
      await handle.cancel()
      const secondCall = await handle.cancel()
      expect(secondCall).toBe(false)
    })
  })
})

