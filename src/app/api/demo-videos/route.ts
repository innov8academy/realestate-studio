import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Demo folder is at the repo root (one level above the Next.js project)
const DEMO_DIR = fs.existsSync(path.join(process.cwd(), "demo"))
  ? path.join(process.cwd(), "demo")
  : path.join(process.cwd(), "..", "demo");

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get("file");

  // List mode: return all mp4 files in demo/
  if (!filename) {
    try {
      const files = fs.readdirSync(DEMO_DIR).filter((f) => f.endsWith(".mp4"));
      return NextResponse.json({ files });
    } catch {
      return NextResponse.json({ files: [], error: "Demo folder not found" });
    }
  }

  // Serve a specific file
  const filePath = path.join(DEMO_DIR, path.basename(filename));
  if (!fs.existsSync(filePath)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const buffer = fs.readFileSync(filePath);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": buffer.length.toString(),
    },
  });
}
