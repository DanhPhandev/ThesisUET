"use client";
import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api, type Problem, type Submission, type Contest, type Page, q } from "@/lib/api";
import { useAuth, RequireAuth } from "@/features/auth/AuthProvider";
import { Banner, Alert, Empty, Loading, Difficulty, Verdict, formatTime } from "@/components/ui/Status";
export function Standings({ slug }: { slug: string }) {
  const [contest, setContest] = useState<Contest | null>(null),
    [data, setData] = useState<
      {
        rank: number;
        username: string;
        full_name?: string | null;
        solved: number;
        total_score: number;
        penalty: number;
      }[]
    >([]),
    [error, setError] = useState("");
  useEffect(() => {
    api
      .get<Contest>(`/contests/${slug}`)
      .then((c) => {
        setContest(c);
        return api.get<typeof data>(`/contests/${c.id}/standings`);
      })
      .then(setData)
      .catch((e) => setError(e.message));
  }, [slug]);
  return (
    <>
      <Banner
        title={`Bảng xếp hạng ${contest?.title || ""}`}
        description="Số bài giải, điểm và penalty của thí sinh."
      />
      <section className="section container">
        {error && <Alert message={error} />}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Hạng</th>
                <th>Thí sinh</th>
                <th>Số bài AC</th>
                <th>Điểm</th>
                <th>Penalty</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.username}>
                  <td>
                    <span className="rank">{r.rank}</span>
                  </td>
                  <td>
                    <Link className="link" href={`/u/${r.username}`}>
                      {r.full_name?.trim() || "Chưa cập nhật họ tên"}
                    </Link>
                  </td>
                  <td>{r.solved}</td>
                  <td>{r.total_score}</td>
                  <td>{r.penalty} phút</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.length && <Empty text="Chưa có lượt tham gia nào" />}
        </div>
      </section>
    </>
  );
}
