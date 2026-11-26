package com.floorcalisthenics.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

@CapacitorPlugin(name = "ApkUpdater")
public class ApkUpdaterPlugin extends Plugin {

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        final String apkUrl = call.getString("url");
        if (apkUrl == null || apkUrl.trim().isEmpty()) {
            call.reject("Missing APK download URL.");
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (!getContext().getPackageManager().canRequestPackageInstalls()) {
                Intent permIntent = new Intent(
                    Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                    Uri.parse("package:" + getContext().getPackageName())
                );
                permIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(permIntent);
                call.reject("NEEDS_INSTALL_PERMISSION");
                return;
            }
        }

        new Thread(() -> {
            HttpURLConnection conn = null;
            try {
                File updatesDir = new File(getContext().getCacheDir(), "updates");
                if (!updatesDir.exists()) {
                    updatesDir.mkdirs();
                }
                File apkFile = new File(updatesDir, "Prime-latest.apk");
                if (apkFile.exists()) {
                    apkFile.delete();
                }

                String currentUrl = apkUrl;
                int status = -1;
                for (int hop = 0; hop < 5; hop++) {
                    URL url = new URL(currentUrl);
                    conn = (HttpURLConnection) url.openConnection();
                    conn.setInstanceFollowRedirects(false);
                    conn.setRequestProperty("User-Agent", "Prime-Android-Updater");
                    conn.setConnectTimeout(15000);
                    conn.setReadTimeout(30000);
                    conn.connect();

                    status = conn.getResponseCode();
                    if (status == 301 || status == 302 || status == 303 || status == 307 || status == 308) {
                        String location = conn.getHeaderField("Location");
                        conn.disconnect();
                        conn = null;
                        if (location == null || location.trim().isEmpty()) {
                            call.reject("Download redirect missing Location header (HTTP " + status + ").");
                            return;
                        }
                        currentUrl = new URL(url, location).toString();
                        continue;
                    }
                    break;
                }

                if (conn == null || status < 200 || status >= 300) {
                    call.reject("Download failed (HTTP " + status + ").");
                    return;
                }

                int totalBytes = conn.getContentLength();
                InputStream in = new BufferedInputStream(conn.getInputStream());
                FileOutputStream out = new FileOutputStream(apkFile);
                byte[] buf = new byte[16384];
                long downloaded = 0;
                int lastPct = -1;
                int n;
                while ((n = in.read(buf)) != -1) {
                    out.write(buf, 0, n);
                    downloaded += n;
                    if (totalBytes > 0) {
                        int pct = (int) ((downloaded * 100L) / totalBytes);
                        if (pct != lastPct) {
                            lastPct = pct;
                            JSObject ev = new JSObject();
                            ev.put("progress", pct);
                            notifyListeners("apkDownloadProgress", ev);
                        }
                    }
                }
                out.flush();
                out.close();
                in.close();

                if (downloaded < 1024L * 1024L) {
                    apkFile.delete();
                    call.reject("Downloaded file is invalid or incomplete (" + downloaded + " bytes).");
                    return;
                }

                Uri contentUri = FileProvider.getUriForFile(
                    getContext(),
                    getContext().getPackageName() + ".fileprovider",
                    apkFile
                );

                Intent installIntent = new Intent(Intent.ACTION_VIEW);
                installIntent.setDataAndType(contentUri, "application/vnd.android.package-archive");
                installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                installIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(installIntent);

                JSObject res = new JSObject();
                res.put("started", true);
                call.resolve(res);
            } catch (Exception e) {
                call.reject("Update failed: " + e.getMessage());
            } finally {
                if (conn != null) {
                    conn.disconnect();
                }
            }
        }).start();
    }

    @PluginMethod
    public void exitApp(PluginCall call) {
        if (getActivity() != null) {
            getActivity().runOnUiThread(() -> getActivity().finishAffinity());
        }
        call.resolve();
    }
}
