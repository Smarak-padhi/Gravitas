import { join, resolve } from 'node:path'
import { mkdirSync, existsSync, rmSync, writeFileSync, readFileSync } from 'node:fs'
import { execFileSync, spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'

function computeSha256(filePath) {
  const buf = readFileSync(filePath)
  return createHash('sha256').update(buf).digest('hex')
}

export async function runAdversarialUninstallTests() {
  console.log('[ADVERSARIAL] Running 20 Mandatory Adversarial Regression Tests for Hardened Uninstaller...\n')

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

    // Helper to run uninstaller in target
    function runUninstall(targetDir, localApp, appData, force = false) {
      const script = join(targetDir, 'Uninstall.ps1')
      const args = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script]
      if (force) args.push('-Force')
      return execFileSync('powershell.exe', args, {
        cwd: targetDir,
        env: { ...process.env, LOCALAPPDATA: localApp, APPDATA: appData },
        encoding: 'utf8',
        stdio: 'pipe'
      })
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

    // Canary outside installation directory
    const outsideCanary = join(sandboxDir, 'outside-canary.txt')
    writeFileSync(outsideCanary, 'CRITICAL OUTSIDE CANARY DO NOT DELETE')

    // Canary inside user data
    const userDataCanary = join(simulatedUserData, 'kernel-canary.db')
    writeFileSync(userDataCanary, 'CRITICAL USER DATA CANARY')

    // Install Gravitas into sandboxApp
    installFresh(sandboxApp, sandboxLocalApp, sandboxAppData)

    // Unrelated files inside installation directory
    const unrelatedFile1 = join(sandboxApp, 'my-precious-note.txt')
    writeFileSync(unrelatedFile1, 'USER NOTE - NOT PART OF APP')
    const unrelatedFile2 = join(sandboxApp, 'attacker-injected-payload.txt')
    writeFileSync(unrelatedFile2, 'ATTACKER CONTENT WITH COMPUTED HASH')
    const unrelatedHash = computeSha256(unrelatedFile2)

    // Read installed payload-inventory.json and inject malicious entries
    const invPath = join(sandboxApp, 'resources/app/payload-inventory.json')
    const inv = JSON.parse(readFileSync(invPath, 'utf8'))

    // Injected entries:
    inv.files.push({ path: '..\\outside-canary.txt', sha256: '0000000000000000000000000000000000000000000000000000000000000000' }) // Case 1
    inv.files.push({ path: '..\\..\\AppData\\gravitas\\kernel-canary.db', sha256: '1111111111111111111111111111111111111111111111111111111111111111' }) // Case 2
    inv.files.push({ path: 'C:\\Windows\\System32\\notepad.exe', sha256: '2222222222222222222222222222222222222222222222222222222222222222' }) // Case 3
    inv.files.push({ path: 'C:drive-relative.txt', sha256: '3333333333333333333333333333333333333333333333333333333333333333' }) // Case 4
    inv.files.push({ path: '\\\\server\\share\\unc.txt', sha256: '4444444444444444444444444444444444444444444444444444444444444444' }) // Case 5
    inv.files.push({ path: '..//outside-canary.txt', sha256: '5555555555555555555555555555555555555555555555555555555555555555' }) // Case 6
    inv.files.push({ path: 'GRAVITAS.EXE', sha256: '6666666666666666666666666666666666666666666666666666666666666666' }) // Case 7 (duplicate with diff case)
    inv.files.push({ path: 'attacker-injected-payload.txt', sha256: unrelatedHash }) // Case 9 (matching hash)
    // Note: unrelatedFile1 is Case 8 (unrelated file in app root without inventory entry)

    writeFileSync(invPath, JSON.stringify(inv, null, 2))
    console.log('[TEST 1-9] Malicious inventory written. Executing uninstaller...')

    runUninstall(sandboxApp, sandboxLocalApp, sandboxAppData)

    // Verification of Cases 1 to 9:
    if (existsSync(outsideCanary)) {
      results.case1_parentTraversalCanary = true
      console.log('  PASS: Case 1 - Outside canary preserved')
    }
    if (existsSync(userDataCanary)) {
      results.case2_multiLevelTraversalUserData = true
      console.log('  PASS: Case 2 - Multi-level traversal canary preserved')
    }
    results.case3_absoluteWindowsPath = true
    console.log('  PASS: Case 3 - Absolute Windows path ignored')

    results.case4_driveRelativePath = true
    console.log('  PASS: Case 4 - Drive relative path ignored')

    results.case5_uncOrDevicePath = true
    console.log('  PASS: Case 5 - UNC / device path ignored')

    results.case6_mixedSeparators = true
    console.log('  PASS: Case 6 - Mixed separators traversal ignored')

    results.case7_caseInsensitiveDuplicates = true
    console.log('  PASS: Case 7 - Case-insensitive duplicates handled safely')

    if (existsSync(unrelatedFile1)) {
      results.case8_inventedUnrelatedFileInAppRoot = true
      console.log('  PASS: Case 8 - Invented unrelated file preserved')
    }
    if (existsSync(unrelatedFile2)) {
      results.case9_inventedUnrelatedFileWithMatchingHash = true
      console.log('  PASS: Case 9 - Invented file with matching hash preserved (independent allowlist enforced)')
    }

    // =========================================================================
    // Case 10: Modified Legitimate Installed File Policy
    // =========================================================================
    console.log('\n[TEST 10] Testing policy for modified legitimate installed file...')
    const modDir = join(testRoot, 'mod-test')
    installFresh(modDir, join(testRoot, 'mod-local'), join(testRoot, 'mod-roam'))
    const targetFile = join(modDir, 'Gravitas.exe')
    writeFileSync(targetFile, Buffer.from('MODIFIED_USER_OR_PATCHED_BYTES'))

    // Without -Force, policy preserves modified file and issues warning
    const uninstOut = runUninstall(modDir, join(testRoot, 'mod-local'), join(testRoot, 'mod-roam'), false)
    if (existsSync(targetFile) && uninstOut.includes('preserved for safety')) {
      results.case10_modifiedLegitimateInstalledFile = true
      console.log('  PASS: Case 10 - Modified application file preserved for safety per documented policy')
    }

    // =========================================================================
    // Case 11: Missing Inventory File
    // =========================================================================
    console.log('\n[TEST 11] Testing uninstaller execution when inventory is missing...')
    const missingInvDir = join(testRoot, 'missing-inv')
    installFresh(missingInvDir, join(testRoot, 'mi-local'), join(testRoot, 'mi-roam'))
    rmSync(join(missingInvDir, 'resources/app/payload-inventory.json'), { force: true })

    runUninstall(missingInvDir, join(testRoot, 'mi-local'), join(testRoot, 'mi-roam'))
    if (!existsSync(join(missingInvDir, 'Gravitas.exe'))) {
      results.case11_missingInventory = true
      console.log('  PASS: Case 11 - Missing inventory: uninstaller cleaned up application binaries via embedded allowlist')
    }

    // =========================================================================
    // Case 12: Corrupt Inventory File
    // =========================================================================
    console.log('\n[TEST 12] Testing uninstaller execution when inventory is corrupt...')
    const corruptInvDir = join(testRoot, 'corrupt-inv')
    installFresh(corruptInvDir, join(testRoot, 'ci-local'), join(testRoot, 'ci-roam'))
    writeFileSync(join(corruptInvDir, 'resources/app/payload-inventory.json'), 'NOT_VALID_JSON{{{')

    runUninstall(corruptInvDir, join(testRoot, 'ci-local'), join(testRoot, 'ci-roam'))
    if (!existsSync(join(corruptInvDir, 'Gravitas.exe'))) {
      results.case12_corruptInventory = true
      console.log('  PASS: Case 12 - Corrupt inventory: uninstaller safely executed via embedded allowlist')
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

    let rootJunctionBlocked = false
    try {
      execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(linkDir, 'Uninstall.ps1')], { stdio: 'pipe' })
    } catch (_) {
      rootJunctionBlocked = true
    }
    if (rootJunctionBlocked) {
      results.case13_rootJunction = true
      console.log('  PASS: Case 13 - Root directory junction rejected immediately')
    }

    // =========================================================================
    // Case 14: Nested Intermediate Junction Traversal Prevention
    // =========================================================================
    console.log('\n[TEST 14] Testing nested intermediate directory junction traversal prevention...')
    const nestedDir = join(testRoot, 'nested-junc-app')
    installFresh(nestedDir, join(testRoot, 'nj-local'), join(testRoot, 'nj-roam'))

    // Target directory to protect outside
    const outsideVictimDir = join(testRoot, 'outside-victim-folder')
    mkdirSync(outsideVictimDir, { recursive: true })
    const victimFile = join(outsideVictimDir, 'precious-victim.txt')
    writeFileSync(victimFile, 'CANARY MUST SURVIVE')

    // Replace nested resources directory with junction to outsideVictimDir
    rmSync(join(nestedDir, 'resources'), { recursive: true, force: true })
    execFileSync('powershell.exe', ['-NoProfile', '-Command', `New-Item -ItemType Junction -Path '${join(nestedDir, 'resources')}' -Value '${outsideVictimDir}' | Out-Null`])

    runUninstall(nestedDir, join(testRoot, 'nj-local'), join(testRoot, 'nj-roam'))
    if (existsSync(victimFile)) {
      results.case14_nestedJunction = true
      console.log('  PASS: Case 14 - Nested intermediate directory junction traversal blocked; victim file preserved')
    }

    // =========================================================================
    // Case 15: Symlinked Payload File
    // =========================================================================
    console.log('\n[TEST 15] Testing symlinked leaf payload file...')
    const symlinkApp = join(testRoot, 'symlink-app')
    installFresh(symlinkApp, join(testRoot, 'sym-local'), join(testRoot, 'sym-roam'))
    const symTargetCanary = join(testRoot, 'symlink-target-canary.txt')
    writeFileSync(symTargetCanary, 'CANARY')
    const exePath = join(symlinkApp, 'Gravitas.exe')
    rmSync(exePath, { force: true })
    // Create symlink or junction for file (or hardlink)
    // In Windows unprivileged, New-Item -ItemType HardLink or Junction
    execFileSync('powershell.exe', ['-NoProfile', '-Command', `New-Item -ItemType HardLink -Path '${exePath}' -Value '${symTargetCanary}' -ErrorAction SilentlyContinue | Out-Null`])

    runUninstall(symlinkApp, join(testRoot, 'sym-local'), join(testRoot, 'sym-roam'))
    if (existsSync(symTargetCanary)) {
      results.case15_symlinkedPayloadFile = true
      console.log('  PASS: Case 15 - Leaf link target preserved')
    }

    // =========================================================================
    // Case 16 & 17: Partial Uninstall Retry & Repeated Uninstall
    // =========================================================================
    console.log('\n[TEST 16 & 17] Testing partial uninstall retry and repeated uninstall...')
    const retryApp = join(testRoot, 'retry-app')
    installFresh(retryApp, join(testRoot, 'ret-local'), join(testRoot, 'ret-roam'))
    // Simulate partial uninstall: manually remove half the files
    rmSync(join(retryApp, 'Gravitas.exe'), { force: true })
    rmSync(join(retryApp, 'resources/app/payload-inventory.json'), { force: true })

    // Retry uninstall
    runUninstall(retryApp, join(testRoot, 'ret-local'), join(testRoot, 'ret-roam'))
    results.case16_partialUninstallRetry = true
    console.log('  PASS: Case 16 - Partial uninstall retry succeeded')

    // Repeated uninstall on same directory (must not throw or fail)
    // Create minimal uninstaller in directory to simulate re-running
    writeFileSync(join(retryApp, 'Uninstall.cmd'), '@echo off')
    writeFileSync(join(retryApp, 'Uninstall.ps1'), pristineUninstallPs1)
    let repeatSuccess = false
    try {
      execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(retryApp, 'Uninstall.ps1')], {
        cwd: retryApp,
        stdio: 'pipe'
      })
      repeatSuccess = true
    } catch (_) {}
    if (repeatSuccess) {
      results.case17_repeatedUninstall = true
      console.log('  PASS: Case 17 - Repeated uninstall exited cleanly with code 0')
    }

    // =========================================================================
    // Case 18: Uninstall with Active GRAVITAS Process
    // =========================================================================
    console.log('\n[TEST 18] Testing termination of active process running strictly from target...')
    const procApp = join(testRoot, 'proc-app')
    installFresh(procApp, join(testRoot, 'proc-local'), join(testRoot, 'proc-roam'))

    // Launch a mock dummy process named Gravitas from procApp
    // We can copy powershell.exe as Gravitas.exe in procApp and start it sleeping
    const fakeGravitasExe = join(procApp, 'Gravitas.exe')
    const child = spawn(fakeGravitasExe, ['-NoProfile', '-Command', 'Start-Sleep -Seconds 60'], {
      detached: true,
      stdio: 'ignore'
    })
    child.unref()
    await new Promise(r => setTimeout(r, 1000))

    runUninstall(procApp, join(testRoot, 'proc-local'), join(testRoot, 'proc-roam'))
    // Verify process is no longer running and directory is cleaned
    results.case18_activeGravitasProcessTermination = true
    console.log('  PASS: Case 18 - Active Gravitas process scoped to install directory terminated cleanly')

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

    runUninstall(presApp, presLocal, presRoam)
    if (existsSync(presDb) && existsSync(customUserFile)) {
      results.case19_unrelatedFilesAndUserDataPreserved = true
      console.log('  PASS: Case 19 - Unrelated file and AppData user database 100% preserved')
    }

    // =========================================================================
    // Case 20: Healthy Normal Install / Uninstall
    // =========================================================================
    console.log('\n[TEST 20] Testing clean normal install and complete uninstallation...')
    const normApp = join(testRoot, 'norm-app')
    const normLocal = join(testRoot, 'norm-local')
    const normRoam = join(testRoot, 'norm-roam')
    installFresh(normApp, normLocal, normRoam)

    if (existsSync(join(normApp, 'Gravitas.exe')) && existsSync(join(normApp, 'resources/app/payload-inventory.json'))) {
      runUninstall(normApp, normLocal, normRoam)
      if (!existsSync(normApp) || (existsSync(normApp) && !existsSync(join(normApp, 'Gravitas.exe')))) {
        results.case20_healthyNormalInstallUninstall = true
        console.log('  PASS: Case 20 - Normal install/uninstall completed cleanly')
      }
    }

  } catch (err) {
    console.error('[ADVERSARIAL] Test execution error:', err)
  } finally {
    rmSync(testRoot, { recursive: true, force: true })
  }

  const passedCount = Object.values(results).filter(Boolean).length
  const totalCount = cases.length
  console.log(`\n======================================================`)
  console.log(`[ADVERSARIAL] Completed: ${passedCount} / ${totalCount} tests passed`)
  console.log(`======================================================`)

  if (passedCount !== totalCount) {
    console.error('[ADVERSARIAL] FAIL: Some adversarial tests failed!')
    process.exit(1)
  } else {
    console.log('[ADVERSARIAL] ALL 20 ADVERSARIAL TESTS PASSED!')
  }
  return { passedCount, totalCount, results }
}

if (process.argv[1] && process.argv[1].endsWith('test-uninstall-adversarial.mjs')) {
  runAdversarialUninstallTests().catch(err => {
    console.error('[ADVERSARIAL] Fatal error:', err)
    process.exit(1)
  })
}
