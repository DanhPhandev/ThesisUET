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
import { useAuth, RequireAuth } from "@/features/auth/AuthProvider";
import {
  Banner,
  Alert,
  Empty,
  Loading,
  Difficulty,
  Verdict,
  formatTime,
} from "@/components/ui/Status";
import { ProblemCard } from "@/components/problems/ProblemCard";
export function Home() {
  const [problems, setProblems] = useState<Problem[]>([]),
    [rank, setRank] = useState<
      { username: string; full_name?: string | null; points: number; rank: number }[]
    >([]);
  useEffect(() => {
    api
      .get<Page<Problem>>("/problems?size=3")
      .then((r) => setProblems(r.content))
      .catch(() => {});
    api
      .get<typeof rank>("/leaderboard")
      .then((r) => setRank(r.slice(0, 3)))
      .catch(() => {});
  }, []);
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <div className="eyebrow">🚀 HỌC LẬP TRÌNH BẰNG THỰC HÀNH</div>
            <h1>
              CodeUET
              <br />
              Nâng tầm kỹ năng{" "}
              <span style={{ color: "#03b5ee" }}>lập trình</span>
            </h1>
            <p>
              Giải thuật, bài tập có bộ test tự động, cuộc thi lập trình và bảng
              xếp hạng — tất cả trong một nền tảng.
            </p>
            <div className="hero-actions">
              <Link href="/practice" className="btn btn-primary">
                Bắt đầu luyện tập
              </Link>
              <Link
                href="/contests"
                className="btn btn-outline"
                style={{ background: "white" }}
              >
                Khám phá cuộc thi
              </Link>
            </div>
          </div>
          <div className="hero-card">
            <div className="terminal">
              <div className="terminal-top">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </div>
              <div className="code-line">
                <span className="code-key">#include</span> &lt;iostream&gt;
              </div>
              <div className="code-line">
                <span className="code-key">int</span>{" "}
                <span className="code-func">main</span>() {"{"}
              </div>
              <div className="code-line">
                &nbsp;&nbsp;std::cout &lt;&lt;{" "}
                <span className="code-ok">"Hello CodeUET!"</span>;
              </div>
              <div className="code-line">&nbsp;&nbsp;return 0;</div>
              <div className="code-line">{"}"}</div>
            </div>
            <div className="metric-row">
              <div className="metric">
                <strong>C++</strong>
                <span>GCC</span>
              </div>
              <div className="metric">
                <strong>Python</strong>
                <span>Python 3</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="section section-soft">
        <div className="container">
          <div className="section-title">
            <h2>Bài tập nổi bật</h2>
            <p>
              Luyện tập trực tiếp với trình soạn thảo và nhận kết quả chấm bài.
            </p>
          </div>
          <div className="grid grid-3">
            {problems.length ? (
              problems.map((p) => <ProblemCard key={p.id} problem={p} />)
            ) : (
              <div className="card">
                <div className="card-body">
                  Chưa có bài tập. Backend sẽ tạo hai bài mẫu khi có ADMIN_EMAIL
                  và ADMIN_PASSWORD.
                </div>
              </div>
            )}
          </div>
          <div style={{ textAlign: "center", marginTop: 24 }}>
            <Link className="btn btn-primary" href="/practice">
              Tất cả bài tập
            </Link>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="container grid grid-2">
          <div>
            <div className="section-title" style={{ textAlign: "left" }}>
              <h2>Cạnh tranh lành mạnh</h2>
              <p>
                Theo dõi điểm số và tiến bộ của mình trong quá trình luyện tập.
              </p>
            </div>
            <Link href="/leaderboard" className="btn btn-outline">
              Xem bảng xếp hạng
            </Link>
          </div>
          <div className="card">
            <div className="card-body">
              <h3>Top lập trình viên</h3>
              {rank.map((u) => (
                <div className="testcase" key={u.username}>
                  <span>
                    <strong>#{u.rank}</strong>{" "}
                    <Link href={`/u/${u.username}`} className="link">
                      {u.full_name?.trim() || "Chưa cập nhật họ tên"}
                    </Link>
                  </span>
                  <b>{u.points} điểm</b>
                </div>
              ))}
              {!rank.length && (
                <p className="muted">Chưa có dữ liệu xếp hạng</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
