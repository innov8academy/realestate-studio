"use client";

import { useCallback, useId, useRef } from "react";
import { useWorkflowStore } from "@/store/workflowStore";
import { useStudioStore } from "@/store/studioStore";
import { STUDIO_NODES } from "@/lib/studio/nodeMap";
import type { ImageInputNodeData } from "@/types";

interface UploadCardProps {
  label: string;
  description: string;
  nodeId: string;
  image: string | null;
}

function UploadCard({ label, description, nodeId, image }: UploadCardProps) {
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Accept common image types (including jpg, jfif, avif, etc.)
      const isImage = file.type.startsWith("image/") ||
        /\.(png|jpe?g|webp|jfif|avif|bmp|gif)$/i.test(file.name);
      if (!isImage) {
        alert("Unsupported format. Use PNG, JPG, or WebP.");
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        alert("Image too large. Maximum size is 10MB.");
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        if (!base64) return;
        const img = new window.Image();
        img.onload = () => {
          updateNodeData(nodeId, {
            image: base64,
            filename: file.name,
            dimensions: { width: img.width, height: img.height },
          } as Partial<ImageInputNodeData>);
        };
        img.onerror = () => {
          // Still store the image even if dimensions can't be read
          updateNodeData(nodeId, {
            image: base64,
            filename: file.name,
            dimensions: null,
          } as Partial<ImageInputNodeData>);
        };
        img.src = base64;
      };
      reader.readAsDataURL(file);

      // Reset the input value so the same file can be re-selected
      e.target.value = "";
    },
    [nodeId, updateNodeData]
  );

  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      updateNodeData(nodeId, {
        image: null,
        filename: null,
        dimensions: null,
      } as Partial<ImageInputNodeData>);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [nodeId, updateNodeData]
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-white">{label}</h3>
          <p className="text-xs text-neutral-500">{description}</p>
        </div>
        {image && (
          <button
            onClick={handleRemove}
            className="text-xs text-red-400 hover:text-red-300"
          >
            Remove
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="sr-only"
      />

      {image ? (
        <label
          htmlFor={inputId}
          className="relative w-full aspect-[4/3] rounded-xl overflow-hidden cursor-pointer group block"
        >
          <img
            src={image}
            alt={label}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <span className="text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 px-3 py-1.5 rounded-lg">
              Tap to change
            </span>
          </div>
        </label>
      ) : (
        <label
          htmlFor={inputId}
          className="w-full aspect-[4/3] border-2 border-dashed border-neutral-700 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-neutral-600 hover:bg-neutral-900/50 transition-colors active:scale-[0.98] cursor-pointer"
        >
          <svg
            className="w-8 h-8 text-neutral-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v13.5a1.5 1.5 0 001.5 1.5z"
            />
          </svg>
          <span className="text-xs text-neutral-500">
            Tap to upload image
          </span>
        </label>
      )}
    </div>
  );
}

export function UploadStep() {
  const nodes = useWorkflowStore((s) => s.nodes);
  const plotSquareMeters = useStudioStore((s) => s.plotSquareMeters);
  const setPlotSquareMeters = useStudioStore((s) => s.setPlotSquareMeters);

  const mapData = nodes.find((n) => n.id === STUDIO_NODES.imageInputMap)
    ?.data as ImageInputNodeData | undefined;
  const streetData = nodes.find((n) => n.id === STUDIO_NODES.imageInputStreet)
    ?.data as ImageInputNodeData | undefined;

  return (
    <div className="flex flex-col gap-6 py-4">
      <UploadCard
        label="Satellite / Map View"
        description="Upload a satellite or Google Maps screenshot of the plot"
        nodeId={STUDIO_NODES.imageInputMap}
        image={mapData?.image || null}
      />
      <UploadCard
        label="Street View"
        description="Upload a street-level photo or Google Earth 3D view"
        nodeId={STUDIO_NODES.imageInputStreet}
        image={streetData?.image || null}
      />

      {/* Plot area input */}
      <div className="flex flex-col gap-1.5 pt-2 border-t border-neutral-800">
        <label className="text-sm font-medium text-white">
          Plot Area <span className="text-amber-400 font-normal">*</span>
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            value={plotSquareMeters ?? ""}
            onChange={(e) =>
              setPlotSquareMeters(e.target.value ? Number(e.target.value) : null)
            }
            placeholder="e.g. 1200"
            className="flex-1 h-10 bg-neutral-900 border border-neutral-700 rounded-xl px-3 text-sm text-white placeholder:text-neutral-600 focus:border-neutral-500 focus:outline-none transition-colors"
          />
          <span className="text-sm text-neutral-400 whitespace-nowrap">sq.m</span>
        </div>
        <p className="text-xs text-neutral-500">
          Total area of the plot — will be shown on the enhanced map visualization
        </p>
      </div>
    </div>
  );
}
