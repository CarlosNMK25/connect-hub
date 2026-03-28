import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Square, Sliders, Activity, Zap, Eye, EyeOff, Disc, Info, HelpCircle, Layers, Target, Power, Settings, GraduationCap } from 'lucide-react';
import type { PedagogyVoice } from '../../constants/pedagogy';

interface HeaderBarProps {
  audioContextState: string;
  handleStartAudio: () => void;
  isPlaying: boolean;
  togglePlay: () => void;
  isStudyMode: boolean;
  setIsStudyMode: (v: boolean) => void;
  studyVoice: PedagogyVoice;
  setStudyVoice: (fn: (v: PedagogyVoice) => PedagogyVoice) => void;
  setIsThesisOpen: (v: boolean) => void;
  showControls: boolean; setShowControls: (v: boolean) => void;
  showVisuals: boolean; setShowVisuals: (v: boolean) => void;
  showSync: boolean; setShowSync: (v: boolean) => void;
  showLibrary: boolean; setShowLibrary: (v: boolean) => void;
  showEngine: boolean; setShowEngine: (v: boolean) => void;
  showPatternSpace: boolean; setShowPatternSpace: (v: boolean) => void;
  songModeEnabled: boolean; setSongModeEnabled: (fn: boolean | ((p: boolean) => boolean)) => void;
  globalRecordingState: 'idle' | 'armed' | 'recording';
  handleGlobalArmOrRecord: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  audioContextState, handleStartAudio,
  isPlaying, togglePlay,
  isStudyMode, setIsStudyMode, studyVoice, setStudyVoice, setIsThesisOpen,
  showControls, setShowControls,
  showVisuals, setShowVisuals,
  showSync, setShowSync,
  showLibrary, setShowLibrary,
  showEngine, setShowEngine,
  showPatternSpace, setShowPatternSpace,
  songModeEnabled, setSongModeEnabled,
  globalRecordingState, handleGlobalArmOrRecord,
}) => {
  const navigate = useNavigate();
  const panelButtons = [
    { key: 'controls', active: showControls, toggle: () => setShowControls(!showControls), icon: <Sliders size={12} />, label: 'Controls', title: 'Toggle Global Controls' },
    { key: 'visuals', active: showVisuals, toggle: () => setShowVisuals(!showVisuals), icon: showVisuals ? <Eye size={12} /> : <EyeOff size={12} />, label: 'Visuals', title: 'Toggle Visual Monitors' },
    { key: 'sync', active: showSync, toggle: () => setShowSync(!showSync), icon: <Zap size={12} />, label: 'Sync', title: 'Toggle Pattern Sync' },
    { key: 'library', active: showLibrary, toggle: () => setShowLibrary(!showLibrary), icon: <Disc size={12} />, label: 'Library', title: 'Toggle EPL Library' },
    { key: 'engine', active: showEngine, toggle: () => setShowEngine(!showEngine), icon: <Settings size={12} />, label: 'Engine', title: 'Toggle Engine Room', variant: 'ink' as const },
    { key: 'space', active: showPatternSpace, toggle: () => setShowPatternSpace(!showPatternSpace), icon: <Target size={12} />, label: 'Space', title: 'Toggle Pattern Space' },
  ];

  return (
    <div className="sticky top-0 z-50 -mx-6 px-6 py-4 bg-white border-b border-black/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 transition-all duration-500 opacity-100 pointer-events-auto">
      <div>
        <h1 className="text-2xl font-mono font-bold tracking-tighter uppercase mb-0.5 flex items-center gap-2">
          <Activity className="text-system-accent" size={20} />
          Polyrhythmic <span className="text-system-accent">IDM</span> Engine
        </h1>
        <p className="text-idm-ink/40 font-mono text-[9px] uppercase tracking-[0.3em]">
          4-Track Generative Environment // Multi-Cycle Sync
        </p>
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          {audioContextState !== 'running' ? (
            <button 
              onClick={handleStartAudio}
              className="flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/30 rounded-full hover:bg-red-500/20 transition-all group"
            >
              <Power size={10} className="text-red-500 group-hover:scale-110 transition-transform" />
              <span className="text-[8px] font-mono font-bold text-red-500 uppercase tracking-widest">Audio Engine Suspended - Click to Start</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1 bg-green-500/5 border border-green-500/20 rounded-full">
              <Activity size={10} className="text-green-500" />
              <span className="text-[8px] font-mono font-bold text-green-500 uppercase tracking-widest">Engine Online</span>
            </div>
          )}
          <button 
            onClick={() => setIsStudyMode(!isStudyMode)}
            className={`flex items-center gap-2 px-3 py-1 rounded-full text-[8px] font-mono font-bold uppercase tracking-widest transition-all duration-300 border ${
              isStudyMode 
                ? 'bg-system-accent/10 border-system-accent/30 text-system-accent' 
                : 'bg-black/[0.02] text-idm-muted border-black/5 hover:text-idm-ink hover:border-black/10'
            }`}
            title="Toggle Study Mode (Capa Pedagógica)"
          >
            <HelpCircle size={10} />
            <span>{isStudyMode ? 'Study ON' : 'Study Mode'}</span>
          </button>
          {isStudyMode && (
            <button
              onClick={() => setStudyVoice(v => v === 'technical' ? 'literary' : 'technical')}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[8px] font-mono font-bold uppercase tracking-widest transition-all duration-300 border bg-black/[0.02] text-idm-muted border-black/5 hover:text-idm-ink hover:border-black/10"
              title="Alternar entre tooltips técnicos y literarios"
            >
              {studyVoice === 'technical' ? '∑ Técnico' : '✦ Literario'}
            </button>
          )}
          <button 
            onClick={() => setIsThesisOpen(true)}
            className="flex items-center gap-2 px-3 py-1 rounded-full text-[8px] font-mono font-bold uppercase tracking-widest transition-all duration-300 border bg-black/[0.02] text-idm-muted border-black/5 hover:text-idm-ink hover:border-black/10"
            title="Ver Tesis Doctoral (Macro)"
          >
            <Info size={10} />
            <span>Info</span>
          </button>
          <button 
            onClick={() => navigate('/learn')}
            className="flex items-center gap-2 px-3 py-1 rounded-full text-[8px] font-mono font-bold uppercase tracking-widest transition-all duration-300 border bg-system-accent/5 text-system-accent border-system-accent/20 hover:bg-system-accent/10 hover:border-system-accent/40"
            title="Cuaderno de Aprendizaje"
          >
            <GraduationCap size={10} />
            <span>Cuaderno</span>
          </button>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex gap-2 mr-2">
          {panelButtons.map(btn => (
            <button 
              key={btn.key}
              onClick={btn.toggle}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-mono uppercase tracking-wider transition-all duration-300 border ${
                btn.active 
                  ? btn.variant === 'ink'
                    ? 'bg-idm-ink/10 text-idm-ink border-idm-ink/30'
                    : 'bg-system-accent/10 text-system-accent border-system-accent/30'
                  : 'bg-white text-idm-muted border-black/5 hover:text-idm-ink hover:border-black/10'
              }`}
              title={btn.title}
            >
              {btn.icon}
              <span className="hidden sm:inline">{btn.label}</span>
            </button>
          ))}
          <button 
            onClick={() => setSongModeEnabled(prev => !prev)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-mono uppercase tracking-wider transition-all duration-300 border ${
              songModeEnabled 
                ? 'bg-system-accent text-white border-system-accent' 
                : 'bg-white text-idm-muted border-black/5 hover:text-idm-ink hover:border-black/10'
            }`}
            title="Toggle Song Mode"
          >
            <Layers size={12} />
            <span className="hidden sm:inline">Song</span>
          </button>
        </div>

        <button
          onClick={handleGlobalArmOrRecord}
          className={`w-10 h-10 rounded-full border-2 flex items-center 
            justify-center transition-all duration-300 ${
            globalRecordingState === 'recording'
              ? 'bg-red-500 text-white border-red-600 animate-pulse'
              : globalRecordingState === 'armed'
              ? 'bg-amber-400 text-white border-amber-500 animate-pulse'
              : 'bg-white text-red-400 border-red-300 hover:bg-red-50 hover:border-red-400'
          }`}
          title={
            globalRecordingState === 'recording' ? 'Parar grabación del mix'
            : globalRecordingState === 'armed' ? 'Armado — esperando Play'
            : 'Grabar mix completo'
          }
        >
          {globalRecordingState === 'recording'
            ? <Square size={14} fill="currentColor" />
            : <span className="w-3 h-3 rounded-full bg-red-400 block" />
          }
        </button>

        <button 
          onClick={togglePlay} 
          className={`w-14 h-14 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${isPlaying ? "bg-system-accent text-white border-system-accent shadow-md" : "bg-white text-system-accent border-system-accent hover:bg-system-accent/5"}`}
        >
          {isPlaying ? <Square size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
        </button>
      </div>
    </div>
  );
};
