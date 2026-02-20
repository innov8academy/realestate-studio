"use client";

import { useCallback } from "react";
import { useWorkflowStore } from "@/store/workflowStore";
import { useStudioStore } from "@/store/studioStore";
import { STUDIO_NODES } from "@/lib/studio/nodeMap";
import { StatusIndicator } from "../shared/StatusIndicator";
import { AdvancedPromptSection } from "../shared/AdvancedPromptSection";
import { DownloadButton } from "../shared/DownloadButton";
import { LoadingPhrase } from "../shared/LoadingPhrase";
import type { GenerateImageNodeData, GenerateVideoNodeData } from "@/types";

function VideoCard({
  title,
  description,
  videoNodeId,
  promptNodeId,
  disabled,
  disabledReason,
}: {
  title: string;
  description: string;
  videoNodeId: string;
  promptNodeId: string;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const nodes = useWorkflowStore((s) => s.nodes);
  const regenerateNode = useWorkflowStore((s) => s.regenerateNode);
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
  const isRunning = useWorkflowStore((s) => s.isRunning);
  const currentNodeIds = useWorkflowStore((s) => s.currentNodeIds);
  const aspectRatio = useStudioStore((s) => s.aspectRatio);
  const videoDuration = useStudioStore((s) => s.videoDuration);

  const videoData = nodes.find((n) => n.id === videoNodeId)?.data as GenerateVideoNodeData | undefined;
  const videoStatus = videoData?.status || "idle";
  const outputVideo = videoData?.outputVideo;
  const isVideoRunning = currentNodeIds.includes(videoNodeId);

  const handleGenerate = useCallback(async () => {
    const existingParams = videoData?.parameters || {};
    updateNodeData(videoNodeId, {
      parameters: { ...existingParams, aspect_ratio: aspectRatio, duration: videoDuration },
    });
    await regenerateNode(videoNodeId);
  }, [videoNodeId, videoData, updateNodeData, regenerateNode, aspectRatio, videoDuration]);

  return (
    <div className="flex flex-col gap-2.5 bg-neutral-900 rounded-xl p-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-white">{title}</h3>
          <p className="text-[11px] text-neutral-500 mt-0.5">{description}</p>
        </div>
        <StatusIndicator status={videoStatus} error={videoData?.error} onRetry={handleGenerate} />
      </div>

      {outputVideo ? (
        <div className="flex flex-col gap-2">
          <div className="w-full aspect-video rounded-lg overflow-hidden bg-black">
            <video src={outputVideo} controls playsInline autoPlay loop className="w-full h-full object-contain" />
          </div>
          <div className="flex gap-2">
            {!isVideoRunning && (
              <button
                onClick={handleGenerate}
                disabled={isRunning}
                className="flex-1 h-8 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium rounded-lg transition-colors active:scale-[0.98] disabled:opacity-50"
              >
                Regenerate
              </button>
            )}
            <DownloadButton
              dataUrl={outputVideo}
              filename={`video-${title.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.mp4`}
            />
          </div>
        </div>
      ) : videoStatus === "loading" ? (
        <div className="w-full aspect-video rounded-lg bg-neutral-800 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
            <div className="text-center">
              <LoadingPhrase set="video" className="text-xs" />
              <p className="text-[10px] text-neutral-500 mt-0.5">This may take a few minutes</p>
            </div>
          </div>
        </div>
      ) : disabled ? (
        <div className="w-full aspect-video rounded-lg bg-neutral-800/30 flex items-center justify-center">
          <p className="text-xs text-neutral-600 text-center px-4">{disabledReason}</p>
        </div>
      ) : (
        <button
          onClick={handleGenerate}
          disabled={isRunning}
          className="w-full h-10 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Generate Video
        </button>
      )}

      <AdvancedPromptSection promptNodeId={promptNodeId} label="Edit Prompt" />
    </div>
  );
}

export function ShowcaseVideosStep() {
  const nodes = useWorkflowStore((s) => s.nodes);

  // Check prerequisites
  const fullData = nodes.find((n) => n.id === STUDIO_NODES.generateFullBuilding)?.data as GenerateImageNodeData | undefined;
  const aerialData = nodes.find((n) => n.id === STUDIO_NODES.generateAngleAerialDrone)?.data as GenerateImageNodeData | undefined;
  const balconyData = nodes.find((n) => n.id === STUDIO_NODES.generateAngleBalcony)?.data as GenerateImageNodeData | undefined;
  const interiorData = nodes.find((n) => n.id === STUDIO_NODES.generateAngleInterior)?.data as GenerateImageNodeData | undefined;

  const hasFull = fullData?.status === "complete";
  const hasAerial = aerialData?.status === "complete";
  const hasBalcony = balconyData?.status === "complete";
  const hasInterior = interiorData?.status === "complete";

  return (
    <div className="flex flex-col gap-4 py-4">
      {/* V4: Full Building → Aerial Drone */}
      <VideoCard
        title="V4: Street to Aerial"
        description="Full building → aerial drone orbit"
        videoNodeId={STUDIO_NODES.generateVideoV4}
        promptNodeId={STUDIO_NODES.promptVideoV4}
        disabled={!hasFull || !hasAerial}
        disabledReason="Generate full building and aerial drone angle first"
      />

      {/* V5: Aerial → Balcony */}
      <VideoCard
        title="V5: Aerial to Balcony"
        description="Bird transition from aerial to balcony close-up"
        videoNodeId={STUDIO_NODES.generateVideoV5}
        promptNodeId={STUDIO_NODES.promptVideoV5}
        disabled={!hasAerial || !hasBalcony}
        disabledReason="Generate aerial drone and balcony angle images first"
      />

      {/* V6: Balcony → Interior */}
      <VideoCard
        title="V6: Balcony to Interior"
        description="Whip-pan through glass door to interior"
        videoNodeId={STUDIO_NODES.generateVideoV6}
        promptNodeId={STUDIO_NODES.promptVideoV6}
        disabled={!hasBalcony || !hasInterior}
        disabledReason="Generate balcony and interior angle images first"
      />

      <p className="text-xs text-neutral-500 text-center">
        Showcase videos feature cinematic transitions between building angles.
      </p>
    </div>
  );
}
