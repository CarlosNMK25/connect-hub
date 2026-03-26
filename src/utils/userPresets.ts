export interface UserPresetTrack {
  pulses: number;
  steps: number;
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
  ratchet?: number;
  rootNote?: number;
  scaleId?: string;
  octaveRange?: number;
  noteIndices?: number[];
  synthType?: string;
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
  cloudMode?: string;
  enoSpeed?: number;
  rrEnabled?: boolean;
  rrAmount?: number;
  driftEnabled?: boolean;
  driftRate?: number;
  // Markov note mode
  noteMode?: 'euclidean' | 'markov';
  markovStyle?: string;
  markovTemperature?: number;
  markovMemory?: number;
  markovAnchor?: number;
  // Pattern mode
  patternMode?: 'euclidean' | 'lsystem' | 'ca';
  lsSeed?: string;
  lsRuleA?: string;
  lsIterations?: number;
  lsRotation?: number;
  caRule?: number;
  caSeed?: string;
  caDensity?: number;
  caSpeed?: number;
  // Layer 2
  layer2Filename?: string;
  layer2Blend?: number;
  layer2Pitch?: number;
  layer2Offset?: number;
  layer2FilterFreq?: number;
  layer2Reverse?: boolean;
  // Lorenz Attractor
  lorenzEnabled?: boolean;
  lorenzDepth?: number;
  lorenzTarget?: string;
  lorenzSpeed?: number;
  // Nested LFO
  nestedLfoEnabled?: boolean;
  nestedLfoRate1?: number;
  nestedLfoRate2?: number;
  nestedLfoDepth?: number;
  // Slicer
  slicerEnabled?: boolean;
  sliceCount?: number;
  // Time Stretch (Phase 6B)
  stretchEnabled?: boolean;
  stretchRate?: number;
  // EQ (Phase 6C)
  eqEnabled?: boolean;
  eqHpfFreq?: number;
  eqLpfFreq?: number;
  // Phase 6D — Layer 2 Time Stretch
  layer2StretchEnabled?: boolean;
  layer2StretchRate?: number;
  // Phase 7A/7B — Panning + Frequency Shifter
  pan?: number;
  freqShiftEnabled?: boolean;
  freqShift?: number;
  // Spectral Delay Send (Phase 7C)
  spectralDelaySend?: number;
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
}

export interface UserPreset {
  id: string;
  name: string;
  createdAt: string;
  bpm: number;
  jitter: number;
  swing: number;
  dynamics: number;
  temporalityMode?: string;
  tracks: Record<string, UserPresetTrack>;
}

const STORAGE_KEY = 'euclidean-user-presets';

export function loadUserPresets(): UserPreset[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as UserPreset[];
  } catch {
    return [];
  }
}

export function saveUserPresets(presets: UserPreset[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

export function validateUserPreset(obj: unknown): obj is UserPreset {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  if (typeof o.name !== 'string' || !o.name) return false;
  if (typeof o.bpm !== 'number') return false;
  if (!o.tracks || typeof o.tracks !== 'object') return false;
  const tracks = o.tracks as Record<string, unknown>;
  const trackIds = Object.keys(tracks);
  if (trackIds.length === 0) return false;
  for (const id of trackIds) {
    const t = tracks[id] as Record<string, unknown>;
    if (!t || typeof t.pulses !== 'number' || typeof t.steps !== 'number') return false;
  }
  return true;
}

export function exportPresetAsJson(preset: UserPreset): void {
  const blob = new Blob([JSON.stringify(preset, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${preset.name || 'preset'}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importPresetFromFile(file: File): Promise<UserPreset> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (!validateUserPreset(parsed)) {
          reject(new Error('JSON inválido: debe contener name, bpm y tracks con pulses/steps.'));
          return;
        }
        // Ensure unique id and fresh timestamp
        resolve({
          ...parsed,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        });
      } catch {
        reject(new Error('No se pudo parsear el archivo JSON.'));
      }
    };
    reader.onerror = () => reject(new Error('Error leyendo el archivo.'));
    reader.readAsText(file);
  });
}

/**
 * Convert a UserPreset to a ScenePreset-compatible shape for hover preview.
 */
export function userPresetToScenePreset(up: UserPreset) {
  return {
    id: up.id,
    name: up.name,
    type: 'master' as const,
    category: 'Experimental' as const,
    description: `Preset de usuario creado el ${new Date(up.createdAt).toLocaleDateString()}`,
    bpm: up.bpm,
    jitter: up.jitter,
    swing: up.swing,
    dynamics: up.dynamics,
    tracks: Object.fromEntries(
      Object.entries(up.tracks).map(([id, t]) => [id, {
        pulses: t.pulses,
        steps: t.steps,
        offset: t.offset,
      }])
    ),
  };
}
