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

      // Compute remaining tables BEFORE state update to avoid closure stale state
      const remainingTables = Array.from(schemas.keys()).filter(k => k !== tableName);

      setSchemas((prev) => {
        const next = new Map(prev);
        next.delete(tableName);
        return next;
      });

      if (activeTableName === tableName) {
        setActiveTableName(remainingTables[0] ?? null);
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
