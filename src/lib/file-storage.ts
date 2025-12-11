// src/lib/file-storage.ts
// IndexedDB-based storage for persisting uploaded CSV files across sessions

const DB_NAME = "ai-data-analyzer-files";
const DB_VERSION = 1;
const STORE_NAME = "files";

export interface StoredFile {
  id: string;
  name: string;
  size: number;
  type: string;
  content: ArrayBuffer;
  storedAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Open or create the IndexedDB database
 */
function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      dbPromise = null;
      reject(new Error("Failed to open IndexedDB"));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object store for files
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("name", "name", { unique: false });
        store.createIndex("storedAt", "storedAt", { unique: false });
      }
    };
  });

  return dbPromise;
}

/**
 * Store a file in IndexedDB
 */
export async function storeFile(file: File, id: string): Promise<void> {
  const db = await openDatabase();
  const content = await file.arrayBuffer();

  const storedFile: StoredFile = {
    id,
    name: file.name,
    size: file.size,
    type: file.type || "text/csv",
    content,
    storedAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(storedFile);

    request.onerror = () => {
      console.error("[file-storage] Failed to store file:", request.error);
      reject(new Error("Failed to store file"));
    };
    request.onsuccess = () => {
      resolve();
    };
  });
}

/**
 * Retrieve a file from IndexedDB
 */
export async function getFile(id: string): Promise<StoredFile | null> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onerror = () => {
      console.error("[file-storage] Failed to retrieve file:", request.error);
      reject(new Error("Failed to retrieve file"));
    };
    request.onsuccess = () => {
      resolve(request.result || null);
    };
  });
}

/**
 * Get all stored files (metadata only, without content)
 */
export async function getAllFileMetadata(): Promise<Omit<StoredFile, "content">[]> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onerror = () => reject(new Error("Failed to retrieve files"));
    request.onsuccess = () => {
      // Strip content from results to reduce memory usage
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const files = (request.result as StoredFile[]).map(({ content: _, ...meta }) => meta);
      resolve(files);
    };
  });
}

/**
 * Delete a file from IndexedDB
 */
export async function deleteFile(id: string): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onerror = () => reject(new Error("Failed to delete file"));
    request.onsuccess = () => resolve();
  });
}

/**
 * Clear all stored files
 */
export async function clearAllFiles(): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onerror = () => reject(new Error("Failed to clear files"));
    request.onsuccess = () => resolve();
  });
}

/**
 * Convert a StoredFile back to a File object for DuckDB loading
 */
export function storedFileToFile(stored: StoredFile): File {
  const blob = new Blob([stored.content], { type: stored.type });
  return new File([blob], stored.name, {
    type: stored.type,
    lastModified: stored.storedAt,
  });
}

/**
 * Check if IndexedDB is available
 */
export function isIndexedDBAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}
