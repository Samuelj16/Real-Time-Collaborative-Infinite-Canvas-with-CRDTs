import React from 'react';

interface StylePickerProps {
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  onChangeStrokeColor: (color: string) => void;
  onChangeFillColor: (color: string) => void;
  onChangeStrokeWidth: (width: number) => void;
}

const STROKE_COLORS = [
  '#f8fafc', // White/slate
  '#38bdf8', // Sky
  '#6366f1', // Indigo
  '#ec4899', // Pink
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
];

const FILL_COLORS = [
  'transparent',
  '#1e293b', // Slate fill
  '#0284c7', // Sky fill
  '#4f46e5', // Indigo fill
  '#db2777', // Pink fill
  '#059669', // Emerald fill
  '#fef08a', // Sticky Yellow
];

export const StylePicker: React.FC<StylePickerProps> = ({
  strokeColor,
  fillColor,
  strokeWidth,
  onChangeStrokeColor,
  onChangeFillColor,
  onChangeStrokeWidth,
}) => {
  return (
    <div className="absolute top-20 left-4 z-30 flex flex-col gap-3 p-3 bg-slate-900/90 backdrop-blur-md border border-slate-800 shadow-2xl rounded-2xl w-48 text-xs text-slate-300">
      {/* Stroke Color */}
      <div>
        <div className="text-[11px] font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
          Stroke
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STROKE_COLORS.map(c => (
            <button
              key={c}
              onClick={() => onChangeStrokeColor(c)}
              className={`w-6 h-6 rounded-full border transition-transform ${
                strokeColor === c ? 'scale-125 border-white shadow-md' : 'border-slate-700 hover:scale-110'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {/* Fill Color */}
      <div>
        <div className="text-[11px] font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
          Fill
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILL_COLORS.map(c => (
            <button
              key={c}
              onClick={() => onChangeFillColor(c)}
              className={`w-6 h-6 rounded-full border transition-transform flex items-center justify-center ${
                fillColor === c ? 'scale-125 border-white shadow-md' : 'border-slate-700 hover:scale-110'
              }`}
              style={{ backgroundColor: c === 'transparent' ? '#090d16' : c }}
            >
              {c === 'transparent' && <span className="text-[10px] text-slate-500">∅</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Stroke Width */}
      <div>
        <div className="text-[11px] font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
          Width
        </div>
        <div className="flex gap-2">
          {[2, 4, 8].map(w => (
            <button
              key={w}
              onClick={() => onChangeStrokeWidth(w)}
              className={`flex-1 py-1 px-2 rounded-lg border text-center transition-all ${
                strokeWidth === w
                  ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300 font-semibold'
                  : 'border-slate-800 hover:bg-slate-800/60 text-slate-400'
              }`}
            >
              {w}px
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

