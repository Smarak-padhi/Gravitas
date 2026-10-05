/**
 * @gravitas/orchestrator k5 — Public Export Boundary
 *
 * Independent Verification runtime. Replaces the earlier first-slice verifier
 * (verifier.ts / falsification.ts), which could return VERIFIED_PASS without executing
 * anything. See docs/architecture-v2/K5_OBJECTIVE_LEDGER.md.
 */

export * from './types.js'
export * from './digest.js'
export * from './store.js'
export * from './engine.js'
