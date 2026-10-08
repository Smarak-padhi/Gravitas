#!/usr/bin/env node
/**
 * GRAVITAS DOCTOR CLI
 *
 * Runnable command-line diagnostics utility.
 * Usage:
 *   npm run doctor
 *   node scripts/doctor.mjs
 *   node scripts/doctor.mjs --json
 *   node scripts/doctor.mjs --data-root <path>
 */

import { GravitasDoctor } from '../packages/core/dist/doctor.js'

async function main() {
  const args = process.argv.slice(2)
  const isJson = args.includes('--json')
  let customDataRoot = undefined

  const dataRootIdx = args.findIndex((a) => a === '--data-root' || a === '--path')
  if (dataRootIdx !== -1 && args[dataRootIdx + 1]) {
    customDataRoot = args[dataRootIdx + 1]
  }

  const doctor = new GravitasDoctor({
    customDataRoot,
    repoRoot: process.cwd(),
  })

  const report = await doctor.runDiagnostics()

  if (isJson) {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n')
    process.exit(report.exitCode)
  }

  // Human-readable output formatting
  console.log('============================================================')
  console.log('GRAVITAS DOCTOR — SYSTEM DIAGNOSTICS & READINESS REPORT')
  console.log('============================================================')
  console.log(`Timestamp: ${report.timestamp}`)
  console.log(`Platform:  ${report.platform.os} [${report.platform.arch}]`)
  console.log(`Node:      ${report.platform.nodeVersion}${report.platform.electronVersion ? ` | Electron: ${report.platform.electronVersion}` : ''}`)
  console.log(`Data Root: ${report.paths.dataRoot}${report.paths.isTestOverride ? ' (TEST_OVERRIDE)' : ''}`)
  console.log(`Database:  ${report.paths.databasePath}`)
  console.log('------------------------------------------------------------')

  for (const check of report.checks) {
    const statusTag = check.status.padEnd(11, ' ')
    const sevTag = `[${check.severity.charAt(0)}]`
    console.log(`${sevTag} ${statusTag} ${check.code.padEnd(28, ' ')} ${check.message}`)
    if (check.remediation && check.status !== 'OK') {
      console.log(`    ↳ Remediation: ${check.remediation}`)
    }
  }

  console.log('------------------------------------------------------------')
  console.log(
    `Summary: ${report.summary.total} checks | ${report.summary.ok} OK | ` +
    `${report.summary.warning} WARNING | ${report.summary.unavailable} UNAVAILABLE | ` +
    `${report.summary.blocked} BLOCKED`
  )
  console.log(`Verdict: ${report.overallStatus} (Exit code: ${report.exitCode})`)
  console.log('============================================================')

  process.exit(report.exitCode)
}

main().catch((err) => {
  console.error('Fatal doctor execution error:', err)
  process.exit(1)
})
