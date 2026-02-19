import ffmpeg from "fluent-ffmpeg";
import { getEasingFunction } from "@/lib/easing-functions";
import fs from "fs";
import path from "path";

/**
 * Probe the duration of a video file in seconds.
 */
export function probeVideoDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      const duration = metadata.format.duration;
      if (typeof duration !== "number" || !Number.isFinite(duration)) {
        return reject(new Error(`Could not determine duration for ${filePath}`));
      }
      resolve(duration);
    });
  });
}

/**
 * Probe the frame rate of a video file.
 */
export function probeVideoFps(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      const videoStream = metadata.streams.find((s) => s.codec_type === "video");
      if (!videoStream) return reject(new Error("No video stream found"));

      // Parse r_frame_rate like "30/1" or "30000/1001"
      const rFrameRate = videoStream.r_frame_rate;
      if (rFrameRate) {
        const parts = rFrameRate.split("/");
        const num = parseInt(parts[0], 10);
        const den = parseInt(parts[1], 10) || 1;
        if (num > 0 && den > 0) {
          resolve(num / den);
          return;
        }
      }
      resolve(30); // fallback
    });
  });
}

/**
 * Compute an easing lookup table: for each output frame index,
 * returns the source frame index it should display.
 *
 * The easing function maps output progress [0,1] → source progress [0,1].
 * We use this to build a frame mapping: outputFrame → sourceFrame.
 */
export function computeEasingLUT(
  easingName: string,
  totalFrames: number
): number[] {
  if (totalFrames <= 0) return [];
  if (totalFrames === 1) return [0];

  const easingFn = getEasingFunction(easingName);
  const lut: number[] = [];

  for (let i = 0; i < totalFrames; i++) {
    const outputProgress = i / (totalFrames - 1);
    const sourceProgress = easingFn(outputProgress);
    const sourceFrame = Math.round(sourceProgress * (totalFrames - 1));
    lut.push(Math.max(0, Math.min(totalFrames - 1, sourceFrame)));
  }

  return lut;
}

// Simple presets that have closed-form inverse setpts expressions
const SIMPLE_SETPTS: Record<string, string> = {
  easeInQuad: "sqrt(PTS*TB/DURATION)*DURATION/TB",
  easeOutQuad: "(1-sqrt(1-PTS*TB/DURATION))*DURATION/TB",
  easeInOutSine: "acos(1-2*PTS*TB/DURATION)/3.14159265*DURATION/TB",
};

/**
 * Apply a speed ramp to a video clip using ffmpeg.
 *
 * For simple presets (easeInQuad, easeOutQuad, easeInOutSine): uses setpts filter.
 * For complex presets: extracts frames, builds LUT-based reassembly, re-encodes.
 */
export async function applySpeedRamp(
  inputPath: string,
  outputPath: string,
  easingName: string
): Promise<void> {
  const setptsExpr = SIMPLE_SETPTS[easingName];

  if (setptsExpr) {
    // Simple preset: single setpts filter
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .videoFilter(`setpts='${setptsExpr}'`)
        .outputOptions(["-an"]) // drop audio for clips
        .output(outputPath)
        .on("end", () => resolve())
        .on("error", (err) => reject(err))
        .run();
    });
  }

  // Complex preset: frame extraction + LUT reassembly
  const [duration, fps] = await Promise.all([
    probeVideoDuration(inputPath),
    probeVideoFps(inputPath),
  ]);

  const totalFrames = Math.round(duration * fps);
  if (totalFrames <= 1) {
    // Just copy
    await copyFile(inputPath, outputPath);
    return;
  }

  const lut = computeEasingLUT(easingName, totalFrames);

  // Extract all frames to a temp directory
  const framesDir = outputPath + "_frames";
  fs.mkdirSync(framesDir, { recursive: true });

  try {
    // Extract frames
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions(["-vsync", "0"])
        .output(path.join(framesDir, "frame_%06d.png"))
        .on("end", () => resolve())
        .on("error", (err) => reject(err))
        .run();
    });

    // Build a concat file based on the LUT
    // Each line maps an output frame to its source frame
    const concatLines: string[] = [];
    const frameDuration = 1 / fps;

    for (const sourceFrame of lut) {
      const frameFile = path.join(
        framesDir,
        `frame_${String(sourceFrame + 1).padStart(6, "0")}.png`
      );
      concatLines.push(`file '${frameFile.replace(/\\/g, "/")}'`);
      concatLines.push(`duration ${frameDuration}`);
    }

    const concatFile = outputPath + "_concat.txt";
    fs.writeFileSync(concatFile, concatLines.join("\n"), "utf-8");

    // Reassemble with concat demuxer
    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(concatFile)
        .inputOptions(["-f", "concat", "-safe", "0"])
        .outputOptions(["-c:v", "libx264", "-preset", "fast", "-crf", "18", "-pix_fmt", "yuv420p"])
        .output(outputPath)
        .on("end", () => resolve())
        .on("error", (err) => reject(err))
        .run();
    });

    // Cleanup
    fs.unlinkSync(concatFile);
  } finally {
    // Remove frames directory
    fs.rmSync(framesDir, { recursive: true, force: true });
  }
}

/**
 * Concatenate multiple video clips using the ffmpeg concat demuxer.
 * All clips should have the same codec/resolution for best results.
 */
export async function concatenateClips(
  inputPaths: string[],
  outputPath: string
): Promise<void> {
  if (inputPaths.length === 0) {
    throw new Error("No input paths provided for concatenation");
  }

  if (inputPaths.length === 1) {
    await copyFile(inputPaths[0], outputPath);
    return;
  }

  // First, re-encode all inputs to a common format to ensure compatibility
  const normalizedDir = outputPath + "_normalized";
  fs.mkdirSync(normalizedDir, { recursive: true });

  const normalizedPaths: string[] = [];

  try {
    for (let i = 0; i < inputPaths.length; i++) {
      const normalizedPath = path.join(normalizedDir, `clip_${i}.ts`);
      normalizedPaths.push(normalizedPath);

      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPaths[i])
          .outputOptions([
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "18",
            "-pix_fmt", "yuv420p",
            "-an",
            "-f", "mpegts",
          ])
          .output(normalizedPath)
          .on("end", () => resolve())
          .on("error", (err) => reject(err))
          .run();
      });
    }

    // Build concat list
    const concatFile = outputPath + "_list.txt";
    const concatContent = normalizedPaths
      .map((p) => `file '${p.replace(/\\/g, "/")}'`)
      .join("\n");
    fs.writeFileSync(concatFile, concatContent, "utf-8");

    // Concatenate
    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(concatFile)
        .inputOptions(["-f", "concat", "-safe", "0"])
        .outputOptions([
          "-c:v", "libx264",
          "-preset", "fast",
          "-crf", "18",
          "-pix_fmt", "yuv420p",
          "-movflags", "+faststart",
        ])
        .output(outputPath)
        .on("end", () => resolve())
        .on("error", (err) => reject(err))
        .run();
    });

    // Cleanup concat file
    fs.unlinkSync(concatFile);
  } finally {
    // Cleanup normalized directory
    fs.rmSync(normalizedDir, { recursive: true, force: true });
  }
}

function copyFile(src: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const rs = fs.createReadStream(src);
    const ws = fs.createWriteStream(dest);
    rs.on("error", reject);
    ws.on("error", reject);
    ws.on("finish", resolve);
    rs.pipe(ws);
  });
}
