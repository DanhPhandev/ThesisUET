"use client";
import { SubmissionDetails } from "@/features/submissions/SubmissionDetails";
import { RequireAuth } from "@/features/auth/AuthProvider";
import { useParams } from "next/navigation";
export default function Page(){const params=useParams(); return <RequireAuth><SubmissionDetails id={String(params.id)}/></RequireAuth>;}
