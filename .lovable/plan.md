

## Plan: Pedagogía — Prioridades Alta y Media — IMPLEMENTED

### Summary
Implemented all 4 phases of the pedagogical roadmap:
- **Fase 1**: 8 micro tooltips (technical + literary) for Ratchet, Metric Modulation, and Layer 2 parameters
- **Fase 2**: 14 micro tooltips (technical + literary) for advanced synths (PAD, DRONE, KS, MODAL, AMBIENT)
- **Fase 3**: 4 diagnosis rules for Ratchet (ratchet-alto, ratchet-multi-pista) and Metric Modulation (mm-activa, mm-encadenada), with mmHistory passed through DiagnosisContext
- **Fase 4**: 3 diagnosis rules for advanced synths (drone-flamenco, ks-ratchet, pad-poliritmia)

### Files Modified
1. `src/constants/pedagogy.ts` — 22 new entries in `micro` + 20 new entries in `microLiterary`
2. `src/utils/diagnosis.ts` — DiagnosisContext extended with mmHistoryLength/mmLastRatio/mmOriginalBpm, 7 new rules added
3. `src/components/euclidean/EngineRoom.tsx` — Props extended, mmHistory data passed to DiagnosisPanel
4. `src/components/euclidean/EuclideanSequencer.tsx` — mmHistory passed to EngineRoom and inline DiagnosisContext
