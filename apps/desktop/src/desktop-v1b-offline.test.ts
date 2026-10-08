/**
 * @gravitas/desktop — Desktop Offline & Model Intelligence Projection Invariants (Wave V1-B)
 *
 * Proves that:
 * 1. Desktop supervisor / kernel host generates modelIntelligenceSummary projection cleanly offline
 * 2. Qualified models are reported with zero-dollar spend policy
 * 3. Zero credential leakage exists in projected desktop state
 * 4. Renderer index.html and renderer.ts contain model intelligence diagnostic fields
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { KernelHost } from './kernel-host/kernelHost.js';
import { DesktopSupervisor } from './main/supervisor.js';

describe('GRAVITAS V1-B Desktop Offline & Model Intelligence Projection Suite', () => {
  const rootDir = process.cwd();
  const indexHtmlPath = join(rootDir, 'apps/desktop/src/renderer/index.html');
  const rendererTsPath = join(rootDir, 'apps/desktop/src/renderer/renderer.ts');

  it('1. KernelHost generates SystemProjection with modelIntelligenceSummary offline', () => {
    const host = new KernelHost();
    const projection = host.generateSystemProjection();

    expect(projection.modelIntelligenceSummary).toBeDefined();
    const summary = projection.modelIntelligenceSummary!;

    // Provider status
    expect(['AVAILABLE', 'AUTH_REQUIRED']).toContain(summary.providerStatus);

    // Qualified models presence (unprobed/uncredentialed offline reflects 0 qualified, 3 candidate)
    expect(summary.qualifiedModelsCount).toBe(0);
    expect(summary.qualifiedModelIds).toEqual([]);
    expect(summary.candidateModelsCount).toBe(3);
    expect(summary.candidateModelIds).toContain('meta/llama-3.1-8b-instruct');
    expect(summary.candidateModelIds).toContain('meta/llama-3.1-70b-instruct');
    expect(summary.candidateModelIds).toContain('mistralai/mixtral-8x7b-instruct-v0.1');

    // Default model and policy
    expect(summary.defaultModel).toContain('meta/llama-3.1-8b-instruct');
    expect(summary.costPolicy).toBe('STRICT_ZERO_DOLLAR_FREE');
    expect(summary.outOfPocketUsd).toBe(0);
    expect(summary.paidFallbackPermitted).toBe(false);

    // Invariant: zero credential values in projected state
    const serialized = JSON.stringify(projection);
    expect(serialized).not.toContain('nvapi-');
    expect(serialized).not.toContain('Bearer ');
    expect(serialized).not.toContain('secret');
  });

  it('2. LocalSupervisor provides offline fallback with modelIntelligenceSummary', async () => {
    const supervisor = new DesktopSupervisor();
    const system = await supervisor.getSystem();

    expect(system.modelIntelligenceSummary).toBeDefined();
    expect(['AVAILABLE', 'AUTH_REQUIRED']).toContain(system.modelIntelligenceSummary?.providerStatus);
    expect(system.modelIntelligenceSummary?.qualifiedModelsCount).toBe(0);
    expect(system.modelIntelligenceSummary?.candidateModelsCount).toBe(3);
    expect(system.modelIntelligenceSummary?.costPolicy).toBe('STRICT_ZERO_DOLLAR_FREE');
    expect(system.modelIntelligenceSummary?.outOfPocketUsd).toBe(0);
    expect(system.modelIntelligenceSummary?.paidFallbackPermitted).toBe(false);
  });

  it('3. Renderer contains Model Intelligence diagnostic rows in System table', () => {
    const rendererSrc = readFileSync(rendererTsPath, 'utf8');

    expect(rendererSrc).toContain('Model Provider (NVIDIA NIM)');
    expect(rendererSrc).toContain('Qualified Models ($0 Free)');
    expect(rendererSrc).toContain('Default Candidate Model');
    expect(rendererSrc).toContain('Model Spend Policy');
    expect(rendererSrc).toContain('modelIntelligenceSummary');
  });

  it('4. index.html system status table includes system-diagnostics container', () => {
    const html = readFileSync(indexHtmlPath, 'utf8');
    expect(html).toContain('id="system-diagnostics-container"');
  });
});
