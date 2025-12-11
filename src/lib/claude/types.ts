// src/lib/claude/types.ts
// Type definitions for Claude SSE streaming architecture

import { AI_MODELS, type ModelTier, type ModelConfig } from "@/models";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";

// Re-export types from centralized models
export type { ModelTier, ModelConfig } from "@/models";

export const CLAUDE_MODELS: Record<ModelTier, ModelConfig> = AI_MODELS;

// Extended thinking configuration
export const THINKING_CONFIG = {
  budgetTokens: 10000, // Max tokens for thinking
  maxTokensWithThinking: 16000, // Higher max_tokens needed when thinking enabled
} as const;

export const DEFAULT_MODEL_TIER: ModelTier = "low";

// SSE Events sent from server to client
export type SSEEvent =
  | { type: "session"; sessionId: string }
  | { type: "thinking"; content: string } // Regular text/reasoning from Claude
  | { type: "extended_thinking"; content: string } // Extended thinking (internal reasoning)
  | { type: "tool_call"; id: string; name: string; input: unknown }
  | { type: "answer"; result: AnalysisResult }
  | { type: "error"; message: string }
  | { type: "done" };

// Analysis result structure
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

// Single table schema info
export interface TableInfo {
  tableName: string;
  columns: string[];
  sampleRows: unknown[];
  rowCount: number;
}

// Schema context - supports single table or multiple tables
export type SchemaContext = TableInfo | TableInfo[];

// Normalize to array
export function normalizeSchemaContext(ctx: SchemaContext): TableInfo[] {
  return Array.isArray(ctx) ? ctx : [ctx];
}

// Session state for Claude conversation
export interface Session {
  id: string;
  createdAt: number;
  lastActivity: number;
  model: ModelTier;
  query: string;
  schema: TableInfo[];
  messages: MessageParam[];
  queryResults: Record<string, unknown[]>;
  stepIndex: number;
  iteration: number;
  pendingToolId: string | null;
  awaitingToolResult: boolean;
  useThinking: boolean; // Whether extended thinking is enabled for this session
}

// Tool call input types
export interface RunQueryInput {
  thought: string;
  sql: string;
}

export interface GetColumnStatsInput {
  thought: string;
  column: string;
  table?: string;
}

export interface GetValueDistributionInput {
  thought: string;
  column: string;
  table?: string;
  limit?: number;
}

export interface TransformDataInput {
  thought: string;
  code: string;
  sourceStep: number;
}

export interface FinalAnswerInput {
  answer: string;
  chartType: "bar" | "line" | "pie" | "scatter" | "table";
  xAxis?: string;
  yAxis?: string;
}

// Tool result request body
export interface ToolResultRequest {
  sessionId: string;
  toolId: string;
  result?: unknown[];
  error?: string;
}

// Agent configuration
export const AGENT_CONFIG = {
  maxIterations: 15,
  sessionTimeoutMs: 5 * 60 * 1000, // 5 minutes
  defaultModel: DEFAULT_MODEL_TIER,
} as const;

// Chart type alias for backwards compatibility (includes "auto" for UI)
export type ChartType = "auto" | "bar" | "line" | "pie" | "scatter" | "table";
