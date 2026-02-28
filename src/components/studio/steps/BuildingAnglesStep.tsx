"use client";

import { useCallback, useState } from "react";
import { useWorkflowStore } from "@/store/workflowStore";
import { useStudioStore } from "@/store/studioStore";
import { STUDIO_NODES } from "@/lib/studio/nodeMap";
import { StatusIndicator } from "../shared/StatusIndicator";
import { AdvancedPromptSection } from "../shared/AdvancedPromptSection";
import { DownloadButton } from "../shared/DownloadButton";
import { LoadingPhrase } from "../shared/LoadingPhrase";
import { ModelSelector } from "../shared/ModelSelector";
import { getAspectRatiosForModel, getSelectedModel } from "@/lib/studio/modelConfig";
import type { GenerateImageNodeData } from "@/types";

const QUALITY_OPTIONS = [
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const ANGLE_CONFIGS = [
  {
    label: "Aerial Drone Shot",
    description: "High drone, near top-down view of the building",
    generateId: STUDIO_NODES.generateAngleAerialDrone,
    promptId: STUDIO_NODES.promptAngleAerialDrone,
  },
  {
    label: "Balcony Close-up",
    description: "Lifestyle shot with woman sipping coffee",
    generateId: STUDIO_NODES.generateAngleBalcony,
    promptId: STUDIO_NODES.promptAngleBalcony,
  },
  {
    label: "Interior Room",
    description: "Modern living room with lifestyle element",
    generateId: STUDIO_NODES.generateAngleInterior,
    promptId: STUDIO_NODES.promptAngleInterior,
  },
] as const;

export function BuildingAnglesStep() {
  const nodes = useWorkflowStore((s) => s.nodes);
  const regenerateNode = useWorkflowStore((s) => s.regenerateNode);
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
  const isRunning = useWorkflowStore((s) => s.isRunning);
  const [isGenerating, setIsGenerating] = useState(false);

  const aspectRatio = useStudioStore((s) => s.aspectRatio);
  const setAspectRatio = useStudioStore((s) => s.setAspectRatio);
  const currentModel = useStudioStore((s) => s.stepModel["4"] ?? "nano-banana-2");
  const setStepModel = useStudioStore((s) => s.setStepModel);

  const aspectRatios = getAspectRatiosForModel(currentModel);
  const [quality, setQuality] = useState("medium");

  // Check prerequisite: full building must be complete
  const fullBuildingData = nodes.find(
    (n) => n.id === STUDIO_NODES.generateFullBuilding
  )?.data as GenerateImageNodeData | undefined;
  const hasBuilding = fullBuildingData?.status === "complete";

  // Check if any angle is complete
  const anyComplete = ANGLE_CONFIGS.some((cfg) => {
    const data = nodes.find((n) => n.id === cfg.generateId)?.data as GenerateImageNodeData | undefined;
    return data?.status === "complete";
  });

  // Apply aspect ratio + quality + model to a node before regenerating
  const applySettingsAndRegenerate = useCallback(
    async (nodeId: string) => {
      updateNodeData(nodeId, {
        aspectRatio,
        selectedModel: getSelectedModel(currentModel),
        parameters: { aspect_ratio: aspectRatio, quality },
      });
      await regenerateNode(nodeId);
    },
    [updateNodeData, regenerateNode, aspectRatio, quality, currentModel]
  );

  const handleGenerateAll = useCallback(async () => {
    if (isGenerating || isRunning || !hasBuilding) return;
    setIsGenerating(true);
    try {
      // Apply aspect ratio + quality + model to all angle nodes first
      const selectedModel = getSelectedModel(currentModel);
      for (const cfg of ANGLE_CONFIGS) {
        updateNodeData(cfg.generateId, {
          aspectRatio,
          selectedModel,
          parameters: { aspect_ratio: aspectRatio, quality },
        });
      }

      // Stage 1: Aerial drone shot first — its output feeds into balcony + interior as 2nd reference
      await regenerateNode(STUDIO_NODES.generateAngleAerialDrone);

      // Stage 2: Balcony and interior in parallel (now have aerial output as reference)
      await Promise.all([
        regenerateNode(STUDIO_NODES.generateAngleBalcony),
        regenerateNode(STUDIO_NODES.generateAngleInterior),
      ]);
    } finally {
      setIsGenerating(false);
    }
  }, [isGenerating, isRunning, hasBuilding, regenerateNode, updateNodeData, aspectRatio, quality, currentModel]);

  return (
    <div className="flex flex-col gap-3 py-4">
      {!hasBuilding && (
        <div className="bg-amber-900/20 border border-amber-700/30 rounded-lg px-3 py-2">
          <p className="text-xs text-amber-400">
            Complete the building generation in the previous step first.
          </p>
        </div>
      )}

      {/* Model + Aspect Ratio + Quality controls */}
      <div className="bg-neutral-900 rounded-xl p-3 flex flex-col gap-3">
        {/* Model */}
        <ModelSelector
          value={currentModel}
          onChange={(m) => setStepModel("4", m)}
          recommendedModel="nano-banana-2"
        />

        <div className="flex flex-col gap-1.5">
          <h3 className="text-xs font-medium text-neutral-300">Aspect Ratio</h3>
          <div className="flex gap-2">
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

        {/* Quality — only relevant for GPT 1.5 */}
        {currentModel === "gpt-1.5" && (
          <div className="flex flex-col gap-1.5">
            <h3 className="text-xs font-medium text-neutral-300">Quality</h3>
            <div className="flex gap-2">
              {QUALITY_OPTIONS.map((q) => (
                <button
                  key={q.value}
                  onClick={() => setQuality(q.value)}
                  className={`flex-1 h-9 rounded-lg text-xs font-medium transition-colors ${
                    quality === q.value
                      ? "bg-white text-neutral-900"
                      : "bg-neutral-800 text-neutral-400 hover:text-white"
                  }`}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {hasBuilding && (
        <button
          onClick={handleGenerateAll}
          disabled={isGenerating || isRunning}
          className={`w-full h-10 text-white text-sm font-medium rounded-xl transition-colors active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${
            anyComplete
              ? "bg-neutral-800 hover:bg-neutral-700"
              : "bg-blue-600 hover:bg-blue-500"
          }`}
        >
          {isGenerating ? "Generating..." : anyComplete ? "Regenerate All Angles" : "Generate All Angles"}
        </button>
      )}

      {ANGLE_CONFIGS.map((cfg) => {
        const data = nodes.find((n) => n.id === cfg.generateId)?.data as GenerateImageNodeData | undefined;
        const status = data?.status || "idle";
        const outputImage = data?.outputImage;
        const isNodeRunning = useWorkflowStore.getState().currentNodeIds.includes(cfg.generateId);

        return (
          <div key={cfg.generateId} className="bg-neutral-900 rounded-xl p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-white">{cfg.label}</h3>
                <p className="text-[11px] text-neutral-500 mt-0.5">{cfg.description}</p>
              </div>
              <StatusIndicator
                status={status}
                error={data?.error}
                onRetry={() => applySettingsAndRegenerate(cfg.generateId)}
              />
            </div>

            {outputImage ? (
              <div className="relative w-full aspect-square rounded-lg overflow-hidden">
                <img
                  src={outputImage}
                  alt={cfg.label}
                  className="w-full h-full object-contain bg-neutral-950"
                />
                <div className="absolute bottom-2 right-2 flex gap-1.5">
                  {!isNodeRunning && (
                    <button
                      onClick={() => applySettingsAndRegenerate(cfg.generateId)}
                      className="text-[10px] bg-black/60 text-white px-2 py-1 rounded hover:bg-black/80 transition-colors"
                    >
                      Redo
                    </button>
                  )}
                  <DownloadButton
                    dataUrl={outputImage}
                    filename={`angle-${cfg.label.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.png`}
                    label=""
                    className="bg-black/60 text-white px-2 py-1 rounded hover:bg-black/80 transition-colors flex items-center"
                  />
                </div>
              </div>
            ) : status === "loading" ? (
              <div className="w-full aspect-square rounded-lg bg-neutral-800 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                  <LoadingPhrase set="image" className="text-xs" />
                </div>
              </div>
            ) : (
              <div className="w-full aspect-square rounded-lg bg-neutral-800/50 flex items-center justify-center">
                <span className="text-xs text-neutral-600">
                  {!hasBuilding ? "Waiting for building..." : "Ready to generate"}
                </span>
              </div>
            )}

            <AdvancedPromptSection promptNodeId={cfg.promptId} label="Edit Prompt" />
          </div>
        );
      })}
    </div>
  );
}
