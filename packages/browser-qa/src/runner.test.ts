import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdtemp, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { BrowserQaContract } from '@gravitas/core'
import { validateContract } from './dsl.js'
import { BrowserQaValidationError } from './errors.js'
import { startFixtureServer, type FixtureServerInstance } from './fixture.js'
import { executeBrowserQa } from './runner.js'

describe('Browser QA Action DSL Validator', () => {
  it('validates a well-formed contract', () => {
    const raw = {
      id: 'contract_qa_test',
      description: 'Test contract',
      actions: [
        { type: 'navigate', url: 'http://127.0.0.1:3000/' },
        { type: 'assertVisible', selector: '#title' },
        { type: 'assertText', selector: '#title', expected: 'Gravitas' },
        { type: 'fill', selector: '#input', value: 'hello' },
        { type: 'click', selector: '#submit' },
        { type: 'screenshot', name: 'final_state' },
      ],
    }

    const validated = validateContract(raw)
    expect(validated.id).toBe('contract_qa_test')
    expect(validated.actions).toHaveLength(6)
  })

  it('rejects contract missing id or actions', () => {
    expect(() => validateContract({})).toThrow(BrowserQaValidationError)
    expect(() => validateContract({ id: 'test', actions: [] })).toThrow(BrowserQaValidationError)
  })

  it('rejects unknown action types', () => {
    expect(() =>
      validateContract({
        id: 'test',
        actions: [{ type: 'magicClick', selector: '#btn' }],
      })
    ).toThrow(/Unknown or unsupported Browser QA action type/)
  })
})

describe('Deterministic Browser QA Runner Execution', () => {
  let fixture: FixtureServerInstance
  let tempScratchDir: string

  beforeAll(async () => {
    tempScratchDir = await mkdtemp(join(tmpdir(), 'gravitas-browser-qa-test-'))

    const testHtml = `<!DOCTYPE html>
<html>
<head><title>QA Fixture</title></head>
<body>
  <h1 id="heading">Gravitas Living HQ</h1>
  <div id="output">Initial State</div>
  <input id="test-input" type="text" value="" />
  <button id="test-btn" onclick="document.getElementById('output').textContent = 'Clicked: ' + document.getElementById('test-input').value">Submit</button>
  <img src="/missing-asset.png" alt="Missing" />
  <script>
    console.error('Fixture logged a test error');
  </script>
</body>
</html>`

    fixture = await startFixtureServer({
      routes: {
        '/': testHtml,
      },
    })
  })

  afterAll(async () => {
    if (fixture) {
      await fixture.close()
    }
    if (tempScratchDir) {
      await rm(tempScratchDir, { recursive: true, force: true })
    }
  })

  it('executes full sequence of valid steps and captures observations', async () => {
    const contract: BrowserQaContract = {
      id: 'qa_success_contract',
      actions: [
        { type: 'navigate', url: `${fixture.url}/` },
        { type: 'assertVisible', selector: '#heading' },
        { type: 'assertText', selector: '#heading', expected: 'Gravitas Living HQ', exact: true },
        { type: 'fill', selector: '#test-input', value: 'Integration Works' },
        { type: 'click', selector: '#test-btn' },
        { type: 'assertText', selector: '#output', expected: 'Clicked: Integration Works' },
        { type: 'screenshot', name: 'qa-verified-desk' },
      ],
    }

    const result = await executeBrowserQa({
      taskId: 'task_qa_1',
      contract,
      screenshotDir: tempScratchDir,
      headless: true,
      defaultTimeoutMs: 3000,
    })

    expect(result.status).toBe('PASSED')
    expect(result.taskId).toBe('task_qa_1')
    expect(result.steps).toHaveLength(7)
    for (const step of result.steps) {
      expect(step.status).toBe('PASSED')
    }

    // Observations verification
    expect(result.observations.consoleErrors).toContain('Fixture logged a test error')
    expect(result.observations.failedRequests.some((r) => r.url.includes('/missing-asset.png'))).toBe(true)

    // Screenshot verification
    expect(result.screenshots).toHaveLength(1)
    expect(result.screenshots[0]?.name).toBe('qa-verified-desk.png')
    const screenshotFileStat = await stat(result.screenshots[0]!.path)
    expect(screenshotFileStat.size).toBeGreaterThan(0)
  }, 60000)

  it('fails cleanly when assertion fails and breaks execution fail-fast', async () => {
    const contract: BrowserQaContract = {
      id: 'qa_failure_contract',
      actions: [
        { type: 'navigate', url: `${fixture.url}/` },
        { type: 'assertVisible', selector: '#nonexistent-element-xyz', timeoutMs: 500 },
        { type: 'click', selector: '#test-btn' }, // Should never run
      ],
    }

    const result = await executeBrowserQa({
      taskId: 'task_qa_2',
      contract,
      headless: true,
      defaultTimeoutMs: 1000,
    })

    expect(result.status).toBe('FAILED')
    expect(result.steps).toHaveLength(2)
    expect(result.steps[0]?.status).toBe('PASSED')
    expect(result.steps[1]?.status).toBe('FAILED')
    expect(result.steps[1]?.error).toBeDefined()
    expect(result.error).toContain('Step 2 (assertVisible) failed')
  }, 60000)

  it('fails cleanly when assertText does not match', async () => {
    const contract: BrowserQaContract = {
      id: 'qa_text_mismatch_contract',
      actions: [
        { type: 'navigate', url: `${fixture.url}/` },
        { type: 'assertText', selector: '#heading', expected: 'Totally Wrong Heading', exact: true },
      ],
    }

    const result = await executeBrowserQa({
      taskId: 'task_qa_3',
      contract,
      headless: true,
      defaultTimeoutMs: 1000,
    })

    expect(result.status).toBe('FAILED')
    expect(result.steps[1]?.status).toBe('FAILED')
    expect(result.error).toContain('Expected text in')
  }, 60000)
})
