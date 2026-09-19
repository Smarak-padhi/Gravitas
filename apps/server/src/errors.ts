/**
 * Domain errors for @gravitas/server HTTP API and control plane.
 */

export class ApiError extends Error {
  public readonly statusCode: number
  public readonly code: string

  public constructor(code: string, message: string, statusCode: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.statusCode = statusCode
  }
}

export class NotFoundError extends ApiError {
  public constructor(resource: string, id: string) {
    super(`${resource.toUpperCase()}_NOT_FOUND`, `${resource} '${id}' was not found.`, 404)
    this.name = 'NotFoundError'
  }
}

export class TaskStateConflictError extends ApiError {
  public constructor(message: string) {
    super('TASK_NOT_APPROVABLE', message, 409)
    this.name = 'TaskStateConflictError'
  }
}

export class InvalidRequestError extends ApiError {
  public constructor(code: string, message: string) {
    super(code, message, 400)
    this.name = 'InvalidRequestError'
  }
}

export class PayloadTooLargeError extends ApiError {
  public constructor(message = 'Request payload exceeds 256 KiB limit.') {
    super('PAYLOAD_TOO_LARGE', message, 413)
    this.name = 'PayloadTooLargeError'
  }
}
