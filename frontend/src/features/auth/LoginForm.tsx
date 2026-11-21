"use client";
import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  api,
  type Problem,
  type Submission,
  type Contest,
  type Page,
  q,
} from "@/lib/api";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  Banner,
  Alert,
  Empty,
  Loading,
  Difficulty,
  Verdict,
  formatTime,
} from "@/components/ui/Status";
import { register } from "@/features/auth/api";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Eye, EyeOff } from "lucide-react";
import { GoogleSignInButton } from "./GoogleSignInButton";
export function LoginForm({ mode }: { mode: "login" | "register" }) {
  const [showPassword, setShowPassword] = useState(false);
  const { login, loginGoogle } = useAuth(),
    router = useRouter();
  const [values, setValues] = useState({
      username: "",
      email: "",
      password: "",
      fullName: "",
      login: "",
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  const update = (k: string, v: string) =>
    setValues((old) => ({ ...old, [k]: v }));
  const goAfterLogin = () => {
    const next = new URLSearchParams(window.location.search).get("next");
    router.push(next && next.startsWith("/") && !next.startsWith("//") ? next : "/practice");
  };
  const handleGoogle = async (credential: string) => {
    setError("");
    await loginGoogle(credential);
    goAfterLogin();
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "login") {
        await login(values.login, values.password);
        goAfterLogin();
      } else {
        await register(values);
        setSuccess("Đăng ký thành công. Hãy đăng nhập để bắt đầu.");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="form-shell">
      <div className="auth-card">
        <Link
          className="flex items-center gap-3 text-xl font-extrabold text-blue-950"
          href="/"
          style={{ justifyContent: "center", marginBottom: 24 }}
        >
          <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-blue-900 to-sky-400 text-white">
            C
          </span>
          <span>CodeUET</span>
        </Link>
        <h2>
          {mode === "login" ? "Đăng nhập" : "Đăng ký tài khoản"}
        </h2>
        <form onSubmit={submit}>
          {mode === "register" && (
            <>
              <div className="form-group">
                <label>Tên người dùng</label>
                <Input
                  className="input"
                  required
                  minLength={3}
                  value={values.username}
                  onChange={(e) => update("username", e.target.value)}
                  placeholder="nguyenvana"
                />
              </div>
              <div className="form-group">
                <label>Họ tên</label>
                <Input
                  className="input"
                  value={values.fullName}
                  onChange={(e) => update("fullName", e.target.value)}
                  placeholder="Nguyễn Văn A"
                />
              </div>
            </>
          )}
          {mode === "login" ? (
            <div className="form-group">
              <label>Tên tài khoản hoặc email</label>
              <Input
                className="input"
                required
                value={values.login}
                onChange={(e) => update("login", e.target.value)}
                placeholder="username hoặc email"
              />
            </div>
          ) : (
            <div className="form-group">
              <label>Email</label>
              <Input
                className="input"
                type="email"
                required
                value={values.email}
                onChange={(e) => update("email", e.target.value)}
              />
            </div>
          )}
          {["register", "login"].includes(mode) && (
            <div className="form-group">
              <label>Mật khẩu</label>
              <div className="relative">
                <Input
                  className="input"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={values.password}
                  onChange={(e) => update("password", e.target.value)}
                  placeholder="ít nhất 8 ký tự, chữ và số"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                >
                  {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                </button>
              </div>
            </div>
          )}
          <Button className="w-full" loading={busy} type="submit">
            {busy ? "Đang xử lý..." : mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
          </Button>
          {success && <div className="success form-message">{success}</div>}
        </form>
        {(mode === "login" || mode === "register") && (
          <div className="my-5 flex flex-col items-center gap-3">
            <div className="flex w-full items-center gap-3 text-xs text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              <span>Hoặc tiếp tục với</span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>
            <GoogleSignInButton onCredential={handleGoogle} disabled={busy} />
            {!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
              <p className="text-center text-xs text-slate-500">
                Đăng nhập Google chưa được cấu hình trên máy chủ.
              </p>
            )}
          </div>
        )}
        <p className="auth-switch">
          {mode === "login" ? (
            <>
              Chưa có tài khoản? <Link href="/register">Đăng ký</Link>
            </>
          ) : (
            <>
              Đã có tài khoản? <Link href="/login">Đăng nhập</Link>
            </>
          )}
        </p>
        <p className="auth-switch">
          <Link href="/">← Về trang chủ</Link>
        </p>
      </div>
    </main>
  );
}
