# Documentation Audit Report
**Date:** 2025-12-08
**Scope:** TypeScript type consolidation, profile types centralization, model tier restructuring, and pro subscription paywall implementation

## Executive Summary

The codebase has undergone significant structural refactoring affecting type definitions, model configuration, and subscription management:

1. **Type Consolidation** - Removed duplicate type definitions (ModelTier, ModelConfig) scattered across files
2. **Profile Types Centralization** - Moved profile-related interfaces to `/src/types/profile.ts`
3. **Model Tier Restructuring** - Removed "pro" model tier from public API, kept only "high" and "low"
4. **Subscription Paywall** - Added `requiresPro` flag to model configuration and UI enforcement

**Documentation Status:** README.md is accurate but incomplete. API route behavior updated. No breaking documentation errors, but missing details about pro-only model restrictions.

---

## Changes Detected

### 1. TypeScript Type Consolidation

**Files Modified:**
- `src/lib/claude/types.ts` - Removed local type definitions, now re-exports from `src/models.ts`
- `src/lib/claude/sessions.ts` - Updated import to get `ModelTier` from `src/models.ts`
- `src/models.ts` - Centralized `ModelTier` and `ModelConfig` definitions

**Impact:** All type definitions for model configuration now come from a single source (`src/models.ts`), eliminating duplication and making maintenance easier.

### 2. Profile Types Centralization

**Files Modified:**
- `src/types/profile.ts` - New file with consolidated profile-related types
- `src/app/api/profile/route.ts` - Removed local type definitions, imports from `@/types/profile`
- `src/hooks/useProfile.ts` - Removed local definitions, re-exports from `@/types/profile`
- `src/lib/schema-utils.ts` - Simplified to re-export from `src/lib/claude/types`

**New Types in `/src/types/profile.ts`:**
- `ColumnType`, `ColumnProfile`, `DataQualityAlert`, `DataQualityAlertType`
- `ProfileOverviewBase`, `ProfileOverview`, `ProfileData`, `ProfileResponse`
- Helper types: `HistogramBucket`, `TopValue`, `TextPatterns`, `Correlation`, etc.

### 3. Model Tier Restructuring

**Breaking Changes:**

```typescript
// BEFORE (in src/models.ts)
export type ModelTier = "pro" | "high" | "low";
export const AI_MODELS = {
  pro: { modelId: "claude-opus-4-5", ... },
  high: { modelId: "claude-sonnet-4-5", ... },
  low: { modelId: "claude-haiku-4-5", ... },
}

// AFTER (in src/models.ts)
export type ModelTier = "high" | "low";
export const AI_MODELS = {
  // pro model hidden (commented out)
  high: { modelId: "claude-sonnet-4-5", requiresPro: true, ... },
  low: { modelId: "claude-haiku-4-5", requiresPro: false, ... },
}
```

**Agent Models List (`src/lib/agent-protocol.ts`):**
- Removed "pro" model from `AGENT_MODELS` export
- Added `requiresPro: boolean` field to AGENT_MODELS array items
- High model now shows `requiresPro: true`

### 4. Subscription Paywall Implementation

**API Route: `/api/analyze`**

Added server-side enforcement:
```typescript
// Check if model requires pro subscription
const modelConfig = CLAUDE_MODELS[model];
if (modelConfig.requiresPro && authSession.tier !== "pro") {
  return Response.json(
    { error: "The High model requires a Pro subscription..." },
    { status: 403 }
  );
}
```

**Affected Routes:**
- `src/app/api/analyze/route.ts` - Validates model subscription requirement
- Updated `isValidModel()` function to reject "pro" tier

**UI Updates:**

Two components now show locked state for pro-only models:

1. **`src/app/(protected)/app/page.tsx`** - Main analysis interface
   - Added Lock icon import
   - Models marked `isLocked = model.requiresPro && user?.tier !== "pro"`
   - Locked models display with visual indicator (Lock icon + reduced opacity)
   - Tooltip shows "Pro subscription required"
   - Click handler prevents execution when locked

2. **`src/components/AnalysisCard.tsx`** - Analysis result detail view
   - Added `userTier?: "free" | "pro"` prop to ResultProps interface
   - Same visual treatment (Lock icon, opacity, disabled cursor)
   - Receives `userTier={user?.tier}` from parent

**User Data Flow:**
- `useUser()` hook now extracts `user` object containing `tier` field
- Available in main app to check subscription status

---

## Documentation Impact Assessment

### Files Requiring Updates

#### 1. **README.md** - NEEDS UPDATES

**Section: Token Accounting (Lines 114-124)**

Current text:
```
Token limits per billing period:
- **Free tier**: 50,000 tokens
- **Pro subscription**: 1,000,000 tokens

The `TokenLimitBanner` component alerts users...
```

**Issues:**
- ✗ Mentions "model tier" multipliers but "pro" model no longer available
- ✗ Says "Sonnet (Claude 3.5 Sonnet): 3x multiplier" which is now High model
- ✗ Says "Haiku (Claude 3.5 Haiku): 1x multiplier" which is now Low/Fast model
- ✗ No mention that High model requires Pro subscription

**Recommended Changes:**
- Rename section to "Token Accounting & Model Selection"
- Clarify model selection restrictions
- Update model name references to use "High" and "Fast" (new labels)

**Section: Architecture - New Information Needed**

Current text does NOT document:
- ✗ That High model requires Pro subscription
- ✗ Model selection UI restrictions
- ✗ Pro-only model error responses (403 status)

**Section: Type Structure Documentation**

Current README lacks:
- ✗ Documentation of `/src/types/profile.ts` (new centralized types location)
- ✗ Information that profile types moved from individual files to centralized module

---

### Files NOT Requiring Updates

✓ **`docs/audit-report-2025-12-03.md`** - Historical reference, no action needed
✓ **`docs/product-hunt-launch.md`** - Marketing content, still accurate
✓ **`docs/plans/*.md`** - Architecture planning documents, still valid

---

## Detailed Findings & Recommendations

### Finding 1: Missing Pro-Only Model Documentation

**Current State:**
- README mentions token multipliers but doesn't explain model availability
- No documented information about subscription requirements for specific models
- No explanation of 403 error when free user tries High model

**Recommendation:**
Add "Model Selection & Subscription" subsection under Architecture, before or after "Token Accounting":

```markdown
### Model Selection & Subscription

**Available Models:**
- **Fast** (Haiku): Free tier and Pro tier
  - Token multiplier: 1x
  - Faster responses, ideal for quick analysis
- **High** (Sonnet): Pro tier only
  - Token multiplier: 3x
  - Extended reasoning, deeper analysis
  - Requires Pro subscription ($12/month)

**Pro-Only Model Enforcement:**
- Frontend: UI shows Lock icon and "Pro subscription required" tooltip
- Backend API (`/api/analyze`): Returns 403 Forbidden if free user selects High model
- Error message guides users to upgrade subscription
```

### Finding 2: Incomplete Type Documentation Structure

**Current State:**
- README mentions `/src/lib/design-tokens.ts` and `/src/lib/style-utils.ts`
- No mention of centralized type definitions locations
- Profile types moved but not documented

**Recommendation:**
Add note in Project Structure section (Lines 24-34):

```markdown
- **Type Definitions:**
  - `/src/models.ts` - Centralized AI model configuration (ModelTier, ModelConfig)
  - `/src/types/profile.ts` - Data profiling and analysis types (ColumnProfile, ProfileData, etc.)
  - `/src/types/workspace.ts` - Workspace/file management types
```

### Finding 3: Model Configuration Inconsistency

**Current State:**
- Type definition says ModelTier = "high" | "low"
- But commented-out "pro" model still in code (lines 17-23 in src/models.ts)
- Confusing for future developers: is "pro" planned to return?

**Status:** Code is correct, but the commented section should have a comment explaining deprecation:

**Recommendation:**
Add explanatory comment in `src/models.ts` (around line 17):
```typescript
// NOTE: Pro tier (Claude Opus) deprecated in favor of subscription-based High tier
// Pro model remains commented as historical reference - may be reinstated in future
```

This clarifies for future developers that it's intentional, not forgotten.

### Finding 4: Test Documentation

**Current State:**
- README doesn't mention `/src/__tests__/` directory or test patterns
- No documentation of how to test the pro-only model logic

**Status:** Out of scope for current audit (tests added in previous commit), but worth noting for future documentation work.

---

## Summary of Changes Needed

| File | Section | Type | Priority | Impact |
|------|---------|------|----------|--------|
| README.md | Token Accounting | Update | HIGH | Clarify model selection and Pro requirement |
| README.md | Architecture (new subsection) | Add | HIGH | Document Pro-only model enforcement |
| README.md | Project Structure | Add | MEDIUM | Document new /src/types/ locations |
| src/models.ts | Line 17 comment | Add | LOW | Clarify pro model deprecation |

---

## Verification Checklist

Before finalizing updates:

- [ ] All "High" references in docs match code (3x multiplier, Sonnet model)
- [ ] All "Fast/Low" references in docs match code (1x multiplier, Haiku model)
- [ ] Pro-only requirement clearly stated for High model
- [ ] API endpoint behavior (403 response) documented
- [ ] Type consolidation noted (types centralized in `/src/models.ts`)
- [ ] Profile types location documented (`/src/types/profile.ts`)
- [ ] Examples remain accurate (if any mention specific models)

---

## Recommended Action Plan

1. **Add Model Selection & Subscription section** to README Architecture
   - Clearly states which models available to which tiers
   - Documents 403 error response
   - Explains Pro requirement for High model

2. **Update Token Accounting section** terminology
   - Change "Sonnet/Haiku" to "High/Fast" labels
   - Explain subscription requirement

3. **Enhance Project Structure** documentation
   - Note centralized type locations
   - Reference `/src/types/profile.ts`

4. **Add explanatory comment** to `src/models.ts`
   - Clarify pro model is intentionally disabled

**Estimated effort:** 15-20 minutes to update all documentation
**Risk level:** Low - changes are purely additive/clarifying
