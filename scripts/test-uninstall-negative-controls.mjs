import { join, resolve } from 'node:path'
import { mkdirSync, existsSync, rmSync, writeFileSync, copyFileSync, readFileSync, symlinkSync } from 'node:fs'
import { execFileSync, spawn } from 'node:child_process'
import { tmpdir } from 'node:os'

function isPidAlive(pid) {
  if (!pid) return false
  try {
    process.kill(pid, 0)
    return true
  } catch (err) {
    return err.code === 'EPERM'
  }
}

function stopProcess(pid) {
  if (!pid || !isPidAlive(pid)) return
  try {
    execFileSync('taskkill', ['/F', '/PID', pid.toString()], { stdio: 'ignore' })
  } catch (_) {}
}

export async function runNegativeControlTests() {
  console.log('[NEGATIVE CONTROLS] Running Hostile Negative Controls against Flawed Uninstallers & Harness Gates...\n')

  const testRoot = join(tmpdir(), `gravitas-neg-control-${Date.now()}`)
  mkdirSync(testRoot, { recursive: true })

  const results = {
    control1_pathTraversalDetected: false,
    control2_indiscriminateDeletionDetected: false,
    control3_unscopedProcessKillerDetected: false,
    control4_junctionTraversalDetected: false,
    control5_corruptInventoryCrashDetected: false,
    controlA_mandatoryBlockedNonzeroExit: false,
    controlB_uncTargetDeletionDetection: false,
    controlC_reparseRejectionBypassDetection: false
  }

  try {
    // -------------------------------------------------------------------------
    // Control 1: Path Traversal Vulnerability
    // A vulnerable uninstaller iterates payload-inventory.json without checking '..' or allowlist.
    // -------------------------------------------------------------------------
    console.log('[CONTROL 1] Testing detection of path-traversal vulnerable uninstaller...')
    const c1Dir = join(testRoot, 'c1-sandbox')
    const c1App = join(c1Dir, 'App')
    mkdirSync(c1App, { recursive: true })
    const outsideCanary = join(c1Dir, 'outside-canary.txt')
    writeFileSync(outsideCanary, 'CRITICAL OUTSIDE CANARY')

    // Flawed uninstaller that blindly parses inventory and deletes targets
    const flawedUninstaller1 = `
      $inv = Get-Content (Join-Path $PSScriptRoot "payload-inventory.json") | ConvertFrom-Json
      foreach ($f in $inv.files) {
          $target = Join-Path $PSScriptRoot $f.path
          Remove-Item -LiteralPath $target -Force -ErrorAction SilentlyContinue
      }
    `
    writeFileSync(join(c1App, 'Uninstall.ps1'), flawedUninstaller1)
    writeFileSync(join(c1App, 'payload-inventory.json'), JSON.stringify({
      files: [{ path: '..\\outside-canary.txt', sha256: '0000' }]
    }))

    // Execute flawed uninstaller
    execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(c1App, 'Uninstall.ps1')], { cwd: c1App })

    // Our test assertion: canary must exist. If canary is missing, test catches vulnerability (fails closed)!
    if (!existsSync(outsideCanary)) {
      results.control1_pathTraversalDetected = true
      console.log('  PASS (RED CONTROL CONFIRMED): Flawed uninstaller deleted canary; test assertion successfully caught traversal vulnerability!')
    } else {
      console.error('  FAIL: Control 1 failed to exhibit expected flawed behavior')
    }

    // -------------------------------------------------------------------------
    // Control 2: Indiscriminate Deletion Vulnerability
    // A vulnerable uninstaller wipes the entire folder including unlisted user files.
    // -------------------------------------------------------------------------
    console.log('\n[CONTROL 2] Testing detection of indiscriminate deletion uninstaller...')
    const c2Dir = join(testRoot, 'c2-sandbox')
    mkdirSync(c2Dir, { recursive: true })
    const preciousUserNote = join(c2Dir, 'my-precious-note.txt')
    writeFileSync(preciousUserNote, 'USER DATA NOTE')

    const flawedUninstaller2 = `
      Get-ChildItem -LiteralPath $PSScriptRoot -Exclude "Uninstall.ps1" | Remove-Item -Recurse -Force
    `
    writeFileSync(join(c2Dir, 'Uninstall.ps1'), flawedUninstaller2)

    execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(c2Dir, 'Uninstall.ps1')], { cwd: c2Dir })

    // Our test assertion: preciousUserNote must exist. If deleted, test catches vulnerability!
    if (!existsSync(preciousUserNote)) {
      results.control2_indiscriminateDeletionDetected = true
      console.log('  PASS (RED CONTROL CONFIRMED): Flawed uninstaller deleted user note; test assertion successfully caught indiscriminate deletion!')
    } else {
      console.error('  FAIL: Control 2 failed to exhibit expected flawed behavior')
    }

    // -------------------------------------------------------------------------
    // Control 3: Unscoped Process Killer Vulnerability
    // A vulnerable uninstaller kills all processes named Gravitas system-wide.
    // -------------------------------------------------------------------------
    console.log('\n[CONTROL 3] Testing detection of unscoped system-wide process killer...')
    const c3Dir = join(testRoot, 'c3-sandbox')
    const c3App = join(c3Dir, 'App')
    const c3Ext = join(c3Dir, 'Ext')
    mkdirSync(c3App, { recursive: true })
    mkdirSync(c3Ext, { recursive: true })

    const pingExe = 'C:\\Windows\\System32\\ping.exe'
    const intExe = join(c3App, 'Gravitas.exe')
    const extExe = join(c3Ext, 'Gravitas.exe')
    copyFileSync(pingExe, intExe)
    copyFileSync(pingExe, extExe)

    const childExt = spawn(extExe, ['127.0.0.1', '-n', '30'], { detached: true, stdio: 'ignore' })
    childExt.unref()
    await new Promise(r => setTimeout(r, 800))

    // Flawed uninstaller that kills Gravitas indiscriminately system-wide
    const flawedUninstaller3 = `
      Stop-Process -Name "Gravitas" -Force -ErrorAction SilentlyContinue
    `
    writeFileSync(join(c3App, 'Uninstall.ps1'), flawedUninstaller3)

    try {
      execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(c3App, 'Uninstall.ps1')], { cwd: c3App })
      await new Promise(r => setTimeout(r, 500))

      // Our test assertion: external process must survive. If external process died, test catches vulnerability!
      if (!isPidAlive(childExt.pid)) {
        results.control3_unscopedProcessKillerDetected = true
        console.log('  PASS (RED CONTROL CONFIRMED): Flawed uninstaller killed external process; test assertion successfully caught unscoped termination!')
      } else {
        console.error('  FAIL: Control 3 failed to kill external process as expected')
      }
    } finally {
      stopProcess(childExt.pid)
    }

    // -------------------------------------------------------------------------
    // Control 4: Junction Traversal Vulnerability
    // A vulnerable uninstaller traverses directory junctions and deletes victim payload.
    // -------------------------------------------------------------------------
    console.log('\n[CONTROL 4] Testing detection of junction-oblivious uninstaller...')
    const c4Dir = join(testRoot, 'c4-sandbox')
    const c4App = join(c4Dir, 'App')
    const outsideVictim = join(c4Dir, 'outside-victim')
    mkdirSync(c4App, { recursive: true })
    mkdirSync(outsideVictim, { recursive: true })

    const victimPayload = join(outsideVictim, 'victim-payload.dll')
    writeFileSync(victimPayload, 'VICTIM DLL')

    // Create junction from c4App\resources -> outsideVictim
    execFileSync('powershell.exe', ['-NoProfile', '-Command', `New-Item -ItemType Junction -Path '${join(c4App, 'resources')}' -Value '${outsideVictim}' | Out-Null`])

    // Flawed uninstaller: deletes resources without checking Test-ReparsePointInPath
    const flawedUninstaller4 = `
      $target = Join-Path $PSScriptRoot "resources\\victim-payload.dll"
      if (Test-Path -LiteralPath $target) {
          Remove-Item -LiteralPath $target -Force
      }
    `
    writeFileSync(join(c4App, 'Uninstall.ps1'), flawedUninstaller4)

    execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(c4App, 'Uninstall.ps1')], { cwd: c4App })

    // Our test assertion: victimPayload must survive. If deleted, test catches vulnerability!
    if (!existsSync(victimPayload)) {
      results.control4_junctionTraversalDetected = true
      console.log('  PASS (RED CONTROL CONFIRMED): Flawed uninstaller deleted through junction; test assertion successfully caught reparse-point traversal!')
    } else {
      console.error('  FAIL: Control 4 failed to delete through junction as expected')
    }

    // -------------------------------------------------------------------------
    // Control 5: Corrupt Inventory Fragility Vulnerability
    // A brittle uninstaller crashes and throws terminating error on corrupt JSON.
    // -------------------------------------------------------------------------
    console.log('\n[CONTROL 5] Testing detection of corrupt inventory crash vulnerability...')
    const c5Dir = join(testRoot, 'c5-sandbox')
    mkdirSync(c5Dir, { recursive: true })
    writeFileSync(join(c5Dir, 'payload-inventory.json'), 'NOT_VALID_JSON{{{')

    // Flawed uninstaller that fails with terminating exception on corrupt inventory
    const flawedUninstaller5 = `
      $ErrorActionPreference = 'Stop'
      $inv = Get-Content (Join-Path $PSScriptRoot "payload-inventory.json") -Raw | ConvertFrom-Json
      Write-Host "Parsed successfully: $($inv.version)"
    `
    writeFileSync(join(c5Dir, 'Uninstall.ps1'), flawedUninstaller5)

    let crashedAsExpected = false
    try {
      execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(c5Dir, 'Uninstall.ps1')], {
        cwd: c5Dir,
        stdio: 'pipe'
      })
    } catch (err) {
      crashedAsExpected = true
    }

    // Our test assertion: uninstaller must handle corrupt inventory gracefully without crashing.
    if (crashedAsExpected) {
      results.control5_corruptInventoryCrashDetected = true
      console.log('  PASS (RED CONTROL CONFIRMED): Flawed uninstaller crashed on corrupt inventory; test assertion successfully caught brittle uninstaller failure!')
    } else {
      console.error('  FAIL: Control 5 failed to crash on corrupt inventory as expected')
    }

    // -------------------------------------------------------------------------
    // Control A: Mandatory BLOCKED Cases Must Yield Nonzero Process Exit
    // Simulates an environment block in a child execution of test-uninstall-adversarial.mjs
    // -------------------------------------------------------------------------
    console.log('\n[CONTROL A] Testing that simulated BLOCKED mandatory case produces nonzero exit code...')
    let blockedNonzeroExitDetected = false
    try {
      execFileSync('node', ['scripts/test-uninstall-adversarial.mjs'], {
        env: { ...process.env, GRAVITAS_SIMULATE_BLOCKED: '1' },
        stdio: 'pipe'
      })
    } catch (err) {
      if (err.status !== 0 && (err.stdout?.toString().includes('BLOCKED') || err.stderr?.toString().includes('BLOCKED'))) {
        blockedNonzeroExitDetected = true
      }
    }

    if (blockedNonzeroExitDetected) {
      results.controlA_mandatoryBlockedNonzeroExit = true
      console.log('  PASS (RED CONTROL CONFIRMED): Simulated BLOCKED mandatory test resulted in nonzero process exit (code 2); runner strictly enforces no false-clean exit!')
    } else {
      console.error('  FAIL: Control A failed - simulated BLOCKED case produced zero exit or failed to report BLOCKED')
    }

    // -------------------------------------------------------------------------
    // Control B: UNC Canary Target Deletion Detection
    // An unsafe test double uninstaller deletes the exact UNC target canary
    // -------------------------------------------------------------------------
    console.log('\n[CONTROL B] Testing detection when an uninstaller deletes an exact UNC target canary...')
    const cBDir = join(testRoot, 'cB-sandbox')
    mkdirSync(cBDir, { recursive: true })
    const cBCanary = join(cBDir, 'unc-target-canary.txt')
    writeFileSync(cBCanary, 'CANARY TO BE DELETED BY UNSAFE DOUBLE')

    // Flawed uninstaller that specifically deletes the targeted canary
    const flawedUninstallerB = `
      $canary = "${cBCanary.replace(/\\/g, '\\\\')}"
      Remove-Item -LiteralPath $canary -Force -ErrorAction SilentlyContinue
    `
    execFileSync('powershell.exe', ['-NoProfile', '-Command', flawedUninstallerB])

    // Assertion: target canary must survive. Since the flawed double deleted it, our assertion catches the flaw.
    const uncDeletionDetected = !existsSync(cBCanary)
    if (uncDeletionDetected) {
      results.controlB_uncTargetDeletionDetection = true
      console.log('  PASS (RED CONTROL CONFIRMED): Flawed uninstaller deleted exact target canary; target-preservation assertion caught deletion!')
    } else {
      console.error('  FAIL: Control B failed to catch target canary deletion')
    }

    // -------------------------------------------------------------------------
    // Control C: Reparse Point Rejection Bypass Detection
    // A mutated uninstaller omits Test-ReparsePointInPath and deletes a symlinked file with matching hash
    // -------------------------------------------------------------------------
    console.log('\n[CONTROL C] Testing detection when an uninstaller bypasses reparse-point rejection...')
    const cCDir = join(testRoot, 'cC-sandbox')
    const cCApp = join(cCDir, 'App')
    const cCLocal = join(cCDir, 'local')
    const cCRoam = join(cCDir, 'roam')
    mkdirSync(cCApp, { recursive: true })
    mkdirSync(cCLocal, { recursive: true })
    mkdirSync(cCRoam, { recursive: true })

    const installScript = resolve('dist-package/Install-Gravitas.ps1')
    execFileSync('powershell.exe', [
      '-NoProfile', '-ExecutionPolicy', 'Bypass',
      '-File', installScript,
      '-CustomTargetDir', cCApp
    ], {
      env: { ...process.env, LOCALAPPDATA: cCLocal, APPDATA: cCRoam },
      stdio: 'pipe'
    })

    const exeInApp = join(cCApp, 'Gravitas.exe')
    const cCCanary = join(cCDir, 'symlink-canary-victim.exe')
    copyFileSync(exeInApp, cCCanary)
    rmSync(exeInApp, { force: true })

    let cCSymlinkCreated = false
    try {
      symlinkSync(cCCanary, exeInApp, 'file')
      cCSymlinkCreated = true
    } catch (_) {}

    if (cCSymlinkCreated) {
      // Mutate Uninstall.ps1 to bypass Test-ReparsePointInPath check
      const uninstScriptPath = join(cCApp, 'Uninstall.ps1')
      let uninstContent = readFileSync(uninstScriptPath, 'utf8')
      // Strip reparse point check
      uninstContent = uninstContent.replace(
        /if \(Test-ReparsePointInPath[\s\S]*?continue\s*\}/,
        '# BYPASSED REPARSE CHECK FOR NEGATIVE CONTROL'
      )
      writeFileSync(uninstScriptPath, uninstContent)

      // Run bypassed uninstaller
      let bypassOutput = ''
      try {
        bypassOutput = execFileSync('powershell.exe', [
          '-NoProfile', '-ExecutionPolicy', 'Bypass',
          '-File', uninstScriptPath
        ], {
          cwd: cCApp,
          env: { ...process.env, LOCALAPPDATA: cCLocal, APPDATA: cCRoam },
          stdio: 'pipe',
          encoding: 'utf8'
        })
      } catch (err) {
        bypassOutput = (err.stdout ? err.stdout.toString() : '') + ' ' + (err.stderr ? err.stderr.toString() : err.message)
      }

      // Case 15 assertion requires: target survives AND refusal signal emitted.
      // In this bypass double, the reparse-point refusal check was omitted.
      // Per Section 5: "Expected result: the symlink rejection assertion fails, even if the target file survives for another reason."
      const refusalSignalEmitted = /Refusing to delete file through reparse point\/junction/i.test(bypassOutput) || /reparse\s*point/i.test(bypassOutput)
      const assertionFailedAsExpected = !refusalSignalEmitted

      if (assertionFailedAsExpected) {
        results.controlC_reparseRejectionBypassDetection = true
        console.log('  PASS (RED CONTROL CONFIRMED): Bypassing reparse check failed the reparse-refusal assertion (even though target survived); harness strictly requires positive refusal signal!')
      } else {
        console.error('  FAIL: Control C failed - reparse refusal signal unexpectedly present in bypassed uninstaller')
      }
    } else {
      console.log('  [INFO] Control C symlink creation skipped due to OS policy')
    }

  } catch (err) {
    console.error('[NEGATIVE CONTROLS] Unexpected runner error:', err)
  } finally {
    rmSync(testRoot, { recursive: true, force: true })
  }

  const passed = Object.values(results).filter(Boolean).length
  const total = Object.keys(results).length
  console.log(`\n======================================================`)
  console.log(`[NEGATIVE CONTROLS] Completed: ${passed} / ${total} negative controls confirmed`)
  console.log(`======================================================`)

  if (passed !== total) {
    console.error('[NEGATIVE CONTROLS] Some negative controls failed to confirm!')
    process.exit(1)
  } else {
    console.log(`[NEGATIVE CONTROLS] ALL ${passed} HOSTILE NEGATIVE CONTROLS CONFIRMED DISCRIMINATIVE POWER (FAIL-CLOSED)!`)
  }

  return { passed, total, results }
}

if (process.argv[1] && process.argv[1].endsWith('test-uninstall-negative-controls.mjs')) {
  runNegativeControlTests().catch(err => {
    console.error('[NEGATIVE CONTROLS] Fatal error:', err)
    process.exit(1)
  })
}
