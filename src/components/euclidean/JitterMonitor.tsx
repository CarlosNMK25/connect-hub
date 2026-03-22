import React, { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface JitterPoint {
  id: number;
  offset: number; // -1 to 1 normalized by max jitter
  color: string;
}

interface JitterMonitorProps {
  jitter: number; // in ms
  lastHit?: { offset: number; color: string; velocity: number } | null;
}

export const JitterMonitor: React.FC<JitterMonitorProps> = ({ jitter, lastHit }) => {
  const [points, setPoints] = useState<JitterPoint[]>([]);
  const pointIdCounter = useRef(0);

  // Add new point when lastHit changes
  useEffect(() => {
    if (lastHit && jitter > 0) {
      const newPoint: JitterPoint = {
        id: pointIdCounter.current++,
        offset: lastHit.offset / (jitter / 1000), // Normalize to -1 to 1 range based on current jitter
        color: lastHit.color
      };
      
      setPoints(prev => [...prev.slice(-15), newPoint]); // Keep last 15 points
    }
  }, [lastHit]);

  // Gaussian curve points
  const spread = useMemo(() => Math.max(0.5, (jitter / 20) * 2.5), [jitter]);

  const curvePoints = useMemo(() => {
    const points = [];
    const width = 120;
    const height = 40;
    
    for (let x = -3; x <= 3; x += 0.1) {
      const y = Math.exp(-0.5 * Math.pow(x, 2)); 
      points.push({
        x: 60 + (x * (width / 6) * spread),
        y: height - (y * height * 0.8)
      });
    }
    return points;
  }, [spread]);

  const pathData = useMemo(() => {
    if (curvePoints.length === 0) return "";
    return `M ${curvePoints[0].x} ${curvePoints[0].y} ` + 
           curvePoints.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
  }, [curvePoints]);

  return (
    <div className="flex flex-col items-center gap-1 bg-idm-bg p-2 rounded border border-idm-ink/10 flex-1 shadow-sm">
      <div className="flex justify-between w-full text-[8px] font-mono uppercase text-system-accent tracking-tighter">
        <span>Deviación</span>
        <span>Gaussiana</span>
      </div>
      
      <div className="relative w-[120px] h-[40px] mt-1">
        {/* The Bell Curve */}
        <svg width="120" height="40" className="overflow-visible">
          {/* Grid lines */}
          <line x1="60" y1="0" x2="60" y2="40" stroke="rgba(255,255,255,0.05)" strokeDasharray="2 2" />
          <line x1="0" y1="38" x2="120" y2="38" stroke="rgba(255,255,255,0.1)" />
          
          {/* The Curve */}
          <motion.path
            d={pathData}
            fill="none"
            stroke="rgba(249,115,22,0.3)"
            strokeWidth="1"
            animate={{ 
              // We simulate widening by scaling the path if we wanted, 
              // but here we just redraw based on jitter in useMemo
            }}
          />

          {/* Impact Points */}
          <AnimatePresence>
            {points.map((point) => {
              // Map normalized offset (-1 to 1) to the curve's x scale
              // Since sigma in our random is jitter/3, a normalized offset of 1 is 3 sigma.
              // Our curve is drawn from x = -3 to 3.
              const curveX = point.offset * 3; 
              const x = 60 + (curveX * (120 / 6) * spread);
              const clampedX = Math.max(0, Math.min(120, x));
              
              // Calculate Y on the curve for the point to "land" on it
              const curveY = Math.exp(-0.5 * Math.pow(curveX, 2));
              const y = 30 - (curveY * 30 * 0.8);
              
              return (
                <motion.circle
                  key={point.id}
                  initial={{ opacity: 1, r: 3, y: -10 }}
                  animate={{ opacity: 0, r: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  cx={clampedX}
                  cy={y}
                  fill={point.color}
                  className="drop-shadow-[0_0_2px_rgba(255,255,255,0.5)]"
                />
              );
            })}
          </AnimatePresence>
        </svg>

        {/* Center Indicator */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-full w-[1px] bg-orange-500/10 pointer-events-none" />
      </div>

      <div className="flex justify-between w-full text-[7px] font-mono text-system-accent uppercase mt-1">
        <span>-Early</span>
        <span>Late+</span>
      </div>
    </div>
  );
};
