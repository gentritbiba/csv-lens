import { describe, it, expect } from 'vitest'
import {
  CLAUDE_MODELS,
  THINKING_CONFIG,
  DEFAULT_MODEL_TIER,
  AGENT_CONFIG,
  normalizeSchemaContext,
  type ModelTier,
  type SSEEvent,
  type AnalysisResult,
  type Session,
  type TableInfo,
} from '@/lib/claude/types'

describe('claude/types', () => {
  describe('CLAUDE_MODELS', () => {
    it('should have all model tiers', () => {
      const tiers: ModelTier[] = ['high', 'low']
      tiers.forEach((tier) => {
        expect(CLAUDE_MODELS[tier]).toBeDefined()
        expect(CLAUDE_MODELS[tier].modelId).toBeTruthy()
        expect(CLAUDE_MODELS[tier].label).toBeTruthy()
      })
    })
  })

  describe('THINKING_CONFIG', () => {
    it('should have budget tokens', () => {
      expect(THINKING_CONFIG.budgetTokens).toBe(10000)
    })

    it('should have max tokens with thinking', () => {
      expect(THINKING_CONFIG.maxTokensWithThinking).toBe(16000)
    })
  })

  describe('DEFAULT_MODEL_TIER', () => {
    it('should be low', () => {
      expect(DEFAULT_MODEL_TIER).toBe('low')
    })
  })

  describe('AGENT_CONFIG', () => {
    it('should have max iterations', () => {
      expect(AGENT_CONFIG.maxIterations).toBe(15)
    })

    it('should have session timeout of 5 minutes', () => {
      expect(AGENT_CONFIG.sessionTimeoutMs).toBe(5 * 60 * 1000)
    })

    it('should have default model', () => {
      expect(AGENT_CONFIG.defaultModel).toBe('low')
    })
  })

  describe('normalizeSchemaContext', () => {
    const table1: TableInfo = {
      tableName: 'users',
      columns: ['id', 'name'],
      sampleRows: [],
      rowCount: 10,
    }

    const table2: TableInfo = {
      tableName: 'orders',
      columns: ['id', 'user_id'],
      sampleRows: [],
      rowCount: 20,
    }

    it('should wrap single table in array', () => {
      const result = normalizeSchemaContext(table1)
      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual(table1)
    })

    it('should return array unchanged', () => {
      const tables = [table1, table2]
      const result = normalizeSchemaContext(tables)
      expect(result).toBe(tables)
    })
  })

  describe('Type definitions', () => {
    it('should allow valid SSEEvent types', () => {
      const events: SSEEvent[] = [
        { type: 'session', sessionId: '123' },
        { type: 'thinking', content: 'Processing...' },
        { type: 'extended_thinking', content: 'Deep analysis...' },
        { type: 'tool_call', id: 't1', name: 'run_query', input: { sql: 'SELECT *' } },
        {
          type: 'answer',
          result: {
            answer: 'Result',
            chartType: 'bar',
            chartData: [],
            steps: [],
          },
        },
        { type: 'error', message: 'Something went wrong' },
        { type: 'done' },
      ]

      expect(events).toHaveLength(7)
    })

    it('should allow valid AnalysisResult', () => {
      const result: AnalysisResult = {
        answer: 'The data shows...',
        chartType: 'bar',
        chartData: [{ x: 1, y: 2 }],
        xAxis: 'x',
        yAxis: 'y',
        steps: [
          {
            thought: 'Analyzing...',
            tool: 'run_query',
            input: { sql: 'SELECT *' },
            result: [{ col: 'value' }],
          },
        ],
      }

      expect(result.chartType).toBe('bar')
      expect(result.steps).toHaveLength(1)
    })

    it('should allow valid Session', () => {
      const session: Session = {
        id: 'sess-123',
        createdAt: Date.now(),
        lastActivity: Date.now(),
        model: 'low',
        query: 'Show top 10',
        schema: [
          {
            tableName: 'data',
            columns: ['id', 'value'],
            sampleRows: [],
            rowCount: 100,
          },
        ],
        messages: [],
        queryResults: {},
        stepIndex: 0,
        iteration: 0,
        pendingToolId: null,
        awaitingToolResult: false,
        useThinking: true,
      }

      expect(session.model).toBe('low')
      expect(session.useThinking).toBe(true)
    })
  })
})
