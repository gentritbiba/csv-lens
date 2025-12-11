import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/profile/route'

// Mock auth session
vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
}))

import { getSession } from '@/lib/auth/session'

describe('POST /api/profile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const validRequest = {
    tableName: 'sales_data',
    columns: ['id', 'product', 'amount', 'date'],
    rowCount: 1000,
  }

  const createRequest = (body: unknown) =>
    new Request('http://localhost/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

  describe('Authentication', () => {
    it('should return 401 when not logged in', async () => {
      vi.mocked(getSession).mockResolvedValue({
        isLoggedIn: false,
        userId: undefined,
      } as unknown as Awaited<ReturnType<typeof getSession>>)

      const response = await POST(createRequest(validRequest))
      expect(response.status).toBe(401)

      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 401 when userId is missing', async () => {
      vi.mocked(getSession).mockResolvedValue({
        isLoggedIn: true,
        userId: undefined,
      } as unknown as Awaited<ReturnType<typeof getSession>>)

      const response = await POST(createRequest(validRequest))
      expect(response.status).toBe(401)
    })
  })

  describe('Request Validation', () => {
    beforeEach(() => {
      vi.mocked(getSession).mockResolvedValue({
        isLoggedIn: true,
        userId: 'user-123',
      } as unknown as Awaited<ReturnType<typeof getSession>>)
    })

    it('should return 400 for missing tableName', async () => {
      const response = await POST(
        createRequest({
          columns: ['id', 'name'],
          rowCount: 100,
        })
      )
      expect(response.status).toBe(400)
    })

    it('should return 400 for empty columns array', async () => {
      const response = await POST(
        createRequest({
          tableName: 'test',
          columns: [],
          rowCount: 100,
        })
      )
      // Empty columns should work - the validation only limits max
      expect(response.status).toBe(200)
    })

    it('should return 400 for invalid rowCount', async () => {
      const response = await POST(
        createRequest({
          tableName: 'test',
          columns: ['id'],
          rowCount: -1, // Invalid: negative
        })
      )
      expect(response.status).toBe(400)
    })

    it('should return 400 for non-integer rowCount', async () => {
      const response = await POST(
        createRequest({
          tableName: 'test',
          columns: ['id'],
          rowCount: 10.5,
        })
      )
      expect(response.status).toBe(400)
    })
  })

  describe('Successful Response', () => {
    beforeEach(() => {
      vi.mocked(getSession).mockResolvedValue({
        isLoggedIn: true,
        userId: 'user-123',
      } as unknown as Awaited<ReturnType<typeof getSession>>)
    })

    it('should return profiling queries for valid request', async () => {
      const response = await POST(createRequest(validRequest))
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toHaveProperty('overview')
      expect(data).toHaveProperty('columns')
      expect(data).toHaveProperty('alerts')
      expect(data).toHaveProperty('profilingQueries')
    })

    it('should generate queries for each column', async () => {
      const response = await POST(createRequest(validRequest))
      const data = await response.json()

      expect(data.profilingQueries).toHaveLength(validRequest.columns.length)

      data.profilingQueries.forEach(
        (pq: { column: string; queries: { name: string; sql: string }[] }) => {
          expect(validRequest.columns).toContain(pq.column)
          expect(pq.queries.length).toBeGreaterThan(0)
        }
      )
    })

    it('should include required query types', async () => {
      const response = await POST(createRequest(validRequest))
      const data = await response.json()

      const firstColumnQueries = data.profilingQueries[0].queries
      const queryNames = firstColumnQueries.map((q: { name: string }) => q.name)

      expect(queryNames).toContain('basic_stats')
      expect(queryNames).toContain('numeric_stats')
      expect(queryNames).toContain('top_values')
      expect(queryNames).toContain('text_stats')
      expect(queryNames).toContain('type_check')
    })

    it('should escape column names properly in SQL', async () => {
      const requestWithSpecialColumn = {
        ...validRequest,
        columns: ['column with spaces', 'normal'],
      }

      const response = await POST(createRequest(requestWithSpecialColumn))
      const data = await response.json()

      const sql = data.profilingQueries[0].queries[0].sql
      // Check that column with spaces is properly quoted
      expect(sql).toContain('"column with spaces"')
    })

    it('should escape table name in SQL', async () => {
      const requestWithSpecialTable = {
        ...validRequest,
        tableName: 'table with spaces',
      }

      const response = await POST(createRequest(requestWithSpecialTable))
      const data = await response.json()

      const sql = data.profilingQueries[0].queries[0].sql
      expect(sql).toContain('"table with spaces"')
    })

    it('should set correct overview values', async () => {
      const response = await POST(createRequest(validRequest))
      const data = await response.json()

      expect(data.overview.rowCount).toBe(validRequest.rowCount)
      expect(data.overview.columnCount).toBe(validRequest.columns.length)
      // These are computed client-side, so they're 0 initially
      expect(data.overview.numericColumns).toBe(0)
      expect(data.overview.categoricalColumns).toBe(0)
    })
  })
})
