"use client";

import { useState, useCallback } from "react";
import { useStudioStore } from "@/store/studioStore";
import { useWorkflowStore, type WorkflowFile } from "@/store/workflowStore";
import { STUDIO_STEPS } from "@/lib/studio/nodeMap";
import { clearStudioState } from "@/lib/studio/persistence";
import { getPresetTemplate } from "@/lib/quickstart/templates";

export function StepHeader() {
  const currentStep = useStudioStore((s) => s.currentStep);
  const totalSteps = useStudioStore((s) => s.totalSteps);
  const goBack = useStudioStore((s) => s.goBack);
  const reset = useStudioStore((s) => s.reset);
  const setInitialized = useStudioStore((s) => s.setInitialized);
  const loadWorkflow = useWorkflowStore((s) => s.loadWorkflow);
  const stopWorkflow = useWorkflowStore((s) => s.stopWorkflow);
  const isRunning = useWorkflowStore((s) => s.isRunning);
  const step = STUDIO_STEPS[currentStep];

  const [showConfirm, setShowConfirm] = useState(false);

  const handleStartOver = useCallback(async () => {
    setShowConfirm(false);
    if (isRunning) stopWorkflow();
    await clearStudioState();
    reset();
    const workflow = getPresetTemplate("real-estate-map-animation", "minimal");
    await loadWorkflow(workflow as WorkflowFile);
    setInitialized(true);
  }, [isRunning, stopWorkflow, reset, loadWorkflow, setInitialized]);

  return (
    <div className="flex-shrink-0 px-4 pt-3 pb-2">
      {/* Top row: back button + step counter + start over */}
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
        {/* Start Over button — only show after step 0 */}
        {currentStep > 0 ? (
          <button
            onClick={() => setShowConfirm(true)}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-800 transition-colors"
            title="Start Over"
          >
            <svg
              className="w-4 h-4 text-neutral-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h4.5M20 20v-5h-4.5M4.5 9A8 8 0 0119.5 15M19.5 15A8 8 0 014.5 9"
              />
            </svg>
          </button>
        ) : (
          <div className="w-8" />
        )}
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

      {/* Confirmation dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-6">
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-5 max-w-xs w-full flex flex-col gap-4">
            <h2 className="text-base font-semibold text-white text-center">
              Start Over?
            </h2>
            <p className="text-sm text-neutral-400 text-center">
              This will clear all your progress and generated images/videos. You cannot undo this.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 h-10 rounded-xl text-sm font-medium bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStartOver}
                className="flex-1 h-10 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-500 transition-colors"
              >
                Start Over
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
