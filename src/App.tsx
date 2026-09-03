import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import { AppSettings, TimerState } from './types';
import { BUILT_IN_RINGTONES, soundEngine } from './utils/sound';
import { backgroundTimer, requestNotificationPermission, sendTimerNotification } from './utils/backgroundTimer';
import { TimerDisplay } from './components/TimerDisplay';
import { PresetsBar } from './components/PresetsBar';
import { SettingsModal } from './components/SettingsModal';
import { AlarmScreen } from './components/AlarmScreen';
import { SupportPage } from './components/SupportPage';

const DEFAULT_SETTINGS: AppSettings = {
  defaultMinutes: 5,
  defaultSeconds: 0,
  ringtoneId: 'digital',
  volume: 0.8,
  vibrate: true,
  keepScreenAwake: true,
  backgroundTimer: true,
  backgroundNotifications: true,
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
  const [isSupportOpen, setIsSupportOpen] = useState(() => {
    return typeof window !== 'undefined' && window.location.hash === '#support';
  });

  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const endTimeRef = useRef<number | null>(null);

  // Restore running timer from localStorage if page was refreshed or restored after background swap
  useEffect(() => {
    try {
      const savedEndTime = localStorage.getItem('pemasa_target_end_time');
      const savedState = localStorage.getItem('pemasa_timer_state');
      const savedTotal = localStorage.getItem('pemasa_total_duration');

      if (savedTotal) {
        const parsedTotal = parseInt(savedTotal, 10);
        if (!isNaN(parsedTotal) && parsedTotal > 0) {
          setTotalDurationSeconds(parsedTotal);
        }
      }

      if (savedState === 'running' && savedEndTime) {
        const end = parseInt(savedEndTime, 10);
        if (!isNaN(end)) {
          const remaining = Math.max(0, Math.ceil((end - Date.now()) / 1000));
          if (remaining > 0) {
            endTimeRef.current = end;
            setTimeLeftSeconds(remaining);
            setTimerState('running');
          } else {
            // Time expired while away
            setTimeLeftSeconds(0);
            setTimerState('finished');
            soundEngine.playAlarm(
              settings.ringtoneId,
              settings.customRingtoneDataUrl,
              settings.volume
            );
            if (settings.vibrate) {
              soundEngine.vibrate([600, 300, 600, 300, 600]);
            }
          }
        }
      }
    } catch (e) {
      console.warn('Failed to restore active timer:', e);
    }
  }, [settings.ringtoneId, settings.customRingtoneDataUrl, settings.volume, settings.vibrate]);

  // Keep browser tab title synchronized with countdown
  useEffect(() => {
    if (timerState === 'running') {
      const mins = Math.floor(timeLeftSeconds / 60);
      const secs = timeLeftSeconds % 60;
      const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      document.title = `${timeStr} - One Tap Timer`;
    } else if (timerState === 'finished') {
      document.title = '⏰ Masa Tamat! - One Tap Timer';
    } else if (timerState === 'paused') {
      document.title = '⏸️ Dijeda - One Tap Timer';
    } else {
      document.title = 'One Tap Timer';
    }
  }, [timerState, timeLeftSeconds]);

  useEffect(() => {
    const handleHashChange = () => {
      setIsSupportOpen(window.location.hash === '#support');
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const handleNavigateToSupport = () => {
    window.location.hash = 'support';
    setIsSupportOpen(true);
  };

  const handleReturnFromSupport = () => {
    if (window.location.hash === '#support') {
      window.history.pushState(null, '', window.location.pathname + window.location.search);
    }
    setIsSupportOpen(false);
  };

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

  const startTimer = useCallback((secondsToRun: number) => {
    soundEngine.unlockAudio();
    if (settings.backgroundNotifications) {
      requestNotificationPermission().catch(() => {});
    }

    const end = Date.now() + secondsToRun * 1000;
    endTimeRef.current = end;
    try {
      localStorage.setItem('pemasa_target_end_time', String(end));
      localStorage.setItem('pemasa_total_duration', String(totalDurationSeconds));
      localStorage.setItem('pemasa_timer_state', 'running');
    } catch {}

    setTimerState('running');
  }, [settings.backgroundNotifications, totalDurationSeconds]);

  const pauseTimer = useCallback(() => {
    if (endTimeRef.current !== null) {
      const remaining = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
      setTimeLeftSeconds(remaining);
    }
    endTimeRef.current = null;
    try {
      localStorage.removeItem('pemasa_target_end_time');
      localStorage.setItem('pemasa_timer_state', 'paused');
    } catch {}
    setTimerState('paused');
  }, []);

  // Main countdown engine (Web Worker + timestamp-based delta calculations)
  useEffect(() => {
    if (timerState !== 'running' || endTimeRef.current === null) {
      backgroundTimer.stop();
      releaseWakeLock();
      return;
    }

    requestWakeLock();

    const checkTimeRemaining = () => {
      if (endTimeRef.current === null) return;
      const now = Date.now();
      const remainingMs = endTimeRef.current - now;
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));

      setTimeLeftSeconds(remainingSec);

      if (remainingMs <= 0) {
        endTimeRef.current = null;
        try {
          localStorage.removeItem('pemasa_target_end_time');
          localStorage.setItem('pemasa_timer_state', 'finished');
        } catch {}

        setTimerState('finished');
        releaseWakeLock();
        backgroundTimer.stop();

        soundEngine.playAlarm(
          settings.ringtoneId,
          settings.customRingtoneDataUrl,
          settings.volume
        );

        if (settings.vibrate) {
          soundEngine.vibrate([600, 300, 600, 300, 600]);
        }

        if (settings.backgroundNotifications) {
          sendTimerNotification('One Tap Timer', '⏰ Masa telah tamat! Jam penggera sedang berbunyi.');
        }
      }
    };

    // Immediate check
    checkTimeRemaining();

    // Start background Web Worker timer (runs even when tab is backgrounded)
    backgroundTimer.start(checkTimeRemaining);

    // Fallback interval on main thread
    const fallbackInterval = window.setInterval(checkTimeRemaining, 250);

    // Reconcile immediately upon tab swap, app focus, or visibility change
    const onVisibilityChange = () => {
      if (!settings.backgroundTimer && document.hidden && timerState === 'running') {
        pauseTimer();
      } else {
        checkTimeRemaining();
        if (document.visibilityState === 'visible') {
          requestWakeLock();
        }
      }
    };

    const onWindowFocus = () => {
      checkTimeRemaining();
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onWindowFocus);
    window.addEventListener('pageshow', onWindowFocus);

    return () => {
      backgroundTimer.stop();
      if (fallbackInterval) clearInterval(fallbackInterval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onWindowFocus);
      window.removeEventListener('pageshow', onWindowFocus);
    };
  }, [timerState, settings, requestWakeLock, releaseWakeLock, pauseTimer]);

  const handleMainTap = () => {
    if (settings.vibrate) {
      soundEngine.vibrate(30);
    }

    if (timerState === 'idle') {
      startTimer(totalDurationSeconds);
    } else if (timerState === 'running') {
      pauseTimer();
    } else if (timerState === 'paused') {
      startTimer(timeLeftSeconds);
    } else if (timerState === 'finished') {
      handleStopAlarm();
    }
  };

  const handleReset = () => {
    soundEngine.stop();
    soundEngine.stopVibration();
    endTimeRef.current = null;
    try {
      localStorage.removeItem('pemasa_target_end_time');
      localStorage.removeItem('pemasa_timer_state');
    } catch {}
    setTimerState('idle');
    setTimeLeftSeconds(totalDurationSeconds);
  };

  const handleStopAlarm = () => {
    soundEngine.stop();
    soundEngine.stopVibration();
    endTimeRef.current = null;
    try {
      localStorage.removeItem('pemasa_target_end_time');
      localStorage.removeItem('pemasa_timer_state');
    } catch {}
    setTimerState('idle');
    setTimeLeftSeconds(totalDurationSeconds);
  };

  const handleRestartTimer = () => {
    soundEngine.stop();
    soundEngine.stopVibration();
    setTimeLeftSeconds(totalDurationSeconds);
    startTimer(totalDurationSeconds);
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

  if (isSupportOpen) {
    return <SupportPage onReturn={handleReturnFromSupport} appName="One Tap Timer" />;
  }

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
          className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/5 hover:bg-white/15 backdrop-blur-md active:scale-95 text-white/90 border border-white/10 shadow-xl transition-all cursor-pointer"
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

      {/* Footer */}
      <footer className="w-full max-w-lg mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3.5 text-center sm:text-left z-10">
        {/* Minimal & Understated Support CTA */}
        <a
          href="https://syncrozz.com/#support"
          onClick={(e) => {
            e.preventDefault();
            handleNavigateToSupport();
          }}
          id="footer-support-cta-btn"
          className="inline-flex items-center justify-center px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 text-white/50 hover:text-white/80 text-[11px] font-normal border border-white/5 hover:border-white/15 backdrop-blur-sm transition-all cursor-pointer group"
        >
          <span>Sokong Inovasi Ini ❤️</span>
        </a>

        {/* Developer Credit */}
        <p className="text-xs text-white/50 font-normal">
          Develop By{' '}
          <a
            href="https://wasap.my/60145313756"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/80 hover:text-indigo-300 font-semibold underline underline-offset-2 transition-colors cursor-pointer"
          >
            Syncrozz
          </a>
        </p>
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
