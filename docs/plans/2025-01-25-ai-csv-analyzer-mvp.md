# AI CSV Analyzer MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Next.js web app that processes large CSV files entirely in the browser using DuckDB-WASM and AI-generated SQL queries, with no server-side data storage.

**Architecture:** Client-side only data processing using DuckDB-WASM for SQL queries on local files. AI (OpenAI GPT-4) generates SQL based on schema metadata only (first 5 rows). Results rendered as interactive charts using a visualization library.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, DuckDB-WASM, OpenAI API, Recharts, React Dropzone

---

## Phase 1: Project Foundation

### Task 1.1: Initialize Next.js Project

**Files:**
- Create: Project root with Next.js scaffolding

**Step 1: Create Next.js project with TypeScript and Tailwind**

```bash
bunx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

When prompted:
- Would you like to use Turbopack? → Yes
- Would you like to customize default import alias? → No

**Step 2: Verify installation**

```bash
bun run dev
```

Expected: Dev server starts at http://localhost:3000

**Step 3: Stop dev server and commit**

```bash
git init
git add .
git commit -m "chore: initialize Next.js project with TypeScript and Tailwind"
```

---

### Task 1.2: Install Core Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install DuckDB-WASM**

```bash
bun add @duckdb/duckdb-wasm
```

**Step 2: Install OpenAI SDK**

```bash
bun add openai
```

**Step 3: Install UI dependencies**

```bash
bun add react-dropzone recharts lucide-react
```

**Step 4: Install development dependencies**

```bash
bun add -d @types/node
```

**Step 5: Verify package.json has all dependencies**

```bash
cat package.json | grep -A 20 '"dependencies"'
```

Expected: Should show @duckdb/duckdb-wasm, openai, react-dropzone, recharts, lucide-react

**Step 6: Commit**

```bash
git add package.json bun.lockb
git commit -m "chore: add core dependencies (DuckDB-WASM, OpenAI, Recharts)"
```

---

### Task 1.3: Configure Environment Variables

**Files:**
- Create: `.env.local`
- Create: `.env.example`
- Modify: `.gitignore`

**Step 1: Create .env.example template**

Create file `.env.example`:
```env
# OpenAI API Key - get from https://platform.openai.com/api-keys
NEXT_PUBLIC_OPENAI_API_KEY=sk-your-key-here
```

**Step 2: Create .env.local with actual key placeholder**

Create file `.env.local`:
```env
NEXT_PUBLIC_OPENAI_API_KEY=
```

**Step 3: Verify .gitignore includes .env.local**

```bash
grep ".env.local" .gitignore
```

Expected: `.env*.local` or `.env.local` should be listed

**Step 4: Commit**

```bash
git add .env.example .gitignore
git commit -m "chore: add environment variable template"
```

---

### Task 1.4: Create Base Layout and Global Styles

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

**Step 1: Update globals.css with dark theme base**

Replace `src/app/globals.css` with:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: #0a0a0a;
  --foreground: #ededed;
  --card: #1a1a1a;
  --card-foreground: #ededed;
  --primary: #3b82f6;
  --primary-foreground: #ffffff;
  --muted: #262626;
  --muted-foreground: #a3a3a3;
  --border: #262626;
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: system-ui, -apple-system, sans-serif;
}
```

**Step 2: Update layout.tsx with metadata**

Replace `src/app/layout.tsx` with:
```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Data Analyzer",
  description: "Analyze large CSV files locally with AI-powered insights",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
```

**Step 3: Verify changes render**

```bash
bun run dev
```

Visit http://localhost:3000 - should see dark background

**Step 4: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx
git commit -m "style: configure dark theme and base layout"
```

---

### Task 1.5: Create Application Shell Page

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Create basic app shell**

Replace `src/app/page.tsx` with:
```tsx
export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white">AI Data Analyzer</h1>
        <p className="text-muted-foreground mt-2">
          Drop a CSV file to analyze it locally with AI
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: File Upload Area */}
        <div className="lg:col-span-1">
          <div className="bg-[var(--card)] rounded-lg p-6 border border-[var(--border)]">
            <h2 className="text-lg font-semibold mb-4">Data Source</h2>
            <div className="border-2 border-dashed border-[var(--border)] rounded-lg p-8 text-center">
              <p className="text-muted-foreground">
                Drop CSV file here or click to browse
              </p>
            </div>
          </div>
        </div>

        {/* Middle: Chat Interface */}
        <div className="lg:col-span-1">
          <div className="bg-[var(--card)] rounded-lg p-6 border border-[var(--border)] h-[600px] flex flex-col">
            <h2 className="text-lg font-semibold mb-4">Ask Questions</h2>
            <div className="flex-1 overflow-y-auto mb-4">
              <p className="text-muted-foreground text-sm">
                Load a CSV file to start asking questions about your data
              </p>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ask about your data..."
                className="flex-1 bg-[var(--muted)] rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                disabled
              />
              <button
                className="bg-[var(--primary)] text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
                disabled
              >
                Send
              </button>
            </div>
          </div>
        </div>

        {/* Right: Visualization Area */}
        <div className="lg:col-span-1">
          <div className="bg-[var(--card)] rounded-lg p-6 border border-[var(--border)] h-[600px]">
            <h2 className="text-lg font-semibold mb-4">Visualization</h2>
            <div className="h-full flex items-center justify-center">
              <p className="text-muted-foreground text-sm">
                Charts will appear here
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
```

**Step 2: Verify layout renders**

```bash
bun run dev
```

Visit http://localhost:3000 - should see 3-column layout with dark theme

**Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: create application shell with 3-column layout"
```

---

## Phase 2: DuckDB-WASM Integration

### Task 2.1: Create DuckDB Initialization Hook

**Files:**
- Create: `src/lib/duckdb.ts`

**Step 1: Create DuckDB initialization module**

Create file `src/lib/duckdb.ts`:
```typescript
import * as duckdb from "@duckdb/duckdb-wasm";

let db: duckdb.AsyncDuckDB | null = null;
let connection: duckdb.AsyncDuckDBConnection | null = null;

export async function initializeDuckDB(): Promise<duckdb.AsyncDuckDB> {
  if (db) return db;

  const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();

  const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);

  const worker_url = URL.createObjectURL(
    new Blob([`importScripts("${bundle.mainWorker}");`], {
      type: "text/javascript",
    })
  );

  const worker = new Worker(worker_url);
  const logger = new duckdb.ConsoleLogger();
  db = new duckdb.AsyncDuckDB(logger, worker);

  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
  URL.revokeObjectURL(worker_url);

  return db;
}

export async function getConnection(): Promise<duckdb.AsyncDuckDBConnection> {
  if (connection) return connection;

  const database = await initializeDuckDB();
  connection = await database.connect();

  return connection;
}

export async function executeQuery(sql: string): Promise<unknown[]> {
  const conn = await getConnection();
  const result = await conn.query(sql);
  return result.toArray().map((row) => row.toJSON());
}

export async function loadCSVFromFile(
  file: File,
  tableName: string = "data"
): Promise<{ columns: string[]; sampleRows: unknown[]; rowCount: number }> {
  const database = await initializeDuckDB();
  const conn = await getConnection();

  // Register the file with DuckDB
  await database.registerFileHandle(
    file.name,
    file,
    duckdb.DuckDBDataProtocol.BROWSER_FILEREADER,
    true
  );

  // Create table from CSV
  await conn.query(`
    CREATE OR REPLACE TABLE ${tableName} AS
    SELECT * FROM read_csv_auto('${file.name}')
  `);

  // Get column info
  const columnsResult = await conn.query(`DESCRIBE ${tableName}`);
  const columns = columnsResult
    .toArray()
    .map((row) => row.toJSON().column_name as string);

  // Get sample rows (first 5)
  const sampleResult = await conn.query(`SELECT * FROM ${tableName} LIMIT 5`);
  const sampleRows = sampleResult.toArray().map((row) => row.toJSON());

  // Get row count
  const countResult = await conn.query(
    `SELECT COUNT(*) as count FROM ${tableName}`
  );
  const rowCount = Number(countResult.toArray()[0].toJSON().count);

  return { columns, sampleRows, rowCount };
}

export async function closeConnection(): Promise<void> {
  if (connection) {
    await connection.close();
    connection = null;
  }
}

export { db, connection };
```

**Step 2: Verify TypeScript compiles**

```bash
bun run build
```

Expected: Build succeeds (may have warnings about unused exports, that's OK)

**Step 3: Commit**

```bash
git add src/lib/duckdb.ts
git commit -m "feat: add DuckDB-WASM initialization and CSV loading utilities"
```

---

### Task 2.2: Create DuckDB React Hook

**Files:**
- Create: `src/hooks/useDuckDB.ts`

**Step 1: Create the hook**

Create file `src/hooks/useDuckDB.ts`:
```typescript
"use client";

import { useState, useCallback } from "react";
import {
  loadCSVFromFile,
  executeQuery,
  closeConnection,
} from "@/lib/duckdb";

export interface TableSchema {
  tableName: string;
  columns: string[];
  sampleRows: unknown[];
  rowCount: number;
}

export interface UseDuckDBReturn {
  schema: TableSchema | null;
  isLoading: boolean;
  error: string | null;
  loadFile: (file: File) => Promise<void>;
  runQuery: (sql: string) => Promise<unknown[]>;
  reset: () => Promise<void>;
}

export function useDuckDB(): UseDuckDBReturn {
  const [schema, setSchema] = useState<TableSchema | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      const tableName = "data";
      const result = await loadCSVFromFile(file, tableName);

      setSchema({
        tableName,
        columns: result.columns,
        sampleRows: result.sampleRows,
        rowCount: result.rowCount,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load CSV";
      setError(message);
      console.error("DuckDB load error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const runQuery = useCallback(async (sql: string): Promise<unknown[]> => {
    setError(null);

    try {
      return await executeQuery(sql);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Query failed";
      setError(message);
      throw err;
    }
  }, []);

  const reset = useCallback(async () => {
    await closeConnection();
    setSchema(null);
    setError(null);
  }, []);

  return {
    schema,
    isLoading,
    error,
    loadFile,
    runQuery,
    reset,
  };
}
```

**Step 2: Verify TypeScript compiles**

```bash
bun run build
```

Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/hooks/useDuckDB.ts
git commit -m "feat: add useDuckDB React hook for state management"
```

---

## Phase 3: File Upload Component

### Task 3.1: Create File Dropzone Component

**Files:**
- Create: `src/components/FileDropzone.tsx`

**Step 1: Create the component**

Create file `src/components/FileDropzone.tsx`:
```tsx
"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileSpreadsheet, Loader2 } from "lucide-react";

interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
  currentFile: File | null;
}

export function FileDropzone({
  onFileSelect,
  isLoading,
  currentFile,
}: FileDropzoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0]);
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
    },
    multiple: false,
    disabled: isLoading,
  });

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
        transition-colors duration-200
        ${isDragActive ? "border-[var(--primary)] bg-[var(--primary)]/10" : "border-[var(--border)]"}
        ${isLoading ? "opacity-50 cursor-not-allowed" : "hover:border-[var(--primary)]/50"}
      `}
    >
      <input {...getInputProps()} />

      {isLoading ? (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-[var(--primary)] animate-spin" />
          <p className="text-sm text-muted-foreground">Loading CSV...</p>
        </div>
      ) : currentFile ? (
        <div className="flex flex-col items-center gap-3">
          <FileSpreadsheet className="w-10 h-10 text-[var(--primary)]" />
          <div>
            <p className="text-sm font-medium">{currentFile.name}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatFileSize(currentFile.size)}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Drop another file to replace
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <Upload className="w-10 h-10 text-muted-foreground" />
          {isDragActive ? (
            <p className="text-sm text-[var(--primary)]">Drop the CSV here</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Drop CSV file here or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Your data stays in your browser
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
```

**Step 2: Verify TypeScript compiles**

```bash
bun run build
```

Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/FileDropzone.tsx
git commit -m "feat: add FileDropzone component with drag-and-drop support"
```

---

### Task 3.2: Create Schema Display Component

**Files:**
- Create: `src/components/SchemaDisplay.tsx`

**Step 1: Create the component**

Create file `src/components/SchemaDisplay.tsx`:
```tsx
"use client";

import { TableSchema } from "@/hooks/useDuckDB";
import { Table, Hash } from "lucide-react";

interface SchemaDisplayProps {
  schema: TableSchema;
}

export function SchemaDisplay({ schema }: SchemaDisplayProps) {
  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <Table className="w-4 h-4 text-[var(--primary)]" />
        <span className="font-medium">{schema.tableName}</span>
        <span className="text-muted-foreground">
          ({schema.rowCount.toLocaleString()} rows)
        </span>
      </div>

      <div>
        <h4 className="text-xs font-medium text-muted-foreground mb-2">
          Columns ({schema.columns.length})
        </h4>
        <div className="flex flex-wrap gap-2">
          {schema.columns.map((col) => (
            <span
              key={col}
              className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--muted)] rounded text-xs"
            >
              <Hash className="w-3 h-3 text-muted-foreground" />
              {col}
            </span>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-medium text-muted-foreground mb-2">
          Sample Data (first 5 rows)
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border)]">
                {schema.columns.map((col) => (
                  <th
                    key={col}
                    className="text-left p-2 font-medium text-muted-foreground"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {schema.sampleRows.map((row, i) => (
                <tr key={i} className="border-b border-[var(--border)]/50">
                  {schema.columns.map((col) => (
                    <td key={col} className="p-2 truncate max-w-[150px]">
                      {String((row as Record<string, unknown>)[col] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Verify TypeScript compiles**

```bash
bun run build
```

Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/SchemaDisplay.tsx
git commit -m "feat: add SchemaDisplay component to show table metadata"
```

---

### Task 3.3: Integrate File Upload into Main Page

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Update page.tsx to use components**

Replace `src/app/page.tsx` with:
```tsx
"use client";

import { useState } from "react";
import { FileDropzone } from "@/components/FileDropzone";
import { SchemaDisplay } from "@/components/SchemaDisplay";
import { useDuckDB } from "@/hooks/useDuckDB";

export default function Home() {
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const { schema, isLoading, error, loadFile } = useDuckDB();

  const handleFileSelect = async (file: File) => {
    setCurrentFile(file);
    await loadFile(file);
  };

  return (
    <main className="min-h-screen p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white">AI Data Analyzer</h1>
        <p className="text-muted-foreground mt-2">
          Drop a CSV file to analyze it locally with AI
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: File Upload Area */}
        <div className="lg:col-span-1">
          <div className="bg-[var(--card)] rounded-lg p-6 border border-[var(--border)]">
            <h2 className="text-lg font-semibold mb-4">Data Source</h2>
            <FileDropzone
              onFileSelect={handleFileSelect}
              isLoading={isLoading}
              currentFile={currentFile}
            />
            {error && (
              <p className="mt-4 text-sm text-red-400">{error}</p>
            )}
            {schema && <SchemaDisplay schema={schema} />}
          </div>
        </div>

        {/* Middle: Chat Interface */}
        <div className="lg:col-span-1">
          <div className="bg-[var(--card)] rounded-lg p-6 border border-[var(--border)] h-[600px] flex flex-col">
            <h2 className="text-lg font-semibold mb-4">Ask Questions</h2>
            <div className="flex-1 overflow-y-auto mb-4">
              {schema ? (
                <p className="text-muted-foreground text-sm">
                  Ready! Ask questions about your {schema.rowCount.toLocaleString()} rows of data.
                </p>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Load a CSV file to start asking questions about your data
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ask about your data..."
                className="flex-1 bg-[var(--muted)] rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                disabled={!schema}
              />
              <button
                className="bg-[var(--primary)] text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
                disabled={!schema}
              >
                Send
              </button>
            </div>
          </div>
        </div>

        {/* Right: Visualization Area */}
        <div className="lg:col-span-1">
          <div className="bg-[var(--card)] rounded-lg p-6 border border-[var(--border)] h-[600px]">
            <h2 className="text-lg font-semibold mb-4">Visualization</h2>
            <div className="h-full flex items-center justify-center">
              <p className="text-muted-foreground text-sm">
                Charts will appear here
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
```

**Step 2: Test the file upload**

```bash
bun run dev
```

Visit http://localhost:3000, drag a CSV file - should load and show schema

**Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: integrate file upload with DuckDB loading"
```

---

## Phase 4: AI Integration

### Task 4.1: Create OpenAI Service

**Files:**
- Create: `src/lib/openai.ts`

**Step 1: Create the OpenAI service module**

Create file `src/lib/openai.ts`:
```typescript
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

export interface SchemaContext {
  columns: string[];
  sampleRows: unknown[];
  rowCount: number;
}

export interface AIResponse {
  sql: string;
  explanation: string;
  chartType: "bar" | "line" | "pie" | "scatter" | "table";
  xAxis?: string;
  yAxis?: string;
}

export async function generateSQL(
  userQuery: string,
  schemaContext: SchemaContext
): Promise<AIResponse> {
  const systemPrompt = `You are a SQL expert that generates DuckDB SQL queries.
You will be given a table schema and a user question. Generate a SQL query to answer the question.

Rules:
1. The table is always named "data"
2. Use standard SQL syntax compatible with DuckDB
3. For aggregations, always include meaningful column aliases
4. Limit results to 100 rows max unless the user specifies otherwise
5. Return results suitable for visualization

Respond ONLY with valid JSON in this exact format:
{
  "sql": "SELECT ...",
  "explanation": "Brief explanation of what the query does",
  "chartType": "bar|line|pie|scatter|table",
  "xAxis": "column name for x-axis (if applicable)",
  "yAxis": "column name for y-axis (if applicable)"
}`;

  const userPrompt = `Table Schema:
Columns: ${schemaContext.columns.join(", ")}
Total rows: ${schemaContext.rowCount}
Sample data (first 5 rows):
${JSON.stringify(schemaContext.sampleRows, null, 2)}

User Question: ${userQuery}

Generate the SQL query and visualization config:`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.1,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error("Empty response from OpenAI");
  }

  return JSON.parse(content) as AIResponse;
}
```

**Step 2: Verify TypeScript compiles**

```bash
bun run build
```

Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/lib/openai.ts
git commit -m "feat: add OpenAI service for SQL generation"
```

---

### Task 4.2: Create useChat Hook

**Files:**
- Create: `src/hooks/useChat.ts`

**Step 1: Create the chat hook**

Create file `src/hooks/useChat.ts`:
```typescript
"use client";

import { useState, useCallback } from "react";
import { generateSQL, SchemaContext, AIResponse } from "@/lib/openai";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sql?: string;
  data?: unknown[];
  chartConfig?: {
    chartType: AIResponse["chartType"];
    xAxis?: string;
    yAxis?: string;
  };
  error?: string;
  timestamp: Date;
}

export interface UseChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  sendMessage: (
    query: string,
    schemaContext: SchemaContext,
    runQuery: (sql: string) => Promise<unknown[]>
  ) => Promise<void>;
  clearMessages: () => void;
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(
    async (
      query: string,
      schemaContext: SchemaContext,
      runQuery: (sql: string) => Promise<unknown[]>
    ) => {
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: query,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        // Generate SQL from AI
        const aiResponse = await generateSQL(query, schemaContext);

        // Execute the SQL locally
        const data = await runQuery(aiResponse.sql);

        const assistantMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: aiResponse.explanation,
          sql: aiResponse.sql,
          data,
          chartConfig: {
            chartType: aiResponse.chartType,
            xAxis: aiResponse.xAxis,
            yAxis: aiResponse.yAxis,
          },
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (error) {
        const errorMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Sorry, I encountered an error processing your request.",
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
  };
}
```

**Step 2: Verify TypeScript compiles**

```bash
bun run build
```

Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/hooks/useChat.ts
git commit -m "feat: add useChat hook for AI-powered conversations"
```

---

## Phase 5: Chat Interface

### Task 5.1: Create Chat Message Component

**Files:**
- Create: `src/components/ChatMessage.tsx`

**Step 1: Create the component**

Create file `src/components/ChatMessage.tsx`:
```tsx
"use client";

import { ChatMessage as ChatMessageType } from "@/hooks/useChat";
import { User, Bot, Code, AlertCircle } from "lucide-react";

interface ChatMessageProps {
  message: ChatMessageType;
  onViewData?: (data: unknown[], chartConfig: ChatMessageType["chartConfig"]) => void;
}

export function ChatMessage({ message, onViewData }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`
          w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
          ${isUser ? "bg-[var(--primary)]" : "bg-[var(--muted)]"}
        `}
      >
        {isUser ? (
          <User className="w-4 h-4" />
        ) : (
          <Bot className="w-4 h-4" />
        )}
      </div>

      <div
        className={`
          max-w-[80%] rounded-lg p-3 space-y-2
          ${isUser ? "bg-[var(--primary)] text-white" : "bg-[var(--muted)]"}
        `}
      >
        <p className="text-sm">{message.content}</p>

        {message.sql && (
          <div className="bg-black/20 rounded p-2 mt-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <Code className="w-3 h-3" />
              SQL
            </div>
            <code className="text-xs font-mono block whitespace-pre-wrap">
              {message.sql}
            </code>
          </div>
        )}

        {message.error && (
          <div className="flex items-center gap-2 text-red-400 text-xs mt-2">
            <AlertCircle className="w-4 h-4" />
            {message.error}
          </div>
        )}

        {message.data && message.data.length > 0 && onViewData && (
          <button
            onClick={() => onViewData(message.data!, message.chartConfig)}
            className="text-xs text-[var(--primary)] hover:underline mt-2"
          >
            View {message.data.length} results →
          </button>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Verify TypeScript compiles**

```bash
bun run build
```

Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/ChatMessage.tsx
git commit -m "feat: add ChatMessage component for displaying messages"
```

---

### Task 5.2: Create Chat Input Component

**Files:**
- Create: `src/components/ChatInput.tsx`

**Step 1: Create the component**

Create file `src/components/ChatInput.tsx`:
```tsx
"use client";

import { useState, FormEvent, KeyboardEvent } from "react";
import { Send, Loader2 } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  disabled: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  isLoading,
  disabled,
  placeholder = "Ask about your data...",
}: ChatInputProps) {
  const [input, setInput] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading && !disabled) {
      onSend(input.trim());
      setInput("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled || isLoading}
        rows={1}
        className="
          flex-1 bg-[var(--muted)] rounded-lg px-4 py-2 text-sm
          focus:outline-none focus:ring-2 focus:ring-[var(--primary)]
          disabled:opacity-50 disabled:cursor-not-allowed
          resize-none min-h-[40px] max-h-[120px]
        "
      />
      <button
        type="submit"
        disabled={disabled || isLoading || !input.trim()}
        className="
          bg-[var(--primary)] text-white p-2 rounded-lg
          disabled:opacity-50 disabled:cursor-not-allowed
          hover:bg-[var(--primary)]/80 transition-colors
        "
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Send className="w-5 h-5" />
        )}
      </button>
    </form>
  );
}
```

**Step 2: Verify TypeScript compiles**

```bash
bun run build
```

Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/ChatInput.tsx
git commit -m "feat: add ChatInput component with keyboard support"
```

---

### Task 5.3: Create Chat Panel Component

**Files:**
- Create: `src/components/ChatPanel.tsx`

**Step 1: Create the component**

Create file `src/components/ChatPanel.tsx`:
```tsx
"use client";

import { useRef, useEffect } from "react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { ChatMessage as ChatMessageType } from "@/hooks/useChat";
import { MessageSquare } from "lucide-react";

interface ChatPanelProps {
  messages: ChatMessageType[];
  isLoading: boolean;
  isReady: boolean;
  onSend: (message: string) => void;
  onViewData: (data: unknown[], chartConfig: ChatMessageType["chartConfig"]) => void;
}

export function ChatPanel({
  messages,
  isLoading,
  isReady,
  onSend,
  onViewData,
}: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="bg-[var(--card)] rounded-lg p-6 border border-[var(--border)] h-[600px] flex flex-col">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <MessageSquare className="w-5 h-5" />
        Ask Questions
      </h2>

      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            {isReady ? (
              <div className="text-center space-y-2">
                <p className="text-muted-foreground text-sm">
                  Ready to analyze your data!
                </p>
                <p className="text-xs text-muted-foreground">
                  Try asking: &quot;Show me the top 10 values&quot; or &quot;What are the unique categories?&quot;
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                Load a CSV file to start asking questions
              </p>
            )}
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                onViewData={onViewData}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <ChatInput
        onSend={onSend}
        isLoading={isLoading}
        disabled={!isReady}
      />
    </div>
  );
}
```

**Step 2: Verify TypeScript compiles**

```bash
bun run build
```

Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/ChatPanel.tsx
git commit -m "feat: add ChatPanel component combining messages and input"
```

---

## Phase 6: Data Visualization

### Task 6.1: Create Chart Component

**Files:**
- Create: `src/components/Chart.tsx`

**Step 1: Create the component**

Create file `src/components/Chart.tsx`:
```tsx
"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
];

interface ChartProps {
  data: unknown[];
  chartType: "bar" | "line" | "pie" | "scatter" | "table";
  xAxis?: string;
  yAxis?: string;
}

export function Chart({ data, chartType, xAxis, yAxis }: ChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        No data to display
      </div>
    );
  }

  const typedData = data as Record<string, unknown>[];

  // Auto-detect axes if not provided
  const keys = Object.keys(typedData[0]);
  const effectiveXAxis = xAxis || keys[0];
  const effectiveYAxis = yAxis || keys[1] || keys[0];

  if (chartType === "table") {
    return (
      <div className="overflow-auto h-full">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              {keys.map((key) => (
                <th
                  key={key}
                  className="text-left p-2 font-medium text-muted-foreground"
                >
                  {key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {typedData.slice(0, 100).map((row, i) => (
              <tr key={i} className="border-b border-[var(--border)]/50">
                {keys.map((key) => (
                  <td key={key} className="p-2 truncate max-w-[200px]">
                    {String(row[key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {typedData.length > 100 && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            Showing first 100 of {typedData.length} rows
          </p>
        )}
      </div>
    );
  }

  if (chartType === "pie") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={typedData}
            dataKey={effectiveYAxis}
            nameKey={effectiveXAxis}
            cx="50%"
            cy="50%"
            outerRadius={150}
            label={(entry) => entry[effectiveXAxis]}
          >
            {typedData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === "scatter") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey={effectiveXAxis}
            stroke="var(--muted-foreground)"
            fontSize={12}
          />
          <YAxis
            dataKey={effectiveYAxis}
            stroke="var(--muted-foreground)"
            fontSize={12}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
            }}
          />
          <Scatter data={typedData} fill="#3b82f6" />
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === "line") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={typedData}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey={effectiveXAxis}
            stroke="var(--muted-foreground)"
            fontSize={12}
          />
          <YAxis stroke="var(--muted-foreground)" fontSize={12} />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey={effectiveYAxis}
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: "#3b82f6" }}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  // Default: bar chart
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={typedData}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey={effectiveXAxis}
          stroke="var(--muted-foreground)"
          fontSize={12}
        />
        <YAxis stroke="var(--muted-foreground)" fontSize={12} />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
          }}
        />
        <Legend />
        <Bar dataKey={effectiveYAxis} fill="#3b82f6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

**Step 2: Verify TypeScript compiles**

```bash
bun run build
```

Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/Chart.tsx
git commit -m "feat: add Chart component with bar, line, pie, scatter, and table support"
```

---

### Task 6.2: Create Visualization Panel Component

**Files:**
- Create: `src/components/VisualizationPanel.tsx`

**Step 1: Create the component**

Create file `src/components/VisualizationPanel.tsx`:
```tsx
"use client";

import { Chart } from "./Chart";
import { BarChart3, X } from "lucide-react";

interface VisualizationPanelProps {
  data: unknown[] | null;
  chartType: "bar" | "line" | "pie" | "scatter" | "table";
  xAxis?: string;
  yAxis?: string;
  onClear: () => void;
}

export function VisualizationPanel({
  data,
  chartType,
  xAxis,
  yAxis,
  onClear,
}: VisualizationPanelProps) {
  return (
    <div className="bg-[var(--card)] rounded-lg p-6 border border-[var(--border)] h-[600px] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Visualization
        </h2>
        {data && (
          <button
            onClick={onClear}
            className="p-1 hover:bg-[var(--muted)] rounded"
            title="Clear visualization"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1">
        {data ? (
          <Chart
            data={data}
            chartType={chartType}
            xAxis={xAxis}
            yAxis={yAxis}
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-muted-foreground text-sm text-center">
              Ask a question to see visualizations here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Verify TypeScript compiles**

```bash
bun run build
```

Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/VisualizationPanel.tsx
git commit -m "feat: add VisualizationPanel wrapper component"
```

---

## Phase 7: Full Integration

### Task 7.1: Integrate All Components in Main Page

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Update page.tsx with full integration**

Replace `src/app/page.tsx` with:
```tsx
"use client";

import { useState, useCallback } from "react";
import { FileDropzone } from "@/components/FileDropzone";
import { SchemaDisplay } from "@/components/SchemaDisplay";
import { ChatPanel } from "@/components/ChatPanel";
import { VisualizationPanel } from "@/components/VisualizationPanel";
import { useDuckDB } from "@/hooks/useDuckDB";
import { useChat, ChatMessage } from "@/hooks/useChat";

interface VisualizationState {
  data: unknown[] | null;
  chartType: "bar" | "line" | "pie" | "scatter" | "table";
  xAxis?: string;
  yAxis?: string;
}

export default function Home() {
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const { schema, isLoading: isLoadingFile, error, loadFile, runQuery } = useDuckDB();
  const { messages, isLoading: isLoadingChat, sendMessage, clearMessages } = useChat();
  const [visualization, setVisualization] = useState<VisualizationState>({
    data: null,
    chartType: "bar",
  });

  const handleFileSelect = useCallback(async (file: File) => {
    setCurrentFile(file);
    clearMessages();
    setVisualization({ data: null, chartType: "bar" });
    await loadFile(file);
  }, [loadFile, clearMessages]);

  const handleSendMessage = useCallback(async (query: string) => {
    if (!schema) return;

    await sendMessage(
      query,
      {
        columns: schema.columns,
        sampleRows: schema.sampleRows,
        rowCount: schema.rowCount,
      },
      runQuery
    );
  }, [schema, sendMessage, runQuery]);

  const handleViewData = useCallback(
    (data: unknown[], chartConfig: ChatMessage["chartConfig"]) => {
      setVisualization({
        data,
        chartType: chartConfig?.chartType || "table",
        xAxis: chartConfig?.xAxis,
        yAxis: chartConfig?.yAxis,
      });
    },
    []
  );

  const handleClearVisualization = useCallback(() => {
    setVisualization({ data: null, chartType: "bar" });
  }, []);

  return (
    <main className="min-h-screen p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white">AI Data Analyzer</h1>
        <p className="text-muted-foreground mt-2">
          Drop a CSV file to analyze it locally with AI — your data never leaves your browser
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: File Upload Area */}
        <div className="lg:col-span-1">
          <div className="bg-[var(--card)] rounded-lg p-6 border border-[var(--border)]">
            <h2 className="text-lg font-semibold mb-4">Data Source</h2>
            <FileDropzone
              onFileSelect={handleFileSelect}
              isLoading={isLoadingFile}
              currentFile={currentFile}
            />
            {error && (
              <p className="mt-4 text-sm text-red-400">{error}</p>
            )}
            {schema && <SchemaDisplay schema={schema} />}
          </div>
        </div>

        {/* Middle: Chat Interface */}
        <div className="lg:col-span-1">
          <ChatPanel
            messages={messages}
            isLoading={isLoadingChat}
            isReady={!!schema}
            onSend={handleSendMessage}
            onViewData={handleViewData}
          />
        </div>

        {/* Right: Visualization Area */}
        <div className="lg:col-span-1">
          <VisualizationPanel
            data={visualization.data}
            chartType={visualization.chartType}
            xAxis={visualization.xAxis}
            yAxis={visualization.yAxis}
            onClear={handleClearVisualization}
          />
        </div>
      </div>
    </main>
  );
}
```

**Step 2: Test the full application**

```bash
bun run dev
```

Test flow:
1. Drop a CSV file
2. Ask "Show me the first 10 rows"
3. Click "View results" to see the table
4. Ask "What are the top 5 values by [column]"
5. View the bar chart

**Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: integrate all components for full MVP functionality"
```

---

## Phase 8: Polish and Error Handling

### Task 8.1: Add Loading States Component

**Files:**
- Create: `src/components/LoadingDots.tsx`

**Step 1: Create loading animation component**

Create file `src/components/LoadingDots.tsx`:
```tsx
"use client";

export function LoadingDots() {
  return (
    <div className="flex items-center gap-1">
      <div className="w-2 h-2 bg-[var(--primary)] rounded-full animate-bounce [animation-delay:-0.3s]" />
      <div className="w-2 h-2 bg-[var(--primary)] rounded-full animate-bounce [animation-delay:-0.15s]" />
      <div className="w-2 h-2 bg-[var(--primary)] rounded-full animate-bounce" />
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/LoadingDots.tsx
git commit -m "feat: add LoadingDots animation component"
```

---

### Task 8.2: Add Error Boundary

**Files:**
- Create: `src/components/ErrorBoundary.tsx`

**Step 1: Create error boundary component**

Create file `src/components/ErrorBoundary.tsx`:
```tsx
"use client";

import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mb-4" />
          <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
          <p className="text-muted-foreground text-sm mb-4">
            {this.state.error?.message || "An unexpected error occurred"}
          </p>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**Step 2: Commit**

```bash
git add src/components/ErrorBoundary.tsx
git commit -m "feat: add ErrorBoundary component for graceful error handling"
```

---

### Task 8.3: Add API Key Validation

**Files:**
- Create: `src/components/APIKeyPrompt.tsx`

**Step 1: Create API key prompt component**

Create file `src/components/APIKeyPrompt.tsx`:
```tsx
"use client";

import { useState } from "react";
import { Key, ExternalLink } from "lucide-react";

interface APIKeyPromptProps {
  onKeySubmit: (key: string) => void;
}

export function APIKeyPrompt({ onKeySubmit }: APIKeyPromptProps) {
  const [key, setKey] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (key.trim().startsWith("sk-")) {
      onKeySubmit(key.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--card)] rounded-lg p-6 max-w-md w-full border border-[var(--border)]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-[var(--primary)]/10 rounded-full flex items-center justify-center">
            <Key className="w-5 h-5 text-[var(--primary)]" />
          </div>
          <h2 className="text-lg font-semibold">OpenAI API Key Required</h2>
        </div>

        <p className="text-muted-foreground text-sm mb-4">
          To analyze your data with AI, you need an OpenAI API key. Your key is
          stored only in your browser and never sent to our servers.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="sk-..."
            className="w-full bg-[var(--muted)] rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />

          <button
            type="submit"
            disabled={!key.startsWith("sk-")}
            className="w-full bg-[var(--primary)] text-white py-2 rounded-lg text-sm disabled:opacity-50"
          >
            Save API Key
          </button>
        </form>

        <a
          href="https://platform.openai.com/api-keys"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-[var(--primary)] mt-4 hover:underline"
        >
          Get an API key from OpenAI
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/APIKeyPrompt.tsx
git commit -m "feat: add APIKeyPrompt component for runtime key entry"
```

---

### Task 8.4: Update OpenAI Service for Runtime Key

**Files:**
- Modify: `src/lib/openai.ts`

**Step 1: Update openai.ts to support runtime key**

Replace `src/lib/openai.ts` with:
```typescript
import OpenAI from "openai";

let openaiClient: OpenAI | null = null;
let currentApiKey: string | null = null;

export function setApiKey(key: string): void {
  currentApiKey = key;
  openaiClient = new OpenAI({
    apiKey: key,
    dangerouslyAllowBrowser: true,
  });
  // Store in localStorage for persistence
  if (typeof window !== "undefined") {
    localStorage.setItem("openai_api_key", key);
  }
}

export function getStoredApiKey(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("openai_api_key");
}

export function hasApiKey(): boolean {
  if (currentApiKey) return true;
  const storedKey = getStoredApiKey();
  if (storedKey) {
    setApiKey(storedKey);
    return true;
  }
  // Check env variable
  const envKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  if (envKey && envKey.startsWith("sk-")) {
    setApiKey(envKey);
    return true;
  }
  return false;
}

function getClient(): OpenAI {
  if (!openaiClient) {
    throw new Error("OpenAI API key not configured");
  }
  return openaiClient;
}

export interface SchemaContext {
  columns: string[];
  sampleRows: unknown[];
  rowCount: number;
}

export interface AIResponse {
  sql: string;
  explanation: string;
  chartType: "bar" | "line" | "pie" | "scatter" | "table";
  xAxis?: string;
  yAxis?: string;
}

export async function generateSQL(
  userQuery: string,
  schemaContext: SchemaContext
): Promise<AIResponse> {
  const client = getClient();

  const systemPrompt = `You are a SQL expert that generates DuckDB SQL queries.
You will be given a table schema and a user question. Generate a SQL query to answer the question.

Rules:
1. The table is always named "data"
2. Use standard SQL syntax compatible with DuckDB
3. For aggregations, always include meaningful column aliases
4. Limit results to 100 rows max unless the user specifies otherwise
5. Return results suitable for visualization

Respond ONLY with valid JSON in this exact format:
{
  "sql": "SELECT ...",
  "explanation": "Brief explanation of what the query does",
  "chartType": "bar|line|pie|scatter|table",
  "xAxis": "column name for x-axis (if applicable)",
  "yAxis": "column name for y-axis (if applicable)"
}`;

  const userPrompt = `Table Schema:
Columns: ${schemaContext.columns.join(", ")}
Total rows: ${schemaContext.rowCount}
Sample data (first 5 rows):
${JSON.stringify(schemaContext.sampleRows, null, 2)}

User Question: ${userQuery}

Generate the SQL query and visualization config:`;

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.1,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error("Empty response from OpenAI");
  }

  return JSON.parse(content) as AIResponse;
}
```

**Step 2: Verify build**

```bash
bun run build
```

Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/lib/openai.ts
git commit -m "feat: add runtime API key support with localStorage persistence"
```

---

### Task 8.5: Update Main Page with API Key Check

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Add API key validation to page**

Replace `src/app/page.tsx` with:
```tsx
"use client";

import { useState, useCallback, useEffect } from "react";
import { FileDropzone } from "@/components/FileDropzone";
import { SchemaDisplay } from "@/components/SchemaDisplay";
import { ChatPanel } from "@/components/ChatPanel";
import { VisualizationPanel } from "@/components/VisualizationPanel";
import { APIKeyPrompt } from "@/components/APIKeyPrompt";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useDuckDB } from "@/hooks/useDuckDB";
import { useChat, ChatMessage } from "@/hooks/useChat";
import { hasApiKey, setApiKey } from "@/lib/openai";

interface VisualizationState {
  data: unknown[] | null;
  chartType: "bar" | "line" | "pie" | "scatter" | "table";
  xAxis?: string;
  yAxis?: string;
}

export default function Home() {
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [showApiKeyPrompt, setShowApiKeyPrompt] = useState(false);
  const { schema, isLoading: isLoadingFile, error, loadFile, runQuery } = useDuckDB();
  const { messages, isLoading: isLoadingChat, sendMessage, clearMessages } = useChat();
  const [visualization, setVisualization] = useState<VisualizationState>({
    data: null,
    chartType: "bar",
  });

  useEffect(() => {
    // Check for API key on mount
    if (!hasApiKey()) {
      setShowApiKeyPrompt(true);
    }
  }, []);

  const handleApiKeySubmit = useCallback((key: string) => {
    setApiKey(key);
    setShowApiKeyPrompt(false);
  }, []);

  const handleFileSelect = useCallback(async (file: File) => {
    setCurrentFile(file);
    clearMessages();
    setVisualization({ data: null, chartType: "bar" });
    await loadFile(file);
  }, [loadFile, clearMessages]);

  const handleSendMessage = useCallback(async (query: string) => {
    if (!schema) return;

    // Check API key before sending
    if (!hasApiKey()) {
      setShowApiKeyPrompt(true);
      return;
    }

    await sendMessage(
      query,
      {
        columns: schema.columns,
        sampleRows: schema.sampleRows,
        rowCount: schema.rowCount,
      },
      runQuery
    );
  }, [schema, sendMessage, runQuery]);

  const handleViewData = useCallback(
    (data: unknown[], chartConfig: ChatMessage["chartConfig"]) => {
      setVisualization({
        data,
        chartType: chartConfig?.chartType || "table",
        xAxis: chartConfig?.xAxis,
        yAxis: chartConfig?.yAxis,
      });
    },
    []
  );

  const handleClearVisualization = useCallback(() => {
    setVisualization({ data: null, chartType: "bar" });
  }, []);

  return (
    <ErrorBoundary>
      <main className="min-h-screen p-8">
        {showApiKeyPrompt && (
          <APIKeyPrompt onKeySubmit={handleApiKeySubmit} />
        )}

        <header className="mb-8">
          <h1 className="text-3xl font-bold text-white">AI Data Analyzer</h1>
          <p className="text-muted-foreground mt-2">
            Drop a CSV file to analyze it locally with AI — your data never leaves your browser
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: File Upload Area */}
          <div className="lg:col-span-1">
            <div className="bg-[var(--card)] rounded-lg p-6 border border-[var(--border)]">
              <h2 className="text-lg font-semibold mb-4">Data Source</h2>
              <FileDropzone
                onFileSelect={handleFileSelect}
                isLoading={isLoadingFile}
                currentFile={currentFile}
              />
              {error && (
                <p className="mt-4 text-sm text-red-400">{error}</p>
              )}
              {schema && <SchemaDisplay schema={schema} />}
            </div>
          </div>

          {/* Middle: Chat Interface */}
          <div className="lg:col-span-1">
            <ChatPanel
              messages={messages}
              isLoading={isLoadingChat}
              isReady={!!schema}
              onSend={handleSendMessage}
              onViewData={handleViewData}
            />
          </div>

          {/* Right: Visualization Area */}
          <div className="lg:col-span-1">
            <VisualizationPanel
              data={visualization.data}
              chartType={visualization.chartType}
              xAxis={visualization.xAxis}
              yAxis={visualization.yAxis}
              onClear={handleClearVisualization}
            />
          </div>
        </div>
      </main>
    </ErrorBoundary>
  );
}
```

**Step 2: Test the full flow**

```bash
bun run dev
```

Test:
1. Clear localStorage: `localStorage.clear()` in browser console
2. Refresh - should see API key prompt
3. Enter key, should persist

**Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: integrate API key validation into main page"
```

---

## Phase 9: Build and Deploy Preparation

### Task 9.1: Fix Build Issues

**Files:**
- Potentially modify files based on build errors

**Step 1: Run production build**

```bash
bun run build
```

**Step 2: Fix any TypeScript errors**

If errors occur, fix them one by one. Common issues:
- Missing types
- Unused imports
- Type mismatches

**Step 3: Test production build locally**

```bash
bun run start
```

Visit http://localhost:3000 and test all functionality

**Step 4: Commit fixes**

```bash
git add -A
git commit -m "fix: resolve build issues for production"
```

---

### Task 9.2: Add README

**Files:**
- Create: `README.md`

**Step 1: Create README**

Create file `README.md`:
```markdown
# AI Data Analyzer

A privacy-first CSV analysis tool that processes your data entirely in the browser using AI-generated SQL queries.

## Features

- **Zero Upload**: Your data never leaves your browser
- **AI-Powered**: Natural language queries converted to SQL
- **Local Processing**: Uses DuckDB-WASM for fast, local SQL execution
- **Visualizations**: Automatic chart generation based on query results

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- DuckDB-WASM (local SQL engine)
- OpenAI GPT-4o (query generation)
- Recharts (visualizations)
- Tailwind CSS

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   bun install
   ```
3. Add your OpenAI API key to `.env.local`:
   ```
   NEXT_PUBLIC_OPENAI_API_KEY=sk-your-key-here
   ```
4. Run the development server:
   ```bash
   bun run dev
   ```

## How It Works

1. **Drop a CSV file** - The file is loaded into DuckDB running in your browser
2. **Ask questions** - Type natural language queries like "Show me the top 10 sales by region"
3. **AI generates SQL** - Only your schema (column names + 5 sample rows) is sent to OpenAI
4. **Local execution** - The SQL runs locally on your machine via DuckDB-WASM
5. **Visualize** - Results are displayed as charts or tables

## Privacy

- Your actual data never leaves your browser
- Only metadata (column names, sample rows) is sent to OpenAI for query generation
- API keys are stored in localStorage, never on servers

## License

MIT
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with project overview and setup instructions"
```

---

### Task 9.3: Create Sample CSV for Testing

**Files:**
- Create: `public/sample-data.csv`

**Step 1: Create sample data file**

Create file `public/sample-data.csv`:
```csv
date,product,category,region,sales,quantity,profit
2024-01-01,Widget A,Electronics,North,1250.00,50,312.50
2024-01-01,Widget B,Electronics,South,890.00,35,222.50
2024-01-02,Gadget X,Home,East,450.00,15,112.50
2024-01-02,Widget A,Electronics,West,1100.00,44,275.00
2024-01-03,Gadget Y,Home,North,780.00,26,195.00
2024-01-03,Widget B,Electronics,East,920.00,37,230.00
2024-01-04,Tool Z,Industrial,South,2100.00,70,525.00
2024-01-04,Widget A,Electronics,North,1350.00,54,337.50
2024-01-05,Gadget X,Home,West,520.00,17,130.00
2024-01-05,Tool Z,Industrial,East,1890.00,63,472.50
2024-01-06,Widget B,Electronics,North,1050.00,42,262.50
2024-01-06,Gadget Y,Home,South,680.00,23,170.00
2024-01-07,Widget A,Electronics,East,1420.00,57,355.00
2024-01-07,Tool Z,Industrial,West,2340.00,78,585.00
2024-01-08,Gadget X,Home,North,490.00,16,122.50
```

**Step 2: Commit**

```bash
git add public/sample-data.csv
git commit -m "chore: add sample CSV data for testing"
```

---

### Task 9.4: Final Integration Test

**Step 1: Start fresh**

```bash
bun run build && bun run start
```

**Step 2: Test checklist**

- [ ] Page loads without errors
- [ ] API key prompt appears (if no key in env/localStorage)
- [ ] Can enter and save API key
- [ ] Can drop CSV file
- [ ] Schema displays correctly
- [ ] Can ask "Show me total sales by region"
- [ ] SQL is generated and displayed
- [ ] Results appear in visualization
- [ ] Bar chart renders correctly
- [ ] Can ask "What's the profit trend over time?"
- [ ] Line chart renders correctly
- [ ] Error states display properly

**Step 3: Final commit**

```bash
git add -A
git commit -m "chore: complete MVP implementation"
```

---

## Summary

This plan creates a complete MVP with:

1. **Phase 1** (Tasks 1.1-1.5): Project setup with Next.js, dependencies, theming
2. **Phase 2** (Tasks 2.1-2.2): DuckDB-WASM integration for local SQL
3. **Phase 3** (Tasks 3.1-3.3): File upload with drag-and-drop
4. **Phase 4** (Tasks 4.1-4.2): OpenAI integration for SQL generation
5. **Phase 5** (Tasks 5.1-5.3): Chat interface components
6. **Phase 6** (Tasks 6.1-6.2): Data visualization with Recharts
7. **Phase 7** (Task 7.1): Full component integration
8. **Phase 8** (Tasks 8.1-8.5): Polish, error handling, API key management
9. **Phase 9** (Tasks 9.1-9.4): Build preparation and testing

Total: **23 tasks**, each with clear step-by-step instructions.
