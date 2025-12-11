// src/lib/agent-protocol.ts
// Re-exports for backwards compatibility - now uses Claude
// Open source version - all models available

import { AI_MODELS } from "@/models";
import type { ModelTier } from "@/models";

// Re-export types from claude module
export type {
  SSEEvent as ServerEvent,
  AnalysisResult,
  AnalysisStep,
  TableInfo,
  SchemaContext as AgentSchemaContext,
  ModelTier as AgentModel,
} from "@/lib/claude/types";

export { AGENT_CONFIG } from "@/lib/claude/types";

// Available models for Agentic Analysis - all models available in open source
export const AGENT_MODELS: { value: ModelTier; label: string; description: string; requiresPro: boolean }[] = [
  { value: "high", label: AI_MODELS.high.label, description: AI_MODELS.high.description, requiresPro: false },
  { value: "low", label: AI_MODELS.low.label, description: AI_MODELS.low.description, requiresPro: false },
];

// Analysis request
export interface AnalysisRequest {
  userQuery: string;
  schemaContext: import("@/lib/claude/types").SchemaContext;
  preferredChartType?: "auto" | "bar" | "line" | "pie" | "scatter" | "table";
  model?: ModelTier;
}
