
# Refactoring EuclideanSequencer.tsx — Plan de Ejecución

## Reglas de oro
- Criterio de verificación después de cada paso: **build limpio + 60 FPS + audio idéntico + presets funcionan**
- Si un paso rompe algo, **rollback inmediato** antes de continuar

## Paso 1: `usePedagogy` ✅ COMPLETADO
- Extraído a `src/hooks/usePedagogy.ts`
- 5 useState movidos: isStudyMode, studyVoice, isThesisOpen, hoveredGlobalParam, hoveredGlobalEl
- Build limpio, sin errores nuevos
- MesoInsightMonitor y ThesisDrawer permanecen como componentes en EuclideanSequencer.tsx (se usan inline)

## Paso 2: `usePresetManager` — PENDIENTE
- userPresets, isSavingPreset, newPresetName, importError, importInputRef, activePresetId, hoveredPreset, previewPatterns
- captureCurrentConfig, applyPreset, applyUserPreset, handleSave/Delete/Export/Import
- Dependencia: synthsRef (solo en setTimeout de applyUserPreset)

## Paso 3: `useTrackState` — PENDIENTE
- tracks, setTracks, handleParamChange, handleSequencerAction, handleTonalAction, handleSlicerAction
- handleSamplerParamChange, handleFileUpload, handleLayer2
- Dependencia: synthsRef, masterBusRef

## Paso 4: `useAudioEngine` — PENDIENTE (ALTO RIESGO)
- useEffect de inicialización (~884 líneas) + initializeOriginalSynth (~1670 líneas)
- Todos los refs de audio + sync effects
- Dependencia: tracksRef, tracks (para sync effects)

## Paso 5: `useSequencer` — PENDIENTE
- Tone.Loop (~361 líneas), togglePlay, handlePhaseSync
- Refs del sequencer + recording handlers
- Dependencia: synthsRef, tracksRef, todos los refs de estado
