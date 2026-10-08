import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as os from 'node:os'
import * as fs from 'node:fs'
import * as path from 'node:path'
import {
  loadGravitasConfig,
  saveGravitasConfig,
  readGravitasConfig,
  writeGravitasConfig,
  getDefaultGravitasConfig,
} from './config.js'

describe('GRAVITAS Config & Onboarding Persistence (Wave V1-C)', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gravitas-config-test-'))
  })

  afterEach(() => {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true })
      }
    } catch {
      // Ignore cleanup error
    }
  })

  it('returns default configuration if config file does not exist', () => {
    const configPath = path.join(tempDir, 'non-existent.json')
    const { config, wasCorrupt } = loadGravitasConfig(configPath)

    expect(wasCorrupt).toBe(false)
    expect(config.version).toBe(1)
    expect(config.onboarding.completed).toBe(false)
    expect(config.onboarding.operatingMode).toBe('DETERMINISTIC_ONLY')
    expect(config.onboarding.providerConfigured).toBe(false)
  })

  it('atomically saves configuration to disk and reloads cleanly', () => {
    const configPath = path.join(tempDir, 'config.json')
    const initial = getDefaultGravitasConfig()

    saveGravitasConfig(configPath, initial)
    expect(fs.existsSync(configPath)).toBe(true)

    // No temp files left behind
    const files = fs.readdirSync(tempDir)
    expect(files.filter((f) => f.startsWith('.config-tmp-')).length).toBe(0)

    const { config, wasCorrupt } = loadGravitasConfig(configPath)
    expect(wasCorrupt).toBe(false)
    expect(config.version).toBe(1)
    expect(config.onboarding.completed).toBe(false)
  })

  it('backs up corrupted config file to .corrupt-<timestamp> and returns default without data destruction', () => {
    const configPath = path.join(tempDir, 'config.json')
    fs.writeFileSync(configPath, '{ malformed json: not valid at all', 'utf8')

    const { config, wasCorrupt } = loadGravitasConfig(configPath)
    expect(wasCorrupt).toBe(true)
    expect(config.version).toBe(1)
    expect(config.onboarding.completed).toBe(false)

    // Verify .corrupt backup was created
    const files = fs.readdirSync(tempDir)
    const backup = files.find((f) => f.includes('config.json.corrupt-'))
    expect(backup).toBeDefined()
    expect(fs.readFileSync(path.join(tempDir, backup!), 'utf8')).toBe('{ malformed json: not valid at all')
  })

  it('readGravitasConfig and writeGravitasConfig correctly apply non-destructive updates', () => {
    // Initial read creates defaults
    const initial = readGravitasConfig(tempDir)
    expect(initial.onboarding.completed).toBe(false)
    expect(initial.onboarding.operatingMode).toBe('DETERMINISTIC_ONLY')

    // Patch operating mode and completion
    const updated = writeGravitasConfig(tempDir, {
      onboarding: {
        ...initial.onboarding,
        completed: true,
        completedAt: new Date().toISOString(),
        operatingMode: 'ASSISTED',
        selectedHarnesses: ['harness:antigravity:host', 'harness:powershell'],
      },
    })

    expect(updated.onboarding.completed).toBe(true)
    expect(updated.onboarding.operatingMode).toBe('ASSISTED')
    expect(updated.onboarding.selectedHarnesses).toContain('harness:powershell')

    // Read back from disk
    const reloaded = readGravitasConfig(tempDir)
    expect(reloaded.onboarding.completed).toBe(true)
    expect(reloaded.onboarding.operatingMode).toBe('ASSISTED')
    expect(reloaded.onboarding.selectedHarnesses).toEqual(['harness:antigravity:host', 'harness:powershell'])
  })

  it('invariant: zero plaintext API keys or secrets are stored in config', () => {
    writeGravitasConfig(tempDir, {
      onboarding: {
        completed: true,
        step: 'COMPLETED',
        operatingMode: 'ASSISTED',
        selectedHarnesses: ['harness:antigravity:host'],
        providerConfigured: true,
      },
    })

    const raw = fs.readFileSync(path.join(tempDir, 'config.json'), 'utf8')
    expect(raw).not.toContain('nvapi-')
    expect(raw).not.toContain('apiKey')
    expect(raw).not.toContain('api_key')
    expect(raw).not.toContain('secret')
  })
})
