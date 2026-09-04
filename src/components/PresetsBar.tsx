import React, { useState } from 'react';
import { TimerPreset } from '../types';
import { Clock, ChevronDown, ChevronUp } from 'lucide-react';

interface PresetsBarProps {
  currentMinutes: number;
  currentSeconds: number;
  onSelectPreset: (mins: number, secs: number) => void;
  disabled: boolean;
}

const PRESETS: TimerPreset[] = [
  { label: '3 Minutes', minutes: 3, seconds: 0 },
  { label: '5 Minutes', minutes: 5, seconds: 0 },
  { label: '9 Minutes', minutes: 9, seconds: 0 },
  { label: '10 Minutes', minutes: 10, seconds: 0 },
  { label: '15 Minutes', minutes: 15, seconds: 0 },
  { label: '20 Minutes', minutes: 20, seconds: 0 },
  { label: '25 Minutes', minutes: 25, seconds: 0 },
  { label: '30 Minutes', minutes: 30, seconds: 0 },
];

export const PresetsBar: React.FC<PresetsBarProps> = ({
  currentMinutes,
  currentSeconds,
  onSelectPreset,
  disabled,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="w-full max-w-md mx-auto mt-6 px-4 flex flex-col items-center">
      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        id="toggle-presets-btn"
        className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md text-xs font-semibold text-white/70 hover:text-white transition-all active:scale-95 shadow-md"
      >
        <Clock className="w-3.5 h-3.5 text-indigo-400" />
        <span>Quick Presets</span>
        {isExpanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-white/50" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-white/50" />
        )}
      </button>

      {/* Expandable Preset Options */}
      {isExpanded && (
        <div className="w-full grid grid-cols-3 sm:grid-cols-6 gap-2 mt-3 p-3 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl animate-fadeIn">
          {PRESETS.map((p) => {
            const isSelected = currentMinutes === p.minutes && currentSeconds === p.seconds;
            return (
              <button
                key={`${p.minutes}-${p.seconds}`}
                onClick={() => {
                  onSelectPreset(p.minutes, p.seconds);
                  setIsExpanded(false);
                }}
                disabled={disabled}
                id={`preset-btn-${p.minutes}m`}
                className={`py-2 px-2 text-xs font-semibold rounded-2xl transition-all border text-center backdrop-blur-md ${
                  isSelected
                    ? 'bg-indigo-600/80 border-indigo-400 text-white font-bold shadow-lg shadow-indigo-600/30'
                    : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/15 hover:text-white'
                } ${disabled ? 'opacity-40 cursor-not-allowed' : 'active:scale-95'}`}
              >
                {p.minutes} Min
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
