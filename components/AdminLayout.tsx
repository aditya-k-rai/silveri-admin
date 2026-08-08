"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Package, FolderTree, ClipboardList,
  Users, Tags, Settings, Menu, X, LogOut, Loader2, Sparkles, LineChart, BarChart3, Activity, Star
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuthContext } from "@/context/AuthContext";
import { signOutUser } from "@/lib/firebase/auth";

// Routes are now root-relative (no /admin prefix) since this is a standalone admin app
const NAV_LINKS = [
  { href: "/dashboard",     label: "Dashboard",    icon: LayoutDashboard },
  { href: "/reports",       label: "Reports",      icon: BarChart3 },
  { href: "/live-market",   label: "Live Market",  icon: LineChart },
  { href: "/products",      label: "Products",     icon: Package },
  { href: "/categories",    label: "Categories",   icon: FolderTree },
  { href: "/custom-orders", label: "Custom Orders",icon: Sparkles },
  { href: "/orders",        label: "Orders",       icon: ClipboardList },
  { href: "/users",         label: "Users",        icon: Users },
  { href: "/reviews",       label: "Reviews",      icon: Star },
  { href: "/activity",      label: "Activity",     icon: Activity },
  { href: "/promos",        label: "Promos",       icon: Tags },
  { href: "/settings",      label: "Settings",     icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userDoc, loading } = useAuthContext();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Skip admin layout for login page — it has its own full-screen layout
  const isLoginPage = pathname === '/login';

  // Admin session freshness gate. Even when Firebase auth state is still
  // present (e.g. an existing tab on the same browser), we force the admin
  // to re-enter their password + access code every 4 hours so the admin
  // surface doesn't auto-open in unattended sessions.
  const ADMIN_SESSION_MS = 4 * 60 * 60 * 1000;

  // Centralized redirect logic (avoids React render-phase router.push warnings)
  useEffect(() => {
    if (isLoginPage || loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (userDoc && userDoc.role !== 'admin') {
      router.replace('/login');
      return;
    }
    // Fresh-login check — runs only client-side
    if (typeof window !== 'undefined' && userDoc?.role === 'admin') {
      const authAt = Number(localStorage.getItem('silveri_admin_auth_at') || 0);
      if (!authAt || Date.now() - authAt > ADMIN_SESSION_MS) {
        localStorage.removeItem('silveri_admin_auth_at');
        router.replace('/login');
      }
    }
  }, [isLoginPage, loading, user, userDoc, router, ADMIN_SESSION_MS]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  // Loading or about-to-redirect: show full-screen spinner instead of flashing the admin UI
  if (loading || !user || !userDoc || userDoc.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <Loader2 size={28} className="text-[#C9A84C] animate-spin" />
      </div>
    );
  }

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  const adminName = userDoc?.name || 'Admin';
  const adminInitial = adminName.charAt(0).toUpperCase();

  const handleLogout = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      // Always clear the admin freshness marker first so a follow-up navigation
      // to /dashboard can't slip through the freshness gate.
      if (typeof window !== 'undefined') {
        localStorage.removeItem('silveri_admin_auth_at');
      }
      await signOutUser();
      router.replace('/login');
    } catch (err) {
      console.error('[AdminLayout] Logout failed:', err);
      // Force navigation regardless — user state is already cleared client-side
      router.replace('/login');
    } finally {
      setSigningOut(false);
    }
  };

  const sidebar = (
    <nav className="flex flex-col gap-1 px-3">
      {NAV_LINKS.map((link) => {
        const active = isActive(link.href);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              active
                ? "bg-[#C9A84C]/15 text-[#C9A84C]"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            <Icon size={18} />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-[#F5F3EF]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#1A1A1A] shrink-0">
        <div className="px-6 py-6 mb-4">
          <Link href="/dashboard" className="text-2xl font-[family-name:var(--font-heading)] font-semibold text-[#C9A84C]">
            Silveri
          </Link>
          <p className="text-xs text-white/40 mt-0.5">Admin Panel</p>
        </div>
        {sidebar}
        {/* Admin info at bottom */}
        <div className="mt-auto px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#C9A84C]/20 flex items-center justify-center text-[#C9A84C] text-sm font-semibold">
              {adminInitial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{adminName}</p>
              <p className="text-white/40 text-xs truncate">{userDoc?.email || ''}</p>
            </div>
            <button
              onClick={handleLogout}
              disabled={signingOut}
              className="text-white/40 hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={signingOut ? 'Signing out…' : 'Logout'}
            >
              {signingOut ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 h-full bg-[#1A1A1A] flex flex-col">
            <div className="flex items-center justify-between px-6 py-6">
              <span className="text-xl font-[family-name:var(--font-heading)] font-semibold text-[#C9A84C]">Silveri</span>
              <button onClick={() => setMobileOpen(false)} className="text-white/60 hover:text-white">
                <X size={20} />
              </button>
            </div>
            {sidebar}
            {/* Admin info at bottom of mobile sidebar */}
            <div className="mt-auto px-4 py-4 border-t border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#C9A84C]/20 flex items-center justify-center text-[#C9A84C] text-sm font-semibold">
                  {adminInitial}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{adminName}</p>
                </div>
                <button
                  onClick={handleLogout}
                  disabled={signingOut}
                  className="text-white/40 hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={signingOut ? 'Signing out…' : 'Logout'}
                >
                  {signingOut ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center gap-4 px-4 lg:px-8 py-4 bg-white border-b border-[#E8E8E8]">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 -ml-2 text-[#1A1A1A] hover:bg-[#E8E8E8]/50 rounded-lg"
          >
            <Menu size={20} />
          </button>
          <h2 className="text-lg font-[family-name:var(--font-heading)] font-semibold text-[#1A1A1A]">
            {NAV_LINKS.find((l) => isActive(l.href))?.label ?? "Admin"}
          </h2>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-[#7A7585] hidden sm:block">{adminName}</span>
            <div className="w-8 h-8 rounded-full bg-[#C9A84C]/10 flex items-center justify-center text-[#C9A84C] text-sm font-semibold">
              {adminInitial}
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-8 overflow-auto">{children}</main>
        
        {/* Admin Footer */}
        <footer className="px-4 lg:px-8 py-4 border-t border-[#E8E8E8] bg-white text-center text-xs text-[#7A7585]">
          &copy; {new Date().getFullYear()} Silveri Admin Portal. All systems operational.
        </footer>
      </div>
    </div>
  );
}
