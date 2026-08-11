'use client';
import { useEffect, useRef, useState } from 'react';
import { getToken } from './api';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * EventSource (the browser's built-in SSE client) handles reconnection
 * automatically — no manual backoff loop needed like the WebSocket hook.
 * We just listen for named events ("alert") the server sends.
 */
export function useAlertStream(initialAlerts = []) {
  const [alerts, setAlerts] = useState(initialAlerts);
  const [connected, setConnected] = useState(false);
  const esRef = useRef(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const es = new EventSource(`${API_URL}/api/events/stream?token=${token}`);
    esRef.current = es;

    es.addEventListener('connected', () => setConnected(true));

    // Custom named event — matches `event: alert` sent by the server.
    // (Using addEventListener with a name, NOT the generic es.onmessage,
    // is what lets the server multiplex several event types on one stream.)
    es.addEventListener('alert', (event) => {
      const alert = JSON.parse(event.data);
      setAlerts((prev) => [alert, ...prev].slice(0, 50));
    });

    es.onerror = () => {
      setConnected(false);
      // No manual reconnect code needed — EventSource retries by itself
      // using the `retry:` interval the server sent.
    };

    return () => es.close();
  }, []);

  function updateAlert(id, changes) {
    setAlerts((prev) => prev.map((alert) => (
      alert.id === id ? { ...alert, ...changes } : alert
    )));
  }

  return { alerts, connected, updateAlert };
}
