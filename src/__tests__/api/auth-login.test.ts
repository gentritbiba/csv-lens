import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies before importing route
vi.mock('@/lib/auth/workos', () => ({
  workos: {
    userManagement: {
      getAuthorizationUrl: vi.fn(),
    },
  },
  clientId: 'test_client_id',
  redirectUri: 'http://localhost:3000/api/auth/callback',
}))

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 10, resetIn: 60000 }),
  createRateLimitHeaders: vi.fn().mockReturnValue(new Map([
    ['X-RateLimit-Limit', '10'],
    ['X-RateLimit-Remaining', '10'],
    ['X-RateLimit-Reset', '60'],
  ])),
  getClientKey: vi.fn().mockReturnValue('test-client'),
  RATE_LIMITS: {
    login: {
      maxRequests: 10,
      windowMs: 60000,
    },
  },
}))

import { GET } from '@/app/api/auth/login/route'
import { workos, clientId, redirectUri } from '@/lib/auth/workos'
import { checkRateLimit, createRateLimitHeaders, getClientKey, RATE_LIMITS } from '@/lib/rate-limit'
import { NextRequest } from 'next/server'

describe('GET /api/auth/login', () => {
  const createRequest = (params: Record<string, string> = {}) => {
    const url = new URL('http://localhost/api/auth/login')
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value)
    }
    return new NextRequest(url)
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 10,
      resetIn: 60000,
    })
    vi.mocked(workos.userManagement.getAuthorizationUrl).mockReturnValue(
      'https://auth.workos.com/authorize?client_id=test'
    )
  })

  describe('Rate Limiting', () => {
    it('should check rate limit using correct key and endpoint', async () => {
      await GET(createRequest())

      expect(getClientKey).toHaveBeenCalled()
      expect(checkRateLimit).toHaveBeenCalledWith('test-client', 'login')
    })

    it('should return 429 when rate limited', async () => {
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetIn: 60000,
      })

      const response = await GET(createRequest())

      expect(response.status).toBe(429)
    })

    it('should return correct error message when rate limited', async () => {
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetIn: 60000,
      })

      const response = await GET(createRequest())
      const body = await response.json()

      expect(body.error).toBe('Too many login attempts. Please try again later.')
    })

    it('should include rate limit headers when rate limited', async () => {
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetIn: 60000,
      })

      const response = await GET(createRequest())

      expect(createRateLimitHeaders).toHaveBeenCalledWith(
        { allowed: false, remaining: 0, resetIn: 60000 },
        RATE_LIMITS.login.maxRequests
      )
      expect(response.headers.get('Content-Type')).toBe('application/json')
    })

    it('should allow request when under rate limit', async () => {
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: true,
        remaining: 5,
        resetIn: 30000,
      })

      const response = await GET(createRequest({ provider: 'GoogleOAuth' }))

      expect(response.status).toBe(307)
    })
  })

  describe('Provider Selection', () => {
    describe('Google OAuth', () => {
      it('should pass GoogleOAuth provider to WorkOS', async () => {
        await GET(createRequest({ provider: 'GoogleOAuth' }))

        expect(workos.userManagement.getAuthorizationUrl).toHaveBeenCalledWith({
          provider: 'GoogleOAuth',
          redirectUri,
          clientId,
        })
      })

      it('should redirect to authorization URL for Google', async () => {
        vi.mocked(workos.userManagement.getAuthorizationUrl).mockReturnValue(
          'https://auth.workos.com/authorize?provider=GoogleOAuth'
        )

        const response = await GET(createRequest({ provider: 'GoogleOAuth' }))

        expect(response.status).toBe(307)
        expect(response.headers.get('location')).toBe(
          'https://auth.workos.com/authorize?provider=GoogleOAuth'
        )
      })
    })

    describe('GitHub OAuth', () => {
      it('should pass GitHubOAuth provider to WorkOS', async () => {
        await GET(createRequest({ provider: 'GitHubOAuth' }))

        expect(workos.userManagement.getAuthorizationUrl).toHaveBeenCalledWith({
          provider: 'GitHubOAuth',
          redirectUri,
          clientId,
        })
      })

      it('should redirect to authorization URL for GitHub', async () => {
        vi.mocked(workos.userManagement.getAuthorizationUrl).mockReturnValue(
          'https://auth.workos.com/authorize?provider=GitHubOAuth'
        )

        const response = await GET(createRequest({ provider: 'GitHubOAuth' }))

        expect(response.status).toBe(307)
        expect(response.headers.get('location')).toBe(
          'https://auth.workos.com/authorize?provider=GitHubOAuth'
        )
      })
    })

    describe('No Provider (Email login disabled)', () => {
      it('should return 400 when no provider specified', async () => {
        const response = await GET(createRequest())

        expect(response.status).toBe(400)
        const body = await response.json()
        expect(body.error).toBe('Invalid or missing OAuth provider')
      })

      it('should not call getAuthorizationUrl when no provider specified', async () => {
        await GET(createRequest())

        expect(workos.userManagement.getAuthorizationUrl).not.toHaveBeenCalled()
      })
    })
  })

  describe('Authorization URL Generation', () => {
    it('should call getAuthorizationUrl with correct redirectUri', async () => {
      await GET(createRequest({ provider: 'GoogleOAuth' }))

      expect(workos.userManagement.getAuthorizationUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          redirectUri: 'http://localhost:3000/api/auth/callback',
        })
      )
    })

    it('should call getAuthorizationUrl with correct clientId', async () => {
      await GET(createRequest({ provider: 'GoogleOAuth' }))

      expect(workos.userManagement.getAuthorizationUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: 'test_client_id',
        })
      )
    })

    it('should redirect to the generated authorization URL', async () => {
      const authUrl = 'https://auth.workos.com/authorize?client_id=test_client_id&redirect_uri=http://localhost:3000/api/auth/callback'
      vi.mocked(workos.userManagement.getAuthorizationUrl).mockReturnValue(authUrl)

      const response = await GET(createRequest({ provider: 'GoogleOAuth' }))

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toBe(authUrl)
    })

    it('should use NextResponse.redirect for redirection', async () => {
      const authUrl = 'https://auth.workos.com/authorize'
      vi.mocked(workos.userManagement.getAuthorizationUrl).mockReturnValue(authUrl)

      const response = await GET(createRequest({ provider: 'GitHubOAuth' }))

      // NextResponse.redirect returns 307 by default
      expect(response.status).toBe(307)
    })
  })

  describe('Error Handling', () => {
    it('should handle WorkOS getAuthorizationUrl throwing an error', async () => {
      vi.mocked(workos.userManagement.getAuthorizationUrl).mockImplementation(() => {
        throw new Error('WorkOS service unavailable')
      })

      await expect(GET(createRequest({ provider: 'GoogleOAuth' }))).rejects.toThrow('WorkOS service unavailable')
    })

    it('should handle rate limit check throwing an error', async () => {
      vi.mocked(checkRateLimit).mockRejectedValue(new Error('Redis connection failed'))

      await expect(GET(createRequest({ provider: 'GoogleOAuth' }))).rejects.toThrow('Redis connection failed')
    })
  })

  describe('Provider Parameter Validation', () => {
    it('should accept valid GoogleOAuth provider', async () => {
      const response = await GET(createRequest({ provider: 'GoogleOAuth' }))

      expect(response.status).toBe(307)
      expect(workos.userManagement.getAuthorizationUrl).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'GoogleOAuth' })
      )
    })

    it('should accept valid GitHubOAuth provider', async () => {
      const response = await GET(createRequest({ provider: 'GitHubOAuth' }))

      expect(response.status).toBe(307)
      expect(workos.userManagement.getAuthorizationUrl).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'GitHubOAuth' })
      )
    })

    it('should reject invalid provider values', async () => {
      const response = await GET(createRequest({ provider: 'invalid_provider' }))

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBe('Invalid or missing OAuth provider')
    })

    it('should reject empty provider string', async () => {
      const response = await GET(createRequest({ provider: '' }))

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBe('Invalid or missing OAuth provider')
    })
  })

  describe('Request Processing', () => {
    it('should extract provider from query parameters', async () => {
      await GET(createRequest({ provider: 'GoogleOAuth', other: 'param' }))

      expect(workos.userManagement.getAuthorizationUrl).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'GoogleOAuth' })
      )
    })

    it('should return 400 for request with no query parameters', async () => {
      const response = await GET(createRequest())

      expect(response.status).toBe(400)
    })

    it('should ignore additional query parameters', async () => {
      await GET(createRequest({
        provider: 'GitHubOAuth',
        redirect: '/dashboard',
        state: 'some-state'
      }))

      // Only provider should be passed to getAuthorizationUrl
      expect(workos.userManagement.getAuthorizationUrl).toHaveBeenCalledWith({
        provider: 'GitHubOAuth',
        redirectUri,
        clientId,
      })
    })
  })
})
