import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { ToastProvider } from "@/providers/ToastProvider";
import { SiteShell } from "@/components/layout/SiteShell";
export const metadata: Metadata = {
  title: "CodeUET | Online Judge",
  description:
    "Luyện lập trình C++ và Python; chấm code tự động và tham gia cuộc thi",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="bg-slate-50 text-slate-900 antialiased">
        <ToastProvider>
          <AuthProvider>
            <SiteShell>{children}</SiteShell>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
