// src/hooks/useWorkspace.ts
"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  WorkspaceState,
  WorkspaceTab,
  LoadedFile,
  DashboardCard,
  DEFAULT_WORKSPACE_STATE,
} from "@/types/workspace";
import {
  storeFile,
  getFile,
  deleteFile,
  storedFileToFile,
  isIndexedDBAvailable,
} from "@/lib/file-storage";

const STORAGE_KEY = "ai-data-analyzer-workspace";
const FILE_METADATA_KEY = "ai-data-analyzer-file-metadata";

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
    // Save workspace state (tab, dashboard) - NOT file metadata
    // File metadata is saved separately when pinning/unpinning
    const toSave: Partial<WorkspaceState> = {
      activeTab: state.activeTab,
      dashboardCards: state.dashboardCards,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (e) {
    console.warn("Failed to save workspace state:", e);
  }
}

/**
 * Save pinned file metadata to localStorage
 * Called explicitly when files are pinned/unpinned
 */
function savePinnedFileMetadata(files: LoadedFile[]): void {
  if (typeof window === "undefined") return;

  try {
    const pinnedFiles = files.filter((f) => f.isPinned);
    const fileMetadata = pinnedFiles.map((f) => ({
      id: f.id,
      name: f.name,
      size: f.size,
      schema: f.schema,
      loadedAt: f.loadedAt,
      isPinned: f.isPinned,
    }));
    localStorage.setItem(FILE_METADATA_KEY, JSON.stringify(fileMetadata));
  } catch (e) {
    console.warn("Failed to save pinned file metadata:", e);
  }
}

/**
 * Load persisted file metadata from localStorage
 */
function loadFileMetadata(): LoadedFile[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(FILE_METADATA_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as LoadedFile[];
  } catch {
    return [];
  }
}

// Use lazy initialization to load from storage on first render
function getInitialState(): WorkspaceState {
  // During SSR, return default state
  if (typeof window === "undefined") return DEFAULT_WORKSPACE_STATE;
  return loadFromStorage();
}

export function useWorkspace() {
  // Use lazy initialization to avoid hydration mismatch
  const [state, setState] = useState<WorkspaceState>(DEFAULT_WORKSPACE_STATE);
  const isHydratedRef = useRef(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from localStorage on mount using a ref to track initialization
  useEffect(() => {
    if (!isHydratedRef.current) {
      isHydratedRef.current = true;
      const storedState = getInitialState();
      // Use functional update to batch state changes
      setState(storedState);
      setIsHydrated(true);
    }
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

  // File management - with IndexedDB persistence
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
        loadedFiles: [...s.loadedFiles, { ...file, isPinned: false }],
        activeFileId: file.id,
      };
    });
  }, []);

  // Toggle pin status and persist/unpersist file
  const togglePinFile = useCallback(async (fileId: string, originalFile?: File) => {
    const file = state.loadedFiles.find((f) => f.id === fileId);
    if (!file) return;

    const newPinnedStatus = !file.isPinned;

    // Compute updated files list
    const updatedFiles = state.loadedFiles.map((f) =>
      f.id === fileId ? { ...f, isPinned: newPinnedStatus } : f
    );

    // Update state
    setState((s) => ({
      ...s,
      loadedFiles: updatedFiles,
    }));

    // Save pinned file metadata to localStorage immediately
    savePinnedFileMetadata(updatedFiles);

    // Handle IndexedDB persistence
    if (isIndexedDBAvailable()) {
      if (newPinnedStatus && originalFile) {
        // Pin: store in IndexedDB
        try {
          await storeFile(originalFile, fileId);
        } catch (err) {
          console.warn("Failed to persist file to IndexedDB:", err);
          // Revert state on error
          const revertedFiles = state.loadedFiles.map((f) =>
            f.id === fileId ? { ...f, isPinned: false } : f
          );
          setState((s) => ({
            ...s,
            loadedFiles: revertedFiles,
          }));
          savePinnedFileMetadata(revertedFiles);
        }
      } else if (!newPinnedStatus) {
        // Unpin: remove from IndexedDB
        try {
          await deleteFile(fileId);
        } catch (err) {
          console.warn("Failed to remove file from IndexedDB:", err);
        }
      }
    }
  }, [state.loadedFiles]);

  const removeFile = useCallback((fileId: string) => {
    // Check if this file was pinned before removing
    const fileToRemove = state.loadedFiles.find((f) => f.id === fileId);
    const wasPinned = fileToRemove?.isPinned;

    const newFiles = state.loadedFiles.filter((f) => f.id !== fileId);

    setState((s) => ({
      ...s,
      loadedFiles: newFiles,
      activeFileId:
        s.activeFileId === fileId
          ? newFiles[0]?.id ?? null
          : s.activeFileId,
    }));

    // Update pinned metadata if necessary
    if (wasPinned) {
      savePinnedFileMetadata(newFiles);
    }

    // Remove from IndexedDB
    if (isIndexedDBAvailable()) {
      deleteFile(fileId).catch((err) => {
        console.warn("Failed to delete file from IndexedDB:", err);
      });
    }
  }, [state.loadedFiles]);

  const setActiveFile = useCallback((fileId: string | null) => {
    setState((s) => ({ ...s, activeFileId: fileId }));
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

  // Get persisted file metadata for restoration
  const getPersistedFiles = useCallback(async () => {
    if (!isIndexedDBAvailable()) {
      return [];
    }

    const metadata = loadFileMetadata();
    const persistedFiles: Array<{ metadata: LoadedFile; file: File }> = [];

    for (const meta of metadata) {
      try {
        const stored = await getFile(meta.id);
        if (stored) {
          const file = storedFileToFile(stored);
          persistedFiles.push({ metadata: meta, file });
        }
      } catch (err) {
        console.warn(`Failed to restore file ${meta.name}:`, err);
      }
    }

    return persistedFiles;
  }, []);

  // Restore files to workspace state (used after reloading into DuckDB)
  const restoreFiles = useCallback((files: LoadedFile[]) => {
    setState((s) => ({
      ...s,
      loadedFiles: files,
      activeFileId: files[0]?.id ?? null,
    }));
  }, []);

  // Clear all persisted files (useful for full reset)
  const clearPersistedFiles = useCallback(async () => {
    if (!isIndexedDBAvailable()) return;

    try {
      const { clearAllFiles } = await import("@/lib/file-storage");
      await clearAllFiles();
      localStorage.removeItem(FILE_METADATA_KEY);
    } catch (err) {
      console.warn("Failed to clear persisted files:", err);
    }
  }, []);

  // Computed values
  const activeFile = state.loadedFiles.find((f) => f.id === state.activeFileId) ?? null;

  return {
    // State
    activeTab: state.activeTab,
    loadedFiles: state.loadedFiles,
    activeFileId: state.activeFileId,
    activeFile,
    dashboardCards: state.dashboardCards,
    isHydrated,

    // Tab actions
    setActiveTab,

    // File actions
    addFile,
    removeFile,
    setActiveFile,
    togglePinFile,

    // Persistence actions
    getPersistedFiles,
    restoreFiles,
    clearPersistedFiles,

    // Dashboard actions
    addDashboardCard,
    removeDashboardCard,
    updateDashboardCard,
    clearDashboard,
  };
}

export type UseWorkspaceReturn = ReturnType<typeof useWorkspace>;
