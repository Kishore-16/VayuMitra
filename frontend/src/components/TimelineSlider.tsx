import React, { useEffect } from "react";
import { Play, Pause, RotateCcw, Clock, Moon, Sun } from "lucide-react";
import type { HourlyForecastPoint } from "../types";

interface TimelineSliderProps {
  forecast: HourlyForecastPoint[];
  currentHour: number;
  onHourChange: (hour: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  playbackSpeed: number;
  onSpeedChange: (speed: number) => void;
}

export const TimelineSlider: React.FC<TimelineSliderProps> = ({
  forecast,
  currentHour,
  onHourChange,
  isPlaying,
  onTogglePlay,
  playbackSpeed,
  onSpeedChange
}) => {
  useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      interval = setInterval(() => {
        onHourChange(currentHour >= forecast.length - 1 ? 0 : currentHour + 1);
      }, 1200 / playbackSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, forecast.length, currentHour, onHourChange]);

  const activePoint = forecast[currentHour] || forecast[0];

  const formatTimestamp = (isoStr: string) => {
    if (!isoStr) return "";
    try {
      const d = new Date(isoStr);
      return d.toLocaleString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      });
    } catch {
      return isoStr;
    }
  };

  const isNight = activePoint ? activePoint.inversion_layer_active : false;

  return (
    <div className="p-4 rounded-xl glass-panel border border-slate-800/90 shadow-xl">
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 mb-3">
        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onTogglePlay}
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-md shadow-cyan-500/20 transition active:scale-95"
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>
          <button
            onClick={() => onHourChange(0)}
            title="Reset to Hour 0"
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          
          {/* Speed Buttons */}
          <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-lg p-0.5 text-xs font-semibold">
            {[1, 2, 4].map((speed) => (
              <button
                key={speed}
                onClick={() => onSpeedChange(speed)}
                className={`px-2 py-1 rounded ${
                  playbackSpeed === speed
                    ? "bg-cyan-500/20 text-cyan-300 font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>

          {/* Quick Jump Buttons */}
          <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-400">
            {[6, 12, 24, 48, 71].map((h) => (
              <button
                key={h}
                onClick={() => onHourChange(h)}
                className={`px-2 py-0.5 rounded border border-slate-800 hover:border-slate-700 ${
                  currentHour === h ? "bg-indigo-600 text-white border-indigo-500" : "bg-slate-900/60"
                }`}
              >
                +{h}h
              </button>
            ))}
          </div>
        </div>

        {/* Current Time Display Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs font-medium">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-white font-bold">{formatTimestamp(activePoint?.timestamp)}</span>
            <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 text-[10px] font-bold">
              +{currentHour}h Ahead
            </span>
          </div>

          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold ${
            isNight 
              ? "bg-indigo-950/80 text-indigo-300 border border-indigo-800/60" 
              : "bg-amber-950/80 text-amber-300 border border-amber-800/60"
          }`}>
            {isNight ? <Moon className="w-3.5 h-3.5 text-indigo-400" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
            <span>{isNight ? "Night Inversion Trap" : "Day Convective Mix"}</span>
          </div>
        </div>
      </div>

      {/* Scrubber Range Input */}
      <div className="relative flex items-center">
        <input
          type="range"
          min="0"
          max={Math.max(0, forecast.length - 1)}
          value={currentHour}
          onChange={(e) => onHourChange(Number(e.target.value))}
          className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
        />
      </div>

      {/* 72h Timeline Ticks */}
      <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono mt-2">
        <span>0h (Now)</span>
        <span>+12h</span>
        <span>+24h (Day 1)</span>
        <span>+36h</span>
        <span>+48h (Day 2)</span>
        <span>+60h</span>
        <span>+72h (Day 3)</span>
      </div>
    </div>
  );
};
