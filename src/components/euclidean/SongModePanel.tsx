import React from 'react';

interface ChainStep {
  scene: number;
  cycles: number;
}

interface SongModePanelProps {
  songModeView: 'performance' | 'chain';
  setSongModeView: (view: 'performance' | 'chain') => void;
  syncAllScenes: boolean;
  setSyncAllScenes: React.Dispatch<React.SetStateAction<boolean>>;
  chain: ChainStep[];
  setChain: React.Dispatch<React.SetStateAction<ChainStep[]>>;
  chainPosition: number;
  setChainPosition: (pos: number) => void;
}

export const SongModePanel: React.FC<SongModePanelProps> = ({
  songModeView, setSongModeView,
  syncAllScenes, setSyncAllScenes,
  chain, setChain,
  chainPosition, setChainPosition,
}) => {
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
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded border cursor-pointer transition-all ${
                i === chainPosition
                  ? 'bg-system-accent/10 border-system-accent/30'
                  : 'bg-background border-border'
              }`}
              onClick={() => setChainPosition(i)}
            >
              <span className={`text-xs font-medium ${i === chainPosition ? 'text-system-accent' : 'text-muted-foreground'}`}>
                {step.scene}
              </span>
              <div className="flex gap-0.5">
                {Array.from({ length: step.cycles }, (_, j) => (
                  <span
                    key={j}
                    className={`w-1.5 h-1.5 rounded-sm inline-block ${
                      i === chainPosition ? 'bg-system-accent' : 'bg-muted-foreground/20'
                    }`}
                  />
                ))}
              </div>
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
        <span>Escena {chain[chainPosition]?.scene} · Ciclo 1/{chain[chainPosition]?.cycles}</span>
        <div className="flex-1" />
        
      </div>
    </div>
  );
};
