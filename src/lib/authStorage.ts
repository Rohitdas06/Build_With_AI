/** Tab-scoped session: closing the tab ends the session (no silent auto-login on every new link). */
const TOKEN_KEY = 'shers_token';
const USER_KEY = 'shers_user';

function safeGet(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(storage: Storage, key: string, value: string) {
  try {
    storage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

function safeRemove(storage: Storage, key: string) {
  try {
    storage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** One-time: remove legacy localStorage tokens so old sessions do not bypass login. */
export function clearLegacyAuthFromLocalStorage() {
  safeRemove(localStorage, TOKEN_KEY);
  safeRemove(localStorage, USER_KEY);
}

export function getAuthToken(): string | null {
  return safeGet(sessionStorage, TOKEN_KEY);
}

export function getCachedUserJson(): string | null {
  return safeGet(sessionStorage, USER_KEY);
}

export function setAuthSession(token: string, userJson: string) {
  safeSet(sessionStorage, TOKEN_KEY, token);
  safeSet(sessionStorage, USER_KEY, userJson);
}

export function clearAuthSession() {
  safeRemove(sessionStorage, TOKEN_KEY);
  safeRemove(sessionStorage, USER_KEY);
}
