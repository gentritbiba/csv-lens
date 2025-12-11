// src/types/profile.ts
// Centralized profile type definitions

export type ColumnType = "numeric" | "categorical" | "datetime" | "text" | "boolean" | "unknown";

export interface HistogramBucket {
  bucket: string;
  count: number;
  rangeStart?: number;
  rangeEnd?: number;
}

export interface TopValue {
  value: string;
  count: number;
  percent: number;
}

export interface TextPatterns {
  emails?: number;
  urls?: number;
  phones?: number;
  dates?: number;
  numbers?: number;
  empty?: number;
}

export interface ColumnProfile {
  name: string;
  type: ColumnType;
  nullCount: number;
  nullPercent: number;
  distinctCount: number;
  // Numeric fields
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  stdDev?: number;
  q1?: number;
  q3?: number;
  skewness?: number;
  histogram?: HistogramBucket[];
  // Categorical fields
  topValues?: TopValue[];
  // Text fields
  avgLength?: number;
  minLength?: number;
  maxLength?: number;
  patterns?: TextPatterns;
  // Date fields
  minDate?: string;
  maxDate?: string;
  // Memory estimation
  memoryBytes?: number;
  suggestedType?: string;
}

export type DataQualityAlertType = "high_nulls" | "potential_duplicates" | "outliers" | "mixed_types";

export interface DataQualityAlert {
  type: DataQualityAlertType;
  severity: "warning" | "error";
  column?: string;
  message: string;
  details?: string;
}

export interface Correlation {
  col1: string;
  col2: string;
  correlation: number;
}

// Base overview from API (partial data)
export interface ProfileOverviewBase {
  rowCount: number;
  columnCount: number;
  numericColumns: number;
  categoricalColumns: number;
  dateColumns: number;
  textColumns: number;
  completenessScore: number;
}

// Full overview after client-side computation
export interface ProfileOverview extends ProfileOverviewBase {
  qualityScore: number;
  estimatedMemoryMB: number;
  duplicateRows: number;
}

// Full profile data after client-side computation
export interface ProfileData {
  overview: ProfileOverview;
  columns: ColumnProfile[];
  alerts: DataQualityAlert[];
  correlations: Correlation[];
}

export interface ProfilingQuery {
  name: string;
  sql: string;
}

export interface ColumnProfilingQueries {
  column: string;
  queries: ProfilingQuery[];
}

export interface ProfileResponse {
  overview: ProfileOverviewBase;
  columns: ColumnProfile[];
  alerts: DataQualityAlert[];
  correlations?: Correlation[];
  profilingQueries: ColumnProfilingQueries[];
}
