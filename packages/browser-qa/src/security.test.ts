import { describe, it, expect } from 'vitest'
import { BrowserQaSecurityError } from './errors.js'
import {
  validateScreenshotName,
  validateTargetUrl,
} from './security.js'

describe('Browser QA Security Boundaries', () => {
  describe('Origin & Hostname Validation', () => {
    it('allows loopback origins (127.0.0.1 and localhost)', () => {
      const u1 = validateTargetUrl('http://127.0.0.1:5173/office')
      expect(u1.origin).toBe('http://127.0.0.1:5173')

      const u2 = validateTargetUrl('http://localhost:4317/api/status')
      expect(u2.origin).toBe('http://localhost:4317')

      const u3 = validateTargetUrl('https://127.0.0.1:8443/')
      expect(u3.origin).toBe('https://127.0.0.1:8443')
    })

    it('strictly rejects cloud metadata endpoints', () => {
      expect(() => validateTargetUrl('http://169.254.169.254/latest/meta-data/')).toThrow(
        BrowserQaSecurityError
      )
      expect(() => validateTargetUrl('http://169.254.169.254/latest/meta-data/')).toThrow(
        /cloud metadata endpoint/
      )

      expect(() => validateTargetUrl('http://metadata.google.internal/computeMetadata/v1/')).toThrow(
        /cloud metadata endpoint/
      )
    })

    it('strictly rejects private LAN IP addresses (RFC 1918 & CGNAT)', () => {
      expect(() => validateTargetUrl('http://192.168.1.1:8080')).toThrow(
        /private LAN address/
      )
      expect(() => validateTargetUrl('http://10.0.0.1:3000')).toThrow(
        /private LAN address/
      )
      expect(() => validateTargetUrl('http://172.16.0.1:80')).toThrow(
        /private LAN address/
      )
      expect(() => validateTargetUrl('http://172.31.255.255:80')).toThrow(
        /private LAN address/
      )
      expect(() => validateTargetUrl('http://100.64.0.1:80')).toThrow(
        /private LAN address/
      )
    })

    it('strictly rejects external public domains', () => {
      expect(() => validateTargetUrl('https://google.com')).toThrow(
        /Non-loopback host 'google.com' is strictly forbidden/
      )
      expect(() => validateTargetUrl('http://example.com/test')).toThrow(
        /Non-loopback host 'example.com' is strictly forbidden/
      )
    })

    it('strictly rejects non-http/https protocols', () => {
      expect(() => validateTargetUrl('file:///etc/passwd')).toThrow(
        /Disallowed URL protocol 'file:'/
      )
      expect(() => validateTargetUrl('data:text/html,<h1>Hacked</h1>')).toThrow(
        /Disallowed URL protocol 'data:'/
      )
      expect(() => validateTargetUrl('javascript:alert(1)')).toThrow(
        /Disallowed URL protocol 'javascript:'/
      )
      expect(() => validateTargetUrl('ftp://127.0.0.1/')).toThrow(
        /Disallowed URL protocol 'ftp:'/
      )
    })

    it('enforces allowedOrigins restriction when configured', () => {
      const allowed = ['http://127.0.0.1:5173']
      expect(() => validateTargetUrl('http://127.0.0.1:5173/page', allowed)).not.toThrow()
      expect(() => validateTargetUrl('http://127.0.0.1:4317/api', allowed)).toThrow(
        /not in the configured allowedOrigins list/
      )
    })
  })

  describe('Screenshot Identifier Validation', () => {
    it('accepts valid alphanumeric screenshot names', () => {
      expect(validateScreenshotName('01-initial-view')).toBe('01-initial-view.png')
      expect(validateScreenshotName('screenshot_final.png')).toBe('screenshot_final.png')
      expect(validateScreenshotName('step-2.sub-step')).toBe('step-2.sub-step.png')
    })

    it('rejects path traversal attempts in screenshot names', () => {
      expect(() => validateScreenshotName('../evil.png')).toThrow(
        /forbidden path traversal/
      )
      expect(() => validateScreenshotName('../../etc/passwd')).toThrow(
        /forbidden path traversal/
      )
      expect(() => validateScreenshotName('sub/image.png')).toThrow(
        /forbidden path traversal/
      )
      expect(() => validateScreenshotName('sub\\image.png')).toThrow(
        /forbidden path traversal/
      )
    })

    it('rejects empty or unsafe characters in screenshot names', () => {
      expect(() => validateScreenshotName('')).toThrow(BrowserQaSecurityError)
      expect(() => validateScreenshotName('   ')).toThrow(BrowserQaSecurityError)
      expect(() => validateScreenshotName('test;rm')).toThrow(/unsafe characters/)
    })
  })
})
