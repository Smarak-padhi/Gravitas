# Capability Routing Architecture

> **Status:** Architecture Design — Phase 0  
> **Date:** 2026-09-18

## Routing Hierarchy

When an agent needs to perform an action, the Capability Router selects the implementation:

```
Agent requests: "take a screenshot of localhost:3000"

Router evaluates:
  1. Does an API exist for this?          ? No (localhost, no API)
  2. Does an MCP server provide this?     ? Yes (playwright-mcp)
  3. Is the MCP server available?         ? Yes
  4. Is the agent authorized?             ? Yes (L0 OBSERVE)
  
  ? Route to: playwright-mcp ? browser_take_screenshot
```

## Routing Priority (Default)

1. **Native API** — direct SDK/REST call (fastest, most reliable, structured output)
2. **MCP Server** — standardized tool interface (good for well-supported integrations)
3. **CLI Tool** — command-line invocation (reliable, widely available)
4. **Browser Automation** — DOM/accessibility tree (for web targets)
5. **Desktop Accessibility API** — UIA/AT-SPI for GUI apps
6. **Vision + Coordinates** — last resort, least reliable

## When to Override the Default

The default priority is not absolute. Override when:

| Situation | Override |
|-----------|----------|
| MCP server exists but is poorly maintained | Prefer CLI |
| API has rate limits that CLI bypasses | Prefer CLI |
| Operation needs rich structured output | Prefer API |
| Localhost app with no API | Browser automation |
| Desktop app with bad accessibility tree | Vision (last resort) |
| MCP tool is too verbose (token cost) | Prefer CLI |
| Need for streaming output | Prefer CLI or direct API |

## Capability Registry Design

```typescript
interface Capability {
  id: string;                  // e.g. "github.create_pr"
  displayName: string;
  category: CapabilityCategory;
  
  implementations: CapabilityImpl[]; // ordered by priority
  
  inputSchema: JSONSchema;
  outputSchema: JSONSchema;
  
  riskLevel: 'read' | 'write' | 'external' | 'critical';
  permissionRequired: PermissionLevel; // L0-L4
  
  approvalPolicy: ApprovalPolicy;
  rateLimitPolicy: RateLimitPolicy | null;
  
  availability: 'always' | 'when_configured' | 'on_demand';
  authentication: AuthRequirement | null;
}

interface CapabilityImpl {
  type: 'mcp' | 'api' | 'cli' | 'browser' | 'desktop';
  priority: number;
  
  // MCP
  mcpServer?: string;
  mcpTool?: string;
  
  // API
  apiEndpoint?: string;
  apiMethod?: string;
  
  // CLI
  command?: string;
  args?: string[];
  
  // Browser
  browserScript?: string;
  
  // Health check
  healthCheck: () => Promise<boolean>;
  
  // Adapter function
  invoke: (params: unknown) => Promise<unknown>;
}
```

## Capability Examples

### github.create_pr
- Type: API (preferred) or CLI (gh pr create)
- Permission: L3 EXTERNAL
- Auth: GitHub token (scoped: repo:write)

### browser.screenshot
- Type: MCP (playwright-mcp) or CLI (playwright screenshot)
- Permission: L0 OBSERVE
- Auth: none

### filesystem.write
- Type: Native (direct fs write with allowlist check)
- Permission: L1 WORKSPACE
- Auth: none (OS-level)

### terminal.run
- Type: Native (node-pty / subprocess)
- Permission: L1 WORKSPACE
- Auth: none (OS-level, sandboxed)

### vercel.deploy
- Type: CLI (vercel --prod) or API
- Permission: L4 CRITICAL (production) or L3 (preview)
- Auth: Vercel token (scoped)

## Decision Matrix: MCP vs CLI vs API vs Browser vs Desktop

| Factor | API | MCP | CLI | Browser | Desktop |
|--------|-----|-----|-----|---------|---------|
| Structured output | ??? | ??? | ?? | ?? | ? |
| Reliability | ??? | ??? | ??? | ?? | ? |
| Token efficiency | ??? | ?? | ?? | ?? | ? |
| Auth complexity | medium | low | low | none | none |
| Setup overhead | low | medium | low | medium | high |
| Rate limits | yes | via server | no | no | no |
| Streaming | varies | yes | yes | no | no |
| Windows support | ??? | ??? | ?? | ??? | ?? |
| Error granularity | ??? | ??? | ?? | ?? | ? |

## Routing Rules (V0)

For V0, the router is a simple priority chain with availability check:

```python
def route(capability_id, params, agent_permissions):
    cap = registry.get(capability_id)
    
    # Permission check first
    if agent_permissions.level < cap.permission_required:
        raise PermissionDenied
    
    # Try implementations in priority order
    for impl in sorted(cap.implementations, key=lambda i: i.priority):
        if impl.health_check():
            return impl.invoke(params)
    
    raise CapabilityUnavailable(capability_id)
```
