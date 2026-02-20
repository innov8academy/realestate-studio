"use client";

import { useWorkflowStore } from "@/store/workflowStore";
import { useStudioStore } from "@/store/studioStore";
import { StepHeader } from "./shared/StepHeader";
import { StepFooter } from "./shared/StepFooter";
import { ApiKeySetup } from "./shared/ApiKeySetup";
import { StudioStepCarousel } from "./StudioStepCarousel";
import { STUDIO_NODES } from "@/lib/studio/nodeMap";
import type {
  ImageInputNodeData,
  AnnotationNodeData,
  GenerateImageNodeData,
  GenerateVideoNodeData,
} from "@/types";

export function StudioWizard() {
  const currentStep = useStudioStore((s) => s.currentStep);
  const goNext = useStudioStore((s) => s.goNext);
  const plotSquareMeters = useStudioStore((s) => s.plotSquareMeters);
  const providerSettings = useWorkflowStore((s) => s.providerSettings);
  const nodes = useWorkflowStore((s) => s.nodes);
  const regenerateNode = useWorkflowStore((s) => s.regenerateNode);
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
  const isRunning = useWorkflowStore((s) => s.isRunning);
  const buildingDescription = useStudioStore((s) => s.buildingDescription);

  // Check if Kie API key is configured
  const hasApiKey = providerSettings?.providers?.kie?.apiKey;

  if (!hasApiKey) {
    return <ApiKeySetup />;
  }

  // Helper to get node data by ID
  const getNodeData = (nodeId: string) => {
    return nodes.find((n) => n.id === nodeId)?.data;
  };

  /*
   * Step indices (10 steps):
   *   0: Upload Images
   *   1: Mark Plot Boundaries
   *   2: Enhanced Map
   *   3: Generate Building
   *   4: Building Angles
   *   5: Map Videos (V0, V1)
   *   6: Construction Videos (V2, V3)
   *   7: Showcase Videos (V4, V5, V6)
   *   8: Download & Stitch (EasyPeasyEase)
   *   9: Your Animation (Output)
   */

  // Determine if current step is complete (for footer button state)
  const isStepComplete = (): boolean => {
    switch (currentStep) {
      case 0: {
        const mapData = getNodeData(STUDIO_NODES.imageInputMap) as ImageInputNodeData | undefined;
        const streetData = getNodeData(STUDIO_NODES.imageInputStreet) as ImageInputNodeData | undefined;
        return !!(mapData?.image && streetData?.image && plotSquareMeters && plotSquareMeters > 0);
      }
      case 1: {
        const mapAnnotation = getNodeData(STUDIO_NODES.annotationMap) as AnnotationNodeData | undefined;
        const streetAnnotation = getNodeData(STUDIO_NODES.annotationStreet) as AnnotationNodeData | undefined;
        return !!(mapAnnotation?.outputImage && streetAnnotation?.outputImage);
      }
      case 2: {
        const mapFrame1 = getNodeData(STUDIO_NODES.generateMap) as GenerateImageNodeData | undefined;
        return mapFrame1?.status === "complete";
      }
      case 3: {
        const fullBuilding = getNodeData(STUDIO_NODES.generateFullBuilding) as GenerateImageNodeData | undefined;
        return fullBuilding?.status === "complete";
      }
      case 4: {
        // Building Angles: any angle complete
        const aerial = getNodeData(STUDIO_NODES.generateAngleAerialDrone) as GenerateImageNodeData | undefined;
        const balcony = getNodeData(STUDIO_NODES.generateAngleBalcony) as GenerateImageNodeData | undefined;
        const interior = getNodeData(STUDIO_NODES.generateAngleInterior) as GenerateImageNodeData | undefined;
        return aerial?.status === "complete" || balcony?.status === "complete" || interior?.status === "complete";
      }
      case 5: {
        // Map Videos: any video in group complete
        const v0 = getNodeData(STUDIO_NODES.generateVideoV0) as GenerateVideoNodeData | undefined;
        const v1 = getNodeData(STUDIO_NODES.generateVideoV1) as GenerateVideoNodeData | undefined;
        return v0?.status === "complete" || v1?.status === "complete";
      }
      case 6: {
        // Construction Videos: any video in group complete
        const v2 = getNodeData(STUDIO_NODES.generateVideoV2) as GenerateVideoNodeData | undefined;
        const v3 = getNodeData(STUDIO_NODES.generateVideoV3) as GenerateVideoNodeData | undefined;
        return v2?.status === "complete" || v3?.status === "complete";
      }
      case 7: {
        // Showcase Videos: any video in group complete
        const v4 = getNodeData(STUDIO_NODES.generateVideoV4) as GenerateVideoNodeData | undefined;
        const v5 = getNodeData(STUDIO_NODES.generateVideoV5) as GenerateVideoNodeData | undefined;
        const v6 = getNodeData(STUDIO_NODES.generateVideoV6) as GenerateVideoNodeData | undefined;
        return v4?.status === "complete" || v5?.status === "complete" || v6?.status === "complete";
      }
      case 8:
        return true; // Download & stitch step — always allow moving on
      case 9:
        return true; // Output step is always "complete"
      default:
        return false;
    }
  };

  // Determine footer button label and action
  const getFooterProps = () => {
    switch (currentStep) {
      case 0:
      case 1:
        return {
          primaryLabel: "Next",
          primaryDisabled: !isStepComplete(),
          onPrimary: goNext,
        };
      case 2: {
        const mapFrame1 = getNodeData(STUDIO_NODES.generateMap) as GenerateImageNodeData | undefined;
        return {
          primaryLabel: "Next",
          primaryDisabled: mapFrame1?.status !== "complete",
          onPrimary: goNext,
        };
      }
      case 3: {
        const fullBuilding = getNodeData(STUDIO_NODES.generateFullBuilding) as GenerateImageNodeData | undefined;
        if (fullBuilding?.status === "complete") {
          return {
            primaryLabel: "Next",
            primaryDisabled: false,
            onPrimary: goNext,
          };
        }
        return {
          primaryLabel: "Generate Building",
          primaryDisabled: isRunning,
          primaryLoading: isRunning,
          onPrimary: async () => {
            // Inject building description into prompts if provided
            if (buildingDescription.trim()) {
              for (const promptNodeId of [STUDIO_NODES.promptHalfBuilding, STUDIO_NODES.promptFullBuilding]) {
                const node = nodes.find((n) => n.id === promptNodeId);
                if (!node) continue;
                const currentPrompt = (node.data as { prompt?: string }).prompt || "";
                const marker = "\n\n[Building description: ";
                const markerIdx = currentPrompt.indexOf(marker);
                const basePrompt = markerIdx >= 0 ? currentPrompt.slice(0, markerIdx) : currentPrompt;
                updateNodeData(promptNodeId, { prompt: `${basePrompt}${marker}${buildingDescription.trim()}]` });
              }
            }
            await regenerateNode(STUDIO_NODES.generateStreet);
            await regenerateNode(STUDIO_NODES.generateHalfBuilding);
            await regenerateNode(STUDIO_NODES.generateFullBuilding);
          },
        };
      }
      case 4: {
        // Building Angles
        return {
          primaryLabel: "Next",
          primaryDisabled: !isStepComplete(),
          onPrimary: goNext,
        };
      }
      case 5:
      case 6:
      case 7: {
        // Video steps — Next once any video in group is complete
        return {
          primaryLabel: "Next",
          primaryDisabled: !isStepComplete(),
          onPrimary: goNext,
        };
      }
      case 8:
        return {
          primaryLabel: "Next →",
          primaryDisabled: false,
          onPrimary: goNext,
        };
      case 9:
        return {
          primaryLabel: "Download All",
          primaryDisabled: false,
          onPrimary: () => {
            // Download all available videos
            const videoNodeIds = [
              STUDIO_NODES.generateVideoV0,
              STUDIO_NODES.generateVideoV1,
              STUDIO_NODES.generateVideoV2,
              STUDIO_NODES.generateVideoV3,
              STUDIO_NODES.generateVideoV4,
              STUDIO_NODES.generateVideoV5,
              STUDIO_NODES.generateVideoV6,
            ];
            const labels = ["area-popup", "aerial-dive", "construction-rise", "construction-complete", "street-aerial", "aerial-balcony", "balcony-interior"];
            videoNodeIds.forEach((nodeId, i) => {
              const data = getNodeData(nodeId) as GenerateVideoNodeData | undefined;
              if (data?.outputVideo) {
                const a = document.createElement("a");
                a.href = data.outputVideo;
                a.download = `property-${labels[i]}-${Date.now()}.mp4`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              }
            });
          },
        };
      default:
        return {};
    }
  };

  return (
    <div className="h-full flex flex-col md:max-w-md md:mx-auto md:border md:border-neutral-800 md:rounded-3xl md:my-4 md:h-[calc(100%-2rem)]">
      <StepHeader />
      <StudioStepCarousel />
      <StepFooter {...getFooterProps()} />
    </div>
  );
}
