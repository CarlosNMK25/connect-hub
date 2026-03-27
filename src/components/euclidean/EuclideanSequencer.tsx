import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import * as Tone from 'tone';
import { Play, Square, Sliders, Activity, Zap, Eye, EyeOff, Disc, ChevronLeft, ChevronRight, Info, HelpCircle, X, ChevronDown, ChevronUp, Layers, Target, Atom, Power, Settings, Save, Upload, Download, Trash2 } from 'lucide-react';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import { EuclideanTrack } from './EuclideanTrack';
import { SpectrumAnalyzer } from './SpectrumAnalyzer';
import { JitterMonitor } from './JitterMonitor';
import { EnergyMonitor } from './EnergyMonitor';
import { PhaseRadar } from './PhaseRadar';
import { EngineRoom, type LogEntry } from './EngineRoom';
import { PatternSpace } from './PatternSpace';
import { CoincidenceRow } from './CoincidenceRow';
import { PhaseSparkline } from './PhaseSparkline';
import { bjorklund, rotate } from '../../utils/bjorklund';
import { generateLSystem, generateCAPattern } from '../../utils/patternGenerators';
import { lcmArray, calculateLcmImpact } from '../../utils/math';
import { evaluateDiagnosis, computeMcm, computeEclipseTime, type DiagnosisContext, type DiagnosisInsight } from '../../utils/diagnosis';
import { PRESETS, ScenePreset, TrackPreset } from '../../constants/presets';
import { PEDAGOGY, getMicroText, type PedagogyVoice } from '../../constants/pedagogy';
import { UserPreset, loadUserPresets, saveUserPresets, exportPresetAsJson, importPresetFromFile, userPresetToScenePreset } from '../../utils/userPresets';
import { TemporalityMode, TEMPORALITY_MODES, calculateTemporalOffset } from '../../utils/temporality';
import { SCALES, SCALE_NAMES, noteIndexToMidi, midiToNoteName, getMaxNoteIndex, getScaleIntervals, getScaleDetune, midiAndDetuneToFreq, noteIndexToFreq, isNonOctaveScale } from '../../utils/scales';
import { buildWavefoldCurve, vactrolfiltFreq } from '../../utils/waveshaping';
import { generateMarkovMatrix, markovNextNote, type MarkovStyle } from '../../utils/markovGenerator';
import { LorenzAttractor } from '../../utils/lorenzAttractor';
import { calculateSliceBoundaries, defaultSliceOrder, defaultSliceReverse, defaultSlicePitch } from '../../utils/slicerUtils';
import { usePedagogy } from '../../hooks/usePedagogy';

interface SceneData {
  pulses: number;
  steps: number;
  offset: number;
  probabilities: number[];
  pattern: number[];
  patternMode?: 'euclidean' | 'lsystem' | 'ca';
  lsSeed?: string;
  lsRuleA?: string;
  lsIterations?: number;
  lsRotation?: number;
  caRule?: number;
  caSeed?: string;
  caDensity?: number;
  caSpeed?: number;
}

interface TrackState {
  id: string;
  name: string;
  color: string;
  pulses: number;
  steps: number;
  offset: number;
  probabilities: number[];
  pattern: number[];
  // Sampler Engine (Level 2)
  samplerBuffer: AudioBuffer | null;
  samplerStatus: 'IDLE' | 'DECODING' | 'READY';
  samplerFilename: string | null;
  sampleStart: number; // 0-1
  sampleEnd: number; // 0-1
  attack: number; // ms
  decay: number; // ms
  mode: 'GATE' | 'TRIGGER' | 'ONE-SHOT';
  pitch: number; // semitones
  normalize: boolean;
  // Granular Engine (Level 2)
  grainSize: number; // ms
  overlap: number; // 0-1
  spray: number; // ms
  bitCrush: number; // bits (1-16)
  // Stochastic Engine
  chaosEnabled: boolean;
  entropy: number;
  evolveEnabled: boolean;
  mutationRate: number;
  mutationSpeed: number; // Every N cycles
  isMuted: boolean;
  isSoloed: boolean;
  volume: number;
  delaySend: number;
  reverbSend: number;
  ratchet: number;
  // Tonal Engine
  isTonal: boolean;
  rootNote: number;
  scaleId: string;
  octaveRange: number;
  noteIndices: number[];
  synthType: string;
  fmRatio?: number;   // harmonicity del FMSynth, rango 0.1–10
  fmIndex?: number;   // modulationIndex del FMSynth, rango 0–50
  wfAmount?: number;   // intensidad del wavefolding (0-10, default 3)
  wfSymmetry?: number; // sesgo de la curva wavefold (-1 a 1, default 0)
  addPartials?: number;   // número de parciales (2-8, default 4)
  addBrightness?: number; // pendiente espectral (0-1, default 0.5)
  arRate?: number;        // frecuencia del LFO audio-rate (20-2000Hz, default 80)
  arDepth?: number;       // profundidad de modulación en Hz (0-3000, default 0)
  padVoices?: number;     // voces del pad unísono (3-7, default 5)
  padDetune?: number;     // spread de detune en cents (0-100, default 30)
  padAttack?: number;     // tiempo de ataque en segundos (0.01-2.0, default 0.3)
  droneFeedback?: number;    // feedback del delay loop (0.7-0.98, default 0.88)
  droneFilterFreq?: number;  // frecuencia del filtro del loop (200-8000Hz, default 2000)
  ksDecay?: number;          // feedback del loop KS (0.80-0.999, default 0.97)
  ksBrightness?: number;     // frecuencia del filtro KS (500-8000Hz, default 5000)
  modalBody?: string;        // 'bell' | 'plate' | 'string', default 'bell'
  modalDecay?: number;       // multiplicador de decay (0.5-3.0, default 1.0)
  ambientVolume?: number;    // volumen de los loops ambient (0.1-1.0, default 0.6)
  ambientSpeed?: number;     // multiplicador de velocidad de loops (0.5-2.0, default 1.0)
  cloudMode?: 'granular' | 'eno';  // modo de Cloud, default 'granular'
  enoSpeed?: number;               // multiplicador de velocidad Eno (0.5-2.0, default 1.0)
  rrEnabled?: boolean;             // Round Robin micro-variación por hit, default false
  rrAmount?: number;               // intensidad RR 0-100, default 30
  // Pattern Mode (L-System / Cellular Automata)
  patternMode?: 'euclidean' | 'lsystem' | 'ca';
  lsSeed?: string;
  lsRuleA?: string;
  lsIterations?: number;
  lsRotation?: number;
  caRule?: number;
  caSeed?: string;
  caDensity?: number;
  caSpeed?: number;
  driftEnabled?: boolean;          // Phase Drift estilo Reich, default false
  driftRate?: number;              // -0.05 a 0.05, default 0.01
  // Markov note mode
  noteMode?: 'euclidean' | 'markov';  // default 'euclidean'
  markovStyle?: MarkovStyle;           // default 'scale'
  markovTemperature?: number;          // 0-100, default 40
  markovMemory?: 1 | 2;               // TODO: orden 2 requiere tensor n×n×n
  markovAnchor?: number;              // 0=OFF, 4, 8, 16 notas, default 0
  markovShowMatrix?: boolean;         // mostrar tabla, default false
  // Layer 2
  layer2Status?: 'empty' | 'loading' | 'ready';
  layer2Filename?: string;
  layer2Blend?: number;      // 0-1, default 0.8
  layer2Pitch?: number;      // -24 a +24 semitonos, default 0
  layer2Offset?: number;     // 0-500ms, default 0
  layer2FilterFreq?: number; // 200-8000Hz, default 8000
  layer2Reverse?: boolean;   // default false
  // Lorenz Attractor
  lorenzEnabled?: boolean;
  lorenzDepth?: number;
  lorenzTarget?: 'filter' | 'volume';
  lorenzSpeed?: number;
  // Nested LFO
  nestedLfoEnabled?: boolean;
  nestedLfoRate1?: number;
  nestedLfoRate2?: number;
  nestedLfoDepth?: number;
  // Slicer Engine (Phase 6A)
  slicerEnabled?: boolean;
  sliceCount?: number;
  sliceOrder?: number[];
  sliceReverse?: boolean[];
  slicePitch?: number[];
  // Time Stretch (Phase 6B)
  stretchEnabled?: boolean;
  stretchRate?: number; // 0.25-2.0, default 1.0
  // EQ per-track (Phase 6C)
  eqEnabled?: boolean;
  eqHpfFreq?: number;   // 20-2000 Hz, default 20
  eqLpfFreq?: number;   // 1000-20000 Hz, default 20000
  // Layer 2 Time Stretch (Phase 6D)
  layer2StretchEnabled?: boolean;
  layer2StretchRate?: number; // 0.25-2.0, default 1.0
  // Panning (Phase 7A)
  pan?: number; // -1 to +1, default 0
  // Frequency Shifter (Phase 7B)
  freqShiftEnabled?: boolean;
  freqShift?: number; // -500 to +500 Hz, default 0
  // Spectral Delay Send (Phase 7C)
  spectralDelaySend?: number; // 0-1, default 0
  // Freeze Send (Phase 9)
  freezeSend?: number; // 0-1, default 0
  reverseSend?: number; // 0-1, default 0
  // Extreme Loop (Phase 10)
  extremeLoopEnabled?: boolean; // default false
  extremeLoopSize?: number;     // ms, 1-50, default 10
  extremeLoopPoint?: number;    // 0-1, position in buffer, default 0.5
  // 3D Audio / Binaural (Phase 7D)
  binauralEnabled?: boolean;
  binauralAzimuth?: number; // 0-360 degrees, default 0
  binauralDistance?: number; // 1-10, default 3
  // Phase 8 — Percussive Synthesis
  kickPitchDecay?: number;    // 0.01-0.5, default 0.05
  kickOctaves?: number;       // 1-10, default 10
  kickDecay?: number;         // 0.1-1.0, default 0.4
  kickClickType?: string;     // 'white'|'pink'|'brown', default 'pink'
  hatMode?: string;           // 'noise'|'metal', default 'noise'
  hatHarmonicity?: number;    // 0.1-10, default 5.1
  hatModIndex?: number;       // 1-100, default 32
  hatResonance?: number;      // 100-8000, default 4000
  hatDecay?: number;          // 0.01-0.5, default 0.05
  hatNoiseType?: string;      // 'white'|'pink'|'brown', default 'white'
  snareDecay?: number;        // 0.05-0.5, default 0.2
  snareNoiseType?: string;    // 'white'|'pink'|'brown', default 'white'
  snareBodyEnabled?: boolean; // default false
  snareBodyPitch?: number;    // 100-400, default 180
  snareBodyDecay?: number;    // 0.05-0.3, default 0.1
  hits: number;
  misses: number;
  // Song Mode — Scene slots
  activeScene: number;           // 0-7
  scenes: (SceneData | null)[];  // array of 8
  // UI-only: exclusive advanced panel visibility
  activeAdvancedPanel?: 'RR' | 'PHD' | 'LRZ' | 'NLF' | null;
}

/** Generate a synthetic reversed impulse response for Reverse Reverb */
function generateReverseIR(ctx: BaseAudioContext, decay: number): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(decay * sampleRate);
  const buffer = ctx.createBuffer(2, length, sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-3 * i / length);
    }
    data.reverse();
  }
  return buffer;
}

const getMesoInsight = (tracks: TrackState[]) => {
  // Prime Aesthetics check
  const isPrime = (n: number) => {
    if (n <= 1) return false;
    for (let i = 2; i <= Math.sqrt(n); i++) if (n % i === 0) return false;
    return true;
  };

  const primeTrack = tracks.find(t => isPrime(t.pulses) || isPrime(t.steps));
  if (primeTrack) {
    return PEDAGOGY.meso.primeAesthetics.template
      .replace('{p}', primeTrack.pulses.toString())
      .replace('{s}', primeTrack.steps.toString());
  }

  // MCM Eclipse check
  const steps = tracks.map(t => t.steps);
  const uniqueSteps = [...new Set(steps)];
  if (uniqueSteps.length > 1) {
    const gcd = (a: number, b: number): number => (!b ? a : gcd(b, a % b));
    const lcm = (a: number, b: number): number => (a * b) / gcd(a, b);
    const totalLcm = uniqueSteps.reduce((acc, curr) => lcm(acc, curr));
    return PEDAGOGY.meso.mcmEclipse.template.replace('{lcm}', totalLcm.toString());
  }

  // Polyrhythm check
  if (tracks.length >= 2) {
    return PEDAGOGY.meso.polyrhythm.template
      .replace('{p1}', tracks[0].pulses.toString())
      .replace('{s1}', tracks[0].steps.toString())
      .replace('{p2}', tracks[1].pulses.toString())
      .replace('{s2}', tracks[1].steps.toString());
  }

  return null;
};

const MesoInsightMonitor = ({ tracks, isStudyMode }: { tracks: TrackState[], isStudyMode: boolean }) => {
  const [insight, setInsight] = useState<string | null>(null);

  useEffect(() => {
    if (!isStudyMode) {
      setInsight(null);
      return;
    }

    const newInsight = getMesoInsight(tracks);
    setInsight(newInsight);
  }, [tracks, isStudyMode]);

  return (
    <AnimatePresence>
      {isStudyMode && insight && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="mb-8 p-6 bg-system-accent/5 border border-system-accent/20 rounded-2xl relative overflow-hidden group"
        >
          <div className="absolute top-0 left-0 w-1 h-full bg-system-accent" />
          <div className="flex items-start gap-4">
            <div className="p-2 bg-system-accent/10 rounded-lg">
              <Zap size={18} className="text-system-accent animate-pulse" />
            </div>
            <div className="flex-1">
              <h4 className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-system-accent mb-2">Monitor de Insights Meso</h4>
              <p className="text-xs font-mono text-idm-ink/80 leading-relaxed uppercase">
                {insight}
              </p>
            </div>
          </div>
          {/* Decorative elements */}
          <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
            <Atom size={120} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const ThesisDrawer = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
          />
          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl z-[101] overflow-y-auto"
          >
            <div className="p-12">
              <div className="flex justify-between items-center mb-12">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-system-accent/10 rounded-xl">
                    <HelpCircle size={24} className="text-system-accent" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-mono font-bold uppercase tracking-tighter text-idm-ink">Arquitecturas de la Temporalidad</h2>
                    <p className="text-[10px] font-mono text-idm-muted uppercase tracking-widest">Tesis Doctoral / Guía de Estudio</p>
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-black/5 rounded-full transition-colors"
                >
                  <X size={24} className="text-idm-ink" />
                </button>
              </div>

              <div className="space-y-12">
                {Object.entries(PEDAGOGY.macro).map(([key, section]: [string, any]) => (
                  <section key={key} className="space-y-4">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-[0.4em] text-system-accent border-b border-system-accent/20 pb-2">
                      {section.title.toUpperCase()}
                    </h3>
                    <div className="text-sm font-mono text-idm-ink/70 leading-relaxed uppercase space-y-4">
                      {section.content.split('\n\n').map((para, i) => (
                        <p key={i}>{para}</p>
                      ))}
                    </div>
                  </section>
                ))}
              </div>

              <div className="mt-24 pt-12 border-t border-black/5 text-center">
                <Atom size={48} className="mx-auto text-idm-ink/10 mb-4" />
                <p className="text-[9px] font-mono text-idm-muted uppercase tracking-[0.5em]">
                  Euclidean IDM Machine v1.0 / 2026
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export const EuclideanSequencer = () => {
  const [audioContextState, setAudioContextState] = useState<string>('suspended');

  useEffect(() => {
    const updateState = () => setAudioContextState(Tone.getContext().state);
    Tone.getContext().on('statechange', updateState);
    updateState();
    return () => { Tone.getContext().off('statechange', updateState); };
  }, []);

  const handleStartAudio = async () => {
    await Tone.start();
    await Tone.getContext().resume();
    setAudioContextState(Tone.getContext().state);
  };
  const [bpm, setBpm] = useState(120);
  const [showMM, setShowMM] = useState(false);
  const [mmHistory, setMmHistory] = useState<Array<{
    fromBpm: number;
    toBpm: number;
    ratio: string;
    label: string;
    timestamp: string;
  }>>([]);
  const [jitter, setJitter] = useState(0);
  const [swing, setSwing] = useState(0);
  const [dynamics, setDynamics] = useState(50);
  const [delayMix, setDelayMix] = useState(0.2);
  const [delayFeedback, setDelayFeedback] = useState(0.3);
  const [reverbMix, setReverbMix] = useState(0.15);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showVisuals, setShowVisuals] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [showSync, setShowSync] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [isDjMode, setIsDjMode] = useState(false);
  const [isStudyMode, setIsStudyMode] = useState(false);
  const [studyVoice, setStudyVoice] = useState<PedagogyVoice>('technical');
  const [isThesisOpen, setIsThesisOpen] = useState(false);
  const [hoveredGlobalParam, setHoveredGlobalParam] = useState<string | null>(null);
  const [hoveredGlobalEl, setHoveredGlobalEl] = useState<HTMLElement | null>(null);
  const [globalStep, setGlobalStep] = useState(0);
  const [lastHit, setLastHit] = useState<{ offset: number; color: string; velocity: number; id?: number } | null>(null);
  const [hoveredPreset, setHoveredPreset] = useState<ScenePreset | null>(null);
  const [eclipseFlash, setEclipseFlash] = useState(false);
  const eclipseRef = useRef(false);
  const [syncAnalysisOpen, setSyncAnalysisOpen] = useState(false);
  const eclipseHistoryRef = useRef<{ time: string; mcm: number; bpm: number }[]>([]);
  const PHASE_BUFFER_SIZE = 128;
  const phaseBufferRef = useRef<number[]>([]);
  const phaseBufferHeadRef = useRef(0);
  const [showEngine, setShowEngine] = useState(false);
  const [showPatternSpace, setShowPatternSpace] = useState(false);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const engineLogRef = useRef<LogEntry[]>([]);
  const [engineLog, setEngineLog] = useState<LogEntry[]>([]);
  const sliderDragRef = useRef<{ [key: string]: { value: number; timer: ReturnType<typeof setTimeout> | null } }>({});
  const [userPresets, setUserPresets] = useState<UserPreset[]>(() => loadUserPresets());
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [temporalityMode, setTemporalityMode] = useState<TemporalityMode>('grid');
  const temporalityModeRef = useRef<TemporalityMode>('grid');
  useEffect(() => { temporalityModeRef.current = temporalityMode; }, [temporalityMode]);

  // ── Change 2: Track collapse ──
  const [expandedTrack, setExpandedTrack] = useState<string | null>('kick');
  const handleToggleTrack = useCallback((trackId: string) => {
    setExpandedTrack(prev => prev === trackId ? null : trackId);
  }, []);

  // ── Change 6: Song Mode state ──
  const [songModeEnabled, setSongModeEnabled] = useState(false);
  const [songModeView, setSongModeView] = useState<'performance' | 'chain'>('performance');
  const [syncAllScenes, setSyncAllScenes] = useState(false);
  const [chain, setChain] = useState<Array<{ scene: number; cycles: number }>>([
    { scene: 1, cycles: 4 },
    { scene: 2, cycles: 2 },
  ]);
  const [chainPosition, setChainPosition] = useState(0);

  const logChange = useCallback((action: string, deltas: string[] = []) => {
    const now = new Date();
    const timestamp = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const entry: LogEntry = { timestamp, action, deltas };
    engineLogRef.current = [entry, ...engineLogRef.current].slice(0, 50);
  }, []);

  const logSliderChange = useCallback((key: string, label: string, currentVal: number, newVal: number, unit: string, computeDeltas?: (oldVal: number, newVal: number) => string[]) => {
    const drag = sliderDragRef.current[key];
    if (!drag) {
      sliderDragRef.current[key] = { value: currentVal, timer: null };
    }
    const startVal = sliderDragRef.current[key].value;
    if (sliderDragRef.current[key].timer) clearTimeout(sliderDragRef.current[key].timer!);
    sliderDragRef.current[key].timer = setTimeout(() => {
      if (startVal !== newVal) {
        const deltas = computeDeltas ? computeDeltas(startVal, newVal) : [];
        logChange(`${label} ${startVal}${unit} → ${newVal}${unit}`, deltas);
      }
      sliderDragRef.current[key] = { value: newVal, timer: null };
    }, 500);
  }, [logChange]);

  const METRIC_MODULATION_RATIOS = useMemo(() => [
    { ratio: 3/2,  label: '3:2',  description: 'tresillos → beat  ×1.5' },
    { ratio: 4/3,  label: '4:3',  description: 'semicorcheas → tresillos  ×1.33' },
    { ratio: 5/4,  label: '5:4',  description: 'quintillos → beat  ×1.25' },
    { ratio: 2/3,  label: '2:3',  description: 'beat → tresillos  ×0.67' },
    { ratio: 3/4,  label: '3:4',  description: 'tresillos → semicorcheas  ×0.75' },
    { ratio: 4/5,  label: '4:5',  description: 'beat → quintillos  ×0.80' },
  ], []);

  const handleMetricModulation = useCallback((ratio: number, label: string, description: string) => {
    const fromBpm = bpm;
    const rawBpm = fromBpm * ratio;
    const toBpm = Math.round(Math.max(40, Math.min(240, rawBpm)));
    setBpm(toBpm);
    const now = new Date();
    const timestamp = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;
    setMmHistory(prev => [{
      fromBpm,
      toBpm,
      ratio: label,
      label: description,
      timestamp
    }, ...prev].slice(0, 5));
    logChange(`MM ${label}: ${fromBpm} → ${toBpm} BPM`, [description]);
  }, [bpm, logChange]);

  const handleMetricModulationReset = useCallback((targetBpm: number) => {
    setBpm(targetBpm);
    setMmHistory([]);
    logChange(`MM Reset → ${targetBpm} BPM`, []);
  }, [logChange]);
  const sliceBoundariesRef = useRef<Record<string, Array<{ start: number; end: number }>>>({});

  const recalculateSlices = useCallback((track: TrackState) => {
    if (!track.samplerBuffer || !track.sliceCount) return;
    sliceBoundariesRef.current[track.id] = calculateSliceBoundaries(
      track.samplerBuffer,
      track.sliceCount
    );
    setTracks(prev => prev.map(t =>
      t.id === track.id ? {
        ...t,
        sliceOrder: defaultSliceOrder(track.sliceCount!),
        sliceReverse: defaultSliceReverse(track.sliceCount!),
        slicePitch: defaultSlicePitch(track.sliceCount!)
      } : t
    ));
  }, []);

  useEffect(() => {
    if (!showEngine) return;
    const interval = setInterval(() => {
      setEngineLog([...engineLogRef.current]);
    }, 500);
    return () => clearInterval(interval);
  }, [showEngine]);

  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    if (latest > 150) {
      setIsHeaderVisible(false);
    } else if (latest < 10) {
      setIsHeaderVisible(true);
    }
  });
  
  // Update Patterns (Atomic inside handlers now)
  const updateTrackPattern = (t: TrackState): TrackState => {
    const mode = t.patternMode ?? 'euclidean';

    if (mode === 'lsystem') {
      const pattern = generateLSystem(
        t.lsSeed ?? 'X',
        t.lsRuleA ?? 'XO',
        t.lsIterations ?? 3,
        t.steps,
        t.lsRotation ?? 0
      );
      return { ...t, pattern };
    }

    if (mode === 'ca') {
      const existing = caStateRef.current[t.id];
      const { pattern, newState } = generateCAPattern(
        t.caRule ?? 30,
        t.caSeed ?? 'center',
        t.steps,
        t.caDensity ?? 50,
        existing
      );
      caStateRef.current[t.id] = newState;
      return { ...t, pattern };
    }

    // default: euclidean
    const p = bjorklund(t.pulses, t.steps);
    // No longer rotating the pattern physically. 
    // The offset will be handled by the playhead (globalStep + offset).
    return { ...t, pattern: p };
  };

  const updateMarkovMatrix = useCallback((t: TrackState) => {
    if (!t.isTonal || (t.noteMode ?? 'euclidean') !== 'markov') return;
    const unique = [...new Set(t.noteIndices)].sort((a, b) => a - b);
    if (unique.length === 0) return;
    markovNotesRef.current[t.id] = unique;
    markovMatrixRef.current[t.id] = generateMarkovMatrix(
      unique,
      (t.markovStyle ?? 'scale') as MarkovStyle,
      t.markovTemperature ?? 40
    );
    markovLastNoteRef.current[t.id] = 0;
    markovAnchorCountRef.current[t.id] = 0;
  }, []);
  const [tracks, setTracks] = useState<TrackState[]>(() => [
    updateTrackPattern({ 
      id: 'kick', name: 'Kick', color: '#166534', pulses: 4, steps: 16, offset: 0, 
      probabilities: new Array(64).fill(1), pattern: [],
      samplerBuffer: null, samplerStatus: 'IDLE', samplerFilename: null,
      sampleStart: 0, sampleEnd: 1, attack: 0, decay: 200, mode: 'TRIGGER', pitch: 0, normalize: true,
      grainSize: 100, overlap: 0.1, spray: 0, bitCrush: 16,
      chaosEnabled: false, entropy: 1, evolveEnabled: false, mutationRate: 0.05, mutationSpeed: 1,
      isMuted: false, isSoloed: false, volume: 0.8, delaySend: 0, reverbSend: 0, ratchet: 0,
      isTonal: false, rootNote: 48, scaleId: 'phrygianDominant', octaveRange: 2, noteIndices: new Array(64).fill(0), synthType: 'mono',
      hits: 0, misses: 0, activeScene: 0, scenes: new Array(8).fill(null), activeAdvancedPanel: null
    }),
    updateTrackPattern({ 
      id: 'snare', name: 'Snare', color: '#9D174D', pulses: 2, steps: 16, offset: 4, 
      probabilities: new Array(64).fill(1), pattern: [],
      samplerBuffer: null, samplerStatus: 'IDLE', samplerFilename: null,
      sampleStart: 0, sampleEnd: 1, attack: 0, decay: 200, mode: 'TRIGGER', pitch: 0, normalize: true,
      grainSize: 100, overlap: 0.1, spray: 0, bitCrush: 16,
      chaosEnabled: false, entropy: 1, evolveEnabled: false, mutationRate: 0.05, mutationSpeed: 1,
      isMuted: false, isSoloed: false, volume: 0.8, delaySend: 0, reverbSend: 0, ratchet: 0,
      isTonal: false, rootNote: 48, scaleId: 'phrygianDominant', octaveRange: 2, noteIndices: new Array(64).fill(0), synthType: 'mono',
      hits: 0, misses: 0, activeScene: 0, scenes: new Array(8).fill(null), activeAdvancedPanel: null
    }),
    updateTrackPattern({ 
      id: 'hat', name: 'Hi-Hat', color: '#155E75', pulses: 8, steps: 16, offset: 2, 
      probabilities: new Array(64).fill(1), pattern: [],
      samplerBuffer: null, samplerStatus: 'IDLE', samplerFilename: null,
      sampleStart: 0, sampleEnd: 1, attack: 0, decay: 100, mode: 'TRIGGER', pitch: 0, normalize: true,
      grainSize: 50, overlap: 0.2, spray: 0, bitCrush: 16,
      chaosEnabled: false, entropy: 1, evolveEnabled: false, mutationRate: 0.05, mutationSpeed: 1,
      isMuted: false, isSoloed: false, volume: 0.8, delaySend: 0, reverbSend: 0, ratchet: 0,
      isTonal: false, rootNote: 48, scaleId: 'phrygianDominant', octaveRange: 2, noteIndices: new Array(64).fill(0), synthType: 'mono',
      hits: 0, misses: 0, activeScene: 0, scenes: new Array(8).fill(null), activeAdvancedPanel: null
    }),
    updateTrackPattern({ 
      id: 'cloud', name: 'Atmosphere', color: '#5B21B6', pulses: 4, steps: 16, offset: 0, 
      probabilities: new Array(64).fill(1), pattern: [],
      samplerBuffer: null, samplerStatus: 'IDLE', samplerFilename: null,
      sampleStart: 0, sampleEnd: 1, attack: 2000, decay: 5000, mode: 'TRIGGER', pitch: 0, normalize: true,
      grainSize: 500, overlap: 0.5, spray: 200, bitCrush: 16,
      chaosEnabled: false, entropy: 1, evolveEnabled: false, mutationRate: 0.05, mutationSpeed: 1,
      isMuted: false, isSoloed: false, volume: 0.8, delaySend: 0, reverbSend: 0, ratchet: 0,
      isTonal: false, rootNote: 48, scaleId: 'phrygianDominant', octaveRange: 2, noteIndices: new Array(64).fill(0), synthType: 'mono',
      cloudMode: 'granular' as const, enoSpeed: 1.0,
      hits: 0, misses: 0, activeScene: 0, scenes: new Array(8).fill(null), activeAdvancedPanel: null
    }),
    updateTrackPattern({ 
      id: 'tone', name: 'Tone', color: '#B45309', pulses: 3, steps: 8, offset: 0, 
      probabilities: new Array(64).fill(1), pattern: [],
      samplerBuffer: null, samplerStatus: 'IDLE', samplerFilename: null,
      sampleStart: 0, sampleEnd: 1, attack: 0, decay: 300, mode: 'TRIGGER', pitch: 0, normalize: true,
      grainSize: 100, overlap: 0.1, spray: 0, bitCrush: 16,
      chaosEnabled: false, entropy: 1, evolveEnabled: false, mutationRate: 0.05, mutationSpeed: 1,
      isMuted: false, isSoloed: false, volume: 0.7, delaySend: 0.15, reverbSend: 0.2, ratchet: 0,
      isTonal: true, rootNote: 48, scaleId: 'phrygianDominant', octaveRange: 2, noteIndices: new Array(64).fill(0), synthType: 'mono',
      fmRatio: 2, fmIndex: 10,
      wfAmount: 3, wfSymmetry: 0,
      addPartials: 4, addBrightness: 0.5,
      arRate: 80, arDepth: 0,
      hits: 0, misses: 0, activeScene: 0, scenes: new Array(8).fill(null), activeAdvancedPanel: null
    }),
  ]);

  const synthsRef = useRef<{ [key: string]: any }>({});
  const loopRef = useRef<Tone.Loop | null>(null);
  const tracksRef = useRef(tracks);
  const jitterRef = useRef(jitter);
  const swingRef = useRef(swing);
  const dynamicsRef = useRef(dynamics);
  const globalStepRef = useRef(0);
  const currentStepsRef = useRef<{ [key: string]: number }>({});
  const statsRef = useRef<{ [key: string]: { hits: number, misses: number, cycleCount: number, lastGhostStep: number | null } }>({});
  const [uiStats, setUiStats] = useState<{ [key: string]: { hits: number, misses: number, cycleCount: number } }>({});
  const lastScheduledTimesRef = useRef<{ [key: string]: number }>({});
  const stepIndicesRef = useRef<{ [key: string]: number }>({});
  const pendingMutationsRef = useRef<{ [trackId: string]: number[] }>({});
  const caStateRef = useRef<Record<string, number[]>>({});
  const caEvolveCycleRef = useRef<Record<string, number>>({});
  const pendingCARef = useRef<Record<string, number[]>>({});
  const rrNoteIndexRef = useRef<Record<string, number>>({});
  // Markov refs
  const markovLastNoteRef = useRef<Record<string, number>>({});
  const markovAnchorCountRef = useRef<Record<string, number>>({});
  const markovMatrixRef = useRef<Record<string, number[][]>>({});
  const markovNotesRef = useRef<Record<string, number[]>>({});
  const driftAccumulatorRef = useRef<Record<string, number>>({});
  const [driftOffsets, setDriftOffsets] = useState<Record<string, number>>({});
  // Lorenz Attractor refs
  const lorenzAttractorsRef = useRef<Record<string, LorenzAttractor>>({});
  const lorenzRafRef = useRef<number>(0);
  // Refs para grabación en tiempo real del track Tone
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const toneFilterRef = useRef<Tone.Filter | null>(null);
  const lastRecordedBufferRef = useRef<AudioBuffer | null>(null);
  const globalRecordingDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const globalRecordingChunksRef = useRef<Blob[]>([]);
  const globalMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [globalRecordingState, setGlobalRecordingState] = 
    useState<'idle' | 'armed' | 'recording'>('idle');
  const cloudRecordingDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const cloudRecordingChunksRef = useRef<Blob[]>([]);
  const cloudMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [cloudRecordingState, setCloudRecordingState] = 
    useState<'idle' | 'armed' | 'recording'>('idle');
  const [toneRecordingState, setToneRecordingState] = useState<'idle' | 'armed' | 'recording'>('idle');

  const masterBusRef = useRef<{ 
    compressor: Tone.Compressor; 
    limiter: Tone.Limiter; 
    analyser: Tone.Analyser;
    delay: Tone.FeedbackDelay;
    reverb: Tone.Reverb;
    delayFilter: Tone.Filter;
    reverbFilter: Tone.Filter;
    delayBus: Tone.Gain;
    reverbBus: Tone.Gain;
    spectralDelayBus: Tone.Gain;
    freezeBus: Tone.Gain;
    reverseBus: Tone.Gain;
  } | null>(null);

  // Spectral Delay global state (Phase 7C)
  const [spectralDelayEnabled, setSpectralDelayEnabled] = useState(false);

  // Freeze Reverb global state (Phase 9)
  const [freezeEnabled, setFreezeEnabled] = useState(false);
  const [freezeFeedback, setFreezeFeedback] = useState(0.95);
  const [freezeFilterFreq, setFreezeFilterFreq] = useState(6000);
  const freezeRef = useRef<{ bus: Tone.Gain; delay: Tone.Delay; filter: Tone.Filter; feedbackGain: Tone.Gain; out: Tone.Gain } | null>(null);

  // Reverse Reverb global state (Phase 9)
  const [reverseEnabled, setReverseEnabled] = useState(false);
  const [reverseDecay, setReverseDecay] = useState(2.5);
  const reverseRef = useRef<{
    bus: Tone.Gain;
    convolver: Tone.Convolver;
    out: Tone.Gain;
  } | null>(null);

  // Gated Reverb global state (Phase 9)
  const [gatedEnabled, setGatedEnabled] = useState(false);
  const [gatedThreshold, setGatedThreshold] = useState(-40);
  const gatedRef = useRef<{ gate: Tone.Gate; out: Tone.Gain; reverbNormalOut: Tone.Gain } | null>(null);
  const [spectralDelayWet, setSpectralDelayWet] = useState(0.5);
  const [spectralDelayLowTime, setSpectralDelayLowTime] = useState(0);
  const [spectralDelayMidTime, setSpectralDelayMidTime] = useState(80);
  const [spectralDelayHighTime, setSpectralDelayHighTime] = useState(160);
  const [spectralDelayLowFreq, setSpectralDelayLowFreq] = useState(200);
  const [spectralDelayHighFreq, setSpectralDelayHighFreq] = useState(4000);

  // Active FX panel in Controls column (only one visible at a time)
  const [activeFxPanel, setActiveFxPanel] = useState<'GRV' | 'RVR' | 'FRZ' | 'XFD' | 'SDLY' | null>(null);

  // Envelope Crossfeed global state (Phase 7E)
  const [crossfeedEnabled, setCrossfeedEnabled] = useState(false);
  const [crossfeedDepth, setCrossfeedDepth] = useState(2000);
  const [crossfeedBase, setCrossfeedBase] = useState(400);
  const cloudAnalyserRef = useRef<Tone.Analyser | null>(null);
  const crossfeedEnabledRef = useRef(false);
  const crossfeedBaseRef = useRef(400);
  const crossfeedDepthRef = useRef(2000);
  const spectralDelayRef = useRef<{
    bus: Tone.Gain;
    out: Tone.Gain;
    lowFilter: Tone.Filter;
    midFilter: Tone.Filter;
    highFilter: Tone.Filter;
    lowDelay: Tone.Delay;
    midDelay: Tone.Delay;
    highDelay: Tone.Delay;
  } | null>(null);

  const [globalAnalyser, setGlobalAnalyser] = useState<Tone.Analyser | null>(null);
  const [fxHighPass, setFxHighPass] = useState(20); // Low-cut
  const [fxLowPass, setFxLowPass] = useState(20000); // High-cut
  
  useEffect(() => { 
    tracksRef.current = tracks;
    // Initialize refs if they are empty
    tracks.forEach(t => {
      if (!(t.id in lastScheduledTimesRef.current)) {
        lastScheduledTimesRef.current[t.id] = 0;
      }
      if (!(t.id in stepIndicesRef.current)) {
        stepIndicesRef.current[t.id] = 0;
      }
      if (!(t.id in currentStepsRef.current)) {
        currentStepsRef.current[t.id] = -1;
      }
      if (!(t.id in statsRef.current)) {
        statsRef.current[t.id] = { hits: 0, misses: 0, cycleCount: 0, lastGhostStep: null };
      }
    });
  }, [tracks]);
  useEffect(() => { jitterRef.current = jitter; }, [jitter]);
  useEffect(() => { swingRef.current = swing; }, [swing]);
  useEffect(() => { dynamicsRef.current = dynamics; }, [dynamics]);

  // High-performance DOM highlighting and stats update
  useEffect(() => {
    let rafId: number;
    const updateDOM = () => {
      if (isPlaying) {
        Object.entries(currentStepsRef.current).forEach(([trackId, stepIdx]) => {
          const steps = document.querySelectorAll(`.step-container[data-track-id="${trackId}"]`);
          steps.forEach((step, i) => {
            if (i === stepIdx) step.classList.add('is-current-step');
            else step.classList.remove('is-current-step');
          });
        });
      } else {
        document.querySelectorAll('.is-current-step').forEach(el => el.classList.remove('is-current-step'));
      }
      rafId = requestAnimationFrame(updateDOM);
    };
    rafId = requestAnimationFrame(updateDOM);

    const statsInterval = setInterval(() => {
      const newStats: { [key: string]: { hits: number, misses: number, cycleCount: number } } = {};
      Object.entries(statsRef.current).forEach(([id, s]) => {
        const stats = s as { hits: number, misses: number, cycleCount: number };
        newStats[id] = { hits: stats.hits, misses: stats.misses, cycleCount: stats.cycleCount };
      });
      setUiStats(newStats);

      // Sincronizar driftOffsets para visualizadores
      const newDriftOffsets: Record<string, number> = {};
      tracksRef.current.forEach(t => {
        if (t.driftEnabled) {
          newDriftOffsets[t.id] = Math.floor(driftAccumulatorRef.current[t.id] ?? 0);
        }
      });
      setDriftOffsets(newDriftOffsets);

      // Flush pending evolve mutations to React state (max 1 setTracks per 100ms)
      const mutations = pendingMutationsRef.current;
      const caPatterns = pendingCARef.current;
      const mutationKeys = Object.keys(mutations);
      const caKeys = Object.keys(caPatterns);
      if (mutationKeys.length > 0 || caKeys.length > 0) {
        pendingMutationsRef.current = {};
        pendingCARef.current = {};
        setTracks(prev => prev.map(t => {
          let updated = t;
          if (mutations[t.id]) {
            updated = { ...updated, probabilities: mutations[t.id] };
          }
          if (caPatterns[t.id]) {
            updated = { ...updated, pattern: caPatterns[t.id] };
          }
          return updated;
        }));
      }
    }, 100);

    return () => {
      cancelAnimationFrame(rafId);
      clearInterval(statsInterval);
    };
  }, [isPlaying]);

  useEffect(() => {
    tracks.forEach(t => {
      const synth = synthsRef.current[t.id];
      if (synth && synth.setVolume) {
        synth.setVolume(t.volume);
      }
    });
  }, [tracks.map(t => `${t.id}:${t.volume}`).join('|')]);

  useEffect(() => {
    tracks.forEach(t => {
      const synth = synthsRef.current[t.id];
      if (synth && synth.setSends) {
        synth.setSends(t.delaySend, t.reverbSend);
      }
    });
  }, [tracks.map(t => `${t.id}:${t.delaySend}:${t.reverbSend}`).join('|')]);

  useEffect(() => {
    if (masterBusRef.current) {
      masterBusRef.current.reverbFilter.frequency.rampTo(fxHighPass, 0.05);
      masterBusRef.current.delayFilter.frequency.rampTo(fxLowPass, 0.05);
    }
  }, [fxHighPass, fxLowPass]);

  const previewPatterns = useMemo(() => {
    if (!hoveredPreset) return null;
    const previews: Record<string, number[]> = {};
    
    if (hoveredPreset.type === 'master' && hoveredPreset.tracks) {
      Object.entries(hoveredPreset.tracks).forEach(([id, config]) => {
        const track = tracks.find(t => t.id === id);
        if (track) {
          const trackConfig = config as TrackPreset;
          const steps = trackConfig.steps ?? track.steps;
          const pulses = trackConfig.pulses ?? track.pulses;
          const offset = trackConfig.offset ?? track.offset;
          previews[id] = rotate(bjorklund(pulses, steps), offset);
        }
      });
    } else if (hoveredPreset.type === 'atomic' && hoveredPreset.config) {
      // For atomic presets, show the preview on all tracks to visualize geometry
      const { pulses, steps, offset } = hoveredPreset.config;
      const pattern = rotate(bjorklund(pulses || 0, steps || 16), offset || 0);
      tracks.forEach(track => {
        previews[track.id] = pattern;
      });
    }
    
    return previews;
  }, [hoveredPreset, tracks]);

  const applyPreset = (preset: ScenePreset) => {
    setActivePresetId(preset.id);
    if (preset.type === 'master' && preset.tracks) {
      // Compute MCM for the new preset
      const newSteps = Object.entries(preset.tracks)
        .filter(([id]) => id !== 'cloud')
        .map(([id, config]) => {
          const tc = config as TrackPreset;
          const t = tracks.find(tr => tr.id === id);
          return tc.steps ?? t?.steps ?? 16;
        });
      const newMcm = newSteps.length > 0 ? lcmArray(newSteps) : mcm;
      const deltas = [`MCM:${newMcm}`];
      if (preset.bpm) deltas.push(`BPM:${preset.bpm}`);
      logChange(`Preset: ${preset.name}`, deltas);

      if (preset.bpm) setBpm(preset.bpm);
      setMmHistory([]);
      
      // Macro Interpolation (50ms ramp)
      if (preset.jitter !== undefined) setJitter(preset.jitter);
      if (preset.swing !== undefined) setSwing(preset.swing);
      if (preset.dynamics !== undefined) setDynamics(preset.dynamics);

      // Temporality mode: reset to grid for presets that don't specify
      if (preset.temporalityMode) {
        setTemporalityMode(preset.temporalityMode as TemporalityMode);
      } else {
        setTemporalityMode('grid');
      }

      setTracks(prev => prev.map(t => {
        const config = preset.tracks![t.id];
        if (!config) return t;

        let newTrack = { ...t };
        if (config.steps !== undefined) newTrack.steps = config.steps;
        if (config.pulses !== undefined) newTrack.pulses = config.pulses;
        if (config.offset !== undefined) newTrack.offset = config.offset;

        // Ratchet
        if (config.ratchet !== undefined) newTrack.ratchet = config.ratchet;

        // Chaos
        if (config.chaosEnabled !== undefined) newTrack.chaosEnabled = config.chaosEnabled;
        else newTrack.chaosEnabled = false;
        if (config.entropy !== undefined) newTrack.entropy = config.entropy;

        // Evolve
        if (config.evolveEnabled !== undefined) newTrack.evolveEnabled = config.evolveEnabled;
        else newTrack.evolveEnabled = false;
        if (config.mutationRate !== undefined) newTrack.mutationRate = config.mutationRate;
        if (config.mutationSpeed !== undefined) newTrack.mutationSpeed = config.mutationSpeed;

        // Base probability → fill all steps
        if (config.baseProbability !== undefined) {
          newTrack.probabilities = new Array(64).fill(config.baseProbability);
        }

        // Volume & sends
        if (config.volume !== undefined) newTrack.volume = config.volume;
        if (config.delaySend !== undefined) newTrack.delaySend = config.delaySend;
        if (config.reverbSend !== undefined) newTrack.reverbSend = config.reverbSend;
        if (config.pan !== undefined) newTrack.pan = config.pan;
        if (config.freqShiftEnabled !== undefined) newTrack.freqShiftEnabled = config.freqShiftEnabled;
        if (config.freqShift !== undefined) newTrack.freqShift = config.freqShift;
        if ((config as any).spectralDelaySend !== undefined) newTrack.spectralDelaySend = (config as any).spectralDelaySend;
        if ((config as any).freezeSend !== undefined) newTrack.freezeSend = (config as any).freezeSend;
        if ((config as any).reverseSend !== undefined) newTrack.reverseSend = (config as any).reverseSend;
        if ((config as any).extremeLoopEnabled !== undefined) newTrack.extremeLoopEnabled = (config as any).extremeLoopEnabled;
        if ((config as any).extremeLoopSize !== undefined) newTrack.extremeLoopSize = (config as any).extremeLoopSize;
        if ((config as any).extremeLoopPoint !== undefined) newTrack.extremeLoopPoint = (config as any).extremeLoopPoint;

        // Tonal fields
        if (config.rootNote !== undefined) newTrack.rootNote = config.rootNote;
        if (config.scaleId !== undefined) newTrack.scaleId = config.scaleId;
        if (config.octaveRange !== undefined) newTrack.octaveRange = config.octaveRange;
        if (config.noteIndices !== undefined) newTrack.noteIndices = [...config.noteIndices];
        
        // Phase 8 — Percussive Synthesis fields
        if (config.kickPitchDecay !== undefined) newTrack.kickPitchDecay = config.kickPitchDecay;
        if (config.kickOctaves !== undefined) newTrack.kickOctaves = config.kickOctaves;
        if (config.kickDecay !== undefined) newTrack.kickDecay = config.kickDecay;
        if (config.kickClickType !== undefined) newTrack.kickClickType = config.kickClickType;
        if (config.hatMode !== undefined) newTrack.hatMode = config.hatMode;
        if (config.hatHarmonicity !== undefined) newTrack.hatHarmonicity = config.hatHarmonicity;
        if (config.hatModIndex !== undefined) newTrack.hatModIndex = config.hatModIndex;
        if (config.hatResonance !== undefined) newTrack.hatResonance = config.hatResonance;
        if (config.hatDecay !== undefined) newTrack.hatDecay = config.hatDecay;
        if (config.hatNoiseType !== undefined) newTrack.hatNoiseType = config.hatNoiseType;
        if (config.snareDecay !== undefined) newTrack.snareDecay = config.snareDecay;
        if (config.snareNoiseType !== undefined) newTrack.snareNoiseType = config.snareNoiseType;
        if (config.snareBodyEnabled !== undefined) newTrack.snareBodyEnabled = config.snareBodyEnabled;
        if (config.snareBodyPitch !== undefined) newTrack.snareBodyPitch = config.snareBodyPitch;
        if (config.snareBodyDecay !== undefined) newTrack.snareBodyDecay = config.snareBodyDecay;

        // Reset counters for fresh start
        newTrack.hits = 0;
        newTrack.misses = 0;

        return updateTrackPattern(newTrack);
      }));
    }
  };

  const injectPattern = (trackId: string, config: TrackPreset) => {
    setTracks(prev => prev.map(t => {
      if (t.id !== trackId) return t;
      
      let newTrack = { ...t };
      if (config.steps !== undefined) newTrack.steps = config.steps;
      if (config.pulses !== undefined) newTrack.pulses = config.pulses;
      if (config.offset !== undefined) newTrack.offset = config.offset;
      
      // Reset counters for the injected track
      newTrack.hits = 0;
      newTrack.misses = 0;
      
      return updateTrackPattern(newTrack);
    }));
  };

  // === User Presets ===
  const captureCurrentConfig = useCallback((name: string): UserPreset => {
    return {
      id: crypto.randomUUID(),
      name,
      createdAt: new Date().toISOString(),
      bpm, jitter, swing, dynamics, temporalityMode,
      tracks: Object.fromEntries(
        tracks.map(t => [t.id, {
          pulses: t.pulses, steps: t.steps, offset: t.offset,
          probabilities: [...t.probabilities],
          chaosEnabled: t.chaosEnabled, entropy: t.entropy,
          evolveEnabled: t.evolveEnabled, mutationRate: t.mutationRate, mutationSpeed: t.mutationSpeed,
          volume: t.volume, delaySend: t.delaySend, reverbSend: t.reverbSend, ratchet: t.ratchet,
          ...(t.isTonal ? { rootNote: t.rootNote, scaleId: t.scaleId, octaveRange: t.octaveRange, noteIndices: [...t.noteIndices], synthType: t.synthType, fmRatio: t.fmRatio, fmIndex: t.fmIndex, wfAmount: t.wfAmount, wfSymmetry: t.wfSymmetry, addPartials: t.addPartials, addBrightness: t.addBrightness, arRate: t.arRate, arDepth: t.arDepth, padVoices: t.padVoices, padDetune: t.padDetune, padAttack: t.padAttack, droneFeedback: t.droneFeedback, droneFilterFreq: t.droneFilterFreq, ksDecay: t.ksDecay, ksBrightness: t.ksBrightness, modalBody: t.modalBody, modalDecay: t.modalDecay, ambientVolume: t.ambientVolume, ambientSpeed: t.ambientSpeed } : {}),
          ...(t.id === 'cloud' ? { cloudMode: t.cloudMode, enoSpeed: t.enoSpeed } : {}),
          rrEnabled: t.rrEnabled,
          rrAmount: t.rrAmount,
          driftEnabled: t.driftEnabled,
          driftRate: t.driftRate,
          // Markov
          noteMode: t.noteMode,
          markovStyle: t.markovStyle,
          markovTemperature: t.markovTemperature,
          markovMemory: t.markovMemory,
          markovAnchor: t.markovAnchor,
          // Pattern mode
          patternMode: t.patternMode,
          lsSeed: t.lsSeed,
          lsRuleA: t.lsRuleA,
          lsIterations: t.lsIterations,
          lsRotation: t.lsRotation,
          caRule: t.caRule,
          caSeed: t.caSeed,
          caDensity: t.caDensity,
          caSpeed: t.caSpeed,
          // Layer 2 (solo parámetros, no buffer)
          layer2Filename: t.layer2Filename,
          layer2Blend: t.layer2Blend,
          layer2Pitch: t.layer2Pitch,
          layer2Offset: t.layer2Offset,
          layer2FilterFreq: t.layer2FilterFreq,
          layer2Reverse: t.layer2Reverse,
          layer2StretchEnabled: t.layer2StretchEnabled,
          layer2StretchRate: t.layer2StretchRate,
          // Lorenz + Nested LFO
          lorenzEnabled: t.lorenzEnabled,
          lorenzDepth: t.lorenzDepth,
          lorenzTarget: t.lorenzTarget,
          lorenzSpeed: t.lorenzSpeed,
          nestedLfoEnabled: t.nestedLfoEnabled,
          nestedLfoRate1: t.nestedLfoRate1,
          nestedLfoRate2: t.nestedLfoRate2,
          nestedLfoDepth: t.nestedLfoDepth,
          // Slicer
          slicerEnabled: t.slicerEnabled,
          sliceCount: t.sliceCount,
          // Time Stretch
          stretchEnabled: t.stretchEnabled,
          stretchRate: t.stretchRate,
          // EQ
          eqEnabled: t.eqEnabled,
          eqHpfFreq: t.eqHpfFreq,
          eqLpfFreq: t.eqLpfFreq,
          pan: t.pan,
          freqShiftEnabled: t.freqShiftEnabled,
          freqShift: t.freqShift,
          spectralDelaySend: t.spectralDelaySend,
          mode: t.mode,
          freezeSend: t.freezeSend,
          reverseSend: t.reverseSend,
          extremeLoopEnabled: t.extremeLoopEnabled,
          extremeLoopSize: t.extremeLoopSize,
          extremeLoopPoint: t.extremeLoopPoint,
          binauralEnabled: t.binauralEnabled,
          binauralAzimuth: t.binauralAzimuth,
          binauralDistance: t.binauralDistance,
          // Phase 8 — Percussive Synthesis
          ...(t.id === 'kick' ? { kickPitchDecay: t.kickPitchDecay, kickOctaves: t.kickOctaves, kickDecay: t.kickDecay, kickClickType: t.kickClickType } : {}),
          ...(t.id === 'hat' ? { hatMode: t.hatMode, hatHarmonicity: t.hatHarmonicity, hatModIndex: t.hatModIndex, hatResonance: t.hatResonance, hatDecay: t.hatDecay, hatNoiseType: t.hatNoiseType } : {}),
          ...(t.id === 'snare' ? { snareDecay: t.snareDecay, snareNoiseType: t.snareNoiseType, snareBodyEnabled: t.snareBodyEnabled, snareBodyPitch: t.snareBodyPitch, snareBodyDecay: t.snareBodyDecay } : {}),
        }])
      ),
    };
  }, [bpm, jitter, swing, dynamics, temporalityMode, tracks]);

  const handleSaveUserPreset = useCallback(() => {
    if (!newPresetName.trim()) return;
    const preset = captureCurrentConfig(newPresetName.trim());
    const updated = [...userPresets, preset];
    setUserPresets(updated);
    saveUserPresets(updated);
    setNewPresetName('');
    setIsSavingPreset(false);
    logChange(`User Preset guardado: ${preset.name}`);
  }, [newPresetName, captureCurrentConfig, userPresets, logChange]);

  const handleDeleteUserPreset = useCallback((id: string) => {
    const updated = userPresets.filter(p => p.id !== id);
    setUserPresets(updated);
    saveUserPresets(updated);
  }, [userPresets]);

  const handleExportCurrent = useCallback(() => {
    const preset = captureCurrentConfig('current-config');
    exportPresetAsJson(preset);
  }, [captureCurrentConfig]);

  const applyUserPreset = useCallback((up: UserPreset) => {
    setActivePresetId(up.id);
    setBpm(up.bpm);
    setMmHistory([]);
    setJitter(up.jitter);
    setSwing(up.swing);
    setDynamics(up.dynamics);
    if (up.temporalityMode) setTemporalityMode(up.temporalityMode as TemporalityMode);
    logChange(`User Preset: ${up.name}`, [`BPM:${up.bpm}`]);

    setTracks(prev => prev.map(t => {
      const config = up.tracks[t.id];
      if (!config) return t;
      return updateTrackPattern({
        ...t,
        pulses: config.pulses,
        steps: config.steps,
        offset: config.offset,
        probabilities: [...config.probabilities],
        chaosEnabled: config.chaosEnabled,
        entropy: config.entropy,
        evolveEnabled: config.evolveEnabled,
        mutationRate: config.mutationRate,
        mutationSpeed: config.mutationSpeed,
        volume: config.volume,
        delaySend: config.delaySend,
        reverbSend: config.reverbSend,
        ratchet: config.ratchet ?? 0,
        ...(t.isTonal ? {
          rootNote: config.rootNote ?? t.rootNote,
          scaleId: config.scaleId ?? t.scaleId,
          octaveRange: config.octaveRange ?? t.octaveRange,
          noteIndices: config.noteIndices ? [...config.noteIndices] : t.noteIndices,
          synthType: config.synthType ?? t.synthType,
          fmRatio: config.fmRatio ?? t.fmRatio,
          fmIndex: config.fmIndex ?? t.fmIndex,
          wfAmount: config.wfAmount ?? t.wfAmount,
          wfSymmetry: config.wfSymmetry ?? t.wfSymmetry,
          addPartials: config.addPartials ?? t.addPartials,
          addBrightness: config.addBrightness ?? t.addBrightness,
          arRate: config.arRate ?? t.arRate,
          arDepth: config.arDepth ?? t.arDepth,
          padVoices: config.padVoices ?? t.padVoices,
          padDetune: config.padDetune ?? t.padDetune,
          padAttack: config.padAttack ?? t.padAttack,
          droneFeedback: config.droneFeedback ?? t.droneFeedback,
          droneFilterFreq: config.droneFilterFreq ?? t.droneFilterFreq,
          ksDecay: config.ksDecay ?? t.ksDecay,
          ksBrightness: config.ksBrightness ?? t.ksBrightness,
          modalBody: config.modalBody ?? t.modalBody,
          modalDecay: config.modalDecay ?? t.modalDecay,
          ambientVolume: config.ambientVolume ?? t.ambientVolume,
          ambientSpeed: config.ambientSpeed ?? t.ambientSpeed,
        } : {}),
        ...(t.id === 'cloud' ? {
          cloudMode: (config.cloudMode as 'granular' | 'eno') ?? t.cloudMode,
          enoSpeed: config.enoSpeed ?? t.enoSpeed,
        } : {}),
        rrEnabled: config.rrEnabled ?? false,
        rrAmount: config.rrAmount ?? 30,
        driftEnabled: config.driftEnabled ?? false,
        driftRate: config.driftRate ?? 0.01,
        // Markov
        noteMode: ((config as any).noteMode ?? 'euclidean') as 'euclidean' | 'markov',
        markovStyle: ((config as any).markovStyle ?? 'scale') as MarkovStyle,
        markovTemperature: (config as any).markovTemperature ?? 40,
        markovMemory: (config as any).markovMemory ?? 1,
        markovAnchor: (config as any).markovAnchor ?? 0,
        // Pattern mode
        patternMode: (config as any).patternMode ?? 'euclidean',
        lsSeed: (config as any).lsSeed ?? 'X',
        lsRuleA: (config as any).lsRuleA ?? 'XO',
        lsIterations: (config as any).lsIterations ?? 3,
        lsRotation: (config as any).lsRotation ?? 0,
        caRule: (config as any).caRule ?? 30,
        caSeed: (config as any).caSeed ?? 'center',
        caDensity: (config as any).caDensity ?? 50,
        caSpeed: (config as any).caSpeed ?? 1,
        // Layer 2 params (buffer NOT restored from preset)
        layer2Blend: config.layer2Blend ?? 0.8,
        layer2Pitch: config.layer2Pitch ?? 0,
        layer2Offset: config.layer2Offset ?? 0,
        layer2FilterFreq: config.layer2FilterFreq ?? 8000,
        layer2Reverse: config.layer2Reverse ?? false,
        layer2StretchEnabled: (config as any).layer2StretchEnabled ?? false,
        layer2StretchRate: (config as any).layer2StretchRate ?? 1.0,
        // Lorenz + Nested LFO
        lorenzEnabled: (config as any).lorenzEnabled ?? false,
        lorenzDepth: (config as any).lorenzDepth ?? 1000,
        lorenzTarget: (config as any).lorenzTarget ?? 'filter',
        lorenzSpeed: (config as any).lorenzSpeed ?? 1.0,
        nestedLfoEnabled: (config as any).nestedLfoEnabled ?? false,
        nestedLfoRate1: (config as any).nestedLfoRate1 ?? 0.1,
        nestedLfoRate2: (config as any).nestedLfoRate2 ?? 4.0,
        nestedLfoDepth: (config as any).nestedLfoDepth ?? 800,
        // Slicer: restore enabled/count only — order/reverse/pitch depend on buffer
        slicerEnabled: (config as any).slicerEnabled ?? false,
        sliceCount: (config as any).sliceCount ?? 16,
        // Time Stretch
        stretchEnabled: (config as any).stretchEnabled ?? false,
        stretchRate: (config as any).stretchRate ?? 1.0,
        // EQ
        eqEnabled: (config as any).eqEnabled ?? false,
        eqHpfFreq: (config as any).eqHpfFreq ?? 20,
        eqLpfFreq: (config as any).eqLpfFreq ?? 20000,
        pan: (config as any).pan ?? 0,
        freqShiftEnabled: (config as any).freqShiftEnabled ?? false,
        freqShift: (config as any).freqShift ?? 0,
        spectralDelaySend: (config as any).spectralDelaySend ?? 0,
        mode: ((config as any).mode ?? t.mode ?? 'TRIGGER') as 'GATE' | 'TRIGGER' | 'ONE-SHOT',
        freezeSend: (config as any).freezeSend ?? 0,
        reverseSend: (config as any).reverseSend ?? 0,
        extremeLoopEnabled: (config as any).extremeLoopEnabled ?? false,
        extremeLoopSize: (config as any).extremeLoopSize ?? 10,
        extremeLoopPoint: (config as any).extremeLoopPoint ?? 0.5,
        binauralEnabled: (config as any).binauralEnabled ?? false,
        binauralAzimuth: (config as any).binauralAzimuth ?? 0,
        binauralDistance: (config as any).binauralDistance ?? 3,
        // Phase 8 — Percussive Synthesis
        ...(t.id === 'kick' ? {
          kickPitchDecay: (config as any).kickPitchDecay ?? 0.05,
          kickOctaves: (config as any).kickOctaves ?? 10,
          kickDecay: (config as any).kickDecay ?? 0.4,
          kickClickType: (config as any).kickClickType ?? 'pink',
        } : {}),
        ...(t.id === 'hat' ? {
          hatMode: (config as any).hatMode ?? 'noise',
          hatHarmonicity: (config as any).hatHarmonicity ?? 5.1,
          hatModIndex: (config as any).hatModIndex ?? 32,
          hatResonance: (config as any).hatResonance ?? 4000,
          hatDecay: (config as any).hatDecay ?? 0.05,
          hatNoiseType: (config as any).hatNoiseType ?? 'white',
        } : {}),
        ...(t.id === 'snare' ? {
          snareDecay: (config as any).snareDecay ?? 0.2,
          snareNoiseType: (config as any).snareNoiseType ?? 'white',
          snareBodyEnabled: (config as any).snareBodyEnabled ?? false,
          snareBodyPitch: (config as any).snareBodyPitch ?? 180,
          snareBodyDecay: (config as any).snareBodyDecay ?? 0.1,
        } : {}),
        hits: 0,
        misses: 0,
      });
    }));
    // Apply EQ and Markov after state update
    setTimeout(() => {
      tracksRef.current.forEach(t => {
        // Restore EQ
        const config = up.tracks[t.id];
        if (config) {
          const hpf = (config as any).eqEnabled ? ((config as any).eqHpfFreq ?? 20) : 20;
          const lpf = (config as any).eqEnabled ? ((config as any).eqLpfFreq ?? 20000) : 20000;
          synthsRef.current[t.id]?.updateEq?.(hpf, lpf);
          // Restore pan and freqShift
          synthsRef.current[t.id]?.setPan?.((config as any).pan ?? 0);
          synthsRef.current[t.id]?.setFreqShift?.((config as any).freqShiftEnabled ? ((config as any).freqShift ?? 0) : 0, (config as any).freqShiftEnabled ?? false);
          synthsRef.current[t.id]?.setSpectralSend?.((config as any).spectralDelaySend ?? 0);
          synthsRef.current[t.id]?.setFreezeSend?.((config as any).freezeSend ?? 0);
          synthsRef.current[t.id]?.setReverseSend?.((config as any).reverseSend ?? 0);
          // Restore binaural
          synthsRef.current[t.id]?.switchBinaural?.((config as any).binauralEnabled ?? false);
          if ((config as any).binauralEnabled) {
            synthsRef.current[t.id]?.updateBinaural?.((config as any).binauralAzimuth ?? 0, (config as any).binauralDistance ?? 3);
          }
          // Phase 8 — Restore percussive synth params
          if (t.id === 'kick') {
            synthsRef.current.kick?.setKickParams?.(
              (config as any).kickPitchDecay ?? 0.05,
              (config as any).kickOctaves ?? 10,
              (config as any).kickDecay ?? 0.4,
              (config as any).kickClickType ?? 'pink'
            );
          }
          if (t.id === 'snare') {
            synthsRef.current.snare?.setSnareParams?.((config as any).snareDecay ?? 0.2, (config as any).snareNoiseType ?? 'white');
            synthsRef.current.snare?.setSnareBody?.((config as any).snareBodyEnabled ?? false, (config as any).snareBodyPitch ?? 180, (config as any).snareBodyDecay ?? 0.1);
          }
          if (t.id === 'hat') {
            synthsRef.current.hat?.setHatMode?.(
              (config as any).hatMode ?? 'noise',
              (config as any).hatHarmonicity ?? 5.1,
              (config as any).hatModIndex ?? 32,
              (config as any).hatResonance ?? 4000,
              (config as any).hatDecay ?? 0.05,
              (config as any).hatNoiseType ?? 'white'
            );
          }
        }
        // Recalcular matrices Markov para tracks tonales
        if (t.isTonal && (t.noteMode ?? 'euclidean') === 'markov') {
          updateMarkovMatrix(t);
        }
      });
    }, 0);
  }, [logChange, updateTrackPattern, updateMarkovMatrix]);

  const handleImportPreset = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const preset = await importPresetFromFile(file);
      const updated = [preset, ...userPresets];
      setUserPresets(updated);
      saveUserPresets(updated);
      setIsSavingPreset(false);
      applyUserPreset(preset);
      logChange(`User Preset importado y aplicado: ${preset.name}`);
    } catch (err: any) {
      setImportError(err.message || 'Error de importación');
    }

    // Reset input so same file can be re-imported
    if (importInputRef.current) importInputRef.current.value = '';
  }, [userPresets, logChange, applyUserPreset]);

  // Spectral Delay bus real-time sync
  useEffect(() => {
    const sd = spectralDelayRef.current;
    if (!sd) return;
    sd.out.gain.rampTo(spectralDelayEnabled ? spectralDelayWet : 0, 0.1);
    sd.lowDelay.delayTime.rampTo(spectralDelayLowTime / 1000, 0.1);
    sd.midDelay.delayTime.rampTo(spectralDelayMidTime / 1000, 0.1);
    sd.highDelay.delayTime.rampTo(spectralDelayHighTime / 1000, 0.1);
    sd.lowFilter.frequency.rampTo(spectralDelayLowFreq, 0.1);
    sd.highFilter.frequency.rampTo(spectralDelayHighFreq, 0.1);
    sd.midFilter.frequency.rampTo(Math.sqrt(spectralDelayLowFreq * spectralDelayHighFreq), 0.1);
  }, [spectralDelayEnabled, spectralDelayWet, spectralDelayLowTime, spectralDelayMidTime, spectralDelayHighTime, spectralDelayLowFreq, spectralDelayHighFreq]);

  // Keep crossfeed refs in sync with state
  useEffect(() => { crossfeedEnabledRef.current = crossfeedEnabled; }, [crossfeedEnabled]);
  useEffect(() => { crossfeedBaseRef.current = crossfeedBase; }, [crossfeedBase]);
  useEffect(() => { crossfeedDepthRef.current = crossfeedDepth; }, [crossfeedDepth]);

  // Crossfeed interval: Cloud envelope → Tone filter (Phase 7E)
  useEffect(() => {
    if (!crossfeedEnabled) return;
    const interval = setInterval(() => {
      if (!crossfeedEnabledRef.current) return;
      const analyser = cloudAnalyserRef.current;
      if (!analyser) return;
      const waveform = analyser.getValue();
      if (!waveform || waveform.length === 0) return;
      const arr = waveform as Float32Array;
      const rms = Math.sqrt(arr.reduce((sum, v) => sum + v * v, 0) / arr.length);
      const normalizedRms = Math.min(rms / 0.3, 1.0);
      const targetFreq = Math.min(crossfeedBaseRef.current + normalizedRms * crossfeedDepthRef.current, 20000);
      synthsRef.current.tone?.setCrossfeedFreq?.(targetFreq);
    }, 100);
    return () => clearInterval(interval);
  }, [crossfeedEnabled]);

  // Freeze Reverb sync (Phase 9)
  useEffect(() => {
    const fr = freezeRef.current;
    if (!fr) return;
    fr.out.gain.rampTo(freezeEnabled ? 1 : 0, 0.1);
    fr.feedbackGain.gain.rampTo(freezeFeedback, 0.1);
    fr.filter.frequency.rampTo(freezeFilterFreq, 0.1);
  }, [freezeEnabled, freezeFeedback, freezeFilterFreq]);

  // Gated Reverb sync (Phase 9)
  useEffect(() => {
    const gr = gatedRef.current;
    if (!gr) return;
    gr.out.gain.rampTo(gatedEnabled ? 1 : 0, 0.05);
    gr.reverbNormalOut.gain.rampTo(gatedEnabled ? 0 : 1, 0.05);
    gr.gate.threshold = gatedThreshold;
  }, [gatedEnabled, gatedThreshold]);

  // Reverse Reverb sync (Phase 9)
  useEffect(() => {
    const rr = reverseRef.current;
    if (!rr) return;
    rr.out.gain.rampTo(reverseEnabled ? 1 : 0, 0.1);
    if (reverseEnabled) {
      // Recreate convolver with new IR
      const newIR = generateReverseIR(Tone.getContext().rawContext as BaseAudioContext, reverseDecay);
      const newConvolver = new Tone.Convolver(newIR);
      rr.bus.disconnect(rr.convolver);
      rr.convolver.dispose();
      rr.bus.connect(newConvolver);
      newConvolver.connect(rr.out);
      rr.convolver = newConvolver;
    }
  }, [reverseEnabled, reverseDecay]);


  const stepsKey = tracks.map(t => `${t.id}:${t.steps}`).join('|');
  const mcm = useMemo(() => {
    const rhythmicTracks = tracks.filter(t => t.id !== 'cloud');
    if (rhythmicTracks.length === 0) return 1;
    return lcmArray(rhythmicTracks.map(t => t.steps));
  }, [stepsKey]);

  // Entropy Label
  const getEntropyLabel = (val: number) => {
    if (val <= 16) return { label: "SYNCHRONIZED / MINIMAL", color: "text-orange-500" };
    if (val <= 64) return { label: "PERIODIC / STRUCTURED", color: "text-idm-ink/80" };
    if (val <= 256) return { label: "EVOLVING / COMPLEX", color: "text-orange-500/80" };
    return { label: "GENERATIVE / CHAOTIC", color: "text-orange-500" };
  };

  const entropy = getEntropyLabel(mcm);

  // Calculate Sync Impact for each track
  const syncImpacts = useMemo(() => {
    const steps = tracks.map(t => t.steps);
    return tracks.map((_, i) => {
      const impact = calculateLcmImpact(steps, i);
      // Normalize impact to a 0-100 scale for UI
      // If impact is 1 (no change), it's 0% contribution to the "extra" complexity.
      // If impact is > 1, it's contributing.
      return Math.min(100, (impact - 1) * 20); // Scale factor for visualization
    });
  }, [stepsKey]);

  // Initialize Audio
  useEffect(() => {
    // Master Bus Setup
    const compressor = new Tone.Compressor({
      threshold: -12,
      ratio: 2,
      attack: 0.003,
      release: 0.25
    });
    const limiter = new Tone.Limiter(-0.3);
    const analyser = new Tone.Analyser("fft", 1024);

    // Global FX Buses
    const delayBus = new Tone.Gain(1);
    const reverbBus = new Tone.Gain(1);

    // Global FX Filters
    const delayFilter = new Tone.Filter(20000, "lowpass");
    const reverbFilter = new Tone.Filter(20, "highpass");

    const delay = new Tone.FeedbackDelay("8n", 0.3);
    delay.wet.value = 1;
    const reverb = new Tone.Reverb(2.5);
    reverb.wet.value = 1;
    reverb.generate();

    // Routing
    delayBus.chain(delay, delayFilter, compressor);
    // Decomposed reverb chain with reverbNormalOut for gated path
    const reverbNormalOut = new Tone.Gain(1);
    reverbBus.connect(reverb);
    reverb.connect(reverbFilter);
    reverbFilter.connect(reverbNormalOut);
    reverbNormalOut.connect(compressor);

    // ---- GATED REVERB BUS (Phase 9) ----
    const gatedOut = new Tone.Gain(0);
    const gate = new Tone.Gate({ threshold: -40, smoothing: 0.01 });
    reverb.connect(gate);
    gate.connect(gatedOut);
    gatedOut.connect(compressor);
    gatedRef.current = { gate, out: gatedOut, reverbNormalOut };

    // ---- FREEZE BUS (Phase 9) ----
    const freezeBus = new Tone.Gain(1);
    const freezeDelay = new Tone.Delay(0.08);
    const freezeFilter = new Tone.Filter(6000, 'lowpass');
    const freezeFeedbackGain = new Tone.Gain(0.95);
    const freezeOut = new Tone.Gain(0);
    // Manual feedback loop: bus→delay→filter→out, filter→feedbackGain→delay
    freezeBus.connect(freezeDelay);
    freezeDelay.connect(freezeFilter);
    freezeFilter.connect(freezeOut);
    freezeFilter.connect(freezeFeedbackGain);
    freezeFeedbackGain.connect(freezeDelay);
    freezeOut.connect(compressor);
    freezeRef.current = { bus: freezeBus, delay: freezeDelay, filter: freezeFilter, feedbackGain: freezeFeedbackGain, out: freezeOut };

    // ---- REVERSE REVERB BUS (Phase 9) ----
    const reverseBus = new Tone.Gain(1);
    const reverseIR = generateReverseIR(Tone.getContext().rawContext as BaseAudioContext, 2.5);
    const reverseConvolver = new Tone.Convolver(reverseIR);
    const reverseOut = new Tone.Gain(0);
    reverseBus.connect(reverseConvolver);
    reverseConvolver.connect(reverseOut);
    reverseOut.connect(compressor);
    reverseRef.current = { bus: reverseBus, convolver: reverseConvolver, out: reverseOut };

    // Spectral Delay Bus (Phase 7C)
    const spectralDelayBus = new Tone.Gain(1);
    const spectralDelayOut = new Tone.Gain(0);
    const sdLowFilter = new Tone.Filter(200, 'lowpass');
    const sdLowDelay = new Tone.Delay(0);
    sdLowFilter.connect(sdLowDelay);
    sdLowDelay.connect(spectralDelayOut);
    const sdMidFilter = new Tone.Filter(Math.sqrt(200 * 4000), 'bandpass');
    sdMidFilter.Q.value = 0.5;
    const sdMidDelay = new Tone.Delay(0.08);
    sdMidFilter.connect(sdMidDelay);
    sdMidDelay.connect(spectralDelayOut);
    const sdHighFilter = new Tone.Filter(4000, 'highpass');
    const sdHighDelay = new Tone.Delay(0.16);
    sdHighFilter.connect(sdHighDelay);
    sdHighDelay.connect(spectralDelayOut);
    spectralDelayBus.connect(sdLowFilter);
    spectralDelayBus.connect(sdMidFilter);
    spectralDelayBus.connect(sdHighFilter);
    spectralDelayOut.connect(compressor);
    spectralDelayRef.current = {
      bus: spectralDelayBus, out: spectralDelayOut,
      lowFilter: sdLowFilter, midFilter: sdMidFilter, highFilter: sdHighFilter,
      lowDelay: sdLowDelay, midDelay: sdMidDelay, highDelay: sdHighDelay,
    };

    compressor.chain(limiter, analyser, Tone.getDestination());
    masterBusRef.current = { compressor, limiter, analyser, delay, reverb, delayFilter, reverbFilter, delayBus, reverbBus, spectralDelayBus, freezeBus, reverseBus };
    setGlobalAnalyser(analyser);

    // Sidechain Setup (Kick -> Cloud)
    const kickFollower = new Tone.Follower(0.1);
    const sidechainInverter = new Tone.Gain(-0.8); // Pump amount
    const sidechainBias = new Tone.Signal(1);
    
    // Filters for dynamic timbre
    const kickDelaySend = new Tone.Gain(0).connect(delayBus);
    const kickReverbSend = new Tone.Gain(0).connect(reverbBus);
    const kickSpectralSend = new Tone.Gain(0).connect(spectralDelayBus);
    const kickFreezeSend = new Tone.Gain(0).connect(freezeBus);
    const kickReverseSend = new Tone.Gain(0).connect(reverseBus);
    // EQ filters in series: filter → eqHpf → eqLpf → [pannerGain→panner, panner3DGain→panner3D] → freqShifter → [compressor, sends]
    const kickEqHpf = new Tone.Filter(20, "highpass");
    const kickEqLpf = new Tone.Filter(20000, "lowpass");
    const kickPanner = new Tone.Panner(0);
    const kickPanner3D = new Tone.Panner3D({ panningModel: 'HRTF', distanceModel: 'inverse' });
    kickPanner3D.positionY.value = 0;
    const kickPannerGain = new Tone.Gain(1);
    const kickPanner3DGain = new Tone.Gain(0);
    const kickFreqShifter = new Tone.FrequencyShifter(0);
    const kickFsBypassGain = new Tone.Gain(0); // bypass=0: freqShifter path muted by default
    const kickFsDirectGain = new Tone.Gain(1); // direct=1: clean path active by default
    const kickFilter = new Tone.Filter(2000, "lowpass").connect(kickEqHpf);
    kickEqHpf.connect(kickEqLpf);
    kickEqLpf.connect(kickPannerGain);
    kickEqLpf.connect(kickPanner3DGain);
    kickEqLpf.connect(kickFollower); // Follower pre-pan for sidechain independence
    kickPannerGain.connect(kickPanner);
    kickPanner3DGain.connect(kickPanner3D);
    // FreqShifter bypass routing: dual-gain crossfade
    kickPanner.connect(kickFsBypassGain);
    kickPanner3D.connect(kickFsBypassGain);
    kickFsBypassGain.connect(kickFreqShifter);
    kickFreqShifter.connect(compressor);
    kickFreqShifter.connect(kickDelaySend);
    kickFreqShifter.connect(kickReverbSend);
    kickFreqShifter.connect(kickSpectralSend);
    // Direct path (bypass freqShifter)
    kickPanner.connect(kickFsDirectGain);
    kickPanner3D.connect(kickFsDirectGain);
    kickFsDirectGain.connect(compressor);
    kickFsDirectGain.connect(kickDelaySend);
    kickFsDirectGain.connect(kickReverbSend);
    kickFsDirectGain.connect(kickSpectralSend);
    kickFsBypassGain.connect(kickFreezeSend);
    kickFsBypassGain.connect(kickReverseSend);
    kickFsDirectGain.connect(kickFreezeSend);
    kickFsDirectGain.connect(kickReverseSend);
    kickFollower.connect(sidechainInverter);

    const snareDelaySend = new Tone.Gain(0).connect(delayBus);
    const snareReverbSend = new Tone.Gain(0).connect(reverbBus);
    const snareSpectralSend = new Tone.Gain(0).connect(spectralDelayBus);
    const snareFreezeSend = new Tone.Gain(0).connect(freezeBus);
    const snareReverseSend = new Tone.Gain(0).connect(reverseBus);
    const snareEqHpf = new Tone.Filter(20, "highpass");
    const snareEqLpf = new Tone.Filter(20000, "lowpass");
    const snarePanner = new Tone.Panner(0);
    const snarePanner3D = new Tone.Panner3D({ panningModel: 'HRTF', distanceModel: 'inverse' });
    snarePanner3D.positionY.value = 0;
    const snarePannerGain = new Tone.Gain(1);
    const snarePanner3DGain = new Tone.Gain(0);
    const snareFreqShifter = new Tone.FrequencyShifter(0);
    const snareFsBypassGain = new Tone.Gain(0);
    const snareFsDirectGain = new Tone.Gain(1);
    const snareFilter = new Tone.Filter(5000, "lowpass").connect(snareEqHpf);
    snareEqHpf.connect(snareEqLpf);
    snareEqLpf.connect(snarePannerGain);
    snareEqLpf.connect(snarePanner3DGain);
    snarePannerGain.connect(snarePanner);
    snarePanner3DGain.connect(snarePanner3D);
    snarePanner.connect(snareFsBypassGain);
    snarePanner3D.connect(snareFsBypassGain);
    snareFsBypassGain.connect(snareFreqShifter);
    snareFreqShifter.connect(compressor);
    snareFreqShifter.connect(snareDelaySend);
    snareFreqShifter.connect(snareReverbSend);
    snareFreqShifter.connect(snareSpectralSend);
    snarePanner.connect(snareFsDirectGain);
    snarePanner3D.connect(snareFsDirectGain);
    snareFsDirectGain.connect(compressor);
    snareFsDirectGain.connect(snareDelaySend);
    snareFsDirectGain.connect(snareReverbSend);
    snareFsDirectGain.connect(snareSpectralSend);
    snareFsBypassGain.connect(snareFreezeSend);
    snareFsBypassGain.connect(snareReverseSend);
    snareFsDirectGain.connect(snareFreezeSend);
    snareFsDirectGain.connect(snareReverseSend);

    const hatDelaySend = new Tone.Gain(0).connect(delayBus);
    const hatReverbSend = new Tone.Gain(0).connect(reverbBus);
    const hatSpectralSend = new Tone.Gain(0).connect(spectralDelayBus);
    const hatFreezeSend = new Tone.Gain(0).connect(freezeBus);
    const hatReverseSend = new Tone.Gain(0).connect(reverseBus);
    const hatEqHpf = new Tone.Filter(20, "highpass");
    const hatEqLpf = new Tone.Filter(20000, "lowpass");
    const hatPanner = new Tone.Panner(0);
    const hatPanner3D = new Tone.Panner3D({ panningModel: 'HRTF', distanceModel: 'inverse' });
    hatPanner3D.positionY.value = 0;
    const hatPannerGain = new Tone.Gain(1);
    const hatPanner3DGain = new Tone.Gain(0);
    const hatFreqShifter = new Tone.FrequencyShifter(0);
    const hatFsBypassGain = new Tone.Gain(0);
    const hatFsDirectGain = new Tone.Gain(1);
    const hatFilter = new Tone.Filter(5000, "highpass").connect(hatEqHpf);
    hatEqHpf.connect(hatEqLpf);
    hatEqLpf.connect(hatPannerGain);
    hatEqLpf.connect(hatPanner3DGain);
    hatPannerGain.connect(hatPanner);
    hatPanner3DGain.connect(hatPanner3D);
    hatPanner.connect(hatFsBypassGain);
    hatPanner3D.connect(hatFsBypassGain);
    hatFsBypassGain.connect(hatFreqShifter);
    hatFreqShifter.connect(compressor);
    hatFreqShifter.connect(hatDelaySend);
    hatFreqShifter.connect(hatReverbSend);
    hatFreqShifter.connect(hatSpectralSend);
    hatPanner.connect(hatFsDirectGain);
    hatPanner3D.connect(hatFsDirectGain);
    hatFsDirectGain.connect(compressor);
    hatFsDirectGain.connect(hatDelaySend);
    hatFsDirectGain.connect(hatReverbSend);
    hatFsDirectGain.connect(hatSpectralSend);
    hatFsBypassGain.connect(hatFreezeSend);
    hatFsBypassGain.connect(hatReverseSend);
    hatFsDirectGain.connect(hatFreezeSend);
    hatFsDirectGain.connect(hatReverseSend);

    // Layered Kick
    let kickBody = new Tone.MembraneSynth({
      pitchDecay: 0.05, octaves: 10, oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 },
      volume: -2
    }).connect(kickFilter);

    let kickClick = new Tone.NoiseSynth({
      noise: { type: 'pink' as any },
      envelope: { attack: 0.001, decay: 0.01, sustain: 0 },
      volume: -10
    }).connect(kickFilter);

    synthsRef.current.kick = {
      triggerAttackRelease: (note: string, duration: string, time: number, velocity: number) => {
        kickBody.triggerAttackRelease("C1", duration, time, velocity);
        kickClick.triggerAttackRelease(duration, time, velocity * 0.5);
        const baseCutoff = 800;
        const dynamicCutoff = baseCutoff + (velocity * 3000);
        if (isFinite(dynamicCutoff)) {
          kickFilter.frequency.rampTo(dynamicCutoff, 0.02, time);
        }
      },
      setVolume: (vol: number) => {
        const db = Tone.gainToDb(vol);
        kickBody.volume.rampTo(db - 2, 0.05);
        kickClick.volume.rampTo(db - 10, 0.05);
      },
      setSends: (delayVal: number, reverbVal: number) => {
        kickDelaySend.gain.rampTo(delayVal, 0.05);
        kickReverbSend.gain.rampTo(reverbVal, 0.05);
      },
      dispose: () => {
        kickBody.dispose();
        kickClick.dispose();
        kickFilter.dispose();
        kickEqHpf.dispose();
        kickEqLpf.dispose();
        kickPanner.dispose();
        kickPanner3D.dispose();
        kickPannerGain.dispose();
        kickPanner3DGain.dispose();
        kickFreqShifter.dispose();
        kickFsBypassGain.dispose();
        kickFsDirectGain.dispose();
        kickDelaySend.dispose();
        kickReverbSend.dispose();
        kickSpectralSend.dispose();
      }
    };
    // Phase 8 — Kick synth params setter
    synthsRef.current.kick.setKickParams = (pitchDecay: number, octaves: number, decay: number, clickType: string) => {
      kickBody.set({ pitchDecay, octaves, envelope: { decay } });
      // NoiseSynth noise type can't be changed in-place; recreate if type changed
      const currentType = (kickClick as any).noise?.type || 'pink';
      if (clickType !== currentType) {
        kickClick.dispose();
        kickClick = new Tone.NoiseSynth({
          noise: { type: clickType as any },
          envelope: { attack: 0.001, decay: 0.01, sustain: 0 },
          volume: -10
        }).connect(kickFilter);
      }
    };
    // EQ injection for kick
    synthsRef.current.kick.updateEq = (hpfFreq: number, lpfFreq: number) => {
      kickEqHpf.frequency.rampTo(hpfFreq, 0.05);
      kickEqLpf.frequency.rampTo(lpfFreq, 0.05);
    };
    // Pan + FreqShifter injection for kick
    synthsRef.current.kick.setPan = (value: number) => { kickPanner.pan.rampTo(value, 0.05); };
    synthsRef.current.kick.setFreqShift = (hz: number, enabled?: boolean) => {
      kickFreqShifter.frequency.rampTo(hz, 0.05);
      if (enabled !== undefined) {
        kickFsBypassGain.gain.rampTo(enabled ? 1 : 0, 0.02);
        kickFsDirectGain.gain.rampTo(enabled ? 0 : 1, 0.02);
      }
    };
    synthsRef.current.kick.panner = kickPanner;
    synthsRef.current.kick.freqShifter = kickFreqShifter;
    // Spectral Delay send injection for kick
    synthsRef.current.kick.setSpectralSend = (value: number) => { kickSpectralSend.gain.rampTo(value, 0.05); };
    synthsRef.current.kick.setFreezeSend = (value: number) => { kickFreezeSend.gain.rampTo(value, 0.05); };
    synthsRef.current.kick.setReverseSend = (value: number) => { kickReverseSend.gain.rampTo(value, 0.05); };
    // Binaural 3D injection for kick
    synthsRef.current.kick.switchBinaural = (binaural: boolean) => {
      kickPannerGain.gain.rampTo(binaural ? 0 : 1, 0.1);
      kickPanner3DGain.gain.rampTo(binaural ? 1 : 0, 0.1);
    };
    synthsRef.current.kick.updateBinaural = (azimuth: number, distance: number) => {
      const rad = (azimuth * Math.PI) / 180;
      try { kickPanner3D.setPosition(Math.sin(rad) * distance, 0, -Math.cos(rad) * distance); } catch(e) {
        kickPanner3D.positionX.value = Math.sin(rad) * distance;
        kickPanner3D.positionZ.value = -Math.cos(rad) * distance;
      }
    };
    // Lorenz + Nested LFO injection for kick
    synthsRef.current.kick.updateLorenz = (normalizedValue: number, depth: number, target: string) => {
      if (target === 'filter') {
        const base = 800;
        kickFilter.frequency.rampTo(base + normalizedValue * depth, 0.05);
      }
    };
    synthsRef.current.kick.nestedLfoInstance = null;
    synthsRef.current.kick.initNestedLfo = (r1: number, r2: number, d: number) => {
      synthsRef.current.kick.nestedLfoInstance?.dispose();
      synthsRef.current.kick.nestedLfoInstance = createNestedLfo(kickFilter, r1, r2, d);
    };
    synthsRef.current.kick.updateNestedLfo = (r1: number, r2: number, d: number) => {
      synthsRef.current.kick.nestedLfoInstance?.update(r1, r2, d);
    };
    synthsRef.current.kick.disposeNestedLfo = () => {
      synthsRef.current.kick.nestedLfoInstance?.dispose();
      synthsRef.current.kick.nestedLfoInstance = null;
    };

    let snareSynth = new Tone.NoiseSynth({
      noise: { type: 'white' as any },
      envelope: { attack: 0.001, decay: 0.2, sustain: 0 },
      volume: -4
    }).connect(snareFilter);
    let snareBody: Tone.MembraneSynth | null = null;

    synthsRef.current.snare = {
      triggerAttackRelease: (duration: string, time: number, velocity: number) => {
        snareSynth.triggerAttackRelease(duration, time, velocity);
        if (snareBody) {
          try { snareBody.triggerAttackRelease("C2", duration, time, velocity * 0.6); } catch(e) {}
        }
        const baseCutoff = 1500;
        const dynamicCutoff = baseCutoff + (velocity * 5000);
        if (isFinite(dynamicCutoff)) {
          snareFilter.frequency.rampTo(dynamicCutoff, 0.02, time);
        }
      },
      setVolume: (vol: number) => {
        snareSynth.volume.rampTo(Tone.gainToDb(vol) - 4, 0.05);
        if (snareBody) snareBody.volume.rampTo(Tone.gainToDb(vol) - 6, 0.05);
      },
      setSends: (delayVal: number, reverbVal: number) => {
        snareDelaySend.gain.rampTo(delayVal, 0.05);
        snareReverbSend.gain.rampTo(reverbVal, 0.05);
      },
      dispose: () => {
        snareSynth.dispose();
        snareBody?.dispose();
        snareFilter.dispose();
        snareEqHpf.dispose();
        snareEqLpf.dispose();
        snarePanner.dispose();
        snarePanner3D.dispose();
        snarePannerGain.dispose();
        snarePanner3DGain.dispose();
        snareFreqShifter.dispose();
        snareFsBypassGain.dispose();
        snareFsDirectGain.dispose();
        snareDelaySend.dispose();
        snareReverbSend.dispose();
        snareSpectralSend.dispose();
      }
    };
    // Phase 8 — Snare synth params setter
    synthsRef.current.snare.setSnareParams = (decay: number, noiseType: string) => {
      snareSynth.envelope.decay = decay;
      const currentType = (snareSynth as any).noise?.type || 'white';
      if (noiseType !== currentType) {
        snareSynth.dispose();
        snareSynth = new Tone.NoiseSynth({
          noise: { type: noiseType as any },
          envelope: { attack: 0.001, decay, sustain: 0 },
          volume: -4
        }).connect(snareFilter);
      }
    };
    // Phase 8 — Snare body (layered MembraneSynth)
    synthsRef.current.snare.setSnareBody = (enabled: boolean, pitch: number, bodyDecay: number) => {
      if (enabled && !snareBody) {
        snareBody = new Tone.MembraneSynth({
          pitchDecay: 0.08, octaves: 4, oscillator: { type: 'sine' },
          envelope: { attack: 0.001, decay: bodyDecay, sustain: 0.01, release: 0.5 },
          volume: -6
        }).connect(snareFilter);
        snareBody.frequency.value = pitch;
      } else if (!enabled && snareBody) {
        snareBody.dispose();
        snareBody = null;
      } else if (enabled && snareBody) {
        snareBody.frequency.value = pitch;
        snareBody.set({ envelope: { decay: bodyDecay } });
      }
    };
    synthsRef.current.snare.updateEq = (hpfFreq: number, lpfFreq: number) => {
      snareEqHpf.frequency.rampTo(hpfFreq, 0.05);
      snareEqLpf.frequency.rampTo(lpfFreq, 0.05);
    };
    synthsRef.current.snare.setPan = (value: number) => { snarePanner.pan.rampTo(value, 0.05); };
    synthsRef.current.snare.setFreqShift = (hz: number, enabled?: boolean) => {
      snareFreqShifter.frequency.rampTo(hz, 0.05);
      if (enabled !== undefined) {
        snareFsBypassGain.gain.rampTo(enabled ? 1 : 0, 0.02);
        snareFsDirectGain.gain.rampTo(enabled ? 0 : 1, 0.02);
      }
    };
    synthsRef.current.snare.panner = snarePanner;
    synthsRef.current.snare.freqShifter = snareFreqShifter;
    synthsRef.current.snare.setSpectralSend = (value: number) => { snareSpectralSend.gain.rampTo(value, 0.05); };
    synthsRef.current.snare.setFreezeSend = (value: number) => { snareFreezeSend.gain.rampTo(value, 0.05); };
    synthsRef.current.snare.setReverseSend = (value: number) => { snareReverseSend.gain.rampTo(value, 0.05); };
    synthsRef.current.snare.switchBinaural = (binaural: boolean) => {
      snarePannerGain.gain.rampTo(binaural ? 0 : 1, 0.1);
      snarePanner3DGain.gain.rampTo(binaural ? 1 : 0, 0.1);
    };
    synthsRef.current.snare.updateBinaural = (azimuth: number, distance: number) => {
      const rad = (azimuth * Math.PI) / 180;
      try { snarePanner3D.setPosition(Math.sin(rad) * distance, 0, -Math.cos(rad) * distance); } catch(e) {
        snarePanner3D.positionX.value = Math.sin(rad) * distance;
        snarePanner3D.positionZ.value = -Math.cos(rad) * distance;
      }
    };
    // Lorenz + Nested LFO injection for snare
    synthsRef.current.snare.updateLorenz = (normalizedValue: number, depth: number, target: string) => {
      if (target === 'filter') {
        snareFilter.frequency.rampTo(1500 + normalizedValue * depth, 0.05);
      }
    };
    synthsRef.current.snare.nestedLfoInstance = null;
    synthsRef.current.snare.initNestedLfo = (r1: number, r2: number, d: number) => {
      synthsRef.current.snare.nestedLfoInstance?.dispose();
      synthsRef.current.snare.nestedLfoInstance = createNestedLfo(snareFilter, r1, r2, d);
    };
    synthsRef.current.snare.updateNestedLfo = (r1: number, r2: number, d: number) => {
      synthsRef.current.snare.nestedLfoInstance?.update(r1, r2, d);
    };
    synthsRef.current.snare.disposeNestedLfo = () => {
      synthsRef.current.snare.nestedLfoInstance?.dispose();
      synthsRef.current.snare.nestedLfoInstance = null;
    };

    let hatSynth: Tone.NoiseSynth | null = new Tone.NoiseSynth({
      noise: { type: 'white' as any },
      envelope: { attack: 0.001, decay: 0.05, sustain: 0 },
      volume: -2
    }).connect(hatFilter);
    let hatMetalSynth: Tone.MetalSynth | null = null;
    let currentHatMode = 'noise';

    synthsRef.current.hat = {
      triggerAttackRelease: (duration: string, time: number, velocity: number) => {
        if (currentHatMode === 'metal' && hatMetalSynth) {
          const trackState = tracksRef.current.find(t => t.id === 'hat');
          const decay = trackState?.hatDecay ?? 0.05;
          hatMetalSynth.triggerAttackRelease(200, decay, time, velocity);
        } else if (hatSynth) {
          hatSynth.triggerAttackRelease(duration, time, velocity);
        }
        const baseCutoff = 2000;
        const dynamicCutoff = baseCutoff + (velocity * 8000);
        if (isFinite(dynamicCutoff)) {
          hatFilter.frequency.rampTo(dynamicCutoff, 0.02, time);
        }
      },
      setVolume: (vol: number) => {
        const db = Tone.gainToDb(vol) - 2;
        if (hatSynth) hatSynth.volume.rampTo(db, 0.05);
        if (hatMetalSynth) hatMetalSynth.volume.rampTo(db, 0.05);
      },
      setSends: (delayVal: number, reverbVal: number) => {
        hatDelaySend.gain.rampTo(delayVal, 0.05);
        hatReverbSend.gain.rampTo(reverbVal, 0.05);
      },
      dispose: () => {
        hatSynth?.dispose();
        hatMetalSynth?.dispose();
        hatFilter.dispose();
        hatEqHpf.dispose();
        hatEqLpf.dispose();
        hatPanner.dispose();
        hatPanner3D.dispose();
        hatPannerGain.dispose();
        hatPanner3DGain.dispose();
        hatFreqShifter.dispose();
        hatFsBypassGain.dispose();
        hatFsDirectGain.dispose();
        hatDelaySend.dispose();
        hatReverbSend.dispose();
        hatSpectralSend.dispose();
      }
    };
    // Phase 8 — Hat mode switcher + params
    synthsRef.current.hat.setHatMode = (mode: string, harmonicity: number, modIndex: number, resonance: number, decay: number, noiseType: string) => {
      if (mode === 'metal' && currentHatMode !== 'metal') {
        hatSynth?.dispose();
        hatSynth = null;
        hatMetalSynth = new Tone.MetalSynth({
          harmonicity, modulationIndex: modIndex, resonance,
          envelope: { attack: 0.001, decay, release: 0.1 },
          volume: -2
        }).connect(hatFilter);
        currentHatMode = 'metal';
      } else if (mode === 'noise' && currentHatMode !== 'noise') {
        hatMetalSynth?.dispose();
        hatMetalSynth = null;
        hatSynth = new Tone.NoiseSynth({
          noise: { type: noiseType as any },
          envelope: { attack: 0.001, decay, sustain: 0 },
          volume: -2
        }).connect(hatFilter);
        currentHatMode = 'noise';
      } else if (mode === 'metal' && hatMetalSynth) {
        hatMetalSynth.set({ harmonicity, modulationIndex: modIndex, resonance, envelope: { decay } });
      } else if (mode === 'noise' && hatSynth) {
        hatSynth.envelope.decay = decay;
        const curType = (hatSynth as any).noise?.type || 'white';
        if (noiseType !== curType) {
          hatSynth.dispose();
          hatSynth = new Tone.NoiseSynth({
            noise: { type: noiseType as any },
            envelope: { attack: 0.001, decay, sustain: 0 },
            volume: -2
          }).connect(hatFilter);
        }
      }
    };
    synthsRef.current.hat.updateEq = (hpfFreq: number, lpfFreq: number) => {
      hatEqHpf.frequency.rampTo(hpfFreq, 0.05);
      hatEqLpf.frequency.rampTo(lpfFreq, 0.05);
    };
    synthsRef.current.hat.setPan = (value: number) => { hatPanner.pan.rampTo(value, 0.05); };
    synthsRef.current.hat.setFreqShift = (hz: number, enabled?: boolean) => {
      hatFreqShifter.frequency.rampTo(hz, 0.05);
      if (enabled !== undefined) {
        hatFsBypassGain.gain.rampTo(enabled ? 1 : 0, 0.02);
        hatFsDirectGain.gain.rampTo(enabled ? 0 : 1, 0.02);
      }
    };
    synthsRef.current.hat.panner = hatPanner;
    synthsRef.current.hat.freqShifter = hatFreqShifter;
    synthsRef.current.hat.setSpectralSend = (value: number) => { hatSpectralSend.gain.rampTo(value, 0.05); };
    synthsRef.current.hat.setFreezeSend = (value: number) => { hatFreezeSend.gain.rampTo(value, 0.05); };
    synthsRef.current.hat.setReverseSend = (value: number) => { hatReverseSend.gain.rampTo(value, 0.05); };
    synthsRef.current.hat.switchBinaural = (binaural: boolean) => {
      hatPannerGain.gain.rampTo(binaural ? 0 : 1, 0.1);
      hatPanner3DGain.gain.rampTo(binaural ? 1 : 0, 0.1);
    };
    synthsRef.current.hat.updateBinaural = (azimuth: number, distance: number) => {
      const rad = (azimuth * Math.PI) / 180;
      try { hatPanner3D.setPosition(Math.sin(rad) * distance, 0, -Math.cos(rad) * distance); } catch(e) {
        hatPanner3D.positionX.value = Math.sin(rad) * distance;
        hatPanner3D.positionZ.value = -Math.cos(rad) * distance;
      }
    };
    // Lorenz + Nested LFO injection for hat
    synthsRef.current.hat.updateLorenz = (normalizedValue: number, depth: number, target: string) => {
      if (target === 'filter') {
        hatFilter.frequency.rampTo(2000 + normalizedValue * depth, 0.05);
      }
    };
    synthsRef.current.hat.nestedLfoInstance = null;
    synthsRef.current.hat.initNestedLfo = (r1: number, r2: number, d: number) => {
      synthsRef.current.hat.nestedLfoInstance?.dispose();
      synthsRef.current.hat.nestedLfoInstance = createNestedLfo(hatFilter, r1, r2, d);
    };
    synthsRef.current.hat.updateNestedLfo = (r1: number, r2: number, d: number) => {
      synthsRef.current.hat.nestedLfoInstance?.update(r1, r2, d);
    };
    synthsRef.current.hat.disposeNestedLfo = () => {
      synthsRef.current.hat.nestedLfoInstance?.dispose();
      synthsRef.current.hat.nestedLfoInstance = null;
    };

    // Cloud Engine Setup
    const cloudDelaySend = new Tone.Gain(0).connect(delayBus);
    const cloudReverbSend = new Tone.Gain(0).connect(reverbBus);
    const cloudSpectralSend = new Tone.Gain(0).connect(spectralDelayBus);
    const cloudFreezeSend = new Tone.Gain(0).connect(freezeBus);
    const cloudReverseSend = new Tone.Gain(0).connect(reverseBus);
    const cloudEqHpf = new Tone.Filter(20, "highpass");
    const cloudEqLpf = new Tone.Filter(20000, "lowpass");
    const cloudPanner = new Tone.Panner(0);
    const cloudPanner3D = new Tone.Panner3D({ panningModel: 'HRTF', distanceModel: 'inverse' });
    cloudPanner3D.positionY.value = 0;
    const cloudPannerGain = new Tone.Gain(1);
    const cloudPanner3DGain = new Tone.Gain(0);
    const cloudFreqShifter = new Tone.FrequencyShifter(0);
    const cloudFsBypassGain = new Tone.Gain(0);
    const cloudFsDirectGain = new Tone.Gain(1);
    const cloudFilter = new Tone.Filter(1000, "lowpass").connect(cloudEqHpf);
    cloudEqHpf.connect(cloudEqLpf);
    cloudEqLpf.connect(cloudPannerGain);
    cloudEqLpf.connect(cloudPanner3DGain);
    cloudPannerGain.connect(cloudPanner);
    cloudPanner3DGain.connect(cloudPanner3D);
    cloudPanner.connect(cloudFsBypassGain);
    cloudPanner3D.connect(cloudFsBypassGain);
    cloudFsBypassGain.connect(cloudFreqShifter);
    cloudFreqShifter.connect(compressor);
    cloudFreqShifter.connect(cloudDelaySend);
    cloudFreqShifter.connect(cloudReverbSend);
    cloudFreqShifter.connect(cloudSpectralSend);
    cloudPanner.connect(cloudFsDirectGain);
    cloudPanner3D.connect(cloudFsDirectGain);
    cloudFsDirectGain.connect(compressor);
    cloudFsDirectGain.connect(cloudDelaySend);
    cloudFsDirectGain.connect(cloudReverbSend);
    cloudFsDirectGain.connect(cloudSpectralSend);
    cloudFsBypassGain.connect(cloudFreezeSend);
    cloudFsBypassGain.connect(cloudReverseSend);
    cloudFsDirectGain.connect(cloudFreezeSend);
    cloudFsDirectGain.connect(cloudReverseSend);

    // Cloud Analyser for Envelope Crossfeed (Phase 7E)
    const cloudAnalyser = new Tone.Analyser('waveform', 256);
    cloudFilter.connect(cloudAnalyser);
    cloudAnalyserRef.current = cloudAnalyser;

    const cloudDucker = new Tone.Gain(1).connect(cloudFilter);
    const cloudLFO = new Tone.LFO({
      frequency: 0.13,
      min: 200,
      max: 2000
    }).connect(cloudFilter.frequency).start();

    synthsRef.current.cloud = {
      filter: cloudFilter,
      ducker: cloudDucker,
      lfo: cloudLFO,
      sidechainInverter,
      sidechainBias,
      setVolume: (vol: number) => {
        if (synthsRef.current.cloud.grainPlayer) {
          synthsRef.current.cloud.grainPlayer.volume.rampTo(Tone.gainToDb(vol), 0.05);
        }
      },
      setSends: (delayVal: number, reverbVal: number) => {
        cloudDelaySend.gain.rampTo(delayVal, 0.05);
        cloudReverbSend.gain.rampTo(reverbVal, 0.05);
      },
      dispose: () => {
        if (synthsRef.current.cloud.grainPlayer) synthsRef.current.cloud.grainPlayer.dispose();
        if (synthsRef.current.cloud.bitCrusher) synthsRef.current.cloud.bitCrusher.dispose();
        cloudEqHpf.dispose();
        cloudEqLpf.dispose();
        cloudPanner.dispose();
        cloudPanner3D.dispose();
        cloudPannerGain.dispose();
        cloudPanner3DGain.dispose();
        cloudFreqShifter.dispose();
        cloudFsBypassGain.dispose();
        cloudFsDirectGain.dispose();
        cloudDelaySend.dispose();
        cloudReverbSend.dispose();
        cloudSpectralSend.dispose();
        cloudAnalyser.dispose();
      }
    };
    synthsRef.current.cloud.updateEq = (hpfFreq: number, lpfFreq: number) => {
      cloudEqHpf.frequency.rampTo(hpfFreq, 0.05);
      cloudEqLpf.frequency.rampTo(lpfFreq, 0.05);
    };
    synthsRef.current.cloud.setPan = (value: number) => { cloudPanner.pan.rampTo(value, 0.05); };
    synthsRef.current.cloud.setFreqShift = (hz: number, enabled?: boolean) => {
      cloudFreqShifter.frequency.rampTo(hz, 0.05);
      if (enabled !== undefined) {
        cloudFsBypassGain.gain.rampTo(enabled ? 1 : 0, 0.02);
        cloudFsDirectGain.gain.rampTo(enabled ? 0 : 1, 0.02);
      }
    };
    synthsRef.current.cloud.panner = cloudPanner;
    synthsRef.current.cloud.freqShifter = cloudFreqShifter;
    synthsRef.current.cloud.setSpectralSend = (value: number) => { cloudSpectralSend.gain.rampTo(value, 0.05); };
    synthsRef.current.cloud.setFreezeSend = (value: number) => { cloudFreezeSend.gain.rampTo(value, 0.05); };
    synthsRef.current.cloud.setReverseSend = (value: number) => { cloudReverseSend.gain.rampTo(value, 0.05); };
    synthsRef.current.cloud.switchBinaural = (binaural: boolean) => {
      cloudPannerGain.gain.rampTo(binaural ? 0 : 1, 0.1);
      cloudPanner3DGain.gain.rampTo(binaural ? 1 : 0, 0.1);
    };
    synthsRef.current.cloud.updateBinaural = (azimuth: number, distance: number) => {
      const rad = (azimuth * Math.PI) / 180;
      try { cloudPanner3D.setPosition(Math.sin(rad) * distance, 0, -Math.cos(rad) * distance); } catch(e) {
        cloudPanner3D.positionX.value = Math.sin(rad) * distance;
        cloudPanner3D.positionZ.value = -Math.cos(rad) * distance;
      }
    };
    // Lorenz + Nested LFO injection for cloud
    synthsRef.current.cloud.updateLorenz = (normalizedValue: number, depth: number, target: string) => {
      if (target === 'filter') {
        cloudFilter.frequency.rampTo(200 + normalizedValue * depth, 0.05);
      }
    };
    synthsRef.current.cloud.nestedLfoInstance = null;
    synthsRef.current.cloud.initNestedLfo = (r1: number, r2: number, d: number) => {
      synthsRef.current.cloud.nestedLfoInstance?.dispose();
      synthsRef.current.cloud.nestedLfoInstance = createNestedLfo(cloudFilter, r1, r2, d);
    };
    synthsRef.current.cloud.updateNestedLfo = (r1: number, r2: number, d: number) => {
      synthsRef.current.cloud.nestedLfoInstance?.update(r1, r2, d);
    };
    synthsRef.current.cloud.disposeNestedLfo = () => {
      synthsRef.current.cloud.nestedLfoInstance?.dispose();
      synthsRef.current.cloud.nestedLfoInstance = null;
    };

    // Connect sidechain math to ducker gain
    sidechainInverter.connect(cloudDucker.gain);
    sidechainBias.connect(cloudDucker.gain);

    // Tone Synth Setup (MonoSynth)
    const toneDelaySend = new Tone.Gain(0.15).connect(delayBus);
    const toneReverbSend = new Tone.Gain(0.2).connect(reverbBus);
    const toneSpectralSend = new Tone.Gain(0).connect(spectralDelayBus);
    const toneFreezeSend = new Tone.Gain(0).connect(freezeBus);
    const toneReverseSend = new Tone.Gain(0).connect(reverseBus);
    const toneEqHpf = new Tone.Filter(20, "highpass");
    const toneEqLpf = new Tone.Filter(20000, "lowpass");
    const tonePanner = new Tone.Panner(0);
    const tonePanner3D = new Tone.Panner3D({ panningModel: 'HRTF', distanceModel: 'inverse' });
    tonePanner3D.positionY.value = 0;
    const tonePannerGain = new Tone.Gain(1);
    const tonePanner3DGain = new Tone.Gain(0);
    const toneFreqShifter = new Tone.FrequencyShifter(0);
    const toneFsBypassGain = new Tone.Gain(0);
    const toneFsDirectGain = new Tone.Gain(1);
    const toneFilter = new Tone.Filter(2000, "lowpass").connect(toneEqHpf);
    toneEqHpf.connect(toneEqLpf);
    toneEqLpf.connect(tonePannerGain);
    toneEqLpf.connect(tonePanner3DGain);
    tonePannerGain.connect(tonePanner);
    tonePanner3DGain.connect(tonePanner3D);
    tonePanner.connect(toneFsBypassGain);
    tonePanner3D.connect(toneFsBypassGain);
    toneFsBypassGain.connect(toneFreqShifter);
    toneFreqShifter.connect(compressor);
    toneFreqShifter.connect(toneDelaySend);
    toneFreqShifter.connect(toneReverbSend);
    toneFreqShifter.connect(toneSpectralSend);
    tonePanner.connect(toneFsDirectGain);
    tonePanner3D.connect(toneFsDirectGain);
    toneFsDirectGain.connect(compressor);
    toneFsDirectGain.connect(toneDelaySend);
    toneFsDirectGain.connect(toneReverbSend);
    toneFsDirectGain.connect(toneSpectralSend);
    toneFsBypassGain.connect(toneFreezeSend);
    toneFsBypassGain.connect(toneReverseSend);
    toneFsDirectGain.connect(toneFreezeSend);
    toneFsDirectGain.connect(toneReverseSend);
    toneFilterRef.current = toneFilter;

    const toneMonoSynth = new Tone.MonoSynth({
      oscillator: { type: 'sawtooth' },
      filter: { Q: 6, type: 'lowpass', rolloff: -24 },
      envelope: { attack: 0.005, decay: 0.3, sustain: 0.4, release: 0.8 },
      filterEnvelope: { attack: 0.06, decay: 0.2, sustain: 0.5, release: 0.8, baseFrequency: 200, octaves: 4 },
      volume: -6
    }).connect(toneFilter);

    synthsRef.current.tone = {
      triggerAttackRelease: (note: string, duration: any, time: number, velocity: number) => {
        toneMonoSynth.triggerAttackRelease(note, duration, time, velocity);
        const baseCutoff = 600;
        const dynamicCutoff = baseCutoff + (velocity * 4000);
        if (isFinite(dynamicCutoff)) {
          toneFilter.frequency.rampTo(dynamicCutoff, 0.02, time);
        }
      },
      setVolume: (vol: number) => {
        toneMonoSynth.volume.rampTo(Tone.gainToDb(vol) - 6, 0.05);
      },
      setSends: (delayVal: number, reverbVal: number) => {
        toneDelaySend.gain.rampTo(delayVal, 0.05);
        toneReverbSend.gain.rampTo(reverbVal, 0.05);
      },
      dispose: () => {
        toneMonoSynth.dispose();
        toneFilter.dispose();
        toneEqHpf.dispose();
        toneEqLpf.dispose();
        tonePanner.dispose();
        tonePanner3D.dispose();
        tonePannerGain.dispose();
        tonePanner3DGain.dispose();
        toneFreqShifter.dispose();
        toneFsBypassGain.dispose();
        toneFsDirectGain.dispose();
        toneDelaySend.dispose();
        toneReverbSend.dispose();
        toneSpectralSend.dispose();
      }
    };
    synthsRef.current.tone.updateEq = (hpfFreq: number, lpfFreq: number) => {
      toneEqHpf.frequency.rampTo(hpfFreq, 0.05);
      toneEqLpf.frequency.rampTo(lpfFreq, 0.05);
    };
    synthsRef.current.tone.setPan = (value: number) => { tonePanner.pan.rampTo(value, 0.05); };
    synthsRef.current.tone.setFreqShift = (hz: number, enabled?: boolean) => {
      toneFreqShifter.frequency.rampTo(hz, 0.05);
      if (enabled !== undefined) {
        toneFsBypassGain.gain.rampTo(enabled ? 1 : 0, 0.02);
        toneFsDirectGain.gain.rampTo(enabled ? 0 : 1, 0.02);
      }
    };
    synthsRef.current.tone.panner = tonePanner;
    synthsRef.current.tone.freqShifter = toneFreqShifter;
    synthsRef.current.tone.setSpectralSend = (value: number) => { toneSpectralSend.gain.rampTo(value, 0.05); };
    synthsRef.current.tone.setFreezeSend = (value: number) => { toneFreezeSend.gain.rampTo(value, 0.05); };
    synthsRef.current.tone.setReverseSend = (value: number) => { toneReverseSend.gain.rampTo(value, 0.05); };
    synthsRef.current.tone.switchBinaural = (binaural: boolean) => {
      tonePannerGain.gain.rampTo(binaural ? 0 : 1, 0.1);
      tonePanner3DGain.gain.rampTo(binaural ? 1 : 0, 0.1);
    };
    synthsRef.current.tone.updateBinaural = (azimuth: number, distance: number) => {
      const rad = (azimuth * Math.PI) / 180;
      try { tonePanner3D.setPosition(Math.sin(rad) * distance, 0, -Math.cos(rad) * distance); } catch(e) {
        tonePanner3D.positionX.value = Math.sin(rad) * distance;
        tonePanner3D.positionZ.value = -Math.cos(rad) * distance;
      }
    };
    // Envelope Crossfeed injection (Phase 7E) — Cloud modulates Tone's filter
    synthsRef.current.tone.setCrossfeedFreq = (hz: number) => {
      toneFilter.frequency.rampTo(hz, 0.05);
    };
    // Lorenz + Nested LFO injection for tone
    synthsRef.current.tone.updateLorenz = (normalizedValue: number, depth: number, target: string) => {
      if (target === 'filter') {
        toneFilter.frequency.rampTo(600 + normalizedValue * depth, 0.05);
      }
    };
    synthsRef.current.tone.nestedLfoInstance = null;
    synthsRef.current.tone.initNestedLfo = (r1: number, r2: number, d: number) => {
      synthsRef.current.tone.nestedLfoInstance?.dispose();
      synthsRef.current.tone.nestedLfoInstance = createNestedLfo(toneFilter, r1, r2, d);
    };
    synthsRef.current.tone.updateNestedLfo = (r1: number, r2: number, d: number) => {
      synthsRef.current.tone.nestedLfoInstance?.update(r1, r2, d);
    };
    synthsRef.current.tone.disposeNestedLfo = () => {
      synthsRef.current.tone.nestedLfoInstance?.dispose();
      synthsRef.current.tone.nestedLfoInstance = null;
    };

    synthsRef.current.kickFollower = kickFollower;

    return () => {
      // Dispose nested LFOs before disposing synths
      ['kick', 'snare', 'hat', 'tone', 'cloud'].forEach(id => {
        synthsRef.current[id]?.disposeNestedLfo?.();
      });
      if (lorenzRafRef.current) cancelAnimationFrame(lorenzRafRef.current);
      Object.values(synthsRef.current).forEach((s: any) => s.dispose());
      loopRef.current?.dispose();
      if (masterBusRef.current) {
        masterBusRef.current.compressor.dispose();
        masterBusRef.current.limiter.dispose();
        masterBusRef.current.analyser.dispose();
        masterBusRef.current.delay.dispose();
        masterBusRef.current.reverb.dispose();
      }
      if (synthsRef.current.kickFollower) synthsRef.current.kickFollower.dispose();
    };
  }, []);

    useEffect(() => {
      if (masterBusRef.current) {
        masterBusRef.current.delay.feedback.value = delayFeedback;
        masterBusRef.current.delayBus.gain.rampTo(delayMix, 0.05);
      }
    }, [delayMix, delayFeedback]);

    useEffect(() => {
      if (masterBusRef.current) {
        masterBusRef.current.reverbBus.gain.rampTo(reverbMix, 0.05);
      }
    }, [reverbMix]);

    useEffect(() => {
      if (masterBusRef.current) {
        masterBusRef.current.delayFilter.frequency.rampTo(fxLowPass, 0.05);
        masterBusRef.current.reverbFilter.frequency.rampTo(fxHighPass, 0.05);
      }
    }, [fxLowPass, fxHighPass]);

  const gaussianRandom = (mean: number, stdDev: number) => {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return z0 * stdDev + mean;
  };

  useEffect(() => {
    if (loopRef.current) loopRef.current.dispose();
    
    // Initialize indices for all tracks
    const initialIndices: { [key: string]: number } = {};
    tracksRef.current.forEach(t => {
      initialIndices[t.id] = 0;
    });
    stepIndicesRef.current = initialIndices;
    globalStepRef.current = 0;

    loopRef.current = new Tone.Loop((time) => {
      const currentTracks = tracksRef.current;
      const j = jitterRef.current;
      const s = swingRef.current;
      const currentGlobalStep = globalStepRef.current;
      const now = Tone.now();
      const mode = temporalityModeRef.current;
      
      const anySoloed = currentTracks.some(t => t.isSoloed);
      const isOffBeat = currentGlobalStep % 2 === 1;
      const sixteenthDuration = Tone.Time("16n").toSeconds();

      // Grid mode: legacy swing applied globally. Other modes: swing handled per-track inside calculateTemporalOffset.
      const swingDelay = mode === 'grid' ? (isOffBeat ? (s / 100) * (sixteenthDuration * 0.33) : 0) : 0;
      const baseTime = time + swingDelay;

      currentTracks.forEach(track => {
        if (track.id === 'cloud') return;

        const shouldPlay = anySoloed ? track.isSoloed : !track.isMuted;

        // Phase Drift: incrementar acumulador fraccionario
        if (track.driftEnabled) {
          const prev = driftAccumulatorRef.current[track.id] ?? 0;
          const next = prev + (track.driftRate ?? 0.01);
          driftAccumulatorRef.current[track.id] = next % (track.steps * 1000);
        }

        const driftOffset = track.driftEnabled
          ? Math.floor(driftAccumulatorRef.current[track.id] ?? 0)
          : 0;
        const idx = ((currentGlobalStep + track.offset + driftOffset) % track.steps + track.steps) % track.steps;
        
        Tone.Draw.schedule(() => {
          currentStepsRef.current[track.id] = idx;
        }, baseTime);

        if (!shouldPlay) {
          return;
        }

        const isActive = track.pattern[idx] === 1;
        const baseProb = track.probabilities[idx];
        const prob = track.chaosEnabled ? baseProb * track.entropy : baseProb;
        
        let isHit = false;
        let isMiss = false;
        let velocity = 0.85;
        let offset = 0;

        if (isActive) {
          if (Math.random() < prob) {
            isHit = true;
            if (mode === 'grid') {
              // Legacy jitter for Grid mode (regression zero)
              const jitterSeconds = j / 1000;
              offset = jitterSeconds > 0 ? gaussianRandom(0, jitterSeconds / 3) : 0;
            } else {
              // All other modes: offset includes swing + jitter as appropriate
              offset = calculateTemporalOffset(mode, {
                trackId: track.id,
                stepIndex: idx,
                steps: track.steps,
                globalStep: currentGlobalStep,
                swing: s,
                jitter: j,
                sixteenthDuration,
                pattern: track.pattern,
              });
            }
            const baseVelocity = (idx === 0) ? 1.0 : 0.85;
            const randomVariation = (Math.random() * 0.2) * (dynamicsRef.current / 100);
            velocity = Math.max(0.1, baseVelocity - randomVariation);

            // Round Robin: micro-variación gaussiana de velocity por hit
            // El filtro varía automáticamente al variar velocity
            if (track.rrEnabled && (track.rrAmount ?? 30) > 0) {
              const rrScale = (track.rrAmount ?? 30) / 100;
              const u1 = Math.random();
              const u2 = Math.random();
              const gaussian = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
              const rrVariation = gaussian * rrScale * 0.15;
              velocity = Math.max(0.05, Math.min(1.0, velocity + rrVariation));
            }
          } else {
            isMiss = true;
          }
        }

        // Update stats in ref
        const stats = statsRef.current[track.id];
        if (isHit) stats.hits++;
        if (isMiss) {
          stats.misses++;
          stats.lastGhostStep = idx;
        }
        if (idx === 0) {
          stats.cycleCount++;
          // Evolve: mutate probabilities at cycle boundary
          if (track.evolveEnabled && stats.cycleCount > 0 && stats.cycleCount % track.mutationSpeed === 0) {
            const probs = [...track.probabilities];
            const rate = track.mutationRate;
            for (let si = 0; si < track.steps; si++) {
              if (Math.random() < 0.5) {
                const delta = (Math.random() - 0.5) * 2 * rate;
                probs[si] = Math.max(0, Math.min(1, probs[si] + delta));
              }
            }
            pendingMutationsRef.current[track.id] = probs;
          }
        }

        // CA: evolve pattern at cycle boundary via pendingCARef
        if (idx === 0 && (track.patternMode ?? 'euclidean') === 'ca') {
          const speedMod = track.caSpeed ?? 1;
          caEvolveCycleRef.current[track.id] =
            (caEvolveCycleRef.current[track.id] ?? 0) + 1;
          if (caEvolveCycleRef.current[track.id] >= speedMod) {
            caEvolveCycleRef.current[track.id] = 0;
            const existing = caStateRef.current[track.id];
            if (existing) {
              const { pattern: newPat, newState } = generateCAPattern(
                track.caRule ?? 30,
                track.caSeed ?? 'center',
                track.steps,
                track.caDensity ?? 50,
                existing
              );
              caStateRef.current[track.id] = newState;
              pendingCARef.current[track.id] = newPat;
            }
          }
        }

        if (isHit) {
          try {
            const synth = synthsRef.current[track.id];
            if (!synth) return;

            // XLP: skip step trigger when extreme loop is active
            if (track.extremeLoopEnabled && track.samplerStatus === 'READY' && synth.grainPlayer) {
              // Still count the hit visually
              Tone.Draw.schedule(() => {
                setLastHit({ offset, color: track.color, velocity, id: Math.random() });
              }, Tone.now());
              return;
            }

            let scheduledTime = Math.max(baseTime + offset, now + 0.02);
            const lastTime = lastScheduledTimesRef.current[track.id] || 0;
            if (scheduledTime <= lastTime) scheduledTime = lastTime + 0.005;
            lastScheduledTimesRef.current[track.id] = scheduledTime;

            // Unified trigger logic: use triggerAttackRelease if available
            // Compute noteIdx for tonal track — reused in ratchet (P3 fix)
            let noteIdx = 0;
            if (track.isTonal) {
              if ((track.noteMode ?? 'euclidean') === 'markov') {
                const uniqueNotes = markovNotesRef.current[track.id];
                const matrix = markovMatrixRef.current[track.id];
                if (!uniqueNotes || uniqueNotes.length === 0 || !matrix) {
                  noteIdx = track.noteIndices[idx] ?? 0;
                } else {
                  const anchorEvery = track.markovAnchor ?? 0;
                  const anchorCount = markovAnchorCountRef.current[track.id] ?? 0;
                  let notePosition: number;
                  if (anchorEvery > 0 && anchorCount >= anchorEvery) {
                    notePosition = 0;
                    markovAnchorCountRef.current[track.id] = 0;
                  } else {
                    const lastPosition = markovLastNoteRef.current[track.id] ?? 0;
                    notePosition = markovNextNote(lastPosition, matrix);
                    markovAnchorCountRef.current[track.id] = anchorCount + 1;
                  }
                  markovLastNoteRef.current[track.id] = notePosition;
                  noteIdx = uniqueNotes[notePosition];
                }
              } else if (track.rrEnabled && track.noteIndices.length > 1) {
                const rrIdx = rrNoteIndexRef.current[track.id] ?? 0;
                noteIdx = track.noteIndices[rrIdx % track.noteIndices.length];
                rrNoteIndexRef.current[track.id] = (rrIdx + 1) % track.noteIndices.length;
              } else {
                noteIdx = track.noteIndices[idx] ?? 0;
              }
            }

            // Slicer: compute sliceInfo if enabled
            let sliceInfo: { startSec: number; durationSec: number; detuneCents: number; isReverse: boolean } | undefined;
            if (track.slicerEnabled &&
                track.samplerBuffer &&
                track.sliceCount &&
                track.sliceOrder) {
              const boundaries = sliceBoundariesRef.current[track.id];
              if (boundaries && boundaries.length > 0) {
                const slicePosition = track.sliceOrder[idx % track.sliceOrder.length];
                const slice = boundaries[slicePosition % boundaries.length];
                const bufDur = track.samplerBuffer.duration;
                const startSec = slice.start * bufDur;
                const endSec = slice.end * bufDur;
                const sliceDur = Math.max(0.01, endSec - startSec);
                const pitchSemitones = track.slicePitch?.[slicePosition] ?? 0;
                const isReverse = track.sliceReverse?.[slicePosition] ?? false;
                sliceInfo = {
                  startSec: isReverse ? endSec - 0.001 : startSec,
                  durationSec: sliceDur,
                  detuneCents: pitchSemitones * 100,
                  isReverse,
                };
              }
            }

            if (synth.triggerAttackRelease) {
              const duration = track.mode === 'GATE' ? "16n"
                : track.mode === 'ONE-SHOT' && track.samplerBuffer
                  ? Math.max(0.01, (track.sampleEnd - track.sampleStart) * track.samplerBuffer.duration)
                  : (track.decay / 1000);
              
              if (track.isTonal) {
                const freq = noteIndexToFreq(track.rootNote, track.scaleId, noteIdx);
                synth.triggerAttackRelease(freq, duration, scheduledTime, velocity, sliceInfo);
              } else if (track.id === 'kick' && !synth.grainPlayer) {
                synth.triggerAttackRelease("C1", duration, scheduledTime, velocity, sliceInfo);
              } else {
                synth.triggerAttackRelease(duration, scheduledTime, velocity, sliceInfo);
              }
            } else if (synth.grainPlayer && track.samplerStatus === 'READY') {
              // Fallback path (cloud granular) — also respects sampleEnd (Fix 1)
              const bufDur = track.samplerBuffer?.duration || 0;
              const sprayAmount = (track.spray / 1000) * (track.chaosEnabled ? track.entropy : 1);
              const startOffset = track.sampleStart * bufDur;
              const randomOffset = (Math.random() - 0.5) * sprayAmount;
              const finalOffset = Math.max(0, Math.min(bufDur, startOffset + randomOffset));
              const stepDur = track.mode === 'GATE' ? Tone.Time("16n").toSeconds()
                : track.mode === 'ONE-SHOT' ? Math.max(0.01, (track.sampleEnd - track.sampleStart) * bufDur)
                : (track.decay / 1000);
              const endOffset = track.sampleEnd * bufDur;
              const roiDur = Math.max(0.01, endOffset - finalOffset);
              const dur = Math.max(0.01, Math.min(roiDur, stepDur));
              synth.grainPlayer.start(scheduledTime, finalOffset, dur);
            }

            // Layer 2: disparar si existe y hay buffer cargado
            if (synth.triggerLayer2 && synth.layer2Buffer) {
              synth.triggerLayer2(scheduledTime, velocity);
            }

            // Ratchet: schedule additional retriggers within the sixteenth
            // Fix 2: unified ratchet — reuses triggerAttackRelease (which already
            // handles sampleEnd via Fix 1) or falls back to cloud path
            const ratchetCount = track.ratchet || 0;
            if (ratchetCount > 0) {
              const subdivDuration = sixteenthDuration / (ratchetCount + 1);
              for (let r = 1; r <= ratchetCount; r++) {
                const ratchetTime = scheduledTime + subdivDuration * r;
                const ratchetVelocity = velocity * Math.pow(0.65, r);
                try {
                  if (synth.triggerAttackRelease) {
                    const dur = track.mode === 'GATE' ? "32n"
                      : track.mode === 'ONE-SHOT' && track.samplerBuffer
                        ? Math.max(0.01, (track.sampleEnd - track.sampleStart) * track.samplerBuffer.duration / 2)
                        : (track.decay / 2000);
                    if (track.isTonal) {
                      const freq = noteIndexToFreq(track.rootNote, track.scaleId, noteIdx);
                      synth.triggerAttackRelease(freq, dur, ratchetTime, ratchetVelocity, sliceInfo);
                    } else if (track.id === 'kick' && !synth.grainPlayer) {
                      synth.triggerAttackRelease("C1", dur, ratchetTime, ratchetVelocity, sliceInfo);
                    } else {
                      synth.triggerAttackRelease(dur, ratchetTime, ratchetVelocity, sliceInfo);
                    }
                  } else if (synth.grainPlayer && track.samplerStatus === 'READY') {
                    // Ratchet fallback (cloud) — same ROI logic as main trigger
                    const bufDur = track.samplerBuffer?.duration || 0;
                    const sprayAmount = (track.spray / 1000) * (track.chaosEnabled ? track.entropy : 1);
                    const startOff = track.sampleStart * bufDur;
                    const randomOff = (Math.random() - 0.5) * sprayAmount;
                    const finalOff = Math.max(0, Math.min(bufDur, startOff + randomOff));
                    const stepDur = track.mode === 'GATE' ? Tone.Time("32n").toSeconds()
                      : track.mode === 'ONE-SHOT' ? Math.max(0.01, (track.sampleEnd - track.sampleStart) * bufDur / 2)
                      : (track.decay / 2000);
                    const endOff = track.sampleEnd * bufDur;
                    const roiDur = Math.max(0.01, endOff - finalOff);
                    const dur = Math.max(0.01, Math.min(roiDur, stepDur));
                    synth.grainPlayer.start(ratchetTime, finalOff, dur);
                  }
                } catch (e) { /* silent */ }
              }
              // Collision guard: update last scheduled time to the final ratchet
              lastScheduledTimesRef.current[track.id] = scheduledTime + subdivDuration * ratchetCount;
            }

            Tone.Draw.schedule(() => {
              setLastHit({ offset, color: track.color, velocity, id: Math.random() });
              // Fix 3: trigger waveform playhead animation via DOM class
              if (synth.grainPlayer && track.samplerStatus === 'READY') {
                const wfEl = document.querySelector(`.waveform-container[data-track-id="${track.id}"]`);
                if (wfEl) {
                  wfEl.classList.remove('waveform-triggered');
                  void (wfEl as HTMLElement).offsetWidth; // force reflow to restart animation
                  wfEl.classList.add('waveform-triggered');
                  setTimeout(() => wfEl.classList.remove('waveform-triggered'), 150);
                }
              }
            }, scheduledTime);
          } catch (e) {
            console.warn(`Trigger failed for ${track.id}:`, e);
          }
        }
      });

      Tone.Draw.schedule(() => {
        setGlobalStep(currentGlobalStep);
        // Record phase dispersion for sparkline
        const ct = tracksRef.current.filter(t => t.id !== 'cloud' && !t.isMuted);
        if (ct.length >= 2) {
        const phases = ct.map(t => {
          const drift = Math.floor(driftAccumulatorRef.current[t.id] ?? 0);
          return (((currentGlobalStep + t.offset + drift) % t.steps) + t.steps) % t.steps / t.steps;
        });
          // Mean pairwise distance (circular)
          let sum = 0, count = 0;
          for (let a = 0; a < phases.length; a++) {
            for (let b = a + 1; b < phases.length; b++) {
              const diff = Math.abs(phases[a] - phases[b]);
              sum += Math.min(diff, 1 - diff);
              count++;
            }
          }
          const dispersion = count > 0 ? (sum / count) / 0.5 : 0; // normalize 0-1
          const buf = phaseBufferRef.current;
          const head = phaseBufferHeadRef.current;
          if (buf.length < PHASE_BUFFER_SIZE) {
            buf.push(Math.min(1, dispersion));
          } else {
            buf[head % PHASE_BUFFER_SIZE] = Math.min(1, dispersion);
          }
          phaseBufferHeadRef.current = (head + 1) % PHASE_BUFFER_SIZE;
        }
      }, baseTime);

      globalStepRef.current = (currentGlobalStep + 1);
    }, "16n").start(0);

    return () => { loopRef.current?.dispose(); };
  }, []);

  // --- Lorenz RAF loop ---
  const startLorenzRaf = useCallback(() => {
    if (lorenzRafRef.current) {
      cancelAnimationFrame(lorenzRafRef.current);
    }
    const tick = () => {
      const currentTracks = tracksRef.current;
      const anyActive = currentTracks.some(t => t.lorenzEnabled);
      if (!anyActive) {
        lorenzRafRef.current = 0;
        return;
      }
      currentTracks.forEach(t => {
        if (!t.lorenzEnabled) return;
        if (!lorenzAttractorsRef.current[t.id]) {
          lorenzAttractorsRef.current[t.id] = new LorenzAttractor();
        }
        const attractor = lorenzAttractorsRef.current[t.id];
        const speedMult = t.lorenzSpeed ?? 1.0;
        for (let i = 0; i < Math.ceil(speedMult * 2); i++) {
          attractor.step();
        }
        const normalizedValue = attractor.getNormalizedX();
        const depth = t.lorenzDepth ?? 1000;
        if (synthsRef.current[t.id]?.updateLorenz) {
          synthsRef.current[t.id].updateLorenz(
            normalizedValue,
            depth,
            t.lorenzTarget ?? 'filter'
          );
        }
      });
      lorenzRafRef.current = requestAnimationFrame(tick);
    };
    lorenzRafRef.current = requestAnimationFrame(tick);
  }, []);

  // --- Nested LFO helper ---
  const createNestedLfo = useCallback((
    filter: any,
    rate1: number,
    rate2: number,
    depth: number
  ) => {
    const lfo1 = new Tone.Oscillator({ type: 'sine', frequency: rate1 });
    const lfo2 = new Tone.Oscillator({ type: 'sine', frequency: rate2 });
    const lfo1ModGain = new Tone.Gain(rate2 * 0.5);
    lfo1.connect(lfo1ModGain);
    lfo1ModGain.connect(lfo2.frequency);
    const lfo2DepthGain = new Tone.Gain(depth);
    lfo2.connect(lfo2DepthGain);
    if (filter) lfo2DepthGain.connect(filter.frequency);
    lfo1.start();
    lfo2.start();
    return {
      lfo1, lfo2, lfo1ModGain, lfo2DepthGain,
      update: (r1: number, r2: number, d: number) => {
        lfo1.frequency.rampTo(r1, 0.1);
        lfo2.frequency.rampTo(r2, 0.1);
        lfo1ModGain.gain.rampTo(r2 * 0.5, 0.1);
        lfo2DepthGain.gain.rampTo(d, 0.1);
      },
      dispose: () => {
        lfo1.stop(); lfo1.dispose();
        lfo2.stop(); lfo2.dispose();
        lfo1ModGain.dispose();
        lfo2DepthGain.dispose();
      }
    };
  }, []);

  const togglePlay = async () => {
    if (Tone.getContext().state !== 'running') await Tone.start();
    if (isPlaying) {
      logChange('■ Stop');
      Tone.getTransport().stop();
      // Stop cloud grain player if it exists
      const cloudTrackStop = tracksRef.current.find(t => t.id === 'cloud');
      if (cloudTrackStop?.cloudMode === 'eno') {
        synthsRef.current.cloud?.stopEno?.();
      } else if (synthsRef.current.cloud?.grainPlayer) {
        synthsRef.current.cloud.grainPlayer.stop();
      }
      // Stop ambient loops if running
      if (synthsRef.current.tone?.stop) {
        synthsRef.current.tone.stop();
      }
      // Stop XLP loops
      tracksRef.current.forEach(t => {
        if (t.extremeLoopEnabled && synthsRef.current[t.id]?.grainPlayer) {
          try { synthsRef.current[t.id].grainPlayer.stop(); } catch {}
        }
      });
      // Reset current steps ref
      Object.keys(currentStepsRef.current).forEach(id => currentStepsRef.current[id] = -1);
      
      const resetIndices: { [key: string]: number } = {};
      const resetTimes: { [key: string]: number } = {};
      tracksRef.current.forEach(t => {
        resetIndices[t.id] = 0;
        resetTimes[t.id] = 0;
      });
      stepIndicesRef.current = resetIndices;
      lastScheduledTimesRef.current = resetTimes;
      
      globalStepRef.current = 0;
      setGlobalStep(0);
      rrNoteIndexRef.current = {};
      markovLastNoteRef.current = {};
      markovAnchorCountRef.current = {};
      driftAccumulatorRef.current = {};
      setDriftOffsets({});
      caStateRef.current = {};
      caEvolveCycleRef.current = {};
      pendingCARef.current = {};
      // Stop Lorenz RAF
      if (lorenzRafRef.current) {
        cancelAnimationFrame(lorenzRafRef.current);
        lorenzRafRef.current = 0;
      }
    } else {
      // Ensure Markov matrices exist for tonal tracks on Play
      tracks.forEach(t => {
        if (t.isTonal && (t.noteMode ?? 'euclidean') === 'markov') {
          if (!markovMatrixRef.current[t.id]) updateMarkovMatrix(t);
        }
      });
      const activeTracks = tracks.filter(t => !t.isMuted).length;
      logChange('▶ Play', [`BPM ${bpm}`, `${activeTracks} activos`]);
      Tone.getTransport().bpm.value = bpm;
      Tone.getTransport().start();
      // Start cloud based on mode
      const cloudTrackStart = tracksRef.current.find(t => t.id === 'cloud');
      if (cloudTrackStart?.cloudMode === 'eno') {
        synthsRef.current.cloud?.startEno?.();
      } else if (synthsRef.current.cloud?.grainPlayer) {
        synthsRef.current.cloud.grainPlayer.start();
      }
      // Start Lorenz RAF if any track has it enabled
      startLorenzRaf();
      // Start XLP loops
      tracksRef.current.forEach(t => {
        if (t.extremeLoopEnabled && t.samplerStatus === 'READY' && synthsRef.current[t.id]?.grainPlayer) {
          try { synthsRef.current[t.id].grainPlayer.start(); } catch {}
        }
      });
    }
    setIsPlaying(!isPlaying);
  };

  const handlePhaseSync = () => {
    setGlobalStep(0);
    globalStepRef.current = 0;
    driftAccumulatorRef.current = {};
    setDriftOffsets({});
    caStateRef.current = {};
    caEvolveCycleRef.current = {};
    pendingCARef.current = {};
    
    const resetIndices: { [key: string]: number } = {};
    const resetTimes: { [key: string]: number } = {};
    tracksRef.current.forEach(t => {
      resetIndices[t.id] = 0;
      resetTimes[t.id] = 0;
    });
    stepIndicesRef.current = resetIndices;
    lastScheduledTimesRef.current = resetTimes;
    
    if (isPlaying) {
      Tone.getTransport().stop();
      const cloudTrackSync = tracksRef.current.find(t => t.id === 'cloud');
      if (cloudTrackSync?.cloudMode === 'eno') {
        synthsRef.current.cloud?.stopEno?.();
      } else if (synthsRef.current.cloud?.grainPlayer) {
        synthsRef.current.cloud.grainPlayer.stop();
      }
      Tone.getTransport().start();
      if (cloudTrackSync?.cloudMode === 'eno') {
        synthsRef.current.cloud?.startEno?.();
      } else if (synthsRef.current.cloud?.grainPlayer) {
        synthsRef.current.cloud.grainPlayer.start();
      }
    }
  };

  useEffect(() => {
    tracks.forEach(track => {
      const synth = synthsRef.current[track.id];
      if (synth) {
        try {
          synth.setVolume(track.volume);
          synth.setSends(track.delaySend, track.reverbSend);
          if (synth.bitCrusher) {
            synth.bitCrusher.bits.value = track.bitCrush;
          }
      if (synth.grainPlayer) {
        synth.grainPlayer.grainSize = track.grainSize / 1000;
        synth.grainPlayer.overlap = track.overlap;
        synth.grainPlayer.detune = track.pitch * 100;
        const stretchRate = track.stretchEnabled ? (track.stretchRate ?? 1.0) : 1.0;
        synth.grainPlayer.playbackRate = stretchRate;
        // XLP sync
        if (track.extremeLoopEnabled && track.samplerBuffer) {
          synth.grainPlayer.loop = true;
          const loopPt = (track.extremeLoopPoint ?? 0.5) * track.samplerBuffer.duration;
          const loopSz = (track.extremeLoopSize ?? 10) / 1000;
          synth.grainPlayer.loopStart = loopPt;
          synth.grainPlayer.loopEnd = loopPt + loopSz;
          synth.grainPlayer.grainSize = loopSz;
        } else if (track.id !== 'cloud') {
          synth.grainPlayer.loop = false;
        }
      }
        } catch (e) {
          console.warn(`Failed to sync params for track ${track.id}:`, e);
        }
      }
    });
  }, [tracks]);

  const handleFileUpload = async (trackId: string, file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      alert("El archivo excede el límite de seguridad (10MB).");
      return;
    }

    if (!masterBusRef.current) {
      alert("El motor de audio no está listo. Por favor, espera un momento.");
      return;
    }

    // Ensure Tone is started on user gesture
    await Tone.start();
    if (Tone.getContext().state !== 'running') {
      await Tone.getContext().resume();
    }

    setTracks(prev => prev.map(t => t.id === trackId ? { ...t, samplerStatus: 'DECODING', samplerFilename: file.name } : t));

    try {
      console.log(`[Sampler] Loading file: ${file.name} for track: ${trackId}`);
      
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await Tone.getContext().decodeAudioData(arrayBuffer);
      
      if (!audioBuffer || audioBuffer.length === 0) throw new Error("Failed to decode audio buffer or buffer is empty");
      
      console.log(`[Sampler] Decoded successfully. Duration: ${audioBuffer.duration.toFixed(2)}s`);

      if (audioBuffer.duration > 10.1) {
        alert("El audio excede los 10 segundos permitidos.");
        setTracks(prev => prev.map(t => t.id === trackId ? { ...t, samplerStatus: 'IDLE', samplerFilename: null } : t));
        return;
      }

      // Cleanup previous engine parts
      if (synthsRef.current[trackId]?.dispose) {
        synthsRef.current[trackId].dispose();
      }

      const master = masterBusRef.current;
      const delaySend = new Tone.Gain(0).connect(master.delayBus);
      const reverbSend = new Tone.Gain(0).connect(master.reverbBus);
      const spectralSend = new Tone.Gain(0).connect(master.spectralDelayBus);
      const freezeSendNode = new Tone.Gain(0).connect(master.freezeBus);
      const reverseSendNode = new Tone.Gain(0).connect(master.reverseBus);

      // Create BitCrusher for this track — route through panner→freqShifter if available
      const pannerNode = synthsRef.current[trackId]?.panner;
      const bitCrusher = new Tone.BitCrusher(16).connect(
        pannerNode ?? (trackId === 'cloud' ? synthsRef.current.cloud.ducker : master.compressor)
      );
      bitCrusher.connect(delaySend);
      bitCrusher.connect(reverbSend);
      bitCrusher.connect(spectralSend);
      bitCrusher.connect(freezeSendNode);
      bitCrusher.connect(reverseSendNode);

      // Create GrainPlayer
      const grainPlayer = new Tone.GrainPlayer(audioBuffer).connect(bitCrusher);
      grainPlayer.loop = trackId === 'cloud';
      
      console.log(`[Sampler] GrainPlayer created for ${trackId}. Buffer duration: ${grainPlayer.buffer.duration}`);

      // Update state to READY
      setTracks(prev => prev.map(t => {
        if (t.id !== trackId) return t;
        return { 
          ...t, 
          samplerStatus: 'READY', 
          samplerBuffer: audioBuffer,
          sampleStart: 0,
          sampleEnd: 1,
          attack: trackId === 'cloud' ? 2000 : 0,
          decay: trackId === 'cloud' ? 5000 : Math.min(2000, Math.round(audioBuffer.duration * 1000)),
          grainSize: trackId === 'cloud' ? 500 : 100,
          overlap: 0.5,
          spray: trackId === 'cloud' ? 200 : 0,
          bitCrush: 16,
          pitch: 0
        };
      }));

      // Check cloudMode — start granular or Eno
      const currentCloudTrack = tracksRef.current.find(t => t.id === 'cloud');
      if (trackId === 'cloud' && isPlaying && currentCloudTrack?.cloudMode !== 'eno') {
        grainPlayer.start();
      }

      // Ensure the synth object exists and is clean
      if (!synthsRef.current[trackId]) {
        synthsRef.current[trackId] = {};
      }
      
      const synthObj = synthsRef.current[trackId];
      synthObj.grainPlayer = grainPlayer;
      synthObj.bitCrusher = bitCrusher;
      synthObj.delaySend = delaySend;
      synthObj.reverbSend = reverbSend;
      
      synthObj.dispose = () => {
        grainPlayer.dispose();
        bitCrusher.dispose();
        delaySend.dispose();
        reverbSend.dispose();
      };

      synthObj.triggerAttackRelease = (duration: any, time: number, velocity: number, sliceInfoArg?: { startSec: number; durationSec: number; detuneCents: number; isReverse: boolean }) => {
        const currentTrack = tracksRef.current.find(t => t.id === trackId);
        if (!currentTrack || !grainPlayer.buffer) return;
        
        // If it's a Tone.Buffer, check if it's loaded. If it's a raw AudioBuffer, it's always "loaded"
        if (grainPlayer.buffer instanceof Tone.ToneAudioBuffer && !grainPlayer.buffer.loaded) {
          console.warn(`[Sampler] Buffer for ${trackId} not yet loaded`);
          return;
        }

        // Time Stretch: compute rate and pitch compensation
        const stretchRate = currentTrack.stretchEnabled ? (currentTrack.stretchRate ?? 1.0) : 1.0;
        const stretchCompensation = stretchRate !== 1.0 ? -1200 * Math.log2(stretchRate) : 0;
        grainPlayer.playbackRate = stretchRate;

        // Slicer override: use slice boundaries if available
        if (sliceInfoArg) {
          grainPlayer.grainSize = currentTrack.grainSize / 1000;
          grainPlayer.overlap = currentTrack.overlap;
          grainPlayer.detune = sliceInfoArg.detuneCents + (velocity - 0.8) * 100 + stretchCompensation;
          grainPlayer.reverse = sliceInfoArg.isReverse;
          try {
            if (grainPlayer.mute) grainPlayer.mute = false;
            grainPlayer.start(time, sliceInfoArg.startSec, sliceInfoArg.durationSec);
          } catch (err) {
            console.warn("GrainPlayer slicer start failed:", err);
          }
          return; // slicer path complete
        }

        // Normal path (no slicer)
        grainPlayer.reverse = false;
        grainPlayer.grainSize = currentTrack.grainSize / 1000;
        grainPlayer.overlap = currentTrack.overlap;
        grainPlayer.detune = currentTrack.pitch * 100 + (velocity - 0.8) * 100 + stretchCompensation;
        
        const sprayAmount = (currentTrack.spray / 1000) * (currentTrack.chaosEnabled ? currentTrack.entropy : 1);
        const startOffset = currentTrack.sampleStart * audioBuffer.duration;
        const randomOffset = (Math.random() - 0.5) * sprayAmount;
        const finalOffset = Math.max(0, Math.min(audioBuffer.duration, startOffset + randomOffset));
        
        const durSeconds = typeof duration === 'string' ? Tone.Time(duration).toSeconds() : duration;

        if (trackId !== 'cloud') {
          try {
            const startOffsetSec = Math.max(0, Math.min(audioBuffer.duration - 0.01, finalOffset));
            const endOffsetSec = currentTrack.sampleEnd * audioBuffer.duration;
            const roiDuration = Math.max(0.01, endOffsetSec - startOffsetSec);
            const durationSec = Math.max(0.01, Math.min(roiDuration, durSeconds));
            
            if (grainPlayer.mute) grainPlayer.mute = false;
            grainPlayer.start(time, startOffsetSec, durationSec);
          } catch (err) {
            console.warn("GrainPlayer start failed:", err);
          }
        }
      };

      synthObj.setVolume = (vol: number) => {
        grainPlayer.volume.rampTo(Tone.gainToDb(vol), 0.05);
      };
      
      synthObj.setSends = (delayVal: number, reverbVal: number) => {
        delaySend.gain.rampTo(delayVal, 0.05);
        reverbSend.gain.rampTo(reverbVal, 0.05);
      };
      synthObj.setSpectralSend = (value: number) => {
        spectralSend.gain.rampTo(value, 0.05);
      };
      synthObj.setFreezeSend = (value: number) => {
        freezeSendNode.gain.rampTo(value, 0.05);
      };
      synthObj.setReverseSend = (value: number) => {
        reverseSendNode.gain.rampTo(value, 0.05);
      };
      
      // Update initial sends and volume
      const track = tracksRef.current.find(t => t.id === trackId);
      if (track) {
        synthObj.setVolume(track.volume);
        synthObj.setSends(track.delaySend, track.reverbSend);
        synthObj.setSpectralSend(track.spectralDelaySend ?? 0);
        synthObj.setFreezeSend(track.freezeSend ?? 0);
        synthObj.setReverseSend(track.reverseSend ?? 0);
      }

      // If Cloud in Eno mode, initialize Eno engine after GrainPlayer setup
      if (trackId === 'cloud' && track?.cloudMode === 'eno') {
        initCloudEno(audioBuffer);
      }

    } catch (e) {
      console.error("Error decodificando audio:", e);
      setTracks(prev => prev.map(t => t.id === trackId ? { ...t, samplerStatus: 'IDLE', samplerFilename: null } : t));
      alert("Error al cargar el archivo de audio. Asegúrate de que sea un formato compatible.");
    }
  };

  // === Eno Engine for Cloud ===
  const initCloudEno = useCallback((audioBuffer: AudioBuffer) => {
    const cloudSynth = synthsRef.current.cloud;
    if (!cloudSynth?.ducker) return;

    // Capture skeleton refs before overwriting engine methods
    const existingDucker = cloudSynth.ducker;
    const existingDelaySend = cloudSynth.delaySend;
    const existingReverbSend = cloudSynth.reverbSend;

    // Stop granular if running
    if (cloudSynth.grainPlayer) {
      try { cloudSynth.grainPlayer.stop(); } catch {}
    }

    // Clean up previous Eno if any
    if (cloudSynth.enoDispose) {
      try { cloudSynth.enoDispose(); } catch {}
    }

    const BASE_DURATIONS = [2.3, 3.7, 5.1, 7.3];
    const NUM_LOOPS = BASE_DURATIONS.length;

    const enoMaster = new Tone.Gain(1);
    enoMaster.connect(existingDucker);

    const enoPlayers: Tone.Player[] = [];
    const enoRepeatIds: number[] = [];
    let enoActive = false;

    const toneBuffer = new Tone.ToneAudioBuffer(audioBuffer);

    for (let i = 0; i < NUM_LOOPS; i++) {
      const player = new Tone.Player(toneBuffer);
      player.connect(enoMaster);
      enoPlayers.push(player);
    }

    const scheduleEnoLoop = (loopIdx: number) => {
      const cloudTrack = tracksRef.current.find(t => t.id === 'cloud');
      const speedMult = cloudTrack?.enoSpeed ?? 1.0;
      const dur = BASE_DURATIONS[loopIdx] * speedMult;
      const player = enoPlayers[loopIdx];
      if (!player.buffer || !player.buffer.loaded || !enoActive) return;

      const bufDur = player.buffer.duration;
      const maxOffset = Math.max(0, bufDur - dur);
      const offset = Math.random() * maxOffset;

      try {
        player.start(Tone.now(), offset, dur);
      } catch {}

      const nextTime = Tone.now() + dur;
      const id = Tone.getTransport().scheduleOnce(() => {
        if (enoActive) scheduleEnoLoop(loopIdx);
      }, nextTime);
      enoRepeatIds[loopIdx] = id;
    };

    const startEno = () => {
      if (enoActive) return;
      enoActive = true;
      for (let i = 0; i < NUM_LOOPS; i++) {
        Tone.getTransport().scheduleOnce(() => {
          if (enoActive) scheduleEnoLoop(i);
        }, `+${i * 0.4}`);
      }
    };

    const stopEno = () => {
      enoActive = false;
      enoRepeatIds.forEach(id => {
        try { Tone.getTransport().clear(id); } catch {}
      });
      enoPlayers.forEach(p => {
        try { p.stop(); } catch {}
      });
    };

    const disposeEno = () => {
      stopEno();
      enoPlayers.forEach(p => {
        try { p.dispose(); } catch {}
      });
      enoMaster.dispose();
    };

    // Attach Eno methods to cloud synth
    cloudSynth.startEno = startEno;
    cloudSynth.stopEno = stopEno;
    cloudSynth.enoDispose = disposeEno;

    // Override setVolume to handle Eno master gain
    const originalSetVolume = cloudSynth.setVolume;
    cloudSynth.setVolume = (vol: number) => {
      // Granular volume
      if (cloudSynth.grainPlayer) {
        try { cloudSynth.grainPlayer.volume.rampTo(Tone.gainToDb(vol), 0.05); } catch {}
      }
      // Eno volume
      enoMaster.gain.value = vol;
    };

    // Re-expose setSends (skeleton sends are still connected)
    cloudSynth.setSends = (delayVal: number, reverbVal: number) => {
      if (existingDelaySend) existingDelaySend.gain.rampTo(delayVal, 0.05);
      if (existingReverbSend) existingReverbSend.gain.rampTo(reverbVal, 0.05);
    };

    // If already playing, start Eno immediately
    if (isPlaying) {
      startEno();
    }
  }, [isPlaying]);

  const handleCloudModeChange = useCallback((newMode: 'granular' | 'eno') => {
    setTracks(prev => prev.map(t => t.id === 'cloud' ? { ...t, cloudMode: newMode } : t));

    const cloudTrack = tracksRef.current.find(t => t.id === 'cloud');
    const cloudSynth = synthsRef.current.cloud;

    if (newMode === 'eno') {
      // Stop granular
      if (cloudSynth?.grainPlayer) {
        try { cloudSynth.grainPlayer.stop(); } catch {}
      }
      // Init Eno if buffer is available
      if (cloudTrack?.samplerBuffer) {
        initCloudEno(cloudTrack.samplerBuffer);
      }
    } else {
      // Stop Eno
      if (cloudSynth?.stopEno) {
        cloudSynth.stopEno();
      }
      // Restart granular if playing
      if (isPlaying && cloudSynth?.grainPlayer) {
        try { cloudSynth.grainPlayer.start(); } catch {}
      }
    }
  }, [initCloudEno, isPlaying]);

  const handleSamplerParamChange = useCallback((trackId: string, param: string, val: any) => {
    setTracks(prev => prev.map(t => {
      if (t.id !== trackId) return t;
      return { ...t, [param]: val };
    }));

    // Sync with Tone.js nodes in real-time
    const synthObj = synthsRef.current[trackId];
    if (synthObj) {
      if (synthObj.grainPlayer) {
        switch (param) {
          case 'grainSize': synthObj.grainPlayer.grainSize = val / 1000; break;
          case 'overlap': synthObj.grainPlayer.overlap = val; break;
          case 'spray': 
            // Simulate spray by slightly randomizing playbackRate or detune if needed
            // but for now we'll use it to set the internal grain randomization if possible
            // Tone.GrainPlayer doesn't have a direct spray, but we can use detune randomization
            break;
          case 'pitch': synthObj.grainPlayer.detune = val * 100; break;
          case 'stretchRate': synthObj.grainPlayer.playbackRate = val; break;
          case 'stretchEnabled': synthObj.grainPlayer.playbackRate = val ? (tracksRef.current.find(t => t.id === trackId)?.stretchRate ?? 1.0) : 1.0; break;
          case 'sampleStart': synthObj.grainPlayer.loopStart = val * synthObj.grainPlayer.buffer.duration; break;
          case 'sampleEnd': synthObj.grainPlayer.loopEnd = val * synthObj.grainPlayer.buffer.duration; break;
          case 'attack': synthObj.grainPlayer.fadeIn = val / 1000; break;
          case 'decay': synthObj.grainPlayer.fadeOut = val / 1000; break;
          case 'extremeLoopEnabled': {
            const currentTrack = tracksRef.current.find(t => t.id === trackId);
            if (val && currentTrack?.samplerBuffer) {
              synthObj.grainPlayer.loop = true;
              const loopPt = (currentTrack.extremeLoopPoint ?? 0.5) * currentTrack.samplerBuffer.duration;
              const loopSz = (currentTrack.extremeLoopSize ?? 10) / 1000;
              synthObj.grainPlayer.loopStart = loopPt;
              synthObj.grainPlayer.loopEnd = loopPt + loopSz;
              synthObj.grainPlayer.grainSize = loopSz;
              if (isPlaying) try { synthObj.grainPlayer.start(); } catch {}
            } else {
              synthObj.grainPlayer.loop = trackId === 'cloud';
              try { if (trackId !== 'cloud') synthObj.grainPlayer.stop(); } catch {}
            }
            break;
          }
          case 'extremeLoopSize': {
            const ct = tracksRef.current.find(t => t.id === trackId);
            if (ct?.extremeLoopEnabled && ct.samplerBuffer) {
              const loopSz = val / 1000;
              const loopPt = (ct.extremeLoopPoint ?? 0.5) * ct.samplerBuffer.duration;
              synthObj.grainPlayer.loopStart = loopPt;
              synthObj.grainPlayer.loopEnd = loopPt + loopSz;
              synthObj.grainPlayer.grainSize = loopSz;
            }
            break;
          }
          case 'extremeLoopPoint': {
            const ct2 = tracksRef.current.find(t => t.id === trackId);
            if (ct2?.extremeLoopEnabled && ct2.samplerBuffer) {
              const loopPt = val * ct2.samplerBuffer.duration;
              const loopSz = (ct2.extremeLoopSize ?? 10) / 1000;
              synthObj.grainPlayer.loopStart = loopPt;
              synthObj.grainPlayer.loopEnd = loopPt + loopSz;
            }
            break;
          }
        }
      }
      if (synthObj.bitCrusher && param === 'bitCrush') {
        synthObj.bitCrusher.bits.value = val;
      }
      // EQ real-time sync
      if (['eqEnabled', 'eqHpfFreq', 'eqLpfFreq'].includes(param)) {
        const updatedTrack = tracksRef.current.find(t => t.id === trackId);
        if (updatedTrack) {
          const merged = { ...updatedTrack, [param]: val };
          const hpf = merged.eqEnabled ? (merged.eqHpfFreq ?? 20) : 20;
          const lpf = merged.eqEnabled ? (merged.eqLpfFreq ?? 20000) : 20000;
          synthObj.updateEq?.(hpf, lpf);
        }
      }
      // Pan real-time sync
      if (param === 'pan') {
        synthObj.setPan?.(val as number);
      }
      // FreqShift real-time sync
      if (param === 'freqShift') {
        const updatedTrack = tracksRef.current.find(t => t.id === trackId);
        if (updatedTrack?.freqShiftEnabled) {
          synthObj.setFreqShift?.(val as number);
        }
      }
      if (param === 'freqShiftEnabled') {
        const updatedTrack = tracksRef.current.find(t => t.id === trackId);
        synthObj.setFreqShift?.(val ? (updatedTrack?.freqShift ?? 0) : 0, val as boolean);
      }
      // Spectral Delay Send real-time sync
      if (param === 'spectralDelaySend') {
        synthObj.setSpectralSend?.(val as number);
      }
      // Freeze Send real-time sync (Phase 9)
      if (param === 'freezeSend') {
        synthObj.setFreezeSend?.(val as number);
      }
      // Reverse Send real-time sync (Phase 9)
      if (param === 'reverseSend') {
        synthObj.setReverseSend?.(val as number);
      }
      // Binaural real-time sync
      if (param === 'binauralEnabled') {
        synthObj.switchBinaural?.(val as boolean);
        if (val) {
          const updatedTrack = tracksRef.current.find(t => t.id === trackId);
          synthObj.updateBinaural?.(updatedTrack?.binauralAzimuth ?? 0, updatedTrack?.binauralDistance ?? 3);
        }
      }
      if (param === 'binauralAzimuth' || param === 'binauralDistance') {
        const updatedTrack = tracksRef.current.find(t => t.id === trackId);
        if (updatedTrack?.binauralEnabled) {
          const az = param === 'binauralAzimuth' ? (val as number) : (updatedTrack?.binauralAzimuth ?? 0);
          const dist = param === 'binauralDistance' ? (val as number) : (updatedTrack?.binauralDistance ?? 3);
          synthObj.updateBinaural?.(az, dist);
        }
      }
    }
  }, []);

  // ────── Universal Param Change (simple setTracks + optional logging) ──────
  const handleParamChange = useCallback((trackId: string, param: string, value: any) => {
    // ── Change 5/6: activeScene with SYNC ALL support ──
    if (param === 'activeScene') {
      // TODO: aplicar SceneData al track cuando se implemente en refactoring
      if (syncAllScenes) {
        setTracks(prev => prev.map(t => ({ ...t, activeScene: value as number })));
      } else {
        setTracks(prev => prev.map(t => t.id === trackId ? { ...t, activeScene: value as number } : t));
      }
      return;
    }
    const track = tracksRef.current.find(t => t.id === trackId);
    if (track) {
      switch (param) {
        case 'chaosEnabled': logChange(`Chaos ${value ? 'ON' : 'OFF'} (${track.name})`); break;
        case 'evolveEnabled': logChange(`Evolve ${value ? 'ON' : 'OFF'} (${track.name})`); break;
        case 'entropy': logChange(`${track.name} entropy → ${Math.round(value * 100)}%`); break;
        case 'mutationRate': logChange(`${track.name} mutation → ${Math.round(value * 100)}%`); break;
      }
    }
    setTracks(prev => prev.map(t => t.id === trackId ? { ...t, [param]: value } : t));
  }, [logChange, syncAllScenes]);

  // ────── Sequencer Actions ──────
  const handleSequencerAction = useCallback((trackId: string, action: string, value?: any, value2?: any) => {
    switch (action) {
      case 'steps': {
        const track = tracksRef.current.find(t => t.id === trackId);
        if (!track) return;
        const val = value as number;
        const oldDensity = Math.round((track.pulses / track.steps) * 100);
        const newPulses = Math.min(track.pulses, val);
        const newDensity = Math.round((newPulses / val) * 100);
        const rhythmicSteps = tracksRef.current.filter(t => t.id !== 'cloud').map(t => t.id === trackId ? val : t.steps);
        const newMcm = lcmArray(rhythmicSteps);
        const oldMcm = lcmArray(tracksRef.current.filter(t => t.id !== 'cloud').map(t => t.steps));
        const deltas: string[] = [];
        if (newMcm !== oldMcm) deltas.push(`MCM ${oldMcm} → ${newMcm}`);
        deltas.push(`Dens ${oldDensity}% → ${newDensity}%`);
        logChange(`${track.name} steps ${track.steps} → ${val}`, deltas);
        setTracks(prev => prev.map(t => t.id === trackId ? updateTrackPattern({ ...t, steps: val, pulses: Math.min(t.pulses, val) }) : t));
        break;
      }
      case 'pulses': {
        const track = tracksRef.current.find(t => t.id === trackId);
        if (!track) return;
        const val = value as number;
        logChange(`${track.name} pulses ${track.pulses} → ${val}`, [`Dens ${Math.round((track.pulses / track.steps) * 100)}% → ${Math.round((val / track.steps) * 100)}%`]);
        setTracks(prev => prev.map(t => t.id === trackId ? updateTrackPattern({ ...t, pulses: val }) : t));
        break;
      }
      case 'offset': {
        const track = tracksRef.current.find(t => t.id === trackId);
        if (track) logChange(`${track.name} offset ${track.offset} → ${value}`);
        setTracks(prev => prev.map(t => t.id === trackId ? updateTrackPattern({ ...t, offset: value }) : t));
        break;
      }
      case 'probability': {
        setTracks(prev => prev.map(t => {
          if (t.id !== trackId) return t;
          const newProbs = [...t.probabilities];
          newProbs[value as number] = value2 as number;
          return { ...t, probabilities: newProbs };
        }));
        break;
      }
      case 'toggleStep': {
        setTracks(prev => prev.map(t => {
          if (t.id !== trackId) return t;
          const newPattern = [...t.pattern];
          newPattern[value as number] = newPattern[value as number] === 1 ? 0 : 1;
          return { ...t, pattern: newPattern, pulses: newPattern.filter(p => p === 1).length };
        }));
        break;
      }
      case 'noteIndex': {
        setTracks(prev => prev.map(t => {
          if (t.id !== trackId) return t;
          const newIndices = [...t.noteIndices];
          newIndices[value as number] = value2 as number;
          return { ...t, noteIndices: newIndices };
        }));
        break;
      }
      case 'patternMode':
        if (value === 'ca') { delete caStateRef.current[trackId]; caEvolveCycleRef.current[trackId] = 0; }
        setTracks(prev => prev.map(t => t.id === trackId ? updateTrackPattern({ ...t, patternMode: value }) : t));
        break;
      case 'lsParam':
        setTracks(prev => prev.map(t => t.id === trackId ? updateTrackPattern({ ...t, [value]: value2 }) : t));
        break;
      case 'lsRegenerate':
        setTracks(prev => prev.map(t => t.id === trackId ? updateTrackPattern(t) : t));
        break;
      case 'lsReset':
        setTracks(prev => prev.map(t => t.id === trackId ? updateTrackPattern({ ...t, lsSeed: 'X', lsRuleA: 'XO', lsIterations: 3, lsRotation: 0 }) : t));
        break;
      case 'caParam':
        delete caStateRef.current[trackId]; caEvolveCycleRef.current[trackId] = 0;
        setTracks(prev => prev.map(t => t.id === trackId ? updateTrackPattern({ ...t, [value]: value2 }) : t));
        break;
      case 'caReset':
        delete caStateRef.current[trackId]; caEvolveCycleRef.current[trackId] = 0;
        setTracks(prev => prev.map(t => t.id === trackId ? updateTrackPattern(t) : t));
        break;
      case 'noteMode': {
        const track = tracksRef.current.find(t => t.id === trackId);
        if (track && value === 'markov') updateMarkovMatrix({ ...track, noteMode: value } as any);
        setTracks(prev => prev.map(t => t.id === trackId ? { ...t, noteMode: value } : t));
        break;
      }
      case 'markovParam': {
        const track = tracksRef.current.find(t => t.id === trackId);
        if (track && ['markovStyle', 'markovTemperature'].includes(value)) updateMarkovMatrix({ ...track, [value]: value2 } as any);
        setTracks(prev => prev.map(t => t.id === trackId ? { ...t, [value]: value2 } : t));
        break;
      }
      case 'markovRegenerate': {
        const t = tracksRef.current.find(tr => tr.id === trackId);
        if (t) updateMarkovMatrix(t as any);
        break;
      }
    }
  }, [logChange, updateMarkovMatrix]);

  // ────── Tonal/Synth Actions ──────
  const handleTonalAction = useCallback((trackId: string, action: string, value?: any) => {
    const synth = synthsRef.current[trackId];
    const track = tracksRef.current.find(t => t.id === trackId);

    if (action === 'synthType') {
      setTracks(prev => prev.map(t => t.id === trackId ? { ...t, synthType: value } : t));
      synth?.disposeNestedLfo?.();
      if (synth?.dispose) synth.dispose();
      initializeOriginalSynth(trackId, value);
      logChange(`${track?.name ?? 'Tone'} synth → ${String(value).toUpperCase()}`);
      return;
    }
    if (action === 'cloudMode') {
      handleCloudModeChange(value);
      return;
    }

    setTracks(prev => prev.map(t => t.id === trackId ? { ...t, [action]: value } : t));

    const merged = track ? { ...track, [action]: value } : null;
    if (!merged) return;
    switch (action) {
      case 'fmRatio': case 'fmIndex':
        synth?.updateFmParams?.(merged.fmRatio ?? 2, merged.fmIndex ?? 10); break;
      case 'wfAmount': case 'wfSymmetry':
        synth?.updateWfParams?.(merged.wfAmount ?? 3, merged.wfSymmetry ?? 0); break;
      case 'addPartials': case 'addBrightness':
        synth?.updateAddParams?.(merged.addPartials ?? 4, merged.addBrightness ?? 0.5); break;
      case 'arRate': case 'arDepth':
        synth?.updateArParams?.(merged.arRate ?? 80, merged.arDepth ?? 0); break;
      case 'padVoices': case 'padDetune': case 'padAttack':
        synth?.updatePadParams?.(merged.padVoices ?? 5, merged.padDetune ?? 30, merged.padAttack ?? 0.3); break;
      case 'droneFeedback': case 'droneFilterFreq':
        synth?.updateDroneParams?.(merged.droneFeedback ?? 0.88, merged.droneFilterFreq ?? 2000); break;
      case 'ksDecay': case 'ksBrightness':
        synth?.updateKsParams?.(merged.ksDecay ?? 0.97, merged.ksBrightness ?? 5000); break;
      case 'lorenzEnabled':
        if (value === true) startLorenzRaf(); break;
      case 'nestedLfoEnabled':
        if (value) { synth?.initNestedLfo?.(track?.nestedLfoRate1 ?? 0.1, track?.nestedLfoRate2 ?? 4.0, track?.nestedLfoDepth ?? 800); }
        else { synth?.disposeNestedLfo?.(); }
        break;
      case 'nestedLfoRate1': case 'nestedLfoRate2': case 'nestedLfoDepth':
        synth?.updateNestedLfo?.(merged.nestedLfoRate1 ?? 0.1, merged.nestedLfoRate2 ?? 4.0, merged.nestedLfoDepth ?? 800); break;
    }
  }, [logChange, startLorenzRaf, handleCloudModeChange]);

  // ────── Slicer Actions ──────
  const handleSlicerAction = useCallback((trackId: string, action: string, value?: any, value2?: any) => {
    switch (action) {
      case 'toggle': {
        const t = tracksRef.current.find(tr => tr.id === trackId);
        if (value && t?.samplerBuffer) recalculateSlices({ ...t, sliceCount: t.sliceCount ?? 16, slicerEnabled: true } as any);
        setTracks(prev => prev.map(t => t.id === trackId ? { ...t, slicerEnabled: value, sliceCount: t.sliceCount ?? 16 } : t));
        break;
      }
      case 'count': {
        const t = tracksRef.current.find(tr => tr.id === trackId);
        if (t?.samplerBuffer) recalculateSlices({ ...t, sliceCount: value } as any);
        setTracks(prev => prev.map(t => t.id === trackId ? { ...t, sliceCount: value } : t));
        break;
      }
      case 'order':
        setTracks(prev => prev.map(t => t.id === trackId ? { ...t, sliceOrder: value } : t)); break;
      case 'reverseToggle':
        setTracks(prev => prev.map(t => {
          if (t.id !== trackId) return t;
          const r = [...(t.sliceReverse ?? [])]; r[value as number] = !r[value as number]; return { ...t, sliceReverse: r };
        })); break;
      case 'pitch':
        setTracks(prev => prev.map(t => {
          if (t.id !== trackId) return t;
          const p = [...(t.slicePitch ?? [])]; p[value as number] = value2 as number; return { ...t, slicePitch: p };
        })); break;
      case 'randomize': {
        const track = tracksRef.current.find(t => t.id === trackId);
        const count = track?.sliceCount ?? 16;
        setTracks(prev => prev.map(t => t.id === trackId ? { ...t, sliceOrder: defaultSliceOrder(count).sort(() => Math.random() - 0.5) } : t));
        break;
      }
      case 'reset': {
        const track = tracksRef.current.find(t => t.id === trackId);
        const count = track?.sliceCount ?? 16;
        setTracks(prev => prev.map(t => t.id === trackId ? {
          ...t, sliceOrder: defaultSliceOrder(count), sliceReverse: defaultSliceReverse(count), slicePitch: defaultSlicePitch(count)
        } : t));
        break;
      }
    }
  }, [recalculateSlices]);

  // ────── Wrapped file handlers (stable refs) ──────
  const handleFileUploadCb = useCallback((trackId: string, file: File) => handleFileUpload(trackId, file), []);
  const handleClearSamplerCb = useCallback((trackId: string) => handleClearSampler(trackId), []);
  const handleLoadLayer2Cb = useCallback((trackId: string, file: File) => handleLoadLayer2(trackId, file), []);
  const handleClearLayer2Cb = useCallback((trackId: string) => handleClearLayer2(trackId), []);

  const handlePercSynthParamChange = useCallback((trackId: string, param: string, value: number | string | boolean) => {
    setTracks(prev => prev.map(t => t.id === trackId ? { ...t, [param]: value } : t));
    setTimeout(() => {
      const tr = tracksRef.current.find(t => t.id === trackId);
      if (!tr) return;
      if (trackId === 'kick') {
        synthsRef.current.kick?.setKickParams?.(
          param === 'kickPitchDecay' ? value as number : (tr.kickPitchDecay ?? 0.05),
          param === 'kickOctaves' ? value as number : (tr.kickOctaves ?? 10),
          param === 'kickDecay' ? value as number : (tr.kickDecay ?? 0.4),
          param === 'kickClickType' ? value as string : (tr.kickClickType ?? 'pink')
        );
      } else if (trackId === 'snare') {
        if (['snareDecay', 'snareNoiseType'].includes(param)) {
          synthsRef.current.snare?.setSnareParams?.(
            param === 'snareDecay' ? value as number : (tr.snareDecay ?? 0.2),
            param === 'snareNoiseType' ? value as string : (tr.snareNoiseType ?? 'white')
          );
        }
        if (['snareBodyEnabled', 'snareBodyPitch', 'snareBodyDecay'].includes(param)) {
          synthsRef.current.snare?.setSnareBody?.(
            param === 'snareBodyEnabled' ? value as boolean : (tr.snareBodyEnabled ?? false),
            param === 'snareBodyPitch' ? value as number : (tr.snareBodyPitch ?? 180),
            param === 'snareBodyDecay' ? value as number : (tr.snareBodyDecay ?? 0.1)
          );
        }
      } else if (trackId === 'hat') {
        synthsRef.current.hat?.setHatMode?.(
          param === 'hatMode' ? value as string : (tr.hatMode ?? 'noise'),
          param === 'hatHarmonicity' ? value as number : (tr.hatHarmonicity ?? 5.1),
          param === 'hatModIndex' ? value as number : (tr.hatModIndex ?? 32),
          param === 'hatResonance' ? value as number : (tr.hatResonance ?? 4000),
          param === 'hatDecay' ? value as number : (tr.hatDecay ?? 0.05),
          param === 'hatNoiseType' ? value as string : (tr.hatNoiseType ?? 'white')
        );
      }
    }, 0);
  }, []);

  const handleGetMarkovMatrix = useCallback((trackId: string) => markovMatrixRef.current[trackId], []);

  const startRecordingNow = useCallback(() => {
    if (!recordingDestRef.current) {
      if (!toneFilterRef.current) {
        console.warn('REC: No hay toneFilter activo');
        return;
      }
      try {
        const dest = (Tone.getContext().rawContext as AudioContext).createMediaStreamDestination();
        toneFilterRef.current.connect(dest as unknown as Tone.ToneAudioNode);
        recordingDestRef.current = dest;
      } catch(e) {
        console.warn('No se pudo crear nodo de captura:', e);
        return;
      }
    }

    recordingChunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';

    const recorder = new MediaRecorder(
      recordingDestRef.current.stream,
      { mimeType }
    );

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordingChunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      const blob = new Blob(recordingChunksRef.current, { type: mimeType });
      // TODO: Safari no soporta decodeAudioData de webm.
      try {
        const arrayBuffer = await blob.arrayBuffer();
        const audioBuffer = await Tone.getContext().rawContext
          .decodeAudioData(arrayBuffer);
        lastRecordedBufferRef.current = audioBuffer;
      } catch(e) {
        console.warn('No se pudo decodificar el buffer grabado:', e);
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tone-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      setToneRecordingState('idle');
      logChange('Tone grabado y descargado');
    };

    recorder.start(100);
    mediaRecorderRef.current = recorder;
    setToneRecordingState('recording');
    logChange('Tone REC iniciado');
  }, [logChange]);

  const handleCloudArmOrRecord = useCallback(() => {
    if (cloudRecordingState === 'recording') {
      if (cloudMediaRecorderRef.current?.state === 'recording') {
        cloudMediaRecorderRef.current.stop();
      }
      return;
    }
    if (cloudRecordingState === 'armed') {
      setCloudRecordingState('idle');
      return;
    }
    if (isPlaying) {
      startCloudRecordingNow();
    } else {
      setCloudRecordingState('armed');
      logChange('REC Atmosphere armado — esperando Play');
    }
  }, [cloudRecordingState, isPlaying, logChange]);

  const startCloudRecordingNow = useCallback(() => {
    if (!cloudRecordingDestRef.current) {
      try {
        const cloudFilter = synthsRef.current.cloud?.filter;
        if (!cloudFilter) {
          console.warn('REC cloud: no hay cloudFilter activo');
          return;
        }
        const dest = (Tone.getContext().rawContext as AudioContext)
          .createMediaStreamDestination();
        cloudFilter.connect(dest as unknown as Tone.ToneAudioNode);
        cloudRecordingDestRef.current = dest;
      } catch(e) {
        console.warn('REC cloud: no se pudo crear nodo:', e);
        return;
      }
    }
    cloudRecordingChunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus' : 'audio/webm';
    const recorder = new MediaRecorder(
      cloudRecordingDestRef.current.stream,
      { mimeType }
    );
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) cloudRecordingChunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(cloudRecordingChunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `atmosphere-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      setCloudRecordingState('idle');
      logChange('Atmosphere grabado y descargado');
    };
    recorder.start(100);
    cloudMediaRecorderRef.current = recorder;
    setCloudRecordingState('recording');
    logChange('REC Atmosphere iniciado');
  }, [logChange]);

  const handleGlobalArmOrRecord = useCallback(() => {
    if (globalRecordingState === 'recording') {
      if (globalMediaRecorderRef.current?.state === 'recording') {
        globalMediaRecorderRef.current.stop();
      }
      return;
    }
    if (globalRecordingState === 'armed') {
      setGlobalRecordingState('idle');
      return;
    }
    if (isPlaying) {
      startGlobalRecordingNow();
    } else {
      setGlobalRecordingState('armed');
      logChange('REC global armado — esperando Play');
    }
  }, [globalRecordingState, isPlaying, logChange]);

  const startGlobalRecordingNow = useCallback(() => {
    if (!globalRecordingDestRef.current) {
      try {
        const dest = (Tone.getContext().rawContext as AudioContext)
          .createMediaStreamDestination();
        masterBusRef.current?.compressor.connect(
          dest as unknown as Tone.ToneAudioNode
        );
        globalRecordingDestRef.current = dest;
      } catch(e) {
        console.warn('REC global: no se pudo crear nodo:', e);
        return;
      }
    }
    globalRecordingChunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus' : 'audio/webm';
    const recorder = new MediaRecorder(
      globalRecordingDestRef.current.stream,
      { mimeType }
    );
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) globalRecordingChunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(globalRecordingChunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mix-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      setGlobalRecordingState('idle');
      logChange('Mix global grabado y descargado');
    };
    recorder.start(100);
    globalMediaRecorderRef.current = recorder;
    setGlobalRecordingState('recording');
    logChange('REC global iniciado');
  }, [logChange]);

  const handleArmOrRecord = useCallback(() => {
    if (toneRecordingState === 'recording') {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      return;
    }
    if (toneRecordingState === 'armed') {
      setToneRecordingState('idle');
      return;
    }
    // idle → comportamiento según isPlaying
    if (isPlaying) {
      startRecordingNow();
    } else {
      setToneRecordingState('armed');
      logChange('Tone REC armado — esperando Play');
    }
  }, [toneRecordingState, isPlaying, logChange, startRecordingNow]);

  const handleClearSampler = (trackId: string) => {
    // Also clear layer2 if present
    if (synthsRef.current[trackId]?.disposeLayer2) {
      synthsRef.current[trackId].disposeLayer2();
    }
    if (synthsRef.current[trackId]?.dispose) {
      synthsRef.current[trackId].dispose();
    }
    
    // Re-initialize original synth
    if (trackId === 'kick' || trackId === 'snare' || trackId === 'hat' || trackId === 'tone') {
      initializeOriginalSynth(trackId);
    }

    setTracks(prev => prev.map(t => t.id === trackId ? { 
      ...t, 
      samplerStatus: 'IDLE', 
      samplerBuffer: null, 
      samplerFilename: null,
      layer2Status: 'empty',
      layer2Filename: undefined,
    } : t));
  };

  const handleLoadLayer2 = async (trackId: string, file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      alert("El archivo excede el límite de seguridad (10MB).");
      return;
    }

    await Tone.start();
    if (Tone.getContext().state !== 'running') {
      await Tone.getContext().resume();
    }

    setTracks(prev => prev.map(t => t.id === trackId ? { ...t, layer2Status: 'loading' } : t));

    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await Tone.getContext().decodeAudioData(arrayBuffer);
      if (!audioBuffer || audioBuffer.length === 0) throw new Error("Failed to decode layer2 audio");

      if (audioBuffer.duration > 10.1) {
        alert("El audio excede los 10 segundos permitidos.");
        setTracks(prev => prev.map(t => t.id === trackId ? { ...t, layer2Status: 'empty' } : t));
        return;
      }

      // Dispose previous layer2
      if (synthsRef.current[trackId]?.disposeLayer2) {
        synthsRef.current[trackId].disposeLayer2();
      }

      const currentTrack = tracksRef.current.find(t => t.id === trackId);

      // Create layer2 audio chain: GrainPlayer → Filter → Gain → existing BitCrusher
      const layer2Player = new Tone.GrainPlayer(audioBuffer);
      layer2Player.loop = false;

      const layer2Gain = new Tone.Gain(currentTrack?.layer2Blend ?? 0.8);

      const layer2Filter = new Tone.Filter({
        frequency: currentTrack?.layer2FilterFreq ?? 8000,
        type: 'lowpass',
        rolloff: -12
      });

      layer2Player.connect(layer2Filter);
      layer2Filter.connect(layer2Gain);
      layer2Gain.connect(synthsRef.current[trackId].bitCrusher);

      const synthObj = synthsRef.current[trackId];
      synthObj.layer2Player = layer2Player;
      synthObj.layer2Gain = layer2Gain;
      synthObj.layer2Filter = layer2Filter;
      synthObj.layer2Buffer = audioBuffer;

      synthObj.triggerLayer2 = (time: number, velocity: number) => {
        const ct = tracksRef.current.find(t => t.id === trackId);
        if (!ct || !layer2Player.buffer) return;
        // Time Stretch for Layer 2 (Phase 6D)
        const l2StretchRate = ct.layer2StretchEnabled ? (ct.layer2StretchRate ?? 1.0) : 1.0;
        layer2Player.playbackRate = l2StretchRate;
        // Pitch compensation: keep pitch stable when stretch changes
        const l2StretchCompensation = l2StretchRate !== 1.0 ? -1200 * Math.log2(l2StretchRate) : 0;
        const l2PitchCents = (ct.layer2Pitch ?? 0) * 100;
        layer2Player.detune = l2PitchCents + l2StretchCompensation;
        layer2Player.reverse = ct.layer2Reverse ?? false;
        const offsetSec = (ct.layer2Offset ?? 0) / 1000;
        const triggerTime = time + offsetSec;
        try {
          layer2Player.start(triggerTime, 0);
        } catch (err) {
          console.warn("Layer2 start failed:", err);
        }
      };

      synthObj.disposeLayer2 = () => {
        layer2Player.dispose();
        layer2Gain.dispose();
        layer2Filter.dispose();
        synthObj.layer2Player = undefined;
        synthObj.layer2Gain = undefined;
        synthObj.layer2Filter = undefined;
        synthObj.layer2Buffer = undefined;
        synthObj.triggerLayer2 = undefined;
        synthObj.disposeLayer2 = undefined;
      };

      setTracks(prev => prev.map(t =>
        t.id === trackId
          ? { ...t, layer2Status: 'ready' as const, layer2Filename: file.name }
          : t
      ));

      logChange(`Layer 2 cargado en ${trackId}: ${file.name}`);
    } catch (err) {
      console.error("[Layer2] Error loading:", err);
      setTracks(prev => prev.map(t => t.id === trackId ? { ...t, layer2Status: 'empty' } : t));
      alert("Error al cargar Layer 2.");
    }
  };

  const handleClearLayer2 = (trackId: string) => {
    if (synthsRef.current[trackId]?.disposeLayer2) {
      synthsRef.current[trackId].disposeLayer2();
    }
    setTracks(prev => prev.map(t =>
      t.id === trackId
        ? { ...t, layer2Status: 'empty' as const, layer2Filename: undefined }
        : t
    ));
    logChange(`Layer 2 eliminado de ${trackId}`);
  };

  const handleLayer2ParamChange = useCallback((trackId: string, param: string, value: number | boolean) => {
    setTracks(prev => prev.map(t => t.id === trackId ? { ...t, [param]: value } : t));

    const synthObj = synthsRef.current[trackId];
    if (!synthObj) return;
    if (param === 'layer2Blend' && synthObj.layer2Gain) {
      synthObj.layer2Gain.gain.rampTo(value as number, 0.05);
    }
    if (param === 'layer2FilterFreq' && synthObj.layer2Filter) {
      synthObj.layer2Filter.frequency.rampTo(value as number, 0.05);
    }
  }, []);

  const initializeOriginalSynth = (trackId: string, overrideSynthType?: string) => {
    const master = masterBusRef.current!;
    let _eqHpfRef: Tone.Filter | null = null;
    let _eqLpfRef: Tone.Filter | null = null;
    let _pannerRef: Tone.Panner | null = null;
    let _freqShifterRef: Tone.FrequencyShifter | null = null;
    let _fsBypassGainRef: Tone.Gain | null = null;
    let _fsDirectGainRef: Tone.Gain | null = null;
    let _spectralSendRef: Tone.Gain | null = null;
    let _freezeSendRef: Tone.Gain | null = null;
    let _reverseSendRef: Tone.Gain | null = null;
    let _pannerGainRef: Tone.Gain | null = null;
    let _panner3DGainRef: Tone.Gain | null = null;
    let _panner3DRef: Tone.Panner3D | null = null;
    let _toneFilterRef: Tone.Filter | null = null;
    if (trackId === 'kick') {
      const kickDelaySend = new Tone.Gain(0).connect(master.delayBus);
      const kickReverbSend = new Tone.Gain(0).connect(master.reverbBus);
      const kickSpectralSend = new Tone.Gain(0).connect(master.spectralDelayBus);
      const kickFreezeSend = new Tone.Gain(0).connect(master.freezeBus);
      const kickReverseSend = new Tone.Gain(0).connect(master.reverseBus);
      const kickEqHpf = new Tone.Filter(20, "highpass");
      const kickEqLpf = new Tone.Filter(20000, "lowpass");
      const kickPanner = new Tone.Panner(0);
      const kickPanner3D = new Tone.Panner3D({ panningModel: 'HRTF', distanceModel: 'inverse' });
      kickPanner3D.positionY.value = 0;
      const kickPannerGain = new Tone.Gain(1);
      const kickPanner3DGain = new Tone.Gain(0);
      const kickFreqShifter = new Tone.FrequencyShifter(0);
      const kickFsBypassGain = new Tone.Gain(0);
      const kickFsDirectGain = new Tone.Gain(1);
      const kickFilter = new Tone.Filter(2000, "lowpass").connect(kickEqHpf);
      kickEqHpf.connect(kickEqLpf);
      kickEqLpf.connect(kickPannerGain);
      kickEqLpf.connect(kickPanner3DGain);
      if (synthsRef.current.kickFollower) kickEqLpf.connect(synthsRef.current.kickFollower);
      kickPannerGain.connect(kickPanner);
      kickPanner3DGain.connect(kickPanner3D);
      kickPanner.connect(kickFsBypassGain);
      kickPanner3D.connect(kickFsBypassGain);
      kickFsBypassGain.connect(kickFreqShifter);
      kickFreqShifter.connect(master.compressor);
      kickFreqShifter.connect(kickDelaySend);
      kickFreqShifter.connect(kickReverbSend);
      kickFreqShifter.connect(kickSpectralSend);
      kickPanner.connect(kickFsDirectGain);
      kickPanner3D.connect(kickFsDirectGain);
      kickFsDirectGain.connect(master.compressor);
      kickFsDirectGain.connect(kickDelaySend);
      kickFsDirectGain.connect(kickReverbSend);
      kickFsDirectGain.connect(kickSpectralSend);
      kickFsBypassGain.connect(kickFreezeSend);
      kickFsBypassGain.connect(kickReverseSend);
      kickFsDirectGain.connect(kickFreezeSend);
      kickFsDirectGain.connect(kickReverseSend);

      let kickBody = new Tone.MembraneSynth({
        pitchDecay: 0.05, octaves: 10, oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 },
        volume: -2
      }).connect(kickFilter);

      let kickClick = new Tone.NoiseSynth({
        noise: { type: 'pink' as any },
        envelope: { attack: 0.001, decay: 0.01, sustain: 0 },
        volume: -10
      }).connect(kickFilter);

      synthsRef.current.kick = {
        triggerAttackRelease: (note: string, duration: any, time: number, velocity: number) => {
          kickBody.triggerAttackRelease("C1", duration, time, velocity);
          kickClick.triggerAttackRelease(duration, time, velocity * 0.5);
          const baseCutoff = 800;
          const dynamicCutoff = baseCutoff + (velocity * 3000);
          if (isFinite(dynamicCutoff)) {
            kickFilter.frequency.rampTo(dynamicCutoff, 0.02, time);
          }
        },
        setVolume: (vol: number) => {
          const db = Tone.gainToDb(vol);
          kickBody.volume.rampTo(db - 2, 0.05);
          kickClick.volume.rampTo(db - 10, 0.05);
        },
        setSends: (delayVal: number, reverbVal: number) => {
          kickDelaySend.gain.rampTo(delayVal, 0.05);
          kickReverbSend.gain.rampTo(reverbVal, 0.05);
        },
        dispose: () => {
          kickBody.dispose(); kickClick.dispose(); kickFilter.dispose();
          kickEqHpf.dispose(); kickEqLpf.dispose();
          kickPanner.dispose(); kickPanner3D.dispose(); kickPannerGain.dispose(); kickPanner3DGain.dispose();
          kickFreqShifter.dispose(); kickFsBypassGain.dispose(); kickFsDirectGain.dispose();
          kickDelaySend.dispose(); kickReverbSend.dispose(); kickSpectralSend.dispose();
        }
      };
      // Phase 8 — Kick synth params setter (rebuild)
      synthsRef.current.kick.setKickParams = (pitchDecay: number, octaves: number, decay: number, clickType: string) => {
        kickBody.set({ pitchDecay, octaves, envelope: { decay } });
        const currentType = (kickClick as any).noise?.type || 'pink';
        if (clickType !== currentType) {
          kickClick.dispose();
          kickClick = new Tone.NoiseSynth({
            noise: { type: clickType as any },
            envelope: { attack: 0.001, decay: 0.01, sustain: 0 },
            volume: -10
          }).connect(kickFilter);
        }
      };
      synthsRef.current.kick.updateEq = (hpfFreq: number, lpfFreq: number) => {
        kickEqHpf.frequency.rampTo(hpfFreq, 0.05);
        kickEqLpf.frequency.rampTo(lpfFreq, 0.05);
      };
      synthsRef.current.kick.setPan = (value: number) => { kickPanner.pan.rampTo(value, 0.05); };
      synthsRef.current.kick.setFreqShift = (hz: number, enabled?: boolean) => {
        kickFreqShifter.frequency.rampTo(hz, 0.05);
        if (enabled !== undefined) {
          kickFsBypassGain.gain.rampTo(enabled ? 1 : 0, 0.02);
          kickFsDirectGain.gain.rampTo(enabled ? 0 : 1, 0.02);
        }
      };
      synthsRef.current.kick.panner = kickPanner;
      synthsRef.current.kick.freqShifter = kickFreqShifter;
      synthsRef.current.kick.setSpectralSend = (value: number) => { kickSpectralSend.gain.rampTo(value, 0.05); };
      synthsRef.current.kick.setFreezeSend = (value: number) => { kickFreezeSend.gain.rampTo(value, 0.05); };
      synthsRef.current.kick.setReverseSend = (value: number) => { kickReverseSend.gain.rampTo(value, 0.05); };
      synthsRef.current.kick.switchBinaural = (binaural: boolean) => {
        kickPannerGain.gain.rampTo(binaural ? 0 : 1, 0.1);
        kickPanner3DGain.gain.rampTo(binaural ? 1 : 0, 0.1);
      };
      synthsRef.current.kick.updateBinaural = (azimuth: number, distance: number) => {
        const rad = (azimuth * Math.PI) / 180;
        try { kickPanner3D.setPosition(Math.sin(rad) * distance, 0, -Math.cos(rad) * distance); } catch(e) {
          kickPanner3D.positionX.value = Math.sin(rad) * distance;
          kickPanner3D.positionZ.value = -Math.cos(rad) * distance;
        }
      };
      synthsRef.current.kick.updateLorenz = (normalizedValue: number, depth: number, target: string) => {
        if (target === 'filter') kickFilter.frequency.rampTo(800 + normalizedValue * depth, 0.05);
      };
      synthsRef.current.kick.nestedLfoInstance = null;
      synthsRef.current.kick.initNestedLfo = (r1: number, r2: number, d: number) => {
        synthsRef.current.kick.nestedLfoInstance?.dispose();
        synthsRef.current.kick.nestedLfoInstance = createNestedLfo(kickFilter, r1, r2, d);
      };
      synthsRef.current.kick.updateNestedLfo = (r1: number, r2: number, d: number) => synthsRef.current.kick.nestedLfoInstance?.update(r1, r2, d);
      synthsRef.current.kick.disposeNestedLfo = () => { synthsRef.current.kick.nestedLfoInstance?.dispose(); synthsRef.current.kick.nestedLfoInstance = null; };
    } else if (trackId === 'snare') {
      const snareDelaySend = new Tone.Gain(0).connect(master.delayBus);
      const snareReverbSend = new Tone.Gain(0).connect(master.reverbBus);
      const snareSpectralSend = new Tone.Gain(0).connect(master.spectralDelayBus);
      const snareFreezeSend = new Tone.Gain(0).connect(master.freezeBus);
      const snareReverseSend = new Tone.Gain(0).connect(master.reverseBus);
      const snareEqHpf = new Tone.Filter(20, "highpass");
      const snareEqLpf = new Tone.Filter(20000, "lowpass");
      const snarePanner = new Tone.Panner(0);
      const snarePanner3D = new Tone.Panner3D({ panningModel: 'HRTF', distanceModel: 'inverse' });
      snarePanner3D.positionY.value = 0;
      const snarePannerGain = new Tone.Gain(1);
      const snarePanner3DGain = new Tone.Gain(0);
      const snareFreqShifter = new Tone.FrequencyShifter(0);
      const snareFsBypassGain = new Tone.Gain(0);
      const snareFsDirectGain = new Tone.Gain(1);
      const snareFilter = new Tone.Filter(5000, "lowpass").connect(snareEqHpf);
      snareEqHpf.connect(snareEqLpf);
      snareEqLpf.connect(snarePannerGain);
      snareEqLpf.connect(snarePanner3DGain);
      snarePannerGain.connect(snarePanner);
      snarePanner3DGain.connect(snarePanner3D);
      snarePanner.connect(snareFsBypassGain);
      snarePanner3D.connect(snareFsBypassGain);
      snareFsBypassGain.connect(snareFreqShifter);
      snareFreqShifter.connect(master.compressor);
      snareFreqShifter.connect(snareDelaySend);
      snareFreqShifter.connect(snareReverbSend);
      snareFreqShifter.connect(snareSpectralSend);
      snarePanner.connect(snareFsDirectGain);
      snarePanner3D.connect(snareFsDirectGain);
      snareFsDirectGain.connect(master.compressor);
      snareFsDirectGain.connect(snareDelaySend);
      snareFsDirectGain.connect(snareReverbSend);
      snareFsDirectGain.connect(snareSpectralSend);
      snareFsBypassGain.connect(snareFreezeSend);
      snareFsBypassGain.connect(snareReverseSend);
      snareFsDirectGain.connect(snareFreezeSend);
      snareFsDirectGain.connect(snareReverseSend);

      let snareSynth = new Tone.NoiseSynth({
        noise: { type: 'white' as any },
        envelope: { attack: 0.001, decay: 0.2, sustain: 0 },
        volume: -4
      }).connect(snareFilter);
      let snareBody: Tone.MembraneSynth | null = null;

      synthsRef.current.snare = {
        triggerAttackRelease: (duration: any, time: number, velocity: number) => {
          snareSynth.triggerAttackRelease(duration, time, velocity);
          if (snareBody) {
            try { snareBody.triggerAttackRelease("C2", duration, time, velocity * 0.6); } catch(e) {}
          }
          const baseCutoff = 1500;
          const dynamicCutoff = baseCutoff + (velocity * 5000);
          if (isFinite(dynamicCutoff)) { snareFilter.frequency.rampTo(dynamicCutoff, 0.02, time); }
        },
        setVolume: (vol: number) => {
          snareSynth.volume.rampTo(Tone.gainToDb(vol) - 4, 0.05);
          if (snareBody) snareBody.volume.rampTo(Tone.gainToDb(vol) - 6, 0.05);
        },
        setSends: (delayVal: number, reverbVal: number) => {
          snareDelaySend.gain.rampTo(delayVal, 0.05);
          snareReverbSend.gain.rampTo(reverbVal, 0.05);
        },
        dispose: () => {
          snareSynth.dispose(); snareBody?.dispose(); snareFilter.dispose(); snareEqHpf.dispose(); snareEqLpf.dispose();
          snarePanner.dispose(); snarePanner3D.dispose(); snarePannerGain.dispose(); snarePanner3DGain.dispose();
          snareFreqShifter.dispose(); snareFsBypassGain.dispose(); snareFsDirectGain.dispose();
          snareDelaySend.dispose(); snareReverbSend.dispose(); snareSpectralSend.dispose();
        }
      };
      // Phase 8 — Snare synth params setter (rebuild)
      synthsRef.current.snare.setSnareParams = (decay: number, noiseType: string) => {
        snareSynth.envelope.decay = decay;
        const currentType = (snareSynth as any).noise?.type || 'white';
        if (noiseType !== currentType) {
          snareSynth.dispose();
          snareSynth = new Tone.NoiseSynth({
            noise: { type: noiseType as any },
            envelope: { attack: 0.001, decay, sustain: 0 },
            volume: -4
          }).connect(snareFilter);
        }
      };
      synthsRef.current.snare.setSnareBody = (enabled: boolean, pitch: number, bodyDecay: number) => {
        if (enabled && !snareBody) {
          snareBody = new Tone.MembraneSynth({
            pitchDecay: 0.08, octaves: 4, oscillator: { type: 'sine' },
            envelope: { attack: 0.001, decay: bodyDecay, sustain: 0.01, release: 0.5 },
            volume: -6
          }).connect(snareFilter);
          snareBody.frequency.value = pitch;
        } else if (!enabled && snareBody) {
          snareBody.dispose();
          snareBody = null;
        } else if (enabled && snareBody) {
          snareBody.frequency.value = pitch;
          snareBody.set({ envelope: { decay: bodyDecay } });
        }
      };
      synthsRef.current.snare.updateEq = (hpfFreq: number, lpfFreq: number) => { snareEqHpf.frequency.rampTo(hpfFreq, 0.05); snareEqLpf.frequency.rampTo(lpfFreq, 0.05); };
      synthsRef.current.snare.setPan = (value: number) => { snarePanner.pan.rampTo(value, 0.05); };
      synthsRef.current.snare.setFreqShift = (hz: number, enabled?: boolean) => {
        snareFreqShifter.frequency.rampTo(hz, 0.05);
        if (enabled !== undefined) {
          snareFsBypassGain.gain.rampTo(enabled ? 1 : 0, 0.02);
          snareFsDirectGain.gain.rampTo(enabled ? 0 : 1, 0.02);
        }
      };
      synthsRef.current.snare.panner = snarePanner;
      synthsRef.current.snare.freqShifter = snareFreqShifter;
      synthsRef.current.snare.setSpectralSend = (value: number) => { snareSpectralSend.gain.rampTo(value, 0.05); };
      synthsRef.current.snare.setFreezeSend = (value: number) => { snareFreezeSend.gain.rampTo(value, 0.05); };
      synthsRef.current.snare.setReverseSend = (value: number) => { snareReverseSend.gain.rampTo(value, 0.05); };
      synthsRef.current.snare.switchBinaural = (binaural: boolean) => { snarePannerGain.gain.rampTo(binaural ? 0 : 1, 0.1); snarePanner3DGain.gain.rampTo(binaural ? 1 : 0, 0.1); };
      synthsRef.current.snare.updateBinaural = (azimuth: number, distance: number) => {
        const rad = (azimuth * Math.PI) / 180;
        try { snarePanner3D.setPosition(Math.sin(rad) * distance, 0, -Math.cos(rad) * distance); } catch(e) { snarePanner3D.positionX.value = Math.sin(rad) * distance; snarePanner3D.positionZ.value = -Math.cos(rad) * distance; }
      };
      synthsRef.current.snare.updateLorenz = (normalizedValue: number, depth: number, target: string) => {
        if (target === 'filter') snareFilter.frequency.rampTo(1500 + normalizedValue * depth, 0.05);
      };
      synthsRef.current.snare.nestedLfoInstance = null;
      synthsRef.current.snare.initNestedLfo = (r1: number, r2: number, d: number) => { synthsRef.current.snare.nestedLfoInstance?.dispose(); synthsRef.current.snare.nestedLfoInstance = createNestedLfo(snareFilter, r1, r2, d); };
      synthsRef.current.snare.updateNestedLfo = (r1: number, r2: number, d: number) => synthsRef.current.snare.nestedLfoInstance?.update(r1, r2, d);
      synthsRef.current.snare.disposeNestedLfo = () => { synthsRef.current.snare.nestedLfoInstance?.dispose(); synthsRef.current.snare.nestedLfoInstance = null; };
    } else if (trackId === 'hat') {
      const hatDelaySend = new Tone.Gain(0).connect(master.delayBus);
      const hatReverbSend = new Tone.Gain(0).connect(master.reverbBus);
      const hatSpectralSend = new Tone.Gain(0).connect(master.spectralDelayBus);
      const hatFreezeSend = new Tone.Gain(0).connect(master.freezeBus);
      const hatReverseSend = new Tone.Gain(0).connect(master.reverseBus);
      const hatEqHpf = new Tone.Filter(20, "highpass");
      const hatEqLpf = new Tone.Filter(20000, "lowpass");
      const hatPanner = new Tone.Panner(0);
      const hatPanner3D = new Tone.Panner3D({ panningModel: 'HRTF', distanceModel: 'inverse' });
      hatPanner3D.positionY.value = 0;
      const hatPannerGain = new Tone.Gain(1);
      const hatPanner3DGain = new Tone.Gain(0);
      const hatFreqShifter = new Tone.FrequencyShifter(0);
      const hatFsBypassGain = new Tone.Gain(0);
      const hatFsDirectGain = new Tone.Gain(1);
      const hatFilter = new Tone.Filter(5000, "highpass").connect(hatEqHpf);
      hatEqHpf.connect(hatEqLpf);
      hatEqLpf.connect(hatPannerGain);
      hatEqLpf.connect(hatPanner3DGain);
      hatPannerGain.connect(hatPanner);
      hatPanner3DGain.connect(hatPanner3D);
      hatPanner.connect(hatFsBypassGain);
      hatPanner3D.connect(hatFsBypassGain);
      hatFsBypassGain.connect(hatFreqShifter);
      hatFreqShifter.connect(master.compressor);
      hatFreqShifter.connect(hatDelaySend);
      hatFreqShifter.connect(hatReverbSend);
      hatFreqShifter.connect(hatSpectralSend);
      hatPanner.connect(hatFsDirectGain);
      hatPanner3D.connect(hatFsDirectGain);
      hatFsDirectGain.connect(master.compressor);
      hatFsDirectGain.connect(hatDelaySend);
      hatFsDirectGain.connect(hatReverbSend);
      hatFsDirectGain.connect(hatSpectralSend);
      hatFsBypassGain.connect(hatFreezeSend);
      hatFsBypassGain.connect(hatReverseSend);
      hatFsDirectGain.connect(hatFreezeSend);
      hatFsDirectGain.connect(hatReverseSend);

      let hatSynth: Tone.NoiseSynth | null = new Tone.NoiseSynth({ noise: { type: 'white' as any }, envelope: { attack: 0.001, decay: 0.05, sustain: 0 }, volume: -2 }).connect(hatFilter);
      let hatMetalSynth: Tone.MetalSynth | null = null;
      let currentHatMode = 'noise';
      synthsRef.current.hat = {
        triggerAttackRelease: (duration: any, time: number, velocity: number) => {
          if (currentHatMode === 'metal' && hatMetalSynth) {
            const trackState = tracksRef.current.find(t => t.id === 'hat');
            const decay = trackState?.hatDecay ?? 0.05;
            hatMetalSynth.triggerAttackRelease(200, decay, time, velocity);
          } else if (hatSynth) {
            hatSynth.triggerAttackRelease(duration, time, velocity);
          }
          const dynamicCutoff = 2000 + (velocity * 8000);
          if (isFinite(dynamicCutoff)) hatFilter.frequency.rampTo(dynamicCutoff, 0.02, time);
        },
        setVolume: (vol: number) => {
          const db = Tone.gainToDb(vol) - 2;
          if (hatSynth) hatSynth.volume.rampTo(db, 0.05);
          if (hatMetalSynth) hatMetalSynth.volume.rampTo(db, 0.05);
        },
        setSends: (delayVal: number, reverbVal: number) => { hatDelaySend.gain.rampTo(delayVal, 0.05); hatReverbSend.gain.rampTo(reverbVal, 0.05); },
        dispose: () => {
          hatSynth?.dispose(); hatMetalSynth?.dispose(); hatFilter.dispose(); hatEqHpf.dispose(); hatEqLpf.dispose();
          hatPanner.dispose(); hatPanner3D.dispose(); hatPannerGain.dispose(); hatPanner3DGain.dispose();
          hatFreqShifter.dispose(); hatFsBypassGain.dispose(); hatFsDirectGain.dispose();
          hatDelaySend.dispose(); hatReverbSend.dispose(); hatSpectralSend.dispose();
        }
      };
      // Phase 8 — Hat mode switcher (rebuild)
      synthsRef.current.hat.setHatMode = (mode: string, harmonicity: number, modIndex: number, resonance: number, decay: number, noiseType: string) => {
        if (mode === 'metal' && currentHatMode !== 'metal') {
          hatSynth?.dispose(); hatSynth = null;
          hatMetalSynth = new Tone.MetalSynth({
            harmonicity, modulationIndex: modIndex, resonance,
            envelope: { attack: 0.001, decay, release: 0.1 }, volume: -2
          }).connect(hatFilter);
          currentHatMode = 'metal';
        } else if (mode === 'noise' && currentHatMode !== 'noise') {
          hatMetalSynth?.dispose(); hatMetalSynth = null;
          hatSynth = new Tone.NoiseSynth({ noise: { type: noiseType as any }, envelope: { attack: 0.001, decay, sustain: 0 }, volume: -2 }).connect(hatFilter);
          currentHatMode = 'noise';
        } else if (mode === 'metal' && hatMetalSynth) {
          hatMetalSynth.set({ harmonicity, modulationIndex: modIndex, resonance, envelope: { decay } });
        } else if (mode === 'noise' && hatSynth) {
          hatSynth.envelope.decay = decay;
          const curType = (hatSynth as any).noise?.type || 'white';
          if (noiseType !== curType) {
            hatSynth.dispose();
            hatSynth = new Tone.NoiseSynth({ noise: { type: noiseType as any }, envelope: { attack: 0.001, decay, sustain: 0 }, volume: -2 }).connect(hatFilter);
          }
        }
      };
      synthsRef.current.hat.updateEq = (hpfFreq: number, lpfFreq: number) => { hatEqHpf.frequency.rampTo(hpfFreq, 0.05); hatEqLpf.frequency.rampTo(lpfFreq, 0.05); };
      synthsRef.current.hat.setPan = (value: number) => { hatPanner.pan.rampTo(value, 0.05); };
      synthsRef.current.hat.setFreqShift = (hz: number, enabled?: boolean) => {
        hatFreqShifter.frequency.rampTo(hz, 0.05);
        if (enabled !== undefined) {
          hatFsBypassGain.gain.rampTo(enabled ? 1 : 0, 0.02);
          hatFsDirectGain.gain.rampTo(enabled ? 0 : 1, 0.02);
        }
      };
      synthsRef.current.hat.panner = hatPanner;
      synthsRef.current.hat.freqShifter = hatFreqShifter;
      synthsRef.current.hat.setSpectralSend = (value: number) => { hatSpectralSend.gain.rampTo(value, 0.05); };
      synthsRef.current.hat.setFreezeSend = (value: number) => { hatFreezeSend.gain.rampTo(value, 0.05); };
      synthsRef.current.hat.setReverseSend = (value: number) => { hatReverseSend.gain.rampTo(value, 0.05); };
      synthsRef.current.hat.switchBinaural = (binaural: boolean) => { hatPannerGain.gain.rampTo(binaural ? 0 : 1, 0.1); hatPanner3DGain.gain.rampTo(binaural ? 1 : 0, 0.1); };
      synthsRef.current.hat.updateBinaural = (azimuth: number, distance: number) => {
        const rad = (azimuth * Math.PI) / 180;
        try { hatPanner3D.setPosition(Math.sin(rad) * distance, 0, -Math.cos(rad) * distance); } catch(e) { hatPanner3D.positionX.value = Math.sin(rad) * distance; hatPanner3D.positionZ.value = -Math.cos(rad) * distance; }
      };
      synthsRef.current.hat.updateLorenz = (normalizedValue: number, depth: number, target: string) => {
        if (target === 'filter') hatFilter.frequency.rampTo(2000 + normalizedValue * depth, 0.05);
      };
      synthsRef.current.hat.nestedLfoInstance = null;
      synthsRef.current.hat.initNestedLfo = (r1: number, r2: number, d: number) => { synthsRef.current.hat.nestedLfoInstance?.dispose(); synthsRef.current.hat.nestedLfoInstance = createNestedLfo(hatFilter, r1, r2, d); };
      synthsRef.current.hat.updateNestedLfo = (r1: number, r2: number, d: number) => synthsRef.current.hat.nestedLfoInstance?.update(r1, r2, d);
      synthsRef.current.hat.disposeNestedLfo = () => { synthsRef.current.hat.nestedLfoInstance?.dispose(); synthsRef.current.hat.nestedLfoInstance = null; };
    } else if (trackId === 'tone') {
      if (toneRecordingState === 'recording' && mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
        setToneRecordingState('idle');
      }

      const toneDelaySend = new Tone.Gain(0.15).connect(master.delayBus);
      const toneReverbSend = new Tone.Gain(0.2).connect(master.reverbBus);
      const toneSpectralSend = new Tone.Gain(0).connect(master.spectralDelayBus);
      const toneFreezeSend = new Tone.Gain(0).connect(master.freezeBus);
      const toneReverseSend = new Tone.Gain(0).connect(master.reverseBus);
      const toneEqHpf = new Tone.Filter(20, "highpass");
      const toneEqLpf = new Tone.Filter(20000, "lowpass");
      const tonePanner = new Tone.Panner(0);
      const tonePanner3D = new Tone.Panner3D({ panningModel: 'HRTF', distanceModel: 'inverse' });
      tonePanner3D.positionY.value = 0;
      const tonePannerGain = new Tone.Gain(1);
      const tonePanner3DGain = new Tone.Gain(0);
      const toneFreqShifter = new Tone.FrequencyShifter(0);
      const toneFsBypassGain = new Tone.Gain(0);
      const toneFsDirectGain = new Tone.Gain(1);
      const toneFilter = new Tone.Filter(2000, "lowpass").connect(toneEqHpf);
      toneEqHpf.connect(toneEqLpf);
      toneEqLpf.connect(tonePannerGain);
      toneEqLpf.connect(tonePanner3DGain);
      tonePannerGain.connect(tonePanner);
      tonePanner3DGain.connect(tonePanner3D);
      tonePanner.connect(toneFsBypassGain);
      tonePanner3D.connect(toneFsBypassGain);
      toneFsBypassGain.connect(toneFreqShifter);
      toneFreqShifter.connect(master.compressor);
      toneFreqShifter.connect(toneDelaySend);
      toneFreqShifter.connect(toneReverbSend);
      toneFreqShifter.connect(toneSpectralSend);
      tonePanner.connect(toneFsDirectGain);
      tonePanner3D.connect(toneFsDirectGain);
      toneFsDirectGain.connect(master.compressor);
      toneFsDirectGain.connect(toneDelaySend);
      toneFsDirectGain.connect(toneReverbSend);
      toneFsDirectGain.connect(toneSpectralSend);
      toneFsBypassGain.connect(toneFreezeSend);
      toneFsBypassGain.connect(toneReverseSend);
      toneFsDirectGain.connect(toneFreezeSend);
      toneFsDirectGain.connect(toneReverseSend);
      toneFilterRef.current = toneFilter;
      _eqHpfRef = toneEqHpf;
      _eqLpfRef = toneEqLpf;
      _pannerRef = tonePanner;
      _freqShifterRef = toneFreqShifter;
      _fsBypassGainRef = toneFsBypassGain;
      _fsDirectGainRef = toneFsDirectGain;
      _spectralSendRef = toneSpectralSend;
      _freezeSendRef = toneFreezeSend;
      _reverseSendRef = toneReverseSend;
      _pannerGainRef = tonePannerGain;
      _panner3DGainRef = tonePanner3DGain;
      _panner3DRef = tonePanner3D;
      _toneFilterRef = toneFilter;

      // Reconectar nodo de captura si existe
      if (recordingDestRef.current) {
        toneFilter.connect(recordingDestRef.current as unknown as Tone.ToneAudioNode);
      }

      const toneTrack = tracksRef.current.find(t => t.id === 'tone');
      const currentSynthType = overrideSynthType ?? toneTrack?.synthType ?? 'mono';
      const fmRatio = toneTrack?.fmRatio ?? 2;
      const fmIndex = toneTrack?.fmIndex ?? 10;
      const wfAmount = toneTrack?.wfAmount ?? 3;
      const wfSymmetry = toneTrack?.wfSymmetry ?? 0;
      const addPartials = toneTrack?.addPartials ?? 4;
      const addBrightness = toneTrack?.addBrightness ?? 0.5;

      let toneSynth: any;

      if (currentSynthType === 'fm') {
        toneSynth = new Tone.FMSynth({
          harmonicity: fmRatio,
          modulationIndex: fmIndex,
          oscillator: { type: 'sawtooth' },
          modulation: { type: 'square' },
          envelope: { attack: 0.005, decay: 0.3, sustain: 0.4, release: 0.8 },
          modulationEnvelope: { attack: 0.06, decay: 0.2, sustain: 0.5, release: 0.8 },
          volume: -6
        }).connect(toneFilter);

        synthsRef.current.tone = {
          triggerAttackRelease: (note: string, duration: any, time: number, velocity: number) => {
            toneSynth.triggerAttackRelease(note, duration, time, velocity);
            const baseCutoff = 600;
            const dynamicCutoff = baseCutoff + (velocity * 4000);
            if (isFinite(dynamicCutoff)) {
              toneFilter.frequency.rampTo(dynamicCutoff, 0.02, time);
            }
          },
          setVolume: (vol: number) => {
            toneSynth.volume.rampTo(Tone.gainToDb(vol) - 6, 0.05);
          },
          setSends: (delayVal: number, reverbVal: number) => {
            toneDelaySend.gain.rampTo(delayVal, 0.05);
            toneReverbSend.gain.rampTo(reverbVal, 0.05);
          },
          updateFmParams: (ratio: number, index: number) => {
            (toneSynth as Tone.FMSynth).harmonicity.value = ratio;
            (toneSynth as Tone.FMSynth).modulationIndex.value = index;
          },
          dispose: () => {
            toneSynth.dispose();
            toneFilter.dispose();
            toneDelaySend.dispose();
            toneReverbSend.dispose();
          }
        };
      } else if (currentSynthType === 'add') {
        // Síntesis aditiva: suma de parciales armónicos
        const oscillators: Tone.Oscillator[] = [];
        const gains: Tone.Gain[] = [];
        const outputGain = new Tone.Gain(0.6).connect(toneFilter);
        let currentFreq = 220;

        const buildPartials = (freq: number, nPartials: number, brightness: number) => {
          oscillators.forEach(o => { try { o.stop(); o.dispose(); } catch(e) {} });
          gains.forEach(g => g.dispose());
          oscillators.length = 0;
          gains.length = 0;

          for (let i = 1; i <= nPartials; i++) {
            const osc = new Tone.Oscillator({
              type: 'sine',
              frequency: freq * i,
              volume: -60
            });
            const gain = new Tone.Gain(0);
            const naturalAmp = 1 / i;
            const flatAmp = 1 / nPartials;
            gain.gain.value = naturalAmp + (flatAmp - naturalAmp) * brightness;
            osc.connect(gain);
            gain.connect(outputGain);
            oscillators.push(osc);
            gains.push(gain);
          }
        };

        buildPartials(currentFreq, addPartials, addBrightness);

        synthsRef.current.tone = {
          triggerAttackRelease: (note: string, duration: any, time: number, velocity: number) => {
            const freq = Tone.Frequency(note).toFrequency();
            currentFreq = freq;

            const attackTime = 0.01;
            const decayTime = typeof duration === 'number'
              ? duration
              : Tone.Time(duration).toSeconds();

            oscillators.forEach((osc, i) => {
              osc.frequency.setValueAtTime(freq * (i + 1), time);
              try { osc.start(time); } catch(e) {}
            });

            outputGain.gain.cancelScheduledValues(time);
            outputGain.gain.setValueAtTime(0, time);
            outputGain.gain.linearRampToValueAtTime(
              0.6 * velocity, time + attackTime
            );
            outputGain.gain.exponentialRampToValueAtTime(
              0.001, time + attackTime + decayTime
            );

            oscillators.forEach(osc => {
              try { osc.stop(time + attackTime + decayTime + 0.05); } catch(e) {}
            });

            const dynamicCutoff = 600 + velocity * 4000;
            if (isFinite(dynamicCutoff)) {
              toneFilter.frequency.rampTo(dynamicCutoff, 0.02, time);
            }
          },
          setVolume: (vol: number) => {
            outputGain.gain.rampTo(vol * 0.6, 0.05);
          },
          setSends: (delayVal: number, reverbVal: number) => {
            toneDelaySend.gain.rampTo(delayVal, 0.05);
            toneReverbSend.gain.rampTo(reverbVal, 0.05);
          },
          updateAddParams: (nPartials: number, brightness: number) => {
            if (nPartials !== oscillators.length) {
              buildPartials(currentFreq, nPartials, brightness);
            } else {
              gains.forEach((g, i) => {
                const naturalAmp = 1 / (i + 1);
                const flatAmp = 1 / nPartials;
                g.gain.rampTo(naturalAmp + (flatAmp - naturalAmp) * brightness, 0.05);
              });
            }
          },
          dispose: () => {
            oscillators.forEach(o => { try { o.stop(); o.dispose(); } catch(e) {} });
            gains.forEach(g => g.dispose());
            outputGain.dispose();
            toneFilter.dispose();
            toneDelaySend.dispose();
            toneReverbSend.dispose();
          }
        };

        const track = tracksRef.current.find(t => t.id === 'tone');
        if (track && synthsRef.current.tone) {
          synthsRef.current.tone.setVolume(track.volume);
          synthsRef.current.tone.setSends(track.delaySend, track.reverbSend);
        }
      } else if (currentSynthType === 'pad') {
        // Pad synthesis: N osciladores sawtooth desafinados → chorus natural
        const toneTrackPad = tracksRef.current.find(t => t.id === 'tone');
        const voices = toneTrackPad?.padVoices ?? 5;
        const detuneAmount = toneTrackPad?.padDetune ?? 30;
        const attackTime = toneTrackPad?.padAttack ?? 0.3;

        const padOscillators: Tone.Oscillator[] = [];
        const padVoiceGains: Tone.Gain[] = [];
        const padMasterGain = new Tone.Gain(1 / voices);
        padMasterGain.connect(toneFilter);

        for (let i = 0; i < voices; i++) {
          const osc = new Tone.Oscillator({ type: 'sawtooth', frequency: 220, volume: -6 });
          const g = new Tone.Gain(0);
          // Spread de detune simétrico
          const spread = voices > 1 ? (i - (voices - 1) / 2) / ((voices - 1) / 2) : 0;
          osc.detune.value = spread * detuneAmount; // detuneAmount ya está en cents
          osc.connect(g);
          g.connect(padMasterGain);
          osc.start();
          padOscillators.push(osc);
          padVoiceGains.push(g);
        }

        let currentPadAttack = attackTime;

        synthsRef.current.tone = {
          triggerAttackRelease: (note: string, duration: any, time: number, velocity: number) => {
            const freq = Tone.Frequency(note).toFrequency();
            const dur = typeof duration === 'number' ? duration : Tone.Time(duration).toSeconds();
            padOscillators.forEach(osc => {
              osc.frequency.setValueAtTime(freq, time);
            });
            padVoiceGains.forEach(g => {
              g.gain.cancelScheduledValues(time);
              g.gain.setValueAtTime(0, time);
              g.gain.linearRampToValueAtTime(velocity, time + currentPadAttack);
              g.gain.setValueAtTime(velocity, time + Math.max(dur - 0.05, currentPadAttack));
              g.gain.linearRampToValueAtTime(0, time + dur);
            });
            const dynamicCutoff = 600 + velocity * 4000;
            if (isFinite(dynamicCutoff)) {
              toneFilter.frequency.rampTo(dynamicCutoff, 0.02, time);
            }
          },
          setVolume: (vol: number) => {
            padMasterGain.gain.rampTo((1 / padOscillators.length) * vol, 0.05);
          },
          setSends: (delayVal: number, reverbVal: number) => {
            toneDelaySend.gain.rampTo(delayVal, 0.05);
            toneReverbSend.gain.rampTo(reverbVal, 0.05);
          },
          updatePadParams: (newVoices: number, newDetune: number, newAttack: number) => {
            // Update detune spread on existing voices
            padOscillators.forEach((osc, i) => {
              const spread = padOscillators.length > 1
                ? (i - (padOscillators.length - 1) / 2) / ((padOscillators.length - 1) / 2) : 0;
              osc.detune.rampTo(spread * newDetune, 0.05);
            });
            currentPadAttack = newAttack;
          },
          dispose: () => {
            padOscillators.forEach(osc => { try { osc.stop(); osc.dispose(); } catch(e) {} });
            padVoiceGains.forEach(g => g.dispose());
            padMasterGain.dispose();
            toneFilter.dispose();
            toneDelaySend.dispose();
            toneReverbSend.dispose();
          }
        };
      } else if (currentSynthType === 'drone') {
        // Drone synthesis: sine → inject gain → feedback delay → filter → output
        const toneTrackDrone = tracksRef.current.find(t => t.id === 'tone');
        const feedbackAmount = toneTrackDrone?.droneFeedback ?? 0.88;
        const filterFreq = toneTrackDrone?.droneFilterFreq ?? 2000;

        const droneOsc = new Tone.Oscillator({ type: 'sine', frequency: 220, volume: -6 });
        const injectGain = new Tone.Gain(0);
        const droneMasterGain = new Tone.Gain(0.7); // nodo separado para setVolume
        const feedbackDelay = new Tone.FeedbackDelay({
          delayTime: 0.5,
          feedback: feedbackAmount,
          wet: 1
        });
        const loopFilter = new Tone.Filter({
          frequency: filterFreq,
          type: 'lowpass',
          rolloff: -12
        });
        const droneLimiter = new Tone.Limiter(-3); // protección contra acumulación

        droneOsc.connect(injectGain);
        injectGain.connect(feedbackDelay);
        feedbackDelay.connect(loopFilter);
        loopFilter.connect(droneLimiter);
        droneLimiter.connect(droneMasterGain);
        droneMasterGain.connect(toneFilter);
        droneOsc.start();

        synthsRef.current.tone = {
          triggerAttackRelease: (note: string, duration: any, time: number, velocity: number) => {
            const freq = Tone.Frequency(note).toFrequency();
            droneOsc.frequency.setValueAtTime(freq, time);
            // Inyectar burst corto de energía en el loop
            injectGain.gain.cancelScheduledValues(time);
            injectGain.gain.setValueAtTime(0, time);
            injectGain.gain.linearRampToValueAtTime(velocity, time + 0.01);
            injectGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
            const dynamicCutoff = 600 + velocity * 4000;
            if (isFinite(dynamicCutoff)) {
              toneFilter.frequency.rampTo(dynamicCutoff, 0.02, time);
            }
          },
          setVolume: (vol: number) => {
            droneMasterGain.gain.rampTo(vol * 0.7, 0.05);
          },
          setSends: (delayVal: number, reverbVal: number) => {
            toneDelaySend.gain.rampTo(delayVal, 0.05);
            toneReverbSend.gain.rampTo(reverbVal, 0.05);
          },
          updateDroneParams: (newFeedback: number, newFilterFreq: number) => {
            feedbackDelay.feedback.rampTo(newFeedback, 0.1);
            loopFilter.frequency.rampTo(newFilterFreq, 0.1);
          },
          dispose: () => {
            droneOsc.stop();
            droneOsc.dispose();
            injectGain.dispose();
            droneMasterGain.dispose();
            feedbackDelay.dispose();
            loopFilter.dispose();
            droneLimiter.dispose();
            toneFilter.dispose();
            toneDelaySend.dispose();
            toneReverbSend.dispose();
          }
        };
      } else if (currentSynthType === 'ks') {
        // Karplus-Strong: noise burst → delay loop → filter
        const toneTrackKs = tracksRef.current.find(t => t.id === 'tone');
        const ksDecayAmount = toneTrackKs?.ksDecay ?? 0.97;
        const ksBrightnessFreq = toneTrackKs?.ksBrightness ?? 5000;

        const ksMasterGain = new Tone.Gain(1);
        ksMasterGain.connect(toneFilter);

        const ksDelay = new Tone.Delay({ delayTime: 0.01, maxDelay: 0.05 });
        const ksFilter = new Tone.Filter({ frequency: ksBrightnessFreq, type: 'lowpass', rolloff: -12 });
        const ksLimiter = new Tone.Limiter(-3);
        const ksFeedback = new Tone.Gain(ksDecayAmount);

        // Loop: ksDelay → ksFilter → ksLimiter → ksFeedback → ksDelay
        ksDelay.connect(ksFilter);
        ksFilter.connect(ksLimiter);
        ksLimiter.connect(ksFeedback);
        ksFeedback.connect(ksDelay);
        // Output from loop
        ksFilter.connect(ksMasterGain);

        synthsRef.current.tone = {
          triggerAttackRelease: (note: string, _duration: string | number, time: number, velocity = 0.8) => {
            const freq = Tone.Frequency(note).toFrequency();
            const delayTime = 1 / freq;
            ksDelay.delayTime.setValueAtTime(delayTime, time);

            // Noise burst excitation (~50ms)
            const rawCtx = Tone.context.rawContext as AudioContext;
            const bufferSize = Math.ceil(rawCtx.sampleRate * 0.05);
            const noiseBuffer = rawCtx.createBuffer(1, bufferSize, rawCtx.sampleRate);
            const data = noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
              data[i] = (Math.random() - 0.5) * 2 * velocity;
            }
            const noiseSource = rawCtx.createBufferSource();
            noiseSource.buffer = noiseBuffer;
            noiseSource.connect((ksDelay as any).input);
            noiseSource.start(time);
            noiseSource.stop(time + 0.05);

            // Dynamic filter
            const dynamicCutoff = 600 + velocity * 4000;
            if (isFinite(dynamicCutoff)) {
              toneFilter.frequency.rampTo(dynamicCutoff, 0.02, time);
            }
          },
          setVolume: (vol: number) => {
            ksMasterGain.gain.rampTo(Tone.dbToGain(vol) * 0.8, 0.05);
          },
          setSends: (delayVal: number, reverbVal: number) => {
            toneDelaySend.gain.rampTo(delayVal, 0.05);
            toneReverbSend.gain.rampTo(reverbVal, 0.05);
          },
          updateKsParams: (newDecay: number, newBrightness: number) => {
            ksFeedback.gain.rampTo(newDecay, 0.1);
            ksFilter.frequency.rampTo(newBrightness, 0.1);
          },
          dispose: () => {
            ksDelay.dispose();
            ksFilter.dispose();
            ksLimiter.dispose();
            ksFeedback.dispose();
            ksMasterGain.dispose();
            toneFilter.dispose();
            toneDelaySend.dispose();
            toneReverbSend.dispose();
          }
        };
      } else if (currentSynthType === 'modal') {
        // Modal synthesis: banco de resonadores
        const MODAL_BODIES = {
          bell: [
            { ratio: 1.000, decay: 3.0, amp: 1.00 },
            { ratio: 2.756, decay: 2.0, amp: 0.67 },
            { ratio: 5.404, decay: 1.5, amp: 0.45 },
            { ratio: 8.933, decay: 1.0, amp: 0.28 },
          ],
          plate: [
            { ratio: 1.000, decay: 2.0, amp: 1.00 },
            { ratio: 1.414, decay: 1.5, amp: 0.80 },
            { ratio: 2.000, decay: 1.2, amp: 0.60 },
            { ratio: 2.449, decay: 0.8, amp: 0.40 },
            { ratio: 3.000, decay: 0.5, amp: 0.25 },
          ],
          string: [
            { ratio: 1.0, decay: 2.5, amp: 1.00 },
            { ratio: 2.0, decay: 2.0, amp: 0.50 },
            { ratio: 3.0, decay: 1.5, amp: 0.33 },
            { ratio: 4.0, decay: 1.0, amp: 0.25 },
            { ratio: 5.0, decay: 0.8, amp: 0.20 },
          ],
        } as const;

        const modalMasterGain = new Tone.Gain(1);
        modalMasterGain.connect(toneFilter);

        synthsRef.current.tone = {
          triggerAttackRelease: (note: string, _duration: string | number, time: number, velocity = 0.8) => {
            const freq = Tone.Frequency(note).toFrequency();
            const toneTrackModal = tracksRef.current.find(t => t.id === 'tone');
            const bodyKey = (toneTrackModal?.modalBody ?? 'bell') as keyof typeof MODAL_BODIES;
            const body = MODAL_BODIES[bodyKey] || MODAL_BODIES.bell;
            const decayMult = toneTrackModal?.modalDecay ?? 1.0;

            body.forEach(mode => {
              const osc = new Tone.Oscillator({ type: 'sine' });
              const env = new Tone.Gain(0);
              const totalDecay = mode.decay * decayMult;

              osc.frequency.value = freq * mode.ratio;
              env.gain.setValueAtTime(mode.amp * velocity, time);
              env.gain.exponentialRampToValueAtTime(0.0001, time + totalDecay);

              osc.connect(env);
              env.connect(modalMasterGain);
              osc.start(time);
              osc.stop(time + totalDecay + 0.1);

              // Cleanup env after decay to prevent memory leak
              const cleanupMs = (totalDecay + 0.2) * 1000;
              setTimeout(() => {
                try { env.dispose(); } catch {}
              }, cleanupMs);
            });

            // Dynamic filter
            const dynamicCutoff = 600 + velocity * 4000;
            if (isFinite(dynamicCutoff)) {
              toneFilter.frequency.rampTo(dynamicCutoff, 0.02, time);
            }
          },
          setVolume: (vol: number) => {
            modalMasterGain.gain.rampTo(Tone.dbToGain(vol) * 0.8, 0.05);
          },
          setSends: (delayVal: number, reverbVal: number) => {
            toneDelaySend.gain.rampTo(delayVal, 0.05);
            toneReverbSend.gain.rampTo(reverbVal, 0.05);
          },
          dispose: () => {
            modalMasterGain.dispose();
            toneFilter.dispose();
            toneDelaySend.dispose();
            toneReverbSend.dispose();
          }
        };
      } else if (currentSynthType === 'ambient') {
        // Ambient synthesis: Eno-style asynchronous sine loops
        const BASE_DURATIONS = [2.3, 3.7, 5.1, 7.3];
        const NUM_LOOPS = BASE_DURATIONS.length;
        const toneTrackAmb = tracksRef.current.find(t => t.id === 'tone');
        const ambientMasterGain = new Tone.Gain(toneTrackAmb?.ambientVolume ?? 0.6);
        ambientMasterGain.connect(toneFilter);

        const ambientOscs: Tone.Oscillator[] = [];
        const ambientGains: Tone.Gain[] = [];
        const ambientRepeatIds: number[] = [];
        let ambientStarted = false;

        for (let i = 0; i < NUM_LOOPS; i++) {
          const osc = new Tone.Oscillator({ type: 'sine' });
          const g = new Tone.Gain(0);
          osc.connect(g);
          g.connect(ambientMasterGain);
          osc.start();
          ambientOscs.push(osc);
          ambientGains.push(g);
        }

        const assignAmbientFreqs = () => {
          const currentTrack = tracksRef.current.find(t => t.id === 'tone');
          if (!currentTrack?.noteIndices?.length) return;
          const scaleIntervals = getScaleIntervals(currentTrack.scaleId);
          for (let i = 0; i < NUM_LOOPS; i++) {
            const noteIdx = currentTrack.noteIndices[
              Math.floor(Math.random() * currentTrack.noteIndices.length)
            ];
            ambientOscs[i].frequency.value = noteIndexToFreq(currentTrack.rootNote, currentTrack.scaleId, noteIdx);
          }
        };

        const scheduleAmbientLoop = (loopIdx: number) => {
          const currentTrack = tracksRef.current.find(t => t.id === 'tone');
          const speedMult = currentTrack?.ambientSpeed ?? 1.0;
          const dur = BASE_DURATIONS[loopIdx] * speedMult;

          const id = Tone.getTransport().scheduleRepeat((time) => {
            if (!ambientStarted) return;
            // Fade in
            ambientGains[loopIdx].gain.cancelScheduledValues(time);
            ambientGains[loopIdx].gain.setValueAtTime(0, time);
            ambientGains[loopIdx].gain.linearRampToValueAtTime(0.7, time + 0.15);
            // Sustain then fade out
            ambientGains[loopIdx].gain.setValueAtTime(0.7, time + dur - 0.3);
            ambientGains[loopIdx].gain.linearRampToValueAtTime(0, time + dur);
          }, dur, Tone.now() + loopIdx * 0.3);
          ambientRepeatIds.push(id);
        };

        const stopAmbientLoops = () => {
          ambientStarted = false;
          ambientRepeatIds.forEach(id => Tone.getTransport().clear(id));
          ambientRepeatIds.length = 0;
          ambientGains.forEach(g => {
            g.gain.cancelScheduledValues(Tone.now());
            g.gain.rampTo(0, 0.1);
          });
        };

        synthsRef.current.tone = {
          triggerAttackRelease: (_note: string, _duration: string | number, _time: number, _velocity = 0.8) => {
            if (!ambientStarted) {
              ambientStarted = true;
              assignAmbientFreqs();
              for (let i = 0; i < NUM_LOOPS; i++) {
                scheduleAmbientLoop(i);
              }
            } else {
              // Subsequent triggers: modulate notes
              assignAmbientFreqs();
            }
          },
          setVolume: (db: number) => {
            ambientMasterGain.gain.rampTo(Tone.dbToGain(db) * 0.6, 0.05);
          },
          setSends: (delayVal: number, reverbVal: number) => {
            toneDelaySend.gain.rampTo(delayVal, 0.05);
            toneReverbSend.gain.rampTo(reverbVal, 0.05);
          },
          stop: () => {
            stopAmbientLoops();
          },
          dispose: () => {
            stopAmbientLoops();
            ambientOscs.forEach(osc => { osc.stop(); osc.dispose(); });
            ambientGains.forEach(g => g.dispose());
            ambientMasterGain.dispose();
            toneFilter.dispose();
            toneDelaySend.dispose();
            toneReverbSend.dispose();
          }
        };
      } else if (currentSynthType === 'wf') {
        // West Coast synthesis: oscillator → wavefolder → LPG
        const wfOsc = new Tone.Oscillator({
          type: 'triangle',
          frequency: 220,
          volume: -6
        });

        const waveFolder = new Tone.WaveShaper(
          buildWavefoldCurve(wfAmount, wfSymmetry),
          65536
        );

        const preFoldGain = new Tone.Gain(1 + wfAmount * 0.3);

        // Low Pass Gate: filtro + VCA acoplados (comportamiento Vactrol)
        const lpgFilter = new Tone.Filter({
          type: 'lowpass',
          frequency: 200,
          Q: 3,
          rolloff: -24
        });
        const lpgVca = new Tone.Gain(0);

        // Routing: osc → gain → wavefolder → LPG filter → LPG vca → toneFilter
        wfOsc.connect(preFoldGain);
        preFoldGain.connect(waveFolder);
        waveFolder.connect(lpgFilter);
        lpgFilter.connect(lpgVca);
        lpgVca.connect(toneFilter);

        synthsRef.current.tone = {
          triggerAttackRelease: (note: string, duration: any, time: number, velocity: number) => {
            const freq = Tone.Frequency(note).toFrequency();
            wfOsc.frequency.setValueAtTime(freq, time);

            const attackTime = 0.005;
            const decayTime = typeof duration === 'number'
              ? duration * 1.2
              : Tone.Time(duration).toSeconds() * 1.2;

            // Start/stop oscillator per note
            wfOsc.start(time);
            wfOsc.stop(time + attackTime + decayTime + 0.05);

            // VCA envelope
            lpgVca.gain.cancelScheduledValues(time);
            lpgVca.gain.setValueAtTime(0, time);
            lpgVca.gain.linearRampToValueAtTime(velocity, time + attackTime);
            lpgVca.gain.exponentialRampToValueAtTime(
              0.001, time + attackTime + decayTime
            );

            // Filter envelope — más lento que VCA (característica Vactrol)
            const filterFreq = vactrolfiltFreq(velocity);
            lpgFilter.frequency.cancelScheduledValues(time);
            lpgFilter.frequency.setValueAtTime(200, time);
            lpgFilter.frequency.exponentialRampToValueAtTime(
              filterFreq, time + attackTime * 1.5
            );
            lpgFilter.frequency.exponentialRampToValueAtTime(
              200, time + attackTime * 1.5 + decayTime * 1.3
            );

            // Filtro dinámico global también responde a velocity
            const dynamicCutoff = 600 + velocity * 4000;
            if (isFinite(dynamicCutoff)) {
              toneFilter.frequency.rampTo(dynamicCutoff, 0.02, time);
            }
          },
          setVolume: (vol: number) => {
            wfOsc.volume.rampTo(Tone.gainToDb(vol) - 6, 0.05);
          },
          setSends: (delayVal: number, reverbVal: number) => {
            toneDelaySend.gain.rampTo(delayVal, 0.05);
            toneReverbSend.gain.rampTo(reverbVal, 0.05);
          },
          updateWfParams: (amount: number, symmetry: number) => {
            waveFolder.curve = buildWavefoldCurve(amount, symmetry);
            preFoldGain.gain.rampTo(1 + amount * 0.3, 0.05);
          },
          dispose: () => {
            wfOsc.stop().dispose();
            waveFolder.dispose();
            preFoldGain.dispose();
            lpgFilter.dispose();
            lpgVca.dispose();
            toneFilter.dispose();
            toneDelaySend.dispose();
            toneReverbSend.dispose();
          }
        };
      } else {
        toneSynth = new Tone.MonoSynth({
          oscillator: { type: 'sawtooth' },
          filter: { Q: 6, type: 'lowpass', rolloff: -24 },
          envelope: { attack: 0.005, decay: 0.3, sustain: 0.4, release: 0.8 },
          filterEnvelope: { attack: 0.06, decay: 0.2, sustain: 0.5, release: 0.8, baseFrequency: 200, octaves: 4 },
          volume: -6
        }).connect(toneFilter);

        synthsRef.current.tone = {
          triggerAttackRelease: (note: string, duration: any, time: number, velocity: number) => {
            toneSynth.triggerAttackRelease(note, duration, time, velocity);
            const baseCutoff = 600;
            const dynamicCutoff = baseCutoff + (velocity * 4000);
            if (isFinite(dynamicCutoff)) {
              toneFilter.frequency.rampTo(dynamicCutoff, 0.02, time);
            }
          },
          setVolume: (vol: number) => {
            toneSynth.volume.rampTo(Tone.gainToDb(vol) - 6, 0.05);
          },
          setSends: (delayVal: number, reverbVal: number) => {
            toneDelaySend.gain.rampTo(delayVal, 0.05);
            toneReverbSend.gain.rampTo(reverbVal, 0.05);
          },
          dispose: () => {
            toneSynth.dispose();
            toneFilter.dispose();
            toneDelaySend.dispose();
            toneReverbSend.dispose();
          }
        };
      }
      // Audio-Rate Modulation module — disponible en todos los modos de synth tonal
      const toneTrackCurrent = tracksRef.current.find(t => t.id === 'tone');
      const arRate = toneTrackCurrent?.arRate ?? 80;
      const arDepth = toneTrackCurrent?.arDepth ?? 0;

      const arLFO = new Tone.Oscillator({
        type: 'sine',
        frequency: arRate
      });
      const arGain = new Tone.Gain(arDepth);
      arLFO.connect(arGain);
      arGain.connect(toneFilter.frequency);
      let arRunning = arDepth > 0;
      if (arRunning) arLFO.start();

      // Extender la interfaz del synth con métodos AR
      const existingDispose = synthsRef.current.tone.dispose;
      synthsRef.current.tone.updateArParams = (rate: number, depth: number) => {
        arLFO.frequency.rampTo(rate, 0.05);
        arGain.gain.rampTo(depth, 0.05);
        if (depth > 0 && !arRunning) { arLFO.start(); arRunning = true; }
        if (depth === 0 && arRunning) { arLFO.stop(); arRunning = false; }
      };
      synthsRef.current.tone.dispose = () => {
        try { arLFO.stop(); arLFO.dispose(); } catch(e) {}
        arGain.dispose();
        existingDispose();
      };
    }
    // Lorenz + Nested LFO injection for tone rebuild
    if (trackId === 'tone' && synthsRef.current.tone) {
      const tf = toneFilterRef.current;
      synthsRef.current.tone.updateLorenz = (normalizedValue: number, depth: number, target: string) => {
        if (target === 'filter' && tf) tf.frequency.rampTo(600 + normalizedValue * depth, 0.05);
      };
      synthsRef.current.tone.nestedLfoInstance = null;
      synthsRef.current.tone.initNestedLfo = (r1: number, r2: number, d: number) => {
        synthsRef.current.tone.nestedLfoInstance?.dispose();
        synthsRef.current.tone.nestedLfoInstance = createNestedLfo(tf, r1, r2, d);
      };
      synthsRef.current.tone.updateNestedLfo = (r1: number, r2: number, d: number) => synthsRef.current.tone.nestedLfoInstance?.update(r1, r2, d);
      synthsRef.current.tone.disposeNestedLfo = () => { synthsRef.current.tone.nestedLfoInstance?.dispose(); synthsRef.current.tone.nestedLfoInstance = null; };
      // EQ injection for tone rebuild
      if (_eqHpfRef && _eqLpfRef) {
        const eqH = _eqHpfRef;
        const eqL = _eqLpfRef;
        synthsRef.current.tone.updateEq = (hpfFreq: number, lpfFreq: number) => {
          eqH.frequency.rampTo(hpfFreq, 0.05);
          eqL.frequency.rampTo(lpfFreq, 0.05);
        };
      }
      // Pan + FreqShifter injection for tone rebuild
      if (_pannerRef && _freqShifterRef) {
        const pRef = _pannerRef;
        const fsRef = _freqShifterRef;
        const bpRef = _fsBypassGainRef;
        const drRef = _fsDirectGainRef;
        synthsRef.current.tone.setPan = (value: number) => { pRef.pan.rampTo(value, 0.05); };
        synthsRef.current.tone.setFreqShift = (hz: number, enabled?: boolean) => {
          fsRef.frequency.rampTo(hz, 0.05);
          if (enabled !== undefined && bpRef && drRef) {
            bpRef.gain.rampTo(enabled ? 1 : 0, 0.02);
            drRef.gain.rampTo(enabled ? 0 : 1, 0.02);
          }
        };
        synthsRef.current.tone.panner = pRef;
        synthsRef.current.tone.freqShifter = fsRef;
      }
      // Spectral send injection for tone rebuild
      if (_spectralSendRef) {
        const ssRef = _spectralSendRef;
        synthsRef.current.tone.setSpectralSend = (value: number) => { ssRef.gain.rampTo(value, 0.05); };
      }
      // Freeze send injection for tone rebuild (Phase 9)
      if (_freezeSendRef) {
        const fsRef2 = _freezeSendRef;
        synthsRef.current.tone.setFreezeSend = (value: number) => { fsRef2.gain.rampTo(value, 0.05); };
      }
      // Reverse send injection for tone rebuild (Phase 9)
      if (_reverseSendRef) {
        const rvRef = _reverseSendRef;
        synthsRef.current.tone.setReverseSend = (value: number) => { rvRef.gain.rampTo(value, 0.05); };
      }
      // Binaural injection for tone rebuild (Phase 7D)
      if (_pannerGainRef && _panner3DGainRef && _panner3DRef) {
        const pgRef = _pannerGainRef;
        const p3gRef = _panner3DGainRef;
        const p3dRef = _panner3DRef;
        synthsRef.current.tone.switchBinaural = (binaural: boolean) => {
          pgRef.gain.rampTo(binaural ? 0 : 1, 0.1);
          p3gRef.gain.rampTo(binaural ? 1 : 0, 0.1);
        };
        synthsRef.current.tone.updateBinaural = (azimuth: number, distance: number) => {
          const rad = (azimuth * Math.PI) / 180;
          try { p3dRef.setPosition(Math.sin(rad) * distance, 0, -Math.cos(rad) * distance); } catch(e) {
            p3dRef.positionX.value = Math.sin(rad) * distance;
            p3dRef.positionZ.value = -Math.cos(rad) * distance;
          }
        };
      }
      // Crossfeed injection for tone rebuild (Phase 7E)
      if (_toneFilterRef) {
        const tf = _toneFilterRef;
        synthsRef.current.tone.setCrossfeedFreq = (hz: number) => { tf.frequency.rampTo(hz, 0.05); };
      }
    }
    // Apply current volume, sends, EQ, pan, and freqShift
    const track = tracksRef.current.find(t => t.id === trackId);
    if (track && synthsRef.current[trackId]) {
      synthsRef.current[trackId].setVolume(track.volume);
      synthsRef.current[trackId].setSends(track.delaySend, track.reverbSend);
      // Restore EQ state
      const hpf = track.eqEnabled ? (track.eqHpfFreq ?? 20) : 20;
      const lpf = track.eqEnabled ? (track.eqLpfFreq ?? 20000) : 20000;
      synthsRef.current[trackId].updateEq?.(hpf, lpf);
      // Restore pan and freqShift
      synthsRef.current[trackId].setPan?.(track.pan ?? 0);
      synthsRef.current[trackId].setFreqShift?.(track.freqShiftEnabled ? (track.freqShift ?? 0) : 0, track.freqShiftEnabled ?? false);
      // Restore spectral delay send
      synthsRef.current[trackId].setSpectralSend?.(track.spectralDelaySend ?? 0);
      // Restore freeze send (Phase 9)
      synthsRef.current[trackId].setFreezeSend?.(track.freezeSend ?? 0);
      // Restore reverse send (Phase 9)
      synthsRef.current[trackId].setReverseSend?.(track.reverseSend ?? 0);
      // Restore binaural state (Phase 7D)
      synthsRef.current[trackId].switchBinaural?.(track.binauralEnabled ?? false);
      if (track.binauralEnabled) {
        synthsRef.current[trackId].updateBinaural?.(track.binauralAzimuth ?? 0, track.binauralDistance ?? 3);
      }
    }
  };

  // Armed→recording cuando arranca play, auto-stop cuando para
  useEffect(() => {
    if (isPlaying && toneRecordingState === 'armed') {
      startRecordingNow();
    }
    if (!isPlaying && toneRecordingState === 'recording') {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    }
    if (isPlaying && globalRecordingState === 'armed') {
      startGlobalRecordingNow();
    }
    if (!isPlaying && globalRecordingState === 'recording') {
      if (globalMediaRecorderRef.current?.state === 'recording') {
        globalMediaRecorderRef.current.stop();
      }
    }
    if (isPlaying && cloudRecordingState === 'armed') {
      startCloudRecordingNow();
    }
    if (!isPlaying && cloudRecordingState === 'recording') {
      if (cloudMediaRecorderRef.current?.state === 'recording') {
        cloudMediaRecorderRef.current.stop();
      }
    }
  }, [isPlaying]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { Tone.getTransport().bpm.value = bpm; }, [bpm]);
  
  // Sync Sampler/GrainPlayer parameters with audio nodes
  useEffect(() => {
    tracks.forEach(track => {
      const synth = synthsRef.current[track.id];
      if (!synth) return;

      if (synth.grainPlayer) {
        synth.grainPlayer.grainSize = track.grainSize / 1000;
        synth.grainPlayer.overlap = track.overlap;
        synth.grainPlayer.detune = track.pitch * 100;
        const stretchRate = track.stretchEnabled ? (track.stretchRate ?? 1.0) : 1.0;
        synth.grainPlayer.playbackRate = stretchRate;
      }

      if (synth.bitCrusher) {
        synth.bitCrusher.bits.value = track.bitCrush;
      }
    });
  }, [tracks]);

  const progress = (globalStep % mcm) / mcm;

  // Eclipse countdown
  const stepsRestantes = mcm - (globalStep % mcm);
  const sixteenthDuration = 60 / bpm / 4;
  const segundosRestantes = stepsRestantes * sixteenthDuration;
  const totalCycleSeconds = mcm * sixteenthDuration;

  const formatEclipseTime = (secs: number, isEstimate: boolean) => {
    if (secs >= 60) {
      const m = Math.floor(secs / 60);
      const s = Math.round(secs % 60);
      return `${isEstimate ? '~' : ''}${m}m ${s}s`;
    }
    return `${Math.round(secs)}s`;
  };

  const eclipseDisplay = (() => {
    if (eclipseFlash) return 'NOW ✦';
    const secs = isPlaying ? segundosRestantes : totalCycleSeconds;
    const isLong = secs > 600;
    return formatEclipseTime(secs, isLong);
  })();

  // Eclipse latch
  useEffect(() => {
    if (isPlaying && stepsRestantes <= 1 && !eclipseRef.current) {
      eclipseRef.current = true;
      setEclipseFlash(true);
      // Record eclipse in history
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;
      eclipseHistoryRef.current = [{ time: timeStr, mcm, bpm }, ...eclipseHistoryRef.current].slice(0, 5);
      const timer = setTimeout(() => {
        setEclipseFlash(false);
        eclipseRef.current = false;
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [stepsRestantes, isPlaying, mcm, bpm]);

  // Hit Rate
  const hitRateData = useMemo(() => {
    const rhythmicStats = tracks
      .filter(t => t.id !== 'cloud')
      .map(t => uiStats[t.id] || { hits: 0, misses: 0 });
    const totalHits = rhythmicStats.reduce((sum, s) => sum + s.hits, 0);
    const totalMisses = rhythmicStats.reduce((sum, s) => sum + s.misses, 0);
    const total = totalHits + totalMisses;
    const rate = total > 0 ? Math.round((totalHits / total) * 100) : null;
    return { rate, total };
  }, [tracks, uiStats]);

  const hitRateColor = hitRateData.rate === null ? 'text-idm-muted'
    : hitRateData.rate >= 80 ? 'text-idm-ink'
    : hitRateData.rate >= 50 ? 'text-system-accent'
    : 'text-red-500';

  // Perspective logic simplified (always standard)

  return (
    <div className="p-6 w-full max-w-[1800px] mx-auto bg-idm-bg border border-black/5 rounded-xl relative">
      {/* Perspective Selector Removed */}

      {/* Sticky Header Bar */}
      <div className="sticky top-0 z-50 -mx-6 px-6 py-4 bg-white border-b border-black/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 transition-all duration-500 opacity-100 pointer-events-auto">
        <div>
          <h1 className="text-2xl font-mono font-bold tracking-tighter uppercase mb-0.5 flex items-center gap-2">
            <Activity className="text-system-accent" size={20} />
            Polyrhythmic <span className="text-system-accent">IDM</span> Engine
          </h1>
          <p className="text-idm-ink/40 font-mono text-[9px] uppercase tracking-[0.3em]">
            4-Track Generative Environment // Multi-Cycle Sync
          </p>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {audioContextState !== 'running' ? (
              <button 
                onClick={handleStartAudio}
                className="flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/30 rounded-full hover:bg-red-500/20 transition-all group"
              >
                <Power size={10} className="text-red-500 group-hover:scale-110 transition-transform" />
                <span className="text-[8px] font-mono font-bold text-red-500 uppercase tracking-widest">Audio Engine Suspended - Click to Start</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1 bg-green-500/5 border border-green-500/20 rounded-full">
                <Activity size={10} className="text-green-500" />
                <span className="text-[8px] font-mono font-bold text-green-500 uppercase tracking-widest">Engine Online</span>
              </div>
            )}
            <button 
              onClick={() => setIsStudyMode(!isStudyMode)}
              className={`flex items-center gap-2 px-3 py-1 rounded-full text-[8px] font-mono font-bold uppercase tracking-widest transition-all duration-300 border ${
                isStudyMode 
                  ? 'bg-system-accent/10 border-system-accent/30 text-system-accent' 
                  : 'bg-black/[0.02] text-idm-muted border-black/5 hover:text-idm-ink hover:border-black/10'
              }`}
              title="Toggle Study Mode (Capa Pedagógica)"
            >
              <HelpCircle size={10} />
              <span>{isStudyMode ? 'Study ON' : 'Study Mode'}</span>
            </button>
            {isStudyMode && (
              <button
                onClick={() => setStudyVoice(v => v === 'technical' ? 'literary' : 'technical')}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[8px] font-mono font-bold uppercase tracking-widest transition-all duration-300 border bg-black/[0.02] text-idm-muted border-black/5 hover:text-idm-ink hover:border-black/10"
                title="Alternar entre tooltips técnicos y literarios"
              >
                {studyVoice === 'technical' ? '∑ Técnico' : '✦ Literario'}
              </button>
            )}
            <button 
              onClick={() => setIsThesisOpen(true)}
              className="flex items-center gap-2 px-3 py-1 rounded-full text-[8px] font-mono font-bold uppercase tracking-widest transition-all duration-300 border bg-black/[0.02] text-idm-muted border-black/5 hover:text-idm-ink hover:border-black/10"
              title="Ver Tesis Doctoral (Macro)"
            >
              <Info size={10} />
              <span>Info</span>
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex gap-2 mr-2">
            <button 
              onClick={() => setShowControls(!showControls)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-mono uppercase tracking-wider transition-all duration-300 border ${
                showControls 
                  ? 'bg-system-accent/10 text-system-accent border-system-accent/30' 
                  : 'bg-white text-idm-muted border-black/5 hover:text-idm-ink hover:border-black/10'
              }`}
              title="Toggle Global Controls"
            >
              <Sliders size={12} />
              <span className="hidden sm:inline">{showControls ? 'Controls' : 'Controls'}</span>
            </button>
            <button 
              onClick={() => setShowVisuals(!showVisuals)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-mono uppercase tracking-wider transition-all duration-300 border ${
                showVisuals 
                  ? 'bg-system-accent/10 text-system-accent border-system-accent/30' 
                  : 'bg-white text-idm-muted border-black/5 hover:text-idm-ink hover:border-black/10'
              }`}
              title="Toggle Visual Monitors"
            >
              {showVisuals ? <Eye size={12} /> : <EyeOff size={12} />}
              <span className="hidden sm:inline">{showVisuals ? 'Visuals' : 'Visuals'}</span>
            </button>
            <button 
              onClick={() => setShowSync(!showSync)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-mono uppercase tracking-wider transition-all duration-300 border ${
                showSync 
                  ? 'bg-system-accent/10 text-system-accent border-system-accent/30' 
                  : 'bg-white text-idm-muted border-black/5 hover:text-idm-ink hover:border-black/10'
              }`}
              title="Toggle Pattern Sync"
            >
              <Zap size={12} />
              <span className="hidden sm:inline">{showSync ? 'Sync' : 'Sync'}</span>
            </button>
            <button 
              onClick={() => setShowLibrary(!showLibrary)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-mono uppercase tracking-wider transition-all duration-300 border ${
                showLibrary 
                  ? 'bg-system-accent/10 text-system-accent border-system-accent/30' 
                  : 'bg-white text-idm-muted border-black/5 hover:text-idm-ink hover:border-black/10'
              }`}
              title="Toggle EPL Library"
            >
              <Disc size={12} />
              <span className="hidden sm:inline">{showLibrary ? 'Library' : 'Library'}</span>
            </button>
            <button 
              onClick={() => setShowEngine(!showEngine)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-mono uppercase tracking-wider transition-all duration-300 border ${
                showEngine 
                  ? 'bg-idm-ink/10 text-idm-ink border-idm-ink/30' 
                  : 'bg-white text-idm-muted border-black/5 hover:text-idm-ink hover:border-black/10'
              }`}
              title="Toggle Engine Room"
            >
              <Settings size={12} />
              <span className="hidden sm:inline">Engine</span>
            </button>
            <button 
              onClick={() => setShowPatternSpace(!showPatternSpace)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-mono uppercase tracking-wider transition-all duration-300 border ${
                showPatternSpace 
                  ? 'bg-system-accent/10 text-system-accent border-system-accent/30' 
                  : 'bg-white text-idm-muted border-black/5 hover:text-idm-ink hover:border-black/10'
              }`}
              title="Toggle Pattern Space"
            >
              <Target size={12} />
              <span className="hidden sm:inline">Space</span>
            </button>
            <button 
              onClick={() => setSongModeEnabled(prev => !prev)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-mono uppercase tracking-wider transition-all duration-300 border ${
                songModeEnabled 
                  ? 'bg-system-accent text-white border-system-accent' 
                  : 'bg-white text-idm-muted border-black/5 hover:text-idm-ink hover:border-black/10'
              }`}
              title="Toggle Song Mode"
            >
              <Layers size={12} />
              <span className="hidden sm:inline">Song</span>
            </button>
          </div>

          <button
            onClick={handleGlobalArmOrRecord}
            className={`w-10 h-10 rounded-full border-2 flex items-center 
              justify-center transition-all duration-300 ${
              globalRecordingState === 'recording'
                ? 'bg-red-500 text-white border-red-600 animate-pulse'
                : globalRecordingState === 'armed'
                ? 'bg-amber-400 text-white border-amber-500 animate-pulse'
                : 'bg-white text-red-400 border-red-300 hover:bg-red-50 hover:border-red-400'
            }`}
            title={
              globalRecordingState === 'recording' ? 'Parar grabación del mix'
              : globalRecordingState === 'armed' ? 'Armado — esperando Play'
              : 'Grabar mix completo'
            }
          >
            {globalRecordingState === 'recording'
              ? <Square size={14} fill="currentColor" />
              : <span className="w-3 h-3 rounded-full bg-red-400 block" />
            }
          </button>

          <button 
            onClick={togglePlay} 
            className={`w-14 h-14 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${isPlaying ? "bg-system-accent text-white border-system-accent shadow-md" : "bg-white text-system-accent border-system-accent hover:bg-system-accent/5"}`}
          >
            {isPlaying ? <Square size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
          </button>
        </div>
      </div>

      <div className="flex flex-col mb-8 gap-6 mt-6">

        {/* Main Control Panel */}
        {(showControls || showVisuals) && (
          <div className="bg-white border border-black/5 rounded-2xl p-6 relative z-20 shadow-sm">
            <div className="flex flex-col gap-6">
              {/* Spectrum Analyzer Integration */}
              {showVisuals && (
                <div className="mb-2 animate-in fade-in slide-in-from-top-4 duration-700">
                  <SpectrumAnalyzer analyser={globalAnalyser} isPlaying={isPlaying} />
                </div>
              )}

              {/* Controls — 2 columns: left=controls, right=FX Globales */}
              {showControls && (
                <div className="grid grid-cols-[1fr,auto] gap-6 animate-in fade-in slide-in-from-top-2 duration-500">
                  {/* LEFT COLUMN — Controls */}
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

                  {/* RIGHT COLUMN — FX Globales toggles + shared param zone */}
                  <div className="flex flex-col gap-3 min-w-[220px] border-l border-black/5 pl-6">
                    <span className="text-[9px] font-mono uppercase tracking-widest text-idm-muted">FX Avanzados</span>
                    {/* Toggle row */}
                    <div className="flex gap-1.5 flex-wrap">
                      {([
                        { id: 'GRV' as const, label: 'GRV', enabled: gatedEnabled, setEnabled: setGatedEnabled, title: 'Gated Reverb' },
                        { id: 'RVR' as const, label: 'RVR', enabled: reverseEnabled, setEnabled: setReverseEnabled, title: 'Reverse Reverb' },
                        { id: 'FRZ' as const, label: 'FRZ', enabled: freezeEnabled, setEnabled: setFreezeEnabled, title: 'Freeze' },
                        { id: 'XFD' as const, label: 'XFD', enabled: crossfeedEnabled, setEnabled: setCrossfeedEnabled, title: 'Crossfeed' },
                        { id: 'SDLY' as const, label: 'SDLY', enabled: spectralDelayEnabled, setEnabled: setSpectralDelayEnabled, title: 'Spectral Delay' },
                      ]).map(fx => (
                        <button
                          key={fx.id}
                          onClick={() => {
                            setActiveFxPanel(activeFxPanel === fx.id ? null : fx.id);
                          }}
                          onDoubleClick={() => {
                            fx.setEnabled(!fx.enabled);
                          }}
                          onMouseEnter={(e) => { if (isStudyMode) { setHoveredGlobalParam(fx.id === 'GRV' ? 'gatedEnabled' : fx.id === 'RVR' ? 'reverseEnabled' : fx.id === 'FRZ' ? 'freezeEnabled' : fx.id === 'XFD' ? 'crossfeedEnabled' : 'spectralDelayEnabled'); setHoveredGlobalEl(e.currentTarget); } }}
                          onMouseLeave={() => { setHoveredGlobalParam(null); setHoveredGlobalEl(null); }}
                          className={`text-[8px] font-mono px-2 py-1 rounded border transition-colors ${
                            activeFxPanel === fx.id
                              ? 'bg-system-accent text-white border-system-accent'
                              : fx.enabled
                                ? 'bg-system-accent/20 text-system-accent border-system-accent/50'
                                : 'bg-background text-idm-muted border-border hover:border-system-accent'
                          }`}
                          title={fx.title}
                        >
                          {fx.label}
                          {fx.enabled && <span className="ml-0.5 inline-block w-1 h-1 rounded-full bg-orange-400 align-middle" />}
                        </button>
                      ))}
                    </div>

                    {/* Shared param zone */}
                    <AnimatePresence mode="wait">
                      {activeFxPanel === 'GRV' && (
                        <motion.div key="grv" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.15 }}
                          className="flex flex-col gap-2 p-3 border border-border rounded-lg bg-background overflow-hidden">
                          <div className="flex items-center justify-between">
                            <span className="text-[8px] font-mono text-idm-muted uppercase">Gated Reverb</span>
                            <button onClick={() => setGatedEnabled(!gatedEnabled)} className={`w-6 h-3 rounded-full transition-colors ${gatedEnabled ? 'bg-orange-400' : 'bg-muted'}`}>
                              <span className={`block w-2.5 h-2.5 rounded-full bg-white shadow transition-transform ${gatedEnabled ? 'translate-x-3' : 'translate-x-0.5'}`} />
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[8px] font-mono text-idm-muted w-6">Thr</span>
                            <input type="range" min={-60} max={-10} step={1} value={gatedThreshold}
                              onChange={e => setGatedThreshold(Number(e.target.value))}
                              className="flex-1 h-1 bg-black/5 appearance-none cursor-pointer accent-system-accent" />
                            <span className="text-[7px] font-mono text-idm-muted w-10 text-right">{gatedThreshold}dB</span>
                          </div>
                        </motion.div>
                      )}
                      {activeFxPanel === 'RVR' && (
                        <motion.div key="rvr" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.15 }}
                          className="flex flex-col gap-2 p-3 border border-border rounded-lg bg-background overflow-hidden">
                          <div className="flex items-center justify-between">
                            <span className="text-[8px] font-mono text-idm-muted uppercase">Reverse Reverb</span>
                            <button onClick={() => setReverseEnabled(!reverseEnabled)} className={`w-6 h-3 rounded-full transition-colors ${reverseEnabled ? 'bg-orange-400' : 'bg-muted'}`}>
                              <span className={`block w-2.5 h-2.5 rounded-full bg-white shadow transition-transform ${reverseEnabled ? 'translate-x-3' : 'translate-x-0.5'}`} />
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[8px] font-mono text-idm-muted w-10">Decay</span>
                            <input type="range" min={0.5} max={4} step={0.1} value={reverseDecay}
                              onChange={e => setReverseDecay(Number(e.target.value))}
                              className="flex-1 h-1 bg-black/5 appearance-none cursor-pointer accent-system-accent" />
                            <span className="text-[7px] font-mono text-idm-muted w-8 text-right">{reverseDecay.toFixed(1)}s</span>
                          </div>
                        </motion.div>
                      )}
                      {activeFxPanel === 'FRZ' && (
                        <motion.div key="frz" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.15 }}
                          className="flex flex-col gap-2 p-3 border border-border rounded-lg bg-background overflow-hidden">
                          <div className="flex items-center justify-between">
                            <span className="text-[8px] font-mono text-idm-muted uppercase">Freeze</span>
                            <button onClick={() => setFreezeEnabled(!freezeEnabled)} className={`w-6 h-3 rounded-full transition-colors ${freezeEnabled ? 'bg-orange-400' : 'bg-muted'}`}>
                              <span className={`block w-2.5 h-2.5 rounded-full bg-white shadow transition-transform ${freezeEnabled ? 'translate-x-3' : 'translate-x-0.5'}`} />
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[8px] font-mono text-idm-muted w-6">FB</span>
                            <input type="range" min={0.5} max={0.99} step={0.01} value={freezeFeedback}
                              onChange={e => setFreezeFeedback(Number(e.target.value))}
                              className="flex-1 h-1 bg-black/5 appearance-none cursor-pointer accent-system-accent" />
                            <span className="text-[7px] font-mono text-idm-muted w-8 text-right">{freezeFeedback.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[8px] font-mono text-idm-muted w-6">LP</span>
                            <input type="range" min={500} max={12000} step={500} value={freezeFilterFreq}
                              onChange={e => setFreezeFilterFreq(Number(e.target.value))}
                              className="flex-1 h-1 bg-black/5 appearance-none cursor-pointer accent-system-accent" />
                            <span className="text-[7px] font-mono text-idm-muted w-10 text-right">{(freezeFilterFreq/1000).toFixed(1)}k</span>
                          </div>
                        </motion.div>
                      )}
                      {activeFxPanel === 'XFD' && (
                        <motion.div key="xfd" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.15 }}
                          className="flex flex-col gap-2 p-3 border border-border rounded-lg bg-background overflow-hidden">
                          <div className="flex items-center justify-between">
                            <span className="text-[8px] font-mono text-idm-muted uppercase">Cloud → Tone</span>
                            <button onClick={() => setCrossfeedEnabled(!crossfeedEnabled)} className={`w-6 h-3 rounded-full transition-colors ${crossfeedEnabled ? 'bg-orange-400' : 'bg-muted'}`}>
                              <span className={`block w-2.5 h-2.5 rounded-full bg-white shadow transition-transform ${crossfeedEnabled ? 'translate-x-3' : 'translate-x-0.5'}`} />
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[8px] font-mono text-idm-muted w-10">Base</span>
                            <input type="range" min={200} max={2000} step={50} value={crossfeedBase}
                              onChange={e => setCrossfeedBase(Number(e.target.value))}
                              className="flex-1 h-1 bg-black/5 appearance-none cursor-pointer accent-system-accent" />
                            <span className="text-[7px] font-mono text-idm-muted w-12 text-right">{crossfeedBase}Hz</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[8px] font-mono text-idm-muted w-10">Depth</span>
                            <input type="range" min={0} max={8000} step={200} value={crossfeedDepth}
                              onChange={e => setCrossfeedDepth(Number(e.target.value))}
                              className="flex-1 h-1 bg-black/5 appearance-none cursor-pointer accent-system-accent" />
                            <span className="text-[7px] font-mono text-idm-muted w-12 text-right">{crossfeedDepth}Hz</span>
                          </div>
                        </motion.div>
                      )}
                      {activeFxPanel === 'SDLY' && (
                        <motion.div key="sdly" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.15 }}
                          className="flex flex-col gap-2 p-3 border border-border rounded-lg bg-background overflow-hidden">
                          <div className="flex items-center justify-between">
                            <span className="text-[8px] font-mono text-idm-muted uppercase">Spectral Delay</span>
                            <button onClick={() => setSpectralDelayEnabled(!spectralDelayEnabled)} className={`w-6 h-3 rounded-full transition-colors ${spectralDelayEnabled ? 'bg-orange-400' : 'bg-muted'}`}>
                              <span className={`block w-2.5 h-2.5 rounded-full bg-white shadow transition-transform ${spectralDelayEnabled ? 'translate-x-3' : 'translate-x-0.5'}`} />
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[8px] font-mono text-idm-muted w-8">Wet</span>
                            <input type="range" min={0} max={1} step={0.05} value={spectralDelayWet}
                              onChange={e => setSpectralDelayWet(Number(e.target.value))}
                              className="flex-1 h-1 bg-black/5 appearance-none cursor-pointer accent-system-accent" />
                            <span className="text-[7px] font-mono text-idm-muted w-8 text-right">{Math.round(spectralDelayWet * 100)}%</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[8px] font-mono text-idm-muted w-8">Lo</span>
                            <input type="range" min={0} max={500} step={10} value={spectralDelayLowTime}
                              onChange={e => setSpectralDelayLowTime(Number(e.target.value))}
                              className="flex-1 h-1 bg-black/5 appearance-none cursor-pointer accent-system-accent" />
                            <span className="text-[7px] font-mono text-idm-muted w-10 text-right">{spectralDelayLowTime}ms</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[8px] font-mono text-idm-muted w-8">Mid</span>
                            <input type="range" min={0} max={500} step={10} value={spectralDelayMidTime}
                              onChange={e => setSpectralDelayMidTime(Number(e.target.value))}
                              className="flex-1 h-1 bg-black/5 appearance-none cursor-pointer accent-system-accent" />
                            <span className="text-[7px] font-mono text-idm-muted w-10 text-right">{spectralDelayMidTime}ms</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[8px] font-mono text-idm-muted w-8">Hi</span>
                            <input type="range" min={0} max={500} step={10} value={spectralDelayHighTime}
                              onChange={e => setSpectralDelayHighTime(Number(e.target.value))}
                              className="flex-1 h-1 bg-black/5 appearance-none cursor-pointer accent-system-accent" />
                            <span className="text-[7px] font-mono text-idm-muted w-10 text-right">{spectralDelayHighTime}ms</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {showVisuals && (
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
              )}
            </div>
          </div>
        )}
      </div>

      {/* Pattern Synchrony & Phase Radar */}
      {showSync && (
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
      )}

      {/* Library Panel */}
      {showLibrary && (
        <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2 duration-500">
          <div className="md:col-span-1 bg-white border border-black/5 rounded-2xl p-4 shadow-sm max-h-[450px] overflow-y-auto custom-scrollbar">
            <h2 className="text-[10px] font-mono uppercase tracking-[0.3em] text-system-accent mb-4 flex items-center gap-2 sticky top-0 bg-white/90 py-2 z-10">
              <Disc size={12} />
              Librería EPL
            </h2>
            
            <div className="space-y-6">
              {/* Master Scenes Section */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-px flex-1 bg-system-accent/10"></div>
                  <span className="text-[8px] font-mono text-system-accent/60 uppercase tracking-widest">Escenas Maestras</span>
                  <div className="h-px flex-1 bg-system-accent/10"></div>
                </div>
                <div className="flex flex-col gap-1">
                  {PRESETS.filter(p => p.type === 'master').map(preset => (
                    <button
                      key={preset.id}
                      onClick={() => applyPreset(preset)}
                      onMouseEnter={() => setHoveredPreset(preset)}
                      onMouseLeave={() => setHoveredPreset(null)}
                      className="text-left px-3 py-2 rounded-lg text-[10px] font-mono border border-transparent hover:border-system-accent/20 hover:bg-system-accent/5 transition-all group flex justify-between items-center"
                    >
                      <div className="flex flex-col">
                        <span className="text-idm-ink group-hover:text-system-accent font-bold">{preset.name}</span>
                        <span className="text-[8px] text-idm-muted">{preset.bpm} BPM</span>
                      </div>
                      <Zap size={10} className="opacity-0 group-hover:opacity-100 text-system-accent transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Atomic Patterns Section */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-px flex-1 bg-black/5"></div>
                  <span className="text-[8px] font-mono text-idm-muted uppercase tracking-widest">Patrones Atómicos</span>
                  <div className="h-px flex-1 bg-black/5"></div>
                </div>
                <div className="flex flex-col gap-2">
                  {PRESETS.filter(p => p.type === 'atomic').map(preset => (
                    <div 
                      key={preset.id}
                      onMouseEnter={() => setHoveredPreset(preset)}
                      onMouseLeave={() => setHoveredPreset(null)}
                      className="flex flex-col gap-2 p-2 rounded-xl border border-transparent hover:border-black/5 hover:bg-black/5 transition-all"
                    >
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] font-mono text-idm-ink font-bold">{preset.name}</span>
                        <span className="text-[8px] font-mono text-system-accent/50">E({preset.config?.pulses}, {preset.config?.steps})</span>
                      </div>
                      <div className="flex gap-1">
                        {[
                          { id: 'kick', label: 'K' },
                          { id: 'snare', label: 'S' },
                          { id: 'hat', label: 'H' }
                        ].map(track => (
                          <button
                            key={track.id}
                            onClick={() => injectPattern(track.id, preset.config!)}
                            className="flex-1 py-1 rounded-md bg-black/5 hover:bg-system-accent hover:text-white text-[9px] font-mono font-bold text-idm-muted border border-black/5 transition-all uppercase"
                            title={`Inyectar en ${track.id}`}
                          >
                            {track.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* User Presets Section */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-px flex-1 bg-system-accent/10"></div>
                  <span className="text-[8px] font-mono text-system-accent/60 uppercase tracking-widest">Mis Presets</span>
                  <div className="h-px flex-1 bg-system-accent/10"></div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-1 mb-2">
                  <button
                    onClick={() => { setIsSavingPreset(true); setImportError(null); }}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md border border-dashed border-system-accent/30 text-system-accent text-[9px] font-mono hover:bg-system-accent/5 transition-all"
                  >
                    <Save size={10} /> Save
                  </button>
                  <button
                    onClick={handleExportCurrent}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md border border-dashed border-system-accent/30 text-system-accent text-[9px] font-mono hover:bg-system-accent/5 transition-all"
                  >
                    <Download size={10} /> Export
                  </button>
                  <button
                    onClick={() => importInputRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md border border-dashed border-system-accent/30 text-system-accent text-[9px] font-mono hover:bg-system-accent/5 transition-all"
                  >
                    <Upload size={10} /> Import
                  </button>
                  <input
                    ref={importInputRef}
                    type="file"
                    accept=".json,application/json"
                    style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden', opacity: 0 }}
                    onChange={handleImportPreset}
                  />
                </div>

                {/* Save inline input */}
                {isSavingPreset && (
                  <div className="flex gap-1 items-center mb-2 animate-in fade-in duration-200">
                    <input
                      autoFocus
                      value={newPresetName}
                      onChange={e => setNewPresetName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveUserPreset(); if (e.key === 'Escape') setIsSavingPreset(false); }}
                      placeholder="Mi preset..."
                      className="flex-1 bg-transparent border-b border-system-accent/30 text-[10px] font-mono text-idm-ink py-1 px-1 outline-none focus:border-system-accent placeholder:text-idm-muted/50"
                    />
                    <button onClick={handleSaveUserPreset} className="text-system-accent hover:text-system-accent/80 p-1">
                      <Save size={12} />
                    </button>
                    <button onClick={() => setIsSavingPreset(false)} className="text-idm-muted hover:text-idm-ink p-1">
                      <X size={12} />
                    </button>
                  </div>
                )}

                {/* Import error */}
                {importError && (
                  <div className="text-[9px] font-mono text-red-500 mb-2 animate-in fade-in duration-200">
                    {importError}
                  </div>
                )}

                {/* User preset list */}
                <div className="flex flex-col gap-1">
                  {userPresets.length === 0 && !isSavingPreset ? (
                    <p className="text-idm-muted text-[9px] font-mono text-center py-3">Guarda tu primera configuración</p>
                  ) : (
                    userPresets.map(up => (
                      <button
                        key={up.id}
                        onClick={() => applyUserPreset(up)}
                        onMouseEnter={() => setHoveredPreset(userPresetToScenePreset(up))}
                        onMouseLeave={() => setHoveredPreset(null)}
                        className="text-left px-3 py-2 rounded-lg text-[10px] font-mono border border-transparent hover:border-black/10 hover:bg-black/[0.03] transition-all group flex justify-between items-center"
                      >
                        <div className="flex flex-col">
                          <span className="text-idm-ink group-hover:text-idm-ink font-bold">{up.name}</span>
                          <span className="text-[8px] text-idm-muted">{up.bpm} BPM · {new Date(up.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span
                            role="button"
                            onClick={e => { e.stopPropagation(); exportPresetAsJson(up); }}
                            className="p-1 text-idm-muted hover:text-system-accent"
                          >
                            <Download size={10} />
                          </span>
                          <span
                            role="button"
                            onClick={e => { e.stopPropagation(); handleDeleteUserPreset(up.id); }}
                            className="p-1 text-idm-muted hover:text-red-500"
                          >
                            <Trash2 size={10} />
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-3 bg-white border border-black/5 rounded-2xl p-8 flex flex-col justify-center relative overflow-hidden shadow-sm">
            {hoveredPreset ? (
              <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-2 h-2 rounded-full ${hoveredPreset.type === 'master' ? 'bg-system-accent shadow-[0_0_10px_rgba(249,115,22,0.3)]' : 'bg-idm-muted'}`}></div>
                  <h3 className="text-system-accent font-mono font-bold text-2xl uppercase tracking-tighter">{hoveredPreset.name}</h3>
                  <span className={`px-3 py-1 rounded-full text-[9px] font-mono uppercase tracking-widest border ${hoveredPreset.type === 'master' ? 'bg-system-accent/5 border-system-accent/20 text-system-accent' : 'bg-idm-bg border-black/5 text-idm-muted'}`}>
                    {hoveredPreset.type === 'master' ? 'Escena Maestra' : 'Patrón Atómico'}
                  </span>
                </div>
                
                <div className="max-w-xl">
                  <p className="text-idm-ink/70 font-mono text-xs uppercase leading-relaxed mb-8 border-l-2 border-system-accent/30 pl-4">
                    {hoveredPreset.description}
                  </p>
                  
                  <div className="grid grid-cols-3 gap-8">
                    {hoveredPreset.type === 'master' ? (
                      <>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-mono text-idm-muted uppercase tracking-widest mb-2">Configuración Global</span>
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-mono">
                              <span className="text-idm-muted">TEMPO</span>
                              <span className="text-system-accent">{hoveredPreset.bpm} BPM</span>
                            </div>
                            <div className="flex justify-between text-[10px] font-mono">
                              <span className="text-idm-muted">JITTER</span>
                              <span className="text-system-accent">{hoveredPreset.jitter}ms</span>
                            </div>
                            <div className="flex justify-between text-[10px] font-mono">
                              <span className="text-idm-muted">SWING</span>
                              <span className="text-system-accent">{hoveredPreset.swing}%</span>
                            </div>
                          </div>
                        </div>
                        <div className="col-span-2 flex flex-col">
                          <span className="text-[9px] font-mono text-idm-muted uppercase tracking-widest mb-2">Geometría de Pistas</span>
                          <div className="grid grid-cols-3 gap-4">
                            {Object.entries(hoveredPreset.tracks || {}).map(([id, config]) => {
                              const trackConfig = config as TrackPreset;
                              return (
                                <div key={id} className="bg-black/5 p-2 rounded border border-black/5">
                                  <div className="text-[8px] text-idm-muted uppercase mb-1">{id}</div>
                                  <div className="text-xs font-mono text-system-accent">E({trackConfig.pulses}, {trackConfig.steps})</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-mono text-idm-muted uppercase tracking-widest mb-2">Fórmula Bjorklund</span>
                          <div className="text-2xl font-mono text-system-accent tracking-tighter">
                            E({hoveredPreset.config?.pulses}, {hoveredPreset.config?.steps})
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-mono text-idm-muted uppercase tracking-widest mb-2">Densidad</span>
                          <div className="text-2xl font-mono text-system-accent tracking-tighter">
                            {Math.round((hoveredPreset.config?.pulses! / hoveredPreset.config?.steps!) * 100)}%
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-mono text-idm-muted uppercase tracking-widest mb-2">Offset</span>
                          <div className="text-2xl font-mono text-system-accent tracking-tighter">
                            {hoveredPreset.config?.offset}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center opacity-10">
                <Atom size={48} className="mb-4 text-system-accent animate-spin-slow" />
                <p className="text-xs font-mono uppercase tracking-[0.4em] leading-loose">
                  Surgical Read-Only Mode<br/>
                  <span className="text-[10px] opacity-60">Selecciona un preset para previsualizar su topografía</span>
                </p>
              </div>
            )}
            
            {/* Ghost Preview Active Indicator */}
            {hoveredPreset && (
              <div className="absolute top-6 right-6 flex items-center gap-2 text-[9px] font-mono text-system-accent/80 animate-pulse">
                <Zap size={12} />
                GHOST PREVIEW ACTIVE
              </div>
            )}
          </div>
        </div>
      )}

      {/* Engine Room Panel */}
      {showEngine && (
        <EngineRoom
          tracks={tracks}
          uiStats={uiStats}
          log={engineLog}
          onClearLog={() => { engineLogRef.current = []; setEngineLog([]); }}
          activePresetId={activePresetId}
          bpm={bpm}
          temporalityMode={temporalityMode}
          jitter={jitter}
          swing={swing}
          hitRate={(() => {
            const stats = Object.entries(uiStats).filter(([id]) => id !== 'cloud');
            const totalHits = stats.reduce((sum, [, s]) => sum + s.hits, 0);
            const totalMisses = stats.reduce((sum, [, s]) => sum + s.misses, 0);
            const total = totalHits + totalMisses;
            return total > 0 ? Math.round((totalHits / total) * 100) : null;
          })()}
          mmHistoryLength={mmHistory.length}
          mmLastRatio={mmHistory.length > 0 ? mmHistory[0].label : undefined}
          mmOriginalBpm={mmHistory.length > 0 ? mmHistory[mmHistory.length - 1].fromBpm : undefined}
        />
      )}

      {/* Pattern Space */}
      {showPatternSpace && (
        <PatternSpace
          presets={PRESETS}
          userPresets={userPresets}
          currentPattern={rotate(bjorklund(tracks[0].pulses, tracks[0].steps), tracks[0].offset)}
          currentSteps={tracks[0].steps}
          onSelectPreset={applyPreset}
          onSelectUserPreset={applyUserPreset}
        />
      )}

      {/* ═══ TRACKS ═══ */}
      <div className="space-y-6 relative z-10">
        <MesoInsightMonitor tracks={tracks} isStudyMode={isStudyMode} />
        {tracks.map((track, i) => (
          <div key={track.id} className="transition-all duration-500 opacity-100">
            <EuclideanTrack
              {...track}
              trackId={track.id}
              stats={uiStats[track.id] || { hits: 0, misses: 0, cycleCount: 0 }}
              synth={synthsRef.current[track.id]}
              jitter={jitter}
              globalStep={globalStep}
              mcm={mcm}
              syncImpact={syncImpacts[i]}
              lastHit={lastHit?.color === track.color ? lastHit : null}
              isDjMode={isDjMode}
              previewPattern={previewPatterns?.[track.id]}
              onParamChange={handleParamChange}
              onSequencerAction={handleSequencerAction}
              onTonalAction={handleTonalAction}
              onSlicerAction={handleSlicerAction}
              onFileUpload={handleFileUploadCb}
              onSamplerParamChange={handleSamplerParamChange}
              onClearSampler={handleClearSamplerCb}
              onLoadLayer2={handleLoadLayer2Cb}
              onClearLayer2={handleClearLayer2Cb}
              onLayer2ParamChange={handleLayer2ParamChange}
              onPercSynthParamChange={handlePercSynthParamChange}
              toneRecordingState={toneRecordingState}
              onRecordAction={handleArmOrRecord}
              cloudRecordingState={cloudRecordingState}
              onCloudRecordAction={handleCloudArmOrRecord}
              isStudyMode={isStudyMode}
              studyVoice={studyVoice}
              anySoloed={tracks.some(t => t.isSoloed)}
              temporalityMode={temporalityMode}
              bpm={bpm}
              swing={swing}
              onGetMarkovMatrix={handleGetMarkovMatrix}
              isExpanded={expandedTrack === track.id}
              onToggleExpand={() => handleToggleTrack(track.id)}
            />
          </div>
        ))}
      </div>

      {/* ═══ SONG MODE CHAIN PANEL ═══ */}
      {songModeEnabled && (
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
            <span className="text-[8px]">Lógica de reproducción → fase posterior</span>
          </div>
        </div>
      )}





      {/* ═══ FOOTER ═══ */}
      <div className="mt-8 pt-4 border-t border-idm-muted/30 flex justify-between items-center text-[10px] font-mono text-idm-ink/40 uppercase tracking-widest">
        <div className="flex gap-4">
          <span>KICK: Membrane</span>
          <span>SNARE: Noise</span>
          <span>HAT: Metal</span>
          <span>TONE: {tracks.find(t => t.id === 'tone')?.synthType?.toUpperCase() || 'MONO'}</span>
        </div>
        <div>{isPlaying ? "Engine: Running" : "Engine: Idle"}</div>
      </div>
      <ThesisDrawer isOpen={isThesisOpen} onClose={() => setIsThesisOpen(false)} />
      {/* Global StudyTooltip Portal */}
      {(() => {
        const pos = (() => {
          if (!hoveredGlobalParam || !hoveredGlobalEl) return { top: 0, left: 0, flip: false };
          const rect = hoveredGlobalEl.getBoundingClientRect();
          const spaceAbove = rect.top;
          const flip = spaceAbove < 120;
          return {
            top: flip ? rect.bottom + 8 : rect.top - 8,
            left: Math.min(Math.max(rect.left + rect.width / 2, 144), window.innerWidth - 144),
            flip
          };
        })();
        return createPortal(
          <AnimatePresence>
            {isStudyMode && hoveredGlobalParam && hoveredGlobalEl && (
              <motion.div
                key={hoveredGlobalParam}
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
                  {getMicroText(hoveredGlobalParam, studyVoice)}
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
      })()}
    </div>
  );
};
