import { describe, it, expect, beforeEach, vi } from 'vitest'

// Track constructor calls - must be defined before vi.mock
const mockState = {
  constructorCallCount: 0,
  lastConfig: null as { apiKey?: string } | null,
}

// Mock the Anthropic SDK with a factory function
vi.mock('@anthropic-ai/sdk', () => {
  // Define the mock class inside the factory
  class MockAnthropic {
    apiKey: string | undefined
    _isMockClient = true
    _instanceId: number

    constructor(config: { apiKey?: string }) {
      this.apiKey = config.apiKey
      this._instanceId = ++mockState.constructorCallCount
      mockState.lastConfig = config
    }
  }

  return {
    default: MockAnthropic,
  }
})

// Import after mock setup
import { getAnthropicClient, resetClient } from '@/lib/claude/client'

describe('claude/client', () => {
  beforeEach(() => {
    // Reset client before each test
    resetClient()
    // Reset tracking variables
    mockState.constructorCallCount = 0
    mockState.lastConfig = null
  })

  describe('getAnthropicClient', () => {
    it('should return a client instance', () => {
      const client = getAnthropicClient()
      expect(client).toBeDefined()
      expect(client).not.toBeNull()
    })

    it('should return same instance on subsequent calls (singleton)', () => {
      const client1 = getAnthropicClient()
      const client2 = getAnthropicClient()
      const client3 = getAnthropicClient()

      expect(client1).toBe(client2)
      expect(client2).toBe(client3)
    })

    it('should use ANTHROPIC_API_KEY from env', () => {
      // Set up env
      const originalKey = process.env.ANTHROPIC_API_KEY
      process.env.ANTHROPIC_API_KEY = 'test-api-key-12345'

      try {
        resetClient()
        mockState.constructorCallCount = 0
        mockState.lastConfig = null

        getAnthropicClient()

        expect(mockState.lastConfig).toEqual({
          apiKey: 'test-api-key-12345',
        })
      } finally {
        // Restore original env
        if (originalKey !== undefined) {
          process.env.ANTHROPIC_API_KEY = originalKey
        } else {
          delete process.env.ANTHROPIC_API_KEY
        }
      }
    })

    it('should create client only once even with multiple calls', () => {
      // Multiple calls
      getAnthropicClient()
      getAnthropicClient()
      getAnthropicClient()
      getAnthropicClient()
      getAnthropicClient()

      // Constructor should only be called once
      expect(mockState.constructorCallCount).toBe(1)
    })

    it('should return instance with mock properties', () => {
      const client = getAnthropicClient() as unknown as { _isMockClient: boolean }
      expect(client._isMockClient).toBe(true)
    })
  })

  describe('resetClient', () => {
    it('should reset the singleton', () => {
      const client1 = getAnthropicClient() as unknown as { _instanceId: number }
      const id1 = client1._instanceId
      resetClient()
      // Don't reset constructorCallCount so the new instance gets a different ID
      const client2 = getAnthropicClient() as unknown as { _instanceId: number }
      const id2 = client2._instanceId

      // After reset, should get a different instance
      expect(client1).not.toBe(client2)
      // Instance IDs should be different (id2 should be greater than id1)
      expect(id2).toBeGreaterThan(id1)
    })

    it('should allow new instance to be created after reset', () => {
      getAnthropicClient()
      expect(mockState.constructorCallCount).toBe(1)

      resetClient()
      getAnthropicClient()
      expect(mockState.constructorCallCount).toBe(2)
    })

    it('should be safe to call multiple times', () => {
      resetClient()
      resetClient()
      resetClient()

      // Should not throw
      const client = getAnthropicClient()
      expect(client).toBeDefined()
    })

    it('should be safe to call before any client is created', () => {
      // resetClient is already called in beforeEach, but call again
      resetClient()

      // Should not throw
      const client = getAnthropicClient()
      expect(client).toBeDefined()
    })
  })
})
