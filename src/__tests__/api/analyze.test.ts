import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies before importing route
vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
}))

vi.mock('@/lib/auth/token-usage', () => ({
  checkTokenLimit: vi.fn(),
  recordTokenUsage: vi.fn(),
  createTokenHeaders: vi.fn(() => ({
    'X-Token-Limit': '150000',
    'X-Tokens-Used': '50000',
    'X-Tokens-Remaining': '100000',
    'X-Period-End': new Date().toISOString(),
  })),
}))

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 20, resetIn: 60000 }),
  createRateLimitHeaders: vi.fn(() => new Headers()),
  getClientKey: vi.fn().mockReturnValue('test-client'),
  RATE_LIMITS: { analyze: { maxRequests: 20, windowMs: 60000 } },
}))

vi.mock('@/lib/claude/client', () => ({
  getAnthropicClient: vi.fn(() => ({
    messages: {
      create: vi.fn(),
    },
  })),
}))

vi.mock('@/lib/claude/sessions', () => ({
  sessionStore: {
    create: vi.fn(),
    get: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('@/lib/claude/prompt', () => ({
  buildSystemPrompt: vi.fn().mockReturnValue('System prompt'),
  buildUserMessage: vi.fn().mockReturnValue('User message'),
}))

vi.mock('@/lib/duckdb', () => ({
  sanitizeIdentifier: vi.fn((col) => col?.replace(/[^a-zA-Z0-9_]/g, '')),
}))

import { GET } from '@/app/api/analyze/route'
import { getSession } from '@/lib/auth/session'
import { checkTokenLimit } from '@/lib/auth/token-usage'
import { checkRateLimit } from '@/lib/rate-limit'
import { sessionStore } from '@/lib/claude/sessions'

describe('GET /api/analyze', () => {
  const validSchema = {
    tableName: 'sales',
    columns: ['product_id', 'product_name', 'amount', 'date'],
    sampleRows: [{ product_id: 1, product_name: 'Widget', amount: 100, date: '2025-01-01' }],
    rowCount: 1000,
  }

  const createRequest = (params: Record<string, string> = {}) => {
    const url = new URL('http://localhost/api/analyze')
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value)
    }
    return new Request(url)
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Default mocks for authenticated user
    vi.mocked(getSession).mockResolvedValue({
      isLoggedIn: true,
      userId: 'user-123',
    } as any)

    vi.mocked(checkTokenLimit).mockResolvedValue({
      allowed: true,
      tokensUsed: 50000,
      tokenLimit: 150000,
      tokensRemaining: 100000,
      periodEnd: new Date(),
    })

    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 20,
      resetIn: 60000,
    })

    vi.mocked(sessionStore.create).mockResolvedValue({
      id: 'session-123',
      model: 'low',
      query: 'test query',
      schema: [validSchema],
      messages: [],
      queryResults: {},
      stepIndex: 0,
      iteration: 0,
      pendingToolId: null,
      awaitingToolResult: false,
      useThinking: true,
      createdAt: Date.now(),
      lastActivity: Date.now(),
    })
  })

  describe('Authentication', () => {
    it('should return 401 when not logged in', async () => {
      vi.mocked(getSession).mockResolvedValue({
        isLoggedIn: false,
        userId: undefined,
      } as any)

      const response = await GET(
        createRequest({
          query: 'test query',
          schema: JSON.stringify(validSchema),
        })
      )

      expect(response.status).toBe(401)
    })

    it('should return 401 when userId is missing', async () => {
      vi.mocked(getSession).mockResolvedValue({
        isLoggedIn: true,
        userId: undefined,
      } as any)

      const response = await GET(
        createRequest({
          query: 'test query',
          schema: JSON.stringify(validSchema),
        })
      )

      expect(response.status).toBe(401)
    })
  })

  describe('Token Limits', () => {
    it('should return 429 when token limit exceeded', async () => {
      vi.mocked(checkTokenLimit).mockResolvedValue({
        allowed: false,
        tokensUsed: 150000,
        tokenLimit: 150000,
        tokensRemaining: 0,
        periodEnd: new Date(),
      })

      const response = await GET(
        createRequest({
          query: 'test query',
          schema: JSON.stringify(validSchema),
        })
      )

      expect(response.status).toBe(429)

      const data = await response.json()
      expect(data.error).toContain('Token limit exceeded')
      expect(data.tokensUsed).toBe(150000)
      expect(data.tokenLimit).toBe(150000)
    })

    it('should include token headers in response', async () => {
      vi.mocked(checkTokenLimit).mockResolvedValue({
        allowed: false,
        tokensUsed: 150000,
        tokenLimit: 150000,
        tokensRemaining: 0,
        periodEnd: new Date(),
      })

      const response = await GET(
        createRequest({
          query: 'test query',
          schema: JSON.stringify(validSchema),
        })
      )

      expect(response.headers.get('X-Token-Limit')).toBe('150000')
    })
  })

  describe('Rate Limiting', () => {
    it('should return 429 when rate limit exceeded', async () => {
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetIn: 30000,
      })

      const response = await GET(
        createRequest({
          query: 'test query',
          schema: JSON.stringify(validSchema),
        })
      )

      expect(response.status).toBe(429)

      const data = await response.json()
      expect(data.error).toContain('Too many requests')
    })
  })

  describe('Request Validation', () => {
    it('should return 400 when query is missing', async () => {
      const response = await GET(
        createRequest({
          schema: JSON.stringify(validSchema),
        })
      )

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toContain('Missing required parameters')
    })

    it('should return 400 when schema is missing', async () => {
      const response = await GET(
        createRequest({
          query: 'test query',
        })
      )

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toContain('Missing required parameters')
    })

    it('should return 400 for invalid JSON schema', async () => {
      const response = await GET(
        createRequest({
          query: 'test query',
          schema: 'not valid json',
        })
      )

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toContain('Invalid schema parameter')
    })
  })

  describe('Schema Size Limits', () => {
    it('should return 400 when too many tables', async () => {
      const manyTables = Array.from({ length: 11 }, (_, i) => ({
        tableName: `table_${i}`,
        columns: ['col1'],
        sampleRows: [],
        rowCount: 100,
      }))

      const response = await GET(
        createRequest({
          query: 'test query',
          schema: JSON.stringify(manyTables),
        })
      )

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toContain('Too many tables')
    })

    it('should return 400 when table has too many columns', async () => {
      const manyColumns = Array.from({ length: 101 }, (_, i) => `col_${i}`)

      const response = await GET(
        createRequest({
          query: 'test query',
          schema: JSON.stringify({
            tableName: 'test',
            columns: manyColumns,
            sampleRows: [],
            rowCount: 100,
          }),
        })
      )

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toContain('too many columns')
    })

    it('should truncate sample rows instead of rejecting', async () => {
      const manyRows = Array.from({ length: 25 }, (_, i) => ({ id: i }))

      // This should succeed (rows are truncated, not rejected)
      const response = await GET(
        createRequest({
          query: 'test query',
          schema: JSON.stringify({
            tableName: 'test',
            columns: ['id'],
            sampleRows: manyRows,
            rowCount: 100,
          }),
        })
      )

      // Should not be a 400 for sample rows
      expect(response.status).not.toBe(400)
    })

    it('should allow exactly 10 tables', async () => {
      const tenTables = Array.from({ length: 10 }, (_, i) => ({
        tableName: `table_${i}`,
        columns: ['col1'],
        sampleRows: [],
        rowCount: 100,
      }))

      const response = await GET(
        createRequest({
          query: 'test query',
          schema: JSON.stringify(tenTables),
        })
      )

      // Should not be rejected
      expect(response.status).not.toBe(400)
    })

    it('should allow exactly 100 columns', async () => {
      const hundredColumns = Array.from({ length: 100 }, (_, i) => `col_${i}`)

      const response = await GET(
        createRequest({
          query: 'test query',
          schema: JSON.stringify({
            tableName: 'test',
            columns: hundredColumns,
            sampleRows: [],
            rowCount: 100,
          }),
        })
      )

      expect(response.status).not.toBe(400)
    })
  })

  describe('Model Selection', () => {
    it('should accept valid model parameter "high"', async () => {
      // Mock pro tier to access high model
      vi.mocked(getSession).mockResolvedValue({
        isLoggedIn: true,
        userId: 'user-123',
        tier: 'pro',
      } as any)

      const response = await GET(
        createRequest({
          query: 'test query',
          schema: JSON.stringify(validSchema),
          model: 'high',
        })
      )

      expect(sessionStore.create).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ model: 'high' })
      )
    })

    it('should accept valid model parameter "low"', async () => {
      const response = await GET(
        createRequest({
          query: 'test query',
          schema: JSON.stringify(validSchema),
          model: 'low',
        })
      )

      expect(sessionStore.create).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ model: 'low' })
      )
    })

    it('should default to low model for invalid model parameter', async () => {
      const response = await GET(
        createRequest({
          query: 'test query',
          schema: JSON.stringify(validSchema),
          model: 'invalid',
        })
      )

      expect(sessionStore.create).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ model: 'low' })
      )
    })
  })

  describe('Thinking Parameter', () => {
    it('should enable thinking by default', async () => {
      const response = await GET(
        createRequest({
          query: 'test query',
          schema: JSON.stringify(validSchema),
        })
      )

      expect(sessionStore.create).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ useThinking: true })
      )
    })

    it('should disable thinking when thinking=false', async () => {
      const response = await GET(
        createRequest({
          query: 'test query',
          schema: JSON.stringify(validSchema),
          thinking: 'false',
        })
      )

      expect(sessionStore.create).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ useThinking: false })
      )
    })

    it('should enable thinking for any other thinking value', async () => {
      const response = await GET(
        createRequest({
          query: 'test query',
          schema: JSON.stringify(validSchema),
          thinking: 'true',
        })
      )

      expect(sessionStore.create).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ useThinking: true })
      )
    })
  })

  describe('Session Creation', () => {
    it('should create session with correct parameters', async () => {
      // Mock pro tier to access high model
      vi.mocked(getSession).mockResolvedValue({
        isLoggedIn: true,
        userId: 'user-123',
        tier: 'pro',
      } as any)

      const response = await GET(
        createRequest({
          query: 'Show me top products',
          schema: JSON.stringify(validSchema),
          model: 'high',
        })
      )

      expect(sessionStore.create).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          model: 'high',
          query: 'Show me top products',
          schema: [validSchema],
        })
      )
    })

    it('should update session after initialization', async () => {
      const response = await GET(
        createRequest({
          query: 'test query',
          schema: JSON.stringify(validSchema),
        })
      )

      expect(sessionStore.update).toHaveBeenCalled()
    })
  })

  describe('SSE Response', () => {
    it('should return SSE content type', async () => {
      const response = await GET(
        createRequest({
          query: 'test query',
          schema: JSON.stringify(validSchema),
        })
      )

      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
    })

    it('should return no-cache header', async () => {
      const response = await GET(
        createRequest({
          query: 'test query',
          schema: JSON.stringify(validSchema),
        })
      )

      expect(response.headers.get('Cache-Control')).toBe('no-cache')
    })

    it('should return keep-alive connection', async () => {
      const response = await GET(
        createRequest({
          query: 'test query',
          schema: JSON.stringify(validSchema),
        })
      )

      expect(response.headers.get('Connection')).toBe('keep-alive')
    })
  })

  describe('Multi-Table Schema', () => {
    it('should accept array of tables', async () => {
      const multiSchema = [
        {
          tableName: 'customers',
          columns: ['id', 'name'],
          sampleRows: [{ id: 1, name: 'Alice' }],
          rowCount: 100,
        },
        {
          tableName: 'orders',
          columns: ['id', 'customer_id', 'amount'],
          sampleRows: [{ id: 1, customer_id: 1, amount: 50 }],
          rowCount: 500,
        },
      ]

      const response = await GET(
        createRequest({
          query: 'Join customers and orders',
          schema: JSON.stringify(multiSchema),
        })
      )

      expect(sessionStore.create).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          schema: multiSchema,
        })
      )
    })

    it('should normalize single table to array', async () => {
      const response = await GET(
        createRequest({
          query: 'test query',
          schema: JSON.stringify(validSchema),
        })
      )

      expect(sessionStore.create).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          schema: [validSchema],
        })
      )
    })
  })

  describe('Error Handling', () => {
    it('should return 500 on session creation error', async () => {
      vi.mocked(sessionStore.create).mockRejectedValue(new Error('Redis error'))

      const response = await GET(
        createRequest({
          query: 'test query',
          schema: JSON.stringify(validSchema),
        })
      )

      expect(response.status).toBe(500)
    })

    it('should return generic error message on server error', async () => {
      vi.mocked(sessionStore.create).mockRejectedValue(new Error('Internal error'))

      const response = await GET(
        createRequest({
          query: 'test query',
          schema: JSON.stringify(validSchema),
        })
      )

      const data = await response.json()
      expect(data.error).toBe('Analysis failed. Please try again.')
    })
  })
})
