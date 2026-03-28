import React, { useState, useEffect } from 'react';
import { Atom, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PEDAGOGY } from '../../constants/pedagogy';
import type { TrackState } from '../../types/track';

export const getMesoInsight = (tracks: TrackState[]) => {
  // 1. Flamenco check — most specific
  const flamencoTrack = tracks.find(t => t.steps === 12 && t.pulses >= 5 && t.pulses <= 7);
  if (flamencoTrack) {
    return PEDAGOGY.meso.flamenco.template
      .replace('{p}', flamencoTrack.pulses.toString())
      .replace('{s}', flamencoTrack.steps.toString());
  }

  // 2. Entropy check — chaos or evolve active on ≥2 tracks
  const chaosOrEvolveTracks = tracks.filter(t =>
    t.chaosEnabled || t.evolveEnabled || t.entropy > 0
  );
  if (chaosOrEvolveTracks.length >= 2) {
    const first = chaosOrEvolveTracks[0];
    return PEDAGOGY.meso.entropy.template
      .replace('{p}', first.pulses.toString())
      .replace('{s}', first.steps.toString());
  }

  // 3. Prime Aesthetics check
  const isPrime = (n: number) => {
    if (n <= 1) return false;
    for (let i = 2; i <= Math.sqrt(n); i++) if (n % i === 0) return false;
    return true;
  };

  const primeTrack = tracks.find(t => isPrime(t.pulses) || isPrime(t.steps));
  if (primeTrack) {
    return PEDAGOGY.meso.primeAesthetics.template
      .replace('{p}', primeTrack.pulses.toString())
      .replace('{s}', primeTrack.steps.toString());
  }

  // 4. MCM Eclipse check
  const steps = tracks.map(t => t.steps);
  const uniqueSteps = [...new Set(steps)];
  if (uniqueSteps.length > 1) {
    const gcd = (a: number, b: number): number => (!b ? a : gcd(b, a % b));
    const lcm = (a: number, b: number): number => (a * b) / gcd(a, b);
    const totalLcm = uniqueSteps.reduce((acc, curr) => lcm(acc, curr));
    return PEDAGOGY.meso.mcmEclipse.template.replace('{lcm}', totalLcm.toString());
  }

  // 5. Polyrhythm check
  if (tracks.length >= 2) {
    return PEDAGOGY.meso.polyrhythm.template
      .replace('{p1}', tracks[0].pulses.toString())
      .replace('{s1}', tracks[0].steps.toString())
      .replace('{p2}', tracks[1].pulses.toString())
      .replace('{s2}', tracks[1].steps.toString());
  }

  return null;
};

export const MesoInsightMonitor = ({ tracks, isStudyMode }: { tracks: TrackState[], isStudyMode: boolean }) => {
  const [insight, setInsight] = useState<string | null>(null);

  useEffect(() => {
    if (!isStudyMode) {
      setInsight(null);
      return;
    }

    const newInsight = getMesoInsight(tracks);
    setInsight(newInsight);
  }, [tracks, isStudyMode]);

  return (
    <AnimatePresence>
      {isStudyMode && insight && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="mb-8 p-6 bg-system-accent/5 border border-system-accent/20 rounded-2xl relative overflow-hidden group"
        >
          <div className="absolute top-0 left-0 w-1 h-full bg-system-accent" />
          <div className="flex items-start gap-4">
            <div className="p-2 bg-system-accent/10 rounded-lg">
              <Zap size={18} className="text-system-accent animate-pulse" />
            </div>
            <div className="flex-1">
              <h4 className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-system-accent mb-2">Monitor de Insights Meso</h4>
              <p className="text-xs font-mono text-idm-ink/80 leading-relaxed uppercase">
                {insight}
              </p>
            </div>
          </div>
          {/* Decorative elements */}
          <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
            <Atom size={120} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
