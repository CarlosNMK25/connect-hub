import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Zap, Disc } from 'lucide-react';
import { lcmArray } from '../../utils/math';

interface PhaseRadarProps {
  tracks: {
    id: string;
    steps: number;
    color: string;
    offset: number;
  }[];
  globalStep: number;
  onSync: () => void;
  isDjMode: boolean;
  onDjModeToggle: () => void;
}

export const PhaseRadar: React.FC<PhaseRadarProps> = ({ tracks, globalStep, onSync, isDjMode, onDjModeToggle }) => {
  const size = 160;
  const center = size / 2;
  const radiusStep = 18;

  const mcm = useMemo(() => lcmArray(tracks.map(t => t.steps)), [tracks]);

  // Calculate if an "Eclipse" is happening (all active tracks at their effective step 0)
  const isEclipse = useMemo(() => {
    return tracks.every(t => ((globalStep + t.offset) % t.steps) === 0);
  }, [globalStep, tracks]);

  // MCM arc progress
  const mcmProgress = mcm > 0 && mcm <= 2000 ? (globalStep % mcm) / mcm : null;

  // Steps to eclipse
  const stepsToEclipse = mcm > 0 ? mcm - (globalStep % mcm) : 0;

  // Max steps for differential stroke
  const maxSteps = useMemo(() => Math.max(...tracks.map(t => t.steps), 1), [tracks]);

  // MCM arc path helper
  const mcmArcPath = useMemo(() => {
    if (mcmProgress === null || mcmProgress === 0) return null;
    const r = 74;
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + mcmProgress * 2 * Math.PI;
    const largeArc = mcmProgress > 0.5 ? 1 : 0;
    const x1 = center + r * Math.cos(startAngle);
    const y1 = center + r * Math.sin(startAngle);
    const x2 = center + r * Math.cos(endAngle);
    const y2 = center + r * Math.sin(endAngle);
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
  }, [mcmProgress, center]);

  // Phase point coordinates for polyline
  const phasePoints = useMemo(() => {
    return tracks.map((track, i) => {
      const currentStep = (globalStep + track.offset) % track.steps;
      const angle = (currentStep / track.steps) * 2 * Math.PI - Math.PI / 2;
      const r = (i + 1) * radiusStep;
      return {
        x: center + r * Math.cos(angle),
        y: center + r * Math.sin(angle),
      };
    });
  }, [globalStep, tracks, center, radiusStep]);

  const polylinePoints = phasePoints.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <div className="flex flex-col items-center gap-4 bg-idm-bg p-5 rounded-xl border-2 border-idm-ink/10 relative overflow-hidden group shadow-2xl">
      {/* Brutalist Grid Background */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ 
        backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', 
        backgroundSize: '10px 10px' 
      }} />

      {/* Background Glow during Eclipse */}
      <motion.div 
        className="absolute inset-0 bg-orange-500/5 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: isEclipse ? 1 : 0 }}
        transition={{ duration: 0.1 }}
      />

      <div className="relative" style={{ width: size, height: size }}>
        {/* Technical Labels */}
        <div className="absolute -top-2 -left-2 text-[7px] font-mono text-idm-ink/20 uppercase tracking-tighter">Phase_Monitor_v2.1</div>
        <div className="absolute -bottom-2 -right-2 text-[7px] font-mono text-idm-ink/20 uppercase tracking-tighter">Sync_Lock: {isEclipse ? "TRUE" : "FALSE"}</div>

        {/* Static Rings & Grid */}
        <svg width={size} height={size} className="absolute inset-0">
          {/* Angular Grid Lines */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
            <line
              key={angle}
              x1={center}
              y1={center}
              x2={center + (size/2) * Math.cos(angle * Math.PI / 180)}
              y2={center + (size/2) * Math.sin(angle * Math.PI / 180)}
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-idm-ink/10"
              strokeDasharray="1 3"
            />
          ))}

          {/* 1.3 — Differential stroke width per track */}
          {tracks.map((track, i) => {
            const sw = Math.max(0.5, 2 - (track.steps / maxSteps) * 1.5);
            return (
              <circle
                key={i}
                cx={center}
                cy={center}
                r={(i + 1) * radiusStep}
                fill="none"
                stroke="currentColor"
                strokeWidth={i === tracks.length - 1 ? Math.max(sw, 1.5) : sw}
                className={i === tracks.length - 1 ? "text-idm-ink/30" : "text-idm-ink/10"}
              />
            );
          })}
          
          {/* Vertical Alignment Guide (Technical) */}
          <line x1={center} y1={0} x2={center} y2={size} stroke="currentColor" strokeWidth="1" className="text-orange-500/20" strokeDasharray="4 2" />
          <circle cx={center} cy={radiusStep} r="2" className="fill-orange-500/40" />

          {/* 1.1 — MCM Progress Arc */}
          {mcmArcPath && (
            <path
              d={mcmArcPath}
              fill="none"
              stroke="#f97316"
              strokeWidth="2"
              opacity="0.4"
              strokeLinecap="round"
            />
          )}

          {/* 1.2 — Polyline connecting phase points */}
          {tracks.length >= 2 && (
            <polyline
              points={polylinePoints}
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-idm-ink/15"
            />
          )}
        </svg>

        {/* Moving Phase Points */}
        <svg width={size} height={size} className="absolute inset-0 overflow-visible">
          {tracks.map((track, i) => {
            const currentStep = (globalStep + track.offset) % track.steps;
            const angle = (currentStep / track.steps) * 2 * Math.PI - Math.PI / 2;
            const r = (i + 1) * radiusStep;
            const x = center + r * Math.cos(angle);
            const y = center + r * Math.sin(angle);

            return (
              <g key={track.id}>
                {/* Connection Line to Center (Technical) */}
                <line 
                  x1={center} y1={center} x2={x} y2={y} 
                  stroke={track.color} strokeWidth="0.5" 
                  className="opacity-10" 
                />

                {/* Main Point (Square/Brutalist) */}
                <motion.rect
                  width="4"
                  height="4"
                  initial={{ x: x - 2, y: y - 2 }}
                  animate={{ x: x - 2, y: y - 2, scale: isEclipse ? 1.5 : 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  fill={track.color}
                  className={isEclipse ? "shadow-[0_0_10px_currentColor]" : ""}
                />

                {/* Step Label (Technical) */}
                <text 
                  x={x + 6} y={y + 3} 
                  className="fill-idm-ink/40 text-[6px] font-mono font-bold"
                >
                  {currentStep}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Center Core */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 border border-idm-ink/10 rounded-full flex items-center justify-center">
          <motion.div 
            className="w-1.5 h-1.5 bg-orange-500"
            animate={{ 
              scale: isEclipse ? [1, 2.5, 1] : 1,
              rotate: isEclipse ? 90 : 0
            }}
            transition={{ duration: 0.2 }}
          />
        </div>

        {/* 1.4 — Countdown to eclipse */}
        {!isEclipse && (
          <svg width={size} height={size} className="absolute inset-0 pointer-events-none">
            <text
              x={center}
              y={95}
              textAnchor="middle"
              className="fill-idm-ink/50"
              style={{ fontSize: '6px', fontFamily: 'monospace' }}
            >
              {mcm > 2000 ? '∞' : stepsToEclipse}
            </text>
          </svg>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center gap-2 w-full">
        <div className="flex gap-2">
          <button
            onClick={onSync}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-500 text-[10px] font-mono uppercase tracking-widest hover:bg-orange-500 hover:text-idm-bg transition-all active:scale-95"
            title="Reset Phase Alignment"
          >
            <Zap size={10} fill="currentColor" />
            Sync
          </button>
          <button
            onClick={onDjModeToggle}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-mono uppercase tracking-widest transition-all active:scale-95 ${
              isDjMode 
                ? 'bg-orange-500 text-idm-bg border-orange-600 shadow-lg shadow-orange-500/20' 
                : 'bg-idm-muted/10 border-idm-muted/30 text-idm-ink/60 hover:border-idm-ink/40'
            }`}
            title="Manual Phase Nudge Mode"
          >
            <Disc size={10} className={isDjMode ? 'animate-spin-slow' : ''} />
            DJ
          </button>
        </div>
        <span className="text-[8px] font-mono text-idm-ink/40 uppercase mt-1">
          {isEclipse ? "Eclipse Detected" : "Phase Drifting"}
        </span>
      </div>
    </div>
  );
};