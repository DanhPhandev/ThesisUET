import React from "react";
export { Loading } from "./Loading";
export function Banner({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <section className="banner">
      <div className="container">
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
    </section>
  );
}
export function Alert({ message }: { message: string }) {
  return <div className="error">{message}</div>;
}
export function Empty({ text = "Chưa có dữ liệu" }: { text?: string }) {
  return <div className="empty">{text}</div>;
}
export function Difficulty({ value }: { value: string }) {
  const label: { [k: string]: string } = {
    EASY: "Dễ",
    MEDIUM: "Trung bình",
    HARD: "Khó",
  };
  return (
    <span
      className={`pill ${value === "EASY" ? "green" : value === "MEDIUM" ? "orange" : "red"}`}
    >
      {label[value] || value}
    </span>
  );
}
export function Verdict({ value }: { value: string }) {
  const label: { [k: string]: string } = {
    PENDING: "Đang chờ",
    JUDGING: "Đang chấm",
    AC: "Accepted",
    WA: "Wrong Answer",
    TLE: "Time Limit",
    MLE: "Memory Limit",
    RE: "Runtime Error",
    CE: "Compilation Error",
    SE: "System Error",
  };
  return (
    <span className={`status-cell ${value}`}>{label[value] || value}</span>
  );
}
export function formatTime(value?: string) {
  return value
    ? new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })
    : "—";
}
