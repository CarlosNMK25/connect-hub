import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getMicroText, type PedagogyVoice } from '../../constants/pedagogy';

interface StudyTooltipPortalProps {
  isStudyMode: boolean;
  hoveredGlobalParam: string | null;
  hoveredGlobalEl: HTMLElement | null;
  studyVoice: PedagogyVoice;
  hoveredGlobalValue?: number | null;
}

export const StudyTooltipPortal: React.FC<StudyTooltipPortalProps> = ({
  isStudyMode, hoveredGlobalParam, hoveredGlobalEl, studyVoice,
}) => {
  const pos = (() => {
    if (!hoveredGlobalParam || !hoveredGlobalEl) return { top: 0, left: 0, flip: false };
    const rect = hoveredGlobalEl.getBoundingClientRect();
    const spaceAbove = rect.top;
    const flip = spaceAbove < 120;
    return {
      top: flip ? rect.bottom + 8 : rect.top - 8,
      left: Math.min(Math.max(rect.left + rect.width / 2, 144), window.innerWidth - 144),
      flip
    };
  })();

  return createPortal(
    <AnimatePresence>
      {isStudyMode && hoveredGlobalParam && hoveredGlobalEl && (
        <motion.div
          key={hoveredGlobalParam}
          initial={{ opacity: 0, y: pos.flip ? -5 : 5, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: pos.flip ? -5 : 5, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            transform: pos.flip ? 'translateX(-50%)' : 'translate(-50%, -100%)',
            zIndex: 99999
          }}
          className="w-72 p-3 bg-white border border-system-accent/40 rounded-xl shadow-2xl pointer-events-none"
        >
          <div className="text-[10px] font-mono leading-relaxed text-idm-ink uppercase">
            {getMicroText(hoveredGlobalParam, studyVoice)}
          </div>
          <div
            className="absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-white border-system-accent/40 rotate-45"
            style={pos.flip
              ? { top: '-4px', borderTop: '1px solid', borderLeft: '1px solid' }
              : { bottom: '-4px', borderRight: '1px solid', borderBottom: '1px solid' }
            }
          />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
