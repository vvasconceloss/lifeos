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
  }, []);

  const login = useCallback(async (data: LoginData) => {
    const res = await api.post<AuthResponse>("/auth/login", data);
    setUser(res.data.user);
  }, []);

  const logout = useCallback(async () => {
    document.cookie =
      "token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT";
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout }
    }>
      {children}
    </AuthContext.Provider>
  );
}
