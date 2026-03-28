import React from 'react';
import { Disc, Zap, Save, Download, Upload, Trash2, X, Atom } from 'lucide-react';
import { PRESETS, type ScenePreset, type TrackPreset } from '../../constants/presets';
import { UserPreset, userPresetToScenePreset, exportPresetAsJson } from '../../utils/userPresets';

interface LibraryPanelProps {
  userPresets: UserPreset[];
  hoveredPreset: ScenePreset | null;
  setHoveredPreset: (preset: ScenePreset | null) => void;
  selectedPreset: ScenePreset | null;
  isSavingPreset: boolean;
  setIsSavingPreset: (v: boolean) => void;
  newPresetName: string;
  setNewPresetName: (v: string) => void;
  importError: string | null;
  importInputRef: React.RefObject<HTMLInputElement>;
  applyPreset: (preset: ScenePreset) => void;
  injectPattern: (trackId: string, config: any) => void;
  applyUserPreset: (preset: UserPreset) => void;
  handleSaveUserPreset: () => void;
  handleDeleteUserPreset: (id: string) => void;
  handleExportCurrent: () => void;
  handleImportPreset: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const LibraryPanel: React.FC<LibraryPanelProps> = ({
  userPresets, hoveredPreset, setHoveredPreset, selectedPreset,
  isSavingPreset, setIsSavingPreset,
  newPresetName, setNewPresetName,
  importError, importInputRef,
  applyPreset, injectPattern, applyUserPreset,
  handleSaveUserPreset, handleDeleteUserPreset,
  handleExportCurrent, handleImportPreset,
}) => {
  const displayPreset = hoveredPreset ?? selectedPreset;
  return (
    <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2 duration-500">
      <div className="md:col-span-1 bg-white border border-black/5 rounded-2xl p-4 shadow-sm max-h-[450px] overflow-y-auto custom-scrollbar">
        <h2 className="text-[10px] font-mono uppercase tracking-[0.3em] text-system-accent mb-4 flex items-center gap-2 sticky top-0 bg-white/90 py-2 z-10">
          <Disc size={12} />
          Librería EPL
        </h2>
        
        <div className="space-y-6">
          {/* Master Scenes Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-px flex-1 bg-system-accent/10"></div>
              <span className="text-[8px] font-mono text-system-accent/60 uppercase tracking-widest">Escenas Maestras</span>
              <div className="h-px flex-1 bg-system-accent/10"></div>
            </div>
            <div className="flex flex-col gap-1">
              {PRESETS.filter(p => p.type === 'master').map(preset => (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset)}
                  onMouseEnter={() => setHoveredPreset(preset)}
                  onMouseLeave={() => setHoveredPreset(null)}
                  className="text-left px-3 py-2 rounded-lg text-[10px] font-mono border border-transparent hover:border-system-accent/20 hover:bg-system-accent/5 transition-all group flex justify-between items-center"
                >
                  <div className="flex flex-col">
                    <span className="text-idm-ink group-hover:text-system-accent font-bold">{preset.name}</span>
                    <span className="text-[8px] text-idm-muted">{preset.bpm} BPM</span>
                  </div>
                  <Zap size={10} className="opacity-0 group-hover:opacity-100 text-system-accent transition-opacity" />
                </button>
              ))}
            </div>
          </div>

          {/* Atomic Patterns Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-px flex-1 bg-black/5"></div>
              <span className="text-[8px] font-mono text-idm-muted uppercase tracking-widest">Patrones Atómicos</span>
              <div className="h-px flex-1 bg-black/5"></div>
            </div>
            <div className="flex flex-col gap-2">
              {PRESETS.filter(p => p.type === 'atomic').map(preset => (
                <div 
                  key={preset.id}
                  onMouseEnter={() => setHoveredPreset(preset)}
                  onMouseLeave={() => setHoveredPreset(null)}
                  className="flex flex-col gap-2 p-2 rounded-xl border border-transparent hover:border-black/5 hover:bg-black/5 transition-all"
                >
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] font-mono text-idm-ink font-bold">{preset.name}</span>
                    <span className="text-[8px] font-mono text-system-accent/50">E({preset.config?.pulses}, {preset.config?.steps})</span>
                  </div>
                  <div className="flex gap-1">
                    {[
                      { id: 'kick', label: 'K' },
                      { id: 'snare', label: 'S' },
                      { id: 'hat', label: 'H' }
                    ].map(track => (
                      <button
                        key={track.id}
                        onClick={() => injectPattern(track.id, preset.config!)}
                        className="flex-1 py-1 rounded-md bg-black/5 hover:bg-system-accent hover:text-white text-[9px] font-mono font-bold text-idm-muted border border-black/5 transition-all uppercase"
                        title={`Inyectar en ${track.id}`}
                      >
                        {track.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* User Presets Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-px flex-1 bg-system-accent/10"></div>
              <span className="text-[8px] font-mono text-system-accent/60 uppercase tracking-widest">Mis Presets</span>
              <div className="h-px flex-1 bg-system-accent/10"></div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-1 mb-2">
              <button
                onClick={() => { setIsSavingPreset(true); }}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md border border-dashed border-system-accent/30 text-system-accent text-[9px] font-mono hover:bg-system-accent/5 transition-all"
              >
                <Save size={10} /> Save
              </button>
              <button
                onClick={handleExportCurrent}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md border border-dashed border-system-accent/30 text-system-accent text-[9px] font-mono hover:bg-system-accent/5 transition-all"
              >
                <Download size={10} /> Export
              </button>
              <button
                onClick={() => importInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md border border-dashed border-system-accent/30 text-system-accent text-[9px] font-mono hover:bg-system-accent/5 transition-all"
              >
                <Upload size={10} /> Import
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept=".json,application/json"
                style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden', opacity: 0 }}
                onChange={handleImportPreset}
              />
            </div>

            {/* Save inline input */}
            {isSavingPreset && (
              <div className="flex gap-1 items-center mb-2 animate-in fade-in duration-200">
                <input
                  autoFocus
                  value={newPresetName}
                  onChange={e => setNewPresetName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveUserPreset(); if (e.key === 'Escape') setIsSavingPreset(false); }}
                  placeholder="Mi preset..."
                  className="flex-1 bg-transparent border-b border-system-accent/30 text-[10px] font-mono text-idm-ink py-1 px-1 outline-none focus:border-system-accent placeholder:text-idm-muted/50"
                />
                <button onClick={handleSaveUserPreset} className="text-system-accent hover:text-system-accent/80 p-1">
                  <Save size={12} />
                </button>
                <button onClick={() => setIsSavingPreset(false)} className="text-idm-muted hover:text-idm-ink p-1">
                  <X size={12} />
                </button>
              </div>
            )}

            {/* Import error */}
            {importError && (
              <div className="text-[9px] font-mono text-red-500 mb-2 animate-in fade-in duration-200">
                {importError}
              </div>
            )}

            {/* User preset list */}
            <div className="flex flex-col gap-1">
              {userPresets.length === 0 && !isSavingPreset ? (
                <p className="text-idm-muted text-[9px] font-mono text-center py-3">Guarda tu primera configuración</p>
              ) : (
                userPresets.map(up => (
                  <button
                    key={up.id}
                    onClick={() => applyUserPreset(up)}
                    onMouseEnter={() => setHoveredPreset(userPresetToScenePreset(up))}
                    onMouseLeave={() => setHoveredPreset(null)}
                    className="text-left px-3 py-2 rounded-lg text-[10px] font-mono border border-transparent hover:border-black/10 hover:bg-black/[0.03] transition-all group flex justify-between items-center"
                  >
                    <div className="flex flex-col">
                      <span className="text-idm-ink group-hover:text-idm-ink font-bold">{up.name}</span>
                      <span className="text-[8px] text-idm-muted">{up.bpm} BPM · {new Date(up.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span
                        role="button"
                        onClick={e => { e.stopPropagation(); exportPresetAsJson(up); }}
                        className="p-1 text-idm-muted hover:text-system-accent"
                      >
                        <Download size={10} />
                      </span>
                      <span
                        role="button"
                        onClick={e => { e.stopPropagation(); handleDeleteUserPreset(up.id); }}
                        className="p-1 text-idm-muted hover:text-red-500"
                      >
                        <Trash2 size={10} />
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="md:col-span-3 bg-white border border-black/5 rounded-2xl p-8 flex flex-col justify-center relative overflow-hidden shadow-sm">
        {displayPreset ? (
          <div className="animate-in fade-in slide-in-from-left-4 duration-500" key={displayPreset.id}>
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-2 h-2 rounded-full ${displayPreset.type === 'master' ? 'bg-system-accent shadow-[0_0_10px_rgba(249,115,22,0.3)]' : 'bg-idm-muted'}`}></div>
              <h3 className="text-system-accent font-mono font-bold text-2xl uppercase tracking-tighter">{displayPreset.name}</h3>
              <span className={`px-3 py-1 rounded-full text-[9px] font-mono uppercase tracking-widest border ${displayPreset.type === 'master' ? 'bg-system-accent/5 border-system-accent/20 text-system-accent' : 'bg-idm-bg border-black/5 text-idm-muted'}`}>
                {displayPreset.type === 'master' ? 'Escena Maestra' : 'Patrón Atómico'}
              </span>
            </div>
            
            <div className="max-w-xl">
              <p className="text-idm-ink/70 font-mono text-xs uppercase leading-relaxed mb-8 border-l-2 border-system-accent/30 pl-4">
                {displayPreset.description}
              </p>
              
              <div className="grid grid-cols-3 gap-8">
                {displayPreset.type === 'master' ? (
                  <>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-mono text-idm-muted uppercase tracking-widest mb-2">Configuración Global</span>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-mono">
                          <span className="text-idm-muted">TEMPO</span>
                          <span className="text-system-accent">{displayPreset.bpm} BPM</span>
                        </div>
                        <div className="flex justify-between text-[10px] font-mono">
                          <span className="text-idm-muted">JITTER</span>
                          <span className="text-system-accent">{displayPreset.jitter}ms</span>
                        </div>
                        <div className="flex justify-between text-[10px] font-mono">
                          <span className="text-idm-muted">SWING</span>
                          <span className="text-system-accent">{displayPreset.swing}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="col-span-2 flex flex-col">
                      <span className="text-[9px] font-mono text-idm-muted uppercase tracking-widest mb-2">Geometría de Pistas</span>
                      <div className="grid grid-cols-3 gap-4">
                        {Object.entries(displayPreset.tracks || {}).map(([id, config]) => {
                          const trackConfig = config as TrackPreset;
                          return (
                            <div key={id} className="bg-black/5 p-2 rounded border border-black/5">
                              <div className="text-[8px] text-idm-muted uppercase mb-1">{id}</div>
                              <div className="text-xs font-mono text-system-accent">E({trackConfig.pulses}, {trackConfig.steps})</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-mono text-idm-muted uppercase tracking-widest mb-2">Fórmula Bjorklund</span>
                      <div className="text-2xl font-mono text-system-accent tracking-tighter">
                        E({displayPreset.config?.pulses}, {displayPreset.config?.steps})
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-mono text-idm-muted uppercase tracking-widest mb-2">Densidad</span>
                      <div className="text-2xl font-mono text-system-accent tracking-tighter">
                        {Math.round((displayPreset.config?.pulses! / displayPreset.config?.steps!) * 100)}%
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-mono text-idm-muted uppercase tracking-widest mb-2">Offset</span>
                      <div className="text-2xl font-mono text-system-accent tracking-tighter">
                        {displayPreset.config?.offset}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center opacity-10">
            <Atom size={48} className="mb-4 text-system-accent animate-spin-slow" />
            <p className="text-xs font-mono uppercase tracking-[0.4em] leading-loose">
              Surgical Read-Only Mode<br/>
              <span className="text-[10px] opacity-60">Selecciona un preset para previsualizar su topografía</span>
            </p>
          </div>
        )}
        
        {/* Ghost Preview Active Indicator */}
        {hoveredPreset && (
          <div className="absolute top-6 right-6 flex items-center gap-2 text-[9px] font-mono text-system-accent/80 animate-pulse">
            <Zap size={12} />
            GHOST PREVIEW ACTIVE
          </div>
        )}
      </div>
    </div>
  );
};
