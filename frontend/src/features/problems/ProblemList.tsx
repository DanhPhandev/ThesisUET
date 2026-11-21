"use client";
import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api, type Problem, type Submission, type Contest, type Page, q } from "@/lib/api";
import { useAuth, RequireAuth } from "@/features/auth/AuthProvider";
import { Banner, Alert, Empty, Loading, Difficulty, Verdict, formatTime } from "@/components/ui/Status";
export function Problems() {
  const [term, setTerm] = useState(""),
    [difficulty, setDifficulty] = useState(""),
    [tag, setTag] = useState(""),
    [tags, setTags] = useState<{ id: number; slug: string; name: string }[]>(
      [],
    ),
    [data, setData] = useState<Page<Problem> | null>(null),
    [error, setError] = useState(""),
    [page, setPage] = useState(0);
  useEffect(() => {
    api
      .get<typeof tags>("/tags")
      .then(setTags)
      .catch(() => {});
  }, []);
  useEffect(() => {
    let active = true;
    setError("");
    api
      .get<Page<Problem>>(
        "/problems" + q({ q: term, difficulty, tags: tag, page, size: 15 }),
      )
      .then((r) => active && setData(r))
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [term, difficulty, tag, page]);
  return (
    <>
      <Banner
        title="Bài tập lập trình"
        description="Tìm kiếm, lọc độ khó và luyện giải bài C++ và Python với hệ thống chấm tự động."
      />
      <section className="section section-soft">
        <div className="container">
          <div className="toolbar">
            <div className="search-box">
              <input
                aria-label="Tìm bài"
                value={term}
                onChange={(e) => {
                  setTerm(e.target.value);
                  setPage(0);
                }}
                placeholder="Tìm tên bài tập..."
              />
              <select
                aria-label="Độ khó"
                value={difficulty}
                onChange={(e) => {
                  setDifficulty(e.target.value);
                  setPage(0);
                }}
              >
                <option value="">Mọi độ khó</option>
                <option value="EASY">Dễ</option>
                <option value="MEDIUM">Trung bình</option>
                <option value="HARD">Khó</option>
              </select>
              <select
                aria-label="Chủ đề"
                value={tag}
                onChange={(e) => {
                  setTag(e.target.value);
                  setPage(0);
                }}
              >
                <option value="">Mọi chủ đề</option>
                {tags.map((t) => (
                  <option key={t.id} value={t.slug}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <span className="pill">Tổng: {data?.totalElements ?? 0} bài</span>
          </div>
          {error && <Alert message={error} />}
          <div className="stack">
            {data?.content.map((p) => (
              <Link
                key={p.id}
                className="card problem-card"
                href={`/problems/${p.slug}`}
              >
                <div>
                  <h3 className="card-title">{p.title}</h3>
                  <p className="card-text">
                    {p.statement.slice(0, 180)}
                    {p.statement.length > 180 ? "…" : ""}
                  </p>
                  <div className="problem-meta">
                    <Difficulty value={p.difficulty} />
                    {p.tags && (
                      <span className="pill gray">
                        {typeof p.tags === "string" ? p.tags : "Chủ đề"}
                      </span>
                    )}
                    <span className="pill gray">
                      {p.accepted_count ?? 0} AC / {p.submission_count ?? 0}{" "}
                      lượt nộp
                    </span>
                  </div>
                </div>
                <span className="btn btn-outline">Làm bài</span>
              </Link>
            ))}
            {data?.content.length === 0 && (
              <Empty text="Không tìm thấy bài phù hợp" />
            )}
          </div>
          <div
            className="flex-center"
            style={{ justifyContent: "center", marginTop: 24 }}
          >
            <button
              className="btn btn-outline"
              disabled={page === 0}
              onClick={() => setPage((v) => v - 1)}
            >
              Trước
            </button>
            <span>
              Trang {page + 1} / {Math.max(1, data?.totalPages ?? 1)}
            </span>
            <button
              className="btn btn-outline"
              disabled={!data || page + 1 >= data.totalPages}
              onClick={() => setPage((v) => v + 1)}
            >
              Tiếp
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
