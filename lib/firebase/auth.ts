import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth';
import { auth } from './client';

const googleProvider = new GoogleAuthProvider();

const SESSION_TIMEOUT_MS = 8000;

async function createSessionCookie(idToken: string): Promise<void> {
  console.log('[auth] POST /api/auth/session — creating session cookie');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SESSION_TIMEOUT_MS);
  try {
    const res = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error('[auth] Session cookie creation failed:', res.status, body);
      throw new Error(`Session creation failed (${res.status})`);
    }
    console.log('[auth] Session cookie created (status', res.status + ')');
  } finally {
    clearTimeout(timer);
  }
}

async function clearSessionCookie(): Promise<void> {
  console.log('[auth] DELETE /api/auth/session — clearing session cookie');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SESSION_TIMEOUT_MS);
  try {
    await fetch('/api/auth/session', {
      method: 'DELETE',
      signal: controller.signal,
      cache: 'no-store',
    });
    console.log('[auth] Session cookie cleared');
  } finally {
    clearTimeout(timer);
  }
}

export async function signInWithGoogle() {
  // Legacy redirect-based flow — kept for fallback only.
  await signInWithRedirect(auth, googleProvider);
}

export async function signInWithGooglePopup() {
  if (!auth) throw new Error('Firebase auth not initialized');
  const result = await signInWithPopup(auth, googleProvider);
  const fbIdToken = await result.user.getIdToken();
  await createSessionCookie(fbIdToken);
  return result.user;
}

/**
 * Sign into Firebase using a Google ID token from Google Identity Services
 * (the in-page "Sign in with Google" button). No iframe, no popup, no
 * redirect — works reliably in every browser including Brave/strict-Safari.
 *
 * Pass the `credential` field from the GIS callback as `idToken`.
 */
export async function signInWithGoogleIdToken(idToken: string) {
  const credential = GoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(auth, credential);
  // Create the server session cookie so SSR/proxy auth works as before
  const fbIdToken = await result.user.getIdToken();
  await createSessionCookie(fbIdToken);
  return result.user;
}

// Call this once on app mount. If the user is returning from a Google
// redirect, this completes the sign-in and creates the server session
// cookie. Returns the signed-in user, or null if no redirect was pending.
export async function consumeGoogleRedirectResult() {
  if (!auth) {
    console.warn('[auth] consumeGoogleRedirectResult: Firebase auth not initialized');
    return null;
  }
  console.log('[auth] Checking for pending Google redirect…');
  try {
    const result = await getRedirectResult(auth);
    if (!result) {
      console.log('[auth] No pending redirect (getRedirectResult returned null)');
      return null;
    }
    console.log('[auth] Redirect resolved for uid=', result.user.uid, 'email=', result.user.email);
    const idToken = await result.user.getIdToken();
    console.log('[auth] Got idToken (len=' + idToken.length + ')');
    await createSessionCookie(idToken);
    return result.user;
  } catch (err) {
    console.error('[auth] consumeGoogleRedirectResult failed:', err);
    return null;
  }
}

export async function signUpWithEmail(email: string, password: string, displayName: string) {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(result.user, { displayName });
  const idToken = await result.user.getIdToken();
  await createSessionCookie(idToken);
  return result.user;
}

export async function signInWithEmail(email: string, password: string) {
  const result = await signInWithEmailAndPassword(auth, email, password);
  const idToken = await result.user.getIdToken();
  await createSessionCookie(idToken);
  return result.user;
}

export async function resetPassword(email: string) {
  await sendPasswordResetEmail(auth, email, {
    // Updated to point to the admin domain login page
    url: typeof window !== 'undefined' ? `${window.location.origin}/login` : 'https://admin.silveri.in/login',
    handleCodeInApp: false,
  });
}

export async function signOutUser() {
  // 1. Sign out of Firebase first — onAuthStateChanged fires and AuthContext clears local state
  try {
    await signOut(auth);
  } catch (err) {
    console.error('[signOutUser] Firebase signOut failed:', err);
  }
  // 2. Then clear the server session cookie. Independent of Firebase result.
  try {
    await clearSessionCookie();
  } catch (err) {
    console.error('[signOutUser] Session cookie cleanup failed:', err);
  }
}

export async function changePassword(user: any, currentPassword: string, newPassword: string) {
  if (!user || !user.email) throw new Error('User not authenticated');
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
}
