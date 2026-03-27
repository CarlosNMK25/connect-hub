import { useState, useRef, useEffect, useCallback } from 'react';
import * as Tone from 'tone';
import { generateCAPattern } from '../utils/patternGenerators';
import { calculateTemporalOffset, type TemporalityMode } from '../utils/temporality';
import { noteIndexToFreq } from '../utils/scales';
import { markovNextNote } from '../utils/markovGenerator';
import type { TrackState } from '../types/track';
import type { MasterBusType } from './useAudioEngine';

export interface SongModeConfig {
  enabled: boolean;
  view: string;
  chain: { scene: number; cycles: number }[];
  chainPosition: number;
}

export interface UseSequencerParams {
  synthsRef: React.MutableRefObject<Record<string, any>>;
  masterBusRef: React.MutableRefObject<MasterBusType | null>;
  loopRef: React.MutableRefObject<Tone.Loop | null>;
  lorenzRafRef: React.MutableRefObject<number>;
  tracksRef: React.MutableRefObject<TrackState[]>;
  tracks: TrackState[];
  bpm: number;
  jitter: number;
  swing: number;
  dynamics: number;
  temporalityMode: TemporalityMode;
  isPlaying: boolean;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  setTracks: React.Dispatch<React.SetStateAction<TrackState[]>>;
  setDriftOffsets: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  startLorenzRaf: () => void;
  logChange: (action: string, deltas?: string[]) => void;
  toneFilterRef: React.MutableRefObject<Tone.Filter | null>;
  initializeOriginalSynthBase: (trackId: string, overrideSynthType?: string) => void;
  updateMarkovMatrix: (t: TrackState) => void;
  // Song Mode
  songModeConfig: SongModeConfig;
  mcm: number;
  onChainAdvance: () => void;
  // Refs from useTrackState
  initOrigSynthRef: React.MutableRefObject<any>;
  startLorenzRafRef: React.MutableRefObject<any>;
  caStateRef: React.MutableRefObject<Record<string, any>>;
  caEvolveCycleRef: React.MutableRefObject<Record<string, number>>;
  pendingCARef: React.MutableRefObject<Record<string, number[]>>;
  pendingMutationsRef: React.MutableRefObject<Record<string, number[]>>;
  markovLastNoteRef: React.MutableRefObject<Record<string, number>>;
  markovAnchorCountRef: React.MutableRefObject<Record<string, number>>;
  markovMatrixRef: React.MutableRefObject<Record<string, any>>;
  markovNotesRef: React.MutableRefObject<Record<string, number[]>>;
  driftAccumulatorRef: React.MutableRefObject<Record<string, number>>;
  rrNoteIndexRef: React.MutableRefObject<Record<string, number>>;
  sliceBoundariesRef: React.MutableRefObject<Record<string, Array<{ start: number; end: number }>>>;
}

export function useSequencer(params: UseSequencerParams) {
  const {
    synthsRef, masterBusRef, loopRef, lorenzRafRef,
    tracksRef, tracks,
    bpm, jitter, swing, dynamics, temporalityMode,
    isPlaying, setIsPlaying,
    setTracks, setDriftOffsets,
    startLorenzRaf, logChange,
    toneFilterRef, initializeOriginalSynthBase, updateMarkovMatrix,
    songModeConfig, mcm, onChainAdvance,
    initOrigSynthRef, startLorenzRafRef,
    caStateRef, caEvolveCycleRef, pendingCARef, pendingMutationsRef,
    markovLastNoteRef, markovAnchorCountRef, markovMatrixRef, markovNotesRef,
    driftAccumulatorRef, rrNoteIndexRef, sliceBoundariesRef,
  } = params;

  // ═══ State ═══
  const [globalStep, setGlobalStep] = useState(0);
  const [lastHit, setLastHit] = useState<{ offset: number; color: string; velocity: number; id?: number } | null>(null);
  const [uiStats, setUiStats] = useState<Record<string, { hits: number; misses: number; cycleCount: number }>>({});

  // ═══ Recording State ═══
  const [toneRecordingState, setToneRecordingState] = useState<'idle' | 'armed' | 'recording'>('idle');
  const [cloudRecordingState, setCloudRecordingState] = useState<'idle' | 'armed' | 'recording'>('idle');
  const [globalRecordingState, setGlobalRecordingState] = useState<'idle' | 'armed' | 'recording'>('idle');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const lastRecordedBufferRef = useRef<AudioBuffer | null>(null);
  const globalRecordingDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const globalRecordingChunksRef = useRef<Blob[]>([]);
  const globalMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const cloudRecordingDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const cloudRecordingChunksRef = useRef<Blob[]>([]);
  const cloudMediaRecorderRef = useRef<MediaRecorder | null>(null);

  // ═══ Internal Refs ═══
  const jitterRef = useRef(jitter);
  const swingRef = useRef(swing);
  const dynamicsRef = useRef(dynamics);
  const temporalityModeRef = useRef<TemporalityMode>(temporalityMode);
  const globalStepRef = useRef(0);
  const currentStepsRef = useRef<Record<string, number>>({});
  const statsRef = useRef<Record<string, { hits: number; misses: number; cycleCount: number; lastGhostStep: number | null }>>({});
  const lastScheduledTimesRef = useRef<Record<string, number>>({});
  const stepIndicesRef = useRef<Record<string, number>>({});
  const PHASE_BUFFER_SIZE = 128;
  const phaseBufferRef = useRef<number[]>([]);
  const phaseBufferHeadRef = useRef(0);

  // ═══ Song Mode / Chain Refs ═══
  const chainCyclesRef = useRef(0);
  const songModeConfigRef = useRef(songModeConfig);
  const mcmRef = useRef(mcm);
  const onChainAdvanceRef = useRef(onChainAdvance);

  // ═══ Ref Syncs ═══
  useEffect(() => { jitterRef.current = jitter; }, [jitter]);
  useEffect(() => { swingRef.current = swing; }, [swing]);
  useEffect(() => { dynamicsRef.current = dynamics; }, [dynamics]);
  useEffect(() => { temporalityModeRef.current = temporalityMode; }, [temporalityMode]);
  useEffect(() => { songModeConfigRef.current = songModeConfig; }, [songModeConfig]);
  useEffect(() => { mcmRef.current = mcm; }, [mcm]);
  useEffect(() => { onChainAdvanceRef.current = onChainAdvance; }, [onChainAdvance]);

  // Initialize refs for all tracks
  useEffect(() => {
    tracks.forEach(t => {
      if (!(t.id in lastScheduledTimesRef.current)) lastScheduledTimesRef.current[t.id] = 0;
      if (!(t.id in stepIndicesRef.current)) stepIndicesRef.current[t.id] = 0;
      if (!(t.id in currentStepsRef.current)) currentStepsRef.current[t.id] = -1;
      if (!(t.id in statsRef.current)) statsRef.current[t.id] = { hits: 0, misses: 0, cycleCount: 0, lastGhostStep: null };
    });
  }, [tracks]);

  // ═══ DOM Highlighting RAF + Stats Interval ═══
  useEffect(() => {
    let rafId: number;
    const updateDOM = () => {
      if (isPlaying) {
        Object.entries(currentStepsRef.current).forEach(([trackId, stepIdx]) => {
          const steps = document.querySelectorAll(`.step-container[data-track-id="${trackId}"]`);
          steps.forEach((step, i) => {
            if (i === stepIdx) step.classList.add('is-current-step');
            else step.classList.remove('is-current-step');
          });
        });
      } else {
        document.querySelectorAll('.is-current-step').forEach(el => el.classList.remove('is-current-step'));
      }
      rafId = requestAnimationFrame(updateDOM);
    };
    rafId = requestAnimationFrame(updateDOM);

    const statsInterval = setInterval(() => {
      const newStats: Record<string, { hits: number; misses: number; cycleCount: number }> = {};
      Object.entries(statsRef.current).forEach(([id, s]) => {
        newStats[id] = { hits: s.hits, misses: s.misses, cycleCount: s.cycleCount };
      });
      setUiStats(newStats);

      // Sync driftOffsets for visualizers
      const newDriftOffsets: Record<string, number> = {};
      tracksRef.current.forEach(t => {
        if (t.driftEnabled) {
          newDriftOffsets[t.id] = Math.floor(driftAccumulatorRef.current[t.id] ?? 0);
        }
      });
      setDriftOffsets(newDriftOffsets);

      // Flush pending evolve mutations to React state (max 1 setTracks per 100ms)
      const mutations = pendingMutationsRef.current;
      const caPatterns = pendingCARef.current;
      const mutationKeys = Object.keys(mutations);
      const caKeys = Object.keys(caPatterns);
      if (mutationKeys.length > 0 || caKeys.length > 0) {
        pendingMutationsRef.current = {};
        pendingCARef.current = {};
        setTracks(prev => prev.map(t => {
          let updated = t;
          if (mutations[t.id]) {
            updated = { ...updated, probabilities: mutations[t.id] };
          }
          if (caPatterns[t.id]) {
            updated = { ...updated, pattern: caPatterns[t.id] };
          }
          return updated;
        }));
      }
    }, 100);

    return () => {
      cancelAnimationFrame(rafId);
      clearInterval(statsInterval);
    };
  }, [isPlaying]); // eslint-disable-line react-hooks/exhaustive-deps

  // ═══ Gaussian Random ═══
  const gaussianRandom = (mean: number, stdDev: number) => {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return z0 * stdDev + mean;
  };

  // ═══════════════════════════════════════════════════════════
  //  Tone.Loop — Main Sequencer
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    if (loopRef.current) loopRef.current.dispose();
    
    const initialIndices: Record<string, number> = {};
    tracksRef.current.forEach(t => { initialIndices[t.id] = 0; });
    stepIndicesRef.current = initialIndices;
    globalStepRef.current = 0;

    loopRef.current = new Tone.Loop((time) => {
      const currentTracks = tracksRef.current;
      const j = jitterRef.current;
      const s = swingRef.current;
      const currentGlobalStep = globalStepRef.current;
      const now = Tone.now();
      const mode = temporalityModeRef.current;
      
      const anySoloed = currentTracks.some(t => t.isSoloed);
      const isOffBeat = currentGlobalStep % 2 === 1;
      const sixteenthDuration = Tone.Time("16n").toSeconds();

      const swingDelay = mode === 'grid' ? (isOffBeat ? (s / 100) * (sixteenthDuration * 0.33) : 0) : 0;
      const baseTime = time + swingDelay;

      currentTracks.forEach(track => {
        if (track.id === 'cloud') return;

        const shouldPlay = anySoloed ? track.isSoloed : !track.isMuted;

        // Phase Drift
        if (track.driftEnabled) {
          const prev = driftAccumulatorRef.current[track.id] ?? 0;
          const next = prev + (track.driftRate ?? 0.01);
          driftAccumulatorRef.current[track.id] = next % (track.steps * 1000);
        }

        const driftOffset = track.driftEnabled
          ? Math.floor(driftAccumulatorRef.current[track.id] ?? 0)
          : 0;
        const idx = ((currentGlobalStep + track.offset + driftOffset) % track.steps + track.steps) % track.steps;
        
        Tone.Draw.schedule(() => {
          currentStepsRef.current[track.id] = idx;
        }, baseTime);

        if (!shouldPlay) return;

        const isActive = track.pattern[idx] === 1;
        const baseProb = track.probabilities[idx];
        const prob = track.chaosEnabled ? baseProb * track.entropy : baseProb;
        
        let isHit = false;
        let isMiss = false;
        let velocity = 0.85;
        let offset = 0;

        if (isActive) {
          if (Math.random() < prob) {
            isHit = true;
            if (mode === 'grid') {
              const jitterSeconds = j / 1000;
              offset = jitterSeconds > 0 ? gaussianRandom(0, jitterSeconds / 3) : 0;
            } else {
              offset = calculateTemporalOffset(mode, {
                trackId: track.id,
                stepIndex: idx,
                steps: track.steps,
                globalStep: currentGlobalStep,
                swing: s,
                jitter: j,
                sixteenthDuration,
                pattern: track.pattern,
              });
            }
            const baseVelocity = (idx === 0) ? 1.0 : 0.85;
            const randomVariation = (Math.random() * 0.2) * (dynamicsRef.current / 100);
            velocity = Math.max(0.1, baseVelocity - randomVariation);

            if (track.rrEnabled && (track.rrAmount ?? 30) > 0) {
              const rrScale = (track.rrAmount ?? 30) / 100;
              const u1 = Math.random();
              const u2 = Math.random();
              const gaussian = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
              const rrVariation = gaussian * rrScale * 0.15;
              velocity = Math.max(0.05, Math.min(1.0, velocity + rrVariation));
            }
          } else {
            isMiss = true;
          }
        }

        // Update stats
        const stats = statsRef.current[track.id];
        if (isHit) stats.hits++;
        if (isMiss) {
          stats.misses++;
          stats.lastGhostStep = idx;
        }
        if (idx === 0) {
          stats.cycleCount++;
          if (track.evolveEnabled && stats.cycleCount > 0 && stats.cycleCount % track.mutationSpeed === 0) {
            const probs = [...track.probabilities];
            const rate = track.mutationRate;
            for (let si = 0; si < track.steps; si++) {
              if (Math.random() < 0.5) {
                const delta = (Math.random() - 0.5) * 2 * rate;
                probs[si] = Math.max(0, Math.min(1, probs[si] + delta));
              }
            }
            pendingMutationsRef.current[track.id] = probs;
          }
        }

        // CA evolution
        if (idx === 0 && (track.patternMode ?? 'euclidean') === 'ca') {
          const speedMod = track.caSpeed ?? 1;
          caEvolveCycleRef.current[track.id] =
            (caEvolveCycleRef.current[track.id] ?? 0) + 1;
          if (caEvolveCycleRef.current[track.id] >= speedMod) {
            caEvolveCycleRef.current[track.id] = 0;
            const existing = caStateRef.current[track.id];
            if (existing) {
              const { pattern: newPat, newState } = generateCAPattern(
                track.caRule ?? 30,
                track.caSeed ?? 'center',
                track.steps,
                track.caDensity ?? 50,
                existing
              );
              caStateRef.current[track.id] = newState;
              pendingCARef.current[track.id] = newPat;
            }
          }
        }

        if (isHit) {
          try {
            const synth = synthsRef.current[track.id];
            if (!synth) return;

            // XLP: skip step trigger when extreme loop is active
            if (track.extremeLoopEnabled && track.samplerStatus === 'READY' && synth.grainPlayer) {
              Tone.Draw.schedule(() => {
                setLastHit({ offset, color: track.color, velocity, id: Math.random() });
              }, Tone.now());
              return;
            }

            let scheduledTime = Math.max(baseTime + offset, now + 0.02);
            const lastTime = lastScheduledTimesRef.current[track.id] || 0;
            if (scheduledTime <= lastTime) scheduledTime = lastTime + 0.005;
            lastScheduledTimesRef.current[track.id] = scheduledTime;

            // Compute noteIdx for tonal track
            let noteIdx = 0;
            if (track.isTonal) {
              if ((track.noteMode ?? 'euclidean') === 'markov') {
                const uniqueNotes = markovNotesRef.current[track.id];
                const matrix = markovMatrixRef.current[track.id];
                if (!uniqueNotes || uniqueNotes.length === 0 || !matrix) {
                  noteIdx = track.noteIndices[idx] ?? 0;
                } else {
                  const anchorEvery = track.markovAnchor ?? 0;
                  const anchorCount = markovAnchorCountRef.current[track.id] ?? 0;
                  let notePosition: number;
                  if (anchorEvery > 0 && anchorCount >= anchorEvery) {
                    notePosition = 0;
                    markovAnchorCountRef.current[track.id] = 0;
                  } else {
                    const lastPosition = markovLastNoteRef.current[track.id] ?? 0;
                    notePosition = markovNextNote(lastPosition, matrix);
                    markovAnchorCountRef.current[track.id] = anchorCount + 1;
                  }
                  markovLastNoteRef.current[track.id] = notePosition;
                  noteIdx = uniqueNotes[notePosition];
                }
              } else if (track.rrEnabled && track.noteIndices.length > 1) {
                const rrIdx = rrNoteIndexRef.current[track.id] ?? 0;
                noteIdx = track.noteIndices[rrIdx % track.noteIndices.length];
                rrNoteIndexRef.current[track.id] = (rrIdx + 1) % track.noteIndices.length;
              } else {
                noteIdx = track.noteIndices[idx] ?? 0;
              }
            }

            // Slicer
            let sliceInfo: { startSec: number; durationSec: number; detuneCents: number; isReverse: boolean } | undefined;
            if (track.slicerEnabled && track.samplerBuffer && track.sliceCount && track.sliceOrder) {
              const boundaries = sliceBoundariesRef.current[track.id];
              if (boundaries && boundaries.length > 0) {
                const slicePosition = track.sliceOrder[idx % track.sliceOrder.length];
                const slice = boundaries[slicePosition % boundaries.length];
                const bufDur = track.samplerBuffer.duration;
                const startSec = slice.start * bufDur;
                const endSec = slice.end * bufDur;
                const sliceDur = Math.max(0.01, endSec - startSec);
                const pitchSemitones = track.slicePitch?.[slicePosition] ?? 0;
                const isReverse = track.sliceReverse?.[slicePosition] ?? false;
                sliceInfo = {
                  startSec: isReverse ? endSec - 0.001 : startSec,
                  durationSec: sliceDur,
                  detuneCents: pitchSemitones * 100,
                  isReverse,
                };
              }
            }

            if (synth.triggerAttackRelease) {
              const duration = track.mode === 'GATE' ? "16n"
                : track.mode === 'ONE-SHOT' && track.samplerBuffer
                  ? Math.max(0.01, (track.sampleEnd - track.sampleStart) * track.samplerBuffer.duration)
                  : (track.decay / 1000);
              
              if (track.isTonal) {
                const freq = noteIndexToFreq(track.rootNote, track.scaleId, noteIdx);
                synth.triggerAttackRelease(freq, duration, scheduledTime, velocity, sliceInfo);
              } else if (track.id === 'kick' && !synth.grainPlayer) {
                synth.triggerAttackRelease("C1", duration, scheduledTime, velocity, sliceInfo);
              } else {
                synth.triggerAttackRelease(duration, scheduledTime, velocity, sliceInfo);
              }
            } else if (synth.grainPlayer && track.samplerStatus === 'READY') {
              const bufDur = track.samplerBuffer?.duration || 0;
              const sprayAmount = (track.spray / 1000) * (track.chaosEnabled ? track.entropy : 1);
              const startOffset = track.sampleStart * bufDur;
              const randomOffset = (Math.random() - 0.5) * sprayAmount;
              const finalOffset = Math.max(0, Math.min(bufDur, startOffset + randomOffset));
              const stepDur = track.mode === 'GATE' ? Tone.Time("16n").toSeconds()
                : track.mode === 'ONE-SHOT' ? Math.max(0.01, (track.sampleEnd - track.sampleStart) * bufDur)
                : (track.decay / 1000);
              const endOffset = track.sampleEnd * bufDur;
              const roiDur = Math.max(0.01, endOffset - finalOffset);
              const dur = Math.max(0.01, Math.min(roiDur, stepDur));
              synth.grainPlayer.start(scheduledTime, finalOffset, dur);
            }

            // Layer 2
            if (synth.triggerLayer2 && synth.layer2Buffer) {
              synth.triggerLayer2(scheduledTime, velocity);
            }

            // Ratchet
            const ratchetCount = track.ratchet || 0;
            if (ratchetCount > 0) {
              const subdivDuration = sixteenthDuration / (ratchetCount + 1);
              for (let r = 1; r <= ratchetCount; r++) {
                const ratchetTime = scheduledTime + subdivDuration * r;
                const ratchetVelocity = velocity * Math.pow(0.65, r);
                try {
                  if (synth.triggerAttackRelease) {
                    const dur = track.mode === 'GATE' ? "32n"
                      : track.mode === 'ONE-SHOT' && track.samplerBuffer
                        ? Math.max(0.01, (track.sampleEnd - track.sampleStart) * track.samplerBuffer.duration / 2)
                        : (track.decay / 2000);
                    if (track.isTonal) {
                      const freq = noteIndexToFreq(track.rootNote, track.scaleId, noteIdx);
                      synth.triggerAttackRelease(freq, dur, ratchetTime, ratchetVelocity, sliceInfo);
                    } else if (track.id === 'kick' && !synth.grainPlayer) {
                      synth.triggerAttackRelease("C1", dur, ratchetTime, ratchetVelocity, sliceInfo);
                    } else {
                      synth.triggerAttackRelease(dur, ratchetTime, ratchetVelocity, sliceInfo);
                    }
                  } else if (synth.grainPlayer && track.samplerStatus === 'READY') {
                    const bufDur = track.samplerBuffer?.duration || 0;
                    const sprayAmount = (track.spray / 1000) * (track.chaosEnabled ? track.entropy : 1);
                    const startOff = track.sampleStart * bufDur;
                    const randomOff = (Math.random() - 0.5) * sprayAmount;
                    const finalOff = Math.max(0, Math.min(bufDur, startOff + randomOff));
                    const stepDur = track.mode === 'GATE' ? Tone.Time("32n").toSeconds()
                      : track.mode === 'ONE-SHOT' ? Math.max(0.01, (track.sampleEnd - track.sampleStart) * bufDur / 2)
                      : (track.decay / 2000);
                    const endOff = track.sampleEnd * bufDur;
                    const roiDur = Math.max(0.01, endOff - finalOff);
                    const dur = Math.max(0.01, Math.min(roiDur, stepDur));
                    synth.grainPlayer.start(ratchetTime, finalOff, dur);
                  }
                } catch (e) { /* silent */ }
              }
              lastScheduledTimesRef.current[track.id] = scheduledTime + subdivDuration * ratchetCount;
            }

            Tone.Draw.schedule(() => {
              setLastHit({ offset, color: track.color, velocity, id: Math.random() });
              if (synth.grainPlayer && track.samplerStatus === 'READY') {
                const wfEl = document.querySelector(`.waveform-container[data-track-id="${track.id}"]`);
                if (wfEl) {
                  wfEl.classList.remove('waveform-triggered');
                  void (wfEl as HTMLElement).offsetWidth;
                  wfEl.classList.add('waveform-triggered');
                  setTimeout(() => wfEl.classList.remove('waveform-triggered'), 150);
                }
              }
            }, scheduledTime);
          } catch (e) {
            console.warn(`Trigger failed for ${track.id}:`, e);
          }
        }
      });

      Tone.Draw.schedule(() => {
        setGlobalStep(currentGlobalStep);
        const ct = tracksRef.current.filter(t => t.id !== 'cloud' && !t.isMuted);
        if (ct.length >= 2) {
          const phases = ct.map(t => {
            const drift = Math.floor(driftAccumulatorRef.current[t.id] ?? 0);
            return (((currentGlobalStep + t.offset + drift) % t.steps) + t.steps) % t.steps / t.steps;
          });
          let sum = 0, count = 0;
          for (let a = 0; a < phases.length; a++) {
            for (let b = a + 1; b < phases.length; b++) {
              const diff = Math.abs(phases[a] - phases[b]);
              sum += Math.min(diff, 1 - diff);
              count++;
            }
          }
          const dispersion = count > 0 ? (sum / count) / 0.5 : 0;
          const buf = phaseBufferRef.current;
          const head = phaseBufferHeadRef.current;
          if (buf.length < PHASE_BUFFER_SIZE) {
            buf.push(Math.min(1, dispersion));
          } else {
            buf[head % PHASE_BUFFER_SIZE] = Math.min(1, dispersion);
          }
          phaseBufferHeadRef.current = (head + 1) % PHASE_BUFFER_SIZE;
        }
      }, baseTime);

      const nextGlobalStep = currentGlobalStep + 1;
      globalStepRef.current = nextGlobalStep;

      // ═══ Song Mode: Auto Chain cycle detection ═══
      const smc = songModeConfigRef.current;
      if (smc.enabled && smc.view === 'chain' && smc.chain.length > 0) {
        const currentMcm = mcmRef.current;
        if (currentMcm > 0 && nextGlobalStep > 0 && nextGlobalStep % currentMcm === 0) {
          chainCyclesRef.current++;
          const currentChainStep = smc.chain[smc.chainPosition];
          if (currentChainStep && chainCyclesRef.current >= currentChainStep.cycles) {
            chainCyclesRef.current = 0;
            onChainAdvanceRef.current();
          }
        }
      }
    }, "16n").start(0);

    return () => { loopRef.current?.dispose(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ═══════════════════════════════════════════════════════════
  //  togglePlay
  // ═══════════════════════════════════════════════════════════
  const togglePlay = async () => {
    if (Tone.getContext().state !== 'running') await Tone.start();
    if (isPlaying) {
      logChange('■ Stop');
      Tone.getTransport().stop();
      const cloudTrackStop = tracksRef.current.find(t => t.id === 'cloud');
      if (cloudTrackStop?.cloudMode === 'eno') {
        synthsRef.current.cloud?.stopEno?.();
      } else if (synthsRef.current.cloud?.grainPlayer) {
        synthsRef.current.cloud.grainPlayer.stop();
      }
      if (synthsRef.current.tone?.stop) {
        synthsRef.current.tone.stop();
      }
      tracksRef.current.forEach(t => {
        if (t.extremeLoopEnabled && synthsRef.current[t.id]?.grainPlayer) {
          try { synthsRef.current[t.id].grainPlayer.stop(); } catch {}
        }
      });
      Object.keys(currentStepsRef.current).forEach(id => currentStepsRef.current[id] = -1);
      
      const resetIndices: Record<string, number> = {};
      const resetTimes: Record<string, number> = {};
      tracksRef.current.forEach(t => {
        resetIndices[t.id] = 0;
        resetTimes[t.id] = 0;
      });
      stepIndicesRef.current = resetIndices;
      lastScheduledTimesRef.current = resetTimes;
      
      globalStepRef.current = 0;
      setGlobalStep(0);
      rrNoteIndexRef.current = {};
      markovLastNoteRef.current = {};
      markovAnchorCountRef.current = {};
      driftAccumulatorRef.current = {};
      setDriftOffsets({});
      caStateRef.current = {};
      caEvolveCycleRef.current = {};
      pendingCARef.current = {};
      if (lorenzRafRef.current) {
        cancelAnimationFrame(lorenzRafRef.current);
        lorenzRafRef.current = 0;
      }
    } else {
      tracks.forEach(t => {
        if (t.isTonal && (t.noteMode ?? 'euclidean') === 'markov') {
          if (!markovMatrixRef.current[t.id]) updateMarkovMatrix(t);
        }
      });
      const activeTracks = tracks.filter(t => !t.isMuted).length;
      logChange('▶ Play', [`BPM ${bpm}`, `${activeTracks} activos`]);
      Tone.getTransport().bpm.value = bpm;
      Tone.getTransport().start();
      const cloudTrackStart = tracksRef.current.find(t => t.id === 'cloud');
      if (cloudTrackStart?.cloudMode === 'eno') {
        console.log('[ENO-DIAG] togglePlay: calling startEno', { hasStartEno: !!synthsRef.current.cloud?.startEno, cloudMode: cloudTrackStart?.cloudMode });
        synthsRef.current.cloud?.startEno?.();
      } else if (synthsRef.current.cloud?.grainPlayer) {
        synthsRef.current.cloud.grainPlayer.start();
      }
      startLorenzRaf();
      tracksRef.current.forEach(t => {
        if (t.extremeLoopEnabled && t.samplerStatus === 'READY' && synthsRef.current[t.id]?.grainPlayer) {
          try { synthsRef.current[t.id].grainPlayer.start(); } catch {}
        }
      });
    }
    setIsPlaying(!isPlaying);
  };

  // ═══════════════════════════════════════════════════════════
  //  handlePhaseSync
  // ═══════════════════════════════════════════════════════════
  const handlePhaseSync = () => {
    setGlobalStep(0);
    globalStepRef.current = 0;
    driftAccumulatorRef.current = {};
    setDriftOffsets({});
    caStateRef.current = {};
    caEvolveCycleRef.current = {};
    pendingCARef.current = {};
    
    const resetIndices: Record<string, number> = {};
    const resetTimes: Record<string, number> = {};
    tracksRef.current.forEach(t => {
      resetIndices[t.id] = 0;
      resetTimes[t.id] = 0;
    });
    stepIndicesRef.current = resetIndices;
    lastScheduledTimesRef.current = resetTimes;
    
    if (isPlaying) {
      Tone.getTransport().stop();
      const cloudTrackSync = tracksRef.current.find(t => t.id === 'cloud');
      if (cloudTrackSync?.cloudMode === 'eno') {
        synthsRef.current.cloud?.stopEno?.();
      } else if (synthsRef.current.cloud?.grainPlayer) {
        synthsRef.current.cloud.grainPlayer.stop();
      }
      Tone.getTransport().start();
      if (cloudTrackSync?.cloudMode === 'eno') {
        synthsRef.current.cloud?.startEno?.();
      } else if (synthsRef.current.cloud?.grainPlayer) {
        synthsRef.current.cloud.grainPlayer.start();
      }
    }
  };

  // ═══════════════════════════════════════════════════════════
  //  Recording Functions
  // ═══════════════════════════════════════════════════════════
  const startRecordingNow = useCallback(() => {
    if (!recordingDestRef.current) {
      if (!toneFilterRef.current) {
        console.warn('REC: No hay toneFilter activo');
        return;
      }
      try {
        const dest = (Tone.getContext().rawContext as AudioContext).createMediaStreamDestination();
        toneFilterRef.current.connect(dest as unknown as Tone.ToneAudioNode);
        recordingDestRef.current = dest;
      } catch(e) {
        console.warn('No se pudo crear nodo de captura:', e);
        return;
      }
    }

    recordingChunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';

    const recorder = new MediaRecorder(recordingDestRef.current.stream, { mimeType });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordingChunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      const blob = new Blob(recordingChunksRef.current, { type: mimeType });
      try {
        const arrayBuffer = await blob.arrayBuffer();
        const audioBuffer = await Tone.getContext().rawContext.decodeAudioData(arrayBuffer);
        lastRecordedBufferRef.current = audioBuffer;
      } catch(e) {
        console.warn('No se pudo decodificar el buffer grabado:', e);
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tone-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      setToneRecordingState('idle');
      logChange('Tone grabado y descargado');
    };

    recorder.start(100);
    mediaRecorderRef.current = recorder;
    setToneRecordingState('recording');
    logChange('Tone REC iniciado');
  }, [logChange]); // eslint-disable-line react-hooks/exhaustive-deps

  const startCloudRecordingNow = useCallback(() => {
    if (!cloudRecordingDestRef.current) {
      try {
        const cloudFilter = synthsRef.current.cloud?.filter;
        if (!cloudFilter) {
          console.warn('REC cloud: no hay cloudFilter activo');
          return;
        }
        const dest = (Tone.getContext().rawContext as AudioContext).createMediaStreamDestination();
        cloudFilter.connect(dest as unknown as Tone.ToneAudioNode);
        cloudRecordingDestRef.current = dest;
      } catch(e) {
        console.warn('REC cloud: no se pudo crear nodo:', e);
        return;
      }
    }
    cloudRecordingChunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus' : 'audio/webm';
    const recorder = new MediaRecorder(cloudRecordingDestRef.current.stream, { mimeType });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) cloudRecordingChunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(cloudRecordingChunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `atmosphere-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      setCloudRecordingState('idle');
      logChange('Atmosphere grabado y descargado');
    };
    recorder.start(100);
    cloudMediaRecorderRef.current = recorder;
    setCloudRecordingState('recording');
    logChange('REC Atmosphere iniciado');
  }, [logChange]); // eslint-disable-line react-hooks/exhaustive-deps

  const startGlobalRecordingNow = useCallback(() => {
    if (!globalRecordingDestRef.current) {
      try {
        const dest = (Tone.getContext().rawContext as AudioContext).createMediaStreamDestination();
        masterBusRef.current?.compressor.connect(dest as unknown as Tone.ToneAudioNode);
        globalRecordingDestRef.current = dest;
      } catch(e) {
        console.warn('REC global: no se pudo crear nodo:', e);
        return;
      }
    }
    globalRecordingChunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus' : 'audio/webm';
    const recorder = new MediaRecorder(globalRecordingDestRef.current.stream, { mimeType });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) globalRecordingChunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(globalRecordingChunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mix-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      setGlobalRecordingState('idle');
      logChange('Mix global grabado y descargado');
    };
    recorder.start(100);
    globalMediaRecorderRef.current = recorder;
    setGlobalRecordingState('recording');
    logChange('REC global iniciado');
  }, [logChange]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleArmOrRecord = useCallback(() => {
    if (toneRecordingState === 'recording') {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      return;
    }
    if (toneRecordingState === 'armed') {
      setToneRecordingState('idle');
      return;
    }
    if (isPlaying) {
      startRecordingNow();
    } else {
      setToneRecordingState('armed');
      logChange('Tone REC armado — esperando Play');
    }
  }, [toneRecordingState, isPlaying, logChange, startRecordingNow]);

  const handleCloudArmOrRecord = useCallback(() => {
    if (cloudRecordingState === 'recording') {
      if (cloudMediaRecorderRef.current?.state === 'recording') {
        cloudMediaRecorderRef.current.stop();
      }
      return;
    }
    if (cloudRecordingState === 'armed') {
      setCloudRecordingState('idle');
      return;
    }
    if (isPlaying) {
      startCloudRecordingNow();
    } else {
      setCloudRecordingState('armed');
      logChange('REC Atmosphere armado — esperando Play');
    }
  }, [cloudRecordingState, isPlaying, logChange, startCloudRecordingNow]);

  const handleGlobalArmOrRecord = useCallback(() => {
    if (globalRecordingState === 'recording') {
      if (globalMediaRecorderRef.current?.state === 'recording') {
        globalMediaRecorderRef.current.stop();
      }
      return;
    }
    if (globalRecordingState === 'armed') {
      setGlobalRecordingState('idle');
      return;
    }
    if (isPlaying) {
      startGlobalRecordingNow();
    } else {
      setGlobalRecordingState('armed');
      logChange('REC global armado — esperando Play');
    }
  }, [globalRecordingState, isPlaying, logChange, startGlobalRecordingNow]);

  // Armed→recording on play, auto-stop on stop
  useEffect(() => {
    if (isPlaying && toneRecordingState === 'armed') startRecordingNow();
    if (!isPlaying && toneRecordingState === 'recording') {
      if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    }
    if (isPlaying && globalRecordingState === 'armed') startGlobalRecordingNow();
    if (!isPlaying && globalRecordingState === 'recording') {
      if (globalMediaRecorderRef.current?.state === 'recording') globalMediaRecorderRef.current.stop();
    }
    if (isPlaying && cloudRecordingState === 'armed') startCloudRecordingNow();
    if (!isPlaying && cloudRecordingState === 'recording') {
      if (cloudMediaRecorderRef.current?.state === 'recording') cloudMediaRecorderRef.current.stop();
    }
  }, [isPlaying]); // eslint-disable-line react-hooks/exhaustive-deps

  // ═══ Ref Injection ═══
  // Wire audio functions into useTrackState refs
  initOrigSynthRef.current = (trackId: string, overrideSynthType?: string) => {
    if (trackId === 'tone' && toneRecordingState === 'recording' && mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setToneRecordingState('idle');
    }
    initializeOriginalSynthBase(trackId, overrideSynthType);
    if (trackId === 'tone' && recordingDestRef.current && toneFilterRef.current) {
      toneFilterRef.current.connect(recordingDestRef.current as unknown as Tone.ToneAudioNode);
    }
  };
  startLorenzRafRef.current = startLorenzRaf;

  // ═══ Return ═══
  return {
    globalStep,
    lastHit,
    uiStats,
    togglePlay,
    handlePhaseSync,
    phaseBufferRef,
    phaseBufferHeadRef,
    PHASE_BUFFER_SIZE,
    toneRecordingState,
    cloudRecordingState,
    globalRecordingState,
    handleArmOrRecord,
    handleCloudArmOrRecord,
    handleGlobalArmOrRecord,
  };
}
