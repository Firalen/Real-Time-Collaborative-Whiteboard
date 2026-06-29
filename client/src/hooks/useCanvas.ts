import { useEffect, useRef, useCallback } from 'react';
import {
  Canvas,
  PencilBrush,
  Rect,
  Circle,
  Line,
  IText,
  FabricObject,
  util,
  Point,
} from 'fabric';
import type { Tool, DrawEvent } from '../types';
import { HistoryManager, AddObjectCommand, FinalizeAddCommand, RemoveObjectCommand } from '../utils/commands';

function assignElementId(obj: FabricObject) {
  if (!obj.get('elementId')) {
    obj.set('elementId', crypto.randomUUID());
  }
  return obj.get('elementId') as string;
}

function serializeObject(obj: FabricObject): Record<string, unknown> {
  return obj.toObject() as unknown as Record<string, unknown>;
}

function hitTestEraser(obj: FabricObject, pointer: Point, radius: number): boolean {
  if (obj.containsPoint(pointer)) return true;
  const bounds = obj.getBoundingRect();
  return (
    pointer.x >= bounds.left - radius
    && pointer.x <= bounds.left + bounds.width + radius
    && pointer.y >= bounds.top - radius
    && pointer.y <= bounds.top + bounds.height + radius
  );
}

interface UseCanvasOptions {
  color: string;
  strokeWidth: number;
  tool: Tool;
  onDraw?: (event: DrawEvent) => void;
  onHistoryChange?: () => void;
  onSelectionChange?: (elementId: string | null) => void;
  viewOnly?: boolean;
}

export function useCanvas(
  containerRef: React.RefObject<HTMLDivElement | null>,
  options: UseCanvasOptions,
) {
  const canvasRef = useRef<Canvas | null>(null);
  const historyRef = useRef(new HistoryManager());
  const isDrawingRef = useRef(false);
  const shapeStartRef = useRef<{ x: number; y: number } | null>(null);
  const activeShapeRef = useRef<FabricObject | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const isRemoteRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const canvas = new Canvas('whiteboard-canvas', {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      backgroundColor: '#ffffff',
      selection: true,
    });

    canvas.freeDrawingBrush = new PencilBrush(canvas);
    canvasRef.current = canvas;

    const handleResize = () => {
      if (!containerRef.current) return;
      canvas.setDimensions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });
    };

    window.addEventListener('resize', handleResize);

    // Track object additions for undo/redo and real-time sync
    canvas.on('path:created', (e) => {
      if (isRemoteRef.current) return;
      const path = e.path;
      if (!path) return;

      assignElementId(path);
      const cmd = new AddObjectCommand(canvas, path);
      historyRef.current.execute(cmd);
      optionsRef.current.onHistoryChange?.();

      optionsRef.current.onDraw?.({
        type: 'object-added',
        object: serializeObject(path),
      });
    });

    canvas.on('object:added', (e) => {
      if (isRemoteRef.current || isDrawingRef.current) return;
      if (e.target?.type === 'path') return;
      const obj = e.target;
      if (!obj || obj.get('isRemote')) return;
      assignElementId(obj);

      optionsRef.current.onDraw?.({
        type: 'object-added',
        object: serializeObject(obj),
      });
    });

    const onSelection = () => {
      const active = canvas.getActiveObject();
      const id = active ? (active.get('elementId') as string) || assignElementId(active) : null;
      optionsRef.current.onSelectionChange?.(id);
    };

    canvas.on('selection:created', onSelection);
    canvas.on('selection:updated', onSelection);
    canvas.on('selection:cleared', () => optionsRef.current.onSelectionChange?.(null));

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.off('selection:created', onSelection);
      canvas.off('selection:updated', onSelection);
      canvas.off('selection:cleared');
      canvas.dispose();
      canvasRef.current = null;
    };
  }, [containerRef]);

  // Update brush settings when tool/color/size changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { tool, color, strokeWidth, viewOnly } = options;

    if (viewOnly) {
      canvas.isDrawingMode = false;
      canvas.selection = false;
      canvas.forEachObject((obj) => { obj.selectable = false; });
      return;
    }

    canvas.forEachObject((obj) => { obj.selectable = true; });
    canvas.isDrawingMode = tool === 'pen';
    canvas.selection = tool === 'select';
    canvas.defaultCursor = tool === 'eraser' ? 'cell' : 'default';

    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = color;
      canvas.freeDrawingBrush.width = strokeWidth;
    }
  }, [options.tool, options.color, options.strokeWidth, options.viewOnly]);

  // Eraser — removes objects under the cursor (not white paint)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || options.tool !== 'eraser' || options.viewOnly) return;

    let isErasing = false;
    const erasedThisStroke = new Set<string>();

    const eraseAt = (pointer: Point) => {
      const radius = optionsRef.current.strokeWidth * 4;
      const objects = [...canvas.getObjects()].reverse();

      for (const obj of objects) {
        if (!hitTestEraser(obj, pointer, radius)) continue;

        const elementId = (obj.get('elementId') as string) || assignElementId(obj);
        if (erasedThisStroke.has(elementId)) continue;

        erasedThisStroke.add(elementId);
        const cmd = new RemoveObjectCommand(canvas, obj);
        historyRef.current.execute(cmd);
        optionsRef.current.onHistoryChange?.();
        optionsRef.current.onDraw?.({
          type: 'object-removed',
          object: { elementId },
        });
      }
    };

    const onMouseDown = (opt: { scenePoint: Point }) => {
      isErasing = true;
      erasedThisStroke.clear();
      eraseAt(opt.scenePoint);
    };

    const onMouseMove = (opt: { scenePoint: Point }) => {
      if (!isErasing) return;
      eraseAt(opt.scenePoint);
    };

    const onMouseUp = () => {
      isErasing = false;
    };

    canvas.on('mouse:down', onMouseDown);
    canvas.on('mouse:move', onMouseMove);
    canvas.on('mouse:up', onMouseUp);

    return () => {
      canvas.off('mouse:down', onMouseDown);
      canvas.off('mouse:move', onMouseMove);
      canvas.off('mouse:up', onMouseUp);
    };
  }, [options.tool, options.viewOnly, options.strokeWidth]);

  // Shape drawing with mouse events
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { tool, color, strokeWidth } = optionsRef.current;
    const shapeTools: Tool[] = ['rectangle', 'circle', 'line'];

    if (!shapeTools.includes(tool)) return;

    const onMouseDown = (opt: { scenePoint: { x: number; y: number } }) => {
      isDrawingRef.current = true;
      const pointer = opt.scenePoint;
      shapeStartRef.current = { x: pointer.x, y: pointer.y };

      let shape: FabricObject;
      const common = {
        stroke: color,
        strokeWidth,
        fill: 'transparent',
        selectable: true,
      };

      if (tool === 'rectangle') {
        shape = new Rect({ ...common, left: pointer.x, top: pointer.y, width: 0, height: 0 });
      } else if (tool === 'circle') {
        shape = new Circle({ ...common, left: pointer.x, top: pointer.y, radius: 0 });
      } else {
        shape = new Line([pointer.x, pointer.y, pointer.x, pointer.y], common);
      }

      activeShapeRef.current = shape;
      canvas.add(shape);
    };

    const onMouseMove = (opt: { scenePoint: { x: number; y: number } }) => {
      if (!isDrawingRef.current || !shapeStartRef.current || !activeShapeRef.current) return;

      const pointer = opt.scenePoint;
      const { x: startX, y: startY } = shapeStartRef.current;
      const shape = activeShapeRef.current;

      if (tool === 'rectangle' && shape instanceof Rect) {
        shape.set({
          left: Math.min(startX, pointer.x),
          top: Math.min(startY, pointer.y),
          width: Math.abs(pointer.x - startX),
          height: Math.abs(pointer.y - startY),
        });
      } else if (tool === 'circle' && shape instanceof Circle) {
        const radius = Math.sqrt((pointer.x - startX) ** 2 + (pointer.y - startY) ** 2) / 2;
        shape.set({
          left: startX - radius,
          top: startY - radius,
          radius,
        });
      } else if (tool === 'line' && shape instanceof Line) {
        shape.set({ x2: pointer.x, y2: pointer.y });
      }

      canvas.requestRenderAll();
    };

    const onMouseUp = () => {
      if (!isDrawingRef.current || !activeShapeRef.current) return;

      const shape = activeShapeRef.current;
      const cmd = new FinalizeAddCommand(canvas, shape);
      historyRef.current.execute(cmd);
      optionsRef.current.onHistoryChange?.();

      optionsRef.current.onDraw?.({
        type: 'object-added',
        object: serializeObject(shape),
      });

      isDrawingRef.current = false;
      shapeStartRef.current = null;
      activeShapeRef.current = null;
    };

    canvas.on('mouse:down', onMouseDown);
    canvas.on('mouse:move', onMouseMove);
    canvas.on('mouse:up', onMouseUp);

    return () => {
      canvas.off('mouse:down', onMouseDown);
      canvas.off('mouse:move', onMouseMove);
      canvas.off('mouse:up', onMouseUp);
    };
  }, [options.tool, options.color, options.strokeWidth]);

  const addText = useCallback((x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const text = new IText('Double-click to edit', {
      left: x,
      top: y,
      fontSize: 20,
      fill: optionsRef.current.color,
      fontFamily: 'Inter, sans-serif',
    });

    const cmd = new AddObjectCommand(canvas, text);
    historyRef.current.execute(cmd);
    optionsRef.current.onHistoryChange?.();
    optionsRef.current.onDraw?.({
      type: 'object-added',
      object: serializeObject(text),
    });
  }, []);

  const addStickyNote = useCallback((x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const bg = new Rect({
      left: x,
      top: y,
      width: 200,
      height: 150,
      fill: '#fef08a',
      stroke: '#eab308',
      strokeWidth: 1,
      rx: 4,
      ry: 4,
    });

    const text = new IText('Note...', {
      left: x + 10,
      top: y + 10,
      fontSize: 14,
      fill: '#713f12',
      fontFamily: 'Inter, sans-serif',
      width: 180,
    });

    historyRef.current.execute(new AddObjectCommand(canvas, bg));
    historyRef.current.execute(new AddObjectCommand(canvas, text));
    optionsRef.current.onHistoryChange?.();
    optionsRef.current.onDraw?.({
      type: 'object-added',
      object: serializeObject(bg),
    });
    optionsRef.current.onDraw?.({
      type: 'object-added',
      object: serializeObject(text),
    });
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.getObjects().forEach((obj) => canvas.remove(obj));
    canvas.requestRenderAll();
    historyRef.current.clear();
    optionsRef.current.onHistoryChange?.();
    optionsRef.current.onDraw?.({ type: 'canvas-clear' });
  }, []);

  const undo = useCallback(() => {
    const result = historyRef.current.undo();
    if (result) {
      canvasRef.current?.requestRenderAll();
      optionsRef.current.onHistoryChange?.();
    }
    return result;
  }, []);

  const redo = useCallback(() => {
    const result = historyRef.current.redo();
    if (result) {
      canvasRef.current?.requestRenderAll();
      optionsRef.current.onHistoryChange?.();
    }
    return result;
  }, []);

  const loadCanvasData = useCallback(async (data: Record<string, unknown>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    isRemoteRef.current = true;
    await canvas.loadFromJSON(data);
    canvas.requestRenderAll();
    historyRef.current.clear();
    isRemoteRef.current = false;
  }, []);

  const applyRemoteObject = useCallback(async (objectData: Record<string, unknown>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    isRemoteRef.current = true;
    const objects = await util.enlivenObjects<FabricObject>([objectData]);
    objects.forEach((obj) => {
      obj.set('isRemote', true);
      canvas.add(obj);
    });
    canvas.requestRenderAll();
    isRemoteRef.current = false;
  }, []);

  const applyRemoteRemove = useCallback((elementId: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    isRemoteRef.current = true;
    const obj = canvas.getObjects().find((o) => o.get('elementId') === elementId);
    if (obj) {
      canvas.remove(obj);
      canvas.requestRenderAll();
    }
    isRemoteRef.current = false;
  }, []);

  const applyRemoteClear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    isRemoteRef.current = true;
    canvas.getObjects().forEach((obj) => canvas.remove(obj));
    canvas.requestRenderAll();
    historyRef.current.clear();
    isRemoteRef.current = false;
  }, []);

  const exportPNG = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataURL = canvas.toDataURL({ format: 'png', multiplier: 2 });
    const link = document.createElement('a');
    link.download = 'whiteboard.png';
    link.href = dataURL;
    link.click();
  }, []);

  const getCanvasData = useCallback(() => {
    return canvasRef.current?.toJSON() as Record<string, unknown> | undefined;
  }, []);

  const applyTaskVisuals = useCallback((tasks: { elementId?: string; status: string }[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const doneIds = new Set(
      tasks.filter((t) => t.elementId && t.status === 'done').map((t) => t.elementId!),
    );

    canvas.getObjects().forEach((obj) => {
      const id = obj.get('elementId') as string | undefined;
      if (!id) return;
      const done = doneIds.has(id);
      if (obj.type === 'i-text' || obj.type === 'text' || obj.type === 'textbox') {
        obj.set({ linethrough: done, opacity: done ? 0.65 : 1 });
      } else if (done) {
        obj.set({ opacity: 0.5 });
      } else {
        obj.set({ opacity: 1 });
      }
    });
    canvas.requestRenderAll();
  }, []);

  return {
    canvasRef,
    undo,
    redo,
    canUndo: () => historyRef.current.canUndo(),
    canRedo: () => historyRef.current.canRedo(),
    addText,
    addStickyNote,
    clearCanvas,
    loadCanvasData,
    applyRemoteObject,
    applyRemoteRemove,
    applyRemoteClear,
    exportPNG,
    getCanvasData,
    applyTaskVisuals,
  };
}
