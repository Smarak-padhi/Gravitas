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
    environment: 'node',
    /**
     * Reporters: verbose in CI (when $CI is set), compact locally.
     * Vitest will pick up $CI automatically.
     */
    reporters: process.env['CI'] ? ['verbose'] : ['default'],
  },
})
