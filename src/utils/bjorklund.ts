/**
 * Bjorklund's Algorithm for Euclidean Rhythms
 */
export function bjorklund(pulses: number, steps: number): number[] {
  if (pulses <= 0) return new Array(steps).fill(0);
  if (pulses >= steps) return new Array(steps).fill(1);

  let pattern: number[][] = [];
  for (let i = 0; i < steps; i++) {
    pattern.push([i < pulses ? 1 : 0]);
  }

  let count = steps;
  let remainder = steps - pulses;
  let divisor = pulses;

  while (remainder > 1) {
    const iterations = Math.floor(divisor / remainder);
    for (let i = 0; i < remainder; i++) {
      for (let j = 0; j < iterations; j++) {
        pattern[i] = pattern[i].concat(pattern[count - 1 - i]);
      }
    }
    count -= remainder * iterations;
    divisor = remainder;
    remainder = divisor % remainder;
  }

  const result: number[] = [];
  for (let i = 0; i < pattern.length; i++) {
    for (let j = 0; j < pattern[i].length; j++) {
      result.push(pattern[i][j]);
    }
  }

  return result.slice(0, steps);
}

export function rotate<T>(array: T[], offset: number): T[] {
  const n = array.length;
  const o = ((offset % n) + n) % n;
  return [...array.slice(o), ...array.slice(0, o)];
}
