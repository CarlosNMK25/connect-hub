

## Plan: Add Study Mode tooltips to global controls and visual monitors

### What changes

**1. Add missing pedagogy entries** (`src/constants/pedagogy.ts`)

Add new keys to both `micro` and `microLiterary` for global FX parameters that don't have entries yet:
- `reverbMix` — Global reverb wet/dry mix
- `delayMix` — Global delay wet/dry mix  
- `delayFeedback` — Delay feedback amount
- `fxHighPass` — FX chain high-pass filter
- `fxLowPass` — FX chain low-pass filter
- `monitorTemporal` — Jitter distribution visualization
- `monitorDistribution` — Energy distribution histogram
- `monitorRange` — Velocity range meter
- `monitorScatter` — Hit scatter plot

**2. Add tooltip system to EuclideanSequencer** (`src/components/euclidean/EuclideanSequencer.tsx`)

- Import `getMicroText` and `createPortal` from existing dependencies
- Add `hoveredParam` and `hoveredParamEl` state variables (same pattern as EuclideanTrack)
- Create `handleParamEnter` / `handleParamLeave` handlers gated by `isStudyMode`
- Reuse the same `StudyTooltip` component (copy from EuclideanTrack or extract to shared file). Since the component is small (~50 lines), duplicating it keeps changes minimal.
- Wrap each global control label (`div` containing Tempo, Jitter, Swing, etc.) with `onMouseEnter` / `onMouseLeave` calling the handlers with the pedagogy key
- Wrap each monitor section header (Temporal, Distribution, Range, Scatter) similarly
- Render `<StudyTooltip>` at the end of the control panel

**3. Files touched**
- `src/constants/pedagogy.ts` — Add ~10 new pedagogy entries (both voices)
- `src/components/euclidean/EuclideanSequencer.tsx` — Add tooltip state, handlers, StudyTooltip component, and `onMouseEnter`/`onMouseLeave` on 13 elements

### Technical detail

The tooltip uses `ReactDOM.createPortal` to render to `document.body` with `z-index: 99999`, preventing clipping by `overflow-hidden` parents. Position is calculated from the anchor element's `getBoundingClientRect()` with a flip mechanism when space above is < 120px.

Param key mapping for global controls:
- Tempo → `bpm`, Jitter → `jitter`, Swing → `swing`, Dynamics → `dynamics`
- Space (Reverb) → `reverbMix`, Echo (Delay) → `delayMix`, Feedback → `delayFeedback`
- FX Low-Cut → `fxHighPass`, FX High-Cut → `fxLowPass`
- Monitor headers → `monitorTemporal`, `monitorDistribution`, `monitorRange`, `monitorScatter`

