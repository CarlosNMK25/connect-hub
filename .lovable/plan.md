

# Hoja de Ruta: Pedagogía — Prioridades Alta y Media

## Estado actual

El sistema pedagógico tiene 3 capas: **Micro** (tooltips técnicos/literarios), **Meso** (plantillas contextuales no renderizadas), y **Macro** (ensayos). El diagnóstico tiene 25 reglas. Tras las fases recientes (Ratchet, Metric Modulation, Layer 2, synths avanzados), hay gaps significativos.

---

## Fase 1 — Tooltips Micro: Ratchet + Metric Modulation + Layer 2 (ALTA)

**Archivo**: `src/constants/pedagogy.ts`

Añadir entradas en `micro` y `microLiterary` para:

| Key | Concepto |
|-----|----------|
| `ratchet` | Retrigger — subdivisión interna del step (×2, ×3, ×4). Relación con flamenco redoble/zapateado |
| `metricModulation` | Cambio de subdivisión percibida. Ratios 3:2, 4:3, etc. Referencia a Stravinsky, Nancarrow |
| `layer2Blend` | Mezcla entre sample principal y capa secundaria |
| `layer2Pitch` | Transposición independiente de Layer 2 |
| `layer2Offset` | Desplazamiento temporal de Layer 2 respecto al hit |
| `layer2Filter` | LPF de Layer 2 (200-8000Hz) |

Esfuerzo: ~30 min. Sin dependencias.

---

## Fase 2 — Tooltips Micro: Synths avanzados (MEDIA)

**Archivo**: `src/constants/pedagogy.ts`

Añadir entradas para los 5 tipos de síntesis sin cobertura:

| Key | Concepto |
|-----|----------|
| `padDecay` / `padSpread` | PAD: síntesis de acordes con múltiples osciladores detuned |
| `droneInterval` / `droneDrift` | DRONE: tono sostenido con intervalo y microafinación |
| `ksDecay` / `ksBrightness` | KS (Karplus-Strong): síntesis física de cuerdas pulsadas |
| `modalFreqs` / `modalDecay` | MODAL: resonadores modales, síntesis física de percusión |
| `ambientTexture` / `ambientDepth` | AMBIENT: texturas atmosféricas generativas |

Esfuerzo: ~30 min. Sin dependencias.

---

## Fase 3 — Reglas de Diagnóstico: Ratchet + MM (ALTA)

**Archivo**: `src/utils/diagnosis.ts`

4 reglas nuevas:

1. **`ratchet-alto`** (prioridad 55): Detecta ratchet ≥ 3 en cualquier pista. Insight sobre relación con redoble flamenco / hi-hat trap.
2. **`ratchet-multi-pista`** (prioridad 60): ≥2 pistas con ratchet > 0. Insight sobre densidad de retriggering y microrritmia.
3. **`mm-activa`** (prioridad 50): `mmHistory.length > 0`. Insight pedagógico sobre qué subdivisión se convirtió en beat. Requiere pasar `mmHistory` al `DiagnosisContext`.
4. **`mm-encadenada`** (prioridad 65): `mmHistory.length >= 3`. Insight sobre modulación en cadena y BPM resultante vs original.

**Cambios necesarios**:
- Ampliar `DiagnosisContext.globalState` con `mmHistory` (array o length + lastRatio).
- Pasar `mmHistory` desde `EngineRoom` → `DiagnosisPanel` → `evaluateDiagnosis`.

Esfuerzo: ~45 min. Dependencia: EngineRoom props.

---

## Fase 4 — Reglas de Diagnóstico: Synths avanzados (MEDIA)

**Archivo**: `src/utils/diagnosis.ts`

3 reglas nuevas:

1. **`drone-flamenco`** (prioridad 65): Drone + modo Flamenco + escala Phrygian Dominant. Insight sobre bordón flamenco digital.
2. **`ks-ratchet`** (prioridad 55): Karplus-Strong + ratchet. Insight sobre cuerda pulsada con retrigger = rasgueado.
3. **`pad-poliritmia`** (prioridad 50): PAD con steps primo. Insight sobre acordes sostenidos en ciclos asimétricos.

Esfuerzo: ~30 min. Dependencia: Fase 3 (DiagnosisContext ya ampliado).

---

## Orden de implementación recomendado

```text
Fase 1 ──→ Fase 2 ──→ Fase 3 ──→ Fase 4
(tooltips)  (tooltips)  (diagnosis)  (diagnosis)
 ALTA        MEDIA       ALTA         MEDIA
 ~30m        ~30m        ~45m         ~30m
```

Las fases 1 y 2 son independientes entre sí (pueden ir en paralelo).
Las fases 3 y 4 son secuenciales (4 depende de los cambios de contexto de 3).

**Total estimado**: ~2h 15m de implementación.

### Archivos afectados

| Archivo | Fases |
|---------|-------|
| `src/constants/pedagogy.ts` | 1, 2 |
| `src/utils/diagnosis.ts` | 3, 4 |
| `src/components/euclidean/EngineRoom.tsx` | 3 (props de mmHistory) |
| `src/components/euclidean/EuclideanSequencer.tsx` | 3 (pasar mmHistory a EngineRoom) |

### Archivos que NO se tocan
- `EuclideanTrack.tsx`, `EuclideanStep.tsx`, `presets.ts`, `presetPedagogy.ts`

