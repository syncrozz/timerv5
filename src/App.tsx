import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import { AppSettings, TimerState } from './types';
import { BUILT_IN_RINGTONES, soundEngine } from './utils/sound';
import { TimerDisplay } from './components/TimerDisplay';
import { PresetsBar } from './components/PresetsBar';
import { SettingsModal } from './components/SettingsModal';
import { AlarmScreen } from './components/AlarmScreen';

const DEFAULT_SETTINGS: AppSettings = {
  defaultMinutes: 5,
  defaultSeconds: 0,
  ringtoneId: 'digital',
  volume: 0.8,
  vibrate: true,
  keepScreenAwake: true,
  theme: 'dark',
  autoRestart: false,
};

const STORAGE_KEY = 'pemasa_1tap_settings';

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to load settings:', e);
    }
    return DEFAULT_SETTINGS;
  });

  const defaultTotalSeconds = settings.defaultMinutes * 60 + settings.defaultSeconds;

  const [totalDurationSeconds, setTotalDurationSeconds] = useState(defaultTotalSeconds);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(defaultTotalSeconds);
  const [timerState, setTimerState] = useState<TimerState>('idle');
  const [showSettings, setShowSettings] = useState(false);

  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
    } catch (e) {
      console.error('Failed to save settings:', e);
    }

    if (timerState === 'idle') {
      const newTotal = newSettings.defaultMinutes * 60 + newSettings.defaultSeconds;
      setTotalDurationSeconds(newTotal);
      setTimeLeftSeconds(newTotal);
    }
  };

  const requestWakeLock = useCallback(async () => {
    if (settings.keepScreenAwake && 'wakeLock' in navigator) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      } catch (err) {
        console.warn('Screen wake lock failed:', err);
      }
    }
  }, [settings.keepScreenAwake]);

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(console.warn);
      wakeLockRef.current = null;
    }
  }, []);

  useEffect(() => {
    let interval: number | null = null;

    if (timerState === 'running') {
      requestWakeLock();

      interval = window.setInterval(() => {
        setTimeLeftSeconds((prev) => {
          if (prev <= 1) {
            setTimerState('finished');
            releaseWakeLock();

            soundEngine.playAlarm(
              settings.ringtoneId,
              settings.customRingtoneDataUrl,
              settings.volume
            );

            if (settings.vibrate) {
              soundEngine.vibrate([600, 300, 600, 300, 600]);
            }

            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      releaseWakeLock();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerState, settings, requestWakeLock, releaseWakeLock]);

  const handleMainTap = () => {
    if (settings.vibrate) {
      soundEngine.vibrate(30);
    }

    if (timerState === 'idle') {
      setTimerState('running');
    } else if (timerState === 'running') {
      setTimerState('paused');
    } else if (timerState === 'paused') {
      setTimerState('running');
    } else if (timerState === 'finished') {
      handleStopAlarm();
    }
  };

  const handleReset = () => {
    soundEngine.stop();
    soundEngine.stopVibration();
    setTimerState('idle');
    setTimeLeftSeconds(totalDurationSeconds);
  };

  const handleStopAlarm = () => {
    soundEngine.stop();
    soundEngine.stopVibration();
    setTimerState('idle');
    setTimeLeftSeconds(totalDurationSeconds);
  };

  const handleRestartTimer = () => {
    soundEngine.stop();
    soundEngine.stopVibration();
    setTimeLeftSeconds(totalDurationSeconds);
    setTimerState('running');
  };

  const handleSelectPreset = (mins: number, secs: number) => {
    if (timerState !== 'idle') return;
    const newTotal = mins * 60 + secs;
    setTotalDurationSeconds(newTotal);
    setTimeLeftSeconds(newTotal);
  };

  const getRingtoneDisplayName = () => {
    if (settings.ringtoneId === 'custom') {
      return settings.customRingtoneName || 'Custom Audio';
    }
    const found = BUILT_IN_RINGTONES.find((r) => r.id === settings.ringtoneId);
    return found ? found.name : BUILT_IN_RINGTONES[0].name;
  };

  return (
    <div className="min-h-screen bg-[#030712] text-white flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Ambient Glass Lighting */}
      <div className="absolute top-[-10%] left-[-10%] w-[55%] h-[55%] bg-indigo-600/30 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[20%] right-[10%] w-[35%] h-[35%] bg-blue-500/20 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="w-full max-w-lg mx-auto px-6 pt-6 pb-2 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/15 overflow-hidden shadow-xl flex items-center justify-center p-0.5">
            <img
              src="https://raw.githubusercontent.com/syncrozz/syncrozz-assets/main/logo/OneTapTimer/android-chrome-192x192.png"
              alt="One Tap Timer"
              className="w-full h-full object-contain rounded-xl"
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-white">
            One Tap Timer
          </h1>
        </div>

        <button
          onClick={() => setShowSettings(true)}
          id="open-settings-btn"
          className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/5 hover:bg-white/15 backdrop-blur-md active:scale-95 text-white/90 border border-white/10 shadow-xl transition-all"
        >
          <SettingsIcon className="w-4 h-4 text-indigo-300" />
          <span className="text-xs font-semibold">Settings</span>
        </button>
      </header>

      {/* Main Focus Canvas */}
      <main className="w-full max-w-lg mx-auto flex-1 flex flex-col items-center justify-center py-4 z-10">
        <TimerDisplay
          timeLeftSeconds={timeLeftSeconds}
          totalDurationSeconds={totalDurationSeconds}
          timerState={timerState}
          onMainTap={handleMainTap}
          onReset={handleReset}
          ringtoneName={getRingtoneDisplayName()}
        />

        <PresetsBar
          currentMinutes={Math.floor(totalDurationSeconds / 60)}
          currentSeconds={totalDurationSeconds % 60}
          onSelectPreset={handleSelectPreset}
          disabled={timerState !== 'idle'}
        />
      </main>

      {/* Minimal Footer */}
      <footer className="w-full max-w-lg mx-auto px-6 py-4 text-center z-10">
        <a
          href="https://wasap.my/60145313756"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-white/40 hover:text-indigo-300 font-medium transition-colors"
        >
          By Syncrozz
        </a>
      </footer>

      {showSettings && (
        <SettingsModal
          settings={settings}
          onSaveSettings={handleSaveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {timerState === 'finished' && (
        <AlarmScreen
          onStopAlarm={handleStopAlarm}
          onRestartTimer={handleRestartTimer}
          ringtoneName={getRingtoneDisplayName()}
          defaultMinutes={settings.defaultMinutes}
        />
      )}
    </div>
  );
}
