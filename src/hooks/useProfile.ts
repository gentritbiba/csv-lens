// src/hooks/useProfile.ts
"use client";

import { useState, useCallback } from "react";
import { TableSchema } from "./useDuckDB";
import type { ColumnProfile, DataQualityAlert, ProfileData } from "@/types/profile";

// Re-export for backwards compatibility
export type { ColumnProfile, DataQualityAlert, ProfileData } from "@/types/profile";

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

            // Generate histogram for numeric columns
            try {
              const safeTable = `"${schema.tableName.replace(/"/g, '""')}"`;
              const safeCol = `"${column.replace(/"/g, '""')}"`;
              const min = profile.min ?? 0;
              const max = profile.max ?? 1;
              const range = max - min;
              const bucketSize = range / 10;

              if (range > 0) {
                const histQuery = `
                  SELECT
                    FLOOR((CAST(${safeCol} AS DOUBLE) - ${min}) / ${bucketSize}) as bucket_idx,
                    COUNT(*) as count
                  FROM ${safeTable}
                  WHERE ${safeCol} IS NOT NULL
                    AND TRY_CAST(${safeCol} AS DOUBLE) IS NOT NULL
                  GROUP BY bucket_idx
                  ORDER BY bucket_idx
                `;
                const histResult = await runQuery(histQuery);
                profile.histogram = (histResult as { bucket_idx: number; count: number }[]).map((r) => {
                  const bucketStart = min + (r.bucket_idx * bucketSize);
                  const bucketEnd = bucketStart + bucketSize;
                  return {
                    bucket: `${bucketStart.toFixed(1)}-${bucketEnd.toFixed(1)}`,
                    count: r.count,
                    rangeStart: bucketStart,
                    rangeEnd: bucketEnd,
                  };
                });
              }
            } catch {
              // Histogram generation failed, continue
            }

            // Get quartiles
            try {
              const safeTable = `"${schema.tableName.replace(/"/g, '""')}"`;
              const safeCol = `"${column.replace(/"/g, '""')}"`;
              const quartileQuery = `
                SELECT
                  PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY CAST(${safeCol} AS DOUBLE)) as q1,
                  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY CAST(${safeCol} AS DOUBLE)) as q3
                FROM ${safeTable}
                WHERE ${safeCol} IS NOT NULL AND TRY_CAST(${safeCol} AS DOUBLE) IS NOT NULL
              `;
              const quartileResult = await runQuery(quartileQuery);
              if (quartileResult.length > 0) {
                const q = quartileResult[0] as { q1: number; q3: number };
                profile.q1 = q.q1;
                profile.q3 = q.q3;
              }
            } catch {
              // Quartile calculation failed
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

            // Pattern detection
            try {
              const safeTable = `"${schema.tableName.replace(/"/g, '""')}"`;
              const safeCol = `"${column.replace(/"/g, '""')}"`;
              const patternQuery = `
                SELECT
                  SUM(CASE WHEN ${safeCol} ~* '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$' THEN 1 ELSE 0 END) as emails,
                  SUM(CASE WHEN ${safeCol} ~* '^https?://' THEN 1 ELSE 0 END) as urls,
                  SUM(CASE WHEN ${safeCol} ~* '^[\\+]?[(]?[0-9]{3}[)]?[-\\s\\.]?[0-9]{3}[-\\s\\.]?[0-9]{4,6}$' THEN 1 ELSE 0 END) as phones,
                  SUM(CASE WHEN ${safeCol} ~* '^[0-9]{4}-[0-9]{2}-[0-9]{2}' OR ${safeCol} ~* '^[0-9]{2}/[0-9]{2}/[0-9]{4}' THEN 1 ELSE 0 END) as dates,
                  SUM(CASE WHEN TRY_CAST(${safeCol} AS DOUBLE) IS NOT NULL THEN 1 ELSE 0 END) as numbers,
                  SUM(CASE WHEN TRIM(${safeCol}) = '' THEN 1 ELSE 0 END) as empty
                FROM ${safeTable}
                WHERE ${safeCol} IS NOT NULL
              `;
              const patternResult = await runQuery(patternQuery);
              if (patternResult.length > 0) {
                const p = patternResult[0] as Record<string, number>;
                profile.patterns = {
                  emails: p.emails || 0,
                  urls: p.urls || 0,
                  phones: p.phones || 0,
                  dates: p.dates || 0,
                  numbers: p.numbers || 0,
                  empty: p.empty || 0,
                };
              }
            } catch {
              // Pattern detection failed
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
      let duplicateRows = 0;
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
          duplicateRows = (dupResult[0] as { dup_count: number }).dup_count;
          if (duplicateRows > 0) {
            alerts.push({
              type: "potential_duplicates",
              severity: "warning",
              message: `Found ${duplicateRows} groups of potentially duplicate rows`,
            });
          }
        }
      } catch {
        // Ignore duplicate check errors
      }

      // Calculate correlations between numeric columns
      const correlations: { col1: string; col2: string; correlation: number }[] = [];
      const numericCols = columnProfiles.filter(c => c.type === "numeric").map(c => c.name);

      if (numericCols.length >= 2 && numericCols.length <= 10) {
        const safeTable = `"${schema.tableName.replace(/"/g, '""')}"`;

        for (let i = 0; i < numericCols.length; i++) {
          for (let j = i + 1; j < numericCols.length; j++) {
            try {
              const col1 = `"${numericCols[i].replace(/"/g, '""')}"`;
              const col2 = `"${numericCols[j].replace(/"/g, '""')}"`;
              const corrQuery = `
                SELECT CORR(CAST(${col1} AS DOUBLE), CAST(${col2} AS DOUBLE)) as correlation
                FROM ${safeTable}
                WHERE ${col1} IS NOT NULL AND ${col2} IS NOT NULL
                  AND TRY_CAST(${col1} AS DOUBLE) IS NOT NULL
                  AND TRY_CAST(${col2} AS DOUBLE) IS NOT NULL
              `;
              const corrResult = await runQuery(corrQuery);
              if (corrResult.length > 0) {
                const corr = (corrResult[0] as { correlation: number }).correlation;
                if (corr !== null && !isNaN(corr)) {
                  correlations.push({
                    col1: numericCols[i],
                    col2: numericCols[j],
                    correlation: corr,
                  });
                }
              }
            } catch {
              // Skip this correlation
            }
          }
        }
      }

      // Calculate quality score (weighted factors)
      const qualityFactors = {
        completeness: completenessScore * 0.4, // 40% weight
        uniqueness: duplicateRows === 0 ? 25 : Math.max(0, 25 - (duplicateRows / schema.rowCount) * 100), // 25% weight
        validity: Math.max(0, 25 - alerts.length * 5), // 25% weight, -5 per alert
        consistency: 10, // Base 10% - could be enhanced
      };
      const qualityScore = Math.min(100,
        qualityFactors.completeness +
        qualityFactors.uniqueness +
        qualityFactors.validity +
        qualityFactors.consistency
      );

      // Estimate memory usage
      let estimatedMemoryBytes = 0;
      for (const col of columnProfiles) {
        const rowCount = schema.rowCount;
        if (col.type === "numeric") {
          estimatedMemoryBytes += rowCount * 8; // 8 bytes for double
        } else if (col.type === "boolean") {
          estimatedMemoryBytes += rowCount * 1; // 1 byte
        } else if (col.type === "datetime") {
          estimatedMemoryBytes += rowCount * 8; // 8 bytes for timestamp
        } else {
          // Text/categorical - estimate based on avg length
          const avgLen = col.avgLength || 20;
          estimatedMemoryBytes += rowCount * avgLen;
        }
      }
      const estimatedMemoryMB = estimatedMemoryBytes / (1024 * 1024);

      setProfile({
        overview: {
          rowCount: schema.rowCount,
          columnCount: schema.columns.length,
          numericColumns: numericCount,
          categoricalColumns: categoricalCount,
          dateColumns: dateCount,
          textColumns: textCount,
          completenessScore,
          qualityScore,
          estimatedMemoryMB,
          duplicateRows,
        },
        columns: columnProfiles,
        alerts,
        correlations,
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
