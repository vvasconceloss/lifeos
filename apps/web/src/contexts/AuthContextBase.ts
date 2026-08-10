import { createContext } from "react";

export type User = { id: string; email: string; name: string | null; timezone: string | null; weekStart: number; theme: string; onboarded: boolean; gamification: boolean; isDemo: boolean; createdAt: string; }
export type RegisterData = { email: string; password: string; name?: string; }
export type LoginData = { email: string; password: string; }
export type AuthResponse = { user: User; token: string; }

export type AuthContextValue = {
  user: User | null;
  loading: boolean;
  register: (data: RegisterData) => Promise<User>;
  login: (data: LoginData) => Promise<User>;
  demoLogin: () => Promise<User>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
