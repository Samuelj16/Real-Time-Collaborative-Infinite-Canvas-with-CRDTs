import React from 'react';
import {
  MousePointer2,
  Hand,
  Square,
  Circle,
  StickyNote,
  MoveRight,
  Pencil,
  Type,
  Undo2,
  Redo2,
  Trash2,
  HelpCircle,
} from 'lucide-react';
import { ToolType } from '../types/canvas';

interface ToolbarProps {
  currentTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onOpenHelp: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  currentTool,
  onSelectTool,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClear,
  onOpenHelp,
}) => {
  const tools: Array<{ id: ToolType; label: string; icon: React.ReactNode; shortcut: string }> = [
    { id: 'select', label: 'Select', icon: <MousePointer2 className="w-5 h-5" />, shortcut: 'V' },
    { id: 'pan', label: 'Hand / Pan', icon: <Hand className="w-5 h-5" />, shortcut: 'H' },
    { id: 'rectangle', label: 'Rectangle', icon: <Square className="w-5 h-5" />, shortcut: 'R' },
    { id: 'ellipse', label: 'Ellipse', icon: <Circle className="w-5 h-5" />, shortcut: 'O' },
    { id: 'sticky', label: 'Sticky Note', icon: <StickyNote className="w-5 h-5" />, shortcut: 'S' },
    { id: 'arrow', label: 'Arrow', icon: <MoveRight className="w-5 h-5" />, shortcut: 'A' },
    { id: 'freehand', label: 'Pencil', icon: <Pencil className="w-5 h-5" />, shortcut: 'P' },
    { id: 'text', label: 'Text', icon: <Type className="w-5 h-5" />, shortcut: 'T' },
  ];

  return (
    <div className="tool-dock absolute z-30 flex flex-col items-center gap-1.5 p-1.5 bg-white/95 backdrop-blur-md border border-slate-200 shadow-sm rounded-2xl">
      {tools.map(tool => {
        const isActive = currentTool === tool.id;
        return (
          <button
            key={tool.id}
            onClick={() => onSelectTool(tool.id)}
            title={`${tool.label} (${tool.shortcut})`}
            aria-label={tool.label}
            aria-pressed={isActive}
            className={`relative p-2.5 rounded-xl transition-all duration-150 flex items-center justify-center ${
              isActive
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            {tool.icon}
          </button>
        );
      })}

      <div className="w-7 h-[1px] bg-slate-200 mx-1" />

      {/* Undo */}
      <button
        onClick={onUndo}
        disabled={!canUndo}
        title="Undo (Ctrl+Z / Cmd+Z)"
        className={`p-2.5 rounded-xl transition-all duration-150 flex items-center justify-center ${
          canUndo
            ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
            : 'text-slate-600 cursor-not-allowed'
        }`}
      >
        <Undo2 className="w-5 h-5" />
      </button>

      {/* Redo */}
      <button
        onClick={onRedo}
        disabled={!canRedo}
        title="Redo (Ctrl+Shift+Z / Cmd+Shift+Z)"
        className={`p-2.5 rounded-xl transition-all duration-150 flex items-center justify-center ${
          canRedo
            ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
            : 'text-slate-600 cursor-not-allowed'
        }`}
      >
        <Redo2 className="w-5 h-5" />
      </button>

      <div className="w-7 h-[1px] bg-slate-200 mx-1" />

      {/* Clear Canvas */}
      <button
        onClick={onClear}
        title="Clear Canvas"
        className="p-2.5 rounded-xl text-rose-400 hover:text-rose-200 hover:bg-rose-950/40 transition-all duration-150"
      >
        <Trash2 className="w-5 h-5" />
      </button>

      {/* Shortcuts & Guide */}
      <button
        onClick={onOpenHelp}
        title="Keyboard Shortcuts & Architecture Guide"
        className="p-2.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all duration-150"
      >
        <HelpCircle className="w-5 h-5" />
      </button>
    </div>
  );
};

