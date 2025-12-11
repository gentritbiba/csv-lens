// src/lib/analysis-logger.ts
import { appendFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

const LOG_DIR = join(process.cwd(), "logs");
const LOG_FILE = join(LOG_DIR, "analysis.log");

// Ensure log directory exists
async function ensureLogDir(): Promise<void> {
  if (!existsSync(LOG_DIR)) {
    await mkdir(LOG_DIR, { recursive: true });
  }
}

export type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

export interface AnalysisLogEntry {
  level: LogLevel;
  event: string;
  sessionId?: string;
  step?: number;
  data?: Record<string, unknown>;
}

// Format timestamp for logs
function getTimestamp(): string {
  return new Date().toISOString();
}

// Format log entry as a readable line
function formatLogLine(entry: AnalysisLogEntry): string {
  const timestamp = getTimestamp();
  const session = entry.sessionId ? `[${entry.sessionId.slice(0, 8)}]` : "";
  const step = entry.step !== undefined ? `[Step ${entry.step}]` : "";
  const data = entry.data ? ` | ${JSON.stringify(entry.data)}` : "";

  return `${timestamp} [${entry.level}]${session}${step} ${entry.event}${data}\n`;
}

// Main logging function
export async function logAnalysis(entry: AnalysisLogEntry): Promise<void> {
  try {
    await ensureLogDir();
    const logLine = formatLogLine(entry);
    await appendFile(LOG_FILE, logLine, "utf-8");

    // Also log to console in development
    if (process.env.NODE_ENV !== "production") {
      const color = {
        INFO: "\x1b[36m",   // Cyan
        WARN: "\x1b[33m",   // Yellow
        ERROR: "\x1b[31m",  // Red
        DEBUG: "\x1b[90m",  // Gray
      }[entry.level];
      console.log(`${color}${logLine.trim()}\x1b[0m`);
    }
  } catch (error) {
    // Don't let logging errors affect the main flow
    console.error("[AnalysisLogger] Failed to write log:", error);
  }
}

// Convenience functions for different log levels
export const logger = {
  info: (event: string, data?: Record<string, unknown>, sessionId?: string, step?: number) =>
    logAnalysis({ level: "INFO", event, data, sessionId, step }),

  warn: (event: string, data?: Record<string, unknown>, sessionId?: string, step?: number) =>
    logAnalysis({ level: "WARN", event, data, sessionId, step }),

  error: (event: string, data?: Record<string, unknown>, sessionId?: string, step?: number) =>
    logAnalysis({ level: "ERROR", event, data, sessionId, step }),

  debug: (event: string, data?: Record<string, unknown>, sessionId?: string, step?: number) =>
    logAnalysis({ level: "DEBUG", event, data, sessionId, step }),

  // Log the start of a new analysis session
  startSession: (sessionId: string, userQuery: string, tables: string[], model: string) =>
    logAnalysis({
      level: "INFO",
      event: "ANALYSIS_START",
      sessionId,
      data: { userQuery, tables, model },
    }),

  // Log a tool call
  toolCall: (sessionId: string, step: number, tool: string, input: unknown) =>
    logAnalysis({
      level: "INFO",
      event: `TOOL_CALL: ${tool}`,
      sessionId,
      step,
      data: { input: typeof input === "string" ? input.slice(0, 500) : input },
    }),

  // Log SQL query
  sqlQuery: (sessionId: string, step: number, sql: string) =>
    logAnalysis({
      level: "DEBUG",
      event: "SQL_QUERY",
      sessionId,
      step,
      data: { sql },
    }),

  // Log query result
  queryResult: (sessionId: string, step: number, rowCount: number, tokenCount?: number) =>
    logAnalysis({
      level: "INFO",
      event: "QUERY_RESULT",
      sessionId,
      step,
      data: { rowCount, tokenCount },
    }),

  // Log query error
  queryError: (sessionId: string, step: number, error: string, sql?: string) =>
    logAnalysis({
      level: "ERROR",
      event: "QUERY_ERROR",
      sessionId,
      step,
      data: { error, sql },
    }),

  // Log duplicate query detection
  duplicateQuery: (sessionId: string, step: number, sql: string) =>
    logAnalysis({
      level: "WARN",
      event: "DUPLICATE_QUERY",
      sessionId,
      step,
      data: { sql: sql.slice(0, 200) },
    }),

  // Log final answer
  finalAnswer: (sessionId: string, step: number, chartType: string, rowCount: number) =>
    logAnalysis({
      level: "INFO",
      event: "FINAL_ANSWER",
      sessionId,
      step,
      data: { chartType, rowCount },
    }),

  // Log session end
  endSession: (sessionId: string, totalSteps: number, durationMs: number, success: boolean) =>
    logAnalysis({
      level: "INFO",
      event: "ANALYSIS_END",
      sessionId,
      data: { totalSteps, durationMs, success },
    }),

  // Log token usage
  tokenUsage: (sessionId: string, step: number, inputTokens: number, outputTokens: number) =>
    logAnalysis({
      level: "DEBUG",
      event: "TOKEN_USAGE",
      sessionId,
      step,
      data: { inputTokens, outputTokens, total: inputTokens + outputTokens },
    }),

  // Log loop detection
  loopDetected: (sessionId: string, step: number, duplicateCount: number) =>
    logAnalysis({
      level: "WARN",
      event: "LOOP_DETECTED",
      sessionId,
      step,
      data: { duplicateCount },
    }),

  // Log schema info at start
  schemaInfo: (sessionId: string, tables: { name: string; columns: number; rows: number }[]) =>
    logAnalysis({
      level: "DEBUG",
      event: "SCHEMA_INFO",
      sessionId,
      data: { tables },
    }),
};

export default logger;
