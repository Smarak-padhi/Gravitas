import { build } from 'esbuild'
import { copyFileSync, mkdirSync, readdirSync } from 'node:fs'
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
      entryPoints: [join(__dirname, 'src/renderer/main.tsx')],
      bundle: true,
      platform: 'browser',
      format: 'esm',
      outfile: join(__dirname, 'dist/renderer/renderer.js'),
      define: {
        'process.env.NODE_ENV': '"production"',
      },
    }),
    build({
      entryPoints: [join(__dirname, 'src/renderer/companion.ts')],
      bundle: true,
      platform: 'browser',
      format: 'esm',
      outfile: join(__dirname, 'dist/renderer/companion.js'),
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

  mkdirSync(join(__dirname, 'dist/renderer/assets/fonts'), { recursive: true })
  copyFileSync(join(__dirname, 'src/renderer/assets/signature-blue-bg.png'), join(__dirname, 'dist/renderer/assets/signature-blue-bg.png'))
  copyFileSync(join(__dirname, 'src/renderer/assets/fonts/Geist-Variable.woff2'), join(__dirname, 'dist/renderer/assets/fonts/Geist-Variable.woff2'))
  copyFileSync(join(__dirname, 'src/renderer/assets/fonts/GeistMono-Variable.woff2'), join(__dirname, 'dist/renderer/assets/fonts/GeistMono-Variable.woff2'))
  copyFileSync(join(__dirname, 'src/renderer/index.html'), join(__dirname, 'dist/renderer/index.html'))
  copyFileSync(join(__dirname, 'src/renderer/companion.html'), join(__dirname, 'dist/renderer/companion.html'))

  // Copy KaTeX CSS and fonts for mathematical formula rendering in Ada's Knowledge Hub
  try {
    const katexDist = join(__dirname, '../../node_modules/katex/dist')
    copyFileSync(join(katexDist, 'katex.min.css'), join(__dirname, 'dist/renderer/assets/katex.min.css'))
    const katexFonts = join(katexDist, 'fonts')
    for (const f of readdirSync(katexFonts)) {
      if (f.endsWith('.woff2')) {
        copyFileSync(join(katexFonts, f), join(__dirname, 'dist/renderer/assets/fonts', f))
      }
    }
  } catch (err) {
    console.warn('Could not copy KaTeX assets:', err)
  }

  console.log('Desktop package bundled successfully.')
}

run().catch((err) => {
  console.error('Build failed:', err)
  process.exit(1)
})
