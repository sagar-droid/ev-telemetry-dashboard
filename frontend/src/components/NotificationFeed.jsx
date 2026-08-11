'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useAlertStream } from '../lib/useAlertStream';
import { api } from '../lib/api';

const SEVERITY_COLOR = {
  info: 'bg-blue-400',
  warning: 'bg-amber-400',
  critical: 'bg-red-500'
};

export default function NotificationFeed({ initialAlerts }) {
  const { alerts, connected, updateAlert } = useAlertStream(initialAlerts);
  const [open, setOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const unread = alerts.filter((alert) => !alert.is_read).length;

  async function handleAlertClick(alert) {
    setSelectedAlert(alert);
    if (alert.is_read) return;

    setSelectedAlert({ ...alert, is_read: true });
    updateAlert(alert.id, { is_read: true });
    try {
      await api.markAlertRead(alert.id);
    } catch {
      updateAlert(alert.id, { is_read: false });
      setSelectedAlert(alert);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative card px-3 py-2 flex items-center gap-2 text-sm"
      >
        <span className={`dot ${connected ? 'bg-volt' : 'bg-neutral-600'}`} />
        Alerts
        {unread > 0 && (
          <span className="ml-1 bg-volt text-black text-xs font-semibold rounded-full px-1.5">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 card p-2 max-h-96 overflow-y-auto z-20">
          {alerts.length === 0 && (
            <p className="text-neutral-500 text-sm p-3">No alerts yet.</p>
          )}
          {alerts.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => handleAlertClick(a)}
              className={`w-full text-left p-3 border-b border-line last:border-0 hover:bg-white/5 ${!a.is_read ? 'bg-white/[0.03]' : ''}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`dot ${SEVERITY_COLOR[a.severity] || 'bg-neutral-500'}`} />
                <span className="text-xs uppercase tracking-wide text-neutral-400">{a.type}</span>
                {!a.is_read && <span className="ml-auto text-[10px] uppercase text-volt">New</span>}
              </div>
              <p className="text-sm">{a.message}</p>
              <p className="text-xs text-neutral-500 mt-1">
                {new Date(a.created_at).toLocaleTimeString()}
              </p>
            </button>
          ))}
          <Link
            href="/alerts"
            onClick={() => setOpen(false)}
            className="block px-3 py-3 text-sm text-volt hover:text-white"
          >
            View all alerts
          </Link>
        </div>
      )}

      {selectedAlert && (
        <div className="absolute right-0 mt-2 w-80 card p-4 z-20">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase tracking-wide text-neutral-400">Alert details</span>
            <button
              type="button"
              onClick={() => setSelectedAlert(null)}
              className="text-neutral-500 hover:text-white text-lg leading-none"
              aria-label="Close alert details"
            >
              ×
            </button>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`dot ${SEVERITY_COLOR[selectedAlert.severity] || 'bg-neutral-500'}`} />
            <span className="text-sm uppercase tracking-wide">{selectedAlert.type}</span>
          </div>
          <p className="text-sm">{selectedAlert.message}</p>
          <p className="text-xs text-neutral-500 mt-3">
            {selectedAlert.nickname || `Vehicle #${selectedAlert.vehicle_id || selectedAlert.vehicleId}`} ·{' '}
            {new Date(selectedAlert.created_at).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}
