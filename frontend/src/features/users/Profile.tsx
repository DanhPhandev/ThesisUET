"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import { useAuth } from "@/features/auth/AuthProvider";
import { LogoutButton } from "@/features/auth/LogoutButton";
import {
  Banner,
  Alert,
  Empty,
  Loading,
  Difficulty,
} from "@/components/ui/Status";

interface ProfileData {
  full_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  school?: string | null;
  stats?: {
    solved?: number;
    easy?: number;
    medium?: number;
    hard?: number;
  };
  rank?: { rank?: number | null };
}

interface SolvedProblem {
  slug: string;
  title: string;
  difficulty: string;
}

interface Achievement {
  code: string;
  name: string;
  description: string;
}

export function Profile({
  username,
  canEdit = false,
}: {
  username: string;
  canEdit?: boolean;
}) {
  const { reloadUser } = useAuth();
  const [data, setData] = useState<ProfileData | null>(null);
  const [solved, setSolved] = useState<SolvedProblem[]>([]);
  const [badges, setBadges] = useState<Achievement[]>([]);
  const [error, setError] = useState("");

  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [school, setSchool] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let active = true;

    setData(null);
    setError("");
    setAvatarFile(null);
    setEditing(false);

    api
      .get<ProfileData>(`/users/${encodeURIComponent(username)}`)
      .then((profile) => {
        if (!active) return;
        setData(profile);
        setFullName(profile.full_name || "");
        setBio(profile.bio || "");
        setSchool(profile.school || "");
      })
      .catch((e) => {
        if (active) setError(e.message);
      });

    api
      .get<SolvedProblem[]>(`/users/${encodeURIComponent(username)}/solved`)
      .then((res) => {
        if (active) setSolved(res);
      })
      .catch(() => {});

    api
      .get<Achievement[]>(`/users/${encodeURIComponent(username)}/achievements`)
      .then((res) => {
        if (active) setBadges(res);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [username]);

  useEffect(() => {
    if (!avatarFile) {
      setPreview(null);
      return;
    }

    const url = URL.createObjectURL(avatarFile);
    setPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Chỉ hỗ trợ JPG, PNG hoặc WebP");
      e.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ảnh không được vượt quá 2MB");
      e.target.value = "";
      return;
    }

    setAvatarFile(file);
  };

  const handleSave = async () => {
    if (!fullName.trim() || fullName.trim().length > 100) {
      toast.error("Họ tên phải có từ 1 đến 100 ký tự");
      return;
    }

    if (bio.length > 500 || school.length > 150) {
      toast.error("Giới thiệu tối đa 500 ký tự; trường học tối đa 150 ký tự");
      return;
    }

    if (!canEdit || saving) return;

    setSaving(true);

    try {
      // Save name, biography and school together; other user fields stay unchanged.
      const changes = {
        fullName: fullName.trim(),
        bio: bio.trim(),
        school: school.trim(),
      };
      if (
        changes.fullName !== (data?.full_name || "") ||
        changes.bio !== (data?.bio || "") ||
        changes.school !== (data?.school || "")
      ) {
        await api.patch("/users/me", changes, { silent: true });
      }

      if (avatarFile) {
        const formData = new FormData();
        formData.append("file", avatarFile);
        await api.post("/users/me/avatar", formData, { silent: true });
      }

      const updated = await api.get<ProfileData>(
        `/users/${encodeURIComponent(username)}`,
        { silent: true },
      );
      setData(updated);
      setFullName(updated.full_name || "");
      setBio(updated.bio || "");
      setSchool(updated.school || "");
      setAvatarFile(null);
      setEditing(false);
      await reloadUser();
      toast.success("Cập nhật hồ sơ thành công!");
    } catch (e) {
      // Name may have been saved even if the optional avatar upload failed.
      api
        .get<ProfileData>(`/users/${encodeURIComponent(username)}`, {
          silent: true,
        })
        .then((latest) => {
          setData(latest);
          setFullName(latest.full_name || "");
          setBio(latest.bio || "");
          setSchool(latest.school || "");
        })
        .catch(() => {});
      toast.error(e instanceof Error ? e.message : "Cập nhật hồ sơ thất bại");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!canEdit || saving) return;
    setSaving(true);
    try {
      await api.del("/users/me/avatar", { silent: true });
      const updated = await api.get<ProfileData>(
        `/users/${encodeURIComponent(username)}`,
        { silent: true },
      );
      setData(updated);
      setAvatarFile(null);
      await reloadUser();
      toast.success("Đã xóa ảnh đại diện");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Không thể xóa ảnh đại diện",
      );
    } finally {
      setSaving(false);
    }
  };

  if (!data) {
    return error ? (
      <section className="section container">
        <Alert message={error} />
        {canEdit && (
          <div className="mt-4">
            <LogoutButton />
          </div>
        )}
      </section>
    ) : (
      <Loading />
    );
  }

  return (
    <>
      <Banner
        title={`Hồ sơ ${fullName}`}
        description="Tiến độ luyện tập và thành tích lập trình."
      />

      <section className="section container">
        <div className="grid grid-2">
          <div className="card">
            <div className="card-body">
              {/* Avatar và thông tin cá nhân */}
              <div className="flex-center" style={{ gap: 16 }}>
                <div>
                  {preview || data.avatar_url ? (
                    <img
                      src={preview || data.avatar_url || ""}
                      alt={`Ảnh đại diện ${username}`}
                      style={{
                        width: 80,
                        height: 80,
                        borderRadius: "50%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <span
                      className="avatar-sm"
                      style={{
                        width: 80,
                        height: 80,
                        fontSize: 30,
                      }}
                    >
                      {username.charAt(0).toUpperCase()}
                    </span>
                  )}

                  {canEdit && editing && (
                    <label
                      className="link"
                      style={{
                        display: "block",
                        cursor: "pointer",
                        marginTop: 8,
                        fontSize: 13,
                      }}
                    >
                      Chọn ảnh mới
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleAvatarChange}
                        style={{ display: "none" }}
                      />
                    </label>
                  )}
                  {canEdit && editing && (data.avatar_url || avatarFile) && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={handleRemoveAvatar}
                      className="mt-2 block text-xs font-medium text-rose-600 hover:underline disabled:opacity-50"
                    >
                      Xóa ảnh đại diện
                    </button>
                  )}
                </div>

                <div>
                  <h2 style={{ margin: 0 }}>{data.full_name || username}</h2>
                </div>
              </div>

              {/* Form chỉnh sửa */}
              {canEdit && editing && (
                <div style={{ marginTop: 20 }}>
                  <label htmlFor="profile-full-name">Họ và tên</label>

                  <input
                    id="profile-full-name"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    maxLength={100}
                    className="w-full rounded-lg border px-3 py-2"
                    style={{ marginTop: 8 }}
                  />

                  <label htmlFor="profile-bio" className="mt-4 block">
                    Giới thiệu (tối đa 500 ký tự)
                  </label>
                  <textarea
                    id="profile-bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={500}
                    rows={4}
                    placeholder="Viết đôi nét về bản thân..."
                    className="mt-2 w-full rounded-lg border px-3 py-2"
                  />
                  <p className="text-right text-xs text-slate-500">
                    {bio.length}/500
                  </p>

                  <label htmlFor="profile-school" className="mt-4 block">
                    Trường học (tối đa 150 ký tự)
                  </label>
                  <input
                    id="profile-school"
                    type="text"
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    maxLength={150}
                    placeholder="Ví dụ: Đại học Công nghệ - ĐHQGHN"
                    className="mt-2 w-full rounded-lg border px-3 py-2"
                  />

                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      marginTop: 16,
                    }}
                  >
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
                    >
                      {saving ? "Đang lưu..." : "Lưu thay đổi"}
                    </button>

                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => {
                        setEditing(false);
                        setAvatarFile(null);
                        setFullName(data.full_name || "");
                        setBio(data.bio || "");
                        setSchool(data.school || "");
                      }}
                      className="rounded-lg border px-4 py-2"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              )}

              {canEdit && !editing && (
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="min-h-10 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Chỉnh sửa hồ sơ
                  </button>
                  <LogoutButton />
                </div>
              )}
              {canEdit && editing && (
                <div className="mt-5 flex justify-end">
                  <LogoutButton />
                </div>
              )}

              <div className="mt-5 space-y-2">
                <p className="whitespace-pre-wrap break-words">
                  <strong>Giới thiệu:</strong>{" "}
                  {data.bio || "Chưa cập nhật giới thiệu"}
                </p>
                <p className="muted break-words">
                  <strong>Trường học:</strong>{" "}
                  {data.school || "Chưa cập nhật trường học"}
                </p>
              </div>

              <div
                className="dashboard-grid"
                style={{ gridTemplateColumns: "repeat(2,1fr)" }}
              >
                <div>
                  <b>{data.stats?.solved || 0}</b> Đã giải
                </div>
                <div>
                  <b>#{data.rank?.rank || "—"}</b> Thứ hạng
                </div>
              </div>
            </div>
          </div>

          {/* Thống kê */}
          <div className="card">
            <div className="card-body">
              <h3>Thống kê theo độ khó</h3>

              {(["easy", "medium", "hard"] as const).map((k) => (
                <div className="testcase" key={k}>
                  <strong>{k.toUpperCase()}</strong>
                  <b>{data.stats?.[k] || 0} bài</b>
                </div>
              ))}

              <h3>Thành tích</h3>

              <div className="pill-row">
                {badges.map((a) => (
                  <span
                    key={a.code}
                    className="pill orange"
                    title={a.description}
                  >
                    🏅 {a.name}
                  </span>
                ))}

                {!badges.length && <p className="muted">Chưa có thành tích</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Danh sách bài đã giải */}
        <div className="card" style={{ marginTop: 24 }}>
          <div className="card-body">
            <h3>Những bài đã giải</h3>

            {solved.map((p) => (
              <div className="testcase" key={p.slug}>
                <Link className="link" href={`/problems/${p.slug}`}>
                  {p.title}
                </Link>

                <Difficulty value={p.difficulty} />
              </div>
            ))}

            {!solved.length && <Empty />}
          </div>
        </div>
      </section>
    </>
  );
}
