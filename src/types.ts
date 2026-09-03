export type TimerState = 'idle' | 'running' | 'paused' | 'finished';

export type BuiltInRingtoneId = string;

export interface RingtoneOption {
  id: string;
  name: string;
  url: string;
  description: string;
  category: 'Classic' | 'Emergency' | 'Alert';
}

export interface AppSettings {
  defaultMinutes: number;
  defaultSeconds: number;
  ringtoneId: string;
  customRingtoneName?: string;
  customRingtoneDataUrl?: string; // base64 or object URL
  volume: number; // 0.0 to 1.0
  vibrate: boolean;
  keepScreenAwake: boolean;
  theme: 'dark' | 'light' | 'midnight';
  autoRestart: boolean;
  backgroundTimer: boolean;
  backgroundNotifications: boolean;
}

export interface TimerPreset {
  label: string;
  minutes: number;
  seconds: number;
}
