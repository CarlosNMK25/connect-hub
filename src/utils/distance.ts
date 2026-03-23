/**
 * Pattern Distance & Layout — Swap Distance (Toussaint 2005)
 * 
 * Measures rhythmic similarity between Euclidean patterns and computes
 * a 2D force-directed layout for visualization.
 */

/**
 * Swap distance between two binary patterns of equal length.
 * For equal pulse count: half the Hamming distance.
 * For unequal pulse count: adjusts for the difference.
 */
export function swapDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error('Patterns must have equal length');
  let diffs = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) diffs++;
  }
  return diffs / 2;
}

/**
 * Resample a binary pattern to a target length via nearest-neighbor interpolation.
 * Preserves rhythmic proportion.
 */
export function resamplePattern(pattern: number[], targetLength: number): number[] {
  if (pattern.length === targetLength) return [...pattern];
  const result = new Array(targetLength).fill(0);
  const ratio = pattern.length / targetLength;
  for (let i = 0; i < targetLength; i++) {
    const sourceIdx = Math.floor(i * ratio);
    result[i] = pattern[Math.min(sourceIdx, pattern.length - 1)];
  }
  return result;
}

/**
 * Composite distance between two patterns of any length.
 * Normalizes to common resolution, combines rhythmic (Hamming),
 * density, and length differences.
 */
export function patternDistance(patternA: number[], patternB: number[]): number {
  const commonLength = 48;
  const a = resamplePattern(patternA, commonLength);
  const b = resamplePattern(patternB, commonLength);

  // Normalized Hamming (0–1)
  let hamming = 0;
  for (let i = 0; i < commonLength; i++) {
    if (a[i] !== b[i]) hamming++;
  }
  const rhythmicDistance = hamming / commonLength;

  // Density difference (0–1)
  const densityA = patternA.filter(x => x === 1).length / patternA.length;
  const densityB = patternB.filter(x => x === 1).length / patternB.length;
  const densityDistance = Math.abs(densityA - densityB);

  // Length difference normalized (0–1)
  const lengthDistance = Math.abs(patternA.length - patternB.length) / 32;

  return rhythmicDistance * 0.6 + densityDistance * 0.25 + Math.min(lengthDistance, 1) * 0.15;
}

/**
 * NxN symmetric distance matrix.
 */
export function distanceMatrix(patterns: number[][]): number[][] {
  const n = patterns.length;
  const matrix = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const d = patternDistance(patterns[i], patterns[j]);
      matrix[i][j] = d;
      matrix[j][i] = d;
    }
  }
  return matrix;
}

/**
 * Force-directed layout from a distance matrix.
 * Returns positions normalized to [0, 1] range.
 */
export function computeLayout(matrix: number[][]): { x: number; y: number }[] {
  const n = matrix.length;
  if (n === 0) return [];
  if (n === 1) return [{ x: 0.5, y: 0.5 }];

  // Initialize on circle
  let positions = Array.from({ length: n }, (_, i) => ({
    x: Math.cos(2 * Math.PI * i / n) * 100,
    y: Math.sin(2 * Math.PI * i / n) * 100,
  }));

  // 200 iterations of force-directed relaxation
  for (let iter = 0; iter < 200; iter++) {
    const forces = positions.map(() => ({ x: 0, y: 0 }));
    const cooling = 1 - iter / 200;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = positions[j].x - positions[i].x;
        const dy = positions[j].y - positions[i].y;
        const currentDist = Math.sqrt(dx * dx + dy * dy) || 0.001;
        const targetDist = matrix[i][j] * 300;
        const diff = (currentDist - targetDist) / currentDist;
        const force = diff * 0.1 * cooling;

        forces[i].x += dx * force;
        forces[i].y += dy * force;
        forces[j].x -= dx * force;
        forces[j].y -= dy * force;
      }
    }

    for (let i = 0; i < n; i++) {
      positions[i].x += forces[i].x;
      positions[i].y += forces[i].y;
    }
  }

  // Normalize to 0–1
  const xs = positions.map(p => p.x);
  const ys = positions.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  return positions.map(p => ({
    x: (p.x - minX) / rangeX,
    y: (p.y - minY) / rangeY,
  }));
}

/**
 * Compute position for an external point ("YOU") relative to existing layout
 * using inverse-distance-weighted interpolation.
 */
export function computeYouPosition(
  currentPattern: number[],
  presetPatterns: number[][],
  positions: { x: number; y: number }[]
): { x: number; y: number } {
  if (positions.length === 0) return { x: 0.5, y: 0.5 };

  const distances = presetPatterns.map(p => patternDistance(currentPattern, p));
  let totalWeight = 0;
  let wx = 0, wy = 0;

  distances.forEach((d, i) => {
    const weight = 1 / (d + 0.01);
    wx += positions[i].x * weight;
    wy += positions[i].y * weight;
    totalWeight += weight;
  });

  return { x: wx / totalWeight, y: wy / totalWeight };
}
