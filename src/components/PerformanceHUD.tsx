import React, { useState } from 'react';
import { Activity, Zap, Cpu, Layers } from 'lucide-react';
import { PerformanceStats } from '../types/canvas';

interface PerformanceHUDProps {
  stats: PerformanceStats;
  onSpawnStressTest: (count: number) => void;
  isSpawning: boolean;
}

export const PerformanceHUD: React.FC<PerformanceHUDProps> = ({
  stats,
  onSpawnStressTest,
  isSpawning,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // FPS color indicator
  const fpsColor = stats.fps >= 55 ? 'text-emerald-600' : stats.fps >= 30 ? 'text-amber-400' : 'text-rose-400';

  return (
    <div className="performance-panel absolute z-30 flex flex-col items-end gap-2 text-xs">
      {/* Toggle button */}
      <div className="bg-white/95 backdrop-blur-md border border-slate-200 shadow-sm rounded-2xl p-3.5 w-64">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2.5">
          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
            <Activity className="w-4 h-4 text-indigo-600" />
            <span>Canvas performance</span>
          </div>
          <button
            aria-expanded={isExpanded}
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[10px] text-slate-500 hover:text-slate-800 uppercase font-mono px-1.5 py-0.5 rounded bg-slate-100"
          >
            {isExpanded ? 'Hide' : 'Show'}
          </button>
        </div>

        {isExpanded && (
          <div className="space-y-2.5">
            {/* FPS and Frame Time */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Framerate</div>
                <div className={`text-xl font-bold font-mono ${fpsColor}`}>
                  {stats.fps} <span className="text-[11px] font-normal text-slate-500">FPS</span>
                </div>
              </div>
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Render Time</div>
                <div className="text-xl font-bold font-mono text-cyan-700">
                  {stats.frameTimeMs} <span className="text-[11px] font-normal text-slate-500">ms</span>
                </div>
              </div>
            </div>

            {/* Spatial Index Culling Stats */}
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1.5">
              <div className="flex justify-between items-center text-slate-700">
                <span className="flex items-center gap-1 text-slate-500">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  R-Tree Query:
                </span>
                <span className="font-mono text-indigo-700 font-semibold">{stats.queryTimeMs} ms</span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span className="text-slate-500">Rendered / Total:</span>
                <span className="font-mono font-medium">
                  <span className="text-emerald-600">{stats.visibleShapes}</span>
                  <span className="text-slate-500"> / </span>
                  <span className="text-slate-700">{stats.totalShapes}</span>
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span className="text-slate-500">Viewport Culled:</span>
                <span className="font-mono text-emerald-600 font-semibold">
                  {stats.cullPercentage.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Stress Test Spawner */}
            <div className="pt-1 border-t border-slate-200">
              <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 mb-2">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>R-Tree Benchmark (Stress Test)</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[1000, 5000, 10000].map(count => (
                  <button
                    key={count}
                    onClick={() => onSpawnStressTest(count)}
                    disabled={isSpawning}
                    className="py-1.5 px-2 bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/40 rounded-lg text-indigo-700 font-mono font-medium text-[11px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    +{count >= 1000 ? `${count / 1000}k` : count}
                  </button>
                ))}
              </div>
              {isSpawning && (
                <div className="mt-2 text-center text-[10px] text-amber-400 flex items-center justify-center gap-1">
                  <Cpu className="w-3 h-3 animate-spin" />
                  <span>Generating CRDT shapes & R-Tree...</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

