import { describe, it, expect } from 'vitest'
import { buildSystemPrompt, buildUserMessage } from '@/lib/claude/prompt'
import type { TableInfo } from '@/lib/claude/types'

describe('claude/prompt', () => {
  // Sample table info for tests
  const singleTable: TableInfo = {
    tableName: 'sales',
    columns: ['id', 'product', 'amount', 'date'],
    sampleRows: [
      { id: 1, product: 'Widget A', amount: 100, date: '2024-01-15' },
      { id: 2, product: 'Widget B', amount: 200, date: '2024-01-16' },
    ],
    rowCount: 1000,
  }

  const multiTable: TableInfo[] = [
    {
      tableName: 'orders',
      columns: ['order_id', 'customer_id', 'total', 'order_date'],
      sampleRows: [
        { order_id: 1, customer_id: 101, total: 150.00, order_date: '2024-01-10' },
      ],
      rowCount: 500,
    },
    {
      tableName: 'customers',
      columns: ['customer_id', 'name', 'email', 'created_at'],
      sampleRows: [
        { customer_id: 101, name: 'John Doe', email: 'john@example.com', created_at: '2023-06-01' },
      ],
      rowCount: 200,
    },
  ]

  describe('buildSystemPrompt', () => {
    it('should include single table name in prompt', () => {
      const prompt = buildSystemPrompt([singleTable])
      expect(prompt).toContain('"sales"')
    })

    it('should include multiple table names when given array', () => {
      const prompt = buildSystemPrompt(multiTable)
      expect(prompt).toContain('"orders"')
      expect(prompt).toContain('"customers"')
    })

    it('should include "tables" (plural) text for multi-table', () => {
      const prompt = buildSystemPrompt(multiTable)
      expect(prompt).toContain('2 tables')
    })

    it('should include singular "table" for single table', () => {
      const prompt = buildSystemPrompt([singleTable])
      expect(prompt).toContain('a table')
      expect(prompt).not.toContain('tables:')
    })

    it('should include DuckDB reference section', () => {
      const prompt = buildSystemPrompt([singleTable])
      expect(prompt).toContain('DUCKDB SQL REFERENCE')
      expect(prompt).toContain('TRY_CAST')
      expect(prompt).toContain('DATE_TRUNC')
      expect(prompt).toContain('epoch_ms')
    })

    it('should include tool descriptions', () => {
      const prompt = buildSystemPrompt([singleTable])
      expect(prompt).toContain('run_query')
      expect(prompt).toContain('get_column_stats')
      expect(prompt).toContain('get_value_distribution')
      expect(prompt).toContain('transform_data')
      expect(prompt).toContain('final_answer')
    })

    it('should include AVAILABLE TOOLS section', () => {
      const prompt = buildSystemPrompt([singleTable])
      expect(prompt).toContain('AVAILABLE TOOLS')
    })

    it('should include multi-table join instructions for multi-table', () => {
      const prompt = buildSystemPrompt(multiTable)
      expect(prompt).toContain('UNION ALL')
      expect(prompt).toContain('JOIN')
    })

    it('should include data analyst persona', () => {
      const prompt = buildSystemPrompt([singleTable])
      expect(prompt).toContain('expert data analyst')
    })

    it('should include schema verification instructions', () => {
      const prompt = buildSystemPrompt([singleTable])
      expect(prompt).toContain('SCHEMA IS YOUR SOURCE OF TRUTH')
      expect(prompt).toContain('column names')
    })

    it('should include chart data format instructions', () => {
      const prompt = buildSystemPrompt([singleTable])
      expect(prompt).toContain('CHART DATA FORMAT')
      expect(prompt).toContain('WIDE format')
    })

    it('should include transform_data guidance', () => {
      const prompt = buildSystemPrompt([singleTable])
      expect(prompt).toContain('TRANSFORM_DATA')
      expect(prompt).toContain('JavaScript')
    })
  })

  describe('buildUserMessage', () => {
    it('should format single table schema correctly', () => {
      const message = buildUserMessage('Show me sales data', [singleTable])
      expect(message).toContain('Table: "sales"')
      expect(message).toContain('Data Schema:')
    })

    it('should format multiple table schemas with separator', () => {
      const message = buildUserMessage('Join orders and customers', multiTable)
      expect(message).toContain('Table: "orders"')
      expect(message).toContain('Table: "customers"')
      expect(message).toContain('---')
    })

    it('should show "Available Tables:" for multi-table', () => {
      const message = buildUserMessage('Query data', multiTable)
      expect(message).toContain('Available Tables:')
    })

    it('should show "Data Schema:" for single table', () => {
      const message = buildUserMessage('Query data', [singleTable])
      expect(message).toContain('Data Schema:')
      expect(message).not.toContain('Available Tables:')
    })

    it('should include column names', () => {
      const message = buildUserMessage('Show columns', [singleTable])
      expect(message).toContain('Columns:')
      expect(message).toContain('id')
      expect(message).toContain('product')
      expect(message).toContain('amount')
      expect(message).toContain('date')
    })

    it('should include row count', () => {
      const message = buildUserMessage('Count rows', [singleTable])
      expect(message).toContain('Total rows: 1000')
    })

    it('should include sample data as JSON', () => {
      const message = buildUserMessage('Show sample', [singleTable])
      expect(message).toContain('Sample data:')
      expect(message).toContain('"id": 1')
      expect(message).toContain('"product": "Widget A"')
      expect(message).toContain('"amount": 100')
    })

    it('should include user query at the end', () => {
      const query = 'What is the total sales amount?'
      const message = buildUserMessage(query, [singleTable])
      expect(message).toContain('User Question:')
      expect(message).toContain(query)
      // Verify it's at the end
      expect(message.endsWith(query)).toBe(true)
    })

    it('should format sample data with proper JSON indentation', () => {
      const message = buildUserMessage('Show sample', [singleTable])
      // JSON.stringify with null, 2 creates indented JSON
      expect(message).toContain('  "id"')
      expect(message).toContain('  "product"')
    })

    it('should handle tables with empty sample rows', () => {
      const emptyTable: TableInfo = {
        tableName: 'empty_table',
        columns: ['col1', 'col2'],
        sampleRows: [],
        rowCount: 0,
      }
      const message = buildUserMessage('Query empty table', [emptyTable])
      expect(message).toContain('Table: "empty_table"')
      expect(message).toContain('Total rows: 0')
      expect(message).toContain('Sample data:')
      expect(message).toContain('[]')
    })

    it('should include all table info for multi-table queries', () => {
      const message = buildUserMessage('Join data', multiTable)

      // First table
      expect(message).toContain('order_id')
      expect(message).toContain('customer_id')
      expect(message).toContain('total')
      expect(message).toContain('Total rows: 500')

      // Second table
      expect(message).toContain('name')
      expect(message).toContain('email')
      expect(message).toContain('Total rows: 200')
    })

    it('should preserve special characters in column names', () => {
      const tableWithSpecialCols: TableInfo = {
        tableName: 'special_table',
        columns: ['Column Name', 'value-field', 'data_point'],
        sampleRows: [{ 'Column Name': 'test', 'value-field': 123, 'data_point': 456 }],
        rowCount: 10,
      }
      const message = buildUserMessage('Query', [tableWithSpecialCols])
      expect(message).toContain('Column Name')
      expect(message).toContain('value-field')
      expect(message).toContain('data_point')
    })
  })
})
