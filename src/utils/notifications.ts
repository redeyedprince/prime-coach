import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export type PrimeNotifPermission = 'granted' | 'denied' | 'prompt' | 'unsupported';

const KEGEL_NOTIF_BASE_ID = 4100;
const TEST_NOTIF_ID = 4199;
const CHANNEL_ID = 'prime_discreet_reminders';

async function ensureAndroidChannel(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: 'Discreet Focus & Posture Resets',
      description: 'Subtle daily reminders for seated posture & pelvic floor resets.',
      importance: 3, // Default (shows in shade without jarring alarm)
      visibility: 1, // Public (discreet title is office-safe)
      vibration: true,
    });
  } catch {
    // Ignore on iOS or unsupported OS versions
  }
}

export async function checkNotificationPermission(): Promise<PrimeNotifPermission> {
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await LocalNotifications.checkPermissions();
      if (res.display === 'granted') return 'granted';
      if (res.display === 'denied') return 'denied';
      return 'prompt';
    } catch {
      return 'unsupported';
    }
  }

  if (typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return 'prompt';
}

export async function requestNotificationPermission(): Promise<PrimeNotifPermission> {
  if (Capacitor.isNativePlatform()) {
    try {
      await ensureAndroidChannel();
      const res = await LocalNotifications.requestPermissions();
      if (res.display === 'granted') return 'granted';
      if (res.display === 'denied') return 'denied';
      return 'prompt';
    } catch {
      return 'unsupported';
    }
  }

  if (typeof Notification === 'undefined') return 'unsupported';
  try {
    const res = await Notification.requestPermission();
    if (res === 'granted') return 'granted';
    if (res === 'denied') return 'denied';
    return 'prompt';
  } catch {
    return 'denied';
  }
}

/**
 * Schedules real recurring daily Android local notifications at the user's chosen
 * HH:MM slots (or cancels them cleanly when paused).
 */
export async function syncDiscreetKegelNotifications(
  enabled: boolean,
  times: string[],
): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;

  try {
    // Cancel any previously scheduled Kegel reminder IDs (4100..4119)
    const cancelIds = Array.from({ length: 20 }, (_, i) => ({ id: KEGEL_NOTIF_BASE_ID + i }));
    await LocalNotifications.cancel({ notifications: cancelIds });

    if (!enabled || times.length === 0) return true;

    const perm = await checkNotificationPermission();
    if (perm !== 'granted') return false;

    await ensureAndroidChannel();

    const notifications = times
      .map((slot, idx) => {
        const [hStr, mStr] = slot.split(':');
        const hour = Number.parseInt(hStr, 10);
        const minute = Number.parseInt(mStr, 10);
        if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
        return {
          id: KEGEL_NOTIF_BASE_ID + idx,
          title: '2-Min Focus & Posture Reset',
          body: 'Quick seated breathing & posture check-in (office-safe).',
          channelId: CHANNEL_ID,
          schedule: {
            on: { hour, minute },
            repeats: true,
            allowWhileIdle: true,
          },
        };
      })
      .filter((n): n is NonNullable<typeof n> => n !== null);

    if (notifications.length > 0) {
      await LocalNotifications.schedule({ notifications });
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Requests permission if needed and fires a real discreet test notification.
 */
export async function sendTestDiscreetNotification(): Promise<{
  sent: boolean;
  permission: PrimeNotifPermission;
  message: string;
}> {
  let perm = await checkNotificationPermission();
  if (perm === 'prompt') {
    perm = await requestNotificationPermission();
  }

  if (perm !== 'granted') {
    return {
      sent: false,
      permission: perm,
      message:
        perm === 'denied'
          ? 'Notifications are blocked in Android Settings — allow notifications for Prime in App Info to receive lock-screen reminders.'
          : 'Browser preview does not support system alerts; install the Android APK for native lock-screen reminders.',
    };
  }

  if (Capacitor.isNativePlatform()) {
    try {
      await ensureAndroidChannel();
      await LocalNotifications.schedule({
        notifications: [
          {
            id: TEST_NOTIF_ID,
            title: '2-Min Focus & Posture Reset',
            body: 'Quick seated breathing & posture check-in (office-safe).',
            channelId: CHANNEL_ID,
            schedule: { at: new Date(Date.now() + 1500) },
          },
        ],
      });
      return {
        sent: true,
        permission: 'granted',
        message: 'Native Android alert scheduled! Look at your notification bar in ~2 seconds.',
      };
    } catch {
      return {
        sent: false,
        permission: perm,
        message: 'Could not schedule Android notification. Check App Info -> Notifications.',
      };
    }
  }

  try {
    new Notification('2-Min Focus & Posture Reset', {
      body: 'Quick seated breathing & posture check-in (office-safe).',
      silent: true,
    });
    return {
      sent: true,
      permission: 'granted',
      message: 'Discreet notification sent cleanly ("2-Min Focus & Posture Reset").',
    };
  } catch {
    return {
      sent: false,
      permission: perm,
      message: 'In-app stealth cue ready at your scheduled times.',
    };
  }
}
