/**
 * Background Timer Service
 * Uses Web Worker to prevent browser throttling when the tab is backgrounded
 * or when the user switches to other applications.
 */

class BackgroundTimerService {
  private worker: Worker | null = null;
  private onTickCallback: (() => void) | null = null;

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    try {
      const workerCode = `
        let timerId = null;
        self.onmessage = function(e) {
          if (e.data && e.data.type === 'START') {
            if (timerId) clearInterval(timerId);
            timerId = setInterval(function() {
              self.postMessage({ type: 'TICK' });
            }, 250);
          } else if (e.data && e.data.type === 'STOP') {
            if (timerId) {
              clearInterval(timerId);
              timerId = null;
            }
          }
        };
      `;
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      this.worker = new Worker(workerUrl);

      this.worker.onmessage = (e) => {
        if (e.data && e.data.type === 'TICK' && this.onTickCallback) {
          this.onTickCallback();
        }
      };
    } catch (e) {
      console.warn('Web Worker initialization fallback to window timer:', e);
      this.worker = null;
    }
  }

  public start(onTick: () => void) {
    this.onTickCallback = onTick;
    if (this.worker) {
      this.worker.postMessage({ type: 'START' });
    }
  }

  public stop() {
    this.onTickCallback = null;
    if (this.worker) {
      this.worker.postMessage({ type: 'STOP' });
    }
  }
}

export const backgroundTimer = new BackgroundTimerService();

/**
 * Notification helpers for timer alerts when running in background
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  try {
    const result = await Notification.requestPermission();
    return result === 'granted';
  } catch (err) {
    console.warn('Notification permission request error:', err);
    return false;
  }
}

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermissionStatus(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export function sendTimerNotification(title: string, body: string) {
  if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  try {
    const iconUrl = 'https://raw.githubusercontent.com/syncrozz/syncrozz-assets/main/logo/OneTapTimer/android-chrome-192x192.png';
    const badgeUrl = 'https://raw.githubusercontent.com/syncrozz/syncrozz-assets/main/logo/OneTapTimer/favicon-96x96.png';

    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, {
          body,
          icon: iconUrl,
          badge: badgeUrl,
          tag: 'one-tap-timer-finished',
          requireInteraction: true,
        });
      }).catch(() => {
        new Notification(title, { body, icon: iconUrl });
      });
    } else {
      new Notification(title, { body, icon: iconUrl });
    }
  } catch (err) {
    console.warn('Notification trigger error:', err);
  }
}
