"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { ApiError, apiGet, apiPost } from "../lib/api-client";
import {
  clearAuth,
  getStoredAuth,
  saveAuth,
  type AuthUser,
} from "../lib/auth";

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: AuthUser, rememberMe: boolean) => void;
  logout: () => Promise<void>;
  refreshCurrentUser: () => Promise<AuthUser | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const sessionVersion = useRef(0);

  const resetSession = useCallback(() => {
    sessionVersion.current += 1;
    clearAuth();
    setUser(null);
    setToken(null);
    setIsLoading(false);
  }, []);

  const refreshCurrentUser = useCallback(async () => {
    const storedAuth = getStoredAuth();

    if (!storedAuth) {
      resetSession();
      setIsLoading(false);
      return null;
    }

    setIsLoading(true);
    const requestVersion = sessionVersion.current;

    try {
      const currentUser = await apiGet<AuthUser>("/api/user");

      if (requestVersion !== sessionVersion.current) {
        return null;
      }

      saveAuth(storedAuth.token, currentUser, storedAuth.rememberMe);
      setToken(storedAuth.token);
      setUser(currentUser);

      return currentUser;
    } catch (error) {
      if (
        requestVersion === sessionVersion.current &&
        error instanceof ApiError &&
        error.status === 401
      ) {
        resetSession();
        router.replace("/");
      }

      return null;
    } finally {
      if (requestVersion === sessionVersion.current) {
        setIsLoading(false);
      }
    }
  }, [resetSession, router]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshCurrentUser();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [refreshCurrentUser]);

  const login = useCallback(
    (newToken: string, authenticatedUser: AuthUser, rememberMe: boolean) => {
      sessionVersion.current += 1;
      saveAuth(newToken, authenticatedUser, rememberMe);
      setToken(newToken);
      setUser(authenticatedUser);
      setIsLoading(false);
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      if (getStoredAuth()) {
        await apiPost<{ message: string }>("/api/logout");
      }
    } catch {
      // Local session tetap dibersihkan jika logout API gagal.
    } finally {
      resetSession();
      router.replace("/");
    }
  }, [resetSession, router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(user && token),
      isLoading,
      login,
      logout,
      refreshCurrentUser,
    }),
    [user, token, isLoading, login, logout, refreshCurrentUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth harus digunakan di dalam AuthProvider.");
  }

  return context;
}
