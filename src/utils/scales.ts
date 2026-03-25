import * as Tone from 'tone';

export interface ScaleDef {
  intervals: number[];
  detune?: number[];   // cents per degree (optional, for microtonal scales)
  period?: number;     // repeat interval in cents (default 1200 = octave; 1902 for Bohlen-Pierce tritave)
}

export const SCALES: Record<string, ScaleDef> = {
  phrygianDominant: { intervals: [0, 1, 4, 5, 7, 8, 10] },
  chromatic:        { intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
  minor:            { intervals: [0, 2, 3, 5, 7, 8, 10] },
  major:            { intervals: [0, 2, 4, 5, 7, 9, 11] },
  dorian:           { intervals: [0, 2, 3, 5, 7, 9, 10] },
  pentatonicMinor:  { intervals: [0, 3, 5, 7, 10] },
  wholeTone:        { intervals: [0, 2, 4, 6, 8, 10] },
  mixolydian:       { intervals: [0, 2, 4, 5, 7, 9, 10] },
  lydian:           { intervals: [0, 2, 4, 6, 7, 9, 11] },
  harmonicMinor:    { intervals: [0, 2, 3, 5, 7, 8, 11] },
  blues:            { intervals: [0, 3, 5, 6, 7, 10] },
  hirajoshi:        { intervals: [0, 2, 3, 7, 8] },
  flamenco:         { intervals: [0, 1, 4, 5, 7, 8, 11] },
  // Microtonal scales (24-TET / quarter-tone)
  hijaz24:          { intervals: [0, 1, 4, 5, 7, 8, 10], detune: [0, 50, 0, 0, 0, 50, 0] },
  rast:             { intervals: [0, 2, 3, 5, 7, 9, 10], detune: [0, 0, 50, 0, 0, 0, 50] },
  bayati:           { intervals: [0, 2, 3, 5, 7, 8, 10], detune: [0, 0, -50, 0, 0, 0, -50] },
  // Non-octave scales (intervals in cents, period != 1200)
  bohlenPierce:     { intervals: [0, 146, 293, 439, 585, 732, 878, 1024, 1170, 1317, 1463, 1609, 1756], period: 1902 },
};

export const SCALE_NAMES: Record<string, string> = {
  phrygianDominant: 'Phrygian Dom.',
  chromatic: 'Chromatic',
  minor: 'Minor',
  major: 'Major',
  dorian: 'Dorian',
  pentatonicMinor: 'Pent. Minor',
  wholeTone: 'Whole Tone',
  mixolydian: 'Mixolydian',
  lydian: 'Lydian',
  harmonicMinor: 'Harm. Minor',
  blues: 'Blues',
  hirajoshi: 'Hirajoshi',
  flamenco: 'Flamenco',
  hijaz24: 'Hijaz 24-TET',
  rast: 'Rast',
  bayati: 'Bayati',
};

/** Get the semitone intervals array for a scale ID */
export function getScaleIntervals(scaleId: string): number[] {
  return (SCALES[scaleId] || SCALES.phrygianDominant).intervals;
}

/** Get the detune in cents for a specific degree within a scale (0 if non-microtonal) */
export function getScaleDetune(scaleId: string, degree: number): number {
  const scale = SCALES[scaleId] || SCALES.phrygianDominant;
  if (!scale.detune) return 0;
  const len = scale.detune.length;
  return scale.detune[((degree % len) + len) % len] || 0;
}

export function noteIndexToMidi(rootNote: number, scaleIntervals: number[], noteIndex: number): number {
  const len = scaleIntervals.length;
  const octave = Math.floor(noteIndex / len);
  const degree = ((noteIndex % len) + len) % len; // handle negatives
  return rootNote + scaleIntervals[degree] + 12 * octave;
}

/** Convert a MIDI note + detune (cents) to a frequency in Hz */
export function midiAndDetuneToFreq(midi: number, detuneCents: number): number {
  const baseFreq = Tone.Frequency(midi, 'midi').toFrequency();
  if (detuneCents === 0) return baseFreq;
  return baseFreq * Math.pow(2, detuneCents / 1200);
}

export function midiToNoteName(midi: number): string {
  try {
    return Tone.Frequency(midi, "midi").toNote();
  } catch {
    return '?';
  }
}

export function getMaxNoteIndex(scaleIntervals: number[], octaveRange: number): number {
  return scaleIntervals.length * octaveRange;
}
