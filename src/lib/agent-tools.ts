// src/lib/agent-tools.ts
import { z } from "zod";

export const runQueryTool = {
  name: "run_query",
  description: "Execute a DuckDB SQL query. Use TRY_CAST for type conversions to avoid errors. Check sample data for actual column types before querying.",
  parameters: z.object({
    sql: z.string().describe("The SQL query to execute"),
  }),
};

export const getColumnStatsTool = {
  name: "get_column_stats",
  description: "Get column statistics: min, max, avg (numeric only), distinct count, null count. Use this to understand data distribution before complex queries.",
  parameters: z.object({
    column: z.string().describe("The column name to analyze"),
  }),
};

export const getValueDistributionTool = {
  name: "get_value_distribution",
  description: "Get top N most frequent values with counts. Useful for understanding categorical columns or finding common patterns.",
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
