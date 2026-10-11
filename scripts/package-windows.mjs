import { cpSync, mkdirSync, rmSync, existsSync, writeFileSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'

const ROOT_DIR = resolve(process.cwd())
const APP_DIST_DIR = join(ROOT_DIR, 'apps/desktop/dist')
const APP_ASSETS_DIR = join(ROOT_DIR, 'apps/desktop/assets')
const ELECTRON_DIST_DIR = join(ROOT_DIR, 'node_modules/electron/dist')
const OUTPUT_BASE = join(ROOT_DIR, 'dist-package')
const PACKAGE_DIR = join(OUTPUT_BASE, 'gravitas-desktop-win32-x64')
const RESOURCES_APP_DIR = join(PACKAGE_DIR, 'resources/app')

function computeSha256(filePath) {
  const buf = readFileSync(filePath)
  return createHash('sha256').update(buf).digest('hex')
}

export async function packageWindows() {
  console.log('[PACKAGE] Packaging Gravitas Desktop for Windows x64...')

  // 1. Ensure build is fresh
  if (!existsSync(join(APP_DIST_DIR, 'main/index.js'))) {
    console.log('[PACKAGE] Dist files missing. Running apps/desktop/build.mjs...')
    execFileSync(process.execPath, [join(ROOT_DIR, 'apps/desktop/build.mjs')], { stdio: 'inherit' })
  }

  // 2. Prepare staging directory
  if (existsSync(PACKAGE_DIR)) {
    rmSync(PACKAGE_DIR, { recursive: true, force: true })
  }
  mkdirSync(PACKAGE_DIR, { recursive: true })

  // 3. Copy Electron runtime files
  console.log('[PACKAGE] Copying Electron runtime from:', ELECTRON_DIST_DIR)
  cpSync(ELECTRON_DIST_DIR, PACKAGE_DIR, { recursive: true })

  // Rename electron.exe to Gravitas.exe
  const origExe = join(PACKAGE_DIR, 'electron.exe')
  const gravitasExe = join(PACKAGE_DIR, 'Gravitas.exe')
  if (existsSync(origExe)) {
    cpSync(origExe, gravitasExe)
    rmSync(origExe)
  }

  // 4. Copy app bundle into resources/app
  console.log('[PACKAGE] Staging application bundles into resources/app...')
  mkdirSync(RESOURCES_APP_DIR, { recursive: true })
  cpSync(APP_DIST_DIR, join(RESOURCES_APP_DIR, 'dist'), { recursive: true })
  cpSync(APP_ASSETS_DIR, join(RESOURCES_APP_DIR, 'assets'), { recursive: true })

  // 5. Create production package.json
  const prodPkg = {
    name: 'gravitas',
    version: '0.0.1',
    description: 'Gravitas — local-first multi-agent command center',
    main: 'dist/main/index.js',
    author: 'Gravitas Team',
    license: 'UNLICENSED',
    type: 'module'
  }
  writeFileSync(join(RESOURCES_APP_DIR, 'package.json'), JSON.stringify(prodPkg, null, 2))

  // 6. Create archive (ZIP) for distribution
  const zipName = 'Gravitas-0.0.1-win32-x64.zip'
  const zipPath = join(OUTPUT_BASE, zipName)
  if (existsSync(zipPath)) {
    rmSync(zipPath, { force: true })
  }

  console.log('[PACKAGE] Creating distribution archive:', zipName)
  execFileSync('tar.exe', ['-a', '-c', '-f', zipPath, '-C', OUTPUT_BASE, 'gravitas-desktop-win32-x64'], {
    stdio: 'inherit'
  })

  // 7. Generate installer scripts
  const installerScript = `@echo off\r\npowershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install-Gravitas.ps1"\r\n`
  writeFileSync(join(OUTPUT_BASE, 'Install-Gravitas.cmd'), installerScript)

  const uninstallScriptContent = [
    '# Gravitas Uninstaller',
    '$AppName = "Gravitas"',
    '$TargetDir = Join-Path $env:LOCALAPPDATA "Programs\\$AppName"',
    '$DesktopPath = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop)',
    '$StartMenuPath = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Programs)',
    '',
    'Get-Process -Name "$AppName" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue',
    '',
    'Remove-Item (Join-Path $DesktopPath "$AppName.lnk") -Force -ErrorAction SilentlyContinue',
    'Remove-Item (Join-Path $StartMenuPath "$AppName.lnk") -Force -ErrorAction SilentlyContinue',
    '',
    'if (Test-Path $TargetDir) {',
    '    Remove-Item $TargetDir -Recurse -Force -ErrorAction SilentlyContinue',
    '}',
    'Write-Host "$AppName uninstalled successfully. User data preserved under %APPDATA%\\gravitas."'
  ].join('\r\n')

  const installPs1Content = [
    '# Gravitas Windows Per-User Installer',
    '# Non-administrative, sandboxed installation to %LOCALAPPDATA%\\Programs\\Gravitas',
    '',
    "$ErrorActionPreference = 'Stop'",
    '$AppName = "Gravitas"',
    '$Version = "0.0.1"',
    '$TargetDir = Join-Path $env:LOCALAPPDATA "Programs\\$AppName"',
    '$SourceDir = Join-Path $PSScriptRoot "gravitas-desktop-win32-x64"',
    '',
    'Write-Host "Installing $AppName v$Version to $TargetDir..."',
    '',
    'if (-not (Test-Path $SourceDir)) {',
    '    Write-Error "Source directory not found: $SourceDir"',
    '    exit 1',
    '}',
    '',
    '# Stop any running instances',
    'Get-Process -Name "Gravitas" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue',
    '',
    '# Create target directory',
    'if (-not (Test-Path $TargetDir)) {',
    '    New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null',
    '}',
    '',
    '# Copy files',
    'Copy-Item -Path "$SourceDir\\*" -Destination $TargetDir -Recurse -Force',
    '',
    '# Create Desktop Shortcut',
    '$WshShell = New-Object -ComObject WScript.Shell',
    '$DesktopPath = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop)',
    '$Shortcut = $WshShell.CreateShortcut(Join-Path $DesktopPath "$AppName.lnk")',
    '$Shortcut.TargetPath = Join-Path $TargetDir "Gravitas.exe"',
    '$Shortcut.WorkingDirectory = $TargetDir',
    '$Shortcut.Description = "Gravitas Multi-Agent Command Center"',
    '$Shortcut.Save()',
    '',
    '# Create Start Menu Shortcut',
    '$StartMenuPath = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Programs)',
    '$StartShortcut = $WshShell.CreateShortcut(Join-Path $StartMenuPath "$AppName.lnk")',
    '$StartShortcut.TargetPath = Join-Path $TargetDir "Gravitas.exe"',
    '$StartShortcut.WorkingDirectory = $TargetDir',
    '$StartShortcut.Description = "Gravitas Multi-Agent Command Center"',
    '$StartShortcut.Save()',
    '',
    '# Create Uninstaller Script in TargetDir',
    `Set-Content -Path (Join-Path $TargetDir "Uninstall.ps1") -Value @'\r\n${uninstallScriptContent}\r\n'@`,
    '',
    'Write-Host "$AppName v$Version installed successfully!"',
    'Write-Host "Binaries located at: $TargetDir"',
    'Write-Host "User data preserved at: %APPDATA%\\gravitas"'
  ].join('\r\n')

  writeFileSync(join(OUTPUT_BASE, 'Install-Gravitas.ps1'), installPs1Content)

  // 8. Generate SHA-256 Manifest
  const manifest = {
    packageName: 'Gravitas Desktop',
    version: '0.0.1',
    targetPlatform: 'win32',
    targetArch: 'x64',
    builtAt: new Date().toISOString(),
    isSigned: false,
    signatureNotice: 'UNSIGNED DISTRIBUTION FOR LOCAL TESTING ONLY - NO PRODUCTION CODE SIGNING CLAIM',
    artifacts: [
      {
        fileName: 'gravitas-desktop-win32-x64/Gravitas.exe',
        sha256: computeSha256(gravitasExe),
        sizeBytes: readFileSync(gravitasExe).length
      },
      {
        fileName: zipName,
        sha256: computeSha256(zipPath),
        sizeBytes: readFileSync(zipPath).length
      }
    ]
  }

  writeFileSync(join(OUTPUT_BASE, 'manifest.json'), JSON.stringify(manifest, null, 2))
  console.log('[PACKAGE] Packaging completed successfully. Manifest generated.')
  return manifest
}

if (process.argv[1] && process.argv[1].endsWith('package-windows.mjs')) {
  packageWindows().catch(err => {
    console.error('[PACKAGE] Failed:', err)
    process.exit(1)
  })
}
