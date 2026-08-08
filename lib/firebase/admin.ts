import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';

let adminApp: App | null = null;

function getAdminApp(): App | null {
  if (adminApp) return adminApp;
  if (getApps().length > 0) {
    adminApp = getApps()[0];
    return adminApp;
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey || privateKey.includes('YOUR_PRIVATE_KEY')) {
    console.warn('[Admin SDK] Missing credentials — falling back to JWT-decode mode for token verification.');
    return null;
  }

  try {
    adminApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });
    return adminApp;
  } catch (error) {
    console.warn('[Admin SDK] Initialization failed:', error);
    return null;
  }
}

const app = getAdminApp();

export const adminDb: Firestore | null = app ? getFirestore(app) : null;
export const adminAuth: Auth | null = app ? getAuth(app) : null;

// ─── Minimal shape returned by verifyIdToken ─────────────────────────────────
// Matches the fields our API routes actually use (uid, email).
interface MinimalDecodedToken {
  uid: string;
  email?: string;
  name?: string;
  exp: number;
  iat: number;
  iss: string;
  aud: string | string[];
  sub: string;
  // allow extra fields
  [key: string]: unknown;
}

/**
 * Verify a Firebase ID token from the Authorization header.
 *
 * Strategy:
 *  1. If Firebase Admin SDK is configured → full cryptographic verification (production).
 *  2. If Admin SDK is NOT configured (no service-account key in .env.local) → decode the
 *     JWT payload and validate issuer, audience, expiry, and project ID so the app works
 *     in local dev without a service account. Signature is not cryptographically checked
 *     in this fallback path — add real Admin credentials before going to production.
 */
export async function verifyIdToken(
  authHeader: string | null,
): Promise<import('firebase-admin/auth').DecodedIdToken | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  if (!token) return null;

  // ── Path 1: Full Admin SDK verification ─────────────────────────────────
  if (adminAuth) {
    try {
      return await adminAuth.verifyIdToken(token);
    } catch (err) {
      console.error('[verifyIdToken] Admin SDK verification failed:', err);
      return null;
    }
  }

  // ── Path 2: JWT decode fallback (no Admin SDK configured) ────────────────
  // Firebase ID tokens are standard JWTs: header.payload.signature (base64url)
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    // base64url → base64 → Buffer → JSON
    const padded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = Buffer.from(padded, 'base64').toString('utf8');
    const payload = JSON.parse(json) as MinimalDecodedToken;

    // Validate expiry
    const nowSec = Math.floor(Date.now() / 1000);
    if (payload.exp < nowSec) {
      console.warn('[verifyIdToken] Token expired');
      return null;
    }

    // Validate issuer matches our Firebase project
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (projectId) {
      const expectedIss = `https://securetoken.google.com/${projectId}`;
      if (payload.iss !== expectedIss) {
        console.warn('[verifyIdToken] Issuer mismatch:', payload.iss);
        return null;
      }
      // Validate audience
      const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
      if (!aud.includes(projectId)) {
        console.warn('[verifyIdToken] Audience mismatch:', payload.aud);
        return null;
      }
    }

    // uid is in the "sub" (subject) claim for Firebase tokens
    if (!payload.sub) return null;

    // Return a shape compatible with DecodedIdToken
    return {
      ...payload,
      uid: payload.sub,
    } as unknown as import('firebase-admin/auth').DecodedIdToken;
  } catch (err) {
    console.error('[verifyIdToken] JWT decode fallback failed:', err);
    return null;
  }
}
