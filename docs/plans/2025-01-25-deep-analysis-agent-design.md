# Deep Analysis Agent Design

## Overview

Add a "Deep Analysis" mode that transforms the app from single-shot SQL generation into an AI agent that can reason through complex questions by running multiple queries.

**Example:** "Why is 2025 Toyota the most common in the inventory?"
- Agent runs query to check make distribution
- Analyzes results
- May run additional queries (by year, by model, etc.)
- Synthesizes a natural language answer with supporting visualization

## User Experience

### Trigger
- Toggle next to chart type selector: "Deep Analysis" (off by default)
- When enabled, placeholder hints: "Ask complex questions like 'Why is X the most common?'"

### Result Display

```
┌─────────────────────────────────────────────┐
│ [Answer]                                     │
│ 2025 Toyota is the most common because...    │
│                                              │
│ [Chart: Bar chart showing make distribution] │
│                                              │
│ ▶ See reasoning (3 queries)                  │
│   └─ Query 1: SELECT make, COUNT(*)...       │
│      Result: [table]                         │
│   └─ Query 2: SELECT year, make...           │
│      Result: [table]                         │
│   └─ Final synthesis                         │
└─────────────────────────────────────────────┘
```

- Final answer prominent at top
- Auto-selected visualization for key insight
- Collapsible reasoning trace (collapsed by default)

## Agent Architecture

### Loop Structure

```
User Question → Agent Loop → Final Answer
                   ↓
            ┌─────────────┐
            │   Think     │ (decide what to do)
            │      ↓      │
            │  Tool Call  │ (run_query, get_stats, etc.)
            │      ↓      │
            │  Observe    │ (analyze results)
            │      ↓      │
            │  Repeat?    │ (need more info? loop back)
            └─────────────┘
```

### Available Tools

| Tool | Purpose | Example |
|------|---------|---------|
| `run_query(sql)` | Execute any SQL query | `SELECT make, COUNT(*) FROM data GROUP BY make` |
| `get_column_stats(column)` | Quick stats for a column | Returns min, max, avg, distinct count, nulls |
| `get_value_distribution(column, limit?)` | Top N values by frequency | Top 10 makes with counts |

### Constraints
- Max 5 tool calls per request
- 60 second timeout
- Model: `gpt-5` for reasoning quality

## Streaming Protocol

Data stays client-side (privacy). Agent and frontend communicate via streaming:

```
┌─────────────┐                    ┌─────────────┐
│   Browser   │                    │   Server    │
│  (DuckDB)   │                    │  (Agent)    │
└─────────────┘                    └─────────────┘
       │                                  │
       │  1. Start analysis (question)    │
       │ ─────────────────────────────────>
       │                                  │
       │  2. Stream: need_query(sql)      │
       │ <─────────────────────────────────
       │                                  │
       │  3. Execute, return results      │
       │ ─────────────────────────────────>
       │                                  │
       │  4. Stream: thinking("...")      │
       │ <─────────────────────────────────
       │                                  │
       │  5. Stream: need_query(sql2)     │
       │ <─────────────────────────────────
       │                                  │
       │  6. Execute, return results      │
       │ ─────────────────────────────────>
       │                                  │
       │  7. Stream: final_answer({...})  │
       │ <─────────────────────────────────
```

### Stream Events
- `thinking` - Agent's reasoning (for trace display)
- `need_query` - Agent requests SQL execution
- `query_result` - Frontend sends back results
- `final_answer` - Agent done, here's the complete answer

## API Design

### Endpoint: `POST /api/analyze`

**Request:**
```typescript
{
  userQuery: string;
  schemaContext: { columns: string[], sampleRows: unknown[], rowCount: number };
  preferredChartType?: ChartType;
}
```

**Response (streamed):**
```typescript
// Streamed events, final structure:
{
  answer: string;              // Final natural language answer
  chartType: ChartType;        // Recommended visualization
  chartData: unknown[];        // Data for the chart
  xAxis?: string;
  yAxis?: string;
  steps: Array<{               // Reasoning trace
    thought: string;           // "I need to check the distribution..."
    tool: string;              // "run_query"
    input: unknown;            // { sql: "SELECT..." }
    result: unknown[];         // Query results
  }>;
}
```

## Error Handling

| Scenario | Handling |
|----------|----------|
| SQL syntax error | Agent sees error, can retry with corrected SQL |
| Query timeout | Return partial results, agent decides to simplify |
| Max iterations hit | Force final answer with "Based on what I found so far..." |
| 60s timeout | Abort loop, return best answer available |
| Network disconnect | Frontend shows "Connection lost", option to retry |
| Empty results | Agent interprets this ("No data matches...") |

### Agent Prompt Guidance
- "If a query fails, analyze the error and try a different approach"
- "If you can't find the answer in 5 queries, synthesize from what you have"
- "Always provide an answer, even if uncertain - qualify with confidence level"

### Graceful Degradation
If deep analysis fails completely, fall back to simple mode with message:
"I couldn't complete the analysis. Here's a simple query that might help: [SQL]"

## File Structure

```
src/
├── app/
│   ├── api/
│   │   ├── generate-sql/route.ts    # Existing (simple mode)
│   │   └── analyze/route.ts         # NEW: Agent endpoint
│   └── page.tsx                     # Add Deep Analysis toggle + new result UI
├── hooks/
│   ├── useChat.ts                   # Existing
│   └── useAnalysis.ts               # NEW: Agent streaming hook
├── lib/
│   ├── openai.ts                    # Existing
│   ├── agent-tools.ts               # NEW: Tool definitions
│   └── agent-protocol.ts            # NEW: Stream event types
└── components/
    └── AnalysisResult.tsx           # NEW: Collapsible trace UI
```

## Summary of Decisions

| Aspect | Decision |
|--------|----------|
| Trigger | User toggle "Deep Analysis" |
| UX | Final answer + chart, collapsible reasoning trace |
| Tools | `run_query`, `get_column_stats`, `get_value_distribution` |
| Limits | 5 iterations, 60s timeout |
| Model | `gpt-5` for agent mode |
| Execution | Client-side DuckDB via streaming protocol |
| Errors | Agent retries, graceful degradation to simple mode |
