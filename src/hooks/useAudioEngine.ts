import { useState, useRef, useEffect, useCallback } from 'react';
import * as Tone from 'tone';
import { createTrackRouting, injectCommonMethods, restoreTrackState, createNestedLfo } from '../utils/audioRouting';
import { LorenzAttractor } from '../utils/lorenzAttractor';
import { buildWavefoldCurve, vactrolfiltFreq } from '../utils/waveshaping';
import { noteIndexToFreq } from '../utils/scales';
import type { TrackState } from '../types/track';

/** Generate a synthetic reversed impulse response for Reverse Reverb */
function generateReverseIR(ctx: BaseAudioContext, decay: number): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(decay * sampleRate);
  const buffer = ctx.createBuffer(2, length, sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-3 * i / length);
    }
    data.reverse();
  }
  return buffer;
}

export interface MasterBusType {
  compressor: Tone.Compressor;
  limiter: Tone.Limiter;
  analyser: Tone.Analyser;
  delay: Tone.FeedbackDelay;
  reverb: Tone.Reverb;
  delayFilter: Tone.Filter;
  reverbFilter: Tone.Filter;
  delayBus: Tone.Gain;
  reverbBus: Tone.Gain;
  spectralDelayBus: Tone.Gain;
  freezeBus: Tone.Gain;
  reverseBus: Tone.Gain;
}

interface UseAudioEngineProps {
  synthsRef: React.MutableRefObject<Record<string, any>>;
  masterBusRef: React.MutableRefObject<MasterBusType | null>;
  loopRef: React.MutableRefObject<Tone.Loop | null>;
  lorenzRafRef: React.MutableRefObject<number>;
  tracks: TrackState[];
  tracksRef: React.MutableRefObject<TrackState[]>;
  bpm: number;
  delayMix: number;
  delayFeedback: number;
  reverbMix: number;
}

export function useAudioEngine(props: UseAudioEngineProps) {
  const {
    synthsRef, masterBusRef, loopRef, lorenzRafRef,
    tracks, tracksRef,
    bpm, delayMix, delayFeedback, reverbMix,
  } = props;

  // ═══ FX State ═══
  const [spectralDelayEnabled, setSpectralDelayEnabled] = useState(false);
  const [spectralDelayWet, setSpectralDelayWet] = useState(0.5);
  const [spectralDelayLowTime, setSpectralDelayLowTime] = useState(0);
  const [spectralDelayMidTime, setSpectralDelayMidTime] = useState(80);
  const [spectralDelayHighTime, setSpectralDelayHighTime] = useState(160);
  const [spectralDelayLowFreq, setSpectralDelayLowFreq] = useState(200);
  const [spectralDelayHighFreq, setSpectralDelayHighFreq] = useState(4000);

  const [freezeEnabled, setFreezeEnabled] = useState(false);
  const [freezeFeedback, setFreezeFeedback] = useState(0.95);
  const [freezeFilterFreq, setFreezeFilterFreq] = useState(6000);

  const [reverseEnabled, setReverseEnabled] = useState(false);
  const [reverseDecay, setReverseDecay] = useState(2.5);

  const [gatedEnabled, setGatedEnabled] = useState(false);
  const [gatedThreshold, setGatedThreshold] = useState(-40);

  const [crossfeedEnabled, setCrossfeedEnabled] = useState(false);
  const [crossfeedDepth, setCrossfeedDepth] = useState(2000);
  const [crossfeedBase, setCrossfeedBase] = useState(400);

  const [globalAnalyser, setGlobalAnalyser] = useState<Tone.Analyser | null>(null);
  const [fxHighPass, setFxHighPass] = useState(20);
  const [fxLowPass, setFxLowPass] = useState(20000);

  // ═══ Refs ═══
  const cloudAnalyserRef = useRef<Tone.Analyser | null>(null);
  const toneFilterRef = useRef<Tone.Filter | null>(null);
  const lorenzAttractorsRef = useRef<Record<string, LorenzAttractor>>({});

  const freezeRef = useRef<{ bus: Tone.Gain; delay: Tone.Delay; filter: Tone.Filter; feedbackGain: Tone.Gain; out: Tone.Gain } | null>(null);
  const reverseRef = useRef<{ bus: Tone.Gain; convolver: Tone.Convolver; out: Tone.Gain } | null>(null);
  const gatedRef = useRef<{ gate: Tone.Gate; out: Tone.Gain; reverbNormalOut: Tone.Gain } | null>(null);
  const spectralDelayRef = useRef<{
    bus: Tone.Gain; out: Tone.Gain;
    lowFilter: Tone.Filter; midFilter: Tone.Filter; highFilter: Tone.Filter;
    lowDelay: Tone.Delay; midDelay: Tone.Delay; highDelay: Tone.Delay;
  } | null>(null);

  const crossfeedEnabledRef = useRef(false);
  const crossfeedBaseRef = useRef(400);
  const crossfeedDepthRef = useRef(2000);

  // ═══════════════════════════════════════════════════════════
  //  Init useEffect — Master Bus + 5 Synths + Global FX Buses
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    // Master Bus Setup
    const compressor = new Tone.Compressor({
      threshold: -12, ratio: 2, attack: 0.003, release: 0.25
    });
    const limiter = new Tone.Limiter(-0.3);
    const analyser = new Tone.Analyser("fft", 1024);

    // Global FX Buses
    const delayBus = new Tone.Gain(1);
    const reverbBus = new Tone.Gain(1);

    // Global FX Filters
    const delayFilter = new Tone.Filter(20000, "lowpass");
    const reverbFilter = new Tone.Filter(20, "highpass");

    const delay = new Tone.FeedbackDelay("8n", 0.3);
    delay.wet.value = 1;
    const reverb = new Tone.Reverb(2.5);
    reverb.wet.value = 1;
    reverb.generate();

    // Routing
    delayBus.chain(delay, delayFilter, compressor);
    const reverbNormalOut = new Tone.Gain(1);
    reverbBus.connect(reverb);
    reverb.connect(reverbFilter);
    reverbFilter.connect(reverbNormalOut);
    reverbNormalOut.connect(compressor);

    // ---- GATED REVERB BUS (Phase 9) ----
    const gatedOut = new Tone.Gain(0);
    const gate = new Tone.Gate({ threshold: -40, smoothing: 0.01 });
    reverb.connect(gate);
    gate.connect(gatedOut);
    gatedOut.connect(compressor);
    gatedRef.current = { gate, out: gatedOut, reverbNormalOut };

    // ---- FREEZE BUS (Phase 9) ----
    const freezeBus = new Tone.Gain(1);
    const freezeDelay = new Tone.Delay(0.08);
    const freezeFilter = new Tone.Filter(6000, 'lowpass');
    const freezeFeedbackGain = new Tone.Gain(0.95);
    const freezeOut = new Tone.Gain(0);
    freezeBus.connect(freezeDelay);
    freezeDelay.connect(freezeFilter);
    freezeFilter.connect(freezeOut);
    freezeFilter.connect(freezeFeedbackGain);
    freezeFeedbackGain.connect(freezeDelay);
    freezeOut.connect(compressor);
    freezeRef.current = { bus: freezeBus, delay: freezeDelay, filter: freezeFilter, feedbackGain: freezeFeedbackGain, out: freezeOut };

    // ---- REVERSE REVERB BUS (Phase 9) ----
    const reverseBus = new Tone.Gain(1);
    const reverseIR = generateReverseIR(Tone.getContext().rawContext as BaseAudioContext, 2.5);
    const reverseConvolver = new Tone.Convolver(reverseIR);
    const reverseOut = new Tone.Gain(0);
    reverseBus.connect(reverseConvolver);
    reverseConvolver.connect(reverseOut);
    reverseOut.connect(compressor);
    reverseRef.current = { bus: reverseBus, convolver: reverseConvolver, out: reverseOut };

    // Spectral Delay Bus (Phase 7C)
    const spectralDelayBus = new Tone.Gain(1);
    const spectralDelayOut = new Tone.Gain(0);
    const sdLowFilter = new Tone.Filter(200, 'lowpass');
    const sdLowDelay = new Tone.Delay(0);
    sdLowFilter.connect(sdLowDelay);
    sdLowDelay.connect(spectralDelayOut);
    const sdMidFilter = new Tone.Filter(Math.sqrt(200 * 4000), 'bandpass');
    sdMidFilter.Q.value = 0.5;
    const sdMidDelay = new Tone.Delay(0.08);
    sdMidFilter.connect(sdMidDelay);
    sdMidDelay.connect(spectralDelayOut);
    const sdHighFilter = new Tone.Filter(4000, 'highpass');
    const sdHighDelay = new Tone.Delay(0.16);
    sdHighFilter.connect(sdHighDelay);
    sdHighDelay.connect(spectralDelayOut);
    spectralDelayBus.connect(sdLowFilter);
    spectralDelayBus.connect(sdMidFilter);
    spectralDelayBus.connect(sdHighFilter);
    spectralDelayOut.connect(compressor);
    spectralDelayRef.current = {
      bus: spectralDelayBus, out: spectralDelayOut,
      lowFilter: sdLowFilter, midFilter: sdMidFilter, highFilter: sdHighFilter,
      lowDelay: sdLowDelay, midDelay: sdMidDelay, highDelay: sdHighDelay,
    };

    compressor.chain(limiter, analyser, Tone.getDestination());
    masterBusRef.current = { compressor, limiter, analyser, delay, reverb, delayFilter, reverbFilter, delayBus, reverbBus, spectralDelayBus, freezeBus, reverseBus };
    setGlobalAnalyser(analyser);

    // Sidechain Setup (Kick -> Cloud)
    const kickFollower = new Tone.Follower(0.1);
    const sidechainInverter = new Tone.Gain(-0.8);
    const sidechainBias = new Tone.Signal(1);

    // ── Kick routing via factory ──
    const kickRouting = createTrackRouting({
      filterFreq: 2000, filterType: 'lowpass',
      compressor, delayBus, reverbBus, spectralDelayBus, freezeBus, reverseBus,
    });
    const kickFilter = kickRouting.filter;
    kickRouting.eqLpf.connect(kickFollower);
    kickFollower.connect(sidechainInverter);

    let kickBody = new Tone.MembraneSynth({
      pitchDecay: 0.05, octaves: 10, oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 },
      volume: -2
    }).connect(kickFilter);

    let kickClick = new Tone.NoiseSynth({
      noise: { type: 'pink' as any },
      envelope: { attack: 0.001, decay: 0.01, sustain: 0 },
      volume: -10
    }).connect(kickFilter);

    synthsRef.current.kick = {
      triggerAttackRelease: (note: string, duration: string, time: number, velocity: number) => {
        kickBody.triggerAttackRelease("C1", duration, time, velocity);
        kickClick.triggerAttackRelease(duration, time, velocity * 0.5);
        const baseCutoff = 800;
        const dynamicCutoff = baseCutoff + (velocity * 3000);
        if (isFinite(dynamicCutoff)) {
          kickFilter.frequency.rampTo(dynamicCutoff, 0.02, time);
        }
      },
      setVolume: (vol: number) => {
        const db = Tone.gainToDb(vol);
        kickBody.volume.rampTo(db - 2, 0.05);
        kickClick.volume.rampTo(db - 10, 0.05);
      },
      setSends: (delayVal: number, reverbVal: number) => {
        kickRouting.delaySend.gain.rampTo(delayVal, 0.05);
        kickRouting.reverbSend.gain.rampTo(reverbVal, 0.05);
      },
      dispose: () => {
        kickBody.dispose();
        kickClick.dispose();
        kickRouting.dispose();
      }
    };
    injectCommonMethods(synthsRef.current.kick, kickRouting, 800, createNestedLfo);
    synthsRef.current.kick.setKickParams = (pitchDecay: number, octaves: number, decay: number, clickType: string) => {
      kickBody.set({ pitchDecay, octaves, envelope: { decay } });
      const currentType = (kickClick as any).noise?.type || 'pink';
      if (clickType !== currentType) {
        kickClick.dispose();
        kickClick = new Tone.NoiseSynth({
          noise: { type: clickType as any },
          envelope: { attack: 0.001, decay: 0.01, sustain: 0 },
          volume: -10
        }).connect(kickFilter);
      }
    };

    // ── Snare routing via factory ──
    const snareRouting = createTrackRouting({
      filterFreq: 5000, filterType: 'lowpass',
      compressor, delayBus, reverbBus, spectralDelayBus, freezeBus, reverseBus,
    });
    const snareFilter = snareRouting.filter;

    let snareSynth = new Tone.NoiseSynth({
      noise: { type: 'white' as any },
      envelope: { attack: 0.001, decay: 0.2, sustain: 0 },
      volume: -4
    }).connect(snareFilter);
    let snareBody: Tone.MembraneSynth | null = null;

    synthsRef.current.snare = {
      triggerAttackRelease: (duration: string, time: number, velocity: number) => {
        snareSynth.triggerAttackRelease(duration, time, velocity);
        if (snareBody) {
          try { snareBody.triggerAttackRelease("C2", duration, time, velocity * 0.6); } catch(e) {}
        }
        const baseCutoff = 1500;
        const dynamicCutoff = baseCutoff + (velocity * 5000);
        if (isFinite(dynamicCutoff)) {
          snareFilter.frequency.rampTo(dynamicCutoff, 0.02, time);
        }
      },
      setVolume: (vol: number) => {
        snareSynth.volume.rampTo(Tone.gainToDb(vol) - 4, 0.05);
        if (snareBody) snareBody.volume.rampTo(Tone.gainToDb(vol) - 6, 0.05);
      },
      setSends: (delayVal: number, reverbVal: number) => {
        snareRouting.delaySend.gain.rampTo(delayVal, 0.05);
        snareRouting.reverbSend.gain.rampTo(reverbVal, 0.05);
      },
      dispose: () => {
        snareSynth.dispose();
        snareBody?.dispose();
        snareRouting.dispose();
      }
    };
    injectCommonMethods(synthsRef.current.snare, snareRouting, 1500, createNestedLfo);
    synthsRef.current.snare.setSnareParams = (decay: number, noiseType: string) => {
      snareSynth.envelope.decay = decay;
      const currentType = (snareSynth as any).noise?.type || 'white';
      if (noiseType !== currentType) {
        snareSynth.dispose();
        snareSynth = new Tone.NoiseSynth({
          noise: { type: noiseType as any },
          envelope: { attack: 0.001, decay, sustain: 0 },
          volume: -4
        }).connect(snareFilter);
      }
    };
    synthsRef.current.snare.setSnareBody = (enabled: boolean, pitch: number, bodyDecay: number) => {
      if (enabled && !snareBody) {
        snareBody = new Tone.MembraneSynth({
          pitchDecay: 0.08, octaves: 4, oscillator: { type: 'sine' },
          envelope: { attack: 0.001, decay: bodyDecay, sustain: 0.01, release: 0.5 },
          volume: -6
        }).connect(snareFilter);
        snareBody.frequency.value = pitch;
      } else if (!enabled && snareBody) {
        snareBody.dispose();
        snareBody = null;
      } else if (enabled && snareBody) {
        snareBody.frequency.value = pitch;
        snareBody.set({ envelope: { decay: bodyDecay } });
      }
    };

    // ── Hat routing via factory ──
    const hatRouting = createTrackRouting({
      filterFreq: 5000, filterType: 'highpass',
      compressor, delayBus, reverbBus, spectralDelayBus, freezeBus, reverseBus,
    });
    const hatFilter = hatRouting.filter;

    let hatSynth: Tone.NoiseSynth | null = new Tone.NoiseSynth({
      noise: { type: 'white' as any },
      envelope: { attack: 0.001, decay: 0.05, sustain: 0 },
      volume: -2
    }).connect(hatFilter);
    let hatMetalSynth: Tone.MetalSynth | null = null;
    let currentHatMode = 'noise';

    synthsRef.current.hat = {
      triggerAttackRelease: (duration: string, time: number, velocity: number) => {
        if (currentHatMode === 'metal' && hatMetalSynth) {
          const trackState = tracksRef.current.find(t => t.id === 'hat');
          const decay = trackState?.hatDecay ?? 0.05;
          hatMetalSynth.triggerAttackRelease(200, decay, time, velocity);
        } else if (hatSynth) {
          hatSynth.triggerAttackRelease(duration, time, velocity);
        }
        const baseCutoff = 2000;
        const dynamicCutoff = baseCutoff + (velocity * 8000);
        if (isFinite(dynamicCutoff)) {
          hatFilter.frequency.rampTo(dynamicCutoff, 0.02, time);
        }
      },
      setVolume: (vol: number) => {
        const db = Tone.gainToDb(vol) - 2;
        if (hatSynth) hatSynth.volume.rampTo(db, 0.05);
        if (hatMetalSynth) hatMetalSynth.volume.rampTo(db, 0.05);
      },
      setSends: (delayVal: number, reverbVal: number) => {
        hatRouting.delaySend.gain.rampTo(delayVal, 0.05);
        hatRouting.reverbSend.gain.rampTo(reverbVal, 0.05);
      },
      dispose: () => {
        hatSynth?.dispose();
        hatMetalSynth?.dispose();
        hatRouting.dispose();
      }
    };
    injectCommonMethods(synthsRef.current.hat, hatRouting, 2000, createNestedLfo);
    synthsRef.current.hat.setHatMode = (mode: string, harmonicity: number, modIndex: number, resonance: number, decay: number, noiseType: string) => {
      if (mode === 'metal' && currentHatMode !== 'metal') {
        hatSynth?.dispose();
        hatSynth = null;
        hatMetalSynth = new Tone.MetalSynth({
          harmonicity, modulationIndex: modIndex, resonance,
          envelope: { attack: 0.001, decay, release: 0.1 },
          volume: -2
        }).connect(hatFilter);
        currentHatMode = 'metal';
      } else if (mode === 'noise' && currentHatMode !== 'noise') {
        hatMetalSynth?.dispose();
        hatMetalSynth = null;
        hatSynth = new Tone.NoiseSynth({
          noise: { type: noiseType as any },
          envelope: { attack: 0.001, decay, sustain: 0 },
          volume: -2
        }).connect(hatFilter);
        currentHatMode = 'noise';
      } else if (mode === 'metal' && hatMetalSynth) {
        hatMetalSynth.set({ harmonicity, modulationIndex: modIndex, resonance, envelope: { decay } });
      } else if (mode === 'noise' && hatSynth) {
        hatSynth.envelope.decay = decay;
        const curType = (hatSynth as any).noise?.type || 'white';
        if (noiseType !== curType) {
          hatSynth.dispose();
          hatSynth = new Tone.NoiseSynth({
            noise: { type: noiseType as any },
            envelope: { attack: 0.001, decay, sustain: 0 },
            volume: -2
          }).connect(hatFilter);
        }
      }
    };

    // ── Cloud routing via factory ──
    const cloudRouting = createTrackRouting({
      filterFreq: 1000, filterType: 'lowpass',
      compressor, delayBus, reverbBus, spectralDelayBus, freezeBus, reverseBus,
    });
    const cloudFilter = cloudRouting.filter;

    // Cloud Analyser for Envelope Crossfeed (Phase 7E)
    const cloudAnalyser = new Tone.Analyser('waveform', 256);
    cloudFilter.connect(cloudAnalyser);
    cloudAnalyserRef.current = cloudAnalyser;

    // Preserve existing grainPlayer/bitCrusher before overwriting synthsRef
    const existingCloudGrainPlayer = synthsRef.current.cloud?.grainPlayer ?? null;
    const existingCloudBitCrusher = synthsRef.current.cloud?.bitCrusher ?? null;
    const existingCloudEnoPlayers = synthsRef.current.cloud?.enoPlayers ?? null;
    const existingCloudEnoMaster = synthsRef.current.cloud?.enoMaster ?? null;
    const existingCloudStartEno = synthsRef.current.cloud?.startEno ?? null;
    const existingCloudStopEno = synthsRef.current.cloud?.stopEno ?? null;

    // Cloud-specific pre-filter nodes: ducker + LFO
    const cloudDucker = new Tone.Gain(1).connect(cloudFilter);
    const cloudLFO = new Tone.LFO({
      frequency: 0.13, min: 200, max: 2000
    }).connect(cloudFilter.frequency).start();

    // Reconnect existing grainPlayer/bitCrusher to the new ducker
    if (existingCloudBitCrusher) {
      try {
        existingCloudBitCrusher.disconnect();
        existingCloudBitCrusher.connect(cloudDucker);
        existingCloudBitCrusher.connect(cloudRouting.delaySend);
        existingCloudBitCrusher.connect(cloudRouting.reverbSend);
      } catch { }
    }
    if (existingCloudEnoMaster) {
      try {
        existingCloudEnoMaster.disconnect();
        existingCloudEnoMaster.connect(cloudDucker);
      } catch { }
    }

    synthsRef.current.cloud = {
      filter: cloudFilter,
      ducker: cloudDucker,
      lfo: cloudLFO,
      sidechainInverter,
      sidechainBias,
      grainPlayer: existingCloudGrainPlayer,
      bitCrusher: existingCloudBitCrusher,
      enoPlayers: existingCloudEnoPlayers,
      enoMaster: existingCloudEnoMaster,
      startEno: existingCloudStartEno,
      stopEno: existingCloudStopEno,
      setVolume: (vol: number) => {
        if (synthsRef.current.cloud.grainPlayer) {
          synthsRef.current.cloud.grainPlayer.volume.rampTo(Tone.gainToDb(vol), 0.05);
        }
      },
      setSends: (delayVal: number, reverbVal: number) => {
        cloudRouting.delaySend.gain.rampTo(delayVal, 0.05);
        cloudRouting.reverbSend.gain.rampTo(reverbVal, 0.05);
      },
      disposeSampler: () => {
        if (synthsRef.current.cloud.grainPlayer) { try { synthsRef.current.cloud.grainPlayer.dispose(); } catch { } synthsRef.current.cloud.grainPlayer = null; }
        if (synthsRef.current.cloud.bitCrusher) { try { synthsRef.current.cloud.bitCrusher.dispose(); } catch { } synthsRef.current.cloud.bitCrusher = null; }
        if (synthsRef.current.cloud.enoMaster) { try { synthsRef.current.cloud.enoMaster.dispose(); } catch { } synthsRef.current.cloud.enoMaster = null; }
        synthsRef.current.cloud.enoPlayers = null;
        synthsRef.current.cloud.startEno = null;
        synthsRef.current.cloud.stopEno = null;
      },
      dispose: () => {
        synthsRef.current.cloud?.disposeSampler?.();
        cloudAnalyser.dispose();
        cloudLFO.dispose();
        cloudDucker.dispose();
        cloudRouting.dispose();
      }
    };
    injectCommonMethods(synthsRef.current.cloud, cloudRouting, 200, createNestedLfo);

    // Connect sidechain math to ducker gain
    sidechainInverter.connect(cloudDucker.gain);
    sidechainBias.connect(cloudDucker.gain);

    // ── Tone routing via factory ──
    const toneRouting = createTrackRouting({
      filterFreq: 2000, filterType: 'lowpass',
      compressor, delayBus, reverbBus, spectralDelayBus, freezeBus, reverseBus,
      delaySendInit: 0.15, reverbSendInit: 0.2,
    });
    const toneFilter = toneRouting.filter;
    toneFilterRef.current = toneFilter;

    const toneMonoSynth = new Tone.MonoSynth({
      oscillator: { type: 'sawtooth' },
      filter: { Q: 6, type: 'lowpass', rolloff: -24 },
      envelope: { attack: 0.005, decay: 0.3, sustain: 0.4, release: 0.8 },
      filterEnvelope: { attack: 0.06, decay: 0.2, sustain: 0.5, release: 0.8, baseFrequency: 200, octaves: 4 },
      volume: -6
    }).connect(toneFilter);

    synthsRef.current.tone = {
      triggerAttackRelease: (note: string, duration: any, time: number, velocity: number) => {
        toneMonoSynth.triggerAttackRelease(note, duration, time, velocity);
        const baseCutoff = 600;
        const dynamicCutoff = baseCutoff + (velocity * 4000);
        if (isFinite(dynamicCutoff)) {
          toneFilter.frequency.rampTo(dynamicCutoff, 0.02, time);
        }
      },
      setVolume: (vol: number) => {
        toneMonoSynth.volume.rampTo(Tone.gainToDb(vol) - 6, 0.05);
      },
      setSends: (delayVal: number, reverbVal: number) => {
        toneRouting.delaySend.gain.rampTo(delayVal, 0.05);
        toneRouting.reverbSend.gain.rampTo(reverbVal, 0.05);
      },
      dispose: () => {
        toneMonoSynth.dispose();
        toneRouting.dispose();
      }
    };
    injectCommonMethods(synthsRef.current.tone, toneRouting, 600, createNestedLfo);
    synthsRef.current.tone.setCrossfeedFreq = (hz: number) => {
      toneFilter.frequency.rampTo(hz, 0.05);
    };

    synthsRef.current.kickFollower = kickFollower;

    return () => {
      ['kick', 'snare', 'hat', 'tone', 'cloud'].forEach(id => {
        synthsRef.current[id]?.disposeNestedLfo?.();
      });
      if (lorenzRafRef.current) cancelAnimationFrame(lorenzRafRef.current);
      Object.values(synthsRef.current).forEach((s: any) => s.dispose());
      loopRef.current?.dispose();
      if (masterBusRef.current) {
        masterBusRef.current.compressor.dispose();
        masterBusRef.current.limiter.dispose();
        masterBusRef.current.analyser.dispose();
        masterBusRef.current.delay.dispose();
        masterBusRef.current.reverb.dispose();
      }
      if (synthsRef.current.kickFollower) synthsRef.current.kickFollower.dispose();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ═══════════════════════════════════════════════════════════
  //  initializeOriginalSynth — rebuilds a single track's synth
  // ═══════════════════════════════════════════════════════════
  const initializeOriginalSynth = (trackId: string, overrideSynthType?: string) => {
    const master = masterBusRef.current!;

    if (trackId === 'kick') {
      const routing = createTrackRouting({
        filterFreq: 2000, filterType: 'lowpass',
        compressor: master.compressor, delayBus: master.delayBus, reverbBus: master.reverbBus,
        spectralDelayBus: master.spectralDelayBus, freezeBus: master.freezeBus, reverseBus: master.reverseBus,
      });
      if (synthsRef.current.kickFollower) routing.eqLpf.connect(synthsRef.current.kickFollower);

      let kickBody = new Tone.MembraneSynth({
        pitchDecay: 0.05, octaves: 10, oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 }, volume: -2
      }).connect(routing.filter);
      let kickClick = new Tone.NoiseSynth({
        noise: { type: 'pink' as any },
        envelope: { attack: 0.001, decay: 0.01, sustain: 0 }, volume: -10
      }).connect(routing.filter);

      synthsRef.current.kick = {
        triggerAttackRelease: (note: string, duration: any, time: number, velocity: number) => {
          kickBody.triggerAttackRelease("C1", duration, time, velocity);
          kickClick.triggerAttackRelease(duration, time, velocity * 0.5);
          const dc = 800 + (velocity * 3000);
          if (isFinite(dc)) routing.filter.frequency.rampTo(dc, 0.02, time);
        },
        setVolume: (vol: number) => { const db = Tone.gainToDb(vol); kickBody.volume.rampTo(db - 2, 0.05); kickClick.volume.rampTo(db - 10, 0.05); },
        setSends: (d: number, r: number) => { routing.delaySend.gain.rampTo(d, 0.05); routing.reverbSend.gain.rampTo(r, 0.05); },
        dispose: () => { kickBody.dispose(); kickClick.dispose(); routing.dispose(); }
      };
      synthsRef.current.kick.setKickParams = (pitchDecay: number, octaves: number, decay: number, clickType: string) => {
        kickBody.set({ pitchDecay, octaves, envelope: { decay } });
        const currentType = (kickClick as any).noise?.type || 'pink';
        if (clickType !== currentType) {
          kickClick.dispose();
          kickClick = new Tone.NoiseSynth({ noise: { type: clickType as any }, envelope: { attack: 0.001, decay: 0.01, sustain: 0 }, volume: -10 }).connect(routing.filter);
        }
      };
      injectCommonMethods(synthsRef.current.kick, routing, 800, createNestedLfo);

    } else if (trackId === 'snare') {
      const routing = createTrackRouting({
        filterFreq: 5000, filterType: 'lowpass',
        compressor: master.compressor, delayBus: master.delayBus, reverbBus: master.reverbBus,
        spectralDelayBus: master.spectralDelayBus, freezeBus: master.freezeBus, reverseBus: master.reverseBus,
      });
      let snareSynth = new Tone.NoiseSynth({
        noise: { type: 'white' as any }, envelope: { attack: 0.001, decay: 0.2, sustain: 0 }, volume: -4
      }).connect(routing.filter);
      let snareBody: Tone.MembraneSynth | null = null;

      synthsRef.current.snare = {
        triggerAttackRelease: (duration: any, time: number, velocity: number) => {
          snareSynth.triggerAttackRelease(duration, time, velocity);
          if (snareBody) { try { snareBody.triggerAttackRelease("C2", duration, time, velocity * 0.6); } catch(e) {} }
          const dc = 1500 + (velocity * 5000);
          if (isFinite(dc)) routing.filter.frequency.rampTo(dc, 0.02, time);
        },
        setVolume: (vol: number) => { snareSynth.volume.rampTo(Tone.gainToDb(vol) - 4, 0.05); if (snareBody) snareBody.volume.rampTo(Tone.gainToDb(vol) - 6, 0.05); },
        setSends: (d: number, r: number) => { routing.delaySend.gain.rampTo(d, 0.05); routing.reverbSend.gain.rampTo(r, 0.05); },
        dispose: () => { snareSynth.dispose(); snareBody?.dispose(); routing.dispose(); }
      };
      synthsRef.current.snare.setSnareParams = (decay: number, noiseType: string) => {
        snareSynth.envelope.decay = decay;
        const currentType = (snareSynth as any).noise?.type || 'white';
        if (noiseType !== currentType) {
          snareSynth.dispose();
          snareSynth = new Tone.NoiseSynth({ noise: { type: noiseType as any }, envelope: { attack: 0.001, decay, sustain: 0 }, volume: -4 }).connect(routing.filter);
        }
      };
      synthsRef.current.snare.setSnareBody = (enabled: boolean, pitch: number, bodyDecay: number) => {
        if (enabled && !snareBody) {
          snareBody = new Tone.MembraneSynth({ pitchDecay: 0.08, octaves: 4, oscillator: { type: 'sine' }, envelope: { attack: 0.001, decay: bodyDecay, sustain: 0.01, release: 0.5 }, volume: -6 }).connect(routing.filter);
          snareBody.frequency.value = pitch;
        } else if (!enabled && snareBody) { snareBody.dispose(); snareBody = null; }
        else if (enabled && snareBody) { snareBody.frequency.value = pitch; snareBody.set({ envelope: { decay: bodyDecay } }); }
      };
      injectCommonMethods(synthsRef.current.snare, routing, 1500, createNestedLfo);

    } else if (trackId === 'hat') {
      const routing = createTrackRouting({
        filterFreq: 5000, filterType: 'highpass',
        compressor: master.compressor, delayBus: master.delayBus, reverbBus: master.reverbBus,
        spectralDelayBus: master.spectralDelayBus, freezeBus: master.freezeBus, reverseBus: master.reverseBus,
      });
      let hatSynth: Tone.NoiseSynth | null = new Tone.NoiseSynth({ noise: { type: 'white' as any }, envelope: { attack: 0.001, decay: 0.05, sustain: 0 }, volume: -2 }).connect(routing.filter);
      let hatMetalSynth: Tone.MetalSynth | null = null;
      let currentHatMode = 'noise';

      synthsRef.current.hat = {
        triggerAttackRelease: (duration: any, time: number, velocity: number) => {
          if (currentHatMode === 'metal' && hatMetalSynth) {
            const trackState = tracksRef.current.find(t => t.id === 'hat');
            hatMetalSynth.triggerAttackRelease(200, trackState?.hatDecay ?? 0.05, time, velocity);
          } else if (hatSynth) { hatSynth.triggerAttackRelease(duration, time, velocity); }
          const dc = 2000 + (velocity * 8000);
          if (isFinite(dc)) routing.filter.frequency.rampTo(dc, 0.02, time);
        },
        setVolume: (vol: number) => { const db = Tone.gainToDb(vol) - 2; if (hatSynth) hatSynth.volume.rampTo(db, 0.05); if (hatMetalSynth) hatMetalSynth.volume.rampTo(db, 0.05); },
        setSends: (d: number, r: number) => { routing.delaySend.gain.rampTo(d, 0.05); routing.reverbSend.gain.rampTo(r, 0.05); },
        dispose: () => { hatSynth?.dispose(); hatMetalSynth?.dispose(); routing.dispose(); }
      };
      synthsRef.current.hat.setHatMode = (mode: string, harmonicity: number, modIndex: number, resonance: number, decay: number, noiseType: string) => {
        if (mode === 'metal' && currentHatMode !== 'metal') {
          hatSynth?.dispose(); hatSynth = null;
          hatMetalSynth = new Tone.MetalSynth({ harmonicity, modulationIndex: modIndex, resonance, envelope: { attack: 0.001, decay, release: 0.1 }, volume: -2 }).connect(routing.filter);
          currentHatMode = 'metal';
        } else if (mode === 'noise' && currentHatMode !== 'noise') {
          hatMetalSynth?.dispose(); hatMetalSynth = null;
          hatSynth = new Tone.NoiseSynth({ noise: { type: noiseType as any }, envelope: { attack: 0.001, decay, sustain: 0 }, volume: -2 }).connect(routing.filter);
          currentHatMode = 'noise';
        } else if (mode === 'metal' && hatMetalSynth) {
          hatMetalSynth.set({ harmonicity, modulationIndex: modIndex, resonance, envelope: { decay } });
        } else if (mode === 'noise' && hatSynth) {
          hatSynth.envelope.decay = decay;
          const curType = (hatSynth as any).noise?.type || 'white';
          if (noiseType !== curType) { hatSynth.dispose(); hatSynth = new Tone.NoiseSynth({ noise: { type: noiseType as any }, envelope: { attack: 0.001, decay, sustain: 0 }, volume: -2 }).connect(routing.filter); }
        }
      };
      injectCommonMethods(synthsRef.current.hat, routing, 2000, createNestedLfo);

    } else if (trackId === 'tone') {
      const routing = createTrackRouting({
        filterFreq: 2000, filterType: 'lowpass',
        compressor: master.compressor, delayBus: master.delayBus, reverbBus: master.reverbBus,
        spectralDelayBus: master.spectralDelayBus, freezeBus: master.freezeBus, reverseBus: master.reverseBus,
        delaySendInit: 0.15, reverbSendInit: 0.2,
      });
      toneFilterRef.current = routing.filter;

      const toneTrack = tracksRef.current.find(t => t.id === 'tone');
      const currentSynthType = overrideSynthType ?? toneTrack?.synthType ?? 'mono';
      const fmRatio = toneTrack?.fmRatio ?? 2;
      const fmIndex = toneTrack?.fmIndex ?? 10;
      const wfAmount = toneTrack?.wfAmount ?? 3;
      const wfSymmetry = toneTrack?.wfSymmetry ?? 0;
      const addPartials = toneTrack?.addPartials ?? 4;
      const addBrightness = toneTrack?.addBrightness ?? 0.5;
      let toneSynth: any;

      if (currentSynthType === 'fm') {
        toneSynth = new Tone.FMSynth({ harmonicity: fmRatio, modulationIndex: fmIndex, oscillator: { type: 'sawtooth' }, modulation: { type: 'square' }, envelope: { attack: 0.005, decay: 0.3, sustain: 0.4, release: 0.8 }, modulationEnvelope: { attack: 0.06, decay: 0.2, sustain: 0.5, release: 0.8 }, volume: -6 }).connect(routing.filter);
        synthsRef.current.tone = {
          triggerAttackRelease: (note: string, duration: any, time: number, velocity: number) => { toneSynth.triggerAttackRelease(note, duration, time, velocity); const dc = 600 + (velocity * 4000); if (isFinite(dc)) routing.filter.frequency.rampTo(dc, 0.02, time); },
          setVolume: (vol: number) => { toneSynth.volume.rampTo(Tone.gainToDb(vol) - 6, 0.05); },
          setSends: (d: number, r: number) => { routing.delaySend.gain.rampTo(d, 0.05); routing.reverbSend.gain.rampTo(r, 0.05); },
          updateFmParams: (ratio: number, index: number) => { (toneSynth as Tone.FMSynth).harmonicity.value = ratio; (toneSynth as Tone.FMSynth).modulationIndex.value = index; },
          dispose: () => { toneSynth.dispose(); routing.dispose(); }
        };
      } else if (currentSynthType === 'add') {
        const oscillators: Tone.Oscillator[] = [];
        const gains: Tone.Gain[] = [];
        const outputGain = new Tone.Gain(0.6).connect(routing.filter);
        let currentFreq = 220;
        let currentBrightness = addBrightness;
        const buildPartials = (freq: number, nPartials: number, brightness: number) => {
          oscillators.forEach(o => { try { o.stop(); o.dispose(); } catch(e) {} });
          gains.forEach(g => g.dispose()); oscillators.length = 0; gains.length = 0;
          for (let i = 1; i <= nPartials; i++) {
            const osc = new Tone.Oscillator({ type: 'sine', frequency: freq * i, volume: -60 });
            const gain = new Tone.Gain(0);
            gain.gain.value = (1/i) + ((1/nPartials) - (1/i)) * brightness;
            osc.connect(gain); gain.connect(outputGain); oscillators.push(osc); gains.push(gain);
          }
          currentBrightness = brightness;
        };
        buildPartials(currentFreq, addPartials, addBrightness);
        synthsRef.current.tone = {
          triggerAttackRelease: (note: string, duration: any, time: number, velocity: number) => {
            const freq = Tone.Frequency(note).toFrequency(); currentFreq = freq;
            const at = 0.01; const dt = typeof duration === 'number' ? duration : Tone.Time(duration).toSeconds();
            buildPartials(freq, oscillators.length || addPartials, currentBrightness);
            oscillators.forEach((osc, i) => { osc.frequency.setValueAtTime(freq * (i + 1), time); osc.start(time); });
            outputGain.gain.cancelScheduledValues(time); outputGain.gain.setValueAtTime(0, time);
            outputGain.gain.linearRampToValueAtTime(0.6 * velocity, time + at);
            outputGain.gain.exponentialRampToValueAtTime(0.001, time + at + dt);
            oscillators.forEach(osc => { try { osc.stop(time + at + dt + 0.05); } catch(e) {} });
            const dc = 600 + velocity * 4000; if (isFinite(dc)) routing.filter.frequency.rampTo(dc, 0.02, time);
          },
          setVolume: (vol: number) => { outputGain.gain.rampTo(vol * 0.6, 0.05); },
          setSends: (d: number, r: number) => { routing.delaySend.gain.rampTo(d, 0.05); routing.reverbSend.gain.rampTo(r, 0.05); },
          updateAddParams: (nPartials: number, brightness: number) => {
            currentBrightness = brightness;
            if (nPartials !== oscillators.length) { buildPartials(currentFreq, nPartials, brightness); }
            else { gains.forEach((g, i) => { g.gain.rampTo((1/(i+1)) + ((1/nPartials) - (1/(i+1))) * brightness, 0.05); }); }
          },
          dispose: () => { oscillators.forEach(o => { try { o.stop(); o.dispose(); } catch(e) {} }); gains.forEach(g => g.dispose()); outputGain.dispose(); routing.dispose(); }
        };
        if (toneTrack && synthsRef.current.tone) { synthsRef.current.tone.setVolume(toneTrack.volume); synthsRef.current.tone.setSends(toneTrack.delaySend, toneTrack.reverbSend); }
      } else if (currentSynthType === 'pad') {
        const voices = toneTrack?.padVoices ?? 5; const detuneAmount = toneTrack?.padDetune ?? 30; const atkTime = toneTrack?.padAttack ?? 0.3;
        const padOscs: Tone.Oscillator[] = []; const padGains: Tone.Gain[] = [];
        const padMaster = new Tone.Gain(1 / voices).connect(routing.filter);
        for (let i = 0; i < voices; i++) {
          const osc = new Tone.Oscillator({ type: 'sawtooth', frequency: 220, volume: -6 }); const g = new Tone.Gain(0);
          const spread = voices > 1 ? (i - (voices - 1) / 2) / ((voices - 1) / 2) : 0;
          osc.detune.value = spread * detuneAmount; osc.connect(g); g.connect(padMaster); osc.start(); padOscs.push(osc); padGains.push(g);
        }
        let curPadAtk = atkTime;
        synthsRef.current.tone = {
          triggerAttackRelease: (note: string, duration: any, time: number, velocity: number) => {
            const freq = Tone.Frequency(note).toFrequency(); const dur = typeof duration === 'number' ? duration : Tone.Time(duration).toSeconds();
            padOscs.forEach(o => o.frequency.setValueAtTime(freq, time));
            padGains.forEach(g => { g.gain.cancelScheduledValues(time); g.gain.setValueAtTime(0, time); g.gain.linearRampToValueAtTime(velocity, time + curPadAtk); g.gain.setValueAtTime(velocity, time + Math.max(dur - 0.05, curPadAtk)); g.gain.linearRampToValueAtTime(0, time + dur); });
            const dc = 600 + velocity * 4000; if (isFinite(dc)) routing.filter.frequency.rampTo(dc, 0.02, time);
          },
          setVolume: (vol: number) => { padMaster.gain.rampTo((1 / padOscs.length) * vol, 0.05); },
          setSends: (d: number, r: number) => { routing.delaySend.gain.rampTo(d, 0.05); routing.reverbSend.gain.rampTo(r, 0.05); },
          updatePadParams: (nv: number, nd: number, na: number) => { padOscs.forEach((o, i) => { const sp = padOscs.length > 1 ? (i - (padOscs.length - 1) / 2) / ((padOscs.length - 1) / 2) : 0; o.detune.rampTo(sp * nd, 0.05); }); curPadAtk = na; },
          dispose: () => { padOscs.forEach(o => { try { o.stop(); o.dispose(); } catch(e) {} }); padGains.forEach(g => g.dispose()); padMaster.dispose(); routing.dispose(); }
        };
      } else if (currentSynthType === 'drone') {
        const fb = toneTrack?.droneFeedback ?? 0.88; const ff = toneTrack?.droneFilterFreq ?? 2000;
        const droneOsc = new Tone.Oscillator({ type: 'sine', frequency: 220, volume: -6 });
        const injectGain = new Tone.Gain(0); const droneMasterGain = new Tone.Gain(0.7);
        const feedbackDelay = new Tone.FeedbackDelay({ delayTime: 0.5, feedback: fb, wet: 1 });
        const loopFilter = new Tone.Filter({ frequency: ff, type: 'lowpass', rolloff: -12 });
        const droneLimiter = new Tone.Limiter(-3);
        droneOsc.connect(injectGain); injectGain.connect(feedbackDelay); feedbackDelay.connect(loopFilter);
        loopFilter.connect(droneLimiter); droneLimiter.connect(droneMasterGain); droneMasterGain.connect(routing.filter); droneOsc.start();
        synthsRef.current.tone = {
          triggerAttackRelease: (note: string, _d: any, time: number, velocity: number) => {
            droneOsc.frequency.setValueAtTime(Tone.Frequency(note).toFrequency(), time);
            injectGain.gain.cancelScheduledValues(time); injectGain.gain.setValueAtTime(0, time);
            injectGain.gain.linearRampToValueAtTime(velocity, time + 0.01); injectGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
            const dc = 600 + velocity * 4000; if (isFinite(dc)) routing.filter.frequency.rampTo(dc, 0.02, time);
          },
          setVolume: (vol: number) => { droneMasterGain.gain.rampTo(vol * 0.7, 0.05); },
          setSends: (d: number, r: number) => { routing.delaySend.gain.rampTo(d, 0.05); routing.reverbSend.gain.rampTo(r, 0.05); },
          updateDroneParams: (nf: number, nff: number) => { feedbackDelay.feedback.rampTo(nf, 0.1); loopFilter.frequency.rampTo(nff, 0.1); },
          dispose: () => { droneOsc.stop(); droneOsc.dispose(); injectGain.dispose(); droneMasterGain.dispose(); feedbackDelay.dispose(); loopFilter.dispose(); droneLimiter.dispose(); routing.dispose(); }
        };
      } else if (currentSynthType === 'ks') {
        const ksDecayAmt = toneTrack?.ksDecay ?? 0.97; const ksBright = toneTrack?.ksBrightness ?? 5000;
        const ksMaster = new Tone.Gain(1).connect(routing.filter);
        const ksDelay = new Tone.Delay({ delayTime: 0.01, maxDelay: 0.05 });
        const ksFilter = new Tone.Filter({ frequency: ksBright, type: 'lowpass', rolloff: -12 });
        const ksLimiter = new Tone.Limiter(-3); const ksFb = new Tone.Gain(ksDecayAmt);
        ksDelay.connect(ksFilter); ksFilter.connect(ksLimiter); ksLimiter.connect(ksFb); ksFb.connect(ksDelay); ksFilter.connect(ksMaster);
        synthsRef.current.tone = {
          triggerAttackRelease: (note: string, _dur: string | number, time: number, velocity = 0.8) => {
            const freq = Tone.Frequency(note).toFrequency(); ksDelay.delayTime.setValueAtTime(1 / freq, time);
            const rawCtx = Tone.context.rawContext as AudioContext; const bsz = Math.ceil(rawCtx.sampleRate * 0.05);
            const nb = rawCtx.createBuffer(1, bsz, rawCtx.sampleRate); const data = nb.getChannelData(0);
            for (let i = 0; i < bsz; i++) data[i] = (Math.random() - 0.5) * 2 * velocity;
            const ns = rawCtx.createBufferSource(); ns.buffer = nb; ns.connect((ksDelay as any).input); ns.start(time); ns.stop(time + 0.05);
            const dc = 600 + velocity * 4000; if (isFinite(dc)) routing.filter.frequency.rampTo(dc, 0.02, time);
          },
          setVolume: (vol: number) => { ksMaster.gain.rampTo(Tone.dbToGain(vol) * 0.8, 0.05); },
          setSends: (d: number, r: number) => { routing.delaySend.gain.rampTo(d, 0.05); routing.reverbSend.gain.rampTo(r, 0.05); },
          updateKsParams: (nd: number, nb: number) => { ksFb.gain.rampTo(nd, 0.1); ksFilter.frequency.rampTo(nb, 0.1); },
          dispose: () => { ksDelay.dispose(); ksFilter.dispose(); ksLimiter.dispose(); ksFb.dispose(); ksMaster.dispose(); routing.dispose(); }
        };
      } else if (currentSynthType === 'modal') {
        const MODAL_BODIES = {
          bell: [{ ratio: 1, decay: 3, amp: 1 }, { ratio: 2.756, decay: 2, amp: 0.67 }, { ratio: 5.404, decay: 1.5, amp: 0.45 }, { ratio: 8.933, decay: 1, amp: 0.28 }],
          plate: [{ ratio: 1, decay: 2, amp: 1 }, { ratio: 1.414, decay: 1.5, amp: 0.8 }, { ratio: 2, decay: 1.2, amp: 0.6 }, { ratio: 2.449, decay: 0.8, amp: 0.4 }, { ratio: 3, decay: 0.5, amp: 0.25 }],
          string: [{ ratio: 1, decay: 2.5, amp: 1 }, { ratio: 2, decay: 2, amp: 0.5 }, { ratio: 3, decay: 1.5, amp: 0.33 }, { ratio: 4, decay: 1, amp: 0.25 }, { ratio: 5, decay: 0.8, amp: 0.2 }],
        } as const;
        const modalMaster = new Tone.Gain(1).connect(routing.filter);
        synthsRef.current.tone = {
          triggerAttackRelease: (note: string, _dur: string | number, time: number, velocity = 0.8) => {
            const freq = Tone.Frequency(note).toFrequency();
            const tm = tracksRef.current.find(t => t.id === 'tone');
            const bodyKey = (tm?.modalBody ?? 'bell') as keyof typeof MODAL_BODIES;
            const body = MODAL_BODIES[bodyKey] || MODAL_BODIES.bell;
            const dm = tm?.modalDecay ?? 1.0;
            body.forEach(mode => {
              const osc = new Tone.Oscillator({ type: 'sine' }); const env = new Tone.Gain(0);
              const td = mode.decay * dm;
              osc.frequency.value = freq * mode.ratio;
              env.gain.setValueAtTime(mode.amp * velocity, time);
              env.gain.exponentialRampToValueAtTime(0.0001, time + td);
              osc.connect(env); env.connect(modalMaster); osc.start(time); osc.stop(time + td + 0.1);
              setTimeout(() => { try { env.dispose(); } catch {} }, (td + 0.2) * 1000);
            });
            const dc = 600 + velocity * 4000; if (isFinite(dc)) routing.filter.frequency.rampTo(dc, 0.02, time);
          },
          setVolume: (vol: number) => { modalMaster.gain.rampTo(Tone.dbToGain(vol) * 0.8, 0.05); },
          setSends: (d: number, r: number) => { routing.delaySend.gain.rampTo(d, 0.05); routing.reverbSend.gain.rampTo(r, 0.05); },
          dispose: () => { modalMaster.dispose(); routing.dispose(); }
        };
      } else if (currentSynthType === 'ambient') {
        const BASE_DURATIONS = [2.3, 3.7, 5.1, 7.3]; const NL = BASE_DURATIONS.length;
        const ambMaster = new Tone.Gain(toneTrack?.ambientVolume ?? 0.6).connect(routing.filter);
        const ambOscs: Tone.Oscillator[] = []; const ambGains: Tone.Gain[] = [];
        const ambRepeatIds: number[] = []; let ambStarted = false;
        for (let i = 0; i < NL; i++) { const o = new Tone.Oscillator({ type: 'sine' }); const g = new Tone.Gain(0); o.connect(g); g.connect(ambMaster); o.start(); ambOscs.push(o); ambGains.push(g); }
        const assignFreqs = () => { const ct = tracksRef.current.find(t => t.id === 'tone'); if (!ct?.noteIndices?.length) return; for (let i = 0; i < NL; i++) { const ni = ct.noteIndices[Math.floor(Math.random() * ct.noteIndices.length)]; ambOscs[i].frequency.value = noteIndexToFreq(ct.rootNote, ct.scaleId, ni); } };
        const schedLoop = (li: number) => { const ct = tracksRef.current.find(t => t.id === 'tone'); const dur = BASE_DURATIONS[li] * (ct?.ambientSpeed ?? 1.0); const id = Tone.getTransport().scheduleRepeat((time) => { if (!ambStarted) return; ambGains[li].gain.cancelScheduledValues(time); ambGains[li].gain.setValueAtTime(0, time); ambGains[li].gain.linearRampToValueAtTime(0.7, time + 0.15); ambGains[li].gain.setValueAtTime(0.7, time + dur - 0.3); ambGains[li].gain.linearRampToValueAtTime(0, time + dur); }, dur, Tone.now() + li * 0.3); ambRepeatIds.push(id); };
        const stopLoops = () => { ambStarted = false; ambRepeatIds.forEach(id => Tone.getTransport().clear(id)); ambRepeatIds.length = 0; ambGains.forEach(g => { g.gain.cancelScheduledValues(Tone.now()); g.gain.rampTo(0, 0.1); }); };
        synthsRef.current.tone = {
          triggerAttackRelease: (_n: string, _d: string | number, _t: number, _v = 0.8) => { if (!ambStarted) { ambStarted = true; assignFreqs(); for (let i = 0; i < NL; i++) schedLoop(i); } else { assignFreqs(); } },
          setVolume: (vol: number) => { const safeVol = (typeof vol === 'number' && isFinite(vol)) ? vol : 0; ambMaster.gain.rampTo(Tone.dbToGain(safeVol) * 0.6, 0.05); },
          setSends: (d: number, r: number) => { routing.delaySend.gain.rampTo(d, 0.05); routing.reverbSend.gain.rampTo(r, 0.05); },
          stop: () => { stopLoops(); },
          dispose: () => { stopLoops(); ambOscs.forEach(o => { o.stop(); o.dispose(); }); ambGains.forEach(g => g.dispose()); ambMaster.dispose(); routing.dispose(); }
        };
      } else if (currentSynthType === 'wf') {
        const wfOsc = new Tone.Oscillator({ type: 'triangle', frequency: 220, volume: -6 });
        const waveFolder = new Tone.WaveShaper(buildWavefoldCurve(wfAmount, wfSymmetry), 65536);
        const preFoldGain = new Tone.Gain(1 + wfAmount * 0.3);
        const lpgFilter = new Tone.Filter({ type: 'lowpass', frequency: 200, Q: 3, rolloff: -24 });
        const lpgVca = new Tone.Gain(0);
        wfOsc.connect(preFoldGain); preFoldGain.connect(waveFolder); waveFolder.connect(lpgFilter); lpgFilter.connect(lpgVca); lpgVca.connect(routing.filter);
        synthsRef.current.tone = {
          triggerAttackRelease: (note: string, duration: any, time: number, velocity: number) => {
            wfOsc.frequency.setValueAtTime(Tone.Frequency(note).toFrequency(), time);
            const at = 0.005; const dt = typeof duration === 'number' ? duration * 1.2 : Tone.Time(duration).toSeconds() * 1.2;
            wfOsc.start(time); wfOsc.stop(time + at + dt + 0.05);
            lpgVca.gain.cancelScheduledValues(time); lpgVca.gain.setValueAtTime(0, time); lpgVca.gain.linearRampToValueAtTime(velocity, time + at); lpgVca.gain.exponentialRampToValueAtTime(0.001, time + at + dt);
            const fFreq = vactrolfiltFreq(velocity); lpgFilter.frequency.cancelScheduledValues(time); lpgFilter.frequency.setValueAtTime(200, time); lpgFilter.frequency.exponentialRampToValueAtTime(fFreq, time + at * 1.5); lpgFilter.frequency.exponentialRampToValueAtTime(200, time + at * 1.5 + dt * 1.3);
            const dc = 600 + velocity * 4000; if (isFinite(dc)) routing.filter.frequency.rampTo(dc, 0.02, time);
          },
          setVolume: (vol: number) => { wfOsc.volume.rampTo(Tone.gainToDb(vol) - 6, 0.05); },
          setSends: (d: number, r: number) => { routing.delaySend.gain.rampTo(d, 0.05); routing.reverbSend.gain.rampTo(r, 0.05); },
          updateWfParams: (a: number, s: number) => { waveFolder.curve = buildWavefoldCurve(a, s); preFoldGain.gain.rampTo(1 + a * 0.3, 0.05); },
          dispose: () => { wfOsc.stop().dispose(); waveFolder.dispose(); preFoldGain.dispose(); lpgFilter.dispose(); lpgVca.dispose(); routing.dispose(); }
        };
      } else {
        toneSynth = new Tone.MonoSynth({ oscillator: { type: 'sawtooth' }, filter: { Q: 6, type: 'lowpass', rolloff: -24 }, envelope: { attack: 0.005, decay: 0.3, sustain: 0.4, release: 0.8 }, filterEnvelope: { attack: 0.06, decay: 0.2, sustain: 0.5, release: 0.8, baseFrequency: 200, octaves: 4 }, volume: -6 }).connect(routing.filter);
        synthsRef.current.tone = {
          triggerAttackRelease: (note: string, duration: any, time: number, velocity: number) => { toneSynth.triggerAttackRelease(note, duration, time, velocity); const dc = 600 + (velocity * 4000); if (isFinite(dc)) routing.filter.frequency.rampTo(dc, 0.02, time); },
          setVolume: (vol: number) => { toneSynth.volume.rampTo(Tone.gainToDb(vol) - 6, 0.05); },
          setSends: (d: number, r: number) => { routing.delaySend.gain.rampTo(d, 0.05); routing.reverbSend.gain.rampTo(r, 0.05); },
          dispose: () => { toneSynth.dispose(); routing.dispose(); }
        };
      }

      // Audio-Rate Modulation — available for all tonal synth modes
      const arRate = toneTrack?.arRate ?? 80; const arDepth = toneTrack?.arDepth ?? 0;
      const arLFO = new Tone.Oscillator({ type: 'sine', frequency: arRate });
      const arGain = new Tone.Gain(arDepth);
      arLFO.connect(arGain); arGain.connect(routing.filter.frequency);
      let arRunning = arDepth > 0; if (arRunning) arLFO.start();
      const existingDispose = synthsRef.current.tone.dispose;
      synthsRef.current.tone.updateArParams = (rate: number, depth: number) => {
        arLFO.frequency.rampTo(rate, 0.05); arGain.gain.rampTo(depth, 0.05);
        if (depth > 0 && !arRunning) { arLFO.start(); arRunning = true; }
        if (depth === 0 && arRunning) { arLFO.stop(); arRunning = false; }
      };
      synthsRef.current.tone.dispose = () => { try { arLFO.stop(); arLFO.dispose(); } catch(e) {} arGain.dispose(); existingDispose(); };

      // Common methods + tone-specific
      injectCommonMethods(synthsRef.current.tone, routing, 600, createNestedLfo);
      synthsRef.current.tone.setCrossfeedFreq = (hz: number) => { routing.filter.frequency.rampTo(hz, 0.05); };
    }

    // Restore persisted state
    restoreTrackState(synthsRef, tracksRef, trackId);
  };

  // ═══════════════════════════════════════════════════════════
  //  startLorenzRaf — Lorenz attractor RAF loop
  // ═══════════════════════════════════════════════════════════
  const startLorenzRaf = useCallback(() => {
    if (lorenzRafRef.current) {
      cancelAnimationFrame(lorenzRafRef.current);
    }
    const tick = () => {
      const currentTracks = tracksRef.current;
      const anyActive = currentTracks.some(t => t.lorenzEnabled);
      if (!anyActive) {
        lorenzRafRef.current = 0;
        return;
      }
      currentTracks.forEach(t => {
        if (!t.lorenzEnabled) return;
        if (!lorenzAttractorsRef.current[t.id]) {
          lorenzAttractorsRef.current[t.id] = new LorenzAttractor();
        }
        const attractor = lorenzAttractorsRef.current[t.id];
        const speedMult = t.lorenzSpeed ?? 1.0;
        for (let i = 0; i < Math.ceil(speedMult * 2); i++) {
          attractor.step();
        }
        const normalizedValue = attractor.getNormalizedX();
        const depth = t.lorenzDepth ?? 1000;
        if (synthsRef.current[t.id]?.updateLorenz) {
          synthsRef.current[t.id].updateLorenz(
            normalizedValue,
            depth,
            t.lorenzTarget ?? 'filter'
          );
        }
      });
      lorenzRafRef.current = requestAnimationFrame(tick);
    };
    lorenzRafRef.current = requestAnimationFrame(tick);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ═══════════════════════════════════════════════════════════
  //  Sync Effects
  // ═══════════════════════════════════════════════════════════

  // Volume sync
  useEffect(() => {
    tracks.forEach(t => {
      const synth = synthsRef.current[t.id];
      if (synth && synth.setVolume) {
        synth.setVolume(t.volume);
      }
    });
  }, [tracks.map(t => `${t.id}:${t.volume}`).join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sends sync
  useEffect(() => {
    tracks.forEach(t => {
      const synth = synthsRef.current[t.id];
      if (synth && synth.setSends) {
        synth.setSends(t.delaySend, t.reverbSend);
      }
    });
  }, [tracks.map(t => `${t.id}:${t.delaySend}:${t.reverbSend}`).join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  // FX filter sync
  useEffect(() => {
    if (masterBusRef.current) {
      masterBusRef.current.reverbFilter.frequency.rampTo(fxHighPass, 0.05);
      masterBusRef.current.delayFilter.frequency.rampTo(fxLowPass, 0.05);
    }
  }, [fxHighPass, fxLowPass]); // eslint-disable-line react-hooks/exhaustive-deps

  // Spectral Delay bus real-time sync
  useEffect(() => {
    const sd = spectralDelayRef.current;
    if (!sd) return;
    sd.out.gain.rampTo(spectralDelayEnabled ? spectralDelayWet : 0, 0.1);
    sd.lowDelay.delayTime.rampTo(spectralDelayLowTime / 1000, 0.1);
    sd.midDelay.delayTime.rampTo(spectralDelayMidTime / 1000, 0.1);
    sd.highDelay.delayTime.rampTo(spectralDelayHighTime / 1000, 0.1);
    sd.lowFilter.frequency.rampTo(spectralDelayLowFreq, 0.1);
    sd.highFilter.frequency.rampTo(spectralDelayHighFreq, 0.1);
    sd.midFilter.frequency.rampTo(Math.sqrt(spectralDelayLowFreq * spectralDelayHighFreq), 0.1);
  }, [spectralDelayEnabled, spectralDelayWet, spectralDelayLowTime, spectralDelayMidTime, spectralDelayHighTime, spectralDelayLowFreq, spectralDelayHighFreq]);

  // Keep crossfeed refs in sync with state
  useEffect(() => { crossfeedEnabledRef.current = crossfeedEnabled; }, [crossfeedEnabled]);
  useEffect(() => { crossfeedBaseRef.current = crossfeedBase; }, [crossfeedBase]);
  useEffect(() => { crossfeedDepthRef.current = crossfeedDepth; }, [crossfeedDepth]);

  // Crossfeed interval: Cloud envelope → Tone filter (Phase 7E)
  useEffect(() => {
    if (!crossfeedEnabled) return;
    const interval = setInterval(() => {
      if (!crossfeedEnabledRef.current) return;
      const analyser = cloudAnalyserRef.current;
      if (!analyser) return;
      const waveform = analyser.getValue();
      if (!waveform || waveform.length === 0) return;
      const arr = waveform as Float32Array;
      const rms = Math.sqrt(arr.reduce((sum, v) => sum + v * v, 0) / arr.length);
      const normalizedRms = Math.min(rms / 0.3, 1.0);
      const targetFreq = Math.min(crossfeedBaseRef.current + normalizedRms * crossfeedDepthRef.current, 20000);
      synthsRef.current.tone?.setCrossfeedFreq?.(targetFreq);
    }, 100);
    return () => clearInterval(interval);
  }, [crossfeedEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // Freeze Reverb sync (Phase 9)
  useEffect(() => {
    const fr = freezeRef.current;
    if (!fr) return;
    fr.out.gain.rampTo(freezeEnabled ? 1 : 0, 0.1);
    fr.feedbackGain.gain.rampTo(freezeFeedback, 0.1);
    fr.filter.frequency.rampTo(freezeFilterFreq, 0.1);
  }, [freezeEnabled, freezeFeedback, freezeFilterFreq]);

  // Gated Reverb sync (Phase 9)
  useEffect(() => {
    const gr = gatedRef.current;
    if (!gr) return;
    gr.out.gain.rampTo(gatedEnabled ? 1 : 0, 0.05);
    gr.reverbNormalOut.gain.rampTo(gatedEnabled ? 0 : 1, 0.05);
    gr.gate.threshold = gatedThreshold;
  }, [gatedEnabled, gatedThreshold]);

  // Reverse Reverb sync (Phase 9)
  useEffect(() => {
    const rr = reverseRef.current;
    if (!rr) return;
    rr.out.gain.rampTo(reverseEnabled ? 1 : 0, 0.1);
    if (reverseEnabled) {
      const newIR = generateReverseIR(Tone.getContext().rawContext as BaseAudioContext, reverseDecay);
      const newConvolver = new Tone.Convolver(newIR);
      rr.bus.disconnect(rr.convolver);
      rr.convolver.dispose();
      rr.bus.connect(newConvolver);
      newConvolver.connect(rr.out);
      rr.convolver = newConvolver;
    }
  }, [reverseEnabled, reverseDecay]);

  // Delay mix/feedback sync
  useEffect(() => {
    if (masterBusRef.current) {
      masterBusRef.current.delay.feedback.value = delayFeedback;
      masterBusRef.current.delayBus.gain.rampTo(delayMix, 0.05);
    }
  }, [delayMix, delayFeedback]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reverb mix sync
  useEffect(() => {
    if (masterBusRef.current) {
      masterBusRef.current.reverbBus.gain.rampTo(reverbMix, 0.05);
    }
  }, [reverbMix]); // eslint-disable-line react-hooks/exhaustive-deps

  // Track params sync (volume, sends, grainPlayer, bitCrusher, XLP)
  useEffect(() => {
    tracks.forEach(track => {
      const synth = synthsRef.current[track.id];
      if (synth) {
        try {
          synth.setVolume(track.volume);
          synth.setSends(track.delaySend, track.reverbSend);
          if (synth.bitCrusher) {
            synth.bitCrusher.bits = track.bitCrush;
          }
          if (synth.grainPlayer) {
            synth.grainPlayer.grainSize = track.grainSize / 1000;
            synth.grainPlayer.overlap = track.overlap;
            synth.grainPlayer.detune = track.pitch * 100;
            const stretchRate = track.stretchEnabled ? (track.stretchRate ?? 1.0) : 1.0;
            synth.grainPlayer.playbackRate = stretchRate;
            // XLP sync
            if (track.extremeLoopEnabled && track.samplerBuffer) {
              synth.grainPlayer.loop = true;
              const loopPt = (track.extremeLoopPoint ?? 0.5) * track.samplerBuffer.duration;
              const loopSz = (track.extremeLoopSize ?? 10) / 1000;
              synth.grainPlayer.loopStart = loopPt;
              synth.grainPlayer.loopEnd = loopPt + loopSz;
              synth.grainPlayer.grainSize = loopSz;
            } else if (track.id !== 'cloud') {
              synth.grainPlayer.loop = false;
            }
          }
        } catch (e) {
          console.warn(`Failed to sync params for track ${track.id}:`, e);
        }
      }
    });
  }, [tracks]); // eslint-disable-line react-hooks/exhaustive-deps

  // BPM sync
  useEffect(() => { Tone.getTransport().bpm.value = bpm; }, [bpm]);

  // Sampler/GrainPlayer params sync
  useEffect(() => {
    tracks.forEach(track => {
      const synth = synthsRef.current[track.id];
      if (!synth) return;
      if (synth.grainPlayer) {
        synth.grainPlayer.grainSize = track.grainSize / 1000;
        synth.grainPlayer.overlap = track.overlap;
        synth.grainPlayer.detune = track.pitch * 100;
        const stretchRate = track.stretchEnabled ? (track.stretchRate ?? 1.0) : 1.0;
        synth.grainPlayer.playbackRate = stretchRate;
      }
      if (synth.bitCrusher) {
        synth.bitCrusher.bits.value = track.bitCrush;
      }
    });
  }, [tracks]); // eslint-disable-line react-hooks/exhaustive-deps

  // ═══════════════════════════════════════════════════════════
  //  Return
  // ═══════════════════════════════════════════════════════════
  return {
    cloudAnalyserRef, toneFilterRef, globalAnalyser,
    startLorenzRaf, initializeOriginalSynth,
    // FX state
    spectralDelayEnabled, setSpectralDelayEnabled,
    spectralDelayWet, setSpectralDelayWet,
    spectralDelayLowTime, setSpectralDelayLowTime,
    spectralDelayMidTime, setSpectralDelayMidTime,
    spectralDelayHighTime, setSpectralDelayHighTime,
    spectralDelayLowFreq, setSpectralDelayLowFreq,
    spectralDelayHighFreq, setSpectralDelayHighFreq,
    freezeEnabled, setFreezeEnabled,
    freezeFeedback, setFreezeFeedback,
    freezeFilterFreq, setFreezeFilterFreq,
    reverseEnabled, setReverseEnabled,
    reverseDecay, setReverseDecay,
    gatedEnabled, setGatedEnabled,
    gatedThreshold, setGatedThreshold,
    crossfeedEnabled, setCrossfeedEnabled,
    crossfeedDepth, setCrossfeedDepth,
    crossfeedBase, setCrossfeedBase,
    fxHighPass, setFxHighPass,
    fxLowPass, setFxLowPass,
  };
}
