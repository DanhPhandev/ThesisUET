"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { RequireAuth } from "@/features/auth/AuthProvider";
import { AdminUsers } from "./AdminUsers";
import { Banner, Alert, formatTime } from "@/components/ui/Status";
export function Admin({ parts }: { parts: string[] }) {
  const tab = parts[1] === "user" ? "users" : (parts[1] || "dashboard"),
    [comments, setComments] = useState<
      { id: number; username: string; full_name?: string | null; content: string; is_hidden: boolean }[]
    >([]),
    [problems, setProblems] = useState<
      { id: number; title: string; visibility: string }[]
    >([]),
    [logs, setLogs] = useState<
      {
        id: number;
        action: string;
        target_type: string;
        target_id: number;
        created_at: string;
      }[]
    >([]),
    [stats, setStats] = useState<Record<string, number> | null>(null),
    [error, setError] = useState("");
  const reload = () => {
    const doGet = (p: string, cb: (a: any) => void) =>
      api
        .get(p)
        .then(cb)
        .catch((e) => setError(e.message));
    if (tab === "dashboard") doGet("/admin/stats", setStats);
    if (tab === "problems") doGet("/admin/problems", setProblems);
    if (tab === "comments") doGet("/admin/comments", setComments);
    if (tab === "audit-logs") doGet("/admin/audit-logs", setLogs);
  };
  useEffect(() => {
    reload();
  }, [tab]);
  const toggle = async (id: number, hidden: boolean) => {
    try {
      await api.patch(`/admin/comments/${id}/hidden`, { hidden });
      reload();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <RequireAuth role="ADMIN">
      <Banner title="Quản trị hệ thống" description="Quản lý tài khoản, bài tập và hoạt động CodeUET" />
      <section className="section container">
        <nav className="tabs" style={{ marginBottom: 25 }}>
          {[
            ["/admin", "Tổng quan"],
            ["/admin/user", "Người dùng"],
            ["/admin/problems", "Bài tập"],
            ["/admin/comments", "Bình luận"],
            ["/admin/audit-logs", "Nhật ký"],
          ].map(([path, l]) => (
            <Link
              href={path}
              key={path}
              className={`tab ${(tab === "dashboard" ? path === "/admin" : path === (tab === "users" ? "/admin/user" : "/admin/" + tab)) ? "active" : ""}`}
            >
              {l}
            </Link>
          ))}
        </nav>
        {error && <Alert message={error} />}
        {tab === "dashboard" && (
          <div className="dashboard-grid">
            {[
              ["Người dùng", stats?.users],
              ["Bài nộp hôm nay", stats?.submissions_today],
              ["Contest đang thi", stats?.running_contests],
              ["Accepted", stats?.accepted],
            ].map(([l, v]) => (
              <div className="card" key={String(l)}>
                <span className="muted">{l}</span>
                <b>{v ?? "—"}</b>
              </div>
            ))}
          </div>
        )}
        {tab === "users" && <AdminUsers />}
        {tab === "problems" && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Bài tập</th>
                  <th>Hiển thị</th>
                </tr>
              </thead>
              <tbody>
                {problems.map((p) => (
                  <tr key={p.id}>
                    <td>#{p.id}</td>
                    <td>{p.title}</td>
                    <td>{p.visibility}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {tab === "comments" && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Người đăng</th>
                  <th>Nội dung</th>
                  <th>Kiểm duyệt</th>
                </tr>
              </thead>
              <tbody>
                {comments.map((c) => (
                  <tr key={c.id}>
                    <td>#{c.id}</td>
                    <td>{c.full_name || c.username}</td>
                    <td>{c.content}</td>
                    <td>
                      <button
                        className="btn btn-outline"
                        onClick={() => toggle(c.id, !c.is_hidden)}
                      >
                        {c.is_hidden ? "Hiện bình luận" : "Ẩn bình luận"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {tab === "audit-logs" && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Hành động</th>
                  <th>Loại đối tượng</th>
                  <th>ID đích</th>
                  <th>Thời gian</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td>#{l.id}</td>
                    <td>{l.action}</td>
                    <td>{l.target_type}</td>
                    <td>{l.target_id}</td>
                    <td>{formatTime(l.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </RequireAuth>
  );
}
