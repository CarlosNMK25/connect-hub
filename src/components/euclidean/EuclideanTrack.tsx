import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import * as Tone from 'tone';
import { EuclideanStep } from './EuclideanStep';
import { bjorklund, rotate } from '../../utils/bjorklund';
import { ChevronLeft, ChevronRight, Disc, Upload, Trash2, Volume2, Power, Settings2, Activity, Zap, Eye, EyeOff, Sliders, Layers, Target, Atom, Info, HelpCircle, X, ChevronDown, ChevronUp, Music } from 'lucide-react';
import { WaveformDisplay } from './WaveformDisplay';
import { motion, AnimatePresence } from 'framer-motion';
import { PEDAGOGY, getMicroText, type PedagogyVoice } from '../../constants/pedagogy';
import { calculateTemporalOffset, type TemporalityMode } from '../../utils/temporality';
import { SCALES, SCALE_NAMES, noteIndexToMidi, midiToNoteName, getMaxNoteIndex } from '../../utils/scales';

interface EuclideanTrackProps {
  id: string;
  name: string;
  color: string;
  synth: any;
  steps: number;
  pulses: number;
  offset: number;
  pattern: number[];
  jitter: number;
  globalStep: number;
  mcm: number;
  syncImpact: number;
  lastHit: { offset: number; color: string; velocity: number } | null;
  trackId: string;
  stats: { hits: number; misses: number; cycleCount: number };
  previewPattern?: number[];
  onStepsChange: (val: number) => void;
  onPulsesChange: (val: number) => void;
  onOffsetChange: (val: number) => void;
  probabilities: number[];
  onProbabilityChange: (index: number, val: number) => void;
  onToggleStep: (index: number) => void;
  isDjMode: boolean;
  // Stochastic Engine Props
  chaosEnabled: boolean;
  entropy: number;
  onChaosToggle: () => void;
  onEntropyChange: (val: number) => void;
  evolveEnabled: boolean;
  mutationRate: number;
  mutationSpeed: number;
  onEvolveToggle: () => void;
  onMutationRateChange: (val: number) => void;
  onMutationSpeedChange: (val: number) => void;
  // Sampler Props
  samplerBuffer: AudioBuffer | null;
  samplerStatus: 'IDLE' | 'DECODING' | 'READY';
  samplerFilename: string | null;
  sampleStart: number;
  sampleEnd: number;
  attack: number;
  decay: number;
  mode: 'GATE' | 'TRIGGER';
  pitch: number;
  normalize: boolean;
  grainSize: number;
  overlap: number;
  spray: number;
  bitCrush: number;
  onFileUpload: (file: File) => void;
  onSamplerParamChange: (param: string, val: any) => void;
  onClearSampler: () => void;
  onMuteToggle: () => void;
  onSoloToggle: () => void;
  volume: number;
  onVolumeChange: (val: number) => void;
  isMuted: boolean;
  isSoloed: boolean;
  anySoloed: boolean;
  delaySend: number;
  reverbSend: number;
  onDelaySendChange: (val: number) => void;
  onReverbSendChange: (val: number) => void;
  ratchet: number;
  onRatchetChange: (val: number) => void;
  // Tonal Props
  isTonal: boolean;
  rootNote: number;
  scaleId: string;
  octaveRange: number;
  noteIndices: number[];
  onRootNoteChange: (val: number) => void;
  onScaleChange: (val: string) => void;
  onOctaveRangeChange: (val: number) => void;
  onNoteIndexChange: (stepIdx: number, val: number) => void;
  synthType?: string;
  fmRatio?: number;
  fmIndex?: number;
  onSynthTypeChange?: (val: string) => void;
  onFmRatioChange?: (val: number) => void;
  onFmIndexChange?: (val: number) => void;
  wfAmount?: number;
  wfSymmetry?: number;
  onWfAmountChange?: (val: number) => void;
  onWfSymmetryChange?: (val: number) => void;
  addPartials?: number;
  addBrightness?: number;
  arRate?: number;
  arDepth?: number;
  padVoices?: number;
  padDetune?: number;
  padAttack?: number;
  droneFeedback?: number;
  droneFilterFreq?: number;
  ksDecay?: number;
  ksBrightness?: number;
  modalBody?: string;
  modalDecay?: number;
  onAddPartialsChange?: (val: number) => void;
  onAddBrightnessChange?: (val: number) => void;
  onArRateChange?: (val: number) => void;
  onArDepthChange?: (val: number) => void;
  onPadVoicesChange?: (val: number) => void;
  onPadDetuneChange?: (val: number) => void;
  onPadAttackChange?: (val: number) => void;
  onDroneFeedbackChange?: (val: number) => void;
  onDroneFilterFreqChange?: (val: number) => void;
  onKsDecayChange?: (val: number) => void;
  onKsBrightnessChange?: (val: number) => void;
  onModalBodyChange?: (val: string) => void;
  onModalDecayChange?: (val: number) => void;
  ambientVolume?: number;
  ambientSpeed?: number;
  onAmbientVolumeChange?: (val: number) => void;
  onAmbientSpeedChange?: (val: number) => void;
  cloudMode?: 'granular' | 'eno';
  enoSpeed?: number;
  onCloudModeChange?: (mode: 'granular' | 'eno') => void;
  onEnoSpeedChange?: (val: number) => void;
  rrEnabled?: boolean;
  rrAmount?: number;
  onRrEnabledChange?: (val: boolean) => void;
  onRrAmountChange?: (val: number) => void;
  driftEnabled?: boolean;
  driftRate?: number;
  onDriftEnabledChange?: (val: boolean) => void;
  onDriftRateChange?: (val: number) => void;
  toneRecordingState?: 'idle' | 'armed' | 'recording';
  onRecordAction?: () => void;
  cloudRecordingState?: 'idle' | 'armed' | 'recording';
  onCloudRecordAction?: () => void;
  isStudyMode: boolean;
  studyVoice?: PedagogyVoice;
  temporalityMode: TemporalityMode;
  bpm: number;
  swing: number;
}

const StudyTooltip = ({ content, visible, anchorEl }: { content: string; visible: boolean; anchorEl?: HTMLElement | null }) => {
  const [pos, setPos] = useState({ top: 0, left: 0, flip: false });

  useEffect(() => {
    if (visible && anchorEl) {
      const rect = anchorEl.getBoundingClientRect();
      const spaceAbove = rect.top;
      const flip = spaceAbove < 120;
      setPos({
        top: flip ? rect.bottom + 8 : rect.top - 8,
        left: Math.min(Math.max(rect.left + rect.width / 2, 144), window.innerWidth - 144),
        flip
      });
    }
  }, [visible, anchorEl]);

  if (!visible || !anchorEl) return null;

  return createPortal(
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: pos.flip ? -5 : 5, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: pos.flip ? -5 : 5, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            transform: pos.flip ? 'translateX(-50%)' : 'translate(-50%, -100%)',
            zIndex: 99999
          }}
          className="w-72 p-3 bg-white border border-system-accent/40 rounded-xl shadow-2xl pointer-events-none"
        >
          <div className="text-[10px] font-mono leading-relaxed text-idm-ink uppercase">
            {content}
          </div>
          <div
            className="absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-white border-system-accent/40 rotate-45"
            style={pos.flip
              ? { top: '-4px', borderTop: '1px solid', borderLeft: '1px solid' }
              : { bottom: '-4px', borderRight: '1px solid', borderBottom: '1px solid' }
            }
          />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export const EuclideanTrack = React.memo(({
  id,
  name,
  color,
  synth,
  steps,
  pulses,
  offset,
  pattern,
  jitter,
  globalStep,
  mcm,
  syncImpact,
  lastHit,
  trackId,
  stats,
  previewPattern,
  onStepsChange,
  onPulsesChange,
  onOffsetChange,
  probabilities,
  onProbabilityChange,
  onToggleStep,
  isDjMode,
  chaosEnabled,
  entropy,
  onChaosToggle,
  onEntropyChange,
  evolveEnabled,
  mutationRate,
  mutationSpeed,
  onEvolveToggle,
  onMutationRateChange,
  onMutationSpeedChange,
  samplerBuffer,
  samplerStatus,
  samplerFilename,
  sampleStart,
  sampleEnd,
  attack,
  decay,
  mode,
  pitch,
  normalize,
  grainSize,
  overlap,
  spray,
  bitCrush,
  onFileUpload,
  onSamplerParamChange,
  onClearSampler,
  onMuteToggle,
  onSoloToggle,
  volume,
  onVolumeChange,
  isMuted,
  isSoloed,
  anySoloed,
  delaySend,
  reverbSend,
  onDelaySendChange,
  onReverbSendChange,
  ratchet,
  onRatchetChange,
  isTonal,
  rootNote,
  scaleId,
  octaveRange,
  noteIndices,
  onRootNoteChange,
  onScaleChange,
  onOctaveRangeChange,
  onNoteIndexChange,
  synthType,
  fmRatio,
  fmIndex,
  wfAmount,
  wfSymmetry,
  onSynthTypeChange,
  onFmRatioChange,
  onFmIndexChange,
  onWfAmountChange,
  onWfSymmetryChange,
  addPartials,
  addBrightness,
  arRate,
  arDepth,
  padVoices,
  padDetune,
  padAttack,
  droneFeedback,
  droneFilterFreq,
  ksDecay,
  ksBrightness,
  modalBody,
  modalDecay,
  onAddPartialsChange,
  onAddBrightnessChange,
  onArRateChange,
  onArDepthChange,
  onPadVoicesChange,
  onPadDetuneChange,
  onPadAttackChange,
  onDroneFeedbackChange,
  onDroneFilterFreqChange,
  onKsDecayChange,
  onKsBrightnessChange,
  onModalBodyChange,
  onModalDecayChange,
  ambientVolume,
  ambientSpeed,
  onAmbientVolumeChange,
  onAmbientSpeedChange,
  cloudMode,
  enoSpeed,
  onCloudModeChange,
  onEnoSpeedChange,
  rrEnabled,
  rrAmount,
  onRrEnabledChange,
  onRrAmountChange,
  driftEnabled,
  driftRate,
  onDriftEnabledChange,
  onDriftRateChange,
  toneRecordingState,
  onRecordAction,
  cloudRecordingState,
  onCloudRecordAction,
  isStudyMode,
  studyVoice = 'technical',
  temporalityMode,
  bpm,
  swing
}: EuclideanTrackProps) => {
  const voice = studyVoice;

  const temporalOffsets = React.useMemo(() => {
    if (temporalityMode === 'grid') return null;
    const sixteenthDuration = 60 / bpm / 4;
    return pattern.map((_, i) =>
      calculateTemporalOffset(temporalityMode, {
        trackId: id,
        stepIndex: i,
        steps,
        globalStep: i,
        swing,
        jitter,
        sixteenthDuration,
        pattern,
      })
    );
  }, [temporalityMode, id, steps, swing, jitter, bpm, pattern]);

  const [hoveredParam, setHoveredParam] = useState<string | null>(null);
  const [hoveredParamEl, setHoveredParamEl] = useState<HTMLElement | null>(null);

  const handleParamEnter = (param: string, e: React.MouseEvent) => {
    if (!isStudyMode) return;
    setHoveredParam(param);
    setHoveredParamEl(e.currentTarget as HTMLElement);
  };
  const handleParamLeave = () => {
    setHoveredParam(null);
    setHoveredParamEl(null);
  };
  const [pendingOffset, setPendingOffset] = useState(offset);
  const [isEditingNext, setIsEditingNext] = useState(false);
  const [editNextValue, setEditNextValue] = useState(offset.toString());
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);
  const volumeBarRef = useRef<HTMLDivElement>(null);

  const localProgress = ((globalStep + offset) % steps) / steps;
  const globalProgress = (globalStep % mcm) / mcm;

  useEffect(() => {
    setPendingOffset(offset);
    setEditNextValue(offset.toString());
  }, [offset]);

  const handleNextEditSubmit = () => {
    let val = parseInt(editNextValue);
    if (isNaN(val)) val = pendingOffset;
    val = Math.max(0, Math.min(steps - 1, val));
    setPendingOffset(val);
    setEditNextValue(val.toString());
    setIsEditingNext(false);
  };

  const handleVolumeMouseDown = (e: React.MouseEvent) => {
    setIsDraggingVolume(true);
    handleVolumeMove(e);
  };

  const handleVolumeMove = (e: React.MouseEvent | MouseEvent) => {
    if (!volumeBarRef.current) return;
    const rect = volumeBarRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;
    const val = 1 - Math.max(0, Math.min(1, y / height));
    onVolumeChange(val);
  };

  useEffect(() => {
    if (isDraggingVolume) {
      const handleMouseMove = (e: MouseEvent) => handleVolumeMove(e);
      const handleMouseUp = () => setIsDraggingVolume(false);
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingVolume]);

  const isTrackDimmed = isMuted || (anySoloed && !isSoloed);

  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={`space-y-3 p-4 bg-white border border-black/5 rounded-2xl relative transition-all duration-500 ${isTrackDimmed ? 'opacity-30' : 'opacity-100 shadow-sm'}`}>
      {/* Phase Rails: El corazón visual de la polirritmia */}
      <div className={`absolute top-0 left-0 w-full h-[6px] flex flex-col overflow-hidden bg-idm-bg rounded-t-2xl z-20 transition-opacity duration-500 ${isTrackDimmed ? 'opacity-50' : 'opacity-100'}`}>
        {/* Capa Superior: Fase Local (Ritmo Propio) */}
        <div 
          className="h-[4px] transition-all duration-100 ease-linear"
          style={{ 
            width: `${localProgress * 100}%`, 
            backgroundColor: isMuted ? '#d1d1d1' : color,
            opacity: isMuted ? 0.2 : 1
          }}
        />
        
        {/* Capa Inferior: Fase Global (Sincronía del Patrón) */}
        <div 
          className="h-[2px] bg-idm-ink/10 transition-all duration-100 ease-linear"
          style={{ 
            width: `${globalProgress * 100}%`,
            opacity: isMuted ? 0.1 : 0.3
          }}
        />
      </div>

      <div className={`transition-all duration-500 ${isTrackDimmed ? 'grayscale-[0.8]' : ''}`}>
        {/* === ROW 1: Identity + Controls + Waveform === */}
        <div className="flex items-center gap-4 flex-wrap overflow-hidden">
          {/* Volume Fader */}
          <div 
            ref={volumeBarRef}
            onMouseDown={handleVolumeMouseDown}
            onMouseEnter={(e) => handleParamEnter('volume', e)}
            onMouseLeave={handleParamLeave}
            className="w-2.5 h-14 rounded-full bg-idm-bg border border-black/5 shadow-inner transition-all duration-300 relative overflow-hidden cursor-ns-resize group flex-none"
            title={`Volume: ${Math.round(volume * 100)}%`}
          >
            <div 
              className="absolute bottom-0 left-0 w-full transition-all duration-100 ease-out"
              style={{ height: `${volume * 100}%`, backgroundColor: isMuted ? '#d1d1d1' : color, opacity: isMuted ? 0.2 : 0.6 }}
            >
              <div className="absolute inset-0 bg-white/10 opacity-50" />
            </div>
            {isMuted && (
              <div className="absolute inset-0 opacity-20" style={{ 
                backgroundImage: 'linear-gradient(45deg, #fff 25%, transparent 25%, transparent 50%, #fff 50%, #fff 75%, transparent 75%, transparent)',
                backgroundSize: '4px 4px'
              }} />
            )}
            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors" />
          </div>

          {/* FX Sends (Mini-Faders) */}
          <div className="flex flex-col gap-2 flex-none">
            <div className="flex flex-col gap-1 relative" onMouseEnter={(e) => handleParamEnter('delaySend', e)} onMouseLeave={handleParamLeave}>
              <div className="flex justify-between items-center w-16">
                <span className="text-[6px] font-mono text-idm-muted uppercase leading-none">Dly</span>
                <span className="text-[6px] font-mono text-idm-muted leading-none">{Math.round(delaySend * 100)}%</span>
              </div>
              <div className="w-16 h-1 bg-idm-bg rounded-full overflow-hidden cursor-pointer relative border border-black/5"
                onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); onDelaySendChange(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))); }}>
                <div className="h-full transition-all duration-100" style={{ width: `${delaySend * 100}%`, backgroundColor: isMuted ? '#d1d1d1' : color, opacity: 0.4 }} />
              </div>
            </div>
            <div className="flex flex-col gap-1 relative" onMouseEnter={(e) => handleParamEnter('reverbSend', e)} onMouseLeave={handleParamLeave}>
              <div className="flex justify-between items-center w-16">
                <span className="text-[6px] font-mono text-idm-muted uppercase leading-none">Rvb</span>
                <span className="text-[6px] font-mono text-idm-muted leading-none">{Math.round(reverbSend * 100)}%</span>
              </div>
              <div className="w-16 h-1 bg-idm-bg rounded-full overflow-hidden cursor-pointer relative border border-black/5"
                onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); onReverbSendChange(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))); }}>
                <div className="h-full transition-all duration-100" style={{ width: `${reverbSend * 100}%`, backgroundColor: isMuted ? '#d1d1d1' : color, opacity: 0.4 }} />
              </div>
            </div>
            <div className="flex flex-col gap-1 relative" onMouseEnter={(e) => handleParamEnter('ratchet', e)} onMouseLeave={handleParamLeave}>
              <div className="flex justify-between items-center w-16">
                <span className="text-[6px] font-mono text-idm-muted uppercase leading-none">Rtch</span>
                <span className="text-[6px] font-mono text-idm-muted leading-none">{ratchet}×</span>
              </div>
              <div className="w-16 h-1 bg-idm-bg rounded-full overflow-hidden cursor-pointer relative border border-black/5"
                onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); onRatchetChange(Math.round(Math.max(0, Math.min(4, ((e.clientX - rect.left) / rect.width) * 4)))); }}>
                <div className="h-full transition-all duration-100" style={{ width: `${(ratchet / 4) * 100}%`, backgroundColor: isMuted ? '#d1d1d1' : color, opacity: 0.4 }} />
            </div>
            {/* Round Robin toggle + amount */}
            <div className="flex flex-col gap-1">
              <button
                onClick={() => onRrEnabledChange?.(!rrEnabled)}
                className={`text-[8px] font-mono px-1.5 py-0.5 rounded border transition-colors ${
                  rrEnabled
                    ? 'bg-system-accent text-white border-system-accent'
                    : 'bg-white text-idm-muted border-black/10'
                }`}
                title="Round Robin — micro-variación por hit"
              >
                RR
              </button>
              {rrEnabled && (
                <div className="flex items-center gap-1">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={rrAmount ?? 30}
                    onChange={e => onRrAmountChange?.(Number(e.target.value))}
                    className="w-12 h-[7px] accent-system-accent"
                    title={`RR Amount: ${rrAmount ?? 30}%`}
                  />
                  <span className="text-[7px] font-mono text-idm-muted">
                    {rrAmount ?? 30}
                  </span>
                </div>
              )}
            </div>
            {/* Phase Drift toggle + rate */}
            <div className="flex flex-col gap-1">
              <button
                onClick={() => onDriftEnabledChange?.(!driftEnabled)}
                className={`text-[8px] font-mono px-1.5 py-0.5 rounded border transition-colors ${
                  driftEnabled
                    ? 'bg-system-accent text-white border-system-accent'
                    : 'bg-white text-idm-muted border-black/10'
                }`}
                title="Phase Drift — desfase progresivo estilo Reich"
              >
                PHD
              </button>
              {driftEnabled && (
                <div className="flex items-center gap-1">
                  <input
                    type="range"
                    min={-0.05}
                    max={0.05}
                    step={0.001}
                    value={driftRate ?? 0.01}
                    onChange={e => onDriftRateChange?.(Number(e.target.value))}
                    className="w-12 h-[7px] accent-system-accent"
                    title={`Drift Rate: ${(driftRate ?? 0.01).toFixed(3)}`}
                  />
                  <span className="text-[7px] font-mono text-idm-muted">
                    {(driftRate ?? 0.01) > 0 ? '+' : ''}{(driftRate ?? 0.01).toFixed(3)}
                  </span>
                </div>
              )}
            </div>
          </div>
          </div>

          {/* Track Name + Solo/Mute + Status */}
          <div className="flex items-center gap-2 flex-none">
            <h3 className="font-mono text-lg font-black uppercase tracking-tighter text-idm-ink leading-none">{name}</h3>
            <div className="flex gap-1">
              <button onClick={(e) => { e.stopPropagation(); onSoloToggle(); }}
                className={`w-4 h-4 flex items-center justify-center rounded-[2px] text-[8px] font-mono font-bold transition-all border ${isSoloed ? 'bg-system-accent text-white border-system-accent shadow-sm' : 'bg-white text-idm-muted border-black/5 hover:text-idm-ink hover:border-black/10'}`}
                title="Solo">S</button>
              <button onClick={(e) => { e.stopPropagation(); onMuteToggle(); }}
                className={`w-4 h-4 flex items-center justify-center rounded-[2px] text-[8px] font-mono font-bold transition-all border ${isMuted ? 'bg-idm-ink text-white border-idm-ink shadow-sm' : 'bg-white text-idm-muted border-black/5 hover:text-idm-ink hover:border-black/10'}`}
                title="Mute">M</button>
            </div>
            <div className="flex items-center gap-1.5 ml-1">
              <div className={`w-1.5 h-1.5 rounded-full ${isMuted ? 'bg-idm-muted/30' : samplerStatus === 'IDLE' ? 'bg-idm-muted/20' : samplerStatus === 'DECODING' ? 'bg-system-accent animate-pulse' : 'bg-green-600 shadow-sm'}`} />
              <span className="text-[8px] font-mono font-bold uppercase tracking-widest text-idm-muted">{isMuted ? 'MUTED' : samplerStatus}</span>
            </div>
          </div>

          {/* Formula + Density Badges */}
          <div className="flex items-center gap-3 px-3 py-2 bg-idm-bg rounded-lg border border-black/5 flex-none">
            <div className="flex flex-col">
              <span className="text-[7px] font-mono text-idm-muted uppercase tracking-widest leading-none">Formula</span>
              <span className="text-[11px] font-mono font-black leading-tight" style={{ color }}>E({pulses}, {steps})</span>
            </div>
            <div className="w-px h-6 bg-black/5" />
            <div className="flex flex-col">
              <span className="text-[7px] font-mono text-idm-muted uppercase tracking-widest leading-none">Density</span>
              <span className="text-[11px] font-mono font-black leading-tight" style={{ color }}>{Math.round((pulses / steps) * 100)}%</span>
            </div>
          </div>

          {/* Waveform Display (fills remaining space) */}
          <div className="flex-1 min-w-[120px] h-14 relative group bg-idm-bg rounded-xl border border-black/5 overflow-hidden">
            <WaveformDisplay 
              buffer={samplerBuffer}
              color={color}
              start={sampleStart}
              end={sampleEnd}
              currentStepProgress={0}
              isPlaying={false}
              isTriggered={false}
            />
            
            {samplerStatus === 'IDLE' && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[1px] group-hover:bg-white/80 transition-all">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-black/5 hover:border-system-accent/50 text-idm-ink rounded-lg text-[10px] font-mono uppercase tracking-[0.15em] transition-all shadow-sm active:scale-95"
                >
                  <Upload size={12} className="text-system-accent" />
                  Load Sample
                </button>
              </div>
            )}

            {samplerStatus === 'READY' && (
              <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={onClearSampler}
                  className="p-1 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-md transition-all border border-red-500/20"
                  title="Clear Sample">
                  <Trash2 size={10} />
                </button>
              </div>
            )}

            <input type="file" ref={fileInputRef} className="hidden" accept="audio/*"
              onChange={(e) => e.target.files?.[0] && onFileUpload(e.target.files[0])} />
          </div>
        </div>

        {/* === ROW 2: Sliders P/S/O + Steps === */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Compact Sliders */}
          <div className="flex items-center gap-4 flex-none">
            <div className="space-y-1 w-28 relative" onMouseEnter={(e) => handleParamEnter('pulses', e)} onMouseLeave={handleParamLeave}>
              <div className="flex justify-between text-[8px] font-mono font-bold uppercase text-idm-muted">
                <span>Pulses</span><span style={{ color }}>{pulses}</span>
              </div>
              <input type="range" min="0" max={steps} value={pulses} 
                onChange={(e) => onPulsesChange(parseInt(e.target.value))}
                className="w-full h-1 bg-idm-bg appearance-none cursor-pointer rounded-full" style={{ accentColor: color }} />
            </div>
            <div className="space-y-1 w-28 relative" onMouseEnter={(e) => handleParamEnter('steps', e)} onMouseLeave={handleParamLeave}>
              <div className="flex justify-between text-[8px] font-mono font-bold uppercase text-idm-muted">
                <span>Steps</span><span style={{ color }}>{steps}</span>
              </div>
              <input type="range" min="1" max="32" value={steps} 
                onChange={(e) => onStepsChange(parseInt(e.target.value))}
                className="w-full h-1 bg-idm-bg appearance-none cursor-pointer rounded-full" style={{ accentColor: color }} />
            </div>
            <div className="space-y-1 w-28 relative" onMouseEnter={(e) => handleParamEnter('offset', e)} onMouseLeave={handleParamLeave}>
              <div className="flex justify-between text-[8px] font-mono font-bold uppercase text-idm-muted">
                <span>Offset</span><span style={{ color }}>{offset}</span>
              </div>
              <input type="range" min="0" max={steps - 1} value={offset} 
                onChange={(e) => onOffsetChange(parseInt(e.target.value))}
                className="w-full h-1 bg-idm-bg appearance-none cursor-pointer rounded-full" style={{ accentColor: color }} />
            </div>
          </div>
        </div>
      {/* DJ Nudge Controls (Full Width, Below Parameters) */}
      {isDjMode && (
        <div className="mt-2 flex items-center justify-between gap-6 bg-idm-bg border border-black/5 rounded-2xl p-3 animate-in slide-in-from-top-2 duration-300 shadow-sm">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                const newVal = (pendingOffset - 1 + steps) % steps;
                setPendingOffset(newVal);
                setEditNextValue(newVal.toString());
              }}
              className="w-12 h-12 flex items-center justify-center bg-white hover:bg-system-accent/5 text-system-accent rounded-xl border border-black/5 hover:border-system-accent/20 active:scale-90 transition-all group shadow-sm"
              title="Prepare Nudge Back"
            >
              <ChevronLeft size={24} className="group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <div className="flex flex-col items-center px-8 min-w-[90px] border-x border-black/5">
              <span className="text-[10px] font-mono text-idm-muted uppercase tracking-[0.3em] leading-none mb-1.5">Next</span>
              {isEditingNext ? (
                <input
                  autoFocus
                  type="text"
                  value={editNextValue}
                  onChange={(e) => setEditNextValue(e.target.value)}
                  onBlur={handleNextEditSubmit}
                  onKeyDown={(e) => e.key === 'Enter' && handleNextEditSubmit()}
                  className="w-12 bg-white text-system-accent text-xl font-mono font-bold text-center border-b border-system-accent outline-none"
                />
              ) : (
                <span 
                  onDoubleClick={() => {
                    setIsEditingNext(true);
                    setEditNextValue(pendingOffset.toString());
                  }}
                  className="text-2xl font-mono font-bold text-system-accent leading-none tabular-nums cursor-text hover:bg-white px-2 rounded transition-colors"
                  title="Double-click to edit"
                >
                  {pendingOffset}
                </span>
              )}
            </div>
            <button 
              onClick={() => {
                const newVal = (pendingOffset + 1) % steps;
                setPendingOffset(newVal);
                setEditNextValue(newVal.toString());
              }}
              className="w-12 h-12 flex items-center justify-center bg-white hover:bg-system-accent/5 text-system-accent rounded-xl border border-black/5 hover:border-system-accent/20 active:scale-90 transition-all group shadow-sm"
              title="Prepare Nudge Forward"
            >
              <ChevronRight size={24} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {pendingOffset !== offset ? (
            <button 
              onClick={() => onOffsetChange(pendingOffset)}
              className="flex-1 h-12 bg-system-accent text-white font-mono text-[13px] font-black uppercase tracking-widest rounded-xl shadow-md active:scale-95 transition-all animate-in fade-in zoom-in-95 flex items-center justify-center gap-3"
            >
              <Disc size={20} className="animate-spin-slow" />
              Activate Drop
            </button>
          ) : (
            <div className="flex-1 h-12 flex items-center justify-center border border-dashed border-black/10 rounded-xl bg-white/50">
              <span className="text-[11px] font-mono text-idm-muted/40 uppercase tracking-[0.4em]">Awaiting Nudge</span>
            </div>
          )}
        </div>
      )}

      {/* Sampler Controls (Level 2) */}
      {samplerStatus === 'READY' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 p-6 bg-white rounded-xl border border-black/5 animate-in fade-in slide-in-from-top-2 duration-500 shadow-sm">
          {/* ROI Sliders */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Settings2 size={14} className="text-system-accent" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-idm-muted">ROI Markers</span>
            </div>
            <div className="space-y-4">
              <div 
                className="space-y-2 relative"
                onMouseEnter={(e) => handleParamEnter('sampleRoi', e)}
                onMouseLeave={handleParamLeave}
              >
                <div className="flex justify-between text-[9px] font-mono uppercase text-idm-muted">
                  <span>Start</span>
                  <span className="text-idm-ink">{Math.round(sampleStart * 100)}%</span>
                </div>
                <input 
                  type="range" min="0" max="0.95" step="0.01" value={sampleStart} 
                  onChange={(e) => onSamplerParamChange('sampleStart', parseFloat(e.target.value))}
                  className="w-full h-1 bg-idm-bg appearance-none cursor-pointer accent-system-accent" 
                />
              </div>
              <div 
                className="space-y-2 relative"
                onMouseEnter={(e) => handleParamEnter('sampleRoi', e)}
                onMouseLeave={handleParamLeave}
              >
                <div className="flex justify-between text-[9px] font-mono uppercase text-idm-muted">
                  <span>End</span>
                  <span className="text-idm-ink">{Math.round(sampleEnd * 100)}%</span>
                </div>
                <input 
                  type="range" min={sampleStart + 0.05} max="1" step="0.01" value={sampleEnd} 
                  onChange={(e) => onSamplerParamChange('sampleEnd', parseFloat(e.target.value))}
                  className="w-full h-1 bg-idm-bg appearance-none cursor-pointer accent-system-accent" 
                />
              </div>
            </div>
          </div>

          {/* Granular Engine */}
          <div className="space-y-4 border-l border-black/5 pl-8">
            <div className="flex items-center gap-2 mb-2">
              <Atom size={14} className="text-system-accent" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-idm-muted">Granular</span>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <div 
                className="space-y-2 relative"
                onMouseEnter={(e) => handleParamEnter('grainSize', e)}
                onMouseLeave={handleParamLeave}
              >
                <div className="flex justify-between text-[9px] font-mono uppercase text-idm-muted">
                  <span>Grain</span>
                  <span className="text-idm-ink">{grainSize}ms</span>
                </div>
                <input 
                  type="range" min="10" max="500" step="1" value={grainSize} 
                  onChange={(e) => onSamplerParamChange('grainSize', parseInt(e.target.value))}
                  className="w-full h-1 bg-idm-bg appearance-none cursor-pointer accent-system-accent" 
                />
              </div>
              <div 
                className="space-y-2 relative"
                onMouseEnter={(e) => handleParamEnter('overlap', e)}
                onMouseLeave={handleParamLeave}
              >
                <div className="flex justify-between text-[9px] font-mono uppercase text-idm-muted">
                  <span>Overlap</span>
                  <span className="text-idm-ink">{Math.round(overlap * 100)}%</span>
                </div>
                <input 
                  type="range" min="0" max="1" step="0.01" value={overlap} 
                  onChange={(e) => onSamplerParamChange('overlap', parseFloat(e.target.value))}
                  className="w-full h-1 bg-idm-bg appearance-none cursor-pointer accent-system-accent" 
                />
              </div>
              <div 
                className="space-y-2 relative"
                onMouseEnter={(e) => handleParamEnter('spray', e)}
                onMouseLeave={handleParamLeave}
              >
                <div className="flex justify-between text-[9px] font-mono uppercase text-idm-muted">
                  <span>Spray</span>
                  <span className="text-idm-ink">{spray}ms</span>
                </div>
                <input 
                  type="range" min="0" max="500" step="1" value={spray} 
                  onChange={(e) => onSamplerParamChange('spray', parseInt(e.target.value))}
                  className="w-full h-1 bg-idm-bg appearance-none cursor-pointer accent-system-accent" 
                />
              </div>
              <div 
                className="space-y-2 relative"
                onMouseEnter={(e) => handleParamEnter('bitCrush', e)}
                onMouseLeave={handleParamLeave}
              >
                <div className="flex justify-between text-[9px] font-mono uppercase text-idm-muted">
                  <span>Crush</span>
                  <span className="text-idm-ink">{bitCrush}b</span>
                </div>
                <input 
                  type="range" min="2" max="16" step="1" value={bitCrush} 
                  onChange={(e) => onSamplerParamChange('bitCrush', parseInt(e.target.value))}
                  className="w-full h-1 bg-idm-bg appearance-none cursor-pointer accent-system-accent" 
                />
              </div>
            </div>
          </div>

          {/* Envelope & Pitch */}
          <div className="space-y-4 border-l border-black/5 pl-8">
            <div className="flex items-center gap-2 mb-2">
              <Activity size={14} className="text-system-accent" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-idm-muted">Dynamics</span>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-[9px] font-mono uppercase text-idm-muted">
                    <span>Attack</span>
                    <span className="text-idm-ink">{attack}ms</span>
                  </div>
                  <input 
                    type="range" min="0" max="500" step="1" value={attack} 
                    onChange={(e) => onSamplerParamChange('attack', parseInt(e.target.value))}
                    className="w-full h-1 bg-idm-bg appearance-none cursor-pointer accent-system-accent" 
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[9px] font-mono uppercase text-idm-muted">
                    <span>Decay</span>
                    <span className="text-idm-ink">{decay}ms</span>
                  </div>
                  <input 
                    type="range" min="10" max="2000" step="1" value={decay} 
                    onChange={(e) => onSamplerParamChange('decay', parseInt(e.target.value))}
                    className="w-full h-1 bg-idm-bg appearance-none cursor-pointer accent-system-accent" 
                  />
                </div>
              </div>
              <div 
                className="space-y-2 relative"
                onMouseEnter={(e) => handleParamEnter('pitch', e)}
                onMouseLeave={handleParamLeave}
              >
                <div className="flex justify-between text-[9px] font-mono uppercase text-idm-muted">
                  <span>Pitch</span>
                  <span className="text-idm-ink">{pitch > 0 ? `+${pitch}` : pitch} st</span>
                </div>
                <input 
                  type="range" min="-24" max="24" step="1" value={pitch} 
                  onChange={(e) => onSamplerParamChange('pitch', parseInt(e.target.value))}
                  className="w-full h-1 bg-idm-bg appearance-none cursor-pointer accent-system-accent" 
                />
              </div>
            </div>
          </div>

          {/* Metadata & Mode */}
          <div className="space-y-4 border-l border-black/5 pl-8 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Info size={14} className="text-system-accent" />
                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-idm-muted">Metadata</span>
              </div>
              <div className="space-y-1.5">
                <div className="text-[9px] font-mono text-idm-muted truncate" title={samplerFilename || ''}>
                  <span className="text-idm-ink/40">FILE:</span> {samplerFilename?.split('_').pop()}
                </div>
                <div className="text-[9px] font-mono text-idm-muted">
                  <span className="text-idm-ink/40">DUR:</span> {samplerBuffer?.duration.toFixed(2)}s
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex gap-2">
                <button 
                  onClick={() => onSamplerParamChange('mode', mode === 'GATE' ? 'TRIGGER' : 'GATE')}
                  className={`flex-1 py-1.5 rounded-lg text-[9px] font-mono font-bold uppercase tracking-widest border transition-all ${mode === 'GATE' ? 'bg-system-accent text-white border-system-accent shadow-sm' : 'bg-white text-idm-muted border-black/5 hover:border-black/10'}`}
                >
                  {mode}
                </button>
                <button 
                  onClick={() => onSamplerParamChange('normalize', !normalize)}
                  className={`flex-1 py-1.5 rounded-lg text-[9px] font-mono font-bold uppercase tracking-widest border transition-all ${normalize ? 'bg-green-600/10 text-green-600 border-green-600/20 shadow-sm' : 'bg-white text-idm-muted border-black/5 hover:border-black/10'}`}
                >
                  Norm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Tonal Controls */}
      {isTonal && (
        <div className="flex items-end gap-4 p-3 bg-idm-bg rounded-2xl border border-black/5 mt-2">
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-2">
              <Music size={14} className="text-system-accent" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-idm-muted">Tonal</span>
            </div>
            <button
              onClick={onRecordAction}
              className={`flex items-center gap-1 px-2 py-0.5
                rounded-full text-[8px] font-mono uppercase tracking-widest 
                transition-all border ${
                  toneRecordingState === 'recording'
                    ? 'bg-red-500 text-white border-red-600 animate-pulse'
                    : toneRecordingState === 'armed'
                    ? 'bg-amber-400 text-white border-amber-500 animate-pulse'
                    : 'bg-idm-ink/5 border-idm-ink/10 text-idm-ink/50 hover:border-red-400 hover:text-red-500'
                }`}
              title={
                toneRecordingState === 'recording' ? 'Parar grabación'
                : toneRecordingState === 'armed' ? 'Armado — click para desarmar'
                : 'Rec'
              }
            >
              <span className={`w-1.5 h-1.5 rounded-full ${
                toneRecordingState === 'recording' ? 'bg-white'
                : toneRecordingState === 'armed' ? 'bg-white'
                : 'bg-red-400'
              }`} />
              {toneRecordingState === 'recording' ? 'Stop'
               : toneRecordingState === 'armed' ? 'Armed'
               : 'Rec'}
            </button>
          </div>
          <div className="flex items-center gap-3">
            {/* Controles ultra-compactos intencionales — no migrar a shadcn */}
            <div className="space-y-1">
              <span className="text-[8px] font-mono uppercase text-idm-muted">Synth</span>
              <select
                value={synthType || 'mono'}
                onChange={(e) => onSynthTypeChange?.(e.target.value)}
                className="block w-14 bg-white border border-black/10 rounded-lg text-[10px] font-mono px-1.5 py-1 text-idm-ink focus:outline-none focus:border-system-accent"
              >
                <option value="mono">Mono</option>
                <option value="fm">FM</option>
                <option value="wf">WF</option>
                <option value="add">ADD</option>
                <option value="pad">PAD</option>
                <option value="drone">DRN</option>
                <option value="ks">KS</option>
                <option value="modal">MOD</option>
                <option value="ambient">AMB</option>
              </select>
            </div>
            <div className="space-y-1">
              <span className="text-[8px] font-mono uppercase text-idm-muted">Root</span>
              <select
                value={rootNote}
                onChange={(e) => onRootNoteChange(parseInt(e.target.value))}
                className="block w-16 bg-white border border-black/10 rounded-lg text-[10px] font-mono px-1.5 py-1 text-idm-ink focus:outline-none focus:border-system-accent"
              >
                {Array.from({ length: 37 }, (_, i) => 36 + i).map(midi => (
                  <option key={midi} value={midi}>{midiToNoteName(midi)}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <span className="text-[8px] font-mono uppercase text-idm-muted">Scale</span>
              <select
                value={scaleId}
                onChange={(e) => onScaleChange(e.target.value)}
                className="block w-28 bg-white border border-black/10 rounded-lg text-[10px] font-mono px-1.5 py-1 text-idm-ink focus:outline-none focus:border-system-accent"
              >
                {Object.entries(SCALE_NAMES).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <span className="text-[8px] font-mono uppercase text-idm-muted">Oct</span>
              <select
                value={octaveRange}
                onChange={(e) => onOctaveRangeChange(parseInt(e.target.value))}
                className="block w-12 bg-white border border-black/10 rounded-lg text-[10px] font-mono px-1.5 py-1 text-idm-ink focus:outline-none focus:border-system-accent"
              >
                {[1, 2, 3].map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
      {/* Controles ultra-compactos intencionales — no migrar a shadcn */}
      {isTonal && synthType === 'fm' && (
        <div className="flex items-center gap-4 mt-1.5 p-3 bg-idm-bg rounded-2xl border border-black/5">
          <div className="flex items-center gap-2" onMouseEnter={(e) => handleParamEnter('fmRatio', e)} onMouseLeave={handleParamLeave}>
            <span className="text-[7px] font-mono uppercase text-idm-muted w-8">Ratio</span>
            <input
              type="range"
              min="0.1"
              max="10"
              step="0.1"
              value={fmRatio ?? 2}
              onChange={(e) => onFmRatioChange?.(parseFloat(e.target.value))}
              className="w-20 h-1 bg-idm-ink/10 appearance-none cursor-pointer accent-system-accent"
            />
            <span className="text-[8px] font-mono text-system-accent w-6">
              {(fmRatio ?? 2).toFixed(1)}
            </span>
          </div>
          <div className="flex items-center gap-2" onMouseEnter={(e) => handleParamEnter('fmIndex', e)} onMouseLeave={handleParamLeave}>
            <span className="text-[7px] font-mono uppercase text-idm-muted w-8">Index</span>
            <input
              type="range"
              min="0"
              max="50"
              step="1"
              value={fmIndex ?? 10}
              onChange={(e) => onFmIndexChange?.(parseInt(e.target.value))}
              className="w-20 h-1 bg-idm-ink/10 appearance-none cursor-pointer accent-system-accent"
            />
            <span className="text-[8px] font-mono text-system-accent w-6">
              {fmIndex ?? 10}
            </span>
          </div>
        </div>
      )}
      {/* Controles ultra-compactos intencionales — no migrar a shadcn */}
      {isTonal && synthType === 'wf' && (
        <div className="flex items-center gap-4 mt-1.5 p-3 bg-idm-bg rounded-2xl border border-black/5">
          <div className="flex items-center gap-2" onMouseEnter={(e) => handleParamEnter('wfAmount', e)} onMouseLeave={handleParamLeave}>
            <span className="text-[7px] font-mono uppercase text-idm-muted w-8">Fold</span>
            <input
              type="range"
              min="0"
              max="10"
              step="0.1"
              value={wfAmount ?? 3}
              onChange={(e) => onWfAmountChange?.(parseFloat(e.target.value))}
              className="w-20 h-1 bg-idm-ink/10 appearance-none cursor-pointer accent-system-accent"
            />
            <span className="text-[8px] font-mono text-system-accent w-6">
              {(wfAmount ?? 3).toFixed(1)}
            </span>
          </div>
          <div className="flex items-center gap-2" onMouseEnter={(e) => handleParamEnter('wfSymmetry', e)} onMouseLeave={handleParamLeave}>
            <span className="text-[7px] font-mono uppercase text-idm-muted w-10">Symm</span>
            <input
              type="range"
              min="-1"
              max="1"
              step="0.05"
              value={wfSymmetry ?? 0}
              onChange={(e) => onWfSymmetryChange?.(parseFloat(e.target.value))}
              className="w-20 h-1 bg-idm-ink/10 appearance-none cursor-pointer accent-system-accent"
            />
            <span className="text-[8px] font-mono text-system-accent w-8">
              {(wfSymmetry ?? 0).toFixed(2)}
            </span>
          </div>
        </div>
      )}
      {/* Controles ultra-compactos intencionales — no migrar a shadcn */}
      {isTonal && synthType === 'add' && (
        <div className="flex items-center gap-4 mt-1.5 p-3 bg-idm-bg rounded-2xl border border-black/5">
          <div className="flex items-center gap-2" onMouseEnter={(e) => handleParamEnter('addPartials', e)} onMouseLeave={handleParamLeave}>
            <span className="text-[7px] font-mono uppercase text-idm-muted w-10">Parts</span>
            <input
              type="range" min="2" max="8" step="1"
              value={addPartials ?? 4}
              onChange={(e) => onAddPartialsChange?.(parseInt(e.target.value))}
              className="w-20 h-1 bg-idm-ink/10 appearance-none cursor-pointer accent-system-accent"
            />
            <span className="text-[8px] font-mono text-system-accent w-4">
              {addPartials ?? 4}
            </span>
          </div>
          <div className="flex items-center gap-2" onMouseEnter={(e) => handleParamEnter('addBrightness', e)} onMouseLeave={handleParamLeave}>
            <span className="text-[7px] font-mono uppercase text-idm-muted w-12">Bright</span>
            <input
              type="range" min="0" max="1" step="0.05"
              value={addBrightness ?? 0.5}
              onChange={(e) => onAddBrightnessChange?.(parseFloat(e.target.value))}
              className="w-20 h-1 bg-idm-ink/10 appearance-none cursor-pointer accent-system-accent"
            />
            <span className="text-[8px] font-mono text-system-accent w-6">
              {(addBrightness ?? 0.5).toFixed(2)}
            </span>
          </div>
        </div>
      )}
      {/* Pad controls */}
      {isTonal && synthType === 'pad' && (
        <div className="flex items-center gap-4 mt-1.5 p-3 bg-idm-bg rounded-2xl border border-black/5">
          <div className="flex items-center gap-2">
            <span className="text-[7px] font-mono uppercase text-idm-muted w-10">Voices</span>
            <input
              type="range" min="3" max="7" step="1"
              value={padVoices ?? 5}
              onChange={(e) => onPadVoicesChange?.(parseInt(e.target.value))}
              className="w-20 h-1 bg-idm-ink/10 appearance-none cursor-pointer accent-system-accent"
            />
            <span className="text-[8px] font-mono text-system-accent w-4">
              {padVoices ?? 5}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[7px] font-mono uppercase text-idm-muted w-10">Detune</span>
            <input
              type="range" min="0" max="100" step="1"
              value={padDetune ?? 30}
              onChange={(e) => onPadDetuneChange?.(parseInt(e.target.value))}
              className="w-20 h-1 bg-idm-ink/10 appearance-none cursor-pointer accent-system-accent"
            />
            <span className="text-[8px] font-mono text-system-accent w-6">
              {padDetune ?? 30}¢
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[7px] font-mono uppercase text-idm-muted w-10">Attack</span>
            <input
              type="range" min="0.01" max="2.0" step="0.01"
              value={padAttack ?? 0.3}
              onChange={(e) => onPadAttackChange?.(parseFloat(e.target.value))}
              className="w-20 h-1 bg-idm-ink/10 appearance-none cursor-pointer accent-system-accent"
            />
            <span className="text-[8px] font-mono text-system-accent w-8">
              {(padAttack ?? 0.3).toFixed(2)}s
            </span>
          </div>
        </div>
      )}
      {/* Drone controls */}
      {isTonal && synthType === 'drone' && (
        <div className="flex items-center gap-4 mt-1.5 p-3 bg-idm-bg rounded-2xl border border-black/5">
          <div className="flex items-center gap-2">
            <span className="text-[7px] font-mono uppercase text-idm-muted w-12">Feedback</span>
            <input
              type="range" min="0.70" max="0.98" step="0.01"
              value={droneFeedback ?? 0.88}
              onChange={(e) => onDroneFeedbackChange?.(parseFloat(e.target.value))}
              className="w-20 h-1 bg-idm-ink/10 appearance-none cursor-pointer accent-system-accent"
            />
            <span className="text-[8px] font-mono text-system-accent w-8">
              {((droneFeedback ?? 0.88) * 100).toFixed(0)}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[7px] font-mono uppercase text-idm-muted w-10">Filter</span>
            <input
              type="range" min="200" max="8000" step="50"
              value={droneFilterFreq ?? 2000}
              onChange={(e) => onDroneFilterFreqChange?.(parseInt(e.target.value))}
              className="w-20 h-1 bg-idm-ink/10 appearance-none cursor-pointer accent-system-accent"
            />
            <span className="text-[8px] font-mono text-system-accent w-12">
              {droneFilterFreq ?? 2000}Hz
            </span>
          </div>
        </div>
      )}
      {/* KS controls */}
      {isTonal && synthType === 'ks' && (
        <div className="flex items-center gap-4 mt-1.5 p-3 bg-idm-bg rounded-2xl border border-black/5">
          <div className="flex items-center gap-2">
            <span className="text-[7px] font-mono uppercase text-idm-muted w-10">Decay</span>
            <input
              type="range" min="0.80" max="0.999" step="0.001"
              value={ksDecay ?? 0.97}
              onChange={(e) => onKsDecayChange?.(parseFloat(e.target.value))}
              className="w-20 h-1 bg-idm-ink/10 appearance-none cursor-pointer accent-system-accent"
            />
            <span className="text-[8px] font-mono text-system-accent w-10">
              {(ksDecay ?? 0.97).toFixed(3)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[7px] font-mono uppercase text-idm-muted w-10">Bright</span>
            <input
              type="range" min="500" max="8000" step="100"
              value={ksBrightness ?? 5000}
              onChange={(e) => onKsBrightnessChange?.(parseInt(e.target.value))}
              className="w-20 h-1 bg-idm-ink/10 appearance-none cursor-pointer accent-system-accent"
            />
            <span className="text-[8px] font-mono text-system-accent w-12">
              {ksBrightness ?? 5000}Hz
            </span>
          </div>
        </div>
      )}
      {/* Modal controls */}
      {isTonal && synthType === 'modal' && (
        <div className="flex items-center gap-4 mt-1.5 p-3 bg-idm-bg rounded-2xl border border-black/5">
          <div className="flex items-center gap-2">
            <span className="text-[7px] font-mono uppercase text-idm-muted w-8">Body</span>
            <select
              value={modalBody ?? 'bell'}
              onChange={(e) => onModalBodyChange?.(e.target.value)}
              className="block w-14 bg-white border border-black/10 rounded-lg text-[10px] font-mono px-1.5 py-1 text-idm-ink focus:outline-none focus:border-system-accent"
            >
              <option value="bell">Bell</option>
              <option value="plate">Plate</option>
              <option value="string">String</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[7px] font-mono uppercase text-idm-muted w-10">Decay</span>
            <input
              type="range" min="0.5" max="3.0" step="0.1"
              value={modalDecay ?? 1.0}
              onChange={(e) => onModalDecayChange?.(parseFloat(e.target.value))}
              className="w-20 h-1 bg-idm-ink/10 appearance-none cursor-pointer accent-system-accent"
            />
            <span className="text-[8px] font-mono text-system-accent w-8">
              {(modalDecay ?? 1.0).toFixed(1)}×
            </span>
          </div>
        </div>
      )}
      {/* Ambient controls */}
      {isTonal && synthType === 'ambient' && (
        <div className="flex items-center gap-4 mt-1.5 p-3 bg-idm-bg rounded-2xl border border-black/5">
          <div className="flex items-center gap-2">
            <span className="text-[7px] font-mono uppercase text-idm-muted w-6">Vol</span>
            <input
              type="range" min="0.1" max="1.0" step="0.05"
              value={ambientVolume ?? 0.6}
              onChange={(e) => onAmbientVolumeChange?.(parseFloat(e.target.value))}
              className="w-20 h-1 bg-idm-ink/10 appearance-none cursor-pointer accent-system-accent"
            />
            <span className="text-[8px] font-mono text-system-accent w-8">
              {((ambientVolume ?? 0.6) * 100).toFixed(0)}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[7px] font-mono uppercase text-idm-muted w-10">Speed</span>
            <input
              type="range" min="0.5" max="2.0" step="0.1"
              value={ambientSpeed ?? 1.0}
              onChange={(e) => onAmbientSpeedChange?.(parseFloat(e.target.value))}
              className="w-20 h-1 bg-idm-ink/10 appearance-none cursor-pointer accent-system-accent"
            />
            <span className="text-[8px] font-mono text-system-accent w-8">
              {(ambientSpeed ?? 1.0).toFixed(1)}×
            </span>
          </div>
        </div>
      )}
      {/* Audio-Rate Modulation — disponible en todos los modos de synth tonal */}
      {isTonal && (
        <div className="flex items-center gap-4 mt-1.5 p-3 bg-idm-bg rounded-2xl border border-black/5 opacity-60 hover:opacity-100 transition-opacity">
          <span className="text-[7px] font-mono uppercase text-idm-muted">AR mod</span>
          <div className="flex items-center gap-2" onMouseEnter={(e) => handleParamEnter('arRate', e)} onMouseLeave={handleParamLeave}>
            <span className="text-[7px] font-mono text-idm-muted w-6">Rate</span>
            <input
              type="range" min="20" max="2000" step="10"
              value={arRate ?? 80}
              onChange={(e) => onArRateChange?.(parseInt(e.target.value))}
              className="w-16 h-1 bg-idm-ink/10 appearance-none cursor-pointer accent-system-accent"
            />
            <span className="text-[8px] font-mono text-system-accent w-10">
              {arRate ?? 80}Hz
            </span>
          </div>
          <div className="flex items-center gap-2" onMouseEnter={(e) => handleParamEnter('arDepth', e)} onMouseLeave={handleParamLeave}>
            <span className="text-[7px] font-mono text-idm-muted w-8">Depth</span>
            <input
              type="range" min="0" max="3000" step="50"
              value={arDepth ?? 0}
              onChange={(e) => onArDepthChange?.(parseInt(e.target.value))}
              className="w-16 h-1 bg-idm-ink/10 appearance-none cursor-pointer accent-system-accent"
            />
            <span className="text-[8px] font-mono text-system-accent w-10">
              {arDepth ?? 0}Hz
            </span>
          </div>
        </div>
      )}

      {id === 'cloud' && (
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={onCloudRecordAction}
            className={`flex items-center gap-1.5 px-2.5 py-1 
              rounded-full text-[8px] font-mono uppercase tracking-widest 
              transition-all border ${
              cloudRecordingState === 'recording'
                ? 'bg-red-500 text-white border-red-600 animate-pulse'
                : cloudRecordingState === 'armed'
                ? 'bg-amber-400 text-white border-amber-500 animate-pulse'
                : 'bg-idm-ink/5 border-idm-ink/10 text-idm-ink/50 hover:border-red-400 hover:text-red-500'
            }`}
            title={
              cloudRecordingState === 'recording' ? 'Parar grabación'
              : cloudRecordingState === 'armed' ? 'Armado — esperando Play'
              : 'Grabar Atmosphere'
            }
          >
            <span className={`w-1.5 h-1.5 rounded-full ${
              cloudRecordingState === 'recording' || 
              cloudRecordingState === 'armed' ? 'bg-white' : 'bg-red-400'
            }`} />
            {cloudRecordingState === 'recording' ? 'Stop'
             : cloudRecordingState === 'armed' ? 'Armed'
             : 'Rec'}
          </button>
          <span className="text-[7px] font-mono text-idm-muted uppercase 
            tracking-widest">
            Atmosphere
          </span>
        </div>
      )}

      {/* Cloud Mode Selector */}
      {id === 'cloud' && (
        <div className="flex items-center gap-4 mb-2">
          <div className="space-y-0.5">
            <span className="text-[7px] font-mono uppercase text-idm-muted">Mode</span>
            <select
              value={cloudMode ?? 'granular'}
              onChange={e => onCloudModeChange?.(e.target.value as 'granular' | 'eno')}
              className="block w-16 bg-white border border-black/10 rounded-lg text-[10px] font-mono px-1.5 py-1 text-idm-ink focus:outline-none focus:border-system-accent"
            >
              <option value="granular">Gran</option>
              <option value="eno">Eno</option>
            </select>
          </div>
          {cloudMode === 'eno' && (
            <div className="space-y-0.5">
              <span className="text-[7px] font-mono uppercase text-idm-muted">Speed</span>
              <input
                type="range" min={0.5} max={2.0} step={0.1}
                value={enoSpeed ?? 1.0}
                onChange={e => onEnoSpeedChange?.(parseFloat(e.target.value))}
                className="w-20 h-[7px] accent-system-accent"
              />
              <span className="text-[7px] font-mono text-idm-ink">
                {(enoSpeed ?? 1.0).toFixed(1)}×
              </span>
            </div>
          )}
        </div>
      )}

      {id !== 'cloud' && (
        <div className="flex flex-wrap gap-3 pt-2">
          {pattern.map((active, i) => {
            const scaleIntervals = SCALES[scaleId] || SCALES.phrygianDominant;
            const noteIdx = noteIndices[i] ?? 0;
            const midi = noteIndexToMidi(rootNote, scaleIntervals, noteIdx);
            const noteName = midiToNoteName(midi);
            const maxIdx = getMaxNoteIndex(scaleIntervals, octaveRange);
            return (
              <EuclideanStep 
                key={i} 
                active={active === 1} 
                trackId={trackId}
                velocity={0.85}
                isGhost={false}
                index={i}
                color={color}
                baseProbability={probabilities[i] || 1}
                effectiveProbability={chaosEnabled ? (probabilities[i] || 1) * entropy : (probabilities[i] || 1)}
                previewActive={previewPattern ? previewPattern[i] === 1 : false}
                temporalOffset={temporalOffsets?.[i] ?? 0}
                onProbabilityChange={(val) => onProbabilityChange(i, val)}
                onToggle={() => onToggleStep(i)}
                evolveEnabled={evolveEnabled}
                isTonal={isTonal}
                noteName={noteName}
                noteIndex={noteIdx}
                maxNoteIndex={maxIdx}
                onNoteIndexChange={(val) => onNoteIndexChange(i, val)}
              />
            );
          })}
        </div>
      )}

      {/* Stochastic Engine Panel (Hidden for Cloud Track) */}
      {id !== 'cloud' && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-idm-bg rounded-2xl border border-black/5 relative transition-all duration-500 opacity-100 scale-100 shadow-sm">
          {/* Chaos Section */}
          <div 
            className="flex items-center gap-4 relative"
            onMouseEnter={(e) => handleParamEnter('chaos', e)}
            onMouseLeave={handleParamLeave}
          >
            <button 
              onClick={onChaosToggle}
              className={`px-3 py-1.5 rounded-xl font-mono text-[10px] uppercase tracking-widest transition-all border ${chaosEnabled ? 'bg-system-accent text-white border-system-accent shadow-sm' : 'bg-white text-idm-muted border-black/5 hover:text-idm-ink hover:border-black/10'}`}
            >
              Chaos
            </button>
            <div className="flex-1 space-y-1">
              <div className="flex justify-between text-[9px] font-mono uppercase text-idm-muted">
                <span>Entropy</span>
                <span className={chaosEnabled ? "text-system-accent" : ""}>{Math.round(entropy * 100)}%</span>
              </div>
              <input 
                type="range" min="0" max="1" step="0.01" value={entropy} 
                onChange={(e) => onEntropyChange(parseFloat(e.target.value))}
                disabled={!chaosEnabled}
                className={`w-full h-1 appearance-none cursor-pointer rounded-full ${chaosEnabled ? 'bg-system-accent/20 accent-system-accent' : 'bg-white accent-idm-muted/40 cursor-not-allowed'}`}
              />
            </div>
          </div>

          {/* Evolve Section */}
          <div 
            className="flex items-center gap-4 relative"
            onMouseEnter={(e) => handleParamEnter('evolve', e)}
            onMouseLeave={handleParamLeave}
          >
            <button 
              onClick={onEvolveToggle}
              className={`px-3 py-1.5 rounded-xl font-mono text-[10px] uppercase tracking-widest transition-all border ${evolveEnabled ? 'bg-idm-ink text-white border-idm-ink shadow-sm' : 'bg-white text-idm-muted border-black/5 hover:text-idm-ink hover:border-black/10'}`}
            >
              Evolve
            </button>
            <div className="flex-1 grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex justify-between text-[9px] font-mono uppercase text-idm-muted">
                  <span>Rate</span>
                  <span className={evolveEnabled ? "text-idm-ink" : ""}>{Math.round(mutationRate * 100)}%</span>
                </div>
                <input 
                  type="range" min="0.01" max="0.3" step="0.01" value={mutationRate} 
                  onChange={(e) => onMutationRateChange(parseFloat(e.target.value))}
                  disabled={!evolveEnabled}
                  className={`w-full h-1 appearance-none cursor-pointer rounded-full ${evolveEnabled ? 'bg-idm-ink/20 accent-idm-ink' : 'bg-white accent-idm-muted/40 cursor-not-allowed'}`}
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[9px] font-mono uppercase text-idm-muted">
                  <span>Speed</span>
                  <span className={evolveEnabled ? "text-idm-ink" : ""}>{mutationSpeed}x</span>
                </div>
                <input 
                  type="range" min="1" max="8" step="1" value={mutationSpeed} 
                  onChange={(e) => onMutationSpeedChange(parseInt(e.target.value))}
                  disabled={!evolveEnabled}
                  className={`w-full h-1 appearance-none cursor-pointer rounded-full ${evolveEnabled ? 'bg-idm-ink/20 accent-idm-ink' : 'bg-white accent-idm-muted/40 cursor-not-allowed'}`}
                />
              </div>
            </div>
          </div>

          {/* Reset Button (Small icon in corner) */}
          <button 
            onClick={() => {
              onEntropyChange(1);
              onMutationRateChange(0.05);
              onMutationSpeedChange(1);
              // Reset all probabilities to 1
              for(let i=0; i<64; i++) onProbabilityChange(i, 1);
            }}
            className="absolute -top-2 -right-2 w-5 h-5 bg-white hover:bg-system-accent/10 border border-black/5 rounded-full flex items-center justify-center text-[8px] font-mono text-idm-muted hover:text-system-accent transition-all shadow-sm"
            title="Reset Engine"
          >
            ↺
          </button>
        </div>
      )}

      <StudyTooltip
        content={hoveredParam ? getMicroText(hoveredParam, voice) : ''}
        visible={!!hoveredParam && isStudyMode}
        anchorEl={hoveredParamEl}
      />
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to avoid re-renders on every sequencer tick
  // Only re-render if critical props change
  return (
    prevProps.steps === nextProps.steps &&
    prevProps.pulses === nextProps.pulses &&
    prevProps.offset === nextProps.offset &&
    prevProps.jitter === nextProps.jitter &&
    prevProps.mcm === nextProps.mcm &&
    prevProps.isMuted === nextProps.isMuted &&
    prevProps.isSoloed === nextProps.isSoloed &&
    prevProps.anySoloed === nextProps.anySoloed &&
    prevProps.volume === nextProps.volume &&
    prevProps.samplerStatus === nextProps.samplerStatus &&
    prevProps.chaosEnabled === nextProps.chaosEnabled &&
    prevProps.entropy === nextProps.entropy &&
    prevProps.evolveEnabled === nextProps.evolveEnabled &&
    prevProps.mutationRate === nextProps.mutationRate &&
    prevProps.mutationSpeed === nextProps.mutationSpeed &&
    prevProps.lastHit === nextProps.lastHit &&
    prevProps.previewPattern === nextProps.previewPattern &&
    prevProps.isDjMode === nextProps.isDjMode &&
    prevProps.globalStep === nextProps.globalStep &&
    prevProps.delaySend === nextProps.delaySend &&
    prevProps.reverbSend === nextProps.reverbSend &&
    prevProps.stats.hits === nextProps.stats.hits &&
    prevProps.stats.misses === nextProps.stats.misses &&
    prevProps.stats.cycleCount === nextProps.stats.cycleCount &&
    prevProps.probabilities === nextProps.probabilities &&
    prevProps.pattern === nextProps.pattern &&
    // Sampler Params
    prevProps.sampleStart === nextProps.sampleStart &&
    prevProps.sampleEnd === nextProps.sampleEnd &&
    prevProps.attack === nextProps.attack &&
    prevProps.decay === nextProps.decay &&
    prevProps.mode === nextProps.mode &&
    prevProps.pitch === nextProps.pitch &&
    prevProps.normalize === nextProps.normalize &&
    prevProps.grainSize === nextProps.grainSize &&
    prevProps.overlap === nextProps.overlap &&
    prevProps.spray === nextProps.spray &&
    prevProps.bitCrush === nextProps.bitCrush &&
    prevProps.studyVoice === nextProps.studyVoice &&
    prevProps.temporalityMode === nextProps.temporalityMode &&
    prevProps.bpm === nextProps.bpm &&
    prevProps.swing === nextProps.swing &&
    prevProps.ratchet === nextProps.ratchet &&
    // Tonal
    prevProps.isTonal === nextProps.isTonal &&
    prevProps.rootNote === nextProps.rootNote &&
    prevProps.scaleId === nextProps.scaleId &&
    prevProps.octaveRange === nextProps.octaveRange &&
    prevProps.noteIndices === nextProps.noteIndices &&
    prevProps.synthType === nextProps.synthType &&
    prevProps.fmRatio === nextProps.fmRatio &&
    prevProps.fmIndex === nextProps.fmIndex &&
    prevProps.wfAmount === nextProps.wfAmount &&
    prevProps.wfSymmetry === nextProps.wfSymmetry &&
    prevProps.addPartials === nextProps.addPartials &&
    prevProps.addBrightness === nextProps.addBrightness &&
    prevProps.arRate === nextProps.arRate &&
    prevProps.arDepth === nextProps.arDepth &&
    prevProps.padVoices === nextProps.padVoices &&
    prevProps.padDetune === nextProps.padDetune &&
    prevProps.padAttack === nextProps.padAttack &&
    prevProps.droneFeedback === nextProps.droneFeedback &&
    prevProps.droneFilterFreq === nextProps.droneFilterFreq &&
    prevProps.toneRecordingState === nextProps.toneRecordingState &&
    prevProps.cloudRecordingState === nextProps.cloudRecordingState &&
    prevProps.ksDecay === nextProps.ksDecay &&
    prevProps.ksBrightness === nextProps.ksBrightness &&
    prevProps.modalBody === nextProps.modalBody &&
    prevProps.modalDecay === nextProps.modalDecay &&
    prevProps.ambientVolume === nextProps.ambientVolume &&
    prevProps.ambientSpeed === nextProps.ambientSpeed &&
    prevProps.cloudMode === nextProps.cloudMode &&
    prevProps.enoSpeed === nextProps.enoSpeed &&
    prevProps.rrEnabled === nextProps.rrEnabled &&
    prevProps.rrAmount === nextProps.rrAmount
  );
});
