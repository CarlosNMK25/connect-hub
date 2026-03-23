import React, { useMemo, useState } from 'react';
import { Trash2, ChevronRight, ChevronDown } from 'lucide-react';
import { PRESET_PEDAGOGY } from '../../constants/presetPedagogy';
import { PRESETS } from '../../constants/presets';
import { diagnose, type DiagnosisTrack } from '../../utils/diagnosis';

export interface LogEntry {
  timestamp: string;
  action: string;
  deltas: string[];
}

interface TrackSnapshot {
  id: string;
  name: string;
  color: string;
  pulses: number;
  steps: number;
  offset: number;
  probabilities: number[];
  chaosEnabled: boolean;
  entropy: number;
  evolveEnabled: boolean;
  mutationRate: number;
  ratchet: number;
  scaleId?: string;
  rootNote?: number;
  isTonal?: boolean;
}

interface EngineRoomProps {
  tracks: TrackSnapshot[];
  uiStats: { [key: string]: { hits: number; misses: number; cycleCount: number } };
  log: LogEntry[];
  onClearLog: () => void;
  activePresetId: string | null;
  temporalityMode: string;
  jitter: number;
  swing: number;
  dynamics: number;
  bpm: number;
  hitRate: number | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  Flamenco: 'bg-green-900/10 text-green-900',
  IDM: 'bg-orange-500/10 text-orange-600',
  Glitch: 'bg-purple-600/10 text-purple-700',
  Experimental: 'bg-blue-600/10 text-blue-700',
};

const SECTION_LABELS = [
  { key: 'listening', label: 'Qué estás escuchando' },
  { key: 'structure', label: 'La estructura' },
  { key: 'origin', label: 'Origen' },
  { key: 'experiments', label: 'Experimenta' },
  { key: 'connections', label: 'Conexiones' },
] as const;

const DiagnosticSection: React.FC<{ activePresetId: string | null }> = React.memo(({ activePresetId }) => {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['structure']));

  const preset = activePresetId ? PRESETS.find(p => p.id === activePresetId) : null;
  const pedagogy = activePresetId ? PRESET_PEDAGOGY[activePresetId] : null;

  const toggle = (key: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (!preset || !pedagogy) {
    return (
      <div>
        <div className="text-[8px] uppercase tracking-[0.2em] text-idm-muted mb-2">── Diagnóstico ──</div>
        <div className="text-[9px] text-idm-muted/50 py-3 text-center">
          Carga un preset de la Library para ver su análisis pedagógico.
        </div>
      </div>
    );
  }

  const categoryStyle = CATEGORY_COLORS[preset.category] || 'bg-black/5 text-idm-ink';

  return (
    <div>
      <div className="text-[8px] uppercase tracking-[0.2em] text-idm-muted mb-3">── Diagnóstico ──</div>

      {/* Preset header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm font-mono font-bold uppercase tracking-wider text-idm-ink">
          {preset.name}
        </span>
        <span className={`text-[8px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full ${categoryStyle}`}>
          {preset.category}
        </span>
      </div>

      {/* Sections */}
      <div className="space-y-0.5">
        {SECTION_LABELS.map(({ key, label }) => {
          const isOpen = openSections.has(key);
          const Icon = isOpen ? ChevronDown : ChevronRight;

          return (
            <div key={key}>
              <button
                onClick={() => toggle(key)}
                className="flex items-center gap-1.5 w-full text-left py-1.5 text-[9px] font-mono uppercase tracking-widest text-idm-muted cursor-pointer hover:text-idm-ink transition-colors"
              >
                <Icon size={10} className="shrink-0" />
                {label}
              </button>

              {isOpen && (
                <div className="pl-4 pb-3 text-[11px] font-mono leading-relaxed text-idm-ink/80">
                  {key === 'experiments' ? (
                    <div className="space-y-1.5">
                      {pedagogy.experiments.map((exp, i) => (
                        <div key={i} className="flex gap-1.5">
                          <span className="text-system-accent shrink-0">→</span>
                          <span>{exp}</span>
                        </div>
                      ))}
                    </div>
                  ) : key === 'connections' ? (
                    <div className="space-y-1.5">
                      {pedagogy.connections.map((conn, i) => (
                        <div key={i} className="flex gap-1.5">
                          <span className="text-idm-muted shrink-0">→</span>
                          <span>{conn}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>{pedagogy[key as 'listening' | 'structure' | 'origin']}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

DiagnosticSection.displayName = 'DiagnosticSection';

const LiveDiagnosis: React.FC<{
  tracks: TrackSnapshot[];
  temporalityMode: string;
  jitter: number;
  swing: number;
  dynamics: number;
  bpm: number;
  hitRate: number | null;
}> = React.memo(({ tracks, temporalityMode, jitter, swing, dynamics, bpm, hitRate }) => {
  const insights = useMemo(() => {
    const diagTracks: DiagnosisTrack[] = tracks.map(t => ({
      id: t.id, name: t.name, steps: t.steps, pulses: t.pulses,
      offset: t.offset, chaosEnabled: t.chaosEnabled, entropy: t.entropy,
      evolveEnabled: t.evolveEnabled, mutationRate: t.mutationRate,
      ratchet: t.ratchet, scaleId: t.scaleId, rootNote: t.rootNote, isTonal: t.isTonal,
    }));
    return diagnose({ tracks: diagTracks, temporalityMode, jitter, swing, dynamics, bpm, hitRate });
  }, [tracks, temporalityMode, jitter, swing, dynamics, bpm, hitRate]);

  return (
    <div>
      <div className="text-[8px] uppercase tracking-[0.2em] text-idm-muted mb-3">── Intérprete ──</div>
      {insights.length === 0 ? (
        <div className="text-[9px] text-idm-muted/50 py-3 text-center">
          Cambia parámetros para ver el diagnóstico en tiempo real.
        </div>
      ) : (
        <div className="space-y-3">
          {insights.map(ins => (
            <div key={ins.id} className="space-y-1">
              <div className="flex items-start gap-2">
                <span className="text-sm shrink-0 leading-none mt-0.5">{ins.icon}</span>
                <p className="text-[11px] font-mono leading-relaxed text-idm-ink/80">{ins.insight}</p>
              </div>
              <div className="flex items-start gap-1.5 pl-6">
                <span className="text-system-accent shrink-0">→</span>
                <p className="text-[10px] font-mono leading-relaxed text-system-accent/90">{ins.suggestion}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

LiveDiagnosis.displayName = 'LiveDiagnosis';

export const EngineRoom: React.FC<EngineRoomProps> = React.memo(({ tracks, uiStats, log, onClearLog, activePresetId, temporalityMode, jitter, swing, dynamics, bpm, hitRate }) => {
  const rows = useMemo(() => tracks.map(t => {
    const density = t.steps > 0 ? Math.round((t.pulses / t.steps) * 100) : 0;
    const activeProbs = t.probabilities.slice(0, t.steps);
    const probAvg = activeProbs.length > 0
      ? Math.round(activeProbs.reduce((a, b) => a + b, 0) / activeProbs.length * 100)
      : 0;
    const chaos = t.chaosEnabled ? `${t.entropy}×` : '—';
    const evolve = t.evolveEnabled ? `${Math.round(t.mutationRate * 100)}%` : '—';
    const stats = uiStats[t.id];
    const isCloud = t.id === 'cloud';
    return {
      ...t, density, probAvg, chaos, evolve,
      cycles: isCloud ? '—' : (stats?.cycleCount ?? 0),
      hits: isCloud ? '—' : (stats?.hits ?? 0),
      misses: isCloud ? '—' : (stats?.misses ?? 0),
    };
  }), [tracks, uiStats]);

  return (
    <div className="mb-8 bg-idm-ink/[0.03] border border-black/5 rounded-2xl p-5 font-mono animate-in fade-in slide-in-from-top-2 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-idm-ink/60">⚙ Engine Room</span>
        </div>
        {log.length > 0 && (
          <button
            onClick={onClearLog}
            className="flex items-center gap-1 px-2 py-1 rounded text-[8px] uppercase tracking-wider text-idm-muted hover:text-idm-ink hover:bg-black/5 transition-colors"
            title="Limpiar log"
          >
            <Trash2 size={10} />
            <span className="hidden sm:inline">Limpiar</span>
          </button>
        )}
      </div>

      {/* State Table */}
      <div className="mb-5">
        <div className="text-[8px] uppercase tracking-[0.2em] text-idm-muted mb-2">── Estado del Motor ──</div>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr className="border-b border-black/5">
                {['', 'Nombre', 'P', 'S', 'Dens', 'Off', 'Prob', 'Chaos', 'Evolve', 'Cyc', 'Hit', 'Miss'].map(h => (
                  <th key={h} className="text-left py-1.5 px-1.5 text-[8px] uppercase tracking-wider text-idm-muted font-normal whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-b border-black/[0.03] last:border-0">
                  <td className="py-1.5 px-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: r.color }} />
                  </td>
                  <td className="py-1.5 px-1.5 text-idm-ink whitespace-nowrap">{r.name}</td>
                  <td className="py-1.5 px-1.5 text-idm-ink">{r.pulses}</td>
                  <td className="py-1.5 px-1.5 text-idm-ink">{r.steps}</td>
                  <td className="py-1.5 px-1.5 text-system-accent">{r.density}%</td>
                  <td className="py-1.5 px-1.5 text-idm-ink">{r.offset}</td>
                  <td className="py-1.5 px-1.5 text-idm-ink">{r.probAvg}%</td>
                  <td className="py-1.5 px-1.5 text-idm-ink">{r.chaos}</td>
                  <td className="py-1.5 px-1.5 text-idm-ink">{r.evolve}</td>
                  <td className="py-1.5 px-1.5 text-idm-muted">{r.cycles}</td>
                  <td className="py-1.5 px-1.5 text-idm-muted">{r.hits}</td>
                  <td className="py-1.5 px-1.5 text-idm-muted">{r.misses}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Session Log */}
      <div className="mb-5">
        <div className="text-[8px] uppercase tracking-[0.2em] text-idm-muted mb-2">── Log de Sesión ──</div>
        {log.length === 0 ? (
          <div className="text-[9px] text-idm-muted/50 py-3 text-center">Sin actividad registrada</div>
        ) : (
          <div className="max-h-[300px] overflow-y-auto space-y-0.5 custom-scrollbar">
            {log.map((entry, i) => (
              <div key={i} className="flex items-baseline gap-2 py-0.5 text-[9px] leading-relaxed">
                <span className="text-idm-muted shrink-0">{entry.timestamp}</span>
                <span className="text-idm-ink">{entry.action}</span>
                {entry.deltas.length > 0 && (
                  <span className="text-system-accent ml-1">
                    {entry.deltas.join(' · ')}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Diagnostic Section (Fase C) */}
      <DiagnosticSection activePresetId={activePresetId} />

      {/* Live Diagnosis (Fase D) */}
      <div className="mt-5">
        <LiveDiagnosis
          tracks={tracks}
          temporalityMode={temporalityMode}
          jitter={jitter}
          swing={swing}
          dynamics={dynamics}
          bpm={bpm}
          hitRate={hitRate}
        />
      </div>
    </div>
  );
});

EngineRoom.displayName = 'EngineRoom';
