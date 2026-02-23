import type { SelectedModel } from "@/types/providers";

/** Studio image model keys. */
export type StudioImageModel = "gpt-1.5" | "nano-banana-pro";

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
  "nano-banana-pro": {
    modelId: "gemini-pro",
    displayName: "Nano Banana Pro",
    costPerRun: 0.134,
    supportedAspectRatios: ["1:1", "2:3", "3:2", "16:9"],
  },
};

/** Default model per wizard step index. */
export const STEP_DEFAULT_MODEL: Record<number, StudioImageModel> = {
  2: "gpt-1.5",       // Enhanced Map → GPT 1.5 (cheapest)
  3: "nano-banana-pro", // Building → Nano Banana Pro (better quality)
  4: "nano-banana-pro", // Angles  → Nano Banana Pro
};

/** Get the aspect-ratio button config for a given model. */
export function getAspectRatiosForModel(model: StudioImageModel) {
  const supported = STUDIO_IMAGE_MODELS[model].supportedAspectRatios;
  const all = [
    { value: "3:2", label: "3:2", recommended: true },
    { value: "16:9", label: "16:9", recommended: false },
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
