"use client";

import { useCallback, useState, useRef } from "react";
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
import type { GenerateImageNodeData, NodeStatus } from "@/types";

// Quality options for GPT Image 1.5
const QUALITY_OPTIONS = [
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

interface GenerationCardProps {
  label: string;
  nodeId: string;
  promptNodeId: string;
  showRegenerate?: boolean;
  aspectRatio: string;
  quality: string;
  modelKey: import("@/lib/studio/modelConfig").StudioImageModel;
}

function GenerationCard({ label, nodeId, promptNodeId, showRegenerate = true, aspectRatio, quality, modelKey }: GenerationCardProps) {
  const nodes = useWorkflowStore((s) => s.nodes);
  const regenerateNode = useWorkflowStore((s) => s.regenerateNode);
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
  const currentNodeIds = useWorkflowStore((s) => s.currentNodeIds);

  const nodeData = nodes.find((n) => n.id === nodeId)?.data as GenerateImageNodeData | undefined;
  const status: NodeStatus = nodeData?.status || "idle";
  const outputImage = nodeData?.outputImage;
  const error = nodeData?.error;
  const isNodeRunning = currentNodeIds.includes(nodeId);

  const handleRegenerate = useCallback(() => {
    updateNodeData(nodeId, {
      aspectRatio,
      selectedModel: getSelectedModel(modelKey),
      parameters: { aspect_ratio: aspectRatio, quality },
    });
    regenerateNode(nodeId);
  }, [nodeId, regenerateNode, updateNodeData, aspectRatio, quality, modelKey]);

  return (
    <div className="bg-neutral-900 rounded-xl p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-neutral-300">{label}</h3>
        <StatusIndicator
          status={status}
          error={error}
          onRetry={handleRegenerate}
        />
      </div>

      {outputImage ? (
        <div className="relative w-full aspect-square rounded-lg overflow-hidden">
          <img
            src={outputImage}
            alt={label}
            className="w-full h-full object-contain bg-neutral-950"
          />
          <div className="absolute bottom-2 right-2 flex gap-1.5">
            {showRegenerate && !isNodeRunning && (
              <button
                onClick={handleRegenerate}
                className="text-[10px] bg-black/60 text-white px-2 py-1 rounded hover:bg-black/80 transition-colors"
              >
                Regenerate
              </button>
            )}
            <DownloadButton
              dataUrl={outputImage}
              filename={`building-${label.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.png`}
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
            {status === "error" ? "Generation failed" : "Waiting..."}
          </span>
        </div>
      )}

      <AdvancedPromptSection promptNodeId={promptNodeId} label="Edit Prompt" />
    </div>
  );
}

export function GenerateBuildingStep() {
  const regenerateNode = useWorkflowStore((s) => s.regenerateNode);
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
  const isRunning = useWorkflowStore((s) => s.isRunning);
  const nodes = useWorkflowStore((s) => s.nodes);
  const [isGenerating, setIsGenerating] = useState(false);

  const aspectRatio = useStudioStore((s) => s.aspectRatio);
  const setAspectRatio = useStudioStore((s) => s.setAspectRatio);
  const streetModel = useStudioStore((s) => s.stepModel["3-street"] ?? "gpt-1.5");
  const buildingModel = useStudioStore((s) => s.stepModel["3-building"] ?? "nano-banana-2");
  const setStepModel = useStudioStore((s) => s.setStepModel);

  const aspectRatios = getAspectRatiosForModel(buildingModel);

  const buildingReferenceImage = useStudioStore((s) => s.buildingReferenceImage);
  const setBuildingReferenceImage = useStudioStore((s) => s.setBuildingReferenceImage);
  const buildingDescription = useStudioStore((s) => s.buildingDescription);
  const setBuildingDescription = useStudioStore((s) => s.setBuildingDescription);

  const [quality, setQuality] = useState("medium");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fullBuildingData = nodes.find(
    (n) => n.id === STUDIO_NODES.generateFullBuilding
  )?.data as GenerateImageNodeData | undefined;

  const hasResult = fullBuildingData?.status === "complete";

  const handleReferenceUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setBuildingReferenceImage(dataUrl);
        // Set the reference image on the building-ref imageInput node
        updateNodeData(STUDIO_NODES.imageInputBuildingRef, {
          image: dataUrl,
          filename: file.name,
          dimensions: { width: 800, height: 600 },
        });
        // Switch to reference-aware prompts now that a reference image is provided
        updateNodeData(STUDIO_NODES.promptHalfBuilding, { prompt: PROMPTS.halfBuilding });
        updateNodeData(STUDIO_NODES.promptFullBuilding, { prompt: PROMPTS.fullBuilding });
      };
      reader.readAsDataURL(file);
    },
    [setBuildingReferenceImage, updateNodeData]
  );

  const handleRemoveReference = useCallback(() => {
    setBuildingReferenceImage(null);
    updateNodeData(STUDIO_NODES.imageInputBuildingRef, {
      image: null,
      filename: null,
      dimensions: null,
    });
    // Switch back to no-reference prompts
    updateNodeData(STUDIO_NODES.promptHalfBuilding, { prompt: PROMPTS.halfBuildingNoRef });
    updateNodeData(STUDIO_NODES.promptFullBuilding, { prompt: PROMPTS.fullBuildingNoRef });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [setBuildingReferenceImage, updateNodeData]);

  // Append building description to a prompt node, stripping any previous suffix first
  const injectDescription = useCallback(
    (promptNodeId: string) => {
      if (!buildingDescription.trim()) return;
      const node = nodes.find((n) => n.id === promptNodeId);
      if (!node) return;
      const currentPrompt = (node.data as { prompt?: string }).prompt || "";
      // Strip any previously injected description (between markers)
      const marker = "\n\n[Building description: ";
      const markerIdx = currentPrompt.indexOf(marker);
      const basePrompt = markerIdx >= 0 ? currentPrompt.slice(0, markerIdx) : currentPrompt;
      // Append the description
      const updated = `${basePrompt}${marker}${buildingDescription.trim()}]`;
      updateNodeData(promptNodeId, { prompt: updated });
    },
    [buildingDescription, nodes, updateNodeData]
  );

  const handleGenerateAll = useCallback(async () => {
    if (isGenerating || isRunning) return;
    setIsGenerating(true);

    try {
      // Inject building description into half/full building prompts
      injectDescription(STUDIO_NODES.promptHalfBuilding);
      injectDescription(STUDIO_NODES.promptFullBuilding);

      // Set aspect ratio + quality + model on generation nodes
      const selectedStreetModel = getSelectedModel(streetModel);
      const selectedBuildingModel = getSelectedModel(buildingModel);

      // Street node uses street model
      updateNodeData(STUDIO_NODES.generateStreet, {
        aspectRatio,
        selectedModel: selectedStreetModel,
        parameters: { aspect_ratio: aspectRatio, quality },
      });

      // Building nodes use building model
      for (const nodeId of [STUDIO_NODES.generateHalfBuilding, STUDIO_NODES.generateFullBuilding]) {
        updateNodeData(nodeId, {
          aspectRatio,
          selectedModel: selectedBuildingModel,
          parameters: { aspect_ratio: aspectRatio, quality },
        });
      }

      // Stage 1: Enhance street image
      await regenerateNode(STUDIO_NODES.generateStreet);

      // Stage 2: Generate half-constructed building
      await regenerateNode(STUDIO_NODES.generateHalfBuilding);

      // Stage 3: Generate fully constructed building
      await regenerateNode(STUDIO_NODES.generateFullBuilding);
    } finally {
      setIsGenerating(false);
    }
  }, [isGenerating, isRunning, regenerateNode, injectDescription, updateNodeData, aspectRatio, quality, streetModel, buildingModel]);

  return (
    <div className="flex flex-col gap-3 py-4">
      {/* Reference Building Upload (optional) */}
      <div className="bg-neutral-900 rounded-xl p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-medium text-neutral-300">Reference Building</h3>
            <p className="text-[10px] text-neutral-500 mt-0.5">Optional: upload a reference photo</p>
          </div>
          {buildingReferenceImage && (
            <button
              onClick={handleRemoveReference}
              className="text-[10px] text-red-400 hover:text-red-300"
            >
              Remove
            </button>
          )}
        </div>

        {buildingReferenceImage ? (
          <div className="w-full h-24 rounded-lg overflow-hidden bg-neutral-950">
            <img
              src={buildingReferenceImage}
              alt="Reference building"
              className="w-full h-full object-contain"
            />
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-20 border border-dashed border-neutral-700 rounded-lg flex flex-col items-center justify-center gap-1 hover:border-neutral-500 transition-colors"
          >
            <svg className="w-5 h-5 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span className="text-[10px] text-neutral-500">Upload reference photo</span>
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleReferenceUpload}
          className="hidden"
        />
      </div>

      {/* Building Description (optional) */}
      <div className="bg-neutral-900 rounded-xl p-3 flex flex-col gap-2">
        <h3 className="text-xs font-medium text-neutral-300">Building Description</h3>
        <input
          type="text"
          value={buildingDescription}
          onChange={(e) => setBuildingDescription(e.target.value)}
          placeholder="e.g., 4-story modern apartment with glass balconies"
          className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-neutral-300 placeholder-neutral-600 focus:outline-none focus:border-neutral-500"
        />
      </div>

      {/* Model + Aspect Ratio + Quality */}
      <div className="bg-neutral-900 rounded-xl p-3 flex flex-col gap-3">
        {/* Street Enhancement Model */}
        <ModelSelector
          value={streetModel}
          onChange={(m) => setStepModel("3-street", m)}
          recommendedModel="gpt-1.5"
          label="Street Model"
        />

        {/* Building Model */}
        <ModelSelector
          value={buildingModel}
          onChange={(m) => setStepModel("3-building", m)}
          recommendedModel="nano-banana-2"
          label="Building Model"
        />

        {/* Aspect Ratio */}
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

        {/* Quality — only relevant when building model is GPT 1.5 */}
        {buildingModel === "gpt-1.5" && (
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

      {/* Generate buttons */}
      {!hasResult && !isGenerating && (
        <button
          onClick={handleGenerateAll}
          disabled={isRunning}
          className="w-full h-10 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Generate Building Visualization
        </button>
      )}

      {hasResult && !isGenerating && (
        <button
          onClick={handleGenerateAll}
          disabled={isRunning}
          className="w-full h-10 bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-medium rounded-xl transition-colors active:scale-[0.98] disabled:opacity-50"
        >
          Regenerate All
        </button>
      )}

      {/* 3 generation cards: Street → Half Building → Full Building */}
      <GenerationCard
        label="Enhanced Street"
        nodeId={STUDIO_NODES.generateStreet}
        promptNodeId={STUDIO_NODES.promptStreetEnhance}
        aspectRatio={aspectRatio}
        quality={quality}
        modelKey={streetModel}
      />

      <GenerationCard
        label="Half-Constructed Building"
        nodeId={STUDIO_NODES.generateHalfBuilding}
        promptNodeId={STUDIO_NODES.promptHalfBuilding}
        aspectRatio={aspectRatio}
        quality={quality}
        modelKey={buildingModel}
      />

      <GenerationCard
        label="Fully Constructed Building"
        nodeId={STUDIO_NODES.generateFullBuilding}
        promptNodeId={STUDIO_NODES.promptFullBuilding}
        aspectRatio={aspectRatio}
        quality={quality}
        modelKey={buildingModel}
      />

      <p className="text-xs text-neutral-500 text-center">
        Building visualization uses your annotated street view as the base.
        {buildingReferenceImage && " Reference building image will guide the AI's design."}
      </p>
    </div>
  );
}
