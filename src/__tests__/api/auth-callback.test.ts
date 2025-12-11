import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies before importing route
vi.mock('@/lib/auth/workos', () => ({
  workos: {
    userManagement: {
      authenticateWithCode: vi.fn(),
    },
  },
  clientId: 'test_client_id',
}))

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 10, resetIn: 60000 }),
  getClientKey: vi.fn().mockReturnValue('test-client'),
}))

vi.mock('@/lib/db', () => ({
  db: {
    query: {
      users: { findFirst: vi.fn() },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(),
      })),
    })),
  },
  users: { workosId: 'workosId', id: 'id' },
  subscriptions: {},
  tokenUsage: {},
  TOKEN_LIMITS: { free: 120000, pro: 3000000 },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((field, value) => ({ field, value })),
}))

import { GET } from '@/app/api/auth/callback/route'
import { workos } from '@/lib/auth/workos'
import { getSession } from '@/lib/auth/session'
import { checkRateLimit } from '@/lib/rate-limit'
import { db } from '@/lib/db'
import { NextRequest } from 'next/server'

describe('GET /api/auth/callback', () => {
  const createRequest = (params: Record<string, string> = {}) => {
    const url = new URL('http://localhost/api/auth/callback')
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value)
    }
    return new NextRequest(url)
  }

  const mockSession = {
    userId: '',
    email: '',
    name: '',
    tier: 'free' as const,
    isLoggedIn: false,
    save: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getSession).mockResolvedValue(mockSession as any)
  })

  describe('Rate Limiting', () => {
    it('should redirect with rate_limit error when rate limited', async () => {
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetIn: 60000,
      })

      const response = await GET(createRequest({ code: 'test_code' }))

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('error=rate_limit')
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: true,
        remaining: 10,
        resetIn: 60000,
      })
    })

    it('should redirect with auth_failed error when WorkOS returns error', async () => {
      const response = await GET(createRequest({ error: 'access_denied' }))

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('error=auth_failed')
    })

    it('should redirect with no_code error when code is missing', async () => {
      const response = await GET(createRequest())

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('error=no_code')
    })

    it('should redirect with auth_failed error when WorkOS authentication fails', async () => {
      vi.mocked(workos.userManagement.authenticateWithCode).mockRejectedValue(
        new Error('Authentication failed')
      )

      const response = await GET(createRequest({ code: 'invalid_code' }))

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('error=auth_failed')
    })
  })

  describe('New User Registration', () => {
    beforeEach(() => {
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: true,
        remaining: 10,
        resetIn: 60000,
      })
    })

    it('should create new user when user does not exist', async () => {
      const workosUser = {
        id: 'workos_user_123',
        email: 'newuser@example.com',
        firstName: 'New',
        lastName: 'User',
        profilePictureUrl: 'https://example.com/avatar.jpg',
      }

      vi.mocked(workos.userManagement.authenticateWithCode).mockResolvedValue({
        user: workosUser,
      } as any)

      vi.mocked(db.query.users.findFirst).mockResolvedValue(null)

      const newUser = {
        id: 'db_user_123',
        workosId: workosUser.id,
        email: workosUser.email,
        name: 'New User',
        tier: 'free',
      }

      const mockReturning = vi.fn().mockResolvedValue([newUser])
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning })
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as any)

      const response = await GET(createRequest({ code: 'valid_code' }))

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/app')

      // Verify user was created
      expect(db.insert).toHaveBeenCalled()

      // Verify session was saved
      expect(mockSession.save).toHaveBeenCalled()
      expect(mockSession.isLoggedIn).toBe(true)
      expect(mockSession.userId).toBe('db_user_123')
    })

    it('should create subscription and token usage records for new user', async () => {
      const workosUser = {
        id: 'workos_user_123',
        email: 'newuser@example.com',
        firstName: 'New',
        lastName: null,
        profilePictureUrl: null,
      }

      vi.mocked(workos.userManagement.authenticateWithCode).mockResolvedValue({
        user: workosUser,
      } as any)

      vi.mocked(db.query.users.findFirst).mockResolvedValue(null)

      const newUser = { id: 'db_user_123', tier: 'free', email: workosUser.email }
      const mockReturning = vi.fn().mockResolvedValue([newUser])
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning })
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as any)

      await GET(createRequest({ code: 'valid_code' }))

      // Should insert user, subscription, and token usage (3 inserts)
      expect(db.insert).toHaveBeenCalledTimes(3)
    })

    it('should handle user with only first name', async () => {
      const workosUser = {
        id: 'workos_user_123',
        email: 'user@example.com',
        firstName: 'John',
        lastName: null,
        profilePictureUrl: null,
      }

      vi.mocked(workos.userManagement.authenticateWithCode).mockResolvedValue({
        user: workosUser,
      } as any)

      vi.mocked(db.query.users.findFirst).mockResolvedValue(null)

      const newUser = { id: 'db_user_123', tier: 'free', email: workosUser.email, name: 'John' }
      const mockReturning = vi.fn().mockResolvedValue([newUser])
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning })
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as any)

      await GET(createRequest({ code: 'valid_code' }))

      expect(mockSession.name).toBe('John')
    })
  })

  describe('Existing User Login', () => {
    beforeEach(() => {
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: true,
        remaining: 10,
        resetIn: 60000,
      })
    })

    it('should update existing user info on login', async () => {
      const workosUser = {
        id: 'workos_user_123',
        email: 'updated@example.com',
        firstName: 'Updated',
        lastName: 'Name',
        profilePictureUrl: 'https://example.com/new-avatar.jpg',
      }

      vi.mocked(workos.userManagement.authenticateWithCode).mockResolvedValue({
        user: workosUser,
      } as any)

      const existingUser = {
        id: 'db_user_123',
        workosId: 'workos_user_123',
        email: 'old@example.com',
        name: 'Old Name',
        avatarUrl: null,
        tier: 'pro',
      }

      vi.mocked(db.query.users.findFirst).mockResolvedValue(existingUser)

      const mockWhere = vi.fn()
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere })
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as any)

      const response = await GET(createRequest({ code: 'valid_code' }))

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/app')

      // Should update user, not insert
      expect(db.update).toHaveBeenCalled()
      expect(db.insert).not.toHaveBeenCalled()

      // Session should have correct tier
      expect(mockSession.tier).toBe('pro')
    })

    it('should preserve existing name if WorkOS does not provide first name', async () => {
      const workosUser = {
        id: 'workos_user_123',
        email: 'user@example.com',
        firstName: null,
        lastName: null,
        profilePictureUrl: null,
      }

      vi.mocked(workos.userManagement.authenticateWithCode).mockResolvedValue({
        user: workosUser,
      } as any)

      const existingUser = {
        id: 'db_user_123',
        workosId: 'workos_user_123',
        email: 'user@example.com',
        name: 'Existing Name',
        avatarUrl: 'https://example.com/avatar.jpg',
        tier: 'free',
      }

      vi.mocked(db.query.users.findFirst).mockResolvedValue(existingUser)

      const mockSet = vi.fn().mockReturnValue({ where: vi.fn() })
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as any)

      await GET(createRequest({ code: 'valid_code' }))

      // Name should be preserved (existing name used when WorkOS doesn't provide firstName)
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Existing Name',
        })
      )
    })
  })

  describe('Session Creation', () => {
    beforeEach(() => {
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: true,
        remaining: 10,
        resetIn: 60000,
      })
    })

    it('should create session with correct user data', async () => {
      const workosUser = {
        id: 'workos_user_123',
        email: 'user@example.com',
        firstName: 'Test',
        lastName: 'User',
        profilePictureUrl: null,
      }

      vi.mocked(workos.userManagement.authenticateWithCode).mockResolvedValue({
        user: workosUser,
      } as any)

      const existingUser = {
        id: 'db_user_123',
        workosId: 'workos_user_123',
        email: 'user@example.com',
        name: 'Test User',
        tier: 'pro',
      }

      vi.mocked(db.query.users.findFirst).mockResolvedValue(existingUser)
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({ where: vi.fn() }),
      } as any)

      await GET(createRequest({ code: 'valid_code' }))

      expect(mockSession.userId).toBe('db_user_123')
      expect(mockSession.email).toBe('user@example.com')
      expect(mockSession.name).toBe('Test User')
      expect(mockSession.tier).toBe('pro')
      expect(mockSession.isLoggedIn).toBe(true)
      expect(mockSession.save).toHaveBeenCalled()
    })

    it('should redirect to /app on successful login', async () => {
      vi.mocked(workos.userManagement.authenticateWithCode).mockResolvedValue({
        user: {
          id: 'workos_123',
          email: 'user@example.com',
          firstName: 'Test',
          lastName: null,
        },
      } as any)

      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        id: 'db_123',
        email: 'user@example.com',
        name: 'Test',
        tier: 'free',
      })

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({ where: vi.fn() }),
      } as any)

      const response = await GET(createRequest({ code: 'valid_code' }))

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/app')
    })
  })

  describe('Database Error Handling', () => {
    beforeEach(() => {
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: true,
        remaining: 10,
        resetIn: 60000,
      })

      vi.mocked(workos.userManagement.authenticateWithCode).mockResolvedValue({
        user: {
          id: 'workos_123',
          email: 'user@example.com',
          firstName: 'Test',
        },
      } as any)
    })

    it('should redirect with auth_failed error on database error', async () => {
      vi.mocked(db.query.users.findFirst).mockRejectedValue(
        new Error('Database connection failed')
      )

      const response = await GET(createRequest({ code: 'valid_code' }))

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('error=auth_failed')
    })

    it('should redirect with auth_failed error on insert error', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue(null)
      vi.mocked(db.insert).mockImplementation(() => {
        throw new Error('Insert failed')
      })

      const response = await GET(createRequest({ code: 'valid_code' }))

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('error=auth_failed')
    })
  })
})
