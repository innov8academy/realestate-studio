import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs/promises";
import * as path from "path";
import { isAuthed } from "../auth/route";
import { PROMPTS } from "@/lib/quickstart/templates";

export const dynamic = "force-dynamic";

const CONFIG_PATH = path.join(process.cwd(), "admin-config.json");

export interface AdminConfig {
  prompts: Record<string, string>;
  defaultProvider: "kie" | "gemini";
}

export async function readAdminConfig(): Promise<AdminConfig> {
  try {
    const raw = await fs.readFile(CONFIG_PATH, "utf-8");
    return JSON.parse(raw) as AdminConfig;
  } catch {
    return { prompts: {}, defaultProvider: "kie" };
  }
}

async function writeAdminConfig(config: AdminConfig) {
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}

export async function GET(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const saved = await readAdminConfig();

  // Merge code defaults with saved overrides
  const defaultPrompts = PROMPTS as Record<string, string>;
  const mergedPrompts: Record<string, string> = {};
  for (const key of Object.keys(defaultPrompts)) {
    mergedPrompts[key] = saved.prompts[key] ?? defaultPrompts[key];
  }

  // Model info (static from code + show current API mapping)
  const models = {
    mapStreet: {
      label: "Map & Street enhancement",
      kieModel: "gpt-image/1.5-image-to-image",
      geminiModel: "gemini-pro → gemini-2.5-flash-image",
    },
    building: {
      label: "Half & Full Building generation",
      kieModel: "gemini-pro → nano-banana-pro",
      geminiModel: "gemini-pro → gemini-3-pro-image-preview",
    },
    angles: {
      label: "Building angles (aerial, balcony, interior)",
      kieModel: "gemini-pro → nano-banana-pro",
      geminiModel: "gemini-pro → gemini-3-pro-image-preview",
    },
    video: {
      label: "All video clips",
      kieModel: "kling/v2-5-turbo-image-to-video-pro",
      geminiModel: "kling/v2.0-master-image-to-video",
    },
  };

  return NextResponse.json({
    prompts: mergedPrompts,
    defaultProvider: saved.defaultProvider,
    models,
    promptKeys: Object.keys(defaultPrompts),
  });
}

export async function POST(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as Partial<AdminConfig>;
  const current = await readAdminConfig();

  const updated: AdminConfig = {
    prompts: { ...current.prompts, ...(body.prompts ?? {}) },
    defaultProvider: body.defaultProvider ?? current.defaultProvider,
  };

  await writeAdminConfig(updated);
  return NextResponse.json({ ok: true });
}
