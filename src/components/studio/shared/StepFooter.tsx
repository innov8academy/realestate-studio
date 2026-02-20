"use client";

import { useStudioStore } from "@/store/studioStore";

interface StepFooterProps {
  /** Label for the primary action button */
  primaryLabel?: string;
  /** Whether the primary button is disabled */
  primaryDisabled?: boolean;
  /** Handler for the primary action button */
  onPrimary?: () => void;
  /** Whether to show a loading state on the primary button */
  primaryLoading?: boolean;
  /** Show a secondary "Stop" button alongside primary */
  showStop?: boolean;
  /** Handler for the stop button */
  onStop?: () => void;
}

export function StepFooter({
  primaryLabel = "Next",
  primaryDisabled = false,
  onPrimary,
  primaryLoading = false,
  showStop = false,
  onStop,
}: StepFooterProps) {
  const goNext = useStudioStore((s) => s.goNext);

  const handlePrimary = () => {
    if (onPrimary) {
      onPrimary();
    } else {
      goNext();
    }
  };

  return (
    <div
      className="flex-shrink-0 px-4 py-3"
      style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
    >
      {showStop ? (
        <div className="flex gap-2">
          <button
            onClick={onStop}
            className="h-12 px-5 rounded-xl font-medium text-sm bg-red-600/80 text-white hover:bg-red-500 active:scale-[0.98] transition-all"
          >
            Stop
          </button>
          <button
            disabled
            className="flex-1 h-12 rounded-xl font-medium text-sm bg-neutral-800 text-neutral-500 cursor-not-allowed"
          >
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-neutral-400 border-t-neutral-700 rounded-full animate-spin" />
              Processing...
            </span>
          </button>
        </div>
      ) : (
        <button
          onClick={handlePrimary}
          disabled={primaryDisabled || primaryLoading}
          className={`w-full h-12 rounded-xl font-medium text-sm transition-all ${
            primaryDisabled || primaryLoading
              ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
              : "bg-white text-neutral-900 hover:bg-neutral-200 active:scale-[0.98]"
          }`}
        >
          {primaryLoading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-neutral-400 border-t-neutral-700 rounded-full animate-spin" />
              Processing...
            </span>
          ) : (
            primaryLabel
          )}
        </button>
      )}
    </div>
  );
}
