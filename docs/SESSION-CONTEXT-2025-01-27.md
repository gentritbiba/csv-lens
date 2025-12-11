# AI Data Analyzer - Session Context Summary
**Date**: 2025-01-27

## Project Overview
A Next.js 16 + React 19 application for analyzing CSV data using AI-powered natural language queries. Uses DuckDB-WASM for client-side SQL execution and OpenAI models for query generation.

## Architecture
- **Frontend**: Next.js App Router, React 19, Tailwind CSS, shadcn/ui components
- **Data**: DuckDB-WASM (client-side SQL), multi-table support
- **AI**: OpenAI GPT-5.1 (reasoning) and GPT-5-mini via Vercel AI SDK
- **Charts**: Recharts for visualizations
- **State**: localStorage persistence via `useWorkspace` hook

---

## Features Implemented (This Session)

### 1. Tab-Based Workspace UI
- **Files**: `src/components/WorkspaceLayout.tsx`, `src/components/TabNavigation.tsx`
- **Tabs**: Chat, Profile, Dashboard, Reports
- **State**: `src/hooks/useWorkspace.ts` with localStorage persistence
- **Types**: `src/types/workspace.ts`

### 2. Multi-File Support
- **File**: `src/hooks/useDuckDB.ts`
- Tables named from filenames (e.g., `sample_data.csv` → table `sample_data`)
- Support for loading multiple CSV files simultaneously
- Dynamic table switching

### 3. Data Profiling (Profile Tab)
- **API**: `src/app/api/profile/route.ts`
- **Hook**: `src/hooks/useProfile.ts`
- **Component**: `src/components/tabs/ProfileTab.tsx`
- Auto-generates column stats, distributions when data loads

### 4. Dashboard with Grid Layout
- **Components**: `src/components/dashboard/DashboardCard.tsx`, `AddCardModal.tsx`
- **Tab**: `src/components/tabs/DashboardTab.tsx`
- Uses `react-grid-layout` for drag/resize
- Cards support: bar, line, pie, scatter, **table** charts
- "Pin to Dashboard" from Chat results

### 5. Global Filtering
- **Components**: `src/components/FilterBar.tsx`, `src/components/FilterBuilderModal.tsx`
- **Utils**: `src/lib/filter-utils.ts`
- Filters apply to all Dashboard cards via SQL WHERE clause injection
- Supports: =, !=, >, <, contains, starts_with, is_null, etc.

### 6. Chart Exports
- **Hook**: `src/hooks/useChartExport.ts`
- **Component**: `src/components/ChartExportDropdown.tsx`
- PNG export (via html2canvas), SVG export, clipboard copy

### 7. Reports Tab
- **Component**: `src/components/tabs/ReportsTab.tsx`
- Block-based editor (text, chart notes, table notes)
- Block reordering (move up/down)
- Markdown export

---

## Bug Fixes (This Session)

### Dynamic Table Names
- **Problem**: SQL queries hardcoded `FROM data` but tables are now named dynamically
- **Fix**: Added `tableName` to `SchemaContext` and `AgentSchemaContext`
- **Files changed**:
  - `src/lib/openai.ts` - Added `tableName` to `SchemaContext`
  - `src/lib/agent-protocol.ts` - Added `tableName` to `AgentSchemaContext`
  - `src/app/api/generate-sql/route.ts` - Uses dynamic table name in prompt
  - `src/app/api/analyze/route.ts` - Uses dynamic table name in prompt + SQL generation
  - `src/app/page.tsx` - Passes `schema.tableName` to both chat modes

### Table Chart Support in Dashboard
- **Problem**: Tables pinned to dashboard were converted to bar charts
- **Fix**: Removed forced conversion in `src/app/page.tsx:80`

### Horizontal Scroll for Tables
- **File**: `src/components/Chart.tsx`
- Added `<ScrollBar orientation="horizontal" />` to table view
- Changed cells from `truncate max-w-[180px]` to `whitespace-nowrap`

---

## AI Enhancements (This Session)

### 1. Auto-Retry for Normal Chat Mode
- **Files**: `src/hooks/useChat.ts`, `src/lib/openai.ts`, `src/app/api/generate-sql/route.ts`
- Up to 4 retry attempts when SQL fails
- Failed SQL + error passed to AI to generate corrected query
- UI shows "Retry X/4" indicator during retries
- **New types**: `PreviousAttempt` in `src/lib/openai.ts`

### 2. Creative Problem Solving (Deep Analysis)
- **File**: `src/app/api/analyze/route.ts` - Updated `buildSystemPrompt()`
- Added "BE CREATIVE WITH SOLUTIONS" section
- Guidance for:
  - Alternative data loading (LIMIT 30-50 for exploratory)
  - Transform approaches when direct methods fail
  - Graceful degradation (provide something useful)
  - Smart sampling to save tokens

### 3. High Reasoning Effort for GPT-5.1
- **File**: `src/app/api/analyze/route.ts`
- Added `providerOptions: { openai: { reasoningEffort: "high" } }` for GPT-5.1

### 4. JavaScript Transform Tool (Deep Analysis)
- **File**: `src/app/api/analyze/route.ts`
- New `transform_data` tool lets AI write JS to reshape data
- **Schema**: `transformDataSchema` with `code`, `sourceStep`, `thought`
- **Executor**: `safeExecuteTransform()` - sandboxed Function() execution
- **Safety**: Limited globals, strict mode, max 10k input / 1k output rows
- **Hook update**: `src/hooks/useAnalysis.ts` handles transform results
- Use cases: pivot, aggregate, calculate, format when SQL fails

---

## Key Files Reference

```
src/
├── app/
│   ├── page.tsx                    # Main page with all tabs
│   └── api/
│       ├── analyze/route.ts        # Deep analysis endpoint (GPT-5.1 agent)
│       ├── generate-sql/route.ts   # Simple chat SQL generation
│       └── profile/route.ts        # Data profiling endpoint
├── components/
│   ├── Chart.tsx                   # Unified chart component (bar/line/pie/scatter/table)
│   ├── ChartExportDropdown.tsx     # PNG/SVG/clipboard export
│   ├── FilterBar.tsx               # Active filters display
│   ├── FilterBuilderModal.tsx      # Filter creation UI
│   ├── WorkspaceLayout.tsx         # Main layout with tabs
│   ├── dashboard/
│   │   ├── DashboardCard.tsx       # Individual dashboard card
│   │   └── AddCardModal.tsx        # Add new card modal
│   └── tabs/
│       ├── ChatTab.tsx             # Chat interface
│       ├── ProfileTab.tsx          # Data profiling view
│       ├── DashboardTab.tsx        # Dashboard grid
│       └── ReportsTab.tsx          # Report builder
├── hooks/
│   ├── useChat.ts                  # Chat with auto-retry (4 attempts)
│   ├── useAnalysis.ts              # Deep analysis agent loop
│   ├── useDuckDB.ts                # DuckDB operations, multi-table
│   ├── useProfile.ts               # Data profiling
│   ├── useWorkspace.ts             # Workspace state + localStorage
│   └── useChartExport.ts           # Chart export utilities
├── lib/
│   ├── openai.ts                   # SchemaContext, generateSQL()
│   ├── agent-protocol.ts           # AgentSchemaContext, types
│   ├── filter-utils.ts             # SQL WHERE clause generation
│   └── duckdb.ts                   # DuckDB initialization
└── types/
    └── workspace.ts                # Workspace types (tabs, filters, cards, reports)
```

---

## Models Used
- **GPT-5.1**: Deep analysis with `reasoningEffort: "high"`
- **GPT-5-mini-2025-08-07**: Simple chat mode, faster responses

---

## Dependencies Added
- `react-grid-layout` - Dashboard grid
- `html2canvas` - PNG export
- `@radix-ui/react-dropdown-menu` - Dropdown menus
- `@radix-ui/react-progress` - Progress bars

---

## Current State
- Build passing ✅
- All 7 phases of original plan complete
- Ready for testing with `bun run dev`

---

## Design Documents
- `docs/plans/2025-01-27-feature-rich-workspace-design.md` - Feature design
- `docs/plans/2025-01-27-feature-rich-implementation.md` - Implementation plan (7 phases, 37 tasks)
