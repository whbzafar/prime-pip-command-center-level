// Audio alert synthesizer using the Web Audio API & Notification System
// 100% offline, zero external dependencies, safe execution

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export type AlertSoundType =
  | 'LIMIT_REACHED'
  | 'WARNING'
  | 'DANGER'
  | 'CHIME'
  | 'DRAWDOWN_ALERT'
  | 'CONSECUTIVE_LOSS';

export interface AlertSettings {
  soundEnabled: boolean;
  volume: number; // 0.1 to 1.0
  tradeLimitAlert: boolean;
  dailyLossAlert: boolean;
  riskAlert: boolean;
  drawdownAlert: boolean;
  consecutiveLossAlert: boolean;
  notificationsEnabled: boolean;
}

const DEFAULT_SETTINGS: AlertSettings = {
  soundEnabled: true,
  volume: 0.5,
  tradeLimitAlert: true,
  dailyLossAlert: true,
  riskAlert: true,
  drawdownAlert: true,
  consecutiveLossAlert: true,
  notificationsEnabled: false,
};

const STORAGE_KEY = 'primepipfx_alert_settings_v1';

export function getAlertSettings(): AlertSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveAlertSettings(settings: Partial<AlertSettings>): AlertSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  const current = getAlertSettings();
  const updated = { ...current, ...settings };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('primepipfx_alert_settings_changed', { detail: updated }));
  } catch (e) {
    console.error('Failed to save alert settings:', e);
  }
  return updated;
}

export function toggleSoundEnabled(): boolean {
  const current = getAlertSettings();
  const updated = saveAlertSettings({ soundEnabled: !current.soundEnabled });
  return updated.soundEnabled;
}

export function setSoundEnabled(enabled: boolean): AlertSettings {
  return saveAlertSettings({ soundEnabled: enabled });
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  try {
    if (Notification.permission === 'granted') {
      saveAlertSettings({ notificationsEnabled: true });
      return true;
    }
    if (Notification.permission !== 'denied') {
      const result = await Notification.requestPermission();
      const granted = result === 'granted';
      saveAlertSettings({ notificationsEnabled: granted });
      return granted;
    }
    return false;
  } catch {
    return false;
  }
}

export function sendDisciplineNotification(title: string, body: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  const settings = getAlertSettings();
  if (!settings.notificationsEnabled || Notification.permission !== 'granted') return;

  try {
    new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'discipline-alert',
    });
  } catch (e) {
    console.warn('Notification failed to display:', e);
  }
}

export function playDisciplineAlert(type: AlertSoundType = 'LIMIT_REACHED') {
  try {
    const settings = getAlertSettings();
    if (!settings.soundEnabled) return;

    // Check individual alert toggles
    if (type === 'LIMIT_REACHED' && settings.tradeLimitAlert === false) return;
    if (type === 'DRAWDOWN_ALERT' && settings.drawdownAlert === false) return;
    if (type === 'CONSECUTIVE_LOSS' && settings.consecutiveLossAlert === false) return;
    if (type === 'DANGER' && settings.dailyLossAlert === false) return;
    if (type === 'WARNING' && settings.riskAlert === false) return;

    const ctx = getAudioContext();
    if (!ctx) return;

    const vol = Math.max(0.05, Math.min(1.0, settings.volume));

    if (type === 'LIMIT_REACHED' || type === 'DANGER' || type === 'DRAWDOWN_ALERT') {
      // Triple warning buzzer pattern: 440Hz -> 370Hz -> 220Hz
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(370, now + 0.15);
      osc.frequency.setValueAtTime(293, now + 0.3);

      gain.gain.setValueAtTime(0.25 * vol, now);
      gain.gain.setValueAtTime(0.25 * vol, now + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.6);
    } else if (type === 'CONSECUTIVE_LOSS') {
      // Double pulsing caution tone: 330Hz -> 311Hz
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(330, now);
      osc.frequency.setValueAtTime(311.13, now + 0.2);

      gain.gain.setValueAtTime(0.2 * vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.5);
    } else if (type === 'WARNING') {
      // Double attention chime: 587Hz -> 440Hz
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.setValueAtTime(440, now + 0.18);

      gain.gain.setValueAtTime(0.2 * vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.45);
    } else {
      // Pleasant confirmation chime: C5 -> E5 -> G5
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.12);
      osc.frequency.setValueAtTime(783.99, now + 0.24);

      gain.gain.setValueAtTime(0.2 * vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.5);
    }
  } catch (err) {
    console.warn('Audio alert could not be emitted (browser policy or unsupported):', err);
  }
}
