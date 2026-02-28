import type { ModelInputDef } from "@/types/nodes";

/**
 * Pre-defined input schemas for video models.
 * These are set on video nodes at initialization so that the correct
 * handles ("First Frame" / "Last Frame") render immediately - without
 * waiting for the client-side schema fetch from /api/models/[modelId].
 */
const VIDEO_INPUT_SCHEMAS: Record<string, ModelInputDef[]> = {
  "kling/v2-5-turbo-image-to-video-pro": [
    { name: "prompt", type: "text", required: false, label: "Prompt" },
    { name: "negative_prompt", type: "text", required: false, label: "Negative Prompt" },
    { name: "image_url", type: "image", required: true, label: "First Frame" },
    { name: "tail_image_url", type: "image", required: false, label: "Last Frame" },
  ],
  "grok-imagine/image-to-video": [
    { name: "prompt", type: "text", required: false, label: "Prompt" },
    { name: "image_urls", type: "image", required: true, label: "Image" },
  ],
};

/**
 * Maps the preset template node IDs to wizard step roles.
 *
 * These IDs come from the "real-estate-map-animation" template
 * defined in src/lib/quickstart/templates.ts.
 */
export const STUDIO_NODES = {
  // Step 0: Upload
  imageInputMap: "imageInput-map",
  imageInputStreet: "imageInput-street",
  imageInputBuildingRef: "imageInput-building-ref",

  // Step 1: Annotate
  annotationMap: "annotation-map",
  annotationStreet: "annotation-street",

  // Step 2: Enhance Map (Frame 1 + Frame 2)
  generateMap: "generateImage-map",
  generateMapFrame2: "generateImage-map-frame2",
  promptMapFrame1: "prompt-map-enhance",
  promptMapFrame2: "prompt-map-enhance-frame2",

  // Step 3: Generate Building (runs sequentially)
  promptStreetEnhance: "prompt-street-enhance",
  generateStreet: "generateImage-street",
  promptHalfBuilding: "prompt-half-building",
  generateHalfBuilding: "generateImage-half-building",
  promptFullBuilding: "prompt-full-building",
  generateFullBuilding: "generateImage-full-building",

  // Step 4: Building Angles (3 parallel)
  promptAngleAerialDrone: "prompt-angle-front",
  generateAngleAerialDrone: "generateImage-angle-front",
  promptAngleBalcony: "prompt-angle-aerial",
  generateAngleBalcony: "generateImage-angle-aerial",
  promptAngleInterior: "prompt-angle-corner",
  generateAngleInterior: "generateImage-angle-corner",

  // Step 5: Map Videos
  promptVideoV0: "prompt-video-map-area",
  generateVideoV0: "generateVideo-map-area",
  promptVideoV1: "prompt-video-1",
  generateVideoV1: "generateVideo-1",

  // Step 6: Construction Videos
  promptVideoV2: "prompt-video-2",
  generateVideoV2: "generateVideo-2",
  promptVideoV3: "prompt-video-3",
  generateVideoV3: "generateVideo-3",

  // Step 7: Showcase Videos
  promptVideoV4: "prompt-video-4",
  generateVideoV4: "generateVideo-4",
  promptVideoV5: "prompt-video-5",
  generateVideoV5: "generateVideo-5",
  promptVideoV6: "prompt-video-6",
  generateVideoV6: "generateVideo-6",

  // Step 8: Output
  output1: "output-1",
  output2: "output-2",
} as const;

/**
 * Configure all generation nodes to use the given provider.
 * Call this after loading the template AND after the user enters
 * an API key in the setup screen.
 *
 * This is needed because the template defaults all generateImage nodes
 * to provider "gemini", but the user may only have a Kie API key.
 *
 * @param updateNodeData - the store's updateNodeData function
 * @param provider - which provider to configure ("kie" | "gemini")
 */
export function configureNodesForProvider(
  updateNodeData: (nodeId: string, data: Record<string, unknown>) => void,
  provider: "kie" | "gemini"
) {
  // GPT Image 1.5 nodes (map enhancement + street enhancement)
  const gptImageNodeIds = [
    STUDIO_NODES.generateMap,
    STUDIO_NODES.generateMapFrame2,
    STUDIO_NODES.generateStreet,
  ];

  for (const nodeId of gptImageNodeIds) {
    updateNodeData(nodeId, {
      selectedModel: {
        provider,
        modelId: provider === "kie" ? "gpt-image/1.5-image-to-image" : "gemini-pro",
        displayName: provider === "kie" ? "GPT Image 1.5" : "Gemini Pro",
      },
    });
  }

  // Other image generation nodes use gemini-pro
  const generateImageNodeIds = [
    STUDIO_NODES.generateHalfBuilding,
    STUDIO_NODES.generateFullBuilding,
    STUDIO_NODES.generateAngleAerialDrone,
    STUDIO_NODES.generateAngleBalcony,
    STUDIO_NODES.generateAngleInterior,
  ];

  for (const nodeId of generateImageNodeIds) {
    updateNodeData(nodeId, {
      selectedModel: {
        provider,
        modelId: "gemini-pro",
        displayName: provider === "kie" ? "Nano Banana 2" : "Gemini Pro",
      },
    });
  }

  // For video generation nodes - use provider-appropriate model
  const videoModel =
    provider === "kie"
      ? { provider, modelId: "kling/v2-5-turbo-image-to-video-pro", displayName: "Kling v2.5 Turbo I2V Pro" }
      : { provider, modelId: "kling/v2.0-master-image-to-video", displayName: "Kling v2.0 Master (Image to Video)" };

  const videoInputSchema = VIDEO_INPUT_SCHEMAS[videoModel.modelId] || undefined;

  const videoNodeIds = [
    STUDIO_NODES.generateVideoV0,
    STUDIO_NODES.generateVideoV1,
    STUDIO_NODES.generateVideoV2,
    STUDIO_NODES.generateVideoV3,
    STUDIO_NODES.generateVideoV4,
    STUDIO_NODES.generateVideoV5,
    STUDIO_NODES.generateVideoV6,
  ];

  for (const videoNodeId of videoNodeIds) {
    updateNodeData(videoNodeId, {
      selectedModel: videoModel,
      inputSchema: videoInputSchema,
    });
  }
}

/**
 * Step definitions for the wizard UI.
 */
export interface StudioStep {
  id: string;
  title: string;
  description: string;
}

export const STUDIO_STEPS: StudioStep[] = [
  {
    id: "upload",
    title: "Upload Images",
    description: "Upload your satellite map and street view images",
  },
  {
    id: "annotate",
    title: "Mark Plot Boundaries",
    description: "Draw the plot boundaries on your images",
  },
  {
    id: "enhance-map",
    title: "Enhanced Map",
    description: "Preview and refine the enhanced aerial visualization",
  },
  {
    id: "generate-building",
    title: "Generate Building",
    description: "AI creates building visualization from your plot",
  },
  {
    id: "building-angles",
    title: "Building Angles",
    description: "Generate aerial, balcony and interior views",
  },
  {
    id: "map-videos",
    title: "Map Videos",
    description: "Aerial reveal and map-to-street transition",
  },
  {
    id: "construction-videos",
    title: "Construction Videos",
    description: "Building rise and completion sequences",
  },
  {
    id: "showcase-videos",
    title: "Showcase Videos",
    description: "Aerial orbit, balcony, and interior transitions",
  },
  {
    id: "video-stitch",
    title: "Your Animation",
    description: "Download clips and stitch with ease curves",
  },
  {
    id: "output",
    title: "Share",
    description: "Share this tool with a friend",
  },
];
