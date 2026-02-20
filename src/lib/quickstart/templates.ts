import { WorkflowFile } from "@/store/workflowStore";
import { TemplateCategory, TemplateMetadata } from "@/types/quickstart";
import type { GenerateVideoNodeData, PromptConstructorNodeData, ImageCompareNodeData, CarouselVideoItem } from "@/types/nodes";

export type ContentLevel = "empty" | "minimal" | "full";

export interface PresetTemplate {
  id: string;
  name: string;
  description: string;
  icon: string; // SVG path or emoji
  category: TemplateCategory;
  tags: string[]; // Provider tags (e.g., "Gemini", "Replicate")
  workflow: Omit<WorkflowFile, "id">;
}

// Sample images from public/sample-images folder
export const SAMPLE_IMAGES = {
  // Products
  appleWatch: "/sample-images/apple-watch.jpg",
  watch: "/sample-images/watch.jpg",
  cosmetics: "/sample-images/cosmetics.jpg",
  skincare: "/sample-images/skincare.jpg",
  nikeShoe: "/sample-images/nike-shoe.jpg",
  shoes: "/sample-images/shoes.jpg",
  rayban: "/sample-images/rayban.jpg",
  // Models
  model: "/sample-images/model.png",
  model2: "/sample-images/model-2.jpg",
  model3: "/sample-images/model-3.jpg",
  model4: "/sample-images/model-4.jpg",
  model5: "/sample-images/model-5.jpg",
  model6: "/sample-images/model-6.jpg",
  model7: "/sample-images/model-7.jpg",
  // Scenes
  buildingSide: "/sample-images/building-side.jpg",
  desert: "/sample-images/desert.jpg",
  greenWallStreet: "/sample-images/green-wall-street.jpg",
  houseLake: "/sample-images/house-lake.jpg",
  nyStreet: "/sample-images/ny-street.jpg",
  nyStreet2: "/sample-images/ny-street-2.jpg",
  streetScene: "/sample-images/street-scene.jpg",
  streetScene1: "/sample-images/street-scene-1.jpg",
  streetScene2: "/sample-images/street-scene-2.jpg",
  // Colors/Textures
  colorPaint: "/sample-images/color-paint.jpg",
  colorPastel: "/sample-images/color-pastel.jpg",
  colorWall: "/sample-images/color-wall.jpg",
  // Animals
  donkey: "/sample-images/donkey.jpg",
  owl: "/sample-images/owl.jpg",
  // Reference images for templates
  newBgModelProduct: "/sample-images/new-bg-model-product.png",
  styleTransferReference: "/sample-images/style-transfer-reference.png",
};

// Default node dimensions for consistent layouts
const NODE_DIMENSIONS = {
  imageInput: { width: 300, height: 280 },
  annotation: { width: 300, height: 280 },
  prompt: { width: 320, height: 220 },
  promptConstructor: { width: 350, height: 260 },
  generateImage: { width: 300, height: 300 },
  llmGenerate: { width: 320, height: 360 },
  generateVideo: { width: 320, height: 360 },
  imageCompare: { width: 320, height: 320 },
  output: { width: 320, height: 320 },
};

// Default node data factories
const createImageInputData = (imageUrl: string | null = null, filename: string | null = null) => ({
  image: imageUrl,
  filename: filename,
  dimensions: imageUrl ? { width: 800, height: 600 } : null,
});

const createPromptData = (prompt: string = "") => ({
  prompt,
});

const createGenerateImageData = () => ({
  inputImages: [],
  inputPrompt: null,
  outputImage: null,
  aspectRatio: "3:2" as const,
  resolution: "1K" as const,
  model: "gemini-pro" as const,
  useGoogleSearch: false,
  status: "idle" as const,
  error: null,
  imageHistory: [],
  selectedHistoryIndex: 0,
});

const createLLMGenerateData = () => ({
  inputPrompt: null,
  inputImages: [],
  outputText: null,
  provider: "google" as const,
  model: "gemini-3-flash-preview" as const,
  temperature: 0.7,
  maxTokens: 8192,
  status: "idle" as const,
  error: null,
});

const createAnnotationData = () => ({
  sourceImage: null,
  annotations: [],
  outputImage: null,
});

const createOutputData = () => ({
  image: null,
});

const createPromptConstructorData = (template: string = ""): PromptConstructorNodeData => ({
  template,
  outputText: null,
  unresolvedVars: [],
});

const createImageCompareData = (): ImageCompareNodeData => ({
  imageA: null,
  imageB: null,
});

const createGenerateVideoData = (): GenerateVideoNodeData => ({
  inputImages: [],
  inputPrompt: null,
  outputVideo: null,
  status: "idle",
  error: null,
  videoHistory: [],
  selectedVideoHistoryIndex: 0,
});

// Content for each template at each level
interface TemplateContent {
  prompts: Record<string, string>; // nodeId -> prompt content
  images: Record<string, { url: string; filename: string }>; // nodeId -> image info
}

// ============================================================================
// PROMPTS — written once here, referenced by node ID
// ============================================================================

export const PROMPTS = {
  // --- Stage 1: Map View Enhancement ---

  // Original prompt (kept for backward compatibility / non-studio usage)
  mapEnhance:
    "Transform this annotated satellite map into a cinematic aerial plot visualization. Replace the rough annotation with a precise, clean boundary line using a luminous golden-amber outline with a soft outer glow. Fill the plot area with a very subtle warm highlight (8-10% opacity) that distinguishes it from surrounding land without hiding terrain detail. Render the plot dimensions directly along the boundary edges as clean architectural measurement lines with a minimal sans-serif font. Show only the total area centered inside the plot. Enhance with cinematic color grading — deepen greens, warm earth tones, add subtle depth contrast. Slight vignette. No info cards, no titles, no logos, no compass, no 3D buildings. Only the enhanced aerial view with highlighted plot and measurement annotations.",

  // Frame 1: Clean enhanced map WITHOUT any text (for Studio wizard)
  // Input: TWO images — original satellite screenshot + annotated version
  mapEnhanceClean:
    "Analyze this satellite map image carefully — identify the plot boundary, all buildings, roads, trees, vegetation, and surrounding structures. Recreate this exact scene as a photorealistic drone shot. The output should look like a real photograph taken by a professional drone camera at this location. Remove any map interface elements, watermarks, labels, or overlays. Keep every element of the location faithful to reality — all structures, roads, trees, and surroundings must be accurate and recognizable. Maintain sharp detail throughout. The rough hand-drawn annotation marks the plot area. Replace it with a clean, precise thick digital boundary line — a proper, professional plot boundary that follows the terrain boundaries. Choose a style, color, and size of the boundary line that enhances the cinematic quality of the image. Fill the plot interior with a subtle transparent color tint — choose a color (warm orange, reddish, or green) based on what complements the terrain best. The tint should be see-through enough that the ground/terrain underneath is still clearly visible. Natural photorealistic colors only — as a real drone camera would capture. No artificial color grading.",

  // Frame 2: Enhanced map WITH square meter area text (for Studio wizard)
  // {AREA} placeholder is replaced at runtime with e.g. "1200 sq.m"
  // Input: Frame 1's output image (chained, not the original annotated map)
  mapEnhanceWithArea:
    "Using this enhanced aerial image as the exact base, place the text \"{AREA}\" as a bold 3D text block standing on the ground inside the plot boundary. The text should look like a solid, physical 3D-rendered object placed in the real scene — with realistic depth, volume, perspective, shadows, and lighting that matches the drone shot. The 3D text should have a style and material that complements the aerial image — choose the best look (metallic, concrete, stone, or clean white) that makes it stand out clearly. Make the text large enough to be prominently visible from this aerial view. Keep everything else in the image completely unchanged — same colors, same boundary, same surroundings, same lighting. Only add the 3D text block.",

  // Video prompt: area text popup animation (first frame → last frame)
  videoMapAreaPopup:
    "The camera is completely STATIC — no push-in, no zoom, no movement. The aerial view is locked and still. From this fixed aerial perspective, the 3D text block on the ground comes to life: it physically rises up from the earth's surface, emerging from below ground level with realistic weight and gravity, casting a growing shadow as it ascends. The text rises steadily and settles into its final standing position with a slight settle/bounce. Atmospheric: subtle dust particles scatter at the moment of emergence, warm ambient lighting. No camera movement at all. Premium real estate showcase quality.",

  // --- Stage 2: Street View Enhancement ---
  streetEnhance:
    "Enhance this annotated street-level view of the plot into a professional real estate site photograph. Clean up the annotation boundary to a precise, sharp outline with a subtle golden glow against the environment. Keep the street-level perspective exactly as-is. Improve overall image quality — sharpen details, enhance natural colors, balance exposure. Make surrounding roads, trees, and neighboring structures look crisp and inviting. The plot boundary should be clearly visible but elegant. This should look like a professional site visit photograph used in property listings. No text overlays, no info cards, no 3D buildings.",

  // --- Stage 3: Half-Constructed Building (WITH reference image) ---
  halfBuilding:
    "You are given TWO images. IMPORTANT — these two images serve completely different purposes:\n\nImage 1 is the BASE LOCATION. This is the real plot. Keep the ENTIRE environment from Image 1 exactly as-is in the output: the road, the pavement, the trees, neighboring buildings, sky, ground, lighting, and all surrounding context. DO NOT remove, replace, or alter anything outside the building footprint. DO NOT use the background, surroundings, or environment from Image 2.\n\nImage 2 is the ARCHITECTURAL STYLE REFERENCE only. Extract ONLY these design elements: the number of floors, the facade layout, window sizes and style, balcony design, roof shape, and exterior material palette. COMPLETELY IGNORE Image 2's background, trees, road, sky, neighboring buildings, and location — those are irrelevant.\n\nYour task: Show a building under construction rising naturally from the plot in Image 1. The construction should occupy only the plot boundary shown in Image 1. The building's structural design should be inspired by the style in Image 2 — half-built at this stage: concrete skeleton visible, exposed columns, scaffolding, partially built upper floors, construction materials on the ground. The finished first floor or two may be taking shape. The construction blends naturally into Image 1's environment with matching lighting and shadows. Everything outside the building footprint must look identical to Image 1. Photorealistic construction site photograph quality.",

  // --- Stage 3: Half-Constructed Building (NO reference image) ---
  halfBuildingNoRef:
    "You are given ONE image: the enhanced street-level view of the empty plot. Keep the ENTIRE surrounding environment exactly as-is: the road, trees, neighboring buildings, sky, ground, and all context. Your task: place a modern multi-storey residential building under construction on the marked plot. The building occupies only the plot boundary. Show it HALF CONSTRUCTED — exposed concrete structure, scaffolding, partially complete floors, visible rebar and columns, construction materials on site. The construction blends naturally into the existing environment with consistent lighting and shadows. Everything outside the building footprint is identical to the input image. Photorealistic construction site photograph quality.",

  // --- Stage 4: Fully Constructed Building (WITH reference image) ---
  fullBuilding:
    "You are given TWO images. IMPORTANT — these two images serve completely different purposes:\n\nImage 1 is the BASE SCENE — it shows a half-built construction on the actual plot. Keep the ENTIRE environment from Image 1 exactly as-is: the road, trees, neighboring buildings, sky, ground, and all surroundings must appear unchanged in the output. DO NOT import any background, scenery, trees, roads, or surroundings from Image 2.\n\nImage 2 is the ARCHITECTURAL FINISH REFERENCE only. Extract ONLY these design details: facade cladding material, window frame style, balcony railing design, roof style, wall colors, and exterior finish. COMPLETELY IGNORE Image 2's background, neighborhood, location, trees, road, and environment.\n\nYour task: Complete the half-built structure in Image 1 into a fully finished building. The building's exterior finish should reflect the style from Image 2. It sits naturally on the same plot, same camera angle. Everything outside the building footprint remains IDENTICAL to Image 1 — do not alter the road, trees, neighboring buildings, or sky. Add a compound wall, gate, driveway, and garden planting that naturally fits the Image 1 environment and does not look imported. Soft natural lighting matching the scene. Move-in ready, photorealistic architectural visualization quality.",

  // --- Stage 4: Fully Constructed Building (NO reference image) ---
  fullBuildingNoRef:
    "You are given ONE image: a half-constructed building on a real plot. Keep the ENTIRE surrounding environment exactly as-is. Your task: complete the building into a fully finished contemporary residential structure. The finished exterior should be consistent with the visible structural style. Add compound wall, gate, driveway, and garden that naturally fit the existing environment. Everything outside the building footprint remains identical to the input. Soft natural lighting matching the scene. Move-in ready, photorealistic architectural visualization quality.",

  // --- Stage 5: Multiple Angle Prompts ---
  angleFront:
    "Photoreal high aerial drone shot of the same exact building from the reference image. No building redesign—same facade, balconies, window placement, colors and materials. Drone height 60–100m, near top-down view (70–90°), building centered, show clear plot boundary/shape and neighborhood context. Natural daylight with consistent sun direction, crisp shadows, sharp detail, clean geometry, no warping, no flicker, premium commercial quality.",

  angleAerial:
    "You are given TWO images of the SAME building: the FIRST is the full building visualization, the SECOND is an aerial drone shot of that exact building. Study both carefully — identify the specific balcony railing style, facade cladding material, window frame design, wall colors, and floor proportions of THIS building. Generate a photoreal close-up lifestyle image of one balcony from THIS EXACT building. Do NOT redesign or invent new architectural elements — replicate the same railing design, wall cladding texture, window frames, and material palette visible in both reference images. Frame a tight close-up on one premium balcony (upper or mid floor). Add one woman naturally on the balcony: casually sipping coffee or holding a mug, relaxed posture, tasteful clothing, realistic scale. Soft natural daylight, premium real-estate editorial quality, sharp micro-textures, clean geometry. No facade redesign, no warping, no distorted hands or face.",

  angleCorner:
    "You are given TWO images of the SAME residential building exterior. Use them to understand this building's exact architectural style, material palette, color scheme, and design language. Generate a photoreal premium interior photo of an apartment inside this specific building — the interior styling should reflect the same design sensibility seen in the exterior (material quality, color palette, window proportions). Camera inside the living room, eye-level (1.5–1.7m), wide lens (24–28mm). Bright modern living room with connected kitchen, soft natural daylight through large windows matching the window style of the building, realistic shadows, correct perspective. Add one woman in a natural lifestyle action: making tea at the counter, watering a plant near the window, opening curtains, or reading on the sofa. Candid, relaxed, tasteful. High-end brochure quality, sharp detail, no distortion, no warped furniture, no extra limbs, no uncanny faces.",

  // --- Stage 6: Video Prompts ---
  videoMapToStreet:
    "Smooth cinematic transition. Start in a top-down aerial view centered on the highlighted plot. The camera begins a controlled descent while gently tilting from 90° top-down to an oblique angle. At ~2.5s, accelerate into a short speed-ramp dive creating full-frame motion blur for 0.4s. During the blur, cut to a street-level wide shot of the same plot from the roadside, continuing the same motion direction. Decelerate and stabilize by 5s. Match sun direction and color tone. No environment morphing, no warping, no flicker, no geometry drifting.",

  videoStreetToHalf:
    "Cinematic timelapse-style construction sequence: Starting from the empty street-level plot view, show a building gradually rising from the ground — foundation being laid, columns going up, floors being constructed one by one. The building reaches half-construction stage with scaffolding and exposed structure. Professional real estate promotional style. Steady camera. 5 seconds.",

  videoHalfToFull:
    "Cinematic construction completion sequence: Starting from the half-constructed building with scaffolding and exposed concrete, smoothly transition as walls get finished, windows are installed, paint is applied, scaffolding is removed, and landscaping grows in. The building transforms into a fully completed modern residential property. Steady camera angle. Professional quality. 5 seconds.",

  videoFullToAerial:
    "Create a single continuous camera move that transitions from street-level front view to high aerial view without changing the building design. Camera starts stabilized at street level facing the main facade. Perform a slow, controlled clockwise orbit around the front corner while simultaneously craning up and pulling back. The orbit is subtle (about 20–35°), prioritizing stability and clean geometry. By the end of 5 seconds, the camera has risen to a high drone altitude and tilts downward into a near top-down aerial composition. Movement must feel like a gimbal + drone lift: smooth ease-in/ease-out, no wobble, no snap turns, no zoom pumping. Maintain consistent lighting direction and shadows. No warping, no flicker, no morphing of surroundings. High-end commercial real-estate video look, cinematic motion blur, 24fps feel.",

  videoAerialToBalcony:
    "Start from a high aerial view of the property (no people visible on balconies at the start). Camera performs a single continuous move: smooth forward push-in while descending, gently tilting up from near top-down into a clean oblique facade view. Keep movement stable like a gimbal-drone combo, with natural daylight and consistent sun direction and shadows. During the final approach to the target balcony, introduce a foreground occlusion: a large bird (eagle or kite) flies very close across the camera lens from one side of frame to the other, creating a brief full-frame wing motion blur that covers the scene for a fraction of a second. Use this occlusion moment as the seamless transition point. Immediately after the bird clears the frame, the camera is now closer and stabilized on the balcony close-up. The woman is now present on the balcony in a natural lifestyle pose, sipping coffee, relaxed posture, realistic scale. The camera finishes with a tight, crisp balcony close-up, gentle micro-stabilization, subtle cinematic motion blur, 24fps feel. No warping, no flicker, no morphing of building geometry. Maintain photorealistic lighting continuity and clean geometry throughout.",

  videoBalconyToInterior:
    "Start on the balcony close-up lifestyle moment (woman sipping coffee). Camera makes a smooth push-in toward the sliding glass door / window behind her. As the camera reaches the glass, perform a controlled whip-pan + motion-blur pass through the doorway (brief full-frame blur for seamless transition). Immediately after the pass, the camera is now inside the apartment, stabilizing into a wide interior view. Continue with a gentle forward glide and small reframe to settle into the final living-room composition matching the last frame. Keep motion natural and high-end: gimbal stabilized, clean easing, subtle cinematic motion blur, 24fps feel. No warping, no flicker, no melting. Maintain realistic lighting continuity (exterior daylight influencing the interior). End perfectly stable on the final interior shot.",
};

const TEMPLATE_CONTENT: Record<string, Record<ContentLevel, TemplateContent>> = {
  "real-estate-map-animation": {
    empty: {
      prompts: {
        "prompt-map-enhance": "",
        "prompt-map-enhance-frame2": "",
        "prompt-street-enhance": "",
        "prompt-half-building": "",
        "prompt-full-building": "",
        "prompt-angle-front": "",
        "prompt-angle-aerial": "",
        "prompt-angle-corner": "",
        "prompt-video-map-area": "",
        "prompt-video-1": "",
        "prompt-video-2": "",
        "prompt-video-3": "",
        "prompt-video-4": "",
        "prompt-video-5": "",
        "prompt-video-6": "",
      },
      images: {},
    },
    minimal: {
      prompts: {
        "prompt-map-enhance": PROMPTS.mapEnhanceClean,
        "prompt-map-enhance-frame2": PROMPTS.mapEnhanceWithArea,
        "prompt-street-enhance": PROMPTS.streetEnhance,
        "prompt-half-building": PROMPTS.halfBuilding,
        "prompt-full-building": PROMPTS.fullBuilding,
        "prompt-angle-front": PROMPTS.angleFront,
        "prompt-angle-aerial": PROMPTS.angleAerial,
        "prompt-angle-corner": PROMPTS.angleCorner,
        "prompt-video-map-area": PROMPTS.videoMapAreaPopup,
        "prompt-video-1": PROMPTS.videoMapToStreet,
        "prompt-video-2": PROMPTS.videoStreetToHalf,
        "prompt-video-3": PROMPTS.videoHalfToFull,
        "prompt-video-4": PROMPTS.videoFullToAerial,
        "prompt-video-5": PROMPTS.videoAerialToBalcony,
        "prompt-video-6": PROMPTS.videoBalconyToInterior,
      },
      images: {},
    },
    full: {
      prompts: {
        "prompt-map-enhance": PROMPTS.mapEnhanceClean,
        "prompt-map-enhance-frame2": PROMPTS.mapEnhanceWithArea,
        "prompt-street-enhance": PROMPTS.streetEnhance,
        "prompt-half-building": PROMPTS.halfBuilding,
        "prompt-full-building": PROMPTS.fullBuilding,
        "prompt-angle-front": PROMPTS.angleFront,
        "prompt-angle-aerial": PROMPTS.angleAerial,
        "prompt-angle-corner": PROMPTS.angleCorner,
        "prompt-video-map-area": PROMPTS.videoMapAreaPopup,
        "prompt-video-1": PROMPTS.videoMapToStreet,
        "prompt-video-2": PROMPTS.videoStreetToHalf,
        "prompt-video-3": PROMPTS.videoHalfToFull,
        "prompt-video-4": PROMPTS.videoFullToAerial,
        "prompt-video-5": PROMPTS.videoAerialToBalcony,
        "prompt-video-6": PROMPTS.videoBalconyToInterior,
      },
      images: {},
    },
  },
};

// ============================================================================
// LAYOUT CONSTANTS — organized in columns for clear visual flow
// ============================================================================
const COL = {
  // Stage 1: Map View
  mapInput: 0,
  mapAnnotate: 320,
  mapGen: 700,

  // Stage 2: Street View
  streetInput: 0,
  streetAnnotate: 320,
  streetGen: 700,

  // Stage 3: Building Construction
  buildingRefInput: 1100,
  halfBuildGen: 1100,

  // Stage 4: Full Building
  fullBuildGen: 1500,

  // Stage 5: Multiple Angles
  angles: 1900,

  // Stage 6: Videos
  videos: 2350,

  // Stage 7: Outputs
  outputs: 2800,
};

const ROW = {
  // Stage 1 (top row)
  mapRow: 0,

  // Stage 2 (second row)
  streetRow: 400,

  // Prompts offset below their row
  promptOffset: 320,
};

// Preset templates
export const PRESET_TEMPLATES: PresetTemplate[] = [
  {
    id: "real-estate-map-animation",
    name: "Real Estate Map Animation",
    description: "Full real estate video workflow: map → street view → construction → flyover",
    icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
    category: "community",
    tags: ["Real Estate", "Video"],
    workflow: {
      version: 1,
      name: "Real Estate Map Animation",
      edgeStyle: "curved",
      nodes: [
        // ==========================================
        // STAGE 1: MAP VIEW (Top Row)
        // ==========================================

        // Map screenshot upload
        {
          id: "imageInput-map",
          type: "imageInput",
          position: { x: COL.mapInput, y: ROW.mapRow },
          data: createImageInputData(),
          style: NODE_DIMENSIONS.imageInput,
        },
        // Annotate plot boundary on map
        {
          id: "annotation-map",
          type: "annotation",
          position: { x: COL.mapAnnotate, y: ROW.mapRow },
          data: createAnnotationData(),
          style: NODE_DIMENSIONS.annotation,
        },
        // Prompt: Map enhancement instructions
        {
          id: "prompt-map-enhance",
          type: "prompt",
          position: { x: COL.mapAnnotate, y: ROW.mapRow + ROW.promptOffset },
          data: createPromptData(""),
          style: NODE_DIMENSIONS.prompt,
        },
        // GenerateImage: Enhanced map with clean annotation (Frame 1 — no text)
        {
          id: "generateImage-map",
          type: "generateImage",
          position: { x: COL.mapGen, y: ROW.mapRow },
          data: createGenerateImageData(),
          style: NODE_DIMENSIONS.generateImage,
        },
        // Prompt: Map enhancement with area text (Frame 2)
        {
          id: "prompt-map-enhance-frame2",
          type: "prompt",
          position: { x: COL.mapAnnotate, y: ROW.mapRow + ROW.promptOffset + 250 },
          data: createPromptData(""),
          style: NODE_DIMENSIONS.prompt,
        },
        // GenerateImage: Enhanced map WITH area text overlay (Frame 2)
        {
          id: "generateImage-map-frame2",
          type: "generateImage",
          position: { x: COL.mapGen, y: ROW.mapRow + 350 },
          data: createGenerateImageData(),
          style: NODE_DIMENSIONS.generateImage,
        },

        // ==========================================
        // STAGE 2: STREET VIEW (Second Row)
        // ==========================================

        // Street view / Google Earth 3D screenshot upload
        {
          id: "imageInput-street",
          type: "imageInput",
          position: { x: COL.streetInput, y: ROW.streetRow },
          data: createImageInputData(),
          style: NODE_DIMENSIONS.imageInput,
        },
        // Annotate plot boundary on street view
        {
          id: "annotation-street",
          type: "annotation",
          position: { x: COL.streetAnnotate, y: ROW.streetRow },
          data: createAnnotationData(),
          style: NODE_DIMENSIONS.annotation,
        },
        // Prompt: Street view enhancement instructions
        {
          id: "prompt-street-enhance",
          type: "prompt",
          position: { x: COL.streetAnnotate, y: ROW.streetRow + ROW.promptOffset },
          data: createPromptData(""),
          style: NODE_DIMENSIONS.prompt,
        },
        // GenerateImage: Enhanced street view
        {
          id: "generateImage-street",
          type: "generateImage",
          position: { x: COL.streetGen, y: ROW.streetRow },
          data: createGenerateImageData(),
          style: NODE_DIMENSIONS.generateImage,
        },

        // ==========================================
        // STAGE 3: HALF-CONSTRUCTED BUILDING
        // ==========================================

        // Optional: Reference building image input
        {
          id: "imageInput-building-ref",
          type: "imageInput",
          position: { x: COL.buildingRefInput, y: ROW.mapRow },
          data: createImageInputData(),
          style: NODE_DIMENSIONS.imageInput,
        },
        // Prompt: Half-construction instructions
        {
          id: "prompt-half-building",
          type: "prompt",
          position: { x: COL.buildingRefInput, y: ROW.streetRow + ROW.promptOffset },
          data: createPromptData(""),
          style: NODE_DIMENSIONS.prompt,
        },
        // GenerateImage: Generate half-constructed building
        {
          id: "generateImage-half-building",
          type: "generateImage",
          position: { x: COL.halfBuildGen, y: ROW.streetRow },
          data: createGenerateImageData(),
          style: NODE_DIMENSIONS.generateImage,
        },

        // ==========================================
        // STAGE 4: FULLY CONSTRUCTED BUILDING
        // ==========================================

        // Prompt: Full construction instructions
        {
          id: "prompt-full-building",
          type: "prompt",
          position: { x: COL.fullBuildGen, y: ROW.streetRow + ROW.promptOffset },
          data: createPromptData(""),
          style: NODE_DIMENSIONS.prompt,
        },
        // GenerateImage: Generate fully constructed building
        {
          id: "generateImage-full-building",
          type: "generateImage",
          position: { x: COL.fullBuildGen, y: ROW.streetRow },
          data: createGenerateImageData(),
          style: NODE_DIMENSIONS.generateImage,
        },

        // ==========================================
        // STAGE 5: MULTIPLE ANGLE SHOTS
        // ==========================================

        // Prompt: Front elevation angle
        {
          id: "prompt-angle-front",
          type: "prompt",
          position: { x: COL.angles, y: ROW.mapRow - 50 },
          data: createPromptData(""),
          style: NODE_DIMENSIONS.prompt,
        },
        // GenerateImage: Front angle shot
        {
          id: "generateImage-angle-front",
          type: "generateImage",
          position: { x: COL.angles + 370, y: ROW.mapRow - 50 },
          data: createGenerateImageData(),
          style: NODE_DIMENSIONS.generateImage,
        },

        // Prompt: Aerial angle
        {
          id: "prompt-angle-aerial",
          type: "prompt",
          position: { x: COL.angles, y: ROW.mapRow + 280 },
          data: createPromptData(""),
          style: NODE_DIMENSIONS.prompt,
        },
        // GenerateImage: Aerial angle shot
        {
          id: "generateImage-angle-aerial",
          type: "generateImage",
          position: { x: COL.angles + 370, y: ROW.mapRow + 280 },
          data: createGenerateImageData(),
          style: NODE_DIMENSIONS.generateImage,
        },

        // Prompt: Corner angle
        {
          id: "prompt-angle-corner",
          type: "prompt",
          position: { x: COL.angles, y: ROW.streetRow + 210 },
          data: createPromptData(""),
          style: NODE_DIMENSIONS.prompt,
        },
        // GenerateImage: Corner angle shot
        {
          id: "generateImage-angle-corner",
          type: "generateImage",
          position: { x: COL.angles + 370, y: ROW.streetRow + 210 },
          data: createGenerateImageData(),
          style: NODE_DIMENSIONS.generateImage,
        },

        // ==========================================
        // STAGE 6: VIDEO GENERATION
        // ==========================================

        // Video 0: Area Text Popup (clean map → map with area text)
        {
          id: "prompt-video-map-area",
          type: "prompt",
          position: { x: COL.videos, y: ROW.mapRow - 400 },
          data: createPromptData(""),
          style: { width: 280, height: 180 },
        },
        {
          id: "generateVideo-map-area",
          type: "generateVideo",
          position: { x: COL.videos + 320, y: ROW.mapRow - 400 },
          data: createGenerateVideoData(),
          style: NODE_DIMENSIONS.generateVideo,
        },

        // Video 1: Annotated Map → Street View
        {
          id: "prompt-video-1",
          type: "prompt",
          position: { x: COL.videos, y: ROW.mapRow - 80 },
          data: createPromptData(""),
          style: { width: 280, height: 180 },
        },
        {
          id: "generateVideo-1",
          type: "generateVideo",
          position: { x: COL.videos + 320, y: ROW.mapRow - 80 },
          data: createGenerateVideoData(),
          style: NODE_DIMENSIONS.generateVideo,
        },

        // Video 2: Street View → Half Building
        {
          id: "prompt-video-2",
          type: "prompt",
          position: { x: COL.videos, y: ROW.mapRow + 300 },
          data: createPromptData(""),
          style: { width: 280, height: 180 },
        },
        {
          id: "generateVideo-2",
          type: "generateVideo",
          position: { x: COL.videos + 320, y: ROW.mapRow + 300 },
          data: createGenerateVideoData(),
          style: NODE_DIMENSIONS.generateVideo,
        },

        // Video 3: Half Building → Full Building
        {
          id: "prompt-video-3",
          type: "prompt",
          position: { x: COL.videos, y: ROW.streetRow + 280 },
          data: createPromptData(""),
          style: { width: 280, height: 180 },
        },
        {
          id: "generateVideo-3",
          type: "generateVideo",
          position: { x: COL.videos + 320, y: ROW.streetRow + 280 },
          data: createGenerateVideoData(),
          style: NODE_DIMENSIONS.generateVideo,
        },

        // Video 4: Full Building → Aerial Drone
        {
          id: "prompt-video-4",
          type: "prompt",
          position: { x: COL.videos, y: ROW.streetRow + 660 },
          data: createPromptData(""),
          style: { width: 280, height: 180 },
        },
        {
          id: "generateVideo-4",
          type: "generateVideo",
          position: { x: COL.videos + 320, y: ROW.streetRow + 660 },
          data: createGenerateVideoData(),
          style: NODE_DIMENSIONS.generateVideo,
        },

        // Video 5: Aerial Drone → Balcony Close-up
        {
          id: "prompt-video-5",
          type: "prompt",
          position: { x: COL.videos, y: ROW.streetRow + 1040 },
          data: createPromptData(""),
          style: { width: 280, height: 180 },
        },
        {
          id: "generateVideo-5",
          type: "generateVideo",
          position: { x: COL.videos + 320, y: ROW.streetRow + 1040 },
          data: createGenerateVideoData(),
          style: NODE_DIMENSIONS.generateVideo,
        },

        // Video 6: Balcony Close-up → Interior Room
        {
          id: "prompt-video-6",
          type: "prompt",
          position: { x: COL.videos, y: ROW.streetRow + 1420 },
          data: createPromptData(""),
          style: { width: 280, height: 180 },
        },
        {
          id: "generateVideo-6",
          type: "generateVideo",
          position: { x: COL.videos + 320, y: ROW.streetRow + 1420 },
          data: createGenerateVideoData(),
          style: NODE_DIMENSIONS.generateVideo,
        },

        // ==========================================
        // STAGE 7: VIDEO STITCH
        // ==========================================
        {
          id: "videoStitch-final",
          type: "videoStitch",
          position: { x: COL.outputs, y: ROW.mapRow + 100 },
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
        },

        // ==========================================
        // STAGE 8: OUTPUT
        // ==========================================
        {
          id: "output-1",
          type: "output",
          position: { x: COL.outputs + 560, y: ROW.mapRow + 100 },
          data: createOutputData(),
          style: NODE_DIMENSIONS.output,
        },
        {
          id: "output-2",
          type: "output",
          position: { x: COL.outputs + 560, y: ROW.streetRow + 100 },
          data: createOutputData(),
          style: NODE_DIMENSIONS.output,
        },
      ],
      edges: [
        // ==========================================
        // STAGE 1: Map flow
        // ==========================================
        {
          id: "e-map-input-to-annotate",
          source: "imageInput-map",
          sourceHandle: "image",
          target: "annotation-map",
          targetHandle: "image",
        },
        {
          id: "e-map-annotate-to-gen",
          source: "annotation-map",
          sourceHandle: "image",
          target: "generateImage-map",
          targetHandle: "image",
        },
        {
          id: "e-map-prompt-to-gen",
          source: "prompt-map-enhance",
          sourceHandle: "text",
          target: "generateImage-map",
          targetHandle: "text",
        },

        // Frame 2: Map with area text (chained from Frame 1 output, not original annotation)
        {
          id: "e-map-frame1-to-gen-frame2",
          source: "generateImage-map",
          sourceHandle: "image",
          target: "generateImage-map-frame2",
          targetHandle: "image",
        },
        {
          id: "e-map-prompt-frame2-to-gen",
          source: "prompt-map-enhance-frame2",
          sourceHandle: "text",
          target: "generateImage-map-frame2",
          targetHandle: "text",
        },

        // ==========================================
        // STAGE 2: Street view flow
        // ==========================================
        {
          id: "e-street-input-to-annotate",
          source: "imageInput-street",
          sourceHandle: "image",
          target: "annotation-street",
          targetHandle: "image",
        },
        {
          id: "e-street-annotate-to-gen",
          source: "annotation-street",
          sourceHandle: "image",
          target: "generateImage-street",
          targetHandle: "image",
        },
        {
          id: "e-street-prompt-to-gen",
          source: "prompt-street-enhance",
          sourceHandle: "text",
          target: "generateImage-street",
          targetHandle: "text",
        },

        // ==========================================
        // STAGE 3: Half-building flow
        // Street view output → half-building gen
        // Building ref image → half-building gen
        // Half-building prompt → half-building gen
        // ==========================================
        {
          id: "e-street-to-halfbuild",
          source: "generateImage-street",
          sourceHandle: "image",
          target: "generateImage-half-building",
          targetHandle: "image",
        },
        {
          id: "e-buildref-to-halfbuild",
          source: "imageInput-building-ref",
          sourceHandle: "image",
          target: "generateImage-half-building",
          targetHandle: "image",
        },
        {
          id: "e-halfbuild-prompt",
          source: "prompt-half-building",
          sourceHandle: "text",
          target: "generateImage-half-building",
          targetHandle: "text",
        },

        // ==========================================
        // STAGE 4: Full-building flow
        // Half-building output → full-building gen
        // Building ref image → full-building gen
        // Full-building prompt → full-building gen
        // ==========================================
        {
          id: "e-half-to-fullbuild",
          source: "generateImage-half-building",
          sourceHandle: "image",
          target: "generateImage-full-building",
          targetHandle: "image",
        },
        {
          id: "e-buildref-to-fullbuild",
          source: "imageInput-building-ref",
          sourceHandle: "image",
          target: "generateImage-full-building",
          targetHandle: "image",
        },
        {
          id: "e-fullbuild-prompt",
          source: "prompt-full-building",
          sourceHandle: "text",
          target: "generateImage-full-building",
          targetHandle: "text",
        },

        // ==========================================
        // STAGE 5: Multiple angles
        // Full-building output → each angle gen
        // Each angle prompt → its angle gen
        // ==========================================

        // Front angle
        {
          id: "e-full-to-angle-front",
          source: "generateImage-full-building",
          sourceHandle: "image",
          target: "generateImage-angle-front",
          targetHandle: "image",
        },
        {
          id: "e-angle-front-prompt",
          source: "prompt-angle-front",
          sourceHandle: "text",
          target: "generateImage-angle-front",
          targetHandle: "text",
        },

        // Aerial angle (balcony close-up)
        // Gets BOTH full-building output AND aerial drone shot output for consistency
        {
          id: "e-full-to-angle-aerial",
          source: "generateImage-full-building",
          sourceHandle: "image",
          target: "generateImage-angle-aerial",
          targetHandle: "image",
        },
        {
          id: "e-angle-front-to-aerial",
          source: "generateImage-angle-front",
          sourceHandle: "image",
          target: "generateImage-angle-aerial",
          targetHandle: "image",
        },
        {
          id: "e-angle-aerial-prompt",
          source: "prompt-angle-aerial",
          sourceHandle: "text",
          target: "generateImage-angle-aerial",
          targetHandle: "text",
        },

        // Corner angle (interior)
        // Gets BOTH full-building output AND aerial drone shot output for consistent aesthetic
        {
          id: "e-full-to-angle-corner",
          source: "generateImage-full-building",
          sourceHandle: "image",
          target: "generateImage-angle-corner",
          targetHandle: "image",
        },
        {
          id: "e-angle-front-to-corner",
          source: "generateImage-angle-front",
          sourceHandle: "image",
          target: "generateImage-angle-corner",
          targetHandle: "image",
        },
        {
          id: "e-angle-corner-prompt",
          source: "prompt-angle-corner",
          sourceHandle: "text",
          target: "generateImage-angle-corner",
          targetHandle: "text",
        },

        // ==========================================
        // STAGE 6: Video generation
        // ==========================================

        // Video 0: Area text popup (clean map → map with area text)
        {
          id: "e-map-frame1-to-vidarea",
          source: "generateImage-map",
          sourceHandle: "image",
          target: "generateVideo-map-area",
          targetHandle: "image-0",  // First Frame (image_url)
        },
        {
          id: "e-map-frame2-to-vidarea",
          source: "generateImage-map-frame2",
          sourceHandle: "image",
          target: "generateVideo-map-area",
          targetHandle: "image-1",  // Last Frame (tail_image_url)
        },
        {
          id: "e-vidarea-prompt",
          source: "prompt-video-map-area",
          sourceHandle: "text",
          target: "generateVideo-map-area",
          targetHandle: "text",
        },

        // Video 1: Map Frame 2 (with area text) → Street view enhanced
        {
          id: "e-map-to-vid1",
          source: "generateImage-map-frame2",
          sourceHandle: "image",
          target: "generateVideo-1",
          targetHandle: "image-0",  // First Frame
        },
        {
          id: "e-street-to-vid1",
          source: "generateImage-street",
          sourceHandle: "image",
          target: "generateVideo-1",
          targetHandle: "image-1",  // Last Frame
        },
        {
          id: "e-vid1-prompt",
          source: "prompt-video-1",
          sourceHandle: "text",
          target: "generateVideo-1",
          targetHandle: "text",
        },

        // Video 2: Street view → Half building
        {
          id: "e-street-to-vid2",
          source: "generateImage-street",
          sourceHandle: "image",
          target: "generateVideo-2",
          targetHandle: "image-0",  // First Frame
        },
        {
          id: "e-half-to-vid2",
          source: "generateImage-half-building",
          sourceHandle: "image",
          target: "generateVideo-2",
          targetHandle: "image-1",  // Last Frame
        },
        {
          id: "e-vid2-prompt",
          source: "prompt-video-2",
          sourceHandle: "text",
          target: "generateVideo-2",
          targetHandle: "text",
        },

        // Video 3: Half building → Full building
        {
          id: "e-halfbuild-to-vid3",
          source: "generateImage-half-building",
          sourceHandle: "image",
          target: "generateVideo-3",
          targetHandle: "image-0",  // First Frame
        },
        {
          id: "e-fullbuild-to-vid3",
          source: "generateImage-full-building",
          sourceHandle: "image",
          target: "generateVideo-3",
          targetHandle: "image-1",  // Last Frame
        },
        {
          id: "e-vid3-prompt",
          source: "prompt-video-3",
          sourceHandle: "text",
          target: "generateVideo-3",
          targetHandle: "text",
        },

        // Video 4: Full building → Multiple angles (front as representative)
        {
          id: "e-fullbuild-to-vid4",
          source: "generateImage-full-building",
          sourceHandle: "image",
          target: "generateVideo-4",
          targetHandle: "image-0",  // First Frame
        },
        {
          id: "e-angle-front-to-vid4",
          source: "generateImage-angle-front",
          sourceHandle: "image",
          target: "generateVideo-4",
          targetHandle: "image-1",  // Last Frame
        },
        {
          id: "e-vid4-prompt",
          source: "prompt-video-4",
          sourceHandle: "text",
          target: "generateVideo-4",
          targetHandle: "text",
        },

        // Video 5: Aerial Drone → Balcony Close-up
        {
          id: "e-angle-front-to-vid5",
          source: "generateImage-angle-front",
          sourceHandle: "image",
          target: "generateVideo-5",
          targetHandle: "image-0",  // First Frame
        },
        {
          id: "e-angle-aerial-to-vid5",
          source: "generateImage-angle-aerial",
          sourceHandle: "image",
          target: "generateVideo-5",
          targetHandle: "image-1",  // Last Frame
        },
        {
          id: "e-vid5-prompt",
          source: "prompt-video-5",
          sourceHandle: "text",
          target: "generateVideo-5",
          targetHandle: "text",
        },

        // Video 6: Balcony Close-up → Interior Room
        {
          id: "e-angle-aerial-to-vid6",
          source: "generateImage-angle-aerial",
          sourceHandle: "image",
          target: "generateVideo-6",
          targetHandle: "image-0",  // First Frame
        },
        {
          id: "e-angle-corner-to-vid6",
          source: "generateImage-angle-corner",
          sourceHandle: "image",
          target: "generateVideo-6",
          targetHandle: "image-1",  // Last Frame
        },
        {
          id: "e-vid6-prompt",
          source: "prompt-video-6",
          sourceHandle: "text",
          target: "generateVideo-6",
          targetHandle: "text",
        },

        // ==========================================
        // STAGE 7: Video Stitch — all 7 videos → VideoStitch node
        // ==========================================
        {
          id: "e-vid0-to-stitch",
          source: "generateVideo-map-area",
          sourceHandle: "video",
          target: "videoStitch-final",
          targetHandle: "video-0",
        },
        {
          id: "e-vid1-to-stitch",
          source: "generateVideo-1",
          sourceHandle: "video",
          target: "videoStitch-final",
          targetHandle: "video-1",
        },
        {
          id: "e-vid2-to-stitch",
          source: "generateVideo-2",
          sourceHandle: "video",
          target: "videoStitch-final",
          targetHandle: "video-2",
        },
        {
          id: "e-vid3-to-stitch",
          source: "generateVideo-3",
          sourceHandle: "video",
          target: "videoStitch-final",
          targetHandle: "video-3",
        },
        {
          id: "e-vid4-to-stitch",
          source: "generateVideo-4",
          sourceHandle: "video",
          target: "videoStitch-final",
          targetHandle: "video-4",
        },
        {
          id: "e-vid5-to-stitch",
          source: "generateVideo-5",
          sourceHandle: "video",
          target: "videoStitch-final",
          targetHandle: "video-5",
        },
        {
          id: "e-vid6-to-stitch",
          source: "generateVideo-6",
          sourceHandle: "video",
          target: "videoStitch-final",
          targetHandle: "video-6",
        },

        // ==========================================
        // STAGE 8: Outputs
        // ==========================================
        {
          id: "e-fullbuild-to-output1",
          source: "generateImage-full-building",
          sourceHandle: "image",
          target: "output-1",
          targetHandle: "image",
        },
        {
          id: "e-angle-front-to-output2",
          source: "generateImage-angle-front",
          sourceHandle: "image",
          target: "output-2",
          targetHandle: "image",
        },
      ],
    },
  },
];

/**
 * Get a preset template with content adjusted for the specified level
 */
export function getPresetTemplate(
  templateId: string,
  contentLevel: ContentLevel
): WorkflowFile {
  const template = PRESET_TEMPLATES.find((t) => t.id === templateId);
  if (!template) {
    throw new Error(`Template not found: ${templateId}`);
  }

  const content = TEMPLATE_CONTENT[templateId]?.[contentLevel];
  if (!content) {
    throw new Error(`Content not found for ${templateId} at level ${contentLevel}`);
  }

  // Clone the workflow and apply content
  const workflow: WorkflowFile = {
    ...template.workflow,
    id: `wf_${Date.now()}_${templateId}`,
    nodes: template.workflow.nodes.map((node) => {
      const clonedNode = { ...node, data: { ...node.data } };

      // Apply prompt content
      if (node.type === "prompt" && content.prompts[node.id] !== undefined) {
        clonedNode.data = {
          ...clonedNode.data,
          prompt: content.prompts[node.id],
        };
      }

      // Apply image content for "full" level
      if (node.type === "imageInput" && content.images[node.id]) {
        const imageInfo = content.images[node.id];
        clonedNode.data = {
          ...clonedNode.data,
          image: imageInfo.url,
          filename: imageInfo.filename,
          dimensions: { width: 800, height: 600 },
        };
      }

      return clonedNode;
    }),
    edges: template.workflow.edges.map((edge) => ({ ...edge })),
  };

  return workflow;
}

/**
 * Get all preset templates for display
 */
export function getAllPresets(): Pick<PresetTemplate, "id" | "name" | "description" | "icon" | "category" | "tags">[] {
  return PRESET_TEMPLATES.map(({ id, name, description, icon, category, tags }) => ({
    id,
    name,
    description,
    icon,
    category,
    tags,
  }));
}

/**
 * Get metadata for a template, extracting node count from workflow
 */
export function getTemplateMetadata(template: PresetTemplate): TemplateMetadata {
  return {
    nodeCount: template.workflow.nodes.length,
    category: template.category,
    tags: template.tags,
  };
}

/**
 * Get a preset template with full data including metadata
 */
export function getPresetWithMetadata(templateId: string): (PresetTemplate & { metadata: TemplateMetadata }) | null {
  const template = PRESET_TEMPLATES.find((t) => t.id === templateId);
  if (!template) {
    return null;
  }
  return {
    ...template,
    metadata: getTemplateMetadata(template),
  };
}

/**
 * Export template content for use in API route (for fetching images)
 */
export function getTemplateContent(templateId: string, contentLevel: ContentLevel): TemplateContent | null {
  return TEMPLATE_CONTENT[templateId]?.[contentLevel] || null;
}
