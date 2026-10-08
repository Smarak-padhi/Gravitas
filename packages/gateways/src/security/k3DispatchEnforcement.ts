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

import type { K3DispatchCapabilityGrant } from '../providers/types.js';

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
  if (!grant) {
    return {
      authorized: false,
      failureReasonCode: 'MISSING_CAPABILITY_GRANT',
      message: 'No K3 CapabilityGrant provided for provider dispatch.',
    };
  }

  // 2. Grant status check
  if (grant.status === 'REVOKED') {
    return {
      authorized: false,
      failureReasonCode: 'GRANT_REVOKED',
      message: `CapabilityGrant '${grant.grantId}' has been revoked.`,
    };
  }
  if (grant.status === 'EXPIRED') {
    return {
      authorized: false,
      failureReasonCode: 'GRANT_EXPIRED',
      message: `CapabilityGrant '${grant.grantId}' has expired.`,
    };
  }

  // 3. Expiration timestamp check
  const now = Date.now();
  const expiresAtMs = new Date(grant.expiresAt).getTime();
  if (Number.isFinite(expiresAtMs) && expiresAtMs <= now) {
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
    grantedCaps.includes(providerKey) ||
    grantedCaps.includes(expectedProvider) ||
    authToolIds.includes(expectedProvider) ||
    authToolIds.includes(`tool:${expectedProvider}:chat`);

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
      const parsedOrigin = origin.startsWith('http') ? new URL(origin).hostname : origin;
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
    allowedOperations.length === 0 ||
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
