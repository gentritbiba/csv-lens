// Centralized AI model configuration for Claude
// Update model names and settings here - they propagate throughout the app
// Open source version - all models available to everyone

export type ModelTier = "high" | "low";

export interface ModelConfig {
  modelId: string;
  label: string;
  supportsThinking: boolean;
  description: string;
  tokenMultiplier: number; // Informational only in open source version
  requiresPro: boolean; // Always false in open source version
}

// Claude models configuration
export const AI_MODELS: Record<ModelTier, ModelConfig> = {
  high: {
    modelId: "claude-sonnet-4-5",
    label: "High",
    description: "More capable, deeper reasoning",
    supportsThinking: true,
    tokenMultiplier: 3,
    requiresPro: false, // All models free in open source
  },
  low: {
    modelId: "claude-haiku-4-5",
    label: "Fast",
    description: "Faster responses",
    supportsThinking: true,
    tokenMultiplier: 1,
    requiresPro: false,
  },
} as const;

// Default model for analysis
export const DEFAULT_MODEL_TIER: ModelTier = "low";

// Helper to get model tier from model ID
export function getModelTier(modelId: string): ModelTier {
  if (modelId === AI_MODELS.high.modelId) return "high";
  return "low";
}

// For backwards compatibility
export type AgentModelName = (typeof AI_MODELS)[ModelTier]["modelId"];
