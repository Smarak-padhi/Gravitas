import { describe, it, expect } from 'vitest'
import {
  createExecutionContract,
  validateExecutionContract,
  type ExecutionContractInput,
} from './contract.js'
import { ContractValidationError } from './errors.js'

describe('ExecutionContract Creation and Validation', () => {
  const validMinimalInput: ExecutionContractInput = {
    goal: 'Implement user login workflow with MFA',
    repository: 'C:/repos/auth-service',
    baseBranch: 'main',
    acceptanceCriteria: [
      {
        id: 'AC-1',
        description: 'User can log in with valid email and password',
        verificationMethod: 'AUTOMATED_TEST',
      },
      {
        id: 'AC-2',
        description: 'MFA token is required when MFA is enabled',
        verificationMethod: 'AUTOMATED_TEST',
      },
    ],
  }

  describe('Valid contracts', () => {
    it('creates a valid ExecutionContract with minimal inputs', () => {
      const contract = createExecutionContract(validMinimalInput)

      expect(contract.version).toBe('1.0.0')
      expect(contract.goal).toBe('Implement user login workflow with MFA')
      expect(contract.repository).toBe('C:/repos/auth-service')
      expect(contract.baseBranch).toBe('main')
      expect(contract.acceptanceCriteria).toHaveLength(2)
      expect(contract.constraints).toEqual([])
      expect(contract.requiredEvidence).toEqual([])
    })

    it('creates a contract with custom version, constraints, and required evidence', () => {
      const contract = createExecutionContract({
        ...validMinimalInput,
        version: '2.1.0',
        constraints: ['No external network access in tests', 'Use existing DB schema'],
        requiredEvidence: [
          {
            id: 'EV-1',
            type: 'GIT_DIFF',
            description: 'Clean git diff against main',
            mandatory: true,
          },
          {
            id: 'EV-2',
            type: 'TEST_REPORT',
            description: 'Vitest test output demonstrating 100% pass',
            mandatory: true,
          },
        ],
      })

      expect(contract.version).toBe('2.1.0')
      expect(contract.constraints).toHaveLength(2)
      expect(contract.requiredEvidence).toHaveLength(2)
      expect(contract.requiredEvidence[0]?.id).toBe('EV-1')
    })
  })

  describe('Rejection of blank or invalid required fields', () => {
    it('rejects blank goal', () => {
      expect(() =>
        createExecutionContract({ ...validMinimalInput, goal: '   ' })
      ).toThrow(ContractValidationError)

      const validation = validateExecutionContract({ ...validMinimalInput, goal: '' })
      expect(validation.valid).toBe(false)
      expect(validation.issues.some((i) => i.includes('goal'))).toBe(true)
    })

    it('rejects blank repository', () => {
      expect(() =>
        createExecutionContract({ ...validMinimalInput, repository: '' })
      ).toThrow(ContractValidationError)

      const validation = validateExecutionContract({ ...validMinimalInput, repository: '  ' })
      expect(validation.valid).toBe(false)
      expect(validation.issues.some((i) => i.includes('repository'))).toBe(true)
    })

    it('rejects blank baseBranch', () => {
      expect(() =>
        createExecutionContract({ ...validMinimalInput, baseBranch: '' })
      ).toThrow(ContractValidationError)

      const validation = validateExecutionContract({ ...validMinimalInput, baseBranch: '  ' })
      expect(validation.valid).toBe(false)
      expect(validation.issues.some((i) => i.includes('baseBranch'))).toBe(true)
    })

    it('rejects empty acceptanceCriteria', () => {
      expect(() =>
        createExecutionContract({ ...validMinimalInput, acceptanceCriteria: [] })
      ).toThrow(ContractValidationError)

      const validation = validateExecutionContract({ ...validMinimalInput, acceptanceCriteria: [] })
      expect(validation.valid).toBe(false)
      expect(validation.issues.some((i) => i.includes('at least one acceptance criterion'))).toBe(true)
    })

    it('rejects acceptance criterion with blank id or description', () => {
      const inputWithBlankAcId: ExecutionContractInput = {
        ...validMinimalInput,
        acceptanceCriteria: [{ id: '  ', description: 'Valid description' }],
      }
      expect(() => createExecutionContract(inputWithBlankAcId)).toThrow(ContractValidationError)

      const inputWithBlankAcDesc: ExecutionContractInput = {
        ...validMinimalInput,
        acceptanceCriteria: [{ id: 'AC-1', description: '  ' }],
      }
      expect(() => createExecutionContract(inputWithBlankAcDesc)).toThrow(ContractValidationError)
    })
  })

  describe('Duplicate ID detection', () => {
    it('rejects duplicate acceptance criteria IDs', () => {
      const inputWithDuplicates: ExecutionContractInput = {
        ...validMinimalInput,
        acceptanceCriteria: [
          { id: 'AC-1', description: 'First AC' },
          { id: 'AC-2', description: 'Second AC' },
          { id: 'AC-1', description: 'Duplicate AC-1' },
        ],
      }

      expect(() => createExecutionContract(inputWithDuplicates)).toThrow(ContractValidationError)

      const validation = validateExecutionContract(inputWithDuplicates)
      expect(validation.valid).toBe(false)
      expect(validation.issues.some((i) => i.includes('Duplicate acceptance criterion ID "AC-1"'))).toBe(true)
    })

    it('rejects duplicate required evidence IDs', () => {
      const inputWithDuplicateEvidence: ExecutionContractInput = {
        ...validMinimalInput,
        requiredEvidence: [
          { id: 'EV-1', type: 'GIT_DIFF', description: 'Diff', mandatory: true },
          { id: 'EV-1', type: 'TEST_REPORT', description: 'Report', mandatory: true },
        ],
      }

      expect(() => createExecutionContract(inputWithDuplicateEvidence)).toThrow(ContractValidationError)

      const validation = validateExecutionContract(inputWithDuplicateEvidence)
      expect(validation.valid).toBe(false)
      expect(validation.issues.some((i) => i.includes('Duplicate required evidence ID "EV-1"'))).toBe(true)
    })
  })
})
