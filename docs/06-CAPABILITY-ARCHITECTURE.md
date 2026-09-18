# 06 - Capability Architecture & Integration Engine

> **Document Type:** Phase 0 Technical Research  
> **Status:** Authoritative  
> **Classification:** FACT / INFERENCE (architecture specification)  

---

## 1. Capability Abstraction Philosophy

Agents must never be tightly coupled to specific CLI flags, MCP server versions, or REST API endpoints. Instead, the system introduces a formal **Capability Layer**:

```
[Agent Goal]
     |
     v
[Capability Request: "repo.create_pull_request"]
     |
     v
[Capability Router & Policy Engine]
     |
     +--> Checks Permission Tier (L0 - L4)
     +--> Verifies Scoped Authentication Nonce
     +--> Selects Optimal Implementation Provider
     |
     +--> Priority 1: Native REST API (@octokit/rest)
     +--> Priority 2: MCP Server (@modelcontextprotocol/server-github)
     `--> Priority 3: Developer CLI (`gh pr create`)
```

---

## 2. Core Capability Schema

```typescript
export interface CapabilityDefinition {
  id: string;                      // e.g. "browser.capture_screenshot"
  displayName: string;
  category: CapabilityCategory;
  description: string;
  
  // Implementation Providers ordered by preference
  providers: CapabilityProvider[];
  
  // Input / Output Contracts
  inputSchema: JSONSchema7;
  outputSchema: JSONSchema7;
  
  // Security & Permissions
  riskLevel: 'READ' | 'WRITE' | 'EXTERNAL_WRITE' | 'CRITICAL';
  minimumPermissionTier: PermissionTier; // L0 - L4
  requiresHumanApproval: boolean;
  
  // Execution constraints
  timeoutMs: number;
  rateLimit?: RateLimitConfig;
}

export type CapabilityProvider =
  | { type: 'NATIVE_API'; endpoint: string; handler: (params: any) => Promise<any> }
  | { type: 'MCP_TOOL'; serverName: string; toolName: string }
  | { type: 'CLI_COMMAND'; binary: string; argsTemplate: string[] }
  | { type: 'PLAYWRIGHT'; scriptTemplate: string }
  | { type: 'WINDOWS_UIA'; uiaPattern: string };
```

---

## 3. Decision Matrix: External Service Integrations

| Service Domain | Primary Surface | Fallback Surface | Risk Tier | Authentication Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **GitHub** | **Native API (`@octokit`)** | CLI (`gh`) | L3 (PR) / L4 (Merge) | Fine-grained GitHub PAT |
| **Local Git** | **Native CLI (`git.exe`)** | libgit2 | L1 (Commit) / L2 (Branch)| Local OS Credentials |
| **Vercel** | **Native REST API** | CLI (`vercel`) | L3 (Preview) / L4 (Prod)| Scoped Deploy Token |
| **Cloudflare** | **Native REST API** | CLI (`wrangler`) | L3 (Workers) / L4 (DNS) | Cloudflare API Token |
| **Supabase / Postgres**| **Postgres Wire / Pool** | MCP Server | L1 (Dev) / L4 (Prod DB) | Connection String / JWT |
| **Notion / Linear** | **Native REST API** | MCP Server | L3 (Create Issue) | OAuth 2.0 Bearer Token |
| **Localhost Browser** | **Playwright CLI / MCP** | Chrome CDP | L0 (Read) / L1 (Forms) | Local Dev Server URL |
| **Desktop Apps** | **Windows UIA (`pywinauto`)**| OmniParser Vision | L1 (Inspect) / L4 (System)| Windows OS Token |
