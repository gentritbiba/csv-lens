import { describe, it, expect } from 'vitest'
import { normalizeSchemaContext, type TableInfo } from '@/lib/schema-utils'

describe('schema-utils', () => {
  describe('normalizeSchemaContext', () => {
    const singleTable: TableInfo = {
      tableName: 'users',
      columns: ['id', 'name', 'email'],
      sampleRows: [{ id: 1, name: 'Alice', email: 'alice@example.com' }],
      rowCount: 100,
    }

    const secondTable: TableInfo = {
      tableName: 'orders',
      columns: ['id', 'user_id', 'amount'],
      sampleRows: [{ id: 1, user_id: 1, amount: 99.99 }],
      rowCount: 50,
    }

    it('should wrap single table in array', () => {
      const result = normalizeSchemaContext(singleTable)
      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(1)
      expect(result[0]).toBe(singleTable)
    })

    it('should return array as-is when given array', () => {
      const tables = [singleTable, secondTable]
      const result = normalizeSchemaContext(tables)
      expect(result).toBe(tables)
      expect(result).toHaveLength(2)
    })

    it('should handle empty array', () => {
      const result = normalizeSchemaContext([])
      expect(result).toEqual([])
    })

    it('should preserve table properties', () => {
      const result = normalizeSchemaContext(singleTable)
      expect(result[0].tableName).toBe('users')
      expect(result[0].columns).toEqual(['id', 'name', 'email'])
      expect(result[0].rowCount).toBe(100)
    })
  })
})
