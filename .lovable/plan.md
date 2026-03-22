

## Plan: User Presets System (localStorage + JSON export/import)

### Assessment

The plan is **well-suited** to the current codebase. Key observations:

1. **`applyPreset` only restores partial state** — it sets BPM, jitter, swing, dynamics, and per-track pulses/steps/offset, but does NOT restore probabilities, chaos, evolve, volume, or sends. The `UserPreset` format captures all of these, so `applyUserPreset` will be a more complete restoration function. This is correct and necessary.

2. **Library panel column 1** (lines 1867-1939) has clean section structure — adding "Mis Presets" as a third section below "Patrones Atómicos" fits naturally.

3. **Hover preview** currently relies on `hoveredPreset` being a `ScenePreset` with `tracks` containing only pulses/steps/offset. For user presets (which have more fields), the preview will work but will show the same visual pattern preview — no code change needed in the preview renderer since it only reads pulses/steps/offset from tracks.

4. **One concern**: The hover preview system uses `setHoveredPreset(preset: ScenePreset)`. User presets have a different interface (`UserPreset`). We need either a union type or convert `UserPreset` to a compatible shape for preview. Simplest: create a `toScenePreset(up: UserPreset): ScenePreset` adapter for hover preview only.

5. **Debounce on sliders is already handled** by existing `logSliderChange` — no conflict.

### Changes

**File 1: `src/utils/userPresets.ts` (CREATE)**
- `UserPreset` interface
- `loadUserPresets(): UserPreset[]` — reads from localStorage
- `saveUserPresets(presets: UserPreset[]): void` — writes to localStorage
- `captureCurrentConfig(name, tracks, bpm, jitter, swing, dynamics): UserPreset` — snapshots current state
- `exportPresetAsJson(preset: UserPreset): void` — triggers download
- `importPresetFromFile(file: File): Promise<UserPreset>` — reads + validates JSON
- `validateUserPreset(obj: unknown): boolean` — checks required fields
- `userPresetToScenePreset(up: UserPreset): ScenePreset` — adapter for hover preview

**File 2: `src/components/euclidean/EuclideanSequencer.tsx` (MODIFY)**
- Add state: `userPresets` (loaded from localStorage on mount), `isSavingPreset`, `newPresetName`, `importError`
- Add `applyUserPreset(up: UserPreset)` — full restoration including probabilities, chaos, evolve, volume, sends
- Add save/delete/export/import handlers
- Add "Mis Presets" section in Library column 1 (after Patrones Atómicos)
- Wire hover preview for user presets via adapter
- Hidden file input for import

### No files touched outside the allowed list. No audio engine changes. No changes to presets.ts or EngineRoom.

