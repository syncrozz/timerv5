import { RingtoneOption } from '../types';

export const BUILT_IN_RINGTONES: RingtoneOption[] = [
  {
    id: 'digital',
    name: 'Loud Digital Alarm',
    url: 'https://assets.syncrozz.com/ring_tone/alarm/Alarm%20Jam%20Loceng%20Digital.mp3',
    description: 'Classic loud digital alarm clock ringing',
    category: 'Classic',
  },
  {
    id: 'siren',
    name: 'Emergency Siren Alarm',
    url: 'https://assets.syncrozz.com/ring_tone/alarm/Alarm%20Emergency%201.mp3',
    description: 'High-pitched emergency warning siren',
    category: 'Emergency',
  },
  {
    id: 'buzzer',
    name: 'Electric Clock Buzzer',
    url: 'https://assets.syncrozz.com/ring_tone/alarm/Alarm%20Buzzer%20BioHazard.mp3',
    description: 'Sharp loud electric clock buzzer',
    category: 'Classic',
  },
  {
    id: 'twin-bell',
    name: 'Classic Twin Bell',
    url: 'https://assets.syncrozz.com/ring_tone/alarm/Alarm%20Jam%20Loceng%20Style%20Lama.mp3',
    description: 'Loud ringing twin alarm bell hammer',
    category: 'Classic',
  },
  {
    id: 'facility-emergency',
    name: 'Facility Emergency',
    url: 'https://assets.syncrozz.com/ring_tone/alarm/Alarm%20Facility%20Emergency.wav',
    description: 'Facility level alarm warning tone',
    category: 'Emergency',
  },
  {
    id: 'cyber-alert',
    name: 'Cyber Alert',
    url: 'https://assets.syncrozz.com/ring_tone/alarm/Alarm%20Cyber%20Alert.mp3',
    description: 'Futuristic electronic cyber alert',
    category: 'Alert',
  },
  {
    id: 'robot-siren',
    name: 'Robot Siren',
    url: 'https://assets.syncrozz.com/ring_tone/alarm/Alarm%20Robot%20Siren.mp3',
    description: 'Oscillating robot siren alert',
    category: 'Alert',
  },
  {
    id: 'nuclear-alert',
    name: 'Nuclear Alert',
    url: 'https://assets.syncrozz.com/ring_tone/alarm/Alarm%20Nuclear%20Alert%20Hazard.mp3',
    description: 'Urgent nuclear hazard warning siren',
    category: 'Emergency',
  },
  {
    id: 'timer-complete',
    name: 'Timer Complete',
    url: 'https://assets.syncrozz.com/ring_tone/alarm/Alarm%20Timer%20Time%20untuk%20Stop.wav',
    description: 'Notification signal for timer completion',
    category: 'Alert',
  },
];

class SoundEngine {
  private currentAudio: HTMLAudioElement | null = null;
  private audioContext: AudioContext | null = null;
  private fallbackOscInterval: number | null = null;

  /**
   * Unlocks AudioContext upon user gesture (tap/click)
   */
  public unlockAudio() {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx && !this.audioContext) {
        this.audioContext = new AudioCtx();
      }
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
    } catch (e) {
      console.warn('AudioContext unlock note:', e);
    }
  }

  /**
   * Plays a synthesized urgent beep pattern using Web Audio oscillator
   * as a robust fallback if HTMLAudioElement is blocked by browser policies.
   */
  public startFallbackBeep(volume = 0.8) {
    this.stopFallbackBeep();
    try {
      this.unlockAudio();
      if (!this.audioContext) return;

      const playTone = () => {
        if (!this.audioContext || this.audioContext.state === 'closed') return;
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, this.audioContext.currentTime); // A5
        osc.frequency.setValueAtTime(1046.5, this.audioContext.currentTime + 0.15); // C6
        gain.gain.setValueAtTime(Math.min(1, volume * 0.5), this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        osc.start();
        osc.stop(this.audioContext.currentTime + 0.35);
      };

      playTone();
      this.fallbackOscInterval = window.setInterval(playTone, 800);
    } catch (err) {
      console.warn('Fallback beep failed:', err);
    }
  }

  public stopFallbackBeep() {
    if (this.fallbackOscInterval) {
      clearInterval(this.fallbackOscInterval);
      this.fallbackOscInterval = null;
    }
  }

  /**
   * Helper to resolve audio URL from ringtoneId or customDataUrl
   */
  public getAudioUrl(ringtoneId: string, customDataUrl?: string): string {
    if (ringtoneId === 'custom' && customDataUrl) {
      return customDataUrl;
    }
    const found = BUILT_IN_RINGTONES.find((r) => r.id === ringtoneId);
    if (found) {
      return found.url;
    }
    // Fallback to first ringtone URL if not found
    return BUILT_IN_RINGTONES[0].url;
  }

  /**
   * Stops any currently playing audio immediately.
   */
  public stop() {
    this.stopFallbackBeep();
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch (e) {
        console.warn('Error stopping current audio:', e);
      }
      this.currentAudio = null;
    }
  }

  /**
   * Plays selected alarm sound on loop when timer finishes.
   */
  public playAlarm(
    ringtoneId: string,
    customDataUrl?: string,
    volume = 0.8
  ) {
    this.stop();

    const url = this.getAudioUrl(ringtoneId, customDataUrl);
    if (!url) {
      this.startFallbackBeep(volume);
      return;
    }

    try {
      const audio = new Audio(url);
      audio.loop = true;
      audio.volume = Math.max(0, Math.min(1, volume));
      
      this.currentAudio = audio;

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Audio alarm playback failed/blocked by browser, starting fallback synth beep:', err);
          this.startFallbackBeep(volume);
        });
      }
    } catch (err) {
      console.error('Failed to instantiate Audio for alarm, starting fallback:', err);
      this.startFallbackBeep(volume);
    }
  }

  /**
   * Plays a single test sample of the selected sound when clicking "Test Sound".
   */
  public previewSound(
    ringtoneId: string,
    customDataUrl?: string,
    volume = 0.8
  ) {
    this.stop();

    const url = this.getAudioUrl(ringtoneId, customDataUrl);
    if (!url) return;

    try {
      const audio = new Audio(url);
      audio.loop = false;
      audio.volume = Math.max(0, Math.min(1, volume));

      this.currentAudio = audio;

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Audio preview playback failed/blocked:', err);
        });
      }
    } catch (err) {
      console.error('Failed to instantiate Audio for preview:', err);
    }
  }

  /**
   * Triggers device vibration if supported.
   */
  public vibrate(pattern: number | number[] = [500, 250, 500, 250]) {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (err) {
        // Vibrate not supported or allowed
      }
    }
  }

  /**
   * Stops device vibration.
   */
  public stopVibration() {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(0);
      } catch (err) {
        // ignore
      }
    }
  }
}

export const soundEngine = new SoundEngine();
