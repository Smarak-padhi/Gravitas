import { describe, it, expect } from 'vitest'
import * as Core from './index.js'

describe('@gravitas/core — Public Export Boundary', () => {
  it('exports GRAVITAS_VERSION constant', () => {
    expect(Core.GRAVITAS_VERSION).toBe('0.0.1')
  })

  it('exports FSM functions and constants', () => {
    expect(typeof Core.canTransition).toBe('function')
    expect(typeof Core.transitionTask).toBe('function')
    expect(typeof Core.isTerminalState).toBe('function')
    expect(typeof Core.isSuccessfulState).toBe('function')
    expect(typeof Core.isFailedState).toBe('function')
    expect(Core.TERMINAL_STATES).toBeDefined()
    expect(Core.ALLOWED_TRANSITIONS).toBeDefined()
  })

  it('exports dependency evaluation functions', () => {
    expect(typeof Core.isDependencySatisfied).toBe('function')
    expect(typeof Core.isDependencyBroken).toBe('function')
    expect(typeof Core.evaluateTaskReadiness).toBe('function')
    expect(typeof Core.resolveInitialTaskState).toBe('function')
    expect(Core.DEFAULT_SATISFYING_STATES).toEqual(['SUCCEEDED', 'APPROVED'])
  })

  it('exports execution contract functions', () => {
    expect(typeof Core.createExecutionContract).toBe('function')
    expect(typeof Core.validateExecutionContract).toBe('function')
  })

  it('exports prompt composition functions and order', () => {
    expect(typeof Core.composePrompt).toBe('function')
    expect(Core.CANONICAL_PROMPT_LAYER_ORDER).toEqual([
      'GLOBAL',
      'PROJECT',
      'EXECUTION_CONTRACT',
      'TASK',
      'AGENT_ROLE',
      'RUNTIME_CONTEXT',
    ])
  })

  it('exports event model functions and collector', () => {
    expect(typeof Core.generateEventId).toBe('function')
    expect(typeof Core.createGravitasEvent).toBe('function')
    expect(typeof Core.createRunCreatedEvent).toBe('function')
    expect(typeof Core.createTaskCreatedEvent).toBe('function')
    expect(typeof Core.createTaskStateChangedEvent).toBe('function')
    expect(typeof Core.createExecutionContractCreatedEvent).toBe('function')
    expect(typeof Core.InMemoryEventCollector).toBe('function')
  })

  it('exports domain error classes', () => {
    expect(Core.InvalidStateTransitionError).toBeDefined()
    expect(Core.ContractValidationError).toBeDefined()
    expect(Core.DependencyEvaluationError).toBeDefined()
  })
})
