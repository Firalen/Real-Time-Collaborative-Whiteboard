import { useEffect, useCallback } from 'react';
import type { Canvas, TPointerEventInfo, TPointerEvent } from 'fabric';
import { Point } from 'fabric';
import { useCanvasStore } from '../stores/canvasStore';

export function useCanvasViewport(canvasRef: React.RefObject<Canvas | null>) {
  const { zoom, setZoom, setPan, gridEnabled, gridSize } = useCanvasStore();

  const applyViewport = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const vpt = canvas.viewportTransform;
    if (!vpt) return;
    vpt[0] = zoom;
    vpt[3] = zoom;
    canvas.requestRenderAll();
  }, [canvasRef, zoom]);

  useEffect(() => {
    applyViewport();
  }, [applyViewport]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (opt: { e: WheelEvent }) => {
      const e = opt.e;
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY;
      let newZoom = canvas.getZoom() * (0.999 ** delta);
      newZoom = Math.min(4, Math.max(0.1, newZoom));
      canvas.zoomToPoint(new Point(e.offsetX, e.offsetY), newZoom);
      setZoom(newZoom);
    };

    canvas.on('mouse:wheel', onWheel);
    return () => canvas.off('mouse:wheel', onWheel);
  }, [canvasRef, setZoom]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let isPanning = false;
    let lastX = 0;
    let lastY = 0;

    const onMouseDown = (opt: TPointerEventInfo<TPointerEvent>) => {
      const e = opt.e;
      if (!('button' in e)) return;
      if (e.button !== 1 && !e.altKey) return;
      isPanning = true;
      lastX = e.clientX;
      lastY = e.clientY;
      canvas.selection = false;
    };

    const onMouseMove = (opt: TPointerEventInfo<TPointerEvent>) => {
      if (!isPanning) return;
      const e = opt.e;
      if (!('clientX' in e)) return;
      const vpt = canvas.viewportTransform;
      if (!vpt) return;
      vpt[4] += e.clientX - lastX;
      vpt[5] += e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      setPan(vpt[4], vpt[5]);
      canvas.requestRenderAll();
    };

    const onMouseUp = () => {
      isPanning = false;
      canvas.selection = true;
    };

    canvas.on('mouse:down', onMouseDown);
    canvas.on('mouse:move', onMouseMove);
    canvas.on('mouse:up', onMouseUp);
    return () => {
      canvas.off('mouse:down', onMouseDown);
      canvas.off('mouse:move', onMouseMove);
      canvas.off('mouse:up', onMouseUp);
    };
  }, [canvasRef, setPan]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!gridEnabled) {
      canvas.backgroundColor = '#ffffff';
      canvas.requestRenderAll();
      return;
    }

    const size = gridSize;
    const patternCanvas = document.createElement('canvas');
    patternCanvas.width = size;
    patternCanvas.height = size;
    const ctx = patternCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(size, 0);
      ctx.lineTo(size, size);
      ctx.lineTo(0, size);
      ctx.stroke();
    }

    import('fabric').then(({ Pattern }) => {
      canvas.backgroundColor = new Pattern({
        source: patternCanvas,
        repeat: 'repeat',
      });
      canvas.requestRenderAll();
    });
  }, [canvasRef, gridEnabled, gridSize]);

  const resetView = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    setZoom(1);
    setPan(0, 0);
    canvas.requestRenderAll();
  }, [canvasRef, setZoom, setPan]);

  const zoomIn = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const z = Math.min(4, canvas.getZoom() * 1.2);
    canvas.setZoom(z);
    setZoom(z);
  }, [canvasRef, setZoom]);

  const zoomOut = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const z = Math.max(0.1, canvas.getZoom() / 1.2);
    canvas.setZoom(z);
    setZoom(z);
  }, [canvasRef, setZoom]);

  return { resetView, zoomIn, zoomOut, zoom };
}
