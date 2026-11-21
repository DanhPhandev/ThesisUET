"use client";
import { useAuth, RequireAuth } from "@/features/auth/AuthProvider";
import { Profile } from "@/features/users/Profile";
export default function Page() {
  const { user } = useAuth();
  return (
    <RequireAuth>
      {user ? <Profile username={user.username} canEdit /> : null}
    </RequireAuth>
  );
}
