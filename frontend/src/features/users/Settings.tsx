"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth, RequireAuth } from "@/features/auth/AuthProvider";
import { Banner, Alert } from "@/components/ui/Status";
export function Settings() {
  const { user, reloadUser } = useAuth(),
    [name, setName] = useState(""),
    [bio, setBio] = useState(""),
    [school, setSchool] = useState(""),
    [message, setMessage] = useState(""),
    [err, setErr] = useState(""),
    [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!user) return;
    api
      .get<Record<string, string>>(`/users/${user.username}`)
      .then((r) => {
        setName(r.full_name || "");
        setBio(r.bio || "");
        setSchool(r.school || "");
      })
      .catch(() => {});
  }, [user]);
  const save = async () => {
    if (saving) return;
    setSaving(true);
    setErr("");
    setMessage("");
    try {
      await api.patch("/users/me", { fullName: name, bio, school }, { silent: true });
      await reloadUser();
      setMessage("Đã cập nhật hồ sơ");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Không thể cập nhật hồ sơ");
    } finally {
      setSaving(false);
    }
  };
  return (
    <RequireAuth>
      <Banner
        title="Cài đặt tài khoản"
        description="Cập nhật thông tin hồ sơ công khai."
      />
      <section className="section container narrow">
        <div className="card">
          <div className="card-body">
            <h2>Thông tin cá nhân</h2>
            <div className="form-group">
              <label>Họ tên</label>
              <input
                className="input"
                value={name}
                maxLength={100}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Giới thiệu</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={500}
              />
            </div>
            <div className="form-group">
              <label>Trường học</label>
              <input
                className="input"
                value={school}
                maxLength={150}
                onChange={(e) => setSchool(e.target.value)}
              />
            </div>
            {err && <Alert message={err} />}
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
            {message && <p className="success">{message}</p>}
            <p className="mt-4 text-sm text-slate-600">
              Muốn thay ảnh đại diện? <Link href="/profile" className="font-semibold text-blue-700 hover:underline">Mở hồ sơ cá nhân</Link>.
            </p>
          </div>
        </div>
      </section>
    </RequireAuth>
  );
}
