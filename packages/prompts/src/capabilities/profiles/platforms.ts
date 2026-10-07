/**
 * @gravitas/prompts — Platform Capability Profiles
 *
 * Compiles the 3 approved SA3 platform capability profiles:
 * - PROFILE-PLAT-001: Android Platform (Jetpack Compose, Android XR, Gradle)
 * - PROFILE-PLAT-002: iOS Platform (SwiftUI, Apple Platform APIs, Concurrency)
 * - PROFILE-PLAT-003: Web Platform (Web Standards, DOM, CSS, Accessible HTML)
 *
 * Provenance:
 * Frozen SA3 platform profiles in docs/skill-arena/sa3/platform-profiles.json.
 */

import type { CapabilityProfile } from '../types.js'

export const ANDROID_PLATFORM_PROFILE: CapabilityProfile = {
  id: 'PROFILE-PLAT-001',
  version: '1.0.0',
  title: 'Android Platform Engineering',
  category: 'PLATFORM',
  scope: 'PLATFORM_ANDROID',
  platform: 'android',
  status: 'ACTIVE_CANONICAL',
  authorityClass: 'MANAGED_POLICY',
  conflicts: ['PROFILE-PLAT-002', 'PROFILE-PLAT-003'],
  activationConditions: {
    platforms: ['android'],
    keywords: ['android', 'compose', 'kotlin', 'gradle', 'jetpack', 'camerax', 'aar'],
    fileExtensions: ['.kt', '.kts', '.gradle', '.xml'],
  },
  sourceRefs: ['sa3://platform-profiles/PROFILE-PLAT-001'],
  sourceHashes: ['sha256:4d60c49ca14d50c18408ae7c520c8227bba0987fba4f5096503c72bdf27ff333'],
  rules: [
    {
      id: 'RULE-PLAT-AND-001',
      sourceRuleId: 'RULE-AND-ADAPT-000244',
      statement: 'Use Jetpack Compose adaptive window size classes and scaffold layouts instead of hardcoded screen dimension assumptions.',
      severity: 'MANDATORY',
      category: 'ADAPTIVE_LAYOUT',
    },
    {
      id: 'RULE-PLAT-AND-002',
      sourceRuleId: 'RULE-AND-SEC-000250',
      statement: 'Audit explicit component exports in AndroidManifest.xml and prevent Intent Redirection vulnerabilities by validating incoming extras fail-closed.',
      severity: 'MANDATORY',
      category: 'SECURITY',
      isSecurityFloor: true,
    },
  ],
}

export const IOS_PLATFORM_PROFILE: CapabilityProfile = {
  id: 'PROFILE-PLAT-002',
  version: '1.0.0',
  title: 'iOS / Apple Platform Engineering',
  category: 'PLATFORM',
  scope: 'PLATFORM_IOS',
  platform: 'ios',
  status: 'ACTIVE_CANONICAL',
  authorityClass: 'MANAGED_POLICY',
  conflicts: ['PROFILE-PLAT-001', 'PROFILE-PLAT-003'],
  activationConditions: {
    platforms: ['ios'],
    keywords: ['ios', 'swift', 'swiftui', 'apple', 'xcode', 'macos', 'keychain'],
    fileExtensions: ['.swift', '.xcstrings', '.plist', '.xcodeproj', '.xcworkspace'],
  },
  sourceRefs: ['sa3://platform-profiles/PROFILE-PLAT-002'],
  sourceHashes: ['sha256:7c9e1104e1e075c3258591f46487e38f658cb7d6c62c231737be59eeef1f7d54'],
  rules: [
    {
      id: 'RULE-PLAT-IOS-001',
      sourceRuleId: 'RULE-IOS-CONC-000412',
      statement: 'Adhere to strict Swift 6 structured concurrency and MainActor isolation; avoid unsafe nonisolated data sharing.',
      severity: 'MANDATORY',
      category: 'CONCURRENCY',
    },
    {
      id: 'RULE-PLAT-IOS-002',
      sourceRuleId: 'RULE-IOS-SEC-000425',
      statement: 'Store sensitive credentials in Keychain Services via SecItem queries or CryptoKit; never in UserDefaults or plain plist files.',
      severity: 'MANDATORY',
      category: 'SECURITY',
      isSecurityFloor: true,
    },
  ],
}

export const WEB_PLATFORM_PROFILE: CapabilityProfile = {
  id: 'PROFILE-PLAT-003',
  version: '1.0.0',
  title: 'Web Platform Standards & DOM Hygiene',
  category: 'PLATFORM',
  scope: 'PLATFORM_WEB',
  platform: 'web',
  status: 'ACTIVE_CANONICAL',
  authorityClass: 'MANAGED_POLICY',
  conflicts: ['PROFILE-PLAT-001', 'PROFILE-PLAT-002'],
  activationConditions: {
    platforms: ['web'],
    keywords: ['web', 'browser', 'dom', 'css', 'html', 'react', 'vite', 'electron'],
    fileExtensions: ['.html', '.css', '.tsx', '.jsx', '.ts', '.mjs'],
  },
  sourceRefs: ['sa3://platform-profiles/PROFILE-PLAT-003'],
  sourceHashes: ['sha256:88bc23190df09a56c7da44ee2d4157121c97a8cb23e421e42e47c7c00e163d41'],
  rules: [
    {
      id: 'RULE-PLAT-WEB-001',
      sourceRuleId: 'RULE-WEB-DOM-000501',
      statement: 'Render untrusted user input strictly as text data (textContent / escaped data attributes); never inject unescaped innerHTML.',
      severity: 'MANDATORY',
      category: 'SECURITY',
      isSecurityFloor: true,
    },
    {
      id: 'RULE-PLAT-WEB-002',
      sourceRuleId: 'RULE-WEB-A11Y-000502',
      statement: 'Provide native semantic HTML landmarks (header, nav, main, dialog), keyboard tab traversal, and ARIA live regions for async state updates.',
      severity: 'MANDATORY',
      category: 'ACCESSIBILITY',
      isAccessibilityFloor: true,
    },
  ],
}

export const PLATFORM_PROFILES: readonly CapabilityProfile[] = [
  ANDROID_PLATFORM_PROFILE,
  IOS_PLATFORM_PROFILE,
  WEB_PLATFORM_PROFILE,
]
