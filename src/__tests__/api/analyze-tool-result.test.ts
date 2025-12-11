import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies before importing route
vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
}))

vi.mock('@/lib/claude/sessions', () => ({
  sessionStore: {
    create: vi.fn(),
    get: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

import { POST } from '@/app/api/analyze/tool-result/route'
import { getSession } from '@/lib/auth/session'
import { sessionStore } from '@/lib/claude/sessions'
import type { Session } from '@/lib/claude/types'

describe('POST /api/analyze/tool-result', () => {
  const createRequest = (body: Record<string, unknown>) => {
    return new Request('http://localhost/api/analyze/tool-result', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  const createValidSession = (overrides: Partial<Session> = {}): Session => ({
    id: 'session-123',
    model: 'low',
    query: 'test query',
    schema: [{
      tableName: 'sales',
      columns: ['id', 'amount'],
      sampleRows: [{ id: 1, amount: 100 }],
      rowCount: 1000,
    }],
    messages: [],
    queryResults: {},
    stepIndex: 0,
    iteration: 0,
    pendingToolId: 'tool-abc',
    awaitingToolResult: true,
    useThinking: true,
    createdAt: Date.now(),
    lastActivity: Date.now(),
    ...overrides,
  })

  beforeEach(() => {
    vi.clearAllMocks()

    // Default mocks for authenticated user
    vi.mocked(getSession).mockResolvedValue({
      isLoggedIn: true,
      userId: 'user-123',
    } as any)

    // Default mock for session store
    vi.mocked(sessionStore.get).mockResolvedValue(createValidSession())
    vi.mocked(sessionStore.update).mockResolvedValue(undefined)
  })

  describe('Authentication', () => {
    it('should return 401 when not logged in', async () => {
      vi.mocked(getSession).mockResolvedValue({
        isLoggedIn: false,
        userId: undefined,
      } as any)

      const response = await POST(
        createRequest({
          sessionId: 'session-123',
          toolId: 'tool-abc',
          result: [{ id: 1 }],
        })
      )

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 401 when userId is missing', async () => {
      vi.mocked(getSession).mockResolvedValue({
        isLoggedIn: true,
        userId: undefined,
      } as any)

      const response = await POST(
        createRequest({
          sessionId: 'session-123',
          toolId: 'tool-abc',
          result: [{ id: 1 }],
        })
      )

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 401 when isLoggedIn is false even with userId', async () => {
      vi.mocked(getSession).mockResolvedValue({
        isLoggedIn: false,
        userId: 'user-123',
      } as any)

      const response = await POST(
        createRequest({
          sessionId: 'session-123',
          toolId: 'tool-abc',
          result: [{ id: 1 }],
        })
      )

      expect(response.status).toBe(401)
    })
  })

  describe('Request Validation', () => {
    it('should return 400 when sessionId is missing', async () => {
      const response = await POST(
        createRequest({
          toolId: 'tool-abc',
          result: [{ id: 1 }],
        })
      )

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Missing required fields')
      expect(data.error).toContain('sessionId')
      expect(data.error).toContain('toolId')
    })

    it('should return 400 when toolId is missing', async () => {
      const response = await POST(
        createRequest({
          sessionId: 'session-123',
          result: [{ id: 1 }],
        })
      )

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Missing required fields')
    })

    it('should return 400 when both sessionId and toolId are missing', async () => {
      const response = await POST(
        createRequest({
          result: [{ id: 1 }],
        })
      )

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Missing required fields')
    })

    it('should accept request with result as undefined (error case)', async () => {
      const response = await POST(
        createRequest({
          sessionId: 'session-123',
          toolId: 'tool-abc',
          error: 'Query execution failed',
        })
      )

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
    })

    it('should accept request with empty result array', async () => {
      const response = await POST(
        createRequest({
          sessionId: 'session-123',
          toolId: 'tool-abc',
          result: [],
        })
      )

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
    })
  })

  describe('Session State Validation', () => {
    it('should return 404 when session does not exist', async () => {
      vi.mocked(sessionStore.get).mockResolvedValue(null as any)

      const response = await POST(
        createRequest({
          sessionId: 'nonexistent-session',
          toolId: 'tool-abc',
          result: [{ id: 1 }],
        })
      )

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toContain('Session not found')
    })

    it('should return 400 when session is not awaiting tool result', async () => {
      vi.mocked(sessionStore.get).mockResolvedValue(
        createValidSession({ awaitingToolResult: false })
      )

      const response = await POST(
        createRequest({
          sessionId: 'session-123',
          toolId: 'tool-abc',
          result: [{ id: 1 }],
        })
      )

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Not waiting for this tool result')
    })

    it('should return 400 when toolId does not match pending tool', async () => {
      vi.mocked(sessionStore.get).mockResolvedValue(
        createValidSession({
          awaitingToolResult: true,
          pendingToolId: 'different-tool',
        })
      )

      const response = await POST(
        createRequest({
          sessionId: 'session-123',
          toolId: 'tool-abc',
          result: [{ id: 1 }],
        })
      )

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Not waiting for this tool result')
    })

    it('should return 400 when pendingToolId is null', async () => {
      vi.mocked(sessionStore.get).mockResolvedValue(
        createValidSession({
          awaitingToolResult: true,
          pendingToolId: null,
        })
      )

      const response = await POST(
        createRequest({
          sessionId: 'session-123',
          toolId: 'tool-abc',
          result: [{ id: 1 }],
        })
      )

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Not waiting for this tool result')
    })
  })

  describe('Tool Result Processing', () => {
    it('should store result in queryResults with correct step key', async () => {
      const testResult = [{ id: 1, amount: 100 }, { id: 2, amount: 200 }]
      const session = createValidSession({ stepIndex: 2 })
      vi.mocked(sessionStore.get).mockResolvedValue(session)

      await POST(
        createRequest({
          sessionId: 'session-123',
          toolId: 'tool-abc',
          result: testResult,
        })
      )

      expect(sessionStore.update).toHaveBeenCalledWith(
        'session-123',
        expect.objectContaining({
          queryResults: expect.objectContaining({
            step_2: testResult,
          }),
        })
      )
    })

    it('should increment stepIndex after processing', async () => {
      const session = createValidSession({ stepIndex: 3 })
      vi.mocked(sessionStore.get).mockResolvedValue(session)

      await POST(
        createRequest({
          sessionId: 'session-123',
          toolId: 'tool-abc',
          result: [{ id: 1 }],
        })
      )

      expect(sessionStore.update).toHaveBeenCalledWith(
        'session-123',
        expect.objectContaining({
          stepIndex: 4,
        })
      )
    })

    it('should clear awaitingToolResult flag', async () => {
      await POST(
        createRequest({
          sessionId: 'session-123',
          toolId: 'tool-abc',
          result: [{ id: 1 }],
        })
      )

      expect(sessionStore.update).toHaveBeenCalledWith(
        'session-123',
        expect.objectContaining({
          awaitingToolResult: false,
        })
      )
    })

    it('should clear pendingToolId', async () => {
      await POST(
        createRequest({
          sessionId: 'session-123',
          toolId: 'tool-abc',
          result: [{ id: 1 }],
        })
      )

      expect(sessionStore.update).toHaveBeenCalledWith(
        'session-123',
        expect.objectContaining({
          pendingToolId: null,
        })
      )
    })

    it('should add tool_result message to session messages', async () => {
      const session = createValidSession({ messages: [] })
      vi.mocked(sessionStore.get).mockResolvedValue(session)

      await POST(
        createRequest({
          sessionId: 'session-123',
          toolId: 'tool-abc',
          result: [{ id: 1, amount: 100 }],
        })
      )

      expect(sessionStore.update).toHaveBeenCalledWith(
        'session-123',
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.arrayContaining([
                expect.objectContaining({
                  type: 'tool_result',
                  tool_use_id: 'tool-abc',
                }),
              ]),
            }),
          ]),
        })
      )
    })

    it('should truncate result to 100 rows in message content', async () => {
      const largeResult = Array.from({ length: 150 }, (_, i) => ({ id: i, value: i * 10 }))
      const session = createValidSession({ stepIndex: 0 })
      vi.mocked(sessionStore.get).mockResolvedValue(session)

      await POST(
        createRequest({
          sessionId: 'session-123',
          toolId: 'tool-abc',
          result: largeResult,
        })
      )

      // Verify the full result is stored in queryResults
      expect(sessionStore.update).toHaveBeenCalledWith(
        'session-123',
        expect.objectContaining({
          queryResults: expect.objectContaining({
            step_0: largeResult, // Full result stored
          }),
        })
      )
    })

    it('should handle error result correctly', async () => {
      await POST(
        createRequest({
          sessionId: 'session-123',
          toolId: 'tool-abc',
          error: 'SQL syntax error',
        })
      )

      expect(sessionStore.update).toHaveBeenCalledWith(
        'session-123',
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.arrayContaining([
                expect.objectContaining({
                  type: 'tool_result',
                  tool_use_id: 'tool-abc',
                  content: expect.stringContaining('Error: SQL syntax error'),
                }),
              ]),
            }),
          ]),
        })
      )
    })

    it('should store empty array when result is undefined', async () => {
      const session = createValidSession({ stepIndex: 0 })
      vi.mocked(sessionStore.get).mockResolvedValue(session)

      await POST(
        createRequest({
          sessionId: 'session-123',
          toolId: 'tool-abc',
          error: 'Query failed',
        })
      )

      expect(sessionStore.update).toHaveBeenCalledWith(
        'session-123',
        expect.objectContaining({
          queryResults: expect.objectContaining({
            step_0: [],
          }),
        })
      )
    })

    it('should return success response', async () => {
      const response = await POST(
        createRequest({
          sessionId: 'session-123',
          toolId: 'tool-abc',
          result: [{ id: 1 }],
        })
      )

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
    })

    it('should preserve existing queryResults when adding new step', async () => {
      const session = createValidSession({
        stepIndex: 2,
        queryResults: {
          step_0: [{ existing: 'data0' }],
          step_1: [{ existing: 'data1' }],
        },
      })
      vi.mocked(sessionStore.get).mockResolvedValue(session)

      await POST(
        createRequest({
          sessionId: 'session-123',
          toolId: 'tool-abc',
          result: [{ new: 'data' }],
        })
      )

      expect(sessionStore.update).toHaveBeenCalledWith(
        'session-123',
        expect.objectContaining({
          queryResults: {
            step_0: [{ existing: 'data0' }],
            step_1: [{ existing: 'data1' }],
            step_2: [{ new: 'data' }],
          },
        })
      )
    })

    it('should preserve existing messages when adding tool result', async () => {
      const existingMessage = {
        role: 'assistant' as const,
        content: 'Previous response',
      }
      const session = createValidSession({ messages: [existingMessage] })
      vi.mocked(sessionStore.get).mockResolvedValue(session)

      await POST(
        createRequest({
          sessionId: 'session-123',
          toolId: 'tool-abc',
          result: [{ id: 1 }],
        })
      )

      expect(sessionStore.update).toHaveBeenCalledWith(
        'session-123',
        expect.objectContaining({
          messages: expect.arrayContaining([existingMessage]),
        })
      )
    })
  })

  describe('Error Handling', () => {
    it('should return 500 when sessionStore.get throws', async () => {
      vi.mocked(sessionStore.get).mockRejectedValue(new Error('Redis connection failed'))

      const response = await POST(
        createRequest({
          sessionId: 'session-123',
          toolId: 'tool-abc',
          result: [{ id: 1 }],
        })
      )

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to process tool result')
    })

    it('should return 500 when sessionStore.update throws', async () => {
      vi.mocked(sessionStore.update).mockRejectedValue(new Error('Redis write failed'))

      const response = await POST(
        createRequest({
          sessionId: 'session-123',
          toolId: 'tool-abc',
          result: [{ id: 1 }],
        })
      )

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to process tool result')
    })

    it('should return 500 when JSON parsing fails', async () => {
      const invalidRequest = new Request('http://localhost/api/analyze/tool-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      })

      const response = await POST(invalidRequest)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to process tool result')
    })

    it('should handle missing session gracefully', async () => {
      vi.mocked(sessionStore.get).mockResolvedValue(null as any)

      const response = await POST(
        createRequest({
          sessionId: 'session-123',
          toolId: 'tool-abc',
          result: [{ id: 1 }],
        })
      )

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toContain('Session not found or expired')
    })

    it('should not call update when session validation fails', async () => {
      vi.mocked(sessionStore.get).mockResolvedValue(null as any)

      await POST(
        createRequest({
          sessionId: 'session-123',
          toolId: 'tool-abc',
          result: [{ id: 1 }],
        })
      )

      expect(sessionStore.update).not.toHaveBeenCalled()
    })

    it('should not call update when auth fails', async () => {
      vi.mocked(getSession).mockResolvedValue({
        isLoggedIn: false,
        userId: undefined,
      } as any)

      await POST(
        createRequest({
          sessionId: 'session-123',
          toolId: 'tool-abc',
          result: [{ id: 1 }],
        })
      )

      expect(sessionStore.update).not.toHaveBeenCalled()
      expect(sessionStore.get).not.toHaveBeenCalled()
    })

    it('should not call update when request validation fails', async () => {
      await POST(
        createRequest({
          result: [{ id: 1 }],
        })
      )

      expect(sessionStore.update).not.toHaveBeenCalled()
    })
  })

  describe('Step Tracking', () => {
    it('should correctly track step 0', async () => {
      const session = createValidSession({ stepIndex: 0 })
      vi.mocked(sessionStore.get).mockResolvedValue(session)

      await POST(
        createRequest({
          sessionId: 'session-123',
          toolId: 'tool-abc',
          result: [{ id: 1 }],
        })
      )

      expect(sessionStore.update).toHaveBeenCalledWith(
        'session-123',
        expect.objectContaining({
          queryResults: expect.objectContaining({ step_0: [{ id: 1 }] }),
          stepIndex: 1,
        })
      )
    })

    it('should correctly track high step numbers', async () => {
      const session = createValidSession({ stepIndex: 14 })
      vi.mocked(sessionStore.get).mockResolvedValue(session)

      await POST(
        createRequest({
          sessionId: 'session-123',
          toolId: 'tool-abc',
          result: [{ id: 1 }],
        })
      )

      expect(sessionStore.update).toHaveBeenCalledWith(
        'session-123',
        expect.objectContaining({
          queryResults: expect.objectContaining({ step_14: [{ id: 1 }] }),
          stepIndex: 15,
        })
      )
    })

    it('should include step info in message content for successful result', async () => {
      const session = createValidSession({ stepIndex: 3 })
      vi.mocked(sessionStore.get).mockResolvedValue(session)

      await POST(
        createRequest({
          sessionId: 'session-123',
          toolId: 'tool-abc',
          result: [{ id: 1 }, { id: 2 }],
        })
      )

      expect(sessionStore.update).toHaveBeenCalledWith(
        'session-123',
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.arrayContaining([
                expect.objectContaining({
                  content: expect.stringContaining('Step 3 result'),
                }),
              ]),
            }),
          ]),
        })
      )
    })

    it('should include row count in message content', async () => {
      const session = createValidSession({ stepIndex: 0 })
      vi.mocked(sessionStore.get).mockResolvedValue(session)

      const result = Array.from({ length: 50 }, (_, i) => ({ id: i }))

      await POST(
        createRequest({
          sessionId: 'session-123',
          toolId: 'tool-abc',
          result,
        })
      )

      expect(sessionStore.update).toHaveBeenCalledWith(
        'session-123',
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.arrayContaining([
                expect.objectContaining({
                  content: expect.stringContaining('50 rows'),
                }),
              ]),
            }),
          ]),
        })
      )
    })

    it('should indicate truncation for large results in message', async () => {
      const session = createValidSession({ stepIndex: 0 })
      vi.mocked(sessionStore.get).mockResolvedValue(session)

      const result = Array.from({ length: 150 }, (_, i) => ({ id: i }))

      await POST(
        createRequest({
          sessionId: 'session-123',
          toolId: 'tool-abc',
          result,
        })
      )

      expect(sessionStore.update).toHaveBeenCalledWith(
        'session-123',
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.arrayContaining([
                expect.objectContaining({
                  content: expect.stringContaining('showing first 100'),
                }),
              ]),
            }),
          ]),
        })
      )
    })
  })
})
