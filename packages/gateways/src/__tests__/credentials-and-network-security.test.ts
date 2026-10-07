import { describe, expect, it } from 'vitest';
import { ModelCredentialBroker } from '../credentials/modelCredentialBroker.js';
import {
  assertAllowedProviderEndpoint,
  NetworkContainmentError,
  sanitizeProviderHeaders,
} from '../security/networkContainment.js';

describe('GRAVITAS V1-B — Credential Isolation & Network Security Suite', () => {
  describe('ModelCredentialBroker', () => {
    it('1. Secret Registration & Opaque Handle — raw secret is isolated and never leaked', () => {
      const broker = new ModelCredentialBroker();
      const ref = broker.registerSecret('nvidia-nim', 'nvapi-secret-key-xyz-987');

      expect(ref).toBe('vault:cred:nvidia-nim');

      const handle = broker.getCredentialHandle('nvidia-nim');
      expect(handle.isAvailable).toBe(true);
      expect(handle.credentialRef).toBe('vault:cred:nvidia-nim');
      expect(handle.redactedPreview).toBe('[CREDENTIAL_PRESENT:nvidia-nim]');
      // Handle must NOT contain the raw secret
      expect(JSON.stringify(handle)).not.toContain('nvapi-secret-key-xyz-987');

      // Resolution strictly at boundary
      expect(broker.resolveSecret(ref)).toBe('nvapi-secret-key-xyz-987');
      expect(broker.resolveSecret('vault:cred:non-existent')).toBeNull();
    });

    it('2. Empty Secret Rejection — fails closed if secret is empty or whitespace', () => {
      const broker = new ModelCredentialBroker();
      expect(() => broker.registerSecret('test-provider', '')).toThrow(/Cannot register empty secret/);
      expect(() => broker.registerSecret('test-provider', '   ')).toThrow(/Cannot register empty secret/);
    });

    it('3. Clear Secret & Clear All — cleanly deletes sensitive material from memory', () => {
      const broker = new ModelCredentialBroker();
      const ref = broker.registerSecret('nvidia-nim', 'nvapi-test-key');

      expect(broker.resolveSecret(ref)).toBe('nvapi-test-key');
      expect(broker.clearSecret(ref)).toBe(true);
      expect(broker.resolveSecret(ref)).toBeNull();

      broker.registerSecret('prov1', 'key1');
      broker.registerSecret('prov2', 'key2');
      broker.clearAll();
      expect(broker.resolveSecret('vault:cred:prov1')).toBeNull();
      expect(broker.resolveSecret('vault:cred:prov2')).toBeNull();
    });

    it('4. Sentinel Redaction — redacts NVIDIA keys, Bearer tokens, and vault secrets from text', () => {
      const broker = new ModelCredentialBroker();
      broker.registerSecret('nvidia-nim', 'custom-secret-string-longer-than-5');

      const rawLog =
        'Error occurred: Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.test and nvapi-998877665544332211 ' +
        'with vault secret custom-secret-string-longer-than-5 and JSON {"apiKey": "exposed-key-123"}';

      const sanitized = broker.redactSensitive(rawLog);

      expect(sanitized).not.toContain('eyJhbGciOiJIUzI1NiJ9.test');
      expect(sanitized).toContain('Bearer [REDACTED]');
      expect(sanitized).not.toContain('nvapi-998877665544332211');
      expect(sanitized).toContain('[REDACTED_NVIDIA_KEY]');
      expect(sanitized).not.toContain('custom-secret-string-longer-than-5');
      expect(sanitized).toContain('[REDACTED_SECRET]');
      expect(sanitized).not.toContain('exposed-key-123');
      expect(sanitized).toContain('"apiKey": "[REDACTED]"');
    });
  });

  describe('Network Containment & SSRF Defenses', () => {
    it('5. Protocol Enforcement — rejects non-https protocols', () => {
      expect(() => assertAllowedProviderEndpoint('nvidia-nim', 'http://integrate.api.nvidia.com')).toThrow(
        NetworkContainmentError
      );
      expect(() => assertAllowedProviderEndpoint('nvidia-nim', 'ftp://integrate.api.nvidia.com')).toThrow(
        /Insecure protocol/
      );
      expect(() => assertAllowedProviderEndpoint('nvidia-nim', 'file:///etc/passwd')).toThrow(
        /Insecure protocol/
      );
    });

    it('6. Loopback and Localhost Rejection — rejects 127.0.0.1, localhost, 0.0.0.0, ::1', () => {
      expect(() => assertAllowedProviderEndpoint('nvidia-nim', 'https://localhost/v1')).toThrow(
        /loopback or private network destination/
      );
      expect(() => assertAllowedProviderEndpoint('nvidia-nim', 'https://127.0.0.1/v1')).toThrow(
        /loopback or private network destination/
      );
      expect(() => assertAllowedProviderEndpoint('nvidia-nim', 'https://0.0.0.0/v1')).toThrow(
        /loopback or private network destination/
      );
      expect(() => assertAllowedProviderEndpoint('nvidia-nim', 'https://[::1]/v1')).toThrow(
        /loopback or private network destination/
      );
    });

    it('7. RFC1918 Private Subnets Rejection — rejects 10.x, 172.16-31.x, 192.168.x', () => {
      expect(() => assertAllowedProviderEndpoint('nvidia-nim', 'https://10.0.0.1/v1')).toThrow(
        /loopback or private network destination/
      );
      expect(() => assertAllowedProviderEndpoint('nvidia-nim', 'https://172.16.0.1/v1')).toThrow(
        /loopback or private network destination/
      );
      expect(() => assertAllowedProviderEndpoint('nvidia-nim', 'https://172.31.255.255/v1')).toThrow(
        /loopback or private network destination/
      );
      expect(() => assertAllowedProviderEndpoint('nvidia-nim', 'https://192.168.1.1/v1')).toThrow(
        /loopback or private network destination/
      );
    });

    it('8. Link-Local Subnet Rejection — rejects 169.254.x.x (AWS metadata endpoint)', () => {
      expect(() => assertAllowedProviderEndpoint('nvidia-nim', 'https://169.254.169.254/latest/meta-data/')).toThrow(
        /loopback or private network destination/
      );
    });

    it('9. Unauthorized Hostname Rejection — rejects unapproved public domains', () => {
      expect(() => assertAllowedProviderEndpoint('nvidia-nim', 'https://api.openai.com/v1')).toThrow(
        /Host 'api.openai.com' is not authorized for provider 'nvidia-nim'/
      );
      expect(() => assertAllowedProviderEndpoint('nvidia-nim', 'https://subdomain.api.nvidia.com/v1')).toThrow(
        /Host 'subdomain.api.nvidia.com' is not authorized for provider 'nvidia-nim'/
      );
    });

    it('10. Authorized Destination Approval — approves valid HTTPS endpoint for nvidia-nim', () => {
      const url = assertAllowedProviderEndpoint('nvidia-nim', 'https://integrate.api.nvidia.com/v1/chat/completions');
      expect(url.hostname).toBe('integrate.api.nvidia.com');
      expect(url.protocol).toBe('https:');
    });

    it('11. Header Sanitization — strips forbidden headers (Host, Authorization)', () => {
      const headers = {
        Host: 'evil.target.com',
        authorization: 'Bearer stolen-token',
        'content-type': 'application/json',
        'X-Client-Trace-Id': 'req-9876',
      };
      const cleaned = sanitizeProviderHeaders(headers);
      expect(cleaned['content-type']).toBe('application/json');
      expect(cleaned['X-Client-Trace-Id']).toBe('req-9876');
      expect(cleaned['Host']).toBeUndefined();
      expect(cleaned['authorization']).toBeUndefined();
    });
  });
});
