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

  // Track container size with ResizeObserver for responsive Stage dimensions
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
          // Use less padding on mobile screens
          const isMobile = window.innerWidth < 768;
          const padding = isMobile ? 16 : 100;
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
          if (e.shiftKey) {
            redo();
          } else {
            undo();
          }
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

  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (currentTool === "select") {
        const clickedOnEmpty = e.target === e.target.getStage() || e.target.getClassName() === "Image";
        if (clickedOnEmpty) {
          selectShape(null);
        }
        return;
      }

      const pos = getRelativePointerPosition();
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
          // Calculate screen position for the input
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
    [currentTool, toolOptions, getRelativePointerPosition, selectShape, addAnnotation, scale, position]
  );

  const handleMouseMove = useCallback(() => {
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

  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const scaleBy = 1.1;
    const oldScale = scale;
    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    setScale(Math.min(Math.max(newScale, 0.1), 5));
  }, [scale]);

  // Pinch-to-zoom for mobile
  const lastPinchDist = useRef<number | null>(null);
  const lastPinchCenter = useRef<{ x: number; y: number } | null>(null);

  const handleTouchMove = useCallback((e: Konva.KonvaEventObject<TouchEvent>) => {
    const touch = e.evt.touches;
    if (touch.length === 2) {
      // Pinch gesture — zoom
      e.evt.preventDefault();
      const dx = touch[0].clientX - touch[1].clientX;
      const dy = touch[0].clientY - touch[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (lastPinchDist.current !== null) {
        const delta = dist / lastPinchDist.current;
        const newScale = Math.min(Math.max(scale * delta, 0.1), 5);
        setScale(newScale);
      }
      lastPinchDist.current = dist;

      // Pan with two fingers
      const centerX = (touch[0].clientX + touch[1].clientX) / 2;
      const centerY = (touch[0].clientY + touch[1].clientY) / 2;
      if (lastPinchCenter.current) {
        setPosition((prev) => ({
          x: prev.x + (centerX - lastPinchCenter.current!.x),
          y: prev.y + (centerY - lastPinchCenter.current!.y),
        }));
      }
      lastPinchCenter.current = { x: centerX, y: centerY };
    } else if (touch.length === 1 && isDrawing) {
      // Single finger drawing — prevent scroll, delegate to mouse handler
      e.evt.preventDefault();
      handleMouseMove();
    }
  }, [scale, isDrawing, handleMouseMove]);

  const handleTouchEnd = useCallback(() => {
    lastPinchDist.current = null;
    lastPinchCenter.current = null;
    if (isDrawing) {
      handleMouseUp();
    }
  }, [isDrawing, handleMouseUp]);

  const flattenImage = useCallback((): string => {
    const stage = stageRef.current;
    if (!stage || !image) return "";

    const tempStage = new Konva.Stage({
      container: document.createElement("div"),
      width: image.width,
      height: image.height,
    });

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
              // Reset scale and apply it to fontSize instead
              node.scaleX(1);
              node.scaleY(1);
              const newFontSize = Math.round(text.fontSize * Math.max(scaleX, scaleY));
              updateAnnotation(shape.id, {
                x: node.x(),
                y: node.y(),
                fontSize: newFontSize,
              });
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

  const tools: { type: ToolType; label: string }[] = [
    { type: "select", label: "Select" },
    { type: "rectangle", label: "Rect" },
    { type: "circle", label: "Circle" },
    { type: "arrow", label: "Arrow" },
    { type: "freehand", label: "Draw" },
    { type: "text", label: "Text" },
  ];

  return (
    <div className="fixed inset-0 z-[100] bg-neutral-950 flex flex-col">
      {/* Top Bar — responsive: scrollable tools on mobile */}
      <div className="flex-shrink-0 bg-neutral-900 border-b border-neutral-800">
        {/* Row 1: Cancel / Done + Undo/Redo/Clear */}
        <div className="h-11 flex items-center justify-between px-3">
          <div className="flex items-center gap-1">
            <button onClick={undo} className="px-2 py-1 text-xs text-neutral-400 hover:text-white">Undo</button>
            <button onClick={redo} className="px-2 py-1 text-xs text-neutral-400 hover:text-white">Redo</button>
            <button onClick={clearAnnotations} className="px-2 py-1 text-xs text-neutral-400 hover:text-red-400">Clear</button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={closeModal} className="px-3 py-1 text-xs font-medium text-neutral-400 hover:text-white">
              Cancel
            </button>
            <button onClick={handleDone} className="px-3 py-1 text-xs font-medium bg-white text-neutral-900 rounded hover:bg-neutral-200">
              Done
            </button>
          </div>
        </div>
        {/* Row 2: Tool selector — horizontally scrollable */}
        <div className="h-10 flex items-center gap-1 px-3 overflow-x-auto scrollbar-none">
          {tools.map((tool) => (
            <button
              key={tool.type}
              onClick={() => setCurrentTool(tool.type)}
              className={`px-3 py-1 text-xs font-medium rounded whitespace-nowrap transition-colors ${
                currentTool === tool.type
                  ? "bg-white text-neutral-900"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              {tool.label}
            </button>
          ))}
        </div>
      </div>

      {/* Canvas Container — touch-action:none prevents browser from stealing touch events */}
      <div ref={containerRef} className="flex-1 overflow-hidden bg-neutral-900" style={{ touchAction: "none" }}>
        <Stage
          ref={stageRef}
          width={containerSize.width}
          height={containerSize.height}
          scaleX={scale}
          scaleY={scale}
          x={position.x}
          y={position.y}
          draggable={currentTool === "select"}
          onDragEnd={(e) => { if (e.target === stageRef.current) setPosition({ x: e.target.x(), y: e.target.y() }); }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleMouseDown as unknown as (e: Konva.KonvaEventObject<TouchEvent>) => void}
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

      {/* Bottom Options Bar — responsive: 2 rows on mobile, 1 row on desktop */}
      <div className="bg-neutral-900 border-t border-neutral-800" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        {/* Row 1: Colors (always visible) */}
        <div className="h-11 flex items-center justify-between px-3">
          <div className="flex items-center gap-1.5">
            {COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setToolOptions({ strokeColor: color })}
                className={`w-6 h-6 rounded-full transition-transform flex-shrink-0 ${
                  toolOptions.strokeColor === color ? "ring-2 ring-white ring-offset-1 ring-offset-neutral-900 scale-110" : "hover:scale-105"
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          {/* Zoom — visible on all sizes, pushed to right */}
          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
            <button onClick={() => setScale(Math.max(scale - 0.1, 0.1))} className="w-7 h-7 rounded text-neutral-400 hover:text-white text-sm flex items-center justify-center">−</button>
            <span className="text-[10px] text-neutral-400 w-9 text-center">{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(Math.min(scale + 0.1, 5))} className="w-7 h-7 rounded text-neutral-400 hover:text-white text-sm flex items-center justify-center">+</button>
          </div>
        </div>
        {/* Row 2: Size, Fill */}
        <div className="h-9 flex items-center gap-3 px-3 border-t border-neutral-800/50">
          {/* Stroke Width */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-neutral-500 uppercase tracking-wide">Size</span>
            {STROKE_WIDTHS.map((width) => (
              <button
                key={width}
                onClick={() => setToolOptions({ strokeWidth: width })}
                className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
                  toolOptions.strokeWidth === width ? "bg-neutral-700" : "hover:bg-neutral-800"
                }`}
              >
                <div className="bg-white rounded-full" style={{ width: width * 1.5, height: width * 1.5 }} />
              </button>
            ))}
          </div>
          <div className="w-px h-5 bg-neutral-700" />
          {/* Fill Toggle */}
          <button
            onClick={() => setToolOptions({ fillColor: toolOptions.fillColor ? null : toolOptions.strokeColor })}
            className={`px-2.5 py-1 text-[10px] uppercase tracking-wide rounded transition-colors ${
              toolOptions.fillColor ? "bg-neutral-700 text-white" : "text-neutral-500 hover:text-white"
            }`}
          >
            Fill
          </button>
        </div>
      </div>

      {/* Inline Text Input */}
      {editingTextId && textInputPosition && (
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
                  // Create new text annotation
                  const newShape: TextShape = {
                    id: `shape-${Date.now()}`,
                    type: "text",
                    x: pendingTextPosition.x,
                    y: pendingTextPosition.y,
                    text: value,
                    fontSize: toolOptions.fontSize,
                    fill: toolOptions.strokeColor,
                    stroke: toolOptions.strokeColor,
                    strokeWidth: toolOptions.strokeWidth,
                    opacity: toolOptions.opacity,
                  };
                  addAnnotation(newShape);
                } else {
                  updateAnnotation(editingTextId, { text: value });
                }
              } else if (editingTextId !== "new") {
                deleteAnnotation(editingTextId);
              }
              setEditingTextId(null);
              setTextInputPosition(null);
              setPendingTextPosition(null);
            }
            if (e.key === "Escape") {
              if (editingTextId !== "new") {
                const currentText = (annotations.find((a) => a.id === editingTextId) as TextShape)?.text;
                if (!currentText) {
                  deleteAnnotation(editingTextId);
                }
              }
              setEditingTextId(null);
              setTextInputPosition(null);
              setPendingTextPosition(null);
            }
          }}
          onBlur={(e) => {
            // Ignore blur events that happen immediately after creation (within 200ms)
            // This prevents the click that created the input from also triggering blur
            if (Date.now() - textInputCreatedAt.current < 200) {
              e.target.focus();
              return;
            }

            const value = e.target.value;
            if (value.trim()) {
              if (editingTextId === "new" && pendingTextPosition) {
                // Create new text annotation
                const newShape: TextShape = {
                  id: `shape-${Date.now()}`,
                  type: "text",
                  x: pendingTextPosition.x,
                  y: pendingTextPosition.y,
                  text: value,
                  fontSize: toolOptions.fontSize,
                  fill: toolOptions.strokeColor,
                  stroke: toolOptions.strokeColor,
                  strokeWidth: toolOptions.strokeWidth,
                  opacity: toolOptions.opacity,
                };
                addAnnotation(newShape);
              } else {
                updateAnnotation(editingTextId, { text: value });
              }
            } else if (editingTextId !== "new") {
              deleteAnnotation(editingTextId);
            }
            setEditingTextId(null);
            setTextInputPosition(null);
            setPendingTextPosition(null);
          }}
        />
      )}
    </div>
  );
}
