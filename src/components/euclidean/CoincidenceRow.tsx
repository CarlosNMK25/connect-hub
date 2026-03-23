import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface TrackData {
  id: string;
  pattern: number[];
  steps: number;
  offset: number;
  color: string;
  isMuted: boolean;
}

interface CoincidenceRowProps {
  tracks: TrackData[];
  globalStep: number;
  maxSteps: number;
}

/**
 * Shows per-step rhythmic coincidence across all active (non-muted) tracks.
 * A cell lights up when 2+ tracks have a pulse on the same step position.
 * Intensity scales with number of overlapping tracks.
 */
export const CoincidenceRow: React.FC<CoincidenceRowProps> = React.memo(({ tracks, globalStep, maxSteps }) => {
  const activeTracks = useMemo(() => tracks.filter(t => !t.isMuted), [tracks]);

  // For each step position (0..maxSteps-1), count how many active tracks have a pulse
  const coincidence = useMemo(() => {
    const counts: number[] = new Array(maxSteps).fill(0);
    const colors: string[][] = new Array(maxSteps).fill(null).map(() => []);

    for (const track of activeTracks) {
      for (let i = 0; i < maxSteps; i++) {
        // Map global step position to this track's local position considering offset
        const localStep = ((i - track.offset) % track.steps + track.steps) % track.steps;
        if (track.pattern[localStep] === 1) {
          counts[i]++;
          colors[i].push(track.color);
        }
      }
    }

    return counts.map((count, i) => ({
      count,
      colors: colors[i],
      isCoincidence: count >= 2,
    }));
  }, [activeTracks, maxSteps]);

  const maxCount = useMemo(() => Math.max(...coincidence.map(c => c.count), 1), [coincidence]);
  const totalCoincidences = useMemo(() => coincidence.filter(c => c.isCoincidence).length, [coincidence]);

  // Contextual micro-annotation
  const annotation = useMemo(() => {
    const coIndices = coincidence.map((c, i) => c.isCoincidence ? i : -1).filter(i => i >= 0);
    if (coIndices.length === 0) return null;

    const density = coIndices.length / maxSteps;

    // Check for clusters (2+ consecutive coincidences)
    const clusters: number[][] = [];
    let current: number[] = [coIndices[0]];
    for (let i = 1; i < coIndices.length; i++) {
      if (coIndices[i] === coIndices[i - 1] + 1) {
        current.push(coIndices[i]);
      } else {
        if (current.length >= 2) clusters.push(current);
        current = [coIndices[i]];
      }
    }
    if (current.length >= 2) clusters.push(current);

    // Check for regular spacing
    if (coIndices.length >= 2) {
      const gaps = coIndices.slice(1).map((v, i) => v - coIndices[i]);
      const allEqual = gaps.every(g => g === gaps[0]);
      if (allEqual && gaps[0] > 0) {
        return `Coincidencia regular cada ${gaps[0]} steps → acento métrico periódico`;
      }
    }

    // Check for offbeat pattern (avoid multiples of 4)
    const onDownbeats = coIndices.filter(i => i % 4 === 0).length;
    const offbeatRatio = 1 - onDownbeats / coIndices.length;
    if (coIndices.length >= 3 && offbeatRatio > 0.7) {
      return `${Math.round(offbeatRatio * 100)}% coincidencias en offbeat → síncopa estructural`;
    }

    // Clusters
    if (clusters.length > 0) {
      const cl = clusters[0];
      return `Cluster en steps ${cl[0]}–${cl[cl.length - 1]} → zona de densidad rítmica`;
    }

    // Density interpretation
    if (density >= 0.7) return `${Math.round(density * 100)}% superposición → textura homofónica`;
    if (density <= 0.2) return `${Math.round(density * 100)}% superposición → textura polirrítmica abierta`;

    return `${coIndices.length}/${maxSteps} puntos de encuentro (${Math.round(density * 100)}%)`;
  }, [coincidence, maxSteps]);

  if (activeTracks.length < 2) return null;

  return (
    <div className="bg-idm-ink/[0.02] border border-idm-ink/5 rounded-xl p-3 font-mono">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-idm-muted">
            ◆ Coincidencia Rítmica
          </span>
          <span className="text-[8px] text-system-accent">
            {totalCoincidences}/{maxSteps} steps
          </span>
        </div>
        <span className="text-[7px] text-idm-muted uppercase tracking-wider">
          {activeTracks.length} tracks activos
        </span>
      </div>

      {/* Step cells */}
      <div className="flex gap-[2px]">
        {coincidence.map((cell, i) => {
          const intensity = cell.count / maxCount;
          const isActive = globalStep % maxSteps === i;

          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center gap-0.5"
            >
              {/* Step index */}
              <span className="text-[6px] text-idm-muted/40">{i}</span>

              {/* Coincidence cell */}
              <motion.div
                className="w-full rounded-sm relative overflow-hidden"
                style={{ height: 20 }}
                animate={{
                  opacity: isActive ? 1 : 0.8,
                }}
                transition={{ duration: 0.05 }}
              >
                {/* Background */}
                <div className="absolute inset-0 bg-idm-ink/[0.03] rounded-sm" />

                {/* Coincidence fill */}
                {cell.isCoincidence && (
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 rounded-sm"
                    style={{
                      height: `${Math.round(intensity * 100)}%`,
                      background: cell.colors.length >= 3
                        ? `linear-gradient(to top, ${cell.colors.slice(0, 3).join(', ')})`
                        : cell.colors.length === 2
                          ? `linear-gradient(to top, ${cell.colors[0]}, ${cell.colors[1]})`
                          : cell.colors[0] || 'hsl(var(--system-accent))',
                      opacity: 0.6,
                    }}
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.round(intensity * 100)}%` }}
                    transition={{ duration: 0.3 }}
                  />
                )}

                {/* Playhead marker */}
                {isActive && (
                  <motion.div
                    className="absolute inset-0 border border-system-accent/40 rounded-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.05 }}
                  />
                )}
              </motion.div>

              {/* Count label */}
              {cell.isCoincidence && (
                <span className="text-[7px] font-bold text-system-accent">
                  {cell.count}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Contextual annotation */}
      {annotation && (
        <div className="mt-2 text-[7px] text-system-accent/70 italic truncate">
          ▸ {annotation}
        </div>
      )}
    </div>
  );
});

CoincidenceRow.displayName = 'CoincidenceRow';
