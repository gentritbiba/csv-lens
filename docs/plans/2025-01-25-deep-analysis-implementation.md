# Deep Analysis Agent Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an agentic "Deep Analysis" mode that iteratively runs multiple queries to answer complex analytical questions.

**Architecture:** Streaming bidirectional protocol between server (agent reasoning) and client (DuckDB execution). Agent sends `need_query` events, client executes SQL and returns results, agent continues reasoning until `final_answer`.

**Tech Stack:** Next.js 16 App Router, Vercel AI SDK (`ai` + `@ai-sdk/openai`), DuckDB WASM (client-side), Server-Sent Events for streaming.

---

## Task 1: Agent Protocol Types

**Files:**
- Create: `src/lib/agent-protocol.ts`

**Step 1: Create stream event types**

```typescript
// src/lib/agent-protocol.ts

// Events sent from server to client
export type ServerEvent =
  | { type: "thinking"; content: string }
  | { type: "need_query"; id: string; sql: string; tool: string }
  | { type: "final_answer"; answer: AnalysisResult }
  | { type: "error"; message: string };

// Events sent from client to server
export type ClientEvent = {
  type: "query_result";
  id: string;
  result: unknown[] | null;
  error?: string;
};

// Final analysis result structure
export interface AnalysisResult {
  answer: string;
  chartType: "bar" | "line" | "pie" | "scatter" | "table";
  chartData: unknown[];
  xAxis?: string;
  yAxis?: string;
  steps: AnalysisStep[];
}

export interface AnalysisStep {
  thought: string;
  tool: string;
  input: unknown;
  result: unknown[] | null;
  error?: string;
}

// Schema context for agent
export interface AgentSchemaContext {
  columns: string[];
  sampleRows: unknown[];
  rowCount: number;
}

// Analysis request
export interface AnalysisRequest {
  userQuery: string;
  schemaContext: AgentSchemaContext;
  preferredChartType?: "auto" | "bar" | "line" | "pie" | "scatter" | "table";
}

// Constants
export const AGENT_CONFIG = {
  maxIterations: 5,
  timeoutMs: 60000,
  model: "gpt-5",
} as const;
```

**Step 2: Verify types compile**

Run: `bunx tsc --noEmit src/lib/agent-protocol.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/agent-protocol.ts
git commit -m "feat: add agent protocol types for deep analysis"
```

---

## Task 2: Agent Tools Definition

**Files:**
- Create: `src/lib/agent-tools.ts`

**Step 1: Define tool schemas**

```typescript
// src/lib/agent-tools.ts
import { z } from "zod";

export const runQueryTool = {
  name: "run_query",
  description: "Execute a SQL query against the data table. The table is named 'data'. Use DuckDB SQL syntax.",
  parameters: z.object({
    sql: z.string().describe("The SQL query to execute"),
  }),
};

export const getColumnStatsTool = {
  name: "get_column_stats",
  description: "Get statistics for a specific column: min, max, avg (for numeric), distinct count, null count.",
  parameters: z.object({
    column: z.string().describe("The column name to analyze"),
  }),
};

export const getValueDistributionTool = {
  name: "get_value_distribution",
  description: "Get the top N most frequent values in a column with their counts.",
  parameters: z.object({
    column: z.string().describe("The column name to analyze"),
    limit: z.number().optional().default(10).describe("Number of top values to return (default 10)"),
  }),
};

export const agentTools = {
  run_query: runQueryTool,
  get_column_stats: getColumnStatsTool,
  get_value_distribution: getValueDistributionTool,
};

export type AgentToolName = keyof typeof agentTools;

// Helper to generate SQL for get_column_stats
export function generateColumnStatsSQL(column: string): string {
  return `
    SELECT
      MIN("${column}") as min_value,
      MAX("${column}") as max_value,
      AVG(TRY_CAST("${column}" AS DOUBLE)) as avg_value,
      COUNT(DISTINCT "${column}") as distinct_count,
      COUNT(*) - COUNT("${column}") as null_count
    FROM data
  `.trim();
}

// Helper to generate SQL for get_value_distribution
export function generateDistributionSQL(column: string, limit: number = 10): string {
  return `
    SELECT "${column}" as value, COUNT(*) as count
    FROM data
    GROUP BY "${column}"
    ORDER BY count DESC
    LIMIT ${limit}
  `.trim();
}
```

**Step 2: Verify tools compile**

Run: `bunx tsc --noEmit src/lib/agent-tools.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/agent-tools.ts
git commit -m "feat: add agent tool definitions for deep analysis"
```

---

## Task 3: Analysis API Route (Streaming Agent)

**Files:**
- Create: `src/app/api/analyze/route.ts`

**Step 1: Create the streaming agent endpoint**

```typescript
// src/app/api/analyze/route.ts
import { openai } from "@ai-sdk/openai";
import { streamText, tool } from "ai";
import { z } from "zod";
import {
  AGENT_CONFIG,
  type AnalysisRequest,
  type AnalysisStep,
  type ServerEvent,
} from "@/lib/agent-protocol";

export const maxDuration = 60;

const systemPrompt = `You are a data analyst AI agent. Your task is to answer questions about data by running SQL queries.

You have access to a table called "data" with the user's CSV data. You can run multiple queries to explore and analyze the data.

IMPORTANT RULES:
1. Start by understanding what the user is asking
2. Run queries to gather the information you need
3. Analyze results and decide if you need more queries
4. After at most 5 queries, synthesize your findings into a final answer
5. Always provide a clear, natural language answer with supporting data

DuckDB SQL syntax notes:
- Table is always named "data"
- For Unix timestamps in milliseconds: epoch_ms(column_name)
- For Unix timestamps in seconds: to_timestamp(column_name)
- For date truncation: DATE_TRUNC('day', timestamp_column)
- String matching: column ILIKE '%pattern%'

When you have enough information, provide:
1. A clear answer to the user's question
2. The most relevant chart type for visualization
3. The data to display in that chart`;

export async function POST(request: Request) {
  const encoder = new TextEncoder();

  const { userQuery, schemaContext, preferredChartType } =
    (await request.json()) as AnalysisRequest;

  const steps: AnalysisStep[] = [];
  let iterationCount = 0;

  const userPrompt = `Data Schema:
Columns: ${schemaContext.columns.join(", ")}
Total rows: ${schemaContext.rowCount}
Sample data (first 5 rows):
${JSON.stringify(schemaContext.sampleRows, null, 2)}

User Question: ${userQuery}

Analyze this data to answer the user's question. Use the available tools to run queries and gather information.`;

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: ServerEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        const result = await streamText({
          model: openai(AGENT_CONFIG.model),
          system: systemPrompt,
          prompt: userPrompt,
          maxSteps: AGENT_CONFIG.maxIterations,
          tools: {
            run_query: tool({
              description: "Execute a SQL query against the data table named 'data'",
              parameters: z.object({
                sql: z.string().describe("The SQL query to execute"),
              }),
              execute: async ({ sql }) => {
                iterationCount++;
                const queryId = `query_${iterationCount}`;

                // Send query request to client
                sendEvent({
                  type: "need_query",
                  id: queryId,
                  sql,
                  tool: "run_query",
                });

                // Wait for client response - this is handled by the streaming protocol
                // In this implementation, we'll return a placeholder that signals
                // the need for client-side execution
                return { pending: true, queryId, sql };
              },
            }),
            get_column_stats: tool({
              description: "Get statistics for a column: min, max, avg, distinct count, null count",
              parameters: z.object({
                column: z.string().describe("The column name"),
              }),
              execute: async ({ column }) => {
                iterationCount++;
                const sql = `
                  SELECT
                    MIN("${column}") as min_value,
                    MAX("${column}") as max_value,
                    AVG(TRY_CAST("${column}" AS DOUBLE)) as avg_value,
                    COUNT(DISTINCT "${column}") as distinct_count,
                    COUNT(*) - COUNT("${column}") as null_count
                  FROM data
                `.trim();

                sendEvent({
                  type: "need_query",
                  id: `stats_${iterationCount}`,
                  sql,
                  tool: "get_column_stats",
                });

                return { pending: true, queryId: `stats_${iterationCount}`, sql };
              },
            }),
            get_value_distribution: tool({
              description: "Get top N most frequent values in a column",
              parameters: z.object({
                column: z.string().describe("The column name"),
                limit: z.number().optional().default(10),
              }),
              execute: async ({ column, limit }) => {
                iterationCount++;
                const sql = `
                  SELECT "${column}" as value, COUNT(*) as count
                  FROM data
                  GROUP BY "${column}"
                  ORDER BY count DESC
                  LIMIT ${limit}
                `.trim();

                sendEvent({
                  type: "need_query",
                  id: `dist_${iterationCount}`,
                  sql,
                  tool: "get_value_distribution",
                });

                return { pending: true, queryId: `dist_${iterationCount}`, sql };
              },
            }),
          },
          onStepFinish: ({ text, toolCalls, toolResults }) => {
            if (text) {
              sendEvent({ type: "thinking", content: text });
            }

            // Track steps for the trace
            toolCalls?.forEach((call, i) => {
              const toolResult = toolResults?.[i];
              steps.push({
                thought: text || "",
                tool: call.toolName,
                input: call.args,
                result: toolResult?.result || null,
              });
            });
          },
        });

        // Get the final text
        const finalText = await result.text;

        // Determine chart recommendation
        const chartType = preferredChartType && preferredChartType !== "auto"
          ? preferredChartType
          : "bar"; // Default, will be enhanced with actual analysis

        // Get the last query result for chart data
        const lastQueryResult = steps.length > 0 ? steps[steps.length - 1].result : [];

        sendEvent({
          type: "final_answer",
          answer: {
            answer: finalText,
            chartType: chartType as "bar" | "line" | "pie" | "scatter" | "table",
            chartData: (lastQueryResult as unknown[]) || [],
            steps,
          },
        });

        controller.close();
      } catch (error) {
        sendEvent({
          type: "error",
          message: error instanceof Error ? error.message : "Analysis failed",
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
```

**Step 2: Verify route compiles**

Run: `bunx tsc --noEmit src/app/api/analyze/route.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add src/app/api/analyze/route.ts
git commit -m "feat: add streaming analysis API route with agent loop"
```

---

## Task 4: Analysis Hook (Client-Side)

**Files:**
- Create: `src/hooks/useAnalysis.ts`

**Step 1: Create the streaming analysis hook**

```typescript
// src/hooks/useAnalysis.ts
"use client";

import { useState, useCallback, useRef } from "react";
import {
  type ServerEvent,
  type AnalysisResult,
  type AnalysisStep,
  type AgentSchemaContext,
  AGENT_CONFIG,
} from "@/lib/agent-protocol";
import { ChartType } from "@/lib/openai";

export interface UseAnalysisOptions {
  onComplete?: (result: AnalysisResult) => void;
}

export interface UseAnalysisReturn {
  isAnalyzing: boolean;
  currentThought: string | null;
  steps: AnalysisStep[];
  result: AnalysisResult | null;
  error: string | null;
  analyze: (
    query: string,
    schemaContext: AgentSchemaContext,
    runQuery: (sql: string) => Promise<unknown[]>,
    preferredChartType?: ChartType
  ) => Promise<void>;
  reset: () => void;
}

export function useAnalysis(options?: UseAnalysisOptions): UseAnalysisReturn {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentThought, setCurrentThought] = useState<string | null>(null);
  const [steps, setSteps] = useState<AnalysisStep[]>([]);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const pendingQueriesRef = useRef<Map<string, { resolve: (data: unknown[]) => void; reject: (err: Error) => void }>>(new Map());

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsAnalyzing(false);
    setCurrentThought(null);
    setSteps([]);
    setResult(null);
    setError(null);
    pendingQueriesRef.current.clear();
  }, []);

  const analyze = useCallback(
    async (
      query: string,
      schemaContext: AgentSchemaContext,
      runQuery: (sql: string) => Promise<unknown[]>,
      preferredChartType?: ChartType
    ) => {
      reset();
      setIsAnalyzing(true);

      abortControllerRef.current = new AbortController();
      const timeoutId = setTimeout(() => {
        abortControllerRef.current?.abort();
        setError("Analysis timed out after 60 seconds");
        setIsAnalyzing(false);
      }, AGENT_CONFIG.timeoutMs);

      try {
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userQuery: query,
            schemaContext,
            preferredChartType,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`Analysis failed: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;

            const eventData = line.slice(6);
            if (!eventData) continue;

            try {
              const event: ServerEvent = JSON.parse(eventData);

              switch (event.type) {
                case "thinking":
                  setCurrentThought(event.content);
                  break;

                case "need_query":
                  // Execute query locally and continue
                  try {
                    const queryResult = await runQuery(event.sql);
                    setSteps((prev) => [
                      ...prev,
                      {
                        thought: currentThought || "",
                        tool: event.tool,
                        input: { sql: event.sql },
                        result: queryResult,
                      },
                    ]);
                  } catch (queryError) {
                    setSteps((prev) => [
                      ...prev,
                      {
                        thought: currentThought || "",
                        tool: event.tool,
                        input: { sql: event.sql },
                        result: null,
                        error: queryError instanceof Error ? queryError.message : "Query failed",
                      },
                    ]);
                  }
                  break;

                case "final_answer":
                  setResult(event.answer);
                  options?.onComplete?.(event.answer);
                  break;

                case "error":
                  setError(event.message);
                  break;
              }
            } catch (parseError) {
              console.error("Failed to parse event:", parseError);
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          setError(err.message);
        }
      } finally {
        clearTimeout(timeoutId);
        setIsAnalyzing(false);
        setCurrentThought(null);
      }
    },
    [options, reset, currentThought]
  );

  return {
    isAnalyzing,
    currentThought,
    steps,
    result,
    error,
    analyze,
    reset,
  };
}
```

**Step 2: Verify hook compiles**

Run: `bunx tsc --noEmit src/hooks/useAnalysis.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add src/hooks/useAnalysis.ts
git commit -m "feat: add useAnalysis hook for streaming agent communication"
```

---

## Task 5: Analysis Result Component (Collapsible Trace)

**Files:**
- Create: `src/components/AnalysisResult.tsx`

**Step 1: Create the result component with collapsible trace**

```typescript
// src/components/AnalysisResult.tsx
"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { type AnalysisResult as AnalysisResultType, type AnalysisStep } from "@/lib/agent-protocol";

const CHART_COLORS = [
  "#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
];

interface AnalysisResultProps {
  result: AnalysisResultType;
  isLoading?: boolean;
  currentThought?: string | null;
  steps?: AnalysisStep[];
}

function StepItem({ step, index }: { step: AnalysisStep; index: number }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const input = step.input as { sql?: string; column?: string; limit?: number };

  return (
    <div className="border-l-2 border-gray-200 pl-4 py-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-start gap-2 text-left w-full bg-transparent border-none cursor-pointer"
      >
        <span className="text-xs font-medium text-gray-400 shrink-0 mt-0.5">
          {index + 1}.
        </span>
        <div className="flex-1 min-w-0">
          <span className="text-sm text-gray-600">
            <span className="font-medium text-blue-600">{step.tool}</span>
            {input.sql && (
              <span className="text-gray-400 ml-2 text-xs">
                ({input.sql.slice(0, 40)}...)
              </span>
            )}
          </span>
          {step.error && (
            <span className="text-xs text-red-500 ml-2">Error</span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="mt-2 space-y-2">
          {step.thought && (
            <p className="text-xs text-gray-500 italic">{step.thought}</p>
          )}

          {input.sql && (
            <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
              {input.sql}
            </pre>
          )}

          {step.error ? (
            <p className="text-xs text-red-500">{step.error}</p>
          ) : step.result && Array.isArray(step.result) && step.result.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="text-xs w-full">
                <thead>
                  <tr className="bg-gray-50">
                    {Object.keys(step.result[0] as Record<string, unknown>).slice(0, 5).map((key) => (
                      <th key={key} className="px-2 py-1 text-left text-gray-500 font-medium">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {step.result.slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      {Object.entries(row as Record<string, unknown>).slice(0, 5).map(([key, val]) => (
                        <td key={key} className="px-2 py-1 text-gray-600">
                          {val === null || val === undefined
                            ? ""
                            : typeof val === "object"
                            ? JSON.stringify(val)
                            : String(val)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {step.result.length > 5 && (
                <p className="text-xs text-gray-400 mt-1">
                  +{step.result.length - 5} more rows
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-400">No results</p>
          )}
        </div>
      )}
    </div>
  );
}

export function AnalysisResultCard({
  result,
  isLoading,
  currentThought,
  steps = [],
}: AnalysisResultProps) {
  const [showTrace, setShowTrace] = useState(false);

  const typedData = (result.chartData || []) as Record<string, unknown>[];
  const keys = typedData.length > 0 ? Object.keys(typedData[0]) : [];
  const xAxis = result.xAxis || keys[0];
  const yAxis = result.yAxis || keys[1] || keys[0];
  const showChart = result.chartType !== "table" && typedData.length > 0 && typedData.length <= 50;

  return (
    <div className="bg-white rounded-xl shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden">
      {/* Answer Section */}
      <div className="p-5">
        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center gap-3 mb-4">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-500">
              {currentThought || "Analyzing..."}
            </span>
          </div>
        )}

        {/* Final Answer */}
        {!isLoading && result.answer && (
          <div className="mb-4">
            <p className="text-gray-700 text-[15px] leading-relaxed">
              {result.answer}
            </p>
          </div>
        )}

        {/* Chart */}
        {showChart && (
          <div className="h-48 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              {result.chartType === "line" ? (
                <LineChart data={typedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey={xAxis} stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Line type="monotone" dataKey={yAxis} stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              ) : result.chartType === "pie" ? (
                <PieChart>
                  <Pie
                    data={typedData}
                    dataKey={yAxis}
                    nameKey={xAxis}
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {typedData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              ) : result.chartType === "scatter" ? (
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey={xAxis} stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis dataKey={yAxis} stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                  <Scatter data={typedData} fill="#3b82f6" />
                </ScatterChart>
              ) : (
                <BarChart data={typedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey={xAxis} stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Bar dataKey={yAxis} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        )}

        {/* Data Table for table type or fallback */}
        {(result.chartType === "table" || !showChart) && typedData.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-gray-100 mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  {keys.map((key) => (
                    <th key={key} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {typedData.slice(0, 20).map((row, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    {keys.map((key) => {
                      const val = row[key];
                      return (
                        <td key={key} className="px-4 py-3 text-gray-700 whitespace-nowrap">
                          {val === null || val === undefined
                            ? ""
                            : typeof val === "object"
                            ? JSON.stringify(val)
                            : String(val)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Reasoning Trace Toggle */}
        {(steps.length > 0 || result.steps.length > 0) && (
          <button
            onClick={() => setShowTrace(!showTrace)}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer"
          >
            <svg
              className={`w-4 h-4 transition-transform ${showTrace ? "rotate-90" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            See reasoning ({(steps.length || result.steps.length)} queries)
          </button>
        )}

        {/* Reasoning Trace */}
        {showTrace && (
          <div className="mt-4 space-y-1">
            {(steps.length > 0 ? steps : result.steps).map((step, i) => (
              <StepItem key={i} step={step} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Loading state component
export function AnalysisLoadingCard({
  currentThought,
  steps,
}: {
  currentThought: string | null;
  steps: AnalysisStep[];
}) {
  return (
    <div className="bg-white rounded-xl shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.08)] p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-gray-600">
          {currentThought || "Starting analysis..."}
        </span>
      </div>

      {steps.length > 0 && (
        <div className="space-y-1 mt-4 border-t border-gray-100 pt-4">
          <p className="text-xs text-gray-400 mb-2">Queries executed:</p>
          {steps.map((step, i) => (
            <StepItem key={i} step={step} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Verify component compiles**

Run: `bunx tsc --noEmit src/components/AnalysisResult.tsx`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/AnalysisResult.tsx
git commit -m "feat: add AnalysisResult component with collapsible trace"
```

---

## Task 6: Update Page with Deep Analysis Toggle

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Add Deep Analysis toggle and integrate useAnalysis**

Add imports at top of file (after existing imports around line 29):

```typescript
import { useAnalysis } from "@/hooks/useAnalysis";
import { AnalysisResultCard, AnalysisLoadingCard } from "@/components/AnalysisResult";
```

**Step 2: Add state for deep analysis mode**

Add after `const [chartType, setChartType] = useState<ChartType>("auto");` (around line 390):

```typescript
const [deepAnalysis, setDeepAnalysis] = useState(false);
```

**Step 3: Add useAnalysis hook**

Add after the useChat hook call (around line 395):

```typescript
const {
  isAnalyzing,
  currentThought,
  steps: analysisSteps,
  result: analysisResult,
  error: analysisError,
  analyze,
  reset: resetAnalysis,
} = useAnalysis();
```

**Step 4: Update clearMessages to also reset analysis**

Modify the onDrop callback to also reset analysis (around line 422):

```typescript
const onDrop = useCallback(
  async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setCurrentFile(file);
      clearMessages();
      resetAnalysis();
      await loadFile(file);
    }
  },
  [loadFile, clearMessages, resetAnalysis]
);
```

**Step 5: Update handleSubmit for deep analysis**

Replace the handleSubmit function (around line 438):

```typescript
const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();
  if (!input.trim() || !schema || isLoadingChat || isAnalyzing) return;

  const query = input.trim();
  setInput("");

  if (deepAnalysis) {
    // Use agent analysis
    await analyze(
      query,
      { columns: schema.columns, sampleRows: schema.sampleRows, rowCount: schema.rowCount },
      runQuery,
      chartType
    );
  } else {
    // Use simple SQL generation
    await sendMessage(
      query,
      { columns: schema.columns, sampleRows: schema.sampleRows, rowCount: schema.rowCount },
      runQuery,
      chartType
    );
  }
};
```

**Step 6: Add Deep Analysis toggle UI**

After the chart type selector (around line 619), add:

```typescript
{/* Deep Analysis Toggle */}
{isReady && (
  <div className="flex items-center justify-center mt-3">
    <button
      type="button"
      onClick={() => setDeepAnalysis(!deepAnalysis)}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all
        ${deepAnalysis
          ? "bg-purple-100 text-purple-700 shadow-sm"
          : "bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        }
      `}
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
      Deep Analysis
      {deepAnalysis && <span className="text-purple-500 text-xs">(gpt-5)</span>}
    </button>
  </div>
)}
```

**Step 7: Update placeholder text for deep analysis mode**

Update the input placeholder (around line 569):

```typescript
placeholder={
  isLoadingFile
    ? "Loading file..."
    : !currentFile
    ? "Drop a CSV file anywhere to start..."
    : deepAnalysis
    ? "Ask complex questions like 'Why is X the most common?'"
    : "Ask a question about your data..."
}
```

**Step 8: Add analysis results to the results section**

Update the results section (around line 660) to show analysis results:

```typescript
{/* Results */}
<div ref={resultsRef} className="w-full max-w-[900px] flex flex-col gap-4">
  {/* Analysis Loading */}
  {isAnalyzing && (
    <AnalysisLoadingCard
      currentThought={currentThought}
      steps={analysisSteps}
    />
  )}

  {/* Analysis Result */}
  {analysisResult && !isAnalyzing && (
    <AnalysisResultCard
      result={analysisResult}
      steps={analysisSteps}
    />
  )}

  {/* Analysis Error */}
  {analysisError && !isAnalyzing && (
    <div className="bg-red-50 rounded-xl p-5 shadow-[0_0_0_1px_#fecaca,0_1px_3px_rgba(0,0,0,0.05)]">
      <p className="text-red-600 text-sm">{analysisError}</p>
    </div>
  )}

  {/* Simple mode loading */}
  {isLoadingChat && !deepAnalysis && <LoadingCard />}

  {/* Simple mode results - newest first */}
  {!deepAnalysis && [...messages]
    .filter((m) => m.role === "assistant")
    .reverse()
    .map((message) => {
      const messageIndex = messages.findIndex((m) => m.id === message.id);
      const userMessage = messageIndex > 0 ? messages[messageIndex - 1] : null;

      return (
        <ResultCard
          key={message.id}
          message={{
            ...message,
            content: userMessage?.role === "user" ? userMessage.content : message.content,
          }}
        />
      );
    })}

  {/* Clear all button */}
  {(messages.length > 2 || analysisResult) && (
    <div className="text-center pt-4">
      <button
        onClick={() => {
          clearMessages();
          resetAnalysis();
        }}
        className="text-sm text-gray-400 hover:text-gray-600 transition-colors bg-transparent border-none cursor-pointer"
      >
        Clear all results
      </button>
    </div>
  )}
</div>
```

**Step 9: Verify page compiles**

Run: `bunx tsc --noEmit src/app/page.tsx`
Expected: No errors

**Step 10: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add Deep Analysis toggle and integrate agent UI"
```

---

## Task 7: Fix Bidirectional Communication (SSE Limitation)

The initial streaming approach has a limitation: SSE is unidirectional. We need to change to a request-response pattern where the client drives the loop.

**Files:**
- Modify: `src/app/api/analyze/route.ts`
- Modify: `src/hooks/useAnalysis.ts`

**Step 1: Update API route to single-step execution**

Replace `src/app/api/analyze/route.ts` with a multi-turn approach:

```typescript
// src/app/api/analyze/route.ts
import { openai } from "@ai-sdk/openai";
import { generateText, tool } from "ai";
import { z } from "zod";
import {
  AGENT_CONFIG,
  type AnalysisRequest,
  type AnalysisStep,
} from "@/lib/agent-protocol";

export const maxDuration = 60;

interface AnalyzeRequestBody extends AnalysisRequest {
  previousSteps?: AnalysisStep[];
  queryResults?: Record<string, unknown[] | null>;
}

const systemPrompt = `You are a data analyst AI agent. Your task is to answer questions about data by running SQL queries.

You have access to a table called "data" with the user's CSV data. You can run queries to explore and analyze the data.

IMPORTANT RULES:
1. Start by understanding what the user is asking
2. Run queries to gather the information you need (one at a time)
3. Analyze results and decide if you need more queries
4. After gathering enough info (max 5 queries), provide your final answer
5. Always provide a clear, natural language answer

DuckDB SQL syntax notes:
- Table is always named "data"
- For Unix timestamps in milliseconds: epoch_ms(column_name)
- For Unix timestamps in seconds: to_timestamp(column_name)
- For date truncation: DATE_TRUNC('day', timestamp_column)
- String matching: column ILIKE '%pattern%'

When you have enough information to answer, call the final_answer tool.`;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AnalyzeRequestBody;
    const { userQuery, schemaContext, preferredChartType, previousSteps = [], queryResults = {} } = body;

    // Build context from previous steps
    let conversationContext = `Data Schema:
Columns: ${schemaContext.columns.join(", ")}
Total rows: ${schemaContext.rowCount}
Sample data:
${JSON.stringify(schemaContext.sampleRows, null, 2)}

User Question: ${userQuery}`;

    if (previousSteps.length > 0) {
      conversationContext += "\n\nPrevious analysis steps:";
      previousSteps.forEach((step, i) => {
        conversationContext += `\n${i + 1}. Tool: ${step.tool}`;
        if (step.input) conversationContext += `\n   Input: ${JSON.stringify(step.input)}`;
        const resultKey = `step_${i}`;
        if (queryResults[resultKey]) {
          const resultPreview = JSON.stringify(queryResults[resultKey]?.slice(0, 5));
          conversationContext += `\n   Result: ${resultPreview}`;
          if ((queryResults[resultKey]?.length || 0) > 5) {
            conversationContext += ` (+${(queryResults[resultKey]?.length || 0) - 5} more rows)`;
          }
        } else if (step.error) {
          conversationContext += `\n   Error: ${step.error}`;
        }
      });
    }

    if (previousSteps.length >= AGENT_CONFIG.maxIterations) {
      conversationContext += "\n\nYou have reached the maximum number of queries. Please provide your final answer now based on what you have learned.";
    }

    const result = await generateText({
      model: openai(AGENT_CONFIG.model),
      system: systemPrompt,
      prompt: conversationContext,
      tools: {
        run_query: tool({
          description: "Execute a SQL query against the data table",
          parameters: z.object({
            sql: z.string().describe("The SQL query to execute"),
            thought: z.string().optional().describe("Your reasoning for running this query"),
          }),
        }),
        get_column_stats: tool({
          description: "Get statistics for a column",
          parameters: z.object({
            column: z.string().describe("The column name"),
            thought: z.string().optional().describe("Your reasoning"),
          }),
        }),
        get_value_distribution: tool({
          description: "Get top values in a column",
          parameters: z.object({
            column: z.string().describe("The column name"),
            limit: z.number().optional().default(10),
            thought: z.string().optional().describe("Your reasoning"),
          }),
        }),
        final_answer: tool({
          description: "Provide the final answer when you have enough information",
          parameters: z.object({
            answer: z.string().describe("Your complete answer to the user's question"),
            chartType: z.enum(["bar", "line", "pie", "scatter", "table"]).describe("Best chart type"),
            chartDataQuery: z.string().optional().describe("SQL query to get chart data"),
            xAxis: z.string().optional(),
            yAxis: z.string().optional(),
          }),
        }),
      },
      maxSteps: 1, // One tool call per request
    });

    // Check what tool was called
    const toolCall = result.toolCalls?.[0];

    if (!toolCall) {
      // No tool call, treat text as final answer
      return Response.json({
        done: true,
        answer: {
          answer: result.text || "I couldn't analyze the data.",
          chartType: preferredChartType && preferredChartType !== "auto" ? preferredChartType : "table",
          chartData: [],
          steps: previousSteps,
        },
      });
    }

    if (toolCall.toolName === "final_answer") {
      const args = toolCall.args as {
        answer: string;
        chartType: "bar" | "line" | "pie" | "scatter" | "table";
        chartDataQuery?: string;
        xAxis?: string;
        yAxis?: string;
      };

      return Response.json({
        done: true,
        answer: {
          answer: args.answer,
          chartType: preferredChartType && preferredChartType !== "auto"
            ? preferredChartType
            : args.chartType,
          chartData: [], // Will be populated by client with chartDataQuery
          chartDataQuery: args.chartDataQuery,
          xAxis: args.xAxis,
          yAxis: args.yAxis,
          steps: previousSteps,
        },
      });
    }

    // Tool needs execution
    let sql: string;
    const args = toolCall.args as { sql?: string; column?: string; limit?: number; thought?: string };

    if (toolCall.toolName === "run_query") {
      sql = args.sql || "";
    } else if (toolCall.toolName === "get_column_stats") {
      sql = `SELECT
        MIN("${args.column}") as min_value,
        MAX("${args.column}") as max_value,
        AVG(TRY_CAST("${args.column}" AS DOUBLE)) as avg_value,
        COUNT(DISTINCT "${args.column}") as distinct_count,
        COUNT(*) - COUNT("${args.column}") as null_count
      FROM data`;
    } else if (toolCall.toolName === "get_value_distribution") {
      sql = `SELECT "${args.column}" as value, COUNT(*) as count
        FROM data
        GROUP BY "${args.column}"
        ORDER BY count DESC
        LIMIT ${args.limit || 10}`;
    } else {
      sql = "";
    }

    return Response.json({
      done: false,
      needsQuery: true,
      tool: toolCall.toolName,
      sql,
      thought: args.thought || result.text || "",
      stepIndex: previousSteps.length,
    });

  } catch (error) {
    console.error("Analysis error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Analysis failed" },
      { status: 500 }
    );
  }
}
```

**Step 2: Update useAnalysis hook for multi-turn**

Replace `src/hooks/useAnalysis.ts`:

```typescript
// src/hooks/useAnalysis.ts
"use client";

import { useState, useCallback, useRef } from "react";
import {
  type AnalysisResult,
  type AnalysisStep,
  type AgentSchemaContext,
  AGENT_CONFIG,
} from "@/lib/agent-protocol";
import { ChartType } from "@/lib/openai";

export interface UseAnalysisReturn {
  isAnalyzing: boolean;
  currentThought: string | null;
  steps: AnalysisStep[];
  result: AnalysisResult | null;
  error: string | null;
  analyze: (
    query: string,
    schemaContext: AgentSchemaContext,
    runQuery: (sql: string) => Promise<unknown[]>,
    preferredChartType?: ChartType
  ) => Promise<void>;
  reset: () => void;
}

interface ApiResponse {
  done: boolean;
  needsQuery?: boolean;
  tool?: string;
  sql?: string;
  thought?: string;
  stepIndex?: number;
  answer?: AnalysisResult & { chartDataQuery?: string };
  error?: string;
}

export function useAnalysis(): UseAnalysisReturn {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentThought, setCurrentThought] = useState<string | null>(null);
  const [steps, setSteps] = useState<AnalysisStep[]>([]);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef(false);

  const reset = useCallback(() => {
    abortRef.current = true;
    setIsAnalyzing(false);
    setCurrentThought(null);
    setSteps([]);
    setResult(null);
    setError(null);
  }, []);

  const analyze = useCallback(
    async (
      query: string,
      schemaContext: AgentSchemaContext,
      runQuery: (sql: string) => Promise<unknown[]>,
      preferredChartType?: ChartType
    ) => {
      reset();
      abortRef.current = false;
      setIsAnalyzing(true);

      const collectedSteps: AnalysisStep[] = [];
      const queryResults: Record<string, unknown[] | null> = {};

      const timeout = setTimeout(() => {
        abortRef.current = true;
        setError("Analysis timed out");
        setIsAnalyzing(false);
      }, AGENT_CONFIG.timeoutMs);

      try {
        let iteration = 0;

        while (iteration < AGENT_CONFIG.maxIterations + 1 && !abortRef.current) {
          const response = await fetch("/api/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userQuery: query,
              schemaContext,
              preferredChartType,
              previousSteps: collectedSteps,
              queryResults,
            }),
          });

          if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || "Analysis failed");
          }

          const data: ApiResponse = await response.json();

          if (data.error) {
            throw new Error(data.error);
          }

          if (data.done && data.answer) {
            // Final answer received
            let chartData = data.answer.chartData || [];

            // If there's a chart data query, execute it
            if (data.answer.chartDataQuery) {
              try {
                chartData = await runQuery(data.answer.chartDataQuery);
              } catch {
                // Use last step's result as fallback
                const lastStepResult = collectedSteps[collectedSteps.length - 1]?.result;
                chartData = (lastStepResult as unknown[]) || [];
              }
            } else if (chartData.length === 0 && collectedSteps.length > 0) {
              // Use last successful query result
              const lastStepWithData = [...collectedSteps].reverse().find(s => s.result && (s.result as unknown[]).length > 0);
              chartData = (lastStepWithData?.result as unknown[]) || [];
            }

            setResult({
              ...data.answer,
              chartData,
              steps: collectedSteps,
            });
            break;
          }

          if (data.needsQuery && data.sql) {
            setCurrentThought(data.thought || `Running ${data.tool}...`);

            const step: AnalysisStep = {
              thought: data.thought || "",
              tool: data.tool || "run_query",
              input: { sql: data.sql },
              result: null,
            };

            try {
              const queryResult = await runQuery(data.sql);
              step.result = queryResult;
              queryResults[`step_${data.stepIndex}`] = queryResult;
            } catch (queryError) {
              step.error = queryError instanceof Error ? queryError.message : "Query failed";
              queryResults[`step_${data.stepIndex}`] = null;
            }

            collectedSteps.push(step);
            setSteps([...collectedSteps]);
          }

          iteration++;
        }

        if (iteration >= AGENT_CONFIG.maxIterations + 1 && !result) {
          setError("Maximum analysis iterations reached");
        }

      } catch (err) {
        if (!abortRef.current) {
          setError(err instanceof Error ? err.message : "Analysis failed");
        }
      } finally {
        clearTimeout(timeout);
        if (!abortRef.current) {
          setIsAnalyzing(false);
          setCurrentThought(null);
        }
      }
    },
    [reset, result]
  );

  return {
    isAnalyzing,
    currentThought,
    steps,
    result,
    error,
    analyze,
    reset,
  };
}
```

**Step 3: Verify both files compile**

Run: `bunx tsc --noEmit src/app/api/analyze/route.ts src/hooks/useAnalysis.ts`
Expected: No errors

**Step 4: Commit**

```bash
git add src/app/api/analyze/route.ts src/hooks/useAnalysis.ts
git commit -m "fix: change to request-response pattern for bidirectional agent communication"
```

---

## Task 8: Manual Testing

**Step 1: Start dev server**

Run: `bun run dev`
Expected: Server starts on http://localhost:3000

**Step 2: Test simple mode**

1. Drop a CSV file
2. With "Deep Analysis" OFF, ask "Show me the count by make"
3. Verify chart/table appears

**Step 3: Test deep analysis mode**

1. Toggle "Deep Analysis" ON (purple button)
2. Ask "Why is Toyota the most common make in the data?"
3. Verify:
   - Loading state shows "Analyzing..."
   - Steps appear as queries execute
   - Final answer appears with chart
   - "See reasoning (N queries)" toggle works

**Step 4: Test error handling**

1. Ask a question that will fail (e.g., reference non-existent column)
2. Verify error message appears

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: complete deep analysis agent implementation"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Protocol types | `src/lib/agent-protocol.ts` |
| 2 | Tool definitions | `src/lib/agent-tools.ts` |
| 3 | API route (streaming) | `src/app/api/analyze/route.ts` |
| 4 | Analysis hook | `src/hooks/useAnalysis.ts` |
| 5 | Result component | `src/components/AnalysisResult.tsx` |
| 6 | Page integration | `src/app/page.tsx` |
| 7 | Fix bidirectional (request-response) | Modify route + hook |
| 8 | Manual testing | - |
