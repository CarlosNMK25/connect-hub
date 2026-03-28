import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import * as Tone from 'tone';
import { Atom, HelpCircle, X, Zap } from 'lucide-react';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import { EuclideanTrack } from './EuclideanTrack';
import { SongModePanel } from './SongModePanel';
import { SequencerFooter } from './SequencerFooter';
import { StudyTooltipPortal } from './StudyTooltipPortal';
import { LibraryPanel } from './LibraryPanel';
import { SyncPanel } from './SyncPanel';
import { SpectrumAnalyzer } from './SpectrumAnalyzer';
import { HeaderBar } from './HeaderBar';
import { GlobalControls } from './GlobalControls';
import { AdvancedFxPanel } from './AdvancedFxPanel';
import { VisualMonitors } from './VisualMonitors';
import { EngineRoom, type LogEntry } from './EngineRoom';
import { PatternSpace } from './PatternSpace';
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
import { useSequencer, type SongModeConfig } from '../../hooks/useSequencer';
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
    extractSceneData, applySceneData, handleSaveScene,
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
  // ═══ Song Mode: onChainAdvance ref (avoids stale closures) ═══
  const onChainAdvanceRef = useRef<() => void>(() => {});
  const chainRef = useRef(chain);
  const chainPositionRef = useRef(chainPosition);
  useEffect(() => { chainRef.current = chain; }, [chain]);
  useEffect(() => { chainPositionRef.current = chainPosition; }, [chainPosition]);

  onChainAdvanceRef.current = () => {
    const currentChain = chainRef.current;
    const currentPos = chainPositionRef.current;
    const nextPos = (currentPos + 1) % currentChain.length;
    setChainPosition(nextPos);
    const nextScene = currentChain[nextPos].scene - 1;
    setTracks(prevTracks => prevTracks.map(t => {
      const newScenes = [...t.scenes];
      newScenes[t.activeScene] = extractSceneData(t);
      let updated = { ...t, scenes: newScenes, activeScene: nextScene };
      if (newScenes[nextScene]) {
        updated = applySceneData(updated, newScenes[nextScene]!);
      }
      return updated;
    }));
  };

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
    songModeConfig: { enabled: songModeEnabled, view: songModeView, chain, chainPosition },
    mcm: (() => {
      const rhythmicTracks = tracks.filter(t => t.id !== 'cloud');
      if (rhythmicTracks.length === 0) return 1;
      return lcmArray(rhythmicTracks.map(t => t.steps));
    })(),
    onChainAdvanceRef,
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
      <HeaderBar
        audioContextState={audioContextState}
        handleStartAudio={handleStartAudio}
        isPlaying={isPlaying}
        togglePlay={togglePlay}
        isStudyMode={isStudyMode}
        setIsStudyMode={setIsStudyMode}
        studyVoice={studyVoice}
        setStudyVoice={setStudyVoice}
        setIsThesisOpen={setIsThesisOpen}
        showControls={showControls}
        setShowControls={setShowControls}
        showVisuals={showVisuals}
        setShowVisuals={setShowVisuals}
        showSync={showSync}
        setShowSync={setShowSync}
        showLibrary={showLibrary}
        setShowLibrary={setShowLibrary}
        showEngine={showEngine}
        setShowEngine={setShowEngine}
        showPatternSpace={showPatternSpace}
        setShowPatternSpace={setShowPatternSpace}
        songModeEnabled={songModeEnabled}
        setSongModeEnabled={setSongModeEnabled}
        globalRecordingState={globalRecordingState}
        handleGlobalArmOrRecord={handleGlobalArmOrRecord}
      />

      {/* ═══ SONG MODE CHAIN PANEL ═══ */}
      {songModeEnabled && (
        <div className="mt-6">
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
        </div>
      )}

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
                  <GlobalControls
                    temporalityMode={temporalityMode}
                    setTemporalityMode={setTemporalityMode}
                    fxHighPass={fxHighPass}
                    setFxHighPass={setFxHighPass}
                    fxLowPass={fxLowPass}
                    setFxLowPass={setFxLowPass}
                    reverbMix={reverbMix}
                    setReverbMix={setReverbMix}
                    delayMix={delayMix}
                    setDelayMix={setDelayMix}
                    delayFeedback={delayFeedback}
                    setDelayFeedback={setDelayFeedback}
                    bpm={bpm}
                    setBpm={setBpm}
                    jitter={jitter}
                    setJitter={setJitter}
                    swing={swing}
                    setSwing={setSwing}
                    dynamics={dynamics}
                    setDynamics={setDynamics}
                    mcm={mcm}
                    showMM={showMM}
                    setShowMM={setShowMM}
                    mmHistory={mmHistory}
                    METRIC_MODULATION_RATIOS={METRIC_MODULATION_RATIOS}
                    handleMetricModulation={handleMetricModulation}
                    handleMetricModulationReset={handleMetricModulationReset}
                    logChange={logChange}
                    logSliderChange={logSliderChange}
                    formatEclipseTime={formatEclipseTime}
                    isStudyMode={isStudyMode}
                    setHoveredGlobalParam={setHoveredGlobalParam}
                    setHoveredGlobalEl={setHoveredGlobalEl}
                  />
                  <AdvancedFxPanel
                    activeFxPanel={activeFxPanel}
                    setActiveFxPanel={setActiveFxPanel}
                    gatedEnabled={gatedEnabled}
                    setGatedEnabled={setGatedEnabled}
                    gatedThreshold={gatedThreshold}
                    setGatedThreshold={setGatedThreshold}
                    reverseEnabled={reverseEnabled}
                    setReverseEnabled={setReverseEnabled}
                    reverseDecay={reverseDecay}
                    setReverseDecay={setReverseDecay}
                    freezeEnabled={freezeEnabled}
                    setFreezeEnabled={setFreezeEnabled}
                    freezeFeedback={freezeFeedback}
                    setFreezeFeedback={setFreezeFeedback}
                    freezeFilterFreq={freezeFilterFreq}
                    setFreezeFilterFreq={setFreezeFilterFreq}
                    crossfeedEnabled={crossfeedEnabled}
                    setCrossfeedEnabled={setCrossfeedEnabled}
                    crossfeedBase={crossfeedBase}
                    setCrossfeedBase={setCrossfeedBase}
                    crossfeedDepth={crossfeedDepth}
                    setCrossfeedDepth={setCrossfeedDepth}
                    spectralDelayEnabled={spectralDelayEnabled}
                    setSpectralDelayEnabled={setSpectralDelayEnabled}
                    spectralDelayWet={spectralDelayWet}
                    setSpectralDelayWet={setSpectralDelayWet}
                    spectralDelayLowTime={spectralDelayLowTime}
                    setSpectralDelayLowTime={setSpectralDelayLowTime}
                    spectralDelayMidTime={spectralDelayMidTime}
                    setSpectralDelayMidTime={setSpectralDelayMidTime}
                    spectralDelayHighTime={spectralDelayHighTime}
                    setSpectralDelayHighTime={setSpectralDelayHighTime}
                    isStudyMode={isStudyMode}
                    setHoveredGlobalParam={setHoveredGlobalParam}
                    setHoveredGlobalEl={setHoveredGlobalEl}
                  />
                </div>
              )}

              {showVisuals && (
                <VisualMonitors
                  jitter={jitter}
                  lastHit={lastHit}
                  isStudyMode={isStudyMode}
                  setHoveredGlobalParam={setHoveredGlobalParam}
                  setHoveredGlobalEl={setHoveredGlobalEl}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Pattern Synchrony & Phase Radar */}
      {showSync && (
        <SyncPanel
          tracks={tracks}
          globalStep={globalStep}
          isPlaying={isPlaying}
          mcm={mcm}
          progress={progress}
          entropy={entropy}
          syncImpacts={syncImpacts}
          eclipseDisplay={eclipseDisplay}
          eclipseFlash={eclipseFlash}
          hitRateData={hitRateData}
          hitRateColor={hitRateColor}
          uiStats={uiStats}
          driftOffsets={driftOffsets}
          syncAnalysisOpen={syncAnalysisOpen}
          setSyncAnalysisOpen={setSyncAnalysisOpen}
          isDjMode={isDjMode}
          setIsDjMode={setIsDjMode}
          handlePhaseSync={handlePhaseSync}
          phaseBufferRef={phaseBufferRef}
          phaseBufferHeadRef={phaseBufferHeadRef}
          PHASE_BUFFER_SIZE={PHASE_BUFFER_SIZE}
          eclipseHistoryRef={eclipseHistoryRef}
          bpm={bpm}
          temporalityMode={temporalityMode}
          jitter={jitter}
          swing={swing}
          mmHistory={mmHistory}
          isStudyMode={isStudyMode}
          setHoveredGlobalParam={setHoveredGlobalParam}
          setHoveredGlobalEl={setHoveredGlobalEl}
        />
      )}

      {/* Library Panel */}
      {showLibrary && (
        <LibraryPanel
          userPresets={userPresets}
          hoveredPreset={hoveredPreset}
          setHoveredPreset={setHoveredPreset}
          isSavingPreset={isSavingPreset}
          setIsSavingPreset={setIsSavingPreset}
          newPresetName={newPresetName}
          setNewPresetName={setNewPresetName}
          importError={importError}
          importInputRef={importInputRef}
          applyPreset={applyPreset}
          injectPattern={injectPattern}
          applyUserPreset={applyUserPreset}
          handleSaveUserPreset={handleSaveUserPreset}
          handleDeleteUserPreset={handleDeleteUserPreset}
          handleExportCurrent={handleExportCurrent}
          handleImportPreset={handleImportPreset}
        />
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
               onSaveScene={handleSaveScene}
            />
          </div>
        ))}
      </div>





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
