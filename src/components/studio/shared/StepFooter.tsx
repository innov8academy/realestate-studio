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
}

export function StepFooter({
  primaryLabel = "Next",
  primaryDisabled = false,
  onPrimary,
  primaryLoading = false,
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
    </div>
  );
}
