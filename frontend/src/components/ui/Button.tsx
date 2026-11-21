import React from "react";
import { LoaderCircle } from "lucide-react";
type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "danger";
  loading?: boolean;
};
export function Button({
  variant = "primary",
  loading = false,
  disabled,
  className = "",
  children,
  ...props
}: Props) {
  const classes = {
    primary: "bg-sky-500 text-white hover:bg-blue-800",
    outline:
      "border border-slate-200 bg-white text-slate-900 hover:border-sky-400",
    danger: "bg-rose-50 text-rose-700 hover:bg-rose-100",
  };
  return (
    <button
      disabled={loading || disabled}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${classes[variant]} ${className}`}
      {...props}
    >
      {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}
