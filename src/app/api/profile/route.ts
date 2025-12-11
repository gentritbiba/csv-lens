// src/app/api/profile/route.ts
// Open source version - no authentication

import { NextResponse } from "next/server";
import { z } from "zod";
import type { ProfileResponse } from "@/types/profile";

const ProfileRequestSchema = z.object({
  tableName: z.string().min(1).max(128),
  columns: z.array(z.string().max(256)).max(500),
  rowCount: z.number().int().nonnegative(),
});

export type ProfileRequest = z.infer<typeof ProfileRequestSchema>;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = ProfileRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { tableName, columns, rowCount } = parsed.data;

    // Generate profiling queries for each column
    // These will be executed client-side in DuckDB
    const profilingQueries = columns.map((column) => {
      const safeCol = `"${column.replace(/"/g, '""')}"`;
      const safeTable = `"${tableName.replace(/"/g, '""')}"`;

      return {
        column,
        queries: [
          {
            name: "basic_stats",
            sql: `
              SELECT
                COUNT(*) as total_count,
                COUNT(${safeCol}) as non_null_count,
                COUNT(*) - COUNT(${safeCol}) as null_count,
                COUNT(DISTINCT ${safeCol}) as distinct_count
              FROM ${safeTable}
            `,
          },
          {
            name: "numeric_stats",
            sql: `
              SELECT
                MIN(TRY_CAST(${safeCol} AS DOUBLE)) as min_val,
                MAX(TRY_CAST(${safeCol} AS DOUBLE)) as max_val,
                AVG(TRY_CAST(${safeCol} AS DOUBLE)) as mean_val,
                STDDEV(TRY_CAST(${safeCol} AS DOUBLE)) as std_dev,
                MEDIAN(TRY_CAST(${safeCol} AS DOUBLE)) as median_val
              FROM ${safeTable}
              WHERE TRY_CAST(${safeCol} AS DOUBLE) IS NOT NULL
            `,
          },
          {
            name: "top_values",
            sql: `
              SELECT
                CAST(${safeCol} AS VARCHAR) as value,
                COUNT(*) as count
              FROM ${safeTable}
              WHERE ${safeCol} IS NOT NULL
              GROUP BY ${safeCol}
              ORDER BY count DESC
              LIMIT 10
            `,
          },
          {
            name: "text_stats",
            sql: `
              SELECT
                AVG(LENGTH(CAST(${safeCol} AS VARCHAR))) as avg_length,
                MIN(LENGTH(CAST(${safeCol} AS VARCHAR))) as min_length,
                MAX(LENGTH(CAST(${safeCol} AS VARCHAR))) as max_length
              FROM ${safeTable}
              WHERE ${safeCol} IS NOT NULL
            `,
          },
          {
            name: "type_check",
            sql: `
              SELECT
                SUM(CASE WHEN TRY_CAST(${safeCol} AS DOUBLE) IS NOT NULL THEN 1 ELSE 0 END) as numeric_count,
                SUM(CASE WHEN TRY_CAST(${safeCol} AS DATE) IS NOT NULL THEN 1 ELSE 0 END) as date_count,
                SUM(CASE WHEN LOWER(CAST(${safeCol} AS VARCHAR)) IN ('true', 'false', '0', '1', 'yes', 'no') THEN 1 ELSE 0 END) as bool_count,
                COUNT(*) as total_count
              FROM ${safeTable}
              WHERE ${safeCol} IS NOT NULL
            `,
          },
        ],
      };
    });

    // Correlation and duplicate queries are computed client-side
    // to avoid sending data to server

    const response: ProfileResponse = {
      overview: {
        rowCount,
        columnCount: columns.length,
        numericColumns: 0, // Will be computed client-side
        categoricalColumns: 0,
        dateColumns: 0,
        textColumns: 0,
        completenessScore: 0,
      },
      columns: [], // Will be populated client-side
      alerts: [], // Will be populated client-side
      profilingQueries,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Profile API error:", error);
    return NextResponse.json(
      { error: "Failed to generate profile queries" },
      { status: 500 }
    );
  }
}
