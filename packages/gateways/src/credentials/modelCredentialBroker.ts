/**
 * Gravitas — Model Provider Credential Broker (Wave V1-B)
 *
 * Implements strict secret isolation for AI Model Providers:
 * - Invariant: CREDENTIAL_REFERENCE != CREDENTIAL_VALUE
 * - Opaque references used everywhere outside the narrow invocation boundary
 * - In-memory secret resolution strictly at fetch/request dispatch time
 * - Automatic redaction of NVIDIA keys (nvapi-) and Authorization headers
 */

export interface ModelCredentialHandle {
  readonly credentialRef: string;
  readonly providerId: string;
  readonly isAvailable: boolean;
  readonly redactedPreview: string;
}

export class ModelCredentialBroker {
  private static instance: ModelCredentialBroker | null = null;
  private readonly vault = new Map<string, string>(); // ref -> rawSecret

  public constructor() {}

  public static getInstance(): ModelCredentialBroker {
    if (!ModelCredentialBroker.instance) {
      ModelCredentialBroker.instance = new ModelCredentialBroker();
    }
    return ModelCredentialBroker.instance;
  }

  /**
   * Registers a raw secret and returns an opaque credential reference.
   * The raw secret is stored only in this volatile in-memory map.
   */
  public registerSecret(providerId: string, secretValue: string): string {
    if (!secretValue || secretValue.trim().length === 0) {
      throw new Error('Cannot register empty secret');
    }
    const cleanSecret = secretValue.trim();
    const ref = `vault:cred:${providerId}`;
    this.vault.set(ref, cleanSecret);
    return ref;
  }

  /**
   * Discovers and registers provider credentials from standard local environment.
   */
  public discoverLocalCredentials(): void {
    const nvidiaKey = process.env['NVIDIA_API_KEY'] || process.env['NIM_API_KEY'];
    if (nvidiaKey && nvidiaKey.trim().length > 0) {
      this.registerSecret('nvidia-nim', nvidiaKey.trim());
    }
  }

  /**
   * Returns an opaque handle verifying credential presence without exposing secret value.
   */
  public getCredentialHandle(providerId: string): ModelCredentialHandle {
    const ref = `vault:cred:${providerId}`;
    const secret = this.vault.get(ref);
    const isAvailable = Boolean(secret && secret.length > 0);

    return {
      credentialRef: ref,
      providerId,
      isAvailable,
      redactedPreview: isAvailable ? `[CREDENTIAL_PRESENT:${providerId}]` : '[NO_CREDENTIAL]',
    };
  }

  /**
   * Resolves the raw secret strictly at the invocation boundary.
   */
  public resolveSecret(credentialRef: string): string | null {
    return this.vault.get(credentialRef) ?? null;
  }

  /**
   * Clears a credential reference.
   */
  public clearSecret(credentialRef: string): boolean {
    return this.vault.delete(credentialRef);
  }

  /**
   * Clears all in-memory secrets.
   */
  public clearAll(): void {
    this.vault.clear();
  }

  /**
   * Comprehensive secret redaction for logs, error messages, and telemetry payloads.
   */
  public redactSensitive(text: string): string {
    if (!text || typeof text !== 'string') return text;
    let sanitized = text;

    // 1. Redact Bearer Authorization headers with any key
    sanitized = sanitized.replace(/Bearer\s+([A-Za-z0-9_\-\.]+)/gi, 'Bearer [REDACTED]');

    // 2. Redact NVIDIA API key patterns (nvapi-...)
    sanitized = sanitized.replace(/nvapi-[A-Za-z0-9_\-]{10,}/gi, '[REDACTED_NVIDIA_KEY]');

    // 3. Redact any known registered secrets currently in the vault
    for (const secret of this.vault.values()) {
      if (secret && secret.length > 5) {
        sanitized = sanitized.split(secret).join('[REDACTED_SECRET]');
      }
    }

    // 4. Redact common JSON field patterns
    sanitized = sanitized.replace(/"apiKey"\s*:\s*"[^"]+"/gi, '"apiKey": "[REDACTED]"');
    sanitized = sanitized.replace(/"api_key"\s*:\s*"[^"]+"/gi, '"api_key": "[REDACTED]"');
    sanitized = sanitized.replace(/"password"\s*:\s*"[^"]+"/gi, '"password": "[REDACTED]"');
    sanitized = sanitized.replace(/"secret"\s*:\s*"[^"]+"/gi, '"secret": "[REDACTED]"');

    return sanitized;
  }
}
