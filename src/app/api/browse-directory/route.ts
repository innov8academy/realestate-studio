import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { requireAuthIfConfigured, unauthorizedResponse } from "@/lib/security";

const execAsync = promisify(exec);

/**
 * Normalize a path returned by native directory pickers.
 * On macOS, osascript can return hostname-prefixed paths for network volumes
 * (e.g. "HOSTNAME/Users/..." instead of "/Users/..."). This strips the
 * hostname prefix and cleans up trailing slashes.
 */
export function normalizeSelectedPath(selectedPath: string, platform: string): string {
  // On macOS/Linux, ensure the path is absolute.
  // osascript can return hostname-prefixed paths for network volumes
  // e.g. "AT-ALGKG9VR/Users/guy/Desktop" instead of "/Users/guy/Desktop"
  if ((platform === "darwin" || platform === "linux") && !selectedPath.startsWith("/")) {
    const firstSlash = selectedPath.indexOf("/");
    if (firstSlash >= 0) {
      selectedPath = selectedPath.substring(firstSlash);
    }
  }

  // Remove trailing slash/backslash (except root paths like "/" or "C:\")
  if (selectedPath.length > 1 && (selectedPath.endsWith("/") || selectedPath.endsWith("\\"))) {
    if (!(platform === "win32" && /^[A-Za-z]:[\\\/]$/.test(selectedPath))) {
      selectedPath = selectedPath.slice(0, -1);
    }
  }

  return selectedPath;
}

// GET: Open native directory picker and return the selected path
export async function GET(req: NextRequest) {
  // Require authentication when ADMIN_PASSWORD is configured - this route opens OS-level dialogs
  if (!requireAuthIfConfigured(req)) {
    return unauthorizedResponse();
  }

  const platform = process.platform;

  try {
    let selectedPath: string | null = null;

    if (platform === "darwin") {
      // macOS: Use osascript to open folder picker
      const { stdout } = await execAsync(
        `osascript -e 'set folderPath to POSIX path of (choose folder with prompt "Select a folder to save workflows")' -e 'return folderPath'`
      );
      selectedPath = stdout.trim();
    } else if (platform === "win32") {
      // Windows: Use FolderBrowserDialog via PowerShell (STA thread required)
      // Write script to temp file to avoid escaping issues
      const psScript = `
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = "Select a folder to save workflows"
$dialog.ShowNewFolderButton = $true
$dialog.RootFolder = [System.Environment+SpecialFolder]::MyComputer
$result = $dialog.ShowDialog()
if ($result -eq [System.Windows.Forms.DialogResult]::OK) {
    Write-Output $dialog.SelectedPath
}
`;

      const tempFile = join(tmpdir(), `browse-folder-${Date.now()}.ps1`);
      try {
        await writeFile(tempFile, psScript, "utf-8");
        const { stdout } = await execAsync(
          `powershell -NoProfile -STA -ExecutionPolicy Bypass -File "${tempFile}"`,
          { timeout: 120000 }
        );
        selectedPath = stdout.trim();
      } finally {
        // Clean up temp file
        try { await unlink(tempFile); } catch { /* ignore */ }
      }
    } else if (platform === "linux") {
      // Linux: Try zenity (common on GNOME) or kdialog (KDE)
      try {
        const { stdout } = await execAsync(
          `zenity --file-selection --directory --title="Select a folder to save workflows" 2>/dev/null`
        );
        selectedPath = stdout.trim();
      } catch {
        // Try kdialog as fallback
        try {
          const { stdout } = await execAsync(
            `kdialog --getexistingdirectory ~ --title "Select a folder to save workflows"`
          );
          selectedPath = stdout.trim();
        } catch {
          return NextResponse.json(
            {
              success: false,
              error:
                "No supported dialog tool found. Please install zenity or kdialog.",
            },
            { status: 500 }
          );
        }
      }
    } else {
      return NextResponse.json(
        { success: false, error: "Unsupported platform" },
        { status: 500 }
      );
    }

    // User cancelled the dialog
    if (!selectedPath) {
      return NextResponse.json({
        success: true,
        cancelled: true,
        path: null,
      });
    }

    selectedPath = normalizeSelectedPath(selectedPath, platform);

    return NextResponse.json({
      success: true,
      cancelled: false,
      path: selectedPath,
    });
  } catch (error) {
    // Check if user cancelled (osascript returns error code when cancelled)
    if (
      error instanceof Error &&
      (error.message.includes("User canceled") ||
        error.message.includes("-128"))
    ) {
      return NextResponse.json({
        success: true,
        cancelled: true,
        path: null,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to open directory picker",
      },
      { status: 500 }
    );
  }
}
