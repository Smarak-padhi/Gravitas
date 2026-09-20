/**
 * Browser QA Action DSL and Validation.
 *
 * Supported Actions:
 * - `navigate`: target url (validated for local origin)
 * - `click`: target selector with timeout
 * - `fill`: target selector and value string
 * - `assertVisible`: target selector
 * - `assertText`: target selector and expected string
 * - `screenshot`: safe screenshot identifier
 */

import type { BrowserQaAction, BrowserQaContract } from '@gravitas/core'
import { BrowserQaValidationError } from './errors.js'
import { validateScreenshotName, validateTargetUrl } from './security.js'

/**
 * Validates a single action item from DSL input.
 */
export function validateAction(rawAction: unknown, allowedOrigins?: readonly string[] | undefined): BrowserQaAction {
  if (!rawAction || typeof rawAction !== 'object') {
    throw new BrowserQaValidationError('Action must be a non-null object')
  }

  const action = rawAction as Record<string, unknown>
  const type = action['type']

  switch (type) {
    case 'navigate': {
      const url = action['url']
      if (typeof url !== 'string' || !url.trim()) {
        throw new BrowserQaValidationError("Action 'navigate' requires a non-empty 'url' string")
      }
      // Security check on URL
      validateTargetUrl(url, allowedOrigins)
      return { type: 'navigate', url }
    }

    case 'click': {
      const selector = action['selector']
      if (typeof selector !== 'string' || !selector.trim()) {
        throw new BrowserQaValidationError("Action 'click' requires a non-empty 'selector' string")
      }
      const timeoutMs = typeof action['timeoutMs'] === 'number' ? action['timeoutMs'] : undefined
      return { type: 'click', selector: selector.trim(), timeoutMs }
    }

    case 'fill': {
      const selector = action['selector']
      if (typeof selector !== 'string' || !selector.trim()) {
        throw new BrowserQaValidationError("Action 'fill' requires a non-empty 'selector' string")
      }
      const value = action['value']
      if (typeof value !== 'string') {
        throw new BrowserQaValidationError("Action 'fill' requires a 'value' string")
      }
      const timeoutMs = typeof action['timeoutMs'] === 'number' ? action['timeoutMs'] : undefined
      return { type: 'fill', selector: selector.trim(), value, timeoutMs }
    }

    case 'assertVisible': {
      const selector = action['selector']
      if (typeof selector !== 'string' || !selector.trim()) {
        throw new BrowserQaValidationError("Action 'assertVisible' requires a non-empty 'selector' string")
      }
      const timeoutMs = typeof action['timeoutMs'] === 'number' ? action['timeoutMs'] : undefined
      return { type: 'assertVisible', selector: selector.trim(), timeoutMs }
    }

    case 'assertText': {
      const selector = action['selector']
      if (typeof selector !== 'string' || !selector.trim()) {
        throw new BrowserQaValidationError("Action 'assertText' requires a non-empty 'selector' string")
      }
      const expected = action['expected']
      if (typeof expected !== 'string') {
        throw new BrowserQaValidationError("Action 'assertText' requires an 'expected' string")
      }
      const exact = typeof action['exact'] === 'boolean' ? action['exact'] : undefined
      const timeoutMs = typeof action['timeoutMs'] === 'number' ? action['timeoutMs'] : undefined
      return { type: 'assertText', selector: selector.trim(), expected, exact, timeoutMs }
    }

    case 'screenshot': {
      const name = action['name']
      if (typeof name !== 'string' || !name.trim()) {
        throw new BrowserQaValidationError("Action 'screenshot' requires a non-empty 'name' string")
      }
      const safeName = validateScreenshotName(name)
      return { type: 'screenshot', name: safeName }
    }

    default:
      throw new BrowserQaValidationError(`Unknown or unsupported Browser QA action type: '${String(type)}'`)
  }
}

/**
 * Validates a complete BrowserQaContract.
 */
export function validateContract(rawContract: unknown): BrowserQaContract {
  if (!rawContract || typeof rawContract !== 'object') {
    throw new BrowserQaValidationError('BrowserQaContract must be a non-null object')
  }

  const contract = rawContract as Record<string, unknown>
  const id = contract['id']
  if (typeof id !== 'string' || !id.trim()) {
    throw new BrowserQaValidationError("BrowserQaContract requires a non-empty 'id' string")
  }

  const rawActions = contract['actions']
  if (!Array.isArray(rawActions) || rawActions.length === 0) {
    throw new BrowserQaValidationError("BrowserQaContract requires a non-empty 'actions' array")
  }

  const allowedOrigins = Array.isArray(contract['allowedOrigins'])
    ? (contract['allowedOrigins'] as string[])
    : undefined

  const validatedActions = rawActions.map((action) => validateAction(action, allowedOrigins))

  return {
    id: id.trim(),
    description: typeof contract['description'] === 'string' ? contract['description'] : undefined,
    baseUrl: typeof contract['baseUrl'] === 'string' ? contract['baseUrl'] : undefined,
    actions: Object.freeze(validatedActions),
    allowedOrigins: allowedOrigins ? Object.freeze([...allowedOrigins]) : undefined,
    maxDurationMs: typeof contract['maxDurationMs'] === 'number' ? contract['maxDurationMs'] : undefined,
  }
}
