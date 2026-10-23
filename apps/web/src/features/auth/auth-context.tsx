import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import type { AuthResponse, CurrentUser, LoginInput, RegisterInput } from "@chatbox/shared";

import { api, applyAuth, clearAuth, refreshSession } from "@/lib/api";
import { queryClient } from "@/lib/query";
import { disconnectSocket } from "@/lib/socket";

type Status = "loading" | "authenticated" | "anonymous";

interface AuthContextValue {
  status: Status;
  user: CurrentUser | null;
  signIn: (input: LoginInput) => Promise<void>;
  signUp: (input: RegisterInput) => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: CurrentUser) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUserState] = useState<CurrentUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const token = await refreshSession();
      if (!token) {
        if (!cancelled) setStatus("anonymous");
        return;
      }
      const me = await api.get<CurrentUser>("/users/me").catch(() => null);
      if (cancelled) return;
      setUserState(me);
      setStatus(me ? "authenticated" : "anonymous");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const accept = useCallback((response: AuthResponse) => {
    applyAuth(response);
    setUserState(response.user);
    setStatus("authenticated");
  }, []);

  const signIn = useCallback(
    async (input: LoginInput) =>
      accept(await api.post<AuthResponse>("/auth/login", { ...input, platform: "web" })),
    [accept],
  );

  const signUp = useCallback(
    async (input: RegisterInput) =>
      accept(await api.post<AuthResponse>("/auth/register", { ...input, platform: "web" })),
    [accept],
  );

  const signOut = useCallback(async () => {
    await api.post("/auth/logout").catch(() => undefined);
    disconnectSocket();
    clearAuth();
    queryClient.clear();
    setUserState(null);
    setStatus("anonymous");
  }, []);

  const value = useMemo(
    () => ({ status, user, signIn, signUp, signOut, setUser: setUserState }),
    [status, user, signIn, signUp, signOut],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
};

export const useAuth = (): AuthContextValue => {
  const context = use(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
};

export const useCurrentUser = (): CurrentUser => {
  const { user } = useAuth();
  if (!user) throw new Error("No signed-in user");
  return user;
};
