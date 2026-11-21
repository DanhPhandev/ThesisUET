"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, UserCircle } from "lucide-react";
import { useAuth } from "@/features/auth/AuthProvider";
export function Header() {
  const pathname = usePathname() || "/";
  const { user } = useAuth();
  const [menu, setMenu] = useState(false);
  const nav = [
    { href: "/", label: "Trang chủ" },
    { href: "/practice", label: "Luyện tập" },
    { href: "/contests", label: "Cuộc thi" },
    { href: "/leaderboard", label: "Xếp hạng" },
    { href: "/blog", label: "Blog" },
    { href: "/about", label: "Giới thiệu" },
  ];
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex min-h-18 w-full max-w-7xl items-center justify-between gap-5 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 text-xl font-extrabold tracking-tight text-blue-950"
        >
          <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-blue-900 to-sky-400 text-lg text-white shadow-lg shadow-sky-200">
            C
          </span>
          Code<span className="text-sky-500">UET</span>
        </Link>
        <nav
          className="hidden items-center gap-1 lg:flex"
          aria-label="Điều hướng chính"
        >
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/")) ? "bg-sky-50 text-blue-900" : "text-slate-600 hover:bg-slate-50 hover:text-blue-900"}`}
            >
              {item.label}
            </Link>
          ))}
          {user && (user.role === "ADMIN" || user.role === "SETTER") && (
            <Link
              href="/management"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Quản lý
            </Link>
          )}
          {user?.role === "ADMIN" && (
            <Link
              href="/admin/user"
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${pathname.startsWith("/admin") ? "bg-sky-50 text-blue-900" : "text-slate-600 hover:bg-slate-50 hover:text-blue-900"}`}
            >
              Quản trị
            </Link>
          )}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          {user ? (
            <>
              <Link
                href="/profile"
                className="hidden items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 sm:flex"
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt=""
                    className="h-7 w-7 rounded-full object-cover"
                  />
                ) : (
                  <UserCircle className="h-5 w-5" />
                )}
                {user.fullName?.trim() || user.username}
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden rounded-xl px-3 py-2 text-sm font-semibold text-blue-900 sm:block"
              >
                Đăng nhập
              </Link>
              <Link
                href="/register"
                className="rounded-xl bg-sky-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-sky-600"
              >
                Đăng ký
              </Link>
            </>
          )}
          <button
            type="button"
            aria-label={menu ? "Đóng menu" : "Mở menu"}
            aria-expanded={menu}
            className="rounded-xl border border-slate-200 p-2 text-slate-700 lg:hidden"
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      {menu && (
        <nav
          className="grid gap-1 border-t border-slate-100 bg-white px-4 py-3 lg:hidden"
          aria-label="Điều hướng di động"
        >
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenu(false)}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {item.label}
            </Link>
          ))}
          {user && (
            <Link
              className="rounded-lg px-3 py-2 text-sm font-semibold"
              href="/profile"
              onClick={() => setMenu(false)}
            >
              Hồ sơ
            </Link>
          )}
          {user && (user.role === "SETTER" || user.role === "ADMIN") && (
            <Link
              className="rounded-lg px-3 py-2 text-sm font-semibold"
              href="/management"
              onClick={() => setMenu(false)}
            >
              Quản lý
            </Link>
          )}
          {user?.role === "ADMIN" && (
            <Link
              className="rounded-lg px-3 py-2 text-sm font-semibold"
              href="/admin/user"
              onClick={() => setMenu(false)}
            >
              Quản trị người dùng
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
