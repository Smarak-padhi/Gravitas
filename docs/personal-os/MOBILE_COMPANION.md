# Gravitas Mobile Companion Architecture & Control Boundary (Wave 12C.5)

## 1. Multi-Surface Control Principles

Gravitas is architected from the ground up as a **head-agnostic personal operating system**. The local backend server exposes standard REST and Server-Sent Event (SSE) endpoints (`/api/v1/state`, `/api/v1/events`, `/api/v1/runs`) that can be consumed by any client interface.

$$\text{Gravitas Core} \neq \text{3D Desktop Client}$$

While the desktop interface features the full 3D spatial Headquarters and multi-pane timeline, the system must function flawlessly on mobile devices without WebGL dependencies.

---

## 2. Division of Capabilities: Desktop vs. Mobile

| Capability / Surface | Full 3D Desktop Command Center | Mobile Companion (PWA / Native App) |
| :--- | :---: | :---: |
| **Living 3D Headquarters (WebGL)** | Full Interactive Scene | ❌ Disabled (Replaced by compact status cards) |
| **Goal Composer & Multi-Task DAG** | Full Graphical DAG Canvas | Compact Linear Task Checklist |
| **Worktree Code Diff Inspection** | Full Side-by-Side Monaco Diff | Truncated Unified Patch Viewer |
| **One-Click Human Approvals** | Approval Plinth / Review Bar | **First-Class Biometric Approval Drawer** |
| **Today View & Rhythm Timeline** | Multi-column dense layout | **Optimized Single-Column Mobile Feed** |
| **Active Study Flashcard Review** | Split-screen study nook | **Full-Screen Mobile Spaced Repetition UI** |
| **Quick Audio / Text Goal Capture**| Command Palette (`Cmd+K`) | **Floating Microphone & Quick Capture Bar** |
| **Critical Push Notifications** | Native Desktop Notification | **Native Mobile Push Alerts (APNs / FCM)** |

---

## 3. Remote Synchronization & Local Network Security

To allow the operator to approve tasks or receive study reminders on their phone while moving around their home or office:
1. **Local Tailscale / WireGuard Mesh:** Mobile companions connect to the local Gravitas server over an authenticated peer-to-peer Tailscale/WireGuard VPN mesh. No public ports are opened.
2. **Mutual TLS / Shared Token Authentication:** Requests carry an authorized bearer token generated during initial QR-code pairing.
3. **Optimistic Offline Caching:** The mobile client caches the current `TodayView` and active flashcard decks locally in IndexedDB, enabling offline review when away from the desktop workstation.
