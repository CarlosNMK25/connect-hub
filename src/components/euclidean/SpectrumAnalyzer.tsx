import React, { useEffect, useRef } from 'react';
import * as Tone from 'tone';

interface SpectrumAnalyzerProps {
  analyser: Tone.Analyser | null;
  isPlaying: boolean;
}

export const SpectrumAnalyzer: React.FC<SpectrumAnalyzerProps> = ({ analyser, isPlaying }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current || !analyser) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        if (!container || !canvas) return;
        const dpr = window.devicePixelRatio || 1;
        const rect = container.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
      });
    });

    resizeObserver.observe(container);

    const render = () => {
      if (!isPlaying) {
        const rect = container.getBoundingClientRect();
        ctx.clearRect(0, 0, rect.width, rect.height);
        return;
      }

      const rect = container.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      const values = analyser.getValue() as Float32Array;

      ctx.clearRect(0, 0, width, height);
      
      // Background grid
      ctx.strokeStyle = 'rgba(20, 20, 20, 0.05)';
      ctx.lineWidth = 1;
      for (let i = 1; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(0, (height / 4) * i);
        ctx.lineTo(width, (height / 4) * i);
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.strokeStyle = '#f97316'; // Orange-500
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';

      const barWidth = width / values.length;

      for (let i = 0; i < values.length; i++) {
        // Convert dB to normalized height (approximate range -100 to 0 dB)
        const db = values[i];
        const normalized = Math.max(0, (db + 100) / 100);
        const y = height - (normalized * height);
        const x = i * barWidth;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      ctx.stroke();

      // Gradient fill
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, 'rgba(249, 115, 22, 0.2)');
      gradient.addColorStop(1, 'rgba(249, 115, 22, 0)');
      ctx.fillStyle = gradient;
      ctx.fill();

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
    };
  }, [analyser, isPlaying]);

  return (
    <div ref={containerRef} className="w-full h-24 bg-idm-bg/50 border border-idm-muted/10 rounded-xl overflow-hidden relative group">
      <div className="absolute top-2 left-3 flex items-center gap-2 z-10">
        <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></div>
        <span className="text-[8px] font-mono text-orange-500/60 uppercase tracking-widest">Global FFT Spectrum</span>
      </div>
      <canvas 
        ref={canvasRef} 
        className="w-full h-full block"
      />
      <div className="absolute bottom-1 right-2 flex gap-4 text-[7px] font-mono text-idm-ink/20 uppercase z-10">
        <span>20Hz</span>
        <span>2kHz</span>
        <span>20kHz</span>
      </div>
    </div>
  );
};
