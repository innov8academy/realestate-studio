"use client";

import { useEffect, useState } from "react";

// ── Phrase sets ────────────────────────────────────────────────────────────

export const IMAGE_PHRASES = [
  "AI pani edukkunnu, oru sec...",
  "Ippo sheriyakki tharam...",
  "Aa cheriyoru spanner ingeduthe...",
  "W house incoming...",
];

export const VIDEO_PHRASES = [
  "Drone parappikunnu, one min...",
  "W video incoming...",
  "Kshama venam, samayam edukkum...",
  "Kshama attin soopinte bhalam cheyyum...",
];

export const MAP_PHRASES = [
  "Sthalam vrithiyakkunnu...",
  "Satellite nokkunnu, oru sec...",
  "Plot mele ninnu kandupidikkunnu...",
  "Map enhance aakkunnu...",
  "Aerial view varakkunnu, wait...",
  "GPS lock aakkunnu, adipoli...",
  "Satellite zoom in cheyyunnu...",
  "Ninte plot kandupidichu...",
  "Map thayaraakkunnu, almost done...",
];

export const STITCH_PHRASES = [
  "Clips okke set, almost ready...",
  "Thallipoli cut ready aakkunnu...",
  "Ithu kandal ningal njettum...",
  "Kaathirunnu kaathirunnu kannu kazhachu...",
  "Koncham wait cheyyoo...",
];

export const SETUP_PHRASES = [
  "Ellam set aakkunnu...",
  "Thudangam alle...",
  "Studio orukkukayaane...",
  "Ippo thudangam...",
  "Oru sec, ready aakkunnu...",
];

// ── Component ──────────────────────────────────────────────────────────────

interface LoadingPhraseProps {
  /** Which phrase set to use */
  set?: "image" | "video" | "map" | "stitch" | "setup";
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
    set === "video"
      ? VIDEO_PHRASES
      : set === "map"
        ? MAP_PHRASES
        : set === "stitch"
          ? STITCH_PHRASES
          : set === "setup"
            ? SETUP_PHRASES
            : IMAGE_PHRASES;

  const [index, setIndex] = useState(() => Math.floor(Math.random() * phrases.length));
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % phrases.length);
        setVisible(true);
      }, 300);
    }, interval);
    return () => clearInterval(timer);
  }, [phrases.length, interval]);

  return (
    <span className={`flex flex-col items-center gap-1.5 ${className}`}>
      <span
        className={`italic text-white/80 transition-opacity duration-300 text-center ${visible ? "opacity-100" : "opacity-0"}`}
      >
        {phrases[index]}
      </span>
      <span className="flex gap-1.5">
        <span className="dot-pulse" style={{ animationDelay: "0ms" }} />
        <span className="dot-pulse" style={{ animationDelay: "300ms" }} />
        <span className="dot-pulse" style={{ animationDelay: "600ms" }} />
      </span>
      <style>{`
        .dot-pulse {
          display: inline-block;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: rgba(255,255,255,0.3);
          animation: dotPulse 1.2s ease-in-out infinite;
        }
        @keyframes dotPulse {
          0%, 80%, 100% { background: rgba(255,255,255,0.2); transform: scale(0.8); }
          40% { background: rgba(255,255,255,0.8); transform: scale(1.2); }
        }
      `}</style>
    </span>
  );
}
