"use client";
import { useParams } from "next/navigation";
import { Setter } from "@/features/management/Setter";
import { Admin } from "@/features/management/Admin";
export default function Page() {
  const p = useParams();
  const a = Array.isArray(p.parts) ? p.parts : [];
  return <Admin parts={["admin", ...a]} />;
}
