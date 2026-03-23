import React, { useMemo } from 'react';

interface PhaseSparklineProps {
  /** Array of phase dispersion values (0 = all aligned, 1 = max spread) */
  buffer: number[];
  /** Current write index in the circular buffer */
  head: number;
  /** Total capacity */
  capacity: number;
  /** Track colors for legend */
  trackColors?: string[];
}

export const PhaseSparkline: React.FC<PhaseSparklineProps> = React.memo(({ buffer, head, capacity }) => {
  const width = 280;
  const height = 40;
  const padding = 2;

  const points = useMemo(() => {
    if (buffer.length === 0) return '';
    const len = Math.min(buffer.length, capacity);
    const pts: string[] = [];
    for (let i = 0; i < len; i++) {
      // Read from oldest to newest
      const idx = (head - len + i + capacity) % capacity;
      const val = buffer[idx] ?? 0;
      const x = padding + (i / (capacity - 1)) * (width - padding * 2);
      const y = padding + (1 - val) * (height - padding * 2);
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return pts.join(' ');
  }, [buffer, head, capacity]);

  // Current dispersion value
  const currentVal = buffer.length > 0 ? buffer[(head - 1 + capacity) % capacity] ?? 0 : 0;
  const dispersionPct = Math.round(currentVal * 100);

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-[8px] font-mono uppercase tracking-widest text-idm-muted">
          Convergencia de fase (temporal)
        </div>
        <div className={`text-[9px] font-mono font-bold ${dispersionPct < 20 ? 'text-green-600' : dispersionPct < 60 ? 'text-system-accent' : 'text-red-500'}`}>
          {dispersionPct}% dispersión
        </div>
      </div>
      <svg width={width} height={height} className="w-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        {/* Background grid */}
        <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="currentColor" strokeWidth="0.5" className="text-idm-ink/10" strokeDasharray="2 2" />
        <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="currentColor" strokeWidth="0.3" className="text-idm-ink/5" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="currentColor" strokeWidth="0.3" className="text-idm-ink/5" />
        
        {/* Sparkline */}
        {points && (
          <polyline
            points={points}
            fill="none"
            stroke="#f97316"
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity="0.8"
          />
        )}

        {/* Fill area under curve */}
        {points && (
          <polyline
            points={`${padding},${height - padding} ${points} ${(width - padding).toFixed(1)},${height - padding}`}
            fill="#f97316"
            opacity="0.06"
          />
        )}
      </svg>
      <div className="flex justify-between mt-1">
        <span className="text-[7px] font-mono text-idm-muted/50">← pasado</span>
        <span className="text-[7px] font-mono text-idm-muted/50">ahora →</span>
      </div>
      <div className="text-[7px] font-mono text-idm-muted/60 mt-1">
        Abajo = fases alineadas (convergencia) · Arriba = fases dispersas (divergencia)
      </div>
    </div>
  );
});

PhaseSparkline.displayName = 'PhaseSparkline';
