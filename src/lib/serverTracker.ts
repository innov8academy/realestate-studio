/**
 * Server-side generation tracker.
 * Writes one log session file per generate request to the /logs directory.
 * Files are compatible with the format expected by /api/admin/analytics.
 */

import * as fs from "fs/promises";
import * as path from "path";

const LOGS_DIR = path.join(process.cwd(), "logs");

interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "error";
  category: string;
  message: string;
  context?: Record<string, unknown>;
}

interface Session {
  sessionId: string;
  startTime: string;
  endTime: string;
  entries: LogEntry[];
}

/** Ensure the logs directory exists (no-op if already present). */
async function ensureLogsDir() {
  try {
    await fs.mkdir(LOGS_DIR, { recursive: true });
  } catch {
    // ignore
  }
}

/** Rotate old log files — keep only the 50 most recent. */
async function rotateLogs() {
  try {
    const files = (await fs.readdir(LOGS_DIR))
      .filter((f) => f.endsWith(".json"))
      .sort();
    if (files.length > 50) {
      const toDelete = files.slice(0, files.length - 50);
      await Promise.all(toDelete.map((f) => fs.unlink(path.join(LOGS_DIR, f))));
    }
  } catch {
    // ignore rotation errors
  }
}

/**
 * Record a single generation request as a session file.
 * Called fire-and-forget (not awaited) from the generate route.
 */
export async function trackGeneration(opts: {
  requestId: string;
  provider: string;
  model: string;
  success: boolean;
  durationMs: number;
  error?: string;
}) {
  try {
    await ensureLogsDir();

    const now = new Date().toISOString();
    const sessionId = `server-${opts.requestId}`;

    const startEntry: LogEntry = {
      timestamp: now,
      level: "info",
      category: "node.execution",
      message: `Calling ${opts.provider} model: ${opts.model}`,
      context: { provider: opts.provider, model: opts.model },
    };

    const resultEntry: LogEntry = {
      timestamp: now,
      level: opts.success ? "info" : "error",
      category: "node.execution",
      message: opts.success
        ? `Generation completed successfully in ${opts.durationMs}ms`
        : `Generation failed: ${opts.error || "unknown error"}`,
      context: {
        provider: opts.provider,
        model: opts.model,
        durationMs: opts.durationMs,
        ...(opts.error ? { error: opts.error } : {}),
      },
    };

    const session: Session = {
      sessionId,
      startTime: now,
      endTime: now,
      entries: [startEntry, resultEntry],
    };

    const filename = `session-${sessionId}-${Date.now()}.json`;
    await fs.writeFile(
      path.join(LOGS_DIR, filename),
      JSON.stringify(session, null, 2),
      "utf-8"
    );

    // Async rotation — don't block the response
    rotateLogs().catch(() => {});
  } catch {
    // Never throw — tracking failures must not affect the main request
  }
}
