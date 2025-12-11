# Feature-Rich Workspace Design

**Date:** 2025-01-27
**Status:** Approved
**Goal:** Transform the AI Data Analyzer from a single-purpose chat tool into a comprehensive data exploration and reporting workspace.

---

## Overview

This design introduces a tab-based workspace with four core capabilities:
1. **Data Exploration** - Automated profiling, interactive filtering, multi-dataset analysis
2. **Reporting & Sharing** - Visual exports, analysis report generation

The privacy-first philosophy is maintained: all data stays in the browser via DuckDB-WASM.

---

## Architecture

### Tab-Based Workspace Structure

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo] AI Data Analyzer    [File: sales.csv ▼] [+ Add File]│
├─────────────────────────────────────────────────────────────┤
│  [ Chat ]  [ Profile ]  [ Dashboard ]  [ Reports ]          │
├─────────────────────────────────────────────────────────────┤
│                    Filter Bar (when active)                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                    Tab Content Area                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Tabs

| Tab | Purpose |
|-----|---------|
| **Chat** | Current functionality (simple + deep analysis). Unchanged. |
| **Profile** | Automated data profiling. One-click comprehensive analysis. |
| **Dashboard** | Multi-chart workspace. Pin results from Chat, arrange in grid. |
| **Reports** | Generate shareable analysis reports with narrative + visuals. |

### State Management

- New `useWorkspace` hook manages: active tab, loaded files, pinned results, active filters
- Persists to localStorage so work survives page refresh
- Each tab has its own state slice but shares the DuckDB instance

---

## Feature Specifications

### 1. Multi-Dataset Support

**File Management:**
- Header shows current file with dropdown to switch context
- "+ Add File" opens file picker (or drag additional files onto dropzone)
- Each file becomes a separate DuckDB table (named after sanitized filename)
- File list panel (collapsible) shows all loaded files with:
  - File name, row count, column count
  - Quick schema preview on hover
  - Remove button (with confirmation)

**Cross-File Queries:**
- AI automatically knows about all loaded tables
- Schema context sent to API includes all tables
- Natural language: "Join sales with customers on customer_id"
- Generated SQL: `SELECT * FROM sales s JOIN customers c ON s.customer_id = c.id`

**Compare Mode:**
- In Chat: "Compare sales_q1.csv vs sales_q2.csv"
- AI generates UNION or side-by-side queries
- Dashboard: Pin charts from different files for visual comparison
- Profile: Compare button shows two profiles side-by-side

**State Updates:**
- `useDuckDB` hook extended to manage multiple tables
- New `loadedFiles: Map<string, TableSchema>` state
- `activeFile` for single-table context (Profile tab)
- Queries can reference any loaded table

**Limits:**
- Max 5 files loaded simultaneously (memory constraints)
- Warning when total row count exceeds 1M rows
- Files > 100MB show size warning before loading

---

### 2. Profile Tab - Automated Data Profiling

**Purpose:** One-click comprehensive dataset analysis. Users drop a file and immediately understand its shape, quality, and key characteristics.

**Profile Report Sections:**

1. **Overview Card**
   - Row count, column count, file size, memory usage
   - Data types breakdown (numeric, text, date, boolean)
   - Completeness score (% non-null across all columns)

2. **Column Analysis** (per column)
   - Type, distinct values, null %, sample values
   - **Numeric:** min, max, mean, median, std dev, histogram
   - **Categorical:** top 10 values with frequencies, bar chart
   - **Date/Time:** range, gaps, time series preview
   - **Text:** avg length, pattern detection (emails, URLs, etc.)

3. **Data Quality Alerts**
   - Columns with >20% nulls (warning)
   - Potential duplicates (rows with identical values)
   - Outliers (values >3 std devs from mean)
   - Mixed types in columns (numbers stored as strings)

4. **Correlations** (numeric columns)
   - Correlation matrix heatmap
   - Top 5 strongest correlations highlighted

**Implementation:**
- New `/api/profile` endpoint generates insights via AI + SQL
- Uses parallel DuckDB queries for performance
- Results cached in state (re-profile only on new file)
- Each section collapsible, loads progressively

---

### 3. Dashboard Tab - Multi-Chart Workspace

**Purpose:** Build custom views with multiple visualizations. Pin interesting results from Chat, arrange them, and see the full picture at once.

**Layout:**
- Responsive grid (CSS Grid or react-grid-layout)
- Default 2-column layout, expandable to 3 on wide screens
- Cards can be resized: small (1x1), medium (2x1), large (2x2)

**Adding Charts:**
- **From Chat:** "Pin to Dashboard" button on any result card
- **Quick Add:** "+ Add Chart" button opens mini-query input
- **From Profile:** Pin any profile visualization (histogram, correlation matrix)

**Chart Card Features:**
- Title (editable, defaults to query text)
- Chart visualization (inherits from source)
- Refresh button (re-runs the SQL)
- Resize handle (drag corners)
- Remove button (with confirmation)
- "View SQL" toggle

**Dashboard Persistence:**
- Layout + queries saved to localStorage
- Each dashboard card stores: `{ id, title, sql, chartType, position, size }`
- On load, re-executes all queries against current data
- "Clear Dashboard" button to reset

---

### 4. Interactive Filtering

**Purpose:** Filter data using natural language or visual UI, applied globally across views.

**Filter Bar Component:**
- Appears below tabs, above content area
- Input field with placeholder: "Filter: e.g., 'sales > 1000 and region is West'"
- Active filters shown as dismissible chips
- "Clear All" button when filters active

**Natural Language Filters:**
- User types: "where revenue > 50000 and year = 2024"
- AI converts to SQL WHERE clause
- Applied to all queries in current session
- Works with column name inference ("sales" → `total_sales`)

**Visual Filter Builder (toggle):**
- Click filter chip or "Advanced" button to open modal
- Column dropdown → Operator dropdown → Value input
- Operators per type:
  - Numeric: =, ≠, >, <, ≥, ≤, between, is null
  - Text: equals, contains, starts with, ends with, is null
  - Date: =, before, after, between, is null
- Add multiple conditions with AND/OR logic
- Preview of filtered row count

**Filter Application:**
- Dashboard: All charts re-query with filter appended
- Chat: New queries include filter context
- Profile: Shows "Filtered Profile" with filter active
- Reports: Filter state captured at time of export

**State:**
- `activeFilters: FilterCondition[]` in workspace state
- Each filter: `{ column, operator, value, conjunction }`
- Persisted to localStorage with dashboard

---

### 5. Reports Tab - Analysis Report Generator

**Purpose:** Generate polished, shareable reports combining narrative, charts, and methodology. Export as markdown or PDF.

**Report Builder UI:**
- Left sidebar: Available content blocks
- Center: Report canvas (drag-and-drop arrangement)
- Right sidebar: Export options

**Content Blocks:**
- **Text Block** - Rich text editor for narrative/insights
- **Chart Block** - Pull from Dashboard or create new
- **Table Block** - Query results as formatted table
- **Profile Summary** - Auto-generated from Profile tab
- **AI Insights Block** - Ask AI to summarize findings (uses deep analysis)

**Report Templates:**
- **Blank** - Start from scratch
- **Data Overview** - Profile summary + key stats + distributions
- **Analysis Report** - Intro + methodology + findings + charts + conclusion
- **Executive Summary** - High-level KPIs + 2-3 key visualizations

**Export Options:**
- **Markdown** - Download `.md` file with embedded base64 images
- **PDF** - Client-side generation via html2pdf.js or @react-pdf/renderer
- **Copy to Clipboard** - For pasting into docs/emails
- **Print** - Browser print dialog with print-optimized CSS

---

### 6. Chart & Visual Exports

**Chart Export (available in Dashboard and Chat):**
- Download as PNG (high-res, 2x scale)
- Download as SVG (vector, editable)
- Copy chart image to clipboard
- Uses html2canvas for PNG rasterization
- Uses Recharts' native SVG for vector export

**Export UI:**
- Dropdown menu on each chart card: "Export ▼"
- Options: PNG, SVG, Copy to Clipboard

---

## Implementation Phases

| Phase | Features | Complexity |
|-------|----------|------------|
| **Phase 1: Foundation** | Tab structure, workspace state, localStorage persistence | Medium |
| **Phase 2: Multi-file** | Extended useDuckDB, file management UI, cross-file queries | Medium |
| **Phase 3: Profile** | Profiling API, Profile tab components, quality alerts | High |
| **Phase 4: Dashboard** | Grid layout, chart pinning, resize/arrange, refresh | High |
| **Phase 5: Filtering** | Filter bar, NL parsing, visual builder modal | Medium |
| **Phase 6: Exports** | Chart PNG/SVG export, copy to clipboard | Medium |
| **Phase 7: Reports** | Report builder, templates, block types, PDF/MD export | High |

Each phase is independently shippable with immediate user value.

---

## Technical Decisions

1. **Grid Library:** Use `react-grid-layout` for Dashboard (mature, well-maintained)
2. **PDF Generation:** Use `html2pdf.js` (simpler) or `@react-pdf/renderer` (more control)
3. **Rich Text:** Use `@tiptap/react` for report text blocks (modern, extensible)
4. **Chart Export:** `html2canvas` for PNG, native SVG extraction for vector
5. **State Persistence:** localStorage with JSON serialization (no backend needed)

---

## Non-Goals (YAGNI)

- User authentication / accounts
- Cloud storage / file sync
- Real-time collaboration
- Scheduled/automated analysis
- External database connections
- Mobile-optimized UI (desktop focus)
