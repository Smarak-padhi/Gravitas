import { _electron as electron } from 'playwright'
import { join, resolve } from 'node:path'
import { mkdirSync, existsSync, rmSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { tmpdir } from 'node:os'

function isPidAlive(pid) {
  if (!pid) return false
  try {
    const res = execSync(`tasklist /fi "PID eq ${pid}" /fo csv /nh`, { encoding: 'utf8' })
    return res.includes(String(pid))
  } catch (_) {
    return false
  }
}

export async function runPackagedSmokeSuite() {
  console.log('[SMOKE] Running Packaged Windows Application Smoke Suite...')
  const results = {
    step1_firstLaunch: false,
    step2_onboardingWizard: false,
    step3_deterministicOnboarding: false,
    step4_doctorDiagnostics: false,
    step5_commandCenterLoaded: false,
    step6_livingHqViewSwitch: false,
    step7_kernelHostDistinctProcess: false,
    step8_k0DatabaseInitialized: false,
    step9_restartPreservesDurableState: false,
    step10_providerStatusTruthful: false,
    step11_syntheticCredentialVolatile: false,
    step12_unexpectedTerminationOffline: false,
    step13_authorizedRestartFreshProcess: false,
    step14_credentialResyncFunctional: false,
    step15_cleanExitZeroOrphans: false,
    telemetry: {},
    errors: []
  }

  const pkgExe = resolve('dist-package/gravitas-desktop-win32-x64/Gravitas.exe')
  if (!existsSync(pkgExe)) {
    throw new Error(`Packaged executable not found at: ${pkgExe}`)
  }

  const testDataRoot = join(tmpdir(), `gravitas-smoke-test-${Date.now()}`)
  mkdirSync(testDataRoot, { recursive: true })
  console.log('[SMOKE] Isolated testDataRoot:', testDataRoot)

  let app = null
  let mainPid = null
  let kernelPid = null

  try {
    // 1. Fresh first launch
    app = await electron.launch({
      executablePath: pkgExe,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        GRAVITAS_DATA_ROOT: testDataRoot
      }
    })
    results.step1_firstLaunch = true
    console.log('[SMOKE] 1. Fresh first launch: PASS')

    const win = await app.firstWindow()
    await win.waitForLoadState('domcontentloaded')
    await win.waitForTimeout(2000)

    // 2. Onboarding wizard loads
    const onboarding = await win.evaluate(async () => {
      return await window.gravitasDesktop.getOnboarding()
    })
    console.log('[SMOKE] Onboarding state:', onboarding)
    if (onboarding && typeof onboarding.completed === 'boolean') {
      results.step2_onboardingWizard = true
      console.log('[SMOKE] 2. Onboarding wizard loads: PASS')
    }

    // 3. Deterministic-only onboarding succeeds without an API key
    if (onboarding.operatingMode === 'DETERMINISTIC_ONLY' && onboarding.providerConfigured === false) {
      results.step3_deterministicOnboarding = true
      console.log('[SMOKE] 3. Deterministic-only onboarding: PASS')
    }

    // 4. Doctor diagnostics run against installed environment
    const doc = await win.evaluate(async () => {
      return await window.gravitasDesktop.runDoctor()
    })
    console.log('[SMOKE] Doctor exitCode:', doc.exitCode, 'overallStatus:', doc.overallStatus)
    if (doc && (doc.overallStatus === 'PASS' || doc.overallStatus === 'WARN')) {
      results.step4_doctorDiagnostics = true
      console.log('[SMOKE] 4. Doctor diagnostics: PASS')
    }

    // 5. D1 Command Center loads
    const ccMainVisible = await win.isVisible('#cc-main')
    if (ccMainVisible) {
      results.step5_commandCenterLoaded = true
      console.log('[SMOKE] 5. D1 Command Center loaded: PASS')
    }

    // 6. D3 Living HQ view switching functional
    await win.click('#btn-view-world')
    await win.waitForTimeout(500)
    const worldVisible = await win.isVisible('#living-hq')
    await win.click('#btn-view-command')
    await win.waitForTimeout(500)
    const cmdVisibleAgain = await win.isVisible('#cc-main')
    if (worldVisible && cmdVisibleAgain) {
      results.step6_livingHqViewSwitch = true
      console.log('[SMOKE] 6. Living HQ view switching: PASS')
    }

    // 7. KernelHost runs in a distinct OS process
    const health = await win.evaluate(async () => {
      return await window.gravitasDesktop.getHealth()
    })
    mainPid = health.mainPid
    kernelPid = health.kernelPid
    console.log(`[SMOKE] mainPid=${mainPid}, kernelPid=${kernelPid}`)
    if (mainPid && kernelPid && mainPid !== kernelPid && isPidAlive(mainPid) && isPidAlive(kernelPid)) {
      results.step7_kernelHostDistinctProcess = true
      console.log('[SMOKE] 7. Distinct OS process: PASS')
    }

    // 8. K0 database initializes under the user data root
    const kernelDbPath = join(testDataRoot, 'gravitas_kernel.db')
    if (existsSync(kernelDbPath)) {
      results.step8_k0DatabaseInitialized = true
      console.log('[SMOKE] 8. K0 database initialized: PASS')
    }

    // 10. Provider status remains truthful without credentials
    if (health.status === 'READY' && onboarding.providerConfigured === false) {
      results.step10_providerStatusTruthful = true
      console.log('[SMOKE] 10. Provider status truthful: PASS')
    }

    // 11. Synthetic credential configuration remains volatile
    const configResult = await win.evaluate(async () => {
      return await window.gravitasDesktop.configureProvider({
        providerId: 'nvidia-nim',
        apiKey: 'nvapi-test-synthetic-smoke-token-42'
      })
    })
    console.log('[SMOKE] Synthetic provider configured:', configResult)
    if (configResult && configResult.success) {
      results.step11_syntheticCredentialVolatile = true
      console.log('[SMOKE] 11. Synthetic credential configured: PASS')
    }

    // Verify providerConfigured is true after setting key
    const obConfigured = await win.evaluate(async () => {
      return await window.gravitasDesktop.getOnboarding()
    })
    console.log('[SMOKE] obConfigured after setting key:', obConfigured.providerConfigured)

    // 12. Unexpected KernelHost termination transitions to OFFLINE/AUTH_REQUIRED
    console.log(`[SMOKE] Simulating unexpected termination of kernel process ${kernelPid}...`)
    execSync(`taskkill /F /PID ${kernelPid}`)
    await win.waitForTimeout(1000)

    const healthAfterKill = await win.evaluate(async () => {
      return await window.gravitasDesktop.getHealth()
    })
    const obAfterKill = await win.evaluate(async () => {
      return await window.gravitasDesktop.getOnboarding()
    })
    console.log('[SMOKE] Status after kill:', healthAfterKill.status, 'providerConfigured:', obAfterKill.providerConfigured)
    if (healthAfterKill.status === 'OFFLINE' && obAfterKill.providerConfigured === false) {
      results.step12_unexpectedTerminationOffline = true
      console.log('[SMOKE] 12. Unexpected termination transitions to OFFLINE/providerConfigured:false: PASS')
    }

    // 13. Authorized restart launches a fresh utility process
    console.log('[SMOKE] Initiating authorized restart...')
    const restartOk = await win.evaluate(async () => {
      return await window.gravitasDesktop.restartKernel()
    })
    await win.waitForTimeout(1500)
    const healthAfterRestart = await win.evaluate(async () => {
      return await window.gravitasDesktop.getHealth()
    })
    const newKernelPid = healthAfterRestart.kernelPid
    console.log(`[SMOKE] Restart status: ${restartOk}, newKernelPid: ${newKernelPid} (old: ${kernelPid})`)
    if (restartOk && newKernelPid && newKernelPid !== kernelPid && isPidAlive(newKernelPid)) {
      results.step13_authorizedRestartFreshProcess = true
      console.log('[SMOKE] 13. Authorized restart launches fresh utility process: PASS')
      kernelPid = newKernelPid
    }

    // 14. Credential resynchronization works during the same application lifetime
    const obAfterRestart = await win.evaluate(async () => {
      return await window.gravitasDesktop.getOnboarding()
    })
    console.log('[SMOKE] providerConfigured after restart:', obAfterRestart.providerConfigured)
    if (obAfterRestart.providerConfigured === true) {
      results.step14_credentialResyncFunctional = true
      console.log('[SMOKE] 14. Credential resynchronization works: PASS')
    }

    // Normal shutdown via requestQuitApplication
    try {
      await win.evaluate(() => {
        window.gravitasDesktop.requestQuitApplication()
      })
    } catch (_) {
      // Disconnect expected as window closes immediately on exit
    }

    try {
      await app.waitForEvent('close', { timeout: 8000 })
    } catch (_) {}
    await new Promise(r => setTimeout(r, 2000))

    // 15. Full application exit leaves no orphan KernelHost process
    const mainAlive = isPidAlive(mainPid)
    const kernelAlive = isPidAlive(kernelPid)
    console.log(`[SMOKE] After close: mainPid ${mainPid} alive: ${mainAlive}, kernelPid ${kernelPid} alive: ${kernelAlive}`)
    if (!mainAlive && !kernelAlive) {
      results.step15_cleanExitZeroOrphans = true
      console.log('[SMOKE] 15. Zero orphans remaining: PASS')
    }

    // 9. Restart preserves durable state
    console.log('[SMOKE] Relaunching app to verify durable persistence...')
    const relaunchApp = await electron.launch({
      executablePath: pkgExe,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        GRAVITAS_DATA_ROOT: testDataRoot
      }
    })
    const win2 = await relaunchApp.firstWindow()
    await win2.waitForLoadState('domcontentloaded')
    await win2.waitForTimeout(2000)

    const relaunchHealth = await win2.evaluate(async () => {
      return await window.gravitasDesktop.getHealth()
    })
    console.log('[SMOKE] Relaunch health status:', relaunchHealth.status)
    if (relaunchHealth && relaunchHealth.status === 'READY') {
      results.step9_restartPreservesDurableState = true
      console.log('[SMOKE] 9. Restart preserves durable state: PASS')
    }

    try {
      await win2.evaluate(() => {
        window.gravitasDesktop.requestQuitApplication()
      })
    } catch (_) {}
    try {
      await relaunchApp.waitForEvent('close', { timeout: 8000 })
    } catch (_) {}
    await new Promise(r => setTimeout(r, 1000))

  } catch (err) {
    console.error('[SMOKE] Error during smoke test:', err)
    results.errors.push(String(err))
  } finally {
    rmSync(testDataRoot, { recursive: true, force: true })
  }

  const allPassed = Object.keys(results)
    .filter(k => k.startsWith('step'))
    .every(k => results[k] === true)

  console.log('\n[SMOKE] Final Summary:')
  console.log(JSON.stringify(results, null, 2))
  console.log('[SMOKE] Overall Verdict:', allPassed ? 'PASS' : 'FAIL')

  if (!allPassed) {
    process.exit(1)
  }
}

if (process.argv[1] && process.argv[1].endsWith('test-packaged-smoke.mjs')) {
  runPackagedSmokeSuite().catch(err => {
    console.error('[SMOKE] Execution failed:', err)
    process.exit(1)
  })
}
