import { useState, useEffect, useRef } from 'react';
import type { User } from '../types/shers';
import { api } from '../api/client';
import {
  clearAuthSession,
  clearLegacyAuthFromLocalStorage,
  getAuthToken,
  setAuthSession,
} from '../lib/authStorage';

function isValidUser(u: unknown): u is User {
  if (!u || typeof u !== 'object') return false;
  const o = u as Record<string, unknown>;
  return typeof o.id === 'string' && typeof o.username === 'string' && typeof o.role === 'string';
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  /** Bumps on each effect run and on login/logout so stale `getMe()` cannot overwrite session. */
  const sessionGeneration = useRef(0);

  const bumpSessionGeneration = () => {
    sessionGeneration.current += 1;
  };

  useEffect(() => {
    clearLegacyAuthFromLocalStorage();
    const myGen = ++sessionGeneration.current;

    (async () => {
      const token = getAuthToken();
      if (!token) {
        if (sessionGeneration.current !== myGen) return;
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const me = await api.getMe();
        if (sessionGeneration.current !== myGen) return;
        if (!isValidUser(me)) {
          throw new Error('Invalid session');
        }
        setUser(me);
        setAuthSession(token, JSON.stringify(me));
      } catch {
        if (sessionGeneration.current !== myGen) return;
        clearAuthSession();
        setUser(null);
      } finally {
        if (sessionGeneration.current === myGen) {
          setLoading(false);
        }
      }
    })();
  }, []);

  const login = (token: string, profile: User) => {
    bumpSessionGeneration();
    setAuthSession(token, JSON.stringify(profile));
    setUser(profile);
    setLoading(false);
  };

  const logout = () => {
    bumpSessionGeneration();
    clearAuthSession();
    setUser(null);
    setLoading(false);
  };

  return { user, login, logout, isLoading: loading };
}
