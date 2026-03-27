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
import { UserPreset, userPresetToScenePreset, exportPresetAsJson } from '../../utils/userPresets';
import { usePresetManager } from '../../hooks/usePresetManager';
import { useTrackState } from '../../hooks/useTrackState';
import { TemporalityMode, TEMPORALITY_MODES, calculateTemporalOffset } from '../../utils/temporality';
import { SCALES, SCALE_NAMES, noteIndexToMidi, midiToNoteName, getMaxNoteIndex, getScaleIntervals, getScaleDetune, midiAndDetuneToFreq, noteIndexToFreq, isNonOctaveScale } from '../../utils/scales';
import { markovNextNote } from '../../utils/markovGenerator';
import { useAudioEngine, type MasterBusType } from '../../hooks/useAudioEngine';
import { usePedagogy } from '../../hooks/usePedagogy';
import type { TrackState, SceneData } from '../../types/track';

// TrackState and SceneData imported from ../../types/track


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
  const {
    isStudyMode, setIsStudyMode,
    studyVoice, setStudyVoice,
    isThesisOpen, setIsThesisOpen,
    hoveredGlobalParam, setHoveredGlobalParam,
    hoveredGlobalEl, setHoveredGlobalEl,
  } = usePedagogy();
  const [globalStep, setGlobalStep] = useState(0);
  const [lastHit, setLastHit] = useState<{ offset: number; color: string; velocity: number; id?: number } | null>(null);
  const [eclipseFlash, setEclipseFlash] = useState(false);
  const eclipseRef = useRef(false);
  const [syncAnalysisOpen, setSyncAnalysisOpen] = useState(false);
  const eclipseHistoryRef = useRef<{ time: string; mcm: number; bpm: number }[]>([]);
  const PHASE_BUFFER_SIZE = 128;
  const phaseBufferRef = useRef<number[]>([]);
  const phaseBufferHeadRef = useRef(0);
  const [showEngine, setShowEngine] = useState(false);
  const [showPatternSpace, setShowPatternSpace] = useState(false);
  const engineLogRef = useRef<LogEntry[]>([]);
  const [engineLog, setEngineLog] = useState<LogEntry[]>([]);
  const sliderDragRef = useRef<{ [key: string]: { value: number; timer: ReturnType<typeof setTimeout> | null } }>({});
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
  // sliceBoundariesRef + recalculateSlices → useTrackState

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
  
  // updateTrackPattern, updateMarkovMatrix, tracks state → useTrackState

  const synthsRef = useRef<{ [key: string]: any }>({});
  const loopRef = useRef<Tone.Loop | null>(null);
  const jitterRef = useRef(jitter);
  const swingRef = useRef(swing);
  const dynamicsRef = useRef(dynamics);
  const globalStepRef = useRef(0);
  const currentStepsRef = useRef<{ [key: string]: number }>({});
  const statsRef = useRef<{ [key: string]: { hits: number, misses: number, cycleCount: number, lastGhostStep: number | null } }>({});
  const [uiStats, setUiStats] = useState<{ [key: string]: { hits: number, misses: number, cycleCount: number } }>({});
  const lastScheduledTimesRef = useRef<{ [key: string]: number }>({});
  const stepIndicesRef = useRef<{ [key: string]: number }>({});
  // pendingMutationsRef, caStateRef, caEvolveCycleRef, pendingCARef, rrNoteIndexRef,
  // markovLastNoteRef, markovAnchorCountRef, markovMatrixRef, markovNotesRef,
  // driftAccumulatorRef, driftOffsets → useTrackState
  const lorenzRafRef = useRef<number>(0);
  // Refs para grabación en tiempo real del track Tone
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
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

  const masterBusRef = useRef<MasterBusType | null>(null);

  // Active FX panel in Controls column (only one visible at a time)
  const [activeFxPanel, setActiveFxPanel] = useState<'GRV' | 'RVR' | 'FRZ' | 'XFD' | 'SDLY' | null>(null);

  // ═══ Track State Hook ═══
  const {
    tracks, setTracks, driftOffsets, setDriftOffsets,
    tracksRef,
    caStateRef, caEvolveCycleRef, pendingCARef,
    pendingMutationsRef,
    markovLastNoteRef, markovAnchorCountRef, markovMatrixRef, markovNotesRef,
    driftAccumulatorRef, rrNoteIndexRef, sliceBoundariesRef,
    initOrigSynthRef, startLorenzRafRef,
    updateTrackPattern, updateMarkovMatrix, recalculateSlices,
    handleParamChange, handleSequencerAction, handleTonalAction, handleSlicerAction,
    handleSamplerParamChange, handlePercSynthParamChange,
    handleFileUploadCb, handleClearSamplerCb, handleLoadLayer2Cb, handleClearLayer2Cb,
    handleLayer2ParamChange, handleCloudModeChange, handleGetMarkovMatrix, initCloudEno,
  } = useTrackState({
    synthsRef, masterBusRef, logChange, syncAllScenes, isPlaying,
  });

  // ═══ Audio Engine Hook ═══
  const {
    cloudAnalyserRef, toneFilterRef, globalAnalyser,
    startLorenzRaf, initializeOriginalSynth: initializeOriginalSynthBase,
    spectralDelayEnabled, setSpectralDelayEnabled,
    spectralDelayWet, setSpectralDelayWet,
    spectralDelayLowTime, setSpectralDelayLowTime,
    spectralDelayMidTime, setSpectralDelayMidTime,
    spectralDelayHighTime, setSpectralDelayHighTime,
    spectralDelayLowFreq, setSpectralDelayLowFreq,
    spectralDelayHighFreq, setSpectralDelayHighFreq,
    freezeEnabled, setFreezeEnabled,
    freezeFeedback, setFreezeFeedback,
    freezeFilterFreq, setFreezeFilterFreq,
    reverseEnabled, setReverseEnabled,
    reverseDecay, setReverseDecay,
    gatedEnabled, setGatedEnabled,
    gatedThreshold, setGatedThreshold,
    crossfeedEnabled, setCrossfeedEnabled,
    crossfeedDepth, setCrossfeedDepth,
    crossfeedBase, setCrossfeedBase,
    fxHighPass, setFxHighPass,
    fxLowPass, setFxLowPass,
  } = useAudioEngine({
    synthsRef, masterBusRef, loopRef, lorenzRafRef,
    tracks, tracksRef,
    bpm, delayMix, delayFeedback, reverbMix,
  });
  useEffect(() => {
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





  const stepsKey = tracks.map(t => `${t.id}:${t.steps}`).join('|');
  const mcm = useMemo(() => {
    const rhythmicTracks = tracks.filter(t => t.id !== 'cloud');
    if (rhythmicTracks.length === 0) return 1;
    return lcmArray(rhythmicTracks.map(t => t.steps));
  }, [stepsKey]);

  // Preset manager hook (extracted from monolith)
  const {
    userPresets, activePresetId, hoveredPreset, setHoveredPreset,
    previewPatterns, isSavingPreset, setIsSavingPreset,
    newPresetName, setNewPresetName, importError, importInputRef,
    applyPreset, injectPattern, captureCurrentConfig,
    applyUserPreset, handleSaveUserPreset, handleDeleteUserPreset,
    handleExportCurrent, handleImportPreset,
  } = usePresetManager({
    tracks, setTracks,
    bpm, setBpm, jitter, setJitter, swing, setSwing,
    dynamics, setDynamics, temporalityMode, setTemporalityMode,
    setMmHistory, logChange, updateTrackPattern, updateMarkovMatrix,
    synthsRef, tracksRef, mcm,
  });

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
    
    // ── Kick routing via factory ──
    const kickRouting = createTrackRouting({
      filterFreq: 2000, filterType: 'lowpass',
      compressor, delayBus, reverbBus, spectralDelayBus, freezeBus, reverseBus,
    });
    const kickFilter = kickRouting.filter;
    // Sidechain: follower taps post-EQ, pre-pan
    kickRouting.eqLpf.connect(kickFollower);
    kickFollower.connect(sidechainInverter);

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
        kickRouting.delaySend.gain.rampTo(delayVal, 0.05);
        kickRouting.reverbSend.gain.rampTo(reverbVal, 0.05);
      },
      dispose: () => {
        kickBody.dispose();
        kickClick.dispose();
        kickRouting.dispose();
      }
    };
    // Inject common methods (EQ, pan, freqShift, binaural, lorenz, nestedLfo, sends)
    injectCommonMethods(synthsRef.current.kick, kickRouting, 800, createNestedLfo);
    // Phase 8 — Kick synth params setter
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

    // ── Snare routing via factory ──
    const snareRouting = createTrackRouting({
      filterFreq: 5000, filterType: 'lowpass',
      compressor, delayBus, reverbBus, spectralDelayBus, freezeBus, reverseBus,
    });
    const snareFilter = snareRouting.filter;

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
        snareRouting.delaySend.gain.rampTo(delayVal, 0.05);
        snareRouting.reverbSend.gain.rampTo(reverbVal, 0.05);
      },
      dispose: () => {
        snareSynth.dispose();
        snareBody?.dispose();
        snareRouting.dispose();
      }
    };
    // Inject common methods
    injectCommonMethods(synthsRef.current.snare, snareRouting, 1500, createNestedLfo);
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

    // ── Hat routing via factory ──
    const hatRouting = createTrackRouting({
      filterFreq: 5000, filterType: 'highpass',
      compressor, delayBus, reverbBus, spectralDelayBus, freezeBus, reverseBus,
    });
    const hatFilter = hatRouting.filter;

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
        hatRouting.delaySend.gain.rampTo(delayVal, 0.05);
        hatRouting.reverbSend.gain.rampTo(reverbVal, 0.05);
      },
      dispose: () => {
        hatSynth?.dispose();
        hatMetalSynth?.dispose();
        hatRouting.dispose();
      }
    };
    // Inject common methods
    injectCommonMethods(synthsRef.current.hat, hatRouting, 2000, createNestedLfo);
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

    // ── Cloud routing via factory ──
    const cloudRouting = createTrackRouting({
      filterFreq: 1000, filterType: 'lowpass',
      compressor, delayBus, reverbBus, spectralDelayBus, freezeBus, reverseBus,
    });
    const cloudFilter = cloudRouting.filter;

    // Cloud Analyser for Envelope Crossfeed (Phase 7E)
    const cloudAnalyser = new Tone.Analyser('waveform', 256);
    cloudFilter.connect(cloudAnalyser);
    cloudAnalyserRef.current = cloudAnalyser;

    // Preserve existing grainPlayer/bitCrusher before overwriting synthsRef
    const existingCloudGrainPlayer = synthsRef.current.cloud?.grainPlayer ?? null;
    const existingCloudBitCrusher = synthsRef.current.cloud?.bitCrusher ?? null;
    const existingCloudEnoPlayers = synthsRef.current.cloud?.enoPlayers ?? null;
    const existingCloudEnoMaster = synthsRef.current.cloud?.enoMaster ?? null;
    const existingCloudStartEno = synthsRef.current.cloud?.startEno ?? null;
    const existingCloudStopEno = synthsRef.current.cloud?.stopEno ?? null;

    // Cloud-specific pre-filter nodes: ducker + LFO
    const cloudDucker = new Tone.Gain(1).connect(cloudFilter);
    const cloudLFO = new Tone.LFO({
      frequency: 0.13,
      min: 200,
      max: 2000
    }).connect(cloudFilter.frequency).start();

    // Reconnect existing grainPlayer/bitCrusher to the new ducker
    if (existingCloudBitCrusher) {
      try {
        existingCloudBitCrusher.disconnect();
        existingCloudBitCrusher.connect(cloudDucker);
        existingCloudBitCrusher.connect(cloudRouting.delaySend);
        existingCloudBitCrusher.connect(cloudRouting.reverbSend);
      } catch {}
    }
    if (existingCloudEnoMaster) {
      try {
        existingCloudEnoMaster.disconnect();
        existingCloudEnoMaster.connect(cloudDucker);
      } catch {}
    }

    synthsRef.current.cloud = {
      filter: cloudFilter,
      ducker: cloudDucker,
      lfo: cloudLFO,
      sidechainInverter,
      sidechainBias,
      // Preserve sample-related refs
      grainPlayer: existingCloudGrainPlayer,
      bitCrusher: existingCloudBitCrusher,
      enoPlayers: existingCloudEnoPlayers,
      enoMaster: existingCloudEnoMaster,
      startEno: existingCloudStartEno,
      stopEno: existingCloudStopEno,
      setVolume: (vol: number) => {
        if (synthsRef.current.cloud.grainPlayer) {
          synthsRef.current.cloud.grainPlayer.volume.rampTo(Tone.gainToDb(vol), 0.05);
        }
      },
      setSends: (delayVal: number, reverbVal: number) => {
        cloudRouting.delaySend.gain.rampTo(delayVal, 0.05);
        cloudRouting.reverbSend.gain.rampTo(reverbVal, 0.05);
      },
      disposeSampler: () => {
        if (synthsRef.current.cloud.grainPlayer) { try { synthsRef.current.cloud.grainPlayer.dispose(); } catch {} synthsRef.current.cloud.grainPlayer = null; }
        if (synthsRef.current.cloud.bitCrusher) { try { synthsRef.current.cloud.bitCrusher.dispose(); } catch {} synthsRef.current.cloud.bitCrusher = null; }
        if (synthsRef.current.cloud.enoMaster) { try { synthsRef.current.cloud.enoMaster.dispose(); } catch {} synthsRef.current.cloud.enoMaster = null; }
        synthsRef.current.cloud.enoPlayers = null;
        synthsRef.current.cloud.startEno = null;
        synthsRef.current.cloud.stopEno = null;
      },
      dispose: () => {
        synthsRef.current.cloud?.disposeSampler?.();
        cloudAnalyser.dispose();
        cloudLFO.dispose();
        cloudDucker.dispose();
        cloudRouting.dispose();
      }
    };
    // Inject common methods (EQ, pan, freqShift, binaural, lorenz, nestedLfo, sends)
    injectCommonMethods(synthsRef.current.cloud, cloudRouting, 200, createNestedLfo);

    // Connect sidechain math to ducker gain
    sidechainInverter.connect(cloudDucker.gain);
    sidechainBias.connect(cloudDucker.gain);

    // ── Tone routing via factory ──
    const toneRouting = createTrackRouting({
      filterFreq: 2000, filterType: 'lowpass',
      compressor, delayBus, reverbBus, spectralDelayBus, freezeBus, reverseBus,
      delaySendInit: 0.15, reverbSendInit: 0.2,
    });
    const toneFilter = toneRouting.filter;
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
        toneRouting.delaySend.gain.rampTo(delayVal, 0.05);
        toneRouting.reverbSend.gain.rampTo(reverbVal, 0.05);
      },
      dispose: () => {
        toneMonoSynth.dispose();
        toneRouting.dispose();
      }
    };
    // Inject common methods
    injectCommonMethods(synthsRef.current.tone, toneRouting, 600, createNestedLfo);
    // Envelope Crossfeed injection (Phase 7E) — Cloud modulates Tone's filter
    synthsRef.current.tone.setCrossfeedFreq = (hz: number) => {
      toneFilter.frequency.rampTo(hz, 0.05);
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

  // createNestedLfo → imported from utils/audioRouting

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
        console.log('[ENO-DIAG] togglePlay: calling startEno', { hasStartEno: !!synthsRef.current.cloud?.startEno, cloudMode: cloudTrackStart?.cloudMode });
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

  // handleFileUpload, initCloudEno, handleCloudModeChange → useTrackState

  // handleSamplerParamChange → useTrackState

  // handleParamChange, handleSequencerAction, handleTonalAction, handleSlicerAction,
  // handlePercSynthParamChange, handleGetMarkovMatrix → useTrackState

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

  // handleClearSampler, handleLoadLayer2, handleClearLayer2, handleLayer2ParamChange → useTrackState

  const initializeOriginalSynth = (trackId: string, overrideSynthType?: string) => {
    const master = masterBusRef.current!;

    if (trackId === 'kick') {
      const routing = createTrackRouting({
        filterFreq: 2000, filterType: 'lowpass',
        compressor: master.compressor, delayBus: master.delayBus, reverbBus: master.reverbBus,
        spectralDelayBus: master.spectralDelayBus, freezeBus: master.freezeBus, reverseBus: master.reverseBus,
      });
      if (synthsRef.current.kickFollower) routing.eqLpf.connect(synthsRef.current.kickFollower);

      let kickBody = new Tone.MembraneSynth({
        pitchDecay: 0.05, octaves: 10, oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 }, volume: -2
      }).connect(routing.filter);
      let kickClick = new Tone.NoiseSynth({
        noise: { type: 'pink' as any },
        envelope: { attack: 0.001, decay: 0.01, sustain: 0 }, volume: -10
      }).connect(routing.filter);

      synthsRef.current.kick = {
        triggerAttackRelease: (note: string, duration: any, time: number, velocity: number) => {
          kickBody.triggerAttackRelease("C1", duration, time, velocity);
          kickClick.triggerAttackRelease(duration, time, velocity * 0.5);
          const dc = 800 + (velocity * 3000);
          if (isFinite(dc)) routing.filter.frequency.rampTo(dc, 0.02, time);
        },
        setVolume: (vol: number) => { const db = Tone.gainToDb(vol); kickBody.volume.rampTo(db - 2, 0.05); kickClick.volume.rampTo(db - 10, 0.05); },
        setSends: (d: number, r: number) => { routing.delaySend.gain.rampTo(d, 0.05); routing.reverbSend.gain.rampTo(r, 0.05); },
        dispose: () => { kickBody.dispose(); kickClick.dispose(); routing.dispose(); }
      };
      synthsRef.current.kick.setKickParams = (pitchDecay: number, octaves: number, decay: number, clickType: string) => {
        kickBody.set({ pitchDecay, octaves, envelope: { decay } });
        const currentType = (kickClick as any).noise?.type || 'pink';
        if (clickType !== currentType) {
          kickClick.dispose();
          kickClick = new Tone.NoiseSynth({ noise: { type: clickType as any }, envelope: { attack: 0.001, decay: 0.01, sustain: 0 }, volume: -10 }).connect(routing.filter);
        }
      };
      injectCommonMethods(synthsRef.current.kick, routing, 800, createNestedLfo);

    } else if (trackId === 'snare') {
      const routing = createTrackRouting({
        filterFreq: 5000, filterType: 'lowpass',
        compressor: master.compressor, delayBus: master.delayBus, reverbBus: master.reverbBus,
        spectralDelayBus: master.spectralDelayBus, freezeBus: master.freezeBus, reverseBus: master.reverseBus,
      });
      let snareSynth = new Tone.NoiseSynth({
        noise: { type: 'white' as any }, envelope: { attack: 0.001, decay: 0.2, sustain: 0 }, volume: -4
      }).connect(routing.filter);
      let snareBody: Tone.MembraneSynth | null = null;

      synthsRef.current.snare = {
        triggerAttackRelease: (duration: any, time: number, velocity: number) => {
          snareSynth.triggerAttackRelease(duration, time, velocity);
          if (snareBody) { try { snareBody.triggerAttackRelease("C2", duration, time, velocity * 0.6); } catch(e) {} }
          const dc = 1500 + (velocity * 5000);
          if (isFinite(dc)) routing.filter.frequency.rampTo(dc, 0.02, time);
        },
        setVolume: (vol: number) => { snareSynth.volume.rampTo(Tone.gainToDb(vol) - 4, 0.05); if (snareBody) snareBody.volume.rampTo(Tone.gainToDb(vol) - 6, 0.05); },
        setSends: (d: number, r: number) => { routing.delaySend.gain.rampTo(d, 0.05); routing.reverbSend.gain.rampTo(r, 0.05); },
        dispose: () => { snareSynth.dispose(); snareBody?.dispose(); routing.dispose(); }
      };
      synthsRef.current.snare.setSnareParams = (decay: number, noiseType: string) => {
        snareSynth.envelope.decay = decay;
        const currentType = (snareSynth as any).noise?.type || 'white';
        if (noiseType !== currentType) {
          snareSynth.dispose();
          snareSynth = new Tone.NoiseSynth({ noise: { type: noiseType as any }, envelope: { attack: 0.001, decay, sustain: 0 }, volume: -4 }).connect(routing.filter);
        }
      };
      synthsRef.current.snare.setSnareBody = (enabled: boolean, pitch: number, bodyDecay: number) => {
        if (enabled && !snareBody) {
          snareBody = new Tone.MembraneSynth({ pitchDecay: 0.08, octaves: 4, oscillator: { type: 'sine' }, envelope: { attack: 0.001, decay: bodyDecay, sustain: 0.01, release: 0.5 }, volume: -6 }).connect(routing.filter);
          snareBody.frequency.value = pitch;
        } else if (!enabled && snareBody) { snareBody.dispose(); snareBody = null; }
        else if (enabled && snareBody) { snareBody.frequency.value = pitch; snareBody.set({ envelope: { decay: bodyDecay } }); }
      };
      injectCommonMethods(synthsRef.current.snare, routing, 1500, createNestedLfo);

    } else if (trackId === 'hat') {
      const routing = createTrackRouting({
        filterFreq: 5000, filterType: 'highpass',
        compressor: master.compressor, delayBus: master.delayBus, reverbBus: master.reverbBus,
        spectralDelayBus: master.spectralDelayBus, freezeBus: master.freezeBus, reverseBus: master.reverseBus,
      });
      let hatSynth: Tone.NoiseSynth | null = new Tone.NoiseSynth({ noise: { type: 'white' as any }, envelope: { attack: 0.001, decay: 0.05, sustain: 0 }, volume: -2 }).connect(routing.filter);
      let hatMetalSynth: Tone.MetalSynth | null = null;
      let currentHatMode = 'noise';

      synthsRef.current.hat = {
        triggerAttackRelease: (duration: any, time: number, velocity: number) => {
          if (currentHatMode === 'metal' && hatMetalSynth) {
            const trackState = tracksRef.current.find(t => t.id === 'hat');
            hatMetalSynth.triggerAttackRelease(200, trackState?.hatDecay ?? 0.05, time, velocity);
          } else if (hatSynth) { hatSynth.triggerAttackRelease(duration, time, velocity); }
          const dc = 2000 + (velocity * 8000);
          if (isFinite(dc)) routing.filter.frequency.rampTo(dc, 0.02, time);
        },
        setVolume: (vol: number) => { const db = Tone.gainToDb(vol) - 2; if (hatSynth) hatSynth.volume.rampTo(db, 0.05); if (hatMetalSynth) hatMetalSynth.volume.rampTo(db, 0.05); },
        setSends: (d: number, r: number) => { routing.delaySend.gain.rampTo(d, 0.05); routing.reverbSend.gain.rampTo(r, 0.05); },
        dispose: () => { hatSynth?.dispose(); hatMetalSynth?.dispose(); routing.dispose(); }
      };
      synthsRef.current.hat.setHatMode = (mode: string, harmonicity: number, modIndex: number, resonance: number, decay: number, noiseType: string) => {
        if (mode === 'metal' && currentHatMode !== 'metal') {
          hatSynth?.dispose(); hatSynth = null;
          hatMetalSynth = new Tone.MetalSynth({ harmonicity, modulationIndex: modIndex, resonance, envelope: { attack: 0.001, decay, release: 0.1 }, volume: -2 }).connect(routing.filter);
          currentHatMode = 'metal';
        } else if (mode === 'noise' && currentHatMode !== 'noise') {
          hatMetalSynth?.dispose(); hatMetalSynth = null;
          hatSynth = new Tone.NoiseSynth({ noise: { type: noiseType as any }, envelope: { attack: 0.001, decay, sustain: 0 }, volume: -2 }).connect(routing.filter);
          currentHatMode = 'noise';
        } else if (mode === 'metal' && hatMetalSynth) {
          hatMetalSynth.set({ harmonicity, modulationIndex: modIndex, resonance, envelope: { decay } });
        } else if (mode === 'noise' && hatSynth) {
          hatSynth.envelope.decay = decay;
          const curType = (hatSynth as any).noise?.type || 'white';
          if (noiseType !== curType) { hatSynth.dispose(); hatSynth = new Tone.NoiseSynth({ noise: { type: noiseType as any }, envelope: { attack: 0.001, decay, sustain: 0 }, volume: -2 }).connect(routing.filter); }
        }
      };
      injectCommonMethods(synthsRef.current.hat, routing, 2000, createNestedLfo);

    } else if (trackId === 'tone') {
      if (toneRecordingState === 'recording' && mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
        setToneRecordingState('idle');
      }

      const routing = createTrackRouting({
        filterFreq: 2000, filterType: 'lowpass',
        compressor: master.compressor, delayBus: master.delayBus, reverbBus: master.reverbBus,
        spectralDelayBus: master.spectralDelayBus, freezeBus: master.freezeBus, reverseBus: master.reverseBus,
        delaySendInit: 0.15, reverbSendInit: 0.2,
      });
      toneFilterRef.current = routing.filter;
      if (recordingDestRef.current) {
        routing.filter.connect(recordingDestRef.current as unknown as Tone.ToneAudioNode);
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
        toneSynth = new Tone.FMSynth({ harmonicity: fmRatio, modulationIndex: fmIndex, oscillator: { type: 'sawtooth' }, modulation: { type: 'square' }, envelope: { attack: 0.005, decay: 0.3, sustain: 0.4, release: 0.8 }, modulationEnvelope: { attack: 0.06, decay: 0.2, sustain: 0.5, release: 0.8 }, volume: -6 }).connect(routing.filter);
        synthsRef.current.tone = {
          triggerAttackRelease: (note: string, duration: any, time: number, velocity: number) => { toneSynth.triggerAttackRelease(note, duration, time, velocity); const dc = 600 + (velocity * 4000); if (isFinite(dc)) routing.filter.frequency.rampTo(dc, 0.02, time); },
          setVolume: (vol: number) => { toneSynth.volume.rampTo(Tone.gainToDb(vol) - 6, 0.05); },
          setSends: (d: number, r: number) => { routing.delaySend.gain.rampTo(d, 0.05); routing.reverbSend.gain.rampTo(r, 0.05); },
          updateFmParams: (ratio: number, index: number) => { (toneSynth as Tone.FMSynth).harmonicity.value = ratio; (toneSynth as Tone.FMSynth).modulationIndex.value = index; },
          dispose: () => { toneSynth.dispose(); routing.dispose(); }
        };
      } else if (currentSynthType === 'add') {
        const oscillators: Tone.Oscillator[] = [];
        const gains: Tone.Gain[] = [];
        const outputGain = new Tone.Gain(0.6).connect(routing.filter);
        let currentFreq = 220;
        let currentBrightness = addBrightness;
        const buildPartials = (freq: number, nPartials: number, brightness: number) => {
          oscillators.forEach(o => { try { o.stop(); o.dispose(); } catch(e) {} });
          gains.forEach(g => g.dispose()); oscillators.length = 0; gains.length = 0;
          for (let i = 1; i <= nPartials; i++) {
            const osc = new Tone.Oscillator({ type: 'sine', frequency: freq * i, volume: -60 });
            const gain = new Tone.Gain(0);
            gain.gain.value = (1/i) + ((1/nPartials) - (1/i)) * brightness;
            osc.connect(gain); gain.connect(outputGain); oscillators.push(osc); gains.push(gain);
          }
          currentBrightness = brightness;
        };
        buildPartials(currentFreq, addPartials, addBrightness);
        synthsRef.current.tone = {
          triggerAttackRelease: (note: string, duration: any, time: number, velocity: number) => {
            const freq = Tone.Frequency(note).toFrequency(); currentFreq = freq;
            const at = 0.01; const dt = typeof duration === 'number' ? duration : Tone.Time(duration).toSeconds();
            // Rebuild partials each trigger — Tone.Oscillator can't restart after stop()
            buildPartials(freq, oscillators.length || addPartials, currentBrightness);
            oscillators.forEach((osc, i) => { osc.frequency.setValueAtTime(freq * (i + 1), time); osc.start(time); });
            outputGain.gain.cancelScheduledValues(time); outputGain.gain.setValueAtTime(0, time);
            outputGain.gain.linearRampToValueAtTime(0.6 * velocity, time + at);
            outputGain.gain.exponentialRampToValueAtTime(0.001, time + at + dt);
            oscillators.forEach(osc => { try { osc.stop(time + at + dt + 0.05); } catch(e) {} });
            const dc = 600 + velocity * 4000; if (isFinite(dc)) routing.filter.frequency.rampTo(dc, 0.02, time);
          },
          setVolume: (vol: number) => { outputGain.gain.rampTo(vol * 0.6, 0.05); },
          setSends: (d: number, r: number) => { routing.delaySend.gain.rampTo(d, 0.05); routing.reverbSend.gain.rampTo(r, 0.05); },
          updateAddParams: (nPartials: number, brightness: number) => {
            currentBrightness = brightness;
            if (nPartials !== oscillators.length) { buildPartials(currentFreq, nPartials, brightness); }
            else { gains.forEach((g, i) => { g.gain.rampTo((1/(i+1)) + ((1/nPartials) - (1/(i+1))) * brightness, 0.05); }); }
          },
          dispose: () => { oscillators.forEach(o => { try { o.stop(); o.dispose(); } catch(e) {} }); gains.forEach(g => g.dispose()); outputGain.dispose(); routing.dispose(); }
        };
        if (toneTrack && synthsRef.current.tone) { synthsRef.current.tone.setVolume(toneTrack.volume); synthsRef.current.tone.setSends(toneTrack.delaySend, toneTrack.reverbSend); }
      } else if (currentSynthType === 'pad') {
        const voices = toneTrack?.padVoices ?? 5; const detuneAmount = toneTrack?.padDetune ?? 30; const atkTime = toneTrack?.padAttack ?? 0.3;
        const padOscs: Tone.Oscillator[] = []; const padGains: Tone.Gain[] = [];
        const padMaster = new Tone.Gain(1 / voices).connect(routing.filter);
        for (let i = 0; i < voices; i++) {
          const osc = new Tone.Oscillator({ type: 'sawtooth', frequency: 220, volume: -6 }); const g = new Tone.Gain(0);
          const spread = voices > 1 ? (i - (voices - 1) / 2) / ((voices - 1) / 2) : 0;
          osc.detune.value = spread * detuneAmount; osc.connect(g); g.connect(padMaster); osc.start(); padOscs.push(osc); padGains.push(g);
        }
        let curPadAtk = atkTime;
        synthsRef.current.tone = {
          triggerAttackRelease: (note: string, duration: any, time: number, velocity: number) => {
            const freq = Tone.Frequency(note).toFrequency(); const dur = typeof duration === 'number' ? duration : Tone.Time(duration).toSeconds();
            padOscs.forEach(o => o.frequency.setValueAtTime(freq, time));
            padGains.forEach(g => { g.gain.cancelScheduledValues(time); g.gain.setValueAtTime(0, time); g.gain.linearRampToValueAtTime(velocity, time + curPadAtk); g.gain.setValueAtTime(velocity, time + Math.max(dur - 0.05, curPadAtk)); g.gain.linearRampToValueAtTime(0, time + dur); });
            const dc = 600 + velocity * 4000; if (isFinite(dc)) routing.filter.frequency.rampTo(dc, 0.02, time);
          },
          setVolume: (vol: number) => { padMaster.gain.rampTo((1 / padOscs.length) * vol, 0.05); },
          setSends: (d: number, r: number) => { routing.delaySend.gain.rampTo(d, 0.05); routing.reverbSend.gain.rampTo(r, 0.05); },
          updatePadParams: (nv: number, nd: number, na: number) => { padOscs.forEach((o, i) => { const sp = padOscs.length > 1 ? (i - (padOscs.length - 1) / 2) / ((padOscs.length - 1) / 2) : 0; o.detune.rampTo(sp * nd, 0.05); }); curPadAtk = na; },
          dispose: () => { padOscs.forEach(o => { try { o.stop(); o.dispose(); } catch(e) {} }); padGains.forEach(g => g.dispose()); padMaster.dispose(); routing.dispose(); }
        };
      } else if (currentSynthType === 'drone') {
        const fb = toneTrack?.droneFeedback ?? 0.88; const ff = toneTrack?.droneFilterFreq ?? 2000;
        const droneOsc = new Tone.Oscillator({ type: 'sine', frequency: 220, volume: -6 });
        const injectGain = new Tone.Gain(0); const droneMasterGain = new Tone.Gain(0.7);
        const feedbackDelay = new Tone.FeedbackDelay({ delayTime: 0.5, feedback: fb, wet: 1 });
        const loopFilter = new Tone.Filter({ frequency: ff, type: 'lowpass', rolloff: -12 });
        const droneLimiter = new Tone.Limiter(-3);
        droneOsc.connect(injectGain); injectGain.connect(feedbackDelay); feedbackDelay.connect(loopFilter);
        loopFilter.connect(droneLimiter); droneLimiter.connect(droneMasterGain); droneMasterGain.connect(routing.filter); droneOsc.start();
        synthsRef.current.tone = {
          triggerAttackRelease: (note: string, _d: any, time: number, velocity: number) => {
            droneOsc.frequency.setValueAtTime(Tone.Frequency(note).toFrequency(), time);
            injectGain.gain.cancelScheduledValues(time); injectGain.gain.setValueAtTime(0, time);
            injectGain.gain.linearRampToValueAtTime(velocity, time + 0.01); injectGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
            const dc = 600 + velocity * 4000; if (isFinite(dc)) routing.filter.frequency.rampTo(dc, 0.02, time);
          },
          setVolume: (vol: number) => { droneMasterGain.gain.rampTo(vol * 0.7, 0.05); },
          setSends: (d: number, r: number) => { routing.delaySend.gain.rampTo(d, 0.05); routing.reverbSend.gain.rampTo(r, 0.05); },
          updateDroneParams: (nf: number, nff: number) => { feedbackDelay.feedback.rampTo(nf, 0.1); loopFilter.frequency.rampTo(nff, 0.1); },
          dispose: () => { droneOsc.stop(); droneOsc.dispose(); injectGain.dispose(); droneMasterGain.dispose(); feedbackDelay.dispose(); loopFilter.dispose(); droneLimiter.dispose(); routing.dispose(); }
        };
      } else if (currentSynthType === 'ks') {
        const ksDecayAmt = toneTrack?.ksDecay ?? 0.97; const ksBright = toneTrack?.ksBrightness ?? 5000;
        const ksMaster = new Tone.Gain(1).connect(routing.filter);
        const ksDelay = new Tone.Delay({ delayTime: 0.01, maxDelay: 0.05 });
        const ksFilter = new Tone.Filter({ frequency: ksBright, type: 'lowpass', rolloff: -12 });
        const ksLimiter = new Tone.Limiter(-3); const ksFb = new Tone.Gain(ksDecayAmt);
        ksDelay.connect(ksFilter); ksFilter.connect(ksLimiter); ksLimiter.connect(ksFb); ksFb.connect(ksDelay); ksFilter.connect(ksMaster);
        synthsRef.current.tone = {
          triggerAttackRelease: (note: string, _dur: string | number, time: number, velocity = 0.8) => {
            const freq = Tone.Frequency(note).toFrequency(); ksDelay.delayTime.setValueAtTime(1 / freq, time);
            const rawCtx = Tone.context.rawContext as AudioContext; const bsz = Math.ceil(rawCtx.sampleRate * 0.05);
            const nb = rawCtx.createBuffer(1, bsz, rawCtx.sampleRate); const data = nb.getChannelData(0);
            for (let i = 0; i < bsz; i++) data[i] = (Math.random() - 0.5) * 2 * velocity;
            const ns = rawCtx.createBufferSource(); ns.buffer = nb; ns.connect((ksDelay as any).input); ns.start(time); ns.stop(time + 0.05);
            const dc = 600 + velocity * 4000; if (isFinite(dc)) routing.filter.frequency.rampTo(dc, 0.02, time);
          },
          setVolume: (vol: number) => { ksMaster.gain.rampTo(Tone.dbToGain(vol) * 0.8, 0.05); },
          setSends: (d: number, r: number) => { routing.delaySend.gain.rampTo(d, 0.05); routing.reverbSend.gain.rampTo(r, 0.05); },
          updateKsParams: (nd: number, nb: number) => { ksFb.gain.rampTo(nd, 0.1); ksFilter.frequency.rampTo(nb, 0.1); },
          dispose: () => { ksDelay.dispose(); ksFilter.dispose(); ksLimiter.dispose(); ksFb.dispose(); ksMaster.dispose(); routing.dispose(); }
        };
      } else if (currentSynthType === 'modal') {
        const MODAL_BODIES = {
          bell: [{ ratio: 1, decay: 3, amp: 1 }, { ratio: 2.756, decay: 2, amp: 0.67 }, { ratio: 5.404, decay: 1.5, amp: 0.45 }, { ratio: 8.933, decay: 1, amp: 0.28 }],
          plate: [{ ratio: 1, decay: 2, amp: 1 }, { ratio: 1.414, decay: 1.5, amp: 0.8 }, { ratio: 2, decay: 1.2, amp: 0.6 }, { ratio: 2.449, decay: 0.8, amp: 0.4 }, { ratio: 3, decay: 0.5, amp: 0.25 }],
          string: [{ ratio: 1, decay: 2.5, amp: 1 }, { ratio: 2, decay: 2, amp: 0.5 }, { ratio: 3, decay: 1.5, amp: 0.33 }, { ratio: 4, decay: 1, amp: 0.25 }, { ratio: 5, decay: 0.8, amp: 0.2 }],
        } as const;
        const modalMaster = new Tone.Gain(1).connect(routing.filter);
        synthsRef.current.tone = {
          triggerAttackRelease: (note: string, _dur: string | number, time: number, velocity = 0.8) => {
            const freq = Tone.Frequency(note).toFrequency();
            const tm = tracksRef.current.find(t => t.id === 'tone');
            const bodyKey = (tm?.modalBody ?? 'bell') as keyof typeof MODAL_BODIES;
            const body = MODAL_BODIES[bodyKey] || MODAL_BODIES.bell;
            const dm = tm?.modalDecay ?? 1.0;
            body.forEach(mode => {
              const osc = new Tone.Oscillator({ type: 'sine' }); const env = new Tone.Gain(0);
              const td = mode.decay * dm;
              osc.frequency.value = freq * mode.ratio;
              env.gain.setValueAtTime(mode.amp * velocity, time);
              env.gain.exponentialRampToValueAtTime(0.0001, time + td);
              osc.connect(env); env.connect(modalMaster); osc.start(time); osc.stop(time + td + 0.1);
              setTimeout(() => { try { env.dispose(); } catch {} }, (td + 0.2) * 1000);
            });
            const dc = 600 + velocity * 4000; if (isFinite(dc)) routing.filter.frequency.rampTo(dc, 0.02, time);
          },
          setVolume: (vol: number) => { modalMaster.gain.rampTo(Tone.dbToGain(vol) * 0.8, 0.05); },
          setSends: (d: number, r: number) => { routing.delaySend.gain.rampTo(d, 0.05); routing.reverbSend.gain.rampTo(r, 0.05); },
          dispose: () => { modalMaster.dispose(); routing.dispose(); }
        };
      } else if (currentSynthType === 'ambient') {
        const BASE_DURATIONS = [2.3, 3.7, 5.1, 7.3]; const NL = BASE_DURATIONS.length;
        const ambMaster = new Tone.Gain(toneTrack?.ambientVolume ?? 0.6).connect(routing.filter);
        const ambOscs: Tone.Oscillator[] = []; const ambGains: Tone.Gain[] = [];
        const ambRepeatIds: number[] = []; let ambStarted = false;
        for (let i = 0; i < NL; i++) { const o = new Tone.Oscillator({ type: 'sine' }); const g = new Tone.Gain(0); o.connect(g); g.connect(ambMaster); o.start(); ambOscs.push(o); ambGains.push(g); }
        const assignFreqs = () => { const ct = tracksRef.current.find(t => t.id === 'tone'); if (!ct?.noteIndices?.length) return; for (let i = 0; i < NL; i++) { const ni = ct.noteIndices[Math.floor(Math.random() * ct.noteIndices.length)]; ambOscs[i].frequency.value = noteIndexToFreq(ct.rootNote, ct.scaleId, ni); } };
        const schedLoop = (li: number) => { const ct = tracksRef.current.find(t => t.id === 'tone'); const dur = BASE_DURATIONS[li] * (ct?.ambientSpeed ?? 1.0); const id = Tone.getTransport().scheduleRepeat((time) => { if (!ambStarted) return; ambGains[li].gain.cancelScheduledValues(time); ambGains[li].gain.setValueAtTime(0, time); ambGains[li].gain.linearRampToValueAtTime(0.7, time + 0.15); ambGains[li].gain.setValueAtTime(0.7, time + dur - 0.3); ambGains[li].gain.linearRampToValueAtTime(0, time + dur); }, dur, Tone.now() + li * 0.3); ambRepeatIds.push(id); };
        const stopLoops = () => { ambStarted = false; ambRepeatIds.forEach(id => Tone.getTransport().clear(id)); ambRepeatIds.length = 0; ambGains.forEach(g => { g.gain.cancelScheduledValues(Tone.now()); g.gain.rampTo(0, 0.1); }); };
        synthsRef.current.tone = {
          triggerAttackRelease: (_n: string, _d: string | number, _t: number, _v = 0.8) => { if (!ambStarted) { ambStarted = true; assignFreqs(); for (let i = 0; i < NL; i++) schedLoop(i); } else { assignFreqs(); } },
          setVolume: (vol: number) => { const safeVol = (typeof vol === 'number' && isFinite(vol)) ? vol : 0; ambMaster.gain.rampTo(Tone.dbToGain(safeVol) * 0.6, 0.05); },
          setSends: (d: number, r: number) => { routing.delaySend.gain.rampTo(d, 0.05); routing.reverbSend.gain.rampTo(r, 0.05); },
          stop: () => { stopLoops(); },
          dispose: () => { stopLoops(); ambOscs.forEach(o => { o.stop(); o.dispose(); }); ambGains.forEach(g => g.dispose()); ambMaster.dispose(); routing.dispose(); }
        };
      } else if (currentSynthType === 'wf') {
        const wfOsc = new Tone.Oscillator({ type: 'triangle', frequency: 220, volume: -6 });
        const waveFolder = new Tone.WaveShaper(buildWavefoldCurve(wfAmount, wfSymmetry), 65536);
        const preFoldGain = new Tone.Gain(1 + wfAmount * 0.3);
        const lpgFilter = new Tone.Filter({ type: 'lowpass', frequency: 200, Q: 3, rolloff: -24 });
        const lpgVca = new Tone.Gain(0);
        wfOsc.connect(preFoldGain); preFoldGain.connect(waveFolder); waveFolder.connect(lpgFilter); lpgFilter.connect(lpgVca); lpgVca.connect(routing.filter);
        synthsRef.current.tone = {
          triggerAttackRelease: (note: string, duration: any, time: number, velocity: number) => {
            wfOsc.frequency.setValueAtTime(Tone.Frequency(note).toFrequency(), time);
            const at = 0.005; const dt = typeof duration === 'number' ? duration * 1.2 : Tone.Time(duration).toSeconds() * 1.2;
            wfOsc.start(time); wfOsc.stop(time + at + dt + 0.05);
            lpgVca.gain.cancelScheduledValues(time); lpgVca.gain.setValueAtTime(0, time); lpgVca.gain.linearRampToValueAtTime(velocity, time + at); lpgVca.gain.exponentialRampToValueAtTime(0.001, time + at + dt);
            const fFreq = vactrolfiltFreq(velocity); lpgFilter.frequency.cancelScheduledValues(time); lpgFilter.frequency.setValueAtTime(200, time); lpgFilter.frequency.exponentialRampToValueAtTime(fFreq, time + at * 1.5); lpgFilter.frequency.exponentialRampToValueAtTime(200, time + at * 1.5 + dt * 1.3);
            const dc = 600 + velocity * 4000; if (isFinite(dc)) routing.filter.frequency.rampTo(dc, 0.02, time);
          },
          setVolume: (vol: number) => { wfOsc.volume.rampTo(Tone.gainToDb(vol) - 6, 0.05); },
          setSends: (d: number, r: number) => { routing.delaySend.gain.rampTo(d, 0.05); routing.reverbSend.gain.rampTo(r, 0.05); },
          updateWfParams: (a: number, s: number) => { waveFolder.curve = buildWavefoldCurve(a, s); preFoldGain.gain.rampTo(1 + a * 0.3, 0.05); },
          dispose: () => { wfOsc.stop().dispose(); waveFolder.dispose(); preFoldGain.dispose(); lpgFilter.dispose(); lpgVca.dispose(); routing.dispose(); }
        };
      } else {
        toneSynth = new Tone.MonoSynth({ oscillator: { type: 'sawtooth' }, filter: { Q: 6, type: 'lowpass', rolloff: -24 }, envelope: { attack: 0.005, decay: 0.3, sustain: 0.4, release: 0.8 }, filterEnvelope: { attack: 0.06, decay: 0.2, sustain: 0.5, release: 0.8, baseFrequency: 200, octaves: 4 }, volume: -6 }).connect(routing.filter);
        synthsRef.current.tone = {
          triggerAttackRelease: (note: string, duration: any, time: number, velocity: number) => { toneSynth.triggerAttackRelease(note, duration, time, velocity); const dc = 600 + (velocity * 4000); if (isFinite(dc)) routing.filter.frequency.rampTo(dc, 0.02, time); },
          setVolume: (vol: number) => { toneSynth.volume.rampTo(Tone.gainToDb(vol) - 6, 0.05); },
          setSends: (d: number, r: number) => { routing.delaySend.gain.rampTo(d, 0.05); routing.reverbSend.gain.rampTo(r, 0.05); },
          dispose: () => { toneSynth.dispose(); routing.dispose(); }
        };
      }

      // Audio-Rate Modulation — available for all tonal synth modes
      const arRate = toneTrack?.arRate ?? 80; const arDepth = toneTrack?.arDepth ?? 0;
      const arLFO = new Tone.Oscillator({ type: 'sine', frequency: arRate });
      const arGain = new Tone.Gain(arDepth);
      arLFO.connect(arGain); arGain.connect(routing.filter.frequency);
      let arRunning = arDepth > 0; if (arRunning) arLFO.start();
      const existingDispose = synthsRef.current.tone.dispose;
      synthsRef.current.tone.updateArParams = (rate: number, depth: number) => {
        arLFO.frequency.rampTo(rate, 0.05); arGain.gain.rampTo(depth, 0.05);
        if (depth > 0 && !arRunning) { arLFO.start(); arRunning = true; }
        if (depth === 0 && arRunning) { arLFO.stop(); arRunning = false; }
      };
      synthsRef.current.tone.dispose = () => { try { arLFO.stop(); arLFO.dispose(); } catch(e) {} arGain.dispose(); existingDispose(); };

      // Common methods + tone-specific
      injectCommonMethods(synthsRef.current.tone, routing, 600, createNestedLfo);
      synthsRef.current.tone.setCrossfeedFreq = (hz: number) => { routing.filter.frequency.rampTo(hz, 0.05); };
    }

    // Restore persisted state
    restoreTrackState(synthsRef, tracksRef, trackId);
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

  // ── Ref injection: wire audio functions into useTrackState ──
  initOrigSynthRef.current = (trackId: string, overrideSynthType?: string) => {
    if (trackId === 'tone' && toneRecordingState === 'recording' && mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setToneRecordingState('idle');
    }
    initializeOriginalSynth(trackId, overrideSynthType);
    if (trackId === 'tone' && recordingDestRef.current && toneFilterRef.current) {
      toneFilterRef.current.connect(recordingDestRef.current as unknown as Tone.ToneAudioNode);
    }
  };
  startLorenzRafRef.current = startLorenzRaf;

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
                    onClick={() => { setIsSavingPreset(true); }}
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
