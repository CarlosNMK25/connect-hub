

# Plan: Fase 4B — Markov Note Mode

## Summary

Add Markov as a third note-selection mode for the Tone track. Includes the 3 agreed fixes: P1 (circular distance), P2 (no Memory UI, field stays with TODO), P3 (extract noteIdx before ratchet block).

## Files to create

### 1. `src/utils/markovGenerator.ts` (NEW)
- `MarkovStyle` type: `'scale' | 'jumps' | 'flamenco' | 'idm' | 'chromatic'`
- `generateMarkovMatrix(notes, style, temperature)` — with **fixed circular distance**: `Math.min(Math.abs(j - i), n - Math.abs(j - i))`
- `markovNextNote(currentNoteIndex, matrix)` — cumulative probability sampling
- `// TODO: orden 2 requiere tensor n×n×n` comment at top

## Files to modify

### 2. `src/components/euclidean/EuclideanSequencer.tsx`

**TrackState** (after line ~104, before `driftEnabled`):
- Add 5 fields: `noteMode`, `markovStyle`, `markovTemperature`, `markovMemory`, `markovAnchor`, `markovShowMatrix`

**Refs** (after `rrNoteIndexRef`, line ~522):
- `markovLastNoteRef`, `markovAnchorCountRef`, `markovMatrixRef`, `markovNotesRef`

**Helper** `updateMarkovMatrix(t: TrackState)` — extracts unique sorted notes, generates matrix, resets position

**Tonal block in loop** (lines ~1437-1452) — restructure to 3 branches:
1. Markov: use matrix + anchor logic
2. RR: existing code
3. Euclidean: existing code

**P3 fix — Ratchet block** (lines ~1473-1506): Extract `noteIdx` to a variable **before** the ratchet loop. The ratchet's tonal branch (line 1484) currently recalculates `noteIdx = track.noteIndices[idx]` — replace with the already-computed `noteIdx` from above.

**Stop handler** (line ~1583): Add `markovLastNoteRef.current = {}; markovAnchorCountRef.current = {};`

**Preset capture** (lines ~806): Add `noteMode`, `markovStyle`, `markovTemperature`, `markovMemory`, `markovAnchor`

**Preset apply** (lines ~914+): Add same 5 fields with defaults. Call `updateMarkovMatrix` after apply for tonal tracks.

**Track render props**: Pass `noteMode`, `markovStyle`, `markovTemperature`, `markovAnchor`, `markovShowMatrix` + 4 new handlers

### 3. `src/components/euclidean/EuclideanTrack.tsx`

**Props interface** (after line ~176): Add `noteMode`, `markovStyle`, `markovTemperature`, `markovAnchor`, `markovShowMatrix`, `onNoteModeChange`, `onMarkovParamChange`, `onMarkovRegenerate`, `onGetMarkovMatrix`

**UI** — in tonal section near Synth selector (line ~1232):
- Notes mode selector: Euclidean / Markov
- When Markov: Style select, Temperature slider, Anchor select, NUEVA MATRIZ button, VER MATRIZ toggle + heatmap table

**Memo comparison**: Add `noteMode`, `markovStyle`, `markovTemperature`, `markovAnchor`, `markovShowMatrix`

### 4. `src/utils/userPresets.ts`

**UserPresetTrack**: Add `noteMode?`, `markovStyle?`, `markovTemperature?`, `markovMemory?`, `markovAnchor?`

## Key technical decisions

- **P1**: Circular distance = `Math.min(Math.abs(j-i), n - Math.abs(j-i))`
- **P2**: `markovMemory` exists in TrackState and presets but NO UI selector. Comment `// TODO: orden 2 requiere tensor n×n×n`
- **P3**: Compute `noteIdx` once in tonal block, reuse in ratchet. Ratchet line 1484 becomes just `noteIdx` (already in scope)
- **No `markovShowMatrix` in presets** — ephemeral UI state

