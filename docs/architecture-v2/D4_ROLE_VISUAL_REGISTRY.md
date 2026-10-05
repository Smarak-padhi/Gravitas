# D4 Role Visual Registry

## 1. Registry Taxonomy

The GRAVITAS Role Visual Registry (`apps/desktop/src/renderer/world/roleRegistry.ts`) maps 25 roles across 3 tiers to distinct geometric silhouettes, color palettes, and functional zones:

### Tier 1: Core Reasoning Roles (7)
| Role ID | Silhouette | Primary Color | Accent Color | Functional Zone | Emblem |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `chief-planner` | `CYLINDER_HEAD` | `#4a90e2` | `#90caf9` | `OPERATIONS` | `PLAN` |
| `frontend-engineer` | `CYLINDER_HEAD` | `#00bcd4` | `#80deea` | `EXECUTION` | `FE` |
| `backend-engineer` | `CYLINDER_HEAD` | `#26a69a` | `#80cbc4` | `EXECUTION` | `BE` |
| `desktop-engineer` | `CYLINDER_HEAD` | `#5c6bc0` | `#9fa8da` | `EXECUTION` | `DESK` |
| `independent-reviewer` | `HELMET_OCTA` | `#ab47bc` | `#ce93d8` | `VERIFICATION` | `REV` |
| `integration-engineer` | `CYLINDER_HEAD` | `#ff7043` | `#ffab91` | `EXECUTION` | `INT` |
| `security-auditor` | `HELMET_OCTA` | `#e53935` | `#ef9a9a` | `VERIFICATION` | `SEC` |

### Tier 2: Specialist Profiles (14)
| Role ID | Silhouette | Primary Color | Functional Zone |
| :--- | :--- | :--- | :--- |
| `technical-researcher` | `CONE_PRISM` | `#29b6f6` | `OPERATIONS` |
| `design-library-scout` | `CONE_PRISM` | `#ec407a` | `OPERATIONS` |
| `pattern-librarian` | `CONE_PRISM` | `#7e57c2` | `STORAGE` |
| `study-coach` | `CONE_PRISM` | `#26a69a` | `OPERATIONS` |
| `personal-coach` | `CONE_PRISM` | `#66bb6a` | `OPERATIONS` |
| `calendar-agent` | `TORUS_DEVICE` | `#ffa726` | `OPERATIONS` |
| `inbox-agent` | `TORUS_DEVICE` | `#fb8c00` | `OPERATIONS` |
| `lead-researcher` | `CONE_PRISM` | `#0288d1` | `OPERATIONS` |
| `business-analyst` | `CONE_PRISM` | `#8d6e63` | `OPERATIONS` |
| `outreach-assistant` | `TORUS_DEVICE` | `#f06292` | `OPERATIONS` |
| `architecture-arena` | `CONE_PRISM` | `#78909c` | `VERIFICATION` |
| `systems-architect` | `CONE_PRISM` | `#546e7a` | `OPERATIONS` |
| `data-engineer` | `CYLINDER_HEAD` | `#00897b` | `STORAGE` |
| `devops-engineer` | `CYLINDER_HEAD` | `#43a047` | `EXECUTION` |

### Tier 3: Mechanical Services (4)
| Role ID | Silhouette | Primary Color | Mechanical Service Flag |
| :--- | :--- | :--- | :---: |
| `deterministic-runner` | `BOX_UNIT` | `#78909c` | `true` |
| `browser-qa` | `BOX_UNIT` | `#546e7a` | `true` |
| `courier-jobs` | `BOX_UNIT` | `#607d8b` | `true` |
| `mcp-tool-broker` | `BOX_UNIT` | `#455a64` | `true` |

## 2. Fallback Archetype
Any unrecognized role resolves to the deterministic safe fallback:
- **Role Tier**: `TIER2_SPECIALIST`
- **Silhouette**: `CYLINDER_HEAD`
- **Colors**: Primary `#78909c`, Secondary `#b0bec5`
- **Zone**: `EXECUTION`
- **Mechanical**: `false`
