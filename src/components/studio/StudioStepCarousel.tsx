"use client";

import { useRef, useCallback } from "react";
import { useStudioStore } from "@/store/studioStore";
import { UploadStep } from "./steps/UploadStep";
import { AnnotateStep } from "./steps/AnnotateStep";
import { EnhanceMapStep } from "./steps/EnhanceMapStep";
import { GenerateBuildingStep } from "./steps/GenerateBuildingStep";
import { BuildingAnglesStep } from "./steps/BuildingAnglesStep";
import { MapVideosStep } from "./steps/MapVideosStep";
import { ConstructionVideosStep } from "./steps/ConstructionVideosStep";
import { ShowcaseVideosStep } from "./steps/ShowcaseVideosStep";
import { VideoStitchStep } from "./steps/VideoStitchStep";
import { OutputStep } from "./steps/OutputStep";

const SWIPE_THRESHOLD = 50;
const TOTAL_PANELS = 10;

export function StudioStepCarousel() {
  const currentStep = useStudioStore((s) => s.currentStep);
  const goNext = useStudioStore((s) => s.goNext);
  const goBack = useStudioStore((s) => s.goBack);

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const deltaX = e.changedTouches[0].clientX - touchStartX.current;
      const deltaY = e.changedTouches[0].clientY - touchStartY.current;

      // Only trigger if horizontal swipe is dominant
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > SWIPE_THRESHOLD) {
        if (deltaX < 0) {
          goNext();
        } else {
          goBack();
        }
      }
    },
    [goNext, goBack]
  );

  const panelWidth = 100 / TOTAL_PANELS;

  return (
    <div
      className="flex-1 min-h-0 overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="flex h-full transition-transform duration-300 ease-out"
        style={{
          width: `${TOTAL_PANELS * 100}%`,
          transform: `translateX(-${currentStep * panelWidth}%)`,
        }}
      >
        <div style={{ width: `${panelWidth}%` }} className="h-full overflow-y-auto px-4">
          <UploadStep />
        </div>
        <div style={{ width: `${panelWidth}%` }} className="h-full overflow-y-auto px-4">
          <AnnotateStep />
        </div>
        <div style={{ width: `${panelWidth}%` }} className="h-full overflow-y-auto px-4">
          <EnhanceMapStep />
        </div>
        <div style={{ width: `${panelWidth}%` }} className="h-full overflow-y-auto px-4">
          <GenerateBuildingStep />
        </div>
        <div style={{ width: `${panelWidth}%` }} className="h-full overflow-y-auto px-4">
          <BuildingAnglesStep />
        </div>
        <div style={{ width: `${panelWidth}%` }} className="h-full overflow-y-auto px-4">
          <MapVideosStep />
        </div>
        <div style={{ width: `${panelWidth}%` }} className="h-full overflow-y-auto px-4">
          <ConstructionVideosStep />
        </div>
        <div style={{ width: `${panelWidth}%` }} className="h-full overflow-y-auto px-4">
          <ShowcaseVideosStep />
        </div>
        <div style={{ width: `${panelWidth}%` }} className="h-full overflow-y-auto px-4">
          <VideoStitchStep />
        </div>
        <div style={{ width: `${panelWidth}%` }} className="h-full overflow-y-auto px-4">
          <OutputStep />
        </div>
      </div>
    </div>
  );
}
