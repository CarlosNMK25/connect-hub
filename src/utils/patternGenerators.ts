// ============================================================
// L-SYSTEM Pattern Generator
// ============================================================

const LS_RULES: Record<string, Record<string, string>> = {
  'XO': { X: 'XO', O: 'X' },     // Fibonacci-like
  'XX': { X: 'XX', O: 'X' },     // Doubling
  'XOO': { X: 'XOO', O: 'X' },   // Sparse
  'XOOX': { X: 'XOOX', O: 'OX' }, // Complex
};

export function generateLSystem(
  seed: string,
  ruleKey: string,
  iterations: number,
  targetLength: number,
  rotation: number
): number[] {
  const rules = LS_RULES[ruleKey] ?? LS_RULES['XO'];
  let current = seed;

  for (let i = 0; i < iterations; i++) {
    let next = '';
    for (const char of current) {
      next += rules[char] ?? char;
    }
    current = next;
    if (current.length > 512) break;
  }

  const pattern: number[] = [];
  for (let i = 0; i < targetLength; i++) {
    const char = current[i % current.length];
    pattern.push(char === 'X' ? 1 : 0);
  }

  const rot = ((rotation % targetLength) + targetLength) % targetLength;
  return [...pattern.slice(rot), ...pattern.slice(0, rot)];
}

// ============================================================
// CELLULAR AUTOMATA Pattern Generator
// ============================================================

function parseCARule(ruleNumber: number): Record<string, number> {
  const binary = ruleNumber.toString(2).padStart(8, '0');
  const rule: Record<string, number> = {};
  for (let i = 0; i < 8; i++) {
    const neighborhood = (7 - i).toString(2).padStart(3, '0');
    rule[neighborhood] = parseInt(binary[i]);
  }
  return rule;
}

export function initCAState(seed: string, width: number): number[] {
  const state = new Array(width).fill(0);
  switch (seed) {
    case 'center':
      state[Math.floor(width / 2)] = 1;
      break;
    case 'edge':
      state[0] = 1;
      break;
    case 'two':
      state[Math.floor(width / 4)] = 1;
      state[Math.floor(3 * width / 4)] = 1;
      break;
    case 'random':
      for (let i = 0; i < width; i++) {
        state[i] = Math.random() > 0.7 ? 1 : 0;
      }
      break;
  }
  return state;
}

function stepCA(state: number[], rule: Record<string, number>): number[] {
  const width = state.length;
  const next = new Array(width).fill(0);
  for (let i = 0; i < width; i++) {
    const left = state[(i - 1 + width) % width];
    const center = state[i];
    const right = state[(i + 1) % width];
    const key = `${left}${center}${right}`;
    next[i] = rule[key] ?? 0;
  }
  return next;
}

/**
 * Generate or evolve a CA pattern.
 * density 0-100: higher = MORE hits allowed (inverted threshold).
 */
export function generateCAPattern(
  ruleNumber: number,
  seed: string,
  width: number,
  density: number,
  existingState?: number[]
): { pattern: number[]; newState: number[] } {
  const rule = parseCARule(ruleNumber);
  const state = existingState ?? initCAState(seed, width);
  const newState = stepCA(state, rule);

  // density: 0 = very sparse, 100 = all active cells pass
  // threshold = max neighbors required; higher density = lower threshold
  const threshold = Math.max(0, 3 - Math.floor((density / 100) * 3));

  const pattern = newState.map((cell, i) => {
    if (cell === 0) return 0;
    const left = newState[(i - 1 + width) % width];
    const right = newState[(i + 1) % width];
    const neighbors = left + cell + right;
    return neighbors >= threshold ? 1 : 0;
  });

  return { pattern, newState };
}
