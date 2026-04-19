import { useState, useEffect, useCallback, useRef } from 'react';
import { getAuthToken } from '../lib/authStorage';

/** Connects to `/ws` with JWT from `sessionStorage` (`shers_token`). */
export function useWebSocket() {
  const [lastEvent, setLastEvent] = useState<unknown>(null);
  const [status, setStatus] = useState<'connecting' | 'open' | 'closed'>('connecting');

  const connect = useCallback(() => {
    const token = getAuthToken();
    if (!token) {
      setStatus('closed');
      return;
    }
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?token=${encodeURIComponent(token)}`;

    const socket = new WebSocket(wsUrl);

    socket.onopen = () => setStatus('open');
    socket.onclose = () => {
      setStatus('closed');
      if (wsRef.current === socket) {
        setTimeout(connect, 3000);
      }
    };
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setLastEvent(data);
    };

    wsRef.current = socket;
  }, []);

  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'PING' }));
      }
    }, 30_000);
    return () => window.clearInterval(id);
  }, [connect]);

  return { lastEvent, status };
}
