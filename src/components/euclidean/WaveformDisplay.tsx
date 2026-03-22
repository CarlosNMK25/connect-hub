import React, { useEffect, useRef } from 'react';

interface WaveformDisplayProps {
  buffer: AudioBuffer | null;
  color: string;
  start: number;
  end: number;
  currentStepProgress: number; // 0-1 within the current step
  isPlaying: boolean;
  isTriggered: boolean;
}

export const WaveformDisplay: React.FC<WaveformDisplayProps> = ({
  buffer,
  color,
  start,
  end,
  currentStepProgress,
  isPlaying,
  isTriggered
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        if (!container || !canvas) return;
        const dpr = window.devicePixelRatio || 1;
        const rect = container.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        draw();
      });
    });

    resizeObserver.observe(container);

    const draw = () => {
      const rect = container.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      if (!buffer) {
        // Draw idle state
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, rect.height / 2);
        ctx.lineTo(rect.width, rect.height / 2);
        ctx.stroke();
        ctx.setLineDash([]);
        return;
      }

      const data = buffer.getChannelData(0);
      const step = Math.ceil(data.length / rect.width);
      const amp = rect.height / 2;

      // Draw background waveform
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      for (let i = 0; i < rect.width; i++) {
        let min = 1.0;
        let max = -1.0;
        const startIdx = Math.floor(i * step);
        const endIdx = Math.min(data.length, startIdx + step);
        for (let j = startIdx; j < endIdx; j++) {
          const datum = data[j];
          if (datum < min) min = datum;
          if (datum > max) max = datum;
        }
        ctx.moveTo(i, (1 + min) * amp);
        ctx.lineTo(i, (1 + max) * amp);
      }
      ctx.stroke();

      // Draw active ROI waveform
      const startX = start * rect.width;
      const endX = end * rect.width;
      
      ctx.save();
      ctx.beginPath();
      ctx.rect(startX, 0, endX - startX, rect.height);
      ctx.clip();

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      for (let i = Math.floor(startX); i < Math.ceil(endX); i++) {
        let min = 1.0;
        let max = -1.0;
        const startIdx = Math.floor(i * step);
        const endIdx = Math.min(data.length, startIdx + step);
        for (let j = startIdx; j < endIdx; j++) {
          const datum = data[j];
          if (datum < min) min = datum;
          if (datum > max) max = datum;
        }
        ctx.moveTo(i, (1 + min) * amp);
        ctx.lineTo(i, (1 + max) * amp);
      }
      ctx.stroke();
      ctx.restore();

      // Draw ROI markers
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.3;
      ctx.fillRect(startX, 0, 1, rect.height);
      ctx.fillRect(endX - 1, 0, 1, rect.height);
      ctx.globalAlpha = 0.1;
      ctx.fillRect(startX, 0, endX - startX, rect.height);
      ctx.globalAlpha = 1;

      // Draw Playhead Fantasma if triggered
      if (isTriggered && isPlaying) {
        const playheadX = startX + (endX - startX) * currentStepProgress;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(playheadX, 0);
        ctx.lineTo(playheadX, rect.height);
        ctx.stroke();
        
        // Glow effect
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ffffff';
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    };

    draw();
    return () => resizeObserver.disconnect();
  }, [buffer, color, start, end, currentStepProgress, isPlaying, isTriggered]);

  return (
    <div ref={containerRef} className="w-full h-full">
      <canvas 
        ref={canvasRef} 
        className="w-full h-full bg-black/40 rounded-md border border-white/5 cursor-crosshair"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
};
