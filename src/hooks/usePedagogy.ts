import { useState } from 'react';
import type { PedagogyVoice } from '../constants/pedagogy';

export function usePedagogy() {
  const [isStudyMode, setIsStudyMode] = useState(false);
  const [studyVoice, setStudyVoice] = useState<PedagogyVoice>('technical');
  const [isThesisOpen, setIsThesisOpen] = useState(false);
  const [hoveredGlobalParam, setHoveredGlobalParam] = useState<string | null>(null);
  const [hoveredGlobalEl, setHoveredGlobalEl] = useState<HTMLElement | null>(null);

  return {
    isStudyMode, setIsStudyMode,
    studyVoice, setStudyVoice,
    isThesisOpen, setIsThesisOpen,
    hoveredGlobalParam, setHoveredGlobalParam,
    hoveredGlobalEl, setHoveredGlobalEl,
  };
}
