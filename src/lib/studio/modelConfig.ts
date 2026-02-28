import type { SelectedModel } from "@/types/providers";

/** Studio image model keys. */
export type StudioImageModel = "gpt-1.5" | "nano-banana-2";

export interface StudioModelInfo {
  modelId: string;
  displayName: string;
  costPerRun: number;
  supportedAspectRatios: string[];
}

export const STUDIO_IMAGE_MODELS: Record<StudioImageModel, StudioModelInfo> = {
  "gpt-1.5": {
    modelId: "gpt-image/1.5-image-to-image",
    displayName: "GPT 1.5",
    costPerRun: 0.06,
    supportedAspectRatios: ["1:1", "2:3", "3:2"],
  },
  "nano-banana-2": {
    modelId: "gemini-pro",
    displayName: "Nano Banana 2",
    costPerRun: 0.04,
    supportedAspectRatios: ["1:1", "1:4", "1:8", "2:3", "3:2", "3:4", "4:1", "4:3", "4:5", "5:4", "8:1", "9:16", "16:9", "21:9"],
  },
};

/** Default model per wizard step key. */
export const STEP_DEFAULT_MODEL: Record<string, StudioImageModel> = {
  "2": "gpt-1.5",            // Enhanced Map → GPT 1.5 (cheapest)
  "3-street": "gpt-1.5",     // Street Enhancement → GPT 1.5
  "3-building": "nano-banana-2", // Building → Nano Banana 2 (better quality)
  "4": "nano-banana-2",    // Angles  → Nano Banana 2
};

/** Get the aspect-ratio button config for a given model. */
export function getAspectRatiosForModel(model: StudioImageModel) {
  const supported = STUDIO_IMAGE_MODELS[model].supportedAspectRatios;
  const all = [
    { value: "3:2", label: "3:2", recommended: true },
    { value: "16:9", label: "16:9", recommended: false },
    { value: "9:16", label: "9:16", recommended: false },
    { value: "1:1", label: "1:1", recommended: false },
    { value: "2:3", label: "2:3", recommended: false },
  ];
  return all.filter((ar) => supported.includes(ar.value));
}

/** Build a SelectedModel object for a node from a StudioImageModel key. */
export function getSelectedModel(model: StudioImageModel): SelectedModel {
  const info = STUDIO_IMAGE_MODELS[model];
  return {
    provider: "kie",
    modelId: info.modelId,
    displayName: info.displayName,
    pricing: { type: "per-run", amount: info.costPerRun },
  };
}
