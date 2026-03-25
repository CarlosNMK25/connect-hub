

# Fase 4 Pedagógica — Confirmación y Plan de Implementación

## Verificación solicitada

**patternMode** — Present in capture (line ~845) and apply (line ~957) with default `'euclidean'`.
**noteMode** — Present in capture (line ~840) and apply (line ~953) with default `'euclidean'`.

Both fields are already handled. No fix needed.

## Plan: Implement Phase 4 Pedagogy

### 1. `src/constants/pedagogy.ts`
Add 14 new entries to `micro` and `microLiterary` objects covering L-Systems, CA, and Markov parameters. Texts verbatim from PEDAGOGIA_FASE4.md.

### 2. `src/utils/diagnosis.ts`
- Extend `DiagnosisContext.tracks` with: `patternMode`, `noteMode`, `markovStyle`, `markovTemperature`, `markovAnchor`, `lsIterations`, `caSpeed`
- Add 7 new rules from the document (ls-con-euclidean, ca-evolucionando, markov-flamenco, entropia-generativa-maxima, ls-iteraciones-altas, markov-anclaje-flamenco, tres-motores-patron)

### 3. `src/components/euclidean/EngineRoom.tsx`
- Extend `TrackSnapshot` with the new fields
- Pass them through to `DiagnosisContext` in `DiagnosisPanel`

### 4. `src/constants/presets.ts`
- Extend `TrackPreset` with Phase 4 fields
- Add 2 new presets: `fibonacci-tree` and `markov-flamenca`

### 5. `src/constants/presetPedagogy.ts`
- Add listening guides for `fibonacci-tree` and `markov-flamenca`
- Update `confield` with CA-focused listening guide

### 6. `src/components/euclidean/EuclideanSequencer.tsx`
- Pass new TrackState fields into EngineRoom's track snapshots

### Technical notes
- All texts copied verbatim from reference document
- New presets use existing `patternMode`/`noteMode` fields already supported by apply logic
- No structural changes to preset system needed

