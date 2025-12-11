// src/lib/prompt-logger.ts
// SECURITY NOTE: This logger is disabled by default in production.
// User queries may contain sensitive data and should not be logged to disk.

export interface PromptLogEntry {
  timestamp: string;
  type: "chat" | "analysis";
  userQuery: string;
  tables: string[];
  model?: string;
  chartType?: string;
}

/**
 * SECURITY: Logging user queries is disabled by default.
 *
 * User queries may contain:
 * - Personal information
 * - Sensitive business data
 * - Credentials or API keys if users paste them
 *
 * To enable logging for debugging, set ENABLE_PROMPT_LOGGING=true in .env
 * This should NEVER be enabled in production environments.
 */
export async function logPrompt(entry: PromptLogEntry): Promise<void> {
  // SECURITY: Only log if explicitly enabled AND not in production
  if (process.env.ENABLE_PROMPT_LOGGING !== "true" || process.env.NODE_ENV === "production") {
    return;
  }

  // Even when enabled, redact the actual query content
  const redactedEntry = {
    timestamp: new Date().toISOString(),
    type: entry.type,
    queryLength: entry.userQuery.length, // Log length instead of content
    tables: entry.tables,
    model: entry.model,
    chartType: entry.chartType,
  };

  // Log to console only (not to file) to avoid persistence of sensitive data
  console.log("[PromptLogger]", JSON.stringify(redactedEntry));
}

// Helper to format log for human readability (redacted)
export function formatLogEntry(entry: PromptLogEntry): string {
  return `[${entry.timestamp}] [${entry.type.toUpperCase()}] query_length=${entry.userQuery.length} | tables: ${entry.tables.join(", ")} | model: ${entry.model || "default"} | chart: ${entry.chartType || "auto"}`;
}
