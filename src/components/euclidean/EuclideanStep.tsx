import React, { useRef, useState, useEffect } from 'react';
import { motion } from "framer-motion";

interface EuclideanStepProps {
  active: boolean;
  trackId: string;
  velocity?: number;
  isGhost?: boolean;
  index: number;
  color: string;
  baseProbability: number;
  effectiveProbability: number;
  previewActive?: boolean;
  temporalOffset?: number;
  onProbabilityChange: (val: number) => void;
  onToggle: () => void;
  // Tonal props
  isTonal?: boolean;
  noteName?: string;
  noteIndex?: number;
  maxNoteIndex?: number;
  onNoteIndexChange?: (val: number) => void;
}

export const EuclideanStep: React.FC<EuclideanStepProps> = ({ 
  active, 
  trackId,
  velocity = 0.85,
  isGhost,
  index, 
  color,
  baseProbability,
  effectiveProbability,
  previewActive,
  temporalOffset = 0,
  onProbabilityChange,
  onToggle,
  isTonal = false,
  noteName,
  noteIndex = 0,
  maxNoteIndex = 14,
  onNoteIndexChange
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(Math.round(baseProbability * 100).toString());
  const dragStartY = useRef<number>(0);
  const dragStartProb = useRef<number>(0);
  const hasMoved = useRef<boolean>(false);
  
  // Track previous probability to detect mutations
  const prevProb = useRef(baseProbability);
  const [mutationPulse, setMutationPulse] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    if (Math.abs(baseProbability - prevProb.current) > 0.001 && !isDragging) {
      setMutationPulse(baseProbability > prevProb.current ? 'up' : 'down');
      const timer = setTimeout(() => setMutationPulse(null), 600);
      prevProb.current = baseProbability;
      return () => clearTimeout(timer);
    }
    prevProb.current = baseProbability;
  }, [baseProbability, isDragging]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isEditing) return;
    dragStartY.current = e.clientY;
    dragStartProb.current = baseProbability;
    hasMoved.current = false;
    setIsDragging(true);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = dragStartY.current - moveEvent.clientY;
      const sensitivity = 150; 
      const newProb = Math.max(0, Math.min(1, dragStartProb.current + (deltaY / sensitivity)));
      
      if (Math.abs(deltaY) > 5) {
        hasMoved.current = true;
      }
      
      onProbabilityChange(newProb);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      
      if (!hasMoved.current) {
        // We handle toggle in onClick/onDoubleClick to avoid conflict with drag
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditValue(Math.round(baseProbability * 100).toString());
  };

  const handleEditSubmit = () => {
    let val = parseInt(editValue);
    if (!isNaN(val)) {
      onProbabilityChange(Math.max(0, Math.min(100, val)) / 100);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleEditSubmit();
    if (e.key === 'Escape') setIsEditing(false);
  };

  return (
    <div 
      id={`step-${trackId}-${index}`}
      data-track-id={trackId}
      data-index={index}
      data-active={active}
      className="relative flex flex-col items-center gap-1 group select-none step-container"
    >
      <div className="relative">
        <motion.div
          initial={false}
          onMouseDown={handleMouseDown}
          onDoubleClick={handleDoubleClick}
          onClick={() => {
            if (!hasMoved.current && !isEditing) onToggle();
          }}
          animate={{
            scale: isGhost ? 1.05 : 1,
            backgroundColor: active 
              ? (isGhost ? "#444" : `${color}cc`) 
              : (previewActive ? "#FFB30033" : `${color}1a`), // 10% opacity for inactive slots
            boxShadow: isGhost ? "0 0 5px #ff8800" : (previewActive ? "0 0 8px #FFB30044" : "none"),
            opacity: active 
              ? (isGhost ? 0.8 : (0.5 + (effectiveProbability * 0.5))) 
              : (previewActive ? 0.6 : 1), // Keep full opacity but the color itself is transparent
            borderColor: isGhost 
              ? "#ff8800" 
              : (previewActive ? "#FFB30080" : (active ? `${color}` : `${color}33`)) // 20% opacity for border
          }}
          transition={{
            duration: isGhost ? 0.05 : 0.1,
            repeat: isGhost ? 1 : 0,
            repeatType: "reverse"
          }}
          className={`w-8 h-8 rounded-sm border transition-colors flex items-center justify-center relative overflow-hidden step-box ${isDragging ? 'cursor-ns-resize' : 'cursor-pointer'}`}
        >
          {isEditing ? (
            <input
              autoFocus
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleEditSubmit}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              className="absolute inset-0 w-full h-full bg-idm-bg text-white text-[10px] font-mono font-bold text-center outline-none border-none"
            />
          ) : (
            <>
              {isGhost && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 0] }}
                  className="absolute inset-0 bg-orange-500/20"
                />
              )}

              {previewActive && !active && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.1, 0.3, 0.1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute inset-0 bg-[#FFB30022]"
                />
              )}
              
              {/* Base Probability (Ghost Level - Faint Outline/Fill) */}
              {active && baseProbability !== effectiveProbability && (
                <div 
                  className="absolute bottom-0 left-0 w-full border-t border-dashed border-white/20 pointer-events-none"
                  style={{ 
                    height: `${baseProbability * 100}%`,
                    backgroundColor: 'rgba(255, 255, 255, 0.05)'
                  }} 
                />
              )}

              {/* Effective Probability Fill (Water Tank Effect) */}
              {active && (
                <div 
                  className="absolute bottom-0 left-0 w-full transition-all duration-75 pointer-events-none"
                  style={{ 
                    height: `${effectiveProbability * 100}%`, 
                    backgroundColor: isDragging ? `${color}4d` : `${color}1a`,
                    borderTop: isDragging ? `1px solid ${color}` : (baseProbability !== effectiveProbability ? `1px solid ${color}80` : 'none')
                  }} 
                />
              )}

              {/* Mutation Pulse Indicator */}
              {mutationPulse && (
                <motion.div
                  initial={{ opacity: 1, scale: 0.5 }}
                  animate={{ opacity: 0, scale: 1.5 }}
                  className={`absolute inset-0 border-2 rounded-sm pointer-events-none ${mutationPulse === 'up' ? 'border-white' : 'border-orange-500'}`}
                />
              )}

              {/* Temporal Offset Indicator Bar */}
              {active && temporalOffset !== 0 && (() => {
                const maxOffset = 0.06;
                const normalizedOffset = Math.max(-1, Math.min(1, temporalOffset / maxOffset));
                const position = 50 + (normalizedOffset * 40);
                return (
                  <div
                    className="absolute top-1 bottom-1 w-[2px] rounded-full pointer-events-none transition-all duration-200"
                    style={{
                      left: `${position}%`,
                      backgroundColor: temporalOffset > 0 ? `${color}80` : `${color}60`,
                      opacity: Math.abs(normalizedOffset) * 0.8 + 0.2,
                    }}
                  />
                );
              })()}

              {/* Probability Percentage Label */}
              {active && (
                <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-200 ${isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                  <span className="text-[8px] font-mono font-bold" style={{ color: effectiveProbability > 0.5 ? '#000' : color }}>
                    {Math.round(effectiveProbability * 100)}%
                  </span>
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>

      <div className="flex flex-col items-center pointer-events-none">
        <span className="text-[8px] font-mono text-idm-ink/40 uppercase tracking-tighter">
          {index.toString().padStart(2, '0')}
        </span>
      </div>
    </div>
  );
};
