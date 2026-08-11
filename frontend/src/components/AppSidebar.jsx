'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { api, clearToken } from '../lib/api';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Overview', icon: '▦' },
  { href: '/alerts', label: 'Alerts', icon: '!' },
  { href: '/vehicles', label: 'Vehicles', icon: '◈' }
];

export default function AppSidebar({ user: providedUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(providedUser || null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!providedUser) api.getMe().then(setUser).catch(() => {});
  }, [providedUser]);

  useEffect(() => {
    setCollapsed(localStorage.getItem('ev_sidebar_collapsed') === 'true');
  }, []);

  useEffect(() => {
    localStorage.setItem('ev_sidebar_collapsed', String(collapsed));
    document.documentElement.style.setProperty('--sidebar-width', collapsed ? '4.5rem' : '16rem');
  }, [collapsed]);

  function logout() {
    clearToken();
    router.replace('/login');
  }

  const canAssign = user && ['admin', 'fleet_admin'].includes(user.role);
  const roleLabel = user?.role?.replace('_', ' ') || 'account';

  return (
    <aside className={`app-sidebar ${collapsed ? 'is-collapsed' : ''}`}>
      <div className="p-4 lg:p-6 lg:flex lg:flex-col lg:h-full">
        <div className="flex items-start justify-between mb-5 lg:mb-10">
          <Link href="/dashboard" title="Control center" className="min-w-0">
            <div className="sidebar-brand text-[10px] tracking-[0.28em] text-volt uppercase">Electric Vehicles</div>
            <div className="sidebar-label text-lg font-semibold mt-1">Control center</div>
          </Link>
          <div className="flex items-center gap-3">
            <button onClick={logout} className="lg:hidden text-xs text-neutral-500 hover:text-white pt-1">Sign out</button>
            <button
              type="button"
              onClick={() => setCollapsed((value) => !value)}
              className="sidebar-toggle text-neutral-400 hover:text-white"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? '→' : '←'}
            </button>
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto lg:block lg:space-y-1" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => {
            const active = item.href === '/alerts'
              ? pathname === '/alerts'
              : item.href === '/vehicles'
                ? pathname === '/vehicles' || pathname.startsWith('/vehicle')
                : pathname === '/dashboard';
            return (
              <Link
                key={item.label}
                href={item.href}
                title={item.label}
                className={`flex items-center gap-3 whitespace-nowrap px-3 py-2.5 rounded-lg text-sm transition ${active ? 'bg-volt text-black font-medium' : 'text-neutral-400 hover:text-white hover:bg-white/5'}`}
              >
                <span className="w-5 text-center font-mono">{item.icon}</span>
                <span className="sidebar-label">{item.label}</span>
              </Link>
            );
          })}
          {canAssign && (
            <Link
              href="/assign-vehicle"
              title="Assign vehicle"
              className="flex items-center gap-3 whitespace-nowrap px-3 py-2.5 rounded-lg text-sm text-neutral-400 hover:text-white hover:bg-white/5"
            >
              <span className="w-5 text-center font-mono">+</span>
              <span className="sidebar-label">Assign vehicle</span>
            </Link>
          )}
        </nav>

        <div className="hidden lg:block mt-auto pt-8">
          <div className="border-t border-line pt-4">
            <p className="sidebar-label text-sm truncate">{user?.full_name || 'Loading account...'}</p>
            <p className="sidebar-label text-xs text-neutral-500 capitalize mt-1">{roleLabel}</p>
            <button onClick={logout} className="sidebar-label text-sm text-neutral-500 hover:text-white mt-4">Sign out</button>
          </div>
        </div>
      </div>
    </aside>
  );
}
