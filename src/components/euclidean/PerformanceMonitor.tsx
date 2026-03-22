import React, { useEffect, useState, useRef } from 'react';
import { Activity, Cpu, Zap, AlertTriangle } from 'lucide-react';

interface PerformanceData {
  fps: number;
  heapUsed: number;
  heapLimit: number;
  longTasks: number;
  lastLongTaskDuration: number;
}

export const PerformanceMonitor: React.FC = () => {
  const [data, setData] = useState<PerformanceData>({
    fps: 0,
    heapUsed: 0,
    heapLimit: 0,
    longTasks: 0,
    lastLongTaskDuration: 0,
  });

  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const longTaskCount = useRef(0);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // 1. FPS Calculation
    const updateFPS = () => {
      frameCount.current++;
      const now = performance.now();
      const elapsed = now - lastTime.current;

      if (elapsed >= 1000) {
        const currentFPS = Math.round((frameCount.current * 1000) / elapsed);
        
        // 2. Heap Memory (Chrome/Edge only)
        let memoryInfo = { usedJSHeapSize: 0, jsHeapSizeLimit: 0 };
        if ((performance as any).memory) {
          memoryInfo = (performance as any).memory;
        }

        setData(prev => ({
          ...prev,
          fps: currentFPS,
          heapUsed: memoryInfo.usedJSHeapSize / (1024 * 1024),
          heapLimit: memoryInfo.jsHeapSizeLimit / (1024 * 1024),
        }));

        frameCount.current = 0;
        lastTime.current = now;
      }
      requestAnimationFrame(updateFPS);
    };

    const animId = requestAnimationFrame(updateFPS);

    // 3. Long Tasks Detection (The "Real Lag" detector)
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        longTaskCount.current++;
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
      console.warn('Long Tasks API not supported in this browser');
    }

    return () => {
      cancelAnimationFrame(animId);
      observer.disconnect();
    };
  }, []);

  const getFPSColor = (fps: number) => {
    if (fps >= 55) return 'text-emerald-400';
    if (fps >= 30) return 'text-amber-400';
    return 'text-rose-500 font-bold animate-pulse';
  };

  const getMemoryColor = (used: number, limit: number) => {
    const ratio = used / limit;
    if (ratio < 0.6) return 'text-slate-400';
    if (ratio < 0.8) return 'text-amber-400';
    return 'text-rose-500';
  };

  return (
    <div 
      className={`fixed bottom-4 left-4 z-50 transition-all duration-300 ${
        isExpanded ? 'w-64' : 'w-auto'
      }`}
    >
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="bg-black/80 backdrop-blur-md border border-white/10 rounded-lg p-3 cursor-pointer hover:bg-black/90 transition-colors shadow-2xl"
      >
        <div className="flex items-center gap-3">
          <Activity className={`w-4 h-4 ${getFPSColor(data.fps)}`} />
          <span className={`text-xs font-mono ${getFPSColor(data.fps)}`}>
            {data.fps} FPS
          </span>
          
          {!isExpanded && data.longTasks > 0 && (
            <div className="flex items-center gap-1 text-rose-500">
              <AlertTriangle className="w-3 h-3" />
              <span className="text-[10px] font-bold">{data.longTasks}</span>
            </div>
          )}
        </div>

        {isExpanded && (
          <div className="mt-4 space-y-3 border-t border-white/5 pt-3 animate-in fade-in slide-in-from-bottom-2">
            {/* Memory Section */}
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
                  style={{ width: `${(data.heapUsed / data.heapLimit) * 100}%` }}
                />
              </div>
            </div>

            {/* Long Tasks Section */}
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
              * Long Tasks detectan bloqueos del hilo principal {'>'} 50ms.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
