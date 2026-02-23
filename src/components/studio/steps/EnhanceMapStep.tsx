"use client";

import { useCallback, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useWorkflowStore } from "@/store/workflowStore";
import { useStudioStore } from "@/store/studioStore";
import { STUDIO_NODES } from "@/lib/studio/nodeMap";
import { PROMPTS } from "@/lib/quickstart/templates";
import { StatusIndicator } from "../shared/StatusIndicator";
import { AdvancedPromptSection } from "../shared/AdvancedPromptSection";
import { DownloadButton } from "../shared/DownloadButton";
import { LoadingPhrase } from "../shared/LoadingPhrase";
import { ModelSelector } from "../shared/ModelSelector";
import { getAspectRatiosForModel, getSelectedModel } from "@/lib/studio/modelConfig";
import type { GenerateImageNodeData } from "@/types";

function ImageViewer({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  // Use portal to render outside the carousel's transform context
  // (CSS transform creates a new containing block that clips position:fixed)
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/70 hover:text-white z-10"
      >
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <img
        src={src}
        alt={alt}
        className="max-w-full max-h-full object-contain rounded-lg"
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body
  );
}

export function EnhanceMapStep() {
  const nodes = useWorkflowStore((s) => s.nodes);
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
  const regenerateNode = useWorkflowStore((s) => s.regenerateNode);
  const isRunning = useWorkflowStore((s) => s.isRunning);
  const plotSquareMeters = useStudioStore((s) => s.plotSquareMeters);
  const aspectRatio = useStudioStore((s) => s.aspectRatio);
  const setAspectRatio = useStudioStore((s) => s.setAspectRatio);
  const currentModel = useStudioStore((s) => s.stepModel["2"] ?? "gpt-1.5");
  const setStepModel = useStudioStore((s) => s.setStepModel);

  const aspectRatios = getAspectRatiosForModel(currentModel);

  const [isGenerating, setIsGenerating] = useState(false);
  const [viewerImage, setViewerImage] = useState<{ src: string; alt: string } | null>(null);

  // Frame 1: Clean map (no text)
  const frame1Data = nodes.find((n) => n.id === STUDIO_NODES.generateMap)
    ?.data as GenerateImageNodeData | undefined;
  const frame1Image = frame1Data?.outputImage || null;
  const frame1Status = frame1Data?.status || "idle";

  // Frame 2: Map with area text
  const frame2Data = nodes.find((n) => n.id === STUDIO_NODES.generateMapFrame2)
    ?.data as GenerateImageNodeData | undefined;
  const frame2Image = frame2Data?.outputImage || null;
  const frame2Status = frame2Data?.status || "idle";

  const hasSqm = plotSquareMeters !== null && plotSquareMeters > 0;

  // Build the Frame 2 prompt: substitute {AREA} if we have square meters,
  // otherwise use the raw template prompt so the user can see/edit it
  const frame2PromptText = hasSqm
    ? PROMPTS.mapEnhanceWithArea.replace("{AREA}", `${plotSquareMeters} sq.m`)
    : PROMPTS.mapEnhanceWithArea;

  // Read the current Frame 1 prompt string (stable selector).
  const frame1CurrentPrompt = useWorkflowStore((s) => {
    const node = s.nodes.find((n) => n.id === STUDIO_NODES.promptMapFrame1);
    return (node?.data as { prompt?: string })?.prompt || "";
  });

  // Read just the current Frame 2 prompt string (stable selector — won't change
  // when unrelated nodes update, avoiding infinite re-render loops).
  const frame2CurrentPrompt = useWorkflowStore((s) => {
    const node = s.nodes.find((n) => n.id === STUDIO_NODES.promptMapFrame2);
    return (node?.data as { prompt?: string })?.prompt || "";
  });

  // Populate Frame 1 prompt if empty (e.g. after IndexedDB restore of stale session).
  useEffect(() => {
    if (!frame1CurrentPrompt || frame1CurrentPrompt.trim() === "") {
      updateNodeData(STUDIO_NODES.promptMapFrame1, { prompt: PROMPTS.mapEnhanceClean });
    }
  }, [frame1CurrentPrompt, updateNodeData]);

  // Populate / sync the Frame 2 prompt node when plotSquareMeters changes or
  // on mount when the prompt is empty (e.g. after IndexedDB restore).
  // Also re-populate whenever hasSqm changes (user enters/changes area value).
  useEffect(() => {
    const isEmpty = !frame2CurrentPrompt || frame2CurrentPrompt.trim() === "";
    const hasPlaceholder = frame2CurrentPrompt.includes("{AREA}");
    // Detect auto-generated prompt with a previous sq.m value (e.g. "1 sq.m")
    // so we re-sync when the user changes the area input
    const hasOldAreaValue = /"\d+(\.\d+)?\s*sq\.m"/.test(frame2CurrentPrompt);
    if (isEmpty || hasPlaceholder || hasOldAreaValue) {
      updateNodeData(STUDIO_NODES.promptMapFrame2, { prompt: frame2PromptText });
    }
  }, [frame2PromptText, frame2CurrentPrompt, updateNodeData, hasSqm, plotSquareMeters]);

  const handleGenerate = useCallback(async () => {
    if (isGenerating || isRunning) return;
    setIsGenerating(true);

    try {
      const selectedModel = getSelectedModel(currentModel);

      // Set aspect ratio + model on Frame 1 node
      updateNodeData(STUDIO_NODES.generateMap, {
        aspectRatio,
        selectedModel,
      });

      // Generate Frame 1
      await regenerateNode(STUDIO_NODES.generateMap);

      // Generate Frame 2 only if user entered square meters
      if (hasSqm) {
        updateNodeData(STUDIO_NODES.generateMapFrame2, {
          aspectRatio,
          selectedModel,
        });
        await regenerateNode(STUDIO_NODES.generateMapFrame2);
      }
    } finally {
      setIsGenerating(false);
    }
  }, [
    isGenerating,
    isRunning,
    updateNodeData,
    regenerateNode,
    aspectRatio,
    hasSqm,
    currentModel,
  ]);

  const handleRegenerateFrame1 = useCallback(async () => {
    if (isRunning) return;
    updateNodeData(STUDIO_NODES.generateMap, { aspectRatio, selectedModel: getSelectedModel(currentModel) });
    await regenerateNode(STUDIO_NODES.generateMap);
  }, [isRunning, updateNodeData, regenerateNode, aspectRatio, currentModel]);

  const handleRegenerateFrame2 = useCallback(async () => {
    if (isRunning || !hasSqm) return;
    updateNodeData(STUDIO_NODES.generateMapFrame2, { aspectRatio, selectedModel: getSelectedModel(currentModel) });
    await regenerateNode(STUDIO_NODES.generateMapFrame2);
  }, [
    isRunning,
    hasSqm,
    updateNodeData,
    regenerateNode,
    aspectRatio,
    currentModel,
  ]);

  return (
    <div className="flex flex-col gap-4 py-4">
      {/* Fullscreen image viewer */}
      {viewerImage && (
        <ImageViewer
          src={viewerImage.src}
          alt={viewerImage.alt}
          onClose={() => setViewerImage(null)}
        />
      )}

      {/* Model Selector */}
      <ModelSelector
        value={currentModel}
        onChange={(m) => setStepModel("2", m)}
        recommendedModel="gpt-1.5"
      />

      {/* Aspect Ratio Selector */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-400 uppercase tracking-wide">
          Aspect Ratio
        </label>
        <div className="flex gap-1.5">
          {aspectRatios.map((ar) => (
            <button
              key={ar.value}
              onClick={() => setAspectRatio(ar.value)}
              className={`flex-1 h-9 rounded-lg text-xs font-medium transition-colors ${
                aspectRatio === ar.value
                  ? "bg-white text-neutral-900"
                  : "bg-neutral-800 text-neutral-400 hover:text-white"
              }`}
            >
              {ar.label}
              {ar.recommended && (
                <span className="ml-1 text-[9px] text-emerald-400 font-normal">rec</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Generate Button */}
      {frame1Status !== "complete" ? (
        <button
          onClick={handleGenerate}
          disabled={isGenerating || isRunning}
          className="w-full h-11 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-500 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isGenerating || frame1Status === "loading" ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generating...
            </>
          ) : (
            "Generate Enhanced Map"
          )}
        </button>
      ) : (
        <button
          onClick={handleGenerate}
          disabled={isGenerating || isRunning}
          className="w-full h-10 bg-neutral-800 text-neutral-300 rounded-xl font-medium text-sm hover:bg-neutral-700 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          Regenerate All
        </button>
      )}

      {/* Frame Previews */}
      <div className="grid grid-cols-2 gap-3">
        {/* Frame 1: Clean Map */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-white">Clean Map</span>
            <StatusIndicator status={frame1Status} />
          </div>
          <div className="relative aspect-square rounded-xl overflow-hidden bg-neutral-800">
            {frame1Image ? (
              <>
                <img
                  src={frame1Image}
                  alt="Enhanced map (clean)"
                  className="w-full h-full object-contain cursor-pointer"
                  onClick={() => setViewerImage({ src: frame1Image, alt: "Enhanced map (clean)" })}
                />
                <div className="absolute bottom-2 right-2 flex gap-1.5">
                  <button
                    onClick={handleRegenerateFrame1}
                    disabled={isRunning}
                    className="px-2 py-1 bg-black/60 backdrop-blur-sm text-xs text-white rounded-lg hover:bg-black/80 transition-colors disabled:opacity-50"
                  >
                    Redo
                  </button>
                  <DownloadButton
                    dataUrl={frame1Image}
                    filename={`map-clean-${Date.now()}.png`}
                    label=""
                    className="bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded-lg hover:bg-black/80 transition-colors flex items-center"
                  />
                </div>
              </>
            ) : frame1Status === "loading" ? (
              <div className="flex flex-col items-center justify-center h-full gap-2">
                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <LoadingPhrase set="map" className="text-xs" />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <span className="text-xs text-neutral-600">No text version</span>
              </div>
            )}
          </div>
        </div>

        {/* Frame 2: Map with Area */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-white">With Area</span>
            {hasSqm ? (
              <StatusIndicator status={frame2Status} />
            ) : (
              <span className="text-[10px] text-neutral-600">No sq.m set</span>
            )}
          </div>
          <div
            className={`relative aspect-square rounded-xl overflow-hidden bg-neutral-800 ${
              !hasSqm ? "opacity-40" : ""
            }`}
          >
            {frame2Image && hasSqm ? (
              <>
                <img
                  src={frame2Image}
                  alt="Enhanced map (with area)"
                  className="w-full h-full object-contain cursor-pointer"
                  onClick={() => setViewerImage({ src: frame2Image, alt: "Enhanced map (with area)" })}
                />
                <div className="absolute bottom-2 right-2 flex gap-1.5">
                  <button
                    onClick={handleRegenerateFrame2}
                    disabled={isRunning}
                    className="px-2 py-1 bg-black/60 backdrop-blur-sm text-xs text-white rounded-lg hover:bg-black/80 transition-colors disabled:opacity-50"
                  >
                    Redo
                  </button>
                  <DownloadButton
                    dataUrl={frame2Image}
                    filename={`map-area-${Date.now()}.png`}
                    label=""
                    className="bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded-lg hover:bg-black/80 transition-colors flex items-center"
                  />
                </div>
              </>
            ) : frame2Status === "loading" && hasSqm ? (
              <div className="flex flex-col items-center justify-center h-full gap-2">
                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <LoadingPhrase set="map" className="text-xs" />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-1 px-2">
                <span className="text-xs text-neutral-600 text-center">
                  {hasSqm
                    ? `${plotSquareMeters} sq.m`
                    : "Enter plot area in Upload step"}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Advanced prompt editors */}
      <AdvancedPromptSection promptNodeId={STUDIO_NODES.promptMapFrame1} label="Frame 1 Prompt" />
      <AdvancedPromptSection promptNodeId={STUDIO_NODES.promptMapFrame2} label="Frame 2 Prompt" />

      {/* Info text */}
      <div className="bg-neutral-800/50 rounded-lg px-3 py-2">
        <p className="text-xs text-neutral-400">
          {hasSqm
            ? `These 2 frames become the V0 video transition (area text popup: ${plotSquareMeters} sq.m)`
            : "Add plot area in Upload step to generate the area text frame and enable V0 video"}
        </p>
      </div>
    </div>
  );
}
