"use client";
import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api, type Problem, type Submission, type Contest, type Page, q } from "@/lib/api";
import { useAuth, RequireAuth } from "@/features/auth/AuthProvider";
import { Banner, Alert, Empty, Loading, Difficulty, Verdict, formatTime } from "@/components/ui/Status";
import { ContestEditor } from "@/features/management/ContestEditor";
type TinyProblem = {id:number;title:string;slug:string;difficulty:string;visibility:string};
type TinyContest = {id:number;title:string;slug:string;status:string};
export function Setter({ parts }: { parts: string[] }) {
  const route = parts[1] || "problems",
    newMode = parts[2] === "new",
    editMode = parts[3] === "edit";
  const [data, setData] = useState<TinyProblem[]>([]),
    [contests, setContests] = useState<TinyContest[]>([]),
    [title, setTitle] = useState(""),
    [slug, setSlug] = useState(""),
    [statement, setStatement] = useState(""),
    [input, setInput] = useState(""),
    [output, setOutput] = useState(""),
    [constraint, setConstraint] = useState(""),
    [difficulty, setDifficulty] = useState("EASY"),
    [start, setStart] = useState(""),
    [end, setEnd] = useState(""),
    [created, setCreated] = useState<number | null>(null),
    [tcInput, setTcInput] = useState(""),
    [tcOutput, setTcOutput] = useState(""),
    [tcIndex, setTcIndex] = useState(1),
    [notice, setNotice] = useState(""),
    [err, setErr] = useState("");
  const router = useRouter();
  useEffect(() => {
    if (route === "problems")
      api
        .get<TinyProblem[]>("/problems/mine")
        .then(setData)
        .catch(() => {});
    else
      api
        .get<TinyContest[]>("/admin/contests")
        .then(setContests)
        .catch(() => {});
  }, [route]);
  useEffect(() => {
    if (!editMode || !parts[2] || !data.length) return;
    const p = data.find((p) => String(p.id) === parts[2]);
    if (p) {
      api.get<Record<string, any>>("/problems/" + p.slug).then((r) => {
        setCreated(p.id);
        setTitle(r.title);
        setSlug(r.slug);
        setStatement(r.statement);
        setInput(r.input_format || "");
        setOutput(r.output_format || "");
        setConstraint(r.constraints_text || "");
        setDifficulty(r.difficulty);
      });
    }
  }, [parts.join("/"), data.length]);
  const submitProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    try {
      const payload = {
        title,
        slug,
        statement,
        inputFormat: input,
        outputFormat: output,
        constraintsText: constraint,
        difficulty,
      };
      if (created) {
        await api.put(`/problems/${created}`, payload);
        setNotice("Đã lưu bài tập");
      } else {
        const p = await api.post<{ id: number }>("/problems", payload);
        setCreated(p.id);
        setNotice(
          `Đã tạo bài #${p.id}. Hãy bổ sung test case trước khi công khai.`,
        );
      }
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  const addTest = async () => {
    if (!created) return;
    try {
      await api.post(`/problems/${created}/testcases`, {
        input: tcInput,
        expectedOutput: tcOutput,
        isSample: true,
        orderIndex: tcIndex,
        weight: 1,
      });
      setTcIndex((v) => v + 1);
      setTcInput("");
      setTcOutput("");
      setNotice("Đã thêm test case");
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  const visibility = async () => {
    if (!created) return;
    try {
      await api.patch(`/problems/${created}/visibility`, {
        visibility: "PUBLIC",
      });
      setNotice("Đã công khai bài tập");
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  const createContest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const c = await api.post<{ id: number }>("/admin/contests", {
        title,
        slug,
        description: statement,
        rule: "ICPC",
        startTime: new Date(start).toISOString(),
        endTime: new Date(end).toISOString(),
      });
      setNotice(
        `Đã tạo contest #${c.id}. Cần thêm bài qua API và publish trước khi xuất hiện công khai.`,
      );
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  return (
    <RequireAuth role="SETTER">
      <Banner
        title="Quản lý đề và cuộc thi"
        description="Công cụ dành cho người ra đề (SETTER) và quản trị viên."
      />
      <section className="section container">
        <nav className="tabs" style={{ marginBottom: 20 }}>
          <Link
            className={`tab ${route === "problems" ? "active" : ""}`}
            href="/management/problems"
          >
            Bài tập
          </Link>
          <Link
            className={`tab ${route === "contests" ? "active" : ""}`}
            href="/management/contests"
          >
            Cuộc thi
          </Link>
        </nav>
        {err && <Alert message={err} />}{" "}
        {notice && <p className="success">{notice}</p>}
        {route === "problems" ? (
          newMode || editMode ? (
            <div className="card">
              <div className="card-body">
                <h2>{editMode ? "Chỉnh sửa bài tập" : "Tạo bài tập"}</h2>
                <form onSubmit={submitProblem}>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Tiêu đề</label>
                      <input
                        required
                        className="input"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Slug (không dấu, dùng dấu -)</label>
                      <input
                        required
                        className="input"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Độ khó</label>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                    >
                      <option>EASY</option>
                      <option>MEDIUM</option>
                      <option>HARD</option>
                    </select>
                  </div>
                  {[
                    ["Mô tả đề", statement, setStatement],
                    ["Dữ liệu vào", input, setInput],
                    ["Kết quả", output, setOutput],
                    ["Ràng buộc", constraint, setConstraint],
                  ].map(([label, value, set]) => (
                    <div className="form-group" key={label as string}>
                      <label>{label as string}</label>
                      <textarea
                        value={value as string}
                        onChange={(e) =>
                          (set as (v: string) => void)(e.target.value)
                        }
                      />
                    </div>
                  ))}
                  <button className="btn btn-primary" type="submit">
                    {created ? "Lưu bài" : "Tạo bài"}
                  </button>
                </form>
                {created && (
                  <>
                    <h3>Thêm test mẫu</h3>
                    <div className="test-row">
                      <div>
                        <label>Input</label>
                        <textarea
                          value={tcInput}
                          onChange={(e) => setTcInput(e.target.value)}
                        />
                      </div>
                      <div>
                        <label>Expected output</label>
                        <textarea
                          value={tcOutput}
                          onChange={(e) => setTcOutput(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="inline-actions">
                      <button className="btn btn-outline" onClick={addTest}>
                        + Thêm test #{tcIndex}
                      </button>
                      <button className="btn btn-primary" onClick={visibility}>
                        Công khai bài
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="toolbar">
                <h2>Bài tập của tôi</h2>
                <Link href="/management/problems/new" className="btn btn-primary">
                  + Tạo bài mới
                </Link>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Bài tập</th>
                      <th>Độ khó</th>
                      <th>Hiển thị</th>
                      <th>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((p) => (
                      <tr key={p.id}>
                        <td>#{p.id}</td>
                        <td>{p.title}</td>
                        <td>
                          <Difficulty value={p.difficulty} />
                        </td>
                        <td>{p.visibility}</td>
                        <td>
                          <Link
                            className="link"
                            href={`/management/problems/${p.id}/edit`}
                          >
                            Sửa
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!data.length && <Empty />}
              </div>
            </>
          )
        ) : parts[3] === "edit" ? (
          <ContestEditor id={Number(parts[2])} />
        ) : newMode ? (
          <div className="card">
            <div className="card-body">
              <h2>Tạo cuộc thi</h2>
              <form onSubmit={createContest}>
                <div className="form-group">
                  <label>Tên cuộc thi</label>
                  <input
                    required
                    className="input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Slug</label>
                  <input
                    required
                    className="input"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Giới thiệu</label>
                  <textarea
                    value={statement}
                    onChange={(e) => setStatement(e.target.value)}
                  />
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Bắt đầu</label>
                    <input
                      className="input"
                      required
                      type="datetime-local"
                      value={start}
                      onChange={(e) => setStart(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Kết thúc</label>
                    <input
                      className="input"
                      required
                      type="datetime-local"
                      value={end}
                      onChange={(e) => setEnd(e.target.value)}
                    />
                  </div>
                </div>
                <button className="btn btn-primary" type="submit">
                  Tạo contest nháp
                </button>
              </form>
            </div>
          </div>
        ) : (
          <>
            <div className="toolbar">
              <h2>Cuộc thi của tôi</h2>
              <Link href="/management/contests/new" className="btn btn-primary">
                + Tạo contest
              </Link>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Cuộc thi</th>
                    <th>Trạng thái</th>
                    <th>Quản lý</th>
                  </tr>
                </thead>
                <tbody>
                  {contests.map((c) => (
                    <tr key={c.id}>
                      <td>#{c.id}</td>
                      <td>{c.title}</td>
                      <td>{c.status}</td>
                      <td>
                        <Link
                          className="link"
                          href={`/management/contests/${c.id}/edit`}
                        >
                          Cấu hình
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!contests.length && <Empty />}
            </div>
          </>
        )}
      </section>
    </RequireAuth>
  );
}
