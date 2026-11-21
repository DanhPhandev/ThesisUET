"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { ComponentProps } from "react";
import type { OnMount } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import toast from "react-hot-toast";
import {
  connectLanguageFeatures,
  type IntelliSenseStatus,
} from "@/lib/language/monaco-lsp";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-64 items-center justify-center bg-slate-950 text-slate-300">
      Đang tải trình soạn thảo...
    </div>
  ),
});

type EditorProps = ComponentProps<typeof MonacoEditor>;
type EditorRef = Parameters<OnMount>[0];

/** Editor shared by practice and contest pages, powered by Pyright/clangd. */
export function CodeEditor({
  language,
  onMount,
  options,
  ...props
}: EditorProps) {
  const editorRef = useRef<EditorRef | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState<IntelliSenseStatus | "off">("off");
  const [statusError, setStatusError] = useState("");
  const supported = language === "python" || language === "cpp";

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    setMounted(true);
    onMount?.(editor, monaco);
  };

  useEffect(() => {
    if (!mounted || !editorRef.current || !monacoRef.current) return;
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const abort = new AbortController();
    let cleanup: () => void = () => {};
    if (!supported) {
      setStatus("off");
      setStatusError("");
      return;
    }
    connectLanguageFeatures(
      editor,
      monaco,
      language,
      abort.signal,
      (state, error) => {
        if (abort.signal.aborted) return;
        setStatus(state);
        setStatusError(error || "");
      },
    )
      .then((dispose) => {
        if (abort.signal.aborted) dispose();
        else cleanup = dispose;
      })
      .catch((error: unknown) => {
        if (abort.signal.aborted) return;
        const message = error instanceof Error ? error.message : String(error);
        setStatus("disconnected");
        setStatusError(message);
        toast.error(`IntelliSense: ${message}`, {
          id: `language-${language}`,
          duration: 6000,
        });
      });
    return () => {
      abort.abort();
      cleanup();
    };
  }, [mounted, language, supported]);

  const active =
    language === "python"
      ? "Pyright"
      : language === "cpp"
        ? "clangd"
        : "Monaco";
  return (
    <div className="min-w-0 overflow-hidden rounded-md border border-slate-700 bg-slate-950">
      <MonacoEditor
        {...props}
        language={language}
        onMount={handleMount}
        options={{
          automaticLayout: true,
          quickSuggestions: { other: true, comments: false, strings: true },
          suggestOnTriggerCharacters: true,
          parameterHints: { enabled: true },
          hover: { enabled: "on", delay: 300 },
          fixedOverflowWidgets: true,
          tabCompletion: "on",
          ...options,
        }}
      />
      <div className="flex min-h-8 items-center justify-between gap-2 border-t border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-300">
        <span>
          Ctrl + Space: gợi ý · Di chuột: xem kiểu/hàm · Gạch chân: lỗi
        </span>
        <span
          title={
            statusError ||
            (supported ? `Language Server: ${active}` : "Monaco basic editor")
          }
          className="flex shrink-0 items-center gap-1.5"
          role="status"
          aria-live="polite"
        >
          <span
            className={`h-2 w-2 rounded-full ${status === "ready" ? "bg-emerald-400" : status === "connecting" ? "bg-amber-400" : status === "disconnected" ? "bg-rose-400" : "bg-slate-500"}`}
          />
          {active}:{" "}
          {status === "ready"
            ? "đang hoạt động"
            : status === "connecting"
              ? "đang kết nối"
              : status === "disconnected"
                ? "chưa kết nối"
                : "cơ bản"}
        </span>
      </div>
      {status === "disconnected" && statusError && (
        <div
          className="border-t border-rose-900 bg-rose-950/60 px-3 py-2 text-xs text-rose-200"
          role="alert"
        >
          {statusError}
        </div>
      )}
    </div>
  );
}
