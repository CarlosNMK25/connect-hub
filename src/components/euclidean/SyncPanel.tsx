import React, { useMemo } from 'react';
import { Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CoincidenceRow } from './CoincidenceRow';
import { PhaseRadar } from './PhaseRadar';
import { PhaseSparkline } from './PhaseSparkline';
import { evaluateDiagnosis, computeMcm, computeEclipseTime, type DiagnosisContext } from '../../utils/diagnosis';
import type { TrackState } from '../../types/track';
import type { TemporalityMode } from '../../utils/temporality';

interface SyncPanelProps {
  tracks: TrackState[];
  globalStep: number;
  isPlaying: boolean;
  mcm: number;
  progress: number;
  entropy: { label: string; color: string };
  syncImpacts: number[];
  eclipseDisplay: string;
  eclipseFlash: boolean;
  hitRateData: { rate: number | null };
  hitRateColor: string;
  uiStats: Record<string, { hits: number; misses: number; cycleCount: number }>;
  driftOffsets: Record<string, number>;
  syncAnalysisOpen: boolean;
  setSyncAnalysisOpen: (open: boolean) => void;
  isDjMode: boolean;
  setIsDjMode: (v: boolean) => void;
  handlePhaseSync: () => void;
  phaseBufferRef: React.MutableRefObject<number[]>;
  phaseBufferHeadRef: React.MutableRefObject<number>;
  PHASE_BUFFER_SIZE: number;
  eclipseHistoryRef: React.MutableRefObject<{ time: string; mcm: number; bpm: number }[]>;
  bpm: number;
  temporalityMode: TemporalityMode;
  jitter: number;
  swing: number;
  mmHistory: Array<{ fromBpm: number; toBpm: number; ratio: string; label: string; timestamp: string }>;
  // Study mode
  isStudyMode: boolean;
  setHoveredGlobalParam: (v: string | null) => void;
  setHoveredGlobalEl: (v: HTMLElement | null) => void;
  setHoveredGlobalValue: (v: number | null) => void;
}

export const SyncPanel: React.FC<SyncPanelProps> = ({
  tracks, globalStep, isPlaying, mcm, progress,
  entropy, syncImpacts, eclipseDisplay, eclipseFlash,
  hitRateData, hitRateColor, uiStats, driftOffsets,
  syncAnalysisOpen, setSyncAnalysisOpen,
  isDjMode, setIsDjMode,
  handlePhaseSync,
  phaseBufferRef, phaseBufferHeadRef, PHASE_BUFFER_SIZE,
  eclipseHistoryRef,
  bpm, temporalityMode, jitter, swing, mmHistory,
  isStudyMode, setHoveredGlobalParam, setHoveredGlobalEl, setHoveredGlobalValue,
}) => {
  return (
    <div className="mb-8 bg-white p-6 rounded-2xl border border-black/5 flex flex-col lg:flex-row items-start gap-8 relative overflow-hidden transition-all duration-500 animate-in fade-in slide-in-from-top-2 duration-500 opacity-100 shadow-sm">
      <div className="flex-1 space-y-4 w-full">
        <div className="flex justify-between items-end">
          <div className="space-y-1">
            <div className={`flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-idm-muted ${isStudyMode ? 'cursor-help' : ''}`}
              onMouseEnter={(e) => { if (isStudyMode) { setHoveredGlobalParam('patternSync'); setHoveredGlobalEl(e.currentTarget); } }}
              onMouseLeave={() => { setHoveredGlobalParam(null); setHoveredGlobalEl(null); }}>
              <Zap size={12} className={mcm > 1000 ? "text-red-500 animate-pulse" : "text-system-accent"} />
              Sincronía del Patrón
            </div>
            <div className={`text-xs font-mono font-bold ${mcm > 1000 ? "text-red-500" : ""}`}>
              {mcm > 1000 ? "ZONA DE EVOLUCIÓN INFINITA" : `REINICIO CADA ${mcm} PASOS`}
            </div>
          </div>
          <div className="text-right">
            <div className={`text-[9px] font-mono uppercase text-idm-ink/40 mb-1 ${isStudyMode ? 'cursor-help' : ''}`}
              onMouseEnter={(e) => { if (isStudyMode) { setHoveredGlobalParam('rhythmicEntropy'); setHoveredGlobalEl(e.currentTarget); } }}
              onMouseLeave={() => { setHoveredGlobalParam(null); setHoveredGlobalEl(null); }}>Entropía Rítmica</div>
            <div className={`text-[10px] font-mono font-bold tracking-tighter ${entropy.color}`}>
              {entropy.label}
            </div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="h-1 w-full bg-black/5 rounded-full overflow-hidden">
          <div 
            className="h-full bg-system-accent transition-all duration-100 ease-linear"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          <div className="bg-black/5 p-3 rounded-lg border border-black/5">
            <div className={`text-[8px] uppercase tracking-tighter text-idm-muted mb-1 ${isStudyMode ? 'cursor-help' : ''}`}
              onMouseEnter={(e) => { if (isStudyMode) { setHoveredGlobalParam('mcmValue'); setHoveredGlobalEl(e.currentTarget); } }}
              onMouseLeave={() => { setHoveredGlobalParam(null); setHoveredGlobalEl(null); }}>MCM</div>
            <div className="text-xl font-mono text-system-accent tracking-tighter">{mcm}</div>
          </div>
          <div className="bg-black/5 p-3 rounded-lg border border-black/5">
            <div className={`text-[8px] uppercase tracking-tighter text-idm-muted mb-1 ${isStudyMode ? 'cursor-help' : ''}`}
              onMouseEnter={(e) => { if (isStudyMode) { setHoveredGlobalParam('syncImpact'); setHoveredGlobalEl(e.currentTarget); } }}
              onMouseLeave={() => { setHoveredGlobalParam(null); setHoveredGlobalEl(null); }}>Impacto</div>
            <div className="text-xl font-mono text-system-accent tracking-tighter">
              {Math.round(syncImpacts.reduce((a, b) => a + b, 0) / Math.max(1, tracks.filter(t => t.id !== 'cloud').length))}%
            </div>
          </div>
          <div className="bg-black/5 p-3 rounded-lg border border-black/5">
            <div className={`text-[8px] uppercase tracking-tighter text-idm-muted mb-1 ${isStudyMode ? 'cursor-help' : ''}`}
              onMouseEnter={(e) => { if (isStudyMode) { setHoveredGlobalParam('eclipseCountdown'); setHoveredGlobalEl(e.currentTarget); } }}
              onMouseLeave={() => { setHoveredGlobalParam(null); setHoveredGlobalEl(null); }}>ECLIPSE</div>
            <div className={`text-xl font-mono tracking-tighter transition-colors duration-300 ${eclipseFlash ? 'text-system-accent animate-pulse' : 'text-system-accent'}`}>
              {eclipseDisplay}
            </div>
          </div>
          <div className="bg-black/5 p-3 rounded-lg border border-black/5">
            <div className={`text-[8px] uppercase tracking-tighter text-idm-muted mb-1 ${isStudyMode ? 'cursor-help' : ''}`}
              onMouseEnter={(e) => { if (isStudyMode) { setHoveredGlobalParam('hitRate'); setHoveredGlobalEl(e.currentTarget); } }}
              onMouseLeave={() => { setHoveredGlobalParam(null); setHoveredGlobalEl(null); }}>HIT RATE</div>
            <div className={`text-xl font-mono tracking-tighter ${hitRateColor}`}>
              {hitRateData.rate !== null ? `${hitRateData.rate}%` : '—'}
            </div>
          </div>
        </div>
        {/* Coincidence Row */}
        <CoincidenceRow
          tracks={tracks.map(t => ({
            id: t.id,
            pattern: t.pattern,
            steps: t.steps,
            offset: t.offset,
            color: t.color,
            isMuted: t.isMuted,
          }))}
          globalStep={globalStep}
          maxSteps={Math.max(...tracks.map(t => t.steps))}
          driftOffsets={driftOffsets}
        />

        {/* Expanded Analysis — Left Column */}
        <AnimatePresence>
        {syncAnalysisOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden mt-4 pt-4 border-t border-idm-ink/10 space-y-4"
          >
            {/* Bloque A — Impacto por pista */}
            <div>
              <div className="text-[8px] font-mono uppercase tracking-widest text-idm-muted mb-2">
                Impacto en MCM por pista
              </div>
              {tracks.filter(t => t.id !== 'cloud').every((_, i) => (syncImpacts[i] || 0) < 1) ? (
                <div className="text-[9px] font-mono text-idm-muted/60 italic leading-relaxed">
                  Todos los ciclos comparten el mismo número de steps — sin interferencia entre ciclos. Cambia un track a steps diferente para ver el impacto.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {tracks.filter(t => t.id !== 'cloud').map((track, i) => (
                    <div key={track.id} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: track.color }} />
                      <span className="text-[9px] font-mono text-idm-ink/70 w-20 truncate">{track.name}</span>
                      <span className="text-[8px] font-mono text-idm-muted w-16">{`E(${track.pulses},${track.steps})`}</span>
                      <div className="flex-1 h-1.5 bg-idm-ink/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, syncImpacts[i] || 0)}%`,
                            background: track.color,
                            opacity: 0.7
                          }}
                        />
                      </div>
                      <span className={`text-[9px] font-mono w-8 text-right ${(syncImpacts[i] || 0) > 30 ? 'text-system-accent' : 'text-idm-muted'}`}>
                        {Math.round(syncImpacts[i] || 0)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bloque B — Velocidad relativa (cycleCount) */}
            <div>
              <div className="text-[8px] font-mono uppercase tracking-widest text-idm-muted mb-2">
                Ciclos completados por pista
              </div>
              <div className="space-y-1.5">
                {(() => {
                  const rhythmic = tracks.filter(t => t.id !== 'cloud');
                  const maxCycles = Math.max(...rhythmic.map(t => uiStats[t.id]?.cycleCount || 0), 1);
                  return rhythmic.map(track => {
                    const cycles = uiStats[track.id]?.cycleCount || 0;
                    return (
                      <div key={track.id} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: track.color }} />
                        <span className="text-[9px] font-mono text-idm-ink/70 w-20 truncate">{track.name}</span>
                        <div className="flex-1 h-1.5 bg-idm-ink/5 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${(cycles / maxCycles) * 100}%`,
                              background: track.color,
                              opacity: 0.6
                            }}
                          />
                        </div>
                        <span className="text-[9px] font-mono text-idm-muted w-16 text-right">
                          {cycles} ciclos
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
              <div className="text-[7px] font-mono text-idm-muted/60 mt-1.5">
                Más ciclos = ciclo más corto = gira más rápido
              </div>
            </div>

            {/* Bloque C — Probabilidad media por pista */}
            <div>
              <div className="text-[8px] font-mono uppercase tracking-widest text-idm-muted mb-2">
                Probabilidad media por pista
              </div>
              <div className="space-y-1.5">
                {tracks.filter(t => t.id !== 'cloud').map(track => {
                  const activeProbs = track.probabilities.slice(0, track.steps);
                  const avgProb = activeProbs.length > 0
                    ? Math.round(activeProbs.reduce((s, p) => s + p, 0) / activeProbs.length * 100)
                    : 100;
                  const hitRate = (() => {
                    const s = uiStats[track.id];
                    if (!s || (s.hits + s.misses) === 0) return null;
                    return Math.round(s.hits / (s.hits + s.misses) * 100);
                  })();
                  return (
                    <div key={track.id} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: track.color }} />
                      <span className="text-[9px] font-mono text-idm-ink/70 w-20 truncate">{track.name}</span>
                      <div className="flex-1 h-1.5 bg-idm-ink/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${avgProb}%`,
                            background: track.color,
                            opacity: 0.6
                          }}
                        />
                      </div>
                      <span className="text-[9px] font-mono w-8 text-right text-idm-muted">
                        {avgProb}%
                      </span>
                      {hitRate !== null && avgProb !== hitRate && (
                        <span className={`text-[8px] font-mono w-12 text-right ${hitRate < avgProb ? 'text-system-accent' : 'text-idm-muted'}`}>
                          hit {hitRate}%
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="text-[7px] font-mono text-idm-muted/60 mt-1.5">
                Prob. programada vs hit rate real — diferencia = efecto Chaos
              </div>
            </div>

            {/* Bloque D — Historial de eclipses */}
            <div>
              <div className="text-[8px] font-mono uppercase tracking-widest text-idm-muted mb-2">
                Historial de eclipses
              </div>
              {eclipseHistoryRef.current.length === 0 ? (
                <div className="text-[9px] font-mono text-idm-muted/50 italic">
                  Sin eclipses registrados aún
                </div>
              ) : (
                <div className="space-y-1">
                  {eclipseHistoryRef.current.map((e, i) => (
                    <div key={i} className="flex items-center gap-3 text-[9px] font-mono">
                      <span className={`${i === 0 ? 'text-system-accent' : 'text-idm-muted/50'}`}>
                        {i === 0 ? '✦' : '·'}
                      </span>
                      <span className={`${i === 0 ? 'text-idm-ink/70' : 'text-idm-muted/50'}`}>
                        {e.time}
                      </span>
                      <span className={`${i === 0 ? 'text-system-accent' : 'text-idm-muted/40'}`}>
                        MCM {e.mcm}
                      </span>
                      <span className={`${i === 0 ? 'text-idm-muted' : 'text-idm-muted/40'}`}>
                        {e.bpm} BPM
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bloque E — Sparkline de convergencia temporal */}
            <PhaseSparkline
              buffer={phaseBufferRef.current}
              head={phaseBufferHeadRef.current}
              capacity={PHASE_BUFFER_SIZE}
            />

            {/* Bloque F — Insight de diagnóstico principal */}
            {(() => {
              const diagTracks = tracks.filter(t => t.id !== 'cloud').map(t => ({
                id: t.id, name: t.name, steps: t.steps, pulses: t.pulses, offset: t.offset,
                chaosEnabled: t.chaosEnabled, entropy: t.entropy, evolveEnabled: t.evolveEnabled,
                mutationRate: t.mutationRate, mutationSpeed: t.mutationSpeed, ratchet: t.ratchet,
                isMuted: t.isMuted, isTonal: t.isTonal, scaleId: t.scaleId,
                synthType: t.synthType, arRate: t.arRate, arDepth: t.arDepth,
                wfAmount: t.wfAmount, wfSymmetry: t.wfSymmetry,
                addPartials: t.addPartials, addBrightness: t.addBrightness,
              }));
              const diagMcm = computeMcm(diagTracks);
              const ctx: DiagnosisContext = {
                tracks: diagTracks,
                globalState: { bpm, temporalityMode, jitter, swing, mmHistoryLength: mmHistory.length, mmLastRatio: mmHistory.length > 0 ? mmHistory[0].label : undefined, mmOriginalBpm: mmHistory.length > 0 ? mmHistory[mmHistory.length - 1].fromBpm : undefined },
                computed: { mcm: diagMcm, eclipseTime: computeEclipseTime(diagMcm, bpm), hitRate: hitRateData.rate },
              };
              const insights = evaluateDiagnosis(ctx);
              if (insights.length === 0) return null;
              const top = insights[0];
              return (
                <div className="border-l-2 border-system-accent/40 pl-2 bg-system-accent/[0.02] py-1.5">
                  <div className="text-[7px] font-mono uppercase tracking-widest text-system-accent mb-1">Diagnóstico</div>
                  <div className="flex items-start gap-2 text-[10px] font-mono leading-relaxed text-idm-ink/80">
                    <span className="shrink-0 text-sm">{top.icon}</span>
                    <span>{top.insight}</span>
                  </div>
                  <div className="mt-1 pl-6 text-[9px] font-mono leading-relaxed text-idm-muted">
                    {top.suggestion}
                  </div>
                </div>
              );
            })()}
          </motion.div>
        )}
        </AnimatePresence>
      </div>

      <div className={isStudyMode ? 'cursor-help' : ''}
        onMouseEnter={(e) => { if (isStudyMode) { setHoveredGlobalParam('phaseRadar'); setHoveredGlobalEl(e.currentTarget); } }}
        onMouseLeave={() => { setHoveredGlobalParam(null); setHoveredGlobalEl(null); }}>
        <PhaseRadar 
          tracks={tracks.map(t => ({ id: t.id, name: t.name, steps: t.steps, pulses: t.pulses, color: t.color, offset: t.offset, chaosEnabled: (t as any).chaosEnabled, evolveEnabled: (t as any).evolveEnabled, entropy: (t as any).entropy, mutationRate: (t as any).mutationRate }))}
          globalStep={globalStep}
          onSync={handlePhaseSync}
          isDjMode={isDjMode}
          onDjModeToggle={() => setIsDjMode(!isDjMode)}
          uiStats={uiStats}
          syncImpacts={syncImpacts}
          entropyLabel={entropy.label}
          bpm={bpm}
          onAnalysisToggle={(open) => setSyncAnalysisOpen(open)}
          driftOffsets={driftOffsets}
        />
      </div>

      {/* Subtle background glow when cycle resets */}
      {isPlaying && (globalStep % mcm === 0) && (
        <div className="absolute inset-0 bg-system-accent/5 animate-pulse pointer-events-none" />
      )}
    </div>
  );
};
