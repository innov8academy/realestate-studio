"use client";

import { useCallback } from "react";
import { useWorkflowStore } from "@/store/workflowStore";
import { useAnnotationStore } from "@/store/annotationStore";
import { STUDIO_NODES } from "@/lib/studio/nodeMap";
import type { ImageInputNodeData, AnnotationNodeData } from "@/types";

interface AnnotateCardProps {
  label: string;
  imageNodeId: string;
  annotationNodeId: string;
}

function AnnotateCard({ label, imageNodeId, annotationNodeId }: AnnotateCardProps) {
  const nodes = useWorkflowStore((s) => s.nodes);
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
  const openModal = useAnnotationStore((s) => s.openModal);

  const imageData = nodes.find((n) => n.id === imageNodeId)?.data as ImageInputNodeData | undefined;
  const annotationData = nodes.find((n) => n.id === annotationNodeId)?.data as AnnotationNodeData | undefined;

  const sourceImage = imageData?.image;
  const isAnnotated = !!annotationData?.outputImage;
  const annotationCount = annotationData?.annotations?.length || 0;
  const displayImage = annotationData?.outputImage || sourceImage;

  const handleAnnotate = useCallback(() => {
    if (!sourceImage) return;

    // Set the sourceImage on the annotation node before opening
    updateNodeData(annotationNodeId, { sourceImage });

    // Open the annotation modal
    openModal(
      annotationNodeId,
      sourceImage,
      annotationData?.annotations || []
    );
  }, [sourceImage, annotationNodeId, updateNodeData, openModal, annotationData?.annotations]);

  if (!sourceImage) {
    return (
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-white">{label}</h3>
        <div className="w-full aspect-[4/3] border border-dashed border-neutral-700 rounded-xl flex items-center justify-center">
          <span className="text-xs text-neutral-500">
            Upload an image first
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white">{label}</h3>
        {isAnnotated && (
          <span className="flex items-center gap-1 text-xs text-emerald-400">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {annotationCount} annotation{annotationCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div
        className="relative w-full aspect-[4/3] rounded-xl overflow-hidden cursor-pointer group"
        onClick={handleAnnotate}
      >
        <img
          src={displayImage!}
          alt={label}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 group-active:bg-black/30 transition-colors flex items-center justify-center">
          <span className="text-white text-xs bg-black/60 px-3 py-1.5 rounded-lg opacity-80 group-hover:opacity-100 transition-opacity">
            {isAnnotated ? "Edit boundaries" : "Draw boundaries"}
          </span>
        </div>
        {!isAnnotated && (
          <div className="absolute top-2 right-2 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}

export function AnnotateStep() {
  return (
    <div className="flex flex-col gap-6 py-4">
      <p className="text-xs text-neutral-400 text-center">
        Tap each image to draw the plot boundary. Use shapes and freehand drawing to mark the area.
      </p>
      <AnnotateCard
        label="Satellite Map"
        imageNodeId={STUDIO_NODES.imageInputMap}
        annotationNodeId={STUDIO_NODES.annotationMap}
      />
      <AnnotateCard
        label="Street View"
        imageNodeId={STUDIO_NODES.imageInputStreet}
        annotationNodeId={STUDIO_NODES.annotationStreet}
      />
    </div>
  );
}
