"use client";
import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api, type Problem, type Submission, type Contest, type Page, q } from "@/lib/api";
import { useAuth, RequireAuth } from "@/features/auth/AuthProvider";
import { Banner, Alert, Empty, Loading, Difficulty, Verdict, formatTime } from "@/components/ui/Status";
export function ContestDetails({ slug }: { slug: string }) {
  const [data, setData] = useState<Contest | null>(null),
    [error, setError] = useState("");
  const { user } = useAuth(),
    router = useRouter();
  const get = () =>
    api
      .get<Contest>(`/contests/${slug}`)
      .then(setData)
      .catch((e) => setError(e.message));
  useEffect(() => {
    get();
  }, [slug]);
  const register = async () => {
    if (!user) {
      router.push("/login");
      return;
    }
    if (!data) return;
    try {
      await api.post(`/contests/${data.id}/register`);
      get();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  if (!data)
    return error ? (
      <section className="section container">
        <Alert message={error} />
      </section>
    ) : (
      <Loading />
    );
  const upcoming = new Date(data.start_time) > new Date(),
    ended = new Date(data.end_time) <= new Date();
  return (
    <>
      <Banner title={data.title} description={data.description} />
      <section className="section container">
        <div className="grid grid-2">
          <div className="card">
            <div className="card-body">
              <h2>Thông tin cuộc thi</h2>
              <p>
                <b>Luật chấm:</b> {data.rule}
              </p>
              <p>
                <b>Bắt đầu:</b> {formatTime(data.start_time)}
              </p>
              <p>
                <b>Kết thúc:</b> {formatTime(data.end_time)}
              </p>
              <p>
                <b>Trạng thái:</b>{" "}
                {upcoming
                  ? "Sắp diễn ra"
                  : ended
                    ? "Đã kết thúc"
                    : "Đang diễn ra"}
              </p>
              <p>
                <b>Đăng ký:</b>{" "}
                {data.registered ? "Đã đăng ký" : "Chưa đăng ký"}
              </p>
              {error && <Alert message={error} />}
              <div className="inline-actions">
                {!data.registered && !ended && (
                  <button className="btn btn-primary" onClick={register}>
                    Đăng ký tham gia
                  </button>
                )}
                {data.registered && !upcoming && !ended && (
                  <Link
                    className="btn btn-primary"
                    href={`/contests/${slug}/arena`}
                  >
                    Vào phòng thi
                  </Link>
                )}
                <Link
                  className="btn btn-outline"
                  href={`/contests/${slug}/standings`}
                >
                  Bảng xếp hạng
                </Link>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <h2>Danh sách bài</h2>
              {data.problems?.map((p) => (
                <div className="testcase" key={p.label}>
                  <span>
                    <b>{p.label}.</b> {p.title}
                  </span>
                  <Difficulty value={p.difficulty} />
                </div>
              ))}
              <p className="hint">
                Đề thi chỉ mở cho người tham gia trong thời gian cuộc thi.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
