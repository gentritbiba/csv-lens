// src/lib/token-counter.ts
import { getEncoding } from "js-tiktoken";

// Use cl100k_base encoding (used by GPT-4, GPT-3.5-turbo)
const encoder = getEncoding("cl100k_base");

/**
 * Count tokens in a string
 */
export function countTokens(text: string): number {
  if (!text) return 0;
  return encoder.encode(text).length;
}

/**
 * Count tokens in a data array, breaking down by field
 */
export function countDataTokens(data: unknown[]): {
  total: number;
  byField: Record<string, number>;
  rowCount: number;
} {
  if (!data || data.length === 0) {
    return { total: 0, byField: {}, rowCount: 0 };
  }

  const firstRow = data[0] as Record<string, unknown>;
  if (!firstRow || typeof firstRow !== "object") {
    // Fallback for non-object data
    const serialized = JSON.stringify(data);
    return {
      total: countTokens(serialized),
      byField: { _data: countTokens(serialized) },
      rowCount: data.length
    };
  }

  const keys = Object.keys(firstRow);
  const byField: Record<string, number> = {};

  for (const key of keys) {
    // Concatenate all values for this field and count tokens
    const fieldValues = data.map((row) => {
      const value = (row as Record<string, unknown>)[key];
      if (value === null || value === undefined) return "";
      if (typeof value === "object") return JSON.stringify(value);
      return String(value);
    });
    byField[key] = countTokens(fieldValues.join(" "));
  }

  const total = Object.values(byField).reduce((a, b) => a + b, 0);

  return { total, byField, rowCount: data.length };
}

/**
 * Format token summary for display to the agent
 */
export function formatTokenSummary(tokenInfo: {
  total: number;
  byField: Record<string, number>;
  rowCount: number;
}): string {
  const sortedFields = Object.entries(tokenInfo.byField)
    .sort(([, a], [, b]) => b - a);

  const fieldBreakdown = sortedFields
    .map(([field, tokens]) => `  - ${field}: ${tokens.toLocaleString()} tokens`)
    .join("\n");

  return `Result has ${tokenInfo.rowCount} rows totaling ${tokenInfo.total.toLocaleString()} tokens.

Token breakdown by field (highest first):
${fieldBreakdown}`;
}

// Token limit for query results
export const TOKEN_LIMIT = 5000;
