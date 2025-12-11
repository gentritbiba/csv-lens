// src/lib/claude/tools.ts
// Tool definitions for Claude agent

import type { Tool } from "@anthropic-ai/sdk/resources/messages";

export const agentTools: Tool[] = [
  {
    name: "run_query",
    description: "Execute a SQL query on DuckDB. Use exact column names from the schema provided - never guess or invent column names.",
    input_schema: {
      type: "object" as const,
      properties: {
        thought: {
          type: "string",
          description: "REQUIRED: Explain WHY you need this query and what you expect to learn from it.",
        },
        sql: {
          type: "string",
          description: "The SQL query to execute. MUST use exact column names from the schema.",
        },
      },
      required: ["thought", "sql"],
    },
  },
  {
    name: "get_column_stats",
    description: "Get min, max, avg, and distinct count for a column. Useful for understanding data distribution.",
    input_schema: {
      type: "object" as const,
      properties: {
        thought: {
          type: "string",
          description: "REQUIRED: Explain WHY you need these statistics.",
        },
        column: {
          type: "string",
          description: "The column name - must exactly match a column from the schema.",
        },
        table: {
          type: "string",
          description: "Table name if multiple tables are available.",
        },
      },
      required: ["thought", "column"],
    },
  },
  {
    name: "get_value_distribution",
    description: "Get top N most frequent values in a column. Useful for understanding categorical data.",
    input_schema: {
      type: "object" as const,
      properties: {
        thought: {
          type: "string",
          description: "REQUIRED: Explain WHY you need this distribution.",
        },
        column: {
          type: "string",
          description: "The column name - must exactly match a column from the schema.",
        },
        table: {
          type: "string",
          description: "Table name if multiple tables are available.",
        },
        limit: {
          type: "number",
          description: "Number of top values to return (default 10).",
        },
      },
      required: ["thought", "column"],
    },
  },
  {
    name: "transform_data",
    description: `Run JavaScript on query results. ESSENTIAL for projections, forecasting, and data reshaping.

STEP NUMBERING:
- Your FIRST tool call (run_query, get_column_stats, etc.) = step 0
- Your SECOND tool call = step 1
- Your THIRD tool call = step 2
- And so on...

VARIABLES AVAILABLE:
- data: Array from the step you specify in sourceStep
- allSteps: Object with ALL previous results { step_0: [...], step_1: [...], ... }

OUTPUT FORMAT - CRITICAL:
Your JavaScript MUST return FLAT rows. ONE ROW PER DATA POINT.

CORRECT:
return [
  { month: "2025-12", projected: 100000 },
  { month: "2026-01", projected: 154000 },
];

WRONG (nested objects):
return [{ summary: "data", projections: [{month: 1}] }];

WRONG (single summary row):
return [{ total: 500, data: [...] }];`,
    input_schema: {
      type: "object" as const,
      properties: {
        thought: {
          type: "string",
          description: "REQUIRED: Explain WHY you're transforming the data.",
        },
        code: {
          type: "string",
          description: "JavaScript code. MUST include 'return' statement. Returns array of flat objects.",
        },
        sourceStep: {
          type: "number",
          description: "Which step's result to use as 'data'. 0 = your first tool call, 1 = second, etc. Usually 0 if you only ran one query.",
        },
      },
      required: ["thought", "code", "sourceStep"],
    },
  },
  {
    name: "final_answer",
    description: "Present your analysis. Call this when you have enough data to answer the user's question.",
    input_schema: {
      type: "object" as const,
      properties: {
        answer: {
          type: "string",
          description: "Natural language answer addressing the user's question. Include specific numbers and insights.",
        },
        chartType: {
          type: "string",
          enum: ["bar", "line", "pie", "scatter", "table"],
          description: "bar: comparisons/rankings, line: trends over time, pie: proportions (<8 categories), scatter: correlations, table: detailed records.",
        },
        xAxis: {
          type: "string",
          description: "Column name for x-axis (required for bar, line, scatter).",
        },
        yAxis: {
          type: "string",
          description: "Column name for y-axis (required for bar, line, scatter).",
        },
      },
      required: ["answer", "chartType"],
    },
  },
];

// Tools that need browser-side execution
export const browserExecutedTools = new Set([
  "run_query",
  "get_column_stats",
  "get_value_distribution",
  "transform_data",
]);

// Check if a tool needs browser execution
export function needsBrowserExecution(toolName: string): boolean {
  return browserExecutedTools.has(toolName);
}
