import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type FxPanelId = 'GRV' | 'RVR' | 'FRZ' | 'XFD' | 'SDLY';

interface AdvancedFxPanelProps {
  activeFxPanel: FxPanelId | null;
  setActiveFxPanel: (v: FxPanelId | null) => void;
  gatedEnabled: boolean; setGatedEnabled: (v: boolean) => void;
  gatedThreshold: number; setGatedThreshold: (v: number) => void;
  reverseEnabled: boolean; setReverseEnabled: (v: boolean) => void;
  reverseDecay: number; setReverseDecay: (v: number) => void;
  freezeEnabled: boolean; setFreezeEnabled: (v: boolean) => void;
  freezeFeedback: number; setFreezeFeedback: (v: number) => void;
  freezeFilterFreq: number; setFreezeFilterFreq: (v: number) => void;
  crossfeedEnabled: boolean; setCrossfeedEnabled: (v: boolean) => void;
  crossfeedBase: number; setCrossfeedBase: (v: number) => void;
  crossfeedDepth: number; setCrossfeedDepth: (v: number) => void;
  spectralDelayEnabled: boolean; setSpectralDelayEnabled: (v: boolean) => void;
  spectralDelayWet: number; setSpectralDelayWet: (v: number) => void;
  spectralDelayLowTime: number; setSpectralDelayLowTime: (v: number) => void;
  spectralDelayMidTime: number; setSpectralDelayMidTime: (v: number) => void;
  spectralDelayHighTime: number; setSpectralDelayHighTime: (v: number) => void;
  isStudyMode: boolean;
  setHoveredGlobalParam: (p: string | null) => void;
  setHoveredGlobalEl: (el: HTMLElement | null) => void;
  setHoveredGlobalValue: (v: number | null) => void;
}

export const AdvancedFxPanel: React.FC<AdvancedFxPanelProps> = ({
  activeFxPanel, setActiveFxPanel,
  gatedEnabled, setGatedEnabled, gatedThreshold, setGatedThreshold,
  reverseEnabled, setReverseEnabled, reverseDecay, setReverseDecay,
  freezeEnabled, setFreezeEnabled, freezeFeedback, setFreezeFeedback, freezeFilterFreq, setFreezeFilterFreq,
  crossfeedEnabled, setCrossfeedEnabled, crossfeedBase, setCrossfeedBase, crossfeedDepth, setCrossfeedDepth,
  spectralDelayEnabled, setSpectralDelayEnabled, spectralDelayWet, setSpectralDelayWet,
  spectralDelayLowTime, setSpectralDelayLowTime, spectralDelayMidTime, setSpectralDelayMidTime,
  spectralDelayHighTime, setSpectralDelayHighTime,
  isStudyMode, setHoveredGlobalParam, setHoveredGlobalEl,
}) => {
  const fxList = [
    { id: 'GRV' as const, label: 'GRV', enabled: gatedEnabled, setEnabled: setGatedEnabled, title: 'Gated Reverb', studyParam: 'gatedEnabled' },
    { id: 'RVR' as const, label: 'RVR', enabled: reverseEnabled, setEnabled: setReverseEnabled, title: 'Reverse Reverb', studyParam: 'reverseEnabled' },
    { id: 'FRZ' as const, label: 'FRZ', enabled: freezeEnabled, setEnabled: setFreezeEnabled, title: 'Freeze', studyParam: 'freezeEnabled' },
    { id: 'XFD' as const, label: 'XFD', enabled: crossfeedEnabled, setEnabled: setCrossfeedEnabled, title: 'Crossfeed', studyParam: 'crossfeedEnabled' },
    { id: 'SDLY' as const, label: 'SDLY', enabled: spectralDelayEnabled, setEnabled: setSpectralDelayEnabled, title: 'Spectral Delay', studyParam: 'spectralDelayEnabled' },
  ];

  return (
    <div className="flex flex-col gap-3 min-w-[220px] border-l border-black/5 pl-6">
      <span className="text-[9px] font-mono uppercase tracking-widest text-idm-muted">FX Avanzados</span>
      {/* Toggle row */}
      <div className="flex gap-1.5 flex-wrap">
        {fxList.map(fx => (
          <button
            key={fx.id}
            onClick={() => setActiveFxPanel(activeFxPanel === fx.id ? null : fx.id)}
            onDoubleClick={() => fx.setEnabled(!fx.enabled)}
            onMouseEnter={(e) => { if (isStudyMode) { setHoveredGlobalParam(fx.studyParam); setHoveredGlobalEl(e.currentTarget); } }}
            onMouseLeave={() => { setHoveredGlobalParam(null); setHoveredGlobalEl(null); }}
            className={`text-[8px] font-mono px-2 py-1 rounded border transition-colors ${
              activeFxPanel === fx.id
                ? 'bg-system-accent text-white border-system-accent'
                : fx.enabled
                  ? 'bg-system-accent/20 text-system-accent border-system-accent/50'
                  : 'bg-background text-idm-muted border-border hover:border-system-accent'
            }`}
            title={fx.title}
          >
            {fx.label}
            {fx.enabled && <span className="ml-0.5 inline-block w-1 h-1 rounded-full bg-orange-400 align-middle" />}
          </button>
        ))}
      </div>

      {/* Shared param zone */}
      <AnimatePresence mode="wait">
        {activeFxPanel === 'GRV' && (
          <motion.div key="grv" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.15 }}
            className="flex flex-col gap-2 p-3 border border-border rounded-lg bg-background overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-mono text-idm-muted uppercase">Gated Reverb</span>
              <button onClick={() => setGatedEnabled(!gatedEnabled)} className={`w-6 h-3 rounded-full transition-colors ${gatedEnabled ? 'bg-orange-400' : 'bg-muted'}`}>
                <span className={`block w-2.5 h-2.5 rounded-full bg-white shadow transition-transform ${gatedEnabled ? 'translate-x-3' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-mono text-idm-muted w-6">Thr</span>
              <input type="range" min={-60} max={-10} step={1} value={gatedThreshold}
                onChange={e => setGatedThreshold(Number(e.target.value))}
                className="flex-1 h-1 bg-black/5 appearance-none cursor-pointer accent-system-accent" />
              <span className="text-[7px] font-mono text-idm-muted w-10 text-right">{gatedThreshold}dB</span>
            </div>
          </motion.div>
        )}
        {activeFxPanel === 'RVR' && (
          <motion.div key="rvr" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.15 }}
            className="flex flex-col gap-2 p-3 border border-border rounded-lg bg-background overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-mono text-idm-muted uppercase">Reverse Reverb</span>
              <button onClick={() => setReverseEnabled(!reverseEnabled)} className={`w-6 h-3 rounded-full transition-colors ${reverseEnabled ? 'bg-orange-400' : 'bg-muted'}`}>
                <span className={`block w-2.5 h-2.5 rounded-full bg-white shadow transition-transform ${reverseEnabled ? 'translate-x-3' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-mono text-idm-muted w-10">Decay</span>
              <input type="range" min={0.5} max={4} step={0.1} value={reverseDecay}
                onChange={e => setReverseDecay(Number(e.target.value))}
                className="flex-1 h-1 bg-black/5 appearance-none cursor-pointer accent-system-accent" />
              <span className="text-[7px] font-mono text-idm-muted w-8 text-right">{reverseDecay.toFixed(1)}s</span>
            </div>
          </motion.div>
        )}
        {activeFxPanel === 'FRZ' && (
          <motion.div key="frz" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.15 }}
            className="flex flex-col gap-2 p-3 border border-border rounded-lg bg-background overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-mono text-idm-muted uppercase">Freeze</span>
              <button onClick={() => setFreezeEnabled(!freezeEnabled)} className={`w-6 h-3 rounded-full transition-colors ${freezeEnabled ? 'bg-orange-400' : 'bg-muted'}`}>
                <span className={`block w-2.5 h-2.5 rounded-full bg-white shadow transition-transform ${freezeEnabled ? 'translate-x-3' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-mono text-idm-muted w-6">FB</span>
              <input type="range" min={0.5} max={0.99} step={0.01} value={freezeFeedback}
                onChange={e => setFreezeFeedback(Number(e.target.value))}
                className="flex-1 h-1 bg-black/5 appearance-none cursor-pointer accent-system-accent" />
              <span className="text-[7px] font-mono text-idm-muted w-8 text-right">{freezeFeedback.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-mono text-idm-muted w-6">LP</span>
              <input type="range" min={500} max={12000} step={500} value={freezeFilterFreq}
                onChange={e => setFreezeFilterFreq(Number(e.target.value))}
                className="flex-1 h-1 bg-black/5 appearance-none cursor-pointer accent-system-accent" />
              <span className="text-[7px] font-mono text-idm-muted w-10 text-right">{(freezeFilterFreq/1000).toFixed(1)}k</span>
            </div>
          </motion.div>
        )}
        {activeFxPanel === 'XFD' && (
          <motion.div key="xfd" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.15 }}
            className="flex flex-col gap-2 p-3 border border-border rounded-lg bg-background overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-mono text-idm-muted uppercase">Cloud → Tone</span>
              <button onClick={() => setCrossfeedEnabled(!crossfeedEnabled)} className={`w-6 h-3 rounded-full transition-colors ${crossfeedEnabled ? 'bg-orange-400' : 'bg-muted'}`}>
                <span className={`block w-2.5 h-2.5 rounded-full bg-white shadow transition-transform ${crossfeedEnabled ? 'translate-x-3' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-mono text-idm-muted w-10">Base</span>
              <input type="range" min={200} max={2000} step={50} value={crossfeedBase}
                onChange={e => setCrossfeedBase(Number(e.target.value))}
                className="flex-1 h-1 bg-black/5 appearance-none cursor-pointer accent-system-accent" />
              <span className="text-[7px] font-mono text-idm-muted w-12 text-right">{crossfeedBase}Hz</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-mono text-idm-muted w-10">Depth</span>
              <input type="range" min={0} max={8000} step={200} value={crossfeedDepth}
                onChange={e => setCrossfeedDepth(Number(e.target.value))}
                className="flex-1 h-1 bg-black/5 appearance-none cursor-pointer accent-system-accent" />
              <span className="text-[7px] font-mono text-idm-muted w-12 text-right">{crossfeedDepth}Hz</span>
            </div>
          </motion.div>
        )}
        {activeFxPanel === 'SDLY' && (
          <motion.div key="sdly" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.15 }}
            className="flex flex-col gap-2 p-3 border border-border rounded-lg bg-background overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-mono text-idm-muted uppercase">Spectral Delay</span>
              <button onClick={() => setSpectralDelayEnabled(!spectralDelayEnabled)} className={`w-6 h-3 rounded-full transition-colors ${spectralDelayEnabled ? 'bg-orange-400' : 'bg-muted'}`}>
                <span className={`block w-2.5 h-2.5 rounded-full bg-white shadow transition-transform ${spectralDelayEnabled ? 'translate-x-3' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-mono text-idm-muted w-8">Wet</span>
              <input type="range" min={0} max={1} step={0.05} value={spectralDelayWet}
                onChange={e => setSpectralDelayWet(Number(e.target.value))}
                className="flex-1 h-1 bg-black/5 appearance-none cursor-pointer accent-system-accent" />
              <span className="text-[7px] font-mono text-idm-muted w-8 text-right">{Math.round(spectralDelayWet * 100)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-mono text-idm-muted w-8">Lo</span>
              <input type="range" min={0} max={500} step={10} value={spectralDelayLowTime}
                onChange={e => setSpectralDelayLowTime(Number(e.target.value))}
                className="flex-1 h-1 bg-black/5 appearance-none cursor-pointer accent-system-accent" />
              <span className="text-[7px] font-mono text-idm-muted w-10 text-right">{spectralDelayLowTime}ms</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-mono text-idm-muted w-8">Mid</span>
              <input type="range" min={0} max={500} step={10} value={spectralDelayMidTime}
                onChange={e => setSpectralDelayMidTime(Number(e.target.value))}
                className="flex-1 h-1 bg-black/5 appearance-none cursor-pointer accent-system-accent" />
              <span className="text-[7px] font-mono text-idm-muted w-10 text-right">{spectralDelayMidTime}ms</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-mono text-idm-muted w-8">Hi</span>
              <input type="range" min={0} max={500} step={10} value={spectralDelayHighTime}
                onChange={e => setSpectralDelayHighTime(Number(e.target.value))}
                className="flex-1 h-1 bg-black/5 appearance-none cursor-pointer accent-system-accent" />
              <span className="text-[7px] font-mono text-idm-muted w-10 text-right">{spectralDelayHighTime}ms</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
