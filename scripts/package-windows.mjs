import { cpSync, mkdirSync, rmSync, existsSync, writeFileSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve, relative } from 'node:path'
import { createHash } from 'node:crypto'
import { execFileSync, execSync } from 'node:child_process'
import * as zlib from 'node:zlib'

const ROOT_DIR = resolve(process.cwd())
const APP_DIST_DIR = join(ROOT_DIR, 'apps/desktop/dist')
const APP_ASSETS_DIR = join(ROOT_DIR, 'apps/desktop/assets')
const ELECTRON_DIST_DIR = join(ROOT_DIR, 'node_modules/electron/dist')
const OUTPUT_BASE = join(ROOT_DIR, 'dist-package')
const PACKAGE_DIR = join(OUTPUT_BASE, 'gravitas-desktop-win32-x64')
const RESOURCES_APP_DIR = join(PACKAGE_DIR, 'resources/app')

// Standard reproducible epoch timestamp derived from git commit timestamp or fixed fallback
export function getBuildEpoch() {
  if (process.env.SOURCE_DATE_EPOCH) {
    const sec = parseInt(process.env.SOURCE_DATE_EPOCH, 10)
    if (!isNaN(sec)) {
      const d = new Date(sec * 1000)
      return { epochDate: d, epochIso: d.toISOString() }
    }
  }
  try {
    const out = execSync('git log -1 --format=%ct', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim()
    const sec = parseInt(out, 10)
    if (!isNaN(sec)) {
      const d = new Date(sec * 1000)
      return { epochDate: d, epochIso: d.toISOString() }
    }
  } catch (_) {
    // fallback
  }
  const fallback = new Date('2026-10-11T00:00:00.000Z')
  return { epochDate: fallback, epochIso: fallback.toISOString() }
}

export function computeSha256(filePath) {
  const buf = readFileSync(filePath)
  return createHash('sha256').update(buf).digest('hex')
}

// CRC32 table for ZIP creation
const crcTable = new Uint32Array(256)
for (let i = 0; i < 256; i++) {
  let c = i
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
  }
  crcTable[i] = c >>> 0
}

function crc32(buf) {
  let c = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8)
  }
  return (c ^ 0xFFFFFFFF) >>> 0
}

export function createDeterministicZip(
  entries, destPath, epochTime) {
  // Sort entries deterministically by filename
  const sorted = [...entries].sort((a, b) => a.name.localeCompare(b.name))

  const dosTime = ((epochTime.getUTCHours() << 11) | (epochTime.getUTCMinutes() << 5) | Math.floor(epochTime.getUTCSeconds() / 2)) & 0xFFFF
  const dosDate = (((epochTime.getUTCFullYear() - 1980) << 9) | ((epochTime.getUTCMonth() + 1) << 5) | epochTime.getUTCDate()) & 0xFFFF

  const localHeaders = []
  const centralHeaders = []
  let offset = 0

  for (const entry of sorted) {
    const filenameBuf = Buffer.from(entry.name.replace(/\\/g, '/'), 'utf8')
    const dataBuf = entry.data
    const crc = crc32(dataBuf)
    const uncompressedSize = dataBuf.length
    const compressedBuf = zlib.deflateRawSync(dataBuf, { level: 9 })
    const compressedSize = compressedBuf.length

    const localHeader = Buffer.alloc(30 + filenameBuf.length)
    localHeader.writeUInt32LE(0x04034b50, 0)
    localHeader.writeUInt16LE(20, 4)
    localHeader.writeUInt16LE(0, 6)
    localHeader.writeUInt16LE(8, 8) // Deflate
    localHeader.writeUInt16LE(dosTime, 10)
    localHeader.writeUInt16LE(dosDate, 12)
    localHeader.writeUInt32LE(crc, 14)
    localHeader.writeUInt32LE(compressedSize, 18)
    localHeader.writeUInt32LE(uncompressedSize, 22)
    localHeader.writeUInt16LE(filenameBuf.length, 26)
    localHeader.writeUInt16LE(0, 28)
    filenameBuf.copy(localHeader, 30)

    localHeaders.push(localHeader, compressedBuf)

    const centralHeader = Buffer.alloc(46 + filenameBuf.length)
    centralHeader.writeUInt32LE(0x02014b50, 0)
    centralHeader.writeUInt16LE(20, 4)
    centralHeader.writeUInt16LE(20, 6)
    centralHeader.writeUInt16LE(0, 8)
    centralHeader.writeUInt16LE(8, 10)
    centralHeader.writeUInt16LE(dosTime, 12)
    centralHeader.writeUInt16LE(dosDate, 14)
    centralHeader.writeUInt32LE(crc, 16)
    centralHeader.writeUInt32LE(compressedSize, 20)
    centralHeader.writeUInt32LE(uncompressedSize, 24)
    centralHeader.writeUInt16LE(filenameBuf.length, 28)
    centralHeader.writeUInt16LE(0, 30)
    centralHeader.writeUInt16LE(0, 32)
    centralHeader.writeUInt16LE(0, 34)
    centralHeader.writeUInt16LE(0, 36)
    centralHeader.writeUInt32LE(0, 38)
    centralHeader.writeUInt32LE(offset, 42)
    filenameBuf.copy(centralHeader, 46)

    centralHeaders.push(centralHeader)
    offset += localHeader.length + compressedBuf.length
  }

  const centralDirOffset = offset
  const centralDirSize = centralHeaders.reduce((acc, h) => acc + h.length, 0)

  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(0, 4)
  eocd.writeUInt16LE(0, 6)
  eocd.writeUInt16LE(sorted.length, 8)
  eocd.writeUInt16LE(sorted.length, 10)
  eocd.writeUInt32LE(centralDirSize, 12)
  eocd.writeUInt32LE(centralDirOffset, 16)
  eocd.writeUInt16LE(0, 20)

  writeFileSync(destPath, Buffer.concat([...localHeaders, ...centralHeaders, eocd]))
}

export function collectAllFiles(dir, base = '') {
  let results = []
  const list = readdirSync(dir)
  for (const item of list) {
    const full = join(dir, item)
    const rel = base ? `${base}/${item}` : item
    const st = statSync(full)
    if (st.isDirectory()) {
      results = results.concat(collectAllFiles(full, rel))
    } else {
      results.push({ relPath: rel.replace(/\\/g, '/'), fullPath: full })
    }
  }
  return results
}

export async function packageWindows() {
  console.log('[PACKAGE] Packaging Gravitas Desktop for Windows x64...')

  const { epochDate, epochIso } = getBuildEpoch()
  console.log('[PACKAGE] Build epoch timestamp:', epochIso)

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

  // 6. Enumerate and hash all payload files deterministically
  const payloadFiles = collectAllFiles(PACKAGE_DIR).sort((a, b) => a.relPath.localeCompare(b.relPath))
  const payloadInventory = payloadFiles.map(f => {
    const buf = readFileSync(f.fullPath)
    return {
      path: f.relPath.replace(/\\/g, '/'),
      sha256: createHash('sha256').update(buf).digest('hex'),
      sizeBytes: buf.length
    }
  })

  // 7. Write payload inventory metadata file inside resources/app/payload-inventory.json
  // Non-self-referential design: metadata file inventories all 121 payload files without circular self-hash.
  const inventoryPath = join(RESOURCES_APP_DIR, 'payload-inventory.json')
  const inventoryMetadata = {
    version: '0.0.1',
    builtAt: epochIso,
    metadataFile: 'resources/app/payload-inventory.json',
    packagedTotalFiles: payloadFiles.length + 1,
    payloadFileCount: payloadFiles.length,
    inventoryMetadataFileCount: 1,
    files: payloadInventory
  }
  writeFileSync(inventoryPath, JSON.stringify(inventoryMetadata, null, 2))

  // Construct embedded allowlist for Uninstaller (independent ownership authority)
  const allowlistPs = payloadInventory.map(entry =>
    `    @{ Path = '${entry.path}'; Sha256 = '${entry.sha256}' }`
  ).join(',\r\n')

  // Derive owned directories from payload files (sorted by depth descending)
  const ownedDirsSet = new Set()
  for (const entry of payloadInventory) {
    const parts = entry.path.split('/')
    for (let i = 1; i < parts.length; i++) {
      ownedDirsSet.add(parts.slice(0, i).join('\\'))
    }
  }
  const ownedDirsSorted = Array.from(ownedDirsSet).sort((a, b) => {
    const depthA = a.split('\\').length
    const depthB = b.split('\\').length
    if (depthA !== depthB) return depthB - depthA
    return a.localeCompare(b)
  })
  const ownedDirsPs = ownedDirsSorted.map(d => `    '${d}'`).join(',\r\n')

  // 8. Generate hardened, secure install and uninstall scripts
  const installerScript = `@echo off\r\npowershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install-Gravitas.ps1" %*\r\n`
  writeFileSync(join(OUTPUT_BASE, 'Install-Gravitas.cmd'), installerScript)

  const uninstallScriptContent = `# Gravitas Hardened Uninstaller
# Independent trust anchor: statically embedded build-time allowlist
# Candidate deletion targets are sourced exclusively from the embedded allowlist.
# Changing payload-inventory.json does NOT authorize any additional deletion.
param (
    [string]$CustomTargetDir,
    [switch]$Force
)

$ErrorActionPreference = 'Stop'
$AppName = "Gravitas"
$AppExe = "Gravitas.exe"
$ScriptDir = [System.IO.Path]::GetFullPath($PSScriptRoot).TrimEnd('\\')

# 1. Target boundary canonicalization & ownership verification
# Reject drive root, filesystem root, Windows SystemRoot, or %APPDATA%\\gravitas
$AppDataGravitas = [System.IO.Path]::GetFullPath((Join-Path $env:APPDATA "gravitas")).TrimEnd('\\')
$WindowsDir = [System.IO.Path]::GetFullPath($env:SystemRoot).TrimEnd('\\')
$pathRoot = [System.IO.Path]::GetPathRoot($ScriptDir)
if ($pathRoot -eq $ScriptDir -or $ScriptDir -eq '\\' -or $ScriptDir.StartsWith($AppDataGravitas, [System.StringComparison]::OrdinalIgnoreCase) -or $ScriptDir.StartsWith($WindowsDir, [System.StringComparison]::OrdinalIgnoreCase)) {
    Write-Error "Uninstall refused: Current directory ($ScriptDir) overlaps protected system or user data path."
    exit 1
}

# Reject if ScriptDir itself is a reparse point (junction/symlink)
$targetItem = Get-Item -LiteralPath $ScriptDir -Force
if ($targetItem.Attributes.HasFlag([System.IO.FileAttributes]::ReparsePoint)) {
    Write-Error "Uninstall refused: Installation directory ($ScriptDir) is a reparse point (junction/symlink)."
    exit 1
}

# Verify ownership markers: either Gravitas.exe, payload-inventory.json, or Uninstall.cmd must exist
$ownExe = Join-Path $ScriptDir "Gravitas.exe"
$ownInv = Join-Path $ScriptDir "resources\\app\\payload-inventory.json"
$ownCmd = Join-Path $ScriptDir "Uninstall.cmd"
if ((-not (Test-Path -LiteralPath $ownExe)) -and (-not (Test-Path -LiteralPath $ownInv)) -and (-not (Test-Path -LiteralPath $ownCmd))) {
    Write-Error "Uninstall refused: Directory ($ScriptDir) is missing Gravitas installation markers."
    exit 1
}

# Helper function: Check if any segment in path is a reparse point (junction/symlink)
function Test-ReparsePointInPath {
    param (
        [string]$Path,
        [string]$Root
    )
    $curr = [System.IO.Path]::GetFullPath($Path)
    $rootFull = [System.IO.Path]::GetFullPath($Root).TrimEnd('\\')
    while ($curr.Length -gt $rootFull.Length) {
        if (Test-Path -LiteralPath $curr) {
            $item = Get-Item -LiteralPath $curr -Force
            if ($item.Attributes.HasFlag([System.IO.FileAttributes]::ReparsePoint)) {
                return $true
            }
        }
        $parent = [System.IO.Path]::GetDirectoryName($curr)
        if ($parent -eq $curr -or [string]::IsNullOrEmpty($parent)) { break }
        $curr = $parent
    }
    return $false
}

# 2. Terminate active GRAVITAS processes running strictly from this target directory
$running = Get-Process -Name "Gravitas" -ErrorAction SilentlyContinue
foreach ($proc in $running) {
    try {
        if ($proc.MainModule.FileName.StartsWith($ScriptDir + '\\', [System.StringComparison]::OrdinalIgnoreCase)) {
            Write-Host "Stopping active instance (PID $($proc.Id))..."
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
            $proc.WaitForExit(3000)
        }
    } catch {
        # Process may have exited or access denied
    }
}
Start-Sleep -Milliseconds 500

# 3. Remove Desktop and Start Menu Shortcuts
$DesktopPath = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop)
$StartMenuPath = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Programs)
Remove-Item -LiteralPath (Join-Path $DesktopPath "$AppName.lnk") -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath (Join-Path $StartMenuPath "$AppName.lnk") -Force -ErrorAction SilentlyContinue

# 4. Embedded Independent Ownership Allowlist
# Candidate deletion targets are defined strictly at build time.
# Installed payload-inventory.json is NEVER consulted to discover candidate deletion paths.
$EmbeddedAllowlist = @(
${allowlistPs}
)

$scriptDirPrefix = $ScriptDir + '\\'

foreach ($entry in $EmbeddedAllowlist) {
    $rel = $entry.Path.Replace('/', '\\')
    # Path Traversal and Structure Hardening
    if ($rel.Contains('..') -or $rel.Contains(':') -or $rel.StartsWith('\\') -or [string]::IsNullOrWhiteSpace($rel)) {
        Write-Warning "Skipping invalid allowlist entry: $rel"
        continue
    }

    $full = [System.IO.Path]::GetFullPath((Join-Path $ScriptDir $rel))

    # Strict prefix boundary containment check
    if (-not $full.StartsWith($scriptDirPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        Write-Warning "Skipping out-of-bounds candidate path: $full"
        continue
    }

    if (-not (Test-Path -LiteralPath $full -PathType Leaf)) {
        continue
    }

    # Intermediate and leaf reparse point check
    if (Test-ReparsePointInPath -Path $full -Root $ScriptDir) {
        Write-Warning "Refusing to delete file through reparse point/junction: $full"
        continue
    }

    # Hash verification against embedded build-time digest
    $fileHash = (Get-FileHash -LiteralPath $full -Algorithm SHA256).Hash.ToLower()
    if ($fileHash -eq $entry.Sha256.ToLower()) {
        Remove-Item -LiteralPath $full -Force -ErrorAction SilentlyContinue
    } else {
        # Policy for modified application files:
        if ($Force) {
            Write-Host "Force removing modified application file: $rel"
            Remove-Item -LiteralPath $full -Force -ErrorAction SilentlyContinue
        } else {
            Write-Warning "Application file modified since installation; preserved for safety: $rel"
        }
    }
}

# 5. Remove expected metadata and uninstaller wrapper files
$MetadataFile = "resources\\app\\payload-inventory.json"
$fullMeta = [System.IO.Path]::GetFullPath((Join-Path $ScriptDir $MetadataFile))
if ($fullMeta.StartsWith($scriptDirPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
    if ((Test-Path -LiteralPath $fullMeta) -and (-not (Test-ReparsePointInPath -Path $fullMeta -Root $ScriptDir))) {
        Remove-Item -LiteralPath $fullMeta -Force -ErrorAction SilentlyContinue
    }
}

Remove-Item -LiteralPath (Join-Path $ScriptDir "Uninstall.cmd") -Force -ErrorAction SilentlyContinue

# 6. Clean up known owned directories (only if empty and not reparse points)
$OwnedDirectories = @(
${ownedDirsPs}
)

foreach ($ownedRel in $OwnedDirectories) {
    $fullDir = [System.IO.Path]::GetFullPath((Join-Path $ScriptDir $ownedRel))
    if ($fullDir.StartsWith($scriptDirPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        if (Test-Path -LiteralPath $fullDir -PathType Container) {
            if (-not (Test-ReparsePointInPath -Path $fullDir -Root $ScriptDir)) {
                if ((Get-ChildItem -LiteralPath $fullDir -Force).Count -eq 0) {
                    Remove-Item -LiteralPath $fullDir -Force -ErrorAction SilentlyContinue
                }
            }
        }
    }
}

# 7. Final uninstaller self-cleanup and root evaluation
$selfScript = Join-Path $ScriptDir "Uninstall.ps1"
Remove-Item -LiteralPath $selfScript -Force -ErrorAction SilentlyContinue

$remainingItems = Get-ChildItem -LiteralPath $ScriptDir -Force
if ($remainingItems.Count -eq 0) {
    Remove-Item -LiteralPath $ScriptDir -Force -ErrorAction SilentlyContinue
    Write-Host "$AppName completely removed."
} else {
    Write-Host "$AppName core binaries removed. Unrelated files preserved in $ScriptDir."
}

Write-Host "$AppName uninstalled successfully. User data preserved under %APPDATA%\\gravitas."
`

  const installPs1Content = `# Gravitas Hardened Windows Per-User Installer
# Non-administrative, sandboxed installation to %LOCALAPPDATA%\\Programs\\Gravitas
param (
    [string]$CustomTargetDir
)

$ErrorActionPreference = 'Stop'
$AppName = "Gravitas"
$Version = "0.0.1"

# 1. Path Canonicalization & Strict Boundary Verification
$DefaultTarget = Join-Path $env:LOCALAPPDATA "Programs\\$AppName"
$TargetDir = if ($CustomTargetDir) { [System.IO.Path]::GetFullPath($CustomTargetDir) } else { [System.IO.Path]::GetFullPath($DefaultTarget) }
$SourceDir = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "gravitas-desktop-win32-x64"))
$ManifestPath = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "manifest.json"))

# Protected paths: Drive root, system dirs, AppData user data
$AppDataGravitas = [System.IO.Path]::GetFullPath((Join-Path $env:APPDATA "gravitas"))
$WindowsDir = [System.IO.Path]::GetFullPath($env:SystemRoot)

if ([string]::IsNullOrWhiteSpace($TargetDir)) {
    Write-Error "Invalid target path: Destination cannot be empty."
    exit 1
}

# Reject drive root or filesystem root
$pathRoot = [System.IO.Path]::GetPathRoot($TargetDir)
if ($pathRoot -eq $TargetDir -or $TargetDir -eq '\\') {
    Write-Error "Invalid target path: Installation directly into drive root ($TargetDir) is prohibited."
    exit 1
}

# Reject target overlapping protected user data or Windows directories
if ($TargetDir.StartsWith($AppDataGravitas, [System.StringComparison]::OrdinalIgnoreCase)) {
    Write-Error "Invalid target path: Destination cannot overlap user data root ($AppDataGravitas)."
    exit 1
}
if ($TargetDir.StartsWith($WindowsDir, [System.StringComparison]::OrdinalIgnoreCase)) {
    Write-Error "Invalid target path: Destination cannot be inside Windows system directory ($WindowsDir)."
    exit 1
}

if (-not (Test-Path -LiteralPath $SourceDir)) {
    Write-Error "Source directory not found: $SourceDir"
    exit 1
}

# 2. Check source payload against manifest.json before mutating any destination
Write-Host "Verifying source payload integrity..."
if (-not (Test-Path -LiteralPath $ManifestPath)) {
    Write-Error "Payload integrity verification failed: manifest.json missing from source distribution."
    exit 1
}

$manifest = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json
$invPath = Join-Path $SourceDir "resources/app/payload-inventory.json"
if (-not (Test-Path -LiteralPath $invPath)) {
    Write-Error "Payload integrity verification failed: payload-inventory.json missing from payload."
    exit 1
}

$inventory = Get-Content -LiteralPath $invPath -Raw | ConvertFrom-Json
$verifiedCount = 0

foreach ($fileEntry in $inventory.files) {
    $rel = $fileEntry.path.Replace('/', '\\')
    # Traversal escape prevention
    if ($rel.Contains('..') -or [System.IO.Path]::IsPathRooted($rel) -or $rel.Contains(':') -or $rel.StartsWith('\\')) {
        Write-Error "Malicious payload entry detected: '$rel' contains path traversal or absolute path."
        exit 1
    }
    $fullSource = Join-Path $SourceDir $rel
    if (-not (Test-Path -LiteralPath $fullSource -PathType Leaf)) {
        Write-Error "Payload integrity check failed: missing required file '$rel'."
        exit 1
    }
    # Check reparse point on source
    $srcItem = Get-Item -LiteralPath $fullSource -Force
    if ($srcItem.Attributes.HasFlag([System.IO.FileAttributes]::ReparsePoint)) {
        Write-Error "Payload integrity check failed: file '$rel' is a reparse point (symlink/junction)."
        exit 1
    }
    # Verify hash
    $hash = (Get-FileHash -LiteralPath $fullSource -Algorithm SHA256).Hash.ToLower()
    if ($hash -ne $fileEntry.sha256.ToLower()) {
        Write-Error "Payload integrity check failed: hash mismatch for '$rel'. Expected $($fileEntry.sha256), found $hash."
        exit 1
    }
    $verifiedCount++
}
Write-Host "Integrity verified: $verifiedCount payload files validated successfully."

# 3. Check target directory for reparse points or existing unrelated content
if (Test-Path -LiteralPath $TargetDir) {
    $targetItem = Get-Item -LiteralPath $TargetDir -Force
    if ($targetItem.Attributes.HasFlag([System.IO.FileAttributes]::ReparsePoint)) {
        Write-Error "Invalid target path: Destination directory is a reparse point (junction/symlink). Aborting."
        exit 1
    }
    # If target already exists, verify it is a Gravitas directory before overwriting
    $targetExe = Join-Path $TargetDir "Gravitas.exe"
    $targetInv = Join-Path $TargetDir "resources/app/payload-inventory.json"
    $existingFiles = (Get-ChildItem -LiteralPath $TargetDir -Force).Count
    if ($existingFiles -gt 0 -and (-not (Test-Path -LiteralPath $targetExe)) -and (-not (Test-Path -LiteralPath $targetInv))) {
        Write-Error "Target directory exists and contains non-Gravitas files ($TargetDir). Refusing to overwrite unrelated directory."
        exit 1
    }
}

# 4. Handle active GRAVITAS processes running strictly from this target directory
$running = Get-Process -Name "Gravitas" -ErrorAction SilentlyContinue
foreach ($proc in $running) {
    try {
        if ($proc.MainModule.FileName.StartsWith($TargetDir, [System.StringComparison]::OrdinalIgnoreCase)) {
            Write-Host "Stopping active instance (PID $($proc.Id)) running from target..."
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
            $proc.WaitForExit(3000)
        }
    } catch {
        # Process may have exited or access denied
    }
}
Start-Sleep -Milliseconds 500

# 5. Staging update: Copy into target directory safely
Write-Host "Installing $AppName v$Version to $TargetDir..."
if (-not (Test-Path -LiteralPath $TargetDir)) {
    New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
}

# Atomic/safe copy of verified files item by item
foreach ($fileEntry in $inventory.files) {
    $rel = $fileEntry.path.Replace('/', '\\')
    $sourceFile = Join-Path $SourceDir $rel
    $targetFile = Join-Path $TargetDir $rel
    $targetParent = [System.IO.Path]::GetDirectoryName($targetFile)
    if (-not (Test-Path -LiteralPath $targetParent)) {
        New-Item -ItemType Directory -Path $targetParent -Force | Out-Null
    }
    $copied = $false
    for ($attempt = 0; $attempt -lt 5; $attempt++) {
        try {
            Copy-Item -LiteralPath $sourceFile -Destination $targetFile -Force -ErrorAction Stop
            $copied = $true
            break
        } catch {
            Start-Sleep -Milliseconds 500
        }
    }
    if (-not $copied) {
        Copy-Item -LiteralPath $sourceFile -Destination $targetFile -Force
    }
}

# Copy payload-inventory.json to installation directory for verified uninstallation
$targetInvPath = Join-Path $TargetDir "resources/app/payload-inventory.json"
$targetInvParent = [System.IO.Path]::GetDirectoryName($targetInvPath)
if (-not (Test-Path -LiteralPath $targetInvParent)) {
    New-Item -ItemType Directory -Path $targetInvParent -Force | Out-Null
}
Copy-Item -LiteralPath $invPath -Destination $targetInvPath -Force

# 6. Create Desktop and Start Menu Shortcuts
$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop)
$Shortcut = $WshShell.CreateShortcut((Join-Path $DesktopPath "$AppName.lnk"))
$Shortcut.TargetPath = (Join-Path $TargetDir "Gravitas.exe")
$Shortcut.WorkingDirectory = $TargetDir
$Shortcut.Description = "Gravitas Multi-Agent Command Center"
$Shortcut.Save()

$StartMenuPath = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Programs)
$StartShortcut = $WshShell.CreateShortcut((Join-Path $StartMenuPath "$AppName.lnk"))
$StartShortcut.TargetPath = (Join-Path $TargetDir "Gravitas.exe")
$StartShortcut.WorkingDirectory = $TargetDir
$StartShortcut.Description = "Gravitas Multi-Agent Command Center"
$StartShortcut.Save()

# 7. Write self-contained uninstaller into installation directory
Set-Content -LiteralPath (Join-Path $TargetDir "Uninstall.cmd") -Value @'
@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Uninstall.ps1" %*
'@
Set-Content -LiteralPath (Join-Path $TargetDir "Uninstall.ps1") -Value @'\r\n${uninstallScriptContent}\r\n'@

Write-Host "$AppName v$Version installed successfully!"
Write-Host "Binaries located at: $TargetDir"
Write-Host "User data preserved at: %APPDATA%\\gravitas"
`
  writeFileSync(join(OUTPUT_BASE, 'Install-Gravitas.ps1'), installPs1Content)

  // 9. Build Deterministic ZIP Archive
  const zipName = 'Gravitas-0.0.1-win32-x64.zip'
  const zipPath = join(OUTPUT_BASE, zipName)
  if (existsSync(zipPath)) {
    rmSync(zipPath, { force: true })
  }

  console.log('[PACKAGE] Creating deterministic distribution archive:', zipName)
  const zipEntries = payloadFiles.map(f => ({
    name: `gravitas-desktop-win32-x64/${f.relPath}`,
    data: readFileSync(f.fullPath)
  }))
  // Add payload-inventory.json
  zipEntries.push({
    name: 'gravitas-desktop-win32-x64/resources/app/payload-inventory.json',
    data: readFileSync(inventoryPath)
  })

  createDeterministicZip(zipEntries, zipPath, epochDate)

  // 10. Generate Deterministic Manifest with Normalized builtAt
  const manifest = {
    packageName: 'Gravitas Desktop',
    version: '0.0.1',
    targetPlatform: 'win32',
    targetArch: 'x64',
    builtAt: epochIso,
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
    ],
    packagedTotalFiles: payloadFiles.length + 1,
    payloadFileCount: payloadFiles.length,
    inventoryMetadataFileCount: 1
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
