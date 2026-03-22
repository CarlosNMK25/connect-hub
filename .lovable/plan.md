

## Plan: Add Eclipse Countdown and Hit Rate indicators to Sync panel

### Summary
Add two new metric cells to the existing Sync panel grid, expanding it from 2 columns to a responsive 4-column layout. Pure UI work — no audio engine changes.

### Changes (single file: `EuclideanSequencer.tsx`)

**1. Derived calculations before the return**

- **Eclipse countdown**: `stepsRestantes = mcm - (globalStep % mcm)`. Format seconds as `Xm Ys` or `Xs`. If not playing, show total cycle time. If > 10min, show `~Xm`.
- **Eclipse detection**: Use a `useRef` + `useEffect` to latch the eclipse state. When `stepsRestantes <= 1`, set `eclipseFlash = true` and start a 1.2s `setTimeout` to clear it. The ref prevents re-triggering during the same eclipse window. This way the "NOW ✦" label persists for a full animation cycle regardless of how many frames `globalStep % mcm` stays at 0.
- **Hit Rate**: Aggregate `uiStats[trackId].hits` and `.misses` for non-cloud tracks. `hitRate = total > 0 ? Math.round(hits/total*100) : null`. Show "—" when null.

**2. Expand the grid** (lines ~1690-1705)

Change `grid-cols-2` → `grid-cols-2 lg:grid-cols-4` and add two new cells after Impacto:

- **Eclipse cell**: Label "ECLIPSE", value in `font-mono text-system-accent`. When `eclipseFlash` is true, show "NOW ✦" with `animate-pulse` (CSS, ~1.2s). Otherwise show the countdown.
- **Hit Rate cell**: Label "HIT RATE", value `XX%` in `font-mono`. Color: `text-idm-ink` (≥80%), `text-system-accent` (50-79%), `text-red-500` (<50%).

**3. Study Mode tooltips** on both new labels (same pattern as existing MCM/Impacto).

### Eclipse latch detail

```text
useEffect:
  if stepsRestantes <= 1 AND !eclipseRef.current:
    eclipseRef.current = true
    setEclipseFlash(true)
    setTimeout(() => {
      setEclipseFlash(false)
      eclipseRef.current = false
    }, 1200)

deps: [stepsRestantes]
```

One `useRef` (boolean flag) + one `useState` (for render). The ref gates re-entry so even if `stepsRestantes` bounces between 0 and 1 across multiple 100ms ticks, the flash fires exactly once per eclipse and stays visible for 1.2 seconds.

### Files touched
- `src/components/euclidean/EuclideanSequencer.tsx` only

