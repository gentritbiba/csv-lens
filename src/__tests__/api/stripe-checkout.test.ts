import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies before importing route
vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
}))

vi.mock('@/lib/stripe', () => ({
  stripe: {
    customers: {
      create: vi.fn(),
    },
    checkout: {
      sessions: {
        create: vi.fn(),
      },
    },
  },
  STRIPE_CONFIG: {
    proPriceId: 'price_test_123',
  },
}))

vi.mock('@/lib/db', () => ({
  db: {
    query: {
      users: { findFirst: vi.fn() },
    },
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(),
      })),
    })),
  },
  users: { id: 'id' },
  subscriptions: { userId: 'userId' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((field, value) => ({ field, value })),
}))

import { POST } from '@/app/api/stripe/checkout/route'
import { getSession } from '@/lib/auth/session'
import { stripe, STRIPE_CONFIG } from '@/lib/stripe'
import { db } from '@/lib/db'
import { NextRequest } from 'next/server'

describe('POST /api/stripe/checkout', () => {
  const createRequest = () => {
    return new NextRequest('http://localhost/api/stripe/checkout', {
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
    })
  })

  describe('Configuration', () => {
    it('should return 500 when Stripe price ID is not configured', async () => {
      vi.mocked(getSession).mockResolvedValue({
        isLoggedIn: true,
        userId: 'user-123',
      } as any)

      const originalPriceId = STRIPE_CONFIG.proPriceId
      // @ts-expect-error - modifying read-only for test
      STRIPE_CONFIG.proPriceId = ''

      const response = await POST(createRequest())
      expect(response.status).toBe(500)

      const data = await response.json()
      expect(data.error).toBe('Stripe not configured')

      // @ts-expect-error - restoring
      STRIPE_CONFIG.proPriceId = originalPriceId
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

    it('should return 400 when user is already pro', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        tier: 'pro',
        subscription: null,
      })

      const response = await POST(createRequest())
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toBe('Already subscribed to Pro')
    })
  })

  describe('Checkout Session Creation', () => {
    beforeEach(() => {
      vi.mocked(getSession).mockResolvedValue({
        isLoggedIn: true,
        userId: 'user-123',
      } as any)
    })

    it('should create Stripe customer if none exists', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        tier: 'free',
        subscription: { stripeCustomerId: null },
      })

      vi.mocked(stripe.customers.create).mockResolvedValue({
        id: 'cus_new_123',
      } as any)

      vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
        url: 'https://checkout.stripe.com/session/123',
      } as any)

      const response = await POST(createRequest())
      expect(response.status).toBe(200)

      expect(stripe.customers.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'Test User',
        metadata: { userId: 'user-123' },
      })
    })

    it('should use existing Stripe customer ID', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        tier: 'free',
        subscription: { stripeCustomerId: 'cus_existing_123' },
      })

      vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
        url: 'https://checkout.stripe.com/session/123',
      } as any)

      const response = await POST(createRequest())
      expect(response.status).toBe(200)

      // Should not create new customer
      expect(stripe.customers.create).not.toHaveBeenCalled()

      // Should use existing customer ID in checkout
      expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_existing_123',
        })
      )
    })

    it('should create checkout session with correct parameters', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        tier: 'free',
        subscription: { stripeCustomerId: 'cus_123' },
      })

      vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
        url: 'https://checkout.stripe.com/session/123',
      } as any)

      await POST(createRequest())

      expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_123',
          mode: 'subscription',
          line_items: [{ price: 'price_test_123', quantity: 1 }],
          metadata: { userId: 'user-123' },
          subscription_data: {
            metadata: { userId: 'user-123' },
          },
        })
      )
    })

    it('should return checkout URL on success', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        tier: 'free',
        subscription: { stripeCustomerId: 'cus_123' },
      })

      vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
        url: 'https://checkout.stripe.com/session/abc123',
      } as any)

      const response = await POST(createRequest())
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.url).toBe('https://checkout.stripe.com/session/abc123')
    })

    it('should include userId in both session and subscription metadata', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        tier: 'free',
        subscription: { stripeCustomerId: 'cus_123' },
      })

      vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
        url: 'https://checkout.stripe.com/session/123',
      } as any)

      await POST(createRequest())

      expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { userId: 'user-123' },
          subscription_data: {
            metadata: { userId: 'user-123' },
          },
        })
      )
    })

    it('should update subscription with new customer ID when creating customer', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        tier: 'free',
        subscription: { id: 'sub-db-123', stripeCustomerId: null },
      })

      vi.mocked(stripe.customers.create).mockResolvedValue({
        id: 'cus_new_123',
      } as any)

      vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
        url: 'https://checkout.stripe.com/session/123',
      } as any)

      const mockUpdate = vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(),
        })),
      }))
      vi.mocked(db.update).mockImplementation(mockUpdate)

      await POST(createRequest())

      expect(db.update).toHaveBeenCalled()
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
        tier: 'free',
        subscription: { stripeCustomerId: 'cus_123' },
      })
    })

    it('should return 500 when Stripe checkout creation fails', async () => {
      vi.mocked(stripe.checkout.sessions.create).mockRejectedValue(
        new Error('Stripe API error')
      )

      const response = await POST(createRequest())
      expect(response.status).toBe(500)

      const data = await response.json()
      expect(data.error).toBe('Failed to create checkout session')
    })

    it('should return 500 when customer creation fails', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        tier: 'free',
        subscription: { stripeCustomerId: null },
      })

      vi.mocked(stripe.customers.create).mockRejectedValue(
        new Error('Customer creation failed')
      )

      const response = await POST(createRequest())
      expect(response.status).toBe(500)
    })

    it('should return 500 when database query fails', async () => {
      vi.mocked(db.query.users.findFirst).mockRejectedValue(
        new Error('Database error')
      )

      const response = await POST(createRequest())
      expect(response.status).toBe(500)
    })
  })
})
