"use client";

import { useWorkflowStore } from "@/store/workflowStore";
import { DownloadButton } from "../shared/DownloadButton";
import type { GenerateVideoNodeData } from "@/types";

const VIDEO_NODES = [
  { id: "generateVideo-map-area", label: "V0 · Area Popup" },
  { id: "generateVideo-1", label: "V1 · Aerial Dive" },
  { id: "generateVideo-2", label: "V2 · Construction Rise" },
  { id: "generateVideo-3", label: "V3 · Build Complete" },
  { id: "generateVideo-4", label: "V4 · Street to Aerial" },
  { id: "generateVideo-5", label: "V5 · Aerial to Balcony" },
  { id: "generateVideo-6", label: "V6 · Balcony to Interior" },
];

export function VideoStitchStep() {
  const nodes = useWorkflowStore((s) => s.nodes);

  const clips = VIDEO_NODES.map(({ id, label }) => {
    const node = nodes.find((n) => n.id === id);
    const videoData = (node?.data as GenerateVideoNodeData | undefined)?.outputVideo || null;
    return { id, label, videoData };
  });

  const readyClips = clips.filter((c) => c.videoData);

  return (
    <div className="flex flex-col gap-3 py-4">
      {/* EasyPeasyEase guidance */}
      <div className="bg-gradient-to-br from-emerald-950/60 to-neutral-900 rounded-xl p-4 border border-emerald-800/40">
        <h3 className="text-sm font-semibold text-emerald-300 mb-2">
          Stitch & add ease curves
        </h3>
        <p className="text-xs text-neutral-300 leading-relaxed mb-2">
          Download each clip below, then combine them with ease curves at{" "}
          <a
            href="https://easypeasyease.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 underline underline-offset-2 hover:text-emerald-300 transition-colors font-medium"
          >
            EasyPeasyEase
          </a>
          {" "}&mdash; a free tool for stitching and applying ease curves to short videos.
        </p>
        <div className="flex items-start gap-2 bg-amber-950/40 border border-amber-800/40 rounded-lg px-3 py-2 mb-3">
          <svg className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <p className="text-[11px] text-amber-200/80 leading-relaxed">
            <span className="font-semibold text-amber-300">Open on desktop.</span>{" "}
            EasyPeasyEase uses hardware-accelerated video processing and needs to run on a desktop browser. It won't work on mobile.
          </p>
        </div>
      </div>

      {/* Clip list with download buttons */}
      <div className="bg-neutral-900 rounded-xl p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-medium text-neutral-300">Your Clips</h3>
          <span className="text-[10px] text-neutral-500">
            {readyClips.length} of {clips.length} ready
          </span>
        </div>

        {readyClips.length === 0 ? (
          <p className="text-xs text-neutral-500 text-center py-4">
            Generate videos in the previous steps first
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {clips.map((clip) => (
              <div
                key={clip.id}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-lg ${
                  clip.videoData ? "bg-neutral-800" : "bg-neutral-800/40"
                }`}
              >
                <span
                  className={`flex-1 text-xs ${
                    clip.videoData ? "text-neutral-200" : "text-neutral-600"
                  }`}
                >
                  {clip.label}
                </span>
                {clip.videoData ? (
                  <DownloadButton
                    dataUrl={clip.videoData}
                    filename={`${clip.id}.mp4`}
                    label="Download"
                    className="text-[10px] bg-neutral-700 text-white px-2.5 py-1 rounded-lg hover:bg-neutral-600 transition-colors flex items-center gap-1"
                  />
                ) : (
                  <span className="text-[9px] text-neutral-600">not generated</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
