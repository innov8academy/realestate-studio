"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ReactSketchCanvas, type ReactSketchCanvasRef, type CanvasPath } from "react-sketch-canvas";
import { useAnnotationStore } from "@/store/annotationStore";
import { useWorkflowStore } from "@/store/workflowStore";

const COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#000000",
  "#ffffff",
];

const STROKE_WIDTHS = [3, 6, 12];

export function AnnotationModal() {
  const {
    isModalOpen,
    sourceNodeId,
    sourceImage,
    annotations,
    toolOptions,
    closeModal,
    clearAnnotations,
    setToolOptions,
  } = useAnnotationStore();

  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);

  const canvasRef = useRef<ReactSketchCanvasRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isEraser, setIsEraser] = useState(false);
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Load existing annotations (paths) when modal opens
  useEffect(() => {
    if (isModalOpen && canvasRef.current && annotations.length > 0) {
      // annotations are stored as CanvasPath[] in the new system
      const paths = annotations as unknown as CanvasPath[];
      // Small delay to ensure canvas is mounted
      const timer = setTimeout(() => {
        canvasRef.current?.loadPaths(paths);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isModalOpen, annotations]);

  // Toggle eraser mode
  const toggleEraser = useCallback(() => {
    const next = !isEraser;
    setIsEraser(next);
    if (next) {
      canvasRef.current?.eraseMode(true);
    } else {
      canvasRef.current?.eraseMode(false);
    }
  }, [isEraser]);

  const handleUndo = useCallback(() => {
    canvasRef.current?.undo();
  }, []);

  const handleRedo = useCallback(() => {
    canvasRef.current?.redo();
  }, []);

  const handleClear = useCallback(() => {
    canvasRef.current?.clearCanvas();
    clearAnnotations();
  }, [clearAnnotations]);

  // Done: export the image with annotations and save paths
  const handleDone = useCallback(async () => {
    if (!sourceNodeId || !canvasRef.current) return;

    try {
      // Export the flattened image (background + drawings)
      const dataUrl = await canvasRef.current.exportImage("png");
      // Export the paths for later restoration
      const paths = await canvasRef.current.exportPaths();

      // Store paths as annotations (reusing the field) and the flattened image
      updateNodeData(sourceNodeId, {
        annotations: paths as unknown[],
        outputImage: dataUrl,
      });
    } catch (err) {
      console.error("Failed to export annotation image:", err);
    }

    closeModal();
  }, [sourceNodeId, updateNodeData, closeModal]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen, handleUndo, handleRedo]);

  if (!isModalOpen) return null;
  if (isMobile === null) return null;

  // ══════════════════════════════════════════════════════════════════════════
  // MOBILE LAYOUT — full-screen, thumb-friendly
  // ══════════════════════════════════════════════════════════════════════════
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-[100] bg-neutral-950 flex flex-col">
        {/* Canvas — takes all available space */}
        <div ref={containerRef} className="flex-1 overflow-hidden bg-neutral-900" style={{ touchAction: "none" }}>
          {sourceImage && (
            <ReactSketchCanvas
              ref={canvasRef}
              width="100%"
              height="100%"
              backgroundImage={sourceImage}
              preserveBackgroundImageAspectRatio="xMidYMid meet"
              strokeWidth={toolOptions.strokeWidth}
              strokeColor={toolOptions.strokeColor}
              eraserWidth={toolOptions.strokeWidth * 3}
              canvasColor="transparent"
              exportWithBackgroundImage
              allowOnlyPointerType="all"
              style={{ border: "none" }}
            />
          )}
        </div>

        {/* Bottom toolbar — always visible, Cancel/Done here */}
        <div className="flex-shrink-0 bg-neutral-900 border-t border-neutral-800" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
          {/* Row 1: Cancel + Colors + Undo/Clear + Done */}
          <div className="flex items-center gap-1.5 px-3 py-2">
            <button
              onTouchEnd={(e) => { e.preventDefault(); closeModal(); }}
              onClick={closeModal}
              className="px-3 py-2 text-sm text-neutral-400 active:text-white rounded-lg flex-shrink-0"
            >
              Cancel
            </button>

            <div className="flex items-center gap-1.5 flex-1 overflow-x-auto scrollbar-none">
              {COLORS.map((color) => (
                <button
                  key={color}
                  onTouchEnd={(e) => { e.preventDefault(); setIsEraser(false); canvasRef.current?.eraseMode(false); setToolOptions({ strokeColor: color }); }}
                  onClick={() => { setIsEraser(false); canvasRef.current?.eraseMode(false); setToolOptions({ strokeColor: color }); }}
                  className={`w-8 h-8 rounded-full flex-shrink-0 active:scale-90 transition-transform ${toolOptions.strokeColor === color && !isEraser ? "ring-2 ring-white ring-offset-1 ring-offset-neutral-900" : ""}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>

            {/* Undo */}
            <button
              onTouchEnd={(e) => { e.preventDefault(); handleUndo(); }}
              onClick={handleUndo}
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-neutral-800 text-neutral-400 active:text-white flex-shrink-0"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
              </svg>
            </button>

            <button
              onTouchEnd={(e) => { e.preventDefault(); handleDone(); }}
              onClick={handleDone}
              className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 active:bg-emerald-500 rounded-lg flex-shrink-0"
            >
              Done
            </button>
          </div>

          {/* Row 2: Stroke widths + Draw/Eraser */}
          <div className="flex items-center gap-2 px-3 pb-2">
            {STROKE_WIDTHS.map((width) => (
              <button
                key={width}
                onTouchEnd={(e) => { e.preventDefault(); setToolOptions({ strokeWidth: width }); }}
                onClick={() => setToolOptions({ strokeWidth: width })}
                className={`w-10 h-10 rounded-xl flex items-center justify-center active:scale-95 transition-all ${toolOptions.strokeWidth === width ? "bg-neutral-700 ring-1 ring-neutral-500" : "bg-neutral-800"}`}
              >
                <div className="bg-white rounded-full" style={{ width: width * 2, height: width * 2 }} />
              </button>
            ))}

            <div className="w-px h-8 bg-neutral-700 mx-1" />

            {/* Draw tool */}
            <button
              onTouchEnd={(e) => { e.preventDefault(); setIsEraser(false); canvasRef.current?.eraseMode(false); }}
              onClick={() => { setIsEraser(false); canvasRef.current?.eraseMode(false); }}
              className={`flex-1 h-10 flex flex-col items-center justify-center gap-0.5 rounded-xl active:scale-95 transition-all ${!isEraser ? "bg-white text-neutral-900" : "bg-neutral-800 text-neutral-400"}`}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 3.487a2.25 2.25 0 113.182 3.182L7.5 19.213l-4 1 1-4L16.862 3.487z" />
              </svg>
              <span className="text-[9px] font-medium leading-none">Draw</span>
            </button>

            {/* Eraser tool */}
            <button
              onTouchEnd={(e) => { e.preventDefault(); toggleEraser(); }}
              onClick={toggleEraser}
              className={`flex-1 h-10 flex flex-col items-center justify-center gap-0.5 rounded-xl active:scale-95 transition-all ${isEraser ? "bg-white text-neutral-900" : "bg-neutral-800 text-neutral-400"}`}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.505 14.706L11.2 9.01a2.828 2.828 0 014 0l2.79 2.79a2.828 2.828 0 010 4L14.495 19.294M5.505 14.706L2.71 17.5a2 2 0 000 2.828l.962.962a2 2 0 002.828 0l2.5-2.5M5.505 14.706l3.495 3.494M21 21H12" />
              </svg>
              <span className="text-[9px] font-medium leading-none">Eraser</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DESKTOP LAYOUT — compact layout
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="fixed inset-0 z-[100] bg-neutral-950 flex flex-col">
      {/* Top Bar */}
      <div className="flex-shrink-0 bg-neutral-900 border-b border-neutral-800">
        <div className="h-11 flex items-center justify-between px-3">
          <div className="flex items-center gap-1">
            <button onClick={handleUndo} className="px-2 py-1 text-xs text-neutral-400 hover:text-white">Undo</button>
            <button onClick={handleRedo} className="px-2 py-1 text-xs text-neutral-400 hover:text-white">Redo</button>
            <button onClick={handleClear} className="px-2 py-1 text-xs text-neutral-400 hover:text-red-400">Clear</button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={closeModal} className="px-3 py-1 text-xs font-medium text-neutral-400 hover:text-white">Cancel</button>
            <button onClick={handleDone} className="px-3 py-1 text-xs font-medium bg-white text-neutral-900 rounded hover:bg-neutral-200">Done</button>
          </div>
        </div>
        <div className="h-10 flex items-center gap-1 px-3">
          <button
            onClick={() => { setIsEraser(false); canvasRef.current?.eraseMode(false); }}
            className={`px-3 py-1 text-xs font-medium rounded whitespace-nowrap transition-colors ${!isEraser ? "bg-white text-neutral-900" : "text-neutral-400 hover:text-white"}`}
          >
            Draw
          </button>
          <button
            onClick={() => { setIsEraser(true); canvasRef.current?.eraseMode(true); }}
            className={`px-3 py-1 text-xs font-medium rounded whitespace-nowrap transition-colors ${isEraser ? "bg-white text-neutral-900" : "text-neutral-400 hover:text-white"}`}
          >
            Eraser
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="flex-1 overflow-hidden bg-neutral-900">
        {sourceImage && (
          <ReactSketchCanvas
            ref={canvasRef}
            width="100%"
            height="100%"
            backgroundImage={sourceImage}
            preserveBackgroundImageAspectRatio="xMidYMid meet"
            strokeWidth={toolOptions.strokeWidth}
            strokeColor={toolOptions.strokeColor}
            eraserWidth={toolOptions.strokeWidth * 3}
            canvasColor="transparent"
            exportWithBackgroundImage
            style={{ border: "none" }}
          />
        )}
      </div>

      {/* Bottom Options Bar */}
      <div className="bg-neutral-900 border-t border-neutral-800">
        <div className="h-11 flex items-center justify-between px-3">
          <div className="flex items-center gap-1.5">
            {COLORS.map((color) => (
              <button
                key={color}
                onClick={() => { setIsEraser(false); canvasRef.current?.eraseMode(false); setToolOptions({ strokeColor: color }); }}
                className={`w-6 h-6 rounded-full transition-transform flex-shrink-0 ${toolOptions.strokeColor === color && !isEraser ? "ring-2 ring-white ring-offset-1 ring-offset-neutral-900 scale-110" : "hover:scale-105"}`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
        <div className="h-9 flex items-center gap-3 px-3 border-t border-neutral-800/50">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-neutral-500 uppercase tracking-wide">Size</span>
            {STROKE_WIDTHS.map((width) => (
              <button
                key={width}
                onClick={() => setToolOptions({ strokeWidth: width })}
                className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${toolOptions.strokeWidth === width ? "bg-neutral-700" : "hover:bg-neutral-800"}`}
              >
                <div className="bg-white rounded-full" style={{ width: width * 1.5, height: width * 1.5 }} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
