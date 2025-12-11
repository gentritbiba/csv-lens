import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { TableInfo } from '@/lib/claude/types'

// Shared store for mock
const mockStore = new Map<string, string>()

// Mock Redis before importing sessionStore
vi.mock('@upstash/redis', () => {
  return {
    Redis: {
      fromEnv: vi.fn(() => ({
        set: vi.fn(async (key: string, value: string) => {
          mockStore.set(key, value)
          return 'OK'
        }),
        get: vi.fn(async (key: string) => mockStore.get(key) || null),
        del: vi.fn(async (key: string) => {
          const existed = mockStore.has(key)
          mockStore.delete(key)
          return existed ? 1 : 0
        }),
        keys: vi.fn(async (pattern: string) => {
          const prefix = pattern.replace('*', '')
          return Array.from(mockStore.keys()).filter(k => k.startsWith(prefix))
        }),
      })),
    },
  }
})

import { sessionStore } from '@/lib/claude/sessions'

describe('claude/sessions', () => {
  const mockSchema: TableInfo[] = [
    {
      tableName: 'test',
      columns: ['id', 'name', 'value'],
      sampleRows: [{ id: 1, name: 'test', value: 100 }],
      rowCount: 100,
    },
  ]

  beforeEach(() => {
    // Stop cleanup to prevent interference
    sessionStore.stopCleanup()
    // Clear mock store
    mockStore.clear()
  })

  afterEach(async () => {
    // Clean up test sessions
    const testSessionIds = ['test-1', 'test-2', 'test-3', 'test-timeout']
    for (const id of testSessionIds) {
      await sessionStore.delete(id)
    }
  })

  describe('create', () => {
    it('should create a new session with correct properties', async () => {
      const session = await sessionStore.create('test-1', {
        model: 'low',
        query: 'What is the total?',
        schema: mockSchema,
      })

      expect(session.id).toBe('test-1')
      expect(session.model).toBe('low')
      expect(session.query).toBe('What is the total?')
      expect(session.schema).toEqual(mockSchema)
      expect(session.messages).toEqual([])
      expect(session.queryResults).toEqual({})
      expect(session.stepIndex).toBe(0)
      expect(session.iteration).toBe(0)
      expect(session.pendingToolId).toBeNull()
      expect(session.awaitingToolResult).toBe(false)
      expect(session.useThinking).toBe(true)
    })

    it('should set timestamps on creation', async () => {
      const before = Date.now()
      const session = await sessionStore.create('test-1', {
        model: 'high',
        query: 'Test',
        schema: mockSchema,
      })
      const after = Date.now()

      expect(session.createdAt).toBeGreaterThanOrEqual(before)
      expect(session.createdAt).toBeLessThanOrEqual(after)
      expect(session.lastActivity).toBeGreaterThanOrEqual(before)
      expect(session.lastActivity).toBeLessThanOrEqual(after)
    })

    it('should allow disabling thinking', async () => {
      const session = await sessionStore.create('test-1', {
        model: 'low',
        query: 'Test',
        schema: mockSchema,
        useThinking: false,
      })

      expect(session.useThinking).toBe(false)
    })
  })

  describe('get', () => {
    it('should return existing session', async () => {
      await sessionStore.create('test-1', {
        model: 'low',
        query: 'Test',
        schema: mockSchema,
      })

      const session = await sessionStore.get('test-1')
      expect(session).toBeDefined()
      expect(session?.id).toBe('test-1')
    })

    it('should return undefined for non-existent session', async () => {
      const session = await sessionStore.get('non-existent')
      expect(session).toBeUndefined()
    })

    it('should update lastActivity on get', async () => {
      const session = await sessionStore.create('test-1', {
        model: 'low',
        query: 'Test',
        schema: mockSchema,
      })
      const initialActivity = session.lastActivity

      // Wait a bit to ensure time passes
      await new Promise(r => setTimeout(r, 10))

      const retrieved = await sessionStore.get('test-1')
      expect(retrieved?.lastActivity).toBeGreaterThanOrEqual(initialActivity)
    })
  })

  describe('update', () => {
    it('should update session properties', async () => {
      await sessionStore.create('test-1', {
        model: 'low',
        query: 'Test',
        schema: mockSchema,
      })

      const updated = await sessionStore.update('test-1', {
        stepIndex: 5,
        iteration: 3,
        pendingToolId: 'tool-123',
      })

      expect(updated?.stepIndex).toBe(5)
      expect(updated?.iteration).toBe(3)
      expect(updated?.pendingToolId).toBe('tool-123')
    })

    it('should preserve unmodified properties', async () => {
      await sessionStore.create('test-1', {
        model: 'high',
        query: 'Original query',
        schema: mockSchema,
      })

      await sessionStore.update('test-1', { stepIndex: 1 })

      const session = await sessionStore.get('test-1')
      expect(session?.model).toBe('high')
      expect(session?.query).toBe('Original query')
    })

    it('should return undefined for non-existent session', async () => {
      const result = await sessionStore.update('non-existent', { stepIndex: 1 })
      expect(result).toBeUndefined()
    })

    it('should update lastActivity on update', async () => {
      const session = await sessionStore.create('test-1', {
        model: 'low',
        query: 'Test',
        schema: mockSchema,
      })
      const initialActivity = session.lastActivity

      const updated = await sessionStore.update('test-1', { stepIndex: 1 })
      expect(updated?.lastActivity).toBeGreaterThanOrEqual(initialActivity)
    })
  })

  describe('delete', () => {
    it('should delete existing session', async () => {
      await sessionStore.create('test-1', {
        model: 'low',
        query: 'Test',
        schema: mockSchema,
      })

      const result = await sessionStore.delete('test-1')
      expect(result).toBe(true)
      expect(await sessionStore.get('test-1')).toBeUndefined()
    })

    it('should return false for non-existent session', async () => {
      const result = await sessionStore.delete('non-existent')
      expect(result).toBe(false)
    })
  })

  describe('count', () => {
    it('should return number of sessions', async () => {
      const initialCount = await sessionStore.count()

      await sessionStore.create('test-1', {
        model: 'low',
        query: 'Test 1',
        schema: mockSchema,
      })
      expect(await sessionStore.count()).toBe(initialCount + 1)

      await sessionStore.create('test-2', {
        model: 'high',
        query: 'Test 2',
        schema: mockSchema,
      })
      expect(await sessionStore.count()).toBe(initialCount + 2)

      await sessionStore.delete('test-1')
      expect(await sessionStore.count()).toBe(initialCount + 1)
    })
  })

  describe('stopCleanup', () => {
    it('should stop cleanup interval without error', () => {
      expect(() => sessionStore.stopCleanup()).not.toThrow()
      // Call again to ensure idempotent
      expect(() => sessionStore.stopCleanup()).not.toThrow()
    })
  })
})
