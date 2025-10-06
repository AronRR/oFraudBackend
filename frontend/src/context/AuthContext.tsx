import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: string;
};

type SessionPayload = {
  accessToken: string;
  refreshToken: string | null;
  user?: AuthUser | null;
};

type AuthContextValue = {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  logout: () => void;
  setTokens: (tokens: { accessToken: string; refreshToken?: string }) => void;
};

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL ?? 'http://localhost:3000';
const STORAGE_KEY = 'ofraud.admin.session';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) {
    return {} as T;
  }
  return JSON.parse(text) as T;
}

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
};

type ProfileResponse = {
  profile: AuthUser;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const persistSession = useCallback((payload: SessionPayload | null) => {
    if (!payload) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        accessToken: payload.accessToken,
        refreshToken: payload.refreshToken,
        user: payload.user ?? null,
      }),
    );
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    persistSession(null);
  }, [persistSession]);

  const loadProfile = useCallback(
    async (token: string) => {
      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('No se pudo obtener el perfil');
      }

      const data = await readJson<ProfileResponse>(response);
      setUser(data.profile);
      return data.profile;
    },
    [],
  );

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setLoading(false);
      return;
    }

    try {
      const session = JSON.parse(stored) as SessionPayload;
      if (session.accessToken) {
        setAccessToken(session.accessToken);
        setRefreshToken(session.refreshToken ?? null);
        if (session.user) {
          setUser(session.user);
          setLoading(false);
        } else {
          loadProfile(session.accessToken)
            .catch(() => {
              logout();
            })
            .finally(() => setLoading(false));
          return;
        }
      }
    } catch (error) {
      console.error('Error al cargar la sesión', error);
      persistSession(null);
    }
    setLoading(false);
  }, [loadProfile, logout, persistSession]);

  const login = useCallback(
    async (credentials: { email: string; password: string }) => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(credentials),
        });

        if (!response.ok) {
          const errorPayload = await response.json().catch(() => ({}));
          const message =
            typeof errorPayload.message === 'string'
              ? errorPayload.message
              : Array.isArray(errorPayload.message)
              ? errorPayload.message.join(', ')
              : 'Credenciales inválidas';
          throw new Error(message);
        }

        const data = (await readJson<LoginResponse>(response));
        setAccessToken(data.accessToken);
        setRefreshToken(data.refreshToken);

        const profile = await loadProfile(data.accessToken);
        persistSession({ accessToken: data.accessToken, refreshToken: data.refreshToken, user: profile });
      } finally {
        setLoading(false);
      }
    },
    [loadProfile, persistSession],
  );

  const setTokens = useCallback(
    ({ accessToken: newAccessToken, refreshToken: newRefreshToken }: { accessToken: string; refreshToken?: string }) => {
      setAccessToken(newAccessToken);
      const effectiveRefresh = newRefreshToken ?? refreshToken ?? null;
      if (newRefreshToken !== undefined) {
        setRefreshToken(newRefreshToken ?? null);
      }
      persistSession({ accessToken: newAccessToken, refreshToken: effectiveRefresh, user });
    },
    [persistSession, refreshToken, user],
  );

  const value = useMemo(
    () => ({
      user,
      accessToken,
      refreshToken,
      loading,
      isAuthenticated: Boolean(accessToken),
      login,
      logout,
      setTokens,
    }),
    [accessToken, loading, login, logout, refreshToken, setTokens, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContext debe utilizarse dentro de AuthProvider');
  }
  return ctx;
}
