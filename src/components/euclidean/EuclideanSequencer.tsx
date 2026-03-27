import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import * as Tone from 'tone';
import { Play, Square, Sliders, Activity, Zap, Eye, EyeOff, Disc, ChevronLeft, ChevronRight, Info, HelpCircle, X, ChevronDown, ChevronUp, Layers, Target, Atom, Power, Settings, Save, Upload, Download, Trash2 } from 'lucide-react';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import { EuclideanTrack } from './EuclideanTrack';
import { SongModePanel } from './SongModePanel';
import { SequencerFooter } from './SequencerFooter';
import { StudyTooltipPortal } from './StudyTooltipPortal';
import { LibraryPanel } from './LibraryPanel';
import { SyncPanel } from './SyncPanel';
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
import { useAudioEngine, type MasterBusType } from '../../hooks/useAudioEngine';
import { useSequencer } from '../../hooks/useSequencer';
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
  const [eclipseFlash, setEclipseFlash] = useState(false);
  const eclipseRef = useRef(false);
  const [syncAnalysisOpen, setSyncAnalysisOpen] = useState(false);
  const eclipseHistoryRef = useRef<{ time: string; mcm: number; bpm: number }[]>([]);
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
  const lorenzRafRef = useRef<number>(0);
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
  // ═══ Sequencer Hook ═══
  const {
    globalStep, lastHit, uiStats,
    togglePlay, handlePhaseSync,
    phaseBufferRef, phaseBufferHeadRef, PHASE_BUFFER_SIZE,
    toneRecordingState, cloudRecordingState, globalRecordingState,
    handleArmOrRecord, handleCloudArmOrRecord, handleGlobalArmOrRecord,
  } = useSequencer({
    synthsRef, masterBusRef, loopRef, lorenzRafRef,
    tracksRef, tracks,
    bpm, jitter, swing, dynamics, temporalityMode,
    isPlaying, setIsPlaying,
    setTracks, setDriftOffsets,
    startLorenzRaf, logChange,
    toneFilterRef, initializeOriginalSynthBase,
    updateMarkovMatrix,
    initOrigSynthRef, startLorenzRafRef,
    caStateRef, caEvolveCycleRef, pendingCARef, pendingMutationsRef,
    markovLastNoteRef, markovAnchorCountRef, markovMatrixRef, markovNotesRef,
    driftAccumulatorRef, rrNoteIndexRef, sliceBoundariesRef,
  });





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




  // togglePlay, handlePhaseSync → useSequencer




  // Recording handlers → useSequencer




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

  // Ref injection → useSequencer

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
        <SongModePanel
          songModeView={songModeView}
          setSongModeView={setSongModeView}
          syncAllScenes={syncAllScenes}
          setSyncAllScenes={setSyncAllScenes}
          chain={chain}
          setChain={setChain}
          chainPosition={chainPosition}
          setChainPosition={setChainPosition}
        />
      )}




      <SequencerFooter tracks={tracks} isPlaying={isPlaying} />
      <ThesisDrawer isOpen={isThesisOpen} onClose={() => setIsThesisOpen(false)} />
      <StudyTooltipPortal
        isStudyMode={isStudyMode}
        hoveredGlobalParam={hoveredGlobalParam}
        hoveredGlobalEl={hoveredGlobalEl}
        studyVoice={studyVoice}
      />
    </div>
  );
};
