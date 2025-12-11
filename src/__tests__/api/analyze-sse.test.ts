// src/__tests__/api/analyze-sse.test.ts
// Tests for SSE stream format and event types for /api/analyze and /api/analyze/resume

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SSEEvent, AnalysisResult, Session } from '@/lib/claude/types'
import {
  collectSSEEvents,
  createMockSSEStream,
  createMockSSEResponse,
  createDelayedMockSSEStream,
  validateSSEHeaders,
  validateEventLifecycle,
  formatSSEEvent,
} from '../utils/sse-parser'

// Mock dependencies before importing routes
vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
}))

vi.mock('@/lib/auth/token-usage', () => ({
  checkTokenLimit: vi.fn(),
  recordTokenUsage: vi.fn().mockResolvedValue(undefined),
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

import { GET as analyzeGET } from '@/app/api/analyze/route'
import { GET as resumeGET } from '@/app/api/analyze/resume/route'
import { getSession } from '@/lib/auth/session'
import { checkTokenLimit } from '@/lib/auth/token-usage'
import { checkRateLimit } from '@/lib/rate-limit'
import { sessionStore } from '@/lib/claude/sessions'
import { getAnthropicClient } from '@/lib/claude/client'

describe('SSE Parser Utilities', () => {
  describe('collectSSEEvents', () => {
    it('should parse a stream with multiple events', async () => {
      const events: SSEEvent[] = [
        { type: 'session', sessionId: 'test-session' },
        { type: 'thinking', content: 'Analyzing data...' },
        { type: 'done' },
      ]

      const response = createMockSSEResponse(events)
      const collected = await collectSSEEvents(response)

      expect(collected).toHaveLength(3)
      expect(collected[0]).toEqual({ type: 'session', sessionId: 'test-session' })
      expect(collected[1]).toEqual({ type: 'thinking', content: 'Analyzing data...' })
      expect(collected[2]).toEqual({ type: 'done' })
    })

    it('should handle empty stream', async () => {
      const response = new Response(new ReadableStream({
        start(controller) {
          controller.close()
        },
      }))

      const collected = await collectSSEEvents(response)
      expect(collected).toHaveLength(0)
    })

    it('should handle stream with no body', async () => {
      const response = new Response(null)
      const collected = await collectSSEEvents(response)
      expect(collected).toHaveLength(0)
    })

    it('should skip malformed JSON', async () => {
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: {"type":"thinking","content":"valid"}\n\n'))
          controller.enqueue(encoder.encode('data: {invalid json}\n\n'))
          controller.enqueue(encoder.encode('data: {"type":"done"}\n\n'))
          controller.close()
        },
      })

      const response = new Response(stream)
      const collected = await collectSSEEvents(response)

      expect(collected).toHaveLength(2)
      expect(collected[0].type).toBe('thinking')
      expect(collected[1].type).toBe('done')
    })
  })

  describe('createMockSSEStream', () => {
    it('should create a stream that emits events in SSE format', async () => {
      const events: SSEEvent[] = [
        { type: 'thinking', content: 'Test' },
        { type: 'done' },
      ]

      const stream = createMockSSEStream(events)
      const reader = stream.getReader()
      const decoder = new TextDecoder()

      let result = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        result += decoder.decode(value)
      }

      expect(result).toContain('data: {"type":"thinking","content":"Test"}')
      expect(result).toContain('data: {"type":"done"}')
      expect(result.match(/\n\n/g)?.length).toBe(2) // Two double newlines
    })
  })

  describe('createDelayedMockSSEStream', () => {
    it('should emit events with delays', async () => {
      const events: SSEEvent[] = [
        { type: 'thinking', content: 'First' },
        { type: 'thinking', content: 'Second' },
        { type: 'done' },
      ]

      const startTime = Date.now()
      const stream = createDelayedMockSSEStream(events, 20)
      const response = new Response(stream)
      const collected = await collectSSEEvents(response)
      const elapsed = Date.now() - startTime

      expect(collected).toHaveLength(3)
      // Should take at least 40ms (2 delays after first event)
      expect(elapsed).toBeGreaterThanOrEqual(40)
    })
  })

  describe('validateSSEHeaders', () => {
    it('should validate correct SSE headers', () => {
      const response = createMockSSEResponse([])
      const result = validateSSEHeaders(response)

      expect(result.hasCorrectContentType).toBe(true)
      expect(result.hasNoCache).toBe(true)
      expect(result.hasKeepAlive).toBe(true)
      expect(result.allValid).toBe(true)
    })

    it('should detect missing headers', () => {
      const response = new Response(null, {
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const result = validateSSEHeaders(response)

      expect(result.hasCorrectContentType).toBe(false)
      expect(result.hasNoCache).toBe(false)
      expect(result.hasKeepAlive).toBe(false)
      expect(result.allValid).toBe(false)
    })
  })

  describe('validateEventLifecycle', () => {
    it('should validate correct lifecycle with session start', () => {
      const events: SSEEvent[] = [
        { type: 'session', sessionId: 'test' },
        { type: 'thinking', content: 'Working...' },
        { type: 'done' },
      ]

      const result = validateEventLifecycle(events)

      expect(result.hasValidStart).toBe(true)
      expect(result.endsWithDone).toBe(true)
      expect(result.isValidLifecycle).toBe(true)
    })

    it('should validate error flow lifecycle', () => {
      const events: SSEEvent[] = [
        { type: 'session', sessionId: 'test' },
        { type: 'error', message: 'Something went wrong' },
        { type: 'done' },
      ]

      const result = validateEventLifecycle(events)

      expect(result.hasValidStart).toBe(true)
      expect(result.endsWithDone).toBe(true)
      expect(result.errorBeforeDone).toBe(true)
      expect(result.isValidLifecycle).toBe(true)
    })

    it('should detect missing done event', () => {
      const events: SSEEvent[] = [
        { type: 'session', sessionId: 'test' },
        { type: 'thinking', content: 'Working...' },
      ]

      const result = validateEventLifecycle(events)

      expect(result.endsWithDone).toBe(false)
      expect(result.isValidLifecycle).toBe(false)
    })

    it('should handle empty event list', () => {
      const result = validateEventLifecycle([])

      expect(result.hasValidStart).toBe(false)
      expect(result.endsWithDone).toBe(false)
      expect(result.isValidLifecycle).toBe(false)
    })
  })

  describe('formatSSEEvent', () => {
    it('should format event with data prefix and double newline', () => {
      const event: SSEEvent = { type: 'thinking', content: 'Test' }
      const formatted = formatSSEEvent(event)

      expect(formatted).toBe('data: {"type":"thinking","content":"Test"}\n\n')
    })
  })
})

describe('SSE Stream Format Tests', () => {
  const validSchema = {
    tableName: 'sales',
    columns: ['product_id', 'product_name', 'amount', 'date'],
    sampleRows: [{ product_id: 1, product_name: 'Widget', amount: 100, date: '2025-01-01' }],
    rowCount: 1000,
  }

  const createAnalyzeRequest = (params: Record<string, string> = {}) => {
    const url = new URL('http://localhost/api/analyze')
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value)
    }
    return new Request(url)
  }

  const createResumeRequest = (sessionId: string) => {
    const url = new URL('http://localhost/api/analyze/resume')
    url.searchParams.set('sessionId', sessionId)
    return new Request(url)
  }

  // Helper to create and mock a session (sets both create and get)
  const mockSession = (overrides: Partial<Session> = {}): Session => {
    const session: Session = {
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
      useThinking: false,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      ...overrides,
    }
    vi.mocked(sessionStore.create).mockResolvedValue(session)
    vi.mocked(sessionStore.get).mockResolvedValue(session)
    return session
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Default authenticated user
    vi.mocked(getSession).mockResolvedValue({
      isLoggedIn: true,
      userId: 'user-123',
    } as ReturnType<typeof getSession> extends Promise<infer T> ? T : never)

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
  })

  describe('Stream Headers', () => {
    it('should return correct Content-Type header', async () => {
      mockSession()

      const mockClient = {
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ type: 'text', text: 'Analysis complete' }],
            stop_reason: 'end_turn',
            usage: { input_tokens: 100, output_tokens: 50 },
          }),
        },
      }
      vi.mocked(getAnthropicClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getAnthropicClient>)

      const response = await analyzeGET(
        createAnalyzeRequest({
          query: 'test query',
          schema: JSON.stringify(validSchema),
        })
      )

      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
    })

    it('should return Cache-Control: no-cache header', async () => {
      mockSession()

      const mockClient = {
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ type: 'text', text: 'Done' }],
            stop_reason: 'end_turn',
            usage: { input_tokens: 100, output_tokens: 50 },
          }),
        },
      }
      vi.mocked(getAnthropicClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getAnthropicClient>)

      const response = await analyzeGET(
        createAnalyzeRequest({
          query: 'test query',
          schema: JSON.stringify(validSchema),
        })
      )

      expect(response.headers.get('Cache-Control')).toBe('no-cache')
    })

    it('should return Connection: keep-alive header', async () => {
      mockSession()

      const mockClient = {
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ type: 'text', text: 'Done' }],
            stop_reason: 'end_turn',
            usage: { input_tokens: 100, output_tokens: 50 },
          }),
        },
      }
      vi.mocked(getAnthropicClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getAnthropicClient>)

      const response = await analyzeGET(
        createAnalyzeRequest({
          query: 'test query',
          schema: JSON.stringify(validSchema),
        })
      )

      expect(response.headers.get('Connection')).toBe('keep-alive')
    })
  })

  describe('Event Format Validation', () => {
    it('should format events with data: prefix', async () => {
      mockSession()

      const mockClient = {
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ type: 'text', text: 'Test analysis' }],
            stop_reason: 'end_turn',
            usage: { input_tokens: 100, output_tokens: 50 },
          }),
        },
      }
      vi.mocked(getAnthropicClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getAnthropicClient>)

      const response = await analyzeGET(
        createAnalyzeRequest({
          query: 'test query',
          schema: JSON.stringify(validSchema),
        })
      )

      // Read raw stream to verify format
      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let rawContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        rawContent += decoder.decode(value)
      }

      // Each event should start with "data: "
      const lines = rawContent.split('\n').filter(l => l.trim())
      for (const line of lines) {
        expect(line).toMatch(/^data: /)
      }
    })

    it('should separate events with double newline', async () => {
      mockSession()

      const mockClient = {
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ type: 'text', text: 'Test' }],
            stop_reason: 'end_turn',
            usage: { input_tokens: 100, output_tokens: 50 },
          }),
        },
      }
      vi.mocked(getAnthropicClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getAnthropicClient>)

      const response = await analyzeGET(
        createAnalyzeRequest({
          query: 'test query',
          schema: JSON.stringify(validSchema),
        })
      )

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let rawContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        rawContent += decoder.decode(value)
      }

      // Should contain double newlines between events
      expect(rawContent).toContain('\n\n')
    })

    it('should emit valid JSON in event data', async () => {
      mockSession()

      const mockClient = {
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ type: 'text', text: 'Analysis result' }],
            stop_reason: 'end_turn',
            usage: { input_tokens: 100, output_tokens: 50 },
          }),
        },
      }
      vi.mocked(getAnthropicClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getAnthropicClient>)

      const response = await analyzeGET(
        createAnalyzeRequest({
          query: 'test query',
          schema: JSON.stringify(validSchema),
        })
      )

      const events = await collectSSEEvents(response)

      // All events should have been parsed successfully
      expect(events.length).toBeGreaterThan(0)

      // Each event should have a type
      for (const event of events) {
        expect(event).toHaveProperty('type')
      }
    })
  })

  describe('Event Type Tests', () => {
    describe('session event', () => {
      it('should emit session event with sessionId', async () => {
        mockSession({ id: 'session-abc-123' })

        const mockClient = {
          messages: {
            create: vi.fn().mockResolvedValue({
              content: [{ type: 'text', text: 'Done' }],
              stop_reason: 'end_turn',
              usage: { input_tokens: 100, output_tokens: 50 },
            }),
          },
        }
        vi.mocked(getAnthropicClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getAnthropicClient>)

        const response = await analyzeGET(
          createAnalyzeRequest({
            query: 'test query',
            schema: JSON.stringify(validSchema),
          })
        )

        const events = await collectSSEEvents(response)
        const sessionEvent = events.find(e => e.type === 'session')

        expect(sessionEvent).toBeDefined()
        expect(sessionEvent).toHaveProperty('sessionId')
        expect(typeof (sessionEvent as { type: 'session'; sessionId: string }).sessionId).toBe('string')
      })
    })

    describe('thinking event', () => {
      it('should emit thinking event with content string', async () => {
        mockSession()

        const mockClient = {
          messages: {
            create: vi.fn().mockResolvedValue({
              content: [
                { type: 'text', text: 'Let me analyze this data...' },
              ],
              stop_reason: 'end_turn',
              usage: { input_tokens: 100, output_tokens: 50 },
            }),
          },
        }
        vi.mocked(getAnthropicClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getAnthropicClient>)

        const response = await analyzeGET(
          createAnalyzeRequest({
            query: 'test query',
            schema: JSON.stringify(validSchema),
          })
        )

        const events = await collectSSEEvents(response)
        const thinkingEvent = events.find(e => e.type === 'thinking')

        expect(thinkingEvent).toBeDefined()
        expect(thinkingEvent).toHaveProperty('content')
        expect(typeof (thinkingEvent as { type: 'thinking'; content: string }).content).toBe('string')
        expect((thinkingEvent as { type: 'thinking'; content: string }).content).toBe('Let me analyze this data...')
      })
    })

    describe('extended_thinking event', () => {
      it('should emit extended_thinking event with content string', async () => {
        // Mock pro tier user to access high model
        vi.mocked(getSession).mockResolvedValue({
          isLoggedIn: true,
          userId: 'user-123',
          tier: 'pro',
        } as ReturnType<typeof getSession> extends Promise<infer T> ? T : never)

        mockSession({ model: 'high', useThinking: true })

        const mockClient = {
          messages: {
            create: vi.fn().mockResolvedValue({
              content: [
                { type: 'thinking', thinking: 'Internal reasoning about the query...' },
                { type: 'text', text: 'Final answer' },
              ],
              stop_reason: 'end_turn',
              usage: { input_tokens: 100, output_tokens: 50 },
            }),
          },
        }
        vi.mocked(getAnthropicClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getAnthropicClient>)

        const response = await analyzeGET(
          createAnalyzeRequest({
            query: 'test query',
            schema: JSON.stringify(validSchema),
            model: 'high',
            thinking: 'true',
          })
        )

        const events = await collectSSEEvents(response)
        const extendedThinkingEvent = events.find(e => e.type === 'extended_thinking')

        expect(extendedThinkingEvent).toBeDefined()
        expect(extendedThinkingEvent).toHaveProperty('content')
        expect(typeof (extendedThinkingEvent as { type: 'extended_thinking'; content: string }).content).toBe('string')
        expect((extendedThinkingEvent as { type: 'extended_thinking'; content: string }).content).toBe('Internal reasoning about the query...')
      })
    })

    describe('tool_call event', () => {
      it('should emit tool_call event with id, name, and input', async () => {
        mockSession()

        const mockClient = {
          messages: {
            create: vi.fn().mockResolvedValue({
              content: [
                {
                  type: 'tool_use',
                  id: 'tool-call-123',
                  name: 'run_query',
                  input: { thought: 'Running SQL query', sql: 'SELECT * FROM sales LIMIT 10' },
                },
              ],
              stop_reason: 'tool_use',
              usage: { input_tokens: 100, output_tokens: 50 },
            }),
          },
        }
        vi.mocked(getAnthropicClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getAnthropicClient>)

        const response = await analyzeGET(
          createAnalyzeRequest({
            query: 'test query',
            schema: JSON.stringify(validSchema),
          })
        )

        const events = await collectSSEEvents(response)
        const toolCallEvent = events.find(e => e.type === 'tool_call')

        expect(toolCallEvent).toBeDefined()
        expect(toolCallEvent).toHaveProperty('id')
        expect(toolCallEvent).toHaveProperty('name')
        expect(toolCallEvent).toHaveProperty('input')

        const typed = toolCallEvent as { type: 'tool_call'; id: string; name: string; input: unknown }
        expect(typeof typed.id).toBe('string')
        expect(typeof typed.name).toBe('string')
        expect(typed.name).toBe('run_query')
      })
    })

    describe('answer event', () => {
      it('should emit answer event with result containing answer, chartType, chartData', async () => {
        mockSession({
          queryResults: { step_0: [{ product_name: 'Widget', amount: 100 }] },
          stepIndex: 1,
        })

        const mockClient = {
          messages: {
            create: vi.fn().mockResolvedValue({
              content: [
                {
                  type: 'tool_use',
                  id: 'final-answer-123',
                  name: 'final_answer',
                  input: {
                    answer: 'The top product is Widget with $100 in sales.',
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
        vi.mocked(getAnthropicClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getAnthropicClient>)

        const response = await analyzeGET(
          createAnalyzeRequest({
            query: 'test query',
            schema: JSON.stringify(validSchema),
          })
        )

        const events = await collectSSEEvents(response)
        const answerEvent = events.find(e => e.type === 'answer')

        expect(answerEvent).toBeDefined()
        expect(answerEvent).toHaveProperty('result')

        const typed = answerEvent as { type: 'answer'; result: AnalysisResult }
        expect(typed.result).toHaveProperty('answer')
        expect(typed.result).toHaveProperty('chartType')
        expect(typed.result).toHaveProperty('chartData')

        expect(typeof typed.result.answer).toBe('string')
        expect(typed.result.answer).toBe('The top product is Widget with $100 in sales.')
        expect(typed.result.chartType).toBe('bar')
        expect(Array.isArray(typed.result.chartData)).toBe(true)
      })
    })

    describe('done event', () => {
      it('should emit done event at end of stream', async () => {
        mockSession()

        const mockClient = {
          messages: {
            create: vi.fn().mockResolvedValue({
              content: [{ type: 'text', text: 'Analysis complete' }],
              stop_reason: 'end_turn',
              usage: { input_tokens: 100, output_tokens: 50 },
            }),
          },
        }
        vi.mocked(getAnthropicClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getAnthropicClient>)

        const response = await analyzeGET(
          createAnalyzeRequest({
            query: 'test query',
            schema: JSON.stringify(validSchema),
          })
        )

        const events = await collectSSEEvents(response)
        const doneEvent = events.find(e => e.type === 'done')

        expect(doneEvent).toBeDefined()
        expect(doneEvent).toEqual({ type: 'done' })
      })

      it('done event should be the last event in the stream', async () => {
        mockSession()

        const mockClient = {
          messages: {
            create: vi.fn().mockResolvedValue({
              content: [{ type: 'text', text: 'Test' }],
              stop_reason: 'end_turn',
              usage: { input_tokens: 100, output_tokens: 50 },
            }),
          },
        }
        vi.mocked(getAnthropicClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getAnthropicClient>)

        const response = await analyzeGET(
          createAnalyzeRequest({
            query: 'test query',
            schema: JSON.stringify(validSchema),
          })
        )

        const events = await collectSSEEvents(response)
        const lastEvent = events[events.length - 1]

        expect(lastEvent.type).toBe('done')
      })
    })

    describe('error event', () => {
      it('should emit error event with message string', async () => {
        mockSession()

        const mockClient = {
          messages: {
            create: vi.fn().mockRejectedValue(new Error('API rate limit exceeded')),
          },
        }
        vi.mocked(getAnthropicClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getAnthropicClient>)

        const response = await analyzeGET(
          createAnalyzeRequest({
            query: 'test query',
            schema: JSON.stringify(validSchema),
          })
        )

        const events = await collectSSEEvents(response)
        const errorEvent = events.find(e => e.type === 'error')

        expect(errorEvent).toBeDefined()
        expect(errorEvent).toHaveProperty('message')
        expect(typeof (errorEvent as { type: 'error'; message: string }).message).toBe('string')
        expect((errorEvent as { type: 'error'; message: string }).message).toBe('API rate limit exceeded')
      })
    })
  })

  describe('Stream Lifecycle Tests', () => {
    it('should start with session event for new analysis', async () => {
      mockSession()

      const mockClient = {
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ type: 'text', text: 'Test' }],
            stop_reason: 'end_turn',
            usage: { input_tokens: 100, output_tokens: 50 },
          }),
        },
      }
      vi.mocked(getAnthropicClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getAnthropicClient>)

      const response = await analyzeGET(
        createAnalyzeRequest({
          query: 'test query',
          schema: JSON.stringify(validSchema),
        })
      )

      const events = await collectSSEEvents(response)
      expect(events[0].type).toBe('session')
    })

    it('should end with done event on success', async () => {
      mockSession()

      const mockClient = {
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [
              {
                type: 'tool_use',
                id: 'answer-123',
                name: 'final_answer',
                input: { answer: 'Result', chartType: 'table' },
              },
            ],
            stop_reason: 'tool_use',
            usage: { input_tokens: 100, output_tokens: 50 },
          }),
        },
      }
      vi.mocked(getAnthropicClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getAnthropicClient>)

      const response = await analyzeGET(
        createAnalyzeRequest({
          query: 'test query',
          schema: JSON.stringify(validSchema),
        })
      )

      const events = await collectSSEEvents(response)
      const lastEvent = events[events.length - 1]

      expect(lastEvent.type).toBe('done')
    })

    it('should end with error then done on failure', async () => {
      mockSession()

      const mockClient = {
        messages: {
          create: vi.fn().mockRejectedValue(new Error('Service unavailable')),
        },
      }
      vi.mocked(getAnthropicClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getAnthropicClient>)

      const response = await analyzeGET(
        createAnalyzeRequest({
          query: 'test query',
          schema: JSON.stringify(validSchema),
        })
      )

      const events = await collectSSEEvents(response)
      const lifecycle = validateEventLifecycle(events)

      expect(lifecycle.errorBeforeDone).toBe(true)
      expect(lifecycle.endsWithDone).toBe(true)
    })

    it('should emit error and done when session not found', async () => {
      // Create session but then have get return undefined
      mockSession()
      vi.mocked(sessionStore.get).mockResolvedValue(undefined)

      const mockClient = {
        messages: {
          create: vi.fn(),
        },
      }
      vi.mocked(getAnthropicClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getAnthropicClient>)

      const response = await analyzeGET(
        createAnalyzeRequest({
          query: 'test query',
          schema: JSON.stringify(validSchema),
        })
      )

      const events = await collectSSEEvents(response)

      // Should have session, error, done
      expect(events.some(e => e.type === 'session')).toBe(true)
      expect(events.some(e => e.type === 'error')).toBe(true)
      expect(events[events.length - 1].type).toBe('done')
    })
  })

  describe('Resume Endpoint SSE Tests', () => {
    it('should return correct SSE headers for resume endpoint', async () => {
      vi.mocked(sessionStore.get).mockResolvedValue({
        id: 'session-123',
        model: 'low',
        query: 'test query',
        schema: [validSchema],
        messages: [{ role: 'user', content: 'test' }],
        queryResults: {},
        stepIndex: 0,
        iteration: 0,
        pendingToolId: null,
        awaitingToolResult: false,
        useThinking: false,
        createdAt: Date.now(),
        lastActivity: Date.now(),
      })

      const mockClient = {
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ type: 'text', text: 'Resume result' }],
            stop_reason: 'end_turn',
            usage: { input_tokens: 100, output_tokens: 50 },
          }),
        },
      }
      vi.mocked(getAnthropicClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getAnthropicClient>)

      const response = await resumeGET(createResumeRequest('session-123'))
      const headers = validateSSEHeaders(response)

      expect(headers.allValid).toBe(true)
    })

    it('should emit answer and done on successful resume', async () => {
      vi.mocked(sessionStore.get).mockResolvedValue({
        id: 'session-123',
        model: 'low',
        query: 'test query',
        schema: [validSchema],
        messages: [{ role: 'user', content: 'test' }],
        queryResults: { step_0: [{ name: 'Test', value: 100 }] },
        stepIndex: 1,
        iteration: 0,
        pendingToolId: null,
        awaitingToolResult: false,
        useThinking: false,
        createdAt: Date.now(),
        lastActivity: Date.now(),
      })

      const mockClient = {
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [
              {
                type: 'tool_use',
                id: 'final-123',
                name: 'final_answer',
                input: { answer: 'The result is 100', chartType: 'bar' },
              },
            ],
            stop_reason: 'tool_use',
            usage: { input_tokens: 100, output_tokens: 50 },
          }),
        },
      }
      vi.mocked(getAnthropicClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getAnthropicClient>)

      const response = await resumeGET(createResumeRequest('session-123'))
      const events = await collectSSEEvents(response)

      expect(events.some(e => e.type === 'answer')).toBe(true)
      expect(events[events.length - 1].type).toBe('done')
    })

    it('should return 404 JSON error when session not found (not SSE)', async () => {
      vi.mocked(sessionStore.get).mockResolvedValue(undefined)

      const response = await resumeGET(createResumeRequest('nonexistent-session'))

      expect(response.status).toBe(404)
      expect(response.headers.get('Content-Type')).toContain('application/json')

      const data = await response.json()
      expect(data.error).toContain('Session not found')
    })

    it('should emit tool_call event and exit for browser-executed tools', async () => {
      vi.mocked(sessionStore.get).mockResolvedValue({
        id: 'session-123',
        model: 'low',
        query: 'test query',
        schema: [validSchema],
        messages: [{ role: 'user', content: 'test' }],
        queryResults: {},
        stepIndex: 0,
        iteration: 0,
        pendingToolId: null,
        awaitingToolResult: false,
        useThinking: false,
        createdAt: Date.now(),
        lastActivity: Date.now(),
      })

      const mockClient = {
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [
              {
                type: 'tool_use',
                id: 'tool-456',
                name: 'run_query',
                input: { thought: 'Getting data', sql: 'SELECT * FROM sales' },
              },
            ],
            stop_reason: 'tool_use',
            usage: { input_tokens: 100, output_tokens: 50 },
          }),
        },
      }
      vi.mocked(getAnthropicClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getAnthropicClient>)

      const response = await resumeGET(createResumeRequest('session-123'))
      const events = await collectSSEEvents(response)

      // Should emit tool_call but NOT done (exits for browser execution)
      const toolCallEvent = events.find(e => e.type === 'tool_call')
      expect(toolCallEvent).toBeDefined()

      // Stream ends without done when waiting for browser tool execution
      // The stream just stops after tool_call is sent
    })

    it('should emit extended_thinking event when model supports thinking', async () => {
      vi.mocked(sessionStore.get).mockResolvedValue({
        id: 'session-123',
        model: 'high',
        query: 'test query',
        schema: [validSchema],
        messages: [{ role: 'user', content: 'test' }],
        queryResults: {},
        stepIndex: 0,
        iteration: 0,
        pendingToolId: null,
        awaitingToolResult: false,
        useThinking: true,
        createdAt: Date.now(),
        lastActivity: Date.now(),
      })

      const mockClient = {
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [
              { type: 'thinking', thinking: 'Deep internal reasoning...' },
              { type: 'text', text: 'Final analysis' },
            ],
            stop_reason: 'end_turn',
            usage: { input_tokens: 100, output_tokens: 50 },
          }),
        },
      }
      vi.mocked(getAnthropicClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getAnthropicClient>)

      const response = await resumeGET(createResumeRequest('session-123'))
      const events = await collectSSEEvents(response)

      const extendedThinking = events.find(e => e.type === 'extended_thinking')
      expect(extendedThinking).toBeDefined()
      expect((extendedThinking as { type: 'extended_thinking'; content: string }).content).toBe('Deep internal reasoning...')
    })
  })

  describe('Maximum Iterations', () => {
    it('should emit error when max iterations reached', async () => {
      // Start at iteration 14 (near max of 15)
      mockSession({ iteration: 14 })

      // Always return tool_use to force loop continuation
      const mockClient = {
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ type: 'text', text: 'Still processing...' }],
            stop_reason: 'max_tokens', // Not end_turn, so loop continues
            usage: { input_tokens: 100, output_tokens: 50 },
          }),
        },
      }
      vi.mocked(getAnthropicClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getAnthropicClient>)

      const response = await analyzeGET(
        createAnalyzeRequest({
          query: 'test query',
          schema: JSON.stringify(validSchema),
        })
      )

      const events = await collectSSEEvents(response)
      const errorEvent = events.find(e => e.type === 'error')

      expect(errorEvent).toBeDefined()
      expect((errorEvent as { type: 'error'; message: string }).message).toContain('Maximum analysis iterations')
    })
  })
})
