/**
 * @gravitas/browser-qa — Public Export Boundary.
 *
 * Deterministic Browser QA engine powered by Playwright.
 * Strictly local loopback origin security, action DSL validator,
 * observation collector, and process management.
 */

export {
  BrowserQaSecurityError,
  BrowserQaValidationError,
  BrowserQaExecutionError,
} from './errors.js'

export {
  ALLOWED_LOOPBACK_HOSTS,
  validateTargetUrl,
  validateScreenshotName,
} from './security.js'

export {
  validateAction,
  validateContract,
} from './dsl.js'

export {
  BrowserQaObserver,
  type RecordedFailedRequest,
} from './observer.js'

export {
  startFixtureServer,
  type FixtureServerInstance,
  type FixtureServerOptions,
  type RouteHandler,
} from './fixture.js'

export {
  executeBrowserQa,
  DEFAULT_STEP_TIMEOUT_MS,
  type ExecuteBrowserQaOptions,
} from './runner.js'
