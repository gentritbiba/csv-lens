"use client";

import { ReactNode } from "react";
import { ErrorBoundary } from "./ErrorBoundary";

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Client-side providers wrapper.
 * Wraps the entire app with error boundaries and any other providers needed.
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <ErrorBoundary level="page">
      {children}
    </ErrorBoundary>
  );
}
