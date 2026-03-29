import { describe, it, expect } from 'vitest';
import { bjorklund, rotate } from '../utils/bjorklund';

describe('bjorklund', () => {
  it('E(3,8) → tresillo', () => {
    expect(bjorklund(3, 8)).toEqual([1, 0, 0, 1, 0, 0, 1, 0]);
  });

  it('E(5,12) → Soleá canónica sin rotación', () => {
    expect(bjorklund(5, 12)).toEqual([1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0]);
  });

  it('E(7,12)', () => {
    const r = bjorklund(7, 12);
    expect(r.length).toBe(12);
    expect(r.filter(v => v === 1).length).toBe(7);
  });

  it('E(5,11)', () => {
    const r = bjorklund(5, 11);
    expect(r.length).toBe(11);
    expect(r.filter(v => v === 1).length).toBe(5);
  });

  it('E(0,8) → all zeros', () => {
    expect(bjorklund(0, 8)).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('E(8,8) → all ones', () => {
    expect(bjorklund(8, 8)).toEqual([1, 1, 1, 1, 1, 1, 1, 1]);
  });

  it('E(1,4)', () => {
    expect(bjorklund(1, 4)).toEqual([1, 0, 0, 0]);
  });

  it('E(2,5)', () => {
    expect(bjorklund(2, 5)).toEqual([1, 0, 1, 0, 0]);
  });

  it('E(4,12)', () => {
    expect(bjorklund(4, 12)).toEqual([1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0]);
  });
});

describe('rotate', () => {
  it('rotates positively', () => {
    expect(rotate([1, 2, 3, 4], 1)).toEqual([2, 3, 4, 1]);
  });

  it('rotates negatively', () => {
    expect(rotate([1, 2, 3, 4], -1)).toEqual([4, 1, 2, 3]);
  });

  it('handles offset larger than length', () => {
    expect(rotate([1, 2, 3], 5)).toEqual([3, 1, 2]);
  });

  it('offset 0 returns same', () => {
    expect(rotate([1, 2, 3], 0)).toEqual([1, 2, 3]);
  });
});
