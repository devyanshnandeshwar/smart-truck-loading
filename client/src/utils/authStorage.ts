const ACCESS_TOKEN_KEY = 'stlos.auth.access';
const REFRESH_TOKEN_KEY = 'stlos.auth.refresh';
const ROLE_KEY = 'stlos.auth.role';

export interface PersistedAuth {
  accessToken: string;
  refreshToken: string;
  role: string;
}

export const authStorage = {
  setAuth({ accessToken, refreshToken, role }: PersistedAuth) {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    localStorage.setItem(ROLE_KEY, role);
  },
  clear() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
  },
  getAccessToken() {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },
  getRefreshToken() {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },
  getRole() {
    return localStorage.getItem(ROLE_KEY);
  },
};
