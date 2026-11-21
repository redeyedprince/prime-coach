import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';

interface ApkUpdaterNativePlugin {
  downloadAndInstall(options: { url: string }): Promise<{ started: boolean }>;
  addListener(
    eventName: 'apkDownloadProgress',
    listenerFunc: (data: { progress: number }) => void,
  ): Promise<PluginListenerHandle>;
}

const ApkUpdaterNative = registerPlugin<ApkUpdaterNativePlugin>('ApkUpdater');

export function isNativeAndroidUpdaterSupported(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export async function downloadAndInstallApk(
  url: string,
  onProgress?: (pct: number) => void,
): Promise<void> {
  if (!isNativeAndroidUpdaterSupported()) {
    // Web browser fallback: trigger direct APK file download without opening GitHub page
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Prime-latest.apk';
    a.rel = 'noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }

  let handle: PluginListenerHandle | null = null;
  try {
    if (onProgress) {
      handle = await ApkUpdaterNative.addListener('apkDownloadProgress', (ev) => {
        onProgress(Math.max(0, Math.min(100, ev.progress)));
      });
    }
    await ApkUpdaterNative.downloadAndInstall({ url });
  } finally {
    await handle?.remove().catch(() => {});
  }
}
