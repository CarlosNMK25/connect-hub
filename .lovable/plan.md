

## Plan: Temporal Offset Indicator Bars

### Summary
Add a micro-vertical bar in each active step showing timing displacement direction/magnitude. Three files modified, zero audio changes.

### What's already in place
- `jitter` is already a prop on `EuclideanTrack` (line 20, passed at line 2302)
- `temporalityMode`, `bpm`, and `swing` are NOT yet passed — must be added

### Changes

**1. `EuclideanSequencer.tsx`** — Pass 3 new props to `<EuclideanTrack>` (around line 2297):
- `temporalityMode={temporalityMode}`
- `bpm={bpm}`  
- `swing={swing}`

**2. `EuclideanTrack.tsx`** — 3 changes:
- Add `temporalityMode`, `bpm`, `swing` to props interface
- Add `useMemo` computing `temporalOffsets` array via `calculateTemporalOffset` (returns `null` for Grid mode)
- Pass `temporalOffset={temporalOffsets?.[i] ?? 0}` to each `<EuclideanStep>`
- Add the 3 new props to the `React.memo` comparator

**3. `EuclideanStep.tsx`** — 2 changes:
- Add `temporalOffset: number` prop (default 0)
- Render indicator bar (2px wide, track-colored, positioned at `50% + normalizedOffset * 40%`) after mutation pulse, before probability label. Only renders when `active && temporalOffset !== 0`.

### No files created. No audio/timing logic touched.

