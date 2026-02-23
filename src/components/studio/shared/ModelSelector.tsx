"use client";

import type { StudioImageModel } from "@/lib/studio/modelConfig";
import { STUDIO_IMAGE_MODELS } from "@/lib/studio/modelConfig";

const MODEL_OPTIONS: { key: StudioImageModel; label: string }[] = [
  { key: "gpt-1.5", label: "GPT 1.5" },
  { key: "nano-banana-pro", label: "Nano Banana Pro" },
];

interface ModelSelectorProps {
  value: StudioImageModel;
  onChange: (model: StudioImageModel) => void;
  recommendedModel: StudioImageModel;
  disabled?: boolean;
}

export function ModelSelector({ value, onChange, recommendedModel, disabled }: ModelSelectorProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Model</label>
      <div className="flex gap-1.5">
        {MODEL_OPTIONS.map((opt) => {
          const info = STUDIO_IMAGE_MODELS[opt.key];
          const isSelected = value === opt.key;
          const isRec = opt.key === recommendedModel;
          return (
            <button
              key={opt.key}
              onClick={() => onChange(opt.key)}
              disabled={disabled}
              className={`flex-1 h-9 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                isSelected
                  ? "bg-white text-neutral-900"
                  : "bg-neutral-800 text-neutral-400 hover:text-white"
              }`}
            >
              {opt.label}
              <span className={`ml-1 text-[9px] font-normal ${isSelected ? "text-neutral-500" : "text-neutral-600"}`}>
                ${info.costPerRun}
              </span>
              {isRec && (
                <span className="ml-1 text-[9px] text-emerald-400 font-normal">rec</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
