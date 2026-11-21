"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Loader2,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/features/auth/AuthProvider";
import { api, q } from "@/lib/api";
import type { Role } from "@/types";

type UserStatus = "ACTIVE" | "LOCKED" | "BANNED";
type PgText = { type?: string; value?: string | null; null?: boolean };
type AdminUserResponse = {
  id: number;
  username: string | PgText;
  full_name?: string | PgText | null;
  email: string | PgText;
  role: Role | PgText;
  status: UserStatus | PgText;
  created_at?: string;
};
type AdminUser = {
  id: number;
  username: string;
  fullName: string;
  email: string;
  role: Role;
  status: UserStatus;
  createdAt?: string;
};
type Change = {
  user: AdminUser;
  field: "role" | "status";
  from: string;
  to: string;
};

const roles: { value: Role; label: string; description: string }[] = [
  { value: "USER", label: "USER – Người dùng", description: "Luyện tập và tham gia cuộc thi" },
  { value: "SETTER", label: "SETTER – Người ra đề", description: "Có thêm quyền quản lý bài tập và cuộc thi" },
  { value: "ADMIN", label: "ADMIN – Quản trị viên", description: "Toàn quyền quản trị và phân quyền tài khoản" },
];
const statuses: { value: UserStatus; label: string }[] = [
  { value: "ACTIVE", label: "Đang hoạt động" },
  { value: "LOCKED", label: "Đã khóa" },
  { value: "BANNED", label: "Đã cấm" },
];

// PostgreSQL CITEXT can be serialized as { type: "citext", value: "...", null: false }
// by an older backend. Never render raw API objects as React children.
function plainText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (value && typeof value === "object" && "value" in value) {
    const raw = (value as PgText).value;
    return typeof raw === "string" ? raw : "";
  }
  return "";
}

function normalizeUser(user: AdminUserResponse): AdminUser {
  const username = plainText(user.username);
  return {
    id: Number(user.id),
    username,
    fullName: plainText(user.full_name).trim() || username,
    email: plainText(user.email),
    role: plainText(user.role) as Role,
    status: plainText(user.status) as UserStatus,
    createdAt: user.created_at,
  };
}

function statusLabel(status: UserStatus) {
  return statuses.find((item) => item.value === status)?.label ?? status;
}

function roleBadge(role: Role) {
  return role === "ADMIN"
    ? "border-purple-200 bg-purple-50 text-purple-700"
    : role === "SETTER"
      ? "border-sky-200 bg-sky-50 text-sky-700"
      : "border-slate-200 bg-slate-100 text-slate-700";
}

function statusBadge(status: UserStatus) {
  return status === "ACTIVE"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : status === "LOCKED"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-red-200 bg-red-50 text-red-700";
}

export function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<Change | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setUsers([]);
    api.get<AdminUserResponse[]>(`/admin/users${q({ q: appliedSearch })}`, { silent: true })
      .then((result) => {
        if (active) setUsers(Array.isArray(result) ? result.map(normalizeUser) : []);
      })
      .catch((reason: Error) => {
        if (active) setError(reason.message || "Không thể tải danh sách tài khoản");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [appliedSearch, refreshKey]);

  useEffect(() => {
    if (!pending || saving) return;
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPending(null);
    };
    window.addEventListener("keydown", closeWithEscape);
    return () => window.removeEventListener("keydown", closeWithEscape);
  }, [pending, saving]);

  const counts = useMemo(() => ({
    total: users.length,
    admins: users.filter((u) => u.role === "ADMIN").length,
    setters: users.filter((u) => u.role === "SETTER").length,
    active: users.filter((u) => u.status === "ACTIVE").length,
  }), [users]);

  const askChange = (user: AdminUser, field: Change["field"], to: string) => {
    if (user.id === currentUser?.id || user[field] === to) return;
    setError("");
    setPending({ user, field, from: user[field], to });
  };

  const confirmChange = async () => {
    if (!pending || saving) return;
    setSaving(true);
    setError("");
    try {
      const { user, field, to } = pending;
      await api.patch(
        `/admin/users/${user.id}/${field}`,
        { [field]: to },
        { successMessage: field === "role" ? "Đã cập nhật quyền tài khoản" : "Đã cập nhật trạng thái tài khoản" },
      );
      // Update the row immediately and then reconcile with authoritative server data.
      setUsers((previous) => previous.map((entry) => entry.id !== user.id ? entry : {
        ...entry,
        [field]: to,
      } as AdminUser));
      setPending(null);
      setRefreshKey((key) => key + 1);
    } catch (reason) {
      setError((reason as Error).message || "Không thể cập nhật tài khoản");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-sky-700">
            <Shield className="size-4" /> Quản trị quyền truy cập
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Quản lý tài khoản</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Tìm kiếm người dùng, cấp quyền ra đề hoặc quản trị, và quản lý trạng thái đăng nhập.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          onClick={() => setRefreshKey((key) => key + 1)}
          disabled={loading}
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Làm mới
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Tài khoản trong kết quả", value: counts.total, icon: Users },
          { label: "Quản trị viên", value: counts.admins, icon: ShieldAlert },
          { label: "Người ra đề", value: counts.setters, icon: Shield },
          { label: "Đang hoạt động", value: counts.active, icon: CheckCircle2 },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-2 text-slate-500">
              <span className="text-xs font-medium sm:text-sm">{label}</span>
              <Icon className="size-5 text-sky-600" />
            </div>
            <div className="text-3xl font-extrabold text-blue-950">{loading ? "–" : value}</div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4 sm:p-5">
          <form
            className="flex flex-wrap gap-3"
            onSubmit={(event) => { event.preventDefault(); setAppliedSearch(search.trim()); setRefreshKey((key) => key + 1); }}
          >
            <label className="relative min-w-56 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <span className="sr-only">Tìm tài khoản theo họ tên, username hoặc email</span>
              <input
                className="w-full pl-10!"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm họ tên, username hoặc email..."
              />
            </label>
            <button type="submit" className="rounded-xl bg-blue-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800">
              Tìm kiếm
            </button>
            {appliedSearch && (
              <button
                type="button"
                onClick={() => { setSearch(""); setAppliedSearch(""); setRefreshKey((key) => key + 1); }}
                className="rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Xóa lọc
              </button>
            )}
          </form>
          <p className="mt-3 text-xs text-slate-500">
            Hiển thị tối đa 100 tài khoản theo kết quả tìm kiếm. Quyền mới chỉ được lưu sau khi xác nhận.
          </p>
        </div>

        {error && !pending && (
          <p role="alert" className="mx-4 mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:mx-5">
            <AlertCircle className="size-4 shrink-0" /> {error}
          </p>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-3 px-4 py-16 text-sm text-slate-500">
            <Loader2 className="size-5 animate-spin text-sky-600" /> Đang tải danh sách tài khoản...
          </div>
        ) : users.length === 0 ? (
          <div className="px-4 py-16 text-center text-sm text-slate-500">Không tìm thấy tài khoản phù hợp.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[840px] text-sm">
              <thead>
                <tr>
                  <th>Người dùng</th>
                  <th>Email</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                  <th>Hồ sơ</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const isMe = user.id === currentUser?.id;
                  return (
                    <tr key={user.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-100 font-bold text-blue-800">
                            {(user.fullName || user.username).slice(0, 1).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 font-semibold text-slate-900">
                              <span className="max-w-52 truncate">{user.fullName}</span>
                              {isMe && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] text-blue-700">Bạn</span>}
                            </div>
                            <div className="mt-0.5 text-xs text-slate-500">@{user.username} · #{user.id}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className="break-all text-slate-600">{user.email || "—"}</span></td>
                      <td>
                        <div className="space-y-2">
                          <span className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-bold ${roleBadge(user.role)}`}>
                            {user.role}
                          </span>
                          <select
                            aria-label={`Thay đổi quyền của ${user.username}`}
                            className="min-w-36 py-2"
                            value={user.role}
                            onChange={(event) => askChange(user, "role", event.target.value)}
                            disabled={isMe || saving}
                            title={isMe ? "Không thể tự thay đổi quyền của mình" : "Chọn vai trò mới"}
                          >
                            {roles.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                          </select>
                        </div>
                      </td>
                      <td>
                        <div className="space-y-2">
                          <span className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-bold ${statusBadge(user.status)}`}>
                            {statusLabel(user.status)}
                          </span>
                          <select
                            aria-label={`Thay đổi trạng thái của ${user.username}`}
                            className="min-w-36 py-2"
                            value={user.status}
                            onChange={(event) => askChange(user, "status", event.target.value)}
                            disabled={isMe || saving}
                            title={isMe ? "Không thể tự khóa tài khoản" : "Chọn trạng thái mới"}
                          >
                            {statuses.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                          </select>
                        </div>
                      </td>
                      <td>
                        <Link href={`/u/${encodeURIComponent(user.username)}`} className="inline-flex items-center gap-1 font-semibold text-sky-700 hover:underline">
                          Xem <ChevronRight className="size-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs leading-6 text-slate-600">
        <strong>Lưu ý bảo mật:</strong> USER chỉ sử dụng hệ thống, SETTER có quyền ra đề,
        ADMIN có thể cấp và thu hồi quyền của người khác. Bạn không thể sửa quyền hoặc khóa tài khoản đang đăng nhập.
      </div>

      {pending && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/60 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setPending(null); }}
        >
          <div role="dialog" aria-modal="true" aria-labelledby="admin-confirm-title" aria-describedby="admin-confirm-description"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <span className="grid size-12 place-items-center rounded-xl bg-amber-50 text-amber-700">
                <ShieldAlert className="size-6" />
              </span>
              <button type="button" aria-label="Đóng" onClick={() => setPending(null)} disabled={saving}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="size-5" /></button>
            </div>
            <h3 id="admin-confirm-title" className="mt-4 text-xl font-extrabold text-blue-950">
              {pending.field === "role" ? "Xác nhận thay đổi quyền" : "Xác nhận trạng thái tài khoản"}
            </h3>
            <p id="admin-confirm-description" className="mt-2 text-sm leading-6 text-slate-600">
              Bạn có chắc chắn muốn {pending.field === "role" ? "đổi quyền" : "đổi trạng thái"} của
              {" "}<strong>{pending.user.fullName}</strong> (@{pending.user.username}) không?
            </p>
            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-4 text-sm">
              <span className="font-semibold text-slate-500">{pending.from}</span>
              <ChevronRight className="size-5 shrink-0 text-slate-400" />
              <span className="font-extrabold text-blue-900">{pending.to}</span>
            </div>
            {pending.field === "role" && (
              <p className="mt-3 text-xs leading-5 text-amber-800">
                {roles.find((role) => role.value === pending.to)?.description}
                {pending.to === "ADMIN" ? ". Quyền ADMIN cho phép thay đổi quyền của tài khoản khác." : "."}
              </p>
            )}
            {pending.field === "status" && pending.to !== "ACTIVE" && (
              <p className="mt-3 text-xs text-amber-800">Tài khoản này sẽ không thể đăng nhập cho đến khi được mở lại.</p>
            )}
            {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" disabled={saving} onClick={() => setPending(null)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Hủy
              </button>
              <button type="button" disabled={saving} onClick={confirmChange}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50">
                {saving && <Loader2 className="size-4 animate-spin" />} Xác nhận cập nhật
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
