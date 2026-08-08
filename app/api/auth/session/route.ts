import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';

// POST — set session cookie
export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json({ error: 'Missing idToken' }, { status: 400 });
    }

    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
    let sessionCookie: string;

    if (adminAuth) {
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      if (!decodedToken) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }
      sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
    } else {
      console.warn('Firebase Admin missing, creating fallback dummy session cookie');
      sessionCookie = `dummy-session-${Date.now()}`;
    }

    const cookieStore = await cookies();
    cookieStore.set('session', sessionCookie, {
      maxAge: expiresIn / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Session creation error:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}

// DELETE — clear session cookie
export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
  return NextResponse.json({ success: true });
}
