import { api } from "@/lib/api";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AuthContext, type AuthResponse, type LoginData, type RegisterData, type User } from "./AuthContextBase";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ user: User }>("/auth/me")
      .then((res) => setUser(res.data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    const res = await api.post<AuthResponse>("/auth/register", data);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const login = useCallback(async (data: LoginData) => {
    const res = await api.post<AuthResponse>("/auth/login", data);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const demoLogin = useCallback(async () => {
    const res = await api.post<AuthResponse>("/auth/demo");
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.get<{ user: User }>("/auth/me");
      setUser(res.data.user);
    } catch {
      setUser(null);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Clear state even if the API call fails
    }
    setUser(null);
  }, []);

  const resendVerification = useCallback(async (email: string, redirect?: string) => {
    await api.post("/auth/resend-verification", redirect ? { email, redirect } : { email });
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, register, login, demoLogin, refreshUser, logout, resendVerification }}
    >
      {children}
    </AuthContext.Provider>
  );
}
