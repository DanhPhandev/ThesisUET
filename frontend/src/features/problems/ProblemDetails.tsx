"use client";
import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api, type Problem, type Submission, type Contest, type Page, q } from "@/lib/api";
import { useAuth, RequireAuth } from "@/features/auth/AuthProvider";
import { Banner, Alert, Empty, Loading, Difficulty, Verdict, formatTime } from "@/components/ui/Status";
import { CodeEditor } from "@/components/problems/CodeEditor";
// Only C++ and Python can be chosen for running or judging submissions.
const SOLUTION_LANGUAGES = [
  { value: "cpp", label: "C++ (GCC)" },
  { value: "python3", label: "Python 3" },
] as const;
type SolutionLanguage = (typeof SOLUTION_LANGUAGES)[number]["value"];

const samples: Record<SolutionLanguage, string> = {
  cpp: "#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    // Viết lời giải tại đây\n    return 0;\n}",
  python3: "# Viết lời giải tại đây\nimport sys\n",
};
export function ProblemDetails({
  slug,
  contestId,
}: {
  slug: string;
  contestId?: number;
}) {
  const [p, setP] = useState<Problem | null>(null),
    [err, setErr] = useState(""),
    [tab, setTab] = useState<"statement" | "tutorial" | "comments" | "mine">(
      "statement",
    ),
    [lang, setLang] = useState<SolutionLanguage>("cpp"),
    [code, setCode] = useState(samples.cpp),
    [stdin, setStdin] = useState(""),
    [output, setOutput] = useState<Record<string, unknown> | null>(null),
    [submission, setSubmission] = useState<Submission | null>(null),
    [busy, setBusy] = useState(false),
    [comments, setComments] = useState<
      {
        id: number;
        username: string;
        full_name?: string | null;
        content: string;
        vote_score: number;
        created_at: string;
        parent_id: number | null;
      }[]
    >([]),
    [comment, setComment] = useState(""),
    [tutorial, setTutorial] = useState("");
  const { user } = useAuth(),
    router = useRouter();
  useEffect(() => {
    api
      .get<Problem>("/problems/" + encodeURIComponent(slug))
      .then(setP)
      .catch((e) => setErr(e.message));
  }, [slug]);
  useEffect(() => {
    if (!p) return;
    const key = `draft:${p.id}:${lang}`;
    setCode(localStorage.getItem(key) || samples[lang] || "");
  }, [p?.id, lang]);
  useEffect(() => {
    if (!p || tab !== "comments") return;
    api
      .get<typeof comments>(`/problems/${p.id}/comments`)
      .then(setComments)
      .catch(() => {});
  }, [p?.id, tab]);
  useEffect(() => {
    if (!p || tab !== "tutorial") return;
    api
      .get<{ content: string }>(`/problems/${p.id}/tutorial`)
      .then((r) => setTutorial(r.content))
      .catch(() => setTutorial("Chưa có lời giải công khai."));
  }, [p?.id, tab]);
  useEffect(() => {
    if (!submission || !["PENDING", "JUDGING"].includes(submission.verdict))
      return;
    const timer = setInterval(() => {
      api
        .get<Submission>(`/submissions/${submission.id}`, {silent:true})
        .then(setSubmission)
        .catch(() => {});
    }, 1000);
    return () => clearInterval(timer);
  }, [submission?.id, submission?.verdict]);
  const send = async (mode: "run" | "submit") => {
    if (!user) {
      router.push("/login");
      return;
    }
    if (!p) return;
    setBusy(true);
    setErr("");
    try {
      if (mode === "run") {
        setOutput(
          await api.post<Record<string, unknown>>("/run", {
            problemId: p.id,
            language: lang,
            sourceCode: code,
            stdin,
          }),
        );
      } else {
        const newS = await api.post<{ id: number; verdict: string }>(
          "/submissions",
          { problemId: p.id, language: lang, sourceCode: code, contestId },
        );
        setSubmission({ id: newS.id, verdict: newS.verdict } as Submission);
        setOutput(null);
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const sendComment = async () => {
    if (!user) {
      router.push("/login");
      return;
    }
    if (!p || !comment.trim()) return;
    try {
      await api.post(`/problems/${p.id}/comments`, { content: comment });
      setComment("");
      setComments(await api.get<typeof comments>(`/problems/${p.id}/comments`));
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  if (!p)
    return err ? (
      <section className="section container">
        <Alert message={err} />
      </section>
    ) : (
      <Loading />
    );
  return (
    <>
      <Banner
        title={p.title}
        description={`Thời gian: ${p.time_limit_ms ?? 1000} ms · Bộ nhớ: ${p.memory_limit_mb ?? 256} MB`}
      />
      <section className="section section-soft">
        <div className="container">
          <div className="flex-center" style={{ marginBottom: 20 }}>
            <Difficulty value={p.difficulty} />
            {p.tags &&
              Array.isArray(p.tags) &&
              p.tags.map((t) => (
                <span className="pill gray" key={t.slug}>
                  {t.name}
                </span>
              ))}
            <Link className="link" href="/problems">
              ← Danh sách bài
            </Link>
          </div>
          {err && <Alert message={err} />}
          <div className="split-layout">
            <article className="card statement">
              <div className="tabs">
                {(["statement", "tutorial", "comments", "mine"] as const)
                  .filter((x) => !contestId || x === "statement")
                  .map((x) => (
                    <button
                      key={x}
                      className={`tab ${tab === x ? "active" : ""}`}
                      onClick={() => setTab(x)}
                    >
                      {
                        (
                          {
                            statement: "Đề bài",
                            tutorial: "Lời giải",
                            comments: "Thảo luận",
                            mine: "Bài đã nộp",
                          } as const
                        )[x]
                      }
                    </button>
                  ))}
              </div>
              <div className="card-body">
                {tab === "statement" && (
                  <>
                    <h2>Đề bài</h2>
                    <div className="content-text">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {p.statement}
                      </ReactMarkdown>
                    </div>
                    {p.input_format && (
                      <>
                        <h3>Dữ liệu vào</h3>
                        <p className="content-text">{p.input_format}</p>
                      </>
                    )}
                    {p.output_format && (
                      <>
                        <h3>Kết quả</h3>
                        <p className="content-text">{p.output_format}</p>
                      </>
                    )}
                    {p.constraints_text && (
                      <>
                        <h3>Ràng buộc</h3>
                        <p className="content-text">{p.constraints_text}</p>
                      </>
                    )}
                    {(p.samples ?? []).map((s, i) => (
                      <div key={s.id}>
                        <h3>Ví dụ {i + 1}</h3>
                        <div className="test-row">
                          <div>
                            <b>Input</b>
                            <pre className="sample">{s.input}</pre>
                          </div>
                          <div>
                            <b>Output</b>
                            <pre className="sample">{s.expected_output}</pre>
                          </div>
                        </div>
                        <button
                          className="btn btn-outline"
                          style={{ marginTop: 10 }}
                          onClick={() => navigator.clipboard.writeText(s.input)}
                        >
                          Copy input
                        </button>
                      </div>
                    ))}
                  </>
                )}
                {tab === "tutorial" && (
                  <div className="content-text">
                    <ReactMarkdown>{tutorial}</ReactMarkdown>
                  </div>
                )}
                {tab === "comments" && (
                  <>
                    <h3>Thảo luận</h3>
                    <textarea
                      aria-label="Nội dung bình luận"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Viết bình luận của bạn..."
                    />
                    <button className="btn btn-primary" onClick={sendComment}>
                      Gửi bình luận
                    </button>
                    <div style={{ marginTop: 18 }}>
                      {comments.map((c) => (
                        <div className="subcard" key={c.id}>
                          <strong>{c.full_name || c.username}</strong>
                          <small className="muted">
                            {" "}
                            · {formatTime(c.created_at)} · {c.vote_score} lượt
                            vote
                          </small>
                          <p>{c.content}</p>
                          <button
                            className="btn btn-outline"
                            onClick={() =>
                              api
                                .post(`/comments/${c.id}/vote`, { value: 1 })
                                .then(() =>
                                  api
                                    .get<
                                      typeof comments
                                    >(`/problems/${p.id}/comments`)
                                    .then(setComments),
                                )
                            }
                          >
                            ▲ Hữu ích
                          </button>
                        </div>
                      ))}
                      {!comments.length && <Empty text="Chưa có bình luận" />}
                    </div>
                  </>
                )}
                {tab === "mine" && (
                  <div>
                    <h3>Bài nộp của tôi</h3>
                    <Link
                      href={`/submissions?problem=${p.id}`}
                      className="btn btn-outline"
                    >
                      Xem lịch sử bài nộp
                    </Link>
                  </div>
                )}
              </div>
            </article>
            <aside>
              <div className="editor-card">
                <div className="editor-toolbar">
                  <span>✦ Trình soạn thảo</span>
                  <select
                    aria-label="Ngôn ngữ"
                    value={lang}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "cpp" || value === "python3") setLang(value);
                    }}
                    style={{ width: 185, padding: 6 }}
                  >
                    {SOLUTION_LANGUAGES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
                <CodeEditor
                  height="390px"
                  language={lang === "cpp" ? "cpp" : "python"}
                  theme="vs-dark"
                  value={code}
                  onChange={(v) => {
                    const next = v ?? "";
                    setCode(next);
                    if (p) localStorage.setItem(`draft:${p.id}:${lang}`, next);
                  }}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    automaticLayout: true,
                    scrollBeyondLastLine: false,
                  }}
                />
              </div>
              <div className="result-panel">
                <h3>Chạy thử / Nộp bài</h3>
                <label htmlFor="stdin" className="mini muted">
                  Dữ liệu đầu vào (stdin)
                </label>
                <textarea
                  id="stdin"
                  value={stdin}
                  onChange={(e) => setStdin(e.target.value)}
                  rows={3}
                  style={{ minHeight: 85 }}
                  placeholder={p.samples?.[0]?.input ?? "Nhập đầu vào..."}
                />
                <div className="inline-actions">
                  <button
                    className="btn btn-outline"
                    disabled={busy}
                    onClick={() => send("run")}
                  >
                    ▶ Chạy thử
                  </button>
                  <button
                    className="btn btn-primary"
                    disabled={busy}
                    onClick={() => send("submit")}
                  >
                    ↑ Nộp bài
                  </button>
                </div>
                {output && (
                  <div className="console">
                    <strong>Run result</strong>
                    <pre style={{ whiteSpace: "pre-wrap", marginBottom: 0 }}>
                      {JSON.stringify(output, null, 2)}
                    </pre>
                  </div>
                )}
                {submission && (
                  <div>
                    <p>
                      <strong>Submission #{submission.id}</strong> —{" "}
                      <Verdict value={submission.verdict} />
                    </p>
                    {submission.total_tests !== undefined && (
                      <p>
                        Passed: {submission.passed_tests}/
                        {submission.total_tests} · Điểm: {submission.score}
                      </p>
                    )}
                    {submission.tests?.map((t, i) => (
                      <div className="testcase" key={i}>
                        <span>Test {t.order_index}</span>
                        <span>
                          <Verdict value={t.verdict} /> · {t.time_ms} ms
                        </span>
                      </div>
                    ))}
                    {submission.compile_output && (
                      <pre className="sample">{submission.compile_output}</pre>
                    )}
                    <Link
                      className="link"
                      href={`/submissions/${submission.id}`}
                    >
                      Chi tiết bài nộp
                    </Link>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
