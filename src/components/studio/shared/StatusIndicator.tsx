"use client";

import type { NodeStatus } from "@/types";

interface StatusIndicatorProps {
  status: NodeStatus;
  error?: string | null;
  onRetry?: () => void;
  label?: string;
}

export function StatusIndicator({
  status,
  error,
  onRetry,
  label,
}: StatusIndicatorProps) {
  if (status === "idle") {
    return (
      <div className="flex items-center gap-2 text-xs text-neutral-500">
        <div className="w-2 h-2 rounded-full bg-neutral-600" />
        <span>{label || "Waiting"}</span>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="flex items-center gap-2 text-xs text-blue-400">
        <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
        <span>{label || "Generating..."}</span>
      </div>
    );
  }

  if (status === "complete") {
    return (
      <div className="flex items-center gap-2 text-xs text-emerald-400">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <span>{label || "Complete"}</span>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs text-red-400">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span className="max-w-[200px] truncate">{error || "Failed"}</span>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-xs text-blue-400 hover:text-blue-300 underline"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  return null;
}
