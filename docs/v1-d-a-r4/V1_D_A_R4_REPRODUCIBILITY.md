# GRAVITAS Wave V1-D-A-R4: Build Reproducibility Audit

**Document:** `docs/v1-d-a-r4/V1_D_A_R4_REPRODUCIBILITY.md`  
**Wave:** V1-D-A-R4 (Adversarial Acceptance-Test Hardening)  
**Starting Commit:** `8135fffd34e6a1fa233f876a92151201beffd803`  
**Build Epoch Timestamp:** `2026-10-11T15:17:11.000Z`  
**Date:** 2026-10-12  

---

## 1. Reproducibility Verification Results

Two independent packaging executions were executed into separate staging directories (`build1` and `build2`) under `$env:TEMP/repro-test-*`. All 126 packaged files and distribution artifacts were hashed with SHA-256 and compared.

```text
TOTAL FILES COMPARED: 126
ALL FILES IDENTICAL: true
[REPRO] PASS: 100% byte-for-byte reproducibility confirmed across all artifacts!
```

---

## 2. Key Distribution Artifact SHA-256 Digests

| Artifact | Build 1 SHA-256 | Build 2 SHA-256 | Match |
|---|---|---|---|
| **Gravitas-0.0.1-win32-x64.zip** | `18a6f8ed776b28023fb84b8c87006a7490b58fa16f9e53bc86b092590ed7e9f7` | `18a6f8ed776b28023fb84b8c87006a7490b58fa16f9e53bc86b092590ed7e9f7` | **MATCH** |
| **manifest.json** | `a9225b23ab0a414e2c07d278eaae75282cf93d50c05588afdb7e60c4c84a672e` | `a9225b23ab0a414e2c07d278eaae75282cf93d50c05588afdb7e60c4c84a672e` | **MATCH** |
| **Install-Gravitas.ps1** | `d51c88d51aadbaa858fcad2f3d3e6718cf8a5637aa83455cb88778601b47cc2d` | `d51c88d51aadbaa858fcad2f3d3e6718cf8a5637aa83455cb88778601b47cc2d` | **MATCH** |
| **Install-Gravitas.cmd** | `609c901696ffa341cd102e5a894dd898411cafe6db1f6aa17a89c4ad08215f4d` | `609c901696ffa341cd102e5a894dd898411cafe6db1f6aa17a89c4ad08215f4d` | **MATCH** |
| **Gravitas.exe** | `49b61a030a520fc36a4b8fa5cce53fb4e935a7bdbbe4b80e9222f598e49cc7fa` | `49b61a030a520fc36a4b8fa5cce53fb4e935a7bdbbe4b80e9222f598e49cc7fa` | **MATCH** |
| **payload-inventory.json** | `c58747ebcb7a521948b6a257507cefb14e9af01be624a9eac2613b593822aace` | `c58747ebcb7a521948b6a257507cefb14e9af01be624a9eac2613b593822aace` | **MATCH** |

---

## 3. Status Classifications

```text
ZIP_REPRODUCIBLE = PASS
MANIFEST_REPRODUCIBLE = PASS
INSTALLER_SCRIPTS_REPRODUCIBLE = PASS
UNINSTALLER_REPRODUCIBLE = PASS
PAYLOAD_INVENTORY_REPRODUCIBLE = PASS
STAGED_RUNTIME_REPRODUCIBLE = PASS
```
