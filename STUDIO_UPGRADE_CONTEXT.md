# Studio Full Workflow Upgrade — Session Context

> **Purpose**: This document captures the full context of the /studio upgrade work so a new Claude session can continue where we left off. It includes the project overview, the plan, what's been done, what's pending, known bugs, and architectural details.

---

## 1. Project Overview

**Node Banana** is a Next.js (v16.1.6, Turbopack) + React Flow + Zustand visual workflow editor for AI image/video generation. The main app at `/` is a node-based canvas. The `/studio` route is a **mobile-friendly step wizard** that drives the same underlying `workflowStore` but through a simplified card-based UI.

**Tech stack**: Next.js App Router, TypeScript, Tailwind CSS, Zustand (state), React Flow (canvas), IndexedDB (persistence for studio).

**Project root**: `C:\Users\alext\realestate\node-banana-new\`

---

## 2. What We're Building

Upgrading `/studio` from a simplified **6-step / 2-video** wizard to the full **9-step / 7-video** pipeline that matches the user's complete 34-node real estate animation workflow.

### Step Structure (9 steps)

| # | Step ID | Title | Content |
|---|---------|-------|---------|
| 0 | upload | Upload Images | 2 uploads (map + street) + plot area (sq.m) input |
| 1 | annotate | Mark Plot Boundaries | 2 annotate cards (map + street) |
| 2 | enhance-map | Enhanced Map | Aspect ratio selector, 2 map frames (clean + with area text), Advanced prompts, download buttons |
| 3 | generate-building | Generate Building | 3-stage sequential: street → half → full + Advanced prompts + optional reference building image upload + building description text field |
| 4 | building-angles | Building Angles | **NEW** — 3 parallel: aerial drone, balcony close-up, interior room |
| 5 | map-videos | Map Videos | **NEW** — V0 (area popup) + V1 (aerial dive) |
| 6 | construction-videos | Construction Videos | **NEW** — V2 (street→half) + V3 (half→full) |
| 7 | showcase-videos | Showcase Videos | **NEW** — V4 (full→aerial) + V5 (aerial→balcony) + V6 (balcony→interior) |
| 8 | output | Your Animation | Full gallery: 8 images + 7 videos, per-item download, Download All, Share |

### Video Segments & Frame Wiring

All videos use **first frame + last frame** image-to-video generation via Kling v2.5 Turbo I2V Pro.

| Video | First Frame Node | Last Frame Node | Description |
|-------|-----------------|----------------|-------------|
| V0 | `nanoBanana-map` | `nanoBanana-map-frame2` | Area text rises from ground |
| V1 | `nanoBanana-map-frame2` | `nanoBanana-street` | Aerial dive to street level |
| V2 | `nanoBanana-street` | `nanoBanana-half-building` | Construction timelapse |
| V3 | `nanoBanana-half-building` | `nanoBanana-full-building` | Completion sequence |
| V4 | `nanoBanana-full-building` | `nanoBanana-angle-front` | Street to aerial crane up |
| V5 | `nanoBanana-angle-front` | `nanoBanana-angle-aerial` | Bird transition to balcony |
| V6 | `nanoBanana-angle-aerial` | `nanoBanana-angle-corner` | Whip-pan through window |

### Angle Node ID → Semantic Label Mapping

The angle node IDs are kept for backward compat but have new meanings:
- `angle-front` = Aerial Drone Shot (high drone, 60-100m, top-down)
- `angle-aerial` = Balcony Close-up (woman sipping coffee, lifestyle)
- `angle-corner` = Interior Room Lifestyle (modern living room, wide lens)

---

## 3. Architecture & Key Stores

### workflowStore (Zustand) — `src/store/workflowStore.ts`
- `nodes`, `edges`, `groups` — React Flow data
- `updateNodeData(nodeId, data)` — merges partial data into a node
- `regenerateNode(nodeId)` — triggers AI generation for a single node using `getConnectedInputs()`
- `loadWorkflow(workflowFile)` — replaces all nodes/edges
- `isRunning` — true when any generation is in progress
- `providerSettings` — API keys per provider

### studioStore (Zustand) — `src/store/studioStore.ts`
- `currentStep`, `totalSteps` (9), `isInitialized`
- `plotSquareMeters`, `aspectRatio`, `videoDuration` ("5" or "10")
- `buildingReferenceImage` (base64 data URL or null)
- `buildingDescription` (free text)
- Navigation: `goNext()`, `goBack()`, `setStep(n)`

### Persistence — `src/lib/studio/persistence.ts`
- IndexedDB (`node-banana-studio` database) for storing full workflow + wizard state
- `StudioSnapshot` interface includes: workflow, wizardStep, plotSquareMeters, aspectRatio, videoDuration, buildingReferenceImage, buildingDescription, savedAt
- Auto-saves on a 1.5s debounce whenever either store changes

### STUDIO_NODES — `src/lib/studio/nodeMap.ts`
Maps semantic role names to template node IDs. 34 entries covering:
- 3 image inputs (map, street, building-ref)
- 2 annotations (map, street)
- 8 prompt nodes (map frame 1/2, street, half/full building, 3 angles)
- 8 nanoBanana generation nodes (2 map frames, street, half/full building, 3 angles)
- 7 video prompt nodes (V0-V6)
- 7 video generation nodes (V0-V6)
- 2 output nodes

### configureNodesForProvider() — `src/lib/studio/nodeMap.ts`
Sets the AI model on all 8 nanoBanana nodes and 7 video nodes based on whether the user has a Kie or Gemini API key. For Kie: `nano-banana-pro` for images, `kling/v2-5-turbo-image-to-video-pro` for video.

### Template — `src/lib/quickstart/templates.ts`
- `PROMPTS` object: all prompt texts (mapEnhanceClean, mapEnhanceWithArea with `{AREA}` placeholder, streetEnhance, halfBuilding, fullBuilding, 3 angles, 7 video prompts)
- `getPresetTemplate("real-estate-map-animation", contentLevel)`: generates a WorkflowFile with all 34 nodes and 39+ edges
- `TEMPLATE_CONTENT`: maps content levels (empty/minimal/full) to prompt text per node ID
- Template ID: `"real-estate-map-animation"`

---

## 4. File Inventory & Status

### COMPLETED Files (implemented and working)

| File | Lines | Description |
|------|-------|-------------|
| `src/lib/studio/nodeMap.ts` | 202 | 34 STUDIO_NODES, 9 STUDIO_STEPS, configureNodesForProvider |
| `src/lib/quickstart/templates.ts` | 1113 | All nodes, edges, prompts for V0-V6. Fixed V1 edge, fixed videoFullToAerial naming |
| `src/store/studioStore.ts` | 96 | 9 steps, videoDuration, buildingRef, buildingDescription fields |
| `src/lib/studio/persistence.ts` | 132 | StudioSnapshot with all new fields |
| `src/app/studio/page.tsx` | 139 | Restore + save all new fields |
| `src/components/studio/shared/AdvancedPromptSection.tsx` | 59 | Collapsible prompt editor |
| `src/components/studio/shared/DownloadButton.tsx` | 44 | Reusable download button |
| `src/components/studio/shared/ApiKeySetup.tsx` | 97 | Kie API key entry screen |
| `src/components/studio/shared/StatusIndicator.tsx` | 69 | Idle/loading/complete/error indicator |
| `src/components/studio/shared/StepFooter.tsx` | 57 | Primary action button footer |
| `src/components/studio/shared/StepHeader.tsx` | 65 | Step title + progress dots |
| `src/components/studio/steps/UploadStep.tsx` | 186 | Unchanged from original |
| `src/components/studio/steps/AnnotateStep.tsx` | 113 | Unchanged from original |
| `src/components/studio/steps/EnhanceMapStep.tsx` | 330 | 2 frames, AdvancedPrompt, download, ImageViewer via portal, auto-populate Frame 2 prompt |
| `src/components/studio/steps/GenerateBuildingStep.tsx` | 266 | 3-stage sequential, AdvancedPrompt, download, ref image upload, description field |
| `src/components/studio/steps/BuildingAnglesStep.tsx` | 152 | 3 parallel angles, generate all, per-card controls |
| `src/components/studio/steps/MapVideosStep.tsx` | 188 | V0 + V1, duration selector, VideoCard pattern |
| `src/components/studio/steps/ConstructionVideosStep.tsx` | 147 | V2 + V3, same VideoCard pattern |
| `src/components/studio/steps/ShowcaseVideosStep.tsx` | 159 | V4 + V5 + V6, same VideoCard pattern |
| `src/components/studio/steps/OutputStep.tsx` | 232 | Full gallery: 8 images + 7 videos, Download All, Share |
| `src/components/studio/StudioStepCarousel.tsx` | 93 | 9 panels with touch swipe |
| `src/components/studio/StudioWizard.tsx` | 201 | 9-step isStepComplete + getFooterProps |

### DELETED Files
| File | Reason |
|------|--------|
| `src/components/studio/steps/GenerateVideoStep.tsx` | Dead code — replaced by MapVideosStep, ConstructionVideosStep, ShowcaseVideosStep |

---

## 5. Known Issues & Bugs

### Pre-existing (NOT introduced by our changes)
1. **`src/components/AnnotationModal.tsx:320`** — `error TS2554: Expected 0 arguments, but got 1` in `handleMouseMove`. Blocks `next build` but not `next dev`.
2. **332 TypeScript errors in test files** (`route.test.ts`, `tools.test.ts`, `subgraphExtractor.test.ts`) — all pre-existing, unrelated to studio.

### Resolved During This Session
1. **Infinite re-render loop in EnhanceMapStep** — `useEffect` had `nodes` (entire array) in dependency array. `updateNodeData` created new nodes array → loop. Fixed by using a targeted Zustand selector that returns only the Frame 2 prompt string.
2. **ImageViewer clipped by carousel** — CSS `transform: translateX(...)` on the carousel creates a new containing block that clips `position: fixed` children. Fixed with `createPortal(... , document.body)`.
3. **Frame 2 prompt empty** — Template loads with `{AREA}` placeholder; useEffect now populates it on mount and when `plotSquareMeters` changes. Also explicitly set before generation in both `handleGenerate` and `handleRegenerateFrame2`.
4. **`PROMPTS.videoFullToAngles` undefined** — TEMPLATE_CONTENT referenced wrong key name. Fixed with replace_all to `PROMPTS.videoFullToAerial`.
5. **V1 edge wrong first frame** — Was `nanoBanana-map` (clean), should be `nanoBanana-map-frame2` (with area text). Fixed in edges array.
6. **GenerateVideoStep dead import** — Old component referenced removed STUDIO_NODES keys. Deleted the file.
7. **OutputStep `typeof navigator`** — Changed to `typeof window !== "undefined" && "share" in navigator`.

### Potentially Still Open (need user verification)
1. **Frame 2 prompt population on restored sessions** — The useEffect populates the prompt if it's empty or contains `{AREA}`. But if a user manually edited the prompt and saved, the useEffect won't overwrite it (by design). If the user clears their IndexedDB and starts fresh, it should work correctly.
2. **ImageViewer via portal** — Should work now that it's portaled to `document.body`, but hasn't been confirmed by the user yet after the portal fix.
3. **End-to-end generation flow** — The full 9-step flow with actual API calls has not been tested. Individual steps compile and render, but the generation pipeline (especially V5/V6 with their new edges) needs real testing.

---

## 6. Remaining Work / Future Improvements

### Not Yet Implemented
1. **Reference building image wiring** — The `GenerateBuildingStep` has UI for uploading a reference building image, but it only stores it in `studioStore.buildingReferenceImage`. It does NOT yet wire it as an additional image input to the `nanoBanana-half-building` and `nanoBanana-full-building` nodes. This would require:
   - Setting the image on `imageInput-building-ref` node data
   - Ensuring edges exist from that node to the half/full building generation nodes
   - The template may need additional edges for this

2. **Building description injection** — The `GenerateBuildingStep` has a text field for `buildingDescription` but it's stored in `studioStore` only. It is NOT yet appended to the half/full building prompts at generation time. Needs logic in the generate handler to append the description text to the prompt before calling `regenerateNode`.

3. **Video duration control** — The `MapVideosStep` has a duration selector UI (5s/10s) and it's stored in `studioStore.videoDuration`, but it's NOT yet passed to the video generation nodes. Video nodes need a `duration` field set via `updateNodeData` before generation.

4. **Comprehensive testing** — No automated tests exist for the studio components. Manual end-to-end testing with real API calls is needed.

5. **Mobile responsiveness** — The layout targets mobile but hasn't been extensively tested across different screen sizes.

---

## 7. Key Patterns & Conventions

### How generation works in Studio steps
```tsx
// 1. Set the prompt on the prompt node
updateNodeData(STUDIO_NODES.promptSomething, { prompt: "..." });
// 2. Set any params on the generation node (aspect ratio, etc.)
updateNodeData(STUDIO_NODES.generateSomething, { aspectRatio: "16:9" });
// 3. Trigger generation — workflowStore reads connected inputs automatically
await regenerateNode(STUDIO_NODES.generateSomething);
```

### How AdvancedPromptSection works
- Takes `promptNodeId` prop
- Reads prompt from `workflowStore.nodes.find(n => n.id === promptNodeId).data.prompt`
- Writes via `updateNodeData(promptNodeId, { prompt: newText })`
- Collapsed by default, toggled open with "Advanced ▼"

### How VideoCard pattern works (used in MapVideosStep, ConstructionVideosStep, ShowcaseVideosStep)
Each video step component defines a VideoCard sub-component that:
- Shows video player if `outputVideo` exists
- Shows generate button if not
- Has per-item download, regenerate, and AdvancedPromptSection
- Sets duration and aspect ratio on the video node before generation

### How ImageViewer works (EnhanceMapStep)
- Rendered via `createPortal(jsx, document.body)` to escape carousel's CSS transform
- z-index `9999`, full-screen overlay
- Triggered by clicking an image preview
- Closed by clicking backdrop or X button

### Carousel architecture
`StudioStepCarousel.tsx` uses CSS `translateX(-${step * panelWidth}%)` for smooth sliding. Each panel is `overflow-y-auto` for independent scrolling. Touch swipe handled via `onTouchStart`/`onTouchEnd` with threshold detection.

---

## 8. How to Continue

1. **Start the dev server**: `cd node-banana-new && npm run dev`
2. **Visit**: `http://localhost:3000/studio`
3. **Clear IndexedDB** if needed: DevTools → Application → IndexedDB → `node-banana-studio` → Delete database
4. **Test the full flow**: Upload images → Annotate → Generate map frames → Generate building stages → Generate angles → Generate videos → View output gallery
5. **Address remaining work** from Section 6 above

### Quick TypeScript check
```bash
npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "__tests__" | grep -v "test.ts"
```
Expected: only `AnnotationModal.tsx:320` (pre-existing).

---

## 9. Full Plan (Original)

The complete plan from the planning phase is preserved below for reference.

### Implementation Order (all completed)
1. Fix templates.ts — Added V5/V6 nodes + edges, fixed V1 edge, fixed videoFullToAerial bug
2. Update studioStore.ts — totalSteps=9, added new fields + setters
3. Update persistence.ts + page.tsx — added new fields to snapshot
4. Create shared components — AdvancedPromptSection.tsx + DownloadButton.tsx
5. Create 4 new step components — BuildingAnglesStep, MapVideosStep, ConstructionVideosStep, ShowcaseVideosStep
6. Update existing steps — EnhanceMapStep + GenerateBuildingStep with AdvancedPrompt/download/ref upload
7. Wire carousel + wizard — 9 panels, 9-step completion logic
8. Rewrite OutputStep — full gallery with all 8 images + 7 videos
9. Bug fixes — Infinite loop, ImageViewer portal, Frame 2 prompt population
