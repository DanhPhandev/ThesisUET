import Link from "next/link";
import type { Problem } from "@/types";
import { Difficulty } from "@/components/ui/Status";
export function ProblemCard({ problem }: { problem: Problem }) {
  return (
    <Link
      href={`/practice/${problem.slug}`}
      className="group block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="font-bold text-slate-900 group-hover:text-blue-800">
          {problem.title}
        </h3>
        <Difficulty value={problem.difficulty} />
      </div>
      <p className="line-clamp-2 text-sm leading-6 text-slate-500">
        {problem.statement?.slice(0, 180) || "Xem đề bài và bắt đầu luyện tập"}
      </p>
      <span className="mt-4 inline-block text-sm font-semibold text-sky-600">
        Giải bài →
      </span>
    </Link>
  );
}
