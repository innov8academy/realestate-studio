import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import {
  applySpeedRamp,
  concatenateClips,
} from "@/lib/ffmpeg/stitch";

export const maxDuration = 600;

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const tempDir = path.join(os.tmpdir(), `stitch-${requestId}`);

  try {
    const formData = await req.formData();

    // Extract video files (video-0, video-1, ...)
    const videoEntries: { index: number; file: File }[] = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("video-") && value instanceof File) {
        const index = parseInt(key.replace("video-", ""), 10);
        if (!isNaN(index)) {
          videoEntries.push({ index, file: value });
        }
      }
    }

    videoEntries.sort((a, b) => a.index - b.index);
    const videoFiles = videoEntries.map((e) => e.file);

    if (videoFiles.length < 2) {
      return NextResponse.json(
        { error: "Need at least 2 video files" },
        { status: 400 }
      );
    }

    const loopCount = parseInt(formData.get("loopCount") as string, 10) || 1;
    const speedPreset = (formData.get("speedPreset") as string) || null;

    // Create temp directory
    fs.mkdirSync(tempDir, { recursive: true });

    // Write video blobs to temp files
    const inputPaths: string[] = [];
    for (let i = 0; i < videoFiles.length; i++) {
      const filePath = path.join(tempDir, `input_${i}.mp4`);
      const buffer = Buffer.from(await videoFiles[i].arrayBuffer());
      fs.writeFileSync(filePath, buffer);
      inputPaths.push(filePath);
    }

    // Build the full clip list with looping
    let clipPaths = [...inputPaths];
    if (loopCount > 1) {
      const base = [...inputPaths];
      clipPaths = [];
      for (let loop = 0; loop < loopCount; loop++) {
        for (let i = 0; i < base.length; i++) {
          // Copy each clip for each loop iteration so ffmpeg can read them independently
          const copyPath = path.join(tempDir, `loop${loop}_clip${i}.mp4`);
          fs.copyFileSync(base[i], copyPath);
          clipPaths.push(copyPath);
        }
      }
    }

    // Apply speed ramp per clip if preset selected
    let finalClipPaths = clipPaths;
    if (speedPreset) {
      finalClipPaths = [];
      for (let i = 0; i < clipPaths.length; i++) {
        const rampedPath = path.join(tempDir, `ramped_${i}.mp4`);
        await applySpeedRamp(clipPaths[i], rampedPath, speedPreset);
        finalClipPaths.push(rampedPath);
      }
    }

    // Concatenate all clips
    const outputPath = path.join(tempDir, "output.mp4");
    await concatenateClips(finalClipPaths, outputPath);

    // Read output and return as binary response
    const outputBuffer = fs.readFileSync(outputPath);

    return new Response(outputBuffer, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="stitched-${Date.now()}.mp4"`,
      },
    });
  } catch (error) {
    console.error("Stitch API error:", error);
    const message =
      error instanceof Error ? error.message : "Stitch failed";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    // Cleanup temp directory
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (cleanupErr) {
      console.warn("Failed to cleanup temp dir:", cleanupErr);
    }
  }
}
