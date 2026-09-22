# Gravitas Connector SDK & External Integration Architecture (Wave 12C.5)

## 1. Principles of the Connector SDK

A `Connector` is a specialized, deterministic bridge between the Gravitas orchestrator and an external software platform (e.g., Google Calendar, IMAP/SMTP, GitHub, Cloud Storage, or OS Filesystem).

$$\text{Connector (Bridge \& Protocol Handler)} \neq \text{AgentRole (Reasoning Entity)}$$

### Core Rules:
1. **Connectors Do Not Reason:** A connector contains zero prompt templates, zero LLM calls, and zero autonomous judgment. It executes structured API calls, serializes responses, and enforces rate limits.
2. **Strict Protocol Compliance:** No brittle DOM-scraping or policy-violating automations (e.g., no unofficial WhatsApp web session hijackers). All messaging integrations use official developer APIs, authorized webhooks, or local protocol standards.
3. **Out-of-Band Secrets:** Connector authentication tokens (OAuth2 refresh tokens, API keys) are held strictly in server-side secure memory or OS keyrings. They are never injected into LLM context prompts.

---

## 2. The Connector Domain Model

```typescript
export interface Connector {
  /** Unique connector identifier (e.g., 'connector:calendar:google') */
  readonly id: string

  /** Display title for operator interface */
  readonly displayName: string

  /** Capabilities exposed by this connector */
  readonly supportedCapabilities: ReadonlyArray<ConnectorCapability>

  /** Connection status */
  getConnectionStatus(): Promise<ConnectorStatus>

  /** Execute a structured operation */
  executeOperation(request: ConnectorRequest): Promise<ConnectorResult>
}

export interface ConnectorCapability {
  readonly capabilityId: string
  readonly name: string
  readonly authorityClass: AuthorityClass
  readonly requiresHumanApproval: boolean
}

export interface ConnectorRequest {
  readonly requestId: string
  readonly capabilityId: string
  readonly taskId: string
  readonly roleId: string
  readonly operation: string // e.g., 'listEvents', 'createDraft', 'fetchIssue'
  readonly parameters: Record<string, unknown>
  readonly humanApprovalToken?: string
}

export interface ConnectorResult {
  readonly requestId: string
  readonly success: boolean
  readonly timestamp: string
  readonly sanitizedData?: unknown
  readonly error?: {
    readonly code: string
    readonly message: string
    readonly retryable: boolean
  }
}
```

---

## 3. Target Connector Catalog

| Connector Name | Interface Protocol | Exposed Capabilities | Security & Rate Boundary |
| :--- | :--- | :--- | :--- |
| **Google/Apple Calendar**| CalDAV / Google Calendar API | `list_events`, `propose_event`, `update_event` | Read-only by default; writes staged for human approval. |
| **Email (IMAP/SMTP)** | IMAP (read) / SMTP (send) | `list_headers`, `fetch_message`, `stage_draft`, `send_mail` | `send_mail` strictly requires human sign-off; secrets in server config. |
| **Messaging (WhatsApp/Telegram)**| Official WhatsApp Cloud API / Telegram Bot API | `fetch_inbound`, `stage_reply`, `send_message` | Official API only. Outbound messages require human approval. |
| **GitHub** | GitHub Octokit REST/GraphQL | `list_prs`, `read_issues`, `create_candidate_branch`, `open_pr` | Scoped GitHub App token; no direct push to protected branches. |
| **Filesystem** | Node.js `fs/promises` | `read_file`, `write_worktree_file`, `list_dir` | Strict path jail inside task worktree; traversal blocked. |
| **Cloud Storage** | S3-compatible / Google Drive API | `upload_evidence`, `fetch_dataset` | Bounded to designated Gravitas bucket/folder. |
| **Browser / Web** | Headless Chromium (Playwright) | `navigate`, `inspect_dom`, `capture_screenshot` | Read-only research or test assertion runner. |
| **Weather & Maps** | Open-Meteo / Nominatim OSM | `get_forecast`, `lookup_commute` | Public, unauthenticated, rate-limited APIs. |
| **Health Data (Opt-In)**| Apple Health Export / Google Fit API | `read_activity_summary` | **Strict user opt-in.** Read-only daily aggregates. |

---

## 4. Rate Limiting, Backoff & Graceful Disconnection

- **Exponential Backoff:** All connectors implement standard exponential jitter backoff on HTTP 429/503 responses.
- **Circuit Breakers:** If a connector fails 3 consecutive requests, the orchestrator trips the circuit breaker, marking the connector `OFFLINE`.
- **Degradation Semantics:** When a connector goes offline, dependent tasks fail fast with clear, structured errors (`CONNECTOR_UNAVAILABLE`). The UI surfaces a reconnect prompt rather than hanging or retrying indefinitely.
