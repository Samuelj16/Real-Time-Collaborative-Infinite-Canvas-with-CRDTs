import React from 'react';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw } from 'lucide-react';

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onFitToBounds: () => void;
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitToBounds,
}) => {
  const percentage = Math.round(zoom * 100);

  return (
    <div className="absolute bottom-4 right-4 z-30 flex items-center gap-1.5 p-1.5 bg-white/95 backdrop-blur-md border border-slate-200 shadow-sm rounded-2xl text-slate-700">
      <button
        onClick={onZoomOut}
        title="Zoom Out"
        className="p-2 rounded-xl hover:text-slate-900 hover:bg-slate-100 transition-all"
      >
        <ZoomOut className="w-4 h-4" />
      </button>

      <button
        onClick={onResetZoom}
        title="Reset Zoom to 100%"
        className="px-2 py-1 font-mono text-xs font-semibold text-slate-800 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all min-w-[52px] text-center"
      >
        {percentage}%
      </button>

      <button
        onClick={onZoomIn}
        title="Zoom In"
        className="p-2 rounded-xl hover:text-slate-900 hover:bg-slate-100 transition-all"
      >
        <ZoomIn className="w-4 h-4" />
      </button>

      <div className="w-[1px] h-5 bg-slate-200 mx-0.5" />

      <button
        onClick={onFitToBounds}
        title="Fit All Shapes to Screen"
        className="p-2 rounded-xl hover:text-slate-900 hover:bg-slate-100 transition-all"
      >
        <Maximize2 className="w-4 h-4" />
      </button>

      <button
        onClick={onResetZoom}
        title="Recenter Camera (0, 0)"
        className="p-2 rounded-xl hover:text-slate-900 hover:bg-slate-100 transition-all"
      >
        <RotateCcw className="w-4 h-4" />
      </button>
    </div>
  );
};

