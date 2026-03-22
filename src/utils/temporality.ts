/**
 * Temporality Modes — 5 timing engines for the Euclidean sequencer.
 * Each mode is a pure function: (context) => offset in seconds.
 * All functions are O(1) per hit. No allocations in hot path.
 */

export type TemporalityMode = 'grid' | 'mpc' | 'dilla' | 'flamenco' | 'arritmia';

export interface TemporalityContext {
  trackId: string;
  stepIndex: number;
  steps: number;
  globalStep: number;
  swing: number;        // 0-100
  jitter: number;       // ms
  sixteenthDuration: number; // seconds
  pattern: number[];    // Bjorklund output for this track
}

export const TEMPORALITY_MODES: { id: TemporalityMode; label: string }[] = [
  { id: 'grid', label: 'GRID' },
  { id: 'mpc', label: 'MPC' },
  { id: 'dilla', label: 'DILLA' },
  { id: 'flamenco', label: 'FLAMENCO' },
  { id: 'arritmia', label: 'APC' },
];

// --- Helpers ---

/** Gaussian random using Box-Muller transform */
function gaussianRandom(mean: number, stdDev: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z0 * stdDev + mean;
}

/** Deterministic hash normalized to 0-1. djb2 variant. */
function simpleHash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  // Normalize to 0-1
  return ((hash & 0x7fffffff) % 10000) / 10000;
}

/** Per-track jitter multipliers for Dilla mode */
const DILLA_JITTER_SCALE: Record<string, number> = {
  kick: 0.1,
  snare: 1.2,
  hat: 1.5,
  cloud: 0.5,
};

/** Canonical flamenco accent positions in a 12-beat cycle (0-indexed) */
const FLAMENCO_ACCENTS_12 = [2, 5, 7, 9, 11];

// --- Mode functions ---

function gridOffset(_ctx: TemporalityContext): number {
  // Pure grid: offset = 0. Swing and jitter applied externally (legacy behavior).
  return 0;
}

function mpcOffset(ctx: TemporalityContext): number {
  const { globalStep, swing, sixteenthDuration, jitter } = ctx;
  const isOffBeat = globalStep % 2 === 1;
  const swingDelay = isOffBeat ? (swing / 100) * (sixteenthDuration * 0.5) : 0;
  const jitterSeconds = jitter / 1000;
  const jitterOffset = jitterSeconds > 0 ? gaussianRandom(0, jitterSeconds / 3) : 0;
  return swingDelay + jitterOffset;
}

function dillaOffset(ctx: TemporalityContext): number {
  const { trackId, jitter } = ctx;
  const scale = DILLA_JITTER_SCALE[trackId] ?? 1.0;
  const jitterSeconds = jitter / 1000;
  const effectiveJitter = jitterSeconds * scale;
  // Swing is suppressed in Dilla — all feel comes from selective jitter
  return effectiveJitter > 0 ? gaussianRandom(0, effectiveJitter / 3) : 0;
}

function flamencoOffset(ctx: TemporalityContext): number {
  const { stepIndex, steps, swing, sixteenthDuration, pattern, jitter } = ctx;

  // Determine accent positions
  let accents: number[];
  if (steps === 12) {
    accents = FLAMENCO_ACCENTS_12;
  } else {
    // Use active pattern steps as accents for non-12 cycles
    accents = [];
    for (let i = 0; i < pattern.length; i++) {
      if (pattern[i] === 1) accents.push(i);
    }
    if (accents.length === 0) accents = [0]; // fallback
  }

  // Find distance to nearest accent (circular)
  let minDist = steps;
  for (const a of accents) {
    const d = Math.min(
      Math.abs(stepIndex - a),
      steps - Math.abs(stepIndex - a)
    );
    if (d < minDist) minDist = d;
  }

  const maxDist = steps / 4;
  const normalizedDist = Math.min(minDist / maxDist, 1);
  // Near accent: offset ≈ 0 (falls to ground). Far: relaxes (positive offset).
  const gravityOffset = normalizedDist * (swing / 100) * sixteenthDuration * 0.15;

  // Global jitter on top
  const jitterSeconds = jitter / 1000;
  const jitterOffset = jitterSeconds > 0 ? gaussianRandom(0, jitterSeconds / 3) : 0;

  return gravityOffset + jitterOffset;
}

function arritmiaOffset(ctx: TemporalityContext): number {
  const { trackId, stepIndex, swing, sixteenthDuration, jitter } = ctx;
  const hash = simpleHash(trackId + stepIndex);
  // Deterministic displacement: same step always shifts the same way
  const displace = (hash - 0.5) * (swing / 100) * sixteenthDuration * 0.8;

  // Global jitter on top
  const jitterSeconds = jitter / 1000;
  const jitterOffset = jitterSeconds > 0 ? gaussianRandom(0, jitterSeconds / 3) : 0;

  return displace + jitterOffset;
}

// --- Dispatcher ---

/**
 * Calculate the temporal offset for a single hit.
 * Returns offset in seconds (positive = delay, negative = advance).
 *
 * For Grid mode, returns 0 — the caller applies legacy swing/jitter.
 * For all other modes, the returned offset includes swing and jitter
 * as appropriate to the mode's character.
 */
export function calculateTemporalOffset(
  mode: TemporalityMode,
  ctx: TemporalityContext
): number {
  switch (mode) {
    case 'grid': return gridOffset(ctx);
    case 'mpc': return mpcOffset(ctx);
    case 'dilla': return dillaOffset(ctx);
    case 'flamenco': return flamencoOffset(ctx);
    case 'arritmia': return arritmiaOffset(ctx);
    default: return 0;
  }
}
