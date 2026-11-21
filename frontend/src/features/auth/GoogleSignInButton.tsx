"use client";

import { useCallback, useRef, useState } from "react";
import Script from "next/script";
import toast from "react-hot-toast";

type GoogleCredentialResponse = { credential?: string };
type GoogleAccountsId = {
  initialize: (options: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
  }) => void;
  renderButton: (element: HTMLElement, options: {
    theme?: "outline" | "filled_blue";
    size?: "large";
    type?: "standard";
    text?: "signin_with" | "signup_with" | "continue_with";
    shape?: "rectangular";
    width?: number;
  }) => void;
};

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

/** Uses Google Identity Services directly so the existing package-lock is unchanged. */
export function GoogleSignInButton({
  onCredential,
  disabled = false,
}: {
  onCredential: (credential: string) => Promise<void>;
  disabled?: boolean;
}) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const holder = useRef<HTMLDivElement | null>(null);
  const handler = useRef(onCredential);
  handler.current = onCredential;
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);

  const renderGoogleButton = useCallback(() => {
    if (!clientId || !holder.current || !window.google) return;
    const element = holder.current;
    element.replaceChildren(); // Avoid duplicate buttons on navigation / Strict Mode.
    window.google.accounts.id.initialize({
      client_id: clientId,
      auto_select: false,
      callback: async ({ credential }) => {
        if (!credential) {
          toast.error("Google không trả về mã xác thực");
          return;
        }
        if (pending.current) return;
        pending.current = true;
        setBusy(true);
        try {
          await handler.current(credential);
        } catch (err) {
          // The shared API client already shows the HTTP error toast.
          if (!(err instanceof Error)) toast.error("Đăng nhập Google thất bại");
        } finally {
          pending.current = false;
          setBusy(false);
        }
      },
    });
    window.google.accounts.id.renderButton(element, {
      theme: "outline",
      size: "large",
      type: "standard",
      text: "continue_with",
      shape: "rectangular",
      width: 300,
    });
  }, [clientId]);

  if (!clientId) return null;
  return (
    <div className="relative flex flex-col items-center gap-2" aria-busy={busy}>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={renderGoogleButton}
        onError={() => toast.error("Không thể tải đăng nhập Google")}
      />
      <div ref={holder} className="flex min-h-10 justify-center" />
      {(disabled || busy) && (
        <div className="absolute inset-0 z-10 cursor-wait bg-white/60" aria-hidden="true" />
      )}
      {busy && <p className="text-xs text-slate-500">Đang đăng nhập bằng Google...</p>}
    </div>
  );
}
