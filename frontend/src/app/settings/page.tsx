"use client";
import { Settings } from "@/features/users/Settings";
import { RequireAuth } from "@/features/auth/AuthProvider";
export default function Page() {
  return (
    <RequireAuth>
      <Settings />
    </RequireAuth>
  );
}
