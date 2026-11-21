"use client";
import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api, type Problem, type Submission, type Contest, type Page, q } from "@/lib/api";
import { useAuth, RequireAuth } from "@/features/auth/AuthProvider";
import { Banner, Alert, Empty, Loading, Difficulty, Verdict, formatTime } from "@/components/ui/Status";
export function Leaderboard() {
  const [data, setData] = useState<
      { rank: number; username: string; full_name?: string | null; solved: number; points: number }[]
    >([]),
    [error, setError] = useState("");
  useEffect(() => {
    api
      .get<typeof data>("/leaderboard")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <>
      <Banner
        title="Bảng xếp hạng"
        description="Điểm giải bài: Dễ 10 · Trung bình 20 · Khó 40."
      />
      <section className="section container">
        {error && <Alert message={error} />}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Hạng</th>
                <th>Họ tên</th>
                <th>Đã giải</th>
                <th>Điểm</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.username}>
                  <td>
                    <div className={`rank ${r.rank <= 3 ? "top" : ""}`}>
                      {r.rank}
                    </div>
                  </td>
                  <td>
                    <Link className="link" href={`/u/${r.username}`}>
                      {r.full_name?.trim() || "Chưa cập nhật họ tên"}
                    </Link>
                  </td>
                  <td>{r.solved} bài</td>
                  <td className="score">{r.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.length && <Empty />}
        </div>
      </section>
    </>
  );
}
