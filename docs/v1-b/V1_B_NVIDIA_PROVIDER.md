# GRAVITAS — Wave V1-B NVIDIA NIM Provider Specification

### 1. Overview
The `NvidiaNimAdapter` provides a direct HTTPS inference client for the hosted NVIDIA NIM API. It implements the OpenAI chat completions schema with zero external SDK dependencies, executing shell-free with strict fetch containment.

- **Provider ID:** `nvidia-nim`
- **Default Base URL:** `https://integrate.api.nvidia.com`
- **Chat Endpoint:** `https://integrate.api.nvidia.com/v1/chat/completions`
- **Catalog Snapshot Version:** `2026.10-v1b-snapshot`
- **Authentication Method:** `BEARER_TOKEN` (via memory-vault opaque reference)

---

### 2. Versioned Seeded Candidate Catalog
Wave V1-B seeds 3 free developer-tier models verified against the NVIDIA NIM API catalog snapshot:

| Model ID | Display Name | Context Window | Default Tier | Cost Class | Modalities |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `meta/llama-3.1-8b-instruct` | Meta Llama 3.1 8B Instruct | 131,072 | FAST | ZERO_DOLLAR_FREE | TEXT, CODE |
| `meta/llama-3.1-70b-instruct` | Meta Llama 3.1 70B Instruct | 131,072 | FRONTIER | ZERO_DOLLAR_FREE | TEXT, CODE |
| `mistralai/mixtral-8x7b-instruct-v0.1` | Mistral Mixtral 8x7B Instruct | 32,768 | BALANCED | ZERO_DOLLAR_FREE | TEXT, CODE |

All catalog entries carry metadata provenance (`source: 'NVIDIA_CATALOG'`, `sourceVersion: '2026.10-v1b-snapshot'`).

---

### 3. HTTP Error Taxonomy & Normalization
The adapter translates raw HTTP responses and exceptions into the standardized Gravitas provider error taxonomy:

| HTTP Status | Internal Taxonomy | Behavior |
| :--- | :--- | :--- |
| 200 OK | `COMPLETED` | Normalizes `choices[0].message.content`, usage tokens, requestId. |
| 401 / 403 | `AUTH_REQUIRED` | Fails closed; strips secret from error message; stops escalation. |
| 402 | `COST_BLOCKED` | Payment required; fails closed; prevents paid billing. |
| 404 | `MODEL_NOT_FOUND` | Model ID not in remote provider deployment. |
| 429 | `RATE_LIMITED` | Backoff signal. |
| 500 / 502 / 503 | `PROVIDER_UNAVAILABLE` | Remote endpoint error. |
| Timeout / Abort | `TIMEOUT` | Request aborted via AbortSignal after timeout (default 30s). |
| Invalid JSON | `MALFORMED_RESPONSE`| Response body fails JSON parse. |

---

### 4. Header Sanitization & Worker Protection
To prevent compromised tasks or untrusted worker outputs from spoofing authentication or hijacking routing:
- Outbound custom headers are passed through `sanitizeProviderHeaders()`.
- Headers with keys matching `host` or `authorization` (case-insensitive) are strictly deleted before dispatch.
- Authentication headers are injected solely by `ModelCredentialBroker` using the verified secret stored in memory.
