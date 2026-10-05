import { build } from 'esbuild'
import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

async function run() {
  mkdirSync(join(__dirname, 'dist/renderer'), { recursive: true })

  await Promise.all([
    build({
      entryPoints: [join(__dirname, 'src/kernel-host/index.ts')],
      bundle: true,
      platform: 'node',
      format: 'esm',
      outfile: join(__dirname, 'dist/kernel-host/index.mjs'),
      external: ['node:*', 'electron'],
    }),
    build({
      entryPoints: [join(__dirname, 'src/kernel-host/d3FixtureHost.ts')],
      bundle: true,
      platform: 'node',
      format: 'esm',
      outfile: join(__dirname, 'dist/kernel-host/d3FixtureHost.mjs'),
      external: ['node:*', 'electron'],
    }),
    build({
      entryPoints: [join(__dirname, 'src/kernel-host/d4FixtureHost.ts')],
      bundle: true,
      platform: 'node',
      format: 'esm',
      outfile: join(__dirname, 'dist/kernel-host/d4FixtureHost.mjs'),
      external: ['node:*', 'electron'],
    }),
    build({
      entryPoints: [join(__dirname, 'src/preload/index.ts')],
      bundle: true,
      platform: 'node',
      format: 'cjs',
      outfile: join(__dirname, 'dist/preload/index.cjs'),
      external: ['electron'],
    }),
    build({
      entryPoints: [join(__dirname, 'src/renderer/renderer.ts')],
      bundle: true,
      platform: 'browser',
      format: 'esm',
      outfile: join(__dirname, 'dist/renderer/renderer.js'),
    }),
    build({
      entryPoints: [join(__dirname, 'src/main/index.ts')],
      bundle: true,
      platform: 'node',
      format: 'esm',
      outfile: join(__dirname, 'dist/main/index.js'),
      external: ['node:*', 'electron'],
    }),
    build({
      entryPoints: [join(__dirname, 'src/main/supervisor.ts')],
      bundle: true,
      platform: 'node',
      format: 'esm',
      outfile: join(__dirname, 'dist/main/supervisor.js'),
      external: ['node:*', 'electron'],
    }),
    build({
      entryPoints: [join(__dirname, 'src/index.ts')],
      bundle: true,
      platform: 'node',
      format: 'esm',
      outfile: join(__dirname, 'dist/index.js'),
      external: ['node:*', 'electron'],
    }),
    build({
      entryPoints: [join(__dirname, 'src/types.ts')],
      bundle: true,
      platform: 'node',
      format: 'esm',
      outfile: join(__dirname, 'dist/types.js'),
      external: ['node:*', 'electron'],
    }),
  ])

  copyFileSync(join(__dirname, 'src/renderer/index.html'), join(__dirname, 'dist/renderer/index.html'))
  console.log('Desktop package bundled successfully.')
}

run().catch((err) => {
  console.error('Build failed:', err)
  process.exit(1)
})
