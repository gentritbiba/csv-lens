// src/hooks/useAnalysis.ts
"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type {
  AnalysisResult,
  AnalysisStep,
  SSEEvent,
  ModelTier,
  ChartType,
  SchemaContext,
} from "@/lib/claude/types";
import { AGENT_CONFIG } from "@/lib/claude/types";
import {
  executeTransform,
  saveQueryResult,
  clearStoredResults,
} from "@/lib/transform";

// Extended step with token info and thinking
export interface AnalysisStepWithTokens extends AnalysisStep {
  tokenCount?: number;
  extendedThinking?: string; // Claude's internal reasoning before this step
}

// A completed analysis entry with the original query
export interface AnalysisEntry {
  id: string;
  query: string;
  result: AnalysisResult & { durationMs?: number };
  timestamp: number;
}

export interface UseAnalysisReturn {
  isAnalyzing: boolean;
  currentThought: string | null;
  currentSteps: AnalysisStepWithTokens[];
  results: AnalysisEntry[];
  error: string | null;
  isTokenLimitError: boolean;
  canRetry: boolean;
  analyze: (
    query: string,
    schemaContext: SchemaContext,
    runQuery: (sql: string) => Promise<unknown[]>,
    preferredChartType?: ChartType,
    model?: ModelTier,
    useThinking?: boolean
  ) => Promise<void>;
  retryAnalysis: () => Promise<void>;
  resumeSession: (
    sessionId: string,
    query: string,
    runQuery: (sql: string) => Promise<unknown[]>
  ) => void;
  clearResults: () => void;
  clearError: () => void;
  cancelAnalysis: () => void;
}

// Context needed to retry/resume analysis
interface AnalysisContext {
  query: string;
  schemaContext: SchemaContext;
  runQuery: (sql: string) => Promise<unknown[]>;
  preferredChartType?: ChartType;
  model?: ModelTier;
  useThinking?: boolean;
}

// Persistence keys
const SESSION_KEY = "ai-data-analyzer-active-session";
const RESULTS_KEY = "ai-data-analyzer-analysis-results";
const MAX_STORED_RESULTS = 50; // Limit to prevent localStorage bloat

// Load analysis results from localStorage
function loadStoredResults(): AnalysisEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(RESULTS_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as AnalysisEntry[];
  } catch {
    return [];
  }
}

// Save analysis results to localStorage
function saveResults(results: AnalysisEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    // Keep only the most recent results
    const toSave = results.slice(0, MAX_STORED_RESULTS);
    localStorage.setItem(RESULTS_KEY, JSON.stringify(toSave));
  } catch (e) {
    // localStorage might be full - try removing older results
    console.warn("Failed to save analysis results:", e);
    try {
      const reduced = results.slice(0, 10);
      localStorage.setItem(RESULTS_KEY, JSON.stringify(reduced));
    } catch {
      // Give up if still failing
    }
  }
}

// Save active session to localStorage
function saveActiveSession(sessionId: string, query: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ sessionId, query, timestamp: Date.now() }));
  } catch {
    // Ignore storage errors
  }
}

// Clear active session from localStorage
function clearActiveSession(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // Ignore storage errors
  }
}

// Get active session if exists and not expired (5 min timeout)
export function getActiveSession(): { sessionId: string; query: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return null;
    const { sessionId, query, timestamp } = JSON.parse(stored);
    // Check if session is still valid (within 5 minutes)
    if (Date.now() - timestamp > 5 * 60 * 1000) {
      clearActiveSession();
      return null;
    }
    return { sessionId, query };
  } catch {
    return null;
  }
}

// Check if error message indicates token limit
function isTokenLimitMessage(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return lowerMessage.includes("token limit") || lowerMessage.includes("tokens exceeded");
}

// Pre-flight check for token availability
async function checkTokenAvailability(): Promise<{ allowed: boolean; message?: string }> {
  try {
    const res = await fetch("/api/auth/me");
    if (!res.ok) {
      return { allowed: true }; // If we can't check, let the server handle it
    }
    const data = await res.json();
    if (data.usage) {
      const { tokensUsed, tokenLimit } = data.usage;
      if (tokensUsed >= tokenLimit) {
        return {
          allowed: false,
          message: "Token limit exceeded. Please upgrade to Pro or wait for your billing cycle to reset.",
        };
      }
    }
    return { allowed: true };
  } catch {
    return { allowed: true }; // If check fails, let the server handle it
  }
}

export function useAnalysis(): UseAnalysisReturn {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentThought, setCurrentThought] = useState<string | null>(null);
  const [currentSteps, setCurrentSteps] = useState<AnalysisStepWithTokens[]>([]);
  const [results, setResults] = useState<AnalysisEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isTokenLimitError, setIsTokenLimitError] = useState(false);
  const [canRetry, setCanRetry] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load results from localStorage on mount
  useEffect(() => {
    const stored = loadStoredResults();
    if (stored.length > 0) {
      setResults(stored);
    }
    setIsHydrated(true);
  }, []);

  // Save results to localStorage when they change (after hydration)
  useEffect(() => {
    if (isHydrated) {
      saveResults(results);
    }
  }, [results, isHydrated]);

  // Refs for managing state across async operations
  const eventSourceRef = useRef<EventSource | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const currentQueryRef = useRef<string>("");
  const startTimeRef = useRef<number>(0);
  const queryResultsRef = useRef<Record<string, unknown[]>>({});
  const analysisContextRef = useRef<AnalysisContext | null>(null);
  const stepsRef = useRef<AnalysisStepWithTokens[]>([]);
  const cancelledRef = useRef(false);
  const pendingThinkingRef = useRef<string>(""); // Accumulates extended thinking for next step

  // Stop everything and reset UI
  const stopAnalysis = useCallback(() => {
    cancelledRef.current = true;
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    sessionIdRef.current = null;
    setIsAnalyzing(false);
    setCurrentThought(null);
  }, []);

  const cancelAnalysis = useCallback(() => {
    stopAnalysis();
    setError("Analysis cancelled");
    setCanRetry(true);
  }, [stopAnalysis]);

  const clearResults = useCallback(() => {
    stopAnalysis();
    setCurrentSteps([]);
    setResults([]);
    setError(null);
    setIsTokenLimitError(false);
    setCanRetry(false);
    analysisContextRef.current = null;
    stepsRef.current = [];
    queryResultsRef.current = {};
    // Clear persisted results
    if (typeof window !== "undefined") {
      localStorage.removeItem(RESULTS_KEY);
    }
  }, [stopAnalysis]);

  const clearError = useCallback(() => {
    setError(null);
    setIsTokenLimitError(false);
  }, []);

  // Connect to SSE stream (either initial or resume)
  const connectSSE = useCallback((
    url: string,
    runQuery: (sql: string) => Promise<unknown[]>,
    onComplete: () => void
  ) => {
    if (cancelledRef.current) return;

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    let receivedAnyEvent = false;

    eventSource.onmessage = async (event) => {
      receivedAnyEvent = true;

      if (cancelledRef.current) {
        eventSource.close();
        return;
      }

      try {
        const data: SSEEvent = JSON.parse(event.data);

        switch (data.type) {
          case "session":
            sessionIdRef.current = data.sessionId;
            // Save session to localStorage for potential resume after page refresh
            saveActiveSession(data.sessionId, currentQueryRef.current);
            setCurrentThought("Analyzing your data...");
            break;

          case "thinking":
            setCurrentThought(data.content);
            break;

          case "extended_thinking":
            // Extended thinking is Claude's internal reasoning process
            // Accumulate it for the next step and show preview in UI
            pendingThinkingRef.current += (pendingThinkingRef.current ? "\n\n" : "") + data.content;
            setCurrentThought(`Reasoning: ${data.content.slice(0, 200)}${data.content.length > 200 ? "..." : ""}`);
            break;

          case "tool_call":
            setCurrentThought(`Running ${data.name}...`);

            // Close the current SSE - we'll reconnect after tool execution
            eventSource.close();
            eventSourceRef.current = null;

            // Capture and clear pending thinking for this step
            const thinkingForStep = pendingThinkingRef.current;
            pendingThinkingRef.current = "";

            // Execute tool
            await handleToolExecution(
              data.id,
              data.name,
              data.input as Record<string, unknown>,
              runQuery,
              onComplete,
              thinkingForStep
            );
            break;

          case "answer":
            const durationMs = Date.now() - startTimeRef.current;

            // Use the last step's result as chart data if not provided
            let chartData = data.result.chartData;
            if (!chartData || chartData.length === 0) {
              const stepKeys = Object.keys(queryResultsRef.current).sort();
              const lastKey = stepKeys[stepKeys.length - 1];
              if (lastKey) {
                chartData = queryResultsRef.current[lastKey] || [];
              }
            }

            const newEntry: AnalysisEntry = {
              id: `analysis-${Date.now()}`,
              query: currentQueryRef.current,
              result: {
                ...data.result,
                chartData,
                steps: stepsRef.current,
                durationMs,
              },
              timestamp: Date.now(),
            };

            setResults(prev => [newEntry, ...prev]);
            break;

          case "error":
            setError(data.message);
            setIsTokenLimitError(isTokenLimitMessage(data.message));
            setCanRetry(!isTokenLimitMessage(data.message)); // Can't retry if at limit
            clearActiveSession(); // Clear persisted session on error
            stopAnalysis();
            break;

          case "done":
            eventSource.close();
            eventSourceRef.current = null;
            sessionIdRef.current = null;
            clearActiveSession(); // Clear persisted session on completion
            setIsAnalyzing(false);
            setCurrentThought(null);
            onComplete();
            break;
        }

      } catch (err) {
        console.error("Error parsing SSE event:", err);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      eventSourceRef.current = null;

      // Only set error if we haven't received any events (immediate failure)
      // or if we're not in a tool execution flow
      if (!receivedAnyEvent && !cancelledRef.current) {
        setError("Connection failed. Please try again.");
        setCanRetry(true);
        stopAnalysis();
      }
    };
    // Note: handleToolExecution is intentionally omitted - connectSSE is defined first
    // and handleToolExecution references connectSSE in its body. The functions work
    // together in a reconnection cycle: connectSSE → tool_call → handleToolExecution → connectSSE
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopAnalysis]);

  // Handle tool execution and reconnection
  const handleToolExecution = useCallback(async (
    toolId: string,
    toolName: string,
    toolInput: Record<string, unknown>,
    runQuery: (sql: string) => Promise<unknown[]>,
    onComplete: () => void,
    extendedThinking?: string
  ) => {
    const sessionId = sessionIdRef.current;
    if (!sessionId || cancelledRef.current) {
      stopAnalysis();
      return;
    }

    let result: unknown[] = [];
    let toolError: string | undefined;
    const stepIndex = stepsRef.current.length;

    // Create the step object
    const step: AnalysisStepWithTokens = {
      thought: (toolInput.thought as string) || "",
      tool: toolName,
      input: toolInput,
      result: null,
      extendedThinking: extendedThinking || undefined,
    };

    try {
      if (toolName === "run_query" || toolName === "get_column_stats" || toolName === "get_value_distribution") {
        const sql = toolInput.sql as string;
        if (!sql) {
          throw new Error("No SQL query provided");
        }

        result = await runQuery(sql);
        step.result = result;

        queryResultsRef.current[`step_${stepIndex}`] = result;
        saveQueryResult(stepIndex, result);

      } else if (toolName === "transform_data") {
        const code = toolInput.code as string;
        const sourceStep = toolInput.sourceStep as number;

        if (!code) {
          throw new Error("No transform code provided");
        }

        const sourceKey = `step_${sourceStep}`;
        const sourceData = queryResultsRef.current[sourceKey];

        if (!sourceData || !Array.isArray(sourceData)) {
          throw new Error(`No data found for step ${sourceStep}. Available: ${Object.keys(queryResultsRef.current).join(", ") || "none"}`);
        }

        result = executeTransform(code, sourceData, queryResultsRef.current);
        step.result = result;

        queryResultsRef.current[`step_${stepIndex}`] = result;
        saveQueryResult(stepIndex, result);
      }

    } catch (err) {
      toolError = err instanceof Error ? err.message : "Tool execution failed";
      step.error = toolError;
    }

    // Update steps
    stepsRef.current = [...stepsRef.current, step];
    setCurrentSteps([...stepsRef.current]);

    if (cancelledRef.current) return;

    // Send result to server and reconnect
    try {
      setCurrentThought("Processing results...");

      const response = await fetch("/api/analyze/tool-result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          toolId,
          result: toolError ? undefined : result,
          error: toolError,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to send tool result");
      }

      if (cancelledRef.current) return;

      // Reconnect to continue receiving events
      const resumeUrl = `/api/analyze/resume?sessionId=${encodeURIComponent(sessionId)}`;
      connectSSE(resumeUrl, runQuery, onComplete);

    } catch (err) {
      console.error("Error in tool execution flow:", err);
      setError(err instanceof Error ? err.message : "Analysis failed");
      setCanRetry(true);
      stopAnalysis();
    }
  }, [connectSSE, stopAnalysis]);

  const analyze = useCallback(
    async (
      query: string,
      schemaContext: SchemaContext,
      runQuery: (sql: string) => Promise<unknown[]>,
      preferredChartType?: ChartType,
      model?: ModelTier,
      useThinking?: boolean
    ) => {
      // Reset state
      stopAnalysis();
      cancelledRef.current = false;

      // Store context for retry
      analysisContextRef.current = {
        query,
        schemaContext,
        runQuery,
        preferredChartType,
        model,
        useThinking,
      };

      currentQueryRef.current = query;
      startTimeRef.current = Date.now();
      stepsRef.current = [];
      queryResultsRef.current = {};
      pendingThinkingRef.current = "";

      setIsAnalyzing(true);
      setCurrentThought("Checking token availability...");
      setCurrentSteps([]);
      setError(null);
      setIsTokenLimitError(false);
      setCanRetry(false);

      // Pre-flight check for token availability
      const tokenCheck = await checkTokenAvailability();
      if (!tokenCheck.allowed) {
        setError(tokenCheck.message || "Token limit exceeded");
        setIsTokenLimitError(true);
        setIsAnalyzing(false);
        setCurrentThought(null);
        return;
      }

      setCurrentThought("Connecting to analysis service...");
      clearStoredResults();

      // Build URL with query parameters
      const params = new URLSearchParams({
        query,
        schema: JSON.stringify(schemaContext),
        model: model || AGENT_CONFIG.defaultModel,
      });

      if (preferredChartType) {
        params.set("chartType", preferredChartType);
      }

      // Add thinking preference (default to true if not specified)
      params.set("thinking", String(useThinking !== false));

      // Connect to SSE
      connectSSE(
        `/api/analyze?${params.toString()}`,
        runQuery,
        () => {} // onComplete - nothing special needed
      );
    },
    [connectSSE, stopAnalysis]
  );

  const retryAnalysis = useCallback(async () => {
    const context = analysisContextRef.current;
    if (!context) {
      setError("No analysis to retry");
      return;
    }

    await analyze(
      context.query,
      context.schemaContext,
      context.runQuery,
      context.preferredChartType,
      context.model,
      context.useThinking
    );
  }, [analyze]);

  // Resume an existing session (e.g., after page refresh)
  const resumeSession = useCallback((
    sessionId: string,
    query: string,
    runQuery: (sql: string) => Promise<unknown[]>
  ) => {
    // Reset state
    stopAnalysis();
    cancelledRef.current = false;

    sessionIdRef.current = sessionId;
    currentQueryRef.current = query;
    startTimeRef.current = Date.now();
    stepsRef.current = [];
    queryResultsRef.current = {};
    pendingThinkingRef.current = "";

    setIsAnalyzing(true);
    setCurrentThought("Resuming analysis...");
    setCurrentSteps([]);
    setError(null);
    setIsTokenLimitError(false);
    setCanRetry(false);

    // Connect to resume endpoint
    const resumeUrl = `/api/analyze/resume?sessionId=${encodeURIComponent(sessionId)}`;
    connectSSE(resumeUrl, runQuery, () => {});
  }, [connectSSE, stopAnalysis]);

  return {
    isAnalyzing,
    currentThought,
    currentSteps,
    results,
    error,
    isTokenLimitError,
    canRetry,
    analyze,
    retryAnalysis,
    resumeSession,
    clearResults,
    clearError,
    cancelAnalysis,
  };
}
