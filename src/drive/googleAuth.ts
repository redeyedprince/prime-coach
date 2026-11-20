const GIS_SCRIPT_URL = 'https://accounts.google.com/gsi/client';
const DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

interface TokenClient {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string }) => void;
          }) => TokenClient;
        };
      };
    };
  }
}

let gisLoadPromise: Promise<void> | null = null;

function loadGisScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (!navigator.onLine) {
    return Promise.reject(new Error('You are offline. Connect to the internet to sign in with Google.'));
  }
  if (!gisLoadPromise) {
    gisLoadPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = GIS_SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => {
        gisLoadPromise = null;
        reject(new Error('Failed to load Google Identity Services script.'));
      };
      document.head.appendChild(script);
    });
  }
  return gisLoadPromise;
}

export async function requestDriveAccessToken(clientId: string): Promise<string> {
  const trimmed = clientId.trim();
  if (!trimmed) {
    throw new Error('Google OAuth Client ID is not configured. Set it in Settings or VITE_GOOGLE_CLIENT_ID.');
  }

  await loadGisScript();

  return new Promise<string>((resolve, reject) => {
    const oauth2 = window.google?.accounts?.oauth2;
    if (!oauth2) {
      reject(new Error('Google OAuth2 client unavailable.'));
      return;
    }

    const tokenClient = oauth2.initTokenClient({
      client_id: trimmed,
      scope: DRIVE_FILE_SCOPE,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error ?? 'Failed to obtain Google Drive access token.'));
          return;
        }
        resolve(response.access_token);
      },
    });

    tokenClient.requestAccessToken({ prompt: '' });
  });
}
