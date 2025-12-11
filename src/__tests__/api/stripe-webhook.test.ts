import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies before importing route
vi.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: {
      constructEvent: vi.fn(),
    },
    subscriptions: {
      retrieve: vi.fn(),
    },
  },
  STRIPE_CONFIG: {
    webhookSecret: 'whsec_test_secret',
  },
}))

vi.mock('@/lib/db', () => ({
  db: {
    query: {
      users: { findFirst: vi.fn() },
      subscriptions: { findFirst: vi.fn() },
    },
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(),
      })),
    })),
  },
  users: { id: 'id' },
  subscriptions: { userId: 'userId', stripeCustomerId: 'stripeCustomerId', id: 'id' },
  tokenUsage: { userId: 'userId' },
  TOKEN_LIMITS: { free: 120000, pro: 3000000 },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((field, value) => ({ field, value })),
}))

import { POST } from '@/app/api/stripe/webhook/route'
import { stripe, STRIPE_CONFIG } from '@/lib/stripe'
import { db } from '@/lib/db'
import { NextRequest } from 'next/server'

describe('POST /api/stripe/webhook', () => {
  const createRequest = (body: string, signature?: string) => {
    const headers = new Headers({ 'Content-Type': 'application/json' })
    if (signature) {
      headers.set('stripe-signature', signature)
    }
    return new NextRequest('http://localhost/api/stripe/webhook', {
      method: 'POST',
      headers,
      body,
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Request Validation', () => {
    it('should return 400 when stripe-signature header is missing', async () => {
      const response = await POST(createRequest('{}'))
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toBe('Missing stripe-signature header')
    })

    it('should return 400 when signature verification fails', async () => {
      vi.mocked(stripe.webhooks.constructEvent).mockImplementation(() => {
        throw new Error('Signature verification failed')
      })

      const response = await POST(createRequest('{}', 'invalid_signature'))
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toBe('Invalid signature')
    })

    it('should return 500 when webhook secret is not configured', async () => {
      const originalSecret = STRIPE_CONFIG.webhookSecret
      // @ts-expect-error - modifying read-only for test
      STRIPE_CONFIG.webhookSecret = ''

      const response = await POST(createRequest('{}', 'test_signature'))
      expect(response.status).toBe(500)

      const data = await response.json()
      expect(data.error).toBe('Webhook not configured')

      // @ts-expect-error - restoring read-only for test
      STRIPE_CONFIG.webhookSecret = originalSecret
    })
  })

  describe('checkout.session.completed', () => {
    const mockCheckoutSession = {
      metadata: { userId: 'user-123' },
      subscription: 'sub_123',
      customer: 'cus_123',
    }

    beforeEach(() => {
      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        type: 'checkout.session.completed',
        data: { object: mockCheckoutSession },
      } as any)

      vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue({
        items: {
          data: [{
            current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
          }],
        },
      } as any)
    })

    it('should upgrade user to pro on successful checkout', async () => {
      vi.mocked(db.query.subscriptions.findFirst).mockResolvedValue(null)
      vi.mocked(db.query.users.findFirst).mockResolvedValue({ id: 'user-123', tier: 'free' })

      const mockUpdate = vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(),
        })),
      }))
      vi.mocked(db.update).mockImplementation(mockUpdate)

      const response = await POST(createRequest('{}', 'valid_signature'))
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.received).toBe(true)

      // Verify db.update was called for users, subscriptions, and tokenUsage
      expect(db.update).toHaveBeenCalledTimes(3)
    })

    it('should reject checkout with missing userId in metadata', async () => {
      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        type: 'checkout.session.completed',
        data: { object: { ...mockCheckoutSession, metadata: {} } },
      } as any)

      const response = await POST(createRequest('{}', 'valid_signature'))
      expect(response.status).toBe(200)

      // Should return success but not update database (silent fail for missing userId)
      expect(db.update).not.toHaveBeenCalled()
    })

    it('should reject checkout when user does not exist (security check)', async () => {
      vi.mocked(db.query.subscriptions.findFirst).mockResolvedValue(null)
      vi.mocked(db.query.users.findFirst).mockResolvedValue(null) // User not found

      const response = await POST(createRequest('{}', 'valid_signature'))
      expect(response.status).toBe(200)

      // Should not update database when user doesn't exist
      expect(db.update).not.toHaveBeenCalled()
    })

    it('should reject checkout when customer ID mismatch (security check)', async () => {
      vi.mocked(db.query.subscriptions.findFirst).mockResolvedValue({
        userId: 'user-123',
        stripeCustomerId: 'cus_different', // Different customer ID
      })
      vi.mocked(db.query.users.findFirst).mockResolvedValue({ id: 'user-123' })

      const response = await POST(createRequest('{}', 'valid_signature'))
      expect(response.status).toBe(200)

      // Should not update database due to customer ID mismatch
      expect(db.update).not.toHaveBeenCalled()
    })
  })

  describe('customer.subscription.created', () => {
    const mockSubscription = {
      id: 'sub_123',
      metadata: { userId: 'user-123' },
      customer: 'cus_123',
      items: {
        data: [{
          current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        }],
      },
    }

    beforeEach(() => {
      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        type: 'customer.subscription.created',
        data: { object: mockSubscription },
      } as any)
    })

    it('should skip subscription without userId metadata', async () => {
      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        type: 'customer.subscription.created',
        data: { object: { ...mockSubscription, metadata: {} } },
      } as any)

      const response = await POST(createRequest('{}', 'valid_signature'))
      expect(response.status).toBe(200)
      expect(db.update).not.toHaveBeenCalled()
    })

    it('should skip if user does not exist (security check)', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue(null)

      const response = await POST(createRequest('{}', 'valid_signature'))
      expect(response.status).toBe(200)
      expect(db.update).not.toHaveBeenCalled()
    })

    it('should skip if user already pro', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue({ id: 'user-123', tier: 'pro' })
      vi.mocked(db.query.subscriptions.findFirst).mockResolvedValue(null)

      const response = await POST(createRequest('{}', 'valid_signature'))
      expect(response.status).toBe(200)
      expect(db.update).not.toHaveBeenCalled()
    })

    it('should reject subscription when customer ID mismatch', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue({ id: 'user-123', tier: 'free' })
      vi.mocked(db.query.subscriptions.findFirst).mockResolvedValue({
        userId: 'user-123',
        stripeCustomerId: 'cus_different',
      })

      const response = await POST(createRequest('{}', 'valid_signature'))
      expect(response.status).toBe(200)
      expect(db.update).not.toHaveBeenCalled()
    })

    it('should upgrade user on valid subscription created', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue({ id: 'user-123', tier: 'free' })
      vi.mocked(db.query.subscriptions.findFirst).mockResolvedValue(null)

      const mockUpdate = vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(),
        })),
      }))
      vi.mocked(db.update).mockImplementation(mockUpdate)

      const response = await POST(createRequest('{}', 'valid_signature'))
      expect(response.status).toBe(200)
      expect(db.update).toHaveBeenCalledTimes(3)
    })
  })

  describe('customer.subscription.updated', () => {
    const mockSubscription = {
      metadata: { userId: 'user-123' },
      customer: 'cus_123',
      status: 'active',
      items: {
        data: [{
          current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        }],
      },
    }

    beforeEach(() => {
      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        type: 'customer.subscription.updated',
        data: { object: mockSubscription },
      } as any)
    })

    it('should reject update without userId', async () => {
      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        type: 'customer.subscription.updated',
        data: { object: { ...mockSubscription, metadata: {} } },
      } as any)

      const response = await POST(createRequest('{}', 'valid_signature'))
      expect(response.status).toBe(200)
      expect(db.update).not.toHaveBeenCalled()
    })

    it('should reject update when no subscription found', async () => {
      vi.mocked(db.query.subscriptions.findFirst).mockResolvedValue(null)

      const response = await POST(createRequest('{}', 'valid_signature'))
      expect(response.status).toBe(200)
      expect(db.update).not.toHaveBeenCalled()
    })

    it('should reject update when customer ID mismatch', async () => {
      vi.mocked(db.query.subscriptions.findFirst).mockResolvedValue({
        userId: 'user-123',
        stripeCustomerId: 'cus_different',
      })

      const response = await POST(createRequest('{}', 'valid_signature'))
      expect(response.status).toBe(200)
      expect(db.update).not.toHaveBeenCalled()
    })

    it('should update subscription status to active', async () => {
      vi.mocked(db.query.subscriptions.findFirst).mockResolvedValue({
        userId: 'user-123',
        stripeCustomerId: 'cus_123',
      })

      const mockUpdate = vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(),
        })),
      }))
      vi.mocked(db.update).mockImplementation(mockUpdate)

      const response = await POST(createRequest('{}', 'valid_signature'))
      expect(response.status).toBe(200)
      expect(db.update).toHaveBeenCalled()
    })

    it('should map canceled status correctly', async () => {
      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        type: 'customer.subscription.updated',
        data: { object: { ...mockSubscription, status: 'canceled' } },
      } as any)

      vi.mocked(db.query.subscriptions.findFirst).mockResolvedValue({
        userId: 'user-123',
        stripeCustomerId: 'cus_123',
      })

      const mockSet = vi.fn(() => ({ where: vi.fn() }))
      vi.mocked(db.update).mockImplementation(() => ({ set: mockSet } as any))

      await POST(createRequest('{}', 'valid_signature'))

      expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
        status: 'canceled',
      }))
    })

    it('should map past_due status correctly', async () => {
      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        type: 'customer.subscription.updated',
        data: { object: { ...mockSubscription, status: 'past_due' } },
      } as any)

      vi.mocked(db.query.subscriptions.findFirst).mockResolvedValue({
        userId: 'user-123',
        stripeCustomerId: 'cus_123',
      })

      const mockSet = vi.fn(() => ({ where: vi.fn() }))
      vi.mocked(db.update).mockImplementation(() => ({ set: mockSet } as any))

      await POST(createRequest('{}', 'valid_signature'))

      expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
        status: 'past_due',
      }))
    })
  })

  describe('customer.subscription.deleted', () => {
    const mockSubscription = {
      metadata: { userId: 'user-123' },
      customer: 'cus_123',
    }

    beforeEach(() => {
      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        type: 'customer.subscription.deleted',
        data: { object: mockSubscription },
      } as any)
    })

    it('should reject delete without userId', async () => {
      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        type: 'customer.subscription.deleted',
        data: { object: { ...mockSubscription, metadata: {} } },
      } as any)

      const response = await POST(createRequest('{}', 'valid_signature'))
      expect(response.status).toBe(200)
      expect(db.update).not.toHaveBeenCalled()
    })

    it('should reject delete when subscription not found', async () => {
      vi.mocked(db.query.subscriptions.findFirst).mockResolvedValue(null)

      const response = await POST(createRequest('{}', 'valid_signature'))
      expect(response.status).toBe(200)
      expect(db.update).not.toHaveBeenCalled()
    })

    it('should reject delete when customer ID mismatch', async () => {
      vi.mocked(db.query.subscriptions.findFirst).mockResolvedValue({
        userId: 'user-123',
        stripeCustomerId: 'cus_different',
      })

      const response = await POST(createRequest('{}', 'valid_signature'))
      expect(response.status).toBe(200)
      expect(db.update).not.toHaveBeenCalled()
    })

    it('should downgrade user to free on subscription deleted', async () => {
      vi.mocked(db.query.subscriptions.findFirst).mockResolvedValue({
        userId: 'user-123',
        stripeCustomerId: 'cus_123',
      })

      const mockUpdate = vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(),
        })),
      }))
      vi.mocked(db.update).mockImplementation(mockUpdate)

      const response = await POST(createRequest('{}', 'valid_signature'))
      expect(response.status).toBe(200)

      // Should update users, subscriptions, and tokenUsage
      expect(db.update).toHaveBeenCalledTimes(3)
    })
  })

  describe('invoice.paid', () => {
    const mockInvoice = {
      customer: 'cus_123',
      parent: {
        subscription_details: {
          subscription: 'sub_123',
        },
      },
    }

    beforeEach(() => {
      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        type: 'invoice.paid',
        data: { object: mockInvoice },
      } as any)

      vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue({
        items: {
          data: [{
            current_period_start: Math.floor(Date.now() / 1000),
            current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
          }],
        },
      } as any)
    })

    it('should skip non-subscription invoices', async () => {
      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        type: 'invoice.paid',
        data: { object: { customer: 'cus_123', parent: null } },
      } as any)

      const response = await POST(createRequest('{}', 'valid_signature'))
      expect(response.status).toBe(200)
      expect(db.update).not.toHaveBeenCalled()
    })

    it('should skip when subscription not found', async () => {
      vi.mocked(db.query.subscriptions.findFirst).mockResolvedValue(null)

      const response = await POST(createRequest('{}', 'valid_signature'))
      expect(response.status).toBe(200)
      expect(db.update).not.toHaveBeenCalled()
    })

    it('should extend subscription period on invoice paid', async () => {
      vi.mocked(db.query.subscriptions.findFirst).mockResolvedValue({
        id: 'sub-db-123',
        stripeCustomerId: 'cus_123',
      })

      const mockUpdate = vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(),
        })),
      }))
      vi.mocked(db.update).mockImplementation(mockUpdate)

      const response = await POST(createRequest('{}', 'valid_signature'))
      expect(response.status).toBe(200)
      expect(db.update).toHaveBeenCalled()
    })
  })

  describe('invoice.payment_failed', () => {
    const mockInvoice = {
      customer: 'cus_123',
    }

    beforeEach(() => {
      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        type: 'invoice.payment_failed',
        data: { object: mockInvoice },
      } as any)
    })

    it('should skip when subscription not found', async () => {
      vi.mocked(db.query.subscriptions.findFirst).mockResolvedValue(null)

      const response = await POST(createRequest('{}', 'valid_signature'))
      expect(response.status).toBe(200)
      expect(db.update).not.toHaveBeenCalled()
    })

    it('should mark subscription as past_due on payment failure', async () => {
      vi.mocked(db.query.subscriptions.findFirst).mockResolvedValue({
        id: 'sub-db-123',
        stripeCustomerId: 'cus_123',
      })

      const mockSet = vi.fn(() => ({ where: vi.fn() }))
      vi.mocked(db.update).mockImplementation(() => ({ set: mockSet } as any))

      const response = await POST(createRequest('{}', 'valid_signature'))
      expect(response.status).toBe(200)

      expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
        status: 'past_due',
      }))
    })
  })

  describe('Unhandled Events', () => {
    it('should return success for unhandled event types', async () => {
      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        type: 'some.other.event',
        data: { object: {} },
      } as any)

      const response = await POST(createRequest('{}', 'valid_signature'))
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.received).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should return 500 when handler throws', async () => {
      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        type: 'checkout.session.completed',
        data: { object: { metadata: { userId: 'user-123' }, subscription: 'sub_123', customer: 'cus_123' } },
      } as any)

      vi.mocked(db.query.subscriptions.findFirst).mockRejectedValue(new Error('Database error'))

      const response = await POST(createRequest('{}', 'valid_signature'))
      expect(response.status).toBe(500)

      const data = await response.json()
      expect(data.error).toBe('Webhook handler failed')
    })
  })
})
