import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: [
      'packages/harnesses/src/*integration.test.ts',
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
    ],
    environment: 'node',
    testTimeout: 120000,
    hookTimeout: 120000,
  },
})
