"use client";

import { useStudioStore } from "@/store/studioStore";
import { STUDIO_STEPS } from "@/lib/studio/nodeMap";

export function StepHeader() {
  const currentStep = useStudioStore((s) => s.currentStep);
  const totalSteps = useStudioStore((s) => s.totalSteps);
  const goBack = useStudioStore((s) => s.goBack);
  const step = STUDIO_STEPS[currentStep];

  return (
    <div className="flex-shrink-0 px-4 pt-3 pb-2">
      {/* Top row: back button + step counter */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={goBack}
          className={`w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-800 transition-colors ${
            currentStep === 0 ? "invisible" : ""
          }`}
        >
          <svg
            className="w-5 h-5 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <span className="text-xs text-neutral-500">
          {currentStep + 1} of {totalSteps}
        </span>
        <div className="w-8" /> {/* Spacer for alignment */}
      </div>

      {/* Progress dots */}
      <div className="flex items-center justify-center gap-1.5 mb-3">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`h-1 rounded-full transition-all duration-300 ${
              i === currentStep
                ? "w-6 bg-white"
                : i < currentStep
                ? "w-3 bg-white/40"
                : "w-3 bg-neutral-700"
            }`}
          />
        ))}
      </div>

      {/* Step title and description */}
      <div className="text-center">
        <h1 className="text-lg font-semibold text-white">{step.title}</h1>
        <p className="text-xs text-neutral-400 mt-0.5">{step.description}</p>
      </div>
    </div>
  );
}
