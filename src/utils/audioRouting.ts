import * as Tone from 'tone';

// ═══════════════════════════════════════════════════════════
//  Audio Routing Factory — deduplicates the per-track
//  Filter → EQ → Panner → FreqShifter → Compressor + Sends
//  chain that was repeated 9× in the monolith.
// ═══════════════════════════════════════════════════════════

export interface TrackRoutingConfig {
  filterFreq: number;
  filterType: 'lowpass' | 'highpass' | 'bandpass';
  compressor: Tone.Compressor;
  delayBus: Tone.Gain;
  reverbBus: Tone.Gain;
  spectralDelayBus: Tone.Gain;
  freezeBus: Tone.Gain;
  reverseBus: Tone.Gain;
  delaySendInit?: number;
  reverbSendInit?: number;
}

export interface TrackRouting {
  filter: Tone.Filter;
  eqHpf: Tone.Filter;
  eqLpf: Tone.Filter;
  panner: Tone.Panner;
  panner3D: Tone.Panner3D;
  pannerGain: Tone.Gain;
  panner3DGain: Tone.Gain;
  freqShifter: Tone.FrequencyShifter;
  fsBypassGain: Tone.Gain;
  fsDirectGain: Tone.Gain;
  delaySend: Tone.Gain;
  reverbSend: Tone.Gain;
  spectralSend: Tone.Gain;
  freezeSend: Tone.Gain;
  reverseSend: Tone.Gain;
  dispose: () => void;
}

/**
 * Creates the full routing chain for a track:
 * Source → filter → eqHpf → eqLpf → [pannerGain→panner, panner3DGain→panner3D]
 *   → [fsBypassGain→freqShifter, fsDirectGain] → compressor + sends
 */
export function createTrackRouting(config: TrackRoutingConfig): TrackRouting {
  const { compressor, delayBus, reverbBus, spectralDelayBus, freezeBus, reverseBus } = config;

  // FX sends
  const delaySend = new Tone.Gain(config.delaySendInit ?? 0).connect(delayBus);
  const reverbSend = new Tone.Gain(config.reverbSendInit ?? 0).connect(reverbBus);
  const spectralSend = new Tone.Gain(0).connect(spectralDelayBus);
  const freezeSend = new Tone.Gain(0).connect(freezeBus);
  const reverseSend = new Tone.Gain(0).connect(reverseBus);

  // EQ
  const eqHpf = new Tone.Filter(20, 'highpass');
  const eqLpf = new Tone.Filter(20000, 'lowpass');

  // Panners (stereo + binaural 3D)
  const panner = new Tone.Panner(0);
  const panner3D = new Tone.Panner3D({ panningModel: 'HRTF', distanceModel: 'inverse' });
  panner3D.positionY.value = 0;
  const pannerGain = new Tone.Gain(1);
  const panner3DGain = new Tone.Gain(0);

  // Frequency Shifter with bypass/direct crossfade
  const freqShifter = new Tone.FrequencyShifter(0);
  const fsBypassGain = new Tone.Gain(0);
  const fsDirectGain = new Tone.Gain(1);

  // Main filter
  const filter = new Tone.Filter(config.filterFreq, config.filterType);

  // Wire: filter → EQ → panners → freq shifter → compressor + sends
  filter.connect(eqHpf);
  eqHpf.connect(eqLpf);
  eqLpf.connect(pannerGain);
  eqLpf.connect(panner3DGain);
  pannerGain.connect(panner);
  panner3DGain.connect(panner3D);

  // FreqShifter path
  panner.connect(fsBypassGain);
  panner3D.connect(fsBypassGain);
  fsBypassGain.connect(freqShifter);
  freqShifter.connect(compressor);
  freqShifter.connect(delaySend);
  freqShifter.connect(reverbSend);
  freqShifter.connect(spectralSend);

  // Direct path (bypass freqShifter)
  panner.connect(fsDirectGain);
  panner3D.connect(fsDirectGain);
  fsDirectGain.connect(compressor);
  fsDirectGain.connect(delaySend);
  fsDirectGain.connect(reverbSend);
  fsDirectGain.connect(spectralSend);

  // Freeze + Reverse sends from both paths
  fsBypassGain.connect(freezeSend);
  fsBypassGain.connect(reverseSend);
  fsDirectGain.connect(freezeSend);
  fsDirectGain.connect(reverseSend);

  return {
    filter, eqHpf, eqLpf,
    panner, panner3D, pannerGain, panner3DGain,
    freqShifter, fsBypassGain, fsDirectGain,
    delaySend, reverbSend, spectralSend, freezeSend, reverseSend,
    dispose: () => {
      filter.dispose(); eqHpf.dispose(); eqLpf.dispose();
      panner.dispose(); panner3D.dispose(); pannerGain.dispose(); panner3DGain.dispose();
      freqShifter.dispose(); fsBypassGain.dispose(); fsDirectGain.dispose();
      delaySend.dispose(); reverbSend.dispose(); spectralSend.dispose();
      freezeSend.dispose(); reverseSend.dispose();
    },
  };
}

/**
 * Injects common control methods onto a synthRef object:
 * updateEq, setPan, setFreqShift, switchBinaural, updateBinaural,
 * updateLorenz, initNestedLfo, updateNestedLfo, disposeNestedLfo,
 * setSpectralSend, setFreezeSend, setReverseSend
 */
export function injectCommonMethods(
  synthObj: any,
  routing: TrackRouting,
  baseLorenzFreq: number,
  nestedLfoFactory: (filter: any, r1: number, r2: number, d: number) => any,
) {
  const {
    filter, eqHpf, eqLpf,
    panner, panner3D, pannerGain, panner3DGain,
    freqShifter, fsBypassGain, fsDirectGain,
    spectralSend, freezeSend, reverseSend,
  } = routing;

  synthObj.updateEq = (hpfFreq: number, lpfFreq: number) => {
    eqHpf.frequency.rampTo(hpfFreq, 0.05);
    eqLpf.frequency.rampTo(lpfFreq, 0.05);
  };
  synthObj.setPan = (value: number) => { panner.pan.rampTo(value, 0.05); };
  synthObj.setFreqShift = (hz: number, enabled?: boolean) => {
    freqShifter.frequency.rampTo(hz, 0.05);
    if (enabled !== undefined) {
      fsBypassGain.gain.rampTo(enabled ? 1 : 0, 0.02);
      fsDirectGain.gain.rampTo(enabled ? 0 : 1, 0.02);
    }
  };
  synthObj.panner = panner;
  synthObj.freqShifter = freqShifter;
  synthObj.setSpectralSend = (value: number) => { spectralSend.gain.rampTo(value, 0.05); };
  synthObj.setFreezeSend = (value: number) => { freezeSend.gain.rampTo(value, 0.05); };
  synthObj.setReverseSend = (value: number) => { reverseSend.gain.rampTo(value, 0.05); };

  synthObj.switchBinaural = (binaural: boolean) => {
    pannerGain.gain.rampTo(binaural ? 0 : 1, 0.1);
    panner3DGain.gain.rampTo(binaural ? 1 : 0, 0.1);
  };
  synthObj.updateBinaural = (azimuth: number, distance: number) => {
    const rad = (azimuth * Math.PI) / 180;
    try {
      panner3D.setPosition(Math.sin(rad) * distance, 0, -Math.cos(rad) * distance);
    } catch (e) {
      panner3D.positionX.value = Math.sin(rad) * distance;
      panner3D.positionZ.value = -Math.cos(rad) * distance;
    }
  };

  synthObj.updateLorenz = (normalizedValue: number, depth: number, target: string) => {
    if (target === 'filter') {
      filter.frequency.rampTo(baseLorenzFreq + normalizedValue * depth, 0.05);
    }
  };

  synthObj.nestedLfoInstance = null;
  synthObj.initNestedLfo = (r1: number, r2: number, d: number) => {
    synthObj.nestedLfoInstance?.dispose();
    synthObj.nestedLfoInstance = nestedLfoFactory(filter, r1, r2, d);
  };
  synthObj.updateNestedLfo = (r1: number, r2: number, d: number) =>
    synthObj.nestedLfoInstance?.update(r1, r2, d);
  synthObj.disposeNestedLfo = () => {
    synthObj.nestedLfoInstance?.dispose();
    synthObj.nestedLfoInstance = null;
  };
}

/**
 * Restores persisted track state onto the synthRef after a rebuild.
 */
export function restoreTrackState(synthsRef: any, tracksRef: any, trackId: string) {
  const track = tracksRef.current.find((t: any) => t.id === trackId);
  if (track && synthsRef.current[trackId]) {
    const s = synthsRef.current[trackId];
    s.setVolume(track.volume ?? 0);
    s.setSends(track.delaySend, track.reverbSend);
    const hpf = track.eqEnabled ? (track.eqHpfFreq ?? 20) : 20;
    const lpf = track.eqEnabled ? (track.eqLpfFreq ?? 20000) : 20000;
    s.updateEq?.(hpf, lpf);
    s.setPan?.(track.pan ?? 0);
    s.setFreqShift?.(
      track.freqShiftEnabled ? (track.freqShift ?? 0) : 0,
      track.freqShiftEnabled ?? false,
    );
    s.setSpectralSend?.(track.spectralDelaySend ?? 0);
    s.setFreezeSend?.(track.freezeSend ?? 0);
    s.setReverseSend?.(track.reverseSend ?? 0);
    s.switchBinaural?.(track.binauralEnabled ?? false);
    if (track.binauralEnabled) {
      s.updateBinaural?.(track.binauralAzimuth ?? 0, track.binauralDistance ?? 3);
    }
  }
}

/**
 * Creates a nested LFO pair: lfo1 modulates lfo2's frequency,
 * lfo2 modulates a target filter's frequency.
 */
export function createNestedLfo(
  filter: any,
  rate1: number,
  rate2: number,
  depth: number,
) {
  const lfo1 = new Tone.Oscillator({ type: 'sine', frequency: rate1 });
  const lfo2 = new Tone.Oscillator({ type: 'sine', frequency: rate2 });
  const lfo1ModGain = new Tone.Gain(rate2 * 0.5);
  lfo1.connect(lfo1ModGain);
  lfo1ModGain.connect(lfo2.frequency);
  const lfo2DepthGain = new Tone.Gain(depth);
  lfo2.connect(lfo2DepthGain);
  if (filter) lfo2DepthGain.connect(filter.frequency);
  lfo1.start();
  lfo2.start();
  return {
    lfo1, lfo2, lfo1ModGain, lfo2DepthGain,
    update: (r1: number, r2: number, d: number) => {
      lfo1.frequency.rampTo(r1, 0.1);
      lfo2.frequency.rampTo(r2, 0.1);
      lfo1ModGain.gain.rampTo(r2 * 0.5, 0.1);
      lfo2DepthGain.gain.rampTo(d, 0.1);
    },
    dispose: () => {
      lfo1.stop(); lfo1.dispose();
      lfo2.stop(); lfo2.dispose();
      lfo1ModGain.dispose();
      lfo2DepthGain.dispose();
    },
  };
}
