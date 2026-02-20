import { NextResponse } from "next/server";
import { PROMPTS } from "@/lib/quickstart/templates";
import { readAdminConfig } from "@/app/api/admin/config/route";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = await readAdminConfig();
  const defaults = PROMPTS as Record<string, string>;

  // Merge: admin overrides take precedence over code defaults
  const effective: Record<string, string> = {};
  for (const key of Object.keys(defaults)) {
    effective[key] = config.prompts[key] ?? defaults[key];
  }

  return NextResponse.json(effective);
}
