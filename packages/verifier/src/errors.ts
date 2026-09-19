/**
 * Domain errors for @gravitas/verifier.
 */

export class VerificationExecutionError extends Error {
  public override readonly name = 'VerificationExecutionError'

  constructor(
    public readonly commandId: string,
    message: string,
    public readonly exitCode?: number | null,
    public readonly terminationReason?: string
  ) {
    super(`Verification command "${commandId}" failed: ${message}`)
  }
}

export class EvidenceCollectionError extends Error {
  public override readonly name = 'EvidenceCollectionError'

  constructor(
    public readonly artifactPath: string,
    message: string
  ) {
    super(`Evidence collection failed for "${artifactPath}": ${message}`)
  }
}

export class VerificationPolicyError extends Error {
  public override readonly name = 'VerificationPolicyError'

  constructor(message: string) {
    super(`Verification policy violation: ${message}`)
  }
}
