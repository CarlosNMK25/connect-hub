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
import { bjorklund, rotate } from '../../utils/bjorklund';
import { lcmArray, calculateLcmImpact } from '../../utils/math';
import { PRESETS, ScenePreset, TrackPreset } from '../../constants/presets';
import { PEDAGOGY, getMicroText, type PedagogyVoice } from '../../constants/pedagogy';
import { UserPreset, loadUserPresets, saveUserPresets, exportPresetAsJson, importPresetFromFile, userPresetToScenePreset } from '../../utils/userPresets';
import { TemporalityMode, TEMPORALITY_MODES, calculateTemporalOffset } from '../../utils/temporality';
import { SCALES, SCALE_NAMES, noteIndexToMidi, midiToNoteName, getMaxNoteIndex } from '../../utils/scales';

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

  // Sync engine log to state when panel is open
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
  const updateTrackPattern = (t: TrackState) => {
    const p = bjorklund(t.pulses, t.steps);
    // No longer rotating the pattern physically. 
    // The offset will be handled by the playhead (globalStep + offset).
    return { ...t, pattern: p };
  };

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

      // Flush pending evolve mutations to React state (max 1 setTracks per 100ms)
      const mutations = pendingMutationsRef.current;
      const mutationKeys = Object.keys(mutations);
      if (mutationKeys.length > 0) {
        pendingMutationsRef.current = {};
        setTracks(prev => prev.map(t => {
          if (mutations[t.id]) {
            return { ...t, probabilities: mutations[t.id] };
          }
          return t;
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
          ...(t.isTonal ? { rootNote: t.rootNote, scaleId: t.scaleId, octaveRange: t.octaveRange, noteIndices: [...t.noteIndices] } : {}),
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
        } : {}),
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
        const idx = (currentGlobalStep + track.offset) % track.steps;
        
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
                const noteIdx = track.noteIndices[idx] ?? 0;
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
      if (synthsRef.current.cloud?.grainPlayer) {
        synthsRef.current.cloud.grainPlayer.stop();
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
    } else {
      const activeTracks = tracks.filter(t => !t.isMuted).length;
      logChange('▶ Play', [`BPM ${bpm}`, `${activeTracks} activos`]);
      Tone.getTransport().bpm.value = bpm;
      Tone.getTransport().start();
      // Start cloud grain player if it exists
      if (synthsRef.current.cloud?.grainPlayer) {
        synthsRef.current.cloud.grainPlayer.start();
      }
    }
    setIsPlaying(!isPlaying);
  };

  const handlePhaseSync = () => {
    setGlobalStep(0);
    globalStepRef.current = 0;
    
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
      if (synthsRef.current.cloud?.grainPlayer) {
        synthsRef.current.cloud.grainPlayer.stop();
      }
      Tone.getTransport().start();
      if (synthsRef.current.cloud?.grainPlayer) {
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

      if (trackId === 'cloud' && isPlaying) {
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

    } catch (e) {
      console.error("Error decodificando audio:", e);
      setTracks(prev => prev.map(t => t.id === trackId ? { ...t, samplerStatus: 'IDLE', samplerFilename: null } : t));
      alert("Error al cargar el archivo de audio. Asegúrate de que sea un formato compatible.");
    }
  };

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

  const handleClearSampler = (trackId: string) => {
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
      samplerFilename: null 
    } : t));
  };

  const initializeOriginalSynth = (trackId: string) => {
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
      const toneDelaySend = new Tone.Gain(0.15).connect(master.delayBus);
      const toneReverbSend = new Tone.Gain(0.2).connect(master.reverbBus);
      const toneFilter = new Tone.Filter(2000, "lowpass").connect(master.compressor);
      toneFilter.connect(toneDelaySend);
      toneFilter.connect(toneReverbSend);

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
    }
    
    // Apply current volume and sends
    const track = tracksRef.current.find(t => t.id === trackId);
    if (track && synthsRef.current[trackId]) {
      synthsRef.current[trackId].setVolume(track.volume);
      synthsRef.current[trackId].setSends(track.delaySend, track.reverbSend);
    }
  };

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
            />
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
              isStudyMode={isStudyMode}
              studyVoice={studyVoice}
              anySoloed={tracks.some(t => t.isSoloed)}
              temporalityMode={temporalityMode}
              bpm={bpm}
              swing={swing}
            />
          </div>
        ))}

      </div>

      <div className="mt-8 pt-4 border-t border-idm-muted/30 flex justify-between items-center text-[10px] font-mono text-idm-ink/40 uppercase tracking-widest">
        <div className="flex gap-4">
          <span>KICK: Membrane</span>
          <span>SNARE: Noise</span>
          <span>HAT: Metal</span>
          <span>TONE: Mono</span>
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
