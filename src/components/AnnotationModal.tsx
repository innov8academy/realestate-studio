"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Stage, Layer, Image as KonvaImage, Rect, Ellipse, Arrow, Line, Text, Transformer } from "react-konva";
import { useAnnotationStore } from "@/store/annotationStore";
import { useWorkflowStore } from "@/store/workflowStore";
import {
  AnnotationShape,
  RectangleShape,
  CircleShape,
  ArrowShape,
  FreehandShape,
  TextShape,
  ToolType,
} from "@/types";
import Konva from "konva";

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

const STROKE_WIDTHS = [2, 4, 8];

// ── SVG icon helpers (mobile toolbar) ──────────────────────────────────────
function IconSelect() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-5.4 1.8 1.8-5.4L19.5 4.5a2.121 2.121 0 013 3L15 15z" />
    </svg>
  );
}
function IconRect() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="5" width="18" height="14" rx="1.5" />
    </svg>
  );
}
function IconDraw() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 3.487a2.25 2.25 0 113.182 3.182L7.5 19.213l-4 1 1-4L16.862 3.487z" />
    </svg>
  );
}
function IconUndo() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
    </svg>
  );
}
function IconTrash() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}

export function AnnotationModal() {
  const {
    isModalOpen,
    sourceNodeId,
    sourceImage,
    annotations,
    selectedShapeId,
    currentTool,
    toolOptions,
    closeModal,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    clearAnnotations,
    selectShape,
    setCurrentTool,
    setToolOptions,
    undo,
    redo,
  } = useAnnotationStore();

  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);

  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
  const [currentShape, setCurrentShape] = useState<AnnotationShape | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [textInputPosition, setTextInputPosition] = useState<{ x: number; y: number } | null>(null);
  const [pendingTextPosition, setPendingTextPosition] = useState<{ x: number; y: number } | null>(null);
  const textInputCreatedAt = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" ? window.innerWidth < 768 : false);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const panOriginRef = useRef({ x: 0, y: 0 });

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Track container size with ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerSize({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [isModalOpen]);

  useEffect(() => {
    if (sourceImage) {
      const img = new window.Image();
      img.onload = () => {
        setImage(img);
        if (containerRef.current) {
          const mobile = window.innerWidth < 768;
          const padding = mobile ? 8 : 80;
          const containerWidth = containerRef.current.clientWidth - padding;
          const containerHeight = containerRef.current.clientHeight - padding;
          const scaleX = containerWidth / img.width;
          const scaleY = containerHeight / img.height;
          const newScale = Math.min(scaleX, scaleY, 1);
          setScale(newScale);
          setStageSize({ width: img.width, height: img.height });
          setPosition({
            x: (containerWidth - img.width * newScale) / 2 + padding / 2,
            y: (containerHeight - img.height * newScale) / 2 + padding / 2,
          });
        }
      };
      img.src = sourceImage;
    }
  }, [sourceImage]);

  useEffect(() => {
    if (transformerRef.current && stageRef.current) {
      const selectedNode = stageRef.current.findOne(`#${selectedShapeId}`);
      if (selectedNode && currentTool === "select") {
        transformerRef.current.nodes([selectedNode]);
      } else {
        transformerRef.current.nodes([]);
      }
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selectedShapeId, currentTool]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isModalOpen) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedShapeId && !editingTextId) {
          deleteAnnotation(selectedShapeId);
        }
      }
      if (e.key === "Escape") {
        if (editingTextId) {
          setEditingTextId(null);
          setTextInputPosition(null);
          setPendingTextPosition(null);
        } else {
          closeModal();
        }
      }
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "z") {
          e.preventDefault();
          if (e.shiftKey) redo();
          else undo();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen, selectedShapeId, editingTextId, deleteAnnotation, closeModal, undo, redo]);

  const getRelativePointerPosition = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return { x: 0, y: 0 };
    const transform = stage.getAbsoluteTransform().copy().invert();
    const pos = stage.getPointerPosition();
    if (!pos) return { x: 0, y: 0 };
    return transform.point(pos);
  }, []);

  const startDrawing = useCallback(
    (pos: { x: number; y: number }) => {
      if (currentTool === "select") return;
      setIsDrawing(true);
      setDrawStart(pos);

      const id = `shape-${Date.now()}`;
      const baseShape = {
        id,
        x: pos.x,
        y: pos.y,
        stroke: toolOptions.strokeColor,
        strokeWidth: toolOptions.strokeWidth,
        opacity: toolOptions.opacity,
      };

      let newShape: AnnotationShape | null = null;
      switch (currentTool) {
        case "rectangle":
          newShape = { ...baseShape, type: "rectangle", width: 0, height: 0, fill: toolOptions.fillColor } as RectangleShape;
          break;
        case "circle":
          newShape = { ...baseShape, type: "circle", radiusX: 0, radiusY: 0, fill: toolOptions.fillColor } as CircleShape;
          break;
        case "arrow":
          newShape = { ...baseShape, type: "arrow", points: [0, 0, 0, 0] } as ArrowShape;
          break;
        case "freehand":
          newShape = { ...baseShape, type: "freehand", points: [0, 0] } as FreehandShape;
          break;
        case "text": {
          const stage = stageRef.current;
          if (stage) {
            const container = stage.container();
            const stageBox = container?.getBoundingClientRect();
            if (stageBox) {
              const screenX = stageBox.left + pos.x * scale + position.x;
              const screenY = stageBox.top + pos.y * scale + position.y;
              setTextInputPosition({ x: screenX, y: screenY });
              setPendingTextPosition({ x: pos.x, y: pos.y });
            }
          }
          textInputCreatedAt.current = Date.now();
          setEditingTextId("new");
          setIsDrawing(false);
          setTimeout(() => textInputRef.current?.focus(), 0);
          return;
        }
      }
      if (newShape) setCurrentShape(newShape);
    },
    [currentTool, toolOptions, scale, position]
  );

  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (currentTool === "select") {
        const clickedOnEmpty = e.target === e.target.getStage() || e.target.getClassName() === "Image";
        if (clickedOnEmpty) {
          selectShape(null);
          // Start panning
          isPanningRef.current = true;
          panStartRef.current = { x: e.evt.clientX, y: e.evt.clientY };
          panOriginRef.current = { x: position.x, y: position.y };
        }
        return;
      }
      const pos = getRelativePointerPosition();
      startDrawing(pos);
    },
    [currentTool, getRelativePointerPosition, startDrawing, selectShape, position]
  );

  const handleMouseMove = useCallback((e?: Konva.KonvaEventObject<MouseEvent>) => {
    if (isPanningRef.current && e) {
      setPosition({
        x: panOriginRef.current.x + (e.evt.clientX - panStartRef.current.x),
        y: panOriginRef.current.y + (e.evt.clientY - panStartRef.current.y),
      });
      return;
    }
    if (!isDrawing || !currentShape) return;
    const pos = getRelativePointerPosition();

    switch (currentShape.type) {
      case "rectangle": {
        const width = pos.x - drawStart.x;
        const height = pos.y - drawStart.y;
        setCurrentShape({ ...currentShape, x: width < 0 ? pos.x : drawStart.x, y: height < 0 ? pos.y : drawStart.y, width: Math.abs(width), height: Math.abs(height) } as RectangleShape);
        break;
      }
      case "circle": {
        const radiusX = Math.abs(pos.x - drawStart.x) / 2;
        const radiusY = Math.abs(pos.y - drawStart.y) / 2;
        setCurrentShape({ ...currentShape, x: (drawStart.x + pos.x) / 2, y: (drawStart.y + pos.y) / 2, radiusX, radiusY } as CircleShape);
        break;
      }
      case "arrow":
        setCurrentShape({ ...currentShape, points: [0, 0, pos.x - drawStart.x, pos.y - drawStart.y] } as ArrowShape);
        break;
      case "freehand": {
        const freehand = currentShape as FreehandShape;
        setCurrentShape({ ...freehand, points: [...freehand.points, pos.x - drawStart.x, pos.y - drawStart.y] } as FreehandShape);
        break;
      }
    }
  }, [isDrawing, currentShape, drawStart, getRelativePointerPosition]);

  const handleMouseUp = useCallback(() => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      return;
    }
    if (!isDrawing || !currentShape) return;
    setIsDrawing(false);

    let shouldAdd = true;
    if (currentShape.type === "rectangle") {
      const rect = currentShape as RectangleShape;
      shouldAdd = rect.width > 5 && rect.height > 5;
    } else if (currentShape.type === "circle") {
      const circle = currentShape as CircleShape;
      shouldAdd = circle.radiusX > 5 && circle.radiusY > 5;
    } else if (currentShape.type === "arrow") {
      const arrow = currentShape as ArrowShape;
      const dx = arrow.points[2];
      const dy = arrow.points[3];
      shouldAdd = Math.sqrt(dx * dx + dy * dy) > 10;
    }

    if (shouldAdd) addAnnotation(currentShape);
    setCurrentShape(null);
  }, [isDrawing, currentShape, addAnnotation]);

  // ── Touch handlers — properly set pointer positions before reading them ──

  const handleTouchStart = useCallback(
    (e: Konva.KonvaEventObject<TouchEvent>) => {
      const touches = e.evt.touches;
      if (touches.length === 1) {
        if (currentTool === "select") {
          // Start pan
          const t = touches[0];
          isPanningRef.current = true;
          panStartRef.current = { x: t.clientX, y: t.clientY };
          panOriginRef.current = { x: position.x, y: position.y };
          // Also allow tap-to-select via Konva's tap event — don't preventDefault
        } else {
          e.evt.preventDefault();
          const stage = stageRef.current;
          if (stage) stage.setPointersPositions(e.evt);
          const pos = getRelativePointerPosition();
          startDrawing(pos);
        }
      } else if (touches.length === 2) {
        // Starting pinch — cancel any panning or drawing
        isPanningRef.current = false;
        setIsDrawing(false);
        setCurrentShape(null);
        lastPinchDist.current = null;
        lastPinchCenter.current = null;
      }
    },
    [currentTool, getRelativePointerPosition, startDrawing, position]
  );

  const lastPinchDist = useRef<number | null>(null);
  const lastPinchCenter = useRef<{ x: number; y: number } | null>(null);

  const handleTouchMove = useCallback(
    (e: Konva.KonvaEventObject<TouchEvent>) => {
      const touch = e.evt.touches;
      if (touch.length === 2) {
        e.evt.preventDefault();
        isPanningRef.current = false;
        try {
          const dx = touch[0].clientX - touch[1].clientX;
          const dy = touch[0].clientY - touch[1].clientY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 1) return; // avoid division by near-zero

          if (lastPinchDist.current !== null && lastPinchDist.current > 1) {
            const delta = dist / lastPinchDist.current;
            if (isFinite(delta) && !isNaN(delta)) {
              setScale((s) => Math.min(Math.max(s * delta, 0.1), 5));
            }
          }
          lastPinchDist.current = dist;

          const centerX = (touch[0].clientX + touch[1].clientX) / 2;
          const centerY = (touch[0].clientY + touch[1].clientY) / 2;
          if (lastPinchCenter.current) {
            setPosition((prev) => ({
              x: prev.x + (centerX - lastPinchCenter.current!.x),
              y: prev.y + (centerY - lastPinchCenter.current!.y),
            }));
          }
          lastPinchCenter.current = { x: centerX, y: centerY };
        } catch {
          // Pinch failed silently — reset state
          lastPinchDist.current = null;
          lastPinchCenter.current = null;
        }
      } else if (touch.length === 1) {
        if (isPanningRef.current) {
          e.evt.preventDefault();
          const t = touch[0];
          setPosition({
            x: panOriginRef.current.x + (t.clientX - panStartRef.current.x),
            y: panOriginRef.current.y + (t.clientY - panStartRef.current.y),
          });
        } else if (isDrawing) {
          e.evt.preventDefault();
          const stage = stageRef.current;
          if (stage) stage.setPointersPositions(e.evt);
          handleMouseMove();
        }
      }
    },
    [isDrawing, handleMouseMove]
  );

  const handleTouchEnd = useCallback(() => {
    lastPinchDist.current = null;
    lastPinchCenter.current = null;
    isPanningRef.current = false;
    if (isDrawing) handleMouseUp();
  }, [isDrawing, handleMouseUp]);

  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const scaleBy = 1.1;
    const newScale = e.evt.deltaY > 0 ? scale / scaleBy : scale * scaleBy;
    setScale(Math.min(Math.max(newScale, 0.1), 5));
  }, [scale]);

  const flattenImage = useCallback((): string => {
    const stage = stageRef.current;
    if (!stage || !image) return "";

    const container = document.createElement("div");
    document.body.appendChild(container);
    const tempStage = new Konva.Stage({ container, width: image.width, height: image.height });
    const tempLayer = new Konva.Layer();
    tempStage.add(tempLayer);

    const konvaImage = new Konva.Image({ image, width: image.width, height: image.height });
    tempLayer.add(konvaImage);

    annotations.forEach((shape) => {
      let konvaShape: Konva.Shape | null = null;
      switch (shape.type) {
        case "rectangle": {
          const rect = shape as RectangleShape;
          konvaShape = new Konva.Rect({ x: rect.x, y: rect.y, width: rect.width, height: rect.height, stroke: rect.stroke, strokeWidth: rect.strokeWidth, fill: rect.fill || undefined, opacity: rect.opacity });
          break;
        }
        case "circle": {
          const circle = shape as CircleShape;
          konvaShape = new Konva.Ellipse({ x: circle.x, y: circle.y, radiusX: circle.radiusX, radiusY: circle.radiusY, stroke: circle.stroke, strokeWidth: circle.strokeWidth, fill: circle.fill || undefined, opacity: circle.opacity });
          break;
        }
        case "arrow": {
          const arrow = shape as ArrowShape;
          konvaShape = new Konva.Arrow({ x: arrow.x, y: arrow.y, points: arrow.points, stroke: arrow.stroke, strokeWidth: arrow.strokeWidth, fill: arrow.stroke, opacity: arrow.opacity });
          break;
        }
        case "freehand": {
          const freehand = shape as FreehandShape;
          konvaShape = new Konva.Line({ x: freehand.x, y: freehand.y, points: freehand.points, stroke: freehand.stroke, strokeWidth: freehand.strokeWidth, opacity: freehand.opacity, lineCap: "round", lineJoin: "round" });
          break;
        }
        case "text": {
          const text = shape as TextShape;
          konvaShape = new Konva.Text({ x: text.x, y: text.y, text: text.text, fontSize: text.fontSize, fill: text.fill, opacity: text.opacity });
          break;
        }
      }
      if (konvaShape) tempLayer.add(konvaShape);
    });

    tempLayer.draw();
    const dataUrl = tempStage.toDataURL({ pixelRatio: 1 });
    tempStage.destroy();
    document.body.removeChild(container);
    return dataUrl;
  }, [image, annotations]);

  const handleDone = useCallback(() => {
    if (!sourceNodeId) return;
    const flattenedImage = flattenImage();
    updateNodeData(sourceNodeId, { annotations, outputImage: flattenedImage });
    closeModal();
  }, [sourceNodeId, annotations, flattenImage, updateNodeData, closeModal]);

  const renderShape = (shape: AnnotationShape, isPreview = false) => {
    const commonProps = {
      id: shape.id,
      opacity: shape.opacity,
      onClick: () => { if (currentTool === "select") selectShape(shape.id); },
      draggable: currentTool === "select" && !isPreview,
      onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => { updateAnnotation(shape.id, { x: e.target.x(), y: e.target.y() }); },
    };

    switch (shape.type) {
      case "rectangle": {
        const rect = shape as RectangleShape;
        return <Rect key={shape.id} {...commonProps} x={rect.x} y={rect.y} width={rect.width} height={rect.height} stroke={rect.stroke} strokeWidth={rect.strokeWidth} fill={rect.fill || undefined} />;
      }
      case "circle": {
        const circle = shape as CircleShape;
        return <Ellipse key={shape.id} {...commonProps} x={circle.x} y={circle.y} radiusX={circle.radiusX} radiusY={circle.radiusY} stroke={circle.stroke} strokeWidth={circle.strokeWidth} fill={circle.fill || undefined} />;
      }
      case "arrow": {
        const arrow = shape as ArrowShape;
        return <Arrow key={shape.id} {...commonProps} x={arrow.x} y={arrow.y} points={arrow.points} stroke={arrow.stroke} strokeWidth={arrow.strokeWidth} fill={arrow.stroke} />;
      }
      case "freehand": {
        const freehand = shape as FreehandShape;
        return <Line key={shape.id} {...commonProps} x={freehand.x} y={freehand.y} points={freehand.points} stroke={freehand.stroke} strokeWidth={freehand.strokeWidth} lineCap="round" lineJoin="round" />;
      }
      case "text": {
        const text = shape as TextShape;
        return (
          <Text
            key={shape.id}
            {...commonProps}
            x={text.x}
            y={text.y}
            text={text.text || " "}
            fontSize={text.fontSize}
            fill={text.fill}
            onTransformEnd={(e) => {
              const node = e.target;
              const scaleX = node.scaleX();
              const scaleY = node.scaleY();
              node.scaleX(1);
              node.scaleY(1);
              const newFontSize = Math.round(text.fontSize * Math.max(scaleX, scaleY));
              updateAnnotation(shape.id, { x: node.x(), y: node.y(), fontSize: newFontSize });
            }}
            onDblClick={() => {
              if (currentTool === "select") {
                const stage = stageRef.current;
                if (stage) {
                  const stageBox = stage.container().getBoundingClientRect();
                  const screenX = stageBox.left + text.x * scale + position.x;
                  const screenY = stageBox.top + text.y * scale + position.y;
                  setTextInputPosition({ x: screenX, y: screenY });
                }
                setEditingTextId(shape.id);
                setTimeout(() => textInputRef.current?.focus(), 0);
              }
            }}
          />
        );
      }
    }
  };

  if (!isModalOpen) return null;

  // ── Shared canvas ────────────────────────────────────────────────────────
  const canvas = (
    <div ref={containerRef} className="flex-1 overflow-hidden bg-neutral-900" style={{ touchAction: "none" }}>
      <Stage
        ref={stageRef}
        width={containerSize.width}
        height={containerSize.height}
        scaleX={scale}
        scaleY={scale}
        x={position.x}
        y={position.y}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
      >
        <Layer>
          {image && <KonvaImage image={image} width={stageSize.width} height={stageSize.height} />}
          {annotations.map((shape) => renderShape(shape))}
          {currentShape && renderShape(currentShape, true)}
          <Transformer ref={transformerRef} />
        </Layer>
      </Stage>
    </div>
  );

  // ── Text input overlay (shared) ──────────────────────────────────────────
  const textOverlay = editingTextId && textInputPosition && (
    <input
      ref={textInputRef}
      type="text"
      autoFocus
      defaultValue={editingTextId === "new" ? "" : (annotations.find((a) => a.id === editingTextId) as TextShape)?.text || ""}
      className="fixed z-[110] bg-transparent border-none outline-none"
      style={{
        left: textInputPosition.x,
        top: textInputPosition.y,
        fontSize: `${toolOptions.fontSize * scale}px`,
        color: editingTextId === "new" ? toolOptions.strokeColor : ((annotations.find((a) => a.id === editingTextId) as TextShape)?.fill || toolOptions.strokeColor),
        minWidth: "100px",
        caretColor: "white",
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          const value = (e.target as HTMLInputElement).value;
          if (value.trim()) {
            if (editingTextId === "new" && pendingTextPosition) {
              const newShape: TextShape = { id: `shape-${Date.now()}`, type: "text", x: pendingTextPosition.x, y: pendingTextPosition.y, text: value, fontSize: toolOptions.fontSize, fill: toolOptions.strokeColor, stroke: toolOptions.strokeColor, strokeWidth: toolOptions.strokeWidth, opacity: toolOptions.opacity };
              addAnnotation(newShape);
            } else {
              updateAnnotation(editingTextId, { text: value });
            }
          } else if (editingTextId !== "new") {
            deleteAnnotation(editingTextId);
          }
          setEditingTextId(null); setTextInputPosition(null); setPendingTextPosition(null);
        }
        if (e.key === "Escape") {
          if (editingTextId !== "new") {
            const currentText = (annotations.find((a) => a.id === editingTextId) as TextShape)?.text;
            if (!currentText) deleteAnnotation(editingTextId);
          }
          setEditingTextId(null); setTextInputPosition(null); setPendingTextPosition(null);
        }
      }}
      onBlur={(e) => {
        if (Date.now() - textInputCreatedAt.current < 200) { e.target.focus(); return; }
        const value = e.target.value;
        if (value.trim()) {
          if (editingTextId === "new" && pendingTextPosition) {
            const newShape: TextShape = { id: `shape-${Date.now()}`, type: "text", x: pendingTextPosition.x, y: pendingTextPosition.y, text: value, fontSize: toolOptions.fontSize, fill: toolOptions.strokeColor, stroke: toolOptions.strokeColor, strokeWidth: toolOptions.strokeWidth, opacity: toolOptions.opacity };
            addAnnotation(newShape);
          } else {
            updateAnnotation(editingTextId, { text: value });
          }
        } else if (editingTextId !== "new") {
          deleteAnnotation(editingTextId);
        }
        setEditingTextId(null); setTextInputPosition(null); setPendingTextPosition(null);
      }}
    />
  );

  // ══════════════════════════════════════════════════════════════════════════
  // MOBILE LAYOUT — full-screen, thumb-friendly
  // ══════════════════════════════════════════════════════════════════════════
  if (isMobile) {
    const mobileTools: { type: ToolType; icon: React.ReactNode; label: string }[] = [
      { type: "select",    icon: <IconSelect />,  label: "Select" },
      { type: "rectangle", icon: <IconRect />,    label: "Rect"   },
      { type: "freehand",  icon: <IconDraw />,    label: "Draw"   },
    ];

    return (
      <div className="fixed inset-0 z-[100] bg-neutral-950 flex flex-col" style={{ paddingTop: "env(safe-area-inset-top, 0px)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        {/* Top bar: Cancel | title | Done */}
        <div className="flex-shrink-0 h-14 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between px-4">
          <button onClick={closeModal} className="text-sm text-neutral-400 active:text-white px-2 py-2">Cancel</button>
          <span className="text-sm font-medium text-neutral-200">Mark Plot Boundary</span>
          <button onClick={handleDone} className="text-sm font-semibold text-white bg-neutral-700 active:bg-neutral-600 px-4 py-2 rounded-lg">Done</button>
        </div>

        {/* Hint bar */}
        <div className="flex-shrink-0 bg-neutral-950 px-4 py-1.5 flex items-center justify-between">
          <span className="text-xs text-neutral-500">
            {currentTool === "select" ? "Tap a shape to select" : currentTool === "freehand" ? "Drag to draw freely" : "Drag to draw a rectangle"}
          </span>
          <div className="flex items-center gap-1">
            <span className="text-xs text-neutral-600">{Math.round(scale * 100)}%</span>
          </div>
        </div>

        {/* Canvas */}
        {canvas}

        {/* Bottom toolbar: colors + stroke size */}
        <div className="flex-shrink-0 bg-neutral-900 border-t border-neutral-800">
          {/* Color row */}
          <div className="h-12 flex items-center gap-2 px-4">
            {COLORS.map((color) => (
              <button
                key={color}
                onTouchEnd={(e) => { e.preventDefault(); setToolOptions({ strokeColor: color }); }}
                onClick={() => setToolOptions({ strokeColor: color })}
                className={`w-8 h-8 rounded-full flex-shrink-0 transition-transform active:scale-95 ${toolOptions.strokeColor === color ? "ring-2 ring-white ring-offset-1 ring-offset-neutral-900 scale-110" : ""}`}
                style={{ backgroundColor: color }}
              />
            ))}
            <div className="flex-1" />
            <button onTouchEnd={(e) => { e.preventDefault(); undo(); }} onClick={undo} className="p-2 text-neutral-400 active:text-white">
              <IconUndo />
            </button>
            <button onTouchEnd={(e) => { e.preventDefault(); if (annotations.length > 0) { if (window.confirm("Clear all drawings?")) clearAnnotations(); } }} onClick={() => { if (annotations.length > 0 && window.confirm("Clear all drawings?")) clearAnnotations(); }} className="p-2 text-neutral-400 active:text-red-400">
              <IconTrash />
            </button>
          </div>
          {/* Stroke width + tools row */}
          <div className="h-16 flex items-center gap-3 px-4 border-t border-neutral-800/50">
            {/* Stroke widths */}
            <div className="flex items-center gap-2">
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
            </div>

            <div className="w-px h-8 bg-neutral-700 mx-1" />

            {/* Tool selector */}
            <div className="flex items-center gap-2 flex-1">
              {mobileTools.map((tool) => (
                <button
                  key={tool.type}
                  onTouchEnd={(e) => { e.preventDefault(); setCurrentTool(tool.type); }}
                  onClick={() => setCurrentTool(tool.type)}
                  className={`flex-1 h-10 flex flex-col items-center justify-center gap-0.5 rounded-xl active:scale-95 transition-all ${currentTool === tool.type ? "bg-white text-neutral-900" : "bg-neutral-800 text-neutral-400"}`}
                >
                  {tool.icon}
                  <span className="text-[9px] font-medium leading-none">{tool.label}</span>
                </button>
              ))}
            </div>

            {/* Fill toggle */}
            <button
              onTouchEnd={(e) => { e.preventDefault(); setToolOptions({ fillColor: toolOptions.fillColor ? null : toolOptions.strokeColor }); }}
              onClick={() => setToolOptions({ fillColor: toolOptions.fillColor ? null : toolOptions.strokeColor })}
              className={`h-10 px-3 rounded-xl text-xs font-medium active:scale-95 transition-all ${toolOptions.fillColor ? "bg-neutral-700 text-white ring-1 ring-neutral-500" : "bg-neutral-800 text-neutral-500"}`}
            >
              Fill
            </button>
          </div>
        </div>

        {textOverlay}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DESKTOP LAYOUT — original compact layout
  // ══════════════════════════════════════════════════════════════════════════
  const desktopTools: { type: ToolType; label: string }[] = [
    { type: "select",    label: "Select"  },
    { type: "rectangle", label: "Rect"   },
    { type: "circle",    label: "Circle" },
    { type: "arrow",     label: "Arrow"  },
    { type: "freehand",  label: "Draw"   },
    { type: "text",      label: "Text"   },
  ];

  return (
    <div className="fixed inset-0 z-[100] bg-neutral-950 flex flex-col">
      {/* Top Bar */}
      <div className="flex-shrink-0 bg-neutral-900 border-b border-neutral-800">
        <div className="h-11 flex items-center justify-between px-3">
          <div className="flex items-center gap-1">
            <button onClick={undo} className="px-2 py-1 text-xs text-neutral-400 hover:text-white">Undo</button>
            <button onClick={redo} className="px-2 py-1 text-xs text-neutral-400 hover:text-white">Redo</button>
            <button onClick={clearAnnotations} className="px-2 py-1 text-xs text-neutral-400 hover:text-red-400">Clear</button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={closeModal} className="px-3 py-1 text-xs font-medium text-neutral-400 hover:text-white">Cancel</button>
            <button onClick={handleDone} className="px-3 py-1 text-xs font-medium bg-white text-neutral-900 rounded hover:bg-neutral-200">Done</button>
          </div>
        </div>
        <div className="h-10 flex items-center gap-1 px-3 overflow-x-auto scrollbar-none">
          {desktopTools.map((tool) => (
            <button
              key={tool.type}
              onClick={() => setCurrentTool(tool.type)}
              className={`px-3 py-1 text-xs font-medium rounded whitespace-nowrap transition-colors ${currentTool === tool.type ? "bg-white text-neutral-900" : "text-neutral-400 hover:text-white"}`}
            >
              {tool.label}
            </button>
          ))}
        </div>
      </div>

      {canvas}

      {/* Bottom Options Bar */}
      <div className="bg-neutral-900 border-t border-neutral-800">
        <div className="h-11 flex items-center justify-between px-3">
          <div className="flex items-center gap-1.5">
            {COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setToolOptions({ strokeColor: color })}
                className={`w-6 h-6 rounded-full transition-transform flex-shrink-0 ${toolOptions.strokeColor === color ? "ring-2 ring-white ring-offset-1 ring-offset-neutral-900 scale-110" : "hover:scale-105"}`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
            <button onClick={() => setScale(Math.max(scale - 0.1, 0.1))} className="w-7 h-7 rounded text-neutral-400 hover:text-white text-sm flex items-center justify-center">−</button>
            <span className="text-[10px] text-neutral-400 w-9 text-center">{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(Math.min(scale + 0.1, 5))} className="w-7 h-7 rounded text-neutral-400 hover:text-white text-sm flex items-center justify-center">+</button>
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
          <div className="w-px h-5 bg-neutral-700" />
          <button
            onClick={() => setToolOptions({ fillColor: toolOptions.fillColor ? null : toolOptions.strokeColor })}
            className={`px-2.5 py-1 text-[10px] uppercase tracking-wide rounded transition-colors ${toolOptions.fillColor ? "bg-neutral-700 text-white" : "text-neutral-500 hover:text-white"}`}
          >
            Fill
          </button>
        </div>
      </div>

      {textOverlay}
    </div>
  );
}
