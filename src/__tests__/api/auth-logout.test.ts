import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies before importing route
vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
  destroySession: vi.fn(),
}))

import { GET, POST } from '@/app/api/auth/logout/route'
import { destroySession } from '@/lib/auth/session'

describe('Auth Logout API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset environment variable for each test
    process.env.NEXTAUTH_URL = 'http://localhost:3000'
  })

  describe('GET Method', () => {
    it('should call destroySession', async () => {
      vi.mocked(destroySession).mockResolvedValue(undefined)

      await GET()

      expect(destroySession).toHaveBeenCalledTimes(1)
    })

    it('should return a redirect response', async () => {
      vi.mocked(destroySession).mockResolvedValue(undefined)

      const response = await GET()

      expect(response.status).toBe(307)
    })

    it('should redirect to the landing page using NEXTAUTH_URL', async () => {
      process.env.NEXTAUTH_URL = 'https://example.com'
      vi.mocked(destroySession).mockResolvedValue(undefined)

      const response = await GET()

      expect(response.headers.get('location')).toBe('https://example.com/')
    })

    it('should redirect to localhost when NEXTAUTH_URL is not set', async () => {
      delete process.env.NEXTAUTH_URL
      vi.mocked(destroySession).mockResolvedValue(undefined)

      const response = await GET()

      expect(response.headers.get('location')).toBe('http://localhost:3000/')
    })
  })

  describe('POST Method', () => {
    it('should call destroySession', async () => {
      vi.mocked(destroySession).mockResolvedValue(undefined)

      await POST()

      expect(destroySession).toHaveBeenCalledTimes(1)
    })

    it('should return JSON response with success: true', async () => {
      vi.mocked(destroySession).mockResolvedValue(undefined)

      const response = await POST()

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toEqual({ success: true })
    })

    it('should return correct Content-Type header', async () => {
      vi.mocked(destroySession).mockResolvedValue(undefined)

      const response = await POST()

      expect(response.headers.get('content-type')).toContain('application/json')
    })
  })

  describe('Session Destruction', () => {
    it('should destroy session before redirecting on GET', async () => {
      const destroySessionMock = vi.mocked(destroySession)
      destroySessionMock.mockResolvedValue(undefined)

      await GET()

      expect(destroySessionMock).toHaveBeenCalled()
    })

    it('should destroy session before returning JSON on POST', async () => {
      const destroySessionMock = vi.mocked(destroySession)
      destroySessionMock.mockResolvedValue(undefined)

      await POST()

      expect(destroySessionMock).toHaveBeenCalled()
    })

    it('should await session destruction on GET', async () => {
      let sessionDestroyed = false
      vi.mocked(destroySession).mockImplementation(async () => {
        sessionDestroyed = true
      })

      const response = await GET()

      expect(sessionDestroyed).toBe(true)
      expect(response.status).toBe(307)
    })

    it('should await session destruction on POST', async () => {
      let sessionDestroyed = false
      vi.mocked(destroySession).mockImplementation(async () => {
        sessionDestroyed = true
      })

      const response = await POST()

      expect(sessionDestroyed).toBe(true)
      expect(response.status).toBe(200)
    })
  })

  describe('Redirect Behavior', () => {
    it('should redirect to root path', async () => {
      vi.mocked(destroySession).mockResolvedValue(undefined)

      const response = await GET()
      const location = response.headers.get('location')

      expect(location).toBeDefined()
      expect(new URL(location!).pathname).toBe('/')
    })

    it('should use temporary redirect (307)', async () => {
      vi.mocked(destroySession).mockResolvedValue(undefined)

      const response = await GET()

      expect(response.status).toBe(307)
    })

    it('should preserve protocol from NEXTAUTH_URL', async () => {
      process.env.NEXTAUTH_URL = 'https://secure.example.com'
      vi.mocked(destroySession).mockResolvedValue(undefined)

      const response = await GET()
      const location = response.headers.get('location')

      expect(location).toContain('https://')
    })

    it('should preserve host from NEXTAUTH_URL', async () => {
      process.env.NEXTAUTH_URL = 'https://myapp.example.com'
      vi.mocked(destroySession).mockResolvedValue(undefined)

      const response = await GET()
      const location = response.headers.get('location')

      expect(new URL(location!).host).toBe('myapp.example.com')
    })
  })

  describe('Error Handling', () => {
    it('should propagate errors from destroySession on GET', async () => {
      const error = new Error('Session destruction failed')
      vi.mocked(destroySession).mockRejectedValue(error)

      await expect(GET()).rejects.toThrow('Session destruction failed')
    })

    it('should propagate errors from destroySession on POST', async () => {
      const error = new Error('Session destruction failed')
      vi.mocked(destroySession).mockRejectedValue(error)

      await expect(POST()).rejects.toThrow('Session destruction failed')
    })

    it('should not return response if session destruction fails on GET', async () => {
      vi.mocked(destroySession).mockRejectedValue(new Error('Failed'))

      try {
        await GET()
        // Should not reach here
        expect(true).toBe(false)
      } catch {
        // Expected to throw
        expect(destroySession).toHaveBeenCalled()
      }
    })

    it('should not return response if session destruction fails on POST', async () => {
      vi.mocked(destroySession).mockRejectedValue(new Error('Failed'))

      try {
        await POST()
        // Should not reach here
        expect(true).toBe(false)
      } catch {
        // Expected to throw
        expect(destroySession).toHaveBeenCalled()
      }
    })
  })
})
