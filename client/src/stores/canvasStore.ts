import { create } from 'zustand';

export interface CanvasLayer {
  id: string;
  name: string;
  sortOrder: number;
  visible: boolean;
  locked: boolean;
}

interface CanvasState {
  zoom: number;
  panX: number;
  panY: number;
  gridEnabled: boolean;
  snapEnabled: boolean;
  gridSize: number;
  showMinimap: boolean;
  showLayers: boolean;
  showRulers: boolean;
  activeLayerId: string | null;
  layers: CanvasLayer[];
  presentationMode: boolean;
  followHost: boolean;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  toggleGrid: () => void;
  toggleSnap: () => void;
  toggleMinimap: () => void;
  toggleLayers: () => void;
  setLayers: (layers: CanvasLayer[]) => void;
  setActiveLayerId: (id: string | null) => void;
  updateLayer: (id: string, patch: Partial<CanvasLayer>) => void;
  setPresentationMode: (on: boolean) => void;
}

export const useCanvasStore = create<CanvasState>((set) => ({
  zoom: 1,
  panX: 0,
  panY: 0,
  gridEnabled: true,
  snapEnabled: true,
  gridSize: 20,
  showMinimap: true,
  showLayers: true,
  showRulers: false,
  activeLayerId: null,
  layers: [],
  presentationMode: false,
  followHost: false,
  setZoom: (zoom) => set({ zoom: Math.min(4, Math.max(0.1, zoom)) }),
  setPan: (panX, panY) => set({ panX, panY }),
  toggleGrid: () => set((s) => ({ gridEnabled: !s.gridEnabled })),
  toggleSnap: () => set((s) => ({ snapEnabled: !s.snapEnabled })),
  toggleMinimap: () => set((s) => ({ showMinimap: !s.showMinimap })),
  toggleLayers: () => set((s) => ({ showLayers: !s.showLayers })),
  setLayers: (layers) => set({ layers, activeLayerId: layers[0]?.id ?? null }),
  setActiveLayerId: (activeLayerId) => set({ activeLayerId }),
  updateLayer: (id, patch) =>
    set((s) => ({
      layers: s.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    })),
  setPresentationMode: (presentationMode) => set({ presentationMode }),
}));
