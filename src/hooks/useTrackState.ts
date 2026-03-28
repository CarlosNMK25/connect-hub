import { useState, useRef, useCallback, useEffect } from 'react';
import * as Tone from 'tone';
import type { TrackState, SceneData } from '../types/track';
import type { MarkovStyle } from '../utils/markovGenerator';
import { bjorklund } from '../utils/bjorklund';
import { generateLSystem, generateCAPattern } from '../utils/patternGenerators';
import { generateMarkovMatrix } from '../utils/markovGenerator';
import { calculateSliceBoundaries, defaultSliceOrder, defaultSliceReverse, defaultSlicePitch } from '../utils/slicerUtils';
import { lcmArray } from '../utils/math';

interface UseTrackStateParams {
  synthsRef: React.MutableRefObject<{ [key: string]: any }>;
  masterBusRef: React.MutableRefObject<any>;
  logChange: (action: string, deltas?: string[]) => void;
  syncAllScenes: boolean;
  isPlaying: boolean;
}

export function useTrackState(params: UseTrackStateParams) {
  const { synthsRef, masterBusRef, logChange, syncAllScenes, isPlaying } = params;

  // ── Ref injection slots (populated by parent after defining audio functions) ──
  const initOrigSynthRef = useRef<((trackId: string, overrideSynthType?: string) => void) | null>(null);
  const startLorenzRafRef = useRef<(() => void) | null>(null);

  // ── Internal refs ──
  const caStateRef = useRef<Record<string, number[]>>({});
  const caEvolveCycleRef = useRef<Record<string, number>>({});
  const pendingCARef = useRef<Record<string, number[]>>({});
  const pendingMutationsRef = useRef<{ [trackId: string]: number[] }>({});
  const rrNoteIndexRef = useRef<Record<string, number>>({});
  const markovLastNoteRef = useRef<Record<string, number>>({});
  const markovAnchorCountRef = useRef<Record<string, number>>({});
  const markovMatrixRef = useRef<Record<string, number[][]>>({});
  const markovNotesRef = useRef<Record<string, number[]>>({});
  const driftAccumulatorRef = useRef<Record<string, number>>({});
  const sliceBoundariesRef = useRef<Record<string, Array<{ start: number; end: number }>>>({});

  const [driftOffsets, setDriftOffsets] = useState<Record<string, number>>({});

  // ── Helper: updateTrackPattern ──
  const updateTrackPattern = (t: TrackState): TrackState => {
    const mode = t.patternMode ?? 'euclidean';

    if (mode === 'lsystem') {
      const pattern = generateLSystem(
        t.lsSeed ?? 'X',
        t.lsRuleA ?? 'XO',
        t.lsIterations ?? 3,
        t.steps,
        t.lsRotation ?? 0
      );
      return { ...t, pattern };
    }

    if (mode === 'ca') {
      const existing = caStateRef.current[t.id];
      const { pattern, newState } = generateCAPattern(
        t.caRule ?? 30,
        t.caSeed ?? 'center',
        t.steps,
        t.caDensity ?? 50,
        existing
      );
      caStateRef.current[t.id] = newState;
      return { ...t, pattern };
    }

    // default: euclidean
    const p = bjorklund(t.pulses, t.steps);
    return { ...t, pattern: p };
  };

  // ── Helper: updateMarkovMatrix ──
  const updateMarkovMatrix = useCallback((t: TrackState) => {
    if (!t.isTonal || (t.noteMode ?? 'euclidean') !== 'markov') return;
    const unique = [...new Set(t.noteIndices)].sort((a, b) => a - b);
    if (unique.length === 0) return;
    markovNotesRef.current[t.id] = unique;
    markovMatrixRef.current[t.id] = generateMarkovMatrix(
      unique,
      (t.markovStyle ?? 'scale') as MarkovStyle,
      t.markovTemperature ?? 40
    );
    markovLastNoteRef.current[t.id] = 0;
    markovAnchorCountRef.current[t.id] = 0;
  }, []);

  // ── Tracks state ──
  const [tracks, setTracks] = useState<TrackState[]>(() => [
    updateTrackPattern({ 
      id: 'kick', name: 'Kick', color: '#166534', pulses: 4, steps: 16, offset: 0, 
      probabilities: new Array(64).fill(1), pattern: [],
      samplerBuffer: null, samplerStatus: 'IDLE', samplerFilename: null,
      sampleStart: 0, sampleEnd: 1, attack: 0, decay: 200, mode: 'TRIGGER', pitch: 0, normalize: true,
      grainSize: 100, overlap: 0.1, spray: 0, bitCrush: 16,
      chaosEnabled: false, entropy: 1, evolveEnabled: false, mutationRate: 0.05, mutationSpeed: 1,
      isMuted: false, isSoloed: false, volume: 0.8, delaySend: 0, reverbSend: 0, ratchet: 0,
      isTonal: false, rootNote: 48, scaleId: 'phrygianDominant', octaveRange: 2, noteIndices: new Array(64).fill(0), synthType: 'mono',
      hits: 0, misses: 0, activeScene: 0, scenes: new Array(8).fill(null), activeAdvancedPanel: null
    }),
    updateTrackPattern({ 
      id: 'snare', name: 'Snare', color: '#9D174D', pulses: 2, steps: 16, offset: 4, 
      probabilities: new Array(64).fill(1), pattern: [],
      samplerBuffer: null, samplerStatus: 'IDLE', samplerFilename: null,
      sampleStart: 0, sampleEnd: 1, attack: 0, decay: 200, mode: 'TRIGGER', pitch: 0, normalize: true,
      grainSize: 100, overlap: 0.1, spray: 0, bitCrush: 16,
      chaosEnabled: false, entropy: 1, evolveEnabled: false, mutationRate: 0.05, mutationSpeed: 1,
      isMuted: false, isSoloed: false, volume: 0.8, delaySend: 0, reverbSend: 0, ratchet: 0,
      isTonal: false, rootNote: 48, scaleId: 'phrygianDominant', octaveRange: 2, noteIndices: new Array(64).fill(0), synthType: 'mono',
      hits: 0, misses: 0, activeScene: 0, scenes: new Array(8).fill(null), activeAdvancedPanel: null
    }),
    updateTrackPattern({ 
      id: 'hat', name: 'Hi-Hat', color: '#155E75', pulses: 8, steps: 16, offset: 2, 
      probabilities: new Array(64).fill(1), pattern: [],
      samplerBuffer: null, samplerStatus: 'IDLE', samplerFilename: null,
      sampleStart: 0, sampleEnd: 1, attack: 0, decay: 100, mode: 'TRIGGER', pitch: 0, normalize: true,
      grainSize: 50, overlap: 0.2, spray: 0, bitCrush: 16,
      chaosEnabled: false, entropy: 1, evolveEnabled: false, mutationRate: 0.05, mutationSpeed: 1,
      isMuted: false, isSoloed: false, volume: 0.8, delaySend: 0, reverbSend: 0, ratchet: 0,
      isTonal: false, rootNote: 48, scaleId: 'phrygianDominant', octaveRange: 2, noteIndices: new Array(64).fill(0), synthType: 'mono',
      hits: 0, misses: 0, activeScene: 0, scenes: new Array(8).fill(null), activeAdvancedPanel: null
    }),
    updateTrackPattern({ 
      id: 'cloud', name: 'Atmosphere', color: '#5B21B6', pulses: 4, steps: 16, offset: 0, 
      probabilities: new Array(64).fill(1), pattern: [],
      samplerBuffer: null, samplerStatus: 'IDLE', samplerFilename: null,
      sampleStart: 0, sampleEnd: 1, attack: 2000, decay: 5000, mode: 'TRIGGER', pitch: 0, normalize: true,
      grainSize: 500, overlap: 0.5, spray: 200, bitCrush: 16,
      chaosEnabled: false, entropy: 1, evolveEnabled: false, mutationRate: 0.05, mutationSpeed: 1,
      isMuted: false, isSoloed: false, volume: 0.8, delaySend: 0, reverbSend: 0, ratchet: 0,
      isTonal: false, rootNote: 48, scaleId: 'phrygianDominant', octaveRange: 2, noteIndices: new Array(64).fill(0), synthType: 'mono',
      cloudMode: 'granular' as const, enoSpeed: 1.0,
      hits: 0, misses: 0, activeScene: 0, scenes: new Array(8).fill(null), activeAdvancedPanel: null
    }),
    updateTrackPattern({ 
      id: 'tone', name: 'Tone', color: '#B45309', pulses: 3, steps: 8, offset: 0, 
      probabilities: new Array(64).fill(1), pattern: [],
      samplerBuffer: null, samplerStatus: 'IDLE', samplerFilename: null,
      sampleStart: 0, sampleEnd: 1, attack: 0, decay: 300, mode: 'TRIGGER', pitch: 0, normalize: true,
      grainSize: 100, overlap: 0.1, spray: 0, bitCrush: 16,
      chaosEnabled: false, entropy: 1, evolveEnabled: false, mutationRate: 0.05, mutationSpeed: 1,
      isMuted: false, isSoloed: false, volume: 0.7, delaySend: 0.15, reverbSend: 0.2, ratchet: 0,
      isTonal: true, rootNote: 48, scaleId: 'phrygianDominant', octaveRange: 2, noteIndices: new Array(64).fill(0), synthType: 'mono',
      fmRatio: 2, fmIndex: 10,
      wfAmount: 3, wfSymmetry: 0,
      addPartials: 4, addBrightness: 0.5,
      arRate: 80, arDepth: 0,
      hits: 0, misses: 0, activeScene: 0, scenes: new Array(8).fill(null), activeAdvancedPanel: null
    }),
  ]);

  // ── tracksRef sync ──
  const tracksRef = useRef(tracks);
  useEffect(() => { tracksRef.current = tracks; }, [tracks]);

  // ── recalculateSlices ──
  const recalculateSlices = useCallback((track: TrackState) => {
    if (!track.samplerBuffer || !track.sliceCount) return;
    sliceBoundariesRef.current[track.id] = calculateSliceBoundaries(
      track.samplerBuffer,
      track.sliceCount
    );
    setTracks(prev => prev.map(t =>
      t.id === track.id ? {
        ...t,
        sliceOrder: defaultSliceOrder(track.sliceCount!),
        sliceReverse: defaultSliceReverse(track.sliceCount!),
        slicePitch: defaultSlicePitch(track.sliceCount!)
      } : t
    ));
  }, []);

  // ── initCloudEno ──
  const initCloudEno = useCallback((audioBuffer: AudioBuffer) => {
    console.log('[ENO-DIAG] initCloudEno called', { bufferDuration: audioBuffer?.duration, bufferLength: audioBuffer?.length });
    const cloudSynth = synthsRef.current.cloud;
    if (!cloudSynth?.ducker) { console.warn('[ENO-DIAG] initCloudEno ABORTED: no cloudSynth.ducker', { hasCloud: !!cloudSynth, hasDucker: !!cloudSynth?.ducker }); return; }

    const existingDucker = cloudSynth.ducker;
    const existingDelaySend = cloudSynth.delaySend;
    const existingReverbSend = cloudSynth.reverbSend;

    // Stop granular if running
    if (cloudSynth.grainPlayer) {
      try { cloudSynth.grainPlayer.stop(); } catch {}
    }

    // Clean up previous Eno if any
    if (cloudSynth.enoDispose) {
      try { cloudSynth.enoDispose(); } catch {}
    }

    const BASE_DURATIONS = [2.3, 3.7, 5.1, 7.3];
    const NUM_LOOPS = BASE_DURATIONS.length;

    const enoMaster = new Tone.Gain(1);
    enoMaster.connect(existingDucker);

    const enoPlayers: Tone.Player[] = [];
    const enoRepeatIds: number[] = [];
    let enoActive = false;

    const toneBuffer = new Tone.ToneAudioBuffer(audioBuffer);

    for (let i = 0; i < NUM_LOOPS; i++) {
      const player = new Tone.Player(toneBuffer);
      player.connect(enoMaster);
      enoPlayers.push(player);
    }

    const scheduleEnoLoop = (loopIdx: number) => {
      const cloudTrack = tracksRef.current.find(t => t.id === 'cloud');
      const speedMult = cloudTrack?.enoSpeed ?? 1.0;
      const dur = BASE_DURATIONS[loopIdx] * speedMult;
      const player = enoPlayers[loopIdx];
      if (!player.buffer || !player.buffer.loaded || !enoActive) return;

      const bufDur = player.buffer.duration;
      const maxOffset = Math.max(0, bufDur - dur);
      const offset = Math.random() * maxOffset;

      try {
        player.start(Tone.now(), offset, dur);
      } catch {}

      const nextTime = Tone.now() + dur;
      const id = Tone.getTransport().scheduleOnce(() => {
        if (enoActive) scheduleEnoLoop(loopIdx);
      }, nextTime);
      enoRepeatIds[loopIdx] = id;
    };

    const startEno = () => {
      console.log('[ENO-DIAG] startEno called', { enoActive, numPlayers: enoPlayers.length });
      if (enoActive) { console.log('[ENO-DIAG] startEno SKIPPED: already active'); return; }
      enoActive = true;
      for (let i = 0; i < NUM_LOOPS; i++) {
        Tone.getTransport().scheduleOnce(() => {
          if (enoActive) scheduleEnoLoop(i);
        }, `+${i * 0.4}`);
      }
    };

    const stopEno = () => {
      enoActive = false;
      enoRepeatIds.forEach(id => {
        try { Tone.getTransport().clear(id); } catch {}
      });
      enoPlayers.forEach(p => {
        try { p.stop(); } catch {}
      });
    };

    const disposeEno = () => {
      stopEno();
      enoPlayers.forEach(p => {
        try { p.dispose(); } catch {}
      });
      enoMaster.dispose();
    };

    cloudSynth.startEno = startEno;
    cloudSynth.stopEno = stopEno;
    cloudSynth.enoDispose = disposeEno;
    console.log('[ENO-DIAG] initCloudEno COMPLETE: startEno assigned to cloudSynth');

    const originalSetVolume = cloudSynth.setVolume;
    cloudSynth.setVolume = (vol: number) => {
      if (cloudSynth.grainPlayer) {
        try { cloudSynth.grainPlayer.volume.rampTo(Tone.gainToDb(vol), 0.05); } catch {}
      }
      enoMaster.gain.value = vol;
    };

    cloudSynth.setSends = (delayVal: number, reverbVal: number) => {
      if (existingDelaySend) existingDelaySend.gain.rampTo(delayVal, 0.05);
      if (existingReverbSend) existingReverbSend.gain.rampTo(reverbVal, 0.05);
    };

    if (isPlaying) {
      startEno();
    }
  }, [isPlaying]);

  // ── handleCloudModeChange ──
  const handleCloudModeChange = useCallback((newMode: 'granular' | 'eno') => {
    setTracks(prev => prev.map(t => t.id === 'cloud' ? { ...t, cloudMode: newMode } : t));

    const cloudTrack = tracksRef.current.find(t => t.id === 'cloud');
    const cloudSynth = synthsRef.current.cloud;

    if (newMode === 'eno') {
      if (cloudSynth?.grainPlayer) {
        try { cloudSynth.grainPlayer.stop(); } catch {}
      }
      if (cloudTrack?.samplerBuffer) {
        initCloudEno(cloudTrack.samplerBuffer);
      }
    } else {
      if (cloudSynth?.stopEno) {
        cloudSynth.stopEno();
      }
      if (isPlaying && cloudSynth?.grainPlayer) {
        try { cloudSynth.grainPlayer.start(); } catch {}
      }
    }
  }, [initCloudEno, isPlaying]);

  // ── handleFileUpload ──
  const handleFileUpload = async (trackId: string, file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      alert("El archivo excede el límite de seguridad (10MB).");
      return;
    }

    if (!masterBusRef.current) {
      alert("El motor de audio no está listo. Por favor, espera un momento.");
      return;
    }

    await Tone.start();
    if (Tone.getContext().state !== 'running') {
      await Tone.getContext().resume();
    }

    setTracks(prev => prev.map(t => t.id === trackId ? { ...t, samplerStatus: 'DECODING', samplerFilename: file.name } : t));

    try {
      console.log(`[Sampler] Loading file: ${file.name} for track: ${trackId}`);
      
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await Tone.getContext().decodeAudioData(arrayBuffer);
      
      if (!audioBuffer || audioBuffer.length === 0) throw new Error("Failed to decode audio buffer or buffer is empty");
      
      console.log(`[Sampler] Decoded successfully. Duration: ${audioBuffer.duration.toFixed(2)}s`);

      if (audioBuffer.duration > 10.1) {
        alert("El audio excede los 10 segundos permitidos.");
        setTracks(prev => prev.map(t => t.id === trackId ? { ...t, samplerStatus: 'IDLE', samplerFilename: null } : t));
        return;
      }

      // Cleanup previous sampler parts (not infrastructure for cloud)
      if (synthsRef.current[trackId]?.disposeSampler) {
        synthsRef.current[trackId].disposeSampler();
      } else if (synthsRef.current[trackId]?.dispose) {
        synthsRef.current[trackId].dispose();
      }

      const master = masterBusRef.current;
      const delaySend = new Tone.Gain(0).connect(master.delayBus);
      const reverbSend = new Tone.Gain(0).connect(master.reverbBus);
      const spectralSend = new Tone.Gain(0).connect(master.spectralDelayBus);
      const freezeSendNode = new Tone.Gain(0).connect(master.freezeBus);
      const reverseSendNode = new Tone.Gain(0).connect(master.reverseBus);

      // Samplers bypass filter/EQ — connect directly to master compressor (or cloud ducker)
      // NOTE: pre-existing leak — spectralSend, freezeSendNode, reverseSendNode are not disposed on cleanup (tech debt)
      const bitCrusher = new Tone.BitCrusher(16).connect(
        trackId === 'cloud' ? synthsRef.current.cloud?.ducker ?? master.compressor : master.compressor
      );
      bitCrusher.connect(delaySend);
      bitCrusher.connect(reverbSend);
      bitCrusher.connect(spectralSend);
      bitCrusher.connect(freezeSendNode);
      bitCrusher.connect(reverseSendNode);

      const grainPlayer = new Tone.GrainPlayer(audioBuffer).connect(bitCrusher);
      grainPlayer.loop = trackId === 'cloud';
      
      console.log(`[Sampler] GrainPlayer created for ${trackId}. Buffer duration: ${grainPlayer.buffer.duration}`);

      setTracks(prev => prev.map(t => {
        if (t.id !== trackId) return t;
        return { 
          ...t, 
          samplerStatus: 'READY', 
          samplerBuffer: audioBuffer,
          sampleStart: 0,
          sampleEnd: 1,
          attack: trackId === 'cloud' ? 2000 : 0,
          decay: trackId === 'cloud' ? 5000 : Math.min(2000, Math.round(audioBuffer.duration * 1000)),
          grainSize: trackId === 'cloud' ? 500 : 100,
          overlap: 0.5,
          spray: trackId === 'cloud' ? 200 : 0,
          bitCrush: 16,
          pitch: 0
        };
      }));

      const currentCloudTrack = tracksRef.current.find(t => t.id === 'cloud');
      if (trackId === 'cloud' && isPlaying && currentCloudTrack?.cloudMode !== 'eno') {
        grainPlayer.start();
      }

      if (!synthsRef.current[trackId]) {
        synthsRef.current[trackId] = {};
      }
      
      const synthObj = synthsRef.current[trackId];
      synthObj.grainPlayer = grainPlayer;
      synthObj.bitCrusher = bitCrusher;
      synthObj.delaySend = delaySend;
      synthObj.reverbSend = reverbSend;
      
      synthObj.dispose = () => {
        grainPlayer.dispose();
        bitCrusher.dispose();
        delaySend.dispose();
        reverbSend.dispose();
      };

      synthObj.triggerAttackRelease = (duration: any, time: number, velocity: number, sliceInfoArg?: { startSec: number; durationSec: number; detuneCents: number; isReverse: boolean }) => {
        const currentTrack = tracksRef.current.find(t => t.id === trackId);
        if (!currentTrack || !grainPlayer.buffer) return;
        
        if (grainPlayer.buffer instanceof Tone.ToneAudioBuffer && !grainPlayer.buffer.loaded) {
          console.warn(`[Sampler] Buffer for ${trackId} not yet loaded`);
          return;
        }

        const stretchRate = currentTrack.stretchEnabled ? (currentTrack.stretchRate ?? 1.0) : 1.0;
        const stretchCompensation = stretchRate !== 1.0 ? -1200 * Math.log2(stretchRate) : 0;
        grainPlayer.playbackRate = stretchRate;

        if (sliceInfoArg) {
          grainPlayer.grainSize = currentTrack.grainSize / 1000;
          grainPlayer.overlap = currentTrack.overlap;
          grainPlayer.detune = sliceInfoArg.detuneCents + (velocity - 0.8) * 100 + stretchCompensation;
          grainPlayer.reverse = sliceInfoArg.isReverse;
          try {
            if (grainPlayer.mute) grainPlayer.mute = false;
            grainPlayer.start(time, sliceInfoArg.startSec, sliceInfoArg.durationSec);
          } catch (err) {
            console.warn("GrainPlayer slicer start failed:", err);
          }
          return;
        }

        grainPlayer.reverse = false;
        grainPlayer.grainSize = currentTrack.grainSize / 1000;
        grainPlayer.overlap = currentTrack.overlap;
        grainPlayer.detune = currentTrack.pitch * 100 + (velocity - 0.8) * 100 + stretchCompensation;
        
        const sprayAmount = (currentTrack.spray / 1000) * (currentTrack.chaosEnabled ? currentTrack.entropy : 1);
        const startOffset = currentTrack.sampleStart * audioBuffer.duration;
        const randomOffset = (Math.random() - 0.5) * sprayAmount;
        const finalOffset = Math.max(0, Math.min(audioBuffer.duration, startOffset + randomOffset));
        
        const durSeconds = typeof duration === 'string' ? Tone.Time(duration).toSeconds() : duration;

        if (trackId !== 'cloud') {
          try {
            const startOffsetSec = Math.max(0, Math.min(audioBuffer.duration - 0.01, finalOffset));
            const endOffsetSec = currentTrack.sampleEnd * audioBuffer.duration;
            const roiDuration = Math.max(0.01, endOffsetSec - startOffsetSec);
            const durationSec = Math.max(0.01, Math.min(roiDuration, durSeconds));
            
            if (grainPlayer.mute) grainPlayer.mute = false;
            grainPlayer.start(time, startOffsetSec, durationSec);
          } catch (err) {
            console.warn("GrainPlayer start failed:", err);
          }
        }
      };

      synthObj.setVolume = (vol: number) => {
        grainPlayer.volume.rampTo(Tone.gainToDb(vol), 0.05);
      };
      
      synthObj.setSends = (delayVal: number, reverbVal: number) => {
        delaySend.gain.rampTo(delayVal, 0.05);
        reverbSend.gain.rampTo(reverbVal, 0.05);
      };
      synthObj.setSpectralSend = (value: number) => {
        spectralSend.gain.rampTo(value, 0.05);
      };
      synthObj.setFreezeSend = (value: number) => {
        freezeSendNode.gain.rampTo(value, 0.05);
      };
      synthObj.setReverseSend = (value: number) => {
        reverseSendNode.gain.rampTo(value, 0.05);
      };
      
      const track = tracksRef.current.find(t => t.id === trackId);
      if (track) {
        synthObj.setVolume(track.volume);
        synthObj.setSends(track.delaySend, track.reverbSend);
        synthObj.setSpectralSend(track.spectralDelaySend ?? 0);
        synthObj.setFreezeSend(track.freezeSend ?? 0);
        synthObj.setReverseSend(track.reverseSend ?? 0);
      }

      if (trackId === 'cloud' && track?.cloudMode === 'eno') {
        initCloudEno(audioBuffer);
      }

    } catch (e) {
      console.error("Error decodificando audio:", e);
      setTracks(prev => prev.map(t => t.id === trackId ? { ...t, samplerStatus: 'IDLE', samplerFilename: null } : t));
      alert("Error al cargar el archivo de audio. Asegúrate de que sea un formato compatible.");
    }
  };

  // ── handleSamplerParamChange ──
  const handleSamplerParamChange = useCallback((trackId: string, param: string, val: any) => {
    setTracks(prev => prev.map(t => {
      if (t.id !== trackId) return t;
      return { ...t, [param]: val };
    }));

    const synthObj = synthsRef.current[trackId];
    if (synthObj) {
      if (synthObj.grainPlayer) {
        switch (param) {
          case 'grainSize': synthObj.grainPlayer.grainSize = val / 1000; break;
          case 'overlap': synthObj.grainPlayer.overlap = val; break;
          case 'spray': break;
          case 'pitch': synthObj.grainPlayer.detune = val * 100; break;
          case 'stretchRate': synthObj.grainPlayer.playbackRate = val; break;
          case 'stretchEnabled': synthObj.grainPlayer.playbackRate = val ? (tracksRef.current.find(t => t.id === trackId)?.stretchRate ?? 1.0) : 1.0; break;
          case 'sampleStart': synthObj.grainPlayer.loopStart = val * synthObj.grainPlayer.buffer.duration; break;
          case 'sampleEnd': synthObj.grainPlayer.loopEnd = val * synthObj.grainPlayer.buffer.duration; break;
          case 'attack': synthObj.grainPlayer.fadeIn = val / 1000; break;
          case 'decay': synthObj.grainPlayer.fadeOut = val / 1000; break;
          case 'extremeLoopEnabled': {
            const currentTrack = tracksRef.current.find(t => t.id === trackId);
            if (val && currentTrack?.samplerBuffer) {
              synthObj.grainPlayer.loop = true;
              const loopPt = (currentTrack.extremeLoopPoint ?? 0.5) * currentTrack.samplerBuffer.duration;
              const loopSz = (currentTrack.extremeLoopSize ?? 10) / 1000;
              synthObj.grainPlayer.loopStart = loopPt;
              synthObj.grainPlayer.loopEnd = loopPt + loopSz;
              synthObj.grainPlayer.grainSize = loopSz;
              if (isPlaying) try { synthObj.grainPlayer.start(); } catch {}
            } else {
              synthObj.grainPlayer.loop = trackId === 'cloud';
              try { if (trackId !== 'cloud') synthObj.grainPlayer.stop(); } catch {}
            }
            break;
          }
          case 'extremeLoopSize': {
            const ct = tracksRef.current.find(t => t.id === trackId);
            if (ct?.extremeLoopEnabled && ct.samplerBuffer) {
              const loopSz = val / 1000;
              const loopPt = (ct.extremeLoopPoint ?? 0.5) * ct.samplerBuffer.duration;
              synthObj.grainPlayer.loopStart = loopPt;
              synthObj.grainPlayer.loopEnd = loopPt + loopSz;
              synthObj.grainPlayer.grainSize = loopSz;
            }
            break;
          }
          case 'extremeLoopPoint': {
            const ct2 = tracksRef.current.find(t => t.id === trackId);
            if (ct2?.extremeLoopEnabled && ct2.samplerBuffer) {
              const loopPt = val * ct2.samplerBuffer.duration;
              const loopSz = (ct2.extremeLoopSize ?? 10) / 1000;
              synthObj.grainPlayer.loopStart = loopPt;
              synthObj.grainPlayer.loopEnd = loopPt + loopSz;
            }
            break;
          }
        }
      }
      if (synthObj.bitCrusher && param === 'bitCrush') {
        synthObj.bitCrusher.bits = val;
      }
      if (['eqEnabled', 'eqHpfFreq', 'eqLpfFreq'].includes(param)) {
        const updatedTrack = tracksRef.current.find(t => t.id === trackId);
        if (updatedTrack) {
          const merged = { ...updatedTrack, [param]: val };
          const hpf = merged.eqEnabled ? (merged.eqHpfFreq ?? 20) : 20;
          const lpf = merged.eqEnabled ? (merged.eqLpfFreq ?? 20000) : 20000;
          synthObj.updateEq?.(hpf, lpf);
        }
      }
      if (param === 'pan') {
        synthObj.setPan?.(val as number);
      }
      if (param === 'freqShift') {
        const updatedTrack = tracksRef.current.find(t => t.id === trackId);
        if (updatedTrack?.freqShiftEnabled) {
          synthObj.setFreqShift?.(val as number);
        }
      }
      if (param === 'freqShiftEnabled') {
        const updatedTrack = tracksRef.current.find(t => t.id === trackId);
        synthObj.setFreqShift?.(val ? (updatedTrack?.freqShift ?? 0) : 0, val as boolean);
      }
      if (param === 'spectralDelaySend') {
        synthObj.setSpectralSend?.(val as number);
      }
      if (param === 'freezeSend') {
        synthObj.setFreezeSend?.(val as number);
      }
      if (param === 'reverseSend') {
        synthObj.setReverseSend?.(val as number);
      }
      if (param === 'binauralEnabled') {
        synthObj.switchBinaural?.(val as boolean);
        if (val) {
          const updatedTrack = tracksRef.current.find(t => t.id === trackId);
          synthObj.updateBinaural?.(updatedTrack?.binauralAzimuth ?? 0, updatedTrack?.binauralDistance ?? 3);
        }
      }
      if (param === 'binauralAzimuth' || param === 'binauralDistance') {
        const updatedTrack = tracksRef.current.find(t => t.id === trackId);
        if (updatedTrack?.binauralEnabled) {
          const az = param === 'binauralAzimuth' ? (val as number) : (updatedTrack?.binauralAzimuth ?? 0);
          const dist = param === 'binauralDistance' ? (val as number) : (updatedTrack?.binauralDistance ?? 3);
          synthObj.updateBinaural?.(az, dist);
        }
      }
    }
  }, []);

  // ── Scene helpers ──
  const extractSceneData = (t: TrackState): SceneData => ({
    pulses: t.pulses,
    steps: t.steps,
    offset: t.offset,
    probabilities: [...t.probabilities],
    pattern: [...t.pattern],
    patternMode: t.patternMode,
    lsSeed: t.lsSeed,
    lsRuleA: t.lsRuleA,
    lsIterations: t.lsIterations,
    lsRotation: t.lsRotation,
    caRule: t.caRule,
    caSeed: t.caSeed,
    caDensity: t.caDensity,
    caSpeed: t.caSpeed,
    // Audio
    volume: t.volume,
    delaySend: t.delaySend,
    reverbSend: t.reverbSend,
    spectralDelaySend: t.spectralDelaySend,
    freezeSend: t.freezeSend,
    reverseSend: t.reverseSend,
    pan: t.pan,
    eqEnabled: t.eqEnabled,
    eqHpfFreq: t.eqHpfFreq,
    eqLpfFreq: t.eqLpfFreq,
    pitch: t.pitch,
    synthType: t.synthType,
    // Percussive
    kickPitchDecay: t.kickPitchDecay,
    kickOctaves: t.kickOctaves,
    kickDecay: t.kickDecay,
    kickClickType: t.kickClickType,
    snareDecay: t.snareDecay,
    snareNoiseType: t.snareNoiseType,
    snareBodyEnabled: t.snareBodyEnabled,
    snareBodyPitch: t.snareBodyPitch,
    snareBodyDecay: t.snareBodyDecay,
    hatMode: t.hatMode,
    hatHarmonicity: t.hatHarmonicity,
    hatModIndex: t.hatModIndex,
    hatResonance: t.hatResonance,
    hatDecay: t.hatDecay,
    hatNoiseType: t.hatNoiseType,
    // Granular / Sampler
    grainSize: t.grainSize,
    overlap: t.overlap,
    spray: t.spray,
    bitCrush: t.bitCrush,
    normalize: t.normalize,
    sampleStart: t.sampleStart,
    sampleEnd: t.sampleEnd,
    attack: t.attack,
    decay: t.decay,
    mode: t.mode,
    stretchEnabled: t.stretchEnabled,
    stretchRate: t.stretchRate,
    extremeLoopEnabled: t.extremeLoopEnabled,
    extremeLoopSize: t.extremeLoopSize,
    extremeLoopPoint: t.extremeLoopPoint,
    // Stochastic
    chaosEnabled: t.chaosEnabled,
    entropy: t.entropy,
    evolveEnabled: t.evolveEnabled,
    mutationRate: t.mutationRate,
    mutationSpeed: t.mutationSpeed,
    ratchet: t.ratchet,
    // Tonal
    isTonal: t.isTonal,
    rootNote: t.rootNote,
    scaleId: t.scaleId,
    octaveRange: t.octaveRange,
    noteIndices: t.noteIndices ? [...t.noteIndices] : undefined,
    fmRatio: t.fmRatio,
    fmIndex: t.fmIndex,
    wfAmount: t.wfAmount,
    wfSymmetry: t.wfSymmetry,
    addPartials: t.addPartials,
    addBrightness: t.addBrightness,
    arRate: t.arRate,
    arDepth: t.arDepth,
    padVoices: t.padVoices,
    padDetune: t.padDetune,
    padAttack: t.padAttack,
    droneFeedback: t.droneFeedback,
    droneFilterFreq: t.droneFilterFreq,
    ksDecay: t.ksDecay,
    ksBrightness: t.ksBrightness,
    modalBody: t.modalBody,
    modalDecay: t.modalDecay,
    ambientVolume: t.ambientVolume,
    ambientSpeed: t.ambientSpeed,
    // Markov
    noteMode: t.noteMode,
    markovStyle: t.markovStyle,
    markovTemperature: t.markovTemperature,
    markovMemory: t.markovMemory,
    markovAnchor: t.markovAnchor,
    // Cloud
    cloudMode: t.cloudMode,
    enoSpeed: t.enoSpeed,
    // Modulation
    lorenzEnabled: t.lorenzEnabled,
    lorenzDepth: t.lorenzDepth,
    lorenzTarget: t.lorenzTarget,
    lorenzSpeed: t.lorenzSpeed,
    nestedLfoEnabled: t.nestedLfoEnabled,
    nestedLfoRate1: t.nestedLfoRate1,
    nestedLfoRate2: t.nestedLfoRate2,
    nestedLfoDepth: t.nestedLfoDepth,
    // Layer 2
    layer2Blend: t.layer2Blend,
    layer2Pitch: t.layer2Pitch,
    layer2Offset: t.layer2Offset,
    layer2FilterFreq: t.layer2FilterFreq,
    layer2Reverse: t.layer2Reverse,
    layer2StretchEnabled: t.layer2StretchEnabled,
    layer2StretchRate: t.layer2StretchRate,
  });

  const applySceneData = (t: TrackState, scene: SceneData): TrackState => {
    // Helper to conditionally spread defined fields
    const opt = (key: keyof SceneData) => scene[key] !== undefined ? { [key]: key === 'probabilities' || key === 'pattern' || key === 'noteIndices' ? [...(scene[key] as any[])] : scene[key] } : {};

    const merged: TrackState = {
      ...t,
      pulses: scene.pulses,
      steps: scene.steps,
      offset: scene.offset,
      probabilities: [...scene.probabilities],
      pattern: [...scene.pattern],
      patternMode: scene.patternMode,
      lsSeed: scene.lsSeed,
      lsRuleA: scene.lsRuleA,
      lsIterations: scene.lsIterations,
      lsRotation: scene.lsRotation,
      caRule: scene.caRule,
      caSeed: scene.caSeed,
      caDensity: scene.caDensity,
      caSpeed: scene.caSpeed,
      // Audio
      ...opt('volume'), ...opt('delaySend'), ...opt('reverbSend'),
      ...opt('spectralDelaySend'), ...opt('freezeSend'), ...opt('reverseSend'),
      ...opt('pan'), ...opt('eqEnabled'), ...opt('eqHpfFreq'), ...opt('eqLpfFreq'),
      ...opt('pitch'), ...opt('synthType'),
      // Percussive
      ...opt('kickPitchDecay'), ...opt('kickOctaves'), ...opt('kickDecay'), ...opt('kickClickType'),
      ...opt('snareDecay'), ...opt('snareNoiseType'), ...opt('snareBodyEnabled'), ...opt('snareBodyPitch'), ...opt('snareBodyDecay'),
      ...opt('hatMode'), ...opt('hatHarmonicity'), ...opt('hatModIndex'), ...opt('hatResonance'), ...opt('hatDecay'), ...opt('hatNoiseType'),
      // Granular / Sampler
      ...opt('grainSize'), ...opt('overlap'), ...opt('spray'), ...opt('bitCrush'),
      ...opt('normalize'), ...opt('sampleStart'), ...opt('sampleEnd'),
      ...opt('attack'), ...opt('decay'), ...opt('mode'),
      ...opt('stretchEnabled'), ...opt('stretchRate'),
      ...opt('extremeLoopEnabled'), ...opt('extremeLoopSize'), ...opt('extremeLoopPoint'),
      // Stochastic
      ...opt('chaosEnabled'), ...opt('entropy'), ...opt('evolveEnabled'),
      ...opt('mutationRate'), ...opt('mutationSpeed'), ...opt('ratchet'),
      // Tonal
      ...opt('isTonal'), ...opt('rootNote'), ...opt('scaleId'), ...opt('octaveRange'),
      ...(scene.noteIndices !== undefined ? { noteIndices: [...scene.noteIndices] } : {}),
      ...opt('fmRatio'), ...opt('fmIndex'), ...opt('wfAmount'), ...opt('wfSymmetry'),
      ...opt('addPartials'), ...opt('addBrightness'), ...opt('arRate'), ...opt('arDepth'),
      ...opt('padVoices'), ...opt('padDetune'), ...opt('padAttack'),
      ...opt('droneFeedback'), ...opt('droneFilterFreq'),
      ...opt('ksDecay'), ...opt('ksBrightness'),
      ...opt('modalBody'), ...opt('modalDecay'),
      ...opt('ambientVolume'), ...opt('ambientSpeed'),
      // Markov
      ...opt('noteMode'), ...opt('markovStyle'), ...opt('markovTemperature'),
      ...opt('markovMemory'), ...opt('markovAnchor'),
      // Cloud
      ...opt('cloudMode'), ...opt('enoSpeed'),
      // Modulation
      ...opt('lorenzEnabled'), ...opt('lorenzDepth'), ...opt('lorenzTarget'), ...opt('lorenzSpeed'),
      ...opt('nestedLfoEnabled'), ...opt('nestedLfoRate1'), ...opt('nestedLfoRate2'), ...opt('nestedLfoDepth'),
      // Layer 2
      ...opt('layer2Blend'), ...opt('layer2Pitch'), ...opt('layer2Offset'),
      ...opt('layer2FilterFreq'), ...opt('layer2Reverse'),
      ...opt('layer2StretchEnabled'), ...opt('layer2StretchRate'),
    };

    // Apply audio params immediately to the synth
    const synth = synthsRef.current[t.id];
    if (synth) {
      if (scene.volume !== undefined) synth.setVolume?.(scene.volume);
      if (scene.delaySend !== undefined || scene.reverbSend !== undefined) {
        synth.setSends?.(scene.delaySend ?? t.delaySend, scene.reverbSend ?? t.reverbSend);
      }
      if (scene.pan !== undefined) synth.setPan?.(scene.pan);
      if (scene.spectralDelaySend !== undefined) synth.setSpectralSend?.(scene.spectralDelaySend);
      if (scene.freezeSend !== undefined) synth.setFreezeSend?.(scene.freezeSend);
      if (scene.reverseSend !== undefined) synth.setReverseSend?.(scene.reverseSend);
      if (scene.eqEnabled !== undefined || scene.eqHpfFreq !== undefined || scene.eqLpfFreq !== undefined) {
        const eqOn = scene.eqEnabled ?? merged.eqEnabled;
        const hpf = eqOn ? (scene.eqHpfFreq ?? merged.eqHpfFreq ?? 20) : 20;
        const lpf = eqOn ? (scene.eqLpfFreq ?? merged.eqLpfFreq ?? 20000) : 20000;
        synth.updateEq?.(hpf, lpf);
      }
      if (scene.pitch !== undefined && synth.grainPlayer) {
        synth.grainPlayer.detune = scene.pitch * 100;
      }
      // Rebuild synth if synthType changed
      if (scene.synthType !== undefined && scene.synthType !== t.synthType) {
        initOrigSynthRef.current?.(t.id, scene.synthType);
      }
      // Percussive params — immediate audio update
      if (t.id === 'kick' && (scene.kickPitchDecay !== undefined || scene.kickOctaves !== undefined || scene.kickDecay !== undefined || scene.kickClickType !== undefined)) {
        synth.setKickParams?.(
          merged.kickPitchDecay ?? 0.05,
          merged.kickOctaves ?? 10,
          merged.kickDecay ?? 0.4,
          merged.kickClickType ?? 'pink'
        );
      }
      if (t.id === 'snare') {
        if (scene.snareDecay !== undefined || scene.snareNoiseType !== undefined) {
          synth.setSnareParams?.(merged.snareDecay ?? 0.2, merged.snareNoiseType ?? 'white');
        }
        if (scene.snareBodyEnabled !== undefined || scene.snareBodyPitch !== undefined || scene.snareBodyDecay !== undefined) {
          synth.setSnareBody?.(merged.snareBodyEnabled ?? false, merged.snareBodyPitch ?? 180, merged.snareBodyDecay ?? 0.1);
        }
      }
      if (t.id === 'hat' && (scene.hatMode !== undefined || scene.hatHarmonicity !== undefined || scene.hatModIndex !== undefined || scene.hatResonance !== undefined || scene.hatDecay !== undefined || scene.hatNoiseType !== undefined)) {
        synth.setHatMode?.(
          merged.hatMode ?? 'noise',
          merged.hatHarmonicity ?? 5.1,
          merged.hatModIndex ?? 32,
          merged.hatResonance ?? 4000,
          merged.hatDecay ?? 0.05,
          merged.hatNoiseType ?? 'white'
        );
      }
      // Granular / Sampler — immediate audio sync
      const gp = synth.grainPlayer;
      if (gp) {
        if (scene.grainSize !== undefined) gp.grainSize = (merged.grainSize ?? 100) / 1000;
        if (scene.overlap !== undefined) gp.overlap = merged.overlap ?? 0.1;
        if (scene.attack !== undefined) { gp.fadeIn = (merged.attack ?? 0) / 1000; }
        if (scene.decay !== undefined) { gp.fadeOut = (merged.decay ?? 100) / 1000; }
        if (scene.pitch !== undefined) gp.detune = (merged.pitch ?? 0) * 100;
        if (gp.buffer?.duration) {
          const dur = gp.buffer.duration;
          if (scene.sampleStart !== undefined || scene.sampleEnd !== undefined) {
            gp.loopStart = (merged.sampleStart ?? 0) * dur;
            gp.loopEnd = (merged.sampleEnd ?? 1) * dur;
          }
        }
        const stretchOn = merged.stretchEnabled ?? false;
        const stretchRate = merged.stretchRate ?? 1;
        if (scene.stretchEnabled !== undefined || scene.stretchRate !== undefined) {
          gp.playbackRate = stretchOn ? stretchRate : 1;
          if (stretchOn) {
            gp.detune = ((merged.pitch ?? 0) * 100) + (-1200 * Math.log2(stretchRate));
          }
        }
        if (scene.extremeLoopEnabled !== undefined || scene.extremeLoopSize !== undefined || scene.extremeLoopPoint !== undefined) {
          const xlEnabled = merged.extremeLoopEnabled ?? false;
          if (xlEnabled && gp.buffer?.duration) {
            gp.loop = true;
            const xlSize = (merged.extremeLoopSize ?? 50) / 1000;
            const xlPoint = (merged.extremeLoopPoint ?? 0) * gp.buffer.duration;
            gp.loopStart = xlPoint;
            gp.loopEnd = xlPoint + xlSize;
          }
        }
      }
      if (scene.bitCrush !== undefined && synth.bitCrusher) {
        synth.bitCrusher.bits = merged.bitCrush ?? 16;
      }
      // Layer 2 immediate updates
      if (scene.layer2Blend !== undefined && synth.layer2Gain) {
        synth.layer2Gain.gain.rampTo(scene.layer2Blend, 0.05);
      }
      if (scene.layer2FilterFreq !== undefined && synth.layer2Filter) {
        synth.layer2Filter.frequency.rampTo(scene.layer2FilterFreq, 0.05);
      }
    }

    // Recalculate pattern if generative mode
    if (scene.patternMode === 'lsystem' || scene.patternMode === 'ca') {
      return updateTrackPattern(merged);
    }
    return merged;
  };

  const switchScene = (t: TrackState, newScene: number): TrackState => {
    // Use ref for freshest state to avoid React batching race conditions
    const freshTrack = tracksRef.current.find(tr => tr.id === t.id) || t;
    const newScenes = [...t.scenes];
    newScenes[t.activeScene] = extractSceneData(freshTrack);
    let updated = { ...freshTrack, scenes: newScenes, activeScene: newScene };
    if (newScenes[newScene]) {
      updated = applySceneData(updated, newScenes[newScene]!);
    }
    return updated;
  };

  // ── handleSaveScene (explicit save without changing scene) ──
  const handleSaveScene = useCallback((trackId: string) => {
    setTracks(prev => prev.map(t => {
      if (!syncAllScenes && t.id !== trackId) return t;
      const freshT = tracksRef.current.find(tr => tr.id === t.id) || t;
      const newScenes = [...t.scenes];
      newScenes[freshT.activeScene] = extractSceneData(freshT);
      return { ...t, scenes: newScenes };
    }));
  }, [syncAllScenes]);

  // ── handleParamChange ──
  const handleParamChange = useCallback((trackId: string, param: string, value: any) => {
    if (param === 'activeScene') {
      const newScene = value as number;
      if (syncAllScenes) {
        setTracks(prev => prev.map(t => switchScene(t, newScene)));
      } else {
        setTracks(prev => prev.map(t => t.id === trackId ? switchScene(t, newScene) : t));
      }
      return;
    }
    const track = tracksRef.current.find(t => t.id === trackId);
    if (track) {
      switch (param) {
        case 'chaosEnabled': logChange(`Chaos ${value ? 'ON' : 'OFF'} (${track.name})`); break;
        case 'evolveEnabled': logChange(`Evolve ${value ? 'ON' : 'OFF'} (${track.name})`); break;
        case 'entropy': logChange(`${track.name} entropy → ${Math.round(value * 100)}%`); break;
        case 'mutationRate': logChange(`${track.name} mutation → ${Math.round(value * 100)}%`); break;
      }
    }
    setTracks(prev => prev.map(t => t.id === trackId ? { ...t, [param]: value } : t));
  }, [logChange, syncAllScenes]);

  // ── handleSequencerAction ──
  const handleSequencerAction = useCallback((trackId: string, action: string, value?: any, value2?: any) => {
    switch (action) {
      case 'steps': {
        const track = tracksRef.current.find(t => t.id === trackId);
        if (!track) return;
        const val = value as number;
        const oldDensity = Math.round((track.pulses / track.steps) * 100);
        const newPulses = Math.min(track.pulses, val);
        const newDensity = Math.round((newPulses / val) * 100);
        const rhythmicSteps = tracksRef.current.filter(t => t.id !== 'cloud').map(t => t.id === trackId ? val : t.steps);
        const newMcm = lcmArray(rhythmicSteps);
        const oldMcm = lcmArray(tracksRef.current.filter(t => t.id !== 'cloud').map(t => t.steps));
        const deltas: string[] = [];
        if (newMcm !== oldMcm) deltas.push(`MCM ${oldMcm} → ${newMcm}`);
        deltas.push(`Dens ${oldDensity}% → ${newDensity}%`);
        logChange(`${track.name} steps ${track.steps} → ${val}`, deltas);
        setTracks(prev => prev.map(t => {
          if (t.id !== trackId) return t;
          const newSteps = val;
          const oldPattern = t.pattern;
          let newPattern: number[];
          if (newSteps > oldPattern.length) {
            newPattern = [...oldPattern, ...new Array(newSteps - oldPattern.length).fill(0)];
          } else {
            newPattern = oldPattern.slice(0, newSteps);
          }
          const activePulses = newPattern.filter(Boolean).length;
          return { ...t, steps: newSteps, pulses: activePulses, pattern: newPattern };
        }));
        break;
      }
      case 'pulses': {
        const track = tracksRef.current.find(t => t.id === trackId);
        if (!track) return;
        const val = value as number;
        logChange(`${track.name} pulses ${track.pulses} → ${val}`, [`Dens ${Math.round((track.pulses / track.steps) * 100)}% → ${Math.round((val / track.steps) * 100)}%`]);
        setTracks(prev => prev.map(t => {
          if (t.id !== trackId) return t;
          const clampedVal = Math.min(val, t.steps);
          return { ...t, pulses: clampedVal };
        }));
        break;
      }
      case 'offset': {
        const track = tracksRef.current.find(t => t.id === trackId);
        if (track) logChange(`${track.name} offset ${track.offset} → ${value}`);
        setTracks(prev => prev.map(t => t.id === trackId ? updateTrackPattern({ ...t, offset: value }) : t));
        break;
      }
      case 'probability': {
        setTracks(prev => prev.map(t => {
          if (t.id !== trackId) return t;
          const newProbs = [...t.probabilities];
          newProbs[value as number] = value2 as number;
          return { ...t, probabilities: newProbs };
        }));
        break;
      }
      case 'toggleStep': {
        setTracks(prev => prev.map(t => {
          if (t.id !== trackId) return t;
          const newPattern = [...t.pattern];
          newPattern[value as number] = newPattern[value as number] === 1 ? 0 : 1;
          return { ...t, pattern: newPattern, pulses: newPattern.filter(p => p === 1).length };
        }));
        break;
      }
      case 'noteIndex': {
        setTracks(prev => prev.map(t => {
          if (t.id !== trackId) return t;
          const newIndices = [...t.noteIndices];
          newIndices[value as number] = value2 as number;
          return { ...t, noteIndices: newIndices };
        }));
        break;
      }
      case 'patternMode':
        if (value === 'ca') { delete caStateRef.current[trackId]; caEvolveCycleRef.current[trackId] = 0; }
        setTracks(prev => prev.map(t => t.id === trackId ? updateTrackPattern({ ...t, patternMode: value }) : t));
        break;
      case 'lsParam':
        setTracks(prev => prev.map(t => t.id === trackId ? updateTrackPattern({ ...t, [value]: value2 }) : t));
        break;
      case 'lsRegenerate':
        setTracks(prev => prev.map(t => t.id === trackId ? updateTrackPattern(t) : t));
        break;
      case 'lsReset':
        setTracks(prev => prev.map(t => t.id === trackId ? updateTrackPattern({ ...t, lsSeed: 'X', lsRuleA: 'XO', lsIterations: 3, lsRotation: 0 }) : t));
        break;
      case 'caParam':
        delete caStateRef.current[trackId]; caEvolveCycleRef.current[trackId] = 0;
        setTracks(prev => prev.map(t => t.id === trackId ? updateTrackPattern({ ...t, [value]: value2 }) : t));
        break;
      case 'caReset':
        delete caStateRef.current[trackId]; caEvolveCycleRef.current[trackId] = 0;
        setTracks(prev => prev.map(t => t.id === trackId ? updateTrackPattern(t) : t));
        break;
      case 'noteMode': {
        const track = tracksRef.current.find(t => t.id === trackId);
        if (track && value === 'markov') updateMarkovMatrix({ ...track, noteMode: value } as any);
        setTracks(prev => prev.map(t => t.id === trackId ? { ...t, noteMode: value } : t));
        break;
      }
      case 'markovParam': {
        const track = tracksRef.current.find(t => t.id === trackId);
        if (track && ['markovStyle', 'markovTemperature'].includes(value)) updateMarkovMatrix({ ...track, [value]: value2 } as any);
        setTracks(prev => prev.map(t => t.id === trackId ? { ...t, [value]: value2 } : t));
        break;
      }
      case 'markovRegenerate': {
        const t = tracksRef.current.find(tr => tr.id === trackId);
        if (t) updateMarkovMatrix(t as any);
        break;
      }
    }
  }, [logChange, updateMarkovMatrix]);

  // ── handleTonalAction (uses ref injection) ──
  const handleTonalAction = useCallback((trackId: string, action: string, value?: any) => {
    const synth = synthsRef.current[trackId];
    const track = tracksRef.current.find(t => t.id === trackId);

    if (action === 'synthType') {
      setTracks(prev => prev.map(t => t.id === trackId ? { ...t, synthType: value } : t));
      synth?.disposeNestedLfo?.();
      if (synth?.dispose) synth.dispose();
      initOrigSynthRef.current?.(trackId, value);
      logChange(`${track?.name ?? 'Tone'} synth → ${String(value).toUpperCase()}`);
      return;
    }
    if (action === 'cloudMode') {
      handleCloudModeChange(value);
      return;
    }

    setTracks(prev => prev.map(t => t.id === trackId ? { ...t, [action]: value } : t));

    const merged = track ? { ...track, [action]: value } : null;
    if (!merged) return;
    switch (action) {
      case 'fmRatio': case 'fmIndex':
        synth?.updateFmParams?.(merged.fmRatio ?? 2, merged.fmIndex ?? 10); break;
      case 'wfAmount': case 'wfSymmetry':
        synth?.updateWfParams?.(merged.wfAmount ?? 3, merged.wfSymmetry ?? 0); break;
      case 'addPartials': case 'addBrightness':
        synth?.updateAddParams?.(merged.addPartials ?? 4, merged.addBrightness ?? 0.5); break;
      case 'arRate': case 'arDepth':
        synth?.updateArParams?.(merged.arRate ?? 80, merged.arDepth ?? 0); break;
      case 'padVoices': case 'padDetune': case 'padAttack':
        synth?.updatePadParams?.(merged.padVoices ?? 5, merged.padDetune ?? 30, merged.padAttack ?? 0.3); break;
      case 'droneFeedback': case 'droneFilterFreq':
        synth?.updateDroneParams?.(merged.droneFeedback ?? 0.88, merged.droneFilterFreq ?? 2000); break;
      case 'ksDecay': case 'ksBrightness':
        synth?.updateKsParams?.(merged.ksDecay ?? 0.97, merged.ksBrightness ?? 5000); break;
      case 'lorenzEnabled':
        if (value === true) startLorenzRafRef.current?.(); break;
      case 'nestedLfoEnabled':
        if (value) { synth?.initNestedLfo?.(track?.nestedLfoRate1 ?? 0.1, track?.nestedLfoRate2 ?? 4.0, track?.nestedLfoDepth ?? 800); }
        else { synth?.disposeNestedLfo?.(); }
        break;
      case 'nestedLfoRate1': case 'nestedLfoRate2': case 'nestedLfoDepth':
        synth?.updateNestedLfo?.(merged.nestedLfoRate1 ?? 0.1, merged.nestedLfoRate2 ?? 4.0, merged.nestedLfoDepth ?? 800); break;
    }
  }, [logChange, handleCloudModeChange]);

  // ── handleSlicerAction ──
  const handleSlicerAction = useCallback((trackId: string, action: string, value?: any, value2?: any) => {
    switch (action) {
      case 'toggle': {
        const t = tracksRef.current.find(tr => tr.id === trackId);
        if (value && t?.samplerBuffer) recalculateSlices({ ...t, sliceCount: t.sliceCount ?? 16, slicerEnabled: true } as any);
        setTracks(prev => prev.map(t => t.id === trackId ? { ...t, slicerEnabled: value, sliceCount: t.sliceCount ?? 16 } : t));
        break;
      }
      case 'count': {
        const t = tracksRef.current.find(tr => tr.id === trackId);
        if (t?.samplerBuffer) recalculateSlices({ ...t, sliceCount: value } as any);
        setTracks(prev => prev.map(t => t.id === trackId ? { ...t, sliceCount: value } : t));
        break;
      }
      case 'order':
        setTracks(prev => prev.map(t => t.id === trackId ? { ...t, sliceOrder: value } : t)); break;
      case 'reverseToggle':
        setTracks(prev => prev.map(t => {
          if (t.id !== trackId) return t;
          const r = [...(t.sliceReverse ?? [])]; r[value as number] = !r[value as number]; return { ...t, sliceReverse: r };
        })); break;
      case 'pitch':
        setTracks(prev => prev.map(t => {
          if (t.id !== trackId) return t;
          const p = [...(t.slicePitch ?? [])]; p[value as number] = value2 as number; return { ...t, slicePitch: p };
        })); break;
      case 'randomize': {
        const track = tracksRef.current.find(t => t.id === trackId);
        const count = track?.sliceCount ?? 16;
        setTracks(prev => prev.map(t => t.id === trackId ? { ...t, sliceOrder: defaultSliceOrder(count).sort(() => Math.random() - 0.5) } : t));
        break;
      }
      case 'reset': {
        const track = tracksRef.current.find(t => t.id === trackId);
        const count = track?.sliceCount ?? 16;
        setTracks(prev => prev.map(t => t.id === trackId ? {
          ...t, sliceOrder: defaultSliceOrder(count), sliceReverse: defaultSliceReverse(count), slicePitch: defaultSlicePitch(count)
        } : t));
        break;
      }
    }
  }, [recalculateSlices]);

  // ── handleClearSampler (uses ref injection) ──
  const handleClearSampler = (trackId: string) => {
    if (synthsRef.current[trackId]?.disposeLayer2) {
      synthsRef.current[trackId].disposeLayer2();
    }
    if (synthsRef.current[trackId]?.dispose) {
      synthsRef.current[trackId].dispose();
    }
    
    if (trackId === 'kick' || trackId === 'snare' || trackId === 'hat' || trackId === 'tone') {
      initOrigSynthRef.current?.(trackId);
    }

    setTracks(prev => prev.map(t => t.id === trackId ? { 
      ...t, 
      samplerStatus: 'IDLE', 
      samplerBuffer: null, 
      samplerFilename: null,
      layer2Status: 'empty',
      layer2Filename: undefined,
    } : t));
  };

  // ── handleLoadLayer2 ──
  const handleLoadLayer2 = async (trackId: string, file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      alert("El archivo excede el límite de seguridad (10MB).");
      return;
    }

    await Tone.start();
    if (Tone.getContext().state !== 'running') {
      await Tone.getContext().resume();
    }

    setTracks(prev => prev.map(t => t.id === trackId ? { ...t, layer2Status: 'loading' } : t));

    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await Tone.getContext().decodeAudioData(arrayBuffer);
      if (!audioBuffer || audioBuffer.length === 0) throw new Error("Failed to decode layer2 audio");

      if (audioBuffer.duration > 10.1) {
        alert("El audio excede los 10 segundos permitidos.");
        setTracks(prev => prev.map(t => t.id === trackId ? { ...t, layer2Status: 'empty' } : t));
        return;
      }

      if (synthsRef.current[trackId]?.disposeLayer2) {
        synthsRef.current[trackId].disposeLayer2();
      }

      const currentTrack = tracksRef.current.find(t => t.id === trackId);

      const layer2Player = new Tone.GrainPlayer(audioBuffer);
      layer2Player.loop = false;

      const layer2Gain = new Tone.Gain(currentTrack?.layer2Blend ?? 0.8);

      const layer2Filter = new Tone.Filter({
        frequency: currentTrack?.layer2FilterFreq ?? 8000,
        type: 'lowpass',
        rolloff: -12
      });

      layer2Player.connect(layer2Filter);
      layer2Filter.connect(layer2Gain);
      layer2Gain.connect(synthsRef.current[trackId].bitCrusher);

      const synthObj = synthsRef.current[trackId];
      synthObj.layer2Player = layer2Player;
      synthObj.layer2Gain = layer2Gain;
      synthObj.layer2Filter = layer2Filter;
      synthObj.layer2Buffer = audioBuffer;

      synthObj.triggerLayer2 = (time: number, velocity: number) => {
        const ct = tracksRef.current.find(t => t.id === trackId);
        if (!ct || !layer2Player.buffer) return;
        const l2StretchRate = ct.layer2StretchEnabled ? (ct.layer2StretchRate ?? 1.0) : 1.0;
        layer2Player.playbackRate = l2StretchRate;
        const l2StretchCompensation = l2StretchRate !== 1.0 ? -1200 * Math.log2(l2StretchRate) : 0;
        const l2PitchCents = (ct.layer2Pitch ?? 0) * 100;
        layer2Player.detune = l2PitchCents + l2StretchCompensation;
        layer2Player.reverse = ct.layer2Reverse ?? false;
        const offsetSec = (ct.layer2Offset ?? 0) / 1000;
        const triggerTime = time + offsetSec;
        try {
          layer2Player.start(triggerTime, 0);
        } catch (err) {
          console.warn("Layer2 start failed:", err);
        }
      };

      synthObj.disposeLayer2 = () => {
        layer2Player.dispose();
        layer2Gain.dispose();
        layer2Filter.dispose();
        synthObj.layer2Player = undefined;
        synthObj.layer2Gain = undefined;
        synthObj.layer2Filter = undefined;
        synthObj.layer2Buffer = undefined;
        synthObj.triggerLayer2 = undefined;
        synthObj.disposeLayer2 = undefined;
      };

      setTracks(prev => prev.map(t =>
        t.id === trackId
          ? { ...t, layer2Status: 'ready' as const, layer2Filename: file.name }
          : t
      ));

      logChange(`Layer 2 cargado en ${trackId}: ${file.name}`);
    } catch (err) {
      console.error("[Layer2] Error loading:", err);
      setTracks(prev => prev.map(t => t.id === trackId ? { ...t, layer2Status: 'empty' } : t));
      alert("Error al cargar Layer 2.");
    }
  };

  // ── handleClearLayer2 ──
  const handleClearLayer2 = (trackId: string) => {
    if (synthsRef.current[trackId]?.disposeLayer2) {
      synthsRef.current[trackId].disposeLayer2();
    }
    setTracks(prev => prev.map(t =>
      t.id === trackId
        ? { ...t, layer2Status: 'empty' as const, layer2Filename: undefined }
        : t
    ));
    logChange(`Layer 2 eliminado de ${trackId}`);
  };

  // ── handleLayer2ParamChange ──
  const handleLayer2ParamChange = useCallback((trackId: string, param: string, value: number | boolean) => {
    setTracks(prev => prev.map(t => t.id === trackId ? { ...t, [param]: value } : t));

    const synthObj = synthsRef.current[trackId];
    if (!synthObj) return;
    if (param === 'layer2Blend' && synthObj.layer2Gain) {
      synthObj.layer2Gain.gain.rampTo(value as number, 0.05);
    }
    if (param === 'layer2FilterFreq' && synthObj.layer2Filter) {
      synthObj.layer2Filter.frequency.rampTo(value as number, 0.05);
    }
  }, []);

  // ── Callback wrappers (stable refs for EuclideanTrack memo) ──
  const handleFileUploadCb = useCallback((trackId: string, file: File) => handleFileUpload(trackId, file), []);
  const handleClearSamplerCb = useCallback((trackId: string) => handleClearSampler(trackId), []);
  const handleLoadLayer2Cb = useCallback((trackId: string, file: File) => handleLoadLayer2(trackId, file), []);
  const handleClearLayer2Cb = useCallback((trackId: string) => handleClearLayer2(trackId), []);

  // ── handlePercSynthParamChange ──
  const handlePercSynthParamChange = useCallback((trackId: string, param: string, value: number | string | boolean) => {
    setTracks(prev => prev.map(t => t.id === trackId ? { ...t, [param]: value } : t));
    setTimeout(() => {
      const tr = tracksRef.current.find(t => t.id === trackId);
      if (!tr) return;
      if (trackId === 'kick') {
        synthsRef.current.kick?.setKickParams?.(
          param === 'kickPitchDecay' ? value as number : (tr.kickPitchDecay ?? 0.05),
          param === 'kickOctaves' ? value as number : (tr.kickOctaves ?? 10),
          param === 'kickDecay' ? value as number : (tr.kickDecay ?? 0.4),
          param === 'kickClickType' ? value as string : (tr.kickClickType ?? 'pink')
        );
      } else if (trackId === 'snare') {
        if (['snareDecay', 'snareNoiseType'].includes(param)) {
          synthsRef.current.snare?.setSnareParams?.(
            param === 'snareDecay' ? value as number : (tr.snareDecay ?? 0.2),
            param === 'snareNoiseType' ? value as string : (tr.snareNoiseType ?? 'white')
          );
        }
        if (['snareBodyEnabled', 'snareBodyPitch', 'snareBodyDecay'].includes(param)) {
          synthsRef.current.snare?.setSnareBody?.(
            param === 'snareBodyEnabled' ? value as boolean : (tr.snareBodyEnabled ?? false),
            param === 'snareBodyPitch' ? value as number : (tr.snareBodyPitch ?? 180),
            param === 'snareBodyDecay' ? value as number : (tr.snareBodyDecay ?? 0.1)
          );
        }
      } else if (trackId === 'hat') {
        synthsRef.current.hat?.setHatMode?.(
          param === 'hatMode' ? value as string : (tr.hatMode ?? 'noise'),
          param === 'hatHarmonicity' ? value as number : (tr.hatHarmonicity ?? 5.1),
          param === 'hatModIndex' ? value as number : (tr.hatModIndex ?? 32),
          param === 'hatResonance' ? value as number : (tr.hatResonance ?? 4000),
          param === 'hatDecay' ? value as number : (tr.hatDecay ?? 0.05),
          param === 'hatNoiseType' ? value as string : (tr.hatNoiseType ?? 'white')
        );
      }
    }, 0);
  }, []);

  // ── handleGetMarkovMatrix ──
  const handleGetMarkovMatrix = useCallback((trackId: string) => markovMatrixRef.current[trackId], []);

  return {
    // State
    tracks, setTracks,
    driftOffsets, setDriftOffsets,
    // Refs
    tracksRef,
    caStateRef, caEvolveCycleRef, pendingCARef,
    pendingMutationsRef,
    markovLastNoteRef, markovAnchorCountRef, markovMatrixRef, markovNotesRef,
    driftAccumulatorRef,
    rrNoteIndexRef,
    sliceBoundariesRef,
    // Ref injection slots
    initOrigSynthRef,
    startLorenzRafRef,
    // Functions
    updateTrackPattern,
    updateMarkovMatrix,
    recalculateSlices,
    // Scene helpers
    extractSceneData,
    applySceneData,
    handleSaveScene,
    // Handlers
    handleParamChange,
    handleSequencerAction,
    handleTonalAction,
    handleSlicerAction,
    handleSamplerParamChange,
    handlePercSynthParamChange,
    handleFileUploadCb,
    handleClearSamplerCb,
    handleLoadLayer2Cb,
    handleClearLayer2Cb,
    handleLayer2ParamChange,
    handleCloudModeChange,
    handleGetMarkovMatrix,
    initCloudEno,
  };
}
