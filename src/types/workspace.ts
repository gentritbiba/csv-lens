// src/types/workspace.ts
import { TableSchema } from "@/hooks/useDuckDB";

export type WorkspaceTab = "chat" | "profile" | "dashboard";

export interface LoadedFile {
  id: string;
  name: string;
  size: number;
  schema: TableSchema;
  loadedAt: number;
  /** Whether this file is pinned for persistence across sessions */
  isPinned?: boolean;
}

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
  /** Name of the source dataset(s) for display purposes */
  sourceDataset?: string;
  /** Timestamp when the card was created */
  createdAt?: number;
  /** Static data for cards without SQL (e.g., from agentic analysis results) */
  staticData?: unknown[];
}

export interface WorkspaceState {
  activeTab: WorkspaceTab;
  loadedFiles: LoadedFile[];
  activeFileId: string | null;
  dashboardCards: DashboardCard[];
}

export const DEFAULT_WORKSPACE_STATE: WorkspaceState = {
  activeTab: "chat",
  loadedFiles: [],
  activeFileId: null,
  dashboardCards: [],
};
