import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'

// Custom render function that wraps components with necessary providers
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {}

function AllTheProviders({ children }: { children: React.ReactNode }) {
  // Add any providers your components need
  return <>{children}</>
}

const customRender = (
  ui: ReactElement,
  options?: CustomRenderOptions
) => render(ui, { wrapper: AllTheProviders, ...options })

// Re-export everything from testing-library
export * from '@testing-library/react'
export { customRender as render }

// Test data factories
export const createMockTableInfo = (overrides = {}) => ({
  tableName: 'test_table',
  columns: ['id', 'name', 'value', 'date'],
  sampleRows: [
    { id: 1, name: 'Test 1', value: 100, date: '2025-01-01' },
    { id: 2, name: 'Test 2', value: 200, date: '2025-01-02' },
    { id: 3, name: 'Test 3', value: 300, date: '2025-01-03' },
  ],
  rowCount: 3,
  ...overrides,
})

export const createMockSession = (overrides = {}) => ({
  id: 'test-session-123',
  createdAt: Date.now(),
  lastActivity: Date.now(),
  model: 'low' as const,
  query: 'What are the top values?',
  schema: [createMockTableInfo()],
  messages: [],
  queryResults: {},
  stepIndex: 0,
  iteration: 0,
  pendingToolId: null,
  awaitingToolResult: false,
  useThinking: true,
  ...overrides,
})

export const createMockAnalysisResult = (overrides = {}) => ({
  answer: 'The top value is 300.',
  chartType: 'bar' as const,
  chartData: [
    { name: 'Test 1', value: 100 },
    { name: 'Test 2', value: 200 },
    { name: 'Test 3', value: 300 },
  ],
  xAxis: 'name',
  yAxis: 'value',
  steps: [],
  ...overrides,
})

export const createMockTokenCheckResult = (overrides = {}) => ({
  allowed: true,
  tokensUsed: 50000,
  tokenLimit: 120000,
  tokensRemaining: 100000,
  periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  ...overrides,
})
