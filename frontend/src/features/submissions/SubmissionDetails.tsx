"use client";
import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api, type Problem, type Submission, type Contest, type Page, q } from "@/lib/api";
import { useAuth, RequireAuth } from "@/features/auth/AuthProvider";
import { Banner, Alert, Empty, Loading, Difficulty, Verdict, formatTime } from "@/components/ui/Status";
export function SubmissionDetails({ id }: { id: string }) {
  const [data, setData] = useState<Submission | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    api
      .get<Submission>(`/submissions/${id}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [id]);
  if (!data)
    return error ? (
      <div className="section container">
        <Alert message={error} />
      </div>
    ) : (
      <Loading />
    );
  return (
    <>
      <Banner title={`Bài nộp #${id}`} description={data.problem_title} />
      <section className="section container">
        <div className="card">
          <div className="card-body">
            <p>
              <strong>Kết quả:</strong> <Verdict value={data.verdict} />
            </p>
            <p>
              Người nộp: {data.full_name || data.username} · Ngôn ngữ: {data.language} ·{" "}
              {formatTime(data.created_at)}
            </p>
            <p>
              Số test: {data.passed_tests}/{data.total_tests} · Điểm:{" "}
              {data.score}
            </p>
            {data.source_code && (
              <>
                <h3>Mã nguồn</h3>
                <pre className="console" style={{ whiteSpace: "pre-wrap" }}>
                  {data.source_code}
                </pre>
              </>
            )}
            {data.compile_output && (
              <pre className="error">{data.compile_output}</pre>
            )}
            <h3>Kết quả test</h3>
            {data.tests?.map((t, i) => (
              <div className="testcase" key={i}>
                <span>Test #{t.order_index}</span>
                <span>
                  <Verdict value={t.verdict} /> · {t.time_ms} ms · {t.memory_kb}{" "}
                  KB
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
