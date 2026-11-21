import React from "react";
type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};
export function Input({ label, error, id, className = "", ...props }: Props) {
  const autoId = React.useId();
  const fieldId = id || autoId;
  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={fieldId}
          className="block text-sm font-semibold text-slate-700"
        >
          {label}
        </label>
      )}
      <input
        id={fieldId}
        aria-invalid={!!error}
        className={`block w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 ${error ? "border-rose-400" : ""} ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}
