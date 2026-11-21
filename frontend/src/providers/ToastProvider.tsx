"use client";
import React from "react";
import { Toaster } from "react-hot-toast";
export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            borderRadius: "12px",
            background: "#0f172a",
            color: "#fff",
            fontSize: "14px",
            padding: "12px 16px",
          },
          success: { iconTheme: { primary: "#22c55e", secondary: "#fff" } },
          error: {
            duration: 5000,
            iconTheme: { primary: "#ef4444", secondary: "#fff" },
          },
        }}
      />
    </>
  );
}
