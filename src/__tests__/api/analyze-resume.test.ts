import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import type { Session } from '@/lib/claude/types'

// Mock dependencies before importing route
vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
}))

vi.mock('@/lib/auth/token-usage', () => ({
  recordTokenUsage: vi.fn(),
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
    get: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('@/lib/claude/prompt', () => ({
  buildSystemPrompt: vi.fn().mockReturnValue('System prompt'),
}))

vi.mock('@/lib/duckdb', () => ({
  sanitizeIdentifier: vi.fn((col: string | undefined) => col?.replace(/[^a-zA-Z0-9_]/g, '') || ''),
}))

import { GET } from '@/app/api/analyze/resume/route'
import { getSession } from '@/lib/auth/session'
import { recordTokenUsage } from '@/lib/auth/token-usage'
import { getAnthropicClient } from '@/lib/claude/client'
import { sessionStore } from '@/lib/claude/sessions'

// Helper to read SSE stream content
async function readSSEStream(response: Response): Promise<string[]> {
  const reader = response.body?.getReader()
  if (!reader) return []

  const events: string[] = []
  const decoder = new TextDecoder()

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value, { stream: true })
      events.push(chunk)
    }
  } finally {
    reader.releaseLock()
  }

  return events
}

// Helper to parse SSE events from raw data
function parseSSEEvents(rawEvents: string[]): Array<{ type: string; [key: string]: unknown }> {
  const parsed: Array<{ type: string; [key: string]: unknown }> = []
  for (const raw of rawEvents) {
    const lines = raw.split('\n')
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          parsed.push(JSON.parse(line.slice(6)))
        } catch {
          // Ignore parse errors
        }
      }
    }
  }
  return parsed
}

describe('GET /api/analyze/resume', () => {
  const validSchema = {
    tableName: 'sales',
    columns: ['product_id', 'product_name', 'amount', 'date'],
    sampleRows: [{ product_id: 1, product_name: 'Widget', amount: 100, date: '2025-01-01' }],
    rowCount: 1000,
  }

  const validSession: Session = {
    id: 'session-123',
    model: 'low',
    query: 'test query',
    schema: [validSchema],
    messages: [{ role: 'user' as const, content: 'test query' }],
    queryResults: {},
    stepIndex: 0,
    iteration: 0,
    pendingToolId: null,
    awaitingToolResult: false,
    useThinking: true,
    createdAt: Date.now(),
    lastActivity: Date.now(),
  }

  const createRequest = (params: Record<string, string> = {}) => {
    const url = new URL('http://localhost/api/analyze/resume')
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value)
    }
    return new Request(url)
  }

  let mockClient: { messages: { create: Mock } }

  beforeEach(() => {
    vi.clearAllMocks()

    // Default mocks for authenticated user
    vi.mocked(getSession).mockResolvedValue({
      isLoggedIn: true,
      userId: 'user-123',
    } as never)

    // Default mock client
    mockClient = {
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [
            {
              type: 'tool_use',
              id: 'tool-1',
              name: 'final_answer',
              input: {
                answer: 'Test answer',
                chartType: 'bar',
                xAxis: 'product_name',
                yAxis: 'amount',
              },
            },
          ],
          stop_reason: 'tool_use',
          usage: { input_tokens: 100, output_tokens: 50 },
        }),
      },
    }
    vi.mocked(getAnthropicClient).mockReturnValue(mockClient as never)

    vi.mocked(sessionStore.get).mockResolvedValue({ ...validSession } as Session)
    vi.mocked(sessionStore.update).mockResolvedValue(undefined)
    vi.mocked(sessionStore.delete).mockResolvedValue(true)
    vi.mocked(recordTokenUsage).mockResolvedValue(undefined as never)
  })

  describe('Authentication', () => {
    it('should return 401 when not logged in', async () => {
      vi.mocked(getSession).mockResolvedValue({
        isLoggedIn: false,
        userId: undefined,
      } as never)

      const response = await GET(createRequest({ sessionId: 'session-123' }))

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 401 when userId is missing', async () => {
      vi.mocked(getSession).mockResolvedValue({
        isLoggedIn: true,
        userId: undefined,
      } as never)

      const response = await GET(createRequest({ sessionId: 'session-123' }))

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('Request Validation', () => {
    it('should return 400 when sessionId is missing', async () => {
      const response = await GET(createRequest({}))

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Missing sessionId')
    })

    it('should return 404 when session not found', async () => {
      vi.mocked(sessionStore.get).mockResolvedValue(undefined)

      const response = await GET(createRequest({ sessionId: 'nonexistent' }))

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('Session not found or expired')
    })
  })

  describe('SSE Response', () => {
    it('should return correct Content-Type header (text/event-stream)', async () => {
      const response = await GET(createRequest({ sessionId: 'session-123' }))

      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
    })

    it('should return correct Cache-Control header (no-cache)', async () => {
      const response = await GET(createRequest({ sessionId: 'session-123' }))

      expect(response.headers.get('Cache-Control')).toBe('no-cache')
    })

    it('should return correct Connection header (keep-alive)', async () => {
      const response = await GET(createRequest({ sessionId: 'session-123' }))

      expect(response.headers.get('Connection')).toBe('keep-alive')
    })
  })

  describe('Session State', () => {
    it('should handle session at max iterations (return error)', async () => {
      vi.mocked(sessionStore.get).mockResolvedValue({
        ...validSession,
        iteration: 15, // AGENT_CONFIG.maxIterations = 15
      } as Session)

      const response = await GET(createRequest({ sessionId: 'session-123' }))
      const rawEvents = await readSSEStream(response)
      const events = parseSSEEvents(rawEvents)

      expect(events).toContainEqual({ type: 'error', message: 'Maximum analysis iterations reached' })
      expect(events).toContainEqual({ type: 'done' })
      expect(sessionStore.delete).toHaveBeenCalledWith('session-123')
    })

    it('should send error when session not found during agent loop', async () => {
      // First call returns session (for initial check), second call returns undefined (during loop)
      vi.mocked(sessionStore.get)
        .mockResolvedValueOnce({ ...validSession } as Session)
        .mockResolvedValueOnce(undefined)

      const response = await GET(createRequest({ sessionId: 'session-123' }))
      const rawEvents = await readSSEStream(response)
      const events = parseSSEEvents(rawEvents)

      expect(events).toContainEqual({ type: 'error', message: 'Session not found or expired' })
      expect(events).toContainEqual({ type: 'done' })
    })
  })

  describe('Agent Loop - Thinking Blocks', () => {
    it('should process thinking blocks (send thinking event)', async () => {
      mockClient.messages.create.mockResolvedValue({
        content: [
          { type: 'text', text: 'Let me analyze this data...' },
          {
            type: 'tool_use',
            id: 'tool-1',
            name: 'final_answer',
            input: { answer: 'Test', chartType: 'table' },
          },
        ],
        stop_reason: 'tool_use',
        usage: { input_tokens: 100, output_tokens: 50 },
      })

      const response = await GET(createRequest({ sessionId: 'session-123' }))
      const rawEvents = await readSSEStream(response)
      const events = parseSSEEvents(rawEvents)

      expect(events).toContainEqual({ type: 'thinking', content: 'Let me analyze this data...' })
    })

    it('should process extended thinking blocks', async () => {
      mockClient.messages.create.mockResolvedValue({
        content: [
          { type: 'thinking', thinking: 'I need to consider the data structure...' },
          {
            type: 'tool_use',
            id: 'tool-1',
            name: 'final_answer',
            input: { answer: 'Test', chartType: 'table' },
          },
        ],
        stop_reason: 'tool_use',
        usage: { input_tokens: 100, output_tokens: 50 },
      })

      const response = await GET(createRequest({ sessionId: 'session-123' }))
      const rawEvents = await readSSEStream(response)
      const events = parseSSEEvents(rawEvents)

      expect(events).toContainEqual({
        type: 'extended_thinking',
        content: 'I need to consider the data structure...',
      })
    })
  })

  describe('Agent Loop - Tool Handling', () => {
    it('should handle final_answer tool (send answer event, then done)', async () => {
      vi.mocked(sessionStore.get).mockResolvedValue({
        ...validSession,
        queryResults: { step_0: [{ product_name: 'A', amount: 100 }] },
      } as Session)

      mockClient.messages.create.mockResolvedValue({
        content: [
          {
            type: 'tool_use',
            id: 'tool-1',
            name: 'final_answer',
            input: {
              answer: 'The top product is A with 100 units.',
              chartType: 'bar',
              xAxis: 'product_name',
              yAxis: 'amount',
            },
          },
        ],
        stop_reason: 'tool_use',
        usage: { input_tokens: 100, output_tokens: 50 },
      })

      const response = await GET(createRequest({ sessionId: 'session-123' }))
      const rawEvents = await readSSEStream(response)
      const events = parseSSEEvents(rawEvents)

      const answerEvent = events.find((e) => e.type === 'answer')
      expect(answerEvent).toBeDefined()
      expect(answerEvent?.result).toMatchObject({
        answer: 'The top product is A with 100 units.',
        chartType: 'bar',
        xAxis: 'product_name',
        yAxis: 'amount',
      })

      expect(events).toContainEqual({ type: 'done' })
      expect(sessionStore.delete).toHaveBeenCalledWith('session-123')
    })

    it('should handle browser-executed tools like run_query (send tool_call event)', async () => {
      mockClient.messages.create.mockResolvedValue({
        content: [
          {
            type: 'tool_use',
            id: 'tool-query-1',
            name: 'run_query',
            input: {
              thought: 'I need to get the top products',
              sql: 'SELECT * FROM sales LIMIT 10',
            },
          },
        ],
        stop_reason: 'tool_use',
        usage: { input_tokens: 100, output_tokens: 50 },
      })

      const response = await GET(createRequest({ sessionId: 'session-123' }))
      const rawEvents = await readSSEStream(response)
      const events = parseSSEEvents(rawEvents)

      const toolCallEvent = events.find((e) => e.type === 'tool_call')
      expect(toolCallEvent).toBeDefined()
      expect(toolCallEvent).toMatchObject({
        type: 'tool_call',
        id: 'tool-query-1',
        name: 'run_query',
        input: {
          thought: 'I need to get the top products',
          sql: 'SELECT * FROM sales LIMIT 10',
        },
      })

      expect(sessionStore.update).toHaveBeenCalled()
    })

    it('should handle get_column_stats tool (transform to SQL)', async () => {
      mockClient.messages.create.mockResolvedValue({
        content: [
          {
            type: 'tool_use',
            id: 'tool-stats-1',
            name: 'get_column_stats',
            input: {
              thought: 'I need statistics on the amount column',
              column: 'amount',
            },
          },
        ],
        stop_reason: 'tool_use',
        usage: { input_tokens: 100, output_tokens: 50 },
      })

      const response = await GET(createRequest({ sessionId: 'session-123' }))
      const rawEvents = await readSSEStream(response)
      const events = parseSSEEvents(rawEvents)

      const toolCallEvent = events.find((e) => e.type === 'tool_call')
      expect(toolCallEvent).toBeDefined()
      expect(toolCallEvent?.name).toBe('get_column_stats')
      expect(toolCallEvent?.input).toMatchObject({
        thought: 'I need statistics on the amount column',
        _originalTool: 'get_column_stats',
      })
      // Check that SQL was generated
      expect((toolCallEvent?.input as Record<string, unknown>).sql).toContain('MIN("amount")')
      expect((toolCallEvent?.input as Record<string, unknown>).sql).toContain('MAX("amount")')
      expect((toolCallEvent?.input as Record<string, unknown>).sql).toContain('AVG(')
    })

    it('should handle get_value_distribution tool (transform to SQL)', async () => {
      mockClient.messages.create.mockResolvedValue({
        content: [
          {
            type: 'tool_use',
            id: 'tool-dist-1',
            name: 'get_value_distribution',
            input: {
              thought: 'I need to see distribution of product names',
              column: 'product_name',
              limit: 5,
            },
          },
        ],
        stop_reason: 'tool_use',
        usage: { input_tokens: 100, output_tokens: 50 },
      })

      const response = await GET(createRequest({ sessionId: 'session-123' }))
      const rawEvents = await readSSEStream(response)
      const events = parseSSEEvents(rawEvents)

      const toolCallEvent = events.find((e) => e.type === 'tool_call')
      expect(toolCallEvent).toBeDefined()
      expect(toolCallEvent?.name).toBe('get_value_distribution')
      expect(toolCallEvent?.input).toMatchObject({
        thought: 'I need to see distribution of product names',
        _originalTool: 'get_value_distribution',
      })
      // Check that SQL was generated with correct limit
      const sql = (toolCallEvent?.input as Record<string, unknown>).sql as string
      expect(sql).toContain('GROUP BY "product_name"')
      expect(sql).toContain('LIMIT 5')
    })

    it('should handle invalid column name in get_column_stats', async () => {
      // Mock sanitizeIdentifier to return empty string for invalid column
      const { sanitizeIdentifier } = await import('@/lib/duckdb')
      vi.mocked(sanitizeIdentifier).mockReturnValueOnce('')

      mockClient.messages.create.mockResolvedValue({
        content: [
          {
            type: 'tool_use',
            id: 'tool-stats-1',
            name: 'get_column_stats',
            input: {
              thought: 'Check stats',
              column: '; DROP TABLE users; --',
            },
          },
        ],
        stop_reason: 'tool_use',
        usage: { input_tokens: 100, output_tokens: 50 },
      })

      const response = await GET(createRequest({ sessionId: 'session-123' }))
      const rawEvents = await readSSEStream(response)
      const events = parseSSEEvents(rawEvents)

      expect(events).toContainEqual({ type: 'error', message: 'Invalid column name' })
      expect(events).toContainEqual({ type: 'done' })
    })

    it('should handle invalid column name in get_value_distribution', async () => {
      // Mock sanitizeIdentifier to return empty string for invalid column
      const { sanitizeIdentifier } = await import('@/lib/duckdb')
      vi.mocked(sanitizeIdentifier).mockReturnValueOnce('')

      mockClient.messages.create.mockResolvedValue({
        content: [
          {
            type: 'tool_use',
            id: 'tool-dist-1',
            name: 'get_value_distribution',
            input: {
              thought: 'Check distribution',
              column: '',
            },
          },
        ],
        stop_reason: 'tool_use',
        usage: { input_tokens: 100, output_tokens: 50 },
      })

      const response = await GET(createRequest({ sessionId: 'session-123' }))
      const rawEvents = await readSSEStream(response)
      const events = parseSSEEvents(rawEvents)

      expect(events).toContainEqual({ type: 'error', message: 'Invalid column name' })
      expect(events).toContainEqual({ type: 'done' })
    })

    it('should handle end_turn without tool use (text response)', async () => {
      mockClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Based on the data, the answer is 42.' }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 100, output_tokens: 50 },
      })

      const response = await GET(createRequest({ sessionId: 'session-123' }))
      const rawEvents = await readSSEStream(response)
      const events = parseSSEEvents(rawEvents)

      const answerEvent = events.find((e) => e.type === 'answer')
      expect(answerEvent).toBeDefined()
      expect(answerEvent?.result).toMatchObject({
        answer: 'Based on the data, the answer is 42.',
        chartType: 'table',
        chartData: [],
      })
      expect(events).toContainEqual({ type: 'done' })
      expect(sessionStore.delete).toHaveBeenCalledWith('session-123')
    })

    it('should handle end_turn without text block', async () => {
      mockClient.messages.create.mockResolvedValue({
        content: [],
        stop_reason: 'end_turn',
        usage: { input_tokens: 100, output_tokens: 50 },
      })

      const response = await GET(createRequest({ sessionId: 'session-123' }))
      const rawEvents = await readSSEStream(response)
      const events = parseSSEEvents(rawEvents)

      expect(events).toContainEqual({
        type: 'error',
        message: 'Analysis completed without a clear answer',
      })
      expect(events).toContainEqual({ type: 'done' })
    })
  })

  describe('Token Usage', () => {
    it('should record token usage with model multiplier', async () => {
      mockClient.messages.create.mockResolvedValue({
        content: [
          {
            type: 'tool_use',
            id: 'tool-1',
            name: 'final_answer',
            input: { answer: 'Test', chartType: 'table' },
          },
        ],
        stop_reason: 'tool_use',
        usage: { input_tokens: 100, output_tokens: 50 },
      })

      await GET(createRequest({ sessionId: 'session-123' }))

      // Wait for the stream to complete
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(recordTokenUsage).toHaveBeenCalledWith(
        'user-123',
        expect.any(Number), // weighted tokens
        '/api/analyze/resume',
        expect.any(String) // model ID
      )
    })

    it('should not record token usage when total is 0', async () => {
      mockClient.messages.create.mockResolvedValue({
        content: [
          {
            type: 'tool_use',
            id: 'tool-1',
            name: 'final_answer',
            input: { answer: 'Test', chartType: 'table' },
          },
        ],
        stop_reason: 'tool_use',
        usage: { input_tokens: 0, output_tokens: 0 },
      })

      const response = await GET(createRequest({ sessionId: 'session-123' }))
      await readSSEStream(response)

      expect(recordTokenUsage).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle Claude API errors gracefully', async () => {
      mockClient.messages.create.mockRejectedValue(new Error('Claude API rate limited'))

      const response = await GET(createRequest({ sessionId: 'session-123' }))
      const rawEvents = await readSSEStream(response)
      const events = parseSSEEvents(rawEvents)

      expect(events).toContainEqual({ type: 'error', message: 'Claude API rate limited' })
      expect(events).toContainEqual({ type: 'done' })
    })

    it('should clean up session on error (call sessionStore.delete)', async () => {
      mockClient.messages.create.mockRejectedValue(new Error('API Error'))

      const response = await GET(createRequest({ sessionId: 'session-123' }))
      await readSSEStream(response)

      expect(sessionStore.delete).toHaveBeenCalledWith('session-123')
    })

    it('should handle non-Error thrown objects', async () => {
      mockClient.messages.create.mockRejectedValue('string error')

      const response = await GET(createRequest({ sessionId: 'session-123' }))
      const rawEvents = await readSSEStream(response)
      const events = parseSSEEvents(rawEvents)

      expect(events).toContainEqual({ type: 'error', message: 'Analysis failed' })
    })

    it('should return 500 on unexpected errors in GET handler', async () => {
      // Force an error before the stream starts
      vi.mocked(getSession).mockRejectedValue(new Error('Database error'))

      const response = await GET(createRequest({ sessionId: 'session-123' }))

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to resume analysis')
    })
  })

  describe('Model Support', () => {
    it('should use thinking config for models that support thinking', async () => {
      vi.mocked(sessionStore.get).mockResolvedValue({
        ...validSession,
        model: 'high',
        useThinking: true,
      } as Session)

      mockClient.messages.create.mockResolvedValue({
        content: [
          {
            type: 'tool_use',
            id: 'tool-1',
            name: 'final_answer',
            input: { answer: 'Test', chartType: 'table' },
          },
        ],
        stop_reason: 'tool_use',
        usage: { input_tokens: 100, output_tokens: 50 },
      })

      await GET(createRequest({ sessionId: 'session-123' }))

      expect(mockClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          thinking: expect.objectContaining({
            type: 'enabled',
            budget_tokens: expect.any(Number),
          }),
        })
      )
    })

    it('should not use thinking when disabled in session', async () => {
      vi.mocked(sessionStore.get).mockResolvedValue({
        ...validSession,
        model: 'high',
        useThinking: false,
      } as Session)

      mockClient.messages.create.mockResolvedValue({
        content: [
          {
            type: 'tool_use',
            id: 'tool-1',
            name: 'final_answer',
            input: { answer: 'Test', chartType: 'table' },
          },
        ],
        stop_reason: 'tool_use',
        usage: { input_tokens: 100, output_tokens: 50 },
      })

      await GET(createRequest({ sessionId: 'session-123' }))

      expect(mockClient.messages.create).toHaveBeenCalledWith(
        expect.not.objectContaining({
          thinking: expect.anything(),
        })
      )
    })
  })

  describe('Session State Updates', () => {
    it('should update session with pending tool info on browser-executed tools', async () => {
      mockClient.messages.create.mockResolvedValue({
        content: [
          {
            type: 'tool_use',
            id: 'tool-query-123',
            name: 'run_query',
            input: { thought: 'Query', sql: 'SELECT 1' },
          },
        ],
        stop_reason: 'tool_use',
        usage: { input_tokens: 100, output_tokens: 50 },
      })

      const response = await GET(createRequest({ sessionId: 'session-123' }))
      // Must read the stream to completion for session update to happen
      await readSSEStream(response)

      expect(sessionStore.update).toHaveBeenCalledWith(
        'session-123',
        expect.objectContaining({
          pendingToolId: 'tool-query-123',
          awaitingToolResult: true,
        })
      )
    })

    it('should include response content in session messages', async () => {
      const responseContent = [
        {
          type: 'tool_use',
          id: 'tool-query-123',
          name: 'run_query',
          input: { thought: 'Query', sql: 'SELECT 1' },
        },
      ]

      mockClient.messages.create.mockResolvedValue({
        content: responseContent,
        stop_reason: 'tool_use',
        usage: { input_tokens: 100, output_tokens: 50 },
      })

      const response = await GET(createRequest({ sessionId: 'session-123' }))
      // Must read the stream to completion for session update to happen
      await readSSEStream(response)

      expect(sessionStore.update).toHaveBeenCalledWith(
        'session-123',
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'assistant',
              content: responseContent,
            }),
          ]),
        })
      )
    })
  })

  describe('Chart Data in Final Answer', () => {
    it('should include chart data from last query result', async () => {
      const queryResults = {
        step_0: [{ product: 'A', count: 10 }],
        step_1: [{ product: 'B', count: 20 }],
      }

      vi.mocked(sessionStore.get).mockResolvedValue({
        ...validSession,
        queryResults,
      } as Session)

      mockClient.messages.create.mockResolvedValue({
        content: [
          {
            type: 'tool_use',
            id: 'tool-1',
            name: 'final_answer',
            input: {
              answer: 'Product B is top',
              chartType: 'bar',
              xAxis: 'product',
              yAxis: 'count',
            },
          },
        ],
        stop_reason: 'tool_use',
        usage: { input_tokens: 100, output_tokens: 50 },
      })

      const response = await GET(createRequest({ sessionId: 'session-123' }))
      const rawEvents = await readSSEStream(response)
      const events = parseSSEEvents(rawEvents)

      const answerEvent = events.find((e) => e.type === 'answer')
      expect(answerEvent?.result).toMatchObject({
        chartData: [{ product: 'B', count: 20 }],
      })
    })

    it('should handle empty query results', async () => {
      vi.mocked(sessionStore.get).mockResolvedValue({
        ...validSession,
        queryResults: {},
      } as Session)

      mockClient.messages.create.mockResolvedValue({
        content: [
          {
            type: 'tool_use',
            id: 'tool-1',
            name: 'final_answer',
            input: { answer: 'No data found', chartType: 'table' },
          },
        ],
        stop_reason: 'tool_use',
        usage: { input_tokens: 100, output_tokens: 50 },
      })

      const response = await GET(createRequest({ sessionId: 'session-123' }))
      const rawEvents = await readSSEStream(response)
      const events = parseSSEEvents(rawEvents)

      const answerEvent = events.find((e) => e.type === 'answer')
      expect(answerEvent?.result).toMatchObject({
        chartData: [],
      })
    })
  })
})
