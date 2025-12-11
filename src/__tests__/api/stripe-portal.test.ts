import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies before importing route
vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
}))

vi.mock('@/lib/stripe', () => ({
  stripe: {
    billingPortal: {
      sessions: {
        create: vi.fn(),
      },
    },
  },
}))

vi.mock('@/lib/db', () => ({
  db: {
    query: {
      users: { findFirst: vi.fn() },
    },
  },
  users: { id: 'id' },
  subscriptions: { userId: 'userId' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((field, value) => ({ field, value })),
}))

import { POST } from '@/app/api/stripe/portal/route'
import { getSession } from '@/lib/auth/session'
import { stripe } from '@/lib/stripe'
import { db } from '@/lib/db'
import { NextRequest } from 'next/server'

describe('POST /api/stripe/portal', () => {
  const createRequest = () => {
    return new NextRequest('http://localhost/api/stripe/portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Authentication', () => {
    it('should return 401 when not logged in', async () => {
      vi.mocked(getSession).mockResolvedValue({
        isLoggedIn: false,
        userId: undefined,
      } as any)

      const response = await POST(createRequest())
      expect(response.status).toBe(401)

      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 401 when userId is missing', async () => {
      vi.mocked(getSession).mockResolvedValue({
        isLoggedIn: true,
        userId: undefined,
      } as any)

      const response = await POST(createRequest())
      expect(response.status).toBe(401)

      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 401 when isLoggedIn is false even with userId', async () => {
      vi.mocked(getSession).mockResolvedValue({
        isLoggedIn: false,
        userId: 'user-123',
      } as any)

      const response = await POST(createRequest())
      expect(response.status).toBe(401)

      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('User Validation', () => {
    beforeEach(() => {
      vi.mocked(getSession).mockResolvedValue({
        isLoggedIn: true,
        userId: 'user-123',
      } as any)
    })

    it('should return 404 when user not found', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue(null)

      const response = await POST(createRequest())
      expect(response.status).toBe(404)

      const data = await response.json()
      expect(data.error).toBe('User not found')
    })

    it('should return 404 when user is undefined', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue(undefined)

      const response = await POST(createRequest())
      expect(response.status).toBe(404)

      const data = await response.json()
      expect(data.error).toBe('User not found')
    })
  })

  describe('Subscription Validation', () => {
    beforeEach(() => {
      vi.mocked(getSession).mockResolvedValue({
        isLoggedIn: true,
        userId: 'user-123',
      } as any)
    })

    it('should return 400 when user has no subscription', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        subscription: null,
      })

      const response = await POST(createRequest())
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toBe('No billing account found')
    })

    it('should return 400 when subscription exists but has no stripeCustomerId', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        subscription: { stripeCustomerId: null },
      })

      const response = await POST(createRequest())
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toBe('No billing account found')
    })

    it('should return 400 when stripeCustomerId is undefined', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        subscription: { stripeCustomerId: undefined },
      })

      const response = await POST(createRequest())
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toBe('No billing account found')
    })

    it('should return 400 when stripeCustomerId is empty string', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        subscription: { stripeCustomerId: '' },
      })

      const response = await POST(createRequest())
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toBe('No billing account found')
    })
  })

  describe('Portal Session Creation', () => {
    beforeEach(() => {
      vi.mocked(getSession).mockResolvedValue({
        isLoggedIn: true,
        userId: 'user-123',
      } as any)

      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        subscription: { stripeCustomerId: 'cus_123' },
      })
    })

    it('should create portal session with correct customer ID', async () => {
      vi.mocked(stripe.billingPortal.sessions.create).mockResolvedValue({
        url: 'https://billing.stripe.com/session/abc123',
      } as any)

      await POST(createRequest())

      expect(stripe.billingPortal.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_123',
        })
      )
    })

    it('should create portal session with correct return URL', async () => {
      vi.mocked(stripe.billingPortal.sessions.create).mockResolvedValue({
        url: 'https://billing.stripe.com/session/abc123',
      } as any)

      await POST(createRequest())

      expect(stripe.billingPortal.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          return_url: 'http://localhost/settings',
        })
      )
    })

    it('should return portal URL on success', async () => {
      vi.mocked(stripe.billingPortal.sessions.create).mockResolvedValue({
        url: 'https://billing.stripe.com/session/abc123',
      } as any)

      const response = await POST(createRequest())
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.url).toBe('https://billing.stripe.com/session/abc123')
    })

    it('should handle different origin URLs correctly', async () => {
      const customRequest = new NextRequest('https://myapp.com/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      vi.mocked(stripe.billingPortal.sessions.create).mockResolvedValue({
        url: 'https://billing.stripe.com/session/xyz789',
      } as any)

      await POST(customRequest)

      expect(stripe.billingPortal.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          return_url: 'https://myapp.com/settings',
        })
      )
    })

    it('should return response with correct content type', async () => {
      vi.mocked(stripe.billingPortal.sessions.create).mockResolvedValue({
        url: 'https://billing.stripe.com/session/abc123',
      } as any)

      const response = await POST(createRequest())

      expect(response.headers.get('content-type')).toContain('application/json')
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      vi.mocked(getSession).mockResolvedValue({
        isLoggedIn: true,
        userId: 'user-123',
      } as any)

      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        subscription: { stripeCustomerId: 'cus_123' },
      })
    })

    it('should return 500 when Stripe portal session creation fails', async () => {
      vi.mocked(stripe.billingPortal.sessions.create).mockRejectedValue(
        new Error('Stripe API error')
      )

      const response = await POST(createRequest())
      expect(response.status).toBe(500)

      const data = await response.json()
      expect(data.error).toBe('Failed to create portal session')
    })

    it('should return 500 when database query fails', async () => {
      vi.mocked(db.query.users.findFirst).mockRejectedValue(
        new Error('Database error')
      )

      const response = await POST(createRequest())
      expect(response.status).toBe(500)

      const data = await response.json()
      expect(data.error).toBe('Failed to create portal session')
    })

    it('should return 500 when getSession throws an error', async () => {
      vi.mocked(getSession).mockRejectedValue(new Error('Session error'))

      const response = await POST(createRequest())
      expect(response.status).toBe(500)

      const data = await response.json()
      expect(data.error).toBe('Failed to create portal session')
    })

    it('should handle Stripe rate limit errors', async () => {
      const rateLimitError = new Error('Rate limit exceeded')
      ;(rateLimitError as any).type = 'StripeRateLimitError'
      vi.mocked(stripe.billingPortal.sessions.create).mockRejectedValue(rateLimitError)

      const response = await POST(createRequest())
      expect(response.status).toBe(500)

      const data = await response.json()
      expect(data.error).toBe('Failed to create portal session')
    })

    it('should handle Stripe authentication errors', async () => {
      const authError = new Error('Invalid API Key')
      ;(authError as any).type = 'StripeAuthenticationError'
      vi.mocked(stripe.billingPortal.sessions.create).mockRejectedValue(authError)

      const response = await POST(createRequest())
      expect(response.status).toBe(500)

      const data = await response.json()
      expect(data.error).toBe('Failed to create portal session')
    })

    it('should handle Stripe invalid request errors', async () => {
      const invalidRequestError = new Error('No such customer')
      ;(invalidRequestError as any).type = 'StripeInvalidRequestError'
      vi.mocked(stripe.billingPortal.sessions.create).mockRejectedValue(invalidRequestError)

      const response = await POST(createRequest())
      expect(response.status).toBe(500)

      const data = await response.json()
      expect(data.error).toBe('Failed to create portal session')
    })
  })
})
