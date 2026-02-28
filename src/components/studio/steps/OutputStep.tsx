"use client";

import { useCallback, useState } from "react";
import { useWorkflowStore } from "@/store/workflowStore";
import { useStudioStore } from "@/store/studioStore";
import { STUDIO_NODES } from "@/lib/studio/nodeMap";
import { getPresetTemplate } from "@/lib/quickstart/templates";
import { clearStudioState } from "@/lib/studio/persistence";
import JSZip from "jszip";
import type { GenerateImageNodeData, GenerateVideoNodeData } from "@/types";

const APP_URL = "https://realestate-studio-production.up.railway.app";
const SHARE_TEXT = "Check out this AI property animation tool";

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
  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  // Collect available content for download
  const availableImages = IMAGE_ITEMS.map((item) => {
    const data = nodes.find((n) => n.id === item.nodeId)?.data as GenerateImageNodeData | undefined;
    return { ...item, url: data?.outputImage || null };
  }).filter((item) => item.url);

  const availableVideos = VIDEO_ITEMS.map((item) => {
    const data = nodes.find((n) => n.id === item.nodeId)?.data as GenerateVideoNodeData | undefined;
    return { ...item, url: data?.outputVideo || null };
  }).filter((item) => item.url);

  const handleDownloadAll = useCallback(async () => {
    if (isZipping) return;
    setIsZipping(true);

    try {
      const zip = new JSZip();

      // Add images to ZIP
      for (const img of availableImages) {
        if (!img.url) continue;
        const name = `property-${img.label.toLowerCase().replace(/\s+/g, "-")}.png`;

        if (img.url.startsWith("data:")) {
          // Strip data URL prefix and add as base64
          const base64Data = img.url.replace(/^data:image\/\w+;base64,/, "");
          zip.file(name, base64Data, { base64: true });
        } else {
          // HTTP URL — fetch as blob
          const response = await fetch(img.url);
          const blob = await response.blob();
          zip.file(name, blob);
        }
      }

      // Add videos to ZIP
      for (const vid of availableVideos) {
        if (!vid.url) continue;
        const name = `property-${vid.filename}.mp4`;

        if (vid.url.startsWith("data:")) {
          // Strip data URL prefix and add as base64
          const base64Data = vid.url.replace(/^data:[^;]+;base64,/, "");
          zip.file(name, base64Data, { base64: true });
        } else {
          // HTTP URL — fetch as blob
          const response = await fetch(vid.url);
          const blob = await response.blob();
          zip.file(name, blob);
        }
      }

      // Generate ZIP and trigger download
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `property-animation-${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to create ZIP:", error);
    } finally {
      setIsZipping(false);
    }
  }, [isZipping, availableImages, availableVideos]);

  const handleShare = useCallback(async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "AI Property Animation",
          text: SHARE_TEXT,
          url: APP_URL,
        });
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
      }
    } else {
      // Fallback: copy link
      await navigator.clipboard.writeText(APP_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, []);

  const handleStartOver = useCallback(async () => {
    await clearStudioState();
    reset();
    const workflow = getPresetTemplate("real-estate-map-animation", "minimal");
    await loadWorkflow(workflow);
    setInitialized(true);
  }, [reset, loadWorkflow, setInitialized]);

  const totalFiles = availableImages.length + availableVideos.length;

  return (
    <div className="flex flex-col gap-5 py-6">
      {/* Share CTA */}
      <div className="flex flex-col items-center text-center gap-4 px-4">
        <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
          </svg>
        </div>
        <p className="text-sm text-neutral-300">
          Know someone in real estate? Share this with them.
        </p>
        <button
          onClick={handleShare}
          className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
          </svg>
          {copied ? "Link Copied!" : "Share with a Friend"}
        </button>
      </div>

      {/* Divider */}
      <div className="border-t border-neutral-800" />

      {/* Download All */}
      {totalFiles > 0 && (
        <button
          onClick={handleDownloadAll}
          disabled={isZipping}
          className={`w-full h-11 text-white rounded-xl font-medium text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${
            isZipping
              ? "bg-neutral-700 cursor-not-allowed"
              : "bg-neutral-800 hover:bg-neutral-700"
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          {isZipping ? "Creating ZIP..." : `Download All (${totalFiles} files)`}
        </button>
      )}

      {/* Start over */}
      <button
        onClick={handleStartOver}
        className="w-full h-10 text-neutral-500 hover:text-white text-sm transition-colors"
      >
        Start New Animation
      </button>
    </div>
  );
}
