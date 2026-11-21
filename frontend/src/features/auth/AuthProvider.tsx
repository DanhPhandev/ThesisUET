"use client";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import type { User } from "@/types";
import { api } from "@/lib/api";
import { refresh, login as loginRequest, googleLogin as googleLoginRequest, logout as logoutRequest } from "./api";
import { Loading } from "@/components/ui/Loading";
type Session = {
  user: User | null;
  loading: boolean;
  login: (u: string, p: string) => Promise<void>;
  loginGoogle: (credential: string) => Promise<void>;
  logout: () => Promise<void>;
  reloadUser: () => Promise<void>;
};
const C = createContext<Session | undefined>(undefined);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let mounted = true;
    refresh()
      .then((v) => {
        if (mounted) setUser(v);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);
  const login = useCallback(async (u: string, p: string) => {
    setUser(await loginRequest(u, p));
  }, []);
  const loginGoogle = useCallback(async (credential: string) => {
    setUser(await googleLoginRequest(credential));
  }, []);
  const reloadUser = useCallback(async () => {
    const latest = await api.get<User>("/auth/me", { silent: true });
    setUser(latest);
  }, []);
  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      setUser(null);
    }
  }, []);
  return (
    <C.Provider value={{ user, loading, login, loginGoogle, logout, reloadUser }}>{children}</C.Provider>
  );
}
export function useAuth() {
  const c = useContext(C);
  if (!c) throw new Error("useAuth phải nằm trong AuthProvider");
  return c;
}
export function RequireAuth({
  children,
  role,
}: {
  children: React.ReactNode;
  role?: "SETTER" | "ADMIN";
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const path = usePathname();
  useEffect(() => {
    if (!loading && !user)
      router.replace(`/login?next=${encodeURIComponent(path || "/")}`);
  }, [loading, user, router, path]);
  if (loading || !user)
    return <Loading label="Đang xác thực phiên đăng nhập..." />;
  if (role && user.role !== "ADMIN" && user.role !== role)
    return (
      <section className="container section">
        <p className="error">Bạn không có quyền truy cập trang này.</p>
      </section>
    );
  return <>{children}</>;
}
