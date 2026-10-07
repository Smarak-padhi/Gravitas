/**
 * Gravitas — Provider Network Containment & SSRF Defenses (Wave V1-B)
 *
 * Enforces strict destination allowlisting for external provider calls:
 * - Reject insecure protocols (http, ftp, file)
 * - Reject loopback (127.0.0.1, localhost, ::1)
 * - Reject private RFC1918 subnets (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
 * - Reject link-local subnets (169.254.0.0/16)
 * - Restrict providers strictly to approved domain allowlists
 */

export const ALLOWED_PROVIDER_HOSTS: Record<string, readonly string[]> = {
  'nvidia-nim': ['integrate.api.nvidia.com'],
};

export class NetworkContainmentError extends Error {
  public constructor(message: string) {
    super(`NETWORK_CONTAINMENT_VIOLATION: ${message}`);
    this.name = 'NetworkContainmentError';
  }
}

function isPrivateOrLoopbackIp(hostname: string): boolean {
  // IPv4 localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') {
    return true;
  }
  // IPv6 localhost
  if (hostname === '::1' || hostname === '[::1]') {
    return true;
  }

  // Check IPv4 octets
  const ipv4Match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(hostname);
  if (ipv4Match) {
    const raw1 = ipv4Match[1];
    const raw2 = ipv4Match[2];
    if (raw1 && raw2) {
      const o1 = Number.parseInt(raw1, 10);
      const o2 = Number.parseInt(raw2, 10);

      // 127.0.0.0/8 (Loopback)
      if (o1 === 127) return true;
      // 10.0.0.0/8 (RFC1918)
      if (o1 === 10) return true;
      // 172.16.0.0/12 (RFC1918)
      if (o1 === 172 && o2 >= 16 && o2 <= 31) return true;
      // 192.168.0.0/16 (RFC1918)
      if (o1 === 192 && o2 === 168) return true;
      // 169.254.0.0/16 (Link-local)
      if (o1 === 169 && o2 === 254) return true;
      // 0.0.0.0/8
      if (o1 === 0) return true;
    }
  }

  return false;
}

/**
 * Validates that an outbound provider URL targets an approved, public HTTPS endpoint.
 */
export function assertAllowedProviderEndpoint(providerId: string, urlString: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    throw new NetworkContainmentError(`Invalid URL format: ${urlString}`);
  }

  if (parsed.protocol !== 'https:') {
    throw new NetworkContainmentError(
      `Insecure protocol '${parsed.protocol}' rejected. Providers must use 'https:' only.`
    );
  }

  const hostname = parsed.hostname.toLowerCase();

  if (isPrivateOrLoopbackIp(hostname)) {
    throw new NetworkContainmentError(
      `Access to loopback or private network destination '${hostname}' is strictly prohibited.`
    );
  }

  const allowedHosts = ALLOWED_PROVIDER_HOSTS[providerId];
  if (!allowedHosts || !allowedHosts.includes(hostname)) {
    throw new NetworkContainmentError(
      `Host '${hostname}' is not authorized for provider '${providerId}'. Approved: ${allowedHosts?.join(', ') ?? 'none'}`
    );
  }

  return parsed;
}

/**
 * Sanitizes outbound request headers to prevent worker/model header spoofing.
 */
export function sanitizeProviderHeaders(headers: Record<string, string>): Record<string, string> {
  const sanitized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    const lower = key.toLowerCase();
    // Forbid worker-controlled Host or Authorization overrides
    if (lower === 'host' || lower === 'authorization') {
      continue;
    }
    sanitized[key] = value;
  }
  return sanitized;
}
