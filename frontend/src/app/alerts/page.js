'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, getToken } from '../../lib/api';
import AppSidebar from '../../components/AppSidebar';

const SEVERITY_COLOR = {
  info: 'bg-blue-400',
  warning: 'bg-amber-400',
  critical: 'bg-red-500'
};

export default function AlertsPage() {
  const router = useRouter();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }

    api.getAlerts()
      .then(setAlerts)
      .catch(() => setError('Could not load alerts.'))
      .finally(() => setLoading(false));
  }, [router]);

  async function markRead(alert) {
    if (alert.is_read) return;
    setAlerts((current) => current.map((item) => (
      item.id === alert.id ? { ...item, is_read: true } : item
    )));
    try {
      await api.markAlertRead(alert.id);
    } catch {
      setAlerts((current) => current.map((item) => (
        item.id === alert.id ? { ...item, is_read: false } : item
      )));
    }
  }

  return (
    <div className="min-h-screen lg:flex">
      <AppSidebar />
      <main className="dashboard-main w-full mx-auto px-4 py-6 lg:px-8 lg:py-8">
        <header className="flex items-center justify-between mb-8">
        <div>
          <Link href="/dashboard" className="text-xs tracking-[0.2em] text-volt uppercase hover:text-white">
            Fleet Dashboard
          </Link>
          <h1 className="text-2xl font-semibold mt-2">All alerts</h1>
          <p className="text-sm text-neutral-500 mt-1">Review every alert from your vehicles.</p>
        </div>
      </header>

      {loading && <p className="text-neutral-500">Loading alerts...</p>}
      {error && <p className="text-red-400">{error}</p>}
      {!loading && !error && alerts.length === 0 && (
        <p className="text-neutral-500">No alerts yet.</p>
      )}

      <div className="space-y-3">
        {alerts.map((alert) => (
          <button
            key={alert.id}
            type="button"
            onClick={() => markRead(alert)}
            className={`card w-full text-left p-4 hover:border-volt/50 ${!alert.is_read ? 'border-volt/40' : ''}`}
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className={`dot ${SEVERITY_COLOR[alert.severity] || 'bg-neutral-500'}`} />
              <span className="text-xs uppercase tracking-wide text-neutral-400">{alert.type}</span>
              <span className="text-xs text-neutral-500">{alert.nickname || `Vehicle #${alert.vehicle_id}`}</span>
              {!alert.is_read && <span className="ml-auto text-xs text-volt">Unread</span>}
            </div>
            <p className="text-base mt-3">{alert.message}</p>
            <p className="text-xs text-neutral-500 mt-2">
              {new Date(alert.created_at).toLocaleString()}
            </p>
          </button>
        ))}
      </div>
      </main>
    </div>
  );
}
