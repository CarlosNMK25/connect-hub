import type { MarkovStyle } from '../utils/markovGenerator';

export type { MarkovStyle };

export interface ChainStep {
  scene: number;
  cycles: number;
}

export interface SceneData {
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
  // Audio params
  volume?: number;
  delaySend?: number;
  reverbSend?: number;
  spectralDelaySend?: number;
  freezeSend?: number;
  reverseSend?: number;
  pan?: number;
  eqEnabled?: boolean;
  eqHpfFreq?: number;
  eqLpfFreq?: number;
  pitch?: number;
  synthType?: string;
  // Percussive synthesis
  kickPitchDecay?: number;
  kickOctaves?: number;
  kickDecay?: number;
  kickClickType?: string;
  snareDecay?: number;
  snareNoiseType?: string;
  snareBodyEnabled?: boolean;
  snareBodyPitch?: number;
  snareBodyDecay?: number;
  hatMode?: string;
  hatHarmonicity?: number;
  hatModIndex?: number;
  hatResonance?: number;
  hatDecay?: number;
  hatNoiseType?: string;
  // Granular / Sampler
  grainSize?: number;
  overlap?: number;
  spray?: number;
  bitCrush?: number;
  normalize?: boolean;
  sampleStart?: number;
  sampleEnd?: number;
  attack?: number;
  decay?: number;
  mode?: 'GATE' | 'TRIGGER' | 'ONE-SHOT';
  stretchEnabled?: boolean;
  stretchRate?: number;
  extremeLoopEnabled?: boolean;
  extremeLoopSize?: number;
  extremeLoopPoint?: number;
  // Stochastic
  chaosEnabled?: boolean;
  entropy?: number;
  evolveEnabled?: boolean;
  mutationRate?: number;
  mutationSpeed?: number;
  ratchet?: number;
  // Tonal
  isTonal?: boolean;
  rootNote?: number;
  scaleId?: string;
  octaveRange?: number;
  noteIndices?: number[];
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
  // Markov
  noteMode?: 'euclidean' | 'markov';
  markovStyle?: MarkovStyle;
  markovTemperature?: number;
  markovMemory?: 1 | 2;
  markovAnchor?: number;
  // Cloud
  cloudMode?: 'granular' | 'eno';
  enoSpeed?: number;
  // Modulation
  lorenzEnabled?: boolean;
  lorenzDepth?: number;
  lorenzTarget?: 'filter' | 'volume';
  lorenzSpeed?: number;
  nestedLfoEnabled?: boolean;
  nestedLfoRate1?: number;
  nestedLfoRate2?: number;
  nestedLfoDepth?: number;
  // Layer 2
  layer2Blend?: number;
  layer2Pitch?: number;
  layer2Offset?: number;
  layer2FilterFreq?: number;
  layer2Reverse?: boolean;
  layer2StretchEnabled?: boolean;
  layer2StretchRate?: number;
}

export interface TrackState {
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
  sampleStart: number;
  sampleEnd: number;
  attack: number;
  decay: number;
  mode: 'GATE' | 'TRIGGER' | 'ONE-SHOT';
  pitch: number;
  normalize: boolean;
  // Granular Engine (Level 2)
  grainSize: number;
  overlap: number;
  spray: number;
  bitCrush: number;
  // Stochastic Engine
  chaosEnabled: boolean;
  entropy: number;
  evolveEnabled: boolean;
  mutationRate: number;
  mutationSpeed: number;
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
  driftEnabled?: boolean;
  driftRate?: number;
  // Markov note mode
  noteMode?: 'euclidean' | 'markov';
  markovStyle?: MarkovStyle;
  markovTemperature?: number;
  markovMemory?: 1 | 2;
  markovAnchor?: number;
  markovShowMatrix?: boolean;
  // Layer 2
  layer2Status?: 'empty' | 'loading' | 'ready';
  layer2Filename?: string;
  layer2Blend?: number;
  layer2Pitch?: number;
  layer2Offset?: number;
  layer2FilterFreq?: number;
  layer2Reverse?: boolean;
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
  stretchRate?: number;
  // EQ per-track (Phase 6C)
  eqEnabled?: boolean;
  eqHpfFreq?: number;
  eqLpfFreq?: number;
  // Layer 2 Time Stretch (Phase 6D)
  layer2StretchEnabled?: boolean;
  layer2StretchRate?: number;
  // Panning (Phase 7A)
  pan?: number;
  // Frequency Shifter (Phase 7B)
  freqShiftEnabled?: boolean;
  freqShift?: number;
  // Spectral Delay Send (Phase 7C)
  spectralDelaySend?: number;
  // Freeze Send (Phase 9)
  freezeSend?: number;
  reverseSend?: number;
  // Extreme Loop (Phase 10)
  extremeLoopEnabled?: boolean;
  extremeLoopSize?: number;
  extremeLoopPoint?: number;
  // 3D Audio / Binaural (Phase 7D)
  binauralEnabled?: boolean;
  binauralAzimuth?: number;
  binauralDistance?: number;
  // Phase 8 — Percussive Synthesis
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
  // Song Mode — Scene slots
  activeScene: number;
  scenes: (SceneData | null)[];
  // UI-only: exclusive advanced panel visibility
  activeAdvancedPanel?: 'RR' | 'PHD' | 'LRZ' | 'NLF' | null;
}
