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
import { SCALES, SCALE_NAMES, noteIndexToMidi, midiToNoteName, getMaxNoteIndex } from '../../utils/scales';
import { buildWavefoldCurve, vactrolfiltFreq } from '../../utils/waveshaping';
import { generateMarkovMatrix, markovNextNote, type MarkovStyle } from '../../utils/markovGenerator';

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
  mode: 'GATE' | 'TRIGGER';
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
  hits: number;
  misses: number;
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
  const [showVisuals, setShowVisuals] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [showSync, setShowSync] = useState(true);
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
      hits: 0, misses: 0
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
      hits: 0, misses: 0
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
      hits: 0, misses: 0
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
      hits: 0, misses: 0
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
      hits: 0, misses: 0
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

        // Tonal fields
        if (config.rootNote !== undefined) newTrack.rootNote = config.rootNote;
        if (config.scaleId !== undefined) newTrack.scaleId = config.scaleId;
        if (config.octaveRange !== undefined) newTrack.octaveRange = config.octaveRange;
        if (config.noteIndices !== undefined) newTrack.noteIndices = [...config.noteIndices];
        
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
        hits: 0,
        misses: 0,
      });
    }));
  }, [logChange, updateTrackPattern]);

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
    reverbBus.chain(reverb, reverbFilter, compressor);

    compressor.chain(limiter, analyser, Tone.getDestination());
    masterBusRef.current = { compressor, limiter, analyser, delay, reverb, delayFilter, reverbFilter, delayBus, reverbBus };
    setGlobalAnalyser(analyser);

    // Sidechain Setup (Kick -> Cloud)
    const kickFollower = new Tone.Follower(0.1);
    const sidechainInverter = new Tone.Gain(-0.8); // Pump amount
    const sidechainBias = new Tone.Signal(1);
    
    // Filters for dynamic timbre
    const kickDelaySend = new Tone.Gain(0).connect(delayBus);
    const kickReverbSend = new Tone.Gain(0).connect(reverbBus);
    const kickFilter = new Tone.Filter(2000, "lowpass").connect(compressor);
    kickFilter.connect(kickDelaySend);
    kickFilter.connect(kickReverbSend);

    kickFilter.connect(kickFollower); // Send kick to follower
    kickFollower.connect(sidechainInverter);

    const snareDelaySend = new Tone.Gain(0).connect(delayBus);
    const snareReverbSend = new Tone.Gain(0).connect(reverbBus);
    const snareFilter = new Tone.Filter(5000, "lowpass").connect(compressor);
    snareFilter.connect(snareDelaySend);
    snareFilter.connect(snareReverbSend);

    const hatDelaySend = new Tone.Gain(0).connect(delayBus);
    const hatReverbSend = new Tone.Gain(0).connect(reverbBus);
    const hatFilter = new Tone.Filter(5000, "highpass").connect(compressor);
    hatFilter.connect(hatDelaySend);
    hatFilter.connect(hatReverbSend);

    // Layered Kick
    const kickBody = new Tone.MembraneSynth({
      pitchDecay: 0.05, octaves: 10, oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 },
      volume: -2
    }).connect(kickFilter);

    const kickClick = new Tone.NoiseSynth({
      noise: { type: 'pink' },
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
        kickDelaySend.dispose();
        kickReverbSend.dispose();
      }
    };

    const snareSynth = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.2, sustain: 0 },
      volume: -4
    }).connect(snareFilter);

    synthsRef.current.snare = {
      triggerAttackRelease: (duration: string, time: number, velocity: number) => {
        snareSynth.triggerAttackRelease(duration, time, velocity);
        const baseCutoff = 1500;
        const dynamicCutoff = baseCutoff + (velocity * 5000);
        if (isFinite(dynamicCutoff)) {
          snareFilter.frequency.rampTo(dynamicCutoff, 0.02, time);
        }
      },
      setVolume: (vol: number) => {
        snareSynth.volume.rampTo(Tone.gainToDb(vol) - 4, 0.05);
      },
      setSends: (delayVal: number, reverbVal: number) => {
        snareDelaySend.gain.rampTo(delayVal, 0.05);
        snareReverbSend.gain.rampTo(reverbVal, 0.05);
      },
      dispose: () => {
        snareSynth.dispose();
        snareFilter.dispose();
        snareDelaySend.dispose();
        snareReverbSend.dispose();
      }
    };

    const hatSynth = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.05, sustain: 0 },
      volume: -2
    }).connect(hatFilter);

    synthsRef.current.hat = {
      triggerAttackRelease: (duration: string, time: number, velocity: number) => {
        hatSynth.triggerAttackRelease(duration, time, velocity);
        // Dynamic Timbre: Brighter = Higher Highpass Cutoff
        const baseCutoff = 2000;
        const dynamicCutoff = baseCutoff + (velocity * 8000);
        if (isFinite(dynamicCutoff)) {
          hatFilter.frequency.rampTo(dynamicCutoff, 0.02, time);
        }
      },
      setVolume: (vol: number) => {
        hatSynth.volume.rampTo(Tone.gainToDb(vol) - 2, 0.05);
      },
      setSends: (delayVal: number, reverbVal: number) => {
        hatDelaySend.gain.rampTo(delayVal, 0.05);
        hatReverbSend.gain.rampTo(reverbVal, 0.05);
      },
      dispose: () => {
        hatSynth.dispose();
        hatFilter.dispose();
        hatDelaySend.dispose();
        hatReverbSend.dispose();
      }
    };

    // Cloud Engine Setup
    const cloudDelaySend = new Tone.Gain(0).connect(delayBus);
    const cloudReverbSend = new Tone.Gain(0).connect(reverbBus);
    const cloudFilter = new Tone.Filter(1000, "lowpass").connect(compressor);
    cloudFilter.connect(cloudDelaySend);
    cloudFilter.connect(cloudReverbSend);

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
        cloudDelaySend.dispose();
        cloudReverbSend.dispose();
      }
    };

    // Connect sidechain math to ducker gain
    sidechainInverter.connect(cloudDucker.gain);
    sidechainBias.connect(cloudDucker.gain);

    // Tone Synth Setup (MonoSynth)
    const toneDelaySend = new Tone.Gain(0.15).connect(delayBus);
    const toneReverbSend = new Tone.Gain(0.2).connect(reverbBus);
    const toneFilter = new Tone.Filter(2000, "lowpass").connect(compressor);
    toneFilter.connect(toneDelaySend);
    toneFilter.connect(toneReverbSend);
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
        toneDelaySend.dispose();
        toneReverbSend.dispose();
      }
    };

    synthsRef.current.kickFollower = kickFollower;

    return () => {
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

            let scheduledTime = Math.max(baseTime + offset, now + 0.02);
            const lastTime = lastScheduledTimesRef.current[track.id] || 0;
            if (scheduledTime <= lastTime) scheduledTime = lastTime + 0.005;
            lastScheduledTimesRef.current[track.id] = scheduledTime;

            // Unified trigger logic: use triggerAttackRelease if available
            if (synth.triggerAttackRelease) {
              const duration = track.mode === 'GATE' ? "16n" : (track.decay / 1000);
              
              if (track.isTonal) {
                // Tonal track: compute note from scale + noteIndex
                let noteIdx: number;
                if ((track.noteMode ?? 'euclidean') === 'markov') {
                  // MARKOV: elegir nota por transición probabilística
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
                  // RR activo: rotación secuencial por noteIndices
                  const rrIdx = rrNoteIndexRef.current[track.id] ?? 0;
                  noteIdx = track.noteIndices[rrIdx % track.noteIndices.length];
                  rrNoteIndexRef.current[track.id] = (rrIdx + 1) % track.noteIndices.length;
                } else {
                  // Euclidean: determinista por step
                  noteIdx = track.noteIndices[idx] ?? 0;
                }
                const scaleIntervals = SCALES[track.scaleId] || SCALES.phrygianDominant;
                const midi = noteIndexToMidi(track.rootNote, scaleIntervals, noteIdx);
                const noteName = midiToNoteName(midi);
                synth.triggerAttackRelease(noteName, duration, scheduledTime, velocity);
              } else if (track.id === 'kick' && !synth.grainPlayer) {
                synth.triggerAttackRelease("C1", duration, scheduledTime, velocity);
              } else {
                synth.triggerAttackRelease(duration, scheduledTime, velocity);
              }
            } else if (synth.grainPlayer && track.samplerStatus === 'READY') {
              // Fallback for cloud or if triggerAttackRelease is missing
              const sprayAmount = (track.spray / 1000) * (track.chaosEnabled ? track.entropy : 1);
              const startOffset = track.sampleStart * (track.samplerBuffer?.duration || 0);
              const randomOffset = (Math.random() - 0.5) * sprayAmount;
              const finalOffset = Math.max(0, Math.min(track.samplerBuffer?.duration || 0, startOffset + randomOffset));
              const duration = track.mode === 'GATE' ? "16n" : (track.decay / 1000);
              synth.grainPlayer.start(scheduledTime, finalOffset, duration);
            }

            // Layer 2: disparar si existe y hay buffer cargado
            if (synth.triggerLayer2 && synth.layer2Buffer) {
              synth.triggerLayer2(scheduledTime, velocity);
            }

            // Ratchet: schedule additional retrigggers within the sixteenth
            const ratchetCount = track.ratchet || 0;
            if (ratchetCount > 0) {
              const subdivDuration = sixteenthDuration / (ratchetCount + 1);
              for (let r = 1; r <= ratchetCount; r++) {
                const ratchetTime = scheduledTime + subdivDuration * r;
                const ratchetVelocity = velocity * Math.pow(0.65, r);
                try {
                  if (synth.triggerAttackRelease) {
                    const dur = track.mode === 'GATE' ? "32n" : (track.decay / 2000);
                    if (track.isTonal) {
                      const noteIdx = track.noteIndices[idx] ?? 0;
                      const scaleIntervals = SCALES[track.scaleId] || SCALES.phrygianDominant;
                      const midi = noteIndexToMidi(track.rootNote, scaleIntervals, noteIdx);
                      const noteName = midiToNoteName(midi);
                      synth.triggerAttackRelease(noteName, dur, ratchetTime, ratchetVelocity);
                    } else if (track.id === 'kick' && !synth.grainPlayer) {
                      synth.triggerAttackRelease("C1", dur, ratchetTime, ratchetVelocity);
                    } else {
                      synth.triggerAttackRelease(dur, ratchetTime, ratchetVelocity);
                    }
                  } else if (synth.grainPlayer && track.samplerStatus === 'READY') {
                    const sprayAmount = (track.spray / 1000) * (track.chaosEnabled ? track.entropy : 1);
                    const startOffset = track.sampleStart * (track.samplerBuffer?.duration || 0);
                    const randomOffset = (Math.random() - 0.5) * sprayAmount;
                    const finalOffset = Math.max(0, Math.min(track.samplerBuffer?.duration || 0, startOffset + randomOffset));
                    const dur = track.mode === 'GATE' ? "32n" : (track.decay / 2000);
                    synth.grainPlayer.start(ratchetTime, finalOffset, dur);
                  }
                } catch (e) { /* silent */ }
              }
              // Collision guard: update last scheduled time to the final ratchet
              lastScheduledTimesRef.current[track.id] = scheduledTime + subdivDuration * ratchetCount;
            }

            Tone.Draw.schedule(() => {
              setLastHit({ offset, color: track.color, velocity, id: Math.random() });
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
      driftAccumulatorRef.current = {};
      setDriftOffsets({});
      caStateRef.current = {};
      caEvolveCycleRef.current = {};
      pendingCARef.current = {};
    } else {
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

      // Create BitCrusher for this track
      const bitCrusher = new Tone.BitCrusher(16).connect(
        trackId === 'cloud' ? synthsRef.current.cloud.ducker : master.compressor
      );
      bitCrusher.connect(delaySend);
      bitCrusher.connect(reverbSend);

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

      synthObj.triggerAttackRelease = (duration: any, time: number, velocity: number) => {
        const currentTrack = tracksRef.current.find(t => t.id === trackId);
        if (!currentTrack || !grainPlayer.buffer) return;
        
        // If it's a Tone.Buffer, check if it's loaded. If it's a raw AudioBuffer, it's always "loaded"
        if (grainPlayer.buffer instanceof Tone.ToneAudioBuffer && !grainPlayer.buffer.loaded) {
          console.warn(`[Sampler] Buffer for ${trackId} not yet loaded`);
          return;
        }

        // Apply sampler params
        grainPlayer.grainSize = currentTrack.grainSize / 1000;
        grainPlayer.overlap = currentTrack.overlap;
        grainPlayer.detune = currentTrack.pitch * 100 + (velocity - 0.8) * 100;
        
        const sprayAmount = (currentTrack.spray / 1000) * (currentTrack.chaosEnabled ? currentTrack.entropy : 1);
        const startOffset = currentTrack.sampleStart * audioBuffer.duration;
        const randomOffset = (Math.random() - 0.5) * sprayAmount;
        const finalOffset = Math.max(0, Math.min(audioBuffer.duration, startOffset + randomOffset));
        
        const durSeconds = typeof duration === 'string' ? Tone.Time(duration).toSeconds() : duration;

        if (trackId !== 'cloud') {
          try {
            const startOffsetSec = Math.max(0, Math.min(audioBuffer.duration - 0.01, finalOffset));
            // If duration is too short, use a minimum or just play until end
            const durationSec = Math.max(0.1, durSeconds);
            
            console.log(`[Sampler] Triggering ${trackId} | time: ${time.toFixed(3)} | offset: ${startOffsetSec.toFixed(3)} | dur: ${durationSec.toFixed(3)} | vol: ${grainPlayer.volume.value.toFixed(1)}dB | state: ${Tone.getContext().state}`);
            
            // Ensure volume is not muted
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
      
      // Update initial sends and volume
      const track = tracksRef.current.find(t => t.id === trackId);
      if (track) {
        synthObj.setVolume(track.volume);
        synthObj.setSends(track.delaySend, track.reverbSend);
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
          case 'sampleStart': synthObj.grainPlayer.loopStart = val * synthObj.grainPlayer.buffer.duration; break;
          case 'sampleEnd': synthObj.grainPlayer.loopEnd = val * synthObj.grainPlayer.buffer.duration; break;
          case 'attack': synthObj.grainPlayer.fadeIn = val / 1000; break;
          case 'decay': synthObj.grainPlayer.fadeOut = val / 1000; break;
        }
      }
      if (synthObj.bitCrusher && param === 'bitCrush') {
        synthObj.bitCrusher.bits.value = val;
      }
    }
  }, []);

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
        layer2Player.detune = (ct.layer2Pitch ?? 0) * 100;
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
    if (trackId === 'kick') {
      const kickDelaySend = new Tone.Gain(0).connect(master.delayBus);
      const kickReverbSend = new Tone.Gain(0).connect(master.reverbBus);
      const kickFilter = new Tone.Filter(2000, "lowpass").connect(master.compressor);
      kickFilter.connect(kickDelaySend);
      kickFilter.connect(kickReverbSend);
      if (synthsRef.current.kickFollower) kickFilter.connect(synthsRef.current.kickFollower);

      const kickBody = new Tone.MembraneSynth({
        pitchDecay: 0.05, octaves: 10, oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 },
        volume: -2
      }).connect(kickFilter);

      const kickClick = new Tone.NoiseSynth({
        noise: { type: 'pink' },
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
          kickBody.dispose();
          kickClick.dispose();
          kickFilter.dispose();
          kickDelaySend.dispose();
          kickReverbSend.dispose();
        }
      };
    } else if (trackId === 'snare') {
      const snareDelaySend = new Tone.Gain(0).connect(master.delayBus);
      const snareReverbSend = new Tone.Gain(0).connect(master.reverbBus);
      const snareFilter = new Tone.Filter(5000, "lowpass").connect(master.compressor);
      snareFilter.connect(snareDelaySend);
      snareFilter.connect(snareReverbSend);

      const snareSynth = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.2, sustain: 0 },
        volume: -4
      }).connect(snareFilter);

      synthsRef.current.snare = {
        triggerAttackRelease: (duration: any, time: number, velocity: number) => {
          snareSynth.triggerAttackRelease(duration, time, velocity);
          const baseCutoff = 1500;
          const dynamicCutoff = baseCutoff + (velocity * 5000);
          if (isFinite(dynamicCutoff)) {
            snareFilter.frequency.rampTo(dynamicCutoff, 0.02, time);
          }
        },
        setVolume: (vol: number) => {
          snareSynth.volume.rampTo(Tone.gainToDb(vol) - 4, 0.05);
        },
        setSends: (delayVal: number, reverbVal: number) => {
          snareDelaySend.gain.rampTo(delayVal, 0.05);
          snareReverbSend.gain.rampTo(reverbVal, 0.05);
        },
        dispose: () => {
          snareSynth.dispose();
          snareFilter.dispose();
          snareDelaySend.dispose();
          snareReverbSend.dispose();
        }
      };
    } else if (trackId === 'hat') {
      const hatDelaySend = new Tone.Gain(0).connect(master.delayBus);
      const hatReverbSend = new Tone.Gain(0).connect(master.reverbBus);
      const hatFilter = new Tone.Filter(5000, "highpass").connect(master.compressor);
      hatFilter.connect(hatDelaySend);
      hatFilter.connect(hatReverbSend);

      const hatSynth = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.05, sustain: 0 },
        volume: -2
      }).connect(hatFilter);

      synthsRef.current.hat = {
        triggerAttackRelease: (duration: any, time: number, velocity: number) => {
          hatSynth.triggerAttackRelease(duration, time, velocity);
          const baseCutoff = 2000;
          const dynamicCutoff = baseCutoff + (velocity * 8000);
          if (isFinite(dynamicCutoff)) {
            hatFilter.frequency.rampTo(dynamicCutoff, 0.02, time);
          }
        },
        setVolume: (vol: number) => {
          hatSynth.volume.rampTo(Tone.gainToDb(vol) - 2, 0.05);
        },
        setSends: (delayVal: number, reverbVal: number) => {
          hatDelaySend.gain.rampTo(delayVal, 0.05);
          hatReverbSend.gain.rampTo(reverbVal, 0.05);
        },
        dispose: () => {
          hatSynth.dispose();
          hatFilter.dispose();
          hatDelaySend.dispose();
          hatReverbSend.dispose();
        }
      };
    } else if (trackId === 'tone') {
      // Si hay grabación activa, pararla antes de rebuild
      if (toneRecordingState === 'recording' && mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
        setToneRecordingState('idle');
      }

      const toneDelaySend = new Tone.Gain(0.15).connect(master.delayBus);
      const toneReverbSend = new Tone.Gain(0.2).connect(master.reverbBus);
      const toneFilter = new Tone.Filter(2000, "lowpass").connect(master.compressor);
      toneFilter.connect(toneDelaySend);
      toneFilter.connect(toneReverbSend);
      toneFilterRef.current = toneFilter;

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
          const scaleIntervals = SCALES[currentTrack.scaleId] || SCALES.phrygianDominant;
          for (let i = 0; i < NUM_LOOPS; i++) {
            const noteIdx = currentTrack.noteIndices[
              Math.floor(Math.random() * currentTrack.noteIndices.length)
            ];
            const midi = noteIndexToMidi(currentTrack.rootNote, scaleIntervals, noteIdx);
            ambientOscs[i].frequency.value = Tone.Frequency(midi, 'midi').toFrequency();
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
    // Apply current volume and sends
    const track = tracksRef.current.find(t => t.id === trackId);
    if (track && synthsRef.current[trackId]) {
      synthsRef.current[trackId].setVolume(track.volume);
      synthsRef.current[trackId].setSends(track.delaySend, track.reverbSend);
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
        // Spray is handled in the trigger logic for rhythmic tracks, 
        // but for cloud we can apply it to the loop if needed.
        // Actually Tone.GrainPlayer doesn't have a direct 'spray' property that works like we want in loop mode easily without manual offset jumps.
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

              {/* Temporality Mode Selector */}
              {showControls && (
                <div className="flex gap-1.5 animate-in fade-in slide-in-from-top-2 duration-500">
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
              )}

              {/* Top Row: Core Parameters */}
              {showControls && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 animate-in fade-in slide-in-from-top-2 duration-500">
                  <div className="flex flex-col gap-2 transition-all duration-500 opacity-100 scale-100">
                    <div className={`flex justify-between text-[10px] font-mono uppercase text-idm-muted ${isStudyMode ? 'cursor-help' : ''}`}
                      onMouseEnter={(e) => { if (isStudyMode) { setHoveredGlobalParam('bpm'); setHoveredGlobalEl(e.currentTarget); } }}
                      onMouseLeave={() => { setHoveredGlobalParam(null); setHoveredGlobalEl(null); }}>
                      <span>Tempo</span>
                      <span className="text-idm-ink">{bpm} BPM</span>
                    </div>
                    <input 
                      type="range" min="40" max="240" value={bpm} 
                      onChange={(e) => { const v = parseInt(e.target.value); logSliderChange('bpm', 'BPM', bpm, v, '', (o, n) => { const oldEclipse = mcm * 60 / o / 4; const newEclipse = mcm * 60 / n / 4; return [`Eclipse ${formatEclipseTime(oldEclipse, false)} → ${formatEclipseTime(newEclipse, false)}`]; }); setBpm(v); }} 
                      className="h-1 bg-black/5 appearance-none cursor-pointer accent-system-accent" 
                    />
                    {/* Metric Modulation toggle */}
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => setShowMM(prev => !prev)}
                        className={`text-[8px] font-mono px-1.5 py-0.5 rounded border transition-colors self-start ${
                          showMM
                            ? 'bg-system-accent text-white border-system-accent'
                            : 'bg-white text-idm-muted border-black/10 hover:border-system-accent'
                        }`}
                        title="Metric Modulation — cambio de subdivisión percibida"
                      >
                        MM
                      </button>
                      {showMM && (
                        <div className="flex flex-col gap-2 p-2 bg-white/80 border border-black/10 rounded-lg min-w-[200px]">
                          <span className="text-[8px] font-mono uppercase text-idm-muted">
                            Metric Modulation
                          </span>
                          <div className="text-[10px] font-mono text-idm-ink">
                            {bpm} BPM
                          </div>
                          <div className="grid grid-cols-3 gap-1">
                            {METRIC_MODULATION_RATIOS.map(({ ratio, label, description }) => {
                              const resultBpm = Math.round(Math.max(40, Math.min(240, bpm * ratio)));
                              const clamped = resultBpm !== Math.round(bpm * ratio);
                              return (
                                <button
                                  key={label}
                                  onClick={() => handleMetricModulation(ratio, label, description)}
                                  disabled={clamped}
                                  className={`flex flex-col items-center px-1 py-1.5 rounded border text-center transition-colors ${
                                    clamped
                                      ? 'opacity-30 cursor-not-allowed border-black/5 bg-white'
                                      : 'border-black/10 bg-white hover:border-system-accent hover:text-system-accent'
                                  }`}
                                  title={`${description} → ${resultBpm} BPM${clamped ? ' (fuera de rango)' : ''}`}
                                >
                                  <span className="text-[10px] font-mono font-bold text-idm-ink">
                                    {label}
                                  </span>
                                  <span className="text-[7px] font-mono text-idm-muted">
                                    {resultBpm}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                          {mmHistory.length > 0 && (
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[7px] font-mono uppercase text-idm-muted">
                                  Historial
                                </span>
                                <button
                                  onClick={() => handleMetricModulationReset(
                                    mmHistory[mmHistory.length - 1].fromBpm
                                  )}
                                  className="text-[7px] font-mono text-idm-muted hover:text-system-accent transition-colors"
                                  title="Volver al BPM original"
                                >
                                  Reset
                                </button>
                              </div>
                              {mmHistory.map((entry, i) => (
                                <div key={i} className="flex items-center justify-between gap-1">
                                  <span className="text-[7px] font-mono text-idm-muted">
                                    {entry.timestamp}
                                  </span>
                                  <span className="text-[7px] font-mono text-idm-ink">
                                    {entry.fromBpm}→{entry.toBpm}
                                  </span>
                                  <span className="text-[7px] font-mono text-system-accent">
                                    {entry.ratio}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className={`flex justify-between text-[10px] font-mono uppercase text-idm-muted ${isStudyMode ? 'cursor-help' : ''}`}
                      onMouseEnter={(e) => { if (isStudyMode) { setHoveredGlobalParam('jitter'); setHoveredGlobalEl(e.currentTarget); } }}
                      onMouseLeave={() => { setHoveredGlobalParam(null); setHoveredGlobalEl(null); }}>
                      <span>Jitter</span>
                      <span className="text-system-accent">{jitter}ms</span>
                    </div>
                    <input 
                      type="range" min="0" max="20" value={jitter} 
                      onChange={(e) => { const v = parseInt(e.target.value); logSliderChange('jitter', 'Jitter', jitter, v, 'ms'); setJitter(v); }} 
                      className="h-1 bg-black/5 appearance-none cursor-pointer accent-system-accent" 
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className={`flex justify-between text-[10px] font-mono uppercase text-idm-muted ${isStudyMode ? 'cursor-help' : ''}`}
                      onMouseEnter={(e) => { if (isStudyMode) { setHoveredGlobalParam('swing'); setHoveredGlobalEl(e.currentTarget); } }}
                      onMouseLeave={() => { setHoveredGlobalParam(null); setHoveredGlobalEl(null); }}>
                      <span>Swing</span>
                      <span className="text-system-accent">{swing}%</span>
                    </div>
                    <input 
                      type="range" min="0" max="100" value={swing} 
                      onChange={(e) => { const v = parseInt(e.target.value); logSliderChange('swing', 'Swing', swing, v, '%'); setSwing(v); }} 
                      className="h-1 bg-black/5 appearance-none cursor-pointer accent-system-accent" 
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className={`flex justify-between text-[10px] font-mono uppercase text-idm-muted ${isStudyMode ? 'cursor-help' : ''}`}
                      onMouseEnter={(e) => { if (isStudyMode) { setHoveredGlobalParam('dynamics'); setHoveredGlobalEl(e.currentTarget); } }}
                      onMouseLeave={() => { setHoveredGlobalParam(null); setHoveredGlobalEl(null); }}>
                      <span>Dynamics</span>
                      <span className="text-system-accent">{dynamics}%</span>
                    </div>
                    <input 
                      type="range" min="0" max="100" value={dynamics} 
                      onChange={(e) => { const v = parseInt(e.target.value); logSliderChange('dynamics', 'Dynamics', dynamics, v, '%'); setDynamics(v); }} 
                      className="h-1 bg-black/5 appearance-none cursor-pointer accent-system-accent" 
                    />
                  </div>

                  {/* Effects Controls (Always Visible) */}
                  <div className="flex flex-col gap-2">
                    <div className={`flex justify-between text-[10px] font-mono uppercase text-idm-muted ${isStudyMode ? 'cursor-help' : ''}`}
                      onMouseEnter={(e) => { if (isStudyMode) { setHoveredGlobalParam('reverbMix'); setHoveredGlobalEl(e.currentTarget); } }}
                      onMouseLeave={() => { setHoveredGlobalParam(null); setHoveredGlobalEl(null); }}>
                      <span>Space (Reverb)</span>
                      <span className="text-system-accent">{Math.round(reverbMix * 100)}%</span>
                    </div>
                    <input 
                      type="range" min="0" max="100" value={reverbMix * 100} 
                      onChange={(e) => setReverbMix(parseInt(e.target.value) / 100)} 
                      className="h-1 bg-black/5 appearance-none cursor-pointer accent-system-accent" 
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className={`flex justify-between text-[10px] font-mono uppercase text-idm-muted ${isStudyMode ? 'cursor-help' : ''}`}
                      onMouseEnter={(e) => { if (isStudyMode) { setHoveredGlobalParam('delayMix'); setHoveredGlobalEl(e.currentTarget); } }}
                      onMouseLeave={() => { setHoveredGlobalParam(null); setHoveredGlobalEl(null); }}>
                      <span>Echo (Delay)</span>
                      <span className="text-system-accent">{Math.round(delayMix * 100)}%</span>
                    </div>
                    <input 
                      type="range" min="0" max="100" value={delayMix * 100} 
                      onChange={(e) => setDelayMix(parseInt(e.target.value) / 100)} 
                      className="h-1 bg-black/5 appearance-none cursor-pointer accent-system-accent" 
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className={`flex justify-between text-[10px] font-mono uppercase text-idm-muted ${isStudyMode ? 'cursor-help' : ''}`}
                      onMouseEnter={(e) => { if (isStudyMode) { setHoveredGlobalParam('delayFeedback'); setHoveredGlobalEl(e.currentTarget); } }}
                      onMouseLeave={() => { setHoveredGlobalParam(null); setHoveredGlobalEl(null); }}>
                      <span>Feedback</span>
                      <span className="text-system-accent">{Math.round(delayFeedback * 100)}%</span>
                    </div>
                    <input 
                      type="range" min="0" max="100" value={delayFeedback * 100} 
                      onChange={(e) => setDelayFeedback(parseInt(e.target.value) / 100)} 
                      className="h-1 bg-black/5 appearance-none cursor-pointer accent-system-accent" 
                    />
                  </div>
                </div>
              )}

                <div className="mt-6 pt-6 border-t border-idm-muted/10 grid grid-cols-1 sm:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2 duration-700">
                  <div className="flex flex-col gap-2">
                    <div className={`flex justify-between text-[10px] font-mono uppercase text-idm-muted ${isStudyMode ? 'cursor-help' : ''}`}
                      onMouseEnter={(e) => { if (isStudyMode) { setHoveredGlobalParam('fxHighPass'); setHoveredGlobalEl(e.currentTarget); } }}
                      onMouseLeave={() => { setHoveredGlobalParam(null); setHoveredGlobalEl(null); }}>
                      <span>FX Low-Cut (HPF)</span>
                      <span className="text-system-accent">{Math.round(fxHighPass)}Hz</span>
                    </div>
                    <input 
                      type="range" min="20" max="2000" value={fxHighPass} 
                      onChange={(e) => setFxHighPass(parseInt(e.target.value))} 
                      className="h-1 bg-black/5 appearance-none cursor-pointer accent-system-accent" 
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className={`flex justify-between text-[10px] font-mono uppercase text-idm-muted ${isStudyMode ? 'cursor-help' : ''}`}
                      onMouseEnter={(e) => { if (isStudyMode) { setHoveredGlobalParam('fxLowPass'); setHoveredGlobalEl(e.currentTarget); } }}
                      onMouseLeave={() => { setHoveredGlobalParam(null); setHoveredGlobalEl(null); }}>
                      <span>FX High-Cut (LPF)</span>
                      <span className="text-system-accent">{Math.round(fxLowPass)}Hz</span>
                    </div>
                    <input 
                      type="range" min="500" max="20000" value={fxLowPass} 
                      onChange={(e) => setFxLowPass(parseInt(e.target.value))} 
                      className="h-1 bg-black/5 appearance-none cursor-pointer accent-system-accent" 
                    />
                  </div>
                </div>

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

      {/* Tracks Container with z-index to ensure interactivity */}
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
              onStepsChange={(val) => {
                const oldSteps = track.steps;
                const oldDensity = Math.round((track.pulses / oldSteps) * 100);
                const newPulses = Math.min(track.pulses, val);
                const newDensity = Math.round((newPulses / val) * 100);
                // Compute MCM delta
                const rhythmicSteps = tracks.filter(t => t.id !== 'cloud').map(t => t.id === track.id ? val : t.steps);
                const newMcm = lcmArray(rhythmicSteps);
                const deltas: string[] = [];
                if (newMcm !== mcm) deltas.push(`MCM ${mcm} → ${newMcm}`);
                deltas.push(`Dens ${oldDensity}% → ${newDensity}%`);
                const oldEclipseSec = mcm * 60 / bpm / 4;
                const newEclipseSec = newMcm * 60 / bpm / 4;
                if (newMcm !== mcm) deltas.push(`Eclipse ${formatEclipseTime(oldEclipseSec, false)} → ${formatEclipseTime(newEclipseSec, false)}`);
                logChange(`${track.name} steps ${oldSteps} → ${val}`, deltas);
                setTracks(prev => prev.map(t => {
                  if (t.id === track.id) {
                    return updateTrackPattern({ ...t, steps: val, pulses: Math.min(t.pulses, val) });
                  }
                  return t;
                }));
              }}
              onPulsesChange={(val) => {
                const oldPulses = track.pulses;
                const oldDensity = Math.round((oldPulses / track.steps) * 100);
                const newDensity = Math.round((val / track.steps) * 100);
                logChange(`${track.name} pulses ${oldPulses} → ${val}`, [`Dens ${oldDensity}% → ${newDensity}%`]);
                setTracks(prev => prev.map(t => t.id === track.id ? updateTrackPattern({ ...t, pulses: val }) : t));
              }}
              onOffsetChange={(val) => {
                logChange(`${track.name} offset ${track.offset} → ${val}`);
                setTracks(prev => prev.map(t => t.id === track.id ? updateTrackPattern({ ...t, offset: val }) : t));
              }}
              onProbabilityChange={(idx, val) => setTracks(prev => prev.map(t => {
                if (t.id === track.id) {
                  const newProbs = [...t.probabilities];
                  newProbs[idx] = val;
                  return { ...t, probabilities: newProbs };
                }
                return t;
              }))}
              onChaosToggle={() => {
                const newState = !track.chaosEnabled;
                logChange(`Chaos ${newState ? 'ON' : 'OFF'} (${track.name})`, newState ? [`HitRate ~${hitRateData.rate ?? 100}% → estimado menor`] : []);
                setTracks(prev => prev.map(t => t.id === track.id ? { ...t, chaosEnabled: newState } : t));
              }}
              onEntropyChange={(val) => {
                logChange(`${track.name} entropy ${track.entropy} → ${val}×`);
                setTracks(prev => prev.map(t => t.id === track.id ? { ...t, entropy: val } : t));
              }}
              onEvolveToggle={() => {
                const newState = !track.evolveEnabled;
                logChange(`Evolve ${newState ? 'ON' : 'OFF'} (${track.name})`);
                setTracks(prev => prev.map(t => t.id === track.id ? { ...t, evolveEnabled: newState } : t));
              }}
              onMutationRateChange={(val) => {
                logChange(`${track.name} mutation ${Math.round(track.mutationRate * 100)}% → ${Math.round(val * 100)}%`);
                setTracks(prev => prev.map(t => t.id === track.id ? { ...t, mutationRate: val } : t));
              }}
              onMutationSpeedChange={(val) => setTracks(prev => prev.map(t => t.id === track.id ? { ...t, mutationSpeed: val } : t))}
              onFileUpload={(file) => handleFileUpload(track.id, file)}
              onSamplerParamChange={(param, val) => handleSamplerParamChange(track.id, param, val)}
              onClearSampler={() => handleClearSampler(track.id)}
              onToggleStep={(idx) => setTracks(prev => prev.map(t => {
                if (t.id === track.id) {
                  const newPattern = [...t.pattern];
                  newPattern[idx] = newPattern[idx] === 1 ? 0 : 1;
                  const newPulses = newPattern.filter(p => p === 1).length;
                  return { ...t, pattern: newPattern, pulses: newPulses };
                }
                return t;
              }))}
              onMuteToggle={() => setTracks(prev => prev.map(t => t.id === track.id ? { ...t, isMuted: !t.isMuted } : t))}
              onSoloToggle={() => setTracks(prev => prev.map(t => t.id === track.id ? { ...t, isSoloed: !t.isSoloed } : t))}
              volume={track.volume}
              onVolumeChange={(val) => setTracks(prev => prev.map(t => t.id === track.id ? { ...t, volume: val } : t))}
              delaySend={track.delaySend}
              onDelaySendChange={(val) => setTracks(prev => prev.map(t => t.id === track.id ? { ...t, delaySend: val } : t))}
              reverbSend={track.reverbSend}
              onReverbSendChange={(val) => setTracks(prev => prev.map(t => t.id === track.id ? { ...t, reverbSend: val } : t))}
              ratchet={track.ratchet}
              onRatchetChange={(val) => setTracks(prev => prev.map(t => t.id === track.id ? { ...t, ratchet: val } : t))}
              rrEnabled={track.rrEnabled}
              rrAmount={track.rrAmount}
              onRrEnabledChange={(val) => setTracks(prev => prev.map(t => t.id === track.id ? { ...t, rrEnabled: val } : t))}
              onRrAmountChange={(val) => setTracks(prev => prev.map(t => t.id === track.id ? { ...t, rrAmount: val } : t))}
              driftEnabled={track.driftEnabled}
              driftRate={track.driftRate}
              onDriftEnabledChange={(val) => setTracks(prev => prev.map(t => t.id === track.id ? { ...t, driftEnabled: val } : t))}
              onDriftRateChange={(val) => setTracks(prev => prev.map(t => t.id === track.id ? { ...t, driftRate: val } : t))}
              layer2Status={track.layer2Status}
              layer2Filename={track.layer2Filename}
              layer2Blend={track.layer2Blend}
              layer2Pitch={track.layer2Pitch}
              layer2Offset={track.layer2Offset}
              layer2FilterFreq={track.layer2FilterFreq}
              layer2Reverse={track.layer2Reverse}
              onLoadLayer2={(file) => handleLoadLayer2(track.id, file)}
              onClearLayer2={() => handleClearLayer2(track.id)}
              onLayer2ParamChange={(param, value) => handleLayer2ParamChange(track.id, param, value)}
              isTonal={track.isTonal}
              rootNote={track.rootNote}
              scaleId={track.scaleId}
              octaveRange={track.octaveRange}
              noteIndices={track.noteIndices}
              onRootNoteChange={(val) => setTracks(prev => prev.map(t => t.id === track.id ? { ...t, rootNote: val } : t))}
              onScaleChange={(val) => setTracks(prev => prev.map(t => t.id === track.id ? { ...t, scaleId: val } : t))}
              onOctaveRangeChange={(val) => setTracks(prev => prev.map(t => t.id === track.id ? { ...t, octaveRange: val } : t))}
              onNoteIndexChange={(stepIdx, val) => setTracks(prev => prev.map(t => {
                if (t.id === track.id) {
                  const newIndices = [...t.noteIndices];
                  newIndices[stepIdx] = val;
                  return { ...t, noteIndices: newIndices };
                }
                return t;
              }))}
              synthType={track.synthType}
              fmRatio={track.fmRatio}
              fmIndex={track.fmIndex}
              onSynthTypeChange={(val) => {
                setTracks(prev => prev.map(t => t.id === 'tone' ? { ...t, synthType: val } : t));
                if (synthsRef.current.tone?.dispose) {
                  synthsRef.current.tone.dispose();
                }
                initializeOriginalSynth('tone', val);
                logChange(`Tone synth → ${val.toUpperCase()}`);
              }}
              onFmRatioChange={(val) => {
                setTracks(prev => prev.map(t => t.id === 'tone' ? { ...t, fmRatio: val } : t));
                if (synthsRef.current.tone?.updateFmParams) {
                  const toneTrack = tracksRef.current.find(t => t.id === 'tone');
                  synthsRef.current.tone.updateFmParams(val, toneTrack?.fmIndex ?? 10);
                }
              }}
              onFmIndexChange={(val) => {
                setTracks(prev => prev.map(t => t.id === 'tone' ? { ...t, fmIndex: val } : t));
                if (synthsRef.current.tone?.updateFmParams) {
                  const toneTrack = tracksRef.current.find(t => t.id === 'tone');
                  synthsRef.current.tone.updateFmParams(toneTrack?.fmRatio ?? 2, val);
                }
              }}
              wfAmount={track.wfAmount}
              wfSymmetry={track.wfSymmetry}
              onWfAmountChange={(val) => {
                setTracks(prev => prev.map(t => t.id === 'tone' ? { ...t, wfAmount: val } : t));
                if (synthsRef.current.tone?.updateWfParams) {
                  const toneTrack = tracksRef.current.find(t => t.id === 'tone');
                  synthsRef.current.tone.updateWfParams(val, toneTrack?.wfSymmetry ?? 0);
                }
              }}
              onWfSymmetryChange={(val) => {
                setTracks(prev => prev.map(t => t.id === 'tone' ? { ...t, wfSymmetry: val } : t));
                if (synthsRef.current.tone?.updateWfParams) {
                  const toneTrack = tracksRef.current.find(t => t.id === 'tone');
                  synthsRef.current.tone.updateWfParams(toneTrack?.wfAmount ?? 3, val);
                }
              }}
              addPartials={track.addPartials}
              addBrightness={track.addBrightness}
              arRate={track.arRate}
              arDepth={track.arDepth}
              onAddPartialsChange={(val) => {
                setTracks(prev => prev.map(t => t.id === 'tone' ? { ...t, addPartials: val } : t));
                if (synthsRef.current.tone?.updateAddParams) {
                  const tt = tracksRef.current.find(t => t.id === 'tone');
                  synthsRef.current.tone.updateAddParams(val, tt?.addBrightness ?? 0.5);
                }
              }}
              onAddBrightnessChange={(val) => {
                setTracks(prev => prev.map(t => t.id === 'tone' ? { ...t, addBrightness: val } : t));
                if (synthsRef.current.tone?.updateAddParams) {
                  const tt = tracksRef.current.find(t => t.id === 'tone');
                  synthsRef.current.tone.updateAddParams(tt?.addPartials ?? 4, val);
                }
              }}
              onArRateChange={(val) => {
                setTracks(prev => prev.map(t => t.id === 'tone' ? { ...t, arRate: val } : t));
                if (synthsRef.current.tone?.updateArParams) {
                  const tt = tracksRef.current.find(t => t.id === 'tone');
                  synthsRef.current.tone.updateArParams(val, tt?.arDepth ?? 0);
                }
              }}
              onArDepthChange={(val) => {
                setTracks(prev => prev.map(t => t.id === 'tone' ? { ...t, arDepth: val } : t));
                if (synthsRef.current.tone?.updateArParams) {
                  const tt = tracksRef.current.find(t => t.id === 'tone');
                  synthsRef.current.tone.updateArParams(tt?.arRate ?? 80, val);
                }
              }}
              padVoices={track.padVoices}
              padDetune={track.padDetune}
              padAttack={track.padAttack}
              droneFeedback={track.droneFeedback}
              droneFilterFreq={track.droneFilterFreq}
              onPadVoicesChange={(val) => {
                setTracks(prev => prev.map(t => t.id === 'tone' ? { ...t, padVoices: val } : t));
                if (synthsRef.current.tone?.updatePadParams) {
                  const tt = tracksRef.current.find(t => t.id === 'tone');
                  synthsRef.current.tone.updatePadParams(val, tt?.padDetune ?? 30, tt?.padAttack ?? 0.3);
                }
              }}
              onPadDetuneChange={(val) => {
                setTracks(prev => prev.map(t => t.id === 'tone' ? { ...t, padDetune: val } : t));
                if (synthsRef.current.tone?.updatePadParams) {
                  const tt = tracksRef.current.find(t => t.id === 'tone');
                  synthsRef.current.tone.updatePadParams(tt?.padVoices ?? 5, val, tt?.padAttack ?? 0.3);
                }
              }}
              onPadAttackChange={(val) => {
                setTracks(prev => prev.map(t => t.id === 'tone' ? { ...t, padAttack: val } : t));
                if (synthsRef.current.tone?.updatePadParams) {
                  const tt = tracksRef.current.find(t => t.id === 'tone');
                  synthsRef.current.tone.updatePadParams(tt?.padVoices ?? 5, tt?.padDetune ?? 30, val);
                }
              }}
              onDroneFeedbackChange={(val) => {
                setTracks(prev => prev.map(t => t.id === 'tone' ? { ...t, droneFeedback: val } : t));
                if (synthsRef.current.tone?.updateDroneParams) {
                  const tt = tracksRef.current.find(t => t.id === 'tone');
                  synthsRef.current.tone.updateDroneParams(val, tt?.droneFilterFreq ?? 2000);
                }
              }}
              onDroneFilterFreqChange={(val) => {
                setTracks(prev => prev.map(t => t.id === 'tone' ? { ...t, droneFilterFreq: val } : t));
                if (synthsRef.current.tone?.updateDroneParams) {
                  const tt = tracksRef.current.find(t => t.id === 'tone');
                  synthsRef.current.tone.updateDroneParams(tt?.droneFeedback ?? 0.88, val);
                }
              }}
              ksDecay={track.ksDecay}
              ksBrightness={track.ksBrightness}
              modalBody={track.modalBody}
              modalDecay={track.modalDecay}
              onKsDecayChange={(val) => {
                setTracks(prev => prev.map(t => t.id === 'tone' ? { ...t, ksDecay: val } : t));
                if (synthsRef.current.tone?.updateKsParams) {
                  const tt = tracksRef.current.find(t => t.id === 'tone');
                  synthsRef.current.tone.updateKsParams(val, tt?.ksBrightness ?? 5000);
                }
              }}
              onKsBrightnessChange={(val) => {
                setTracks(prev => prev.map(t => t.id === 'tone' ? { ...t, ksBrightness: val } : t));
                if (synthsRef.current.tone?.updateKsParams) {
                  const tt = tracksRef.current.find(t => t.id === 'tone');
                  synthsRef.current.tone.updateKsParams(tt?.ksDecay ?? 0.97, val);
                }
              }}
              onModalBodyChange={(val) => {
                setTracks(prev => prev.map(t => t.id === 'tone' ? { ...t, modalBody: val } : t));
              }}
              onModalDecayChange={(val) => {
                setTracks(prev => prev.map(t => t.id === 'tone' ? { ...t, modalDecay: val } : t));
              }}
              ambientVolume={track.ambientVolume}
              ambientSpeed={track.ambientSpeed}
              onAmbientVolumeChange={(val) => {
                setTracks(prev => prev.map(t => t.id === 'tone' ? { ...t, ambientVolume: val } : t));
              }}
              onAmbientSpeedChange={(val) => {
                setTracks(prev => prev.map(t => t.id === 'tone' ? { ...t, ambientSpeed: val } : t));
              }}
              cloudMode={track.cloudMode}
              enoSpeed={track.enoSpeed}
              onCloudModeChange={handleCloudModeChange}
              onEnoSpeedChange={(val) => {
                setTracks(prev => prev.map(t => t.id === 'cloud' ? { ...t, enoSpeed: val } : t));
              }}
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
              onPatternModeChange={(mode) => {
                if (mode === 'ca') {
                  delete caStateRef.current[track.id];
                  caEvolveCycleRef.current[track.id] = 0;
                }
                setTracks(prev => prev.map(t =>
                  t.id === track.id
                    ? updateTrackPattern({ ...t, patternMode: mode })
                    : t
                ));
              }}
              onLsParamChange={(param, value) => {
                setTracks(prev => prev.map(t =>
                  t.id === track.id
                    ? updateTrackPattern({ ...t, [param]: value })
                    : t
                ));
              }}
              onLsRegenerate={() => {
                setTracks(prev => prev.map(t =>
                  t.id === track.id ? updateTrackPattern(t) : t
                ));
              }}
              onLsReset={() => {
                setTracks(prev => prev.map(t =>
                  t.id === track.id
                    ? updateTrackPattern({ ...t, lsSeed: 'X', lsRuleA: 'XO', lsIterations: 3, lsRotation: 0 })
                    : t
                ));
              }}
              onCaParamChange={(param, value) => {
                delete caStateRef.current[track.id];
                caEvolveCycleRef.current[track.id] = 0;
                setTracks(prev => prev.map(t =>
                  t.id === track.id
                    ? updateTrackPattern({ ...t, [param]: value })
                    : t
                ));
              }}
              onCaReset={() => {
                delete caStateRef.current[track.id];
                caEvolveCycleRef.current[track.id] = 0;
                setTracks(prev => prev.map(t =>
                  t.id === track.id ? updateTrackPattern(t) : t
                ));
              }}
            />
          </div>
        ))}

      </div>

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
