"use client";
import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api, type Problem, type Submission, type Contest, type Page, q } from "@/lib/api";
import { useAuth, RequireAuth } from "@/features/auth/AuthProvider";
import { Banner, Alert, Empty, Loading, Difficulty, Verdict, formatTime } from "@/components/ui/Status";
export function ContestEditor({ id }: { id: number }) {
  const [contest, setContest] = useState<{
      id: number;
      title: string;
      status: string;
    } | null>(null),
    [available, setAvailable] = useState<
      { id: number; title: string; difficulty: string }[]
    >([]),
    [selected, setSelected] = useState<number[]>([]),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    api
      .get<{ id: number; title: string; status: string }[]>("/admin/contests")
      .then((r) => setContest(r.find((x) => x.id === id) || null))
      .catch((e) => setError(e.message));
    api
      .get<{ content: { id: number; title: string; difficulty: string }[] }>(
        "/problems?size=100",
      )
      .then((r) => setAvailable(r.content))
      .catch(() => {});
  }, [id]);
  const setProblems = async () => {
    try {
      if (!selected.length) throw new Error("Chọn ít nhất một bài");
      await api.put(
        `/admin/contests/${id}/problems`,
        selected.map((problemId, i) => ({
          problemId,
          label: String.fromCharCode(65 + i),
          points: 100,
        })),
      );
      setMessage(`Đã gắn ${selected.length} bài cho cuộc thi`);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const publish = async () => {
    try {
      await api.post(`/admin/contests/${id}/publish`);
      setMessage("Cuộc thi đã xuất bản");
      setContest((c) => (c ? { ...c, status: "PUBLISHED" } : null));
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <div className="card">
      <div className="card-body">
        <h2>
          Quản lý contest #{id}: {contest?.title || "..."}
        </h2>
        <p>
          Trạng thái: <b>{contest?.status}</b>
        </p>
        <h3>Chọn bài thi</h3>
        <p className="muted">
          Chọn các bài công khai đã có bộ test. Bài được gắn nhãn A, B, C… theo
          thứ tự tích chọn.
        </p>
        {available.map((p) => (
          <label className="testcase" key={p.id}>
            <span>
              <input
                type="checkbox"
                checked={selected.includes(p.id)}
                onChange={(e) =>
                  setSelected((old) =>
                    e.target.checked
                      ? [...old, p.id]
                      : old.filter((x) => x !== p.id),
                  )
                }
                style={{ marginRight: 8 }}
              />
              {p.title}
            </span>
            <Difficulty value={p.difficulty} />
          </label>
        ))}
        {error && <Alert message={error} />}{" "}
        {message && <div className="success">{message}</div>}
        <div className="inline-actions">
          <button
            className="btn btn-outline"
            onClick={setProblems}
            disabled={contest?.status !== "DRAFT"}
          >
            Lưu bài thi
          </button>
          <button
            className="btn btn-primary"
            onClick={publish}
            disabled={contest?.status !== "DRAFT"}
          >
            Xuất bản contest
          </button>
        </div>
      </div>
    </div>
  );
}
