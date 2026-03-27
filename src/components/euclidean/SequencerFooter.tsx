import React from 'react';
import type { TrackState } from '../../types/track';

interface SequencerFooterProps {
  tracks: TrackState[];
  isPlaying: boolean;
}

export const SequencerFooter: React.FC<SequencerFooterProps> = ({ tracks, isPlaying }) => {
  return (
    <div className="mt-8 pt-4 border-t border-idm-muted/30 flex justify-between items-center text-[10px] font-mono text-idm-ink/40 uppercase tracking-widest">
      <div className="flex gap-4">
        <span>KICK: Membrane</span>
        <span>SNARE: Noise</span>
        <span>HAT: Metal</span>
        <span>TONE: {tracks.find(t => t.id === 'tone')?.synthType?.toUpperCase() || 'MONO'}</span>
      </div>
      <div>{isPlaying ? "Engine: Running" : "Engine: Idle"}</div>
    </div>
  );
};
