import { useState, useRef, useMemo, useCallback, type MutableRefObject } from 'react';
import { bjorklund, rotate } from '../utils/bjorklund';
import { lcmArray } from '../utils/math';
import { PRESETS, ScenePreset, TrackPreset } from '../constants/presets';
import { UserPreset, loadUserPresets, saveUserPresets, exportPresetAsJson, importPresetFromFile, userPresetToScenePreset } from '../utils/userPresets';
import type { TemporalityMode } from '../utils/temporality';
import type { MarkovStyle } from '../utils/markovGenerator';

// Re-export for convenience
export { userPresetToScenePreset };

/** Minimal track shape needed by the preset manager */
export interface PresetTrackState {
  id: string;
  steps: number;
  pulses: number;
  offset: number;
  probabilities: number[];
  chaosEnabled: boolean;
  entropy: number;
  evolveEnabled: boolean;
  mutationRate: number;
  mutationSpeed: number;
  volume: number;
  delaySend: number;
  reverbSend: number;
  ratchet: number;
  isTonal: boolean;
  rootNote: number;
  scaleId: string;
  octaveRange: number;
  noteIndices: number[];
  synthType: string;
  fmRatio?: number;
  fmIndex?: number;
  wfAmount?: number;
  wfSymmetry?: number;
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
  ambientVolume?: number;
  ambientSpeed?: number;
  cloudMode?: 'granular' | 'eno';
  enoSpeed?: number;
  rrEnabled?: boolean;
  rrAmount?: number;
  driftEnabled?: boolean;
  driftRate?: number;
  noteMode?: 'euclidean' | 'markov';
  markovStyle?: MarkovStyle;
  markovTemperature?: number;
  markovMemory?: 1 | 2;
  markovAnchor?: number;
  patternMode?: 'euclidean' | 'lsystem' | 'ca';
  lsSeed?: string;
  lsRuleA?: string;
  lsIterations?: number;
  lsRotation?: number;
  caRule?: number;
  caSeed?: string;
  caDensity?: number;
  caSpeed?: number;
  layer2Filename?: string;
  layer2Blend?: number;
  layer2Pitch?: number;
  layer2Offset?: number;
  layer2FilterFreq?: number;
  layer2Reverse?: boolean;
  layer2StretchEnabled?: boolean;
  layer2StretchRate?: number;
  lorenzEnabled?: boolean;
  lorenzDepth?: number;
  lorenzTarget?: 'filter' | 'volume';
  lorenzSpeed?: number;
  nestedLfoEnabled?: boolean;
  nestedLfoRate1?: number;
  nestedLfoRate2?: number;
  nestedLfoDepth?: number;
  slicerEnabled?: boolean;
  sliceCount?: number;
  stretchEnabled?: boolean;
  stretchRate?: number;
  eqEnabled?: boolean;
  eqHpfFreq?: number;
  eqLpfFreq?: number;
  pan?: number;
  freqShiftEnabled?: boolean;
  freqShift?: number;
  spectralDelaySend?: number;
  mode?: 'GATE' | 'TRIGGER' | 'ONE-SHOT';
  freezeSend?: number;
  reverseSend?: number;
  extremeLoopEnabled?: boolean;
  extremeLoopSize?: number;
  extremeLoopPoint?: number;
  binauralEnabled?: boolean;
  binauralAzimuth?: number;
  binauralDistance?: number;
  kickPitchDecay?: number;
  kickOctaves?: number;
  kickDecay?: number;
  kickClickType?: string;
  hatMode?: string;
  hatHarmonicity?: number;
  hatModIndex?: number;
  hatResonance?: number;
  hatDecay?: number;
  hatNoiseType?: string;
  snareDecay?: number;
  snareNoiseType?: string;
  snareBodyEnabled?: boolean;
  snareBodyPitch?: number;
  snareBodyDecay?: number;
  hits: number;
  misses: number;
  [key: string]: any;
}

export interface UsePresetManagerParams {
  tracks: PresetTrackState[];
  setTracks: React.Dispatch<React.SetStateAction<any[]>>;
  bpm: number;
  setBpm: (v: number) => void;
  jitter: number;
  setJitter: (v: number) => void;
  swing: number;
  setSwing: (v: number) => void;
  dynamics: number;
  setDynamics: (v: number) => void;
  temporalityMode: string;
  setTemporalityMode: (v: TemporalityMode) => void;
  setMmHistory: React.Dispatch<React.SetStateAction<any[]>>;
  logChange: (action: string, deltas?: string[]) => void;
  updateTrackPattern: (t: any) => any;
  updateMarkovMatrix: (t: any) => void;
  synthsRef: MutableRefObject<{ [key: string]: any }>;
  tracksRef: MutableRefObject<any[]>;
  mcm: number;
}

export function usePresetManager(params: UsePresetManagerParams) {
  const {
    tracks, setTracks,
    bpm, setBpm, jitter, setJitter, swing, setSwing,
    dynamics, setDynamics, temporalityMode, setTemporalityMode,
    setMmHistory, logChange, updateTrackPattern, updateMarkovMatrix,
    synthsRef, tracksRef, mcm,
  } = params;

  // --- State ---
  const [userPresets, setUserPresets] = useState<UserPreset[]>(() => loadUserPresets());
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [hoveredPreset, setHoveredPreset] = useState<ScenePreset | null>(null);

  // --- Preview patterns ---
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
    } else if (hoveredPreset.type === 'atomic' && (hoveredPreset as any).config) {
      const { pulses, steps, offset } = (hoveredPreset as any).config;
      const pattern = rotate(bjorklund(pulses || 0, steps || 16), offset || 0);
      tracks.forEach(track => {
        previews[track.id] = pattern;
      });
    }

    return previews;
  }, [hoveredPreset, tracks]);

  // --- Apply factory preset ---
  const applyPreset = useCallback((preset: ScenePreset) => {
    setActivePresetId(preset.id);
    if (preset.type === 'master' && preset.tracks) {
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

      if (preset.jitter !== undefined) setJitter(preset.jitter);
      if (preset.swing !== undefined) setSwing(preset.swing);
      if (preset.dynamics !== undefined) setDynamics(preset.dynamics);

      if (preset.temporalityMode) {
        setTemporalityMode(preset.temporalityMode as TemporalityMode);
      } else {
        setTemporalityMode('grid');
      }

      setTracks((prev: any[]) => prev.map((t: any) => {
        const config = preset.tracks![t.id];
        if (!config) return t;

        let newTrack = { ...t };
        if (config.steps !== undefined) newTrack.steps = config.steps;
        if (config.pulses !== undefined) newTrack.pulses = config.pulses;
        if (config.offset !== undefined) newTrack.offset = config.offset;

        if (config.ratchet !== undefined) newTrack.ratchet = config.ratchet;

        if (config.chaosEnabled !== undefined) newTrack.chaosEnabled = config.chaosEnabled;
        else newTrack.chaosEnabled = false;
        if (config.entropy !== undefined) newTrack.entropy = config.entropy;

        if (config.evolveEnabled !== undefined) newTrack.evolveEnabled = config.evolveEnabled;
        else newTrack.evolveEnabled = false;
        if (config.mutationRate !== undefined) newTrack.mutationRate = config.mutationRate;
        if (config.mutationSpeed !== undefined) newTrack.mutationSpeed = config.mutationSpeed;

        if (config.baseProbability !== undefined) {
          newTrack.probabilities = new Array(64).fill(config.baseProbability);
        }

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

        if (config.rootNote !== undefined) newTrack.rootNote = config.rootNote;
        if (config.scaleId !== undefined) newTrack.scaleId = config.scaleId;
        if (config.octaveRange !== undefined) newTrack.octaveRange = config.octaveRange;
        if (config.noteIndices !== undefined) newTrack.noteIndices = [...config.noteIndices];

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

        newTrack.hits = 0;
        newTrack.misses = 0;

        return updateTrackPattern(newTrack);
      }));
    }
  }, [tracks, mcm, logChange, setBpm, setMmHistory, setJitter, setSwing, setDynamics, setTemporalityMode, setTracks, updateTrackPattern]);

  // --- Inject atomic pattern ---
  const injectPattern = useCallback((trackId: string, config: TrackPreset) => {
    setTracks((prev: any[]) => prev.map((t: any) => {
      if (t.id !== trackId) return t;

      let newTrack = { ...t };
      if (config.steps !== undefined) newTrack.steps = config.steps;
      if (config.pulses !== undefined) newTrack.pulses = config.pulses;
      if (config.offset !== undefined) newTrack.offset = config.offset;

      newTrack.hits = 0;
      newTrack.misses = 0;

      return updateTrackPattern(newTrack);
    }));
  }, [setTracks, updateTrackPattern]);

  // --- Capture current config ---
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
          noteMode: t.noteMode,
          markovStyle: t.markovStyle,
          markovTemperature: t.markovTemperature,
          markovMemory: t.markovMemory,
          markovAnchor: t.markovAnchor,
          patternMode: t.patternMode,
          lsSeed: t.lsSeed,
          lsRuleA: t.lsRuleA,
          lsIterations: t.lsIterations,
          lsRotation: t.lsRotation,
          caRule: t.caRule,
          caSeed: t.caSeed,
          caDensity: t.caDensity,
          caSpeed: t.caSpeed,
          layer2Filename: t.layer2Filename,
          layer2Blend: t.layer2Blend,
          layer2Pitch: t.layer2Pitch,
          layer2Offset: t.layer2Offset,
          layer2FilterFreq: t.layer2FilterFreq,
          layer2Reverse: t.layer2Reverse,
          layer2StretchEnabled: t.layer2StretchEnabled,
          layer2StretchRate: t.layer2StretchRate,
          lorenzEnabled: t.lorenzEnabled,
          lorenzDepth: t.lorenzDepth,
          lorenzTarget: t.lorenzTarget,
          lorenzSpeed: t.lorenzSpeed,
          nestedLfoEnabled: t.nestedLfoEnabled,
          nestedLfoRate1: t.nestedLfoRate1,
          nestedLfoRate2: t.nestedLfoRate2,
          nestedLfoDepth: t.nestedLfoDepth,
          slicerEnabled: t.slicerEnabled,
          sliceCount: t.sliceCount,
          stretchEnabled: t.stretchEnabled,
          stretchRate: t.stretchRate,
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
          ...(t.id === 'kick' ? { kickPitchDecay: t.kickPitchDecay, kickOctaves: t.kickOctaves, kickDecay: t.kickDecay, kickClickType: t.kickClickType } : {}),
          ...(t.id === 'hat' ? { hatMode: t.hatMode, hatHarmonicity: t.hatHarmonicity, hatModIndex: t.hatModIndex, hatResonance: t.hatResonance, hatDecay: t.hatDecay, hatNoiseType: t.hatNoiseType } : {}),
          ...(t.id === 'snare' ? { snareDecay: t.snareDecay, snareNoiseType: t.snareNoiseType, snareBodyEnabled: t.snareBodyEnabled, snareBodyPitch: t.snareBodyPitch, snareBodyDecay: t.snareBodyDecay } : {}),
          activeScene: (t as any).activeScene ?? 0,
          scenes: (t as any).scenes ? (t as any).scenes.map((s: any) => s ? { ...s } : null) : [],
        }])
      ),
    };
  }, [bpm, jitter, swing, dynamics, temporalityMode, tracks]);

  // --- Save user preset ---
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

  // --- Delete user preset ---
  const handleDeleteUserPreset = useCallback((id: string) => {
    const updated = userPresets.filter(p => p.id !== id);
    setUserPresets(updated);
    saveUserPresets(updated);
  }, [userPresets]);

  // --- Export current config ---
  const handleExportCurrent = useCallback(() => {
    const preset = captureCurrentConfig('current-config');
    exportPresetAsJson(preset);
  }, [captureCurrentConfig]);

  // --- Apply user preset ---
  const applyUserPreset = useCallback((up: UserPreset) => {
    setActivePresetId(up.id);
    setBpm(up.bpm);
    setMmHistory([]);
    setJitter(up.jitter);
    setSwing(up.swing);
    setDynamics(up.dynamics);
    if (up.temporalityMode) setTemporalityMode(up.temporalityMode as TemporalityMode);
    logChange(`User Preset: ${up.name}`, [`BPM:${up.bpm}`]);

    setTracks((prev: any[]) => prev.map((t: any) => {
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
        noteMode: ((config as any).noteMode ?? 'euclidean') as 'euclidean' | 'markov',
        markovStyle: ((config as any).markovStyle ?? 'scale') as MarkovStyle,
        markovTemperature: (config as any).markovTemperature ?? 40,
        markovMemory: (config as any).markovMemory ?? 1,
        markovAnchor: (config as any).markovAnchor ?? 0,
        patternMode: (config as any).patternMode ?? 'euclidean',
        lsSeed: (config as any).lsSeed ?? 'X',
        lsRuleA: (config as any).lsRuleA ?? 'XO',
        lsIterations: (config as any).lsIterations ?? 3,
        lsRotation: (config as any).lsRotation ?? 0,
        caRule: (config as any).caRule ?? 30,
        caSeed: (config as any).caSeed ?? 'center',
        caDensity: (config as any).caDensity ?? 50,
        caSpeed: (config as any).caSpeed ?? 1,
        layer2Blend: config.layer2Blend ?? 0.8,
        layer2Pitch: config.layer2Pitch ?? 0,
        layer2Offset: config.layer2Offset ?? 0,
        layer2FilterFreq: config.layer2FilterFreq ?? 8000,
        layer2Reverse: config.layer2Reverse ?? false,
        layer2StretchEnabled: (config as any).layer2StretchEnabled ?? false,
        layer2StretchRate: (config as any).layer2StretchRate ?? 1.0,
        lorenzEnabled: (config as any).lorenzEnabled ?? false,
        lorenzDepth: (config as any).lorenzDepth ?? 1000,
        lorenzTarget: (config as any).lorenzTarget ?? 'filter',
        lorenzSpeed: (config as any).lorenzSpeed ?? 1.0,
        nestedLfoEnabled: (config as any).nestedLfoEnabled ?? false,
        nestedLfoRate1: (config as any).nestedLfoRate1 ?? 0.1,
        nestedLfoRate2: (config as any).nestedLfoRate2 ?? 4.0,
        nestedLfoDepth: (config as any).nestedLfoDepth ?? 800,
        slicerEnabled: (config as any).slicerEnabled ?? false,
        sliceCount: (config as any).sliceCount ?? 16,
        stretchEnabled: (config as any).stretchEnabled ?? false,
        stretchRate: (config as any).stretchRate ?? 1.0,
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

    // Post-render sync with audio engine
    setTimeout(() => {
      tracksRef.current.forEach((t: any) => {
        const config = up.tracks[t.id];
        if (config) {
          const hpf = (config as any).eqEnabled ? ((config as any).eqHpfFreq ?? 20) : 20;
          const lpf = (config as any).eqEnabled ? ((config as any).eqLpfFreq ?? 20000) : 20000;
          synthsRef.current[t.id]?.updateEq?.(hpf, lpf);
          synthsRef.current[t.id]?.setPan?.((config as any).pan ?? 0);
          synthsRef.current[t.id]?.setFreqShift?.((config as any).freqShiftEnabled ? ((config as any).freqShift ?? 0) : 0, (config as any).freqShiftEnabled ?? false);
          synthsRef.current[t.id]?.setSpectralSend?.((config as any).spectralDelaySend ?? 0);
          synthsRef.current[t.id]?.setFreezeSend?.((config as any).freezeSend ?? 0);
          synthsRef.current[t.id]?.setReverseSend?.((config as any).reverseSend ?? 0);
          synthsRef.current[t.id]?.switchBinaural?.((config as any).binauralEnabled ?? false);
          if ((config as any).binauralEnabled) {
            synthsRef.current[t.id]?.updateBinaural?.((config as any).binauralAzimuth ?? 0, (config as any).binauralDistance ?? 3);
          }
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
        if (t.isTonal && (t.noteMode ?? 'euclidean') === 'markov') {
          updateMarkovMatrix(t);
        }
      });
    }, 0);
  }, [logChange, updateTrackPattern, updateMarkovMatrix, setBpm, setMmHistory, setJitter, setSwing, setDynamics, setTemporalityMode, setTracks, synthsRef, tracksRef]);

  // --- Import preset from file ---
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

    if (importInputRef.current) importInputRef.current.value = '';
  }, [userPresets, logChange, applyUserPreset]);

  return {
    // State
    userPresets,
    activePresetId,
    hoveredPreset,
    setHoveredPreset,
    previewPatterns,
    isSavingPreset,
    setIsSavingPreset,
    newPresetName,
    setNewPresetName,
    importError,
    importInputRef,
    // Actions
    applyPreset,
    injectPattern,
    captureCurrentConfig,
    applyUserPreset,
    handleSaveUserPreset,
    handleDeleteUserPreset,
    handleExportCurrent,
    handleImportPreset,
  };
}
