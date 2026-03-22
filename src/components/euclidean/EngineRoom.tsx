import React, { useMemo } from 'react';
import { Trash2 } from 'lucide-react';

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
}

interface EngineRoomProps {
  tracks: TrackSnapshot[];
  uiStats: { [key: string]: { hits: number; misses: number; cycleCount: number } };
  log: LogEntry[];
  onClearLog: () => void;
}

export const EngineRoom: React.FC<EngineRoomProps> = React.memo(({ tracks, uiStats, log, onClearLog }) => {
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
      <div>
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
    </div>
  );
});

EngineRoom.displayName = 'EngineRoom';
