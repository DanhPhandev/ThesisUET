"use client";
import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api, type Problem, type Submission, type Contest, type Page, q } from "@/lib/api";
import { useAuth, RequireAuth } from "@/features/auth/AuthProvider";
import { Banner, Alert, Empty, Loading, Difficulty, Verdict, formatTime } from "@/components/ui/Status";
export function Contests() {
  const [data, setData] = useState<Contest[]>([]),
    [phase, setPhase] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    api
      .get<Contest[]>("/contests" + (phase ? "?phase=" + phase : ""))
      .then(setData)
      .catch((e) => setError(e.message));
  }, [phase]);
  return (
    <>
      <Banner
        title="Cuộc thi lập trình"
        description="Đăng ký, tranh tài và theo dõi thứ hạng trong các cuộc thi ICPC và IOI."
      />
      <section className="section section-soft">
        <div className="container">
          <div className="tabs" style={{ marginBottom: 24 }}>
            {[
              ["", "Tất cả"],
              ["upcoming", "Sắp diễn ra"],
              ["running", "Đang diễn ra"],
              ["ended", "Đã kết thúc"],
            ].map(([v, l]) => (
              <button
                className={`tab ${phase === v ? "active" : ""}`}
                onClick={() => setPhase(v)}
                key={v}
              >
                {l}
              </button>
            ))}
          </div>
          {error && <Alert message={error} />}
          <div className="grid grid-3">
            {data.map((c) => (
              <Link className="card" href={`/contests/${c.slug}`} key={c.id}>
                <div className="card-body">
                  <span
                    className={`pill ${c.phase === "running" ? "green" : c.phase === "upcoming" ? "orange" : "gray"}`}
                  >
                    {c.phase === "running"
                      ? "Đang thi"
                      : c.phase === "upcoming"
                        ? "Sắp diễn ra"
                        : "Đã kết thúc"}
                  </span>
                  <h3 className="card-title" style={{ marginTop: 14 }}>
                    {c.title}
                  </h3>
                  <p className="card-text">
                    {c.description || "Cuộc thi lập trình trực tuyến"}
                  </p>
                  <p className="mini">
                    <strong>Bắt đầu:</strong> {formatTime(c.start_time)}
                  </p>
                  <p className="mini">
                    <strong>Kết thúc:</strong> {formatTime(c.end_time)}
                  </p>
                  <div className="flex-center">
                    <span className="pill gray">{c.rule}</span>
                    <span className="pill gray">{c.participants} thí sinh</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          {!data.length && <Empty text="Chưa có cuộc thi được công bố" />}
        </div>
      </section>
    </>
  );
}
