import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import { stat } from "fs/promises";
import path from "path";
import os from "os";
import { requireAuthIfConfigured, unauthorizedResponse, sanitizePath, invalidPathResponse } from "@/lib/security";

const execFileAsync = promisify(execFile);

export async function POST(req: NextRequest) {
    // Require authentication when ADMIN_PASSWORD is configured - this route executes OS commands
    if (!requireAuthIfConfigured(req)) {
        return unauthorizedResponse();
    }

    try {
        const body = await req.json();
        const { path: inputPath } = body;

        if (!inputPath || typeof inputPath !== "string") {
            return NextResponse.json(
                { success: false, error: "Path is required" },
                { status: 400 }
            );
        }

        // Sanitize the path to prevent traversal attacks
        const safePath = sanitizePath(inputPath);
        if (!safePath) {
            return invalidPathResponse();
        }

        // Validate that the path exists and is a directory
        try {
            const stats = await stat(safePath);
            if (!stats.isDirectory()) {
                return NextResponse.json(
                    { success: false, error: "Path is not a directory" },
                    { status: 400 }
                );
            }
        } catch {
            return NextResponse.json(
                { success: false, error: "Directory does not exist" },
                { status: 400 }
            );
        }

        let command = "";
        let args: string[] = [];
        const platform = os.platform();

        switch (platform) {
            case "darwin":
                command = "open";
                args = [safePath];
                break;
            case "win32":
                command = "explorer";
                args = [safePath];
                break;
            case "linux":
                command = "xdg-open";
                args = [safePath];
                break;
            default:
                // Fallback for other Unix-like systems
                command = "xdg-open";
                args = [safePath];
        }

        await execFileAsync(command, args);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to open directory:", error);
        return NextResponse.json(
            { success: false, error: "Failed to open directory" },
            { status: 500 }
        );
    }
}
