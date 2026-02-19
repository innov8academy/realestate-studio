/**
 * Studio Wizard persistence via IndexedDB.
 *
 * We use IndexedDB instead of localStorage because the workflow
 * contains base64-encoded images that easily exceed localStorage's
 * ~5 MB limit.  IndexedDB can handle hundreds of MB.
 *
 * Stored data:
 *  - "workflow"   → the full WorkflowFile (nodes, edges, groups, etc.)
 *  - "wizardStep" → the current step index (number)
 */

const DB_NAME = "node-banana-studio";
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

export interface StudioSnapshot {
  workflow: {
    version: 1;
    name: string;
    nodes: unknown[];
    edges: unknown[];
    edgeStyle: string;
    groups?: Record<string, unknown>;
  };
  wizardStep: number;
  plotSquareMeters?: number | null;
  aspectRatio?: string;
  videoDuration?: string;
  buildingReferenceImage?: string | null;
  buildingDescription?: string;
  savedAt: number; // Date.now()
}

/**
 * Save the current studio state to IndexedDB.
 */
export async function saveStudioState(snapshot: StudioSnapshot): Promise<void> {
  try {
    await idbSet("studio-snapshot", snapshot);
  } catch (err) {
    console.warn("[studio] Failed to save state:", err);
  }
}

/**
 * Load the previously saved studio state from IndexedDB.
 * Returns null if nothing was saved or data is corrupt.
 */
export async function loadStudioState(): Promise<StudioSnapshot | null> {
  try {
    const data = await idbGet<StudioSnapshot>("studio-snapshot");
    if (data && data.workflow && Array.isArray(data.workflow.nodes)) {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Clear saved studio state (e.g. when user starts a new animation).
 */
export async function clearStudioState(): Promise<void> {
  try {
    await idbDelete("studio-snapshot");
  } catch {
    // ignore
  }
}
