"use client";

import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  level?: "page" | "section" | "component";
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Generic Error Boundary component that catches JavaScript errors anywhere in the child component tree.
 * Provides different UI treatments based on the `level` prop.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("Error Boundary caught an error:", error, errorInfo);
    }

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback takes precedence
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { level = "section" } = this.props;
      const { error } = this.state;
      const isDev = process.env.NODE_ENV === "development";

      // Page-level error: full screen with navigation options
      if (level === "page") {
        return (
          <div className="min-h-screen flex items-center justify-center bg-[--background] p-6">
            <div className="max-w-md w-full text-center space-y-6">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-[--destructive]/10 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-[--destructive]" />
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl font-semibold text-[--foreground]">
                  Something went wrong
                </h1>
                <p className="text-[--foreground-muted]">
                  We encountered an unexpected error. Please try refreshing the page.
                </p>
              </div>

              {isDev && error && (
                <div className="p-4 rounded-xl bg-[--destructive]/5 border border-[--destructive]/20 text-left">
                  <div className="flex items-center gap-2 mb-2">
                    <Bug className="w-4 h-4 text-[--destructive]" />
                    <span className="text-sm font-medium text-[--destructive]">
                      Dev Error Details
                    </span>
                  </div>
                  <p className="text-sm font-mono text-[--foreground-muted] break-all">
                    {error.message}
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={this.handleReload}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[--primary] text-[--primary-foreground] font-medium hover:opacity-90 transition-opacity"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh Page
                </button>
                <button
                  onClick={this.handleGoHome}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[--border] text-[--foreground] font-medium hover:bg-[--background-subtle] transition-colors"
                >
                  <Home className="w-4 h-4" />
                  Go Home
                </button>
              </div>
            </div>
          </div>
        );
      }

      // Section-level error: card-style with retry option
      if (level === "section") {
        return (
          <div className="p-6 rounded-2xl bg-[--card] border border-[--destructive]/20">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[--destructive]/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-[--destructive]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-[--foreground] mb-1">
                  This section encountered an error
                </h3>
                <p className="text-sm text-[--foreground-muted] mb-4">
                  Something went wrong loading this content.
                </p>

                {isDev && error && (
                  <p className="text-xs font-mono text-[--destructive] mb-4 break-all">
                    {error.message}
                  </p>
                )}

                <button
                  onClick={this.handleReset}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-[--background-subtle] hover:bg-[--border] transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Try Again
                </button>
              </div>
            </div>
          </div>
        );
      }

      // Component-level error: minimal inline message
      return (
        <div className="p-3 rounded-lg bg-[--destructive]/5 border border-[--destructive]/20 text-sm">
          <div className="flex items-center gap-2 text-[--destructive]">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>Failed to load</span>
            <button
              onClick={this.handleReset}
              className="ml-auto text-xs underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Chart-specific error boundary with data-aware messaging
 */
export class ChartErrorBoundary extends Component<
  { children: ReactNode; chartType?: string },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; chartType?: string }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    console.error("Chart rendering error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center h-full min-h-[200px]">
          <AlertTriangle className="w-8 h-8 text-[--warning] mb-3" />
          <p className="text-sm font-medium text-[--foreground] mb-1">
            Chart rendering failed
          </p>
          <p className="text-xs text-[--foreground-muted] mb-4">
            {this.props.chartType
              ? `Unable to render ${this.props.chartType} chart with this data`
              : "The data may not be compatible with this visualization"}
          </p>
          <button
            onClick={this.handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-[--background-subtle] hover:bg-[--border] transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Analysis-specific error boundary for the deep analysis agent
 */
export class AnalysisErrorBoundary extends Component<
  { children: ReactNode; onRetry?: () => void },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; onRetry?: () => void }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    console.error("Analysis error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      const { error } = this.state;
      const isDev = process.env.NODE_ENV === "development";

      return (
        <div className="p-6 rounded-2xl bg-[--card] border border-[--border]">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[--destructive]/10 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-[--destructive]" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-[--foreground] mb-1">
                Analysis Failed
              </h3>
              <p className="text-sm text-[--foreground-muted] mb-4">
                The analysis encountered an unexpected error. This could be due to
                complex data or a temporary issue.
              </p>

              {isDev && error && (
                <div className="p-3 rounded-lg bg-[--background-subtle] mb-4">
                  <p className="text-xs font-mono text-[--foreground-muted] break-all">
                    {error.message}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={this.handleReset}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[--primary] text-[--primary-foreground] text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
