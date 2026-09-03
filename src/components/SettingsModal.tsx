import React, { useState, useRef } from 'react';
import { X, Volume2, Music, Clock, Smartphone, Play, Upload, Check, Vibrate, SunMedium, ShieldAlert, Bell, Activity } from 'lucide-react';
import { AppSettings, BuiltInRingtoneId } from '../types';
import { BUILT_IN_RINGTONES, soundEngine } from '../utils/sound';
import { requestNotificationPermission, getNotificationPermissionStatus, isNotificationSupported } from '../utils/backgroundTimer';

interface SettingsModalProps {
  settings: AppSettings;
  onSaveSettings: (newSettings: AppSettings) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onSaveSettings,
  onClose,
}) => {
  const [minutes, setMinutes] = useState(settings.defaultMinutes);
  const [seconds, setSeconds] = useState(settings.defaultSeconds);
  const [ringtoneId, setRingtoneId] = useState<BuiltInRingtoneId | 'custom'>(settings.ringtoneId);
  const [customName, setCustomName] = useState<string>(settings.customRingtoneName || '');
  const [customDataUrl, setCustomDataUrl] = useState<string>(settings.customRingtoneDataUrl || '');
  const [volume, setVolume] = useState(settings.volume);
  const [vibrate, setVibrate] = useState(settings.vibrate);
  const [keepScreenAwake, setKeepScreenAwake] = useState(settings.keepScreenAwake);
  const [backgroundTimer, setBackgroundTimer] = useState(settings.backgroundTimer ?? true);
  const [backgroundNotifications, setBackgroundNotifications] = useState(settings.backgroundNotifications ?? true);
  const [notifPermission, setNotifPermission] = useState(getNotificationPermissionStatus());
  const [theme, setTheme] = useState(settings.theme);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleRequestNotif = async () => {
    const granted = await requestNotificationPermission();
    setNotifPermission(getNotificationPermissionStatus());
    if (granted) {
      setBackgroundNotifications(true);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const resultUrl = event.target.result as string;
          setCustomDataUrl(resultUrl);
          setCustomName(file.name);
          setRingtoneId('custom');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePreviewRingtone = (rId: BuiltInRingtoneId | 'custom') => {
    soundEngine.previewSound(rId, customDataUrl, volume);
  };

  const handleSave = () => {
    // Validate bounds
    const safeMins = Math.max(0, Math.min(180, minutes));
    const safeSecs = Math.max(0, Math.min(59, seconds));
    
    // Ensure total duration > 0
    if (safeMins === 0 && safeSecs === 0) {
      alert('Sila tetapkan masa lebih daripada 0 saat.');
      return;
    }

    onSaveSettings({
      defaultMinutes: safeMins,
      defaultSeconds: safeSecs,
      ringtoneId,
      customRingtoneName: customName,
      customRingtoneDataUrl: customDataUrl,
      volume,
      vibrate,
      keepScreenAwake,
      backgroundTimer,
      backgroundNotifications,
      theme,
      autoRestart: false,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl overflow-y-auto">
      <div className="relative w-full max-w-md my-auto bg-[#090d16]/90 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl text-white overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/5 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/10 border border-white/15 text-indigo-300">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Timer Settings</h2>
              <p className="text-xs text-white/50">Customize default duration & alarm audio</p>
            </div>
          </div>
          <button
            onClick={onClose}
            id="close-settings-btn"
            className="p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Section 1: Default Duration */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-semibold text-white/90">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>Custom Default Duration</span>
              </label>
              <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {minutes}m {seconds > 0 ? `${seconds}s` : ''}
              </span>
            </div>

            {/* Quick Preference Buttons (5m, 10m, 15m, 20m, 25m, 30m) */}
            <div className="space-y-1.5">
              <span className="text-xs text-white/40 font-medium">Popular Quick Choices:</span>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[
                  { m: 1, label: '1m' },
                  { m: 5, label: '5m' },
                  { m: 10, label: '10m' },
                  { m: 15, label: '15m' },
                  { m: 20, label: '20m' },
                  { m: 25, label: '25m' },
                  { m: 30, label: '30m' },
                  { m: 45, label: '45m' },
                  { m: 60, label: '60m' },
                ].map((item) => (
                  <button
                    key={item.m}
                    type="button"
                    onClick={() => {
                      setMinutes(item.m);
                      setSeconds(0);
                    }}
                    id={`setting-quick-${item.m}m`}
                    className={`py-1.5 px-2 text-xs font-semibold rounded-xl transition-all border text-center ${
                      minutes === item.m && seconds === 0
                        ? 'bg-emerald-600 border-emerald-400 text-white font-bold shadow-md shadow-emerald-600/30'
                        : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/15 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Exact Custom Inputs with Steppers */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-white/40">Minutes</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setMinutes(Math.max(0, minutes - 1))}
                      className="px-1.5 py-0.5 text-xs bg-white/10 hover:bg-white/20 rounded text-white/80"
                    >
                      -1
                    </button>
                    <button
                      type="button"
                      onClick={() => setMinutes(minutes + 1)}
                      className="px-1.5 py-0.5 text-xs bg-white/10 hover:bg-white/20 rounded text-white/80"
                    >
                      +1
                    </button>
                    <button
                      type="button"
                      onClick={() => setMinutes(minutes + 5)}
                      className="px-1.5 py-0.5 text-xs bg-white/10 hover:bg-white/20 rounded text-white/80"
                    >
                      +5
                    </button>
                  </div>
                </div>
                <input
                  type="number"
                  min="0"
                  max="180"
                  value={minutes}
                  onChange={(e) => setMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                  id="settings-minutes-input"
                  className="w-full bg-transparent text-2xl font-mono font-bold text-white focus:outline-none"
                />
              </div>

              <div className="p-3 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-white/40">Seconds</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setSeconds(Math.max(0, seconds - 5))}
                      className="px-1.5 py-0.5 text-xs bg-white/10 hover:bg-white/20 rounded text-white/80"
                    >
                      -5
                    </button>
                    <button
                      type="button"
                      onClick={() => setSeconds(Math.min(59, seconds + 5))}
                      className="px-1.5 py-0.5 text-xs bg-white/10 hover:bg-white/20 rounded text-white/80"
                    >
                      +5
                    </button>
                  </div>
                </div>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={seconds}
                  onChange={(e) => setSeconds(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                  id="settings-seconds-input"
                  className="w-full bg-transparent text-2xl font-mono font-bold text-white focus:outline-none"
                />
              </div>
            </div>

            <p className="text-xs text-white/50">
              Set your preferred duration (e.g., 20 mins, 5 mins). This will be saved as your default 1-tap start duration.
            </p>
          </div>

          <hr className="border-white/10" />

          {/* Section 2: Ringtone Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-semibold text-white/90">
                <Music className="w-4 h-4 text-indigo-400" />
                <span>Ringtone Sound Selection</span>
              </label>
              <button
                onClick={() => handlePreviewRingtone(ringtoneId)}
                id="preview-ringtone-btn"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-indigo-300 text-xs font-semibold border border-white/15 backdrop-blur-md transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Test Sound</span>
              </button>
            </div>

            {/* Built-in Options */}
            <div className="space-y-2">
              {BUILT_IN_RINGTONES.map((r) => (
                <div
                  key={r.id}
                  onClick={() => setRingtoneId(r.id)}
                  id={`ringtone-opt-${r.id}`}
                  className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer backdrop-blur-md transition-all ${
                    ringtoneId === r.id
                      ? 'bg-indigo-600/30 border-indigo-400 text-white shadow-lg'
                      : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                  }`}
                >
                  <div>
                    <div className="text-sm font-semibold">{r.name}</div>
                    <div className="text-xs text-white/40">{r.description}</div>
                  </div>
                  {ringtoneId === r.id && (
                    <div className="p-1 rounded-full bg-indigo-500 text-white shadow-md">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              ))}

              {/* Custom Audio Option */}
              <div
                onClick={() => {
                  setRingtoneId('custom');
                  if (!customDataUrl) {
                    fileInputRef.current?.click();
                  }
                }}
                id="ringtone-opt-custom"
                className={`p-3 rounded-2xl border cursor-pointer backdrop-blur-md transition-all ${
                  ringtoneId === 'custom'
                    ? 'bg-indigo-600/30 border-indigo-400 text-white shadow-lg'
                    : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-sm font-semibold flex items-center gap-1.5">
                      <span>Upload Custom Audio</span>
                    </div>
                    <div className="text-xs text-white/40">
                      {customName ? `File: ${customName}` : 'Select an MP3 or WAV audio file'}
                    </div>
                  </div>
                  {ringtoneId === 'custom' && (
                    <div className="p-1 rounded-full bg-indigo-500 text-white shadow-md">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="custom-audio-file-input"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    id="upload-audio-btn"
                    className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-xs text-white border border-white/15"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{customName ? 'Change Audio File' : 'Select Audio File'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <hr className="border-white/10" />

          {/* Section 3: Volume */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-emerald-400" />
                <span>Sound Volume</span>
              </span>
              <span className="font-mono text-xs text-white/50">{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="1.0"
              step="0.05"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              id="volume-slider"
              className="w-full accent-indigo-400 bg-white/10 h-2 rounded-lg cursor-pointer"
            />
          </div>

          <hr className="border-white/10" />

          {/* Section 4: Mobile & Background Features */}
          <div className="space-y-3">
            <div className="text-sm font-semibold text-white/90">Latar Belakang & Peranti (Background & Device)</div>

            {/* Background Timer */}
            <div className="flex items-start justify-between p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 backdrop-blur-md">
              <div className="flex items-start gap-3 pr-2">
                <div className="p-1.5 rounded-xl bg-indigo-500/20 text-indigo-400 mt-0.5">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">Teruskan di Latar Belakang (Background Timer)</div>
                  <div className="text-xs text-white/60 mt-0.5 leading-relaxed">
                    Masa kekal tepat dan terus berjalan walaupun anda bertukar ke aplikasi lain atau tab diminimumkan.
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={backgroundTimer}
                onChange={(e) => setBackgroundTimer(e.target.checked)}
                id="background-timer-toggle"
                className="w-5 h-5 accent-indigo-500 rounded cursor-pointer mt-1"
              />
            </div>

            {/* Background Notifications */}
            <div className="flex items-start justify-between p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <div className="flex items-start gap-3 pr-2">
                <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400 mt-0.5">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white/90">Notifikasi Masa Tamat</div>
                  <div className="text-xs text-white/50 mt-0.5 leading-relaxed">
                    Hantar amaran notifikasi pada skrin peranti apabila masa tamat semasa membuka aplikasi lain.
                  </div>
                  {isNotificationSupported() && notifPermission !== 'granted' && (
                    <button
                      type="button"
                      onClick={handleRequestNotif}
                      className="mt-2 text-[11px] font-medium text-amber-300 hover:text-amber-200 underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Aktifkan kebenaran notifikasi pelayar</span>
                    </button>
                  )}
                  {isNotificationSupported() && notifPermission === 'granted' && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium mt-1.5">
                      <Check className="w-3 h-3" /> Notifikasi aktif
                    </span>
                  )}
                </div>
              </div>
              <input
                type="checkbox"
                checked={backgroundNotifications}
                onChange={(e) => {
                  const val = e.target.checked;
                  setBackgroundNotifications(val);
                  if (val && notifPermission !== 'granted') {
                    handleRequestNotif();
                  }
                }}
                id="background-notif-toggle"
                className="w-5 h-5 accent-indigo-500 rounded cursor-pointer mt-1"
              />
            </div>

            {/* Vibrate */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                <Vibrate className="w-4 h-4 text-rose-400" />
                <div>
                  <div className="text-sm font-medium text-white/90">Vibration Alert</div>
                  <div className="text-xs text-white/40">Vibrate device when timer expires</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={vibrate}
                onChange={(e) => setVibrate(e.target.checked)}
                id="vibrate-toggle"
                className="w-5 h-5 accent-indigo-500 rounded cursor-pointer"
              />
            </div>

            {/* Screen Wake Lock */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                <Smartphone className="w-4 h-4 text-sky-400" />
                <div>
                  <div className="text-sm font-medium text-white/90">Keep Screen Awake</div>
                  <div className="text-xs text-white/40">Prevent screen from dimming while countdown is active</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={keepScreenAwake}
                onChange={(e) => setKeepScreenAwake(e.target.checked)}
                id="wake-lock-toggle"
                className="w-5 h-5 accent-indigo-500 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-white/10 bg-white/5 backdrop-blur-md">
          <button
            onClick={onClose}
            id="cancel-settings-btn"
            className="px-4 py-2.5 rounded-xl text-white/50 hover:text-white text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            id="save-settings-btn"
            className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-sm font-semibold shadow-xl shadow-indigo-600/30 transition-all border border-indigo-400/30"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};
