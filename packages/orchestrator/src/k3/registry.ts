/**
 * GRAVITAS K3 — Tool Registry
 *
 * Implements typed registration, cataloging, qualification status verification,
 * and capability matching.
 *
 * Invariants:
 * - TOOL DISCOVERY != TOOL REGISTRATION != TOOL QUALIFICATION != TOOL AUTHORIZATION
 * - DISCOVERED != QUALIFIED
 * - QUARANTINED tools fail closed immediately.
 */

import type { ToolDescriptor } from './types.js'

export class ToolRegistrationError extends Error {
  constructor(message: string) {
    super(`[ToolRegistrationError] ${message}`)
    this.name = 'ToolRegistrationError'
  }
}

export class ToolRegistry {
  private readonly tools: Map<string, ToolDescriptor> = new Map()

  constructor() {
    this.registerDefaultTools()
  }

  private registerDefaultTools(): void {
    // 1. Built-in Read-Only Fixture Tool
    this.registerTool({
      toolId: 'tool:fixture:read',
      displayName: 'Read-Only Fixture Tool',
      kind: 'BUILTIN_KERNEL_TOOL',
      version: '1.0.0',
      supportedCapabilities: ['fixture.read'],
      qualificationState: 'QUALIFIED',
      costClass: 'OPERATOR_INCLUDED_HOST_RUNTIME',
      authorityClass: 'READ_ONLY',
      sideEffectClass: 'READ_ONLY',
      requiresHumanApproval: false,
    })

    // 2. Built-in Local Mutation Fixture Tool
    this.registerTool({
      toolId: 'tool:fixture:write',
      displayName: 'Local Mutation Fixture Tool',
      kind: 'BUILTIN_KERNEL_TOOL',
      version: '1.0.0',
      supportedCapabilities: ['fixture.write'],
      qualificationState: 'QUALIFIED',
      costClass: 'OPERATOR_INCLUDED_HOST_RUNTIME',
      authorityClass: 'CODE_MUTATION',
      sideEffectClass: 'LOCAL_REVERSIBLE_MUTATION',
      requiresHumanApproval: false,
    })

    // 3. Deterministic PowerShell Process Adapter Tool
    this.registerTool({
      toolId: 'tool:powershell-local',
      displayName: 'Local PowerShell Host Adapter',
      kind: 'LOCAL_PROCESS_TOOL',
      version: '5.1.0',
      supportedCapabilities: ['process.execute.deterministic'],
      qualificationState: 'QUALIFIED',
      costClass: 'OPERATOR_INCLUDED_HOST_RUNTIME',
      authorityClass: 'CODE_MUTATION',
      sideEffectClass: 'LOCAL_REVERSIBLE_MUTATION',
      requiresHumanApproval: false,
    })

    // 4. Simulated Quarantined Gateway Tool (Antigravity-Tools-LS)
    this.registerTool({
      toolId: 'tool:quarantined:ls',
      displayName: 'Quarantined Research Gateway (Antigravity-Tools-LS)',
      kind: 'GATEWAY_TOOL',
      version: '0.1.0',
      supportedCapabilities: ['gateway.unrestricted'],
      qualificationState: 'QUARANTINED',
      costClass: 'UNKNOWN_COST',
      authorityClass: 'DESTRUCTIVE_CREDENTIAL_STATE',
      sideEffectClass: 'DESTRUCTIVE',
      requiresHumanApproval: true,
    })

    // 5. Destructive Credential Repair Tool (antigravity-fixer)
    this.registerTool({
      toolId: 'tool:antigravity-fixer',
      displayName: 'Destructive Credential Repair Tool',
      kind: 'HUMAN_ONLY_TOOL',
      version: '1.0.0',
      supportedCapabilities: ['antigravity.authentication.repair'],
      qualificationState: 'QUALIFIED',
      costClass: 'OPERATOR_INCLUDED_HOST_RUNTIME',
      authorityClass: 'DESTRUCTIVE_CREDENTIAL_STATE',
      sideEffectClass: 'DESTRUCTIVE',
      requiresHumanApproval: true,
    })
  }

  public registerTool(descriptor: ToolDescriptor): void {
    if (!descriptor.toolId || typeof descriptor.toolId !== 'string') {
      throw new ToolRegistrationError('toolId must be a non-empty string')
    }
    if (this.tools.has(descriptor.toolId)) {
      throw new ToolRegistrationError(`Tool '${descriptor.toolId}' is already registered`)
    }
    if (!descriptor.supportedCapabilities || descriptor.supportedCapabilities.length === 0) {
      throw new ToolRegistrationError(`Tool '${descriptor.toolId}' must support at least one capability`)
    }
    this.tools.set(descriptor.toolId, Object.freeze({ ...descriptor }))
  }

  public getTool(toolId: string): ToolDescriptor | undefined {
    return this.tools.get(toolId)
  }

  public listTools(): readonly ToolDescriptor[] {
    return Array.from(this.tools.values())
  }

  public findToolsForCapability(capability: string): readonly ToolDescriptor[] {
    return Array.from(this.tools.values()).filter((t) =>
      t.supportedCapabilities.includes(capability)
    )
  }
}
