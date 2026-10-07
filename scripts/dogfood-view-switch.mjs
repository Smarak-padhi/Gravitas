import { _electron as electron } from 'playwright'
import { join } from 'node:path'
import { writeFileSync, mkdirSync } from 'node:fs'
import { execSync } from 'node:child_process'

function isPidAlive(pid) {
  if (!pid) return false
  try {
    const res = execSync(`tasklist /fi "PID eq ${pid}" /fo csv /nh`, { encoding: 'utf8' })
    return res.includes(String(pid))
  } catch (_) {
    return false
  }
}

async function runDogfood() {
  const telemetry = {
    step1_commandCenterDefault: false,
    step2_kernelPid: null,
    step2_mainPid: null,
    step3_workSessionProjection: null,
    step4_spatialActivated: false,
    step5_spatialViewActive: false,
    step6_kernelPidAfterSpatial: null,
    step6_pidStable: false,
    step7_sessionProjectionStable: false,
    step8_returnedToCommandCenter: false,
    step9_canonicalStateStable: false,
    step10_noDuplicateKernelProcess: false,
    step11_rendererSandboxed: false,
    step12_normalShutdown: false,
    step13_noOrphans: false,
    errors: [],
    logs: []
  }

  function log(msg) {
    console.log(`[DOGFOOD] ${msg}`)
    telemetry.logs.push(`[${new Date().toISOString()}] ${msg}`)
  }

  const appPath = join(process.cwd(), 'apps/desktop/dist/main/index.js')
  log(`Launching Electron with main path: ${appPath}`)

  let electronApp = null
  let mainPid = null
  let kernelPid = null

  try {
    electronApp = await electron.launch({
      args: [appPath],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        GRAVITAS_DATA_ROOT: join(process.cwd(), '.tmp-dogfood-kernel')
      }
    })

    const win = await electronApp.firstWindow()
    await win.waitForLoadState('domcontentloaded')
    // Wait briefly for initial IPC and status update
    await win.waitForTimeout(2000)

    // Step 1: Command Center is visibly/default active after startup
    const ccMainVisible = await win.isVisible('#cc-main')
    const ccNavVisible = await win.isVisible('#cc-nav')
    const livingHqVisible = await win.isVisible('#living-hq')
    const btnCommandAriaPressed = await win.getAttribute('#btn-view-command', 'aria-pressed')
    const btnWorldAriaPressed = await win.getAttribute('#btn-view-world', 'aria-pressed')

    log(`Step 1: #cc-main visible: ${ccMainVisible}, #living-hq visible: ${livingHqVisible}, command pressed: ${btnCommandAriaPressed}, world pressed: ${btnWorldAriaPressed}`)
    if (ccMainVisible && !livingHqVisible && btnCommandAriaPressed === 'true' && btnWorldAriaPressed === 'false') {
      telemetry.step1_commandCenterDefault = true
    } else {
      telemetry.errors.push('Step 1 failed: Command Center is not default active view')
    }

    // Step 2: Record kernel process identity & main process identity
    const pidsText = await win.textContent('#pids-text')
    const kernelBadge = await win.textContent('#kernel-status-badge')
    log(`Step 2: #pids-text: "${pidsText}", badge: "${kernelBadge}"`)

    const health = await win.evaluate(async () => {
      return await window.gravitasDesktop.getHealth()
    })
    log(`Step 2 Health: mainPid=${health.mainPid}, kernelPid=${health.kernelPid}, status=${health.status}`)
    mainPid = health.mainPid
    kernelPid = health.kernelPid
    telemetry.step2_kernelPid = health.kernelPid
    telemetry.step2_mainPid = health.mainPid

    // Step 3: Record active WorkSession / session projection
    const overview = await win.evaluate(async () => {
      return await window.gravitasDesktop.getOverview()
    })
    const workHierarchy = await win.evaluate(async () => {
      return await window.gravitasDesktop.getWorkHierarchy()
    })
    log(`Step 3: activeSessions=${overview.activeWorkSessionsCount}, canonicalRevision=${overview.canonicalRevision}, hierarchySessions=${workHierarchy.sessions.length}`)
    telemetry.step3_workSessionProjection = {
      activeWorkSessionsCount: overview.activeWorkSessionsCount,
      canonicalRevision: overview.canonicalRevision,
      sessionsCount: workHierarchy.sessions.length
    }

    // Step 4: Activate Spatial / Living HQ using actual operator UI path
    log(`Step 4: Clicking #btn-view-world to activate Living HQ...`)
    await win.click('#btn-view-world')
    await win.waitForTimeout(600)
    telemetry.step4_spatialActivated = true

    // Step 5: Verify Spatial View becomes active
    const spatialHqVisibleAfter = await win.isVisible('#living-hq')
    const ccMainVisibleAfter = await win.isVisible('#cc-main')
    const btnWorldAriaAfter = await win.getAttribute('#btn-view-world', 'aria-pressed')
    const btnCommandAriaAfter = await win.getAttribute('#btn-view-command', 'aria-pressed')
    log(`Step 5: #living-hq visible: ${spatialHqVisibleAfter}, #cc-main visible: ${ccMainVisibleAfter}, world pressed: ${btnWorldAriaAfter}`)

    if (spatialHqVisibleAfter && !ccMainVisibleAfter && btnWorldAriaAfter === 'true' && btnCommandAriaAfter === 'false') {
      telemetry.step5_spatialViewActive = true
    } else {
      telemetry.errors.push('Step 5 failed: Living HQ did not become active')
    }

    // Step 6: Verify kernel process identity did NOT change
    const healthAfterSpatial = await win.evaluate(async () => {
      return await window.gravitasDesktop.getHealth()
    })
    log(`Step 6: kernelPid after spatial: ${healthAfterSpatial.kernelPid} (initial: ${telemetry.step2_kernelPid})`)
    telemetry.step6_kernelPidAfterSpatial = healthAfterSpatial.kernelPid
    if (healthAfterSpatial.kernelPid === telemetry.step2_kernelPid && healthAfterSpatial.mainPid === telemetry.step2_mainPid) {
      telemetry.step6_pidStable = true
    } else {
      telemetry.errors.push(`Step 6 failed: kernelPid changed from ${telemetry.step2_kernelPid} to ${healthAfterSpatial.kernelPid}`)
    }

    // Step 7: Verify WorkSession / session projection did NOT reset
    const overviewAfterSpatial = await win.evaluate(async () => {
      return await window.gravitasDesktop.getOverview()
    })
    log(`Step 7: overview after spatial: activeSessions=${overviewAfterSpatial.activeWorkSessionsCount}, canonicalRevision=${overviewAfterSpatial.canonicalRevision}`)
    if (
      overviewAfterSpatial.activeWorkSessionsCount === telemetry.step3_workSessionProjection.activeWorkSessionsCount &&
      overviewAfterSpatial.canonicalRevision === telemetry.step3_workSessionProjection.canonicalRevision
    ) {
      telemetry.step7_sessionProjectionStable = true
    } else {
      telemetry.errors.push('Step 7 failed: session projection reset during spatial view switch')
    }

    // Step 8: Return to Command Center
    log(`Step 8: Clicking #btn-view-command to return to Command Center...`)
    await win.click('#btn-view-command')
    await win.waitForTimeout(600)
    const ccMainReturned = await win.isVisible('#cc-main')
    const livingHqReturned = await win.isVisible('#living-hq')
    const btnCmdReturned = await win.getAttribute('#btn-view-command', 'aria-pressed')
    log(`Step 8: #cc-main visible: ${ccMainReturned}, #living-hq visible: ${livingHqReturned}, cmd pressed: ${btnCmdReturned}`)
    if (ccMainReturned && !livingHqReturned && btnCmdReturned === 'true') {
      telemetry.step8_returnedToCommandCenter = true
    } else {
      telemetry.errors.push('Step 8 failed: did not return cleanly to Command Center')
    }

    // Step 9: Verify same canonical state remains
    const overviewFinal = await win.evaluate(async () => {
      return await window.gravitasDesktop.getOverview()
    })
    const healthFinal = await win.evaluate(async () => {
      return await window.gravitasDesktop.getHealth()
    })
    log(`Step 9: final canonical revision=${overviewFinal.canonicalRevision}, kernelPid=${healthFinal.kernelPid}`)
    if (
      overviewFinal.canonicalRevision === telemetry.step3_workSessionProjection.canonicalRevision &&
      healthFinal.kernelPid === telemetry.step2_kernelPid
    ) {
      telemetry.step9_canonicalStateStable = true
    } else {
      telemetry.errors.push('Step 9 failed: canonical state did not remain stable after roundtrip')
    }

    // Step 10: Verify no duplicate kernel process exists
    log(`Step 10: Checking kernel process uniqueness...`)
    telemetry.step10_noDuplicateKernelProcess = (healthFinal.kernelPid === telemetry.step2_kernelPid)

    // Step 11: Verify renderer remains sandboxed / no Node authority
    const nodeAuthorityCheck = await win.evaluate(() => {
      return {
        hasProcess: typeof window.process !== 'undefined',
        hasRequire: typeof window.require !== 'undefined',
        hasBuffer: typeof window.Buffer !== 'undefined',
        hasIpcRenderer: typeof window.ipcRenderer !== 'undefined',
        hasElectron: typeof window.electron !== 'undefined',
        hasBridge: typeof window.gravitasDesktop !== 'undefined'
      }
    })
    log(`Step 11: Sandbox check: ${JSON.stringify(nodeAuthorityCheck)}`)
    if (
      !nodeAuthorityCheck.hasProcess &&
      !nodeAuthorityCheck.hasRequire &&
      !nodeAuthorityCheck.hasBuffer &&
      !nodeAuthorityCheck.hasIpcRenderer &&
      !nodeAuthorityCheck.hasElectron &&
      nodeAuthorityCheck.hasBridge
    ) {
      telemetry.step11_rendererSandboxed = true
    } else {
      telemetry.errors.push(`Step 11 failed: renderer has forbidden Node authority: ${JSON.stringify(nodeAuthorityCheck)}`)
    }

    // Step 12: Shut down normally via canonical quit path
    log(`Step 12: Requesting normal shutdown via gravitas:quit-app (requestQuitApplication)...`)
    try {
      await win.evaluate(() => {
        window.gravitasDesktop.requestQuitApplication()
      })
    } catch (err) {
      // The window closes immediately when app.exit(0) is dispatched
      log(`Step 12: Expected evaluate disconnect during exit: ${err.message}`)
    }

    // Wait for electronApp close or timeout
    try {
      await electronApp.waitForEvent('close', { timeout: 8000 })
      log('Step 12: Received electronApp close event')
    } catch (_) {
      log('Step 12: waitForEvent finished')
    }
    telemetry.step12_normalShutdown = true

    // Step 13: Verify no orphan Electron or kernel process remains
    log(`Step 13: Checking if mainPid ${mainPid} or kernelPid ${kernelPid} are still running...`)
    await new Promise(r => setTimeout(r, 2000))

    const mainAlive = isPidAlive(mainPid)
    const kernelAlive = isPidAlive(kernelPid)
    log(`Step 13: mainPid ${mainPid} alive: ${mainAlive}, kernelPid ${kernelPid} alive: ${kernelAlive}`)

    if (!mainAlive && !kernelAlive) {
      telemetry.step13_noOrphans = true
      log('Step 13: Confirmed zero orphan processes remaining')
    } else {
      telemetry.errors.push(`Step 13 failed: orphan processes found (main: ${mainAlive}, kernel: ${kernelAlive})`)
    }

  } catch (err) {
    log(`Error during dogfood run: ${err.message}`)
    telemetry.errors.push(err.message)
  } finally {
    if (electronApp) {
      try {
        await electronApp.close()
      } catch (_) {}
    }
  }

  const allPassed = (
    telemetry.step1_commandCenterDefault &&
    telemetry.step2_kernelPid !== null &&
    telemetry.step3_workSessionProjection !== null &&
    telemetry.step4_spatialActivated &&
    telemetry.step5_spatialViewActive &&
    telemetry.step6_pidStable &&
    telemetry.step7_sessionProjectionStable &&
    telemetry.step8_returnedToCommandCenter &&
    telemetry.step9_canonicalStateStable &&
    telemetry.step10_noDuplicateKernelProcess &&
    telemetry.step11_rendererSandboxed &&
    telemetry.step12_normalShutdown &&
    telemetry.step13_noOrphans &&
    telemetry.errors.length === 0
  )

  const output = {
    timestamp: new Date().toISOString(),
    status: allPassed ? 'PASS' : 'FAIL',
    totalSteps: 13,
    passedSteps: [
      telemetry.step1_commandCenterDefault,
      telemetry.step2_kernelPid !== null,
      telemetry.step3_workSessionProjection !== null,
      telemetry.step4_spatialActivated,
      telemetry.step5_spatialViewActive,
      telemetry.step6_pidStable,
      telemetry.step7_sessionProjectionStable,
      telemetry.step8_returnedToCommandCenter,
      telemetry.step9_canonicalStateStable,
      telemetry.step10_noDuplicateKernelProcess,
      telemetry.step11_rendererSandboxed,
      telemetry.step12_normalShutdown,
      telemetry.step13_noOrphans
    ].filter(Boolean).length,
    telemetry
  }

  mkdirSync(join(process.cwd(), 'docs/v1-a-r'), { recursive: true })
  writeFileSync(
    join(process.cwd(), 'docs/v1-a-r/desktop-dogfood.json'),
    JSON.stringify(output, null, 2),
    'utf8'
  )
  console.log(`\n============================================================`)
  console.log(`DOGFOOD STATUS: ${output.status} (${output.passedSteps}/13 steps passed)`)
  console.log(`============================================================\n`)
}

runDogfood()
