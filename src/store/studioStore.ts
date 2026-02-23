import { create } from "zustand";
import {
  type StudioImageModel,
  STEP_DEFAULT_MODEL,
  STUDIO_IMAGE_MODELS,
} from "@/lib/studio/modelConfig";

const TOTAL_STEPS = 10;

const DEFAULT_STEP_MODELS: Record<number, StudioImageModel> = { ...STEP_DEFAULT_MODEL };

interface StudioState {
  // Navigation
  currentStep: number;
  totalSteps: number;
  isInitialized: boolean;

  // Studio-specific inputs
  plotSquareMeters: number | null;
  aspectRatio: string; // "3:2" | "1:1" | "2:3"
  videoDuration: string; // "5" | "10"
  buildingReferenceImage: string | null; // base64 data URL
  buildingDescription: string; // optional text description of desired building
  stepModel: Record<number, StudioImageModel>; // per-step model selection

  // Actions
  goNext: () => void;
  goBack: () => void;
  setStep: (step: number) => void;
  setInitialized: (initialized: boolean) => void;
  setPlotSquareMeters: (value: number | null) => void;
  setAspectRatio: (ratio: string) => void;
  setVideoDuration: (duration: string) => void;
  setBuildingReferenceImage: (image: string | null) => void;
  setBuildingDescription: (description: string) => void;
  setStepModel: (step: number, model: StudioImageModel) => void;
  reset: () => void;
}

export const useStudioStore = create<StudioState>((set, get) => ({
  currentStep: 0,
  totalSteps: TOTAL_STEPS,
  isInitialized: false,
  plotSquareMeters: null,
  aspectRatio: "3:2",
  videoDuration: "5",
  buildingReferenceImage: null,
  buildingDescription: "",
  stepModel: { ...DEFAULT_STEP_MODELS },

  goNext: () => {
    const { currentStep, totalSteps } = get();
    if (currentStep < totalSteps - 1) {
      set({ currentStep: currentStep + 1 });
    }
  },

  goBack: () => {
    const { currentStep } = get();
    if (currentStep > 0) {
      set({ currentStep: currentStep - 1 });
    }
  },

  setStep: (step: number) => {
    if (step >= 0 && step < TOTAL_STEPS) {
      set({ currentStep: step });
    }
  },

  setInitialized: (initialized: boolean) => {
    set({ isInitialized: initialized });
  },

  setPlotSquareMeters: (value: number | null) => {
    set({ plotSquareMeters: value });
  },

  setAspectRatio: (ratio: string) => {
    set({ aspectRatio: ratio });
  },

  setVideoDuration: (duration: string) => {
    set({ videoDuration: duration });
  },

  setBuildingReferenceImage: (image: string | null) => {
    set({ buildingReferenceImage: image });
  },

  setBuildingDescription: (description: string) => {
    set({ buildingDescription: description });
  },

  setStepModel: (step: number, model: StudioImageModel) => {
    const { aspectRatio } = get();
    const supported = STUDIO_IMAGE_MODELS[model].supportedAspectRatios;
    const updates: Partial<StudioState> = {
      stepModel: { ...get().stepModel, [step]: model },
    };
    // Auto-correct aspect ratio if unsupported by the new model
    if (!supported.includes(aspectRatio)) {
      updates.aspectRatio = "3:2";
    }
    set(updates);
  },

  reset: () => {
    set({
      currentStep: 0,
      isInitialized: false,
      plotSquareMeters: null,
      aspectRatio: "3:2",
      videoDuration: "5",
      buildingReferenceImage: null,
      buildingDescription: "",
      stepModel: { ...DEFAULT_STEP_MODELS },
    });
  },
}));
