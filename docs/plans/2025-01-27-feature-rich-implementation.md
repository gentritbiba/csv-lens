# Feature-Rich Workspace Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the AI Data Analyzer into a tab-based workspace with data profiling, multi-file support, dashboards, filtering, and report generation.

**Architecture:** Tab-based SPA with shared DuckDB instance. Four tabs (Chat, Profile, Dashboard, Reports) with global filter bar. State persisted to localStorage via new `useWorkspace` hook. Multi-file support via extended `useDuckDB`.

**Tech Stack:** Next.js 16, React 19, DuckDB-WASM, Recharts, shadcn/ui, react-grid-layout (new), html2canvas (new), @react-pdf/renderer (new)

---

## Phase 1: Foundation - Tab Structure & Workspace State

### Task 1.1: Install New Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install grid layout and export libraries**

```bash
bun add react-grid-layout html2canvas @react-pdf/renderer @tiptap/react @tiptap/starter-kit
bun add -D @types/react-grid-layout
```

**Step 2: Verify installation**

Run: `bun run build`
Expected: Build succeeds without errors

**Step 3: Commit**

```bash
git add package.json bun.lock
git commit -m "chore: add dependencies for workspace features"
```

---

### Task 1.2: Create Workspace Types

**Files:**
- Create: `src/types/workspace.ts`

**Step 1: Create workspace type definitions**

```typescript
// src/types/workspace.ts
import { TableSchema } from "@/hooks/useDuckDB";

export type WorkspaceTab = "chat" | "profile" | "dashboard" | "reports";

export interface LoadedFile {
  id: string;
  name: string;
  size: number;
  schema: TableSchema;
  loadedAt: number;
}

export interface FilterCondition {
  id: string;
  column: string;
  operator: FilterOperator;
  value: string | number | null;
  conjunction: "AND" | "OR";
}

export type FilterOperator =
  | "="
  | "!="
  | ">"
  | "<"
  | ">="
  | "<="
  | "contains"
  | "starts_with"
  | "ends_with"
  | "is_null"
  | "is_not_null"
  | "between";

export interface DashboardCard {
  id: string;
  title: string;
  sql: string;
  chartType: string;
  xAxis?: string;
  yAxis?: string;
  position: { x: number; y: number };
  size: { w: number; h: number };
  sourceFileId?: string;
}

export interface ReportBlock {
  id: string;
  type: "text" | "chart" | "table" | "profile" | "ai-insights";
  content: string; // JSON stringified content specific to block type
  order: number;
}

export interface Report {
  id: string;
  title: string;
  blocks: ReportBlock[];
  createdAt: number;
  updatedAt: number;
}

export interface WorkspaceState {
  activeTab: WorkspaceTab;
  loadedFiles: LoadedFile[];
  activeFileId: string | null;
  filters: FilterCondition[];
  dashboardCards: DashboardCard[];
  reports: Report[];
}

export const DEFAULT_WORKSPACE_STATE: WorkspaceState = {
  activeTab: "chat",
  loadedFiles: [],
  activeFileId: null,
  filters: [],
  dashboardCards: [],
  reports: [],
};
```

**Step 2: Commit**

```bash
git add src/types/workspace.ts
git commit -m "feat: add workspace type definitions"
```

---

### Task 1.3: Create useWorkspace Hook

**Files:**
- Create: `src/hooks/useWorkspace.ts`

**Step 1: Create the workspace state hook with localStorage persistence**

```typescript
// src/hooks/useWorkspace.ts
"use client";

import { useState, useCallback, useEffect } from "react";
import {
  WorkspaceState,
  WorkspaceTab,
  LoadedFile,
  FilterCondition,
  DashboardCard,
  Report,
  DEFAULT_WORKSPACE_STATE,
} from "@/types/workspace";

const STORAGE_KEY = "ai-data-analyzer-workspace";

function loadFromStorage(): WorkspaceState {
  if (typeof window === "undefined") return DEFAULT_WORKSPACE_STATE;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_WORKSPACE_STATE;

    const parsed = JSON.parse(stored) as Partial<WorkspaceState>;
    return {
      ...DEFAULT_WORKSPACE_STATE,
      ...parsed,
      // Don't restore loadedFiles - they need to be reloaded
      loadedFiles: [],
      activeFileId: null,
    };
  } catch {
    return DEFAULT_WORKSPACE_STATE;
  }
}

function saveToStorage(state: WorkspaceState): void {
  if (typeof window === "undefined") return;

  try {
    // Don't persist loadedFiles (contains schema data, files need reload)
    const toSave: Partial<WorkspaceState> = {
      activeTab: state.activeTab,
      filters: state.filters,
      dashboardCards: state.dashboardCards,
      reports: state.reports,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (e) {
    console.warn("Failed to save workspace state:", e);
  }
}

export function useWorkspace() {
  const [state, setState] = useState<WorkspaceState>(DEFAULT_WORKSPACE_STATE);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    setState(loadFromStorage());
    setIsHydrated(true);
  }, []);

  // Save to localStorage on state change (after hydration)
  useEffect(() => {
    if (isHydrated) {
      saveToStorage(state);
    }
  }, [state, isHydrated]);

  // Tab management
  const setActiveTab = useCallback((tab: WorkspaceTab) => {
    setState((s) => ({ ...s, activeTab: tab }));
  }, []);

  // File management
  const addFile = useCallback((file: LoadedFile) => {
    setState((s) => {
      // Check limit (max 5 files)
      if (s.loadedFiles.length >= 5) {
        console.warn("Maximum 5 files allowed");
        return s;
      }
      // Check for duplicate
      if (s.loadedFiles.some((f) => f.name === file.name)) {
        return s;
      }
      return {
        ...s,
        loadedFiles: [...s.loadedFiles, file],
        activeFileId: file.id,
      };
    });
  }, []);

  const removeFile = useCallback((fileId: string) => {
    setState((s) => {
      const newFiles = s.loadedFiles.filter((f) => f.id !== fileId);
      return {
        ...s,
        loadedFiles: newFiles,
        activeFileId:
          s.activeFileId === fileId
            ? newFiles[0]?.id ?? null
            : s.activeFileId,
      };
    });
  }, []);

  const setActiveFile = useCallback((fileId: string | null) => {
    setState((s) => ({ ...s, activeFileId: fileId }));
  }, []);

  // Filter management
  const addFilter = useCallback((filter: FilterCondition) => {
    setState((s) => ({ ...s, filters: [...s.filters, filter] }));
  }, []);

  const removeFilter = useCallback((filterId: string) => {
    setState((s) => ({
      ...s,
      filters: s.filters.filter((f) => f.id !== filterId),
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setState((s) => ({ ...s, filters: [] }));
  }, []);

  const updateFilter = useCallback((filterId: string, updates: Partial<FilterCondition>) => {
    setState((s) => ({
      ...s,
      filters: s.filters.map((f) =>
        f.id === filterId ? { ...f, ...updates } : f
      ),
    }));
  }, []);

  // Dashboard management
  const addDashboardCard = useCallback((card: DashboardCard) => {
    setState((s) => ({ ...s, dashboardCards: [...s.dashboardCards, card] }));
  }, []);

  const removeDashboardCard = useCallback((cardId: string) => {
    setState((s) => ({
      ...s,
      dashboardCards: s.dashboardCards.filter((c) => c.id !== cardId),
    }));
  }, []);

  const updateDashboardCard = useCallback((cardId: string, updates: Partial<DashboardCard>) => {
    setState((s) => ({
      ...s,
      dashboardCards: s.dashboardCards.map((c) =>
        c.id === cardId ? { ...c, ...updates } : c
      ),
    }));
  }, []);

  const clearDashboard = useCallback(() => {
    setState((s) => ({ ...s, dashboardCards: [] }));
  }, []);

  // Report management
  const addReport = useCallback((report: Report) => {
    setState((s) => ({ ...s, reports: [...s.reports, report] }));
  }, []);

  const removeReport = useCallback((reportId: string) => {
    setState((s) => ({
      ...s,
      reports: s.reports.filter((r) => r.id !== reportId),
    }));
  }, []);

  const updateReport = useCallback((reportId: string, updates: Partial<Report>) => {
    setState((s) => ({
      ...s,
      reports: s.reports.map((r) =>
        r.id === reportId ? { ...r, ...updates, updatedAt: Date.now() } : r
      ),
    }));
  }, []);

  // Computed values
  const activeFile = state.loadedFiles.find((f) => f.id === state.activeFileId) ?? null;

  return {
    // State
    activeTab: state.activeTab,
    loadedFiles: state.loadedFiles,
    activeFileId: state.activeFileId,
    activeFile,
    filters: state.filters,
    dashboardCards: state.dashboardCards,
    reports: state.reports,
    isHydrated,

    // Tab actions
    setActiveTab,

    // File actions
    addFile,
    removeFile,
    setActiveFile,

    // Filter actions
    addFilter,
    removeFilter,
    clearFilters,
    updateFilter,

    // Dashboard actions
    addDashboardCard,
    removeDashboardCard,
    updateDashboardCard,
    clearDashboard,

    // Report actions
    addReport,
    removeReport,
    updateReport,
  };
}

export type UseWorkspaceReturn = ReturnType<typeof useWorkspace>;
```

**Step 2: Commit**

```bash
git add src/hooks/useWorkspace.ts
git commit -m "feat: add useWorkspace hook with localStorage persistence"
```

---

### Task 1.4: Create Tab Navigation Component

**Files:**
- Create: `src/components/TabNavigation.tsx`

**Step 1: Create tab navigation component**

```typescript
// src/components/TabNavigation.tsx
"use client";

import { WorkspaceTab } from "@/types/workspace";
import { MessageSquare, BarChart3, LayoutDashboard, FileText } from "lucide-react";

interface TabNavigationProps {
  activeTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
  disabled?: boolean;
}

const TABS: { id: WorkspaceTab; label: string; icon: React.ReactNode }[] = [
  { id: "chat", label: "Chat", icon: <MessageSquare className="w-4 h-4" /> },
  { id: "profile", label: "Profile", icon: <BarChart3 className="w-4 h-4" /> },
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: "reports", label: "Reports", icon: <FileText className="w-4 h-4" /> },
];

export function TabNavigation({ activeTab, onTabChange, disabled }: TabNavigationProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          disabled={disabled}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
            ${activeTab === tab.id
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }
            ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
          `}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/TabNavigation.tsx
git commit -m "feat: add TabNavigation component"
```

---

### Task 1.5: Create File Selector Component

**Files:**
- Create: `src/components/FileSelector.tsx`

**Step 1: Create file selector dropdown**

```typescript
// src/components/FileSelector.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { LoadedFile } from "@/types/workspace";
import { ChevronDown, File, X, Plus } from "lucide-react";

interface FileSelectorProps {
  files: LoadedFile[];
  activeFileId: string | null;
  onFileSelect: (fileId: string) => void;
  onFileRemove: (fileId: string) => void;
  onAddFile: () => void;
  disabled?: boolean;
}

export function FileSelector({
  files,
  activeFileId,
  onFileSelect,
  onFileRemove,
  onAddFile,
  disabled,
}: FileSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeFile = files.find((f) => f.id === activeFileId);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  if (files.length === 0) {
    return (
      <button
        onClick={onAddFile}
        disabled={disabled}
        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add File
      </button>
    );
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors
          ${disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50 cursor-pointer"}
          bg-white border border-gray-200
        `}
      >
        <File className="w-4 h-4 text-blue-500" />
        <span className="text-gray-700 max-w-[150px] truncate">
          {activeFile?.name ?? "Select file"}
        </span>
        {activeFile && (
          <span className="text-gray-400 text-xs">
            {activeFile.schema.rowCount.toLocaleString()} rows
          </span>
        )}
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1">
          {files.map((file) => (
            <div
              key={file.id}
              className={`
                flex items-center justify-between px-3 py-2 hover:bg-gray-50 cursor-pointer
                ${file.id === activeFileId ? "bg-blue-50" : ""}
              `}
              onClick={() => {
                onFileSelect(file.id);
                setIsOpen(false);
              }}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <File className="w-4 h-4 text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-700 truncate">{file.name}</div>
                  <div className="text-xs text-gray-400">
                    {file.schema.rowCount.toLocaleString()} rows · {formatBytes(file.size)}
                  </div>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onFileRemove(file.id);
                }}
                className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}

          {files.length < 5 && (
            <>
              <div className="border-t border-gray-100 my-1" />
              <button
                onClick={() => {
                  onAddFile();
                  setIsOpen(false);
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add another file
              </button>
            </>
          )}

          {files.length >= 5 && (
            <div className="px-3 py-2 text-xs text-gray-400 text-center">
              Maximum 5 files reached
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/FileSelector.tsx
git commit -m "feat: add FileSelector component for multi-file support"
```

---

### Task 1.6: Create Workspace Layout Component

**Files:**
- Create: `src/components/WorkspaceLayout.tsx`

**Step 1: Create the main workspace layout shell**

```typescript
// src/components/WorkspaceLayout.tsx
"use client";

import { ReactNode } from "react";
import { TabNavigation } from "./TabNavigation";
import { FileSelector } from "./FileSelector";
import { FilterBar } from "./FilterBar";
import { WorkspaceTab, LoadedFile, FilterCondition } from "@/types/workspace";
import { TableSchema } from "@/hooks/useDuckDB";

interface WorkspaceLayoutProps {
  // Tab state
  activeTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;

  // File state
  files: LoadedFile[];
  activeFileId: string | null;
  onFileSelect: (fileId: string) => void;
  onFileRemove: (fileId: string) => void;
  onAddFile: () => void;

  // Filter state
  filters: FilterCondition[];
  onAddFilter: (filter: FilterCondition) => void;
  onRemoveFilter: (filterId: string) => void;
  onClearFilters: () => void;
  schema: TableSchema | null;

  // Content
  children: ReactNode;

  // State
  isLoading?: boolean;
}

export function WorkspaceLayout({
  activeTab,
  onTabChange,
  files,
  activeFileId,
  onFileSelect,
  onFileRemove,
  onAddFile,
  filters,
  onAddFilter,
  onRemoveFilter,
  onClearFilters,
  schema,
  children,
  isLoading,
}: WorkspaceLayoutProps) {
  const hasFiles = files.length > 0;

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold text-gray-900">Data Analyzer</h1>
            <TabNavigation
              activeTab={activeTab}
              onTabChange={onTabChange}
              disabled={!hasFiles || isLoading}
            />
          </div>
          <FileSelector
            files={files}
            activeFileId={activeFileId}
            onFileSelect={onFileSelect}
            onFileRemove={onFileRemove}
            onAddFile={onAddFile}
            disabled={isLoading}
          />
        </div>
      </header>

      {/* Filter Bar - only show when files loaded and not on reports tab */}
      {hasFiles && activeTab !== "reports" && (
        <FilterBar
          filters={filters}
          onAddFilter={onAddFilter}
          onRemoveFilter={onRemoveFilter}
          onClearFilters={onClearFilters}
          schema={schema}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/WorkspaceLayout.tsx
git commit -m "feat: add WorkspaceLayout component"
```

---

### Task 1.7: Create Stub FilterBar Component

**Files:**
- Create: `src/components/FilterBar.tsx`

**Step 1: Create a stub FilterBar (full implementation in Phase 5)**

```typescript
// src/components/FilterBar.tsx
"use client";

import { FilterCondition } from "@/types/workspace";
import { TableSchema } from "@/hooks/useDuckDB";
import { Filter, X } from "lucide-react";

interface FilterBarProps {
  filters: FilterCondition[];
  onAddFilter: (filter: FilterCondition) => void;
  onRemoveFilter: (filterId: string) => void;
  onClearFilters: () => void;
  schema: TableSchema | null;
}

export function FilterBar({
  filters,
  onRemoveFilter,
  onClearFilters,
}: FilterBarProps) {
  if (filters.length === 0) {
    return null; // Don't show bar when no filters
  }

  const formatFilter = (filter: FilterCondition): string => {
    if (filter.operator === "is_null") return `${filter.column} is null`;
    if (filter.operator === "is_not_null") return `${filter.column} is not null`;
    return `${filter.column} ${filter.operator} ${filter.value}`;
  };

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-2">
      <div className="max-w-7xl mx-auto flex items-center gap-2">
        <Filter className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-500">Filters:</span>

        <div className="flex items-center gap-2 flex-wrap">
          {filters.map((filter, index) => (
            <div key={filter.id} className="flex items-center gap-1">
              {index > 0 && (
                <span className="text-xs text-gray-400">{filter.conjunction}</span>
              )}
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-sm rounded-md">
                {formatFilter(filter)}
                <button
                  onClick={() => onRemoveFilter(filter.id)}
                  className="p-0.5 hover:bg-blue-100 rounded transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={onClearFilters}
          className="text-sm text-gray-400 hover:text-gray-600 ml-auto"
        >
          Clear all
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/FilterBar.tsx
git commit -m "feat: add FilterBar component stub"
```

---

### Task 1.8: Create Tab Content Components (Stubs)

**Files:**
- Create: `src/components/tabs/ChatTab.tsx`
- Create: `src/components/tabs/ProfileTab.tsx`
- Create: `src/components/tabs/DashboardTab.tsx`
- Create: `src/components/tabs/ReportsTab.tsx`

**Step 1: Create ChatTab (wrapper for existing functionality)**

```typescript
// src/components/tabs/ChatTab.tsx
"use client";

import { ReactNode } from "react";

interface ChatTabProps {
  children: ReactNode;
}

export function ChatTab({ children }: ChatTabProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-start px-6 pt-10 pb-10">
      {children}
    </div>
  );
}
```

**Step 2: Create ProfileTab stub**

```typescript
// src/components/tabs/ProfileTab.tsx
"use client";

import { TableSchema } from "@/hooks/useDuckDB";
import { BarChart3 } from "lucide-react";

interface ProfileTabProps {
  schema: TableSchema | null;
  runQuery: (sql: string) => Promise<unknown[]>;
}

export function ProfileTab({ schema }: ProfileTabProps) {
  if (!schema) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Load a file to see data profile</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="text-center py-20">
        <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Data Profile</h2>
        <p className="text-gray-500">Coming in Phase 3</p>
        <p className="text-sm text-gray-400 mt-2">
          {schema.columns.length} columns · {schema.rowCount.toLocaleString()} rows
        </p>
      </div>
    </div>
  );
}
```

**Step 3: Create DashboardTab stub**

```typescript
// src/components/tabs/DashboardTab.tsx
"use client";

import { DashboardCard } from "@/types/workspace";
import { LayoutDashboard } from "lucide-react";

interface DashboardTabProps {
  cards: DashboardCard[];
  onAddCard: (card: DashboardCard) => void;
  onRemoveCard: (cardId: string) => void;
  onUpdateCard: (cardId: string, updates: Partial<DashboardCard>) => void;
  runQuery: (sql: string) => Promise<unknown[]>;
}

export function DashboardTab({ cards }: DashboardTabProps) {
  return (
    <div className="max-w-7xl mx-auto p-6">
      {cards.length === 0 ? (
        <div className="text-center py-20">
          <LayoutDashboard className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Dashboard</h2>
          <p className="text-gray-500">Coming in Phase 4</p>
          <p className="text-sm text-gray-400 mt-2">
            Pin charts from Chat to build your dashboard
          </p>
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="text-gray-500">{cards.length} cards pinned</p>
        </div>
      )}
    </div>
  );
}
```

**Step 4: Create ReportsTab stub**

```typescript
// src/components/tabs/ReportsTab.tsx
"use client";

import { Report } from "@/types/workspace";
import { FileText } from "lucide-react";

interface ReportsTabProps {
  reports: Report[];
  onAddReport: (report: Report) => void;
  onRemoveReport: (reportId: string) => void;
  onUpdateReport: (reportId: string, updates: Partial<Report>) => void;
}

export function ReportsTab({ reports }: ReportsTabProps) {
  return (
    <div className="max-w-6xl mx-auto p-6">
      {reports.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Reports</h2>
          <p className="text-gray-500">Coming in Phase 7</p>
          <p className="text-sm text-gray-400 mt-2">
            Generate shareable analysis reports
          </p>
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="text-gray-500">{reports.length} reports created</p>
        </div>
      )}
    </div>
  );
}
```

**Step 5: Commit**

```bash
git add src/components/tabs/
git commit -m "feat: add tab content component stubs"
```

---

### Task 1.9: Refactor Main Page to Use Workspace Layout

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Update page.tsx to use new workspace structure**

This is a significant refactor. The key changes:
1. Import and use `useWorkspace` hook
2. Wrap content in `WorkspaceLayout`
3. Move existing Chat UI into `ChatTab`
4. Add tab switching logic

```typescript
// src/app/page.tsx
"use client";

import { useState, useCallback, useEffect, useRef, FormEvent, KeyboardEvent } from "react";
import { useDropzone } from "react-dropzone";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const CHART_COLORS = [
  "#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
];

import { useDuckDB, TableSchema } from "@/hooks/useDuckDB";
import { useChat, ChatMessage } from "@/hooks/useChat";
import { ChartType } from "@/lib/openai";
import { useAnalysis } from "@/hooks/useAnalysis";
import { useWorkspace } from "@/hooks/useWorkspace";
import { AnalysisResultCard, AnalysisLoadingCard } from "@/components/AnalysisResult";
import { type AgentModel, AGENT_MODELS, AGENT_CONFIG } from "@/lib/agent-protocol";
import { WorkspaceLayout } from "@/components/WorkspaceLayout";
import { ChatTab } from "@/components/tabs/ChatTab";
import { ProfileTab } from "@/components/tabs/ProfileTab";
import { DashboardTab } from "@/components/tabs/DashboardTab";
import { ReportsTab } from "@/components/tabs/ReportsTab";
import { LoadedFile } from "@/types/workspace";

// ... (keep ResultCard, LoadingCard components as-is, they stay in this file for now)
// [KEEP EXISTING ResultCard COMPONENT - lines 38-254]
// [KEEP EXISTING LoadingCard COMPONENT - lines 260-270]

// Remove SchemaPopover - will be replaced by FileSelector

const CHART_OPTIONS: { value: ChartType; label: string; icon: string }[] = [
  { value: "auto", label: "Auto", icon: "✨" },
  { value: "bar", label: "Bar", icon: "📊" },
  { value: "line", label: "Line", icon: "📈" },
  { value: "pie", label: "Pie", icon: "🥧" },
  { value: "scatter", label: "Scatter", icon: "⚬" },
  { value: "table", label: "Table", icon: "📋" },
];

export default function HomePage() {
  const [input, setInput] = useState("");
  const [chartType, setChartType] = useState<ChartType>("auto");
  const [deepAnalysis, setDeepAnalysis] = useState(false);
  const [agentModel, setAgentModel] = useState<AgentModel>(AGENT_CONFIG.defaultModel);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hooks
  const { schema, isLoading: isLoadingFile, error: fileError, loadFile, runQuery, reset } = useDuckDB();
  const { messages, isLoading: isLoadingChat, sendMessage, clearMessages } = useChat();
  const {
    isAnalyzing,
    currentThought,
    currentSteps: analysisSteps,
    results: analysisResults,
    error: analysisError,
    analyze,
    clearResults: clearAnalysis,
  } = useAnalysis();

  const {
    activeTab,
    setActiveTab,
    loadedFiles,
    activeFileId,
    activeFile,
    addFile,
    removeFile,
    setActiveFile,
    filters,
    addFilter,
    removeFilter,
    clearFilters,
    dashboardCards,
    addDashboardCard,
    removeDashboardCard,
    updateDashboardCard,
    reports,
    addReport,
    removeReport,
    updateReport,
  } = useWorkspace();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Auto-scroll to results
  useEffect(() => {
    if (messages.length > 0 && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [messages.length]);

  // File drop handler
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        clearMessages();
        clearAnalysis();

        try {
          await loadFile(file);

          // Get the schema after loading
          // Note: loadFile updates the schema state, we need to wait for it
          // For now, we'll add the file with a placeholder and update
        } catch (err) {
          console.error("Failed to load file:", err);
        }
      }
    },
    [loadFile, clearMessages, clearAnalysis]
  );

  // Update workspace when schema changes
  useEffect(() => {
    if (schema && !loadedFiles.some(f => f.schema.tableName === schema.tableName)) {
      // This is a new file loaded via DuckDB
      // We need the original file info - for now use schema info
      const fileId = crypto.randomUUID();
      const newFile: LoadedFile = {
        id: fileId,
        name: schema.tableName + ".csv",
        size: 0, // Unknown from schema alone
        schema,
        loadedAt: Date.now(),
      };
      addFile(newFile);
    }
  }, [schema, loadedFiles, addFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"] },
    multiple: false,
    noClick: true,
    noKeyboard: true,
  });

  // Handle add file button
  const handleAddFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await onDrop([file]);
    }
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  // Handle file removal
  const handleFileRemove = async (fileId: string) => {
    removeFile(fileId);
    if (loadedFiles.length === 1) {
      // Last file being removed
      await reset();
      clearMessages();
      clearAnalysis();
    }
  };

  // Submit handler
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !schema || isLoadingChat || isAnalyzing) return;

    const query = input.trim();
    setInput("");

    if (deepAnalysis) {
      await analyze(
        query,
        { columns: schema.columns, sampleRows: schema.sampleRows, rowCount: schema.rowCount },
        runQuery,
        chartType,
        agentModel
      );
    } else {
      await sendMessage(
        query,
        { columns: schema.columns, sampleRows: schema.sampleRows, rowCount: schema.rowCount },
        runQuery,
        chartType
      );
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setInput("");
    }
  };

  const exampleQueries = [
    "Show the first 10 rows",
    "Summarize this data",
    "What are the column statistics?",
  ];

  const handleExampleClick = (query: string) => {
    setInput(query);
    inputRef.current?.focus();
  };

  const isReady = !!schema && !isLoadingFile;

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case "profile":
        return <ProfileTab schema={schema} runQuery={runQuery} />;
      case "dashboard":
        return (
          <DashboardTab
            cards={dashboardCards}
            onAddCard={addDashboardCard}
            onRemoveCard={removeDashboardCard}
            onUpdateCard={updateDashboardCard}
            runQuery={runQuery}
          />
        );
      case "reports":
        return (
          <ReportsTab
            reports={reports}
            onAddReport={addReport}
            onRemoveReport={removeReport}
            onUpdateReport={updateReport}
          />
        );
      case "chat":
      default:
        return (
          <ChatTab>
            {/* Input area */}
            <div className="w-full max-w-[640px] mb-10">
              {/* Main input */}
              <form onSubmit={handleSubmit}>
                <div
                  className={`
                    relative bg-white rounded-2xl transition-all duration-200
                    ${isReady
                      ? "shadow-[0_0_0_1px_#e5e7eb,0_4px_20px_rgba(0,0,0,0.08)] focus-within:shadow-[0_0_0_2px_#3b82f6,0_4px_20px_rgba(59,130,246,0.15)]"
                      : "shadow-[0_0_0_1px_#f3f4f6,0_2px_10px_rgba(0,0,0,0.04)]"
                    }
                  `}
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={!isReady || isLoadingChat}
                    placeholder={
                      isLoadingFile
                        ? "Loading file..."
                        : loadedFiles.length === 0
                        ? "Drop a CSV file anywhere to start..."
                        : deepAnalysis
                        ? "Ask complex questions like 'Why is X the most common?'"
                        : "Ask a question about your data..."
                    }
                    className="w-full h-14 bg-transparent border-none outline-none text-gray-700 text-base placeholder:text-gray-400 px-5"
                  />

                  {isReady && input.trim() && (
                    <div className="absolute right-5 top-1/2 -translate-y-1/2">
                      <span className="text-[13px] text-gray-400 bg-gray-100 px-2.5 py-1 rounded-md">
                        Enter ↵
                      </span>
                    </div>
                  )}

                  {isLoadingChat && (
                    <div className="absolute right-5 top-1/2 -translate-y-1/2">
                      <svg className="w-5 h-5 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  )}
                </div>

                {/* Chart type selector */}
                {isReady && (
                  <div className="flex items-center justify-center gap-1 mt-3">
                    {CHART_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setChartType(option.value)}
                        className={`
                          px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                          ${chartType === option.value
                            ? "bg-blue-100 text-blue-700 shadow-sm"
                            : "bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                          }
                        `}
                      >
                        <span className="mr-1">{option.icon}</span>
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Deep Analysis Toggle */}
                {isReady && (
                  <div className="flex items-center justify-center gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => setDeepAnalysis(!deepAnalysis)}
                      className={`
                        flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all
                        ${deepAnalysis
                          ? "bg-purple-100 text-purple-700 shadow-sm"
                          : "bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                        }
                      `}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      Deep Analysis
                    </button>
                    {deepAnalysis && (
                      <div className="flex items-center gap-1">
                        {AGENT_MODELS.map((model) => (
                          <button
                            key={model.value}
                            type="button"
                            onClick={() => setAgentModel(model.value)}
                            title={model.description}
                            className={`
                              px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                              ${agentModel === model.value
                                ? "bg-purple-100 text-purple-700 shadow-sm"
                                : "bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                              }
                            `}
                          >
                            {model.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </form>

              {fileError && (
                <p className="text-sm text-red-500 mt-2 text-center">{fileError}</p>
              )}

              {/* Example queries - only when no files */}
              {loadedFiles.length === 0 && (
                <div className="flex flex-wrap justify-center gap-2 mt-5">
                  {exampleQueries.map((query) => (
                    <button
                      key={query}
                      disabled
                      className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-400 cursor-not-allowed opacity-60"
                    >
                      {query}
                    </button>
                  ))}
                </div>
              )}

              {isReady && messages.length === 0 && analysisResults.length === 0 && (
                <div className="flex flex-wrap justify-center gap-2 mt-5">
                  {exampleQueries.map((query) => (
                    <button
                      key={query}
                      onClick={() => handleExampleClick(query)}
                      className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-500 cursor-pointer transition-all hover:border-gray-300 hover:text-gray-600 hover:shadow-sm"
                    >
                      {query}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Results */}
            <div ref={resultsRef} className="w-full max-w-[900px] flex flex-col gap-4">
              {isAnalyzing && (
                <AnalysisLoadingCard
                  currentThought={currentThought}
                  steps={analysisSteps}
                />
              )}

              {analysisResults.map((entry) => (
                <AnalysisResultCard
                  key={entry.id}
                  result={entry.result}
                  query={entry.query}
                  steps={entry.result.steps}
                />
              ))}

              {analysisError && !isAnalyzing && (
                <div className="bg-red-50 rounded-xl p-5 shadow-[0_0_0_1px_#fecaca,0_1px_3px_rgba(0,0,0,0.05)]">
                  <p className="text-red-600 text-sm">{analysisError}</p>
                </div>
              )}

              {isLoadingChat && !deepAnalysis && <LoadingCard />}

              {!deepAnalysis && [...messages]
                .filter((m) => m.role === "assistant")
                .reverse()
                .map((message) => {
                  const messageIndex = messages.findIndex((m) => m.id === message.id);
                  const userMessage = messageIndex > 0 ? messages[messageIndex - 1] : null;

                  return (
                    <ResultCard
                      key={message.id}
                      message={{
                        ...message,
                        content: userMessage?.role === "user" ? userMessage.content : message.content,
                      }}
                    />
                  );
                })}

              {(messages.length > 2 || analysisResults.length > 0) && (
                <div className="text-center pt-4">
                  <button
                    onClick={() => {
                      clearMessages();
                      clearAnalysis();
                    }}
                    className="text-sm text-gray-400 hover:text-gray-600 transition-colors bg-transparent border-none cursor-pointer"
                  >
                    Clear all results
                  </button>
                </div>
              )}
            </div>
          </ChatTab>
        );
    }
  };

  return (
    <div {...getRootProps()}>
      <input {...getInputProps()} />
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Drag overlay */}
      {isDragActive && (
        <div className="fixed inset-0 bg-blue-500/5 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-xl font-medium text-gray-700">Drop your CSV file</p>
            <p className="text-gray-400 mt-1">Release to upload</p>
          </div>
        </div>
      )}

      <WorkspaceLayout
        activeTab={activeTab}
        onTabChange={setActiveTab}
        files={loadedFiles}
        activeFileId={activeFileId}
        onFileSelect={setActiveFile}
        onFileRemove={handleFileRemove}
        onAddFile={handleAddFile}
        filters={filters}
        onAddFilter={addFilter}
        onRemoveFilter={removeFilter}
        onClearFilters={clearFilters}
        schema={schema}
        isLoading={isLoadingFile}
      >
        {/* No file loaded state */}
        {loadedFiles.length === 0 && !isLoadingFile && activeTab === "chat" && (
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-3">
                Drop a CSV file to start
              </h2>
              <p className="text-gray-500">
                Your data stays in your browser - nothing is uploaded to a server
              </p>
            </div>
            <button
              onClick={handleAddFile}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
            >
              Choose File
            </button>
          </div>
        )}

        {/* Tab content */}
        {(loadedFiles.length > 0 || isLoadingFile) && renderTabContent()}
      </WorkspaceLayout>

      {/* Footer hint */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 text-xs text-gray-400 flex items-center gap-1">
        <kbd className="px-2 py-0.5 bg-gray-100 rounded text-gray-500 text-[11px]">⌘</kbd>
        <span>+</span>
        <kbd className="px-2 py-0.5 bg-gray-100 rounded text-gray-500 text-[11px]">K</kbd>
        <span className="ml-1.5">to focus input</span>
      </div>
    </div>
  );
}
```

**Note:** This is a large refactor. The ResultCard and LoadingCard components should be kept in the file (lines 38-270 from original). The SchemaPopover component can be removed as FileSelector replaces it.

**Step 2: Verify the build**

Run: `bun run build`
Expected: Build succeeds

**Step 3: Test manually**

Run: `bun run dev`
- Verify tabs appear in header
- Verify file selector appears
- Verify Chat tab works as before
- Verify other tabs show "Coming soon" stubs

**Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: refactor main page to use workspace layout with tabs"
```

---

## Phase 2: Multi-File Support

### Task 2.1: Extend DuckDB for Multiple Tables

**Files:**
- Modify: `src/lib/duckdb.ts`
- Modify: `src/hooks/useDuckDB.ts`

**Step 1: Update duckdb.ts to support multiple tables**

Add these functions to `src/lib/duckdb.ts`:

```typescript
// Add to src/lib/duckdb.ts after existing functions

/**
 * Load a CSV file as a new table without resetting existing tables
 */
export async function loadCSVAsTable(
  file: File,
  tableName: string
): Promise<{ columns: string[]; sampleRows: unknown[]; rowCount: number }> {
  const safeTableName = validateTableName(tableName);
  const safeFileName = sanitizeFileName(file.name);

  const database = await initializeDuckDB();
  const conn = await getConnection();

  try {
    await database.registerFileHandle(
      safeFileName,
      file,
      duckdb.DuckDBDataProtocol.BROWSER_FILEREADER,
      true
    );

    await conn.query(`
      CREATE OR REPLACE TABLE "${safeTableName}" AS
      SELECT * FROM read_csv_auto('${safeFileName}', ignore_errors=true, quote='"')
    `);

    const columnsResult = await conn.query(`DESCRIBE "${safeTableName}"`);
    const columns = columnsResult
      .toArray()
      .map((row) => row.toJSON().column_name as string);

    const sampleResult = await conn.query(`SELECT * FROM "${safeTableName}" LIMIT 5`);
    const sampleRows = sampleResult.toArray().map((row) => convertBigInts(row.toJSON()));

    const countResult = await conn.query(
      `SELECT COUNT(*) as count FROM "${safeTableName}"`
    );
    const rowCount = Number(countResult.toArray()[0].toJSON().count);

    return { columns, sampleRows, rowCount };
  } catch (error) {
    try {
      await database.dropFile(safeFileName);
    } catch {
      // Ignore cleanup errors
    }
    throw error;
  }
}

/**
 * Drop a specific table
 */
export async function dropTable(tableName: string): Promise<void> {
  const safeTableName = validateTableName(tableName);
  const conn = await getConnection();
  await conn.query(`DROP TABLE IF EXISTS "${safeTableName}"`);
}

/**
 * List all tables in the database
 */
export async function listTables(): Promise<string[]> {
  const conn = await getConnection();
  const result = await conn.query("SHOW TABLES");
  return result.toArray().map((row) => row.toJSON().name as string);
}
```

**Step 2: Update useDuckDB hook for multi-file support**

Replace `src/hooks/useDuckDB.ts`:

```typescript
// src/hooks/useDuckDB.ts
"use client";

import { useState, useCallback, useRef } from "react";
import {
  loadCSVFromFile,
  loadCSVAsTable,
  executeQuery,
  resetDuckDB,
  dropTable,
} from "@/lib/duckdb";

export interface TableSchema {
  tableName: string;
  columns: string[];
  sampleRows: unknown[];
  rowCount: number;
}

export interface UseDuckDBReturn {
  schema: TableSchema | null;
  schemas: Map<string, TableSchema>;
  isLoading: boolean;
  error: string | null;
  loadFile: (file: File, tableName?: string) => Promise<TableSchema>;
  loadAdditionalFile: (file: File, tableName: string) => Promise<TableSchema>;
  runQuery: (sql: string, timeoutMs?: number) => Promise<unknown[]>;
  removeTable: (tableName: string) => Promise<void>;
  setActiveSchema: (tableName: string) => void;
  reset: () => Promise<void>;
}

const DEFAULT_QUERY_TIMEOUT = 30000;

export function useDuckDB(): UseDuckDBReturn {
  const [schemas, setSchemas] = useState<Map<string, TableSchema>>(new Map());
  const [activeTableName, setActiveTableName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadingRef = useRef(false);

  // Active schema (for backward compatibility)
  const schema = activeTableName ? schemas.get(activeTableName) ?? null : null;

  const loadFile = useCallback(async (file: File, tableName: string = "data"): Promise<TableSchema> => {
    if (loadingRef.current) {
      throw new Error("File load already in progress");
    }

    loadingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      await resetDuckDB();
      setSchemas(new Map());

      const result = await loadCSVFromFile(file, tableName);

      const newSchema: TableSchema = {
        tableName,
        columns: result.columns,
        sampleRows: result.sampleRows,
        rowCount: result.rowCount,
      };

      setSchemas(new Map([[tableName, newSchema]]));
      setActiveTableName(tableName);

      return newSchema;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load CSV";
      setError(message);
      console.error("DuckDB load error:", err);
      setSchemas(new Map());
      setActiveTableName(null);
      throw err;
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, []);

  const loadAdditionalFile = useCallback(async (file: File, tableName: string): Promise<TableSchema> => {
    if (loadingRef.current) {
      throw new Error("File load already in progress");
    }

    loadingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const result = await loadCSVAsTable(file, tableName);

      const newSchema: TableSchema = {
        tableName,
        columns: result.columns,
        sampleRows: result.sampleRows,
        rowCount: result.rowCount,
      };

      setSchemas((prev) => new Map(prev).set(tableName, newSchema));

      return newSchema;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load CSV";
      setError(message);
      console.error("DuckDB load error:", err);
      throw err;
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, []);

  const removeTable = useCallback(async (tableName: string): Promise<void> => {
    try {
      await dropTable(tableName);
      setSchemas((prev) => {
        const next = new Map(prev);
        next.delete(tableName);
        return next;
      });

      if (activeTableName === tableName) {
        const remaining = Array.from(schemas.keys()).filter((k) => k !== tableName);
        setActiveTableName(remaining[0] ?? null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to remove table";
      setError(message);
      throw err;
    }
  }, [activeTableName, schemas]);

  const setActiveSchema = useCallback((tableName: string) => {
    if (schemas.has(tableName)) {
      setActiveTableName(tableName);
    }
  }, [schemas]);

  const runQuery = useCallback(async (
    sql: string,
    timeoutMs: number = DEFAULT_QUERY_TIMEOUT
  ): Promise<unknown[]> => {
    setError(null);

    try {
      return await executeQuery(sql, timeoutMs);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Query failed";
      setError(message);
      throw err;
    }
  }, []);

  const reset = useCallback(async () => {
    await resetDuckDB();
    setSchemas(new Map());
    setActiveTableName(null);
    setError(null);
  }, []);

  return {
    schema,
    schemas,
    isLoading,
    error,
    loadFile,
    loadAdditionalFile,
    runQuery,
    removeTable,
    setActiveSchema,
    reset,
  };
}
```

**Step 3: Commit**

```bash
git add src/lib/duckdb.ts src/hooks/useDuckDB.ts
git commit -m "feat: extend DuckDB for multi-table support"
```

---

### Task 2.2: Update Page for Multi-File Workflow

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Update file handling in page.tsx**

Update the file handling to properly support multiple files. Key changes:

1. Update `onDrop` to use `loadAdditionalFile` when files already exist
2. Track file metadata (name, size) alongside schema
3. Update `handleFileRemove` to properly clean up

Add/modify these sections in `src/app/page.tsx`:

```typescript
// Update the onDrop callback
const onDrop = useCallback(
  async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];

    // Generate a safe table name from filename
    const tableName = file.name
      .replace(/\.csv$/i, "")
      .replace(/[^a-zA-Z0-9_]/g, "_")
      .toLowerCase();

    try {
      let newSchema: TableSchema;

      if (loadedFiles.length === 0) {
        // First file - use loadFile which resets everything
        clearMessages();
        clearAnalysis();
        newSchema = await loadFile(file, tableName);
      } else {
        // Additional file - use loadAdditionalFile
        if (loadedFiles.length >= 5) {
          setError("Maximum 5 files allowed");
          return;
        }
        newSchema = await loadAdditionalFile(file, tableName);
      }

      // Add to workspace
      const fileId = crypto.randomUUID();
      const newFile: LoadedFile = {
        id: fileId,
        name: file.name,
        size: file.size,
        schema: newSchema,
        loadedAt: Date.now(),
      };
      addFile(newFile);
    } catch (err) {
      console.error("Failed to load file:", err);
    }
  },
  [loadFile, loadAdditionalFile, loadedFiles, clearMessages, clearAnalysis, addFile]
);

// Remove the useEffect that auto-adds files based on schema changes
// (It's no longer needed since we handle it in onDrop)

// Update handleFileRemove
const handleFileRemove = async (fileId: string) => {
  const file = loadedFiles.find(f => f.id === fileId);
  if (!file) return;

  if (loadedFiles.length === 1) {
    // Last file - full reset
    await reset();
    clearMessages();
    clearAnalysis();
  } else {
    // Remove just this table
    await removeTable(file.schema.tableName);
  }

  removeFile(fileId);
};
```

Also update the destructuring from useDuckDB:

```typescript
const {
  schema,
  schemas,
  isLoading: isLoadingFile,
  error: fileError,
  loadFile,
  loadAdditionalFile,
  runQuery,
  removeTable,
  reset
} = useDuckDB();
```

**Step 2: Verify build and test**

Run: `bun run build`
Run: `bun run dev`

Test:
- Load one CSV file
- Load a second CSV file
- Verify both appear in file selector
- Remove one file
- Verify the other remains

**Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: implement multi-file workflow in main page"
```

---

## Phase 3: Data Profiling

### Task 3.1: Create Profile API Route

**Files:**
- Create: `src/app/api/profile/route.ts`

**Step 1: Create the profiling endpoint**

```typescript
// src/app/api/profile/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";

const ProfileRequestSchema = z.object({
  tableName: z.string().min(1).max(128),
  columns: z.array(z.string().max(256)).max(500),
  rowCount: z.number().int().nonnegative(),
});

export type ProfileRequest = z.infer<typeof ProfileRequestSchema>;

export interface ColumnProfile {
  name: string;
  type: "numeric" | "categorical" | "datetime" | "text" | "boolean" | "unknown";
  nullCount: number;
  nullPercent: number;
  distinctCount: number;
  // Numeric fields
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  stdDev?: number;
  histogram?: { bucket: string; count: number }[];
  // Categorical fields
  topValues?: { value: string; count: number; percent: number }[];
  // Text fields
  avgLength?: number;
  minLength?: number;
  maxLength?: number;
  // Date fields
  minDate?: string;
  maxDate?: string;
}

export interface DataQualityAlert {
  type: "high_nulls" | "potential_duplicates" | "outliers" | "mixed_types";
  severity: "warning" | "error";
  column?: string;
  message: string;
  details?: string;
}

export interface ProfileResponse {
  overview: {
    rowCount: number;
    columnCount: number;
    numericColumns: number;
    categoricalColumns: number;
    dateColumns: number;
    textColumns: number;
    completenessScore: number;
  };
  columns: ColumnProfile[];
  alerts: DataQualityAlert[];
  correlations?: { col1: string; col2: string; correlation: number }[];
  // SQL queries to run client-side for each column
  profilingQueries: { column: string; queries: { name: string; sql: string }[] }[];
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = ProfileRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { tableName, columns, rowCount } = parsed.data;

    // Generate profiling queries for each column
    // These will be executed client-side in DuckDB
    const profilingQueries = columns.map((column) => {
      const safeCol = `"${column.replace(/"/g, '""')}"`;
      const safeTable = `"${tableName.replace(/"/g, '""')}"`;

      return {
        column,
        queries: [
          {
            name: "basic_stats",
            sql: `
              SELECT
                COUNT(*) as total_count,
                COUNT(${safeCol}) as non_null_count,
                COUNT(*) - COUNT(${safeCol}) as null_count,
                COUNT(DISTINCT ${safeCol}) as distinct_count
              FROM ${safeTable}
            `,
          },
          {
            name: "numeric_stats",
            sql: `
              SELECT
                MIN(TRY_CAST(${safeCol} AS DOUBLE)) as min_val,
                MAX(TRY_CAST(${safeCol} AS DOUBLE)) as max_val,
                AVG(TRY_CAST(${safeCol} AS DOUBLE)) as mean_val,
                STDDEV(TRY_CAST(${safeCol} AS DOUBLE)) as std_dev,
                MEDIAN(TRY_CAST(${safeCol} AS DOUBLE)) as median_val
              FROM ${safeTable}
              WHERE TRY_CAST(${safeCol} AS DOUBLE) IS NOT NULL
            `,
          },
          {
            name: "top_values",
            sql: `
              SELECT
                CAST(${safeCol} AS VARCHAR) as value,
                COUNT(*) as count
              FROM ${safeTable}
              WHERE ${safeCol} IS NOT NULL
              GROUP BY ${safeCol}
              ORDER BY count DESC
              LIMIT 10
            `,
          },
          {
            name: "text_stats",
            sql: `
              SELECT
                AVG(LENGTH(CAST(${safeCol} AS VARCHAR))) as avg_length,
                MIN(LENGTH(CAST(${safeCol} AS VARCHAR))) as min_length,
                MAX(LENGTH(CAST(${safeCol} AS VARCHAR))) as max_length
              FROM ${safeTable}
              WHERE ${safeCol} IS NOT NULL
            `,
          },
          {
            name: "type_check",
            sql: `
              SELECT
                SUM(CASE WHEN TRY_CAST(${safeCol} AS DOUBLE) IS NOT NULL THEN 1 ELSE 0 END) as numeric_count,
                SUM(CASE WHEN TRY_CAST(${safeCol} AS DATE) IS NOT NULL THEN 1 ELSE 0 END) as date_count,
                SUM(CASE WHEN LOWER(CAST(${safeCol} AS VARCHAR)) IN ('true', 'false', '0', '1', 'yes', 'no') THEN 1 ELSE 0 END) as bool_count,
                COUNT(*) as total_count
              FROM ${safeTable}
              WHERE ${safeCol} IS NOT NULL
            `,
          },
        ],
      };
    });

    // Also generate correlation query for numeric columns (to be run client-side)
    const correlationQuery = `
      SELECT 'correlations' as query_type
      -- Client will compute correlations from numeric columns
    `;

    // Generate duplicate check query
    const duplicateCheckQuery = `
      SELECT COUNT(*) as duplicate_count
      FROM (
        SELECT ${columns.map(c => `"${c.replace(/"/g, '""')}"`).join(", ")}, COUNT(*) as cnt
        FROM "${tableName.replace(/"/g, '""')}"
        GROUP BY ${columns.map(c => `"${c.replace(/"/g, '""')}"`).join(", ")}
        HAVING COUNT(*) > 1
      ) t
    `;

    const response: ProfileResponse = {
      overview: {
        rowCount,
        columnCount: columns.length,
        numericColumns: 0, // Will be computed client-side
        categoricalColumns: 0,
        dateColumns: 0,
        textColumns: 0,
        completenessScore: 0,
      },
      columns: [], // Will be populated client-side
      alerts: [], // Will be populated client-side
      profilingQueries,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Profile API error:", error);
    return NextResponse.json(
      { error: "Failed to generate profile queries" },
      { status: 500 }
    );
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/profile/route.ts
git commit -m "feat: add profile API route for generating profiling queries"
```

---

### Task 3.2: Create useProfile Hook

**Files:**
- Create: `src/hooks/useProfile.ts`

**Step 1: Create the profiling hook**

```typescript
// src/hooks/useProfile.ts
"use client";

import { useState, useCallback } from "react";
import { TableSchema } from "./useDuckDB";

export interface ColumnProfile {
  name: string;
  type: "numeric" | "categorical" | "datetime" | "text" | "boolean" | "unknown";
  nullCount: number;
  nullPercent: number;
  distinctCount: number;
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  stdDev?: number;
  topValues?: { value: string; count: number; percent: number }[];
  avgLength?: number;
  minLength?: number;
  maxLength?: number;
  minDate?: string;
  maxDate?: string;
  histogram?: { bucket: string; count: number }[];
}

export interface DataQualityAlert {
  type: "high_nulls" | "potential_duplicates" | "outliers" | "mixed_types";
  severity: "warning" | "error";
  column?: string;
  message: string;
}

export interface ProfileData {
  overview: {
    rowCount: number;
    columnCount: number;
    numericColumns: number;
    categoricalColumns: number;
    dateColumns: number;
    textColumns: number;
    completenessScore: number;
  };
  columns: ColumnProfile[];
  alerts: DataQualityAlert[];
  correlations: { col1: string; col2: string; correlation: number }[];
}

export function useProfile() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const generateProfile = useCallback(async (
    schema: TableSchema,
    runQuery: (sql: string) => Promise<unknown[]>
  ) => {
    setIsLoading(true);
    setError(null);
    setProgress(0);
    setProfile(null);

    try {
      // Fetch profiling queries from API
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableName: schema.tableName,
          columns: schema.columns,
          rowCount: schema.rowCount,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get profiling queries");
      }

      const { profilingQueries } = await response.json();

      // Execute queries for each column
      const columnProfiles: ColumnProfile[] = [];
      const alerts: DataQualityAlert[] = [];
      let numericCount = 0;
      let categoricalCount = 0;
      let dateCount = 0;
      let textCount = 0;
      let totalNulls = 0;
      let totalValues = 0;

      for (let i = 0; i < profilingQueries.length; i++) {
        const { column, queries } = profilingQueries[i];
        setProgress(Math.round((i / profilingQueries.length) * 100));

        const profile: ColumnProfile = {
          name: column,
          type: "unknown",
          nullCount: 0,
          nullPercent: 0,
          distinctCount: 0,
        };

        try {
          // Basic stats
          const basicStats = await runQuery(queries.find((q: { name: string }) => q.name === "basic_stats")?.sql);
          if (basicStats.length > 0) {
            const stats = basicStats[0] as Record<string, number>;
            profile.nullCount = stats.null_count ?? 0;
            profile.nullPercent = schema.rowCount > 0
              ? (stats.null_count / schema.rowCount) * 100
              : 0;
            profile.distinctCount = stats.distinct_count ?? 0;
            totalNulls += stats.null_count ?? 0;
            totalValues += stats.total_count ?? 0;
          }

          // Type detection
          const typeCheck = await runQuery(queries.find((q: { name: string }) => q.name === "type_check")?.sql);
          if (typeCheck.length > 0) {
            const types = typeCheck[0] as Record<string, number>;
            const total = types.total_count || 1;
            const numericRatio = (types.numeric_count || 0) / total;
            const dateRatio = (types.date_count || 0) / total;
            const boolRatio = (types.bool_count || 0) / total;

            if (numericRatio > 0.9) {
              profile.type = "numeric";
              numericCount++;
            } else if (dateRatio > 0.9) {
              profile.type = "datetime";
              dateCount++;
            } else if (boolRatio > 0.9) {
              profile.type = "boolean";
              categoricalCount++;
            } else if (profile.distinctCount < 50 && profile.distinctCount < schema.rowCount * 0.1) {
              profile.type = "categorical";
              categoricalCount++;
            } else {
              profile.type = "text";
              textCount++;
            }
          }

          // Numeric stats (if numeric)
          if (profile.type === "numeric") {
            const numericStats = await runQuery(queries.find((q: { name: string }) => q.name === "numeric_stats")?.sql);
            if (numericStats.length > 0) {
              const stats = numericStats[0] as Record<string, number>;
              profile.min = stats.min_val;
              profile.max = stats.max_val;
              profile.mean = stats.mean_val;
              profile.median = stats.median_val;
              profile.stdDev = stats.std_dev;
            }
          }

          // Top values (for categorical)
          if (profile.type === "categorical" || profile.distinctCount <= 20) {
            const topValues = await runQuery(queries.find((q: { name: string }) => q.name === "top_values")?.sql);
            profile.topValues = (topValues as { value: string; count: number }[]).map((v) => ({
              value: String(v.value),
              count: v.count,
              percent: schema.rowCount > 0 ? (v.count / schema.rowCount) * 100 : 0,
            }));
          }

          // Text stats
          if (profile.type === "text") {
            const textStats = await runQuery(queries.find((q: { name: string }) => q.name === "text_stats")?.sql);
            if (textStats.length > 0) {
              const stats = textStats[0] as Record<string, number>;
              profile.avgLength = stats.avg_length;
              profile.minLength = stats.min_length;
              profile.maxLength = stats.max_length;
            }
          }

          // Generate alerts
          if (profile.nullPercent > 20) {
            alerts.push({
              type: "high_nulls",
              severity: profile.nullPercent > 50 ? "error" : "warning",
              column: column,
              message: `${column} has ${profile.nullPercent.toFixed(1)}% null values`,
            });
          }

          // Check for potential outliers in numeric columns
          if (profile.type === "numeric" && profile.stdDev && profile.mean) {
            const range = profile.max! - profile.min!;
            const expectedRange = profile.stdDev * 6; // 3 std devs each way
            if (range > expectedRange * 2) {
              alerts.push({
                type: "outliers",
                severity: "warning",
                column: column,
                message: `${column} may contain outliers (large range relative to std dev)`,
              });
            }
          }

        } catch (err) {
          console.warn(`Failed to profile column ${column}:`, err);
        }

        columnProfiles.push(profile);
      }

      // Calculate completeness
      const totalPossibleValues = schema.rowCount * schema.columns.length;
      const completenessScore = totalPossibleValues > 0
        ? ((totalPossibleValues - totalNulls) / totalPossibleValues) * 100
        : 100;

      // Check for duplicates
      try {
        const safeTable = `"${schema.tableName.replace(/"/g, '""')}"`;
        const safeCols = schema.columns.map(c => `"${c.replace(/"/g, '""')}"`).join(", ");
        const dupQuery = `
          SELECT COUNT(*) as dup_count FROM (
            SELECT ${safeCols}, COUNT(*) as cnt
            FROM ${safeTable}
            GROUP BY ${safeCols}
            HAVING COUNT(*) > 1
          ) t
        `;
        const dupResult = await runQuery(dupQuery);
        if (dupResult.length > 0) {
          const dupCount = (dupResult[0] as { dup_count: number }).dup_count;
          if (dupCount > 0) {
            alerts.push({
              type: "potential_duplicates",
              severity: "warning",
              message: `Found ${dupCount} groups of potentially duplicate rows`,
            });
          }
        }
      } catch {
        // Ignore duplicate check errors
      }

      setProfile({
        overview: {
          rowCount: schema.rowCount,
          columnCount: schema.columns.length,
          numericColumns: numericCount,
          categoricalColumns: categoricalCount,
          dateColumns: dateCount,
          textColumns: textCount,
          completenessScore,
        },
        columns: columnProfiles,
        alerts,
        correlations: [], // TODO: Add correlation computation
      });

      setProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate profile");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearProfile = useCallback(() => {
    setProfile(null);
    setError(null);
    setProgress(0);
  }, []);

  return {
    profile,
    isLoading,
    error,
    progress,
    generateProfile,
    clearProfile,
  };
}
```

**Step 2: Commit**

```bash
git add src/hooks/useProfile.ts
git commit -m "feat: add useProfile hook for data profiling"
```

---

### Task 3.3: Create Profile Components

**Files:**
- Create: `src/components/profile/ProfileOverview.tsx`
- Create: `src/components/profile/ColumnCard.tsx`
- Create: `src/components/profile/AlertsPanel.tsx`

**Step 1: Create ProfileOverview component**

```typescript
// src/components/profile/ProfileOverview.tsx
"use client";

import { ProfileData } from "@/hooks/useProfile";
import { Hash, Type, Calendar, FileText, CheckCircle } from "lucide-react";

interface ProfileOverviewProps {
  overview: ProfileData["overview"];
}

export function ProfileOverview({ overview }: ProfileOverviewProps) {
  const stats = [
    { label: "Rows", value: overview.rowCount.toLocaleString(), icon: <Hash className="w-4 h-4" /> },
    { label: "Columns", value: overview.columnCount, icon: <Type className="w-4 h-4" /> },
    { label: "Numeric", value: overview.numericColumns, icon: <Hash className="w-4 h-4 text-blue-500" /> },
    { label: "Categorical", value: overview.categoricalColumns, icon: <Type className="w-4 h-4 text-green-500" /> },
    { label: "Date/Time", value: overview.dateColumns, icon: <Calendar className="w-4 h-4 text-purple-500" /> },
    { label: "Text", value: overview.textColumns, icon: <FileText className="w-4 h-4 text-orange-500" /> },
  ];

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Dataset Overview</h2>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {stats.map((stat) => (
          <div key={stat.label} className="text-center">
            <div className="flex items-center justify-center mb-1 text-gray-400">
              {stat.icon}
            </div>
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-sm text-gray-500">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Completeness Score */}
      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
        <CheckCircle className={`w-5 h-5 ${
          overview.completenessScore >= 90 ? "text-green-500" :
          overview.completenessScore >= 70 ? "text-yellow-500" :
          "text-red-500"
        }`} />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-700">Data Completeness</span>
            <span className="text-sm font-bold text-gray-900">
              {overview.completenessScore.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                overview.completenessScore >= 90 ? "bg-green-500" :
                overview.completenessScore >= 70 ? "bg-yellow-500" :
                "bg-red-500"
              }`}
              style={{ width: `${overview.completenessScore}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Create ColumnCard component**

```typescript
// src/components/profile/ColumnCard.tsx
"use client";

import { useState } from "react";
import { ColumnProfile } from "@/hooks/useProfile";
import { ChevronDown, Hash, Type, Calendar, FileText, ToggleLeft } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ColumnCardProps {
  profile: ColumnProfile;
  totalRows: number;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  numeric: <Hash className="w-4 h-4 text-blue-500" />,
  categorical: <Type className="w-4 h-4 text-green-500" />,
  datetime: <Calendar className="w-4 h-4 text-purple-500" />,
  text: <FileText className="w-4 h-4 text-orange-500" />,
  boolean: <ToggleLeft className="w-4 h-4 text-pink-500" />,
  unknown: <Type className="w-4 h-4 text-gray-400" />,
};

export function ColumnCard({ profile, totalRows }: ColumnCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const nonNullPercent = 100 - profile.nullPercent;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {TYPE_ICONS[profile.type]}
          <span className="font-medium text-gray-900">{profile.name}</span>
          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
            {profile.type}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm text-gray-500">
              {profile.distinctCount.toLocaleString()} distinct
            </div>
            <div className="text-xs text-gray-400">
              {profile.nullPercent.toFixed(1)}% null
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          {/* Completeness bar */}
          <div className="mt-3 mb-4">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Completeness</span>
              <span>{nonNullPercent.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-blue-500"
                style={{ width: `${nonNullPercent}%` }}
              />
            </div>
          </div>

          {/* Numeric stats */}
          {profile.type === "numeric" && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
              {[
                { label: "Min", value: profile.min?.toLocaleString() },
                { label: "Max", value: profile.max?.toLocaleString() },
                { label: "Mean", value: profile.mean?.toFixed(2) },
                { label: "Median", value: profile.median?.toFixed(2) },
                { label: "Std Dev", value: profile.stdDev?.toFixed(2) },
              ].map((stat) => (
                <div key={stat.label} className="text-center p-2 bg-gray-50 rounded">
                  <div className="text-xs text-gray-500">{stat.label}</div>
                  <div className="font-medium text-gray-900">{stat.value ?? "N/A"}</div>
                </div>
              ))}
            </div>
          )}

          {/* Text stats */}
          {profile.type === "text" && (
            <div className="grid grid-cols-3 gap-4 mb-4">
              {[
                { label: "Avg Length", value: profile.avgLength?.toFixed(0) },
                { label: "Min Length", value: profile.minLength },
                { label: "Max Length", value: profile.maxLength },
              ].map((stat) => (
                <div key={stat.label} className="text-center p-2 bg-gray-50 rounded">
                  <div className="text-xs text-gray-500">{stat.label}</div>
                  <div className="font-medium text-gray-900">{stat.value ?? "N/A"}</div>
                </div>
              ))}
            </div>
          )}

          {/* Top values chart */}
          {profile.topValues && profile.topValues.length > 0 && (
            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">
                Top Values
              </div>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={profile.topValues.slice(0, 8)}
                    layout="vertical"
                    margin={{ top: 0, right: 0, bottom: 0, left: 80 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="value"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      width={75}
                      tickFormatter={(v) => v.length > 12 ? v.slice(0, 12) + "..." : v}
                    />
                    <Tooltip
                      formatter={(value: number) => [value.toLocaleString(), "Count"]}
                      contentStyle={{
                        background: "white",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

**Step 3: Create AlertsPanel component**

```typescript
// src/components/profile/AlertsPanel.tsx
"use client";

import { DataQualityAlert } from "@/hooks/useProfile";
import { AlertTriangle, AlertCircle, Copy } from "lucide-react";

interface AlertsPanelProps {
  alerts: DataQualityAlert[];
}

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  if (alerts.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
          <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <div className="font-medium text-green-800">No data quality issues found</div>
          <div className="text-sm text-green-600">Your dataset looks clean!</div>
        </div>
      </div>
    );
  }

  const warnings = alerts.filter((a) => a.severity === "warning");
  const errors = alerts.filter((a) => a.severity === "error");

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <h3 className="font-medium text-gray-900">Data Quality Alerts</h3>
        <p className="text-sm text-gray-500">
          {errors.length} errors, {warnings.length} warnings
        </p>
      </div>
      <div className="divide-y divide-gray-100">
        {alerts.map((alert, index) => (
          <div
            key={index}
            className={`px-4 py-3 flex items-start gap-3 ${
              alert.severity === "error" ? "bg-red-50" : ""
            }`}
          >
            {alert.severity === "error" ? (
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            ) : alert.type === "potential_duplicates" ? (
              <Copy className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
            )}
            <div>
              <div className={`font-medium ${
                alert.severity === "error" ? "text-red-800" : "text-gray-800"
              }`}>
                {alert.message}
              </div>
              {alert.column && (
                <div className="text-sm text-gray-500">
                  Column: <code className="px-1 py-0.5 bg-gray-100 rounded text-xs">{alert.column}</code>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add src/components/profile/
git commit -m "feat: add profile display components"
```

---

### Task 3.4: Update ProfileTab with Full Implementation

**Files:**
- Modify: `src/components/tabs/ProfileTab.tsx`

**Step 1: Implement the full ProfileTab**

```typescript
// src/components/tabs/ProfileTab.tsx
"use client";

import { useEffect } from "react";
import { TableSchema } from "@/hooks/useDuckDB";
import { useProfile } from "@/hooks/useProfile";
import { ProfileOverview } from "@/components/profile/ProfileOverview";
import { ColumnCard } from "@/components/profile/ColumnCard";
import { AlertsPanel } from "@/components/profile/AlertsPanel";
import { BarChart3, RefreshCw, Loader2 } from "lucide-react";

interface ProfileTabProps {
  schema: TableSchema | null;
  runQuery: (sql: string) => Promise<unknown[]>;
}

export function ProfileTab({ schema, runQuery }: ProfileTabProps) {
  const { profile, isLoading, error, progress, generateProfile, clearProfile } = useProfile();

  // Auto-generate profile when schema changes
  useEffect(() => {
    if (schema && !profile && !isLoading) {
      generateProfile(schema, runQuery);
    }
  }, [schema, profile, isLoading, generateProfile, runQuery]);

  // Clear profile when schema changes
  useEffect(() => {
    clearProfile();
  }, [schema?.tableName, clearProfile]);

  if (!schema) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Load a file to see data profile</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 text-blue-500 animate-spin" />
          <p className="text-gray-600 font-medium mb-2">Analyzing your data...</p>
          <div className="w-48 bg-gray-200 rounded-full h-2 mx-auto">
            <div
              className="h-2 rounded-full bg-blue-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-gray-400 mt-2">{progress}% complete</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-red-500" />
          </div>
          <p className="text-red-600 font-medium mb-2">Failed to generate profile</p>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <button
            onClick={() => generateProfile(schema, runQuery)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <button
          onClick={() => generateProfile(schema, runQuery)}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
        >
          <BarChart3 className="w-5 h-5" />
          Generate Profile
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Profile</h1>
          <p className="text-gray-500">{schema.tableName}</p>
        </div>
        <button
          onClick={() => generateProfile(schema, runQuery)}
          className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Overview */}
      <ProfileOverview overview={profile.overview} />

      {/* Alerts */}
      <AlertsPanel alerts={profile.alerts} />

      {/* Column Profiles */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Column Analysis</h2>
        <div className="space-y-3">
          {profile.columns.map((col) => (
            <ColumnCard
              key={col.name}
              profile={col}
              totalRows={profile.overview.rowCount}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Verify build and test**

Run: `bun run build`
Run: `bun run dev`

Test:
- Load a CSV file
- Click on Profile tab
- Verify profile generates automatically
- Check overview stats are correct
- Expand column cards
- Check alerts panel

**Step 3: Commit**

```bash
git add src/components/tabs/ProfileTab.tsx
git commit -m "feat: implement full ProfileTab with auto-profiling"
```

---

## Phase 4-7: Remaining Implementation

The remaining phases follow the same pattern. Due to length constraints, I'll outline the key tasks:

### Phase 4: Dashboard Tab
- Task 4.1: Install and configure react-grid-layout
- Task 4.2: Create DashboardCard component with chart rendering
- Task 4.3: Create AddCardModal for quick queries
- Task 4.4: Implement DashboardTab with grid layout
- Task 4.5: Add "Pin to Dashboard" button to Chat results
- Task 4.6: Implement card resize/move/refresh

### Phase 5: Interactive Filtering
- Task 5.1: Create FilterBuilderModal component
- Task 5.2: Create NL filter parsing API endpoint
- Task 5.3: Update FilterBar with add filter functionality
- Task 5.4: Integrate filters with Dashboard queries
- Task 5.5: Integrate filters with Chat queries

### Phase 6: Chart & Visual Exports
- Task 6.1: Create useChartExport hook with html2canvas
- Task 6.2: Add export dropdown to chart components
- Task 6.3: Implement PNG export
- Task 6.4: Implement SVG export
- Task 6.5: Implement copy-to-clipboard

### Phase 7: Reports Tab
- Task 7.1: Create ReportBlock components (Text, Chart, Table)
- Task 7.2: Create ReportCanvas with drag-drop ordering
- Task 7.3: Create ReportTemplates selector
- Task 7.4: Implement Markdown export
- Task 7.5: Implement PDF export with @react-pdf/renderer
- Task 7.6: Complete ReportsTab integration

---

## Verification Checklist

After completing all phases, verify:

- [ ] Tab navigation works correctly
- [ ] Multiple files can be loaded (up to 5)
- [ ] Files can be switched and removed
- [ ] Profile tab shows comprehensive data analysis
- [ ] Dashboard cards can be added, moved, resized
- [ ] Filters apply globally across tabs
- [ ] Charts can be exported as PNG/SVG
- [ ] Reports can be created and exported
- [ ] State persists across page refresh
- [ ] No console errors in production build

---

## Final Commit

After all phases complete:

```bash
git add .
git commit -m "feat: complete feature-rich workspace implementation

- Add tab-based workspace (Chat, Profile, Dashboard, Reports)
- Implement multi-file support (up to 5 CSV files)
- Add automated data profiling with quality alerts
- Create dashboard with draggable chart cards
- Add interactive filtering (NL and visual)
- Implement chart export (PNG, SVG, clipboard)
- Add report builder with PDF/Markdown export
- Persist workspace state to localStorage"
```
