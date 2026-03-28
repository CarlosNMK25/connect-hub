import React, { useState, useRef, useEffect } from 'react';
import type { ChainStep } from '../../types/track';

interface SongModePanelProps {
  songModeView: 'performance' | 'chain';
  setSongModeView: (view: 'performance' | 'chain') => void;
  syncAllScenes: boolean;
  setSyncAllScenes: React.Dispatch<React.SetStateAction<boolean>>;
  chain: ChainStep[];
  setChain: React.Dispatch<React.SetStateAction<ChainStep[]>>;
  chainPosition: number;
  setChainPosition: (pos: number) => void;
  onJumpToScene: (sceneIndex: number) => void;
  chainCycleProgress: number;
}

const StepEditorPopover: React.FC<{
  step: ChainStep;
  stepIndex: number;
  canDelete: boolean;
  anchorRef: HTMLDivElement | null;
  onChangeScene: (scene: number) => void;
  onChangeCycles: (cycles: number) => void;
  onDelete: () => void;
  onClose: () => void;
}> = ({ step, canDelete, anchorRef, onChangeScene, onChangeCycles, onDelete, onClose }) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => {
    if (anchorRef) {
      const rect = anchorRef.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left + rect.width / 2 });
    }
  }, [anchorRef]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        anchorRef && !anchorRef.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [anchorRef, onClose]);

  return (
    <div
      ref={popoverRef}
      className="fixed z-50 p-2 rounded-lg border border-border bg-popover shadow-lg min-w-[160px]"
      style={{ top: pos.top, left: pos.left, transform: 'translateX(-50%)' }}
    >
      <div className="mb-1.5">
        <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">Escena</span>
        <div className="flex gap-0.5 mt-1 flex-wrap">
          {Array.from({ length: 8 }, (_, i) => i + 1).map(s => (
            <button
              key={s}
              onClick={() => { onChangeScene(s); onClose(); }}
              className={`w-5 h-5 text-[10px] rounded border transition-all ${
                s === step.scene
                  ? 'bg-system-accent text-white border-system-accent'
                  : 'bg-background text-muted-foreground border-border hover:border-foreground/30'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-1.5">
        <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">Ciclos</span>
        <div className="flex gap-0.5 mt-1 flex-wrap">
          {Array.from({ length: 8 }, (_, i) => i + 1).map(c => (
            <button
              key={c}
              onClick={() => { onChangeCycles(c); onClose(); }}
              className={`w-5 h-5 text-[10px] rounded border transition-all ${
                c === step.cycles
                  ? 'bg-system-accent text-white border-system-accent'
                  : 'bg-background text-muted-foreground border-border hover:border-foreground/30'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      {canDelete && (
        <button
          onClick={() => { onDelete(); onClose(); }}
          className="w-full text-[9px] mt-1 py-1 rounded border border-destructive/30 text-destructive hover:bg-destructive/10 transition-all"
        >
          Eliminar paso
        </button>
      )}
    </div>
  );
};

export const SongModePanel: React.FC<SongModePanelProps> = ({
  songModeView, setSongModeView,
  syncAllScenes, setSyncAllScenes,
  chain, setChain,
  chainPosition, setChainPosition,
  onJumpToScene, chainCycleProgress,
}) => {
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);
  const stepRefs = useRef<Record<number, HTMLDivElement | null>>({});

  return (
    <div className="border border-border rounded-lg bg-background overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-system-accent/5 border-b border-border">
        <span className="text-xs font-medium text-system-accent">Song Mode</span>
        <button
          onClick={() => setSongModeView('performance')}
          className={`text-[9px] px-2 py-0.5 rounded-full border transition-all ${
            songModeView === 'performance'
              ? 'bg-system-accent text-white border-system-accent'
              : 'bg-background text-muted-foreground border-border'
          }`}
        >
          Performance
        </button>
        <button
          onClick={() => setSongModeView('chain')}
          className={`text-[9px] px-2 py-0.5 rounded-full border transition-all ${
            songModeView === 'chain'
              ? 'bg-system-accent text-white border-system-accent'
              : 'bg-background text-muted-foreground border-border'
          }`}
        >
          Auto Chain
        </button>
        <div className="flex-1" />
        <button
          onClick={() => setSyncAllScenes(prev => !prev)}
          className={`text-[9px] px-2 py-0.5 rounded-full border transition-all ${
            syncAllScenes
              ? 'bg-green-800 text-white border-green-800'
              : 'bg-background text-muted-foreground border-border'
          }`}
        >
          SYNC ALL{syncAllScenes ? ' ✓' : ''}
        </button>
      </div>
      <div className="px-3 py-2 flex items-center gap-2 flex-wrap">
        {chain.map((step, i) => (
          <React.Fragment key={i}>
            <div className="relative">
              <div
                ref={el => { stepRefs.current[i] = el; }}
                className={`flex items-center gap-1 px-2 py-1 rounded border cursor-pointer transition-all ${
                  i === chainPosition
                    ? 'bg-system-accent/10 border-system-accent/30'
                    : 'bg-background border-border'
                }`}
                onClick={() => {
                  setChainPosition(i);
                  if (songModeView === 'performance') {
                    onJumpToScene(step.scene - 1);
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setEditingStepIndex(editingStepIndex === i ? null : i);
                }}
              >
                <span className={`text-xs font-medium ${i === chainPosition ? 'text-system-accent' : 'text-muted-foreground'}`}>
                  {step.scene}
                </span>
                <div className="flex gap-0.5">
                  {Array.from({ length: step.cycles }, (_, j) => (
                    <span
                      key={j}
                      className={`w-1.5 h-1.5 rounded-sm inline-block ${
                        i === chainPosition
                          ? j < chainCycleProgress + 1
                            ? 'bg-system-accent'
                            : 'bg-system-accent/20'
                          : 'bg-muted-foreground/20'
                      }`}
                    />
                  ))}
                </div>
              </div>
              {editingStepIndex === i && (
                <StepEditorPopover
                  step={step}
                  stepIndex={i}
                  canDelete={chain.length > 1}
                  anchorRef={stepRefs.current[i] ?? null}
                  onChangeScene={(scene) => {
                    setChain(prev => prev.map((s, idx) => idx === i ? { ...s, scene } : s));
                  }}
                  onChangeCycles={(cycles) => {
                    setChain(prev => prev.map((s, idx) => idx === i ? { ...s, cycles } : s));
                  }}
                  onDelete={() => {
                    setChain(prev => {
                      const next = prev.filter((_, idx) => idx !== i);
                      if (chainPosition >= next.length) setChainPosition(Math.max(0, next.length - 1));
                      return next;
                    });
                  }}
                  onClose={() => setEditingStepIndex(null)}
                />
              )}
            </div>
            {i < chain.length - 1
              ? <span className="text-muted-foreground text-xs">›</span>
              : <span className="text-system-accent text-xs">↺</span>
            }
          </React.Fragment>
        ))}
        <button
          onClick={() => setChain(prev => [...prev, { scene: 1, cycles: 2 }])}
          className="text-[9px] text-muted-foreground hover:text-foreground cursor-pointer"
        >
          + añadir
        </button>
      </div>
      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 border-t border-border text-[9px] text-muted-foreground">
        <div className="w-1.5 h-1.5 rounded-full bg-system-accent flex-shrink-0" />
        <span>Escena {chain[chainPosition]?.scene} · Ciclo {chainCycleProgress + 1}/{chain[chainPosition]?.cycles}</span>
        <div className="flex-1" />
      </div>
    </div>
  );
};
