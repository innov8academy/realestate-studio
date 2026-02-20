import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs/promises";
import * as path from "path";
import { isAuthed } from "../auth/route";

export const dynamic = "force-dynamic";

interface LogEntry {
  timestamp: string;
  level: string;
  category: string;
  message: string;
  context?: Record<string, unknown>;
}

interface Session {
  sessionId: string;
  startTime: string;
  endTime?: string;
  entries: LogEntry[];
}

export async function GET(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const logsDir = path.join(process.cwd(), "logs");

  let files: string[] = [];
  try {
    files = (await fs.readdir(logsDir))
      .filter((f) => f.endsWith(".json"))
      .sort()
      .reverse()
      .slice(0, 50); // last 50 sessions
  } catch {
    return NextResponse.json({ sessions: [], stats: emptyStats() });
  }

  const sessions: Session[] = [];
  for (const file of files) {
    try {
      const raw = await fs.readFile(path.join(logsDir, file), "utf-8");
      sessions.push(JSON.parse(raw));
    } catch {
      // skip corrupt files
    }
  }

  // Compute stats
  let totalGenerations = 0;
  let successes = 0;
  let failures = 0;
  const modelCounts: Record<string, number> = {};
  const dailyCounts: Record<string, number> = {};
  const recentErrors: { time: string; model: string; error: string }[] = [];

  for (const session of sessions) {
    const day = session.startTime?.slice(0, 10) ?? "unknown";
    dailyCounts[day] = (dailyCounts[day] ?? 0) + 1;

    for (const entry of session.entries ?? []) {
      const cat = entry.category ?? "";
      const msg = entry.message ?? "";

      if (cat === "node.execution") {
        if (msg.includes("Calling kie") || msg.includes("Calling gemini") || msg.includes("Calling fal")) {
          totalGenerations++;
          const model = (entry.context?.model as string) || (entry.context?.provider as string) || "unknown";
          modelCounts[model] = (modelCounts[model] ?? 0) + 1;
        }
        if (msg.toLowerCase().includes("completed successfully") || msg.toLowerCase().includes("success")) {
          successes++;
        }
        if (msg.toLowerCase().includes("failed") || msg.toLowerCase().includes("error") || entry.level === "error") {
          failures++;
          if (recentErrors.length < 20) {
            recentErrors.push({
              time: entry.timestamp,
              model: (entry.context?.model as string) ?? (entry.context?.provider as string) ?? "",
              error: entry.context?.error as string ?? msg,
            });
          }
        }
      }
    }
  }

  return NextResponse.json({
    stats: {
      totalSessions: sessions.length,
      totalGenerations,
      successes,
      failures,
      modelCounts,
      dailyCounts,
    },
    recentErrors,
    sessions: sessions.slice(0, 10).map((s) => ({
      id: s.sessionId,
      start: s.startTime,
      end: s.endTime,
      entries: s.entries?.length ?? 0,
      hasError: s.entries?.some((e) => e.level === "error") ?? false,
    })),
  });
}

function emptyStats() {
  return { totalSessions: 0, totalGenerations: 0, successes: 0, failures: 0, modelCounts: {}, dailyCounts: {} };
}
