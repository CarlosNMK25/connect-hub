import React from 'react';
import { TemporalityMode, TEMPORALITY_MODES } from '../../utils/temporality';

interface GlobalControlsProps {
  temporalityMode: TemporalityMode;
  setTemporalityMode: (m: TemporalityMode) => void;
  fxHighPass: number;
  setFxHighPass: (v: number) => void;
  fxLowPass: number;
  setFxLowPass: (v: number) => void;
  reverbMix: number;
  setReverbMix: (v: number) => void;
  delayMix: number;
  setDelayMix: (v: number) => void;
  delayFeedback: number;
  setDelayFeedback: (v: number) => void;
  bpm: number;
  setBpm: (v: number) => void;
  jitter: number;
  setJitter: (v: number) => void;
  swing: number;
  setSwing: (v: number) => void;
  dynamics: number;
  setDynamics: (v: number) => void;
  mcm: number;
  showMM: boolean;
  setShowMM: (v: boolean | ((p: boolean) => boolean)) => void;
  mmHistory: Array<{ fromBpm: number; toBpm: number; ratio: string; label: string; timestamp: string }>;
  METRIC_MODULATION_RATIOS: Array<{ ratio: number; label: string; description: string }>;
  handleMetricModulation: (ratio: number, label: string, description: string) => void;
  handleMetricModulationReset: (targetBpm: number) => void;
  logChange: (action: string, deltas?: string[]) => void;
  logSliderChange: (key: string, label: string, currentVal: number, newVal: number, unit: string, computeDeltas?: (oldVal: number, newVal: number) => string[]) => void;
  formatEclipseTime: (secs: number, isEstimate: boolean) => string;
  isStudyMode: boolean;
  setHoveredGlobalParam: (p: string | null) => void;
  setHoveredGlobalEl: (el: HTMLElement | null) => void;
  setHoveredGlobalValue: (v: number | null) => void;
}

export const GlobalControls: React.FC<GlobalControlsProps> = ({
  temporalityMode, setTemporalityMode,
  fxHighPass, setFxHighPass, fxLowPass, setFxLowPass,
  reverbMix, setReverbMix, delayMix, setDelayMix, delayFeedback, setDelayFeedback,
  bpm, setBpm, jitter, setJitter, swing, setSwing, dynamics, setDynamics,
  mcm, showMM, setShowMM, mmHistory,
  METRIC_MODULATION_RATIOS, handleMetricModulation, handleMetricModulationReset,
  logChange, logSliderChange, formatEclipseTime,
  isStudyMode, setHoveredGlobalParam, setHoveredGlobalEl, setHoveredGlobalValue,
}) => {
  return (
    <div className="flex flex-col gap-4">
      {/* FILA 1 — TEMPORALIDAD + FILTRO GLOBAL */}
      <div className="grid grid-cols-2 gap-6 items-start">
        {/* TEMPORALIDAD */}
        <div className="flex flex-col gap-2">
          <span className="text-[9px] font-mono uppercase tracking-widest text-idm-muted">Temporalidad</span>
          <div className="flex gap-1.5 flex-wrap">
            {TEMPORALITY_MODES.map(m => (
              <button
                key={m.id}
                onClick={() => { setTemporalityMode(m.id); logChange(`Temporalidad → ${m.label}`); }}
                className={`px-3 py-1.5 rounded-full text-[9px] font-mono uppercase tracking-wider transition-all duration-200 active:scale-95 ${
                  temporalityMode === m.id
                    ? 'bg-system-accent text-white shadow-sm'
                    : 'bg-black/5 text-idm-muted hover:bg-black/10 hover:text-idm-ink'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* FILTRO GLOBAL — HPF + LPF en misma fila */}
        <div className="flex flex-col gap-2">
          <span className="text-[9px] font-mono uppercase tracking-widest text-idm-muted">Filtro Global</span>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <div className={`flex justify-between text-[10px] font-mono uppercase text-idm-muted ${isStudyMode ? 'cursor-help' : ''}`}
                onMouseEnter={(e) => { if (isStudyMode) { setHoveredGlobalParam('fxHighPass'); setHoveredGlobalEl(e.currentTarget); } }}
                onMouseLeave={() => { setHoveredGlobalParam(null); setHoveredGlobalEl(null); }}>
                <span>HPF</span>
                <span className="text-system-accent">{Math.round(fxHighPass)}Hz</span>
              </div>
              <input type="range" min="20" max="2000" value={fxHighPass}
                onChange={(e) => setFxHighPass(parseInt(e.target.value))}
                className="h-1 bg-black/5 appearance-none cursor-pointer accent-system-accent" />
            </div>
            <div className="flex flex-col gap-1">
              <div className={`flex justify-between text-[10px] font-mono uppercase text-idm-muted ${isStudyMode ? 'cursor-help' : ''}`}
                onMouseEnter={(e) => { if (isStudyMode) { setHoveredGlobalParam('fxLowPass'); setHoveredGlobalEl(e.currentTarget); } }}
                onMouseLeave={() => { setHoveredGlobalParam(null); setHoveredGlobalEl(null); }}>
                <span>LPF</span>
                <span className="text-system-accent">{Math.round(fxLowPass)}Hz</span>
              </div>
              <input type="range" min="500" max="20000" value={fxLowPass}
                onChange={(e) => setFxLowPass(parseInt(e.target.value))}
                className="h-1 bg-black/5 appearance-none cursor-pointer accent-system-accent" />
            </div>
          </div>
        </div>
      </div>

      {/* FILA 2 — FX GLOBALES SIMPLES a ancho completo, 3 columnas */}
      <div className="flex flex-col gap-2">
        <span className="text-[9px] font-mono uppercase tracking-widest text-idm-muted">FX Globales</span>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <div className={`flex justify-between text-[10px] font-mono uppercase text-idm-muted ${isStudyMode ? 'cursor-help' : ''}`}
              onMouseEnter={(e) => { if (isStudyMode) { setHoveredGlobalParam('reverbMix'); setHoveredGlobalEl(e.currentTarget); } }}
              onMouseLeave={() => { setHoveredGlobalParam(null); setHoveredGlobalEl(null); }}>
              <span>Space</span><span className="text-system-accent">{Math.round(reverbMix * 100)}%</span>
            </div>
            <input type="range" min="0" max="100" value={reverbMix * 100}
              onChange={(e) => setReverbMix(parseInt(e.target.value) / 100)}
              className="h-1 bg-black/5 appearance-none cursor-pointer accent-system-accent" />
          </div>
          <div className="flex flex-col gap-1">
            <div className={`flex justify-between text-[10px] font-mono uppercase text-idm-muted ${isStudyMode ? 'cursor-help' : ''}`}
              onMouseEnter={(e) => { if (isStudyMode) { setHoveredGlobalParam('delayMix'); setHoveredGlobalEl(e.currentTarget); } }}
              onMouseLeave={() => { setHoveredGlobalParam(null); setHoveredGlobalEl(null); }}>
              <span>Echo</span><span className="text-system-accent">{Math.round(delayMix * 100)}%</span>
            </div>
            <input type="range" min="0" max="100" value={delayMix * 100}
              onChange={(e) => setDelayMix(parseInt(e.target.value) / 100)}
              className="h-1 bg-black/5 appearance-none cursor-pointer accent-system-accent" />
          </div>
          <div className="flex flex-col gap-1">
            <div className={`flex justify-between text-[10px] font-mono uppercase text-idm-muted ${isStudyMode ? 'cursor-help' : ''}`}
              onMouseEnter={(e) => { if (isStudyMode) { setHoveredGlobalParam('delayFeedback'); setHoveredGlobalEl(e.currentTarget); } }}
              onMouseLeave={() => { setHoveredGlobalParam(null); setHoveredGlobalEl(null); }}>
              <span>Feedback</span><span className="text-system-accent">{Math.round(delayFeedback * 100)}%</span>
            </div>
            <input type="range" min="0" max="100" value={delayFeedback * 100}
              onChange={(e) => setDelayFeedback(parseInt(e.target.value) / 100)}
              className="h-1 bg-black/5 appearance-none cursor-pointer accent-system-accent" />
          </div>
        </div>
      </div>

      {/* FILA 3 — RITMO a ancho completo, 4 columnas */}
      <div className="flex flex-col gap-2">
        <span className="text-[9px] font-mono uppercase tracking-widest text-idm-muted">Ritmo</span>
        <div className="grid grid-cols-4 gap-4">
          <div className="flex flex-col gap-1">
            <div className={`flex justify-between text-[10px] font-mono uppercase text-idm-muted ${isStudyMode ? 'cursor-help' : ''}`}
              onMouseEnter={(e) => { if (isStudyMode) { setHoveredGlobalParam('bpm'); setHoveredGlobalEl(e.currentTarget); } }}
              onMouseLeave={() => { setHoveredGlobalParam(null); setHoveredGlobalEl(null); }}>
              <span>Tempo</span>
              <span className="text-idm-ink">{bpm} BPM</span>
            </div>
            <input type="range" min="40" max="240" value={bpm}
              onChange={(e) => { const v = parseInt(e.target.value); logSliderChange('bpm', 'BPM', bpm, v, '', (o, n) => { const oldEclipse = mcm * 60 / o / 4; const newEclipse = mcm * 60 / n / 4; return [`Eclipse ${formatEclipseTime(oldEclipse, false)} → ${formatEclipseTime(newEclipse, false)}`]; }); setBpm(v); }}
              className="h-1 bg-black/5 appearance-none cursor-pointer accent-system-accent" />
            <div className="flex flex-col gap-1">
              <button onClick={() => setShowMM(prev => !prev)}
                className={`text-[8px] font-mono px-1.5 py-0.5 rounded border transition-colors self-start ${showMM ? 'bg-system-accent text-white border-system-accent' : 'bg-white text-idm-muted border-black/10 hover:border-system-accent'}`}
                title="Metric Modulation">MM</button>
              {showMM && (
                <div className="flex flex-col gap-2 p-2 bg-white/80 border border-black/10 rounded-lg min-w-[200px]">
                  <span className="text-[8px] font-mono uppercase text-idm-muted">Metric Modulation</span>
                  <div className="text-[10px] font-mono text-idm-ink">{bpm} BPM</div>
                  <div className="grid grid-cols-3 gap-1">
                    {METRIC_MODULATION_RATIOS.map(({ ratio, label, description }) => {
                      const resultBpm = Math.round(Math.max(40, Math.min(240, bpm * ratio)));
                      const clamped = resultBpm !== Math.round(bpm * ratio);
                      return (
                        <button key={label} onClick={() => handleMetricModulation(ratio, label, description)} disabled={clamped}
                          className={`flex flex-col items-center px-1 py-1.5 rounded border text-center transition-colors ${clamped ? 'opacity-30 cursor-not-allowed border-black/5 bg-white' : 'border-black/10 bg-white hover:border-system-accent hover:text-system-accent'}`}
                          title={`${description} → ${resultBpm} BPM${clamped ? ' (fuera de rango)' : ''}`}>
                          <span className="text-[10px] font-mono font-bold text-idm-ink">{label}</span>
                          <span className="text-[7px] font-mono text-idm-muted">{resultBpm}</span>
                        </button>
                      );
                    })}
                  </div>
                  {mmHistory.length > 0 && (
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[7px] font-mono uppercase text-idm-muted">Historial</span>
                        <button onClick={() => handleMetricModulationReset(mmHistory[mmHistory.length - 1].fromBpm)}
                          className="text-[7px] font-mono text-idm-muted hover:text-system-accent transition-colors">Reset</button>
                      </div>
                      {mmHistory.map((entry, i) => (
                        <div key={i} className="flex items-center justify-between gap-1">
                          <span className="text-[7px] font-mono text-idm-muted">{entry.timestamp}</span>
                          <span className="text-[7px] font-mono text-idm-ink">{entry.fromBpm}→{entry.toBpm}</span>
                          <span className="text-[7px] font-mono text-system-accent">{entry.ratio}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <div className={`flex justify-between text-[10px] font-mono uppercase text-idm-muted ${isStudyMode ? 'cursor-help' : ''}`}
              onMouseEnter={(e) => { if (isStudyMode) { setHoveredGlobalParam('jitter'); setHoveredGlobalEl(e.currentTarget); } }}
              onMouseLeave={() => { setHoveredGlobalParam(null); setHoveredGlobalEl(null); }}>
              <span>Jitter</span><span className="text-system-accent">{jitter}ms</span>
            </div>
            <input type="range" min="0" max="20" value={jitter}
              onChange={(e) => { const v = parseInt(e.target.value); logSliderChange('jitter', 'Jitter', jitter, v, 'ms'); setJitter(v); }}
              className="h-1 bg-black/5 appearance-none cursor-pointer accent-system-accent" />
          </div>
          <div className="flex flex-col gap-1">
            <div className={`flex justify-between text-[10px] font-mono uppercase text-idm-muted ${isStudyMode ? 'cursor-help' : ''}`}
              onMouseEnter={(e) => { if (isStudyMode) { setHoveredGlobalParam('swing'); setHoveredGlobalEl(e.currentTarget); } }}
              onMouseLeave={() => { setHoveredGlobalParam(null); setHoveredGlobalEl(null); }}>
              <span>Swing</span><span className="text-system-accent">{swing}%</span>
            </div>
            <input type="range" min="0" max="100" value={swing}
              onChange={(e) => { const v = parseInt(e.target.value); logSliderChange('swing', 'Swing', swing, v, '%'); setSwing(v); }}
              className="h-1 bg-black/5 appearance-none cursor-pointer accent-system-accent" />
          </div>
          <div className="flex flex-col gap-1">
            <div className={`flex justify-between text-[10px] font-mono uppercase text-idm-muted ${isStudyMode ? 'cursor-help' : ''}`}
              onMouseEnter={(e) => { if (isStudyMode) { setHoveredGlobalParam('dynamics'); setHoveredGlobalEl(e.currentTarget); } }}
              onMouseLeave={() => { setHoveredGlobalParam(null); setHoveredGlobalEl(null); }}>
              <span>Dynamics</span><span className="text-system-accent">{dynamics}%</span>
            </div>
            <input type="range" min="0" max="100" value={dynamics}
              onChange={(e) => { const v = parseInt(e.target.value); logSliderChange('dynamics', 'Dynamics', dynamics, v, '%'); setDynamics(v); }}
              className="h-1 bg-black/5 appearance-none cursor-pointer accent-system-accent" />
          </div>
        </div>
      </div>
    </div>
  );
};
