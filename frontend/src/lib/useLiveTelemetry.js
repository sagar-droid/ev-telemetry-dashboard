'use client';
import { useEffect, useRef, useState } from 'react';
import { getToken } from './api';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL;

/**
 * Opens ONE WebSocket per vehicle and keeps the latest telemetry frame
 * in state. Includes manual reconnect-with-backoff, because unlike SSE's
 * EventSource, the browser's native WebSocket does NOT auto-reconnect —
 * that's something you always have to build yourself.
 */
export function useLiveTelemetry(vehicleId) {
  const [telemetry, setTelemetry] = useState(null);
  const [status, setStatus] = useState('connecting'); // connecting | open | closed
  const wsRef = useRef(null);
  const attemptRef = useRef(0);
  const shouldReconnect = useRef(true);

  useEffect(() => {
    if (!vehicleId) return;
    shouldReconnect.current = true;

    function connect() {
      const token = getToken();
      const ws = new WebSocket(`${WS_URL}/ws/live?token=${token}&vehicleId=${vehicleId}`);
      wsRef.current = ws;
      setStatus('connecting');

      ws.onopen = () => {
        setStatus('open');
        attemptRef.current = 0; // reset backoff on a clean connect
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'telemetry') setTelemetry(msg.data);
      };

      ws.onclose = () => {
        setStatus('closed');
        if (!shouldReconnect.current) return;
        // Exponential backoff: 1s, 2s, 4s, 8s... capped at 15s
        const delay = Math.min(1000 * 2 ** attemptRef.current, 15000);
        attemptRef.current += 1;
        setTimeout(connect, delay);
      };

      ws.onerror = () => ws.close();
    }

    connect();

    return () => {
      shouldReconnect.current = false;
      wsRef.current?.close();
    };
  }, [vehicleId]);

  // Send a command down the same socket (bidirectional — SSE can't do this)
  function sendCommand(action) {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'command', action }));
    }
  }

  return { telemetry, status, sendCommand };
}
