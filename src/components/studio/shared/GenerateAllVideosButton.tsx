"use client";

import { useCallback, useState } from "react";
import { useWorkflowStore } from "@/store/workflowStore";
import { useStudioStore } from "@/store/studioStore";
import { STUDIO_NODES } from "@/lib/studio/nodeMap";
import type { GenerateVideoNodeData } from "@/types";

const ALL_VIDEO_NODE_IDS = [
  STUDIO_NODES.generateVideoV0,
  STUDIO_NODES.generateVideoV1,
  STUDIO_NODES.generateVideoV2,
  STUDIO_NODES.generateVideoV3,
  STUDIO_NODES.generateVideoV4,
  STUDIO_NODES.generateVideoV5,
  STUDIO_NODES.generateVideoV6,
] as const;

export function GenerateAllVideosButton() {
  const nodes = useWorkflowStore((s) => s.nodes);
  const regenerateNode = useWorkflowStore((s) => s.regenerateNode);
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
  const currentNodeIds = useWorkflowStore((s) => s.currentNodeIds);
  const aspectRatio = useStudioStore((s) => s.aspectRatio);
  const videoDuration = useStudioStore((s) => s.videoDuration);
  const [isGenerating, setIsGenerating] = useState(false);

  // Count completed, loading, and failed videos
  const completedCount = ALL_VIDEO_NODE_IDS.filter((id) => {
    const data = nodes.find((n) => n.id === id)?.data as GenerateVideoNodeData | undefined;
    return data?.status === "complete";
  }).length;

  const failedIds = ALL_VIDEO_NODE_IDS.filter((id) => {
    const data = nodes.find((n) => n.id === id)?.data as GenerateVideoNodeData | undefined;
    return data?.status === "error";
  });
  const failedCount = failedIds.length;

  const loadingCount = ALL_VIDEO_NODE_IDS.filter((id) => {
    return currentNodeIds.includes(id);
  }).length;

  const allComplete = completedCount === ALL_VIDEO_NODE_IDS.length;
  const anyComplete = completedCount > 0;
  const anyLoading = loadingCount > 0 || isGenerating;

  const handleGenerateAll = useCallback(async () => {
    if (isGenerating || anyLoading) return;
    setIsGenerating(true);
    try {
      // Apply aspect ratio + duration to all video nodes first
      for (const nodeId of ALL_VIDEO_NODE_IDS) {
        const videoData = nodes.find((n) => n.id === nodeId)?.data as GenerateVideoNodeData | undefined;
        const existingParams = videoData?.parameters || {};
        updateNodeData(nodeId, {
          parameters: {
            ...existingParams,
            aspect_ratio: aspectRatio,
            duration: videoDuration,
          },
        });
      }

      // Fire all 7 videos in parallel
      await Promise.all(
        ALL_VIDEO_NODE_IDS.map((id) => regenerateNode(id))
      );
    } finally {
      setIsGenerating(false);
    }
  }, [isGenerating, anyLoading, nodes, updateNodeData, regenerateNode, aspectRatio, videoDuration]);

  const handleRetryFailed = useCallback(async () => {
    if (isGenerating || anyLoading || failedIds.length === 0) return;
    setIsGenerating(true);
    try {
      // Re-apply params to failed nodes
      for (const nodeId of failedIds) {
        const videoData = nodes.find((n) => n.id === nodeId)?.data as GenerateVideoNodeData | undefined;
        const existingParams = videoData?.parameters || {};
        updateNodeData(nodeId, {
          parameters: {
            ...existingParams,
            aspect_ratio: aspectRatio,
            duration: videoDuration,
          },
        });
      }
      await Promise.all(failedIds.map((id) => regenerateNode(id)));
    } finally {
      setIsGenerating(false);
    }
  }, [isGenerating, anyLoading, failedIds, nodes, updateNodeData, regenerateNode, aspectRatio, videoDuration]);

  // Button text
  let buttonText: string;
  if (anyLoading) {
    buttonText = `Generating... (${completedCount}/${ALL_VIDEO_NODE_IDS.length} done)`;
  } else if (allComplete) {
    buttonText = `All ${ALL_VIDEO_NODE_IDS.length} Videos Complete`;
  } else if (anyComplete) {
    buttonText = "Regenerate All Videos";
  } else {
    buttonText = `Generate All ${ALL_VIDEO_NODE_IDS.length} Videos`;
  }

  // Style: blue when nothing generated, neutral otherwise
  const isPrimary = !anyComplete && !anyLoading;

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleGenerateAll}
        disabled={anyLoading}
        className={`w-full h-12 text-white text-sm font-semibold rounded-xl transition-colors active:scale-[0.98] disabled:cursor-not-allowed ${
          anyLoading
            ? "bg-blue-600/70 animate-pulse"
            : allComplete
              ? "bg-emerald-700 hover:bg-emerald-600"
              : isPrimary
                ? "bg-blue-600 hover:bg-blue-500"
                : "bg-neutral-800 hover:bg-neutral-700"
        }`}
      >
        {buttonText}
      </button>

      {failedCount > 0 && !anyLoading && (
        <button
          onClick={handleRetryFailed}
          className="w-full h-10 bg-red-900/60 hover:bg-red-800/70 text-red-200 text-sm font-medium rounded-xl transition-colors active:scale-[0.98]"
        >
          Retry {failedCount} Failed Video{failedCount > 1 ? "s" : ""}
        </button>
      )}
    </div>
  );
}
