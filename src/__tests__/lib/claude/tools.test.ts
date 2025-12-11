import { describe, it, expect } from 'vitest'
import { agentTools, browserExecutedTools, needsBrowserExecution } from '@/lib/claude/tools'

describe('claude/tools', () => {
  describe('agentTools', () => {
    it('should define all required tools', () => {
      const toolNames = agentTools.map((t) => t.name)
      expect(toolNames).toContain('run_query')
      expect(toolNames).toContain('get_column_stats')
      expect(toolNames).toContain('get_value_distribution')
      expect(toolNames).toContain('transform_data')
      expect(toolNames).toContain('final_answer')
    })

    it('should have 5 tools total', () => {
      expect(agentTools).toHaveLength(5)
    })

    describe('run_query tool', () => {
      const tool = agentTools.find((t) => t.name === 'run_query')!

      it('should have correct schema', () => {
        expect(tool.input_schema.type).toBe('object')
        expect(tool.input_schema.required).toContain('thought')
        expect(tool.input_schema.required).toContain('sql')
      })

      it('should have description', () => {
        expect(tool.description).toContain('SQL')
      })
    })

    describe('get_column_stats tool', () => {
      const tool = agentTools.find((t) => t.name === 'get_column_stats')!

      it('should have correct schema', () => {
        expect(tool.input_schema.required).toContain('thought')
        expect(tool.input_schema.required).toContain('column')
      })

      it('should have optional table parameter', () => {
        const props = tool.input_schema.properties as Record<string, { type: string }>
        expect(props.table).toBeDefined()
        expect(tool.input_schema.required).not.toContain('table')
      })
    })

    describe('get_value_distribution tool', () => {
      const tool = agentTools.find((t) => t.name === 'get_value_distribution')!

      it('should have correct schema', () => {
        expect(tool.input_schema.required).toContain('thought')
        expect(tool.input_schema.required).toContain('column')
      })

      it('should have optional limit parameter', () => {
        const props = tool.input_schema.properties as Record<string, { type: string }>
        expect(props.limit).toBeDefined()
        expect(props.limit.type).toBe('number')
      })
    })

    describe('transform_data tool', () => {
      const tool = agentTools.find((t) => t.name === 'transform_data')!

      it('should have correct schema', () => {
        expect(tool.input_schema.required).toContain('thought')
        expect(tool.input_schema.required).toContain('code')
        expect(tool.input_schema.required).toContain('sourceStep')
      })

      it('should document output format in description', () => {
        expect(tool.description).toContain('FLAT rows')
        expect(tool.description).toContain('return')
      })
    })

    describe('final_answer tool', () => {
      const tool = agentTools.find((t) => t.name === 'final_answer')!

      it('should have correct schema', () => {
        expect(tool.input_schema.required).toContain('answer')
        expect(tool.input_schema.required).toContain('chartType')
      })

      it('should have chartType enum', () => {
        const props = tool.input_schema.properties as Record<
          string,
          { enum?: string[] }
        >
        expect(props.chartType.enum).toContain('bar')
        expect(props.chartType.enum).toContain('line')
        expect(props.chartType.enum).toContain('pie')
        expect(props.chartType.enum).toContain('scatter')
        expect(props.chartType.enum).toContain('table')
      })

      it('should have optional axis parameters', () => {
        expect(tool.input_schema.required).not.toContain('xAxis')
        expect(tool.input_schema.required).not.toContain('yAxis')
      })
    })
  })

  describe('browserExecutedTools', () => {
    it('should be a Set', () => {
      expect(browserExecutedTools).toBeInstanceOf(Set)
    })

    it('should include data tools', () => {
      expect(browserExecutedTools.has('run_query')).toBe(true)
      expect(browserExecutedTools.has('get_column_stats')).toBe(true)
      expect(browserExecutedTools.has('get_value_distribution')).toBe(true)
      expect(browserExecutedTools.has('transform_data')).toBe(true)
    })

    it('should not include final_answer', () => {
      expect(browserExecutedTools.has('final_answer')).toBe(false)
    })
  })

  describe('needsBrowserExecution', () => {
    it('should return true for browser-executed tools', () => {
      expect(needsBrowserExecution('run_query')).toBe(true)
      expect(needsBrowserExecution('get_column_stats')).toBe(true)
      expect(needsBrowserExecution('get_value_distribution')).toBe(true)
      expect(needsBrowserExecution('transform_data')).toBe(true)
    })

    it('should return false for server-only tools', () => {
      expect(needsBrowserExecution('final_answer')).toBe(false)
    })

    it('should return false for unknown tools', () => {
      expect(needsBrowserExecution('unknown_tool')).toBe(false)
      expect(needsBrowserExecution('')).toBe(false)
    })
  })
})
