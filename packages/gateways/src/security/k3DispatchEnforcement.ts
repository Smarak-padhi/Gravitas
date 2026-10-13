/**
 * Gravitas — K3 Dispatch-Time CapabilityGrant Verification (Wave V1-B-R)
 *
 * Proves that provider network dispatch requires a valid, active, non-expired,
 * correctly scoped K3 CapabilityGrant.
 *
 * Invariant:
 * Hostname allowlisting is NOT K3 authorization. Network dispatch fails closed
 * before socket creation without a valid CapabilityGrant.
 */

import { randomUUID } from 'node:crypto';
import type { K3DispatchCapabilityGrant } from '../providers/types.js';

const ALLOWED_OFFLINE_NVIDIA_MODELS = new Set([
  'meta/llama-3.1-8b-instruct',
  'meta/llama-3.1-70b-instruct',
  'mistralai/mixtral-8x7b-instruct-v0.1',
]);
const FIXED_NVIDIA_PROVIDER_CAPABILITY = 'provider:nvidia-nim';
const FIXED_NVIDIA_TOOL_ID = 'tool:nvidia-nim:chat';
const FIXED_NVIDIA_ORIGIN = 'https://integrate.api.nvidia.com';
const FIXED_NVIDIA_OPERATION = 'chat_completions';
const FIXED_NVIDIA_CREDENTIAL_REF = 'vault:cred:nvidia-nim';
const FIXED_OFFLINE_COST_CEILING = 'ZERO_DOLLAR_FREE';
const FIXED_OFFLINE_AUTHORITY_CEILING = 'RESTRICTED_INFERENCE';

// Object identity is a process-local authority boundary; serialized/forged grants fail closed.
const trustedGrants = new WeakSet<object>();
const TRUSTED_ISSUER_TOKEN = Symbol('gravitas.k3.offline.issuer');

function freezeGrant(grant: K3DispatchCapabilityGrant): K3DispatchCapabilityGrant {
  return Object.freeze({
    ...grant,
    grantedCapabilities: Object.freeze([...grant.grantedCapabilities]),
    authorizedToolIds: Object.freeze([...grant.authorizedToolIds]),
    credentialReferences: Object.freeze([...(grant.credentialReferences ?? [])]),
    resourceScope: Object.freeze({
      allowedOrigins: Object.freeze([...(grant.resourceScope.allowedOrigins ?? [])]),
      allowedPaths: Object.freeze([...(grant.resourceScope.allowedPaths ?? [])]),
      allowedOperations: Object.freeze([...(grant.resourceScope.allowedOperations ?? [])]),
    }),
  });
}

export function authorizeOfflineNvidiaGrant(
  grant: K3DispatchCapabilityGrant,
  issuerToken?: symbol
): K3DispatchCapabilityGrant {
  if (issuerToken !== TRUSTED_ISSUER_TOKEN) {
    throw new Error('Offline dispatch policy denied: self-constructed grants cannot be registered as trusted');
  }
  const expiresAtMs = new Date(grant.expiresAt).getTime();
  const hasValidIdentity = [
    grant.grantId,
    grant.subjectId,
    grant.workSessionId,
    grant.runId,
    grant.taskId,
  ].every((x) => typeof x === 'string' && x.trim().length > 0);
  const hasFixedProviderScope =
    grant.grantedCapabilities?.length === 1 &&
    grant.grantedCapabilities[0] === FIXED_NVIDIA_PROVIDER_CAPABILITY &&
    grant.authorizedToolIds?.length === 1 &&
    grant.authorizedToolIds[0] === FIXED_NVIDIA_TOOL_ID;
  const hasFixedEndpointScope =
    grant.resourceScope?.allowedOrigins?.length === 1 &&
    grant.resourceScope.allowedOrigins[0] === FIXED_NVIDIA_ORIGIN &&
    grant.resourceScope?.allowedOperations?.length === 1 &&
    grant.resourceScope.allowedOperations[0] === FIXED_NVIDIA_OPERATION;
  const hasFixedModelScope =
    grant.resourceScope?.allowedPaths?.length === 1 &&
    ALLOWED_OFFLINE_NVIDIA_MODELS.has(grant.resourceScope.allowedPaths[0]!);
  const hasFixedCredentialScope =
    grant.credentialReferences?.length === 1 &&
    grant.credentialReferences[0] === FIXED_NVIDIA_CREDENTIAL_REF;
  const hasFixedCostAndAuthority =
    grant.costCeiling === FIXED_OFFLINE_COST_CEILING &&
    grant.authorityCeiling === FIXED_OFFLINE_AUTHORITY_CEILING;

  if (
    grant.status !== 'ACTIVE' ||
    !hasValidIdentity ||
    !hasFixedProviderScope ||
    !hasFixedEndpointScope ||
    !hasFixedModelScope ||
    !hasFixedCredentialScope ||
    !hasFixedCostAndAuthority ||
    !Number.isFinite(expiresAtMs) ||
    expiresAtMs <= Date.now()
  ) {
    throw new Error('Offline dispatch policy denied');
  }

  const frozen = freezeGrant(grant);
  trustedGrants.add(frozen);
  return frozen;
}

/**
 * Policy-issued offline-test authority; caller context is supplied by trusted host construction.
 * Never represents human approval or live production qualification.
 */
export function authorizeOfflineNvidiaDispatch(context: {
  subjectId: string;
  workSessionId: string;
  runId: string;
  taskId: string;
  model: string;
}): K3DispatchCapabilityGrant {
  if (!ALLOWED_OFFLINE_NVIDIA_MODELS.has(context.model)) {
    throw new Error('Model denied by offline policy');
  }
  return authorizeOfflineNvidiaGrant(
    {
      grantId: randomUUID(),
      subjectId: context.subjectId,
      workSessionId: context.workSessionId,
      runId: context.runId,
      taskId: context.taskId,
      grantedCapabilities: [FIXED_NVIDIA_PROVIDER_CAPABILITY],
      authorizedToolIds: [FIXED_NVIDIA_TOOL_ID],
      resourceScope: {
        allowedOrigins: [FIXED_NVIDIA_ORIGIN],
        allowedOperations: [FIXED_NVIDIA_OPERATION],
        allowedPaths: [context.model],
      },
      authorityCeiling: FIXED_OFFLINE_AUTHORITY_CEILING,
      costCeiling: FIXED_OFFLINE_COST_CEILING,
      expiresAt: new Date(Date.now() + 120000).toISOString(),
      status: 'ACTIVE',
      credentialReferences: [FIXED_NVIDIA_CREDENTIAL_REF],
    },
    TRUSTED_ISSUER_TOKEN
  );
}

/**
 * Narrowly controlled test-only fixture issuer for deterministic offline K3 verification tests.
 * Refuses execution outside test environments and never represents human approval.
 */
export function issueOfflineNvidiaTestFixtureGrant(
  overrides?: Partial<K3DispatchCapabilityGrant>
): K3DispatchCapabilityGrant {
  if (process.env['VITEST'] !== 'true' && process.env['NODE_ENV'] !== 'test') {
    throw new Error('Offline test grant fixtures are restricted to test execution');
  }
  const base = authorizeOfflineNvidiaDispatch({
    subjectId: 'test-subject-offline',
    workSessionId: 'ws-test-offline',
    runId: 'run-test-offline',
    taskId: 'task-test-offline',
    model: 'meta/llama-3.1-8b-instruct',
  });
  const merged: K3DispatchCapabilityGrant = {
    ...base,
    ...overrides,
    authorityCeiling: 'RESTRICTED_INFERENCE',
    costCeiling: 'ZERO_DOLLAR_FREE',
    resourceScope: {
      ...base.resourceScope,
      ...(overrides?.resourceScope ?? {}),
    },
  };
  const frozen = freezeGrant(merged);
  trustedGrants.add(frozen);
  return frozen;
}

export interface K3DispatchGrantVerificationInput {
  readonly grant: K3DispatchCapabilityGrant | undefined | null;
  readonly expectedProvider: string;
  readonly endpointUrl: string;
  readonly model: string;
  readonly credentialRef?: string | undefined;
}

export interface K3DispatchGrantVerificationResult {
  readonly authorized: boolean;
  readonly failureReasonCode?:
    | 'MISSING_CAPABILITY_GRANT'
    | 'GRANT_REVOKED'
    | 'GRANT_EXPIRED'
    | 'PROVIDER_NOT_AUTHORIZED'
    | 'HOST_NOT_AUTHORIZED'
    | 'OPERATION_NOT_AUTHORIZED'
    | 'MODEL_NOT_AUTHORIZED'
    | 'CREDENTIAL_REF_NOT_AUTHORIZED'
    | undefined;
  readonly message?: string | undefined;
}

export function verifyK3DispatchGrant(
  input: K3DispatchGrantVerificationInput
): K3DispatchGrantVerificationResult {
  const { grant, expectedProvider, endpointUrl, model, credentialRef } = input;

  // 1. Missing grant check
  if (!grant || !trustedGrants.has(grant)) {
    return {
      authorized: false,
      failureReasonCode: 'MISSING_CAPABILITY_GRANT',
      message: 'No K3 CapabilityGrant provided for provider dispatch.',
    };
  }

  // 2. Grant status check — require exactly ACTIVE status
  if (grant.status !== 'ACTIVE') {
    if (grant.status === 'EXPIRED') {
      return {
        authorized: false,
        failureReasonCode: 'GRANT_EXPIRED',
        message: `CapabilityGrant '${grant.grantId}' has expired.`,
      };
    }
    return {
      authorized: false,
      failureReasonCode: 'GRANT_REVOKED',
      message: `CapabilityGrant '${grant.grantId}' has been revoked.`,
    };
  }

  // 3. Expiration timestamp check
  const now = Date.now();
  const expiresAtMs = new Date(grant.expiresAt).getTime();
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= now) {
    return {
      authorized: false,
      failureReasonCode: 'GRANT_EXPIRED',
      message: `CapabilityGrant '${grant.grantId}' expired at ${grant.expiresAt}.`,
    };
  }

  // 4. Provider authorization check
  const providerKey = `provider:${expectedProvider}`;
  const grantedCaps = grant.grantedCapabilities ?? [];
  const authToolIds = grant.authorizedToolIds ?? [];
  const isProviderAuthorized =
    grantedCaps.includes(providerKey) &&
    (authToolIds.includes(expectedProvider) || authToolIds.includes(`tool:${expectedProvider}:chat`));

  if (!isProviderAuthorized) {
    return {
      authorized: false,
      failureReasonCode: 'PROVIDER_NOT_AUTHORIZED',
      message: `Provider '${expectedProvider}' is not authorized by CapabilityGrant '${grant.grantId}'.`,
    };
  }

  // 5. Host / Origin authorization check
  let endpointHostname = '';
  try {
    const parsed = new URL(endpointUrl);
    if (parsed.origin !== 'https://integrate.api.nvidia.com' || parsed.pathname !== '/v1/chat/completions' || parsed.search || parsed.hash || parsed.username || parsed.password) throw new Error('Endpoint denied');
    endpointHostname = parsed.hostname.toLowerCase();
  } catch {
    return {
      authorized: false,
      failureReasonCode: 'HOST_NOT_AUTHORIZED',
      message: `Invalid endpoint URL: ${endpointUrl}`,
    };
  }

  const allowedOrigins = grant.resourceScope?.allowedOrigins ?? [];
  const isHostAuthorized = allowedOrigins.some((origin) => {
    try {
      const parsedOrigin = origin.startsWith('http') ? (new URL(origin).origin === 'https://integrate.api.nvidia.com' ? new URL(origin).hostname : '') : origin;
      return parsedOrigin.toLowerCase() === endpointHostname;
    } catch {
      return origin.toLowerCase() === endpointHostname;
    }
  });

  if (!isHostAuthorized) {
    return {
      authorized: false,
      failureReasonCode: 'HOST_NOT_AUTHORIZED',
      message: `Destination host '${endpointHostname}' is not permitted by grant resource scope. Allowed: ${allowedOrigins.join(', ')}`,
    };
  }

  // 6. Operation authorization check
  const allowedOperations = grant.resourceScope?.allowedOperations ?? [];
  const isOpAuthorized =
    allowedOperations.includes('chat_completions') ||
    allowedOperations.includes('inference:chat');

  if (!isOpAuthorized) {
    return {
      authorized: false,
      failureReasonCode: 'OPERATION_NOT_AUTHORIZED',
      message: `Operation 'chat_completions' is not permitted by grant resource scope. Allowed: ${allowedOperations.join(', ')}`,
    };
  }

  // 7. Model authorization check
  const allowedModels = grant.resourceScope?.allowedPaths;
  if (!allowedModels?.length || !allowedModels.includes(model)) {
    return { authorized: false, failureReasonCode: 'MODEL_NOT_AUTHORIZED', message: 'Model scope required' };
  }
  if (allowedModels && allowedModels.length > 0) {
    if (!allowedModels.includes(model)) {
      return {
        authorized: false,
        failureReasonCode: 'MODEL_NOT_AUTHORIZED',
        message: `Model '${model}' is not permitted by grant resource scope. Allowed: ${allowedModels.join(', ')}`,
      };
    }
  }

  // 8. Credential reference check
  if (!credentialRef || !grant.credentialReferences?.includes(credentialRef)) return { authorized: false, failureReasonCode: 'CREDENTIAL_REF_NOT_AUTHORIZED', message: 'Credential reference scope required' };
  if (credentialRef && grant.credentialReferences && grant.credentialReferences.length > 0) {
    if (!grant.credentialReferences.includes(credentialRef)) {
      return {
        authorized: false,
        failureReasonCode: 'CREDENTIAL_REF_NOT_AUTHORIZED',
        message: `Credential reference '${credentialRef}' is not authorized by grant. Allowed: ${grant.credentialReferences.join(', ')}`,
      };
    }
  }

  return { authorized: true };
}
