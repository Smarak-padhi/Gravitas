/**
 * Error boundaries for @gravitas/browser-qa.
 */

export class BrowserQaSecurityError extends Error {
  public constructor(message: string) {
    super(message)
    this.name = 'BrowserQaSecurityError'
  }
}

export class BrowserQaValidationError extends Error {
  public constructor(message: string) {
    super(message)
    this.name = 'BrowserQaValidationError'
  }
}

export class BrowserQaExecutionError extends Error {
  public constructor(message: string) {
    super(message)
    this.name = 'BrowserQaExecutionError'
  }
}
