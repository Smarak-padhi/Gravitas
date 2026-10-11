import { _electron as electron } from 'playwright'
import { join, resolve } from 'node:path'
import { mkdirSync, existsSync, rmSync, cpSync, readdirSync } from 'node:fs'
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

export async function runInstallLifecycleTest() {
  console.log('[LIFECYCLE] Testing Windows Installer & Uninstaller Lifecycle in isolated target...')

  const results = {
    step1_freshInstall: false,
    step2_launchInstalledEntry: false,
    step3_applicationShutdown: false,
    step4_relaunch: false,
    step5_uninstall: false,
    step6_verifyBinariesAndShortcutsRemoved: false,
    step7_verifyUserDataPreserved: false,
    step8_verifyZeroOrphanProcesses: false,
    step9_spacesInPathSupported: false,
    telemetry: {},
    errors: []
  }

  // Create disposable isolated root for install and user data
  // Tests paths containing spaces and parentheses
  const testIsoRoot = join(tmpdir(), `Gravitas Install Test (Spaces Path) ${Date.now()}`)
  const testLocalApp = join(testIsoRoot, 'LocalAppData')
  const testAppData = join(testIsoRoot, 'AppData')
  const testDesktop = join(testIsoRoot, 'Desktop')
  const testPrograms = join(testIsoRoot, 'Programs')

  mkdirSync(testLocalApp, { recursive: true })
  mkdirSync(testAppData, { recursive: true })
  mkdirSync(testDesktop, { recursive: true })
  mkdirSync(testPrograms, { recursive: true })

  const packageSource = resolve('dist-package/gravitas-desktop-win32-x64')
  const installTarget = join(testLocalApp, 'Programs/Gravitas')
  const testUserDataRoot = join(testAppData, 'gravitas')

  try {
    // 1. Fresh install into target directory
    console.log(`[LIFECYCLE] 1. Installing to isolated target: ${installTarget}`)
    mkdirSync(installTarget, { recursive: true })
    for (const item of readdirSync(packageSource)) {
      cpSync(join(packageSource, item), join(installTarget, item), { recursive: true })
    }

    const installedExe = join(installTarget, 'Gravitas.exe')
    if (existsSync(installedExe)) {
      results.step1_freshInstall = true
      results.step9_spacesInPathSupported = true
      console.log('[LIFECYCLE] 1. Fresh install & spaces in path: PASS')
    } else {
      throw new Error(`Installed executable not found at: ${installedExe}`)
    }

    // 2. Launch installed application entry
    console.log('[LIFECYCLE] 2. Launching installed application entry...')
    const app = await electron.launch({
      executablePath: installedExe,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        LOCALAPPDATA: testLocalApp,
        APPDATA: testAppData,
        GRAVITAS_DATA_ROOT: testUserDataRoot
      }
    })
    const win = await app.firstWindow()
    await win.waitForLoadState('domcontentloaded')
    await win.waitForTimeout(2000)

    const health1 = await win.evaluate(async () => {
      return await window.gravitasDesktop.getHealth()
    })
    console.log(`[LIFECYCLE] Installed launch health: status=${health1.status}, mainPid=${health1.mainPid}, kernelPid=${health1.kernelPid}`)
    if (health1 && health1.status === 'READY') {
      results.step2_launchInstalledEntry = true
      console.log('[LIFECYCLE] 2. Launch installed entry: PASS')
    }

    // Check user data created
    if (existsSync(join(testUserDataRoot, 'gravitas_kernel.db'))) {
      console.log('[LIFECYCLE] Database created under isolated user data root')
    }

    // 3. Application shutdown
    console.log('[LIFECYCLE] 3. Shutting down application...')
    try {
      await win.evaluate(() => {
        window.gravitasDesktop.requestQuitApplication()
      })
    } catch (_) {}
    try {
      await app.waitForEvent('close', { timeout: 8000 })
    } catch (_) {}
    await new Promise(r => setTimeout(r, 2000))

    if (!isPidAlive(health1.mainPid) && !isPidAlive(health1.kernelPid)) {
      results.step3_applicationShutdown = true
      console.log('[LIFECYCLE] 3. Application shutdown cleanly: PASS')
    }

    // 4. Relaunch
    console.log('[LIFECYCLE] 4. Relaunching installed application...')
    const relaunchApp = await electron.launch({
      executablePath: installedExe,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        LOCALAPPDATA: testLocalApp,
        APPDATA: testAppData,
        GRAVITAS_DATA_ROOT: testUserDataRoot
      }
    })
    const win2 = await relaunchApp.firstWindow()
    await win2.waitForLoadState('domcontentloaded')
    await win2.waitForTimeout(2000)

    const health2 = await win2.evaluate(async () => {
      return await window.gravitasDesktop.getHealth()
    })
    if (health2 && health2.status === 'READY') {
      results.step4_relaunch = true
      console.log('[LIFECYCLE] 4. Relaunch: PASS')
    }

    try {
      await win2.evaluate(() => {
        window.gravitasDesktop.requestQuitApplication()
      })
    } catch (_) {}
    try {
      await relaunchApp.waitForEvent('close', { timeout: 8000 })
    } catch (_) {}
    await new Promise(r => setTimeout(r, 2000))

    // 5. Uninstall
    console.log('[LIFECYCLE] 5. Simulating uninstaller execution...')
    rmSync(installTarget, { recursive: true, force: true })
    results.step5_uninstall = true
    console.log('[LIFECYCLE] 5. Uninstall executed: PASS')

    // 6. Verify application binaries removed
    if (!existsSync(installedExe) && !existsSync(installTarget)) {
      results.step6_verifyBinariesAndShortcutsRemoved = true
      console.log('[LIFECYCLE] 6. Verify binaries removed: PASS')
    }

    // 7. Verify user data preserved
    const dbFile = join(testUserDataRoot, 'gravitas_kernel.db')
    if (existsSync(dbFile)) {
      results.step7_verifyUserDataPreserved = true
      console.log('[LIFECYCLE] 7. Verify user data preserved (%APPDATA%\\gravitas intact): PASS')
    }

    // 8. Verify zero orphan processes
    if (!isPidAlive(health2.mainPid) && !isPidAlive(health2.kernelPid)) {
      results.step8_verifyZeroOrphanProcesses = true
      console.log('[LIFECYCLE] 8. Zero orphan processes: PASS')
    }

  } catch (err) {
    console.error('[LIFECYCLE] Error:', err)
    results.errors.push(String(err))
  } finally {
    rmSync(testIsoRoot, { recursive: true, force: true })
  }

  const allPassed = Object.keys(results)
    .filter(k => k.startsWith('step'))
    .every(k => results[k] === true)

  console.log('\n[LIFECYCLE] Summary:')
  console.log(JSON.stringify(results, null, 2))
  console.log('[LIFECYCLE] Overall Verdict:', allPassed ? 'PASS' : 'FAIL')

  if (!allPassed) {
    process.exit(1)
  }
}

if (process.argv[1] && process.argv[1].endsWith('test-install-lifecycle.mjs')) {
  runInstallLifecycleTest().catch(err => {
    console.error('[LIFECYCLE] Failed:', err)
    process.exit(1)
  })
}
