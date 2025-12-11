import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { IronSession } from 'iron-session'
import type { SessionData } from '@/lib/auth/session'

// Define the mock session type
type MockSession = IronSession<SessionData> & {
  userId: string;
  email: string;
  name: string | null;
  tier: 'free' | 'pro';
  isLoggedIn: boolean;
}

// Mock dependencies before importing route
vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    query: {
      users: { findFirst: vi.fn() },
      tokenUsage: { findFirst: vi.fn() },
      subscriptions: { findFirst: vi.fn() },
    },
  },
  users: { id: 'id', email: 'email', name: 'name', avatarUrl: 'avatarUrl', tier: 'tier' },
  tokenUsage: { userId: 'userId', tokensUsed: 'tokensUsed', tokenLimit: 'tokenLimit', periodEnd: 'periodEnd' },
  subscriptions: { userId: 'userId', status: 'status', currentPeriodEnd: 'currentPeriodEnd' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((field, value) => ({ field, value })),
}))

import { GET } from '@/app/api/auth/me/route'
import { getSession } from '@/lib/auth/session'
import { db } from '@/lib/db'

describe('GET /api/auth/me', () => {
  // Create a mock session factory to avoid type issues
  const createMockSession = (overrides: Partial<SessionData> = {}): MockSession => ({
    userId: '',
    email: '',
    name: null,
    tier: 'free',
    isLoggedIn: false,
    save: vi.fn(),
    destroy: vi.fn(),
    updateConfig: vi.fn(),
    ...overrides,
  } as MockSession)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Authentication', () => {
    it('should return 401 with null user when not logged in', async () => {
      vi.mocked(getSession).mockResolvedValue(createMockSession({
        isLoggedIn: false,
        userId: '',
      }))

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data).toEqual({ user: null })
    })

    it('should return 401 when isLoggedIn is true but userId is missing', async () => {
      vi.mocked(getSession).mockResolvedValue(createMockSession({
        isLoggedIn: true,
        userId: '',
      }))

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data).toEqual({ user: null })
    })

    it('should return 401 when isLoggedIn is false but userId exists', async () => {
      vi.mocked(getSession).mockResolvedValue(createMockSession({
        isLoggedIn: false,
        userId: 'user_123',
      }))

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data).toEqual({ user: null })
    })

    it('should return 401 when userId is undefined', async () => {
      const session = createMockSession({
        isLoggedIn: true,
      })
      // Explicitly set userId to undefined to test this edge case
      ;(session as unknown as Record<string, unknown>).userId = undefined

      vi.mocked(getSession).mockResolvedValue(session)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data).toEqual({ user: null })
    })
  })

  describe('User Data Response', () => {
    beforeEach(() => {
      vi.mocked(getSession).mockResolvedValue(createMockSession({
        isLoggedIn: true,
        userId: 'user_123',
      }))
    })

    it('should return 401 when user is not found in database', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue(null)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data).toEqual({ user: null })
    })

    it('should return user profile data with all fields', async () => {
      const mockUser = {
        id: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: 'https://example.com/avatar.jpg',
        tier: 'pro',
        workosId: 'workos_123',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser)
      vi.mocked(db.query.tokenUsage.findFirst).mockResolvedValue(null)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.user).toEqual({
        id: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: 'https://example.com/avatar.jpg',
        tier: 'pro',
      })
    })

    it('should return user profile with null avatarUrl', async () => {
      const mockUser = {
        id: 'user_456',
        email: 'noavatar@example.com',
        name: 'No Avatar User',
        avatarUrl: null,
        tier: 'free',
      }

      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser)
      vi.mocked(db.query.tokenUsage.findFirst).mockResolvedValue(null)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.user.avatarUrl).toBeNull()
    })

    it('should return user profile with free tier', async () => {
      const mockUser = {
        id: 'user_789',
        email: 'free@example.com',
        name: 'Free User',
        avatarUrl: null,
        tier: 'free',
      }

      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser)
      vi.mocked(db.query.tokenUsage.findFirst).mockResolvedValue(null)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.user.tier).toBe('free')
    })

    it('should not expose additional user fields beyond the specified ones', async () => {
      const mockUser = {
        id: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: 'https://example.com/avatar.jpg',
        tier: 'pro',
        workosId: 'workos_secret_123',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser)
      vi.mocked(db.query.tokenUsage.findFirst).mockResolvedValue(null)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(Object.keys(data.user)).toEqual(['id', 'email', 'name', 'avatarUrl', 'tier'])
      expect(data.user.workosId).toBeUndefined()
    })
  })

  describe('Token Usage Response', () => {
    const mockUser = {
      id: 'user_123',
      email: 'test@example.com',
      name: 'Test User',
      avatarUrl: null,
      tier: 'pro',
    }

    beforeEach(() => {
      vi.mocked(getSession).mockResolvedValue(createMockSession({
        isLoggedIn: true,
        userId: 'user_123',
      }))
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser)
    })

    it('should return token usage data when available', async () => {
      const periodEnd = new Date('2024-02-01T00:00:00.000Z')
      const mockTokenUsage = {
        id: 'usage_123',
        userId: 'user_123',
        tokensUsed: 50000,
        tokenLimit: 1500000,
        periodEnd: periodEnd,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(db.query.tokenUsage.findFirst).mockResolvedValue(mockTokenUsage)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.usage).toEqual({
        tokensUsed: 50000,
        tokenLimit: 1500000,
        periodEnd: periodEnd.toISOString(),
      })
    })

    it('should return null usage when no token usage record exists', async () => {
      vi.mocked(db.query.tokenUsage.findFirst).mockResolvedValue(null)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.usage).toBeNull()
    })

    it('should return correct usage for free tier user', async () => {
      const freeUser = { ...mockUser, tier: 'free' }
      vi.mocked(db.query.users.findFirst).mockResolvedValue(freeUser)

      const mockTokenUsage = {
        userId: 'user_123',
        tokensUsed: 100000,
        tokenLimit: 150000,
        periodEnd: new Date('2024-02-01'),
      }

      vi.mocked(db.query.tokenUsage.findFirst).mockResolvedValue(mockTokenUsage)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.usage.tokensUsed).toBe(100000)
      expect(data.usage.tokenLimit).toBe(150000)
    })

    it('should return correct usage for pro tier user', async () => {
      const mockTokenUsage = {
        userId: 'user_123',
        tokensUsed: 500000,
        tokenLimit: 1500000,
        periodEnd: new Date('2024-02-01'),
      }

      vi.mocked(db.query.tokenUsage.findFirst).mockResolvedValue(mockTokenUsage)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.usage.tokensUsed).toBe(500000)
      expect(data.usage.tokenLimit).toBe(1500000)
    })

    it('should return usage with zero tokens used', async () => {
      const mockTokenUsage = {
        userId: 'user_123',
        tokensUsed: 0,
        tokenLimit: 1500000,
        periodEnd: new Date('2024-02-01'),
      }

      vi.mocked(db.query.tokenUsage.findFirst).mockResolvedValue(mockTokenUsage)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.usage.tokensUsed).toBe(0)
    })

    it('should not expose additional token usage fields', async () => {
      const mockTokenUsage = {
        id: 'usage_123',
        userId: 'user_123',
        tokensUsed: 50000,
        tokenLimit: 1500000,
        periodEnd: new Date('2024-02-01'),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(db.query.tokenUsage.findFirst).mockResolvedValue(mockTokenUsage)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(Object.keys(data.usage)).toEqual(['tokensUsed', 'tokenLimit', 'periodEnd'])
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      vi.mocked(getSession).mockResolvedValue(createMockSession({
        isLoggedIn: true,
        userId: 'user_123',
      }))
    })

    it('should return 500 when user query throws an error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      vi.mocked(db.query.users.findFirst).mockRejectedValue(
        new Error('Database connection failed')
      )

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Internal error' })
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error fetching user:',
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
    })

    it('should return 500 when token usage query throws an error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const mockUser = {
        id: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: null,
        tier: 'pro',
      }

      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser)
      vi.mocked(db.query.tokenUsage.findFirst).mockRejectedValue(
        new Error('Token usage query failed')
      )

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Internal error' })
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error fetching user:',
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
    })

    it('should handle session retrieval errors gracefully', async () => {
      vi.mocked(getSession).mockRejectedValue(new Error('Session error'))

      await expect(GET()).rejects.toThrow('Session error')
    })

    it('should return 500 with generic error message for any database error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      vi.mocked(db.query.users.findFirst).mockRejectedValue(
        new Error('Specific database error that should not be exposed')
      )

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal error')
      expect(data.error).not.toContain('database')

      consoleErrorSpy.mockRestore()
    })
  })

  describe('Complete Response Structure', () => {
    it('should return complete response with user and usage data', async () => {
      vi.mocked(getSession).mockResolvedValue(createMockSession({
        isLoggedIn: true,
        userId: 'user_123',
      }))

      const mockUser = {
        id: 'user_123',
        email: 'complete@example.com',
        name: 'Complete User',
        avatarUrl: 'https://example.com/avatar.png',
        tier: 'pro',
      }

      const periodEnd = new Date('2024-03-01T00:00:00.000Z')
      const mockTokenUsage = {
        userId: 'user_123',
        tokensUsed: 250000,
        tokenLimit: 1500000,
        periodEnd: periodEnd,
      }

      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser)
      vi.mocked(db.query.tokenUsage.findFirst).mockResolvedValue(mockTokenUsage)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        user: {
          id: 'user_123',
          email: 'complete@example.com',
          name: 'Complete User',
          avatarUrl: 'https://example.com/avatar.png',
          tier: 'pro',
        },
        usage: {
          tokensUsed: 250000,
          tokenLimit: 1500000,
          periodEnd: periodEnd.toISOString(),
        },
        subscription: null,
      })
    })

    it('should return complete response with user data and null usage', async () => {
      vi.mocked(getSession).mockResolvedValue(createMockSession({
        isLoggedIn: true,
        userId: 'user_123',
      }))

      const mockUser = {
        id: 'user_123',
        email: 'nousage@example.com',
        name: 'No Usage User',
        avatarUrl: null,
        tier: 'free',
      }

      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser)
      vi.mocked(db.query.tokenUsage.findFirst).mockResolvedValue(null)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        user: {
          id: 'user_123',
          email: 'nousage@example.com',
          name: 'No Usage User',
          avatarUrl: null,
          tier: 'free',
        },
        usage: null,
        subscription: null,
      })
    })
  })
})
