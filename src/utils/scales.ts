import * as Tone from 'tone';

export const SCALES: Record<string, number[]> = {
  phrygianDominant: [0, 1, 4, 5, 7, 8, 10],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  pentatonicMinor: [0, 3, 5, 7, 10],
  wholeTone: [0, 2, 4, 6, 8, 10],
};

export const SCALE_NAMES: Record<string, string> = {
  phrygianDominant: 'Phrygian Dom.',
  chromatic: 'Chromatic',
  minor: 'Minor',
  major: 'Major',
  dorian: 'Dorian',
  pentatonicMinor: 'Pent. Minor',
  wholeTone: 'Whole Tone',
};

export function noteIndexToMidi(rootNote: number, scaleIntervals: number[], noteIndex: number): number {
  const len = scaleIntervals.length;
  const octave = Math.floor(noteIndex / len);
  const degree = ((noteIndex % len) + len) % len; // handle negatives
  return rootNote + scaleIntervals[degree] + 12 * octave;
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
