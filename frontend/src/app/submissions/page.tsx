"use client";
import { Submissions } from "@/features/submissions/SubmissionList";
import { RequireAuth } from "@/features/auth/AuthProvider";
export default function Page() {
  return (
    <RequireAuth>
      <Submissions />
    </RequireAuth>
  );
}
