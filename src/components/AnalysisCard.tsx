// src/components/AnalysisCard.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import {
  Brain,
  Database,
  RefreshCw,
  Zap,
  ChevronDown,
  ChevronRight,
  Check,
  RotateCw,
  Code2,
  Bookmark,
  AlertTriangle,
  Sparkles,
  Pencil,
  Save,
  Undo2,
  Lock,
} from "lucide-react";
import { type AgentModel, AGENT_MODELS } from "@/lib/agent-protocol";
import { type AnalysisStepWithTokens } from "@/hooks/useAnalysis";
import { Chart } from "@/components/Chart";
import { ChartErrorBoundary } from "@/components/ErrorBoundary";
import { TOKEN_LIMIT } from "@/lib/token-counter";
import { COLORS, STEP_COLORS as SHARED_STEP_COLORS } from "@/lib/design-tokens";

// ============================================================================
// STEP ICONS (component-specific)
// ============================================================================
const STEP_ICONS = {
  idle: Brain,
  thinking: Brain,
  executing: Database,
  retrying: RefreshCw,
  complete: Brain,
};

// Re-export step colors for local use
const STEP_COLORS = SHARED_STEP_COLORS;

// ============================================================================
// TYPES
// ============================================================================
export type ProcessingStep = "idle" | "thinking" | "executing" | "retrying" | "complete";

export interface ProcessingProgress {
  step: ProcessingStep;
  currentAttempt: number;
  maxAttempts: number;
  message: string;
}

// Card state - either processing or showing result (used for component organization)
// type CardState = "processing" | "result";

// Processing mode
type ProcessingMode = "simple" | "deep";

interface BaseProps {
  isAgentic?: boolean;
}

// Processing state props
interface ProcessingProps extends BaseProps {
  state: "processing";
  mode: ProcessingMode;
  // Simple mode
  progress?: ProcessingProgress;
  // Deep mode
  currentThought?: string | null;
  steps?: AnalysisStepWithTokens[];
}

// Result state props
interface ResultProps extends BaseProps {
  state: "result";
  query: string;
  answer?: string;
  chartType?: "bar" | "line" | "pie" | "scatter" | "table";
  chartData?: unknown[];
  xAxis?: string;
  yAxis?: string;
  sql?: string;
  error?: string | null;
  retryCount?: number;
  steps?: AnalysisStepWithTokens[];
  durationMs?: number;
  userTier?: "free" | "pro";
  onPinToDashboard?: (config: {
    sql?: string;
    chartType: string;
    xAxis?: string;
    yAxis?: string;
    title?: string;
    data?: unknown[];
  }) => void;
  onTryAgenticAnalysis?: (query: string, model: AgentModel) => void;
  runQuery?: (sql: string, timeoutMs?: number) => Promise<unknown[]>;
}

type AnalysisCardProps = ProcessingProps | ResultProps;

// ============================================================================
// STEP ITEM COMPONENT
// ============================================================================
export function StepItem({ step, index }: { step: AnalysisStepWithTokens; index: number }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showThinking, setShowThinking] = useState(false);
  const input = step.input as { sql?: string; column?: string; limit?: number; code?: string };

  const hasError = !!step.error;
  const hasResult = step.result && Array.isArray(step.result) && step.result.length > 0;
  const isOverTokenLimit = step.tokenCount && step.tokenCount > TOKEN_LIMIT;
  const hasThinking = !!step.extendedThinking;

  const borderColor = hasError ? '#d29922' : hasResult ? '#3fb950' : 'rgba(240, 243, 246, 0.1)';
  const indicatorBg = hasError ? 'rgba(210, 153, 34, 0.15)' : hasResult ? 'rgba(63, 185, 80, 0.15)' : '#21262d';
  const indicatorColor = hasError ? '#d29922' : hasResult ? '#3fb950' : '#656d76';

  return (
    <div
      className="relative pl-6 py-3 transition-colors"
      style={{ borderLeft: `2px solid ${borderColor}` }}
    >
      {/* Step number indicator */}
      <div
        className="absolute left-0 top-3 -translate-x-1/2 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
        style={{ backgroundColor: indicatorBg, color: indicatorColor }}
      >
        {index + 1}
      </div>

      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-start gap-3 text-left w-full bg-transparent border-none cursor-pointer group"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium" style={{ color: '#58a6ff' }}>
              {step.tool}
            </span>
            {input.code && (
              <span className="text-xs" style={{ color: '#656d76' }}>(transform)</span>
            )}
          </div>

          {/* Thought/reason - always visible */}
          {step.thought && (
            <p
              className="text-xs mt-1 line-clamp-2"
              style={{ color: '#9198a1' }}
            >
              {step.thought}
            </p>
          )}

          {/* Status badges */}
          <div className="flex items-center gap-2 mt-1.5">
            {hasThinking && (
              <span
                className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full"
                style={{ backgroundColor: 'rgba(136, 87, 229, 0.15)', color: '#a371f7' }}
              >
                <Brain className="w-3 h-3" />
                thinking
              </span>
            )}
            {hasError && (
              <span
                className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full"
                style={{ backgroundColor: 'rgba(210, 153, 34, 0.15)', color: '#d29922' }}
              >
                <RotateCw className="w-3 h-3" />
                adjusted
              </span>
            )}
            {hasResult && (
              <span
                className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full"
                style={{ backgroundColor: 'rgba(63, 185, 80, 0.15)', color: '#3fb950' }}
              >
                <Check className="w-3 h-3" />
                {(step.result as unknown[]).length} rows
              </span>
            )}
            {step.tokenCount && (
              <span
                className="text-[11px] px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: isOverTokenLimit ? 'rgba(210, 153, 34, 0.15)' : '#21262d',
                  color: isOverTokenLimit ? '#d29922' : '#656d76',
                }}
              >
                {step.tokenCount.toLocaleString()} tokens
              </span>
            )}
          </div>
        </div>

        <ChevronDown
          className="w-4 h-4 shrink-0 mt-1 transition-transform duration-200"
          style={{
            color: '#656d76',
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-3 space-y-3 animate-fade-in">
          {/* Extended Thinking Section */}
          {hasThinking && (
            <div
              className="rounded-lg overflow-hidden"
              style={{
                border: '1px solid rgba(136, 87, 229, 0.2)',
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowThinking(!showThinking);
                }}
                className="w-full flex items-center justify-between px-3 py-2 text-left transition-colors"
                style={{
                  backgroundColor: 'rgba(136, 87, 229, 0.1)',
                }}
              >
                <span className="flex items-center gap-2 text-xs font-medium" style={{ color: '#a371f7' }}>
                  <Brain className="w-3.5 h-3.5" />
                  Extended Thinking
                </span>
                <ChevronRight
                  className="w-3.5 h-3.5 transition-transform duration-200"
                  style={{
                    color: '#a371f7',
                    transform: showThinking ? 'rotate(90deg)' : 'rotate(0deg)',
                  }}
                />
              </button>
              {showThinking && (
                <div
                  className="px-3 py-2 text-xs max-h-48 overflow-y-auto"
                  style={{
                    backgroundColor: 'rgba(136, 87, 229, 0.05)',
                    color: '#9198a1',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {step.extendedThinking}
                </div>
              )}
            </div>
          )}

          {input.sql && (
            <pre
              className="text-xs p-3 rounded-lg overflow-x-auto font-mono"
              style={{
                backgroundColor: '#21262d',
                color: '#9198a1',
                border: '1px solid rgba(240, 243, 246, 0.1)',
              }}
            >
              {input.sql}
            </pre>
          )}

          {input.code && (
            <pre
              className="text-xs p-3 rounded-lg overflow-x-auto font-mono"
              style={{
                backgroundColor: '#21262d',
                color: '#9198a1',
                border: '1px solid rgba(240, 243, 246, 0.1)',
              }}
            >
              {input.code}
            </pre>
          )}

          {hasError ? (
            <div
              className="rounded-lg p-3"
              style={{
                backgroundColor: 'rgba(210, 153, 34, 0.15)',
                border: '1px solid rgba(210, 153, 34, 0.2)',
              }}
            >
              <p className="text-xs font-medium mb-1" style={{ color: '#d29922' }}>Adjusted approach:</p>
              <p className="text-xs" style={{ color: '#9198a1' }}>{step.error}</p>
            </div>
          ) : step.result && Array.isArray(step.result) && step.result.length > 0 ? (
            <div
              className="overflow-auto rounded-lg max-h-48"
              style={{ border: '1px solid rgba(240, 243, 246, 0.1)' }}
            >
              <table className="text-xs w-full">
                <thead>
                  <tr style={{ backgroundColor: '#21262d' }}>
                    {Object.keys(step.result[0] as Record<string, unknown>).map((key) => (
                      <th
                        key={key}
                        className="px-3 py-2 text-left font-medium whitespace-nowrap"
                        style={{ color: '#9198a1', borderBottom: '1px solid rgba(240, 243, 246, 0.1)' }}
                      >
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {step.result.slice(0, 50).map((row, i) => (
                    <tr
                      key={i}
                      style={{ borderBottom: '1px solid rgba(240, 243, 246, 0.1)' }}
                    >
                      {Object.entries(row as Record<string, unknown>).map(([key, val]) => (
                        <td key={key} className="px-3 py-2 font-mono whitespace-nowrap" style={{ color: '#f0f3f6' }}>
                          {val === null || val === undefined
                            ? <span style={{ color: '#656d76' }}>null</span>
                            : typeof val === "object"
                            ? JSON.stringify(val)
                            : String(val)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// CARD WRAPPER
// ============================================================================
function CardWrapper({
  children,
  isError = false,
  overflow = "hidden",
}: {
  children: React.ReactNode;
  isError?: boolean;
  overflow?: "hidden" | "visible";
}) {
  return (
    <div
      className="rounded-2xl transition-all duration-300"
      style={{
        backgroundColor: COLORS.bg,
        border: `1px solid ${isError ? COLORS.warningMuted : COLORS.border}`,
        overflow,
      }}
    >
      {children}
    </div>
  );
}

// ============================================================================
// PROCESSING CONTENT
// ============================================================================
function ProcessingContent({
  mode,
  progress,
  currentThought,
  steps = [],
}: {
  mode: ProcessingMode;
  progress?: ProcessingProgress;
  currentThought?: string | null;
  steps?: AnalysisStepWithTokens[];
}) {
  const isDeep = mode === "deep";
  const totalTokens = steps.reduce((sum, s) => sum + (s.tokenCount || 0), 0);

  // Determine icon and colors
  const currentStep = progress?.step || "thinking";
  const Icon = isDeep ? Zap : (STEP_ICONS[currentStep] || Brain);
  const colors = STEP_COLORS[currentStep] || STEP_COLORS.thinking;
  const isRetrying = currentStep === "retrying";

  // Message to display
  const displayMessage = isDeep
    ? (currentThought || "Initializing analysis agent...")
    : (progress?.message || "Processing...");

  // Title
  const displayTitle = isDeep ? "Deep Analysis" : "Analyzing";

  return (
    <div className="p-6">
      {/* Header with animated icon */}
      <div className="flex items-center gap-4 mb-5">
        <div className="relative">
          {/* Pulsing ring */}
          <div
            className="absolute inset-0 rounded-xl animate-ping"
            style={{
              backgroundColor: isDeep ? 'rgba(240, 180, 41, 0.15)' : colors.bg,
              animationDuration: '1.5s',
            }}
          />
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center relative"
            style={{
              background: isDeep
                ? 'linear-gradient(135deg, rgba(240, 180, 41, 0.2) 0%, rgba(88, 166, 255, 0.2) 100%)'
                : colors.bg,
            }}
          >
            <Icon
              className={`w-6 h-6 ${isRetrying ? "animate-spin" : "animate-pulse"}`}
              style={{
                color: isDeep ? '#f0b429' : colors.main,
                animationDuration: isRetrying ? "1s" : "1.5s",
              }}
            />
          </div>

          {/* Attempt badge or active indicator */}
          {isDeep ? (
            <div
              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#0d1117' }}
            >
              <div
                className="w-3 h-3 rounded-full animate-ping"
                style={{ backgroundColor: '#3fb950' }}
              />
            </div>
          ) : progress && progress.currentAttempt > 1 && (
            <div
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
              style={{ backgroundColor: colors.main, color: '#0f1419' }}
            >
              {progress.currentAttempt}
            </div>
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-semibold" style={{ color: '#f0f3f6' }}>
              {displayTitle}
            </p>
            {isDeep && steps.length > 0 && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: 'rgba(63, 185, 80, 0.15)', color: '#3fb950' }}
              >
                {steps.length} step{steps.length !== 1 ? 's' : ''} done
              </span>
            )}
          </div>
          <p className="text-xs" style={{ color: '#9198a1' }}>
            {displayMessage}
          </p>

          {/* Step indicators for simple mode */}
          {!isDeep && progress && (
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-1.5">
                {["thinking", "executing"].map((stepName, idx) => {
                  const isActive = progress.step === stepName;
                  const isPast = (progress.step === "executing" && stepName === "thinking") ||
                                 (progress.step === "retrying");
                  const stepColor = isActive ? colors.main : isPast ? "#3fb950" : "#21262d";

                  return (
                    <div key={stepName} className="flex items-center gap-1.5">
                      <div
                        className="w-2 h-2 rounded-full transition-all duration-300"
                        style={{
                          backgroundColor: stepColor,
                          boxShadow: isActive ? `0 0 8px ${colors.main}50` : 'none',
                          transform: isActive ? 'scale(1.25)' : 'scale(1)',
                        }}
                      />
                      <span
                        className="text-[10px] uppercase tracking-wider"
                        style={{ color: isActive ? colors.main : '#656d76' }}
                      >
                        {stepName === "thinking" ? "AI" : "SQL"}
                      </span>
                      {idx === 0 && (
                        <div className="w-4 h-px mx-1" style={{ backgroundColor: '#21262d' }} />
                      )}
                    </div>
                  );
                })}
              </div>

              {progress.currentAttempt > 1 && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: colors.bg, color: colors.main }}
                >
                  Attempt {progress.currentAttempt}/{progress.maxAttempts}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Progress bar for deep analysis */}
      {isDeep && (
        <div className="mb-5">
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ backgroundColor: '#21262d' }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: steps.length > 0 ? `${Math.min(steps.length * 20, 90)}%` : '10%',
                background: 'linear-gradient(90deg, #f0b429 0%, #58a6ff 100%)',
                boxShadow: '0 0 10px rgba(240, 180, 41, 0.4)',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
          </div>
        </div>
      )}

      {/* Steps for deep analysis */}
      {isDeep && steps.length > 0 && (
        <div className="pt-4" style={{ borderTop: '1px solid rgba(240, 243, 246, 0.08)' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium" style={{ color: '#656d76' }}>
              Execution Steps
            </p>
            {totalTokens > 0 && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{ backgroundColor: '#21262d', color: '#656d76' }}
              >
                {totalTokens.toLocaleString()} tokens
              </span>
            )}
          </div>
          <div className="space-y-0">
            {steps.map((step, i) => (
              <StepItem key={i} step={step} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Skeleton placeholder */}
      {((!isDeep) || (isDeep && steps.length === 0)) && (
        <div className="flex flex-col gap-3">
          <div
            className="h-3 rounded-full w-3/4"
            style={{
              backgroundImage: `linear-gradient(90deg, #21262d 0%, ${colors.bg} 50%, #21262d 100%)`,
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s infinite',
            }}
          />
          <div
            className="h-3 rounded-full w-1/2"
            style={{
              backgroundImage: `linear-gradient(90deg, #21262d 0%, ${colors.bg} 50%, #21262d 100%)`,
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s infinite 0.1s',
            }}
          />
          <div
            className="h-32 rounded-xl mt-2"
            style={{
              backgroundImage: `linear-gradient(90deg, #21262d 0%, ${colors.bg} 50%, #21262d 100%)`,
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s infinite 0.2s',
            }}
          />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// RESULT CONTENT
// ============================================================================
function ResultContent({
  query,
  answer,
  chartType = "table",
  chartData = [],
  xAxis,
  yAxis,
  sql,
  error,
  retryCount,
  steps = [],
  durationMs,
  isAgentic = false,
  userTier,
  onPinToDashboard,
  onTryAgenticAnalysis,
  runQuery,
}: Omit<ResultProps, 'state'>) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showSql, setShowSql] = useState(false);
  const [showTrace, setShowTrace] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [showModelSelector, setShowModelSelector] = useState(false);

  // SQL editing state
  const [isEditingSql, setIsEditingSql] = useState(false);
  const [editedSql, setEditedSql] = useState(sql || "");
  const [originalSql] = useState(sql || "");
  const [currentData, setCurrentData] = useState<Record<string, unknown>[]>(chartData as Record<string, unknown>[]);
  const [isModified, setIsModified] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [sqlError, setSqlError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Update editedSql when sql prop changes (for initial load)
  useEffect(() => {
    if (sql && !isModified) {
      setEditedSql(sql);
    }
  }, [sql, isModified]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current && isEditingSql) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 300) + 'px';
    }
  }, [editedSql, isEditingSql]);

  const typedData = currentData;
  const hasData = typedData.length > 0;
  const keys = hasData ? Object.keys(typedData[0]) : [];
  const resolvedXAxis = xAxis || keys[0];
  const resolvedYAxis = yAxis || keys[1] || keys[0];
  const isError = !!error;

  // Handle save edited SQL
  const handleSaveSql = async () => {
    if (!runQuery || !editedSql.trim()) return;

    setIsRunning(true);
    setSqlError(null);

    try {
      const result = await runQuery(editedSql);
      setCurrentData(result as Record<string, unknown>[]);
      setIsModified(true);
      setIsEditingSql(false);
    } catch (err) {
      setSqlError(err instanceof Error ? err.message : "Query failed");
    } finally {
      setIsRunning(false);
    }
  };

  // Handle revert to original
  const handleRevert = async () => {
    if (!runQuery || !originalSql) return;

    setIsRunning(true);
    setSqlError(null);

    try {
      const result = await runQuery(originalSql);
      setCurrentData(result as Record<string, unknown>[]);
      setEditedSql(originalSql);
      setIsModified(false);
      setIsEditingSql(false);
    } catch (err) {
      setSqlError(err instanceof Error ? err.message : "Query failed");
    } finally {
      setIsRunning(false);
    }
  };

  const handlePinToDashboard = () => {
    if (onPinToDashboard && hasData) {
      // Always store the data snapshot so dashboard cards persist even if source file is deleted
      onPinToDashboard({
        sql: editedSql || sql,
        chartType,
        xAxis: resolvedXAxis,
        yAxis: resolvedYAxis,
        title: query?.slice(0, 50) || "Chart",
        data: typedData, // Always include data for persistence
      });
      setIsPinned(true);
      setTimeout(() => setIsPinned(false), 2000);
    }
  };

  return (
    <>
      {/* Header */}
      <div
        className="flex items-start justify-between gap-4 px-6 py-5"
        style={{ borderBottom: `1px solid ${COLORS.border}` }}
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Agentic badge */}
          {isAgentic && (
            <div className="shrink-0 mt-0.5">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${COLORS.primaryMuted} 0%, ${COLORS.accentMuted} 100%)`,
                }}
              >
                <Zap className="w-5 h-5" style={{ color: COLORS.primary }} />
              </div>
            </div>
          )}

          {/* Query text */}
          <p
            className="text-[15px] font-medium leading-relaxed"
            style={{ color: COLORS.foreground }}
          >
            {query}
          </p>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-lg transition-colors shrink-0"
          style={{ backgroundColor: 'transparent' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = COLORS.bgSubtle}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          aria-label={isCollapsed ? "Expand" : "Collapse"}
        >
          <ChevronDown
            className="w-4 h-4 transition-transform duration-200"
            style={{
              color: COLORS.foregroundSubtle,
              transform: isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)',
            }}
          />
        </button>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="px-6 py-5">
          {/* AI Response */}
          {answer && (
            <div className="mb-5">
              <div
                className="prose prose-sm max-w-none leading-relaxed prose-invert"
                style={{ color: COLORS.foreground }}
              >
                <ReactMarkdown>{answer}</ReactMarkdown>
              </div>

              {/* Retry indicator */}
              {!isError && retryCount && retryCount > 0 && (
                <div
                  className="inline-flex items-center gap-1.5 mt-3 text-xs px-2.5 py-1 rounded-full"
                  style={{
                    backgroundColor: COLORS.warningMuted,
                    color: COLORS.warning,
                  }}
                >
                  <RotateCw className="w-3 h-3" />
                  adjusted {retryCount} {retryCount === 1 ? 'time' : 'times'}
                </div>
              )}
            </div>
          )}

          {/* Error State */}
          {isError && (
            <div className="mb-5">
              <div
                className="rounded-xl p-4"
                style={{
                  backgroundColor: COLORS.warningMuted,
                  border: `1px solid rgba(210, 153, 34, 0.2)`,
                }}
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: COLORS.warning }} />
                  <div>
                    <p className="text-sm font-medium mb-1" style={{ color: COLORS.warning }}>
                      Couldn&apos;t complete this query
                    </p>
                    <p className="text-xs" style={{ color: COLORS.foregroundMuted }}>
                      The AI tried multiple approaches but couldn&apos;t get the right result. Try rephrasing or use Deep Analysis.
                    </p>
                  </div>
                </div>
              </div>

              {/* Try agentic button */}
              {onTryAgenticAnalysis && !showModelSelector && (
                <button
                  onClick={() => setShowModelSelector(true)}
                  className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
                  style={{
                    background: `linear-gradient(135deg, ${COLORS.primaryMuted} 0%, ${COLORS.accentMuted} 100%)`,
                    color: COLORS.primary,
                    border: `1px solid rgba(240, 180, 41, 0.2)`,
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(240, 180, 41, 0.4)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(240, 180, 41, 0.2)'}
                >
                  <Sparkles className="w-4 h-4" />
                  Try with Deep Analysis
                </button>
              )}

              {/* Model selector */}
              {onTryAgenticAnalysis && showModelSelector && (
                <div
                  className="mt-4 flex items-center gap-2 p-3 rounded-xl animate-fade-in"
                  style={{
                    backgroundColor: COLORS.bgSubtle,
                    border: `1px solid ${COLORS.border}`,
                  }}
                >
                  <span className="text-xs font-medium" style={{ color: COLORS.foregroundMuted }}>Select model:</span>
                  <div className="flex items-center gap-1">
                    {AGENT_MODELS.map((model) => {
                      const isLocked = model.requiresPro && userTier !== "pro";
                      return (
                        <button
                          key={model.value}
                          onClick={() => {
                            if (!isLocked) {
                              onTryAgenticAnalysis(query, model.value);
                              setShowModelSelector(false);
                            }
                          }}
                          disabled={isLocked}
                          title={isLocked ? "Pro subscription required" : model.description}
                          className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1"
                          style={{
                            backgroundColor: isLocked ? COLORS.bgSubtle : COLORS.primaryMuted,
                            color: isLocked ? COLORS.foregroundSubtle : COLORS.primary,
                            cursor: isLocked ? 'not-allowed' : 'pointer',
                            opacity: isLocked ? 0.6 : 1,
                          }}
                          onMouseEnter={(e) => !isLocked && (e.currentTarget.style.backgroundColor = 'rgba(240, 180, 41, 0.25)')}
                          onMouseLeave={(e) => !isLocked && (e.currentTarget.style.backgroundColor = COLORS.primaryMuted)}
                        >
                          {isLocked && <Lock className="w-3 h-3" />}
                          {model.label}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setShowModelSelector(false)}
                    className="text-xs ml-2 transition-colors"
                    style={{ color: COLORS.foregroundSubtle }}
                    onMouseEnter={(e) => e.currentTarget.style.color = COLORS.foreground}
                    onMouseLeave={(e) => e.currentTarget.style.color = COLORS.foregroundSubtle}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          {(sql || hasData) && (
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              {sql && (
                <button
                  onClick={() => {
                    setShowSql(!showSql);
                    if (!showSql) setIsEditingSql(false);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
                  style={{
                    backgroundColor: showSql ? COLORS.accentMuted : COLORS.bgSubtle,
                    color: showSql ? COLORS.accent : COLORS.foregroundMuted,
                  }}
                  onMouseEnter={(e) => !showSql && (e.currentTarget.style.color = COLORS.foreground)}
                  onMouseLeave={(e) => !showSql && (e.currentTarget.style.color = COLORS.foregroundMuted)}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  {showSql ? "Hide SQL" : "Show SQL"}
                </button>
              )}

              {/* Modified indicator */}
              {isModified && (
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium animate-fade-in"
                  style={{
                    backgroundColor: COLORS.successMuted,
                    color: COLORS.success,
                  }}
                >
                  <RotateCw className="w-3 h-3" />
                  Updated
                </span>
              )}

              {onPinToDashboard && hasData && (
                <button
                  onClick={handlePinToDashboard}
                  disabled={isPinned}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${!isPinned ? 'animate-pin-hint' : ''}`}
                  style={{
                    backgroundColor: isPinned ? COLORS.successMuted : COLORS.primaryMuted,
                    color: isPinned ? COLORS.success : COLORS.primary,
                  }}
                  onMouseEnter={(e) => !isPinned && (e.currentTarget.style.backgroundColor = 'rgba(240, 180, 41, 0.25)')}
                  onMouseLeave={(e) => !isPinned && (e.currentTarget.style.backgroundColor = COLORS.primaryMuted)}
                >
                  {isPinned ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Pinned!
                    </>
                  ) : (
                    <>
                      <Bookmark className="w-3.5 h-3.5" />
                      Pin to Dashboard
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* SQL Code - Editable */}
          {showSql && sql && (
            <div className="mb-5 animate-fade-in">
              {/* SQL Header with Edit/Save/Revert buttons */}
              <div className="flex items-center justify-between mb-2">
                <span
                  className="text-xs font-medium uppercase tracking-wider"
                  style={{ color: COLORS.foregroundSubtle }}
                >
                  SQL Query
                </span>
                <div className="flex items-center gap-2">
                  {isEditingSql ? (
                    <>
                      <button
                        onClick={handleSaveSql}
                        disabled={isRunning || !editedSql.trim()}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                        style={{
                          backgroundColor: COLORS.successMuted,
                          color: COLORS.success,
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(63, 185, 80, 0.25)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = COLORS.successMuted}
                      >
                        {isRunning ? (
                          <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Save className="w-3 h-3" />
                        )}
                        {isRunning ? "Running..." : "Save & Run"}
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingSql(false);
                          setEditedSql(isModified ? editedSql : (sql || ""));
                          setSqlError(null);
                        }}
                        disabled={isRunning}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
                        style={{ color: COLORS.foregroundSubtle }}
                        onMouseEnter={(e) => e.currentTarget.style.color = COLORS.foreground}
                        onMouseLeave={(e) => e.currentTarget.style.color = COLORS.foregroundSubtle}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      {runQuery && (
                        <button
                          onClick={() => setIsEditingSql(true)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
                          style={{
                            backgroundColor: COLORS.bgSubtle,
                            color: COLORS.foregroundMuted,
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = COLORS.foreground}
                          onMouseLeave={(e) => e.currentTarget.style.color = COLORS.foregroundMuted}
                        >
                          <Pencil className="w-3 h-3" />
                          Edit
                        </button>
                      )}
                      {isModified && runQuery && (
                        <button
                          onClick={handleRevert}
                          disabled={isRunning}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
                          style={{
                            backgroundColor: COLORS.bgSubtle,
                            color: COLORS.foregroundMuted,
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = COLORS.foreground}
                          onMouseLeave={(e) => e.currentTarget.style.color = COLORS.foregroundMuted}
                        >
                          <Undo2 className="w-3 h-3" />
                          Show Original
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* SQL Error */}
              {sqlError && (
                <div
                  className="mb-2 px-3 py-2 rounded-lg text-xs animate-fade-in"
                  style={{
                    backgroundColor: COLORS.errorMuted,
                    border: `1px solid rgba(248, 81, 73, 0.2)`,
                    color: COLORS.error,
                  }}
                >
                  {sqlError}
                </div>
              )}

              {/* SQL Content */}
              {isEditingSql ? (
                <textarea
                  ref={textareaRef}
                  value={editedSql}
                  onChange={(e) => setEditedSql(e.target.value)}
                  className="w-full rounded-xl p-4 text-xs font-mono focus:outline-none resize-none min-h-[100px]"
                  style={{
                    backgroundColor: COLORS.bgSubtle,
                    color: COLORS.foreground,
                    border: `1px solid ${COLORS.accent}`,
                  }}
                  spellCheck={false}
                />
              ) : (
                <pre
                  className="rounded-xl p-4 text-xs overflow-x-auto font-mono"
                  style={{
                    backgroundColor: COLORS.bgSubtle,
                    color: COLORS.foregroundMuted,
                    border: `1px solid ${COLORS.border}`,
                  }}
                >
                  {isModified ? editedSql : sql}
                </pre>
              )}
            </div>
          )}

          {/* Chart or Table */}
          {hasData && (
            <div className={
              chartType === "table"
                ? "max-h-80 mb-5"
                : chartType === "pie"
                ? "h-56 mb-5 mt-6 overflow-visible relative z-10"
                : "h-52 mb-5"
            }>
              <ChartErrorBoundary chartType={chartType}>
                <Chart
                  data={typedData}
                  chartType={chartType}
                  xAxis={resolvedXAxis}
                  yAxis={resolvedYAxis}
                />
              </ChartErrorBoundary>
            </div>
          )}

          {/* Reasoning Trace Toggle */}
          {steps.length > 0 && (
            <div
              className="pt-4 mt-4"
              style={{ borderTop: `1px solid ${COLORS.border}` }}
            >
              {(() => {
                const totalTokens = steps.reduce((sum, s) => sum + (s.tokenCount || 0), 0);
                const formatDuration = (ms: number) => {
                  if (ms < 1000) return `${ms}ms`;
                  return `${(ms / 1000).toFixed(1)}s`;
                };
                return (
                  <button
                    onClick={() => setShowTrace(!showTrace)}
                    className="flex items-center gap-2 text-sm transition-colors"
                    style={{ color: COLORS.foregroundMuted }}
                    onMouseEnter={(e) => e.currentTarget.style.color = COLORS.foreground}
                    onMouseLeave={(e) => e.currentTarget.style.color = COLORS.foregroundMuted}
                  >
                    <ChevronRight
                      className="w-4 h-4 transition-transform duration-200"
                      style={{ transform: showTrace ? 'rotate(90deg)' : 'rotate(0deg)' }}
                    />
                    <span className="font-medium">Reasoning trace</span>
                    <span className="text-xs" style={{ color: COLORS.foregroundSubtle }}>
                      {steps.length} steps
                      {totalTokens > 0 && ` · ${totalTokens.toLocaleString()} tokens`}
                      {durationMs && ` · ${formatDuration(durationMs)}`}
                    </span>
                  </button>
                );
              })()}

              {/* Trace Steps */}
              {showTrace && (
                <div className="mt-4 ml-2 animate-fade-in">
                  {steps.map((step, i) => (
                    <StepItem key={i} step={step} index={i} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export function AnalysisCard(props: AnalysisCardProps) {
  if (props.state === "processing") {
    return (
      <CardWrapper>
        <ProcessingContent
          mode={props.mode}
          progress={props.progress}
          currentThought={props.currentThought}
          steps={props.steps}
        />
      </CardWrapper>
    );
  }

  // Result state
  const isError = !!props.error;
  const chartOverflow = props.chartType === "pie" ? "visible" : "hidden";

  return (
    <CardWrapper isError={isError} overflow={chartOverflow as "hidden" | "visible"}>
      <ResultContent {...props} />
    </CardWrapper>
  );
}
