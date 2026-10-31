import React from 'react';
import { X, Cpu, GitMerge, Layers, Radio, ShieldCheck } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 text-slate-200">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/80 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-1">
          <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">System Architecture & Engineering Guide</h2>
            <p className="text-xs text-slate-400">Technical Highlights for Technical Leads & Recruiters</p>
          </div>
        </div>

        <hr className="my-4 border-slate-800" />

        {/* 4 Components */}
        <div className="space-y-4 text-xs">
          <div>
            <h3 className="text-sm font-semibold text-indigo-400 mb-2 flex items-center gap-1.5">
              <Layers className="w-4 h-4" /> 4 Core Architectural Components
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="font-semibold text-white mb-1 flex items-center gap-1">
                  <span>01. Canvas Render Pipeline</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  High-speed 60 FPS HTML5 Canvas engine with camera matrix transformations and Retina High-DPI double buffering.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="font-semibold text-white mb-1 flex items-center gap-1">
                  <GitMerge className="w-3.5 h-3.5 text-pink-400" />
                  <span>02. Yjs CRDT Sync Engine</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  State vectors resolve concurrent mutations deterministically without centralized locking or operational transformation collisions.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="font-semibold text-white mb-1 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  <span>03. R-Tree Spatial Index</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Hierarchical bounding box index (R-Tree) culls off-screen shapes in O(log N) time, maintaining 60 FPS even with 10,000+ objects!
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="font-semibold text-white mb-1 flex items-center gap-1">
                  <Radio className="w-3.5 h-3.5 text-cyan-400" />
                  <span>04. WebSockets & Lerp Presence</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Binary awareness protocol with requestAnimationFrame client-side linear interpolation (lerp) eliminating cursor jitter.
                </p>
              </div>
            </div>
          </div>

          {/* Engineering Challenges Solved */}
          <div>
            <h3 className="text-sm font-semibold text-emerald-400 mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> The Hardest Engineering Challenges Solved
            </h3>
            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="font-semibold text-amber-300 mb-1">
                  Challenge 1: Maintaining 60 FPS with 10,000+ Shapes
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  <strong className="text-slate-200">Solution:</strong> Implemented an R-Tree spatial index with Sort-Tile-Recursive (STR) bulk loading. When panning and zooming, only shapes intersecting the visible camera viewport are queried. Offscreen draw calls are completely skipped.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="font-semibold text-amber-300 mb-1">
                  Challenge 2: Multi-User Undo Destroying Peer Edits
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  <strong className="text-slate-200">Solution:</strong> Traditional history snapshot stacks clobber peer edits. We scoped the CRDT UndoManager to <code className="text-indigo-300 bg-slate-800 px-1 py-0.5 rounded">trackedOrigins: [LOCAL_ORIGIN]</code>. This inverts only the delta authored by the local user while retaining remote peer changes intact!
                </p>
              </div>
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-2">Keyboard Shortcuts</h3>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="flex justify-between p-2 rounded-lg bg-slate-950/40 border border-slate-800/60">
                <span className="text-slate-400">Select Tool</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">V</kbd>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-slate-950/40 border border-slate-800/60">
                <span className="text-slate-400">Hand / Pan</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">H or Space</kbd>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-slate-950/40 border border-slate-800/60">
                <span className="text-slate-400">Rectangle</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">R</kbd>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-slate-950/40 border border-slate-800/60">
                <span className="text-slate-400">Ellipse</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">O</kbd>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-slate-950/40 border border-slate-800/60">
                <span className="text-slate-400">Sticky Note</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">S</kbd>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-slate-950/40 border border-slate-800/60">
                <span className="text-slate-400">Arrow</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">A</kbd>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-slate-950/40 border border-slate-800/60">
                <span className="text-slate-400">Scoped Undo</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">Cmd / Ctrl + Z</kbd>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-slate-950/40 border border-slate-800/60">
                <span className="text-slate-400">Scoped Redo</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">Cmd / Ctrl + Shift + Z</kbd>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-slate-950/40 border border-slate-800/60">
                <span className="text-slate-400">Delete Shape</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">Delete / Backspace</kbd>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-slate-950/40 border border-slate-800/60">
                <span className="text-slate-400">Pinch / Wheel Zoom</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">Scroll Wheel</kbd>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-all"
          >
            Got it, let's build!
          </button>
        </div>
      </div>
    </div>
  );
};

