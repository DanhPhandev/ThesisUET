import { LoaderCircle } from "lucide-react";
export function Loading({ label = "Đang tải dữ liệu..." }: { label?: string }) {
  return (
    <div
      role="status"
      className="mx-auto flex min-h-36 w-full max-w-6xl items-center justify-center gap-3 px-4 py-10 text-sm font-medium text-slate-500"
    >
      <LoaderCircle className="h-5 w-5 animate-spin text-sky-500" />
      {label}
    </div>
  );
}
