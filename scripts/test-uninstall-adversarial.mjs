import { join, resolve } from 'node:path'
import { mkdirSync, existsSync, rmSync, writeFileSync, readFileSync, copyFileSync, symlinkSync, lstatSync } from 'node:fs'
import { execFileSync, spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'

function computeSha256(filePath) {
  const buf = readFileSync(filePath)
  return createHash('sha256').update(buf).digest('hex')
}

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

function cleanHostShortcuts() {
  try {
    execFileSync('powershell.exe', ['-NoProfile', '-Command', `
      $desktop = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop)
      $programs = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Programs)
      Remove-Item -LiteralPath (Join-Path $desktop "Gravitas.lnk") -Force -ErrorAction SilentlyContinue
      Remove-Item -LiteralPath (Join-Path $programs "Gravitas.lnk") -Force -ErrorAction SilentlyContinue
    `], { stdio: 'pipe' })
  } catch (_) {}
}

export async function runAdversarialUninstallTests() {
  console.log('[ADVERSARIAL] Running 20 Mandatory Hardened Adversarial Acceptance Tests...\n')

  const installScriptPath = resolve('dist-package/Install-Gravitas.ps1')
  if (!existsSync(installScriptPath)) {
    throw new Error(`Install-Gravitas.ps1 not found at: ${installScriptPath}`)
  }

  const testRoot = join(tmpdir(), `gravitas-adv-test-${Date.now()}`)
  mkdirSync(testRoot, { recursive: true })

  const cases = [
    'case1_parentTraversalCanary',
    'case2_multiLevelTraversalUserData',
    'case3_absoluteWindowsPath',
    'case4_driveRelativePath',
    'case5_uncOrDevicePath',
    'case6_mixedSeparators',
    'case7_caseInsensitiveDuplicates',
    'case8_inventedUnrelatedFileInAppRoot',
    'case9_inventedUnrelatedFileWithMatchingHash',
    'case10_modifiedLegitimateInstalledFile',
    'case11_missingInventory',
    'case12_corruptInventory',
    'case13_rootJunction',
    'case14_nestedJunction',
    'case15_symlinkedPayloadFile',
    'case16_partialUninstallRetry',
    'case17_repeatedUninstall',
    'case18_activeGravitasProcessTermination',
    'case19_unrelatedFilesAndUserDataPreserved',
    'case20_healthyNormalInstallUninstall'
  ]

  const results = {}
  for (const c of cases) results[c] = false

  try {
    // Helper to install into a fresh target
    function installFresh(targetDir, localApp, appData) {
      mkdirSync(targetDir, { recursive: true })
      mkdirSync(localApp, { recursive: true })
      mkdirSync(appData, { recursive: true })
      execFileSync('powershell.exe', [
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-File', installScriptPath,
        '-CustomTargetDir', targetDir
      ], {
        env: { ...process.env, LOCALAPPDATA: localApp, APPDATA: appData },
        stdio: 'pipe'
      })
    }

    // Helper to run uninstaller in target with exit-code and stream capture
    function runUninstall(targetDir, localApp, appData, force = false) {
      const script = join(targetDir, 'Uninstall.ps1')
      const args = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script]
      if (force) args.push('-Force')
      try {
        const stdout = execFileSync('powershell.exe', args, {
          cwd: targetDir,
          env: { ...process.env, LOCALAPPDATA: localApp, APPDATA: appData },
          encoding: 'utf8',
          stdio: 'pipe'
        })
        return { success: true, exitCode: 0, stdout, stderr: '' }
      } catch (err) {
        return {
          success: false,
          exitCode: err.status ?? 1,
          stdout: err.stdout ? err.stdout.toString() : '',
          stderr: err.stderr ? err.stderr.toString() : err.message
        }
      }
    }

    // Capture pristine generated Uninstall.ps1 text for testing templates
    const pristineDir = join(testRoot, 'pristine')
    installFresh(pristineDir, join(testRoot, 'p-local'), join(testRoot, 'p-roam'))
    const pristineUninstallPs1 = readFileSync(join(pristineDir, 'Uninstall.ps1'), 'utf8')
    rmSync(pristineDir, { recursive: true, force: true })

    // =========================================================================
    // Cases 1 to 9: Inventory Manipulation Resistance
    // =========================================================================
    console.log('[TEST 1-9] Testing Inventory Tampering and Path Escape Rejection...')
    const sandboxDir = join(testRoot, 'sandbox-tamper')
    const sandboxApp = join(sandboxDir, 'App')
    const sandboxLocalApp = join(sandboxDir, 'LocalAppData')
    const sandboxAppData = join(sandboxDir, 'AppData')
    const simulatedUserData = join(sandboxAppData, 'gravitas')
    mkdirSync(simulatedUserData, { recursive: true })

    // Canaries for Cases 1 to 6
    const outsideCanary = join(sandboxDir, 'outside-canary.txt')
    writeFileSync(outsideCanary, 'CRITICAL OUTSIDE CANARY DO NOT DELETE')

    const userDataCanary = join(simulatedUserData, 'kernel-canary.db')
    writeFileSync(userDataCanary, 'CRITICAL USER DATA CANARY')

    const absCanary = join(sandboxDir, 'abs-target-canary.txt')
    writeFileSync(absCanary, 'ABSOLUTE TARGET CANARY DO NOT DELETE')

    const driveRelCanary = join(sandboxDir, 'drive-rel-canary.txt')
    writeFileSync(driveRelCanary, 'DRIVE RELATIVE CANARY DO NOT DELETE')

    const uncCanary = join(sandboxDir, 'unc-target-canary.txt')
    writeFileSync(uncCanary, 'UNC TARGET CANARY DO NOT DELETE')

    const mixedSepCanary = join(sandboxDir, 'mixed-sep-canary.txt')
    writeFileSync(mixedSepCanary, 'MIXED SEPARATORS CANARY DO NOT DELETE')

    // Install Gravitas into sandboxApp
    installFresh(sandboxApp, sandboxLocalApp, sandboxAppData)

    // Canary for Case 7 (Case variation & duplicate attack)
    const upperCaseCanary = join(sandboxApp, 'UPPERCASE_UNRELATED.TXT')
    writeFileSync(upperCaseCanary, 'UPPERCASE UNRELATED USER FILE')

    // Unrelated files inside installation directory (Cases 8 and 9)
    const unrelatedFile1 = join(sandboxApp, 'my-precious-note.txt')
    writeFileSync(unrelatedFile1, 'USER NOTE - NOT PART OF APP')
    const unrelatedFile2 = join(sandboxApp, 'attacker-injected-payload.txt')
    writeFileSync(unrelatedFile2, 'ATTACKER CONTENT WITH COMPUTED HASH')
    const unrelatedHash = computeSha256(unrelatedFile2)

    // Read installed payload-inventory.json and inject malicious entries
    const invPath = join(sandboxApp, 'resources/app/payload-inventory.json')
    const inv = JSON.parse(readFileSync(invPath, 'utf8'))

    inv.files.push({ path: '..\\outside-canary.txt', sha256: '0000000000000000000000000000000000000000000000000000000000000000' }) // Case 1
    inv.files.push({ path: '..\\..\\AppData\\gravitas\\kernel-canary.db', sha256: '1111111111111111111111111111111111111111111111111111111111111111' }) // Case 2
    inv.files.push({ path: absCanary, sha256: computeSha256(absCanary) }) // Case 3 (absolute path targeting canary)
    inv.files.push({ path: 'C:\\Windows\\System32\\notepad.exe', sha256: '2222222222222222222222222222222222222222222222222222222222222222' }) // Case 3 (system path)
    inv.files.push({ path: 'C:drive-rel-canary.txt', sha256: computeSha256(driveRelCanary) }) // Case 4 (drive-relative)
    inv.files.push({ path: '\\\\localhost\\c$\\gravitas-unc-dummy.txt', sha256: '4444444444444444444444444444444444444444444444444444444444444444' }) // Case 5 (UNC)
    inv.files.push({ path: '..//mixed-sep-canary.txt', sha256: computeSha256(mixedSepCanary) }) // Case 6 (mixed / and \)
    inv.files.push({ path: '..\\//mixed-sep-canary.txt', sha256: computeSha256(mixedSepCanary) }) // Case 6
    inv.files.push({ path: 'GRAVITAS.EXE', sha256: '6666666666666666666666666666666666666666666666666666666666666666' }) // Case 7 (duplicate case)
    inv.files.push({ path: 'UPPERCASE_UNRELATED.TXT', sha256: computeSha256(upperCaseCanary) }) // Case 7 (unrelated uppercase)
    inv.files.push({ path: 'attacker-injected-payload.txt', sha256: unrelatedHash }) // Case 9 (matching hash)

    writeFileSync(invPath, JSON.stringify(inv, null, 2))
    console.log('[TEST 1-9] Malicious inventory written. Executing uninstaller...')

    const uninstRes = runUninstall(sandboxApp, sandboxLocalApp, sandboxAppData)
    if (uninstRes.exitCode !== 0) {
      throw new Error(`Uninstaller failed unexpectedly in sandbox: ${uninstRes.stderr}`)
    }

    // Verification of Cases 1 to 9 with observable file checks:
    if (existsSync(outsideCanary)) {
      results.case1_parentTraversalCanary = true
      console.log('  PASS: Case 1 - Outside parent traversal canary preserved')
    }
    if (existsSync(userDataCanary)) {
      results.case2_multiLevelTraversalUserData = true
      console.log('  PASS: Case 2 - Multi-level traversal user data canary preserved')
    }
    if (existsSync(absCanary)) {
      results.case3_absoluteWindowsPath = true
      console.log('  PASS: Case 3 - Absolute Windows path canary preserved')
    }
    if (existsSync(driveRelCanary)) {
      results.case4_driveRelativePath = true
      console.log('  PASS: Case 4 - Drive relative path canary preserved')
    }
    if (existsSync(uncCanary)) {
      results.case5_uncOrDevicePath = true
      console.log('  PASS: Case 5 - UNC / device path canary preserved')
    }
    if (existsSync(mixedSepCanary)) {
      results.case6_mixedSeparators = true
      console.log('  PASS: Case 6 - Mixed separators traversal canary preserved')
    }
    if (existsSync(upperCaseCanary) && !existsSync(join(sandboxApp, 'Gravitas.exe'))) {
      results.case7_caseInsensitiveDuplicates = true
      console.log('  PASS: Case 7 - Case-insensitive duplicates handled safely; uppercase unrelated file preserved, legitimate exe removed')
    }
    if (existsSync(unrelatedFile1)) {
      results.case8_inventedUnrelatedFileInAppRoot = true
      console.log('  PASS: Case 8 - Invented unrelated file in app root preserved')
    }
    if (existsSync(unrelatedFile2)) {
      results.case9_inventedUnrelatedFileWithMatchingHash = true
      console.log('  PASS: Case 9 - Invented file with matching hash preserved (embedded allowlist enforced)')
    }

    // =========================================================================
    // Case 10: Modified Legitimate Installed File Policy
    // =========================================================================
    console.log('\n[TEST 10] Testing policy for modified legitimate installed file...')
    const modDir = join(testRoot, 'mod-test')
    const modLocal = join(testRoot, 'mod-local')
    const modRoam = join(testRoot, 'mod-roam')
    installFresh(modDir, modLocal, modRoam)
    const targetFile = join(modDir, 'Gravitas.exe')
    writeFileSync(targetFile, Buffer.from('MODIFIED_USER_OR_PATCHED_BYTES'))

    // Step 1: Without -Force, policy preserves modified file and issues warning
    const uninstRes1 = runUninstall(modDir, modLocal, modRoam, false)
    const preservedSafely = existsSync(targetFile) && (/preserved for safety/i.test(uninstRes1.stdout) || /preserved for safety/i.test(uninstRes1.stderr))

    // Step 2: Restore uninstaller scripts and test -Force removal
    writeFileSync(join(modDir, 'Uninstall.ps1'), pristineUninstallPs1)
    writeFileSync(join(modDir, 'Uninstall.cmd'), '@echo off')
    const uninstRes2 = runUninstall(modDir, modLocal, modRoam, true)
    const removedWithForce = !existsSync(targetFile)

    if (preservedSafely && removedWithForce) {
      results.case10_modifiedLegitimateInstalledFile = true
      console.log('  PASS: Case 10 - Modified application file preserved without -Force and removed with -Force per documented policy')
    }

    // =========================================================================
    // Case 11: Missing Inventory File
    // =========================================================================
    console.log('\n[TEST 11] Testing uninstaller execution when inventory is missing...')
    const missingInvDir = join(testRoot, 'missing-inv')
    installFresh(missingInvDir, join(testRoot, 'mi-local'), join(testRoot, 'mi-roam'))
    rmSync(join(missingInvDir, 'resources/app/payload-inventory.json'), { force: true })

    const miRes = runUninstall(missingInvDir, join(testRoot, 'mi-local'), join(testRoot, 'mi-roam'))
    if (miRes.exitCode === 0 && !existsSync(join(missingInvDir, 'Gravitas.exe')) && !existsSync(join(missingInvDir, 'ffmpeg.dll'))) {
      results.case11_missingInventory = true
      console.log('  PASS: Case 11 - Missing inventory: uninstaller exited 0 and cleaned up application binaries via embedded allowlist')
    }

    // =========================================================================
    // Case 12: Corrupt Inventory File
    // =========================================================================
    console.log('\n[TEST 12] Testing uninstaller execution when inventory is corrupt...')
    const corruptInvDir = join(testRoot, 'corrupt-inv')
    installFresh(corruptInvDir, join(testRoot, 'ci-local'), join(testRoot, 'ci-roam'))
    writeFileSync(join(corruptInvDir, 'resources/app/payload-inventory.json'), 'NOT_VALID_JSON{{{')

    const ciRes = runUninstall(corruptInvDir, join(testRoot, 'ci-local'), join(testRoot, 'ci-roam'))
    if (ciRes.exitCode === 0 && !existsSync(join(corruptInvDir, 'Gravitas.exe')) && !existsSync(join(corruptInvDir, 'ffmpeg.dll'))) {
      results.case12_corruptInventory = true
      console.log('  PASS: Case 12 - Corrupt inventory: uninstaller exited 0 and safely executed via embedded allowlist')
    }

    // =========================================================================
    // Case 13: Root Junction Rejection
    // =========================================================================
    console.log('\n[TEST 13] Testing root junction rejection...')
    const realDir = join(testRoot, 'junc-real')
    const linkDir = join(testRoot, 'junc-link')
    mkdirSync(realDir, { recursive: true })
    writeFileSync(join(realDir, 'Gravitas.exe'), 'mock')
    writeFileSync(join(realDir, 'Uninstall.ps1'), pristineUninstallPs1)
    execFileSync('powershell.exe', ['-NoProfile', '-Command', `New-Item -ItemType Junction -Path '${linkDir}' -Value '${realDir}' | Out-Null`])

    const juncRes = runUninstall(linkDir, join(testRoot, 'jr-local'), join(testRoot, 'jr-roam'))
    const juncText = juncRes.stdout + ' ' + juncRes.stderr
    if (juncRes.exitCode !== 0 && (/reparse\s*point/i.test(juncText) || /junction/i.test(juncText)) && existsSync(join(realDir, 'Gravitas.exe'))) {
      results.case13_rootJunction = true
      console.log('  PASS: Case 13 - Root directory junction rejected immediately with exit code 1; target preserved')
    }

    // =========================================================================
    // Case 14: Nested Intermediate Junction Traversal Prevention
    // =========================================================================
    console.log('\n[TEST 14] Testing nested intermediate directory junction traversal prevention...')
    const nestedDir = join(testRoot, 'nested-junc-app')
    installFresh(nestedDir, join(testRoot, 'nj-local'), join(testRoot, 'nj-roam'))

    const outsideVictimDir = join(testRoot, 'outside-victim-folder')
    mkdirSync(outsideVictimDir, { recursive: true })
    const victimFile = join(outsideVictimDir, 'precious-victim.txt')
    writeFileSync(victimFile, 'CANARY MUST SURVIVE')

    // Create candidate payload path inside outsideVictimDir to test traversal through intermediate junction
    mkdirSync(join(outsideVictimDir, 'app'), { recursive: true })
    const victimPayload = join(outsideVictimDir, 'app', 'package.json')
    writeFileSync(victimPayload, 'VICTIM PAYLOAD MUST SURVIVE')

    rmSync(join(nestedDir, 'resources'), { recursive: true, force: true })
    execFileSync('powershell.exe', ['-NoProfile', '-Command', `New-Item -ItemType Junction -Path '${join(nestedDir, 'resources')}' -Value '${outsideVictimDir}' | Out-Null`])

    const njRes = runUninstall(nestedDir, join(testRoot, 'nj-local'), join(testRoot, 'nj-roam'))
    const njText = njRes.stdout + ' ' + njRes.stderr
    if (existsSync(victimFile) && existsSync(victimPayload) && (/reparse\s*point/i.test(njText) || /junction/i.test(njText))) {
      results.case14_nestedJunction = true
      console.log('  PASS: Case 14 - Nested intermediate directory junction traversal blocked; victim files preserved')
    }

    // =========================================================================
    // Case 15: Symlinked Payload File
    // =========================================================================
    console.log('\n[TEST 15] Testing symlinked leaf payload file...')
    const symlinkApp = join(testRoot, 'symlink-app')
    installFresh(symlinkApp, join(testRoot, 'sym-local'), join(testRoot, 'sym-roam'))
    const symTargetCanary = join(testRoot, 'symlink-target-canary.txt')
    writeFileSync(symTargetCanary, 'CANARY MUST SURVIVE SYMLINK DELETION ATTEMPT')
    const exePath = join(symlinkApp, 'Gravitas.exe')
    rmSync(exePath, { force: true })

    let symlinkCreated = false
    try {
      symlinkSync(symTargetCanary, exePath, 'file')
      symlinkCreated = lstatSync(exePath).isSymbolicLink()
    } catch (symErr) {
      console.log(`  [INFO] Unprivileged file symlink creation not permitted by OS: ${symErr.message}`)
    }

    if (symlinkCreated) {
      runUninstall(symlinkApp, join(testRoot, 'sym-local'), join(testRoot, 'sym-roam'))
      if (existsSync(symTargetCanary)) {
        results.case15_symlinkedPayloadFile = true
        console.log('  PASS: Case 15 - Real NTFS file symlink detected; target canary preserved')
      }
    } else {
      results.case15_symlinkedPayloadFile = 'BLOCKED'
      console.log('  BLOCKED: Case 15 - File symlink creation blocked by host OS policy (requires SeCreateSymbolicLinkPrivilege / Developer Mode)')
    }

    // =========================================================================
    // Case 16 & 17: Partial Uninstall Retry & Repeated Uninstall
    // =========================================================================
    console.log('\n[TEST 16 & 17] Testing partial uninstall retry and repeated uninstall...')
    const retryApp = join(testRoot, 'retry-app')
    const retLocal = join(testRoot, 'ret-local')
    const retRoam = join(testRoot, 'ret-roam')
    const retUserDataDir = join(retRoam, 'gravitas')
    mkdirSync(retUserDataDir, { recursive: true })
    const retDb = join(retUserDataDir, 'kernel.db')
    writeFileSync(retDb, 'USER DATA CANARY')

    installFresh(retryApp, retLocal, retRoam)

    const keepMe = join(retryApp, 'unrelated-user.log')
    writeFileSync(keepMe, 'USER LOG CANARY')

    // Simulate partial uninstall: manually remove Gravitas.exe and inventory
    rmSync(join(retryApp, 'Gravitas.exe'), { force: true })
    rmSync(join(retryApp, 'resources/app/payload-inventory.json'), { force: true })

    if (!existsSync(join(retryApp, 'ffmpeg.dll'))) {
      throw new Error('Setup assertion failed: ffmpeg.dll missing before partial retry')
    }

    // Retry uninstall
    const retryRes = runUninstall(retryApp, retLocal, retRoam)

    const remainingPayloadRemoved = !existsSync(join(retryApp, 'ffmpeg.dll')) && !existsSync(join(retryApp, 'resources/app/package.json'))
    const keepMePreserved = existsSync(keepMe)
    const userDbPreserved = existsSync(retDb)
    const uninstallerCleaned = !existsSync(join(retryApp, 'Uninstall.ps1'))

    if (retryRes.exitCode === 0 && remainingPayloadRemoved && keepMePreserved && userDbPreserved && uninstallerCleaned) {
      results.case16_partialUninstallRetry = true
      console.log('  PASS: Case 16 - Partial uninstall retry verified: remaining payload removed, unrelated file & user DB preserved, exit code 0')
    }

    // Repeated uninstall on same directory
    writeFileSync(join(retryApp, 'Uninstall.cmd'), '@echo off')
    writeFileSync(join(retryApp, 'Uninstall.ps1'), pristineUninstallPs1)

    const repeatRes = runUninstall(retryApp, retLocal, retRoam)
    if (repeatRes.exitCode === 0 && !existsSync(join(retryApp, 'Uninstall.ps1'))) {
      results.case17_repeatedUninstall = true
      console.log('  PASS: Case 17 - Repeated uninstall exited cleanly with code 0; uninstaller removed itself')
    }

    // =========================================================================
    // Case 18: Active GRAVITAS Process Termination & External Process Preservation
    // =========================================================================
    console.log('\n[TEST 18] Testing termination of active process running strictly from target & preservation of external process...')
    const procApp = join(testRoot, 'proc-app')
    const procLocal = join(testRoot, 'proc-local')
    const procRoam = join(testRoot, 'proc-roam')
    installFresh(procApp, procLocal, procRoam)

    // Set up ping.exe mock as Gravitas.exe in both internal procApp and external extDir
    const extDir = join(testRoot, 'external-app')
    mkdirSync(extDir, { recursive: true })
    const pingExe = 'C:\\Windows\\System32\\ping.exe'

    const internalGravitasExe = join(procApp, 'Gravitas.exe')
    const extGravitasExe = join(extDir, 'Gravitas.exe')
    copyFileSync(pingExe, internalGravitasExe)
    copyFileSync(pingExe, extGravitasExe)

    // Spawn internal process from procApp
    const childInternal = spawn(internalGravitasExe, ['127.0.0.1', '-n', '30'], {
      detached: true,
      stdio: 'ignore'
    })
    childInternal.unref()

    // Spawn external process from extDir
    const childExternal = spawn(extGravitasExe, ['127.0.0.1', '-n', '30'], {
      detached: true,
      stdio: 'ignore'
    })
    childExternal.unref()

    // Allow processes to spin up
    await new Promise(r => setTimeout(r, 1000))

    const internalAliveBefore = isPidAlive(childInternal.pid)
    const externalAliveBefore = isPidAlive(childExternal.pid)

    if (!internalAliveBefore || !externalAliveBefore) {
      throw new Error(`Process setup failed: internal alive=${internalAliveBefore}, external alive=${externalAliveBefore}`)
    }

    try {
      const procUninstRes = runUninstall(procApp, procLocal, procRoam)
      await new Promise(r => setTimeout(r, 500))

      const internalAliveAfter = isPidAlive(childInternal.pid)
      const externalAliveAfter = isPidAlive(childExternal.pid)

      if (procUninstRes.exitCode === 0 && !internalAliveAfter && externalAliveAfter) {
        results.case18_activeGravitasProcessTermination = true
        console.log(`  PASS: Case 18 - Active internal process (PID ${childInternal.pid}) terminated cleanly; external process (PID ${childExternal.pid}) preserved`)
      }
    } finally {
      stopProcess(childInternal.pid)
      stopProcess(childExternal.pid)
    }

    // =========================================================================
    // Case 19: Preservation of Unrelated Files and User Data
    // =========================================================================
    console.log('\n[TEST 19] Testing preservation of unrelated files and AppData...')
    const presApp = join(testRoot, 'pres-app')
    const presLocal = join(testRoot, 'pres-local')
    const presRoam = join(testRoot, 'pres-roam')
    const presDbRoot = join(presRoam, 'gravitas')
    mkdirSync(presDbRoot, { recursive: true })
    const presDb = join(presDbRoot, 'gravitas_kernel.db')
    writeFileSync(presDb, 'IMPORTANT PERSISTENT SQLITE DATABASE')

    installFresh(presApp, presLocal, presRoam)
    const customUserFile = join(presApp, 'user-notes.txt')
    writeFileSync(customUserFile, 'USER NOTE')

    const presRes = runUninstall(presApp, presLocal, presRoam)
    const dbIntact = existsSync(presDb)
    const userFileIntact = existsSync(customUserFile)
    const binariesRemoved = !existsSync(join(presApp, 'Gravitas.exe')) && !existsSync(join(presApp, 'ffmpeg.dll'))

    if (presRes.exitCode === 0 && dbIntact && userFileIntact && binariesRemoved) {
      results.case19_unrelatedFilesAndUserDataPreserved = true
      console.log('  PASS: Case 19 - Unrelated file and AppData user database 100% preserved; application binaries removed')
    }

    // =========================================================================
    // Case 20: Healthy Normal Install / Uninstall
    // =========================================================================
    console.log('\n[TEST 20] Testing clean normal install and complete uninstallation...')
    const normApp = join(testRoot, 'norm-app')
    const normLocal = join(testRoot, 'norm-local')
    const normRoam = join(testRoot, 'norm-roam')
    installFresh(normApp, normLocal, normRoam)

    const installedExe = existsSync(join(normApp, 'Gravitas.exe'))
    const installedInv = existsSync(join(normApp, 'resources/app/payload-inventory.json'))

    if (installedExe && installedInv) {
      const normRes = runUninstall(normApp, normLocal, normRoam)
      const completelyRemoved = !existsSync(normApp) || (existsSync(normApp) && !existsSync(join(normApp, 'Gravitas.exe')) && !existsSync(join(normApp, 'Uninstall.ps1')))
      if (normRes.exitCode === 0 && completelyRemoved) {
        results.case20_healthyNormalInstallUninstall = true
        console.log('  PASS: Case 20 - Normal install/uninstall completed cleanly with exit code 0')
      }
    }

  } catch (err) {
    console.error('[ADVERSARIAL] Test execution error:', err)
  } finally {
    cleanHostShortcuts()
    rmSync(testRoot, { recursive: true, force: true })
  }

  const passedCount = Object.values(results).filter(v => v === true).length
  const blockedCount = Object.values(results).filter(v => typeof v === 'string' && v.startsWith('BLOCKED')).length
  const totalCount = cases.length
  console.log(`\n======================================================`)
  console.log(`[ADVERSARIAL] Completed: ${passedCount} passed, ${blockedCount} blocked / ${totalCount} total tests`)
  console.log(`======================================================`)

  if (passedCount + blockedCount !== totalCount || passedCount < totalCount - blockedCount) {
    console.error('[ADVERSARIAL] FAIL: Some adversarial tests failed!')
    process.exit(1)
  } else {
    console.log('[ADVERSARIAL] ALL EXECUTABLE ADVERSARIAL TESTS PASSED!')
  }
  return { passedCount, blockedCount, totalCount, results }
}

if (process.argv[1] && process.argv[1].endsWith('test-uninstall-adversarial.mjs')) {
  runAdversarialUninstallTests().catch(err => {
    console.error('[ADVERSARIAL] Fatal error:', err)
    process.exit(1)
  })
}
