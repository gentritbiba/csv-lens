# Claude Agent SDK Migration Design

**Date:** 2025-12-01
**Status:** Approved

## Overview

Migrate from Vercel AI SDK (OpenAI) to Anthropic Claude API for the data analysis platform. The browser continues to execute SQL queries via DuckDB WASM while the server manages the Claude conversation via SSE streaming.

## Architecture

### Server-Side (Next.js API Routes)

```
/api/analyze (GET) → Starts SSE stream
  ├── Creates Anthropic client
  ├── Sends messages to Claude with tool definitions
  ├── Streams responses via SSE
  └── Pauses when tool needs browser execution

/api/analyze/tool-result (POST) → Resumes after tool execution
  ├── Receives tool result from browser
  ├── Continues Claude conversation
  └── Continues SSE stream
```

### Browser-Side

```
useAnalysis hook
  ├── Opens EventSource to /api/analyze
  ├── Receives streamed thoughts/tool calls
  ├── When tool_call received:
  │   ├── Execute locally (DuckDB query, JS transform)
  │   └── POST result to /api/analyze/tool-result
  └── When final_answer received → display result
```

### Session State

In-memory Map with session ID. Sessions expire after 5 minutes of inactivity.

## Models

All models support extended thinking when enabled.

| Tier | Model ID | Token Multiplier | Use Case |
|------|----------|------------------|----------|
| pro | claude-opus-4-5 | 5x | Most capable, extended thinking |
| high | claude-sonnet-4-5 | 3x | Balanced performance and cost |
| low | claude-haiku-4-5 | 1x | Fast responses, lowest cost |

### Token Multipliers

Token consumption is calculated as: `tokens_used × model_multiplier`. This enables tiered pricing where higher-capability models consume more tokens against user limits.

Example:
- 1000 tokens on Pro: 1000 × 5 = 5000 tokens against limit
- 1000 tokens on Low: 1000 × 1 = 1000 tokens against limit

## SSE Message Format

```typescript
type SSEEvent =
  | { type: "session"; sessionId: string }        // First event - session ID
  | { type: "thinking"; content: string }          // Claude's reasoning
  | { type: "tool_call"; id: string; name: string; input: unknown }
  | { type: "answer"; result: AnalysisResult }     // Final answer
  | { type: "error"; message: string }             // Error occurred
  | { type: "done" }                               // Stream complete
```

## Tools (Simplified)

Removed planning tools (evaluate_progress, create_plan, rethink_plan). Claude Sonnet 4.5 reasons well without explicit planning scaffolding.

| Tool | Description | Execution |
|------|-------------|-----------|
| run_query | Execute SQL query | Browser (DuckDB WASM) |
| get_column_stats | Column statistics | Browser (generates SQL) |
| get_value_distribution | Value frequency | Browser (generates SQL) |
| transform_data | JavaScript transform | Browser (JS execution) |
| final_answer | Present result | Server (returns to client) |

### Tool Schemas

```typescript
const tools = [
  {
    name: "run_query",
    description: "Execute a SQL query on DuckDB. Use exact column names from schema.",
    input_schema: {
      type: "object",
      properties: {
        thought: { type: "string", description: "Why you need this query" },
        sql: { type: "string", description: "The SQL query to execute" }
      },
      required: ["thought", "sql"]
    }
  },
  {
    name: "get_column_stats",
    description: "Get min/max/avg/distinct count for a column.",
    input_schema: {
      type: "object",
      properties: {
        thought: { type: "string" },
        column: { type: "string" },
        table: { type: "string", description: "Table name if multiple tables" }
      },
      required: ["thought", "column"]
    }
  },
  {
    name: "get_value_distribution",
    description: "Get top N most frequent values in a column.",
    input_schema: {
      type: "object",
      properties: {
        thought: { type: "string" },
        column: { type: "string" },
        table: { type: "string" },
        limit: { type: "number", description: "Number of values (default 10)" }
      },
      required: ["thought", "column"]
    }
  },
  {
    name: "transform_data",
    description: "Run JavaScript on query results. Return flat array of objects.",
    input_schema: {
      type: "object",
      properties: {
        thought: { type: "string" },
        code: { type: "string", description: "JS code, receives 'data' and 'allSteps'" },
        sourceStep: { type: "number", description: "Step index to use as 'data'" }
      },
      required: ["thought", "code", "sourceStep"]
    }
  },
  {
    name: "final_answer",
    description: "Present your analysis. Call when you have enough data.",
    input_schema: {
      type: "object",
      properties: {
        answer: { type: "string", description: "Natural language answer with numbers" },
        chartType: { type: "string", enum: ["bar", "line", "pie", "scatter", "table"] },
        xAxis: { type: "string" },
        yAxis: { type: "string" }
      },
      required: ["answer", "chartType"]
    }
  }
]
```

## File Changes

### Files to Create

```
src/lib/claude/
  ├── types.ts        # SSE event types, session types
  ├── client.ts       # Anthropic client setup
  ├── tools.ts        # Tool definitions
  ├── sessions.ts     # In-memory session store
  └── prompt.ts       # System prompt builder
```

### Files to Modify

- `src/app/api/analyze/route.ts` - Rewrite: SSE streaming with Claude
- `src/app/api/analyze/tool-result/route.ts` - New: handle tool results
- `src/app/api/generate-sql/route.ts` - Rewrite: simple Claude call
- `src/hooks/useAnalysis.ts` - Rewrite: EventSource + tool execution
- `src/models.ts` - Update for Claude models

### Files to Delete

- `src/lib/openai.ts` - No longer needed

## Implementation Steps

1. Create `src/lib/claude/` module with all types and helpers
2. Rewrite `/api/analyze` with SSE streaming
3. Create `/api/analyze/tool-result` endpoint
4. Rewrite `useAnalysis` hook with EventSource
5. Rewrite `/api/generate-sql` with Claude
6. Update `src/models.ts` for Claude models
7. Delete deprecated files
8. Test end-to-end

## Environment Variables

```env
# Remove
OPENAI_API_KEY=...

# Add
ANTHROPIC_API_KEY=...
```
