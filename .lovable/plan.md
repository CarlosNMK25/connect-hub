
# Refactoring EuclideanSequencer.tsx — Plan de Ejecución

## Reglas de oro
- Criterio de verificación después de cada paso: **build limpio + 60 FPS + audio idéntico + presets funcionan**
- Si un paso rompe algo, **rollback inmediato** antes de continuar

## Paso 1: `usePedagogy` ✅ COMPLETADO
- Extraído a `src/hooks/usePedagogy.ts`
- 5 useState movidos: isStudyMode, studyVoice, isThesisOpen, hoveredGlobalParam, hoveredGlobalEl
- Build limpio, sin errores nuevos
- MesoInsightMonitor y ThesisDrawer permanecen como componentes en EuclideanSequencer.tsx (se usan inline)

## Paso 2: `usePresetManager` ✅ COMPLETADO
- Extraído a `src/hooks/usePresetManager.ts`
- 7 useState + 1 useRef + 1 useMemo + 8 funciones movidas
- Estado: userPresets, isSavingPreset, newPresetName, importError, activePresetId, hoveredPreset
- Funciones: applyPreset, injectPattern, captureCurrentConfig, applyUserPreset, handleSave/Delete/Export/Import
- Hook se instancia después de `mcm` para evitar uso antes de declaración
- Build limpio, sin errores nuevos

## Paso 3: `useTrackState` ✅ COMPLETADO
- Interfaces `TrackState`, `SceneData` extraídas a `src/types/track.ts`
- Hook `src/hooks/useTrackState.ts` creado (~750 líneas)
- 18 handlers/funciones movidos: tracks state, handleParamChange, handleSequencerAction, handleTonalAction, handleSlicerAction, handleSamplerParamChange, handlePercSynthParamChange, handleFileUpload, handleClearSampler, handleLoadLayer2, handleClearLayer2, handleLayer2ParamChange, initCloudEno, handleCloudModeChange, updateTrackPattern, updateMarkovMatrix, recalculateSlices, handleGetMarkovMatrix
- Patrón de inyección por ref: `initOrigSynthRef` y `startLorenzRafRef` inyectados desde el monolito
- 13 refs internos movidos: caState, caEvolveCycle, pendingCA, pendingMutations, rrNoteIndex, markovLast/Anchor/Matrix/Notes, driftAccumulator, sliceBoundaries
- Build limpio, sin errores nuevos

## Paso 4: `useAudioEngine` — PENDIENTE (ALTO RIESGO)
- useEffect de inicialización (~884 líneas) + initializeOriginalSynth (~1670 líneas)
- Todos los refs de audio + sync effects
- Dependencia: tracksRef, tracks (para sync effects)

## Paso 5: `useSequencer` — PENDIENTE
- Tone.Loop (~361 líneas), togglePlay, handlePhaseSync
- Refs del sequencer + recording handlers
- Dependencia: synthsRef, tracksRef, todos los refs de estado
