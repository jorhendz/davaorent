"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api, User } from "./api";

type AuthState = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; phone?: string; password: string; role: string }) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("davaorent_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api<{ user: User }>("/auth/me")
      .then((d) => setUser(d.user))
      .catch(() => localStorage.removeItem("davaorent_token"))
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const d = await api<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem("davaorent_token", d.token);
    setUser(d.user);
  }

  async function register(data: { name: string; email: string; phone?: string; password: string; role: string }) {
    const d = await api<{ token: string; user: User }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
    localStorage.setItem("davaorent_token", d.token);
    setUser(d.user);
  }

  function logout() {
    localStorage.removeItem("davaorent_token");
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
