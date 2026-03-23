import React, { useMemo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ScenePreset } from '../../constants/presets';
import { UserPreset, userPresetToScenePreset } from '../../utils/userPresets';
import { bjorklund, rotate } from '../../utils/bjorklund';
import { distanceMatrix, computeLayout, computeYouPosition, patternDistance } from '../../utils/distance';

interface PatternSpaceProps {
  presets: ScenePreset[];
  userPresets: UserPreset[];
  currentPattern: number[];
  currentSteps: number;
  onSelectPreset: (preset: ScenePreset) => void;
  onSelectUserPreset: (preset: UserPreset) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  Flamenco: '#166534',
  IDM: '#155E75',
  Experimental: '#B45309',
  Glitch: '#7C3AED',
};

const USER_COLOR = '#9D174D';
const YOU_COLOR = '#f97316';

// SVG dimensions
const W = 600;
const H = 400;
const PAD = 40;

function getPresetPattern(preset: ScenePreset): number[] {
  const config = preset.type === 'master' ? preset.tracks?.kick : preset.config;
  const pulses = config?.pulses ?? 4;
  const steps = config?.steps ?? 16;
  const offset = config?.offset ?? 0;
  return rotate(bjorklund(pulses, steps), offset);
}

function getPresetFormula(preset: ScenePreset): string {
  const config = preset.type === 'master' ? preset.tracks?.kick : preset.config;
  const pulses = config?.pulses ?? 4;
  const steps = config?.steps ?? 16;
  return `E(${pulses},${steps})`;
}

export const PatternSpace: React.FC<PatternSpaceProps> = ({
  presets,
  userPresets,
  currentPattern,
  currentSteps,
  onSelectPreset,
  onSelectUserPreset,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [hoveredUserIdx, setHoveredUserIdx] = useState<number | null>(null);

  // Build all patterns + layout (stable, only changes when presets change)
  const layout = useMemo(() => {
    const allPatterns = presets.map(getPresetPattern);
    const userPatterns = userPresets.map(up => {
      const t = up.tracks.kick || up.tracks[Object.keys(up.tracks)[0]];
      if (!t) return bjorklund(4, 16);
      return rotate(bjorklund(t.pulses, t.steps), t.offset);
    });
    const combined = [...allPatterns, ...userPatterns];
    const matrix = distanceMatrix(combined);
    const positions = computeLayout(matrix);
    return { patterns: combined, matrix, positions, presetCount: presets.length };
  }, [presets, userPresets]);

  // YOU position (recomputes when kick changes)
  const youPos = useMemo(() => {
    return computeYouPosition(currentPattern, layout.patterns, layout.positions);
  }, [currentPattern, layout]);

  // Connection lines between close patterns
  const connections = useMemo(() => {
    const lines: { i: number; j: number; dist: number }[] = [];
    const n = layout.patterns.length;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const d = layout.matrix[i][j];
        if (d < 0.3) lines.push({ i, j, dist: d });
      }
    }
    return lines;
  }, [layout]);

  const toSvg = useCallback((pos: { x: number; y: number }) => ({
    x: PAD + pos.x * (W - PAD * 2),
    y: PAD + pos.y * (H - PAD * 2),
  }), []);

  const youSvg = toSvg(youPos);

  // Distances from YOU to each pattern (for tooltip)
  const youDistances = useMemo(() => {
    return layout.patterns.map(p => patternDistance(currentPattern, p));
  }, [currentPattern, layout.patterns]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="mb-8 bg-white border border-black/5 rounded-2xl p-6 shadow-sm"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-system-accent" />
          <h3 className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-idm-ink">
            Pattern Space
          </h3>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-4 text-[8px] font-mono uppercase tracking-wider">
          {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
            <div key={cat} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-idm-muted">{cat}</span>
            </div>
          ))}
          {userPresets.length > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: USER_COLOR }} />
              <span className="text-idm-muted">User</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full border-2" style={{ borderColor: YOU_COLOR, backgroundColor: 'transparent' }} />
            <span className="text-idm-muted">You</span>
          </div>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ maxHeight: '400px' }}
      >
        {/* Connection lines */}
        {connections.map(({ i, j, dist }, idx) => {
          const a = toSvg(layout.positions[i]);
          const b = toSvg(layout.positions[j]);
          const opacity = Math.max(0.04, 0.15 - dist * 0.4);
          const width = Math.max(0.5, 2 - dist * 6);
          return (
            <line
              key={`conn-${idx}`}
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke="#000"
              strokeOpacity={opacity}
              strokeWidth={width}
            />
          );
        })}

        {/* Preset points */}
        {presets.map((preset, i) => {
          const pos = toSvg(layout.positions[i]);
          const color = CATEGORY_COLORS[preset.category] || '#666';
          const isHovered = hoveredIdx === i;
          const r = preset.type === 'master' ? 7 : 5;
          return (
            <g
              key={preset.id}
              className="cursor-pointer"
              onMouseEnter={() => { setHoveredIdx(i); setHoveredUserIdx(null); }}
              onMouseLeave={() => setHoveredIdx(null)}
              onClick={() => onSelectPreset(preset)}
            >
              {/* Hover ring */}
              {isHovered && (
                <circle
                  cx={pos.x} cy={pos.y} r={r + 5}
                  fill="none" stroke={color} strokeWidth={1.5}
                  opacity={0.3}
                />
              )}
              <circle
                cx={pos.x} cy={pos.y} r={isHovered ? r + 1.5 : r}
                fill={color}
                opacity={isHovered ? 1 : 0.75}
                style={{ transition: 'r 0.15s ease-out, opacity 0.15s ease-out' }}
              />
              {/* Label — show on hover or for master presets */}
              {(isHovered || preset.type === 'master') && (
                <text
                  x={pos.x}
                  y={pos.y - r - 5}
                  textAnchor="middle"
                  fill={isHovered ? color : '#888'}
                  fontSize={isHovered ? 10 : 8}
                  fontFamily="'JetBrains Mono', monospace"
                  fontWeight={isHovered ? 700 : 400}
                  style={{ transition: 'font-size 0.15s ease-out' }}
                >
                  {preset.name}
                </text>
              )}
              {/* Tooltip on hover */}
              {isHovered && (
                <g>
                  <rect
                    x={pos.x + 12} y={pos.y - 28}
                    width={140} height={38}
                    rx={4}
                    fill="white" stroke="#e5e5e5" strokeWidth={1}
                  />
                  <text x={pos.x + 18} y={pos.y - 14} fontSize={9} fontFamily="'JetBrains Mono', monospace" fill="#333">
                    {getPresetFormula(preset)}
                  </text>
                  <text x={pos.x + 18} y={pos.y - 2} fontSize={8} fontFamily="'JetBrains Mono', monospace" fill="#999">
                    dist: {youDistances[i]?.toFixed(3) ?? '—'}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* User preset points */}
        {userPresets.map((up, ui) => {
          const idx = presets.length + ui;
          const pos = toSvg(layout.positions[idx]);
          if (!pos) return null;
          const isHovered = hoveredUserIdx === ui;
          return (
            <g
              key={`user-${up.id}`}
              className="cursor-pointer"
              onMouseEnter={() => { setHoveredUserIdx(ui); setHoveredIdx(null); }}
              onMouseLeave={() => setHoveredUserIdx(null)}
              onClick={() => onSelectUserPreset(up)}
            >
              {isHovered && (
                <circle cx={pos.x} cy={pos.y} r={11} fill="none" stroke={USER_COLOR} strokeWidth={1.5} opacity={0.3} />
              )}
              <circle cx={pos.x} cy={pos.y} r={isHovered ? 7.5 : 6} fill={USER_COLOR} opacity={isHovered ? 1 : 0.7} />
              <text
                x={pos.x} y={pos.y - 10} textAnchor="middle"
                fill={USER_COLOR} fontSize={isHovered ? 10 : 8}
                fontFamily="'JetBrains Mono', monospace" fontWeight={isHovered ? 700 : 400}
              >
                {up.name}
              </text>
              {isHovered && (
                <g>
                  <rect x={pos.x + 12} y={pos.y - 28} width={140} height={38} rx={4} fill="white" stroke="#e5e5e5" strokeWidth={1} />
                  <text x={pos.x + 18} y={pos.y - 14} fontSize={9} fontFamily="'JetBrains Mono', monospace" fill="#333">
                    {up.name}
                  </text>
                  <text x={pos.x + 18} y={pos.y - 2} fontSize={8} fontFamily="'JetBrains Mono', monospace" fill="#999">
                    dist: {youDistances[idx]?.toFixed(3) ?? '—'}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* YOU marker */}
        <g>
          {/* Pulsing ring */}
          <circle cx={youSvg.x} cy={youSvg.y} r={12} fill="none" stroke={YOU_COLOR} strokeWidth={1.5} opacity={0.2}>
            <animate attributeName="r" values="10;16;10" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.3;0.05;0.3" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx={youSvg.x} cy={youSvg.y} r={6} fill="none" stroke={YOU_COLOR} strokeWidth={2.5} />
          <circle cx={youSvg.x} cy={youSvg.y} r={3} fill={YOU_COLOR} />
          <text
            x={youSvg.x} y={youSvg.y + 18}
            textAnchor="middle" fill={YOU_COLOR}
            fontSize={9} fontFamily="'JetBrains Mono', monospace" fontWeight={700}
          >
            YOU
          </text>
        </g>
      </svg>
    </motion.div>
  );
};
