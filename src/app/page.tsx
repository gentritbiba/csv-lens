"use client";

import { useState, useCallback, useEffect, useRef, FormEvent, KeyboardEvent } from "react";
import { useDropzone } from "react-dropzone";
import { Sparkles, ArrowUp, Command, Upload, Table2, Braces, TrendingUp, PieChart, ScatterChart, Trash2, BarChart3, Square, FileText, Check, Layers, Brain } from "lucide-react";

import { useDuckDB } from "@/hooks/useDuckDB";
import { ChartType } from "@/lib/claude/types";
import { useAnalysis, getActiveSession } from "@/hooks/useAnalysis";
import { useWorkspace } from "@/hooks/useWorkspace";
import { AnalysisCard } from "@/components/AnalysisCard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { type AgentModel, AGENT_CONFIG, AGENT_MODELS } from "@/lib/agent-protocol";
import { WorkspaceLayout } from "@/components/WorkspaceLayout";
import { ChatTab } from "@/components/tabs/ChatTab";
import { ProfileTab } from "@/components/tabs/ProfileTab";
import { DashboardTab } from "@/components/tabs/DashboardTab";
import { LoadedFile, DashboardCard } from "@/types/workspace";
import { SimpleTooltip } from "@/components/ui/SimpleTooltip";
import { PinHint } from "@/components/PinHint";

// ============================================================================
// CHART OPTIONS
// ============================================================================

const CHART_OPTIONS: { value: ChartType; label: string; icon: React.ReactNode }[] = [
  { value: "auto", label: "Auto", icon: <Sparkles className="w-3.5 h-3.5" /> },
  { value: "bar", label: "Bar", icon: <BarChart3 className="w-3.5 h-3.5" /> },
  { value: "line", label: "Line", icon: <TrendingUp className="w-3.5 h-3.5" /> },
  { value: "pie", label: "Pie", icon: <PieChart className="w-3.5 h-3.5" /> },
  { value: "scatter", label: "Scatter", icon: <ScatterChart className="w-3.5 h-3.5" /> },
  { value: "table", label: "Table", icon: <Table2 className="w-3.5 h-3.5" /> },
];

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function HomePage() {
  const [input, setInput] = useState("");
  const [chartType, setChartType] = useState<ChartType>("auto");
  const [agentModel, setAgentModel] = useState<AgentModel>(AGENT_CONFIG.defaultModel);
  const [useExtendedThinking, setUseExtendedThinking] = useState(false);
  // Multi-file selection: "focused" = active file only, "selected" = user-selected files
  const [fileMode, setFileMode] = useState<"focused" | "selected">("focused");
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [showPinHint, setShowPinHint] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // DuckDB hook
  const {
    schema,
    schemas,
    isLoading: isLoadingFile,
    loadFile,
    loadAdditionalFile,
    runQuery,
    removeTable,
    setActiveSchema,
    reset
  } = useDuckDB();

  // Analysis hook
  const {
    isAnalyzing,
    currentThought,
    currentSteps: analysisSteps,
    results: analysisResults,
    error: analysisError,
    canRetry: canRetryAnalysis,
    analyze,
    retryAnalysis,
    resumeSession,
    clearResults: clearAnalysis,
    clearError: clearAnalysisError,
    cancelAnalysis,
  } = useAnalysis();

  // Workspace hook
  const {
    activeTab,
    setActiveTab,
    loadedFiles,
    activeFileId,
    addFile,
    removeFile,
    setActiveFile,
    togglePinFile,
    dashboardCards,
    addDashboardCard,
    removeDashboardCard,
    updateDashboardCard,
    getPersistedFiles,
    restoreFiles,
    isHydrated,
  } = useWorkspace();

  // Store original File objects for pinning (needed for IndexedDB storage)
  const originalFilesRef = useRef<Map<string, File>>(new Map());

  // Track if we've attempted file restoration
  const hasRestoredRef = useRef(false);
  const [filesRestored, setFilesRestored] = useState(false);

  // Restore persisted files on page load
  useEffect(() => {
    if (!isHydrated || hasRestoredRef.current) return;
    hasRestoredRef.current = true;

    const restorePersistedFiles = async () => {
      try {
        const persistedFiles = await getPersistedFiles();
        if (persistedFiles.length === 0) {
          setFilesRestored(true);
          return;
        }

        // Load each file into DuckDB
        const restoredMetadata: LoadedFile[] = [];

        for (let i = 0; i < persistedFiles.length; i++) {
          const { metadata, file } = persistedFiles[i];
          const tableName = metadata.schema.tableName;

          try {
            if (i === 0) {
              // First file - use loadFile which resets DuckDB
              await loadFile(file, tableName);
            } else {
              // Additional files
              await loadAdditionalFile(file, tableName);
            }
            // Store the file reference for potential re-pinning
            originalFilesRef.current.set(metadata.id, file);
            restoredMetadata.push(metadata);
          } catch (err) {
            console.warn(`Failed to restore file ${metadata.name}:`, err);
          }
        }

        // Update workspace state with restored files
        if (restoredMetadata.length > 0) {
          restoreFiles(restoredMetadata);
        }

        // Mark files as restored
        setFilesRestored(true);
      } catch (err) {
        console.warn("Failed to restore persisted files:", err);
        setFilesRestored(true);
      }
    };

    restorePersistedFiles();
  }, [isHydrated, getPersistedFiles, loadFile, loadAdditionalFile, restoreFiles]);

  // Auto-resume active session after files are restored
  const hasAttemptedResumeRef = useRef(false);
  useEffect(() => {
    if (!filesRestored || hasAttemptedResumeRef.current || isAnalyzing) return;
    hasAttemptedResumeRef.current = true;

    const activeSession = getActiveSession();
    if (!activeSession) return;

    // Check if we have files loaded (DuckDB ready)
    if (loadedFiles.length === 0) {
      console.log("[Session] No files loaded, cannot resume session");
      return;
    }

    // Try to resume the session
    console.log("[Session] Attempting to resume session:", activeSession.sessionId);
    resumeSession(activeSession.sessionId, activeSession.query, runQuery);
  }, [filesRestored, isAnalyzing, loadedFiles.length, resumeSession, runQuery]);

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
    if (analysisResults.length > 0 && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [analysisResults.length]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  // File drop handler
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
        let newSchema;

        if (loadedFiles.length === 0) {
          // First file - use loadFile which resets everything
          clearAnalysis();
          newSchema = await loadFile(file, tableName);
        } else {
          // Additional file - use loadAdditionalFile
          if (loadedFiles.length >= 5) {
            console.warn("Maximum 5 files allowed");
            return;
          }
          newSchema = await loadAdditionalFile(file, tableName);
        }

        // Add to workspace and store original file for potential pinning
        const fileId = crypto.randomUUID();
        const newFile: LoadedFile = {
          id: fileId,
          name: file.name,
          size: file.size,
          schema: newSchema,
          loadedAt: Date.now(),
        };
        originalFilesRef.current.set(fileId, file);
        addFile(newFile);

        // Show pin hint after first file load
        if (loadedFiles.length === 0) {
          setShowPinHint(true);
        }

        // Sync DuckDB active schema with the newly loaded file
        setActiveSchema(tableName);
      } catch (err) {
        console.error("Failed to load file:", err);
      }
    },
    [loadFile, loadAdditionalFile, loadedFiles, clearAnalysis, addFile, setActiveSchema]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"] },
    multiple: false,
    noClick: true,
    noKeyboard: true,
  });

  // Handle add file button click
  const handleAddFile = () => {
    fileInputRef.current?.click();
  };

  // Handle file input change
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
    const file = loadedFiles.find(f => f.id === fileId);
    if (!file) return;

    if (loadedFiles.length === 1) {
      // Last file - full reset
      await reset();
      clearAnalysis();
    } else {
      // Remove just this table
      await removeTable(file.schema.tableName);
    }

    // Clean up original file reference
    originalFilesRef.current.delete(fileId);
    removeFile(fileId);
  };

  // Handle file pinning
  const handlePinFile = (fileId: string) => {
    const originalFile = originalFilesRef.current.get(fileId);
    togglePinFile(fileId, originalFile);
  };

  // Handle file selection - sync workspace and DuckDB active schema
  const handleFileSelect = (fileId: string) => {
    const file = loadedFiles.find(f => f.id === fileId);
    if (file) {
      setActiveFile(fileId);
      setActiveSchema(file.schema.tableName);
    }
  };


  // Build schema context based on file mode selection
  const getSchemaContext = useCallback(() => {
    if (fileMode === "focused") {
      // Only use the active/focused file - look up by activeFileId to ensure UI selection is respected
      const activeFile = loadedFiles.find(f => f.id === activeFileId);
      if (!activeFile) return null;

      // Get schema from DuckDB's schemas map using the file's table name
      const s = schemas.get(activeFile.schema.tableName);
      if (!s) return null;

      return {
        tableName: s.tableName,
        columns: s.columns,
        sampleRows: s.sampleRows,
        rowCount: s.rowCount,
      };
    } else {
      // Use selected files
      const selectedSchemas = loadedFiles
        .filter(f => selectedFileIds.has(f.id))
        .map(f => {
          const s = schemas.get(f.schema.tableName);
          if (!s) return null;
          return {
            tableName: s.tableName,
            columns: s.columns,
            sampleRows: s.sampleRows,
            rowCount: s.rowCount,
          };
        })
        .filter((s): s is NonNullable<typeof s> => s !== null);

      if (selectedSchemas.length === 0) return null;
      if (selectedSchemas.length === 1) return selectedSchemas[0];
      return selectedSchemas;
    }
  }, [fileMode, loadedFiles, activeFileId, selectedFileIds, schemas]);

  // Toggle file selection for agentic multi-file mode
  const toggleFileSelection = (fileId: string) => {
    setSelectedFileIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };


  // Submit handler
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !schema || isAnalyzing) return;

    const query = input.trim();
    setInput("");

    const schemaContext = getSchemaContext();
    if (!schemaContext) {
      console.error("No schema context available for analysis");
      return;
    }
    await analyze(
      query,
      schemaContext,
      runQuery,
      chartType,
      agentModel,
      useExtendedThinking
    );
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      setInput("");
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Example queries
  const exampleQueries = [
    { text: "Show the first 10 rows", icon: <Table2 className="w-3.5 h-3.5" /> },
    { text: "Summarize this dataset", icon: <Sparkles className="w-3.5 h-3.5" /> },
    { text: "What are the column statistics?", icon: <Braces className="w-3.5 h-3.5" /> },
  ];

  const handleExampleClick = (query: string) => {
    setInput(query);
    inputRef.current?.focus();
  };

  const isReady = !!schema && !isLoadingFile;
  const isProcessing = isAnalyzing;

  // Cancel current generation
  const handleCancel = () => {
    cancelAnalysis();
  };

  // Render tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case "chat":
        return (
          <ChatTab>
            {/* Input Section - Centered and prominent */}
            <div className="w-full max-w-[720px] mb-12">
              {/* Main Input Container */}
              <form onSubmit={handleSubmit}>
                <div
                  className={`
                    relative rounded-2xl transition-all duration-300
                    bg-[--card] border
                    ${isReady
                      ? "border-[--border] focus-within:border-[--primary]/50 focus-within:shadow-[0_0_0_1px_var(--primary),var(--shadow-glow)]"
                      : "border-[--border] opacity-70"
                    }
                  `}
                >
                  {/* Textarea Input */}
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={!isReady || isProcessing}
                    placeholder={
                      isLoadingFile
                        ? "Loading dataset..."
                        : loadedFiles.length === 0
                        ? "Drop a CSV file to begin exploring your data..."
                        : "Ask a question about your data..."
                    }
                    rows={1}
                    className="
                      w-full min-h-[56px] max-h-[200px] bg-transparent border-none outline-none resize-none
                      text-[--foreground] text-[15px] leading-relaxed placeholder:text-[--foreground-subtle]
                      px-5 py-4 pr-14
                    "
                  />

                  {/* Submit / Stop Button */}
                  {isProcessing ? (
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="
                        absolute right-3 bottom-3 w-10 h-10 rounded-xl
                        flex items-center justify-center
                        transition-all duration-200
                        bg-[--destructive] text-[--destructive-foreground] hover:scale-105 active:scale-95
                      "
                      title="Stop generation"
                    >
                      <Square className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={!isReady || !input.trim()}
                      className={`
                        absolute right-3 bottom-3 w-10 h-10 rounded-xl
                        flex items-center justify-center
                        transition-all duration-200
                        ${input.trim() && isReady
                          ? "bg-[--primary] text-[--primary-foreground] hover:scale-105 active:scale-95"
                          : "bg-[--background-subtle] text-[--foreground-subtle] cursor-not-allowed"
                        }
                      `}
                    >
                      <ArrowUp className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* Controls Row */}
                {isReady && (
                  <div className="flex flex-nowrap items-center justify-center gap-2 mt-4 px-1 max-w-[1000px] mx-auto">
                    {/* Chart Type Selector - Icons only (except Auto) */}
                    <div
                      className="flex items-center gap-0.5 p-1 rounded-xl border overflow-visible"
                      style={{
                        backgroundColor: '#21262d',
                        borderColor: 'rgba(240, 243, 246, 0.1)'
                      }}
                    >
                      {CHART_OPTIONS.map((option) => {
                        const isActive = chartType === option.value;
                        const isAuto = option.value === "auto";

                        const buttonElement = (
                          <button
                            type="button"
                            onClick={() => setChartType(option.value)}
                            className="flex items-center justify-center rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer"
                            style={{
                              backgroundColor: isActive ? '#f0b429' : 'transparent',
                              color: isActive ? '#0f1419' : '#9198a1',
                              boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.2)' : 'none',
                              padding: isAuto ? '6px 10px' : '6px 8px',
                              minWidth: isAuto ? 'auto' : '32px',
                            }}
                            onMouseEnter={(e) => {
                              if (!isActive) {
                                e.currentTarget.style.backgroundColor = '#1c2128';
                                e.currentTarget.style.color = '#f0f3f6';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isActive) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.color = '#9198a1';
                              }
                            }}
                          >
                            {isAuto ? <span>Auto</span> : option.icon}
                          </button>
                        );

                        return isAuto ? (
                          <div key={option.value}>{buttonElement}</div>
                        ) : (
                          <SimpleTooltip key={option.value} content={option.label} position="top">
                            {buttonElement}
                          </SimpleTooltip>
                        );
                      })}
                    </div>

                    {/* Divider */}
                    <div className="h-8 w-px" style={{ backgroundColor: 'rgba(240, 243, 246, 0.15)' }} />

                    {/* Model Selector + Thinking Toggle */}
                    <div
                      className="flex items-center rounded-xl border overflow-hidden"
                      style={{
                        backgroundColor: '#1c2128',
                        borderColor: 'rgba(240, 180, 41, 0.3)',
                        boxShadow: '0 0 20px rgba(240, 180, 41, 0.1)',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      {/* Model Options */}
                      <div className="flex items-center gap-0.5 px-2">
                        {AGENT_MODELS.map((model) => {
                          const isModelActive = agentModel === model.value;
                          return (
                            <SimpleTooltip
                              key={model.value}
                              content={model.description}
                              position="top"
                            >
                              <button
                                type="button"
                                onClick={() => setAgentModel(model.value)}
                                className="px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200 whitespace-nowrap flex items-center gap-1"
                                style={{
                                  backgroundColor: isModelActive ? '#f0b429' : 'transparent',
                                  color: isModelActive ? '#0f1419' : '#656d76',
                                  fontWeight: isModelActive ? 600 : 500,
                                  cursor: 'pointer',
                                }}
                                onMouseEnter={(e) => {
                                  if (!isModelActive) {
                                    e.currentTarget.style.backgroundColor = 'rgba(240, 180, 41, 0.15)';
                                    e.currentTarget.style.color = '#f0b429';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isModelActive) {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    e.currentTarget.style.color = '#656d76';
                                  }
                                }}
                              >
                                {model.label}
                              </button>
                            </SimpleTooltip>
                          );
                        })}
                      </div>

                      {/* Extended Thinking Toggle */}
                      <SimpleTooltip content={useExtendedThinking ? "Thinking enabled" : "Thinking disabled"} position="top">
                        <button
                          type="button"
                          onClick={() => setUseExtendedThinking(!useExtendedThinking)}
                          className="flex items-center gap-1.5 px-3 py-2.5 transition-all duration-200 cursor-pointer"
                          style={{
                            backgroundColor: useExtendedThinking ? 'rgba(136, 87, 229, 0.15)' : 'transparent',
                            color: useExtendedThinking ? '#a371f7' : '#656d76',
                            borderLeft: '1px solid rgba(240, 180, 41, 0.2)',
                          }}
                          onMouseEnter={(e) => {
                            if (!useExtendedThinking) {
                              e.currentTarget.style.backgroundColor = 'rgba(136, 87, 229, 0.08)';
                              e.currentTarget.style.color = '#a371f7';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!useExtendedThinking) {
                              e.currentTarget.style.backgroundColor = 'transparent';
                              e.currentTarget.style.color = '#656d76';
                            }
                          }}
                        >
                          <Brain
                            className="w-4 h-4 transition-all duration-200"
                            style={{
                              filter: useExtendedThinking ? 'drop-shadow(0 0 4px rgba(136, 87, 229, 0.5))' : 'none'
                            }}
                          />
                        </button>
                      </SimpleTooltip>
                    </div>

                    {/* Divider - only when file selector is shown */}
                    {loadedFiles.length > 1 && (
                      <div className="h-8 w-px" style={{ backgroundColor: 'rgba(240, 180, 41, 0.3)' }} />
                    )}

                    {/* File Selection - inline, only when multiple files */}
                    {loadedFiles.length > 1 && (
                      <div className="flex items-center gap-2 animate-fade-in">
                        {/* Mode Toggle: Focused vs Multiple */}
                        <div className="flex items-center gap-0.5 p-1 rounded-lg" style={{ backgroundColor: '#21262d' }}>
                          <button
                            type="button"
                            onClick={() => setFileMode("focused")}
                            className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-200"
                            style={{
                              backgroundColor: fileMode === "focused" ? '#f0b429' : 'transparent',
                              color: fileMode === "focused" ? '#0f1419' : '#9198a1',
                            }}
                            title="Analyze only the currently focused file"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Focused</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setFileMode("selected")}
                            className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-200"
                            style={{
                              backgroundColor: fileMode === "selected" ? '#f0b429' : 'transparent',
                              color: fileMode === "selected" ? '#0f1419' : '#9198a1',
                            }}
                            title="Select multiple files to analyze together"
                          >
                            <Layers className="w-3 h-3" />
                            <span>Multiple</span>
                          </button>
                        </div>

                        {/* File Selector - Shows when "Multiple" mode is selected */}
                        {fileMode === "selected" && (
                          <div className="flex items-center gap-1 flex-wrap">
                            {loadedFiles.map((file) => {
                              const isSelected = selectedFileIds.has(file.id);
                              return (
                                <button
                                  key={file.id}
                                  type="button"
                                  onClick={() => toggleFileSelection(file.id)}
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all duration-200"
                                  style={{
                                    backgroundColor: isSelected ? 'rgba(63, 185, 80, 0.15)' : '#21262d',
                                    color: isSelected ? '#3fb950' : '#9198a1',
                                    border: `1px solid ${isSelected ? 'rgba(63, 185, 80, 0.3)' : 'transparent'}`,
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!isSelected) {
                                      e.currentTarget.style.backgroundColor = 'rgba(240, 243, 246, 0.08)';
                                      e.currentTarget.style.color = '#f0f3f6';
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!isSelected) {
                                      e.currentTarget.style.backgroundColor = '#21262d';
                                      e.currentTarget.style.color = '#9198a1';
                                    }
                                  }}
                                  title={`${file.schema.tableName} - ${file.schema.rowCount} rows`}
                                >
                                  {isSelected && <Check className="w-3 h-3" />}
                                  <span className="truncate max-w-[80px]">
                                    {file.name.replace(/\.csv$/i, '')}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </form>

              {/* Empty State - Beautiful drop zone */}
              {loadedFiles.length === 0 && !isLoadingFile && (
                <div className="mt-12 animate-fade-in-up">
                  <div
                    onClick={handleAddFile}
                    className="
                      group relative cursor-pointer
                      p-12 rounded-2xl border-2 border-dashed border-[--border]
                      hover:border-[--primary]/50 hover:bg-[--primary-muted]/30
                      transition-all duration-300
                    "
                  >
                    {/* Decorative background */}
                    <div className="absolute inset-0 rounded-2xl overflow-hidden">
                      <div className="absolute inset-0 data-grid-bg opacity-50" />
                    </div>

                    <div className="relative text-center">
                      {/* Icon */}
                      <div className="
                        w-20 h-20 mx-auto mb-6 rounded-2xl
                        bg-gradient-to-br from-[--primary-muted] to-[--accent-muted]
                        flex items-center justify-center
                        group-hover:scale-110 transition-transform duration-300
                      ">
                        <Upload className="w-10 h-10 text-[--primary]" />
                      </div>

                      {/* Text */}
                      <h3 className="text-xl font-semibold text-[--foreground] mb-2">
                        Drop your CSV file here
                      </h3>
                      <p className="text-[--foreground-subtle] mb-4">
                        or click to browse your files
                      </p>

                      {/* Supported info */}
                      <div className="flex items-center justify-center gap-4 text-xs text-[--foreground-subtle]">
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[--success]" />
                          CSV files supported
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[--success]" />
                          Up to 5 datasets
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[--success]" />
                          Local processing
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Example Queries */}
              {isReady && analysisResults.length === 0 && (
                <div className="mt-8 animate-fade-in">
                  <p className="text-xs text-[--foreground-subtle] text-center mb-3 uppercase tracking-wider">
                    Try these examples
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {exampleQueries.map((query, i) => (
                      <button
                        key={query.text}
                        onClick={() => handleExampleClick(query.text)}
                        className={`
                          group flex items-center gap-2 px-4 py-2.5 rounded-xl
                          bg-[--card] border border-[--border]
                          text-sm text-[--foreground-muted]
                          hover:text-[--foreground] hover:border-[--border-strong] hover:bg-[--background-subtle]
                          transition-all duration-200
                          animate-fade-in
                        `}
                        style={{ animationDelay: `${i * 100}ms` }}
                      >
                        <span className="text-[--foreground-subtle] group-hover:text-[--primary] transition-colors">
                          {query.icon}
                        </span>
                        {query.text}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Results Section */}
            <div ref={resultsRef} className="w-full max-w-[900px] flex flex-col gap-5">
              {/* Results Header with Clear Button */}
              {analysisResults.length > 0 && !isAnalyzing && (
                <div className="flex items-center justify-between">
                  <span
                    className="text-xs font-medium uppercase tracking-wider"
                    style={{ color: '#656d76' }}
                  >
                    Results
                  </span>
                  <button
                    type="button"
                    onClick={clearAnalysis}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer"
                    style={{
                      backgroundColor: 'transparent',
                      color: '#656d76',
                    }}
                    title="Clear all results"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#f85149';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = '#656d76';
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear all</span>
                  </button>
                </div>
              )}

              {/* Loading state */}
              {isAnalyzing && (
                <AnalysisCard
                  state="processing"
                  mode="deep"
                  currentThought={currentThought}
                  steps={analysisSteps}
                  isAgentic
                />
              )}

              {/* Error states with retry option */}
              {analysisError && !isAnalyzing && (
                <div className="bg-[--destructive]/10 rounded-2xl p-5 border border-[--destructive]/20 animate-fade-in">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-[--destructive] text-sm font-medium mb-1">Analysis Error</p>
                      <p className="text-[--destructive]/80 text-sm">{analysisError}</p>
                      {analysisSteps.length > 0 && (
                        <p className="text-[--foreground-muted] text-xs mt-2">
                          Progress saved: {analysisSteps.length} step{analysisSteps.length !== 1 ? 's' : ''} completed
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {canRetryAnalysis && (
                        <button
                          onClick={retryAnalysis}
                          className="px-4 py-2 text-sm font-medium rounded-lg bg-[--primary] text-[--primary-foreground] hover:bg-[--primary]/90 transition-colors"
                        >
                          Retry
                        </button>
                      )}
                      <button
                        onClick={clearAnalysisError}
                        className="px-3 py-2 text-sm text-[--foreground-muted] hover:text-[--foreground] transition-colors"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Analysis results - sorted by timestamp (newest first) */}
              {[...analysisResults]
                .sort((a, b) => b.timestamp - a.timestamp)
                .map((entry, index) => (
                  <div key={entry.id} className="animate-fade-in-up" style={{ animationDelay: `${index * 50}ms` }}>
                    <AnalysisCard
                      state="result"
                      query={entry.query}
                      answer={entry.result.answer}
                      chartType={entry.result.chartType}
                      chartData={entry.result.chartData}
                      xAxis={entry.result.xAxis}
                      yAxis={entry.result.yAxis}
                      steps={entry.result.steps}
                      durationMs={entry.result.durationMs}
                      isAgentic={true}
                      runQuery={runQuery}
                      onPinToDashboard={(config) => {
                        // Get source dataset name(s) based on file mode
                        const sourceDataset = fileMode === "focused"
                          ? schema?.tableName
                          : loadedFiles
                              .filter(f => selectedFileIds.has(f.id))
                              .map(f => f.schema.tableName)
                              .join(", ") || schema?.tableName;

                        const newCard: DashboardCard = {
                          id: `card-${Date.now()}`,
                          title: config.title || "Analysis",
                          sql: "",
                          chartType: config.chartType,
                          xAxis: config.xAxis,
                          yAxis: config.yAxis,
                          position: { x: (dashboardCards.length % 2) * 6, y: Math.floor(dashboardCards.length / 2) * 4 },
                          size: { w: 6, h: 4 },
                          staticData: config.data,
                          sourceDataset,
                          createdAt: Date.now(),
                        };
                        addDashboardCard(newCard);
                      }}
                    />
                  </div>
                ))}

            </div>
          </ChatTab>
        );

      case "profile":
        return (
          <ErrorBoundary level="section">
            <ProfileTab
              schemas={Array.from(schemas.values())}
              runQuery={runQuery}
            />
          </ErrorBoundary>
        );

      case "dashboard":
        return (
          <ErrorBoundary level="section">
            <DashboardTab
              cards={dashboardCards}
              onAddCard={addDashboardCard}
              onRemoveCard={removeDashboardCard}
              onUpdateCard={updateDashboardCard}
              runQuery={runQuery}
            />
          </ErrorBoundary>
        );

      default:
        return null;
    }
  };

  return (
    <div {...getRootProps()}>
      <input {...getInputProps()} />

      {/* Hidden file input for "Add File" button */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Drag overlay - Beautiful full-screen state */}
      {isDragActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-[--background]/90 backdrop-blur-md" />

          {/* Content */}
          <div className="relative text-center">
            {/* Animated rings */}
            <div className="relative w-32 h-32 mx-auto mb-8">
              <div className="absolute inset-0 rounded-full border-2 border-[--primary]/30 animate-ping" />
              <div className="absolute inset-2 rounded-full border-2 border-[--primary]/40 animate-ping" style={{ animationDelay: "150ms" }} />
              <div className="absolute inset-4 rounded-full border-2 border-[--primary]/50 animate-ping" style={{ animationDelay: "300ms" }} />
              <div className="absolute inset-0 rounded-full bg-[--primary-muted] flex items-center justify-center">
                <Upload className="w-12 h-12 text-[--primary]" />
              </div>
            </div>

            <h2 className="text-2xl font-semibold text-[--foreground] mb-2">
              Drop your CSV file
            </h2>
            <p className="text-[--foreground-muted]">
              Release to start analyzing
            </p>
          </div>
        </div>
      )}

      {/* Workspace Layout */}
      <WorkspaceLayout
        activeTab={activeTab}
        onTabChange={setActiveTab}
        files={loadedFiles}
        activeFileId={activeFileId}
        onFileSelect={handleFileSelect}
        onFileRemove={handleFileRemove}
        onAddFile={handleAddFile}
        onPinFile={handlePinFile}
        isLoading={isLoadingFile}
      >
        {renderTabContent()}
      </WorkspaceLayout>

      {/* Pin dataset hint - shows once after first file load */}
      <PinHint show={showPinHint} />

      {/* Keyboard shortcut hint */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-xl bg-[--card]/80 backdrop-blur-sm border border-[--border] text-xs text-[--foreground-subtle] animate-fade-in">
        <div className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 rounded bg-[--background-subtle] text-[10px] font-mono">
            <Command className="w-3 h-3 inline" />
          </kbd>
          <span>+</span>
          <kbd className="px-1.5 py-0.5 rounded bg-[--background-subtle] text-[10px] font-mono">K</kbd>
        </div>
        <span className="text-[--foreground-subtle]/70">to focus input</span>
      </div>
    </div>
  );
}
