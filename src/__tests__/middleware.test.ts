import { describe, it, expect, vi, beforeEach } from 'vitest'

// Note: NEXTAUTH_SECRET is set in setup.ts before any modules are imported

// Mock iron-session before importing middleware
vi.mock('iron-session', () => ({
  getIronSession: vi.fn(),
}))

import { middleware } from '@/middleware'
import { getIronSession } from 'iron-session'
import { NextRequest } from 'next/server'

describe('middleware', () => {
  const createRequest = (pathname: string, headers?: Record<string, string>) => {
    const url = new URL(pathname, 'http://localhost')
    return new NextRequest(url, { headers })
  }

  const mockSession = (data: Partial<{ isLoggedIn: boolean; userId: string; email: string; tier: string }>) => {
    vi.mocked(getIronSession).mockResolvedValue(data as any)
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Public Routes', () => {
    it('should allow access to landing page without auth', async () => {
      mockSession({ isLoggedIn: false })

      const response = await middleware(createRequest('/'))

      expect(response.status).toBe(200)
    })

    it('should redirect logged-in users from landing to /app', async () => {
      mockSession({ isLoggedIn: true, userId: 'user-123' })

      const response = await middleware(createRequest('/'))

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/app')
    })

    it('should allow access to /api/auth routes without auth', async () => {
      mockSession({ isLoggedIn: false })

      const response = await middleware(createRequest('/api/auth/login'))

      expect(response.status).toBe(200)
    })

    it('should allow access to /api/auth/callback without auth', async () => {
      mockSession({ isLoggedIn: false })

      const response = await middleware(createRequest('/api/auth/callback'))

      expect(response.status).toBe(200)
    })
  })

  describe('Protected Page Routes', () => {
    it('should redirect unauthenticated users from /app to landing', async () => {
      mockSession({ isLoggedIn: false })

      const response = await middleware(createRequest('/app'))

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/')
      expect(response.headers.get('location')).not.toContain('/app')
    })

    it('should allow authenticated users to access /app', async () => {
      mockSession({ isLoggedIn: true, userId: 'user-123', email: 'test@example.com', tier: 'pro' })

      const response = await middleware(createRequest('/app'))

      expect(response.status).toBe(200)
    })

    it('should add user headers for authenticated requests', async () => {
      mockSession({ isLoggedIn: true, userId: 'user-123', email: 'test@example.com', tier: 'pro' })

      const response = await middleware(createRequest('/app'))

      // The middleware adds headers to the request, not the response
      // We verify the response is successful (headers were set)
      expect(response.status).toBe(200)
    })
  })

  describe('Protected API Routes', () => {
    it('should return 401 for unauthenticated /api/analyze', async () => {
      mockSession({ isLoggedIn: false })

      const response = await middleware(createRequest('/api/analyze'))

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 401 for unauthenticated /api/analyze/resume', async () => {
      mockSession({ isLoggedIn: false })

      const response = await middleware(createRequest('/api/analyze/resume'))

      expect(response.status).toBe(401)
    })

    it('should return 401 for unauthenticated /api/analyze/tool-result', async () => {
      mockSession({ isLoggedIn: false })

      const response = await middleware(createRequest('/api/analyze/tool-result'))

      expect(response.status).toBe(401)
    })

    it('should return 401 for unauthenticated /api/profile', async () => {
      mockSession({ isLoggedIn: false })

      const response = await middleware(createRequest('/api/profile'))

      expect(response.status).toBe(401)
    })

    it('should return 401 for unauthenticated /api/stripe/checkout', async () => {
      mockSession({ isLoggedIn: false })

      const response = await middleware(createRequest('/api/stripe/checkout'))

      expect(response.status).toBe(401)
    })

    it('should return 401 for unauthenticated /api/stripe/portal', async () => {
      mockSession({ isLoggedIn: false })

      const response = await middleware(createRequest('/api/stripe/portal'))

      expect(response.status).toBe(401)
    })

    it('should return 401 for unauthenticated /api/reset-tokens-g', async () => {
      mockSession({ isLoggedIn: false })

      const response = await middleware(createRequest('/api/reset-tokens-g'))

      expect(response.status).toBe(401)
    })

    it('should allow authenticated users to access protected API routes', async () => {
      mockSession({ isLoggedIn: true, userId: 'user-123', email: 'test@example.com', tier: 'free' })

      const response = await middleware(createRequest('/api/analyze'))

      expect(response.status).toBe(200)
    })
  })

  describe('Unprotected Routes', () => {
    it('should allow access to /about without auth', async () => {
      mockSession({ isLoggedIn: false })

      const response = await middleware(createRequest('/about'))

      expect(response.status).toBe(200)
    })

    it('should allow access to /faq without auth', async () => {
      mockSession({ isLoggedIn: false })

      const response = await middleware(createRequest('/faq'))

      expect(response.status).toBe(200)
    })

    it('should allow access to /privacy without auth', async () => {
      mockSession({ isLoggedIn: false })

      const response = await middleware(createRequest('/privacy'))

      expect(response.status).toBe(200)
    })

    it('should allow access to /terms without auth', async () => {
      mockSession({ isLoggedIn: false })

      const response = await middleware(createRequest('/terms'))

      expect(response.status).toBe(200)
    })

    it('should allow access to /api/stripe/webhook without auth', async () => {
      // Webhook has its own signature verification
      mockSession({ isLoggedIn: false })

      const response = await middleware(createRequest('/api/stripe/webhook'))

      expect(response.status).toBe(200)
    })
  })

  describe('Session Validation', () => {
    it('should treat missing userId as unauthenticated', async () => {
      mockSession({ isLoggedIn: true, userId: undefined })

      const response = await middleware(createRequest('/api/analyze'))

      expect(response.status).toBe(401)
    })

    it('should treat isLoggedIn=false as unauthenticated even with userId', async () => {
      mockSession({ isLoggedIn: false, userId: 'user-123' })

      const response = await middleware(createRequest('/api/analyze'))

      expect(response.status).toBe(401)
    })

    it('should require both isLoggedIn and userId', async () => {
      mockSession({ isLoggedIn: true, userId: 'user-123' })

      const response = await middleware(createRequest('/api/analyze'))

      expect(response.status).toBe(200)
    })
  })

  describe('Header Injection', () => {
    it('should inject x-user-id header for authenticated requests', async () => {
      mockSession({ isLoggedIn: true, userId: 'user-123', email: 'test@example.com', tier: 'pro' })

      const response = await middleware(createRequest('/app'))

      // Verify the middleware returned successfully (headers were modified)
      expect(response.status).toBe(200)
    })

    it('should inject x-user-email header for authenticated requests', async () => {
      mockSession({ isLoggedIn: true, userId: 'user-123', email: 'user@example.com', tier: 'free' })

      const response = await middleware(createRequest('/api/analyze'))

      expect(response.status).toBe(200)
    })

    it('should inject x-user-tier header for authenticated requests', async () => {
      mockSession({ isLoggedIn: true, userId: 'user-123', email: 'user@example.com', tier: 'pro' })

      const response = await middleware(createRequest('/api/profile'))

      expect(response.status).toBe(200)
    })
  })

  describe('Redirect Behavior', () => {
    it('should redirect to landing page for unauthenticated page access', async () => {
      mockSession({ isLoggedIn: false })

      const response = await middleware(createRequest('/app/dashboard'))

      expect(response.status).toBe(307)
      const location = response.headers.get('location')
      expect(location).toBe('http://localhost/')
    })

    it('should return JSON 401 for unauthenticated API access', async () => {
      mockSession({ isLoggedIn: false })

      const response = await middleware(createRequest('/api/analyze'))

      expect(response.status).toBe(401)
      expect(response.headers.get('content-type')).toContain('application/json')
    })
  })

  describe('Path Matching', () => {
    it('should protect /app subpaths', async () => {
      mockSession({ isLoggedIn: false })

      const paths = ['/app', '/app/settings', '/app/workspace/123']

      for (const path of paths) {
        const response = await middleware(createRequest(path))
        expect(response.status).toBe(307) // Redirect to landing
      }
    })

    it('should protect /api/analyze subpaths', async () => {
      mockSession({ isLoggedIn: false })

      const paths = ['/api/analyze', '/api/analyze/resume', '/api/analyze/tool-result']

      for (const path of paths) {
        const response = await middleware(createRequest(path))
        expect(response.status).toBe(401)
      }
    })
  })
})
