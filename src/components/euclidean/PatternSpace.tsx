import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
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

/** Simple greedy label collision avoidance */
interface LabelRect {
  x: number;
  y: number;
  w: number;
  h: number;
  idx: number;
  isUser: boolean;
}

function resolveCollisions(
  positions: { x: number; y: number }[],
  presetCount: number,
  toSvg: (pos: { x: number; y: number }) => { x: number; y: number },
  hoveredIdx: number | null,
  hoveredUserIdx: number | null,
  presets: ScenePreset[]
): Map<number, { dx: number; dy: number; show: boolean }> {
  const result = new Map<number, { dx: number; dy: number; show: boolean }>();
  const placed: LabelRect[] = [];

  const CHAR_W = 5.5; // approx px per char at fontSize 8
  const LABEL_H = 10;
  const LABEL_PAD = 2;

  for (let i = 0; i < positions.length; i++) {
    const isUser = i >= presetCount;
    const isHovered = isUser ? hoveredUserIdx === (i - presetCount) : hoveredIdx === i;
    const isMaster = !isUser && i < presetCount && presets[i]?.type === 'master';

    // Always show hovered and master labels
    const shouldShow = isHovered || isMaster || isUser;
    if (!shouldShow) {
      result.set(i, { dx: 0, dy: 0, show: false });
      continue;
    }

    const svgPos = toSvg(positions[i]);
    const r = isMaster ? 7 : isUser ? 6 : 5;

    // Estimate label width
    let labelText = '';
    if (isUser) {
      // we don't have user preset names here easily, use placeholder width
      labelText = '12chars_est';
    } else {
      labelText = presets[i]?.name ?? '';
    }
    const labelW = labelText.length * CHAR_W;
    const labelH = LABEL_H;

    // Default position: centered above the dot
    let lx = svgPos.x - labelW / 2;
    let ly = svgPos.y - r - 5 - labelH;

    // Try to avoid overlap with already-placed labels
    let attempts = 0;
    const offsets = [
      { dx: 0, dy: -(r + 5 + labelH) },         // above
      { dx: 0, dy: r + 12 },                      // below
      { dx: r + 8, dy: -labelH / 2 },             // right
      { dx: -(r + 8 + labelW), dy: -labelH / 2 }, // left
    ];

    let bestOffset = offsets[0];
    let bestOverlap = Infinity;

    for (const off of offsets) {
      const cx = svgPos.x + off.dx + (off.dx === 0 ? -labelW / 2 : off.dx > 0 ? 0 : 0);
      const cy = svgPos.y + off.dy;
      const rect: LabelRect = { x: cx, y: cy, w: labelW + LABEL_PAD * 2, h: labelH + LABEL_PAD * 2, idx: i, isUser };

      let overlap = 0;
      for (const p of placed) {
        const ox = Math.max(0, Math.min(rect.x + rect.w, p.x + p.w) - Math.max(rect.x, p.x));
        const oy = Math.max(0, Math.min(rect.y + rect.h, p.y + p.h) - Math.max(rect.y, p.y));
        overlap += ox * oy;
      }

      // Penalize out-of-bounds
      if (cx < 0 || cx + labelW > W || cy < 0 || cy + labelH > H) {
        overlap += 500;
      }

      if (overlap < bestOverlap) {
        bestOverlap = overlap;
        bestOffset = off;
      }
    }

    const finalX = svgPos.x + bestOffset.dx + (bestOffset.dx === 0 ? 0 : 0);
    const finalY = svgPos.y + bestOffset.dy;

    placed.push({
      x: finalX - labelW / 2,
      y: finalY,
      w: labelW + LABEL_PAD * 2,
      h: labelH + LABEL_PAD * 2,
      idx: i,
      isUser,
    });

    // Return offset relative to default (centered above)
    result.set(i, {
      dx: bestOffset.dx,
      dy: bestOffset.dy + r + 5, // adjust back since default render is at y - r - 5
      show: true,
    });
  }

  return result;
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

  // Zoom/pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  // Build all patterns + layout
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

  // YOU position
  const youPos = useMemo(() => {
    return computeYouPosition(currentPattern, layout.patterns, layout.positions);
  }, [currentPattern, layout]);

  // Connection lines
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

  // Distances from YOU
  const youDistances = useMemo(() => {
    return layout.patterns.map(p => patternDistance(currentPattern, p));
  }, [currentPattern, layout.patterns]);

  // Label collision avoidance
  const labelOffsets = useMemo(() => {
    return resolveCollisions(
      layout.positions,
      layout.presetCount,
      toSvg,
      hoveredIdx,
      hoveredUserIdx,
      presets
    );
  }, [layout.positions, layout.presetCount, toSvg, hoveredIdx, hoveredUserIdx, presets]);

  // Zoom/pan handlers
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(z => Math.min(5, Math.max(0.5, z * delta)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    // Only start panning if not clicking a point
    const target = e.target as SVGElement;
    if (target.closest('[data-clickable]')) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    const dx = (e.clientX - panStart.current.x) / zoom;
    const dy = (e.clientY - panStart.current.y) / zoom;
    setPan({ x: panStart.current.panX + dx, y: panStart.current.panY + dy });
  }, [isPanning, zoom]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleDoubleClick = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Release panning if mouse leaves
  useEffect(() => {
    if (!isPanning) return;
    const up = () => setIsPanning(false);
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, [isPanning]);

  // Build transform string for zoom/pan
  const viewTransform = `translate(${pan.x}, ${pan.y}) scale(${zoom})`;
  // We need to adjust the transform origin to center
  const centerX = W / 2;
  const centerY = H / 2;
  const groupTransform = `translate(${centerX + pan.x * zoom}, ${centerY + pan.y * zoom}) scale(${zoom}) translate(${-centerX}, ${-centerY})`;

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
        {/* Legend + zoom controls */}
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
          {/* Zoom indicator */}
          {zoom !== 1 && (
            <button
              onClick={handleDoubleClick}
              className="ml-2 px-1.5 py-0.5 rounded bg-black/5 text-idm-muted hover:text-idm-ink transition-colors"
              title="Double-click to reset"
            >
              {Math.round(zoom * 100)}%
            </button>
          )}
        </div>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full select-none"
        style={{ maxHeight: '400px', cursor: isPanning ? 'grabbing' : 'grab' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      >
        <g transform={groupTransform}>
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
                strokeWidth={width / zoom}
              />
            );
          })}

          {/* Preset points */}
          {presets.map((preset, i) => {
            const pos = toSvg(layout.positions[i]);
            const color = CATEGORY_COLORS[preset.category] || '#666';
            const isHovered = hoveredIdx === i;
            const r = (preset.type === 'master' ? 7 : 5) / Math.sqrt(zoom);
            const labelInfo = labelOffsets.get(i);
            const showLabel = isHovered || (labelInfo?.show ?? false);
            return (
              <g
                key={preset.id}
                data-clickable="true"
                className="cursor-pointer"
                onMouseEnter={() => { setHoveredIdx(i); setHoveredUserIdx(null); }}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => onSelectPreset(preset)}
              >
                {isHovered && (
                  <circle
                    cx={pos.x} cy={pos.y} r={r + 5 / zoom}
                    fill="none" stroke={color} strokeWidth={1.5 / zoom}
                    opacity={0.3}
                  />
                )}
                <circle
                  cx={pos.x} cy={pos.y} r={isHovered ? r + 1.5 / zoom : r}
                  fill={color}
                  opacity={isHovered ? 1 : 0.75}
                  style={{ transition: 'opacity 0.15s ease-out' }}
                />
                {/* Label with collision-avoidance offset */}
                {showLabel && labelInfo && (
                  <text
                    x={pos.x + labelInfo.dx}
                    y={pos.y + labelInfo.dy}
                    textAnchor="middle"
                    fill={isHovered ? color : '#888'}
                    fontSize={(isHovered ? 10 : 8) / zoom}
                    fontFamily="'JetBrains Mono', monospace"
                    fontWeight={isHovered ? 700 : 400}
                  >
                    {preset.name}
                  </text>
                )}
                {/* Tooltip on hover */}
                {isHovered && (
                  <g>
                    <rect
                      x={pos.x + 12 / zoom} y={pos.y - 28 / zoom}
                      width={140 / zoom} height={38 / zoom}
                      rx={4 / zoom}
                      fill="white" stroke="#e5e5e5" strokeWidth={1 / zoom}
                    />
                    <text x={pos.x + 18 / zoom} y={pos.y - 14 / zoom} fontSize={9 / zoom} fontFamily="'JetBrains Mono', monospace" fill="#333">
                      {getPresetFormula(preset)}
                    </text>
                    <text x={pos.x + 18 / zoom} y={pos.y - 2 / zoom} fontSize={8 / zoom} fontFamily="'JetBrains Mono', monospace" fill="#999">
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
            const labelInfo = labelOffsets.get(idx);
            const showLabel = isHovered || (labelInfo?.show ?? true);
            return (
              <g
                key={`user-${up.id}`}
                data-clickable="true"
                className="cursor-pointer"
                onMouseEnter={() => { setHoveredUserIdx(ui); setHoveredIdx(null); }}
                onMouseLeave={() => setHoveredUserIdx(null)}
                onClick={() => onSelectUserPreset(up)}
              >
                {isHovered && (
                  <circle cx={pos.x} cy={pos.y} r={11 / zoom} fill="none" stroke={USER_COLOR} strokeWidth={1.5 / zoom} opacity={0.3} />
                )}
                <circle cx={pos.x} cy={pos.y} r={(isHovered ? 7.5 : 6) / Math.sqrt(zoom)} fill={USER_COLOR} opacity={isHovered ? 1 : 0.7} />
                {showLabel && labelInfo && (
                  <text
                    x={pos.x + labelInfo.dx} y={pos.y + labelInfo.dy}
                    textAnchor="middle"
                    fill={USER_COLOR} fontSize={(isHovered ? 10 : 8) / zoom}
                    fontFamily="'JetBrains Mono', monospace" fontWeight={isHovered ? 700 : 400}
                  >
                    {up.name}
                  </text>
                )}
                {isHovered && (
                  <g>
                    <rect x={pos.x + 12 / zoom} y={pos.y - 28 / zoom} width={140 / zoom} height={38 / zoom} rx={4 / zoom} fill="white" stroke="#e5e5e5" strokeWidth={1 / zoom} />
                    <text x={pos.x + 18 / zoom} y={pos.y - 14 / zoom} fontSize={9 / zoom} fontFamily="'JetBrains Mono', monospace" fill="#333">
                      {up.name}
                    </text>
                    <text x={pos.x + 18 / zoom} y={pos.y - 2 / zoom} fontSize={8 / zoom} fontFamily="'JetBrains Mono', monospace" fill="#999">
                      dist: {youDistances[idx]?.toFixed(3) ?? '—'}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* YOU marker */}
          <g>
            <circle cx={youSvg.x} cy={youSvg.y} r={12 / zoom} fill="none" stroke={YOU_COLOR} strokeWidth={1.5 / zoom} opacity={0.2}>
              <animate attributeName="r" values={`${10 / zoom};${16 / zoom};${10 / zoom}`} dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.3;0.05;0.3" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx={youSvg.x} cy={youSvg.y} r={6 / zoom} fill="none" stroke={YOU_COLOR} strokeWidth={2.5 / zoom} />
            <circle cx={youSvg.x} cy={youSvg.y} r={3 / zoom} fill={YOU_COLOR} />
            <text
              x={youSvg.x} y={youSvg.y + 18 / zoom}
              textAnchor="middle" fill={YOU_COLOR}
              fontSize={9 / zoom} fontFamily="'JetBrains Mono', monospace" fontWeight={700}
            >
              YOU
            </text>
          </g>
        </g>
      </svg>

      {/* Zoom hint */}
      <div className="flex justify-center mt-2">
        <span className="text-[8px] font-mono text-idm-muted uppercase tracking-wider opacity-50">
          Scroll to zoom · Drag to pan · Double-click to reset
        </span>
      </div>
    </motion.div>
  );
};
