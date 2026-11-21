import { api, setToken } from "@/lib/api";
import type { User } from "@/types";
let refreshInFlight: Promise<User | null> | null = null;
export async function refresh(): Promise<User | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const session = await api.post<{ accessToken: string; user: User }>(
        "/auth/refresh",
        {},
        { silent: true },
      );
      setToken(session.accessToken);
      return session.user;
    } catch {
      setToken(null);
      return null;
    }
  })().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}
export async function login(login: string, password: string) {
  const session = await api.post<{ accessToken: string; user: User }>(
    "/auth/login",
    { login, password },
    { successMessage: "Đăng nhập thành công" },
  );
  setToken(session.accessToken);
  return session.user;
}
export async function googleLogin(credential: string) {
  const session = await api.post<{ accessToken: string; user: User }>(
    "/auth/google/login",
    { credential },
    { successMessage: "Đăng nhập Google thành công" },
  );
  setToken(session.accessToken);
  return session.user;
}

export async function register(payload: {
  username: string;
  email: string;
  password: string;
  fullName: string;
}) {
  return api.post<User>("/auth/register", payload, {
    successMessage: "Tạo tài khoản thành công",
  });
}
export async function logout() {
  try {
    await api.post("/auth/logout", {}, { successMessage: "Đã đăng xuất" });
  } finally {
    setToken(null);
  }
}
