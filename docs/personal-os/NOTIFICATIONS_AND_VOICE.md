# Gravitas Notification & Voice Architecture (Wave 12C.5)

## 1. Principles of Notification & Voice

In Gravitas, **Voice/TTS is an Output Channel, NOT a reasoning agent.**

$$\text{Voice Engine} = \text{Text-to-Speech Synthesizer (Pure Output Channel)}$$

A voice does not think, make decisions, or hold independent agent identity. It is simply an audio modality for delivering filtered, high-priority notifications and structured briefings to the operator.

### Universal Notification Pipeline
```
[ System Event Bus ] ── (GravitasEvents)
         │
         ▼
[ Notification Policy Engine ]
   ├── Deduplication Filter
   ├── Quiet Hours Gate
   ├── Priority Classification
   └── Voice Eligibility Evaluator
         │
         ├───► [ 2D Command Center Inbox ]
         ├───► [ 3D Headquarters Mezzanine Alert ]
         ├───► [ Native Desktop Notification (OS) ]
         ├───► [ Mobile Companion Push Notification ]
         └───► [ Voice / TTS Audio Chime & Speech ]
```

---

## 2. Priority Classification Taxonomy

Every notification dispatched by the system belongs to one of five strict priority levels:

| Priority Class | Severity & User Action | Sound / Chime | Allowed Channels | Example Scenarios |
| :--- | :--- | :--- | :--- | :--- |
| **`CRITICAL`** | Immediate operational risk or security failure. | High-urgency alert | All channels + Voice (bypasses quiet hours). | Verification security mutation failure, rogue commit attempt, gateway outage. |
| **`ACTION_REQUIRED`** | Work paused waiting for human sign-off. | Distinctive chime | UI Inbox, Desktop, Mobile Push, Voice. | Task reached `WAITING_APPROVAL`, budget top-up needed, candidate email ready. |
| **`COMPLETION`** | Background task or multi-step run completed. | Subtle chime | UI Inbox, Desktop, Mobile Push. | Multi-task DAG succeeded, Courier finished downloading dataset. |
| **`PERSONAL_REMINDER`**| Scheduled daily routine or calendar reminder. | Gentle chime | UI Inbox, Desktop, Mobile, Voice (if active). | "Study session starts in 10 minutes", "Hydration break". |
| **`INFORMATIONAL`** | Routine operational milestone. | Silent (no chime) | UI Event Console only. | Task transitioned to `RUNNING`, AST indexed, cache cleared. |

---

## 3. Voice Eligibility Rules

To prevent audio fatigue, Gravitas strictly gates which events may be synthesized into speech:

### Voice-Eligible Events (YES):
- *"Verification failed on task Frontend Components. Mutation detected in worktree."*
- *"One task is waiting for approval at the Mezzanine."*
- *"Morning operations briefing ready."*
- *"Your scheduled Algorithms study session begins in ten minutes."*

### Forbidden from Voice (NO):
- ❌ *"Worker opened file `App.tsx`."*
- ❌ *"Worker generated 150 output tokens."*
- ❌ *"OmniRoute routed inference request to provider OpenAI."*
- ❌ *"File `bundle.js` written to disk."*
- ❌ *"Cache entry refreshed."*

---

## 4. Notification Grouping, Rate Limits & Quiet Hours

1. **Quiet Hours:** Default window (e.g., 22:30 to 07:30). During quiet hours, all audio chimes, voice speech, and mobile alerts are suppressed except for `CRITICAL` severity events.
2. **Rate Limiting:** Maximum 1 voice alert per 60 seconds. Rapidly succeeding events are batched into a single aggregated summary (e.g., *"Three background tasks completed successfully."*).
3. **Deduplication:** Repeated identical alerts within a 5-minute sliding window are merged into a single alert with an incremented counter.
