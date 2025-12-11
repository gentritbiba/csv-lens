import { describe, it, expect, vi, beforeEach } from 'vitest'

// Import only the functions that don't need Redis
import {
  createRateLimitHeaders,
  getClientKey,
  getAuthenticatedClientKey,
  RATE_LIMITS,
} from '@/lib/rate-limit'

describe('rate-limit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Note: checkRateLimit tests are skipped because they require Redis connection
  // The function is tested indirectly through API route integration tests
  describe('checkRateLimit', () => {
    it.skip('should return allowed=true when under limit', async () => {
      // Requires Redis - tested via integration tests
    })

    it.skip('should return allowed=false when limit exceeded', async () => {
      // Requires Redis - tested via integration tests
    })

    it.skip('should calculate resetIn correctly', async () => {
      // Requires Redis - tested via integration tests
    })

    it.skip('should return resetIn=0 when reset time is in the past', async () => {
      // Requires Redis - tested via integration tests
    })
  })

  describe('createRateLimitHeaders', () => {
    it('should create headers with correct values', () => {
      const result = {
        allowed: true,
        remaining: 15,
        resetIn: 45000,
      }

      const headers = createRateLimitHeaders(result, 20)

      expect(headers.get('X-RateLimit-Limit')).toBe('20')
      expect(headers.get('X-RateLimit-Remaining')).toBe('15')
      expect(headers.get('X-RateLimit-Reset')).toBe('45') // 45000ms = 45s
    })

    it('should round up reset time to nearest second', () => {
      const result = {
        allowed: true,
        remaining: 5,
        resetIn: 1500, // 1.5 seconds
      }

      const headers = createRateLimitHeaders(result, 10)
      expect(headers.get('X-RateLimit-Reset')).toBe('2') // Rounded up
    })
  })

  describe('getClientKey', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const request = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' },
      })

      const key = getClientKey(request)
      expect(key).toBe('ip:192.168.1.1')
    })

    it('should extract IP from x-real-ip header', () => {
      const request = new Request('http://localhost', {
        headers: { 'x-real-ip': '192.168.1.100' },
      })

      const key = getClientKey(request)
      expect(key).toBe('ip:192.168.1.100')
    })

    it('should prefer x-forwarded-for over x-real-ip', () => {
      const request = new Request('http://localhost', {
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'x-real-ip': '192.168.1.100',
        },
      })

      const key = getClientKey(request)
      expect(key).toBe('ip:192.168.1.1')
    })

    it('should extract IP from x-vercel-forwarded-for header', () => {
      const request = new Request('http://localhost', {
        headers: { 'x-vercel-forwarded-for': '203.0.113.50' },
      })

      const key = getClientKey(request)
      expect(key).toBe('ip:203.0.113.50')
    })

    it('should return unique key when no valid IP found', () => {
      const request = new Request('http://localhost')

      const key = getClientKey(request)
      expect(key).toMatch(/^unknown:[0-9a-f-]{36}$/)
    })

    it('should reject invalid IP formats', () => {
      const request = new Request('http://localhost', {
        headers: { 'x-forwarded-for': 'not-an-ip-address' },
      })

      const key = getClientKey(request)
      expect(key).toMatch(/^unknown:/)
    })

    it('should reject IPs with out-of-range octets', () => {
      const request = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '256.1.1.1' },
      })

      const key = getClientKey(request)
      expect(key).toMatch(/^unknown:/)
    })

    it('should accept valid IPv4 addresses', () => {
      const validIPs = ['0.0.0.0', '255.255.255.255', '192.168.1.1', '10.0.0.1']

      for (const ip of validIPs) {
        const request = new Request('http://localhost', {
          headers: { 'x-forwarded-for': ip },
        })
        expect(getClientKey(request)).toBe(`ip:${ip}`)
      }
    })

    it('should accept valid IPv6 addresses', () => {
      const request = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '2001:db8::1' },
      })

      const key = getClientKey(request)
      expect(key).toBe('ip:2001:db8::1')
    })

    it('should handle trimming of whitespace', () => {
      const request = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '  192.168.1.1  , 10.0.0.1' },
      })

      const key = getClientKey(request)
      expect(key).toBe('ip:192.168.1.1')
    })

    it('should generate unique keys for each unknown request', () => {
      const request1 = new Request('http://localhost')
      const request2 = new Request('http://localhost')

      const key1 = getClientKey(request1)
      const key2 = getClientKey(request2)

      expect(key1).not.toBe(key2)
    })
  })

  describe('getAuthenticatedClientKey', () => {
    it('should return user-prefixed key', () => {
      const key = getAuthenticatedClientKey('user-123')
      expect(key).toBe('user:user-123')
    })

    it('should handle different user IDs', () => {
      expect(getAuthenticatedClientKey('abc')).toBe('user:abc')
      expect(getAuthenticatedClientKey('user_456')).toBe('user:user_456')
    })
  })

  describe('RATE_LIMITS configuration', () => {
    it('should have correct limits for analyze endpoint', () => {
      expect(RATE_LIMITS.analyze.maxRequests).toBe(20)
      expect(RATE_LIMITS.analyze.windowMs).toBe(60000)
    })

    it('should have correct limits for generateSql endpoint', () => {
      expect(RATE_LIMITS.generateSql.maxRequests).toBe(30)
      expect(RATE_LIMITS.generateSql.windowMs).toBe(60000)
    })

    it('should have correct limits for login endpoint', () => {
      expect(RATE_LIMITS.login.maxRequests).toBe(10)
      expect(RATE_LIMITS.login.windowMs).toBe(60000)
    })

    it('should have correct limits for authCallback endpoint', () => {
      expect(RATE_LIMITS.authCallback.maxRequests).toBe(10)
      expect(RATE_LIMITS.authCallback.windowMs).toBe(60000)
    })
  })
})
