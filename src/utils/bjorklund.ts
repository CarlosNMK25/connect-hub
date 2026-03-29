/**
 * Bjorklund's Algorithm for Euclidean Rhythms
 * Canonical implementation using the two-group interleave approach.
 */
export function bjorklund(pulses: number, steps: number): number[] {
  if (pulses <= 0) return new Array(steps).fill(0);
  if (pulses >= steps) return new Array(steps).fill(1);

  let front: number[][] = [];
  let back: number[][] = [];

  for (let i = 0; i < pulses; i++) front.push([1]);
  for (let i = 0; i < steps - pulses; i++) back.push([0]);

  while (back.length > 1) {
    const min = Math.min(front.length, back.length);
    const newFront: number[][] = [];
    for (let i = 0; i < min; i++) {
      newFront.push([...front[i], ...back[i]]);
    }
    const leftoverFront = front.slice(min);
    const leftoverBack = back.slice(min);

    if (leftoverFront.length > 0) {
      front = newFront;
      back = leftoverFront;
    } else if (leftoverBack.length > 0) {
      front = newFront;
      back = leftoverBack;
    } else {
      front = newFront;
      back = [];
    }
  }

  const result: number[] = [];
  for (const group of front) {
    for (const v of group) result.push(v);
  }
  for (const group of back) {
    for (const v of group) result.push(v);
  }

  return result;
}

export function rotate<T>(array: T[], offset: number): T[] {
  const n = array.length;
  const o = ((offset % n) + n) % n;
  return [...array.slice(o), ...array.slice(0, o)];
}
