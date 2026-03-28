// Percussive sound presets for Kick, Snare, and Hat tracks

export interface KickPreset {
  name: string;
  pitchDecay: number;
  octaves: number;
  decay: number;
  clickType: string;
}

export interface SnarePreset {
  name: string;
  decay: number;
  noiseType: string;
  bodyEnabled: boolean;
  bodyPitch?: number;
  bodyDecay?: number;
}

export interface HatPreset {
  name: string;
  mode: string;
  decay: number;
  noiseType: string;
  harmonicity?: number;
  modIndex?: number;
  resonance?: number;
}

export const KICK_PRESETS: KickPreset[] = [
  { name: 'IDM Membrane',    pitchDecay: 0.05, octaves: 10, decay: 0.4,  clickType: 'pink' },
  { name: 'Flamenco Bombo',  pitchDecay: 0.08, octaves: 6,  decay: 0.6,  clickType: 'brown' },
  { name: 'Anticon Sub',     pitchDecay: 0.02, octaves: 14, decay: 0.8,  clickType: 'pink' },
  { name: 'Industrial Click',pitchDecay: 0.01, octaves: 4,  decay: 0.2,  clickType: 'white' },
  { name: 'Deep House',      pitchDecay: 0.04, octaves: 12, decay: 0.5,  clickType: 'pink' },
  { name: 'Jungle Kick',     pitchDecay: 0.03, octaves: 8,  decay: 0.3,  clickType: 'white' },
  { name: 'Taiko',           pitchDecay: 0.1,  octaves: 5,  decay: 0.7,  clickType: 'brown' },
  { name: 'Minimal',         pitchDecay: 0.02, octaves: 6,  decay: 0.25, clickType: 'pink' },
];

export const SNARE_PRESETS: SnarePreset[] = [
  { name: 'IDM Snappy',    decay: 0.15, noiseType: 'white', bodyEnabled: false },
  { name: 'Flamenco Caja', decay: 0.25, noiseType: 'brown', bodyEnabled: true,  bodyPitch: 200, bodyDecay: 0.1 },
  { name: 'Anticon Crack',  decay: 0.08, noiseType: 'white', bodyEnabled: false },
  { name: 'Rimshot',        decay: 0.05, noiseType: 'white', bodyEnabled: true,  bodyPitch: 400, bodyDecay: 0.05 },
  { name: 'Brush',          decay: 0.4,  noiseType: 'brown', bodyEnabled: false },
  { name: 'Clap',           decay: 0.12, noiseType: 'white', bodyEnabled: false },
  { name: 'Fat Snare',      decay: 0.3,  noiseType: 'brown', bodyEnabled: true,  bodyPitch: 150, bodyDecay: 0.2 },
  { name: 'Ghost',          decay: 0.06, noiseType: 'white', bodyEnabled: false },
];

export const HAT_PRESETS: HatPreset[] = [
  { name: 'IDM Metal',      mode: 'metal', harmonicity: 5.1, modIndex: 32, resonance: 4000, decay: 0.05, noiseType: 'white' },
  { name: 'Flamenco Palmas',mode: 'noise', decay: 0.15, noiseType: 'brown' },
  { name: 'Anticon Hiss',   mode: 'noise', decay: 0.3,  noiseType: 'pink' },
  { name: 'Closed Hat',     mode: 'noise', decay: 0.04, noiseType: 'white' },
  { name: 'Open Hat',       mode: 'noise', decay: 0.25, noiseType: 'white' },
  { name: 'Cymbal',         mode: 'metal', harmonicity: 3.2, modIndex: 16, resonance: 6000, decay: 0.4,  noiseType: 'white' },
  { name: 'Tambourine',     mode: 'metal', harmonicity: 8.0, modIndex: 48, resonance: 8000, decay: 0.08, noiseType: 'white' },
  { name: 'Shaker',         mode: 'noise', decay: 0.06, noiseType: 'pink' },
];

/** Find matching kick preset index, or -1 for custom */
export function findKickPresetIndex(pitchDecay: number, octaves: number, decay: number, clickType: string): number {
  return KICK_PRESETS.findIndex(p =>
    Math.abs(p.pitchDecay - pitchDecay) < 0.001 &&
    p.octaves === octaves &&
    Math.abs(p.decay - decay) < 0.001 &&
    p.clickType === clickType
  );
}

/** Find matching snare preset index, or -1 for custom */
export function findSnarePresetIndex(decay: number, noiseType: string, bodyEnabled: boolean, bodyPitch?: number, bodyDecay?: number): number {
  return SNARE_PRESETS.findIndex(p =>
    Math.abs(p.decay - decay) < 0.001 &&
    p.noiseType === noiseType &&
    p.bodyEnabled === bodyEnabled &&
    (!p.bodyEnabled || (
      Math.abs((p.bodyPitch ?? 0) - (bodyPitch ?? 0)) < 1 &&
      Math.abs((p.bodyDecay ?? 0) - (bodyDecay ?? 0)) < 0.001
    ))
  );
}

/** Find matching hat preset index, or -1 for custom */
export function findHatPresetIndex(mode: string, decay: number, noiseType: string, harmonicity?: number, modIndex?: number, resonance?: number): number {
  return HAT_PRESETS.findIndex(p =>
    p.mode === mode &&
    Math.abs(p.decay - decay) < 0.001 &&
    p.noiseType === noiseType &&
    (p.mode === 'noise' || (
      Math.abs((p.harmonicity ?? 0) - (harmonicity ?? 0)) < 0.01 &&
      Math.abs((p.modIndex ?? 0) - (modIndex ?? 0)) < 0.5 &&
      Math.abs((p.resonance ?? 0) - (resonance ?? 0)) < 1
    ))
  );
}
