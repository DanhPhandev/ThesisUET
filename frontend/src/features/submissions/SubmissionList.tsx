"use client";
import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api, type Problem, type Submission, type Contest, type Page, q } from "@/lib/api";
import { useAuth, RequireAuth } from "@/features/auth/AuthProvider";
import { Banner, Alert, Empty, Loading, Difficulty, Verdict, formatTime } from "@/components/ui/Status";
export function Submissions() {
  const [data, setData] = useState<Page<Submission> | null>(null),
    [error, setError] = useState(""),
    [verdict, setVerdict] = useState("");
  useEffect(() => {
    api
      .get<Page<Submission>>("/submissions" + q({ verdict, size: 50 }))
      .then(setData)
      .catch((e) => setError(e.message));
  }, [verdict]);
  return (
    <>
      <Banner
        title="Lịch sử bài nộp"
        description="Xem bài nộp của bạn; quản trị viên xem lịch sử của tất cả người dùng."
      />
      <section className="section container">
        <div className="toolbar">
          <select
            style={{ maxWidth: 250 }}
            value={verdict}
            onChange={(e) => setVerdict(e.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            {[
              "AC",
              "WA",
              "TLE",
              "MLE",
              "RE",
              "CE",
              "SE",
              "PENDING",
              "JUDGING",
            ].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </div>
        {error && <Alert message={error} />}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Họ tên</th>
                <th>Bài tập</th>
                <th>Ngôn ngữ</th>
                <th>Kết quả</th>
                <th>Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {data?.content.map((s) => (
                <tr key={s.id}>
                  <td>
                    <Link className="link" href={`/submissions/${s.id}`}>
                      #{s.id}
                    </Link>
                  </td>
                  <td>
                    <Link href={`/u/${s.username}`}>{s.full_name || s.username}</Link>
                  </td>
                  <td>
                    <Link className="link" href={`/problems/${s.problem_slug}`}>
                      {s.problem_title}
                    </Link>
                  </td>
                  <td>{s.language}</td>
                  <td>
                    <Verdict value={s.verdict} />
                  </td>
                  <td>{formatTime(s.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data?.content.length && <Empty />}
        </div>
      </section>
    </>
  );
}
