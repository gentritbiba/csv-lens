import { describe, it, expect, beforeEach } from 'vitest'
import {
  executeTransform,
  saveQueryResult,
  getStoredResults,
  clearStoredResults,
} from '@/lib/transform'

describe('transform', () => {
  describe('executeTransform', () => {
    const sampleData = [
      { name: 'Alice', value: 100 },
      { name: 'Bob', value: 200 },
      { name: 'Charlie', value: 300 },
    ]

    const allSteps: Record<string, unknown[] | null> = {
      step_0: sampleData,
    }

    it('should execute simple transformation', () => {
      const code = 'return data.map(row => ({ name: row.name, doubled: row.value * 2 }))'
      const result = executeTransform(code, sampleData, allSteps)

      expect(result).toEqual([
        { name: 'Alice', doubled: 200 },
        { name: 'Bob', doubled: 400 },
        { name: 'Charlie', doubled: 600 },
      ])
    })

    it('should filter data', () => {
      const code = 'return data.filter(row => row.value > 150)'
      const result = executeTransform(code, sampleData, allSteps)

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({ name: 'Bob', value: 200 })
      expect(result[1]).toEqual({ name: 'Charlie', value: 300 })
    })

    it('should aggregate data', () => {
      const code = `
        const total = data.reduce((sum, row) => sum + row.value, 0);
        return [{ metric: 'total', value: total }];
      `
      const result = executeTransform(code, sampleData, allSteps)

      expect(result).toEqual([{ metric: 'total', value: 600 }])
    })

    it('should access allSteps for multi-step transforms', () => {
      const step1Data = [{ category: 'A', count: 10 }]
      const steps = {
        step_0: sampleData,
        step_1: step1Data,
      }
      const code = `
        const originalTotal = allSteps.step_0.reduce((s, r) => s + r.value, 0);
        return [{ original_total: originalTotal, step1_count: data[0].count }];
      `
      const result = executeTransform(code, step1Data, steps)

      expect(result).toEqual([{ original_total: 600, step1_count: 10 }])
    })

    it('should throw error if code is missing return statement', () => {
      const code = 'data.map(row => row)'
      expect(() => executeTransform(code, sampleData, allSteps)).toThrow(
        "must include a 'return' statement"
      )
    })

    it('should throw error for syntax errors', () => {
      const code = 'return data.map(row => {'
      expect(() => executeTransform(code, sampleData, allSteps)).toThrow(
        'JavaScript syntax error'
      )
    })

    it('should throw error if result is not an array', () => {
      const code = 'return { name: "test" }'
      expect(() => executeTransform(code, sampleData, allSteps)).toThrow(
        'must return an array of objects'
      )
    })

    it('should throw error if result is empty array', () => {
      const code = 'return []'
      expect(() => executeTransform(code, sampleData, allSteps)).toThrow(
        'returned empty array'
      )
    })

    it('should throw error if result contains primitives', () => {
      const code = 'return [1, 2, 3]'
      expect(() => executeTransform(code, sampleData, allSteps)).toThrow(
        'array of objects'
      )
    })

    it('should throw error for nested objects in result', () => {
      const code = 'return [{ name: "test", nested: { value: 1 } }]'
      expect(() => executeTransform(code, sampleData, allSteps)).toThrow(
        'nested'
      )
    })

    it('should throw error for nested arrays in result', () => {
      const code = 'return [{ name: "test", items: [1, 2, 3] }]'
      expect(() => executeTransform(code, sampleData, allSteps)).toThrow(
        'nested'
      )
    })

    it('should throw error for inconsistent keys', () => {
      const code = `return [
        { name: "a", value: 1 },
        { name: "b", other: 2 }
      ]`
      expect(() => executeTransform(code, sampleData, allSteps)).toThrow(
        'Inconsistent keys'
      )
    })

    it('should truncate result to 1000 rows', () => {
      const largeData = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        value: i * 10,
      }))
      const code = `
        const expanded = [];
        for (let i = 0; i < 20; i++) {
          data.forEach(row => expanded.push({ ...row, iteration: i }));
        }
        return expanded;
      `
      // 100 * 20 = 2000 rows, should be truncated to 1000
      const result = executeTransform(code, largeData, { step_0: largeData })
      expect(result.length).toBe(1000)
    })

    it('should throw error for input data too large', () => {
      const hugeData = Array.from({ length: 10001 }, (_, i) => ({ id: i }))
      const code = 'return data'
      expect(() => executeTransform(code, hugeData, { step_0: hugeData })).toThrow(
        'Data too large'
      )
    })

    it('should block dangerous APIs', () => {
      // Test that dangerous globals are undefined
      const code = `
        if (typeof fetch !== 'undefined') throw new Error('fetch should be blocked');
        if (typeof document !== 'undefined') throw new Error('document should be blocked');
        if (typeof window !== 'undefined') throw new Error('window should be blocked');
        return [{ safe: true }];
      `
      const result = executeTransform(code, sampleData, allSteps)
      expect(result).toEqual([{ safe: true }])
    })

    it('should provide safe globals', () => {
      const code = `
        const parsed = JSON.parse('{"x": 1}');
        const stringified = JSON.stringify(parsed);
        const rounded = Math.round(3.7);
        const now = new Date(0).getTime();
        const int = parseInt('42');
        const float = parseFloat('3.14');
        return [{ parsed: parsed.x, rounded, now, int, float }];
      `
      const result = executeTransform(code, sampleData, allSteps)
      expect(result[0]).toEqual({
        parsed: 1,
        rounded: 4,
        now: 0,
        int: 42,
        float: 3.14,
      })
    })

    it('should handle null values in allSteps', () => {
      const steps: Record<string, unknown[] | null> = {
        step_0: sampleData,
        step_1: null,
      }
      const code = 'return [{ hasStep0: !!allSteps.step_0, hasStep1: !!allSteps.step_1 }]'
      const result = executeTransform(code, sampleData, steps)
      expect(result).toEqual([{ hasStep0: true, hasStep1: false }])
    })
  })

  describe('localStorage operations', () => {
    beforeEach(() => {
      clearStoredResults()
    })

    it('should save and retrieve query results', () => {
      const data = [{ id: 1, value: 'test' }]
      saveQueryResult(0, data)

      const results = getStoredResults()
      expect(results.step_0).toEqual(data)
    })

    it('should save multiple steps', () => {
      saveQueryResult(0, [{ step: 0 }])
      saveQueryResult(1, [{ step: 1 }])
      saveQueryResult(2, [{ step: 2 }])

      const results = getStoredResults()
      expect(Object.keys(results)).toHaveLength(3)
      expect(results.step_0).toEqual([{ step: 0 }])
      expect(results.step_1).toEqual([{ step: 1 }])
      expect(results.step_2).toEqual([{ step: 2 }])
    })

    it('should clear stored results', () => {
      saveQueryResult(0, [{ test: true }])
      clearStoredResults()

      const results = getStoredResults()
      expect(results).toEqual({})
    })

    it('should return empty object when no results stored', () => {
      const results = getStoredResults()
      expect(results).toEqual({})
    })
  })
})
