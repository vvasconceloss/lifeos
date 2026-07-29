import { createContext } from "react";

export type User = { id: string; email: string; name: string | null; }
export type RegisterData = { email: string; password: string; name?: string; }
export type LoginData = { email: string; password: string; }
export type AuthResponse = { user: User; token: string; }

export type AuthContextValue = {
  user: User | null;
  loading: boolean;
  register: (data: RegisterData) => Promise<void>;
  login: (data: LoginData) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
