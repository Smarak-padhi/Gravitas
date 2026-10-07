/**
 * @gravitas/prompts — Capability Profile Registry
 *
 * Provides authoritative storage, validation, and retrieval for compiled
 * capability profiles.
 *
 * Invariants:
 * - Duplicate profile IDs fail closed
 * - Unknown profile IDs throw Error
 * - Broken or empty source references fail closed
 */

import type { CapabilityProfile } from './types.js'
import { GLOBAL_ENGINEERING_PROFILE } from './profiles/global.js'
import { PLATFORM_PROFILES } from './profiles/platforms.js'
import { IMPECCABLE_DESIGN_PROFILE } from './profiles/impeccable.js'

export class CapabilityRegistry {
  private readonly profiles = new Map<string, CapabilityProfile>()

  constructor(initialProfiles?: readonly CapabilityProfile[]) {
    const list = initialProfiles ?? [
      GLOBAL_ENGINEERING_PROFILE,
      ...PLATFORM_PROFILES,
      IMPECCABLE_DESIGN_PROFILE,
    ]

    for (const p of list) {
      this.register(p)
    }
  }

  public register(profile: CapabilityProfile): void {
    if (!profile.id || typeof profile.id !== 'string') {
      throw new Error('[CapabilityRegistry] Invalid profile id')
    }
    if (this.profiles.has(profile.id)) {
      throw new Error(`[CapabilityRegistry] Duplicate profile id: ${profile.id}`)
    }
    if (!profile.sourceRefs || profile.sourceRefs.length === 0) {
      throw new Error(`[CapabilityRegistry] Profile ${profile.id} lacks required source references`)
    }
    for (const ref of profile.sourceRefs) {
      if (!ref || ref.trim().length === 0) {
        throw new Error(`[CapabilityRegistry] Profile ${profile.id} contains empty source reference`)
      }
    }
    this.profiles.set(profile.id, profile)
  }

  public get(id: string): CapabilityProfile {
    const p = this.profiles.get(id)
    if (!p) {
      throw new Error(`[CapabilityRegistry] Unknown capability profile id: ${id}`)
    }
    return p
  }

  public has(id: string): boolean {
    return this.profiles.has(id)
  }

  public getAll(): readonly CapabilityProfile[] {
    return Array.from(this.profiles.values())
  }
}

export const DEFAULT_CAPABILITY_REGISTRY = new CapabilityRegistry()
