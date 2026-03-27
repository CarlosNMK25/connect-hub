import React from 'react';
import { JitterMonitor } from './JitterMonitor';
import { EnergyMonitor } from './EnergyMonitor';

interface VisualMonitorsProps {
  jitter: number;
  lastHit: { velocity: number; color: string; offset: number } | null;
  isStudyMode: boolean;
  setHoveredGlobalParam: (p: string | null) => void;
  setHoveredGlobalEl: (el: HTMLElement | null) => void;
}

export const VisualMonitors: React.FC<VisualMonitorsProps> = ({
  jitter, lastHit, isStudyMode, setHoveredGlobalParam, setHoveredGlobalEl,
}) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2 duration-500">
      <div className="flex flex-col gap-2">
        <span className={`text-[9px] font-mono uppercase text-system-accent tracking-widest text-center ${isStudyMode ? 'cursor-help' : ''}`}
          onMouseEnter={(e) => { if (isStudyMode) { setHoveredGlobalParam('monitorTemporal'); setHoveredGlobalEl(e.currentTarget); } }}
          onMouseLeave={() => { setHoveredGlobalParam(null); setHoveredGlobalEl(null); }}>Temporal</span>
        <JitterMonitor jitter={jitter} lastHit={lastHit} />
      </div>
      <div className="flex flex-col gap-2">
        <span className={`text-[9px] font-mono uppercase text-system-accent tracking-widest text-center ${isStudyMode ? 'cursor-help' : ''}`}
          onMouseEnter={(e) => { if (isStudyMode) { setHoveredGlobalParam('monitorDistribution'); setHoveredGlobalEl(e.currentTarget); } }}
          onMouseLeave={() => { setHoveredGlobalParam(null); setHoveredGlobalEl(null); }}>Distribution</span>
        <EnergyMonitor lastHit={lastHit} mode="distribution" />
      </div>
      <div className="flex flex-col gap-2">
        <span className={`text-[9px] font-mono uppercase text-system-accent tracking-widest text-center ${isStudyMode ? 'cursor-help' : ''}`}
          onMouseEnter={(e) => { if (isStudyMode) { setHoveredGlobalParam('monitorRange'); setHoveredGlobalEl(e.currentTarget); } }}
          onMouseLeave={() => { setHoveredGlobalParam(null); setHoveredGlobalEl(null); }}>Range</span>
        <EnergyMonitor lastHit={lastHit} mode="range" />
      </div>
      <div className="flex flex-col gap-2">
        <span className={`text-[9px] font-mono uppercase text-system-accent tracking-widest text-center ${isStudyMode ? 'cursor-help' : ''}`}
          onMouseEnter={(e) => { if (isStudyMode) { setHoveredGlobalParam('monitorScatter'); setHoveredGlobalEl(e.currentTarget); } }}
          onMouseLeave={() => { setHoveredGlobalParam(null); setHoveredGlobalEl(null); }}>Scatter</span>
        <EnergyMonitor lastHit={lastHit} mode="scatter" />
      </div>
    </div>
  );
};
