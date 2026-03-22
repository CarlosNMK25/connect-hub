

## Plan: Per-Track Ratchet Parameter

### Summary
Add `ratchet` (0-4) per track. Active steps fire N additional retrigggers within the sixteenth with `0.65^r` velocity decay. Three files modified.

### Changes

**1. `EuclideanSequencer.tsx`**

- **TrackState** (line 19): Add `ratchet: number`.
- **Initial state** (~line 312): Add `ratchet: 0` to each track.
- **Sequencer loop** (after line 1059, inside `isHit` block): After main trigger, schedule ratchet repeats:
  - Subdivide `sixteenthDuration` into `ratchetCount + 1` equal parts.
  - For each repeat `r` (1..ratchetCount): schedule at `scheduledTime + subdivDuration * r` with velocity `* 0.65^r` and half duration (`"32n"` or `decay/2000`).
  - **Collision guard**: Update `lastScheduledTimesRef.current[track.id]` to the *last* ratchet's time (not just the main hit), so line 1039's check catches near-collisions at high BPM.
  - Use same synth dispatch logic (pitched kick vs player vs grainPlayer).
- **Preset capture/apply**: Include `ratchet` in both directions.
- **UI**: Pass `ratchet` and `onRatchetChange` to `<EuclideanTrack>`.

**2. `EuclideanTrack.tsx`**

- **Props**: Add `ratchet: number`, `onRatchetChange: (v: number) => void`.
- **UI**: Mini-fader after Dly/Rvb sends (same style — 6px label, 16-wide bar, click-to-set). Label "Rtch", value display "N×".
- **Memo comparator**: Add `ratchet` check.

**3. `src/utils/userPresets.ts`**

- **UserPresetTrack**: Add optional `ratchet?: number`.

### Collision note (per your observation)
At 220 BPM + ratchet 4, a sixteenth = ~68ms, subdivided into ~13.6ms gaps. The existing `lastScheduledTimesRef` guard (line 1038-1040) handles this — the fix is simply updating it to the *last* ratchet time instead of the main hit time, so the next step's collision check uses the correct baseline.

### No files created. No EuclideanStep changes. No temporality.ts changes.

