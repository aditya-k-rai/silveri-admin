'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmail, signUpWithEmail, resetPassword } from '@/lib/firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Shield, Mail, Lock, Eye, EyeOff, ArrowLeft, AlertTriangle, KeyRound, UserPlus } from 'lucide-react';
import Link from 'next/link';

const ADMIN_ACCESS_CODE = 'AKRP';

type View = 'login' | 'register' | 'forgot';

export default function AdminLoginPage() {
  const router = useRouter();
  const [view, setView] = useState<View>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const validateAccessCode = (): boolean => {
    if (!accessCode || accessCode.length !== 4) {
      setError('Enter a valid 4-character access code');
      return false;
    }
    if (accessCode.toUpperCase() !== ADMIN_ACCESS_CODE) {
      setError('Invalid access code');
      return false;
    }
    return true;
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Email and password are required');
      return;
    }

    if (!validateAccessCode()) return;

    setSubmitting(true);
    console.log('[Admin Login] Step 1: Starting sign in...');
    try {
      const firebaseUser = await signInWithEmail(email, password);
      console.log('[Admin Login] Step 2: Firebase auth success, uid:', firebaseUser.uid);

      if (!db) {
        setError('Database not connected. Please try again.');
        setSubmitting(false);
        return;
      }

      console.log('[Admin Login] Step 3: Checking Firestore role...');
      const userDocSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
      console.log('[Admin Login] Step 4: Firestore result - exists:', userDocSnap.exists(), 'role:', userDocSnap.data()?.role);

      if (!userDocSnap.exists()) {
        setError('No user profile found. Please register first.');
        setSubmitting(false);
        return;
      }

      if (userDocSnap.data().role !== 'admin') {
        setError('Access denied. This account does not have admin privileges.');
        setSubmitting(false);
        return;
      }

      console.log('[Admin Login] Step 5: Redirecting to /admin...');
      // Mark the moment of a fresh admin login. The /admin layout reads this
      // and forces re-auth after 4 hours regardless of Firebase auth state.
      if (typeof window !== 'undefined') {
        localStorage.setItem('silveri_admin_auth_at', String(Date.now()));
      }
      setSubmitting(false);
      window.location.replace('/admin');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[Admin Login] Error:', msg);
      if (msg.includes('too-many-requests')) {
        setError('Too many login attempts. Please wait 15â€“30 minutes before trying again.');
      } else if (msg.includes('user-not-found') || msg.includes('wrong-password') || msg.includes('invalid-credential')) {
        setError('Invalid email or password');
      } else {
        setError(msg);
      }
      setSubmitting(false);
    }
  };

  const handleAdminRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (!validateAccessCode()) return;

    setSubmitting(true);
    try {
      const firebaseUser = await signUpWithEmail(email, password, name);

      if (!db) {
        setError('Database not connected');
        setSubmitting(false);
        return;
      }

      // Create admin user doc in Firestore
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        uid: firebaseUser.uid,
        name: name.trim(),
        email: firebaseUser.email || email,
        photoURL: '',
        phone: '',
        role: 'admin',
        addresses: [],
        wishlist: [],
        blocked: false,
        createdAt: new Date(),
      });

      // Same freshness marker as the login path, so the new admin doesn't
      // get immediately bounced to the gate after registering.
      if (typeof window !== 'undefined') {
        localStorage.setItem('silveri_admin_auth_at', String(Date.now()));
      }
      router.push('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      if (msg.includes('too-many-requests')) {
        setError('Too many attempts. Please wait 15â€“30 minutes before trying again.');
      } else if (msg.includes('email-already-in-use')) {
        setError('This email is already registered. Try logging in instead.');
      } else if (msg.includes('weak-password')) {
        setError('Password is too weak. Use at least 6 characters.');
      } else {
        setError(msg);
      }
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!email) { setError('Enter your admin email address'); return; }

    setSubmitting(true);
    try {
      await resetPassword(email);
      setSuccess('Password reset link sent to your email. If you don\'t see it, check your Spam or Junk folder.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send reset email';
      if (msg.includes('too-many-requests')) {
        setError('Too many attempts. Please wait 15â€“30 minutes before trying again.');
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const switchView = (newView: View) => {
    setView(newView);
    setError('');
    setSuccess('');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Admin Badge */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gold/10 border border-gold/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield size={28} className="text-gold" />
          </div>
          <h1 className="font-[family-name:var(--font-heading)] text-3xl text-gold">Silveri</h1>
          <p className="text-[#888] text-sm mt-1">Admin Dashboard</p>
        </div>

        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-8">
          {/* Warning */}
          <div className="bg-amber-900/20 border border-amber-800/30 rounded-lg px-4 py-3 mb-6 flex items-start gap-3">
            <AlertTriangle size={16} className="text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-amber-300 text-xs">Restricted area. Only authorized administrators with a valid access code can enter.</p>
          </div>

          {error && <div className="bg-red-900/20 border border-red-800 text-red-400 text-sm rounded-lg px-4 py-2.5 mb-4">{error}</div>}
          {success && <div className="bg-green-900/20 border border-green-800 text-green-400 text-sm rounded-lg px-4 py-2.5 mb-4">{success}</div>}

          {/* ====== LOGIN VIEW ====== */}
          {view === 'login' && (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-sm text-[#aaa] mb-1.5">Admin Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" />
                  <input
                    type="email"
                    placeholder="admin@silveri.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-[#242424] border border-[#333] rounded-lg text-sm text-white placeholder-[#666] outline-none focus:border-gold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-[#aaa] mb-1.5">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 bg-[#242424] border border-[#333] rounded-lg text-sm text-white placeholder-[#666] outline-none focus:border-gold"
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666]">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-[#aaa] mb-1.5">Access Code</label>
                <div className="relative">
                  <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" />
                  <input
                    type="text"
                    placeholder="4-character code"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4))}
                    maxLength={4}
                    className="w-full pl-10 pr-4 py-3 bg-[#242424] border border-[#333] rounded-lg text-sm text-white placeholder-[#666] outline-none focus:border-gold tracking-[0.3em] font-mono uppercase"
                    required
                  />
                </div>
                <p className="text-[#555] text-[10px] mt-1">4-digit alphanumeric code required</p>
              </div>

              <div className="text-right">
                <button type="button" onClick={() => switchView('forgot')} className="text-gold text-xs hover:underline">
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gold text-warm-black py-3 rounded-lg text-sm font-semibold hover:bg-gold-light transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Shield size={16} />
                {submitting ? 'Verifying...' : 'Access Dashboard'}
              </button>

              <p className="text-center text-sm text-[#888] mt-2">
                New admin?{' '}
                <button type="button" onClick={() => switchView('register')} className="text-gold font-medium hover:underline">
                  Create admin account
                </button>
              </p>
            </form>
          )}

          {/* ====== REGISTER VIEW ====== */}
          {view === 'register' && (
            <form onSubmit={handleAdminRegister} className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <UserPlus size={18} className="text-gold" />
                <h2 className="text-white text-sm font-semibold">Create Admin Account</h2>
              </div>

              <div>
                <label className="block text-sm text-[#aaa] mb-1.5">Full Name</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" />
                  <input
                    type="text"
                    placeholder="Your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-[#242424] border border-[#333] rounded-lg text-sm text-white placeholder-[#666] outline-none focus:border-gold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-[#aaa] mb-1.5">Admin Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" />
                  <input
                    type="email"
                    placeholder="admin@silveri.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-[#242424] border border-[#333] rounded-lg text-sm text-white placeholder-[#666] outline-none focus:border-gold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-[#aaa] mb-1.5">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 bg-[#242424] border border-[#333] rounded-lg text-sm text-white placeholder-[#666] outline-none focus:border-gold"
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666]">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-[#aaa] mb-1.5">Access Code</label>
                <div className="relative">
                  <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" />
                  <input
                    type="text"
                    placeholder="4-character code"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4))}
                    maxLength={4}
                    className="w-full pl-10 pr-4 py-3 bg-[#242424] border border-[#333] rounded-lg text-sm text-white placeholder-[#666] outline-none focus:border-gold tracking-[0.3em] font-mono uppercase"
                    required
                  />
                </div>
                <p className="text-[#555] text-[10px] mt-1">4-digit alphanumeric code required</p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gold text-warm-black py-3 rounded-lg text-sm font-semibold hover:bg-gold-light transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <UserPlus size={16} />
                {submitting ? 'Creating...' : 'Create Admin Account'}
              </button>

              <p className="text-center text-sm text-[#888] mt-2">
                Already have an account?{' '}
                <button type="button" onClick={() => switchView('login')} className="text-gold font-medium hover:underline">
                  Sign in
                </button>
              </p>
            </form>
          )}

          {/* ====== FORGOT PASSWORD VIEW ====== */}
          {view === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <button type="button" onClick={() => switchView('login')} className="flex items-center gap-1 text-[#888] text-sm hover:text-white mb-2">
                <ArrowLeft size={14} /> Back to login
              </button>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" />
                <input type="email" placeholder="Enter admin email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-[#242424] border border-[#333] rounded-lg text-sm text-white placeholder-[#666] outline-none focus:border-gold" required />
              </div>
              <button type="submit" disabled={submitting} className="w-full bg-gold text-warm-black py-3 rounded-lg text-sm font-semibold hover:bg-gold-light transition-colors disabled:opacity-50">
                {submitting ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center mt-6">
          <Link href="/" className="text-[#666] text-xs hover:text-gold transition-colors">
            â† Back to Silveri store
          </Link>
        </p>
      </div>
    </div>
  );
}

