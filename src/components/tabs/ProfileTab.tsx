"use client";

import { useEffect, useRef, useState } from "react";
import { TableSchema } from "@/hooks/useDuckDB";
import { useProfile } from "@/hooks/useProfile";
import { ProfileOverview, ColumnCard, AlertsPanel, CorrelationMatrix } from "@/components/profile";
import { Progress } from "@/components/ui/progress";
import { BarChart3, RefreshCw, AlertCircle, Loader2 } from "lucide-react";

interface ProfileTabProps {
  schemas: TableSchema[];
  runQuery: (sql: string) => Promise<unknown[]>;
}

export function ProfileTab({ schemas, runQuery }: ProfileTabProps) {
  const { profile, isLoading, error, progress, generateProfile, clearProfile } = useProfile();
  const lastProfiledTable = useRef<string | null>(null);
  const [selectedTableIndex, setSelectedTableIndex] = useState(0);

  // Get the currently selected schema
  const schema = schemas[selectedTableIndex] || null;

  // Reset selection if table no longer exists
  // Using functional update to avoid setState-in-effect lint warning
  useEffect(() => {
    if (selectedTableIndex >= schemas.length && schemas.length > 0) {
      const newIndex = Math.max(0, schemas.length - 1);
      if (newIndex !== selectedTableIndex) {
        setSelectedTableIndex(newIndex);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schemas.length]);

  // Auto-generate profile when schema changes
  useEffect(() => {
    if (schema && schema.tableName !== lastProfiledTable.current) {
      lastProfiledTable.current = schema.tableName;
      generateProfile(schema, runQuery);
    } else if (!schema && lastProfiledTable.current) {
      lastProfiledTable.current = null;
      clearProfile();
    }
  }, [schema, generateProfile, clearProfile, runQuery]);

  // No file loaded state
  if (!schema || schemas.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-[--background-subtle] flex items-center justify-center">
            <BarChart3 className="w-8 h-8 text-[--foreground-subtle]" />
          </div>
          <p className="text-[--foreground-muted]">Load a file to see data profile</p>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center max-w-sm w-full px-4">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-[--primary-muted] flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-[--primary] animate-spin" />
          </div>
          <h2 className="text-lg font-semibold text-[--foreground] mb-2">Analyzing Data</h2>
          <p className="text-sm text-[--foreground-muted] mb-5">
            Profiling {schema.columns.length} columns...
          </p>
          <div className="bg-[--background-subtle] rounded-full p-1">
            <Progress value={progress} className="h-2" />
          </div>
          <p className="text-xs text-[--foreground-subtle] mt-3">{progress}% complete</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center max-w-md px-4">
          <div
            className="w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: 'rgba(248, 81, 73, 0.1)' }}
          >
            <AlertCircle className="w-8 h-8" style={{ color: '#f85149' }} />
          </div>
          <h2 className="text-lg font-semibold mb-2" style={{ color: '#f0f3f6' }}>Profile Generation Failed</h2>
          <p className="text-sm mb-5" style={{ color: '#9198a1' }}>{error}</p>
          <button
            onClick={() => generateProfile(schema, runQuery)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 mx-auto"
            style={{
              backgroundColor: '#21262d',
              border: '1px solid rgba(240, 243, 246, 0.1)',
              color: '#f0f3f6',
            }}
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  // No profile yet
  if (!profile) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center">
          <div
            className="w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: '#21262d' }}
          >
            <BarChart3 className="w-8 h-8" style={{ color: '#656d76' }} />
          </div>
          <h2 className="text-lg font-semibold mb-2" style={{ color: '#f0f3f6' }}>No Profile Available</h2>
          <p className="text-sm mb-5" style={{ color: '#9198a1' }}>
            Click below to analyze your data
          </p>
          <button
            onClick={() => generateProfile(schema, runQuery)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 mx-auto"
            style={{
              backgroundColor: '#f0b429',
              color: '#0f1419',
            }}
          >
            <BarChart3 className="w-4 h-4" />
            Generate Profile
          </button>
        </div>
      </div>
    );
  }

  // Profile display
  return (
    <div className="flex-1 overflow-auto pb-24">
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[--foreground]">Data Profile</h1>
            <p className="text-sm text-[--foreground-muted] mt-1">
              <span className="font-mono text-[--primary]">{schema.tableName}</span>
              <span className="mx-2 opacity-40">·</span>
              {schema.rowCount.toLocaleString()} rows
              <span className="mx-2 opacity-40">·</span>
              {schema.columns.length} columns
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Table selector */}
            {schemas.length > 1 && (
              <div
                className="flex items-center gap-1 p-1 rounded-xl"
                style={{
                  backgroundColor: '#21262d',
                  border: '1px solid rgba(240, 243, 246, 0.1)',
                }}
              >
                {schemas.map((s, index) => {
                  const isSelected = selectedTableIndex === index;
                  return (
                    <button
                      key={s.tableName}
                      onClick={() => setSelectedTableIndex(index)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200"
                      style={{
                        backgroundColor: isSelected ? '#f0b429' : 'transparent',
                        color: isSelected ? '#0f1419' : '#9198a1',
                      }}
                    >
                      {s.tableName}
                    </button>
                  );
                })}
              </div>
            )}
            <button
              onClick={() => generateProfile(schema, runQuery)}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200"
              style={{
                backgroundColor: '#21262d',
                border: '1px solid rgba(240, 243, 246, 0.1)',
                color: '#9198a1',
                opacity: isLoading ? 0.5 : 1,
                cursor: isLoading ? 'not-allowed' : 'pointer',
              }}
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Overview Section */}
        <ProfileOverview overview={profile.overview} />

        {/* Alerts Section */}
        <AlertsPanel alerts={profile.alerts} />

        {/* Correlation Matrix (only shown if there are correlations) */}
        {profile.correlations.length > 0 && (
          <CorrelationMatrix
            correlations={profile.correlations}
            columns={profile.columns.filter(c => c.type === "numeric").map(c => c.name)}
          />
        )}

        {/* Column Analysis Section */}
        <div>
          <h2 className="text-lg font-semibold text-[--foreground] mb-4">Column Analysis</h2>
          <div className="space-y-3">
            {profile.columns.map((column) => (
              <ColumnCard key={column.name} column={column} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
