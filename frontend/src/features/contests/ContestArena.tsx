"use client";
import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api, type Problem, type Submission, type Contest, type Page, q } from "@/lib/api";
import { useAuth, RequireAuth } from "@/features/auth/AuthProvider";
import { Banner, Alert, Empty, Loading, Difficulty, Verdict, formatTime } from "@/components/ui/Status";
import { ProblemDetails } from "@/features/problems/ProblemDetails";
export function ContestArena({
  slug,
  label,
}: {
  slug: string;
  label?: string;
}) {
  const [contest, setContest] = useState<Contest | null>(null),
    [entry, setEntry] = useState<{
      serverTime: string;
      endTime: string;
      problems: {
        label: string;
        slug: string;
        title: string;
        problem_id: number;
      }[];
    } | null>(null),
    [error, setError] = useState(""),
    [left, setLeft] = useState(0);
  useEffect(() => {
    api
      .get<Contest>(`/contests/${slug}`)
      .then((c) => {
        setContest(c);
        return api.post<typeof entry>(`/contests/${c.id}/enter`);
      })
      .then(setEntry)
      .catch((e) => setError(e.message));
  }, [slug]);
  useEffect(() => {
    if (!entry) return;
    const offset = Date.now() - new Date(entry.serverTime).getTime();
    const tick = () =>
      setLeft(
        Math.max(
          0,
          Math.floor(
            (new Date(entry.endTime).getTime() - (Date.now() - offset)) / 1000,
          ),
        ),
      );
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [entry]);
  if (error)
    return (
      <section className="section container">
        <Alert message={error} />
        <Link className="btn btn-outline" href={`/contests/${slug}`}>
          Về cuộc thi
        </Link>
      </section>
    );
  if (!entry || !contest) return <Loading />;
  if (left <= 0)
    return (
      <div className="section container">
        <h2>Cuộc thi đã kết thúc</h2>
        <Link href={`/contests/${slug}/standings`} className="btn btn-primary">
          Xem bảng xếp hạng
        </Link>
      </div>
    );
  const current =
    entry.problems.find((p) => p.label === label) || entry.problems[0];
  return (
    <RequireAuth>
      <div className="container" style={{ paddingTop: 18 }}>
        <div
          className="flex-center"
          style={{ justifyContent: "space-between" }}
        >
          <b>{contest.title}</b>
          <b>
            ⏱ Còn {Math.floor(left / 3600)}:
            {String(Math.floor((left % 3600) / 60)).padStart(2, "0")}:
            {String(left % 60).padStart(2, "0")}
          </b>
          <Link
            className="btn btn-outline"
            href={`/contests/${slug}/standings`}
          >
            Bảng điểm
          </Link>
        </div>
        <div className="tabs">
          {entry.problems.map((p) => (
            <Link
              key={p.label}
              className={`tab ${current?.label === p.label ? "active" : ""}`}
              href={`/contests/${slug}/arena/${p.label}`}
            >
              {p.label}. {p.title}
            </Link>
          ))}
        </div>
      </div>
      {current && <ProblemDetails slug={current.slug} contestId={contest.id} />}
    </RequireAuth>
  );
}
