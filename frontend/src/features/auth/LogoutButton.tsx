"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { LogOut, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/features/auth/AuthProvider";

/** Logout is available from the owner's profile, not from the navigation header. */
export function LogoutButton() {
  const { logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cancelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) setOpen(false);
      if (event.key !== "Tab") return;
      const dialog = document.getElementById("logout-confirm-dialog");
      const controls = dialog?.querySelectorAll<HTMLButtonElement>(
        'button:not([disabled])',
      );
      if (!controls?.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, submitting]);

  const confirmLogout = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      // AuthProvider clears local session even if the server call fails.
      await logout();
    } catch {
      // The API client already displays a toast for server/network errors.
    } finally {
      setOpen(false);
      router.replace("/login");
      router.refresh();
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="danger"
        className="border border-rose-200"
        onClick={() => setOpen(true)}
      >
        <LogOut className="h-4 w-4" />
        Đăng xuất
      </Button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-[3px]"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !submitting) {
                setOpen(false);
              }
            }}
          >
            <div
              id="logout-confirm-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="logout-dialog-title"
              aria-describedby="logout-dialog-description"
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                  <LogOut className="h-6 w-6" />
                </div>
                <button
                  type="button"
                  aria-label="Đóng hộp thoại"
                  disabled={submitting}
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <h2
                id="logout-dialog-title"
                className="mt-5 text-xl font-bold text-slate-900"
              >
                Xác nhận đăng xuất
              </h2>
              <p
                id="logout-dialog-description"
                className="mt-2 text-sm leading-6 text-slate-600"
              >
                Bạn có chắc chắn đăng xuất không?
              </p>
              <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  ref={cancelRef}
                  disabled={submitting}
                  onClick={() => setOpen(false)}
                  className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Hủy
                </button>
                <Button
                  type="button"
                  variant="danger"
                  loading={submitting}
                  className="bg-rose-600 text-white hover:bg-rose-700"
                  onClick={confirmLogout}
                >
                  <LogOut className="h-4 w-4" />
                  {submitting ? "Đang đăng xuất..." : "Đăng xuất"}
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
