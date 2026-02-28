"use client";

import { useCallback, useState } from "react";

interface DownloadButtonProps {
  dataUrl: string | null | undefined;
  filename: string;
  label?: string;
  className?: string;
}

/**
 * Convert a data URL to a Blob using atob + Uint8Array.
 * This avoids the memory spike Safari iOS causes when decoding
 * a large base64 data URL inline in <a href>.
 */
function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] || "application/octet-stream";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

export function DownloadButton({
  dataUrl,
  filename,
  label = "Download",
  className,
}: DownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = useCallback(async () => {
    if (!dataUrl || isDownloading) return;
    setIsDownloading(true);

    try {
      let blobUrl: string;

      if (dataUrl.startsWith("data:")) {
        // Data URL → convert to blob to avoid Safari memory spike
        try {
          const blob = dataUrlToBlob(dataUrl);
          blobUrl = URL.createObjectURL(blob);
        } catch {
          // Fallback: direct data URL download
          const a = document.createElement("a");
          a.href = dataUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          return;
        }
      } else {
        // HTTP URL (video outputs from fal.ai/kie.ai) → fetch as blob
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        blobUrl = URL.createObjectURL(blob);
      }

      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed:", error);
      // Last resort fallback: try direct download
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setIsDownloading(false);
    }
  }, [dataUrl, filename, isDownloading]);

  if (!dataUrl) return null;

  return (
    <button
      onClick={handleDownload}
      disabled={isDownloading}
      className={
        className ||
        "flex items-center gap-1.5 px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-white text-[11px] font-medium rounded-lg transition-colors active:scale-[0.97]"
      }
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
      {isDownloading ? "Downloading..." : label}
    </button>
  );
}
