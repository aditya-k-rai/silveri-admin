import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  // Use the current host as authDomain on the client so the auth-handler
  // iframe loads same-origin with the page (avoids 3rd-party storage blocks
  // in Brave/Safari/strict-Chrome). The matching `/__/auth/*` rewrite in
  // next.config.ts proxies to <projectId>.firebaseapp.com transparently.
  // Requires `https://<host>/__/auth/handler` in the OAuth client's Authorized
  // redirect URIs (already added in Google Cloud Console for silverishop.in).
  // SSR has no `window`, so it falls back to the env var (auth never runs SSR).
  authDomain: typeof window !== 'undefined'
    ? window.location.host
    : process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Only initialize if we have a valid API key (prevents build crashes on Vercel)
function getFirebaseApp(): FirebaseApp | null {
  if (getApps().length > 0) return getApp();

  if (!firebaseConfig.apiKey || firebaseConfig.apiKey === 'your_firebase_api_key') {
    if (typeof window !== 'undefined') {
      console.warn('Firebase: Missing API key. Add NEXT_PUBLIC_FIREBASE_* env vars.');
    }
    return null;
  }

  try {
    return initializeApp(firebaseConfig);
  } catch (error) {
    console.warn('Firebase client initialization failed:', error);
    return null;
  }
}

export const app = getFirebaseApp();

// These will be null during build if Firebase keys are missing — that's OK
// Pages using them are client-side only ('use client')
export const auth = app ? getAuth(app) : (null as unknown as Auth);
export const db = app ? getFirestore(app) : (null as unknown as Firestore);
export const storage = app ? getStorage(app) : (null as unknown as FirebaseStorage);

export let analytics: import('firebase/analytics').Analytics | null = null;

export async function initAnalytics() {
  if (analytics || !app) return null;
  if (typeof window === 'undefined') return null;

  try {
    const { getAnalytics, isSupported } = await import('firebase/analytics');
    const supported = await isSupported();
    if (!supported) return null;
    analytics = getAnalytics(app);
    return analytics;
  } catch {
    return null;
  }
}

if (app) void initAnalytics();

export default app;
