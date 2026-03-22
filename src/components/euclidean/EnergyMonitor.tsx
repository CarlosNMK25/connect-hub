import React, { useState, useEffect, useRef } from 'react';
import { BarChart2, Maximize2, ScatterChart } from 'lucide-react';

interface EnergyMonitorProps {
  lastHit?: { velocity: number; color: string } | null;
  mode: ViewMode;
}

type ViewMode = 'distribution' | 'range' | 'scatter';

export const EnergyMonitor: React.FC<EnergyMonitorProps> = ({ lastHit, mode }) => {
  // Distribution State
  const [bins, setBins] = useState<number[]>(new Array(12).fill(0));
  const [binColors, setBinColors] = useState<string[]>(new Array(12).fill('rgba(255,255,255,0.1)'));
  
  // Scatter State
  const [history, setHistory] = useState<{ velocity: number; color: string; id: number }[]>([]);
  const historyCounter = useRef(0);

  const decayRef = useRef<number | null>(null);

  // Update logic on hit
  useEffect(() => {
    if (lastHit) {
      // 1. Update Bins (Distribution)
      const binIndex = Math.min(11, Math.floor(lastHit.velocity * 12));
      setBins(prev => {
        const next = [...prev];
        next[binIndex] = Math.min(1, next[binIndex] + 0.5);
        return next;
      });
      setBinColors(prev => {
        const next = [...prev];
        next[binIndex] = lastHit.color;
        return next;
      });

      // 2. Update History (Scatter)
      setHistory(prev => {
        const newPoint = { ...lastHit, id: historyCounter.current++ };
        const next = [newPoint, ...prev].slice(0, 30); // Keep last 30 hits
        return next;
      });
    }
  }, [lastHit]);

  // Decay animation for bins
  useEffect(() => {
    const decay = () => {
      setBins(prev => prev.map(v => Math.max(0, v - 0.02)));
      decayRef.current = requestAnimationFrame(decay);
    };
    decayRef.current = requestAnimationFrame(decay);
    return () => {
      if (decayRef.current) cancelAnimationFrame(decayRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-1 bg-black/20 p-2 rounded border border-idm-muted/10 flex-1 relative">
      <div className="flex justify-between w-full text-[7px] font-mono uppercase text-idm-ink/40 tracking-tighter">
        <span>Monitor</span>
        <span>{mode}</span>
      </div>
      
      <div className="flex items-end justify-center h-[40px] mt-1 px-1 w-full overflow-hidden">
        {mode === 'distribution' && (
          <div className="flex items-end gap-0.5 w-full h-full">
            {bins.map((val, i) => (
              <div 
                key={i}
                className="flex-1 rounded-t-[1px] transition-colors duration-300"
                style={{ 
                  height: `${Math.max(10, val * 100)}%`,
                  backgroundColor: val > 0 ? binColors[i] : 'rgba(255,255,255,0.05)',
                  opacity: val > 0 ? 0.3 + (val * 0.7) : 0.2
                }}
              />
            ))}
          </div>
        )}

        {mode === 'range' && (
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Background Range Box */}
            <div className="absolute inset-y-1 w-full max-w-[80px] bg-white/5 border-x border-white/10 rounded-sm" />
            
            {/* Current Hit Indicator */}
            {lastHit && (
              <div 
                className="absolute w-full max-w-[60px] h-[2px] rounded-full transition-all duration-100"
                style={{ 
                  bottom: `${lastHit.velocity * 100}%`,
                  backgroundColor: lastHit.color,
                  boxShadow: `0 0 8px ${lastHit.color}`
                }}
              />
            )}
            
            {/* Scale markings */}
            <div className="absolute left-0 h-full flex flex-col justify-between text-[6px] font-mono text-idm-ink/20 py-1">
              <span>100</span>
              <span>0</span>
            </div>
          </div>
        )}

        {mode === 'scatter' && (
          <div className="flex items-end flex-row-reverse justify-start gap-1 w-full h-full px-1">
            {history.map((point, i) => (
              <div 
                key={point.id}
                className="w-1.5 h-1.5 rounded-full shrink-0 relative"
                style={{ 
                  bottom: `${point.velocity * 85}%`, // Keep within 40px height
                  backgroundColor: point.color,
                  opacity: Math.max(0.3, 1 - (i / history.length)),
                  transform: `scale(${1 - (i * 0.02)})`,
                  boxShadow: `0 0 6px ${point.color}66`
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-between w-full text-[6px] font-mono text-idm-ink/30 uppercase mt-1">
        <span>{mode === 'scatter' ? 'Rec' : 'Soft'}</span>
        <span>{mode === 'scatter' ? 'Old' : 'Hard'}</span>
      </div>
    </div>
  );
};
