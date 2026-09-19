import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    /**
     * Scan all packages and apps for test files.
     * Matches *.test.ts files anywhere under packages/ or apps/.
     */
    include: [
      'packages/*/src/**/*.test.ts',
      'packages/*/tests/**/*.test.ts',
      'apps/*/src/**/*.test.ts',
    ],
    /**
     * Exclude live AI integration tests from standard deterministic test runs.
     * Integration tests are invoked explicitly via `npm run test:fcc-integration`
     * or `npm run test:claude-integration`.
     */
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'packages/harnesses/src/*integration.test.ts',
    ],
    environment: 'node',
    /**
     * Test timeouts: real-git operations on Windows benefit from 20s headroom.
     */
    testTimeout: 25000,
    hookTimeout: 25000,
    /**
     * Reporters: verbose in CI (when $CI is set), compact locally.
     * Vitest will pick up $CI automatically.
     */
    reporters: process.env['CI'] ? ['verbose'] : ['default'],
  },
})
