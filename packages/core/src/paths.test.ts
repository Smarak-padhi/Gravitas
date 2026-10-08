import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as os from 'node:os'
import * as fs from 'node:fs'
import * as path from 'node:path'
import {
  validateSafeDirectoryPath,
  resolveGravitasDataRoot,
  resolveGravitasPaths,
  ensureDataRootDirectories,
  testDataRootWritable,
  PathResolutionError,
} from './paths.js'

describe('GRAVITAS Paths & Directory Policy (Wave V1-C)', () => {
  const originalEnv = process.env.GRAVITAS_DATA_ROOT
  let tempTestDir: string

  beforeEach(() => {
    tempTestDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gravitas-paths-test-'))
  })

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.GRAVITAS_DATA_ROOT = originalEnv
    } else {
      delete process.env.GRAVITAS_DATA_ROOT
    }

    try {
      if (fs.existsSync(tempTestDir)) {
        fs.rmSync(tempTestDir, { recursive: true, force: true })
      }
    } catch {
      // Ignore cleanup error
    }
  })

  describe('validateSafeDirectoryPath', () => {
    it('normalizes and resolves safe paths', () => {
      const p = validateSafeDirectoryPath('   ./relative/dir   ')
      expect(p).toBe(path.resolve('./relative/dir'))
    })

    it('rejects empty or whitespace-only paths', () => {
      expect(() => validateSafeDirectoryPath('')).toThrow(PathResolutionError)
      expect(() => validateSafeDirectoryPath('   ')).toThrow(PathResolutionError)
    })

    it('rejects paths containing null bytes', () => {
      expect(() => validateSafeDirectoryPath('/safe/path\0/malicious')).toThrow(PathResolutionError)
    })
  })

  describe('resolveGravitasDataRoot', () => {
    it('prioritizes explicit argument and marks isTestOverride true', () => {
      const explicit = path.join(tempTestDir, 'explicit-root')
      const res = resolveGravitasDataRoot(explicit)
      expect(res.dataRoot).toBe(path.resolve(explicit))
      expect(res.isTestOverride).toBe(true)
    })

    it('prioritizes environment variable GRAVITAS_DATA_ROOT if no argument provided', () => {
      const envRoot = path.join(tempTestDir, 'env-root')
      process.env.GRAVITAS_DATA_ROOT = envRoot

      const res = resolveGravitasDataRoot()
      expect(res.dataRoot).toBe(path.resolve(envRoot))
      expect(res.isTestOverride).toBe(true)
    })

    it('resolves canonical platform default when neither argument nor env set', () => {
      delete process.env.GRAVITAS_DATA_ROOT
      const res = resolveGravitasDataRoot()

      expect(typeof res.dataRoot).toBe('string')
      expect(res.dataRoot.length).toBeGreaterThan(0)
      expect(res.dataRoot).toContain('gravitas')
      expect(res.isTestOverride).toBe(false)
    })
  })

  describe('resolveGravitasPaths', () => {
    it('constructs consistent paths for all subsystem directories', () => {
      const paths = resolveGravitasPaths(tempTestDir)
      expect(paths.dataRoot).toBe(path.resolve(tempTestDir))
      expect(paths.databasePath).toBe(path.join(path.resolve(tempTestDir), 'kernel.db'))
      expect(paths.lockPath).toBe(path.join(path.resolve(tempTestDir), 'kernel.lock'))
      expect(paths.logsDir).toBe(path.join(path.resolve(tempTestDir), 'logs'))
      expect(paths.artifactsDir).toBe(path.join(path.resolve(tempTestDir), 'artifacts'))
      expect(paths.configPath).toBe(path.join(path.resolve(tempTestDir), 'config.json'))
      expect(paths.isTestOverride).toBe(true)
    })
  })

  describe('ensureDataRootDirectories & testDataRootWritable', () => {
    it('creates all required directories safely and verifies writability', () => {
      const target = path.join(tempTestDir, 'nested', 'target-root')
      const paths = resolveGravitasPaths(target)

      expect(fs.existsSync(paths.dataRoot)).toBe(false)
      ensureDataRootDirectories(paths)

      expect(fs.existsSync(paths.dataRoot)).toBe(true)
      expect(fs.existsSync(paths.logsDir)).toBe(true)
      expect(fs.existsSync(paths.artifactsDir)).toBe(true)

      const writeTest = testDataRootWritable(paths.dataRoot)
      expect(writeTest.writable).toBe(true)
      expect(writeTest.error).toBeUndefined()
    })

    it('supports paths with spaces and Unicode characters', () => {
      const unicodeDir = path.join(tempTestDir, 'test dir with spaces', 'gravitas-üñîçødé')
      const paths = resolveGravitasPaths(unicodeDir)

      ensureDataRootDirectories(paths)
      expect(fs.existsSync(paths.dataRoot)).toBe(true)

      const writeTest = testDataRootWritable(paths.dataRoot)
      expect(writeTest.writable).toBe(true)
    })
  })
})
