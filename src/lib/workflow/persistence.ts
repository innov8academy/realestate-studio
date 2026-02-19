/**
 * Main Workflow page persistence via IndexedDB.
 *
 * Mirrors the Studio persistence pattern (src/lib/studio/persistence.ts)
 * but stores the main workflow page state separately.
 *
 * Uses IndexedDB because workflows contain base64-encoded images
 * that exceed localStorage's ~5 MB limit.
 */

const DB_NAME = "node-banana-workflow";
const DB_VERSION = 1;
const STORE_NAME = "state";

// ── helpers ──────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("indexedDB not available"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGet<T>(key: string): Promise<T | null> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => reject(req.error);
      })
  );
}

function idbSet(key: string, value: unknown): Promise<void> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(value, key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      })
  );
}

function idbDelete(key: string): Promise<void> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      })
  );
}

// ── public API ───────────────────────────────────────────────────

export interface WorkflowSnapshot {
  workflow: {
    version: 1;
    name: string;
    nodes: unknown[];
    edges: unknown[];
    edgeStyle: string;
    groups?: Record<string, unknown>;
  };
  savedAt: number; // Date.now()
}

/**
 * Save the current workflow state to IndexedDB.
 */
export async function saveWorkflowState(snapshot: WorkflowSnapshot): Promise<void> {
  try {
    await idbSet("workflow-snapshot", snapshot);
  } catch (err) {
    console.warn("[workflow] Failed to save state:", err);
  }
}

/**
 * Load the previously saved workflow state from IndexedDB.
 * Returns null if nothing was saved or data is corrupt.
 */
export async function loadWorkflowState(): Promise<WorkflowSnapshot | null> {
  try {
    const data = await idbGet<WorkflowSnapshot>("workflow-snapshot");
    if (data && data.workflow && Array.isArray(data.workflow.nodes)) {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Clear saved workflow state (e.g. when user wants a fresh start).
 */
export async function clearWorkflowState(): Promise<void> {
  try {
    await idbDelete("workflow-snapshot");
  } catch {
    // ignore
  }
}
