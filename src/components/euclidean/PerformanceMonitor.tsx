import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Activity, Cpu, Zap, AlertTriangle, Headphones, BarChart3 } from 'lucide-react';
import * as Tone from 'tone';

interface PerformanceData {
  fps: number;
  heapUsed: number;
  heapLimit: number;
  longTasks: number;
  lastLongTaskDuration: number;
  audioLatency: number;
  outputLatency: number;
  glitchCount: number;
  lastGlitchTime: number;
}

const SPARKLINE_LENGTH = 60; // 60 seconds of history

export const PerformanceMonitor: React.FC = () => {
  const [data, setData] = useState<PerformanceData>({
    fps: 0,
    heapUsed: 0,
    heapLimit: 0,
    longTasks: 0,
    lastLongTaskDuration: 0,
    audioLatency: 0,
    outputLatency: 0,
    glitchCount: 0,
    lastGlitchTime: 0,
  });

  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const longTaskCount = useRef(0);
  const glitchCount = useRef(0);
  const fpsHistory = useRef<number[]>(new Array(SPARKLINE_LENGTH).fill(0));
  const lastLongTaskAt = useRef(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const sparklineCanvasRef = useRef<HTMLCanvasElement>(null);

  // Draw sparkline
  const drawSparkline = useCallback((history: number[]) => {
    const canvas = sparklineCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const len = history.length;

    ctx.clearRect(0, 0, w, h);

    // Threshold lines
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.2)';
    ctx.setLineDash([2, 3]);
    const y30 = h - (30 / 65) * h;
    ctx.beginPath();
    ctx.moveTo(0, y30);
    ctx.lineTo(w, y30);
    ctx.stroke();
    ctx.setLineDash([]);

    // FPS line
    ctx.beginPath();
    for (let i = 0; i < len; i++) {
      const x = (i / (len - 1)) * w;
      const y = h - (Math.min(history[i], 65) / 65) * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = history[len - 1] >= 55
      ? 'rgba(52, 211, 153, 0.8)'
      : history[len - 1] >= 30
        ? 'rgba(251, 191, 36, 0.8)'
        : 'rgba(244, 63, 94, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Fill under
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = history[len - 1] >= 55
      ? 'rgba(52, 211, 153, 0.05)'
      : history[len - 1] >= 30
        ? 'rgba(251, 191, 36, 0.05)'
        : 'rgba(244, 63, 94, 0.08)';
    ctx.fill();
  }, []);

  useEffect(() => {
    let animId: number;

    const updateFPS = () => {
      frameCount.current++;
      const now = performance.now();
      const elapsed = now - lastTime.current;

      if (elapsed >= 1000) {
        const currentFPS = Math.round((frameCount.current * 1000) / elapsed);

        // Heap memory
        let memoryInfo = { usedJSHeapSize: 0, jsHeapSizeLimit: 0 };
        if ((performance as any).memory) {
          memoryInfo = (performance as any).memory;
        }

        // Audio latency
        let audioLatency = 0;
        let outputLatency = 0;
        try {
          const rawCtx = Tone.getContext().rawContext as AudioContext;
          audioLatency = (rawCtx.baseLatency || 0) * 1000;
          outputLatency = ((rawCtx as any).outputLatency || 0) * 1000;
        } catch {}

        // Glitch detection: FPS drop + recent long task = probable audio glitch
        const recentLongTask = (now - lastLongTaskAt.current) < 1500;
        if (currentFPS < 40 && recentLongTask) {
          glitchCount.current++;
        }

        // Update sparkline history
        fpsHistory.current = [...fpsHistory.current.slice(1), currentFPS];

        setData(prev => ({
          ...prev,
          fps: currentFPS,
          heapUsed: memoryInfo.usedJSHeapSize / (1024 * 1024),
          heapLimit: memoryInfo.jsHeapSizeLimit / (1024 * 1024),
          audioLatency,
          outputLatency,
          glitchCount: glitchCount.current,
          lastGlitchTime: currentFPS < 40 && recentLongTask ? now : prev.lastGlitchTime,
        }));

        if (isExpanded) {
          drawSparkline(fpsHistory.current);
        }

        frameCount.current = 0;
        lastTime.current = now;
      }
      animId = requestAnimationFrame(updateFPS);
    };

    animId = requestAnimationFrame(updateFPS);

    // Long Tasks
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        longTaskCount.current++;
        lastLongTaskAt.current = performance.now();
        setData(prev => ({
          ...prev,
          longTasks: longTaskCount.current,
          lastLongTaskDuration: entry.duration,
        }));
      }
    });

    try {
      observer.observe({ entryTypes: ['longtask'] });
    } catch (e) {
      console.warn('Long Tasks API not supported');
    }

    return () => {
      cancelAnimationFrame(animId);
      observer.disconnect();
    };
  }, [isExpanded, drawSparkline]);

  // Redraw sparkline when expanded
  useEffect(() => {
    if (isExpanded) {
      drawSparkline(fpsHistory.current);
    }
  }, [isExpanded, drawSparkline]);

  const getFPSColor = (fps: number) => {
    if (fps >= 55) return 'text-emerald-400';
    if (fps >= 30) return 'text-amber-400';
    return 'text-rose-500 font-bold animate-pulse';
  };

  const getMemoryColor = (used: number, limit: number) => {
    if (limit === 0) return 'text-slate-400';
    const ratio = used / limit;
    if (ratio < 0.6) return 'text-slate-400';
    if (ratio < 0.8) return 'text-amber-400';
    return 'text-rose-500';
  };

  const getLatencyColor = (ms: number) => {
    if (ms < 10) return 'text-emerald-400';
    if (ms < 25) return 'text-amber-400';
    return 'text-rose-500';
  };

  return (
    <div
      className={`fixed bottom-4 left-4 z-50 transition-all duration-300 ${
        isExpanded ? 'w-72' : 'w-auto'
      }`}
    >
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="bg-black/80 backdrop-blur-md border border-white/10 rounded-lg p-3 cursor-pointer hover:bg-black/90 transition-colors shadow-2xl"
      >
        {/* Collapsed header */}
        <div className="flex items-center gap-3">
          <Activity className={`w-4 h-4 ${getFPSColor(data.fps)}`} />
          <span className={`text-xs font-mono ${getFPSColor(data.fps)}`}>
            {data.fps} FPS
          </span>

          {!isExpanded && data.glitchCount > 0 && (
            <div className="flex items-center gap-1 text-rose-500">
              <AlertTriangle className="w-3 h-3" />
              <span className="text-[10px] font-bold">{data.glitchCount} glitch{data.glitchCount !== 1 && 'es'}</span>
            </div>
          )}

          {!isExpanded && data.longTasks > 0 && data.glitchCount === 0 && (
            <div className="flex items-center gap-1 text-amber-500">
              <Zap className="w-3 h-3" />
              <span className="text-[10px]">{data.longTasks}</span>
            </div>
          )}
        </div>

        {/* Expanded panel */}
        {isExpanded && (
          <div className="mt-4 space-y-3 border-t border-white/5 pt-3 animate-in fade-in slide-in-from-bottom-2">

            {/* FPS Sparkline */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3" /> FPS History</span>
                <span className="text-slate-400">60s</span>
              </div>
              <canvas
                ref={sparklineCanvasRef}
                width={240}
                height={32}
                className="w-full h-8 rounded"
              />
            </div>

            {/* Audio Latency */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                <span className="flex items-center gap-1"><Headphones className="w-3 h-3" /> Audio Latency</span>
                <span className={getLatencyColor(data.audioLatency + data.outputLatency)}>
                  {(data.audioLatency + data.outputLatency).toFixed(1)}ms
                </span>
              </div>
              <div className="flex gap-3 text-[9px] font-mono text-slate-400">
                <span>base: {data.audioLatency.toFixed(1)}ms</span>
                <span>output: {data.outputLatency.toFixed(1)}ms</span>
              </div>
            </div>

            {/* Glitch Detector */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Glitches</span>
                <span className={data.glitchCount > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                  {data.glitchCount > 0 ? `${data.glitchCount} detectado${data.glitchCount !== 1 ? 's' : ''}` : 'limpio'}
                </span>
              </div>
              <div className="text-[9px] text-slate-500 italic">
                FPS {'<'} 40 + Long Task simultáneo = probable drop de audio
              </div>
            </div>

            {/* Memory */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                <span className="flex items-center gap-1"><Cpu className="w-3 h-3" /> Heap Memory</span>
                <span className={getMemoryColor(data.heapUsed, data.heapLimit)}>
                  {Math.round(data.heapUsed)}MB / {Math.round(data.heapLimit)}MB
                </span>
              </div>
              <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500/50 transition-all duration-1000"
                  style={{ width: `${data.heapLimit > 0 ? (data.heapUsed / data.heapLimit) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Long Tasks */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> Long Tasks</span>
                <span className={data.longTasks > 0 ? 'text-rose-400' : 'text-slate-400'}>
                  {data.longTasks} detected
                </span>
              </div>
              {data.lastLongTaskDuration > 0 && (
                <div className="text-[9px] text-rose-500/80 font-mono italic">
                  Last spike: {Math.round(data.lastLongTaskDuration)}ms
                </div>
              )}
            </div>

            <div className="text-[9px] text-slate-600 italic leading-tight">
              * Glitches = FPS drop + bloqueo del hilo principal simultáneos.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
