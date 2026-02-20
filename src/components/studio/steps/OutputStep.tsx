"use client";

import { useCallback } from "react";
import { useWorkflowStore } from "@/store/workflowStore";
import { useStudioStore } from "@/store/studioStore";
import { STUDIO_NODES } from "@/lib/studio/nodeMap";
import { getPresetTemplate } from "@/lib/quickstart/templates";
import { clearStudioState } from "@/lib/studio/persistence";
import { DownloadButton } from "../shared/DownloadButton";
import type { GenerateImageNodeData, GenerateVideoNodeData } from "@/types";

const IMAGE_ITEMS = [
  { nodeId: STUDIO_NODES.generateMap, label: "Clean Map" },
  { nodeId: STUDIO_NODES.generateMapFrame2, label: "Map with Area" },
  { nodeId: STUDIO_NODES.generateStreet, label: "Enhanced Street" },
  { nodeId: STUDIO_NODES.generateHalfBuilding, label: "Half Building" },
  { nodeId: STUDIO_NODES.generateFullBuilding, label: "Full Building" },
  { nodeId: STUDIO_NODES.generateAngleAerialDrone, label: "Aerial Drone" },
  { nodeId: STUDIO_NODES.generateAngleBalcony, label: "Balcony" },
  { nodeId: STUDIO_NODES.generateAngleInterior, label: "Interior" },
] as const;

const VIDEO_ITEMS = [
  { nodeId: STUDIO_NODES.generateVideoV0, label: "V0: Area Popup", filename: "area-popup" },
  { nodeId: STUDIO_NODES.generateVideoV1, label: "V1: Aerial Dive", filename: "aerial-dive" },
  { nodeId: STUDIO_NODES.generateVideoV2, label: "V2: Construction Rise", filename: "construction-rise" },
  { nodeId: STUDIO_NODES.generateVideoV3, label: "V3: Construction Complete", filename: "construction-complete" },
  { nodeId: STUDIO_NODES.generateVideoV4, label: "V4: Street to Aerial", filename: "street-aerial" },
  { nodeId: STUDIO_NODES.generateVideoV5, label: "V5: Aerial to Balcony", filename: "aerial-balcony" },
  { nodeId: STUDIO_NODES.generateVideoV6, label: "V6: Balcony to Interior", filename: "balcony-interior" },
] as const;

export function OutputStep() {
  const nodes = useWorkflowStore((s) => s.nodes);
  const loadWorkflow = useWorkflowStore((s) => s.loadWorkflow);
  const reset = useStudioStore((s) => s.reset);
  const setInitialized = useStudioStore((s) => s.setInitialized);

  // Collect available images
  const availableImages = IMAGE_ITEMS.map((item) => {
    const data = nodes.find((n) => n.id === item.nodeId)?.data as GenerateImageNodeData | undefined;
    return { ...item, url: data?.outputImage || null };
  }).filter((item) => item.url);

  // Collect available videos
  const availableVideos = VIDEO_ITEMS.map((item) => {
    const data = nodes.find((n) => n.id === item.nodeId)?.data as GenerateVideoNodeData | undefined;
    return { ...item, url: data?.outputVideo || null };
  }).filter((item) => item.url);

  const hasContent = availableImages.length > 0 || availableVideos.length > 0;

  const handleDownloadAll = useCallback(() => {
    for (const img of availableImages) {
      if (!img.url) continue;
      const a = document.createElement("a");
      a.href = img.url;
      a.download = `property-${img.label.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    for (const vid of availableVideos) {
      if (!vid.url) continue;
      const a = document.createElement("a");
      a.href = vid.url;
      a.download = `property-${vid.filename}-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }, [availableImages, availableVideos]);

  const handleShare = useCallback(async () => {
    if (!navigator.share || availableVideos.length === 0) return;

    try {
      const firstVideo = availableVideos[0];
      if (!firstVideo?.url) return;
      const response = await fetch(firstVideo.url);
      const blob = await response.blob();
      const file = new File([blob], "property-animation.mp4", { type: "video/mp4" });
      await navigator.share({
        title: "Property Animation",
        text: "Check out this property animation!",
        files: [file],
      });
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        try {
          await navigator.share({
            title: "Property Animation",
            text: "Check out this property animation!",
          });
        } catch {
          // Share not available
        }
      }
    }
  }, [availableVideos]);

  const handleStartOver = useCallback(async () => {
    await clearStudioState();
    reset();
    const workflow = getPresetTemplate("real-estate-map-animation", "minimal");
    await loadWorkflow(workflow);
    setInitialized(true);
  }, [reset, loadWorkflow, setInitialized]);

  if (!hasContent) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <svg
          className="w-12 h-12 text-neutral-700"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V4.5a1.5 1.5 0 00-1.5-1.5H3.75a1.5 1.5 0 00-1.5 1.5v15a1.5 1.5 0 001.5 1.5z"
          />
        </svg>
        <p className="text-sm text-neutral-500">
          Generate images and videos first to see your animation here
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 py-4">
      {/* Images section */}
      {availableImages.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-medium text-neutral-400 uppercase tracking-wide">
            Images ({availableImages.length})
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {availableImages.map((img) => (
              <div key={img.nodeId} className="flex flex-col gap-1">
                <div className="relative aspect-square rounded-lg overflow-hidden bg-neutral-900">
                  <img
                    src={img.url!}
                    alt={img.label}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-1 right-1">
                    <DownloadButton
                      dataUrl={img.url}
                      filename={`property-${img.label.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.png`}
                      label=""
                      className="bg-black/60 text-white p-1 rounded hover:bg-black/80 transition-colors flex items-center"
                    />
                  </div>
                </div>
                <span className="text-[10px] text-neutral-500 truncate">{img.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Videos section */}
      {availableVideos.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-medium text-neutral-400 uppercase tracking-wide">
            Videos ({availableVideos.length})
          </h3>
          {availableVideos.map((vid, i) => (
            <div key={vid.nodeId} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-neutral-300">{vid.label}</span>
                <DownloadButton
                  dataUrl={vid.url}
                  filename={`property-${vid.filename}-${Date.now()}.mp4`}
                />
              </div>
              <div className="w-full aspect-video rounded-xl overflow-hidden bg-black">
                <video
                  src={vid.url!}
                  controls
                  playsInline
                  autoPlay={i === 0}
                  loop
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleDownloadAll}
          className="flex-1 h-11 bg-white text-neutral-900 rounded-xl font-medium text-sm hover:bg-neutral-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Download All
        </button>

        {typeof window !== "undefined" && "share" in navigator && (
          <button
            onClick={handleShare}
            className="h-11 px-4 bg-neutral-800 text-white rounded-xl font-medium text-sm hover:bg-neutral-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
            </svg>
            Share
          </button>
        )}
      </div>

      {/* Start over */}
      <div className="pt-4 border-t border-neutral-800">
        <button
          onClick={handleStartOver}
          className="w-full h-10 text-neutral-400 hover:text-white text-sm transition-colors"
        >
          Start New Animation
        </button>
      </div>
    </div>
  );
}
