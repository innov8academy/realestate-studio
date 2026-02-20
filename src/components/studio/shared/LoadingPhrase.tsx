"use client";

import { useEffect, useState } from "react";

// ── Phrase sets ────────────────────────────────────────────────────────────

export const IMAGE_PHRASES = [
  "Measuring the plot...",
  "Pouring the foundation...",
  "Raising the structure...",
  "Setting the columns...",
  "Installing the facade...",
  "Fitting the windows...",
  "Shaping the roofline...",
  "Landscaping the surroundings...",
  "Calibrating the lighting...",
  "Balancing the shadows...",
  "Polishing the render...",
  "Perfecting the details...",
  "Adding street character...",
  "Almost ready...",
];

export const VIDEO_PHRASES = [
  "Spinning up the drone...",
  "Mapping the flight path...",
  "Choreographing the shot...",
  "Rendering each frame...",
  "Smoothing the motion...",
  "Timing the golden hour...",
  "Balancing the exposure...",
  "Syncing the camera movement...",
  "Adding cinematic depth...",
  "Fine-tuning the transition...",
  "Cinematic quality check...",
  "Polishing every frame...",
  "Almost there...",
];

export const MAP_PHRASES = [
  "Reading the terrain...",
  "Tracing the plot boundary...",
  "Enhancing the aerial view...",
  "Sharpening satellite detail...",
  "Colour grading the scene...",
  "Highlighting the land...",
  "Adding the boundary glow...",
  "Rendering the overhead view...",
  "Almost ready...",
];

// ── Component ──────────────────────────────────────────────────────────────

interface LoadingPhraseProps {
  /** Which phrase set to use */
  set?: "image" | "video" | "map";
  /** How long each phrase is shown, in ms (default 2500) */
  interval?: number;
  className?: string;
}

export function LoadingPhrase({
  set = "image",
  interval = 2500,
  className = "",
}: LoadingPhraseProps) {
  const phrases =
    set === "video" ? VIDEO_PHRASES : set === "map" ? MAP_PHRASES : IMAGE_PHRASES;

  const [index, setIndex] = useState(() => Math.floor(Math.random() * phrases.length));
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      // Fade out
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % phrases.length);
        setVisible(true);
      }, 300);
    }, interval);
    return () => clearInterval(timer);
  }, [phrases.length, interval]);

  return (
    <span
      className={`transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"} ${className}`}
    >
      {phrases[index]}
    </span>
  );
}
