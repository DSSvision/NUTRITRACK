'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import {
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  restoreSession,
  getProfile,
  type AuthUser,
} from '@calorie-tracker/api-client';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const restoreUserSession = useCallback(async () => {
    try {
      const token = await restoreSession();

      if (!token) {
        setUser(null);
        return;
      }

      const profile = await getProfile();

      setUser({
        id: profile.id,
        name: profile.name,
        email: profile.email,
      });
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void restoreUserSession();
  }, [restoreUserSession]);

  const login = async (email: string, password: string) => {
    const authenticatedUser = await apiLogin(email, password);
    setUser(authenticatedUser);
  };

  const register = async (name: string, email: string, password: string) => {
    const authenticatedUser = await apiRegister(name, email, password);
    setUser(authenticatedUser);
  };

  const logout = async () => {
    try {
      await apiLogout();
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: Boolean(user),
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
