import React, { useState, useRef, useMemo, useCallback } from 'react';
import { Shuffle, RotateCcw } from 'lucide-react';
import { calculateSliceBoundaries } from '../../utils/slicerUtils';

// Colors for slices — MPC/SP404 style
const SLICE_COLORS = [
  '#166534', '#9D174D', '#155E75', '#5B21B6',
  '#92400E', '#064E3B', '#1E3A5F', '#4A1942',
  '#7C2D12', '#1E40AF', '#6B21A8', '#065F46',
  '#991B1B', '#1D4ED8', '#7E22CE', '#047857',
  '#B45309', '#0E7490', '#A21CAF', '#15803D',
  '#C2410C', '#0369A1', '#9333EA', '#059669',
  '#DC2626', '#2563EB', '#A855F7', '#10B981',
  '#EA580C', '#3B82F6', '#C084FC', '#34D399',
];

interface SlicerPanelProps {
  samplerBuffer: AudioBuffer | null;
  sliceCount: number;
  sliceOrder: number[];
  sliceReverse: boolean[];
  slicePitch: number[];
  color: string;
  onSliceCountChange: (count: number) => void;
  onSliceOrderChange: (order: number[]) => void;
  onSliceReverseToggle: (sliceIdx: number) => void;
  onSlicePitchChange: (sliceIdx: number, semitones: number) => void;
  onRandomize: () => void;
  onReset: () => void;
}

export const SlicerPanel: React.FC<SlicerPanelProps> = ({
  samplerBuffer,
  sliceCount,
  sliceOrder,
  sliceReverse,
  slicePitch,
  color,
  onSliceCountChange,
  onSliceOrderChange,
  onSliceReverseToggle,
  onSlicePitchChange,
  onRandomize,
  onReset,
}) => {
  const [selectedSlice, setSelectedSlice] = useState<number | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  // Fix 2: boundaries computed internally via useMemo
  const sliceBoundaries = useMemo(() => {
    if (!samplerBuffer) return [];
    return calculateSliceBoundaries(samplerBuffer, sliceCount);
  }, [samplerBuffer, sliceCount]);

  const sliceCounts = [4, 8, 16, 32] as const;

  // Drag reorder handlers (mouse events, no library)
  const handleSliceMouseDown = useCallback((orderIdx: number, e: React.MouseEvent) => {
    e.preventDefault();
    setDragFrom(orderIdx);
    setDragOver(orderIdx);

    const handleMouseMove = (moveE: MouseEvent) => {
      const target = (moveE.target as HTMLElement).closest('[data-order-idx]');
      if (target) {
        const idx = parseInt(target.getAttribute('data-order-idx') || '0', 10);
        setDragOver(idx);
      }
    };

    const handleMouseUp = (upE: MouseEvent) => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      const target = (upE.target as HTMLElement).closest('[data-order-idx]');
      if (target && dragFrom !== null) {
        const dropIdx = parseInt(target.getAttribute('data-order-idx') || '0', 10);
        if (dropIdx !== dragFrom) {
          // Swap slices in order
          const newOrder = [...sliceOrder];
          const temp = newOrder[dragFrom];
          newOrder[dragFrom] = newOrder[dropIdx];
          newOrder[dropIdx] = temp;
          onSliceOrderChange(newOrder);
        }
      }

      setDragFrom(null);
      setDragOver(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [sliceOrder, onSliceOrderChange, dragFrom]);

  return (
    <div className="mt-2 p-3 bg-background rounded-lg border border-border space-y-3">
      {/* Header: Slice count selector + actions */}
      <div className="flex items-center gap-2">
        <span className="text-[8px] font-mono text-foreground/50 uppercase tracking-widest">Slices</span>
        <div className="flex gap-1">
          {sliceCounts.map(c => (
            <button
              key={c}
              onClick={() => onSliceCountChange(c)}
              className={`text-[9px] font-mono px-1.5 py-0.5 rounded border transition-colors ${
                sliceCount === c
                  ? 'bg-system-accent text-white border-system-accent'
                  : 'bg-background text-foreground/60 border-border hover:border-system-accent/50'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <button
          onClick={onRandomize}
          className="flex items-center gap-1 text-[8px] font-mono px-2 py-0.5 rounded border border-border hover:border-system-accent/50 text-foreground/60 hover:text-foreground transition-colors"
          title="Randomizar orden de slices"
        >
          <Shuffle size={10} />
          RAND
        </button>
        <button
          onClick={onReset}
          className="flex items-center gap-1 text-[8px] font-mono px-2 py-0.5 rounded border border-border hover:border-system-accent/50 text-foreground/60 hover:text-foreground transition-colors"
          title="Resetear orden, reverse y pitch"
        >
          <RotateCcw size={10} />
          RESET
        </button>
      </div>

      {/* Waveform overlay with slice boundaries */}
      {samplerBuffer && sliceBoundaries.length > 0 && (
        <div className="relative h-10 bg-foreground/5 rounded border border-border overflow-hidden">
          {/* Slice region backgrounds */}
          {sliceBoundaries.map((slice, i) => (
            <div
              key={`bg-${i}`}
              className="absolute top-0 bottom-0 transition-opacity"
              style={{
                left: `${slice.start * 100}%`,
                width: `${(slice.end - slice.start) * 100}%`,
                backgroundColor: SLICE_COLORS[i % SLICE_COLORS.length],
                opacity: selectedSlice === i ? 0.25 : 0.08,
              }}
              onClick={() => setSelectedSlice(selectedSlice === i ? null : i)}
            />
          ))}
          {/* Boundary lines */}
          {sliceBoundaries.slice(1).map((slice, i) => (
            <div
              key={`line-${i}`}
              className="absolute top-0 bottom-0 w-px pointer-events-none"
              style={{
                left: `${slice.start * 100}%`,
                backgroundColor: `${color}80`,
              }}
            />
          ))}
          {/* Slice labels */}
          {sliceBoundaries.map((slice, i) => (
            <div
              key={`label-${i}`}
              className="absolute bottom-0 text-[7px] font-mono text-foreground/40 pointer-events-none"
              style={{
                left: `${((slice.start + slice.end) / 2) * 100}%`,
                transform: 'translateX(-50%)',
              }}
            >
              {i}
            </div>
          ))}
        </div>
      )}

      {/* Slice blocks row — draggable */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {sliceOrder.map((sliceIdx, orderIdx) => {
          const isReversed = sliceReverse[sliceIdx] ?? false;
          const isDragging = dragFrom === orderIdx;
          const isDragTarget = dragOver === orderIdx && dragFrom !== null && dragFrom !== orderIdx;
          const sliceColor = SLICE_COLORS[sliceIdx % SLICE_COLORS.length];

          return (
            <div
              key={orderIdx}
              data-order-idx={orderIdx}
              className={`flex flex-col items-center justify-between min-w-[28px] h-10 rounded border cursor-grab select-none transition-all ${
                isDragging ? 'opacity-50 scale-95' : ''
              } ${isDragTarget ? 'ring-2 ring-system-accent' : ''} ${
                selectedSlice === sliceIdx ? 'ring-1 ring-system-accent' : ''
              }`}
              style={{
                backgroundColor: `${sliceColor}20`,
                borderColor: `${sliceColor}40`,
              }}
              onMouseDown={(e) => handleSliceMouseDown(orderIdx, e)}
              onClick={() => setSelectedSlice(selectedSlice === sliceIdx ? null : sliceIdx)}
            >
              <span className="text-[8px] font-mono font-bold mt-0.5" style={{ color: sliceColor }}>
                {sliceIdx}
              </span>
              {isReversed && (
                <span className="text-[7px] font-mono font-bold mb-0.5" style={{ color: sliceColor }}>
                  R
                </span>
              )}
              {!isReversed && <span className="mb-0.5" />}
            </div>
          );
        })}
      </div>

      {/* Selected slice controls: Reverse + Pitch */}
      {selectedSlice !== null && (
        <div className="flex items-center gap-3 p-2 bg-foreground/5 rounded border border-border">
          <span className="text-[8px] font-mono text-foreground/50">
            Slice {selectedSlice}
          </span>
          <button
            onClick={() => onSliceReverseToggle(selectedSlice)}
            className={`text-[8px] font-mono px-1.5 py-0.5 rounded border transition-colors ${
              sliceReverse[selectedSlice]
                ? 'bg-system-accent text-white border-system-accent'
                : 'bg-background text-foreground/60 border-border hover:border-system-accent/50'
            }`}
          >
            REV
          </button>
          <div className="flex items-center gap-1 flex-1">
            <span className="text-[7px] font-mono text-foreground/40">Pitch</span>
            <input
              type="range"
              min={-12}
              max={12}
              step={1}
              value={slicePitch[selectedSlice] ?? 0}
              onChange={e => onSlicePitchChange(selectedSlice, Number(e.target.value))}
              className="flex-1 h-[7px] accent-system-accent"
            />
            <span className="text-[8px] font-mono text-foreground/60 w-6 text-right">
              {(slicePitch[selectedSlice] ?? 0) > 0 ? '+' : ''}{slicePitch[selectedSlice] ?? 0}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
