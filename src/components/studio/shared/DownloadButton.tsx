"use client";

import { useCallback } from "react";

interface DownloadButtonProps {
  dataUrl: string | null | undefined;
  filename: string;
  label?: string;
  className?: string;
}

export function DownloadButton({
  dataUrl,
  filename,
  label = "Download",
  className,
}: DownloadButtonProps) {
  const handleDownload = useCallback(() => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [dataUrl, filename]);

  if (!dataUrl) return null;

  return (
    <button
      onClick={handleDownload}
      className={
        className ||
        "flex items-center gap-1.5 px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-white text-[11px] font-medium rounded-lg transition-colors active:scale-[0.97]"
      }
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
      {label}
    </button>
  );
}
