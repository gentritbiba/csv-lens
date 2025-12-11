# Integration & E2E Testing Improvement Plan

## Overview

This plan addresses the gaps identified in the integration testing assessment (rated 6/10) and adds comprehensive E2E testing.

**Current State:**
- 23 test files, 516 tests (512 passing, 4 skipped)
- 11/13 API routes tested
- Heavy mocking, no real integration tests
- No E2E tests

**Target State:**
- Full API route coverage
- Real integration tests for core lib modules
- Database integration tests
- SSE stream testing
- E2E tests for critical user flows

---

## Phase 1: Missing API Route Tests

### 1.1 - `/api/analyze/resume` Tests

**File:** `src/__tests__/api/analyze-resume.test.ts`

**Test Cases:**
- Authentication
  - [ ] Return 401 when not logged in
  - [ ] Return 401 when userId is missing
- Request Validation
  - [ ] Return 400 when sessionId is missing
  - [ ] Return 404 when session not found
- Session State
  - [ ] Handle session with no pending tool
  - [ ] Handle session at max iterations
- SSE Response
  - [ ] Return correct SSE headers
  - [ ] Stream thinking events
  - [ ] Stream tool_call events
  - [ ] Stream answer events
  - [ ] Stream done event on completion
  - [ ] Stream error events on failure
- Agent Loop
  - [ ] Process thinking blocks
  - [ ] Process text blocks
  - [ ] Handle final_answer tool
  - [ ] Handle browser-executed tools (run_query, get_column_stats, get_value_distribution)
  - [ ] Handle end_turn without tool use
  - [ ] Record token usage with model multiplier
- Error Handling
  - [ ] Handle Claude API errors gracefully
  - [ ] Clean up session on error

### 1.2 - `/api/reset-tokens-g` Tests

**File:** `src/__tests__/api/reset-tokens-g.test.ts`

**Test Cases:**
- Authentication
  - [ ] Return 401 when not logged in
  - [ ] Return 401 when userId is missing
- Authorization
  - [ ] Return 403 when user is not admin
  - [ ] Return 403 when ADMIN_EMAILS not configured
  - [ ] Allow access for admin emails (case-insensitive)
- Functionality
  - [ ] Reset tokens for all users
  - [ ] Set new period end date (30 days from now)
  - [ ] Return success response with new period end
- Error Handling
  - [ ] Handle database errors gracefully

---

## Phase 2: Lib Integration Tests

### 2.1 - DuckDB Tests

**File:** `src/__tests__/lib/duckdb.test.ts`

**Test Cases:**
- sanitizeIdentifier
  - [ ] Remove special characters
  - [ ] Escape double quotes
  - [ ] Handle empty string
  - [ ] Handle unicode characters
- validateTableName (internal)
  - [ ] Reject empty names
  - [ ] Reject names > 128 chars
  - [ ] Accept valid names
- sanitizeFileName
  - [ ] Replace unsafe characters with underscore
  - [ ] Reject empty names
- executeQuery
  - [ ] Execute simple SELECT
  - [ ] Handle query timeout
  - [ ] Convert BigInt values correctly
- Note: Full DuckDB integration tests require browser environment (WASM)

### 2.2 - Claude Client Tests

**File:** `src/__tests__/lib/claude/client.test.ts`

**Test Cases:**
- getAnthropicClient
  - [ ] Return singleton instance
  - [ ] Use ANTHROPIC_API_KEY from env
- resetClient
  - [ ] Reset singleton for testing

### 2.3 - Claude Prompt Tests

**File:** `src/__tests__/lib/claude/prompt.test.ts`

**Test Cases:**
- buildSystemPrompt
  - [ ] Include single table name
  - [ ] Include multiple table names
  - [ ] Set multi-table flag correctly
  - [ ] Include DuckDB SQL reference
  - [ ] Include tool descriptions
- buildUserMessage
  - [ ] Format single table schema
  - [ ] Format multiple table schemas
  - [ ] Include column names
  - [ ] Include row count
  - [ ] Include sample data
  - [ ] Include user query

### 2.4 - Agent Tools Tests (expand existing)

**File:** `src/__tests__/lib/agent-tools.test.ts`

**Test Cases:**
- executeJavaScript
  - [ ] Execute simple expressions
  - [ ] Access data parameter
  - [ ] Access allSteps parameter
  - [ ] Handle syntax errors
  - [ ] Handle runtime errors
  - [ ] Timeout long-running scripts

---

## Phase 3: Database Integration Tests

### 3.1 - Setup Test Database

**File:** `src/__tests__/db/setup.ts`

- Use SQLite for testing (lighter than PostgreSQL)
- Or use test PostgreSQL instance via environment variable
- Seed test data before each test suite
- Clean up after tests

### 3.2 - Schema Tests

**File:** `src/__tests__/db/schema.test.ts`

**Test Cases:**
- Users table
  - [ ] Create user
  - [ ] Find user by workosId
  - [ ] Update user tier
- Subscriptions table
  - [ ] Create subscription
  - [ ] Find by userId
  - [ ] Find by stripeCustomerId
  - [ ] Update status
- TokenUsage table
  - [ ] Create token usage record
  - [ ] Update tokens used
  - [ ] Reset period

---

## Phase 4: SSE Stream Testing

### 4.1 - SSE Parsing Utilities

**File:** `src/__tests__/utils/sse-parser.ts`

```typescript
export function parseSSEStream(response: Response): AsyncGenerator<SSEEvent>
export function collectSSEEvents(response: Response): Promise<SSEEvent[]>
```

### 4.2 - Analyze Endpoint SSE Tests

**File:** `src/__tests__/api/analyze-sse.test.ts`

**Test Cases:**
- Stream Format
  - [ ] Each event has `data:` prefix
  - [ ] Events separated by double newline
  - [ ] Events are valid JSON
- Event Types
  - [ ] Emit thinking events during processing
  - [ ] Emit extended_thinking for Claude 3.5
  - [ ] Emit tool_call with correct structure
  - [ ] Emit answer with result object
  - [ ] Emit done as final event
  - [ ] Emit error with message
- Stream Lifecycle
  - [ ] Stream starts immediately
  - [ ] Stream closes after done event
  - [ ] Stream closes after error event

---

## Phase 5: E2E Testing Setup

### 5.1 - Install Playwright

```bash
bun add -d @playwright/test
bunx playwright install
```

### 5.2 - Playwright Config

**File:** `playwright.config.ts`

```typescript
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'bun run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

### 5.3 - E2E Test Structure

```
e2e/
├── auth.setup.ts          # Authentication setup
├── fixtures/
│   └── test-data.csv      # Test CSV file
├── auth/
│   ├── login.spec.ts      # Login flow tests
│   └── logout.spec.ts     # Logout flow tests
├── analyze/
│   ├── upload.spec.ts     # File upload tests
│   ├── query.spec.ts      # Analysis query tests
│   └── results.spec.ts    # Results display tests
└── subscription/
    └── upgrade.spec.ts    # Stripe checkout flow
```

---

## Phase 6: E2E Test Cases

### 6.1 - Authentication Flow

**File:** `e2e/auth/login.spec.ts`

**Test Cases:**
- [ ] Landing page shows login button
- [ ] Login redirects to WorkOS
- [ ] Successful callback redirects to /app
- [ ] Failed callback shows error message
- [ ] Session persists across page reloads
- [ ] Logout clears session and redirects

### 6.2 - File Upload & Analysis Flow

**File:** `e2e/analyze/upload.spec.ts`

**Test Cases:**
- [ ] Upload CSV via drag and drop
- [ ] Upload CSV via file picker
- [ ] Display column names after upload
- [ ] Display sample rows preview
- [ ] Show row count
- [ ] Handle invalid file format
- [ ] Handle empty file
- [ ] Handle large file (>10MB warning)

### 6.3 - Analysis Query Flow

**File:** `e2e/analyze/query.spec.ts`

**Test Cases:**
- [ ] Enter analysis query
- [ ] Select model tier (low/high/pro)
- [ ] Toggle thinking mode
- [ ] Start analysis
- [ ] Show loading state
- [ ] Display thinking steps
- [ ] Handle tool execution (SQL queries)
- [ ] Display final answer
- [ ] Show appropriate chart type
- [ ] Handle analysis errors
- [ ] Cancel ongoing analysis

### 6.4 - Results Display Flow

**File:** `e2e/analyze/results.spec.ts`

**Test Cases:**
- [ ] Display table results
- [ ] Display bar chart
- [ ] Display line chart
- [ ] Display pie chart
- [ ] Switch between chart types
- [ ] Export results as CSV
- [ ] Export results as PDF
- [ ] Copy results to clipboard

### 6.5 - Token Usage Flow

**File:** `e2e/subscription/tokens.spec.ts`

**Test Cases:**
- [ ] Display token usage in header
- [ ] Update usage after analysis
- [ ] Show warning at 80% usage
- [ ] Block analysis at 100% usage
- [ ] Show upgrade prompt when limit reached

---

## Implementation Order

1. **Phase 1** (Day 1): Missing API route tests - Quick wins, fills coverage gaps
2. **Phase 2** (Day 1-2): Lib integration tests - Test core utilities
3. **Phase 4** (Day 2): SSE stream tests - Critical for analyze endpoint
4. **Phase 5** (Day 2): E2E setup - Install Playwright, configure
5. **Phase 6** (Day 3-4): E2E tests - Critical user flows
6. **Phase 3** (Optional): Database integration - Lower priority, heavy setup

---

## Success Metrics

After implementation:
- [ ] All 13 API routes have tests
- [ ] 90%+ code coverage on lib/ directory
- [ ] SSE streams verified end-to-end
- [ ] E2E tests cover login → upload → analyze → results flow
- [ ] CI/CD runs all tests on PR
- [ ] Rating: 9/10

---

## Files to Create

1. `src/__tests__/api/analyze-resume.test.ts`
2. `src/__tests__/api/reset-tokens-g.test.ts`
3. `src/__tests__/lib/duckdb.test.ts`
4. `src/__tests__/lib/claude/client.test.ts`
5. `src/__tests__/lib/claude/prompt.test.ts`
6. `src/__tests__/lib/agent-tools.test.ts`
7. `src/__tests__/api/analyze-sse.test.ts`
8. `src/__tests__/utils/sse-parser.ts`
9. `playwright.config.ts`
10. `e2e/auth/login.spec.ts`
11. `e2e/auth/logout.spec.ts`
12. `e2e/analyze/upload.spec.ts`
13. `e2e/analyze/query.spec.ts`
14. `e2e/analyze/results.spec.ts`
15. `e2e/subscription/tokens.spec.ts`
16. `e2e/fixtures/test-data.csv`
