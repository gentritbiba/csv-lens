import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock dependencies before importing route
vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    update: vi.fn(() => ({
      set: vi.fn(),
    })),
  },
  tokenUsage: { userId: 'userId' },
}))

import { GET } from '@/app/api/reset-tokens-g/route'
import { getSession } from '@/lib/auth/session'
import { db } from '@/lib/db'

// Type helper for mocking getSession return value
type SessionData = Awaited<ReturnType<typeof getSession>>

// Type helper for db.update mock return
type UpdateReturn = { set: ReturnType<typeof vi.fn> }

describe('GET /api/reset-tokens-g', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('Authentication Tests', () => {
    it('should return 401 when not logged in', async () => {
      vi.mocked(getSession).mockResolvedValue({
        isLoggedIn: false,
        userId: undefined,
        email: undefined,
      } as unknown as SessionData)

      const response = await GET()
      expect(response.status).toBe(401)

      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 401 when userId is missing', async () => {
      vi.mocked(getSession).mockResolvedValue({
        isLoggedIn: true,
        userId: undefined,
        email: 'admin@example.com',
      } as unknown as SessionData)

      const response = await GET()
      expect(response.status).toBe(401)

      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 401 when isLoggedIn is true but userId is null', async () => {
      vi.mocked(getSession).mockResolvedValue({
        isLoggedIn: true,
        userId: null,
        email: 'admin@example.com',
      } as unknown as SessionData)

      const response = await GET()
      expect(response.status).toBe(401)

      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('Authorization Tests', () => {
    it('should return 403 when user email is not in ADMIN_EMAILS', async () => {
      vi.mocked(getSession).mockResolvedValue({
        isLoggedIn: true,
        userId: 'user-123',
        email: 'regular@example.com',
      } as unknown as SessionData)

      process.env.ADMIN_EMAILS = 'admin@example.com'

      const response = await GET()
      expect(response.status).toBe(403)

      const data = await response.json()
      expect(data.error).toBe('Forbidden - Admin access required')
    })

    it('should return 403 when ADMIN_EMAILS env var is not configured (undefined)', async () => {
      vi.mocked(getSession).mockResolvedValue({
        isLoggedIn: true,
        userId: 'user-123',
        email: 'admin@example.com',
      } as unknown as SessionData)

      delete process.env.ADMIN_EMAILS

      const response = await GET()
      expect(response.status).toBe(403)

      const data = await response.json()
      expect(data.error).toBe('Forbidden - Admin access required')
    })

    it('should return 403 when ADMIN_EMAILS env var is empty string', async () => {
      vi.mocked(getSession).mockResolvedValue({
        isLoggedIn: true,
        userId: 'user-123',
        email: 'admin@example.com',
      } as unknown as SessionData)

      process.env.ADMIN_EMAILS = ''

      const response = await GET()
      expect(response.status).toBe(403)

      const data = await response.json()
      expect(data.error).toBe('Forbidden - Admin access required')
    })

    it('should return 403 when user email is undefined', async () => {
      vi.mocked(getSession).mockResolvedValue({
        isLoggedIn: true,
        userId: 'user-123',
        email: undefined,
      } as unknown as SessionData)

      process.env.ADMIN_EMAILS = 'admin@example.com'

      const response = await GET()
      expect(response.status).toBe(403)

      const data = await response.json()
      expect(data.error).toBe('Forbidden - Admin access required')
    })

    it('should allow access for admin emails (case-insensitive check)', async () => {
      vi.mocked(getSession).mockResolvedValue({
        isLoggedIn: true,
        userId: 'user-123',
        email: 'ADMIN@EXAMPLE.COM',
      } as unknown as SessionData)

      process.env.ADMIN_EMAILS = 'admin@example.com'

      const mockSet = vi.fn()
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as unknown as UpdateReturn)

      const response = await GET()
      expect(response.status).toBe(200)
    })

    it('should handle admin email with uppercase in env var', async () => {
      vi.mocked(getSession).mockResolvedValue({
        isLoggedIn: true,
        userId: 'user-123',
        email: 'admin@example.com',
      } as unknown as SessionData)

      process.env.ADMIN_EMAILS = 'ADMIN@EXAMPLE.COM'

      const mockSet = vi.fn()
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as unknown as UpdateReturn)

      const response = await GET()
      expect(response.status).toBe(200)
    })

    it('should handle multiple admin emails in comma-separated list', async () => {
      vi.mocked(getSession).mockResolvedValue({
        isLoggedIn: true,
        userId: 'user-123',
        email: 'admin2@example.com',
      } as unknown as SessionData)

      process.env.ADMIN_EMAILS = 'admin1@example.com, admin2@example.com, admin3@example.com'

      const mockSet = vi.fn()
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as unknown as UpdateReturn)

      const response = await GET()
      expect(response.status).toBe(200)
    })

    it('should handle admin emails with extra whitespace', async () => {
      vi.mocked(getSession).mockResolvedValue({
        isLoggedIn: true,
        userId: 'user-123',
        email: 'admin@example.com',
      } as unknown as SessionData)

      process.env.ADMIN_EMAILS = '  admin@example.com  ,  other@example.com  '

      const mockSet = vi.fn()
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as unknown as UpdateReturn)

      const response = await GET()
      expect(response.status).toBe(200)
    })

    it('should reject user not in multi-admin list', async () => {
      vi.mocked(getSession).mockResolvedValue({
        isLoggedIn: true,
        userId: 'user-123',
        email: 'notadmin@example.com',
      } as unknown as SessionData)

      process.env.ADMIN_EMAILS = 'admin1@example.com,admin2@example.com'

      const response = await GET()
      expect(response.status).toBe(403)

      const data = await response.json()
      expect(data.error).toBe('Forbidden - Admin access required')
    })
  })

  describe('Functionality Tests', () => {
    beforeEach(() => {
      vi.mocked(getSession).mockResolvedValue({
        isLoggedIn: true,
        userId: 'admin-user-123',
        email: 'admin@example.com',
      } as unknown as SessionData)

      process.env.ADMIN_EMAILS = 'admin@example.com'
    })

    it('should reset tokens for all users (call db.update)', async () => {
      const mockSet = vi.fn()
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as unknown as UpdateReturn)

      await GET()

      expect(db.update).toHaveBeenCalledTimes(1)
      expect(mockSet).toHaveBeenCalledTimes(1)
    })

    it('should set tokensUsed to 0', async () => {
      const mockSet = vi.fn()
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as unknown as UpdateReturn)

      await GET()

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          tokensUsed: 0,
        })
      )
    })

    it('should set new period start to now', async () => {
      const mockSet = vi.fn()
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as unknown as UpdateReturn)

      const beforeCall = new Date()
      await GET()
      const afterCall = new Date()

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          periodStart: expect.any(Date),
        })
      )

      const callArgs = mockSet.mock.calls[0][0] as {
        periodStart: Date
        periodEnd: Date
        updatedAt: Date
      }
      expect(callArgs.periodStart.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime())
      expect(callArgs.periodStart.getTime()).toBeLessThanOrEqual(afterCall.getTime())
    })

    it('should set new period end date (30 days from now)', async () => {
      const mockSet = vi.fn()
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as unknown as UpdateReturn)

      const beforeCall = new Date()
      await GET()

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          periodEnd: expect.any(Date),
        })
      )

      const callArgs = mockSet.mock.calls[0][0] as {
        periodStart: Date
        periodEnd: Date
        updatedAt: Date
      }
      const expectedEndMin = new Date(beforeCall.getTime() + 30 * 24 * 60 * 60 * 1000)

      // Allow 1 second tolerance
      expect(Math.abs(callArgs.periodEnd.getTime() - expectedEndMin.getTime())).toBeLessThan(1000)
    })

    it('should set updatedAt to now', async () => {
      const mockSet = vi.fn()
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as unknown as UpdateReturn)

      const beforeCall = new Date()
      await GET()
      const afterCall = new Date()

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          updatedAt: expect.any(Date),
        })
      )

      const callArgs = mockSet.mock.calls[0][0] as {
        periodStart: Date
        periodEnd: Date
        updatedAt: Date
      }
      expect(callArgs.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime())
      expect(callArgs.updatedAt.getTime()).toBeLessThanOrEqual(afterCall.getTime())
    })

    it('should return success response with correct structure', async () => {
      const mockSet = vi.fn()
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as unknown as UpdateReturn)

      const response = await GET()
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toHaveProperty('success', true)
      expect(data).toHaveProperty('message', 'Token limits reset for all users')
      expect(data).toHaveProperty('newPeriodEnd')
    })

    it('should return newPeriodEnd as ISO string', async () => {
      const mockSet = vi.fn()
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as unknown as UpdateReturn)

      const response = await GET()
      const data = await response.json()

      // Verify it's a valid ISO string
      expect(typeof data.newPeriodEnd).toBe('string')
      const parsedDate = new Date(data.newPeriodEnd)
      expect(parsedDate.toISOString()).toBe(data.newPeriodEnd)

      // Verify it's approximately 30 days from now
      const now = new Date()
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      const returnedDate = new Date(data.newPeriodEnd)

      // Allow 5 seconds tolerance
      expect(Math.abs(returnedDate.getTime() - thirtyDaysFromNow.getTime())).toBeLessThan(5000)
    })
  })

  describe('Error Handling Tests', () => {
    beforeEach(() => {
      vi.mocked(getSession).mockResolvedValue({
        isLoggedIn: true,
        userId: 'admin-user-123',
        email: 'admin@example.com',
      } as unknown as SessionData)

      process.env.ADMIN_EMAILS = 'admin@example.com'
    })

    it('should propagate database errors (route lacks try-catch)', async () => {
      // Note: The route currently does not have error handling (no try-catch).
      // Database errors will propagate up and Next.js will handle them.
      // Ideally, the route should catch errors and return a 500 response.
      vi.mocked(db.update).mockImplementation(() => {
        throw new Error('Database connection failed')
      })

      await expect(GET()).rejects.toThrow('Database connection failed')
    })

    it('should handle async database rejection', async () => {
      // Test for async rejection scenario
      const mockSet = vi.fn().mockRejectedValue(new Error('Database write failed'))
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as unknown as UpdateReturn)

      await expect(GET()).rejects.toThrow('Database write failed')
    })
  })
})
