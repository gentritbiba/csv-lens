import { describe, it, expect } from 'vitest'
import {
  AI_MODELS,
  DEFAULT_MODEL_TIER,
  getModelTier,
  type ModelTier,
} from '@/models'

describe('models', () => {
  describe('AI_MODELS', () => {
    it('should have high and low tiers defined', () => {
      expect(AI_MODELS).toHaveProperty('high')
      expect(AI_MODELS).toHaveProperty('low')
    })

    it('should have valid model IDs', () => {
      expect(AI_MODELS.high.modelId).toBe('claude-sonnet-4-5')
      expect(AI_MODELS.low.modelId).toBe('claude-haiku-4-5')
    })

    it('should have labels for all tiers', () => {
      expect(AI_MODELS.high.label).toBe('High')
      expect(AI_MODELS.low.label).toBe('Fast')
    })

    it('should have descriptions for all tiers', () => {
      expect(AI_MODELS.high.description).toBeTruthy()
      expect(AI_MODELS.low.description).toBeTruthy()
    })

    it('should have appropriate token multipliers', () => {
      // High should be more expensive
      expect(AI_MODELS.high.tokenMultiplier).toBe(3)
      // Low should be cheapest
      expect(AI_MODELS.low.tokenMultiplier).toBe(1)

      // Verify ordering
      expect(AI_MODELS.high.tokenMultiplier).toBeGreaterThan(
        AI_MODELS.low.tokenMultiplier
      )
    })

    it('should indicate thinking support for all tiers', () => {
      expect(AI_MODELS.high.supportsThinking).toBe(true)
      expect(AI_MODELS.low.supportsThinking).toBe(true)
    })

    it('should have requiresPro flag', () => {
      expect(AI_MODELS.high.requiresPro).toBe(true)
      expect(AI_MODELS.low.requiresPro).toBe(false)
    })
  })

  describe('DEFAULT_MODEL_TIER', () => {
    it('should be low tier by default', () => {
      expect(DEFAULT_MODEL_TIER).toBe('low')
    })

    it('should be a valid tier', () => {
      const validTiers: ModelTier[] = ['high', 'low']
      expect(validTiers).toContain(DEFAULT_MODEL_TIER)
    })
  })

  describe('getModelTier', () => {
    it('should return high for sonnet model', () => {
      expect(getModelTier('claude-sonnet-4-5')).toBe('high')
    })

    it('should return low for haiku model', () => {
      expect(getModelTier('claude-haiku-4-5')).toBe('low')
    })

    it('should default to low for unknown models', () => {
      expect(getModelTier('unknown-model')).toBe('low')
      expect(getModelTier('')).toBe('low')
      expect(getModelTier('gpt-4')).toBe('low')
      expect(getModelTier('claude-opus-4-5')).toBe('low')
    })
  })
})
