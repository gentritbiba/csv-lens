import { describe, it, expect } from 'vitest'
import {
  countTokens,
  countDataTokens,
  formatTokenSummary,
  TOKEN_LIMIT,
} from '@/lib/token-counter'

describe('token-counter', () => {
  describe('countTokens', () => {
    it('should return 0 for empty string', () => {
      expect(countTokens('')).toBe(0)
    })

    it('should return 0 for null/undefined', () => {
      expect(countTokens(null as unknown as string)).toBe(0)
      expect(countTokens(undefined as unknown as string)).toBe(0)
    })

    it('should count tokens for simple text', () => {
      const tokens = countTokens('Hello, world!')
      expect(tokens).toBeGreaterThan(0)
      expect(tokens).toBeLessThan(10) // "Hello, world!" is about 4 tokens
    })

    it('should count tokens for longer text', () => {
      const shortText = 'Hello'
      const longText = 'Hello world, this is a longer sentence with more words.'
      expect(countTokens(longText)).toBeGreaterThan(countTokens(shortText))
    })

    it('should count tokens for JSON data', () => {
      const json = JSON.stringify({ name: 'test', value: 123 })
      expect(countTokens(json)).toBeGreaterThan(0)
    })
  })

  describe('countDataTokens', () => {
    it('should return zeros for empty array', () => {
      const result = countDataTokens([])
      expect(result).toEqual({ total: 0, byField: {}, rowCount: 0 })
    })

    it('should return zeros for null/undefined', () => {
      expect(countDataTokens(null as unknown as unknown[])).toEqual({
        total: 0,
        byField: {},
        rowCount: 0,
      })
    })

    it('should count tokens for array of objects', () => {
      const data = [
        { name: 'Alice', score: 100 },
        { name: 'Bob', score: 200 },
        { name: 'Charlie', score: 300 },
      ]
      const result = countDataTokens(data)

      expect(result.rowCount).toBe(3)
      expect(result.total).toBeGreaterThan(0)
      expect(result.byField).toHaveProperty('name')
      expect(result.byField).toHaveProperty('score')
    })

    it('should handle null/undefined values in data', () => {
      const data = [
        { name: 'Alice', score: null },
        { name: null, score: 200 },
        { name: 'Charlie', score: undefined },
      ]
      const result = countDataTokens(data)

      expect(result.rowCount).toBe(3)
      expect(result.total).toBeGreaterThan(0)
    })

    it('should handle nested objects by stringifying', () => {
      const data = [
        { name: 'Test', meta: { nested: 'value' } },
      ]
      const result = countDataTokens(data)

      expect(result.total).toBeGreaterThan(0)
      expect(result.byField.meta).toBeGreaterThan(0)
    })

    it('should handle non-object data with fallback', () => {
      const data = ['string1', 'string2'] as unknown[]
      const result = countDataTokens(data)

      expect(result.rowCount).toBe(2)
      expect(result.byField).toHaveProperty('_data')
    })
  })

  describe('formatTokenSummary', () => {
    it('should format token summary correctly', () => {
      const tokenInfo = {
        total: 1500,
        byField: {
          description: 1000,
          name: 300,
          id: 200,
        },
        rowCount: 50,
      }

      const summary = formatTokenSummary(tokenInfo)

      expect(summary).toContain('50 rows')
      expect(summary).toContain('1,500 tokens')
      expect(summary).toContain('description: 1,000 tokens')
      expect(summary).toContain('name: 300 tokens')
      expect(summary).toContain('id: 200 tokens')
    })

    it('should sort fields by token count (highest first)', () => {
      const tokenInfo = {
        total: 600,
        byField: {
          small: 100,
          large: 400,
          medium: 100,
        },
        rowCount: 10,
      }

      const summary = formatTokenSummary(tokenInfo)
      const largeIndex = summary.indexOf('large')
      const mediumIndex = summary.indexOf('medium')
      const smallIndex = summary.indexOf('small')

      expect(largeIndex).toBeLessThan(mediumIndex)
      expect(largeIndex).toBeLessThan(smallIndex)
    })
  })

  describe('TOKEN_LIMIT', () => {
    it('should be a positive number', () => {
      expect(TOKEN_LIMIT).toBeGreaterThan(0)
    })

    it('should be 5000', () => {
      expect(TOKEN_LIMIT).toBe(5000)
    })
  })
})
