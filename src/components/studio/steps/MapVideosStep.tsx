"use client";

import { useCallback } from "react";
import { useWorkflowStore } from "@/store/workflowStore";
import { useStudioStore } from "@/store/studioStore";
import { STUDIO_NODES } from "@/lib/studio/nodeMap";
import { StatusIndicator } from "../shared/StatusIndicator";
import { AdvancedPromptSection } from "../shared/AdvancedPromptSection";
import { DownloadButton } from "../shared/DownloadButton";
import { LoadingPhrase } from "../shared/LoadingPhrase";
import { GenerateAllVideosButton } from "../shared/GenerateAllVideosButton";
import type { GenerateImageNodeData, GenerateVideoNodeData } from "@/types";

const DURATION_OPTIONS = [
  { value: "5", label: "5s" },
  { value: "10", label: "10s" },
];

interface VideoCardProps {
  title: string;
  description: string;
  videoNodeId: string;
  promptNodeId: string;
  disabled?: boolean;
  disabledReason?: string;
}

function VideoCard({
  title,
  description,
  videoNodeId,
  promptNodeId,
  disabled,
  disabledReason,
}: VideoCardProps) {
  const nodes = useWorkflowStore((s) => s.nodes);
  const regenerateNode = useWorkflowStore((s) => s.regenerateNode);
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
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
      parameters: {
        ...existingParams,
        aspect_ratio: aspectRatio,
        duration: videoDuration,
      },
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
                disabled={isVideoRunning}
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
      ) : (
        <div className="w-full aspect-video rounded-lg bg-neutral-800/50 flex items-center justify-center">
          <span className="text-xs text-neutral-600">
            {disabled ? disabledReason : "Ready to generate"}
          </span>
        </div>
      )}

      <AdvancedPromptSection promptNodeId={promptNodeId} label="Edit Prompt" />
    </div>
  );
}

export function MapVideosStep() {
  const nodes = useWorkflowStore((s) => s.nodes);
  const plotSquareMeters = useStudioStore((s) => s.plotSquareMeters);
  const videoDuration = useStudioStore((s) => s.videoDuration);
  const setVideoDuration = useStudioStore((s) => s.setVideoDuration);
  const aspectRatio = useStudioStore((s) => s.aspectRatio);

  // Check prerequisites
  const mapFrame1Data = nodes.find((n) => n.id === STUDIO_NODES.generateMap)?.data as GenerateImageNodeData | undefined;
  const mapFrame2Data = nodes.find((n) => n.id === STUDIO_NODES.generateMapFrame2)?.data as GenerateImageNodeData | undefined;
  const streetData = nodes.find((n) => n.id === STUDIO_NODES.generateStreet)?.data as GenerateImageNodeData | undefined;

  const hasMapFrames = mapFrame1Data?.status === "complete" && mapFrame2Data?.status === "complete";
  const hasSqm = plotSquareMeters !== null && plotSquareMeters > 0;
  const hasStreet = streetData?.status === "complete";

  return (
    <div className="flex flex-col gap-4 py-4">
      {/* Duration + aspect ratio display */}
      <div className="flex items-center gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-medium text-neutral-500 uppercase tracking-wide">Duration</label>
          <div className="flex gap-1">
            {DURATION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setVideoDuration(opt.value)}
                className={`px-3 h-7 rounded-lg text-xs font-medium transition-colors ${
                  videoDuration === opt.value
                    ? "bg-white text-neutral-900"
                    : "bg-neutral-800 text-neutral-400 hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-medium text-neutral-500 uppercase tracking-wide">Aspect Ratio</label>
          <span className="text-xs font-medium text-neutral-300 bg-neutral-800 px-2.5 py-1 rounded-lg">{aspectRatio}</span>
        </div>
      </div>

      <GenerateAllVideosButton />

      {/* V0: Area Text Popup */}
      <VideoCard
        title="V0: Area Text Popup"
        description={hasSqm ? `Map → map with "${plotSquareMeters} sq.m" text` : "Requires plot area and both map frames"}
        videoNodeId={STUDIO_NODES.generateVideoV0}
        promptNodeId={STUDIO_NODES.promptVideoV0}
        disabled={!hasMapFrames || !hasSqm}
        disabledReason={!hasSqm ? "Enter plot area in Upload step first" : "Generate both map frames first"}
      />

      {/* V1: Map to Street */}
      <VideoCard
        title="V1: Aerial Dive to Street"
        description="Map frame 2 → street-level transition"
        videoNodeId={STUDIO_NODES.generateVideoV1}
        promptNodeId={STUDIO_NODES.promptVideoV1}
        disabled={!mapFrame2Data || mapFrame2Data.status !== "complete" || !hasStreet}
        disabledReason="Generate enhanced map frame 2 and street view first"
      />

      <p className="text-xs text-neutral-500 text-center">
        Each video uses images from previous steps as first/last frames for smooth transitions.
      </p>
    </div>
  );
}
