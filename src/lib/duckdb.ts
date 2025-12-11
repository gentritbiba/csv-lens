import * as duckdb from "@duckdb/duckdb-wasm";

let db: duckdb.AsyncDuckDB | null = null;
let connection: duckdb.AsyncDuckDBConnection | null = null;
let initPromise: Promise<duckdb.AsyncDuckDB> | null = null;

// Default query timeout in milliseconds (30 seconds)
const DEFAULT_QUERY_TIMEOUT = 30000;

/**
 * Sanitize identifier names (table names, column names) to prevent SQL injection.
 * Only allows alphanumeric characters, underscores, and spaces.
 * Escapes double quotes within the identifier.
 */
export function sanitizeIdentifier(identifier: string): string {
  // Remove any characters that aren't alphanumeric, underscore, space, or common punctuation
  const sanitized = identifier.replace(/[^\w\s\-_.]/g, "");
  // Escape any double quotes by doubling them (SQL standard)
  return sanitized.replace(/"/g, '""');
}

/**
 * Validate that a table name is safe to use
 */
function validateTableName(name: string): string {
  const sanitized = sanitizeIdentifier(name);
  if (!sanitized || sanitized.length === 0) {
    throw new Error("Invalid table name");
  }
  if (sanitized.length > 128) {
    throw new Error("Table name too long");
  }
  return sanitized;
}

/**
 * Sanitize filename for use in SQL queries
 */
function sanitizeFileName(name: string): string {
  // Only allow safe filename characters
  const sanitized = name.replace(/[^a-zA-Z0-9._\-]/g, "_");
  if (!sanitized || sanitized.length === 0) {
    throw new Error("Invalid filename");
  }
  return sanitized;
}

export async function initializeDuckDB(): Promise<duckdb.AsyncDuckDB> {
  // If already initialized, return existing instance
  if (db) return db;

  // If initialization is in progress, wait for it
  if (initPromise) return initPromise;

  // Start initialization
  initPromise = (async () => {
    let worker: Worker | null = null;
    let worker_url: string | null = null;

    try {
      const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
      const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);

      worker_url = URL.createObjectURL(
        new Blob([`importScripts("${bundle.mainWorker}");`], {
          type: "text/javascript",
        })
      );

      worker = new Worker(worker_url);
      const logger = new duckdb.ConsoleLogger();
      const newDb = new duckdb.AsyncDuckDB(logger, worker);

      await newDb.instantiate(bundle.mainModule, bundle.pthreadWorker);

      // Only set global db after successful instantiation
      db = newDb;

      // Clean up worker URL after successful init
      URL.revokeObjectURL(worker_url);

      return newDb;
    } catch (error) {
      // Clean up on failure
      if (worker_url) {
        URL.revokeObjectURL(worker_url);
      }
      if (worker) {
        worker.terminate();
      }
      // Reset init promise so we can retry
      initPromise = null;
      throw error;
    }
  })();

  return initPromise;
}

export async function getConnection(): Promise<duckdb.AsyncDuckDBConnection> {
  if (connection) return connection;

  const database = await initializeDuckDB();
  connection = await database.connect();

  return connection;
}

/**
 * Safely convert BigInt values to numbers or strings.
 * Values larger than MAX_SAFE_INTEGER are converted to strings to preserve precision.
 */
function convertBigInts(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "bigint") {
    // Preserve precision for large numbers by converting to string
    if (obj > Number.MAX_SAFE_INTEGER || obj < Number.MIN_SAFE_INTEGER) {
      return obj.toString();
    }
    return Number(obj);
  }
  if (Array.isArray(obj)) return obj.map(convertBigInts);
  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = convertBigInts(value);
    }
    return result;
  }
  return obj;
}

/**
 * Execute a SQL query with optional timeout
 */
export async function executeQuery(
  sql: string,
  timeoutMs: number = DEFAULT_QUERY_TIMEOUT
): Promise<unknown[]> {
  const conn = await getConnection();

  // Create a timeout promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Query timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  // Race between query and timeout
  const result = await Promise.race([conn.query(sql), timeoutPromise]);
  return result.toArray().map((row) => convertBigInts(row.toJSON()));
}

export async function loadCSVFromFile(
  file: File,
  tableName: string = "data"
): Promise<{ columns: string[]; sampleRows: unknown[]; rowCount: number }> {
  // Validate and sanitize inputs to prevent SQL injection
  const safeTableName = validateTableName(tableName);
  const safeFileName = sanitizeFileName(file.name);

  const database = await initializeDuckDB();
  const conn = await getConnection();

  try {
    // Register the file with DuckDB using sanitized name
    await database.registerFileHandle(
      safeFileName,
      file,
      duckdb.DuckDBDataProtocol.BROWSER_FILEREADER,
      true
    );

    // Create table from CSV with options to handle malformed data
    // Using parameterized-like approach with properly escaped identifiers
    await conn.query(`
      CREATE OR REPLACE TABLE "${safeTableName}" AS
      SELECT * FROM read_csv_auto('${safeFileName}', ignore_errors=true, quote='"')
    `);

    // Get column info
    const columnsResult = await conn.query(`DESCRIBE "${safeTableName}"`);
    const columns = columnsResult
      .toArray()
      .map((row) => row.toJSON().column_name as string);

    // Get sample rows (first 5)
    const sampleResult = await conn.query(`SELECT * FROM "${safeTableName}" LIMIT 5`);
    const sampleRows = sampleResult.toArray().map((row) => convertBigInts(row.toJSON()));

    // Get row count
    const countResult = await conn.query(
      `SELECT COUNT(*) as count FROM "${safeTableName}"`
    );
    const rowCount = Number(countResult.toArray()[0].toJSON().count);

    return { columns, sampleRows, rowCount };
  } catch (error) {
    // Clean up registered file on error
    try {
      await database.dropFile(safeFileName);
    } catch {
      // Ignore cleanup errors
    }
    throw error;
  }
}

export async function closeConnection(): Promise<void> {
  if (connection) {
    await connection.close();
    connection = null;
  }
}

/**
 * Fully reset the DuckDB instance, cleaning up all resources.
 * Use this when switching files or on error recovery.
 */
export async function resetDuckDB(): Promise<void> {
  try {
    if (connection) {
      await connection.close();
      connection = null;
    }
  } catch {
    connection = null;
  }

  try {
    if (db) {
      await db.terminate();
      db = null;
    }
  } catch {
    db = null;
  }

  initPromise = null;
}

/**
 * Load a CSV file as a new table without resetting existing tables
 */
export async function loadCSVAsTable(
  file: File,
  tableName: string
): Promise<{ columns: string[]; sampleRows: unknown[]; rowCount: number }> {
  const safeTableName = validateTableName(tableName);
  const safeFileName = sanitizeFileName(file.name);

  const database = await initializeDuckDB();
  const conn = await getConnection();

  try {
    await database.registerFileHandle(
      safeFileName,
      file,
      duckdb.DuckDBDataProtocol.BROWSER_FILEREADER,
      true
    );

    await conn.query(`
      CREATE OR REPLACE TABLE "${safeTableName}" AS
      SELECT * FROM read_csv_auto('${safeFileName}', ignore_errors=true, quote='"')
    `);

    const columnsResult = await conn.query(`DESCRIBE "${safeTableName}"`);
    const columns = columnsResult
      .toArray()
      .map((row) => row.toJSON().column_name as string);

    const sampleResult = await conn.query(`SELECT * FROM "${safeTableName}" LIMIT 5`);
    const sampleRows = sampleResult.toArray().map((row) => convertBigInts(row.toJSON()));

    const countResult = await conn.query(
      `SELECT COUNT(*) as count FROM "${safeTableName}"`
    );
    const rowCount = Number(countResult.toArray()[0].toJSON().count);

    return { columns, sampleRows, rowCount };
  } catch (error) {
    try {
      await database.dropFile(safeFileName);
    } catch {
      // Ignore cleanup errors
    }
    throw error;
  }
}

/**
 * Drop a specific table
 */
export async function dropTable(tableName: string): Promise<void> {
  const safeTableName = validateTableName(tableName);
  const conn = await getConnection();
  await conn.query(`DROP TABLE IF EXISTS "${safeTableName}"`);
}

/**
 * List all tables in the database
 */
export async function listTables(): Promise<string[]> {
  const conn = await getConnection();
  const result = await conn.query("SHOW TABLES");
  return result.toArray().map((row) => row.toJSON().name as string);
}

export { db, connection };
