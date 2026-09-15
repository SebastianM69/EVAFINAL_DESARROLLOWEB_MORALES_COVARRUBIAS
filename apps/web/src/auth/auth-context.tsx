import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { apiClient } from '../services/api-client';
import type { AuthStatus, PublicUser } from '../types/auth';

type AuthContextValue = {
  status: AuthStatus;
  user: PublicUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [status, setStatus] = useState<AuthStatus>('CHECKING');
  const [user, setUser] = useState<PublicUser | null>(null);
  const authGeneration = useRef(0);

  useEffect(() => {
    let active = true;
    const generation = ++authGeneration.current;
    void apiClient
      .refresh()
      .then((result) => {
        if (active && authGeneration.current === generation) {
          apiClient.setAccessToken(result.accessToken);
          setUser(result.user);
          setStatus('AUTHENTICATED');
        }
      })
      .catch(() => {
        if (active && authGeneration.current === generation) {
          apiClient.setAccessToken(null);
          setUser(null);
          setStatus('UNAUTHENTICATED');
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      async login(email, password) {
        authGeneration.current += 1;
        const result = await apiClient.login(email, password);
        apiClient.setAccessToken(result.accessToken);
        setUser(result.user);
        setStatus('AUTHENTICATED');
      },
      async logout() {
        authGeneration.current += 1;
        try {
          await apiClient.logout();
        } finally {
          apiClient.setAccessToken(null);
          setUser(null);
          setStatus('UNAUTHENTICATED');
        }
      },
    }),
    [status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }
  return context;
}
