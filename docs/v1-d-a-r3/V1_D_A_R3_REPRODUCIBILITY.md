# GRAVITAS — Wave V1-D-A-R3 Build Reproducibility Audit

**Wave:** GRAVITAS Wave V1-D-A-R3  
**Auditor:** Subagent C (Independent Build & Reproducibility Auditor)  
**Target Repository:** `C:\Users\smara\Desktop\Multi-agent`  
**Normalized Epoch Timestamp:** `2026-10-11T13:50:12.000Z`  
**Build 1 Directory:** `C:\Users\smara\AppData\Local\Temp\gravitas-r3-build-1`  
**Build 2 Directory:** `C:\Users\smara\AppData\Local\Temp\gravitas-r3-build-2`  

---

## 1. Dual Independent Build Execution

Two complete packaging runs (`node scripts/package-windows.mjs`) were executed into completely isolated directories in `$env:TEMP`. Every individual artifact was independently hashed with SHA-256 and byte-counted.

### Artifact Comparison Table

| Artifact Name | Build 1 SHA-256 | Build 2 SHA-256 | Size (Bytes) | Determinism Match |
| :--- | :--- | :--- | :---: | :---: |
| `Gravitas-0.0.1-win32-x64.zip` | `bdc7a2844760fb4fc28bc64f22527efb7723a1a1d0d30daef23e69af2d983543` | `bdc7a2844760fb4fc28bc64f22527efb7723a1a1d0d30daef23e69af2d983543` | 161,635,805 | **EXACT MATCH** |
| `manifest.json` | `3a5be15bf16d4d6f49568c36dda1cf722fdfbffb22d647389c5cf1183abfdbaf` | `3a5be15bf16d4d6f49568c36dda1cf722fdfbffb22d647389c5cf1183abfdbaf` | 754 | **EXACT MATCH** |
| `Install-Gravitas.ps1` | `d51c88d51aadbaa858fcad2f3d3e6718cf8a5637aa83455cb88778601b47cc2d` | `d51c88d51aadbaa858fcad2f3d3e6718cf8a5637aa83455cb88778601b47cc2d` | 31,021 | **EXACT MATCH** |
| `Install-Gravitas.cmd` | `609c901696ffa341cd102e5a894dd898411cafe6db1f6aa17a89c4ad08215f4d` | `609c901696ffa341cd102e5a894dd898411cafe6db1f6aa17a89c4ad08215f4d` | 99 | **EXACT MATCH** |
| `Uninstall.ps1` (Generated) | `466bf9bbf131b63d890d4ee695529184d49b6329ebde91ccf442f79f2cc5ee8d` | `466bf9bbf131b63d890d4ee695529184d49b6329ebde91ccf442f79f2cc5ee8d` | 22,721 | **EXACT MATCH** |
| `Gravitas.exe` | `49b61a030a520fc36a4b8fa5cce53fb4e935a7bdbbe4b80e9222f598e49cc7fa` | `49b61a030a520fc36a4b8fa5cce53fb4e935a7bdbbe4b80e9222f598e49cc7fa` | 245,726,208 | **EXACT MATCH** |
| `payload-inventory.json` | `4c6af8d02b62bb7e8d4153f051add400f69653418e89a4738ef66ba5e573a43a` | `4c6af8d02b62bb7e8d4153f051add400f69653418e89a4738ef66ba5e573a43a` | 20,180 | **EXACT MATCH** |

---

## 2. Packaged Files Inventory Audit

- Total staged files enumerated under `gravitas-desktop-win32-x64`: **122 files**
- Build 1 vs Build 2 relative path listing: **100% Identical**
- Build 1 vs Build 2 byte-for-byte SHA-256 match across all 122 files: **100% (122 / 122 Match)**

```
FILE_INVENTORY_REPRODUCIBLE = PASS
PACKAGED_FILE_BYTES_REPRODUCIBLE = PASS
ZIP_BYTES_REPRODUCIBLE = PASS
MANIFEST_BYTES_REPRODUCIBLE = PASS
INSTALLER_SCRIPT_BYTES_REPRODUCIBLE = PASS
UNINSTALLER_SCRIPT_BYTES_REPRODUCIBLE = PASS
```
