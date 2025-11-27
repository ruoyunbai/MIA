const TOKEN_KEY = 'mia_token';
export const AUTH_LOGOUT_EVENT = 'mia:auth:logout';

const isBrowser = typeof window !== 'undefined';

export const getAuthToken = (): string | null => {
  if (!isBrowser) return null;
  return window.localStorage.getItem(TOKEN_KEY);
};

export const setAuthToken = (token: string): void => {
  if (!isBrowser) return;
  window.localStorage.setItem(TOKEN_KEY, token);
};

export const clearAuthToken = (): void => {
  if (!isBrowser) return;
  window.localStorage.removeItem(TOKEN_KEY);
};
