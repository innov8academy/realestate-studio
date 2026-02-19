"use client";

import { useCallback } from "react";
import { useWorkflowStore } from "@/store/workflowStore";
import { STUDIO_NODES } from "@/lib/studio/nodeMap";
import { DownloadButton } from "../shared/DownloadButton";
import type { VideoStitchNodeData, GenerateVideoNodeData } from "@/types";

const VIDEO_LABELS: Record<string, string> = {
  "generateVideo-map-area": "V0 · Area Popup",
  "generateVideo-1": "V1 · Aerial Dive",
  "generateVideo-2": "V2 · Construction Rise",
  "generateVideo-3": "V3 · Build Complete",
  "generateVideo-4": "V4 · Street to Aerial",
  "generateVideo-5": "V5 · Aerial to Balcony",
  "generateVideo-6": "V6 · Balcony to Interior",
};

const SPEED_PRESETS: { id: string | null; label: string; description: string }[] = [
  { id: null, label: "None", description: "No speed ramp" },
  { id: "easeInOutSine", label: "Smooth", description: "Slow-fast-slow" },
  { id: "easeInOutCubic", label: "Dramatic", description: "Ease in & out" },
  { id: "easeInQuad", label: "Ease In", description: "Start slow" },
  { id: "easeOutQuad", label: "Ease Out", description: "End slow" },
  { id: "easeInOutExpo", label: "Cinematic", description: "Sharp ramp" },
];

export function VideoStitchStep() {
  const nodes = useWorkflowStore((s) => s.nodes);
  const edges = useWorkflowStore((s) => s.edges);
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
  const regenerateNode = useWorkflowStore((s) => s.regenerateNode);
  const currentNodeIds = useWorkflowStore((s) => s.currentNodeIds);

  const stitchData = nodes.find((n) => n.id === STUDIO_NODES.videoStitchFinal)
    ?.data as VideoStitchNodeData | undefined;

  const isStitching = stitchData?.status === "loading";
  const hasOutput = !!stitchData?.outputVideo;
  // Only disable when this specific node is already running
  const isNodeBusy = currentNodeIds.includes(STUDIO_NODES.videoStitchFinal);

  // Get the connected video clips in edge/clip order
  const videoEdges = edges.filter(
    (e) => e.target === STUDIO_NODES.videoStitchFinal && e.targetHandle?.startsWith("video-")
  );

  const clipOrder = stitchData?.clipOrder || [];

  // Build ordered clips: respect clipOrder if available, else use edge order
  const allClips = videoEdges.map((edge) => {
    const srcNode = nodes.find((n) => n.id === edge.source);
    const videoData = (srcNode?.data as GenerateVideoNodeData | undefined)?.outputVideo || null;
    return { edgeId: edge.id, sourceId: edge.source, videoData };
  });

  const orderedClips = clipOrder.length > 0
    ? clipOrder
        .map((eid) => allClips.find((c) => c.edgeId === eid))
        .filter((c): c is NonNullable<typeof c> => !!c)
        .concat(allClips.filter((c) => !clipOrder.includes(c.edgeId)))
    : allClips;

  const readyClips = orderedClips.filter((c) => c.videoData);

  // Move a clip up/down in order
  const moveClip = useCallback(
    (edgeId: string, direction: "up" | "down") => {
      const currentOrder = clipOrder.length > 0 ? [...clipOrder] : orderedClips.map((c) => c.edgeId);
      const idx = currentOrder.indexOf(edgeId);
      if (idx === -1) return;
      const newIdx = direction === "up" ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= currentOrder.length) return;
      [currentOrder[idx], currentOrder[newIdx]] = [currentOrder[newIdx], currentOrder[idx]];
      updateNodeData(STUDIO_NODES.videoStitchFinal, { clipOrder: currentOrder });
    },
    [clipOrder, orderedClips, updateNodeData]
  );

  const handleStitch = useCallback(() => {
    regenerateNode(STUDIO_NODES.videoStitchFinal);
  }, [regenerateNode]);

  const handleClear = useCallback(() => {
    updateNodeData(STUDIO_NODES.videoStitchFinal, { outputVideo: null, status: "idle" });
  }, [updateNodeData]);

  const activePreset = stitchData?.speedPreset ?? null;

  return (
    <div className="flex flex-col gap-3 py-4">
      {/* Clip list */}
      <div className="bg-neutral-900 rounded-xl p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-medium text-neutral-300">Clip Order</h3>
          <span className="text-[10px] text-neutral-500">{readyClips.length} of {orderedClips.length} ready</span>
        </div>

        {orderedClips.length === 0 ? (
          <p className="text-xs text-neutral-500 text-center py-4">
            Generate videos in the previous steps first
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {orderedClips.map((clip, idx) => {
              const label = VIDEO_LABELS[clip.sourceId] || clip.sourceId;
              const isReady = !!clip.videoData;
              return (
                <div
                  key={clip.edgeId}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg ${
                    isReady ? "bg-neutral-800" : "bg-neutral-800/40"
                  }`}
                >
                  <span className="text-[10px] font-mono text-neutral-500 w-4">{idx + 1}</span>
                  <span className={`flex-1 text-xs ${isReady ? "text-neutral-200" : "text-neutral-600"}`}>
                    {label}
                  </span>
                  {isReady ? (
                    <span className="text-[9px] text-emerald-400">✓ ready</span>
                  ) : (
                    <span className="text-[9px] text-neutral-600">not generated</span>
                  )}
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => moveClip(clip.edgeId, "up")}
                      disabled={idx === 0}
                      className="w-5 h-4 flex items-center justify-center text-neutral-500 hover:text-white disabled:opacity-20 transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => moveClip(clip.edgeId, "down")}
                      disabled={idx === orderedClips.length - 1}
                      className="w-5 h-4 flex items-center justify-center text-neutral-500 hover:text-white disabled:opacity-20 transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Loop + Speed Ramp controls */}
      {readyClips.length >= 2 && (
        <div className="bg-neutral-900 rounded-xl p-3 flex flex-col gap-3">
          {/* Loop selector */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-neutral-400 w-16">Loop</span>
            <div className="flex gap-1.5">
              {([1, 2, 3] as const).map((count) => (
                <button
                  key={count}
                  onClick={() => updateNodeData(STUDIO_NODES.videoStitchFinal, { loopCount: count })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    (stitchData?.loopCount || 1) === count
                      ? "bg-white text-neutral-900"
                      : "bg-neutral-800 text-neutral-400 hover:text-white"
                  }`}
                >
                  {count}×
                </button>
              ))}
            </div>
          </div>

          {/* Speed Ramp presets */}
          <div className="flex flex-col gap-2">
            <span className="text-xs text-neutral-400">Speed Ramp</span>
            <div className="grid grid-cols-3 gap-1.5">
              {SPEED_PRESETS.map((preset) => (
                <button
                  key={preset.id ?? "none"}
                  onClick={() => updateNodeData(STUDIO_NODES.videoStitchFinal, { speedPreset: preset.id })}
                  className={`flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg text-center transition-colors ${
                    activePreset === preset.id
                      ? "bg-blue-600 text-white"
                      : "bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700"
                  }`}
                >
                  <span className="text-[11px] font-medium">{preset.label}</span>
                  <span className={`text-[9px] ${activePreset === preset.id ? "text-blue-200" : "text-neutral-500"}`}>
                    {preset.description}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Stitch button */}
      {readyClips.length >= 2 && (
        <button
          onClick={handleStitch}
          disabled={isStitching || isNodeBusy}
          className={`w-full h-11 text-white text-sm font-medium rounded-xl transition-colors active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
            hasOutput ? "bg-neutral-800 hover:bg-neutral-700" : "bg-blue-600 hover:bg-blue-500"
          }`}
        >
          {isStitching ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Stitching... {stitchData?.progress ? `${Math.round(stitchData.progress)}%` : ""}
            </>
          ) : hasOutput ? (
            "Re-stitch"
          ) : (
            "Stitch All Clips"
          )}
        </button>
      )}

      {readyClips.length < 2 && readyClips.length > 0 && (
        <p className="text-xs text-neutral-500 text-center">Need at least 2 ready clips to stitch</p>
      )}

      {/* Output video */}
      {hasOutput && stitchData?.outputVideo && (
        <div className="bg-neutral-900 rounded-xl p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-medium text-neutral-300">Final Animation</h3>
            <div className="flex items-center gap-2">
              <DownloadButton
                dataUrl={stitchData.outputVideo}
                filename={`property-animation-${Date.now()}.mp4`}
                label="Download"
                className="text-[10px] bg-neutral-700 text-white px-2.5 py-1.5 rounded-lg hover:bg-neutral-600 transition-colors flex items-center gap-1"
              />
              <button
                onClick={handleClear}
                className="text-[10px] text-neutral-500 hover:text-red-400 transition-colors px-2 py-1"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="w-full aspect-video rounded-lg overflow-hidden bg-black">
            <video
              src={stitchData.outputVideo}
              controls
              autoPlay
              loop
              playsInline
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
