import { _electron as electron } from 'playwright'
import { join, resolve } from 'node:path'
import { mkdirSync, existsSync, rmSync, writeFileSync } from 'node:fs'
import { execSync, execFileSync } from 'node:child_process'
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
  console.log('[LIFECYCLE] Testing Windows Installer & Uninstaller Lifecycle with actual scripts...')

  const results = {
    step1_actualInstallerExecutes: false,
    step2_payloadHashIntegrityEnforced: false,
    step3_reparsePointRejected: false,
    step4_unrelatedDirectoryProtected: false,
    step5_launchInstalledEntry: false,
    step6_applicationShutdown: false,
    step7_reinstallOverExisting: false,
    step8_actualUninstallerExecutes: false,
    step9_unrelatedFilesPreservedDuringUninstall: false,
    step10_userDataPreservedAfterUninstall: false,
    step11_zeroOrphanProcesses: false,
    telemetry: {},
    errors: []
  }

  // Create disposable isolated root for install and user data
  const testIsoRoot = join(tmpdir(), `Gravitas Actual Installer Test ${Date.now()}`)
  const testLocalApp = join(testIsoRoot, 'LocalAppData')
  const testAppData = join(testIsoRoot, 'AppData')
  const testUserDataRoot = join(testAppData, 'gravitas')
  const installTarget = join(testLocalApp, 'Programs\\Gravitas')

  mkdirSync(testLocalApp, { recursive: true })
  mkdirSync(testAppData, { recursive: true })

  const installScriptPath = resolve('dist-package/Install-Gravitas.ps1')

  try {
    // A. Adversarial Test 1: Corrupted payload rejection before install
    console.log('[LIFECYCLE] Testing installer integrity: corrupted payload must fail closed...')
    const corruptPayloadDir = join(testIsoRoot, 'corrupt-dist')
    mkdirSync(corruptPayloadDir, { recursive: true })
    execSync(`xcopy /E /I /Q "dist-package" "${corruptPayloadDir}"`)
    // Tamper with a DLL in the corrupt dist
    const dllToTamper = join(corruptPayloadDir, 'gravitas-desktop-win32-x64\\ffmpeg.dll')
    writeFileSync(dllToTamper, Buffer.from('TAMPERED_BYTES_REJECT_ME'))

    let tamperRejected = false
    try {
      execFileSync('powershell.exe', [
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-File', join(corruptPayloadDir, 'Install-Gravitas.ps1'),
        '-CustomTargetDir', installTarget
      ], { stdio: 'pipe' })
    } catch (err) {
      tamperRejected = true
      console.log('[LIFECYCLE] Corrupted payload successfully rejected by installer!')
    }
    if (tamperRejected) {
      results.step2_payloadHashIntegrityEnforced = true
    } else {
      throw new Error('Installer failed to reject tampered payload!')
    }

    // B. Adversarial Test 2: Unrelated existing directory protected
    console.log('[LIFECYCLE] Testing protection of existing unrelated directory...')
    const unrelatedDir = join(testIsoRoot, 'unrelated-folder')
    mkdirSync(unrelatedDir, { recursive: true })
    writeFileSync(join(unrelatedDir, 'my-precious-data.txt'), 'do not touch me')

    let unrelatedOverwritingRejected = false
    try {
      execFileSync('powershell.exe', [
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-File', installScriptPath,
        '-CustomTargetDir', unrelatedDir
      ], { stdio: 'pipe' })
    } catch (err) {
      unrelatedOverwritingRejected = true
      console.log('[LIFECYCLE] Overwriting unrelated directory successfully rejected!')
    }
    if (unrelatedOverwritingRejected && existsSync(join(unrelatedDir, 'my-precious-data.txt'))) {
      results.step4_unrelatedDirectoryProtected = true
    } else {
      throw new Error('Installer allowed installation over unrelated non-empty directory!')
    }

    // C. Adversarial Test 3: Reparse Point (Junction) rejection
    const junctionRealDir = join(testIsoRoot, 'junction-real')
    const junctionTargetDir = join(testIsoRoot, 'junction-link')
    mkdirSync(junctionRealDir, { recursive: true })
    execFileSync('powershell.exe', ['-NoProfile', '-Command', `New-Item -ItemType Junction -Path '${junctionTargetDir}' -Value '${junctionRealDir}' | Out-Null`])

    let junctionRejected = false
    try {
      execFileSync('powershell.exe', [
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-File', installScriptPath,
        '-CustomTargetDir', junctionTargetDir
      ], { stdio: 'pipe' })
    } catch (err) {
      junctionRejected = true
      console.log('[LIFECYCLE] Junction target directory successfully rejected by installer!')
    }
    if (junctionRejected) {
      results.step3_reparsePointRejected = true
    } else {
      throw new Error('Installer allowed installation into junction/reparse point directory!')
    }

    // D. Step 1: Execute actual Install-Gravitas.ps1 into clean target
    console.log(`[LIFECYCLE] 1. Executing real installer: ${installScriptPath} -> ${installTarget}`)
    const installOut = execFileSync('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-File', installScriptPath,
      '-CustomTargetDir', installTarget
    ], {
      env: {
        ...process.env,
        LOCALAPPDATA: testLocalApp,
        APPDATA: testAppData
      },
      encoding: 'utf8'
    })
    console.log('[LIFECYCLE] Install output:\n', installOut)

    const installedExe = join(installTarget, 'Gravitas.exe')
    if (existsSync(installedExe) && existsSync(join(installTarget, 'Uninstall.ps1')) && existsSync(join(installTarget, 'Uninstall.cmd'))) {
      results.step1_actualInstallerExecutes = true
      console.log('[LIFECYCLE] 1. Actual installer executed (Gravitas.exe, Uninstall.ps1, Uninstall.cmd verified): PASS')
    } else {
      throw new Error(`Installation failed to write Gravitas.exe, Uninstall.ps1, or Uninstall.cmd to: ${installTarget}`)
    }

    // D. Step 5: Launch installed application entry
    console.log('[LIFECYCLE] 5. Launching installed application entry...')
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
      results.step5_launchInstalledEntry = true
      console.log('[LIFECYCLE] 5. Launch installed entry: PASS')
    }

    // Check user database created
    if (existsSync(join(testUserDataRoot, 'gravitas_kernel.db'))) {
      console.log('[LIFECYCLE] Database created under isolated user data root')
    }

    // Step 6: Application shutdown
    console.log('[LIFECYCLE] 6. Shutting down application...')
    try {
      await win.evaluate(() => {
        window.gravitasDesktop.requestQuitApplication()
      })
    } catch (_) {}
    try {
      await app.waitForEvent('close', { timeout: 8000 })
    } catch (_) {}
    try {
      await app.close()
    } catch (_) {}
    await new Promise(r => setTimeout(r, 2000))

    if (!isPidAlive(health1.mainPid) && !isPidAlive(health1.kernelPid)) {
      results.step6_applicationShutdown = true
      console.log('[LIFECYCLE] 6. Application shutdown cleanly: PASS')
    }

    // E. Step 7: Reinstall over existing installation (Upgrade/Repair)
    console.log('[LIFECYCLE] 7. Reinstalling over existing installation...')
    const reinstallOut = execFileSync('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-File', installScriptPath,
      '-CustomTargetDir', installTarget
    ], {
      env: {
        ...process.env,
        LOCALAPPDATA: testLocalApp,
        APPDATA: testAppData
      },
      encoding: 'utf8'
    })
    if (existsSync(installedExe)) {
      results.step7_reinstallOverExisting = true
      console.log('[LIFECYCLE] 7. Reinstallation over existing installation: PASS')
    }

    // Place an unrelated user file inside the installation directory before uninstall
    const unrelatedInApp = join(installTarget, 'unrelated-user-note.txt')
    writeFileSync(unrelatedInApp, 'important custom note inside app folder')

    // F. Step 8: Execute actual Uninstall.ps1 script
    console.log('[LIFECYCLE] 8. Executing actual Uninstall.ps1 script...')
    const uninstallScript = join(installTarget, 'Uninstall.ps1')
    const uninstallOut = execFileSync('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-File', uninstallScript
    ], {
      cwd: installTarget,
      env: {
        ...process.env,
        LOCALAPPDATA: testLocalApp,
        APPDATA: testAppData
      },
      encoding: 'utf8'
    })
    console.log('[LIFECYCLE] Uninstall output:\n', uninstallOut)

    // Verify application binaries are removed
    const exeRemoved = !existsSync(installedExe)
    const uninstallRemoved = !existsSync(uninstallScript) && !existsSync(join(installTarget, 'Uninstall.cmd'))
    if (exeRemoved && uninstallRemoved) {
      results.step8_actualUninstallerExecutes = true
      console.log('[LIFECYCLE] 8. Actual uninstaller executed: PASS')
    }

    // Step 9: Verify unrelated file in app dir was PRESERVED
    if (existsSync(unrelatedInApp)) {
      results.step9_unrelatedFilesPreservedDuringUninstall = true
      console.log('[LIFECYCLE] 9. Unrelated file preserved during uninstall: PASS')
    } else {
      throw new Error('Uninstaller recursively deleted unrelated user file!')
    }

    // Step 10: Verify user data in %APPDATA%\gravitas preserved
    const dbFile = join(testUserDataRoot, 'gravitas_kernel.db')
    if (existsSync(dbFile)) {
      results.step10_userDataPreservedAfterUninstall = true
      console.log('[LIFECYCLE] 10. User data preserved (%APPDATA%\\gravitas intact): PASS')
    }

    // Step 11: Zero orphan processes
    if (!isPidAlive(health1.mainPid) && !isPidAlive(health1.kernelPid)) {
      results.step11_zeroOrphanProcesses = true
      console.log('[LIFECYCLE] 11. Zero orphan processes: PASS')
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
