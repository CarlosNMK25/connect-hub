

## Plan: Pista Tonal Euclidiana — IMPLEMENTED

### Summary
Added 5th track "Tone" with MonoSynth (sawtooth), Phrygian Dominant scale [0,1,4,5,7,8,10], per-step note index parameter locking, dynamic velocity→filter (600Hz + velocity*4000Hz), and tonal UI in EuclideanTrack/EuclideanStep.

### Files Modified
1. `src/utils/scales.ts` — NEW: Scale definitions, noteIndexToMidi, midiToNoteName
2. `src/components/euclidean/EuclideanSequencer.tsx` — TrackState tonal fields, 5th track init, MonoSynth audio chain, tonal trigger in loop + ratchet, initializeOriginalSynth for tone, preset capture/apply with tonal fields, tonal props passed to EuclideanTrack
3. `src/components/euclidean/EuclideanTrack.tsx` — Tonal props, Root/Scale/Octave selectors, note name + noteIndex passed to EuclideanStep, memo comparator updated
4. `src/components/euclidean/EuclideanStep.tsx` — Tonal props, note name display, vertical drag changes noteIndex for tonal steps
5. `src/utils/userPresets.ts` — Optional tonal fields in UserPresetTrack
