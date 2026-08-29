"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { LoginModal } from "@/components/Login/LoginModal";

export interface AuthUser {
  /** The signed-in phone number — 10 digits, no country code. */
  phone: string;
}

interface AuthContextValue {
  /** The signed-in user, or null when logged out. */
  user: AuthUser | null;
  isLoggedIn: boolean;
  /** Open the login dialog (e.g. from a gated cart/wishlist "Login to Proceed"). */
  promptLogin: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * App-wide auth (mock, in-memory — no backend/session). Owns the login dialog so
 * any component can trigger it via `promptLogin()`, and exposes `isLoggedIn` so
 * gated surfaces (the cart + wishlist popups) can show a "Login to Proceed" gate
 * until the user signs in.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [promptOpen, setPromptOpen] = useState(false);

  const promptLogin = useCallback(() => setPromptOpen(true), []);
  const closePrompt = useCallback(() => setPromptOpen(false), []);
  const logout = useCallback(() => setUser(null), []);

  const loginWithPhone = useCallback((phone: string) => {
    setUser({ phone });
    setPromptOpen(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isLoggedIn: user !== null, promptLogin, logout }),
    [user, promptLogin, logout],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      {promptOpen && <LoginModal onClose={closePrompt} onLoginPhone={loginWithPhone} />}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
