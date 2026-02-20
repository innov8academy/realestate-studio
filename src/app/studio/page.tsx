"use client";

import { useEffect, useRef, useCallback } from "react";
import { StudioWizard } from "@/components/studio/StudioWizard";
import { useStudioStore } from "@/store/studioStore";
import { LoadingPhrase } from "@/components/studio/shared/LoadingPhrase";
import { useWorkflowStore, type WorkflowFile } from "@/store/workflowStore";
import { getPresetTemplate, PROMPTS as CODE_PROMPTS } from "@/lib/quickstart/templates";
import { AnnotationModal } from "@/components/AnnotationModal";
import { configureNodesForProvider } from "@/lib/studio/nodeMap";
import {
  saveStudioState,
  loadStudioState,
  type StudioSnapshot,
} from "@/lib/studio/persistence";

/** Build a WorkflowFile snapshot from the current store state. */
function captureWorkflow(): WorkflowFile {
  const { nodes, edges, edgeStyle, groups } = useWorkflowStore.getState();
  return {
    version: 1,
    name: "studio-session",
    nodes: nodes.map(({ selected, ...rest }) => rest),
    edges,
    edgeStyle,
    groups: groups && Object.keys(groups).length > 0 ? groups : undefined,
  };
}

export default function StudioPage() {
  const loadWorkflow = useWorkflowStore((state) => state.loadWorkflow);
  const isInitialized = useStudioStore((state) => state.isInitialized);
  const setInitialized = useStudioStore((state) => state.setInitialized);
  const setStep = useStudioStore((state) => state.setStep);
  const hasInit = useRef(false);

  // ─── Initialization: restore saved state OR load fresh template ───
  useEffect(() => {
    if (hasInit.current) return;
    hasInit.current = true;

    (async () => {
      // Try to restore a previous session from IndexedDB
      const saved = await loadStudioState();

      if (saved) {
        // Restore the saved workflow
        await loadWorkflow(saved.workflow as WorkflowFile);
        setStep(saved.wizardStep);
        // Restore studio-specific state
        if (saved.plotSquareMeters !== undefined) {
          useStudioStore.getState().setPlotSquareMeters(saved.plotSquareMeters ?? null);
        }
        if (saved.aspectRatio) {
          useStudioStore.getState().setAspectRatio(saved.aspectRatio);
        }
        if (saved.videoDuration) {
          useStudioStore.getState().setVideoDuration(saved.videoDuration);
        }
        if (saved.buildingReferenceImage !== undefined) {
          useStudioStore.getState().setBuildingReferenceImage(saved.buildingReferenceImage ?? null);
        }
        if (saved.buildingDescription) {
          useStudioStore.getState().setBuildingDescription(saved.buildingDescription);
        }
      } else {
        // First time — load the preset template
        const workflow = getPresetTemplate("real-estate-map-animation", "minimal");
        await loadWorkflow(workflow);
      }

      // Configure nodes for the correct provider
      const store = useWorkflowStore.getState();
      const settings = store.providerSettings;
      const hasKie = !!settings?.providers?.kie?.apiKey;
      const provider = hasKie ? ("kie" as const) : ("gemini" as const);
      configureNodesForProvider(store.updateNodeData, provider);

      // Fetch effective prompts — admin overrides take precedence over code defaults
      let P: Record<string, string> = CODE_PROMPTS as Record<string, string>;
      try {
        const res = await fetch("/api/studio/prompts");
        if (res.ok) P = await res.json();
      } catch {
        // fall back to code defaults silently
      }

      // Backfill any empty prompt nodes with template defaults.
      // This handles stale IndexedDB sessions where prompts were saved empty.
      // Use no-ref prompts by default; they auto-switch to ref versions when reference is uploaded.
      const hasReference = !!useStudioStore.getState().buildingReferenceImage;
      const defaultPrompts: Record<string, string> = {
        "prompt-map-enhance": P.mapEnhanceClean,
        "prompt-map-enhance-frame2": P.mapEnhanceWithArea,
        "prompt-street-enhance": P.streetEnhance,
        "prompt-half-building": hasReference ? P.halfBuilding : P.halfBuildingNoRef,
        "prompt-full-building": hasReference ? P.fullBuilding : P.fullBuildingNoRef,
        "prompt-angle-front": P.angleFront,
        "prompt-angle-aerial": P.angleAerial,
        "prompt-angle-corner": P.angleCorner,
        "prompt-video-map-area": P.videoMapAreaPopup,
        "prompt-video-1": P.videoMapToStreet,
        "prompt-video-2": P.videoStreetToHalf,
        "prompt-video-3": P.videoHalfToFull,
        "prompt-video-4": P.videoFullToAerial,
        "prompt-video-5": P.videoAerialToBalcony,
        "prompt-video-6": P.videoBalconyToInterior,
      };
      const currentNodes = useWorkflowStore.getState().nodes;
      for (const [nodeId, defaultPrompt] of Object.entries(defaultPrompts)) {
        const node = currentNodes.find((n) => n.id === nodeId);
        const currentPrompt = (node?.data as { prompt?: string })?.prompt || "";
        if (!currentPrompt.trim()) {
          store.updateNodeData(nodeId, { prompt: defaultPrompt });
        }
      }

      // Force-update prompts that changed significantly — always overwrite regardless of saved content.
      store.updateNodeData("prompt-angle-aerial", { prompt: P.angleAerial });
      store.updateNodeData("prompt-angle-corner", { prompt: P.angleCorner });
      store.updateNodeData("prompt-video-map-area", { prompt: P.videoMapAreaPopup });

      // Substitute {AREA} placeholder in Frame 2 prompt with actual value
      const sqm = useStudioStore.getState().plotSquareMeters;
      if (sqm && sqm > 0) {
        const frame2Node = useWorkflowStore.getState().nodes.find((n) => n.id === "prompt-map-enhance-frame2");
        const frame2Prompt = (frame2Node?.data as { prompt?: string })?.prompt || "";
        if (frame2Prompt.includes("{AREA}")) {
          store.updateNodeData("prompt-map-enhance-frame2", {
            prompt: frame2Prompt.replace("{AREA}", `${sqm} sq.m`),
          });
        }
      }

      // Inject VideoStitch node into existing sessions if missing
      const hasStitchNode = useWorkflowStore.getState().nodes.find((n) => n.id === "videoStitch-final");
      if (!hasStitchNode) {
        const { nodes: currentNodes } = useWorkflowStore.getState();
        useWorkflowStore.setState({
          nodes: [
            ...currentNodes,
            {
              id: "videoStitch-final",
              type: "videoStitch",
              position: { x: 3360, y: 100 },
              data: {
                clips: [],
                clipOrder: [],
                outputVideo: null,
                loopCount: 1,
                speedPreset: null,
                status: "idle",
                error: null,
                progress: 0,
                encoderSupported: null,
              },
              style: { width: 520, height: 420 },
            } as any,
          ],
        });
      }

      // Inject missing angle-consistency edges for sessions loaded from IndexedDB.
      // New sessions get these from the template; existing sessions need them patched in.
      const REQUIRED_ANGLE_EDGES = [
        {
          id: "e-angle-front-to-aerial",
          source: "generateImage-angle-front",
          sourceHandle: "image",
          target: "generateImage-angle-aerial",
          targetHandle: "image",
        },
        {
          id: "e-angle-front-to-corner",
          source: "generateImage-angle-front",
          sourceHandle: "image",
          target: "generateImage-angle-corner",
          targetHandle: "image",
        },
      ];
      const REQUIRED_STITCH_EDGES = [
        { id: "e-vid0-to-stitch", source: "generateVideo-map-area", sourceHandle: "video", target: "videoStitch-final", targetHandle: "video-0" },
        { id: "e-vid1-to-stitch", source: "generateVideo-1", sourceHandle: "video", target: "videoStitch-final", targetHandle: "video-1" },
        { id: "e-vid2-to-stitch", source: "generateVideo-2", sourceHandle: "video", target: "videoStitch-final", targetHandle: "video-2" },
        { id: "e-vid3-to-stitch", source: "generateVideo-3", sourceHandle: "video", target: "videoStitch-final", targetHandle: "video-3" },
        { id: "e-vid4-to-stitch", source: "generateVideo-4", sourceHandle: "video", target: "videoStitch-final", targetHandle: "video-4" },
        { id: "e-vid5-to-stitch", source: "generateVideo-5", sourceHandle: "video", target: "videoStitch-final", targetHandle: "video-5" },
        { id: "e-vid6-to-stitch", source: "generateVideo-6", sourceHandle: "video", target: "videoStitch-final", targetHandle: "video-6" },
      ];

      const currentEdges = useWorkflowStore.getState().edges;
      const edgeIds = new Set(currentEdges.map((e) => e.id));
      const missingEdges = [
        ...REQUIRED_ANGLE_EDGES,
        ...REQUIRED_STITCH_EDGES,
      ].filter((e) => !edgeIds.has(e.id));
      if (missingEdges.length > 0) {
        useWorkflowStore.setState({ edges: [...currentEdges, ...missingEdges] });
      }

      setInitialized(true);
    })();
  }, [loadWorkflow, setInitialized, setStep]);

  // ─── Auto-save: debounced write to IndexedDB on every change ───
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const studioState = useStudioStore.getState();
      const snapshot: StudioSnapshot = {
        workflow: captureWorkflow(),
        wizardStep: studioState.currentStep,
        plotSquareMeters: studioState.plotSquareMeters,
        aspectRatio: studioState.aspectRatio,
        videoDuration: studioState.videoDuration,
        buildingReferenceImage: studioState.buildingReferenceImage,
        buildingDescription: studioState.buildingDescription,
        savedAt: Date.now(),
      };
      saveStudioState(snapshot);
    }, 1500); // 1.5s debounce — saves after user stops interacting
  }, []);

  // Subscribe to workflow store changes (node data updates, etc.)
  useEffect(() => {
    if (!isInitialized) return;
    const unsub = useWorkflowStore.subscribe(debouncedSave);
    return () => {
      unsub();
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [isInitialized, debouncedSave]);

  // Subscribe to studio store changes (step navigation)
  useEffect(() => {
    if (!isInitialized) return;
    const unsub = useStudioStore.subscribe(debouncedSave);
    return () => {
      unsub();
    };
  }, [isInitialized, debouncedSave]);

  if (!isInitialized) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          <LoadingPhrase set="setup" className="text-sm text-neutral-400" />
        </div>
      </div>
    );
  }

  return (
    <>
      <StudioWizard />
      <AnnotationModal />
    </>
  );
}
