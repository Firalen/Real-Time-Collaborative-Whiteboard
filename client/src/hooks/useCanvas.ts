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
} from 'fabric';
import type { Tool, DrawEvent } from '../types';
import { HistoryManager, AddObjectCommand, FinalizeAddCommand } from '../utils/commands';

interface UseCanvasOptions {
  color: string;
  strokeWidth: number;
  tool: Tool;
  onDraw?: (event: DrawEvent) => void;
  isRemoteUpdate?: boolean;
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

      const cmd = new AddObjectCommand(canvas, path);
      historyRef.current.execute(cmd);

      optionsRef.current.onDraw?.({
        type: 'object-added',
        object: path.toObject(['id']),
      });
    });

    canvas.on('object:added', (e) => {
      if (isRemoteRef.current || isDrawingRef.current) return;
      if (e.target?.type === 'path') return;
      const obj = e.target;
      if (!obj || obj.get('isRemote')) return;

      optionsRef.current.onDraw?.({
        type: 'object-added',
        object: obj.toObject(['id', 'isRemote']),
      });
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.dispose();
      canvasRef.current = null;
    };
  }, [containerRef]);

  // Update brush settings when tool/color/size changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { tool, color, strokeWidth } = options;

    canvas.isDrawingMode = tool === 'pen' || tool === 'eraser';
    canvas.selection = tool === 'select';

    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = tool === 'eraser' ? '#ffffff' : color;
      canvas.freeDrawingBrush.width = tool === 'eraser' ? strokeWidth * 3 : strokeWidth;
    }
  }, [options.tool, options.color, options.strokeWidth]);

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

      optionsRef.current.onDraw?.({
        type: 'object-added',
        object: shape.toObject(['id', 'isRemote']),
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
  }, []);

  const undo = useCallback(() => {
    historyRef.current.undo();
    canvasRef.current?.requestRenderAll();
  }, []);

  const redo = useCallback(() => {
    historyRef.current.redo();
    canvasRef.current?.requestRenderAll();
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

  return {
    canvasRef,
    undo,
    redo,
    canUndo: () => historyRef.current.canUndo(),
    canRedo: () => historyRef.current.canRedo(),
    addText,
    addStickyNote,
    loadCanvasData,
    applyRemoteObject,
    exportPNG,
    getCanvasData,
  };
}
