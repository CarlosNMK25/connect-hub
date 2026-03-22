

# Plan: Pista Tonal Euclidiana (5th Track — "Tone")

## Summary
Add a 5th track "Tone" with a MonoSynth playing pitched notes from selectable scales. Each step has a note index (parameter lock). Includes dynamic filter by velocity. Uses Phrygian Dominant [0,1,4,5,7,8,10] as the flamenco scale.

## New File: `src/utils/scales.ts` (~45 lines)

- `SCALES` object: `{ chromatic, minor, major, phrygianDominant, dorian, pentatonicMinor, wholeTone }` — each is an array of semitone intervals
- Phrygian Dominant: `[0,1,4,5,7,8,10]` (the real flamenco scale, NOT standard phrygian)
- `SCALE_NAMES`: display labels mapping
- `noteIndexToMidi(rootNote, scaleIntervals, noteIndex)` → MIDI number
- `midiToNoteName(midi)` → string ("C3", "D#4") using Tone.Frequency

## `src/components/euclidean/EuclideanSequencer.tsx`

### TrackState (line 19)
Add 6 fields: `isTonal`, `rootNote` (MIDI, default 48=C3), `scaleId` (default `'phrygianDominant'`), `octaveRange` (1-3, default 2), `noteIndices` (number[], length 64, default all 0), `synthType` ('mono')

### Initial state (line 349)
Add 5th track after cloud:
```
{ id: 'tone', name: 'Tone', color: '#B45309', pulses: 3, steps: 8, offset: 0,
  isTonal: true, rootNote: 48, scaleId: 'phrygianDominant', octaveRange: 2,
  noteIndices: new Array(64).fill(0), synthType: 'mono', ... }
```

### Audio init (after cloud setup, ~line 884)
Create MonoSynth chain:
```
toneDelaySend → delayBus
toneReverbSend → reverbBus
toneFilter (LP 2000Hz) → compressor, delaySend, reverbSend
MonoSynth (sawtooth, LP filter, filterEnvelope) → toneFilter
```
Dynamic filter: `velocity * 4000Hz` (similar to kick's `velocity * 3000Hz`)

Synth object follows same pattern as kick/snare/hat:
- `triggerAttackRelease(note, duration, time, velocity)` — note is a string like "C3"
- Inside: ramp `toneFilter.frequency` to `baseCutoff + velocity * 4000`
- `setVolume`, `setSends`, `dispose`

### Sequencer loop (line 960)
- Skip tone track like cloud is skipped? NO — tone participates like kick/snare/hat
- Inside `isHit` block (line 1034): detect `track.isTonal`, compute note from `noteIndices[idx]` + scale + root using `noteIndexToMidi`, convert to note name, call `synth.triggerAttackRelease(noteName, duration, time, velocity)`
- Ratchet works naturally — same note, decaying velocity

### MCM calculation (line 657)
- Exclude cloud but INCLUDE tone (it's rhythmic)

### initializeOriginalSynth (line 1404)
- Add `else if (trackId === 'tone')` block recreating the MonoSynth chain

### captureCurrentConfig (line 561)
- Include `rootNote, scaleId, octaveRange, noteIndices` in track capture

### applyUserPreset (line 601)
- Apply tonal fields with defaults: `rootNote: config.rootNote ?? 48`, etc.

### Track rendering (line 2326)
- Pass new tonal props + callbacks to `<EuclideanTrack>`
- Add handlers: `onRootNoteChange`, `onScaleChange`, `onOctaveRangeChange`, `onNoteIndexChange`

### Footer (line 2434)
- Add `TONE: Mono` label

## `src/components/euclidean/EuclideanTrack.tsx`

### Props (line 12)
Add: `isTonal`, `rootNote`, `scaleId`, `octaveRange`, `noteIndices`, `onRootNoteChange`, `onScaleChange`, `onOctaveRangeChange`, `onNoteIndexChange`

### UI
- For tonal track: add a controls row below the track header with Root Note selector (C2-C5 dropdown), Scale selector (dropdown), Octave Range (1-3 slider). Same styling as existing controls.
- Step grid: pass `isTonal`, `noteName`, and `onNoteIndexChange` to each `EuclideanStep`
- `noteName` computed per step using `noteIndexToMidi` + `midiToNoteName`

### Memo comparator (line 991)
Add checks for all new tonal props

## `src/components/euclidean/EuclideanStep.tsx`

### Props (line 4)
Add optional: `isTonal?: boolean`, `noteName?: string`, `noteIndex?: number`, `maxNoteIndex?: number`, `onNoteIndexChange?: (val: number) => void`

### Behavior
- When `isTonal && active`: display note name centered (e.g. "C3") instead of probability %
- Vertical drag: changes `noteIndex` (up = higher note) instead of probability
- Click: still toggles step on/off
- Double-click: toggles between note name and probability editing mode
- Probability fill bar still renders (tonal steps still have probability)

## `src/utils/userPresets.ts`

### UserPresetTrack
Add optional: `rootNote?, scaleId?, octaveRange?, noteIndices?`

## Technical Details

### Dynamic Filter (velocity → timbre)
Like kick (800 + velocity*3000), snare (1500 + velocity*5000), hat (2000 + velocity*8000):
- Tone: baseCutoff 600Hz + velocity * 4000Hz
- This gives range 600Hz–4600Hz — warm at low velocity, bright at high

### Scale Data
```
phrygianDominant: [0, 1, 4, 5, 7, 8, 10]  // THE flamenco scale
chromatic: [0,1,2,3,4,5,6,7,8,9,10,11]
minor: [0,2,3,5,7,8,10]
major: [0,2,4,5,7,9,11]
dorian: [0,2,3,5,7,9,10]
pentatonicMinor: [0,3,5,7,10]
wholeTone: [0,2,4,6,8,10]
```

### Note calculation
```
noteIndex = track.noteIndices[stepIdx]
scale = SCALES[track.scaleId]
midi = rootNote + scale[noteIndex % scale.length] + 12 * floor(noteIndex / scale.length)
noteName = Tone.Frequency(midi, "midi").toNote()
```

### Files NOT touched
`temporality.ts`, `bjorklund.ts`, `math.ts`, `EngineRoom.tsx`, `index.css`, `presets.ts`

